import { validateRefundEvidence } from "@ocs/core";
import type { CurrencyCode, OrderView, PaymentProvider, RefundPaymentEvidence, StationFlavor } from "@ocs/core";
import { getPrismaClient } from "./client";
import { toOrder } from "./payment";

const orderInclude = {
  shopper: { select: { email: true } },
  paymentAttempt: { select: { publicId: true } },
  lines: { orderBy: { id: "asc" as const } },
} as const;

export class ReturnDataError extends Error {
  constructor(
    readonly code: "not-found" | "invalid-state",
    message: string,
  ) {
    super(message);
    this.name = "ReturnDataError";
  }
}

export interface ReturnRequestView {
  readonly id: string;
  readonly status: "open" | "approved" | "rejected";
  readonly reason: string;
  readonly note?: string;
  readonly openedAt: Date;
  readonly decidedAt?: Date;
}

async function findOrder(flavor: StationFlavor, number: string) {
  return getPrismaClient().order.findFirst({ where: { flavor, number }, include: orderInclude });
}

/**
 * Shopper opens a Return Request with a reason. One pending request per
 * Order for its lifetime (PRD 393); a rejected request stays visible and
 * is not reopened.
 */
export async function requestShopperReturn(
  flavor: StationFlavor,
  shopperEmail: string,
  orderNumber: string,
  reason: string,
): Promise<OrderView> {
  const cleaned = reason.trim();
  if (!cleaned || cleaned.length > 500) throw new ReturnDataError("invalid-state", "A return reason is required (up to 500 characters).");
  const database = getPrismaClient();
  const email = shopperEmail.trim().toLowerCase();
  const order = await database.order.findFirst({ where: { flavor, number: orderNumber, shopper: { email } }, include: orderInclude });
  if (!order) throw new ReturnDataError("not-found", "Order not found for this Shopper.");
  if (order.paymentStatus !== "paid") throw new ReturnDataError("invalid-state", "Only a paid Order can request a return.");
  if (order.returnStatus !== "none") {
    throw new ReturnDataError("invalid-state", "This Order already had its Return Request.");
  }
  const updated = await database.order.update({
    where: { id: order.id },
    data: { returnStatus: "requested", returnRequests: { create: { status: "open", reason: cleaned } } },
    include: orderInclude,
  });
  return toOrder(updated);
}

/** Merchant agrees or refuses the open request, optionally recording a note. Money does not move here (ADR 0010). */
export async function decideReturnRequest(
  flavor: StationFlavor,
  orderNumber: string,
  decision: "approved" | "rejected",
  note?: string,
): Promise<OrderView> {
  const database = getPrismaClient();
  const cleanedNote = note?.trim() || null;
  if (cleanedNote && cleanedNote.length > 500) throw new ReturnDataError("invalid-state", "The decision note is too long.");
  const order = await findOrder(flavor, orderNumber);
  if (!order) throw new ReturnDataError("not-found", "Order not found.");
  if (order.returnStatus !== "requested") throw new ReturnDataError("invalid-state", "There is no open Return Request to decide.");
  const decidedAt = new Date();
  const updated = await database.order.update({
    where: { id: order.id },
    data: {
      returnStatus: decision,
      returnRequests: { updateMany: { where: { orderId: order.id, status: "open" }, data: { status: decision, decidedAt, note: cleanedNote } } },
    },
    include: orderInclude,
  });
  return toOrder(updated);
}

/**
 * Apply a verified provider refund to the Order. One-shot: the guarded
 * update only matches a paid, merchant-agreed Order; repeat calls (retry,
 * duplicate webhook) return the already-refunded Order unchanged.
 */
export async function applyOrderRefund(evidence: RefundPaymentEvidence): Promise<OrderView> {
  if (!evidence.refundTradeNo.trim() || !/^[a-f0-9]{64}$/.test(evidence.event.payloadDigest)) {
    throw new ReturnDataError("invalid-state", "Refund evidence metadata is invalid.");
  }
  const database = getPrismaClient();
  const order = await database.order.findFirst({
    where: { paymentAttempt: { publicId: evidence.reference } },
    include: { ...orderInclude, paymentAttempt: { select: { publicId: true } } },
  });
  if (!order) throw new ReturnDataError("not-found", "Order not found for this refund reference.");
  validateRefundEvidence({
    expectedProvider: order.provider as PaymentProvider,
    expectedReference: order.paymentAttempt.publicId,
    expectedAmountMinor: order.totalMinor,
    expectedCurrency: order.currency as CurrencyCode,
    evidence,
  });
  if (order.returnStatus !== "approved") {
    if (order.returnStatus === "refunded" && order.paymentStatus === "refunded") return toOrder(order);
    throw new ReturnDataError("invalid-state", "Money moves only after the Merchant agrees to the Return Request.");
  }
  const refundedAt = new Date();
  const updated = await database.order.updateMany({
    where: { id: order.id, paymentStatus: "paid", returnStatus: "approved" },
    data: { paymentStatus: "refunded", returnStatus: "refunded", refundTradeNo: evidence.refundTradeNo, refundedAt },
  });
  if (updated.count !== 1) {
    const recheck = await database.order.findFirst({ where: { id: order.id }, include: orderInclude });
    if (recheck && recheck.paymentStatus === "refunded") return toOrder(recheck);
    throw new ReturnDataError("invalid-state", "Refund could not be applied to this Order.");
  }
  const result = await database.order.findFirst({ where: { id: order.id }, include: orderInclude });
  return toOrder(result!);
}

/** Merchant confirms the goods came back; the app refunds right after this. */
export async function confirmReturnGoodsReceived(
  flavor: StationFlavor,
  orderNumber: string,
): Promise<OrderView> {
  const order = await findOrder(flavor, orderNumber);
  if (!order) throw new ReturnDataError("not-found", "Order not found.");
  if (order.returnStatus !== "approved" || order.fulfillmentStatus !== "shipped") {
    throw new ReturnDataError("invalid-state", "Only a shipped, approved Return Request can be confirmed.");
  }
  // The state stays 'approved' until applyOrderRefund flips it; this guard
  // exists so the UI action cannot run ahead of the money boundary twice.
  return toOrder(order);
}

export async function listOrderReturnRequests(flavor: StationFlavor, orderNumber: string): Promise<ReturnRequestView[]> {
  const order = await findOrder(flavor, orderNumber);
  if (!order) return [];
  const rows = await getPrismaClient().returnRequest.findMany({ where: { orderId: order.id }, orderBy: { openedAt: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    status: row.status as ReturnRequestView["status"],
    reason: row.reason,
    note: row.note ?? undefined,
    openedAt: row.openedAt,
    decidedAt: row.decidedAt ?? undefined,
  }));
}
