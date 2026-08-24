"use server";

import { CheckoutValidationError } from "@ocs/core";
import type { CheckoutAddress, PaymentAttemptView } from "@ocs/core";
import { calculatePersistedCheckoutQuote, createPaymentAttempt, PaymentDataError, saveDefaultAddress } from "@ocs/data";
import type { CheckoutActionState, CheckoutFormFields } from "@ocs/storefront/checkout-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { shopperAuth } from "../../shopper-auth";
import { paymentProviderReady } from "../../payment-provider";

function value(formData: FormData, name: string): string {
  const input = formData.get(name);
  return typeof input === "string" ? input.trim() : "";
}

export async function calculateQuote(_state: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  const session = await shopperAuth();
  const email = session?.user?.email;
  if (!email) redirect("/account/login?returnTo=/checkout");
  const fields: CheckoutFormFields = {
    recipientName: value(formData, "recipientName"), phone: value(formData, "phone"), countryCode: "CN",
    region: value(formData, "region"), city: value(formData, "city"), district: value(formData, "district"),
    postalCode: value(formData, "postalCode"), line1: value(formData, "line1"), line2: value(formData, "line2"),
    discountCode: value(formData, "discountCode"), selectedShippingRateId: value(formData, "selectedShippingRateId"),
  };
  const token = (await cookies()).get("ocs_cart_cn")?.value;
  if (!token) return { fields, error: "empty-cart" };
  const address: CheckoutAddress = fields;
  let attempt: PaymentAttemptView | undefined;
  try {
    const quote = await calculatePersistedCheckoutQuote({ flavor: "cn", currency: "CNY", cartToken: token, address, discountCode: fields.discountCode || undefined, selectedShippingRateId: fields.selectedShippingRateId || undefined });
    await saveDefaultAddress("cn", email, address);
    if (value(formData, "intent") === "pay-alipay") {
      if (!paymentProviderReady()) return { fields: { ...fields, selectedShippingRateId: quote.selectedShippingRateId }, quote, error: "payment-disabled" };
      attempt = await createPaymentAttempt({
        flavor: "cn", provider: "alipay", currency: "CNY", cartToken: token, shopperEmail: email, address,
        discountCode: fields.discountCode || undefined, selectedShippingRateId: quote.selectedShippingRateId,
      });
    } else {
      return { fields: { ...fields, selectedShippingRateId: quote.selectedShippingRateId }, quote };
    }
  } catch (error) {
    if (error instanceof CheckoutValidationError) return { fields, error: error.code };
    if (error instanceof PaymentDataError) {
      const paymentError = error.code === "disabled" ? "payment-disabled"
        : error.code === "recovery-required" ? "payment-recovery"
        : error.code === "out-of-stock" ? "out-of-stock"
        : "unexpected";
      return { fields, error: paymentError };
    }
    return { fields, error: "unexpected" };
  }
  redirect(`/checkout/alipay/start/${attempt.id}`);
}
