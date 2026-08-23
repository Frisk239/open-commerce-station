"use server";

import { CatalogDataError, clearCart, setCartLineQuantity } from "@ocs/data";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function updateCartLine(formData: FormData) {
  const token = (await cookies()).get("ocs_cart_global")?.value;
  const variantId = formData.get("variantId");
  const rawQuantity = formData.get("quantity");
  const quantity = typeof rawQuantity === "string" && rawQuantity.trim() ? Number(rawQuantity) : Number.NaN;
  if (!token || typeof variantId !== "string" || !Number.isSafeInteger(quantity) || quantity < 0) redirect("/cart?error=unavailable");
  try {
    await setCartLineQuantity("global", token, variantId, quantity);
  } catch (error) {
    if (error instanceof CatalogDataError) redirect(`/cart?error=${error.code === "out-of-stock" ? "out-of-stock" : "unavailable"}`);
    throw error;
  }
  redirect("/cart");
}

export async function clearCurrentCart() {
  const token = (await cookies()).get("ocs_cart_global")?.value;
  if (token) await clearCart("global", token);
  redirect("/cart");
}
