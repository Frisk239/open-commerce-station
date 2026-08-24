import { closePaymentAttempt, confirmPaymentAttempt, PaymentDataError } from "@ocs/data";
import { PaymentProviderError } from "@ocs/plugins";
import { getPaymentProvider } from "../../../../../payment-provider";

export const runtime = "nodejs";

function fieldsFrom(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function rejectionDetail(error: unknown): string {
  if (error instanceof PaymentProviderError || error instanceof PaymentDataError) {
    return `${error.constructor.name}(${error.code})`;
  }
  // Only the error shape reaches the log; provider payloads stay out of server logs.
  return error instanceof Error ? error.name : "unknown";
}

export async function POST(request: Request): Promise<Response> {
  let reference = "unidentified";
  try {
    const evidence = await getPaymentProvider().verifyNotification(fieldsFrom(await request.formData()));
    reference = evidence.reference;
    if (evidence.status === "paid") await confirmPaymentAttempt(evidence);
    if (evidence.status === "closed") await closePaymentAttempt(evidence, "failed");
    return new Response("success", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  } catch (error) {
    console.error(`[alipay-notify] rejected reference=${reference} error=${rejectionDetail(error)}`);
    return new Response("failure", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}
