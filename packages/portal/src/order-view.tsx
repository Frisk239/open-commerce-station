import type { FulfillmentStatus, OrderView, PaymentStatus, StationFlavor } from "@ocs/core";
import type { ReturnRequestView } from "@ocs/data";
import Link from "next/link";

function money(order: OrderView): Intl.NumberFormat {
  return new Intl.NumberFormat(order.flavor === "cn" ? "zh-CN" : "en-US", { style: "currency", currency: order.currency });
}

function paymentStatusCopy(status: PaymentStatus, zh: boolean): string {
  if (zh) {
    if (status === "paid") return "已支付";
    if (status === "refunded") return "已退款";
    return "部分退款";
  }
  if (status === "paid") return "Paid";
  if (status === "refunded") return "Refunded";
  return "Partially refunded";
}

function fulfillmentStatusCopy(status: FulfillmentStatus, zh: boolean): string {
  return zh ? (status === "shipped" ? "已发货" : "未发货") : status === "shipped" ? "Shipped" : "Unfulfilled";
}

function returnStatusCopy(status: OrderView["returnStatus"], zh: boolean): string {
  if (zh) {
    if (status === "requested") return "退货申请中";
    if (status === "approved") return "退货已同意";
    if (status === "rejected") return "退货已拒绝";
    if (status === "refunded") return "已退款";
    return "";
  }
  if (status === "requested") return "Return requested";
  if (status === "approved") return "Return approved";
  if (status === "rejected") return "Return rejected";
  if (status === "refunded") return "Refunded";
  return "";
}

export function MerchantOrderList({ flavor, orders }: { readonly flavor: StationFlavor; readonly orders: readonly OrderView[] }) {
  const zh = flavor === "cn";
  return <section><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">{zh ? "订单" : "Orders"}</p><h1 className="mt-3 text-4xl font-bold">{zh ? "订单" : "Orders"}</h1><p className="mt-3 text-stone-600">{zh ? "订单事实来自支付时快照；后续商品或配送配置变化不会改写历史订单。" : "Order facts are snapshotted at payment and do not change with later catalog or shipping edits."}</p>{orders.length === 0 ? <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-7 text-stone-500">{zh ? "暂无已支付订单。" : "No paid Orders yet."}</div> : <div className="mt-8 overflow-hidden rounded-3xl border border-stone-200 bg-white"><div className="hidden grid-cols-[1.2fr_1fr_0.7fr_0.8fr] gap-4 border-b border-stone-200 bg-stone-50 px-6 py-3 text-xs font-bold uppercase tracking-wide text-stone-500 md:grid"><span>{zh ? "订单" : "Order"}</span><span>{zh ? "顾客" : "Shopper"}</span><span>{zh ? "履约" : "Fulfillment"}</span><span className="text-right">{zh ? "总计" : "Total"}</span></div>{orders.map((order) => <Link key={order.number} href={`/portal/orders/${order.number}`} className="grid gap-3 border-b border-stone-100 px-6 py-5 last:border-0 hover:bg-stone-50 md:grid-cols-[1.2fr_1fr_0.7fr_0.8fr] md:items-center"><div><p className="font-mono text-sm font-bold">{order.number}</p><p className="mt-1 text-xs text-stone-500">{new Intl.DateTimeFormat(zh ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)}</p></div><p className="truncate text-sm">{order.shopperEmail}</p><p className="text-sm font-semibold">{fulfillmentStatusCopy(order.fulfillmentStatus, zh)}</p><p className="font-bold md:text-right">{money(order).format(order.totalMinor / 100)}</p></Link>)}</div>}</section>;
}

