import { listCatalogGroups } from "@ocs/data";
import { ProductEditor } from "@ocs/portal/products";
import { saveProduct } from "../actions";

export default async function NewProductPage() {
  return <ProductEditor flavor="global" groups={await listCatalogGroups("global")} action={saveProduct} />;
}
