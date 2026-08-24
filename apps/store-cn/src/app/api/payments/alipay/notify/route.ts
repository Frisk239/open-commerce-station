import { closePaymentAttempt, confirmPaymentAttempt } from "@ocs/data";
import { getPaymentProvider } from "../../../../../payment-provider";

export const runtime = "nodejs";

function fieldsFrom(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const evidence = await getPaymentProvider().verifyNotification(fieldsFrom(await request.formData()));
    if (evidence.status === "paid") await confirmPaymentAttempt(evidence);
    if (evidence.status === "closed") await closePaymentAttempt(evidence, "failed");
    return new Response("success", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  } catch {
    return new Response("failure", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}
