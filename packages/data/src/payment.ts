import { createHash, randomUUID } from "node:crypto";
import {
  availableStock,
  calculateCheckoutQuote,
  validateCheckoutAddress,
  validatePaidEvidence,
} from "@ocs/core";
import type {
  CartLineView,
  CheckoutAddress,
  CurrencyCode,
  DiscountRuleView,
  LocalizedText,
  OrderView,
  PaymentAttemptStatus,
  PaymentAttemptView,
  PaymentMethodView,
  PaymentProvider,
  ProviderPaymentEvidence,
  ShippingRateView,
  StationFlavor,
} from "@ocs/core";
import { getPrismaClient } from "./client";
import { Prisma } from "./generated/prisma/client";

const RESERVATION_MINUTES = 15;

const attemptInclude = {
  order: { select: { number: true } },
} satisfies Prisma.PaymentAttemptInclude;

const orderInclude = {
  shopper: { select: { email: true } },
  lines: { orderBy: { id: "asc" as const } },
} satisfies Prisma.OrderInclude;

type AttemptRecord = Prisma.PaymentAttemptGetPayload<{ include: typeof attemptInclude }>;
type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export interface CreatePaymentAttemptInput {
  readonly flavor: StationFlavor;
  readonly provider: PaymentProvider;
  readonly currency: CurrencyCode;
  readonly cartToken: string;
  readonly shopperEmail: string;
  readonly address: CheckoutAddress;
  readonly discountCode?: string;
  readonly selectedShippingRateId?: string;
}

export interface PortalPaymentAttemptView extends PaymentAttemptView {
  readonly createdAt: Date;
  readonly shopperEmail: string;
}

export class PaymentDataError extends Error {
  constructor(
    readonly code:
      | "not-found"
      | "disabled"
      | "unsupported"
      | "invalid-checkout"
      | "out-of-stock"
      | "recovery-required"
      | "invalid-evidence",
    message: string,
  ) {
    super(message);
    this.name = "PaymentDataError";
  }
}

function localized(zh: string | null, en: string | null): LocalizedText {
  return { zh: zh ?? undefined, en: en ?? undefined };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cartTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function stableDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function optional(value: string | undefined): string | null {
  return value?.trim() || null;
}

function normalizeAddress(flavor: StationFlavor, address: CheckoutAddress): CheckoutAddress {
  validateCheckoutAddress(flavor, address);
  return {
    recipientName: address.recipientName.trim(),
    phone: address.phone.trim(),
    countryCode: address.countryCode.trim().toUpperCase(),
    region: address.region.trim(),
    city: address.city.trim(),
    district: address.district?.trim() || undefined,
    postalCode: address.postalCode?.trim() || undefined,
    line1: address.line1.trim(),
    line2: address.line2?.trim() || undefined,
  };
}

function toAttempt(record: AttemptRecord): PaymentAttemptView {
  return {
    id: record.publicId,
    flavor: record.flavor as StationFlavor,
    provider: record.provider as PaymentProvider,
    status: record.status as PaymentAttemptStatus,
    currency: record.currency as CurrencyCode,
    totalMinor: record.totalMinor,
    expiresAt: record.expiresAt,
    providerReference: record.providerOrderId ?? undefined,
    orderNumber: record.order?.number,
    failureCode: record.failureCode ?? undefined,
  };
}

function toOrder(record: OrderRecord): OrderView {
  return {
    id: record.id,
    number: record.number,
    flavor: record.flavor as StationFlavor,
    shopperEmail: record.shopper.email,
    paymentStatus: record.paymentStatus as OrderView["paymentStatus"],
    fulfillmentStatus: record.fulfillmentStatus as OrderView["fulfillmentStatus"],
    returnStatus: record.returnStatus as OrderView["returnStatus"],
    provider: record.provider as PaymentProvider,
    currency: record.currency as CurrencyCode,
    lines: record.lines.map((line) => ({
      variantReference: line.variantReference,
      productReference: line.productReference,
      productSlug: line.productSlug,
      productName: localized(line.productNameZh, line.productNameEn),
      variantLabel: line.variantLabel,
      imageUrl: line.imageUrl ?? undefined,
      unitPriceMinor: line.unitPriceMinor,
      quantity: line.quantity,
      lineSubtotalMinor: line.lineSubtotalMinor,
      unitWeightGrams: line.unitWeightGrams,
    })),
    address: {
      recipientName: record.recipientName,
      phone: record.phone,
      countryCode: record.countryCode,
      region: record.region,
      city: record.city,
      district: record.district ?? undefined,
      postalCode: record.postalCode ?? undefined,
      line1: record.line1,
      line2: record.line2 ?? undefined,
    },
    subtotalMinor: record.subtotalMinor,
    discountCode: record.discountCode ?? undefined,
    discountMinor: record.discountMinor,
    shippingName: localized(record.shippingNameZh, record.shippingNameEn),
    shippingMinor: record.shippingMinor,
    totalMinor: record.totalMinor,
    paidAt: record.paidAt,
    createdAt: record.createdAt,
  };
}

async function serializable<T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await getPrismaClient().$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const knownConflict = error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === "P2034" || (error.code === "P2010" && error.meta?.code === "40001"));
      const cause = error instanceof Error ? error.cause as { kind?: string } | undefined : undefined;
      const adapterConflict = cause?.kind === "TransactionWriteConflict"
        || (error instanceof Error && /could not serialize access|40001/.test(error.message));
      if ((!knownConflict && !adapterConflict) || attempt === 4) throw error;
    }
  }
  throw new Error("Serializable transaction retry exhausted.");
}

