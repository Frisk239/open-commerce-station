import { createHash } from "node:crypto";
import { formatProviderAmount, parseProviderAmount } from "@ocs/core";
import type { CurrencyCode, ProviderPaymentEvidence } from "@ocs/core";
import { AlipaySdk } from "alipay-sdk";
import type { AlipaySdkCommonResult } from "alipay-sdk";
import type {
  PaymentCheckoutRequest,
  PaymentProviderAdapter,
  PaymentRedirect,
  PaymentReferenceRequest,
} from "./payment";
import { PaymentProviderError } from "./payment";

export interface AlipayAdapterConfig {
  readonly appId: string;
  readonly privateKey: string;
  readonly alipayPublicKey: string;
  readonly gateway: string;
  readonly merchantPid?: string;
}

export interface AlipayClient {
  pageExecute(method: string, httpMethod: "GET" | "POST", params: Record<string, unknown>): string;
  checkNotifySignV2(fields: Readonly<Record<string, string>>): boolean;
  exec(method: string, params: Record<string, unknown>, options?: { validateSign?: boolean }): Promise<AlipaySdkCommonResult>;
}

function requireValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new PaymentProviderError("configuration", `${name} is required for Alipay.`);
  return value;
}

function pem(value: string, label: "PRIVATE KEY" | "PUBLIC KEY"): string {
  const normalized = value.replaceAll("\\n", "\n").trim();
  if (normalized.includes("-----BEGIN")) return normalized;
  const body = normalized.replace(/\s+/g, "");
  return `-----BEGIN ${label}-----\n${body.match(/.{1,64}/g)?.join("\n") ?? body}\n-----END ${label}-----`;
}

function safeGateway(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PaymentProviderError("configuration", "ALIPAY_GATEWAY_URL must be an absolute URL.");
  }
  if (url.protocol !== "https:") throw new PaymentProviderError("configuration", "Alipay gateway must use HTTPS.");
  return url.toString();
}

export function isAlipayConfigured(environment: NodeJS.ProcessEnv = process.env): boolean {
  return ["ALIPAY_APP_ID", "ALIPAY_APP_PRIVATE_KEY", "ALIPAY_PUBLIC_KEY", "ALIPAY_GATEWAY_URL"]
    .every((name) => Boolean(environment[name]?.trim()));
}

export function loadAlipayAdapterConfig(environment: NodeJS.ProcessEnv = process.env): AlipayAdapterConfig {
  return {
    appId: requireValue(environment, "ALIPAY_APP_ID"),
    privateKey: pem(requireValue(environment, "ALIPAY_APP_PRIVATE_KEY"), "PRIVATE KEY"),
    alipayPublicKey: pem(requireValue(environment, "ALIPAY_PUBLIC_KEY"), "PUBLIC KEY"),
    gateway: safeGateway(requireValue(environment, "ALIPAY_GATEWAY_URL")),
    merchantPid: environment.ALIPAY_SANDBOX_MERCHANT_PID?.trim() || undefined,
  };
}

