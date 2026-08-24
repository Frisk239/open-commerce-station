import { listPaymentMethods, listPortalPaymentAttempts } from "@ocs/data";
import { paymentProviderReady, type GlobalPaymentProvider } from "../../../../payment-provider";
import { reconcilePayment, updatePaymentMethod } from "./actions";

const statusCopy: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  expired: "Expired",
};

const providerCopy: Record<GlobalPaymentProvider, { title: string; enabled: string; disabled: string; blurb: string; envHint: string }> = {
  paypal: {
    title: "PayPal",
    enabled: "Enabled",
    disabled: "Not enabled",
    blurb: "PayPal Checkout with server-side capture; the capture result, not the browser return, confirms payment.",
    envHint: "PAYPAL_ENVIRONMENT, PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET",
  },
  stripe: {
    title: "Stripe",
    enabled: "Enabled",
    disabled: "Not enabled",
    blurb: "Stripe Checkout with a signature-verified completion webhook and server-side session reads.",
    envHint: "STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET for webhook confirmation",
  },
};

export default async function PaymentsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ saved?: string; error?: string; reconciled?: string }>;
}) {
  const [methods, attempts, params] = await Promise.all([listPaymentMethods("global"), listPortalPaymentAttempts("global"), searchParams]);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  return <section><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Payment Methods</p><h1 className="mt-3 text-4xl font-bold">Payment configuration</h1><p className="mt-3 max-w-2xl text-stone-600">Secrets are read only from server environment variables; they are never stored in the database or sent to the browser. Enabling a method first checks that its server configuration is complete.</p>{params.saved === "1" ? <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Payment configuration saved.</p> : null}{params.reconciled === "1" ? <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Reconciliation complete: the provider result was verified and the reservation settled.</p> : null}{params.error === "reconcile" ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">The payment provider could not be reached for reconciliation. Try again shortly.</p> : null}{params.error === "configuration" ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">The provider's server configuration is incomplete; it cannot be enabled yet.</p> : null}<div className="mt-8 grid gap-5 md:grid-cols-2">{(["paypal", "stripe"] as const).map((name) => { const copy = providerCopy[name]; const method = methods.find((item) => item.provider === name); const ready = paymentProviderReady(name); const enabled = Boolean(method?.enabled) && ready; return <article key={name} className="rounded-3xl border border-stone-200 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{copy.title}</h2><p className="mt-2 text-sm text-stone-600">{copy.blurb}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${enabled ? "bg-emerald-100 text-emerald-900" : "bg-stone-100 text-stone-600"}`}>{enabled ? copy.enabled : copy.disabled}</span></div><p className="mt-5 text-xs text-stone-500">Server configuration: {ready ? "complete" : `missing ${copy.envHint}`}</p><form action={updatePaymentMethod} className="mt-5"><input type="hidden" name="provider" value={name} /><input type="hidden" name="enabled" value={method?.enabled ? "0" : "1"} /><button disabled={!ready && !method?.enabled} className="rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{method?.enabled ? `Disable ${copy.title}` : `Enable ${copy.title}`}</button></form></article>; })}</div><div className="mt-12"><h2 className="text-2xl font-bold">Payment reconciliation</h2><p className="mt-2 max-w-3xl text-sm text-stone-600">Every payment attempt is listed here. Reconciling a pending attempt queries the provider: an approved or completed payment is captured and confirmed, while an abandoned one releases its reserved stock.</p>{attempts.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-500">No payment attempts yet. They appear here as Shoppers start paying at Checkout.</p> : <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200"><table className="w-full min-w-3xl text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Shopper</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Order</th><th className="px-4 py-3" /></tr></thead><tbody>{attempts.map((attempt) => <tr key={attempt.id} className="border-t border-stone-100 align-middle"><td className="px-4 py-3 font-mono text-xs">{attempt.id.slice(0, 13)}…</td><td className="px-4 py-3">{attempt.shopperEmail}</td><td className="px-4 py-3 capitalize">{attempt.provider}</td><td className="px-4 py-3 font-semibold">{money.format(attempt.totalMinor / 100)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${attempt.status === "paid" ? "bg-emerald-100 text-emerald-900" : attempt.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-600"}`}>{statusCopy[attempt.status] ?? attempt.status}</span></td><td className="px-4 py-3 text-stone-500">{attempt.expiresAt.toLocaleString("en-US")}</td><td className="px-4 py-3">{attempt.orderNumber ? <span className="font-mono text-xs">{attempt.orderNumber}</span> : "—"}</td><td className="px-4 py-3 text-right">{attempt.status === "pending" ? <form action={reconcilePayment}><input type="hidden" name="reference" value={attempt.id} /><button className="rounded-full border border-stone-300 px-4 py-2 text-xs font-bold hover:bg-stone-50">Reconcile</button></form> : null}</td></tr>)}</tbody></table></div>}</div></section>;
}
