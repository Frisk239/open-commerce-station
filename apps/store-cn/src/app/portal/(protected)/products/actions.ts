"use server";

import type { CatalogFormState } from "@ocs/portal/catalog";
import { CatalogFormError, updateCatalogProductFromForm } from "@ocs/portal/catalog";
import { CatalogDataError, deleteCatalogProduct } from "@ocs/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";

export async function saveProduct(_state: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const session = await auth();
  if (!session?.user) redirect("/portal/login");

  let product;
  try {
    product = await updateCatalogProductFromForm("cn", formData);
  } catch (error) {
    if (error instanceof CatalogFormError) return { error: error.code };
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/portal/products");
  redirect(`/portal/products/${product.id}?saved=1`);
}

export async function removeProduct(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/portal/login");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/portal/products?error=not-found");
  try { await deleteCatalogProduct("cn", id); }
  catch (error) { if (error instanceof CatalogDataError) redirect("/portal/products?error=not-found"); throw error; }
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/portal/products");
  redirect("/portal/products?deleted=1");
}
