import { readPaymentAttemptForShopper, savePaymentAttemptProviderReference } from "@ocs/data";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getPaymentProvider, publicBaseUrl } from "../../../../../payment-provider";
import { shopperAuth } from "../../../../../shopper-auth";
import { getStoreIdentity } from "../../../../../store";

export const dynamic = "force-dynamic";

export default async function StartStripePage({ params }: { readonly params: Promise<{ id: string }> }) {
  const email = (await shopperAuth())?.user?.email;
  const { id } = await params;
  if (!email) redirect(`/account/login?returnTo=${encodeURIComponent(`/checkout/stripe/start/${id}`)}`);
  const attempt = await readPaymentAttemptForShopper("global", email, id);
  if (!attempt) notFound();
  if (attempt.status !== "pending") redirect(`/payment/${attempt.id}`);

  const [requestHeaders, identity] = await Promise.all([headers(), getStoreIdentity()]);
  const mobile = /Android|iPhone|iPad|Mobile/i.test(requestHeaders.get("user-agent") ?? "");
  const baseUrl = publicBaseUrl();
  const returnUrl = new URL("/checkout/stripe/return", baseUrl);
  returnUrl.searchParams.set("reference", attempt.id);
  const cancelUrl = new URL(`/payment/${encodeURIComponent(attempt.id)}`, baseUrl);
  const checkout = await getPaymentProvider("stripe").createCheckout({
    reference: attempt.id,
    amountMinor: attempt.totalMinor,
    currency: attempt.currency,
    subject: `${identity.name} · ${attempt.id.slice(0, 8)}`,
    returnUrl: returnUrl.toString(),
    cancelUrl: cancelUrl.toString(),
    expiresAt: attempt.expiresAt,
    device: mobile ? "mobile" : "desktop",
  });
  if (checkout.providerReference) {
    await savePaymentAttemptProviderReference("global", attempt.id, checkout.providerReference);
  }
  redirect(checkout.url);
}
