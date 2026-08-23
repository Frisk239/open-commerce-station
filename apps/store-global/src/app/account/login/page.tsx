import { ShopperAuthForm } from "@ocs/storefront/shopper-auth-form";
import { resolveShopperReturnPath } from "@ocs/core";
import { redirect } from "next/navigation";
import { shopperAuth } from "../../../shopper-auth";
import { loginShopper } from "./actions";
export default async function ShopperLoginPage({ searchParams }: { readonly searchParams: Promise<{ returnTo?: string; error?: string }> }) { const params = await searchParams; const returnTo = resolveShopperReturnPath(params.returnTo); if ((await shopperAuth())?.user) redirect(returnTo); return <ShopperAuthForm flavor="global" mode="login" action={loginShopper} returnTo={returnTo} error={params.error === "credentials" ? "credentials" : undefined} />; }
