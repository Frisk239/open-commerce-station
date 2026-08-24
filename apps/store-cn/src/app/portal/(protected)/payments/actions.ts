"use server";

import { setPaymentMethodEnabled } from "@ocs/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { paymentProviderReady } from "../../../../payment-provider";
import { auth } from "../../../../auth";

export async function updateAlipay(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  const enabled = formData.get("enabled") === "1";
  if (enabled && !paymentProviderReady()) redirect("/portal/payments?error=configuration");
  await setPaymentMethodEnabled("cn", "alipay", enabled);
  revalidatePath("/checkout");
  redirect("/portal/payments?saved=1");
}
