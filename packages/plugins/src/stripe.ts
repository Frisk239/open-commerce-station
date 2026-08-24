import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { CurrencyCode, ProviderPaymentEvidence } from "@ocs/core";
import type {
  PaymentCheckoutRequest,
  PaymentProviderAdapter,
  PaymentRedirect,
  PaymentReferenceRequest,
} from "./payment";
import { PaymentProviderError } from "./payment";

export interface StripeAdapterConfig {
  readonly secretKey: string;
  readonly webhookSecret?: string;
}

export interface StripeResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type StripeFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<StripeResponse>;

interface StripeSession {
  readonly id?: string;
  readonly url?: string;
  readonly status?: string;
  readonly payment_status?: string;
  readonly payment_intent?: string | null;
  readonly client_reference_id?: string | null;
  readonly amount_total?: number | null;
  readonly currency?: string | null;
  readonly expires_at?: number | null;
}

function requireValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new PaymentProviderError("configuration", `${name} is required for Stripe.`);
  return value;
}

export function isStripeConfigured(environment: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(environment.STRIPE_SECRET_KEY?.trim());
}

export function loadStripeAdapterConfig(environment: NodeJS.ProcessEnv = process.env): StripeAdapterConfig {
  return {
    secretKey: requireValue(environment, "STRIPE_SECRET_KEY"),
    webhookSecret: environment.STRIPE_WEBHOOK_SECRET?.trim() || undefined,
  };
}

