import { listCatalogGroups, readPortalProduct } from "@ocs/data";
import { ProductEditor } from "@ocs/portal/products";
import { notFound } from "next/navigation";
import { saveProduct } from "../actions";

export default async function EditProductPage({ params, searchParams }: { readonly params: Promise<{ id: string }>; readonly searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [product, groups] = await Promise.all([readPortalProduct("global", id), listCatalogGroups("global")]);
  if (!product) notFound();
  return <ProductEditor flavor="global" product={product} groups={groups} action={saveProduct} saved={query.saved === "1"} />;
}
