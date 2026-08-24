import { listPortalOrders } from "@ocs/data";
import { MerchantOrderList } from "@ocs/portal/orders";
export default async function OrdersPage() { return <MerchantOrderList flavor="cn" orders={await listPortalOrders("cn")} />; }
