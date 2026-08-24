import { createHash } from "node:crypto";
import { formatProviderAmount, parseProviderAmount } from "@ocs/core";
import type { CurrencyCode, ProviderPaymentEvidence } from "@ocs/core";
import type {
  PaymentCheckoutRequest,
  PaymentProviderAdapter,
  PaymentRedirect,
  PaymentReferenceRequest,
} from "./payment";
import { PaymentProviderError } from "./payment";

export interface PaypalAdapterConfig {
  readonly environment: "sandbox" | "live";
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface PaypalResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type PaypalFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<PaypalResponse>;

interface PaypalAmount {
  readonly currency_code?: string;
  readonly value?: string;
}

interface PaypalCapture {
  readonly id?: string;
  readonly status?: string;
  readonly amount?: PaypalAmount;
}

interface PaypalOrder {
  readonly id?: string;
  readonly status?: string;
  readonly purchase_units?: ReadonlyArray<{
    readonly reference_id?: string;
    readonly custom_id?: string;
    readonly amount?: PaypalAmount;
    readonly payments?: { readonly captures?: readonly PaypalCapture[] };
  }>;
  readonly links?: ReadonlyArray<{ readonly rel?: string; readonly href?: string }>;
}

function requireValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new PaymentProviderError("configuration", `${name} is required for PayPal.`);
  return value;
}

export function isPaypalConfigured(environment: NodeJS.ProcessEnv = process.env): boolean {
  const mode = environment.PAYPAL_ENVIRONMENT?.trim();
  return (mode === "sandbox" || mode === "live")
    && Boolean(environment.PAYPAL_CLIENT_ID?.trim() && environment.PAYPAL_CLIENT_SECRET?.trim());
}

export function loadPaypalAdapterConfig(environment: NodeJS.ProcessEnv = process.env): PaypalAdapterConfig {
  const mode = requireValue(environment, "PAYPAL_ENVIRONMENT");
  if (mode !== "sandbox" && mode !== "live") {
    throw new PaymentProviderError("configuration", "PAYPAL_ENVIRONMENT must be sandbox or live.");
  }
  return {
    environment: mode,
    clientId: requireValue(environment, "PAYPAL_CLIENT_ID"),
    clientSecret: requireValue(environment, "PAYPAL_CLIENT_SECRET"),
  };
}

