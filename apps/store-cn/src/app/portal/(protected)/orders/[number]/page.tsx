import { readPortalOrder } from "@ocs/data";
import { MerchantOrderDetail } from "@ocs/portal/orders";
import { notFound } from "next/navigation";
import { shipOrder } from "./actions";

export default async function OrderPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ number: string }>;
  readonly searchParams: Promise<{ shipped?: string; shipError?: string }>;
}) {
  const [{ number }, query] = await Promise.all([params, searchParams]);
  const order = await readPortalOrder("cn", number);
  if (!order) notFound();
  return <>
    {query.shipped === "1" ? <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">订单已标记发货，通知邮件已进入发送队列。</p> : null}
    {query.shipError ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{query.shipError === "not-found" ? "没有找到这笔订单。" : "发货失败：订单可能已发货，或运单号为空。"}</p> : null}
    <MerchantOrderDetail order={order} shipAction={shipOrder} />
  </>;
}
