"use server";

import { markOrderShipped, MailDataError } from "@ocs/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flushNoticeMails } from "../../../../../notice-mail";
import { auth } from "../../../../../auth";

export async function shipOrder(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  const orderNumber = formData.get("orderNumber");
  const trackingNumber = formData.get("trackingNumber");
  if (typeof orderNumber !== "string" || typeof trackingNumber !== "string") redirect("/portal/orders");
  try {
    await markOrderShipped("global", orderNumber, trackingNumber);
    await flushNoticeMails("global");
  } catch (error) {
    const code = error instanceof MailDataError ? error.code : "invalid-state";
    redirect(`/portal/orders/${encodeURIComponent(orderNumber)}?shipError=${code === "not-found" ? "not-found" : "invalid"}`);
  }
  revalidatePath("/portal/orders");
  revalidatePath(`/portal/orders/${encodeURIComponent(orderNumber)}`);
  redirect(`/portal/orders/${encodeURIComponent(orderNumber)}?shipped=1`);
}
