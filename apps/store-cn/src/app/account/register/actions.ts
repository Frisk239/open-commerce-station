"use server";
import { resolveShopperReturnPath } from "@ocs/core";
import { registerShopper, ShopperDataError } from "@ocs/data";
import { redirect } from "next/navigation";
import { shopperSignIn } from "../../../shopper-auth";
export async function register(formData: FormData) { const email = formData.get("email"); const password = formData.get("password"); const returnTo = resolveShopperReturnPath(formData.get("redirectTo")); if (typeof email !== "string" || typeof password !== "string") redirect(`/account/register?error=invalid&returnTo=${encodeURIComponent(returnTo)}`); try { await registerShopper("cn", email, password); } catch (error) { if (error instanceof ShopperDataError) redirect(`/account/register?error=${error.code === "duplicate-email" ? "duplicate" : "invalid"}&returnTo=${encodeURIComponent(returnTo)}`); throw error; } await shopperSignIn("credentials", { email, password, redirectTo: returnTo }); }
