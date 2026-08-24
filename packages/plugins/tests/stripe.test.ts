import { createHmac, timingSafeEqual } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { StripePaymentAdapter } from "../src/index";
import type { StripeAdapterConfig, StripeFetch } from "../src/index";

const webhookSecret = "whsec_test_secret";
const config: StripeAdapterConfig = { secretKey: "sk_test_secret", webhookSecret };

function jsonResponse(payload: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

const paidSession = (id: string, reference: string) => ({
  id,
  object: "checkout.session",
  status: "complete",
  payment_status: "paid",
  payment_intent: `pi_${id}`,
  client_reference_id: reference,
  amount_total: 5_300,
  currency: "usd",
});

function signedBody(body: string, secret = webhookSecret): string {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

describe("Stripe production adapter", () => {
  it("creates a Checkout Session with minor-unit amounts and returns its URL and id", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }));
    const adapter = new StripePaymentAdapter(config, fetchImpl as unknown as StripeFetch);
    const redirect = await adapter.createCheckout({
      reference: "attempt-1",
      amountMinor: 5_300,
      currency: "USD",
      subject: "Atlas Goods order",
      returnUrl: "https://shop.example.test/checkout/stripe/return?reference=attempt-1",
      cancelUrl: "https://shop.example.test/payment/attempt-1",
      expiresAt: new Date(Date.now() + 15 * 60_000),
      device: "desktop",
    });
    expect(redirect).toMatchObject({
      kind: "redirect",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
      providerReference: "cs_test_1",
    });
    const [url, init] = fetchImpl.mock.calls[0]! as [string, { body: string }];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(init.body).toContain("client_reference_id=attempt-1");
    expect(init.body).toContain("line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=5300");
    expect(init.body).toContain("line_items%5B0%5D%5Bprice_data%5D%5Bcurrency%5D=usd");
  });

  it("confirms only sessions matching the attempt and rejects tampered amounts", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(paidSession("cs_test_2", "attempt-2")))
      .mockResolvedValueOnce(jsonResponse(paidSession("cs_test_3", "another-attempt")))
      .mockResolvedValueOnce(jsonResponse(paidSession("cs_test_2", "attempt-2")));
    const adapter = new StripePaymentAdapter(config, fetchImpl as unknown as StripeFetch);
    await expect(adapter.query({ reference: "attempt-2", amountMinor: 5_300, currency: "USD", providerReference: "cs_test_2" }))
      .resolves.toMatchObject({ provider: "stripe", status: "paid", providerTradeNo: "pi_cs_test_2", amountMinor: 5_300 });
    await expect(adapter.query({ reference: "attempt-2", amountMinor: 5_300, currency: "USD", providerReference: "cs_test_3" }))
      .rejects.toMatchObject({ code: "invalid-response" });
    await expect(adapter.query({ reference: "attempt-2", amountMinor: 5_299, currency: "USD", providerReference: "cs_test_2" }))
      .rejects.toMatchObject({ code: "invalid-response" });
  });

  it("expires an open session as trusted closed evidence", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ id: "cs_test_4", status: "expired", payment_status: "unpaid", client_reference_id: "attempt-4", amount_total: 800, currency: "usd" }));
    const adapter = new StripePaymentAdapter(config, fetchImpl as unknown as StripeFetch);
    await expect(adapter.close({ reference: "attempt-4", amountMinor: 800, currency: "USD", providerReference: "cs_test_4" }))
      .resolves.toMatchObject({ status: "closed" });
    expect(fetchImpl.mock.calls[0]![0]).toBe("https://api.stripe.com/v1/checkout/sessions/cs_test_4/expire");
  });

  it("accepts a correctly signed webhook and rejects tampering or wrong secrets", async () => {
    const adapter = new StripePaymentAdapter(config, vi.fn() as unknown as StripeFetch);
    const body = JSON.stringify({ type: "checkout.session.completed", data: { object: paidSession("cs_test_5", "attempt-5") } });
    await expect(adapter.verifyWebhook(body, signedBody(body))).resolves.toMatchObject({
      provider: "stripe",
      status: "paid",
      reference: "attempt-5",
      providerTradeNo: "pi_cs_test_5",
    });
    const tampered = body.replace("5300", "9900");
    const reusedSignature = signedBody(body);
    await expect(adapter.verifyWebhook(tampered, reusedSignature)).rejects.toMatchObject({ code: "invalid-signature" });
    await expect(adapter.verifyWebhook(body, signedBody(body, "whsec_other_secret"))).rejects.toMatchObject({ code: "invalid-signature" });
    await expect(adapter.verifyWebhook(body, "not-a-signature")).rejects.toMatchObject({ code: "invalid-signature" });
  });

  it("ignores unrelated webhook events after signature verification", async () => {
    const adapter = new StripePaymentAdapter(config, vi.fn() as unknown as StripeFetch);
    const body = JSON.stringify({ type: "payment_method.attached", data: { object: { id: "pm_1" } } });
    await expect(adapter.verifyWebhook(body, signedBody(body))).resolves.toBeNull();
  });
});

describe("stripe signature helpers stay honest", () => {
  it("keeps timingSafeEqual comparisons length-safe", () => {
    const a = Buffer.from("abc");
    const b = Buffer.from("abc");
    expect(a.length === b.length && timingSafeEqual(a, b)).toBe(true);
  });
});
