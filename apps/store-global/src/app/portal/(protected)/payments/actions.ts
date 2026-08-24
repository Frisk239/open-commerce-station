"use server";

import {
  closePaymentAttempt,
  confirmPaymentAttempt,
  readPortalPaymentAttempt,
  setPaymentMethodEnabled,
} from "@ocs/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { getPaymentProvider, paymentProviderReady, type GlobalPaymentProvider } from "../../../../payment-provider";

function providerFrom(formData: FormData): GlobalPaymentProvider | null {
  const value = formData.get("provider");
  return value === "paypal" || value === "stripe" ? value : null;
}

export async function updatePaymentMethod(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  const provider = providerFrom(formData);
  if (!provider) redirect("/portal/payments");
  const enabled = formData.get("enabled") === "1";
  if (enabled && !paymentProviderReady(provider)) redirect("/portal/payments?error=configuration");
  await setPaymentMethodEnabled("global", provider, enabled);
  revalidatePath("/checkout");
  redirect("/portal/payments?saved=1");
}

export async function reconcilePayment(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  const reference = formData.get("reference");
  if (typeof reference !== "string" || !reference.trim()) redirect("/portal/payments?error=reconcile");
  const attempt = await readPortalPaymentAttempt("global", reference.trim());
  if (!attempt || attempt.status !== "pending") redirect("/portal/payments");
  try {
    const provider = getPaymentProvider(attempt.provider === "stripe" ? "stripe" : "paypal");
    let evidence = await provider.query({
      reference: attempt.id,
      amountMinor: attempt.totalMinor,
      currency: attempt.currency,
      providerReference: attempt.providerReference,
    });
    if (evidence.status === "pending") {
      evidence = await provider.close({
        reference: attempt.id,
        amountMinor: attempt.totalMinor,
        currency: attempt.currency,
        providerReference: attempt.providerReference,
      });
    }
    if (evidence.status === "paid") await confirmPaymentAttempt(evidence);
    else if (evidence.status === "closed") {
      await closePaymentAttempt(evidence, attempt.expiresAt.getTime() <= Date.now() ? "expired" : "cancelled");
    }
  } catch {
    redirect("/portal/payments?error=reconcile");
  }
  revalidatePath("/portal/payments");
  redirect("/portal/payments?reconciled=1");
}
