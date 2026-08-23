"use server";

import { CatalogDataError, deleteCatalogGroup } from "@ocs/data";
import { CatalogFormError, updateCatalogGroupFromForm } from "@ocs/portal/catalog";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";

export async function saveGroup(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  try { await updateCatalogGroupFromForm("cn", formData); }
  catch (error) { if (error instanceof CatalogFormError) redirect(`/portal/groups?error=${error.code}`); throw error; }
  revalidatePath("/portal/groups"); revalidatePath("/products"); redirect("/portal/groups?saved=1");
}

export async function removeGroup(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) redirect("/portal/groups?error=not-found");
  try { await deleteCatalogGroup("cn", id); }
  catch (error) { if (error instanceof CatalogDataError) redirect("/portal/groups?error=not-found"); throw error; }
  revalidatePath("/portal/groups"); revalidatePath("/products"); redirect("/portal/groups?saved=1");
}
