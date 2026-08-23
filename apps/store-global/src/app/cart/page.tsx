import { readCart } from "@ocs/data";
import { CartPage } from "@ocs/storefront/cart-page";
import { cookies } from "next/headers";
import { clearCurrentCart, updateCartLine } from "./actions";
export const dynamic = "force-dynamic";
export default async function CurrentCartPage({ searchParams }: { readonly searchParams: Promise<{ error?: string }> }) { const [cookieStore, params] = await Promise.all([cookies(), searchParams]); const token = cookieStore.get("ocs_cart_global")?.value; const cart = token ? await readCart("global", token) : { lines: [], quantity: 0, subtotalMinor: 0, hasInvalidLines: false } as const; const error = params.error === "out-of-stock" || params.error === "unavailable" ? params.error : undefined; return <CartPage cart={cart} locale="en" currency="USD" updateAction={updateCartLine} clearAction={clearCurrentCart} error={error} />; }
