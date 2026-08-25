import { composeNoticeMail, noticeMailEventKey } from "@ocs/core";
import type { NoticeMail, NoticeMailKind, OrderView, StationFlavor } from "@ocs/core";
import { getPrismaClient } from "./client";
import { readStoreIdentity } from "./index";
import { toOrder } from "./payment";

const orderInclude = {
  shopper: { select: { email: true } },
  paymentAttempt: { select: { publicId: true } },
  lines: { orderBy: { id: "asc" as const } },
} as const;

const MAX_SEND_ATTEMPTS = 5;

export class MailDataError extends Error {
  constructor(
    readonly code: "not-found" | "invalid-state" | "not-configured",
    message: string,
  ) {
    super(message);
    this.name = "MailDataError";
  }
}

export interface MailConfigView {
  readonly flavor: StationFlavor;
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly username?: string;
  readonly fromEmail: string;
  readonly ownerToEmail: string;
  /** The password never leaves the server; reads report only whether one is set. */
  readonly hasPassword: boolean;
}

export interface SaveMailConfigInput {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly username?: string;
  readonly password?: string;
  readonly fromEmail: string;
  readonly ownerToEmail: string;
}

export interface NoticeMailView extends NoticeMail {
  readonly id: string;
  readonly flavor: StationFlavor;
  readonly status: "pending" | "sent" | "failed";
  readonly attempts: number;
  readonly lastError?: string;
  readonly sentAt?: Date;
  readonly createdAt: Date;
}

export async function readMailConfig(flavor: StationFlavor): Promise<MailConfigView | null> {
  const record = await getPrismaClient().mailConfig.findUnique({ where: { flavor } });
  return record ? {
    flavor,
    host: record.host,
    port: record.port,
    secure: record.secure,
    username: record.username ?? undefined,
    fromEmail: record.fromEmail,
    ownerToEmail: record.ownerToEmail,
    hasPassword: Boolean(record.password),
  } : null;
}

/**
 * Server-only transport credentials. Used exclusively to build the SMTP
 * transport; never returned to a page or serialized to the browser.
 */
export async function readMailTransportConfig(flavor: StationFlavor): Promise<{
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly username?: string;
  readonly password?: string;
  readonly fromEmail: string;
} | null> {
  const record = await getPrismaClient().mailConfig.findUnique({ where: { flavor } });
  return record ? {
    host: record.host,
    port: record.port,
    secure: record.secure,
    username: record.username ?? undefined,
    password: record.password ?? undefined,
    fromEmail: record.fromEmail,
  } : null;
}

export async function saveMailConfig(flavor: StationFlavor, input: SaveMailConfigInput): Promise<MailConfigView> {
  const host = input.host.trim();
  const fromEmail = input.fromEmail.trim().toLowerCase();
  const ownerToEmail = input.ownerToEmail.trim().toLowerCase();
  const username = input.username?.trim() || null;
  const password = input.password?.trim() || null;
  if (!host || host.length > 255) throw new MailDataError("not-configured", "SMTP host is required.");
  if (!Number.isSafeInteger(input.port) || input.port < 1 || input.port > 65535) throw new MailDataError("not-configured", "SMTP port is invalid.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerToEmail)) {
    throw new MailDataError("not-configured", "Both mailboxes must be valid email addresses.");
  }
  const existing = await getPrismaClient().mailConfig.findUnique({ where: { flavor }, select: { password: true } });
  const data = {
    host,
    port: input.port,
    secure: input.secure,
    username,
    // An omitted password keeps the stored one so the Portal form never needs to echo it.
    password: password ?? existing?.password ?? null,
    fromEmail,
    ownerToEmail,
  };
  const record = await getPrismaClient().mailConfig.upsert({ where: { flavor }, create: { flavor, ...data }, update: data });
  return {
    flavor,
    host: record.host,
    port: record.port,
    secure: record.secure,
    username: record.username ?? undefined,
    fromEmail: record.fromEmail,
    ownerToEmail: record.ownerToEmail,
    hasPassword: Boolean(record.password),
  };
}

/**
 * Enqueue one Notice Mail keyed by its business event. The unique
 * (flavor, eventKey) index makes this idempotent: re-running the trigger
 * never duplicates a letter.
 */
export async function enqueueNoticeMail(flavor: StationFlavor, mail: NoticeMail, reference: string): Promise<void> {
  await getPrismaClient().mailOutbox.upsert({
    where: { flavor_eventKey: { flavor, eventKey: noticeMailEventKey(mail.kind, reference) } },
    create: { flavor, eventKey: noticeMailEventKey(mail.kind, reference), kind: mail.kind, toEmail: mail.toEmail, subject: mail.subject, bodyText: mail.bodyText },
    update: {},
  });
}

