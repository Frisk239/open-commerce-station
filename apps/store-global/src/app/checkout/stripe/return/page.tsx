import { closePaymentAttempt, confirmPaymentAttempt, readPaymentAttemptForShopper } from "@ocs/data";
import { redirect } from "next/navigation";
import { getPaymentProvider } from "../../../../payment-provider";
import { shopperAuth } from "../../../../shopper-auth";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Stripe lands here after Checkout. The browser is not trusted: the session
 * is retrieved server-side, and a still-processing session stays pending
 * until the verified webhook or a later query settles it.
 */
export default async function StripeReturnPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const email = (await shopperAuth())?.user?.email;
  if (!email) redirect("/account/login?returnTo=/account/orders");
  const query = await searchParams;
  const reference = first(query.reference);
  if (reference) {
    try {
      const attempt = await readPaymentAttemptForShopper("global", email, reference);
      if (attempt && attempt.status === "pending") {
        const evidence = await getPaymentProvider("stripe").query({
          reference: attempt.id,
          amountMinor: attempt.totalMinor,
          currency: attempt.currency,
          providerReference: first(query.session_id) ?? attempt.providerReference,
        });
        if (evidence.status === "paid") await confirmPaymentAttempt(evidence);
        if (evidence.status === "closed") await closePaymentAttempt(evidence, "failed");
      }
    } catch {
      // Retrieval failed; the status page re-queries the provider.
    }
    redirect(`/payment/${encodeURIComponent(reference)}`);
  }
  redirect("/checkout?paymentError=return");
}
