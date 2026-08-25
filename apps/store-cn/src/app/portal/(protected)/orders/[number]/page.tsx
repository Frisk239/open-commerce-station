import { listOrderReturnRequests, readPortalOrder } from "@ocs/data";
import { MerchantOrderDetail } from "@ocs/portal/orders";
import { notFound } from "next/navigation";
import { confirmReturn, decideReturn, shipOrder } from "./actions";

export default async function OrderPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ number: string }>;
  readonly searchParams: Promise<{ shipped?: string; shipError?: string; returnDecided?: string; refunded?: string; returnError?: string }>;
}) {
  const [{ number }, query] = await Promise.all([params, searchParams]);
  const order = await readPortalOrder("cn", number);
  if (!order) notFound();
  const returnRequests = await listOrderReturnRequests("cn", number);
  return <>
    {query.shipped === "1" ? <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">订单已标记发货，通知邮件已进入发送队列。</p> : null}
    {query.shipError ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{query.shipError === "not-found" ? "没有找到这笔订单。" : "发货失败：订单可能已发货、有未处理的退货申请，或运单号为空。"}</p> : null}
    {query.returnDecided === "1" ? <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">退货申请已处理。</p> : null}
    {query.refunded === "1" ? <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">退款已按原支付路径执行完成。</p> : null}
    {query.returnError ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">操作失败：状态可能已变化，或支付渠道退款未成功。请重试。</p> : null}
    <MerchantOrderDetail order={order} shipAction={shipOrder} decideReturnAction={decideReturn} confirmReturnAction={confirmReturn} returnRequests={returnRequests} />
  </>;
}
