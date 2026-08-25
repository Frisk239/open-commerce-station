import type { CurrencyCode, PaymentProvider, ProviderPaymentEvidence, RefundPaymentEvidence } from "@ocs/core";

export interface PaymentCheckoutRequest {
  readonly reference: string;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly subject: string;
  readonly notifyUrl?: string;
  readonly returnUrl: string;
  readonly cancelUrl?: string;
  readonly expiresAt: Date;
  readonly device: "desktop" | "mobile";
}

/**
 * A provider checkout redirect. `providerReference` is the provider-owned id
 * (PayPal order id, Stripe Checkout Session id) when the provider does not
 * echo our own reference back; persist it on the Payment Attempt so later
 * query/close/recovery calls can address the provider object.
 */
export interface PaymentRedirect {
  readonly kind: "redirect";
  readonly url: string;
  readonly providerReference?: string;
}

export interface PaymentReferenceRequest {
  readonly reference: string;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly providerReference?: string;
}

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  createCheckout(request: PaymentCheckoutRequest): Promise<PaymentRedirect>;
  query(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence>;
  close(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence>;
  /** Optional server-to-server webhook verification; adapters without webhooks omit it. */
  verifyWebhook?(rawBody: string, signatureHeader: string | undefined): Promise<ProviderPaymentEvidence | null>;
  /** Optional signed form-verification for asynchronous provider callbacks (Alipay notify). */
  verifyNotification?(fields: Readonly<Record<string, string>>): Promise<ProviderPaymentEvidence>;
  /** Optional signed browser-return verification (Alipay return). */
  verifyReturnReference?(fields: Readonly<Record<string, string>>): Promise<string>;
  /** Optional server-initiated settlement (PayPal capture); adapters without it omit it. */
  capture?(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence>;
  /** Optional refund of a captured payment; money returns only through verified evidence. */
  refund?(request: RefundRequest): Promise<RefundPaymentEvidence>;
}

export interface RefundRequest {
  readonly reference: string;
  readonly providerTradeNo: string;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export class PaymentProviderError extends Error {
  constructor(
    readonly code: "configuration" | "invalid-signature" | "invalid-response" | "unavailable",
    message: string,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
