import { readShopperOrder } from "@ocs/data";
import { ShopperOrderDetail } from "@ocs/storefront/orders";
import { notFound, redirect } from "next/navigation";
import { shopperAuth } from "../../../../shopper-auth";
import { requestReturn } from "./actions";
export const dynamic = "force-dynamic";
export default async function OrderPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ number: string }>;
  readonly searchParams: Promise<{ returnRequested?: string; returnError?: string }>;
}) {
  const email = (await shopperAuth())?.user?.email;
  if (!email) redirect("/account/login?returnTo=/account/orders");
  const [{ number }, query] = await Promise.all([params, searchParams]);
  const order = await readShopperOrder("cn", email, number);
  if (!order) notFound();
  return <>
    {query.returnRequested === "1" ? <p role="status" className="mx-auto mb-5 max-w-4xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">退货申请已提交，等待店主处理。</p> : null}
    {query.returnError ? <p role="alert" className="mx-auto mb-5 max-w-4xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{query.returnError === "not-found" ? "没有找到这笔订单。" : "申请失败：订单可能已申请过退货或状态不符。"}</p> : null}
    <ShopperOrderDetail order={order} requestReturnAction={requestReturn} />
  </>;
}
