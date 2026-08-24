import { closePaymentAttempt, confirmPaymentAttempt, readPaymentAttemptForShopper } from "@ocs/data";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPaymentProvider } from "../../../payment-provider";
import { shopperAuth } from "../../../shopper-auth";
import { cancelPayment } from "./actions";

export const dynamic = "force-dynamic";

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
  let attempt = await readPaymentAttemptForShopper("cn", email, id);
  if (!attempt) notFound();
  let recoveryError = (await searchParams).error === "recovery";
  if (attempt.status === "pending") {
    try {
      const evidence = await getPaymentProvider().query({ reference: id, amountMinor: attempt.totalMinor, currency: attempt.currency });
      if (evidence.status === "paid") await confirmPaymentAttempt(evidence);
      if (evidence.status === "closed") await closePaymentAttempt(evidence, "failed");
      attempt = (await readPaymentAttemptForShopper("cn", email, id))!;
    } catch {
      recoveryError = true;
    }
  }
  const paid = attempt.status === "paid";
  const money = new Intl.NumberFormat("zh-CN", { style: "currency", currency: attempt.currency });
  return <main className="min-h-screen bg-[#f3f0e8] px-5 py-14 text-stone-950"><section className="mx-auto max-w-2xl rounded-[2rem] border border-stone-200 bg-white p-7 md:p-10"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Payment Status</p><h1 className="mt-3 text-4xl font-bold">{paid ? "支付成功" : attempt.status === "pending" ? "等待支付结果" : "支付未完成"}</h1><p className="mt-4 text-stone-600">支付编号 {attempt.id}</p><dl className="mt-8 grid gap-3 rounded-2xl bg-stone-50 p-5 text-sm"><div className="flex justify-between"><dt>金额</dt><dd className="font-bold">{money.format(attempt.totalMinor / 100)}</dd></div><div className="flex justify-between"><dt>状态</dt><dd>{attempt.status}</dd></div>{attempt.orderNumber ? <div className="flex justify-between"><dt>订单号</dt><dd className="font-mono">{attempt.orderNumber}</dd></div> : null}</dl>{recoveryError ? <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">暂时无法向支付宝核验最终结果。请勿重复支付，稍后刷新本页。</p> : null}<div className="mt-7 flex flex-wrap gap-4">{attempt.orderNumber ? <Link href={`/account/orders/${attempt.orderNumber}`} className="rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white">查看订单</Link> : null}{attempt.status === "pending" ? <><Link href={`/payment/${attempt.id}`} className="rounded-full border border-stone-300 px-5 py-3 text-sm font-bold">刷新结果</Link><form action={cancelPayment}><input type="hidden" name="reference" value={attempt.id} /><button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-bold">取消支付</button></form></> : <Link href="/" className="rounded-full border border-stone-300 px-5 py-3 text-sm font-bold">返回店铺</Link>}</div></section></main>;
}
