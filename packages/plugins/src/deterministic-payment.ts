import { createHash } from "node:crypto";
import type { PaymentProvider, ProviderPaymentEvidence } from "@ocs/core";
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

export interface DeterministicPaymentAdapterOptions {
  readonly provider: PaymentProvider;
  readonly baseUrl: string;
  /** Path the fake provider redirects back to after settling, e.g. "/checkout/paypal/return". */
  readonly returnPath: string;
}

/**
 * Local, offline payment contract adapter. It never touches a network and is
 * forbidden in production by the application wiring, not by itself. The fake
 * redirect lands on the Station's test-payment route, which settles the
 * reference and sends the browser back to the provider return path.
 */
export class DeterministicPaymentAdapter implements PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  readonly #baseUrl: string;
  readonly #returnPath: string;
  readonly #status = new Map<string, FakeStatus>();

  constructor(options: DeterministicPaymentAdapterOptions) {
    this.provider = options.provider;
    this.#baseUrl = options.baseUrl;
    this.#returnPath = options.returnPath;
  }

  settle(reference: string, status: FakeStatus): void {
    this.#status.set(reference, status);
  }

  async createCheckout(request: PaymentCheckoutRequest): Promise<PaymentRedirect> {
    this.#status.set(request.reference, "pending");
    const url = new URL(`/api/test-payments/${this.provider}/${encodeURIComponent(request.reference)}`, this.#baseUrl);
    url.searchParams.set("amount", String(request.amountMinor));
    return { kind: "redirect", url: url.toString(), providerReference: `fake-${this.provider}-${request.reference}` };
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

  async capture(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    return this.#evidence(request, this.#status.get(request.reference) === "paid" ? "paid" : "pending", "capture");
  }

  async query(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    return this.#evidence(request, this.#status.get(request.reference) ?? "pending", "query");
  }

  async close(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    const status = this.#status.get(request.reference) ?? "pending";
    if (status === "pending") this.#status.set(request.reference, "closed");
    return this.#evidence(request, status === "pending" ? "closed" : status, "query");
  }

  returnPathFor(reference: string): string {
    const target = new URL(this.#returnPath, this.#baseUrl);
    target.searchParams.set("reference", reference);
    return target.pathname + target.search;
  }

  #evidence(request: PaymentReferenceRequest, status: FakeStatus, kind: "notify" | "query" | "capture"): ProviderPaymentEvidence {
    const payload = `${kind}:${request.reference}:${request.amountMinor}:${status}`;
    return {
      provider: this.provider,
      reference: request.reference,
      amountMinor: request.amountMinor,
      currency: request.currency,
      status,
      providerTradeNo: status === "paid" ? `fake-${request.reference}` : undefined,
      event: { externalId: `fake-${digest(payload)}`, kind: kind === "capture" ? "query" : kind, payloadDigest: digest(payload) },
    };
  }
}