function toDiscount(record: {
  id: string;
  code: string;
  kind: string;
  percentageBps: number | null;
  amountMinor: number | null;
  enabled: boolean;
}): DiscountRuleView {
  return {
    id: record.id,
    code: record.code,
    kind: record.kind as DiscountRuleView["kind"],
    percentageBps: record.percentageBps ?? undefined,
    amountMinor: record.amountMinor ?? undefined,
    enabled: record.enabled,
  };
}

function toRate(record: {
  id: string;
  nameZh: string | null;
  nameEn: string | null;
  enabled: boolean;
  countryCodes: string[];
  regions: string[];
  minWeightGrams: number;
  maxWeightGrams: number | null;
  priceMinor: number;
  freeOverMinor: number | null;
  position: number;
}): ShippingRateView {
  return {
    id: record.id,
    name: localized(record.nameZh, record.nameEn),
    enabled: record.enabled,
    countryCodes: record.countryCodes,
    regions: record.regions,
    minWeightGrams: record.minWeightGrams,
    maxWeightGrams: record.maxWeightGrams ?? undefined,
    priceMinor: record.priceMinor,
    freeOverMinor: record.freeOverMinor ?? undefined,
    position: record.position,
  };
}

export async function listPaymentMethods(flavor: StationFlavor): Promise<PaymentMethodView[]> {
  const records = await getPrismaClient().paymentMethodConfig.findMany({
    where: { flavor },
    orderBy: { provider: "asc" },
  });
  return records.map((record) => ({ provider: record.provider as PaymentProvider, enabled: record.enabled }));
}

export async function setPaymentMethodEnabled(
  flavor: StationFlavor,
  provider: PaymentProvider,
  enabled: boolean,
): Promise<PaymentMethodView> {
  if ((flavor === "cn" && !["alipay", "wechat"].includes(provider))
    || (flavor === "global" && !["paypal", "stripe"].includes(provider))) {
    throw new PaymentDataError("unsupported", "This payment provider does not belong to the Station flavor.");
  }
  if (provider === "wechat" && enabled) {
    throw new PaymentDataError("unsupported", "WeChat Pay is reserved for a later release.");
  }
  const record = await getPrismaClient().paymentMethodConfig.upsert({
    where: { flavor_provider: { flavor, provider } },
    create: { flavor, provider, enabled },
    update: { enabled },
  });
  return { provider: record.provider as PaymentProvider, enabled: record.enabled };
}

