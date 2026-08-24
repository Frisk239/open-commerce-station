import { readPaymentAttemptForShopper } from "@ocs/data";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getPaymentProvider, publicBaseUrl } from "../../../../../payment-provider";
import { shopperAuth } from "../../../../../shopper-auth";
import { getStoreIdentity } from "../../../../../store";

export const dynamic = "force-dynamic";

export default async function StartAlipayPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const email = (await shopperAuth())?.user?.email;
  const { id } = await params;
  if (!email) redirect(`/account/login?returnTo=${encodeURIComponent(`/checkout/alipay/start/${id}`)}`);
  const attempt = await readPaymentAttemptForShopper("cn", email, id);
  if (!attempt) notFound();
  if (attempt.status !== "pending") redirect(`/payment/${attempt.id}`);

  const [requestHeaders, identity] = await Promise.all([headers(), getStoreIdentity()]);
  const mobile = /Android|iPhone|iPad|Mobile/i.test(requestHeaders.get("user-agent") ?? "");
  const baseUrl = publicBaseUrl();
  const checkout = await getPaymentProvider().createCheckout({
    reference: attempt.id,
    amountMinor: attempt.totalMinor,
    currency: attempt.currency,
    subject: `${identity.name} · ${attempt.id.slice(0, 8)}`,
    notifyUrl: new URL("/api/payments/alipay/notify", baseUrl).toString(),
    returnUrl: new URL("/checkout/alipay/return", baseUrl).toString(),
    expiresAt: attempt.expiresAt,
    device: mobile ? "mobile" : "desktop",
  });
  redirect(checkout.url);
}