function canonical(fields: Readonly<Record<string, string>>): string {
  return Object.entries(fields)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function payloadDigest(fields: Readonly<Record<string, string>>): string {
  return createHash("sha256").update(canonical(fields)).digest("hex");
}

function eventId(kind: "notify" | "query", fields: Readonly<Record<string, string>>): string {
  return `alipay-${kind}-${payloadDigest(fields)}`;
}

function paymentStatus(value: string | undefined): ProviderPaymentEvidence["status"] {
  if (value === "TRADE_SUCCESS" || value === "TRADE_FINISHED") return "paid";
  if (value === "WAIT_BUYER_PAY") return "pending";
  if (value === "TRADE_CLOSED") return "closed";
  throw new PaymentProviderError("invalid-response", "Alipay returned an unsupported trade status.");
}

function assertCurrency(currency: CurrencyCode): void {
  if (currency !== "CNY") throw new PaymentProviderError("invalid-response", "Alipay Checkout supports CNY only.");
}

export class AlipayPaymentAdapter implements PaymentProviderAdapter {
  readonly provider = "alipay" as const;
  readonly #client: AlipayClient;

  constructor(readonly config: AlipayAdapterConfig, client?: AlipayClient) {
    this.#client = client ?? new AlipaySdk({
      appId: config.appId,
      privateKey: config.privateKey,
      alipayPublicKey: config.alipayPublicKey,
      gateway: config.gateway,
      signType: "RSA2",
      keyType: "PKCS8",
      camelcase: true,
      timeout: 10_000,
    });
  }

  async createCheckout(request: PaymentCheckoutRequest): Promise<PaymentRedirect> {
    assertCurrency(request.currency);
    if (!request.notifyUrl) throw new PaymentProviderError("configuration", "Alipay checkout requires a notify URL.");
    const method = request.device === "mobile" ? "alipay.trade.wap.pay" : "alipay.trade.page.pay";
    const productCode = request.device === "mobile" ? "QUICK_WAP_WAY" : "FAST_INSTANT_TRADE_PAY";
    const url = this.#client.pageExecute(method, "GET", {
      notifyUrl: request.notifyUrl,
      returnUrl: request.returnUrl,
      bizContent: {
        outTradeNo: request.reference,
        totalAmount: formatProviderAmount(request.amountMinor),
        subject: request.subject.trim().slice(0, 256),
        productCode,
        timeoutExpress: `${Math.max(1, Math.ceil((request.expiresAt.getTime() - Date.now()) / 60_000))}m`,
      },
    });
    return { kind: "redirect", url };
  }

  async verifyNotification(fields: Readonly<Record<string, string>>): Promise<ProviderPaymentEvidence> {
    if (!this.#client.checkNotifySignV2(fields)) {
      throw new PaymentProviderError("invalid-signature", "Alipay notification signature is invalid.");
    }
    if (fields.app_id !== this.config.appId || (this.config.merchantPid && fields.seller_id !== this.config.merchantPid)) {
      throw new PaymentProviderError("invalid-response", "Alipay notification identifies another merchant application.");
    }
    if (!fields.out_trade_no || !fields.total_amount) {
      throw new PaymentProviderError("invalid-response", "Alipay notification is missing payment identity or amount.");
    }
    const digest = payloadDigest(fields);
    return {
      provider: "alipay",
      reference: fields.out_trade_no,
      amountMinor: parseProviderAmount(fields.total_amount),
      currency: "CNY",
      status: paymentStatus(fields.trade_status),
      providerTradeNo: fields.trade_no || undefined,
      event: { externalId: `alipay-notify-${digest}`, kind: "notify", payloadDigest: digest },
    };
  }

  async verifyReturnReference(fields: Readonly<Record<string, string>>): Promise<string> {
    if (!this.#client.checkNotifySignV2(fields)) {
      throw new PaymentProviderError("invalid-signature", "Alipay return signature is invalid.");
    }
    if (fields.app_id !== this.config.appId || !fields.out_trade_no) {
      throw new PaymentProviderError("invalid-response", "Alipay return identifies another application or no Payment Attempt.");
    }
    return fields.out_trade_no;
  }

  async query(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    assertCurrency(request.currency);
    let response: AlipaySdkCommonResult;
    try {
      response = await this.#client.exec("alipay.trade.query", {
        bizContent: { outTradeNo: request.reference },
      }, { validateSign: true });
    } catch (error) {
      throw new PaymentProviderError("unavailable", error instanceof Error ? error.message : "Alipay query failed.");
    }
    if (response.code !== "10000" || response.outTradeNo !== request.reference || !response.totalAmount) {
      throw new PaymentProviderError("invalid-response", response.sub_msg || "Alipay query returned an invalid response.");
    }
    const fields = Object.fromEntries(Object.entries(response).map(([key, value]) => [key, String(value)]));
    const digest = payloadDigest(fields);
    return {
      provider: "alipay",
      reference: response.outTradeNo,
      amountMinor: parseProviderAmount(response.totalAmount),
      currency: "CNY",
      status: paymentStatus(response.tradeStatus),
      providerTradeNo: response.tradeNo || undefined,
      event: { externalId: eventId("query", fields), kind: "query", payloadDigest: digest },
    };
  }

  async close(request: PaymentReferenceRequest): Promise<ProviderPaymentEvidence> {
    assertCurrency(request.currency);
    const current = await this.query(request);
    if (current.status !== "pending") return current;
    let response: AlipaySdkCommonResult;
    try {
      response = await this.#client.exec("alipay.trade.close", {
        bizContent: { outTradeNo: request.reference },
      }, { validateSign: true });
    } catch (error) {
      throw new PaymentProviderError("unavailable", error instanceof Error ? error.message : "Alipay close failed.");
    }
    if (response.code !== "10000" || response.outTradeNo !== request.reference) {
      return this.query(request);
    }
    const fields = Object.fromEntries(Object.entries(response).map(([key, value]) => [key, String(value)]));
    const digest = payloadDigest(fields);
    return {
      provider: "alipay",
      reference: request.reference,
      amountMinor: request.amountMinor,
      currency: "CNY",
      status: "closed",
      providerTradeNo: response.tradeNo || current.providerTradeNo,
      event: { externalId: eventId("query", fields), kind: "query", payloadDigest: digest },
    };
  }
}
