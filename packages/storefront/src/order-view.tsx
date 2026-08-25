import { pickLocalizedText } from "@ocs/core";
import type { FulfillmentStatus, OrderView, PaymentStatus, ReturnStatus, StationFlavor } from "@ocs/core";
import Link from "next/link";

function locale(flavor: StationFlavor): "zh" | "en" {
  return flavor === "cn" ? "zh" : "en";
}

function formatter(order: OrderView): Intl.NumberFormat {
  return new Intl.NumberFormat(order.flavor === "cn" ? "zh-CN" : "en-US", { style: "currency", currency: order.currency });
}

export function paymentStatusCopy(status: PaymentStatus, zh: boolean): string {
  if (zh) {
    if (status === "paid") return "已支付";
    if (status === "refunded") return "已退款";
    return "部分退款";
  }
  if (status === "paid") return "Paid";
  if (status === "refunded") return "Refunded";
  return "Partially refunded";
}

export function fulfillmentStatusCopy(status: FulfillmentStatus, zh: boolean): string {
  return zh ? (status === "shipped" ? "已发货" : "未发货") : status === "shipped" ? "Shipped" : "Unfulfilled";
}

export function returnStatusCopy(status: ReturnStatus, zh: boolean): string {
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

export function ShopperOrderList({ flavor, orders }: { readonly flavor: StationFlavor; readonly orders: readonly OrderView[] }) {
  const zh = flavor === "cn";
  return <main className="min-h-screen bg-[#f3f0e8] px-5 py-12 text-stone-950"><section className="mx-auto max-w-4xl"><div className="flex items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">{zh ? "顾客订单" : "Shopper Orders"}</p><h1 className="mt-3 text-4xl font-bold">{zh ? "我的订单" : "My Orders"}</h1></div><Link href="/account" className="text-sm font-semibold underline underline-offset-4">{zh ? "返回账户" : "Back to Account"}</Link></div>{orders.length === 0 ? <div className="mt-10 rounded-3xl border border-stone-200 bg-white p-8 text-stone-500">{zh ? "还没有已支付订单。" : "You do not have a paid Order yet."}</div> : <div className="mt-8 space-y-4">{orders.map((order) => { const money = formatter(order); return <Link key={order.number} href={`/account/orders/${order.number}`} className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 transition hover:border-stone-400 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-mono text-sm font-bold">{order.number}</p><p className="mt-2 text-sm text-stone-500">{new Intl.DateTimeFormat(zh ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)} · {order.lines.length} {zh ? "项" : "items"}</p></div><div className="sm:text-right"><p className="text-lg font-bold">{money.format(order.totalMinor / 100)}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">{fulfillmentStatusCopy(order.fulfillmentStatus, zh)}</p></div></Link>; })}</div>}</section></main>;
}

export function ShopperOrderDetail({ order, requestReturnAction }: {
  readonly order: OrderView;
  readonly requestReturnAction?: (formData: FormData) => void | Promise<void>;
}) {
  const zh = order.flavor === "cn";
  const language = locale(order.flavor);
  const money = formatter(order);
  return <main className="min-h-screen bg-[#f3f0e8] px-5 py-12 text-stone-950"><section className="mx-auto max-w-4xl"><Link href="/account/orders" className="text-sm font-semibold underline underline-offset-4">← {zh ? "全部订单" : "All Orders"}</Link><div className="mt-6 rounded-[2rem] border border-stone-200 bg-white p-7 md:p-10"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">{zh ? "已支付订单" : "Paid Order"}</p><h1 className="mt-3 font-mono text-2xl font-bold md:text-3xl">{order.number}</h1><p className="mt-2 text-sm text-stone-500">{new Intl.DateTimeFormat(zh ? "zh-CN" : "en-US", { dateStyle: "long", timeStyle: "short" }).format(order.paidAt)}</p></div><div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-900">{paymentStatusCopy(order.paymentStatus, zh)} · {fulfillmentStatusCopy(order.fulfillmentStatus, zh)}</div></div>{order.fulfillmentStatus === "shipped" && order.trackingNumber ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm"><p className="font-bold text-emerald-900">{zh ? "已发货" : "Shipped"}</p><p className="mt-1 text-stone-700">{zh ? "运单号" : "Tracking"}：<span className="font-mono font-bold">{order.trackingNumber}</span></p></div> : null}
{order.paymentStatus === "paid" && order.returnStatus === "none" && requestReturnAction ? (
  <form action={requestReturnAction} className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5">
    <p className="text-sm font-bold">{zh ? "申请退货" : "Request a return"}</p>
    <p className="mt-1 text-xs text-stone-500">{zh ? "说明退货原因，店主同意后按订单状态退款；未发货直接退，已发货需寄回商品。" : "State your reason. After the merchant agrees: unshipped orders refund directly; shipped orders need the goods back first."}</p>
    <input type="hidden" name="orderNumber" value={order.number} />
    <textarea name="reason" required maxLength={500} rows={3} placeholder={zh ? "退货原因（必填）" : "Reason (required)"} className="mt-3 block w-full rounded-xl border border-stone-300 px-4 py-3 text-sm" />
    <button className="mt-3 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold hover:border-stone-950">{zh ? "提交退货申请" : "Submit request"}</button>
  </form>
) : null}
{order.returnStatus !== "none" ? (
  <div className={order.returnStatus === "refunded" ? "mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm" : order.returnStatus === "rejected" ? "mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm" : "mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm"}>
    <p className={order.returnStatus === "refunded" ? "font-bold text-emerald-900" : order.returnStatus === "rejected" ? "font-bold text-red-900" : "font-bold text-amber-900"}>{returnStatusCopy(order.returnStatus, zh)}</p>
    <p className="mt-1 text-stone-600">{order.returnStatus === "requested" ? (zh ? "等待店主处理你的退货申请。" : "Waiting for the merchant to decide.") : order.returnStatus === "approved" ? (order.fulfillmentStatus === "shipped" ? (zh ? "店主已同意，请把商品寄回；店主确认收到后退款。" : "The merchant agreed. Send the goods back; the refund follows confirmation.") : (zh ? "店主已同意，退款将按原支付路径退回。" : "The merchant agreed; the refund returns through the original payment path.")) : order.returnStatus === "rejected" ? (zh ? "店主拒绝了这次退货申请。" : "The merchant refused this request.") : (zh ? "退款已按原支付路径退回。" : "The refund returned through the original payment path.")}</p>
  </div>
) : null}<div className="mt-9 space-y-4 border-y border-stone-200 py-7">{order.lines.map((line) => <article key={line.variantReference} className="grid grid-cols-[1fr_auto] gap-4"><div><h2 className="font-bold">{pickLocalizedText(line.productName, language, language)}</h2>{line.variantLabel ? <p className="mt-1 text-sm text-stone-500">{line.variantLabel}</p> : null}<p className="mt-1 text-sm text-stone-500">× {line.quantity}</p></div><p className="font-semibold">{money.format(line.lineSubtotalMinor / 100)}</p></article>)}</div><div className="mt-7 grid gap-7 md:grid-cols-2"><address className="not-italic text-sm leading-7 text-stone-600"><h2 className="mb-2 text-base font-bold text-stone-950">{zh ? "配送地址" : "Delivery Address"}</h2>{order.address.recipientName} · {order.address.phone}<br />{order.address.countryCode} {order.address.region} {order.address.city} {order.address.district}<br />{order.address.line1} {order.address.line2}<br />{order.address.postalCode}</address><dl className="space-y-3 text-sm"><div className="flex justify-between"><dt className="text-stone-500">{zh ? "商品小计" : "Subtotal"}</dt><dd>{money.format(order.subtotalMinor / 100)}</dd></div>{order.discountMinor > 0 ? <div className="flex justify-between text-emerald-800"><dt>{zh ? "折扣" : "Discount"} · {order.discountCode}</dt><dd>−{money.format(order.discountMinor / 100)}</dd></div> : null}<div className="flex justify-between"><dt className="text-stone-500">{pickLocalizedText(order.shippingName, language, language) || (zh ? "配送" : "Shipping")}</dt><dd>{money.format(order.shippingMinor / 100)}</dd></div><div className="flex justify-between border-t border-stone-200 pt-3 text-lg font-bold"><dt>{zh ? "总计" : "Total"}</dt><dd>{money.format(order.totalMinor / 100)}</dd></div></dl></div></div></section></main>;
}
