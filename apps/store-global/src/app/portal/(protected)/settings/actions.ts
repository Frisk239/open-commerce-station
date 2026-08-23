"use server";

import { StoreIdentityFormError, updateIdentityFromForm } from "@ocs/portal/identity";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";

export async function saveStoreIdentity(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/portal/login");

  try {
    await updateIdentityFromForm("global", formData);
  } catch (error) {
    if (error instanceof StoreIdentityFormError) {
      redirect(`/portal/settings?error=${error.code}`);
    }

    throw error;
  }

  revalidatePath("/", "layout");
  redirect("/portal/settings?saved=1");
}