export async function createPaymentAttempt(input: CreatePaymentAttemptInput): Promise<PaymentAttemptView> {
  const address = normalizeAddress(input.flavor, input.address);
  const requestedCode = input.discountCode?.trim().toUpperCase();
  const publicId = randomUUID();

  try {
    return await serializable(async (transaction) => {
      const method = await transaction.paymentMethodConfig.findUnique({
        where: { flavor_provider: { flavor: input.flavor, provider: input.provider } },
      });
      if (!method?.enabled) throw new PaymentDataError("disabled", "This payment method is not enabled.");

      const shopper = await transaction.shopper.findUnique({
        where: { flavor_email: { flavor: input.flavor, email: normalizeEmail(input.shopperEmail) } },
      });
      if (!shopper) throw new PaymentDataError("not-found", "Shopper Account not found.");

      const cart = await transaction.cart.findUnique({
        where: { tokenHash: cartTokenHash(input.cartToken) },
        include: {
          lines: {
            orderBy: { createdAt: "asc" },
            include: {
              variant: {
                include: {
                  product: { include: { images: { orderBy: { position: "asc" } } } },
                  selections: { include: { option: true, value: true } },
                },
              },
            },
          },
        },
      });
      if (!cart || cart.flavor !== input.flavor || cart.lines.length === 0) {
        throw new PaymentDataError("invalid-checkout", "The Cart is empty or belongs to another Station.");
      }

      const checkoutFingerprint = stableDigest({
        shopperId: shopper.id,
        provider: input.provider,
        cartId: cart.id,
        cartUpdatedAt: cart.updatedAt.toISOString(),
        lines: cart.lines.map((line) => [line.variantId, line.quantity, line.updatedAt.toISOString()]),
        address,
        discountCode: requestedCode ?? null,
        shippingRateId: input.selectedShippingRateId ?? null,
      });
      const existing = await transaction.paymentAttempt.findFirst({
        where: { shopperId: shopper.id, provider: input.provider, checkoutFingerprint, status: "pending" },
        include: attemptInclude,
      });
      if (existing) {
        if (existing.expiresAt <= new Date()) {
          throw new PaymentDataError("recovery-required", "The previous payment must be reconciled before starting another attempt.");
        }
        return toAttempt(existing);
      }

      const locale = input.flavor === "cn" ? "zh" : "en";
      const cartLines: CartLineView[] = cart.lines.map((line) => {
        const product = line.variant.product;
        const stock = availableStock(line.variant.stock, line.variant.reservedStock);
        const available = product.flavor === input.flavor
          && product.published
          && !product.deletedAt
          && stock > 0
          && line.quantity <= stock;
        const variantLabel = [...line.variant.selections]
          .sort((left, right) => left.option.position - right.option.position)
          .map((selection) => localized(selection.value.nameZh, selection.value.nameEn)[locale] ?? "")
          .filter(Boolean)
          .join(" / ");
        return {
          variantId: line.variantId,
          productId: product.id,
          productSlug: product.slug,
          productName: localized(product.nameZh, product.nameEn),
          variantLabel,
          imageUrl: product.images[0]?.url,
          sellPriceMinor: line.variant.sellPriceMinor,
          stock,
          weightGrams: line.variant.weightGrams,
          quantity: line.quantity,
          available,
        };
      });

      const rates = await transaction.shippingRate.findMany({
        where: { flavor: input.flavor, enabled: true },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
      const discountRecord = requestedCode ? await transaction.discountCode.findUnique({
        where: { flavor_code: { flavor: input.flavor, code: requestedCode } },
      }) : null;
      if (requestedCode && (!discountRecord || !discountRecord.enabled)) {
        throw new PaymentDataError("invalid-checkout", "Discount Code is invalid or inactive.");
      }

      let quote;
      try {
        quote = calculateCheckoutQuote({
          flavor: input.flavor,
          currency: input.currency,
          lines: cartLines,
          address,
          shippingRates: rates.map(toRate),
          discount: discountRecord ? toDiscount(discountRecord) : undefined,
          selectedShippingRateId: input.selectedShippingRateId,
        });
      } catch (error) {
        throw new PaymentDataError("invalid-checkout", error instanceof Error ? error.message : "Checkout is invalid.");
      }
      if (quote.totalMinor <= 0) throw new PaymentDataError("invalid-checkout", "A provider payment requires a positive total.");

      for (const line of cart.lines) {
        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "ProductVariant"
          SET "reservedStock" = "reservedStock" + ${line.quantity}
          WHERE "id" = ${line.variantId}
            AND "stock" - "reservedStock" >= ${line.quantity}
        `);
        if (updated !== 1) throw new PaymentDataError("out-of-stock", "A Cart item no longer has enough available stock.");
      }

      const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000);
      const selectedRate = rates.find((rate) => rate.id === quote.selectedShippingRateId);
      const attempt = await transaction.paymentAttempt.create({
        data: {
          publicId,
          flavor: input.flavor,
          shopperId: shopper.id,
          cartId: cart.id,
          checkoutFingerprint,
          provider: input.provider,
          currency: input.currency,
          subtotalMinor: quote.subtotalMinor,
          discountCode: quote.discountCode ?? null,
          discountMinor: quote.discountMinor,
          shippingRateReference: selectedRate?.id ?? null,
          shippingNameZh: selectedRate?.nameZh ?? null,
          shippingNameEn: selectedRate?.nameEn ?? null,
          shippingMinor: quote.shippingMinor,
          totalMinor: quote.totalMinor,
          totalWeightGrams: quote.totalWeightGrams,
          recipientName: address.recipientName,
          phone: address.phone,
          countryCode: address.countryCode,
          region: address.region,
          city: address.city,
          district: optional(address.district),
          postalCode: optional(address.postalCode),
          line1: address.line1,
          line2: optional(address.line2),
          expiresAt,
          lines: {
            create: cart.lines.map((line, index) => ({
              variantId: line.variantId,
              variantReference: line.variantId,
              productReference: line.variant.product.id,
              productSlug: line.variant.product.slug,
              productNameZh: line.variant.product.nameZh,
              productNameEn: line.variant.product.nameEn,
              variantLabel: cartLines[index]!.variantLabel,
              imageUrl: line.variant.product.images[0]?.url ?? null,
              unitPriceMinor: line.variant.sellPriceMinor,
              quantity: line.quantity,
              lineSubtotalMinor: line.variant.sellPriceMinor * line.quantity,
              unitWeightGrams: line.variant.weightGrams,
            })),
          },
          reservations: {
            create: cart.lines.map((line) => ({
              variantId: line.variantId,
              variantReference: line.variantId,
              quantity: line.quantity,
              expiresAt,
            })),
          },
        },
        include: attemptInclude,
      });
      return toAttempt(attempt);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const shopper = await getPrismaClient().shopper.findUnique({
        where: { flavor_email: { flavor: input.flavor, email: normalizeEmail(input.shopperEmail) } },
      });
      if (shopper) {
        const existing = await getPrismaClient().paymentAttempt.findFirst({
          where: { shopperId: shopper.id, provider: input.provider, status: "pending" },
          orderBy: { createdAt: "desc" },
          include: attemptInclude,
        });
        if (existing) return toAttempt(existing);
      }
    }
    throw error;
  }
}

export async function readPaymentAttemptForShopper(
  flavor: StationFlavor,
  shopperEmail: string,
  publicId: string,
): Promise<PaymentAttemptView | null> {
  const attempt = await getPrismaClient().paymentAttempt.findFirst({
    where: { publicId, flavor, shopper: { email: normalizeEmail(shopperEmail) } },
    include: attemptInclude,
  });
  return attempt ? toAttempt(attempt) : null;
}

/**
 * Persist the provider-owned checkout object id (PayPal order, Stripe
 * Checkout Session) right after the provider checkout is created, so later
 * query/close/recovery calls can address the provider object by reference.
 */
export async function savePaymentAttemptProviderReference(
  flavor: StationFlavor,
  publicId: string,
  providerOrderId: string,
): Promise<void> {
  const reference = providerOrderId.trim();
  if (!reference || reference.length > 191) throw new PaymentDataError("invalid-evidence", "Provider reference is invalid.");
  const updated = await getPrismaClient().paymentAttempt.updateMany({
    where: { publicId, flavor, status: "pending" },
    data: { providerOrderId: reference },
  });
  if (updated.count !== 1) throw new PaymentDataError("not-found", "Pending Payment Attempt not found.");
}

async function readOrderByAttempt(transaction: Prisma.TransactionClient, paymentAttemptId: string): Promise<OrderRecord | null> {
  return transaction.order.findUnique({ where: { paymentAttemptId }, include: orderInclude });
}

function assertEvidenceShape(evidence: ProviderPaymentEvidence): void {
  if (!evidence.event.externalId.trim() || !/^[a-f0-9]{64}$/.test(evidence.event.payloadDigest)) {
    throw new PaymentDataError("invalid-evidence", "Provider evidence metadata is invalid.");
  }
}

export async function confirmPaymentAttempt(evidence: ProviderPaymentEvidence): Promise<OrderView> {
  assertEvidenceShape(evidence);
  try {
    return await serializable(async (transaction) => {
      const attempt = await transaction.paymentAttempt.findUnique({
        where: { publicId: evidence.reference },
        include: { lines: true, reservations: true },
      });
      if (!attempt) throw new PaymentDataError("not-found", "Payment Attempt not found.");
      try {
        validatePaidEvidence({
          expectedProvider: attempt.provider as PaymentProvider,
          expectedReference: attempt.publicId,
          expectedAmountMinor: attempt.totalMinor,
          expectedCurrency: attempt.currency as CurrencyCode,
          ...evidence,
        });
      } catch (error) {
        throw new PaymentDataError("invalid-evidence", error instanceof Error ? error.message : "Provider evidence is invalid.");
      }

      const existingOrder = await readOrderByAttempt(transaction, attempt.id);
      if (existingOrder) return toOrder(existingOrder);
      if (attempt.status !== "pending") {
        throw new PaymentDataError("invalid-evidence", "Only a pending Payment Attempt can be paid.");
      }
      const activeReservations = attempt.reservations.filter((reservation) => reservation.status === "active" && reservation.variantId);
      if (activeReservations.length !== attempt.lines.length) {
        throw new PaymentDataError("invalid-evidence", "Payment stock reservations are no longer active.");
      }

      for (const reservation of activeReservations) {
        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "ProductVariant"
          SET "stock" = "stock" - ${reservation.quantity},
              "reservedStock" = "reservedStock" - ${reservation.quantity}
          WHERE "id" = ${reservation.variantId!}
            AND "stock" >= ${reservation.quantity}
            AND "reservedStock" >= ${reservation.quantity}
        `);
        if (updated !== 1) throw new PaymentDataError("invalid-evidence", "Reserved inventory is inconsistent.");
      }

      const paidAt = new Date();
      await transaction.stockReservation.updateMany({
        where: { paymentAttemptId: attempt.id, status: "active" },
        data: { status: "committed", variantId: null, committedAt: paidAt },
      });
      await transaction.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: "paid", paidAt, providerTradeNo: evidence.providerTradeNo! },
      });
      await transaction.paymentProviderEvent.upsert({
        where: { provider_externalId: { provider: evidence.provider, externalId: evidence.event.externalId } },
        create: {
          paymentAttemptId: attempt.id,
          provider: evidence.provider,
          externalId: evidence.event.externalId,
          kind: evidence.event.kind,
          payloadDigest: evidence.event.payloadDigest,
        },
        update: {},
      });

      const number = `OC${paidAt.toISOString().slice(0, 10).replaceAll("-", "")}${attempt.publicId.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      const order = await transaction.order.create({
        data: {
          number,
          flavor: attempt.flavor,
          shopperId: attempt.shopperId,
          paymentAttemptId: attempt.id,
          provider: attempt.provider,
          providerTradeNo: evidence.providerTradeNo!,
          currency: attempt.currency,
          subtotalMinor: attempt.subtotalMinor,
          discountCode: attempt.discountCode,
          discountMinor: attempt.discountMinor,
          shippingRateReference: attempt.shippingRateReference,
          shippingNameZh: attempt.shippingNameZh,
          shippingNameEn: attempt.shippingNameEn,
          shippingMinor: attempt.shippingMinor,
          totalMinor: attempt.totalMinor,
          totalWeightGrams: attempt.totalWeightGrams,
          recipientName: attempt.recipientName,
          phone: attempt.phone,
          countryCode: attempt.countryCode,
          region: attempt.region,
          city: attempt.city,
          district: attempt.district,
          postalCode: attempt.postalCode,
          line1: attempt.line1,
          line2: attempt.line2,
          paidAt,
          lines: {
            create: attempt.lines.map((line) => ({
              variantReference: line.variantReference,
              productReference: line.productReference,
              productSlug: line.productSlug,
              productNameZh: line.productNameZh,
              productNameEn: line.productNameEn,
              variantLabel: line.variantLabel,
              imageUrl: line.imageUrl,
              unitPriceMinor: line.unitPriceMinor,
              quantity: line.quantity,
              lineSubtotalMinor: line.lineSubtotalMinor,
              unitWeightGrams: line.unitWeightGrams,
            })),
          },
        },
        include: orderInclude,
      });
      if (attempt.cartId) await transaction.cartLine.deleteMany({ where: { cartId: attempt.cartId } });
      return toOrder(order);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await getPrismaClient().order.findFirst({
        where: { paymentAttempt: { publicId: evidence.reference } },
        include: orderInclude,
      });
      if (existing) return toOrder(existing);
    }
    throw error;
  }
}

export async function closePaymentAttempt(
  evidence: ProviderPaymentEvidence,
  outcome: "cancelled" | "failed" | "expired" = "cancelled",
): Promise<PaymentAttemptView> {
  assertEvidenceShape(evidence);
  if (evidence.status !== "closed") throw new PaymentDataError("invalid-evidence", "Only trusted closed evidence can release stock.");
  return serializable(async (transaction) => {
    const attempt = await transaction.paymentAttempt.findUnique({
      where: { publicId: evidence.reference },
      include: { ...attemptInclude, reservations: true },
    });
    if (!attempt) throw new PaymentDataError("not-found", "Payment Attempt not found.");
    if (attempt.provider !== evidence.provider || attempt.currency !== evidence.currency || attempt.totalMinor !== evidence.amountMinor) {
      throw new PaymentDataError("invalid-evidence", "Provider evidence does not match the Payment Attempt.");
    }
    if (attempt.status !== "pending") return toAttempt(attempt);

    const releasedAt = new Date();
    for (const reservation of attempt.reservations.filter((item) => item.status === "active" && item.variantId)) {
      const updated = await transaction.$executeRaw(Prisma.sql`
        UPDATE "ProductVariant"
        SET "reservedStock" = "reservedStock" - ${reservation.quantity}
        WHERE "id" = ${reservation.variantId!}
          AND "reservedStock" >= ${reservation.quantity}
      `);
      if (updated !== 1) throw new PaymentDataError("invalid-evidence", "Reserved inventory is inconsistent.");
    }
    await transaction.stockReservation.updateMany({
      where: { paymentAttemptId: attempt.id, status: "active" },
      data: { status: "released", variantId: null, releasedAt },
    });
    const updated = await transaction.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: outcome, failureCode: `provider-${outcome}` },
      include: attemptInclude,
    });
    await transaction.paymentProviderEvent.upsert({
      where: { provider_externalId: { provider: evidence.provider, externalId: evidence.event.externalId } },
      create: {
        paymentAttemptId: attempt.id,
        provider: evidence.provider,
        externalId: evidence.event.externalId,
        kind: evidence.event.kind,
        payloadDigest: evidence.event.payloadDigest,
      },
      update: {},
    });
    return toAttempt(updated);
  });
}

export async function listShopperOrders(flavor: StationFlavor, shopperEmail: string): Promise<OrderView[]> {
  return (await getPrismaClient().order.findMany({
    where: { flavor, shopper: { email: normalizeEmail(shopperEmail) } },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  })).map(toOrder);
}

export async function readShopperOrder(
  flavor: StationFlavor,
  shopperEmail: string,
  number: string,
): Promise<OrderView | null> {
  const order = await getPrismaClient().order.findFirst({
    where: { flavor, number, shopper: { email: normalizeEmail(shopperEmail) } },
    include: orderInclude,
  });
  return order ? toOrder(order) : null;
}

export async function listPortalOrders(flavor: StationFlavor): Promise<OrderView[]> {
  return (await getPrismaClient().order.findMany({
    where: { flavor },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  })).map(toOrder);
}

const portalAttemptInclude = {
  order: { select: { number: true } },
  shopper: { select: { email: true } },
} satisfies Prisma.PaymentAttemptInclude;

type PortalAttemptRecord = Prisma.PaymentAttemptGetPayload<{ include: typeof portalAttemptInclude }>;

function toPortalAttempt(record: PortalAttemptRecord): PortalPaymentAttemptView {
  return {
    id: record.publicId,
    flavor: record.flavor as StationFlavor,
    provider: record.provider as PaymentProvider,
    status: record.status as PaymentAttemptStatus,
    currency: record.currency as CurrencyCode,
    totalMinor: record.totalMinor,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    providerReference: record.providerOrderId ?? undefined,
    orderNumber: record.order?.number,
    failureCode: record.failureCode ?? undefined,
    shopperEmail: record.shopper.email,
  };
}

export async function listPortalPaymentAttempts(flavor: StationFlavor): Promise<PortalPaymentAttemptView[]> {
  return (await getPrismaClient().paymentAttempt.findMany({
    where: { flavor },
    orderBy: { createdAt: "desc" },
    include: portalAttemptInclude,
  })).map(toPortalAttempt);
}

export async function readPortalPaymentAttempt(
  flavor: StationFlavor,
  publicId: string,
): Promise<PortalPaymentAttemptView | null> {
  const attempt = await getPrismaClient().paymentAttempt.findFirst({
    where: { publicId, flavor },
    include: portalAttemptInclude,
  });
  return attempt ? toPortalAttempt(attempt) : null;
}

export async function readPortalOrder(flavor: StationFlavor, number: string): Promise<OrderView | null> {
  const order = await getPrismaClient().order.findFirst({ where: { flavor, number }, include: orderInclude });
  return order ? toOrder(order) : null;
}
