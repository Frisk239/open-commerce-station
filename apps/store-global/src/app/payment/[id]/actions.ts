"use server";

import { closePaymentAttempt, confirmPaymentAttempt, readPaymentAttemptForShopper } from "@ocs/data";
import { redirect } from "next/navigation";
import { getPaymentProvider } from "../../../payment-provider";
import { shopperAuth } from "../../../shopper-auth";

export async function cancelPayment(formData: FormData): Promise<void> {
  const email = (await shopperAuth())?.user?.email;
  const reference = formData.get("reference");
  if (!email || typeof reference !== "string") redirect("/account/login?returnTo=/account/orders");
  const attempt = await readPaymentAttemptForShopper("global", email, reference);
  if (!attempt || attempt.status !== "pending") redirect(`/payment/${encodeURIComponent(reference)}`);
  try {
    const evidence = await getPaymentProvider(attempt.provider === "stripe" ? "stripe" : "paypal").close({
      reference: attempt.id,
      amountMinor: attempt.totalMinor,
      currency: attempt.currency,
      providerReference: attempt.providerReference,
    });
    if (evidence.status === "paid") await confirmPaymentAttempt(evidence);
    if (evidence.status === "closed") await closePaymentAttempt(evidence, "cancelled");
  } catch {
    redirect(`/payment/${encodeURIComponent(reference)}?error=recovery`);
  }
  redirect(`/payment/${encodeURIComponent(reference)}`);
}
