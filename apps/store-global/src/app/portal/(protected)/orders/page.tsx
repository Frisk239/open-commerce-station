import { listPortalOrders } from "@ocs/data";
import { MerchantOrderList } from "@ocs/portal/orders";
export default async function OrdersPage() { return <MerchantOrderList flavor="global" orders={await listPortalOrders("global")} />; }
