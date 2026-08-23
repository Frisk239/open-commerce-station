"use server";

import { randomUUID } from "node:crypto";
import { CatalogDataError, addVariantToCart } from "@ocs/data";
import type { CartActionState } from "@ocs/storefront/purchase-panel";
import { cookies } from "next/headers";

export async function addToCart(_state: CartActionState, formData: FormData): Promise<CartActionState> {
  const variantId = formData.get("variantId");
  const quantity = Number(formData.get("quantity"));
  if (typeof variantId !== "string" || !variantId || !Number.isSafeInteger(quantity) || quantity <= 0) {
    return { status: "error", error: "invalid-quantity", variantId: typeof variantId === "string" ? variantId : undefined };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ocs_cart_global")?.value ?? randomUUID();
  try {
    const result = await addVariantToCart("global", token, variantId, quantity);
    cookieStore.set("ocs_cart_global", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return { status: "added", lineCount: result.lineCount, variantId };
  } catch (error) {
    if (error instanceof CatalogDataError) return { status: "error", error: error.code === "out-of-stock" ? "out-of-stock" : "unavailable", variantId };
    throw error;
  }
}
