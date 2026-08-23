"use server";

import { CheckoutDataError, deleteDiscountCode, deleteShippingRate } from "@ocs/data";
import {
  CommerceSettingsFormError,
  updateDiscountFromForm,
  updatePolicyFromForm,
  updateShippingRateFromForm,
} from "@ocs/portal/commerce-settings";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";

async function requireOwner() { if (!(await auth())?.user) redirect("/portal/login"); }
function settingsError(path: string, error: unknown): never {
  if (error instanceof CommerceSettingsFormError || error instanceof CheckoutDataError) redirect(`${path}?error=1`);
  throw error;
}

export async function saveDiscount(formData: FormData) { await requireOwner(); try { await updateDiscountFromForm("cn", formData); } catch (error) { settingsError("/portal/discounts", error); } revalidatePath("/checkout"); redirect("/portal/discounts?saved=1"); }
export async function removeDiscount(formData: FormData) { await requireOwner(); const id = formData.get("id"); if (typeof id !== "string") redirect("/portal/discounts?error=1"); try { await deleteDiscountCode("cn", id); } catch (error) { settingsError("/portal/discounts", error); } revalidatePath("/checkout"); redirect("/portal/discounts?saved=1"); }
export async function saveShipping(formData: FormData) { await requireOwner(); try { await updateShippingRateFromForm("cn", formData); } catch (error) { settingsError("/portal/shipping", error); } revalidatePath("/checkout"); redirect("/portal/shipping?saved=1"); }
export async function removeShipping(formData: FormData) { await requireOwner(); const id = formData.get("id"); if (typeof id !== "string") redirect("/portal/shipping?error=1"); try { await deleteShippingRate("cn", id); } catch (error) { settingsError("/portal/shipping", error); } revalidatePath("/checkout"); redirect("/portal/shipping?saved=1"); }
export async function savePolicy(formData: FormData) { await requireOwner(); try { await updatePolicyFromForm("cn", formData); } catch (error) { settingsError("/portal/policies", error); } revalidatePath("/", "layout"); redirect("/portal/policies?saved=1"); }
