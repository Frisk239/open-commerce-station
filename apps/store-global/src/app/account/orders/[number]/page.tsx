import { readShopperOrder } from "@ocs/data";
import { ShopperOrderDetail } from "@ocs/storefront/orders";
import { notFound, redirect } from "next/navigation";
import { shopperAuth } from "../../../../shopper-auth";
export const dynamic = "force-dynamic";
export default async function OrderPage({ params }: { readonly params: Promise<{ number: string }> }) { const email = (await shopperAuth())?.user?.email; if (!email) redirect("/account/login?returnTo=/account/orders"); const order = await readShopperOrder("global", email, (await params).number); if (!order) notFound(); return <ShopperOrderDetail order={order} />; }