function assertCurrency(currency: CurrencyCode): void {
  if (currency === "CNY") throw new PaymentProviderError("invalid-response", "PayPal Checkout does not support CNY.");
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * PayPal Orders v2 with server-side capture. The capture response — not the
 * browser return — is the trusted payment fact: money only moves when this
 * server calls capture on a pending Payment Attempt.
 */
export class PaypalPaymentAdapter implements PaymentProviderAdapter {
  readonly provider = "paypal" as const;
  readonly #config: PaypalAdapterConfig;
  readonly #fetch: PaypalFetch;
  #token?: { readonly value: string; readonly expiresAt: number };

  constructor(config: PaypalAdapterConfig, fetchImpl: PaypalFetch = ((url, init) => fetch(url, init)) as PaypalFetch) {
    this.#config = config;
    this.#fetch = fetchImpl;
  }

  get #base(): string {
    return this.#config.environment === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
  }

  async #accessToken(): Promise<string> {
    if (this.#token && this.#token.expiresAt > Date.now()) return this.#token.value;
    const credentials = Buffer.from(`${this.#config.clientId}:${this.#config.clientSecret}`).toString("base64");
    const response = await this.#fetch(`${this.#base}/v1/oauth2/token`, {
      method: "POST",
      headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!response.ok) throw new PaymentProviderError("unavailable", `PayPal authentication failed with HTTP ${response.status}.`);
    const payload = response.json() as Promise<{ access_token?: string; expires_in?: number }>;
    const parsed = await payload;
    if (!parsed.access_token || !parsed.expires_in) throw new PaymentProviderError("invalid-response", "PayPal authentication returned no token.");
    this.#token = { value: parsed.access_token, expiresAt: Date.now() + Math.max(60, parsed.expires_in - 60) * 1000 };
    return this.#token.value;
  }

  async #request(method: string, path: string, body?: unknown, retry = true): Promise<unknown> {
    const token = await this.#accessToken();
    const response = await this.#fetch(`${this.#base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...(body === undefined ? {} : { "request-id": createHash("sha256").update(`${method}${path}${JSON.stringify(body)}`).digest("hex") }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 401 && retry) {
      this.#token = undefined;
      return this.#request(method, path, body, false);
    }
    if (!response.ok) throw new PaymentProviderError("unavailable", `PayPal ${method} ${path} failed with HTTP ${response.status}.`);
    return response.json();
  }

  async #getOrder(providerReference: string): Promise<PaypalOrder> {
    return (await this.#request("GET", `/v2/checkout/orders/${encodeURIComponent(providerReference)}`)) as PaypalOrder;
  }

  #evidenceFromOrder(order: PaypalOrder, request: PaymentReferenceRequest, kind: "query" | "capture"): ProviderPaymentEvidence {
    if (!order.id) throw new PaymentProviderError("invalid-response", "PayPal order has no id.");
    const unit = order.purchase_units?.[0];
    if (!unit || (unit.custom_id !== request.reference && unit.reference_id !== request.reference)) {
      throw new PaymentProviderError("invalid-response", "PayPal order does not identify this Payment Attempt.");
    }
    const amount = unit.amount;
    if (!amount?.value || !amount.currency_code
      || parseProviderAmount(amount.value) !== request.amountMinor
      || amount.currency_code !== request.currency) {
      throw new PaymentProviderError("invalid-response", "PayPal order amount does not match the Payment Attempt.");
    }
    const capture = unit.payments?.captures?.find((item) => item.status === "COMPLETED");
    if (order.status === "COMPLETED") {
      if (!capture?.id) throw new PaymentProviderError("invalid-response", "Completed PayPal order has no capture.");
      const payload = digest(`${order.id}:${capture.id}:${request.amountMinor}:${request.currency}`);
      return {
        provider: "paypal",
        reference: request.reference,
        amountMinor: request.amountMinor,
        currency: request.currency,
        status: "paid",
        providerTradeNo: capture.id,
        event: { externalId: `paypal-${kind}-${payload}`, kind: "query", payloadDigest: payload },
      };
    }
    const payload = digest(`${order.id}:${order.status}:${request.amountMinor}:${request.currency}`);
    return {
      provider: "paypal",
      reference: request.reference,
      amountMinor: request.amountMinor,
      currency: request.currency,
      status: order.status === "VOIDED" ? "closed" : "pending",
      event: { externalId: `paypal-${kind}-${payload}`, kind: "query", payloadDigest: payload },
    };
  }

  async createCheckout(request: PaymentCheckoutRequest): Promise<PaymentRedirect> {
    assertCurrency(request.currency);
    const order = await this.#request("POST", "/v2/checkout/orders", {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: request.reference,
        custom_id: request.reference,
        description: request.subject.trim().slice(0, 127) || "Order",
        amount: { currency_code: request.currency, value: formatProviderAmount(request.amountMinor) },
      }],
      application_context: {
        return_url: request.returnUrl,
        cancel_url: request.cancelUrl ?? request.returnUrl,
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    }) as PaypalOrder;
    const approveUrl = order.links?.find((link) => link.rel === "approve")?.href;
    if (!order.id || !approveUrl) throw new PaymentProviderError("invalid-response", "PayPal order has no approval link.");
    return { kind: "redirect", url: approveUrl, providerReference: order.id };
  }

  async query(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    if (!request.providerReference) throw new PaymentProviderError("invalid-response", "PayPal query needs the provider order id.");
    return this.#evidenceFromOrder(await this.#getOrder(request.providerReference), request, "query");
  }

  async capture(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    if (!request.providerReference) throw new PaymentProviderError("invalid-response", "PayPal capture needs the provider order id.");
    const order = await this.#request("POST", `/v2/checkout/orders/${encodeURIComponent(request.providerReference)}/capture`, {}) as PaypalOrder;
    return this.#evidenceFromOrder(order, request, "capture");
  }

  async close(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    if (!request.providerReference) throw new PaymentProviderError("invalid-response", "PayPal close needs the provider order id.");
    const order = await this.#getOrder(request.providerReference);
    if (order.status === "COMPLETED") return this.#evidenceFromOrder(order, request, "query");
    // An approved buyer agreed to pay; honoring the capture is the honest close.
    if (order.status === "APPROVED") return this.capture(request);
    // CREATED orders can never be captured by this server again after release.
    const payload = digest(`${order.id}:${order.status}:released:${request.amountMinor}:${request.currency}`);
    return {
      provider: "paypal",
      reference: request.reference,
      amountMinor: request.amountMinor,
      currency: request.currency,
      status: "closed",
      providerTradeNo: undefined,
      event: { externalId: `paypal-close-${payload}`, kind: "query", payloadDigest: payload },
    };
  }
}
