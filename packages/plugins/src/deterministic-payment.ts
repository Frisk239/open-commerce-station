import { createHash } from "node:crypto";
import type { ProviderPaymentEvidence } from "@ocs/core";
import type {
  PaymentCheckoutRequest,
  PaymentProviderAdapter,
  PaymentRedirect,
  PaymentReferenceRequest,
} from "./payment";
import { PaymentProviderError } from "./payment";

type FakeStatus = "paid" | "pending" | "closed";

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export class DeterministicAlipayAdapter implements PaymentProviderAdapter {
  readonly provider = "alipay" as const;
  readonly #status = new Map<string, FakeStatus>();

  constructor(readonly baseUrl: string) {}

  settle(reference: string, status: FakeStatus): void {
    this.#status.set(reference, status);
  }

  async createCheckout(request: PaymentCheckoutRequest): Promise<PaymentRedirect> {
    this.#status.set(request.reference, "pending");
    const url = new URL(`/api/test-payments/${encodeURIComponent(request.reference)}`, this.baseUrl);
    url.searchParams.set("amount", String(request.amountMinor));
    return { kind: "redirect", url: url.toString() };
  }

  async verifyNotification(fields: Readonly<Record<string, string>>): Promise<ProviderPaymentEvidence> {
    if (!fields.reference || !fields.amount || !fields.status) {
      throw new PaymentProviderError("invalid-response", "Deterministic notification is incomplete.");
    }
    return this.#evidence({
      reference: fields.reference,
      amountMinor: Number(fields.amount),
      currency: "CNY",
    }, fields.status as FakeStatus, "notify");
  }

  async verifyReturnReference(fields: Readonly<Record<string, string>>): Promise<string> {
    if (!fields.reference) throw new PaymentProviderError("invalid-response", "Deterministic return has no reference.");
    return fields.reference;
  }

  async query(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    return this.#evidence(request, this.#status.get(request.reference) ?? "pending", "query");
  }

  async close(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    const status = this.#status.get(request.reference) ?? "pending";
    if (status === "pending") this.#status.set(request.reference, "closed");
    return this.#evidence(request, status === "pending" ? "closed" : status, "query");
  }

  #evidence(request: PaymentReferenceRequest, status: FakeStatus, kind: "notify" | "query"): ProviderPaymentEvidence {
    const payload = `${kind}:${request.reference}:${request.amountMinor}:${status}`;
    return {
      provider: "alipay",
      reference: request.reference,
      amountMinor: request.amountMinor,
      currency: request.currency,
      status,
      providerTradeNo: status === "paid" ? `fake-${request.reference}` : undefined,
      event: { externalId: `fake-${digest(payload)}`, kind, payloadDigest: digest(payload) },
    };
  }
}
