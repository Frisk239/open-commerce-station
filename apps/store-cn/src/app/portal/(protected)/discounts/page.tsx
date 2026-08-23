import { listDiscountCodes } from "@ocs/data";
import { DiscountManager } from "@ocs/portal/discounts";
import { removeDiscount, saveDiscount } from "../commerce-actions";
export default async function DiscountsPage({ searchParams }: { readonly searchParams: Promise<{ saved?: string; error?: string }> }) { const [discounts, params] = await Promise.all([listDiscountCodes("cn"), searchParams]); return <DiscountManager flavor="cn" discounts={discounts} saveAction={saveDiscount} deleteAction={removeDiscount} saved={params.saved === "1"} error={params.error === "1"} />; }
