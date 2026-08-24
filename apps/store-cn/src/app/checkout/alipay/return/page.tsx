import { closePaymentAttempt, confirmPaymentAttempt, readPaymentAttemptForShopper } from "@ocs/data";
import { redirect } from "next/navigation";
import { getPaymentProvider } from "../../../../payment-provider";
import { shopperAuth } from "../../../../shopper-auth";

export const dynamic = "force-dynamic";

function stringFields(values: Record<string, string | string[] | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []));
}

export default async function AlipayReturnPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const email = (await shopperAuth())?.user?.email;
  if (!email) redirect("/account/login?returnTo=/account/orders");
  const provider = getPaymentProvider();
  let target = "/checkout?paymentError=return";
  try {
    const reference = await provider.verifyReturnReference(stringFields(await searchParams));
    const attempt = await readPaymentAttemptForShopper("cn", email, reference);
    if (!attempt) throw new Error("Payment Attempt not found.");
    if (attempt.status === "pending") {
      const evidence = await provider.query({ reference, amountMinor: attempt.totalMinor, currency: attempt.currency });
      if (evidence.status === "paid") await confirmPaymentAttempt(evidence);
      if (evidence.status === "closed") await closePaymentAttempt(evidence, "failed");
    }
    target = `/payment/${encodeURIComponent(reference)}`;
  } catch {
    target = "/checkout?paymentError=return";
  }
  redirect(target);
}
