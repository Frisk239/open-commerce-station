import { confirmPaymentAttempt, readPaymentAttemptForShopper } from "@ocs/data";
import { redirect } from "next/navigation";
import { getPaymentProvider } from "../../../../payment-provider";
import { shopperAuth } from "../../../../shopper-auth";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * PayPal lands here after buyer approval. The browser is not trusted: the
 * page captures the order server-side, and only the capture result confirms
 * the Payment Attempt.
 */
export default async function PaypalReturnPage({
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
        const provider = getPaymentProvider("paypal");
        if (provider.capture) {
          const evidence = await provider.capture({
            reference: attempt.id,
            amountMinor: attempt.totalMinor,
            currency: attempt.currency,
            providerReference: first(query.token) ?? attempt.providerReference,
          });
          if (evidence.status === "paid") await confirmPaymentAttempt(evidence);
        }
      }
    } catch {
      // Capture did not settle; the status page re-queries the provider.
    }
    redirect(`/payment/${encodeURIComponent(reference)}`);
  }
  redirect("/checkout?paymentError=return");
}
