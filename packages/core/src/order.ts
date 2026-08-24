import type { CheckoutAddress } from "./checkout";
import type { CurrencyCode, LocalizedText, StationFlavor } from "./index";

export type PaymentProvider = "alipay" | "wechat" | "paypal" | "stripe";
export type PaymentAttemptStatus = "pending" | "paid" | "failed" | "cancelled" | "expired";
export type PaymentStatus = "paid" | "refunded" | "partially-refunded";
export type FulfillmentStatus = "unfulfilled" | "shipped";
export type ReturnStatus = "none" | "requested" | "approved" | "rejected" | "refunded";

export interface PaymentMethodView {
  readonly provider: PaymentProvider;
  readonly enabled: boolean;
}

export interface PaymentAttemptLineView {
  readonly variantReference: string;
  readonly productReference: string;
  readonly productSlug: string;
  readonly productName: LocalizedText;
  readonly variantLabel: string;
  readonly imageUrl?: string;
  readonly unitPriceMinor: number;
  readonly quantity: number;
  readonly lineSubtotalMinor: number;
  readonly unitWeightGrams: number;
}

export interface PaymentAttemptView {
  readonly id: string;
  readonly flavor: StationFlavor;
  readonly provider: PaymentProvider;
  readonly status: PaymentAttemptStatus;
  readonly currency: CurrencyCode;
  readonly totalMinor: number;
  readonly expiresAt: Date;
  readonly orderNumber?: string;
  readonly failureCode?: string;
}

export interface ProviderPaymentEvidence {
  readonly provider: PaymentProvider;
  readonly reference: string;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly status: "paid" | "pending" | "closed";
  readonly providerTradeNo?: string;
  readonly event: {
    readonly externalId: string;
    readonly kind: "notify" | "query" | "return";
    readonly payloadDigest: string;
  };
}

export interface OrderView {
  readonly id: string;
  readonly number: string;
  readonly flavor: StationFlavor;
  readonly shopperEmail: string;
  readonly paymentStatus: PaymentStatus;
  readonly fulfillmentStatus: FulfillmentStatus;
  readonly returnStatus: ReturnStatus;
  readonly provider: PaymentProvider;
  readonly currency: CurrencyCode;
  readonly lines: readonly PaymentAttemptLineView[];
  readonly address: CheckoutAddress;
  readonly subtotalMinor: number;
  readonly discountCode?: string;
  readonly discountMinor: number;
  readonly shippingName: LocalizedText;
  readonly shippingMinor: number;
  readonly totalMinor: number;
  readonly paidAt: Date;
  readonly createdAt: Date;
}

export class PaymentValidationError extends Error {
  constructor(readonly code: "invalid-amount" | "invalid-currency" | "invalid-status" | "invalid-provider-reference", message: string) {
    super(message);
    this.name = "PaymentValidationError";
  }
}

export function availableStock(onHand: number, reserved: number): number {
  if (!Number.isSafeInteger(onHand) || onHand < 0 || !Number.isSafeInteger(reserved) || reserved < 0 || reserved > onHand) {
    throw new PaymentValidationError("invalid-status", "Stock and reservation values are inconsistent.");
  }
  return onHand - reserved;
}

export function formatProviderAmount(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new PaymentValidationError("invalid-amount", "Payment amount is invalid.");
  return `${Math.floor(amountMinor / 100)}.${String(amountMinor % 100).padStart(2, "0")}`;
}

export function parseProviderAmount(value: string): number {
  if (!/^(0|[1-9]\d{0,12})(?:\.\d{1,2})?$/.test(value)) throw new PaymentValidationError("invalid-amount", "Provider amount is not a supported decimal value.");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new PaymentValidationError("invalid-amount", "Provider amount exceeds safe limits.");
  return amount;
}

export function validatePaidEvidence(input: {
  readonly expectedProvider: PaymentProvider;
  readonly expectedReference: string;
  readonly expectedAmountMinor: number;
  readonly expectedCurrency: CurrencyCode;
  readonly provider: PaymentProvider;
  readonly reference: string;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly status: "paid" | "pending" | "closed";
  readonly providerTradeNo?: string;
}): void {
  if (input.status !== "paid") throw new PaymentValidationError("invalid-status", "Provider evidence is not paid.");
  if (input.provider !== input.expectedProvider || input.reference !== input.expectedReference || !input.providerTradeNo) {
    throw new PaymentValidationError("invalid-provider-reference", "Provider evidence does not identify this Payment Attempt.");
  }
  if (input.currency !== input.expectedCurrency) throw new PaymentValidationError("invalid-currency", "Provider currency does not match the Payment Attempt.");
  if (input.amountMinor !== input.expectedAmountMinor) throw new PaymentValidationError("invalid-amount", "Provider amount does not match the Payment Attempt.");
}
