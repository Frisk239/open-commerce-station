import { closePaymentAttempt, confirmPaymentAttempt, readPaymentAttemptForShopper } from "@ocs/data";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPaymentProvider } from "../../../payment-provider";
import { flushNoticeMails } from "../../../notice-mail";
import { shopperAuth } from "../../../shopper-auth";
import { cancelPayment } from "./actions";

export const dynamic = "force-dynamic";

const attemptStatusCopy: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export default async function PaymentStatusPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ error?: string }>;
}) {
  const email = (await shopperAuth())?.user?.email;
  const { id } = await params;
  if (!email) redirect(`/account/login?returnTo=${encodeURIComponent(`/payment/${id}`)}`);
  let attempt = await readPaymentAttemptForShopper("global", email, id);
  if (!attempt) notFound();
  let recoveryError = (await searchParams).error === "recovery";
  if (attempt.status === "pending") {
    try {
      const evidence = await getPaymentProvider(attempt.provider === "stripe" ? "stripe" : "paypal").query({
        reference: attempt.id,
        amountMinor: attempt.totalMinor,
        currency: attempt.currency,
        providerReference: attempt.providerReference,
      });
      if (evidence.status === "paid") await confirmPaymentAttempt(evidence);
      if (evidence.status === "closed") await closePaymentAttempt(evidence, "failed");
      attempt = (await readPaymentAttemptForShopper("global", email, id))!;
    } catch {
      recoveryError = true;
    }
  }
  await flushNoticeMails("global");
  const paid = attempt.status === "paid";
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: attempt.currency });
  return <main className="min-h-screen bg-[#f3f0e8] px-5 py-14 text-stone-950"><section className="mx-auto max-w-2xl rounded-[2rem] border border-stone-200 bg-white p-7 md:p-10"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Payment Status</p><h1 className="mt-3 text-4xl font-bold">{paid ? "Payment complete" : attempt.status === "pending" ? "Confirming your payment" : "Payment not completed"}</h1><p className="mt-4 text-stone-600">Payment reference {attempt.id}</p><dl className="mt-8 grid gap-3 rounded-2xl bg-stone-50 p-5 text-sm"><div className="flex justify-between"><dt>Amount</dt><dd className="font-bold">{money.format(attempt.totalMinor / 100)}</dd></div><div className="flex justify-between"><dt>Method</dt><dd className="capitalize">{attempt.provider}</dd></div><div className="flex justify-between"><dt>Status</dt><dd>{attemptStatusCopy[attempt.status] ?? attempt.status}</dd></div>{attempt.orderNumber ? <div className="flex justify-between"><dt>Order</dt><dd className="font-mono">{attempt.orderNumber}</dd></div> : null}</dl>{recoveryError ? <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">We could not verify the final result with the payment provider yet. Do not pay again; refresh this page in a moment.</p> : null}<div className="mt-7 flex flex-wrap gap-4">{attempt.orderNumber ? <Link href={`/account/orders/${attempt.orderNumber}`} className="rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white">View order</Link> : null}{attempt.status === "pending" ? <><Link href={`/payment/${attempt.id}`} className="rounded-full border border-stone-300 px-5 py-3 text-sm font-bold">Refresh result</Link><form action={cancelPayment}><input type="hidden" name="reference" value={attempt.id} /><button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-bold">Cancel payment</button></form></> : <Link href="/" className="rounded-full border border-stone-300 px-5 py-3 text-sm font-bold">Back to the store</Link>}</div></section></main>;
}
