"use server";

import { applyOrderRefund, confirmReturnGoodsReceived, decideReturnRequest, markOrderShipped, listOrderReturnRequests, MailDataError, readPortalOrder } from "@ocs/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flushNoticeMails } from "../../../../../notice-mail";
import { getPaymentProvider } from "../../../../../payment-provider";
import { auth } from "../../../../../auth";

export async function shipOrder(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  const orderNumber = formData.get("orderNumber");
  const trackingNumber = formData.get("trackingNumber");
  if (typeof orderNumber !== "string" || typeof trackingNumber !== "string") redirect("/portal/orders");
  try {
    await markOrderShipped("cn", orderNumber, trackingNumber);
    await flushNoticeMails("cn");
  } catch (error) {
    const code = error instanceof MailDataError ? error.code : "invalid-state";
    redirect(`/portal/orders/${encodeURIComponent(orderNumber)}?shipError=${code === "not-found" ? "not-found" : "invalid"}`);
  }
  revalidatePath("/portal/orders");
  revalidatePath(`/portal/orders/${encodeURIComponent(orderNumber)}`);
  redirect(`/portal/orders/${encodeURIComponent(orderNumber)}?shipped=1`);
}

export async function decideReturn(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  const orderNumber = formData.get("orderNumber");
  const decision = formData.get("decision");
  const note = formData.get("note");
  if (typeof orderNumber !== "string" || (decision !== "approved" && decision !== "rejected")) redirect("/portal/orders");
  const order = await readPortalOrder("cn", orderNumber);
  if (!order) redirect("/portal/orders");
  try {
    await decideReturnRequest("cn", orderNumber, decision, typeof note === "string" ? note : undefined);
    // Unshipped approval refunds immediately through the original payment path.
    if (decision === "approved" && order.fulfillmentStatus === "unfulfilled") {
      const provider = getPaymentProvider();
      if (provider.refund) {
        const evidence = await provider.refund({ reference: order.paymentReference, providerTradeNo: order.providerTradeNo, amountMinor: order.totalMinor, currency: order.currency });
        await applyOrderRefund(evidence);
      }
    }
  } catch (error) {
    redirect(`/portal/orders/${encodeURIComponent(orderNumber)}?returnError=1`);
  }
  revalidatePath(`/portal/orders/${encodeURIComponent(orderNumber)}`);
  redirect(`/portal/orders/${encodeURIComponent(orderNumber)}?returnDecided=1`);
}

export async function confirmReturn(formData: FormData): Promise<void> {
  if (!(await auth())?.user) redirect("/portal/login");
  const orderNumber = formData.get("orderNumber");
  if (typeof orderNumber !== "string") redirect("/portal/orders");
  const order = await readPortalOrder("cn", orderNumber);
  if (!order) redirect("/portal/orders");
  try {
    if (order.fulfillmentStatus === "shipped") await confirmReturnGoodsReceived("cn", orderNumber);
    const provider = getPaymentProvider();
    if (provider.refund) {
      const evidence = await provider.refund({ reference: order.paymentReference, providerTradeNo: order.providerTradeNo, amountMinor: order.totalMinor, currency: order.currency });
      await applyOrderRefund(evidence);
    }
  } catch (error) {
    redirect(`/portal/orders/${encodeURIComponent(orderNumber)}?returnError=1`);
  }
  revalidatePath(`/portal/orders/${encodeURIComponent(orderNumber)}`);
  redirect(`/portal/orders/${encodeURIComponent(orderNumber)}?refunded=1`);
}
