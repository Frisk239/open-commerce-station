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
  const order = await readPortalOrder("global", number);
  if (!order) notFound();
  const returnRequests = await listOrderReturnRequests("global", number);
  return <>
    {query.shipped === "1" ? <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Order marked shipped; the notice email entered the delivery queue.</p> : null}
    {query.shipError ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">Shipping failed: the Order may already be shipped, hold an open return request, or lack a tracking number.</p> : null}
    {query.returnDecided === "1" ? <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">The return request was decided.</p> : null}
    {query.refunded === "1" ? <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">The refund completed through the original payment path.</p> : null}
    {query.returnError ? <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">The action failed: the state may have changed or the provider refund did not succeed. Retry.</p> : null}
    <MerchantOrderDetail order={order} shipAction={shipOrder} decideReturnAction={decideReturn} confirmReturnAction={confirmReturn} returnRequests={returnRequests} />
  </>;
}
