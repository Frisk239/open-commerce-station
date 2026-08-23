import { ShopperAuthForm } from "@ocs/storefront/shopper-auth-form";
import { resolveShopperReturnPath } from "@ocs/core";
import { redirect } from "next/navigation";
import { shopperAuth } from "../../../shopper-auth";
import { register } from "./actions";
export default async function ShopperRegisterPage({ searchParams }: { readonly searchParams: Promise<{ returnTo?: string; error?: string }> }) { const params = await searchParams; const returnTo = resolveShopperReturnPath(params.returnTo); if ((await shopperAuth())?.user) redirect(returnTo); const error = params.error === "duplicate" || params.error === "invalid" ? params.error : undefined; return <ShopperAuthForm flavor="global" mode="register" action={register} returnTo={returnTo} error={error} />; }
