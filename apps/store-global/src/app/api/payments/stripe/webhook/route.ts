import { closePaymentAttempt, confirmPaymentAttempt, PaymentDataError } from "@ocs/data";
import { PaymentProviderError } from "@ocs/plugins";
import { getPaymentProvider } from "../../../../../payment-provider";

export const runtime = "nodejs";

function rejectionDetail(error: unknown): string {
  if (error instanceof PaymentProviderError || error instanceof PaymentDataError) {
    return `${error.constructor.name}(${error.code})`;
  }
  return error instanceof Error ? error.name : "unknown";
}

/**
 * Stripe Checkout completion webhook. The raw body and the Stripe-Signature
 * header are verified with the configured webhook secret before anything is
 * trusted; other event types are acknowledged without side effects.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const provider = getPaymentProvider("stripe");
    if (!provider.verifyWebhook) throw new PaymentProviderError("configuration", "The configured Stripe adapter cannot verify webhooks.");
    const evidence = await provider.verifyWebhook(await request.text(), request.headers.get("stripe-signature") ?? undefined);
    if (evidence?.status === "paid") await confirmPaymentAttempt(evidence);
    if (evidence?.status === "closed") await closePaymentAttempt(evidence, "failed");
    return Response.json({ received: true });
  } catch (error) {
    console.error(`[stripe-webhook] rejected error=${rejectionDetail(error)}`);
    return new Response("Bad request", { status: 400 });
  }
}
