import { listShippingRates } from "@ocs/data";
import { ShippingManager } from "@ocs/portal/shipping";
import { removeShipping, saveShipping } from "../commerce-actions";
export default async function ShippingPage({ searchParams }: { readonly searchParams: Promise<{ saved?: string; error?: string }> }) { const [rates, params] = await Promise.all([listShippingRates("cn"), searchParams]); return <ShippingManager flavor="cn" rates={rates} saveAction={saveShipping} deleteAction={removeShipping} saved={params.saved === "1"} error={params.error === "1"} />; }
