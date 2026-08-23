"use server";
import { resolveShopperReturnPath } from "@ocs/core";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { shopperSignIn } from "../../../shopper-auth";
export async function loginShopper(formData: FormData) { const email = formData.get("email"); const password = formData.get("password"); const returnTo = resolveShopperReturnPath(formData.get("redirectTo")); try { await shopperSignIn("credentials", { email, password, redirectTo: returnTo }); } catch (error) { if (error instanceof AuthError) redirect(`/account/login?error=credentials&returnTo=${encodeURIComponent(returnTo)}`); throw error; } }