async function enqueueOrderNotices(order: OrderView, kinds: readonly NoticeMailKind[]): Promise<void> {
  if (kinds.length === 0) return;
  const identity = await readStoreIdentity(order.flavor);
  const config = await getPrismaClient().mailConfig.findUnique({ where: { flavor: order.flavor } });
  const ownerEmail = config?.ownerToEmail ?? identity.contactEmail;
  if (!ownerEmail && kinds.includes("owner-new-order")) return;
  for (const kind of kinds) {
    const mail = composeNoticeMail({ kind, order: {
      number: order.number,
      flavor: order.flavor,
      shopperEmail: order.shopperEmail,
      currency: order.currency,
      totalMinor: order.totalMinor,
      lines: order.lines.map((line) => ({ productName: line.productName, quantity: line.quantity })),
      trackingNumber: order.trackingNumber,
    }, storeName: identity.name, ownerEmail: ownerEmail ?? "" });
    if (kind === "owner-new-order" && !ownerEmail) continue;
    await enqueueNoticeMail(order.flavor, mail, order.number);
  }
}

/** Transition a paid Order to shipped with its tracking snapshot and enqueue the shipped letter. */
export async function markOrderShipped(
  flavor: StationFlavor,
  orderNumber: string,
  trackingNumber: string,
): Promise<OrderView> {
  const tracking = trackingNumber.trim();
  if (!tracking || tracking.length > 191) throw new MailDataError("invalid-state", "A tracking number is required.");
  const database = getPrismaClient();
  const existing = await database.order.findFirst({ where: { flavor, number: orderNumber }, include: orderInclude });
  if (!existing) throw new MailDataError("not-found", "Order not found.");
  if (existing.fulfillmentStatus === "shipped") throw new MailDataError("invalid-state", "This Order is already shipped.");
  // Goods the Shopper asked to return must not leave the shop.
  if (existing.returnStatus !== "none") throw new MailDataError("invalid-state", "This Order has an open Return Request.");
  const shipped = await database.order.update({
    where: { id: existing.id },
    data: { fulfillmentStatus: "shipped", trackingNumber: tracking, shippedAt: new Date() },
    include: orderInclude,
  });
  const view = toOrder(shipped);
  await enqueueOrderNotices(view, ["shipped"]);
  return view;
}

export async function listPortalNoticeMails(flavor: StationFlavor): Promise<NoticeMailView[]> {
  const records = await getPrismaClient().mailOutbox.findMany({
    where: { flavor },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return records.map((record) => ({
    id: record.id,
    flavor: record.flavor as StationFlavor,
    kind: record.kind as NoticeMailKind,
    toEmail: record.toEmail,
    subject: record.subject,
    bodyText: record.bodyText,
    status: record.status as NoticeMailView["status"],
    attempts: record.attempts,
    lastError: record.lastError ?? undefined,
    sentAt: record.sentAt ?? undefined,
    createdAt: record.createdAt,
  }));
}

export interface DrainResult {
  readonly attempted: number;
  readonly sent: number;
  readonly failed: number;
}

// One drain per flavor at a time inside this process; the unique event key
// plus the sent-state guard make duplicate letters impossible, and the mutex
// keeps concurrent page-triggered drains from double-sending one letter.
const activeDrains = new Map<string, Promise<DrainResult>>();

/**
 * Claim pending (or retryable failed) letters and run them through the
 * caller's sender. Each letter is marked sent or failed; a scheduled worker
 * can call this again later — already-sent letters never re-enter the pool.
 */
export async function drainNoticeMails(
  flavor: StationFlavor,
  send: (mail: NoticeMailView) => Promise<void>,
): Promise<DrainResult> {
  const running = activeDrains.get(flavor);
  if (running) return running;
  const drain = (async (): Promise<DrainResult> => {
    const database = getPrismaClient();
    const pending = await database.mailOutbox.findMany({
      where: { flavor, status: { in: ["pending", "failed"] }, attempts: { lt: MAX_SEND_ATTEMPTS } },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    let sent = 0;
    let failed = 0;
    for (const record of pending) {
      try {
        await send({
          id: record.id,
          flavor,
          kind: record.kind as NoticeMailKind,
          toEmail: record.toEmail,
          subject: record.subject,
          bodyText: record.bodyText,
          status: "pending",
          attempts: record.attempts,
          createdAt: record.createdAt,
        });
        const marked = await database.mailOutbox.updateMany({
          where: { id: record.id, status: { in: ["pending", "failed"] } },
          data: { status: "sent", sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
        });
        if (marked.count === 1) sent += 1;
      } catch (error) {
        await database.mailOutbox.update({
          where: { id: record.id },
          data: { status: "failed", attempts: { increment: 1 }, lastError: (error instanceof Error ? error.message : "send failed").slice(0, 500) },
        });
        failed += 1;
      }
    }
    return { attempted: pending.length, sent, failed };
  })();
  activeDrains.set(flavor, drain);
  try {
    return await drain;
  } finally {
    activeDrains.delete(flavor);
  }
}

/** Reset a failed letter back to pending for another drain pass. */
export async function retryNoticeMail(flavor: StationFlavor, id: string): Promise<void> {
  const result = await getPrismaClient().mailOutbox.updateMany({
    where: { id, flavor, status: "failed", attempts: { lt: MAX_SEND_ATTEMPTS } },
    data: { status: "pending" },
  });
  if (result.count !== 1) throw new MailDataError("not-found", "Failed letter not found or not retryable.");
}

/**
 * The paid letters for one Order. Called from the payment confirmation
 * boundary so every confirmed Order enqueues exactly once.
 */
export async function enqueuePaidOrderNotices(order: OrderView): Promise<void> {
  await enqueueOrderNotices(order, ["paid", "owner-new-order"]);
}
