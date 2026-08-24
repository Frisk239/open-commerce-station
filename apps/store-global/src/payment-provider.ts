import {
  DeterministicPaymentAdapter,
  isPaypalConfigured,
  isStripeConfigured,
  loadPaypalAdapterConfig,
  loadStripeAdapterConfig,
  PaymentProviderError,
  PaypalPaymentAdapter,
  StripePaymentAdapter,
} from "@ocs/plugins";
import type { PaymentProviderAdapter } from "@ocs/plugins";

export type GlobalPaymentProvider = "paypal" | "stripe";

interface PaymentProviderSingletons {
  globalPaymentProviders?: Partial<Record<GlobalPaymentProvider, PaymentProviderAdapter>>;
}

const singletons = globalThis as typeof globalThis & PaymentProviderSingletons;

export function publicBaseUrl(): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  const value = configured || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3001");
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

export function paymentProviderReady(provider: GlobalPaymentProvider): boolean {
  if (process.env.OCS_PAYMENT_ADAPTER === "deterministic") return process.env.NODE_ENV !== "production";
  return provider === "paypal" ? isPaypalConfigured() : isStripeConfigured();
}

export function getPaymentProvider(provider: GlobalPaymentProvider): PaymentProviderAdapter {
  const cached = singletons.globalPaymentProviders?.[provider];
  if (cached) return cached;
  const created = createPaymentProvider(provider);
  singletons.globalPaymentProviders = { ...singletons.globalPaymentProviders, [provider]: created };
  return created;
}

function createPaymentProvider(provider: GlobalPaymentProvider): PaymentProviderAdapter {
  if (process.env.OCS_PAYMENT_ADAPTER === "deterministic") {
    if (process.env.NODE_ENV === "production") {
      throw new PaymentProviderError("configuration", "The deterministic payment adapter is forbidden in production.");
    }
    return new DeterministicPaymentAdapter({
      provider,
      baseUrl: publicBaseUrl(),
      returnPath: provider === "paypal" ? "/checkout/paypal/return" : "/checkout/stripe/return",
    });
  }
  return provider === "paypal"
    ? new PaypalPaymentAdapter(loadPaypalAdapterConfig())
    : new StripePaymentAdapter(loadStripeAdapterConfig());
}