export function MerchantOrderDetail({ order, shipAction, decideReturnAction, confirmReturnAction, returnRequests = [] }: {
  readonly order: OrderView;
  readonly shipAction?: (formData: FormData) => void | Promise<void>;
  readonly decideReturnAction?: (formData: FormData) => void | Promise<void>;
  readonly confirmReturnAction?: (formData: FormData) => void | Promise<void>;
  readonly returnRequests?: readonly ReturnRequestView[];
}) {
  const zh = order.flavor === "cn";
  const format = money(order);
  return <section><Link href="/portal/orders" className="text-sm font-semibold underline underline-offset-4">← {zh ? "全部订单" : "All Orders"}</Link><div className="mt-6 rounded-3xl border border-stone-200 bg-white p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">{zh ? "订单详情" : "Order Detail"}</p><h1 className="mt-3 font-mono text-3xl font-bold">{order.number}</h1><p className="mt-2 text-sm text-stone-500">{order.shopperEmail}</p></div><div className="text-right"><p className="text-2xl font-bold">{format.format(order.totalMinor / 100)}</p><p className="mt-2 text-sm">{paymentStatusCopy(order.paymentStatus, zh)} · {fulfillmentStatusCopy(order.fulfillmentStatus, zh)}</p></div></div>{order.fulfillmentStatus === "unfulfilled" && shipAction ? <form action={shipAction} className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-5"><label className="flex-1 text-sm font-semibold">{zh ? "运单号" : "Tracking number"}<input name="trackingNumber" required maxLength={191} placeholder={zh ? "填写承运商运单号" : "Carrier tracking number"} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label><input type="hidden" name="orderNumber" value={order.number} /><button className="rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800">{zh ? "标记发货" : "Mark shipped"}</button></form> : null}{order.fulfillmentStatus === "shipped" ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm"><p className="font-bold text-emerald-900">{zh ? "已发货" : "Shipped"}</p><p className="mt-2 text-stone-700">{zh ? "运单号" : "Tracking"}：<span className="font-mono font-bold">{order.trackingNumber}</span></p><p className="mt-1 text-stone-500">{order.shippedAt ? new Intl.DateTimeFormat(zh ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(order.shippedAt) : ""}</p></div> : null}
{order.returnStatus !== "none" ? (
  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm">
    <p className="font-bold text-amber-900">{returnStatusCopy(order.returnStatus, zh)}{order.returnStatus === "approved" ? (order.fulfillmentStatus === "shipped" ? (zh ? " · 等顾客寄回" : " · waiting for goods") : (zh ? " · 待退款" : " · refund due")) : null}</p>
    {returnRequests.length > 0 ? <div className="mt-3 space-y-2">{returnRequests.map((request) => <div key={request.id} className="rounded-xl bg-white/70 p-3 text-xs"><p className="font-semibold">{zh ? "原因" : "Reason"}：{request.reason}</p>{request.note ? <p className="mt-1 text-stone-500">{zh ? "处理说明" : "Note"}：{request.note}</p> : null}<p className="mt-1 text-stone-400">{new Intl.DateTimeFormat(zh ? "zh-CN" : "en-US", { dateStyle: "short", timeStyle: "short" }).format(request.decidedAt ?? request.openedAt)}</p></div>)}</div> : null}
    {order.returnStatus === "requested" && decideReturnAction ? (
      <form action={decideReturnAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="orderNumber" value={order.number} />
        <label className="flex-1 text-xs font-semibold">{zh ? "处理说明（选填）" : "Decision note (optional)"}<input name="note" maxLength={500} className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 font-normal" /></label>
        <button name="decision" value="approved" className="rounded-full bg-stone-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800">{zh ? "同意退货" : "Approve"}</button>
        <button name="decision" value="rejected" className="rounded-full border border-red-300 px-5 py-2.5 text-xs font-bold text-red-800 hover:bg-red-50">{zh ? "拒绝" : "Refuse"}</button>
      </form>
    ) : null}
    {order.returnStatus === "approved" && confirmReturnAction ? (
      <form action={confirmReturnAction} className="mt-4">
        <input type="hidden" name="orderNumber" value={order.number} />
        <button className="rounded-full bg-stone-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800">{order.fulfillmentStatus === "shipped" ? (zh ? "确认收到退货，执行退款" : "Confirm goods received and refund") : (zh ? "重试退款" : "Retry refund")}</button>
      </form>
    ) : null}
  </div>
) : null}<div className="mt-8 grid gap-8 border-t border-stone-200 pt-7 md:grid-cols-2"><div><h2 className="font-bold">{zh ? "商品快照" : "Line snapshots"}</h2><div className="mt-4 space-y-4">{order.lines.map((line) => <div key={line.variantReference} className="flex justify-between gap-4 text-sm"><div><p className="font-semibold">{line.productName[zh ? "zh" : "en"] ?? line.productSlug}</p><p className="text-stone-500">{line.variantLabel || (zh ? "默认规格" : "single")} × {line.quantity}</p></div><p>{format.format(line.lineSubtotalMinor / 100)}</p></div>)}</div></div><address className="not-italic text-sm leading-7 text-stone-600"><h2 className="mb-2 font-bold text-stone-950">{zh ? "配送地址快照" : "Address snapshot"}</h2>{order.address.recipientName} · {order.address.phone}<br />{order.address.countryCode} {order.address.region} {order.address.city} {order.address.district}<br />{order.address.line1} {order.address.line2}<br />{order.address.postalCode}</address></div></div></section>;
}
