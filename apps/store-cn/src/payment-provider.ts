import {
  AlipayPaymentAdapter,
  DeterministicPaymentAdapter,
  isAlipayConfigured,
  loadAlipayAdapterConfig,
  PaymentProviderError,
} from "@ocs/plugins";
import type { PaymentProviderAdapter } from "@ocs/plugins";

interface PaymentProviderSingleton {
  cnPaymentProvider?: PaymentProviderAdapter;
}

const singleton = globalThis as typeof globalThis & PaymentProviderSingleton;

export function publicBaseUrl(): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  const value = configured || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (!value) throw new PaymentProviderError("configuration", "PUBLIC_BASE_URL is required for payment callbacks.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PaymentProviderError("configuration", "PUBLIC_BASE_URL must be an absolute URL.");
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)
    || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
    throw new PaymentProviderError("configuration", "PUBLIC_BASE_URL must use HTTPS in production.");
  }
  return url.origin;
}

export function paymentProviderReady(): boolean {
  if (process.env.OCS_PAYMENT_ADAPTER === "deterministic") return process.env.NODE_ENV !== "production";
  return isAlipayConfigured();
}

export function getPaymentProvider(): PaymentProviderAdapter {
  if (singleton.cnPaymentProvider) return singleton.cnPaymentProvider;
  if (process.env.OCS_PAYMENT_ADAPTER === "deterministic") {
    if (process.env.NODE_ENV === "production") {
      throw new PaymentProviderError("configuration", "The deterministic payment adapter is forbidden in production.");
    }
    singleton.cnPaymentProvider = new DeterministicPaymentAdapter({
      provider: "alipay",
      baseUrl: publicBaseUrl(),
      returnPath: "/checkout/alipay/return",
    });
    return singleton.cnPaymentProvider;
  }
  singleton.cnPaymentProvider = new AlipayPaymentAdapter(loadAlipayAdapterConfig());
  return singleton.cnPaymentProvider;
}
