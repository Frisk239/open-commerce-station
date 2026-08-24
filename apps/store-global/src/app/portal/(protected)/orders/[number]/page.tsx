import { readPortalOrder } from "@ocs/data";
import { MerchantOrderDetail } from "@ocs/portal/orders";
import { notFound } from "next/navigation";
export default async function OrderPage({ params }: { readonly params: Promise<{ number: string }> }) { const order = await readPortalOrder("global", (await params).number); if (!order) notFound(); return <MerchantOrderDetail order={order} />; }
