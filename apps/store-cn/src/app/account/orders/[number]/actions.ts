"use server";

import { requestShopperReturn, ReturnDataError } from "@ocs/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { shopperAuth } from "../../../../shopper-auth";

export async function requestReturn(formData: FormData): Promise<void> {
  const email = (await shopperAuth())?.user?.email;
  const orderNumber = formData.get("orderNumber");
  const reason = formData.get("reason");
  if (!email || typeof orderNumber !== "string" || typeof reason !== "string") redirect("/account/login?returnTo=/account/orders");
  try {
    await requestShopperReturn("cn", email, orderNumber, reason);
  } catch (error) {
    const code = error instanceof ReturnDataError ? error.code : "invalid-state";
    redirect(`/account/orders/${encodeURIComponent(orderNumber)}?returnError=${code === "not-found" ? "not-found" : "invalid"}`);
  }
  revalidatePath(`/account/orders/${encodeURIComponent(orderNumber)}`);
  redirect(`/account/orders/${encodeURIComponent(orderNumber)}?returnRequested=1`);
}
