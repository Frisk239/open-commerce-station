import type { CurrencyCode, ProviderPaymentEvidence } from "@ocs/core";

export interface PaymentCheckoutRequest {
  readonly reference: string;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly subject: string;
  readonly notifyUrl: string;
  readonly returnUrl: string;
  readonly expiresAt: Date;
  readonly device: "desktop" | "mobile";
}

export interface PaymentRedirect {
  readonly kind: "redirect";
  readonly url: string;
}

export interface PaymentReferenceRequest {
  readonly reference: string;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export interface PaymentProviderAdapter {
  readonly provider: "alipay";
  createCheckout(request: PaymentCheckoutRequest): Promise<PaymentRedirect>;
  verifyNotification(fields: Readonly<Record<string, string>>): Promise<ProviderPaymentEvidence>;
  verifyReturnReference(fields: Readonly<Record<string, string>>): Promise<string>;
  query(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence>;
  close(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence>;
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
