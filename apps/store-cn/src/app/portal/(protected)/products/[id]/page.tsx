import { listCatalogGroups, readPortalProduct } from "@ocs/data";
import { ProductEditor } from "@ocs/portal/products";
import { notFound } from "next/navigation";
import { saveProduct } from "../actions";

export default async function EditProductPage({ params, searchParams }: { readonly params: Promise<{ id: string }>; readonly searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [product, groups] = await Promise.all([readPortalProduct("cn", id), listCatalogGroups("cn")]);
  if (!product) notFound();
  return <ProductEditor flavor="cn" product={product} groups={groups} action={saveProduct} saved={query.saved === "1"} />;
}
