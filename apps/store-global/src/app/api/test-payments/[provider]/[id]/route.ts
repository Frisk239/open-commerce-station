import { NextResponse } from "next/server";
import { getPaymentProvider, publicBaseUrl } from "../../../../../payment-provider";

const providerReturnPaths = { paypal: "/checkout/paypal/return", stripe: "/checkout/stripe/return" } as const;

export async function GET(
  _request: Request,
  { params }: { readonly params: Promise<{ provider: string; id: string }> },
) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  if (process.env.OCS_PAYMENT_ADAPTER !== "deterministic") return new Response("Not found", { status: 404 });
  const { provider: name, id } = await params;
  const returnPath = providerReturnPaths[name as keyof typeof providerReturnPaths];
  if (!returnPath) return new Response("Not found", { status: 404 });
  const provider = getPaymentProvider(name as keyof typeof providerReturnPaths);
  if (!("settle" in provider) || typeof provider.settle !== "function") return new Response("Not found", { status: 404 });
  provider.settle(id, "paid");
  const target = new URL(returnPath, publicBaseUrl());
  target.searchParams.set("reference", id);
  return NextResponse.redirect(target);
}
