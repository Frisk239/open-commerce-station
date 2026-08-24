import { listShopperOrders } from "@ocs/data";
import { ShopperOrderList } from "@ocs/storefront/orders";
import { redirect } from "next/navigation";
import { shopperAuth } from "../../../shopper-auth";
export const dynamic = "force-dynamic";
export default async function OrdersPage() { const email = (await shopperAuth())?.user?.email; if (!email) redirect("/account/login?returnTo=/account/orders"); return <ShopperOrderList flavor="cn" orders={await listShopperOrders("cn", email)} />; }