function assertCurrency(currency: CurrencyCode): void {
  if (currency === "CNY") throw new PaymentProviderError("invalid-response", "Stripe Checkout does not support CNY on this Station.");
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Stripe Checkout Session adapter. The Session retrieved server-side (on
 * return, status, or reconciliation) and the HMAC-verified webhook are the
 * trusted facts; the browser return alone confirms nothing.
 */
export class StripePaymentAdapter implements PaymentProviderAdapter {
  readonly provider = "stripe" as const;
  readonly #config: StripeAdapterConfig;
  readonly #fetch: StripeFetch;

  constructor(config: StripeAdapterConfig, fetchImpl: StripeFetch = ((url, init) => fetch(url, init)) as StripeFetch) {
    this.#config = config;
    this.#fetch = fetchImpl;
  }

  async #request(method: string, path: string, params?: Record<string, string>): Promise<unknown> {
    const body = params ? new URLSearchParams(params).toString() : undefined;
    const response = await this.#fetch(`https://api.stripe.com${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.#config.secretKey}`,
        ...(body === undefined ? {} : { "content-type": "application/x-www-form-urlencoded" }),
      },
      ...(body === undefined ? {} : { body }),
    });
    if (!response.ok) throw new PaymentProviderError("unavailable", `Stripe ${method} ${path} failed with HTTP ${response.status}.`);
    return response.json();
  }

  #evidenceFromSession(session: StripeSession, request: PaymentReferenceRequest, kind: "query" | "notify"): ProviderPaymentEvidence {
    if (!session.id || !session.client_reference_id) {
      throw new PaymentProviderError("invalid-response", "Stripe session does not identify this Payment Attempt.");
    }
    if (session.client_reference_id !== request.reference
      || session.amount_total !== request.amountMinor
      || (session.currency ?? "").toUpperCase() !== request.currency) {
      throw new PaymentProviderError("invalid-response", "Stripe session amount does not match the Payment Attempt.");
    }
    const payload = digest(`${session.id}:${session.status}:${session.payment_status}:${request.amountMinor}:${request.currency}`);
    if (session.status === "complete" && session.payment_status === "paid") {
      if (!session.payment_intent) throw new PaymentProviderError("invalid-response", "Paid Stripe session has no PaymentIntent.");
      return {
        provider: "stripe",
        reference: request.reference,
        amountMinor: request.amountMinor,
        currency: request.currency,
        status: "paid",
        providerTradeNo: session.payment_intent,
        event: { externalId: `stripe-${kind}-${payload}`, kind, payloadDigest: payload },
      };
    }
    return {
      provider: "stripe",
      reference: request.reference,
      amountMinor: request.amountMinor,
      currency: request.currency,
      status: session.status === "expired" ? "closed" : "pending",
      event: { externalId: `stripe-${kind}-${payload}`, kind, payloadDigest: payload },
    };
  }

  async createCheckout(request: PaymentCheckoutRequest): Promise<PaymentRedirect> {
    assertCurrency(request.currency);
    // Stripe requires the session to stay open for at least 30 minutes.
    const expiresAt = Math.max(request.expiresAt.getTime(), Date.now() + 31 * 60_000);
    const session = await this.#request("POST", "/v1/checkout/sessions", {
      mode: "payment",
      success_url: request.returnUrl,
      cancel_url: request.cancelUrl ?? request.returnUrl,
      client_reference_id: request.reference,
      expires_at: String(Math.floor(expiresAt / 1000)),
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": request.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(request.amountMinor),
      "line_items[0][price_data][product_data][name]": request.subject.trim().slice(0, 100) || "Order",
    }) as StripeSession;
    if (!session.id || !session.url) throw new PaymentProviderError("invalid-response", "Stripe session has no checkout URL.");
    return { kind: "redirect", url: session.url, providerReference: session.id };
  }

  async query(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    if (!request.providerReference) throw new PaymentProviderError("invalid-response", "Stripe query needs the session id.");
    const session = await this.#request("GET", `/v1/checkout/sessions/${encodeURIComponent(request.providerReference)}`) as StripeSession;
    return this.#evidenceFromSession(session, request, "query");
  }

  async close(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    if (!request.providerReference) throw new PaymentProviderError("invalid-response", "Stripe close needs the session id.");
    let session: StripeSession;
    try {
      session = await this.#request("POST", `/v1/checkout/sessions/${encodeURIComponent(request.providerReference)}/expire`) as StripeSession;
    } catch {
      // Already completed or expired sessions cannot be expired; report facts.
      session = await this.#request("GET", `/v1/checkout/sessions/${encodeURIComponent(request.providerReference)}`) as StripeSession;
    }
    return this.#evidenceFromSession(session, request, "query");
  }

  async verifyWebhook(rawBody: string, signatureHeader: string | undefined): Promise<ProviderPaymentEvidence | null> {
    if (!this.#config.webhookSecret) throw new PaymentProviderError("configuration", "STRIPE_WEBHOOK_SECRET is required to verify webhooks.");
    const parts = Object.fromEntries((signatureHeader ?? "").split(",").map((part) => part.split("=", 2) as [string, string]));
    const timestamp = parts.t;
    const signatures = (signatureHeader ?? "").split(",").filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
    if (!timestamp || signatures.length === 0) throw new PaymentProviderError("invalid-signature", "Stripe webhook signature is malformed.");
    const expected = createHmac("sha256", this.#config.webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
    const valid = signatures.some((signature) => {
      const given = Buffer.from(signature, "utf8");
      const wanted = Buffer.from(expected, "utf8");
      return given.length === wanted.length && timingSafeEqual(given, wanted);
    });
    if (!valid) throw new PaymentProviderError("invalid-signature", "Stripe webhook signature is invalid.");
    let event: { type?: string; data?: { object?: unknown } };
    try {
      event = JSON.parse(rawBody) as typeof event;
    } catch {
      throw new PaymentProviderError("invalid-response", "Stripe webhook payload is not valid JSON.");
    }
    if (event.type !== "checkout.session.completed") return null;
    const session = event.data?.object as StripeSession | undefined;
    if (!session?.id || !session.client_reference_id) {
      throw new PaymentProviderError("invalid-response", "Stripe webhook session is incomplete.");
    }
    return this.#evidenceFromSession(session, {
      reference: session.client_reference_id,
      amountMinor: session.amount_total ?? -1,
      currency: (session.currency ?? "XXX").toUpperCase() as CurrencyCode,
    }, "notify");
  }
}
