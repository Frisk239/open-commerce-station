"use server";

import { CheckoutValidationError } from "@ocs/core";
import type { CheckoutAddress } from "@ocs/core";
import { calculatePersistedCheckoutQuote, saveDefaultAddress } from "@ocs/data";
import type { CheckoutActionState, CheckoutFormFields } from "@ocs/storefront/checkout-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { shopperAuth } from "../../shopper-auth";

function value(formData: FormData, name: string): string {
  const input = formData.get(name);
  return typeof input === "string" ? input.trim() : "";
}

export async function calculateQuote(_state: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  const session = await shopperAuth();
  const email = session?.user?.email;
  if (!email) redirect("/account/login?returnTo=/checkout");
  const fields: CheckoutFormFields = {
    recipientName: value(formData, "recipientName"), phone: value(formData, "phone"), countryCode: value(formData, "countryCode").toUpperCase(),
    region: value(formData, "region"), city: value(formData, "city"), district: value(formData, "district"),
    postalCode: value(formData, "postalCode"), line1: value(formData, "line1"), line2: value(formData, "line2"),
    discountCode: value(formData, "discountCode"), selectedShippingRateId: value(formData, "selectedShippingRateId"),
  };
  const token = (await cookies()).get("ocs_cart_global")?.value;
  if (!token) return { fields, error: "empty-cart" };
  const address: CheckoutAddress = fields;
  try {
    const quote = await calculatePersistedCheckoutQuote({ flavor: "global", currency: "USD", cartToken: token, address, discountCode: fields.discountCode || undefined, selectedShippingRateId: fields.selectedShippingRateId || undefined });
    await saveDefaultAddress("global", email, address);
    return { fields: { ...fields, selectedShippingRateId: quote.selectedShippingRateId }, quote };
  } catch (error) {
    return { fields, error: error instanceof CheckoutValidationError ? error.code : "unexpected" };
  }
}
