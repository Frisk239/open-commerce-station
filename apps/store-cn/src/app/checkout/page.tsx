import { listPaymentMethods, readCart, readDefaultAddress } from "@ocs/data";
import { CheckoutForm } from "@ocs/storefront/checkout-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { shopperAuth } from "../../shopper-auth";
import { getStoreIdentity } from "../../store";
import { paymentProviderReady } from "../../payment-provider";
import { calculateQuote } from "./actions";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await shopperAuth();
  const email = session?.user?.email;
  if (!email) redirect("/account/login?returnTo=/checkout");
  const token = (await cookies()).get("ocs_cart_cn")?.value;
  if (!token || (await readCart("cn", token)).lines.length === 0) redirect("/cart");
  const [address, identity, methods] = await Promise.all([readDefaultAddress("cn", email), getStoreIdentity(), listPaymentMethods("cn")]);
  const paymentMethods = methods.map((method) => method.provider === "alipay" ? { ...method, enabled: method.enabled && paymentProviderReady() } : method);
  return <CheckoutForm flavor="cn" currency="CNY" email={email} storeName={identity.name} logoUrl={identity.logoUrl} paymentMethods={paymentMethods} action={calculateQuote} initialFields={{ recipientName: address?.recipientName ?? "", phone: address?.phone ?? "", countryCode: "CN", region: address?.region ?? "", city: address?.city ?? "", district: address?.district ?? "", postalCode: address?.postalCode ?? "", line1: address?.line1 ?? "", line2: address?.line2 ?? "", discountCode: "", selectedShippingRateId: "" }} />;
}
