import { describe, expect, it, vi } from "vitest";
import { PaypalPaymentAdapter } from "../src/index";
import type { PaypalAdapterConfig, PaypalFetch } from "../src/index";

const config: PaypalAdapterConfig = {
  environment: "sandbox",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
};

function jsonResponse(payload: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

const completedOrder = (id: string, reference: string) => ({
  id,
  status: "COMPLETED",
  purchase_units: [{
    reference_id: reference,
    custom_id: reference,
    amount: { currency_code: "USD", value: "53.00" },
    payments: { captures: [{ id: `capture-${id}`, status: "COMPLETED", amount: { currency_code: "USD", value: "53.00" } }] },
  }],
  links: [{ rel: "approve", href: `https://www.sandbox.paypal.com/checkoutnow?token=${id}` }],
});

describe("PayPal production adapter", () => {
  it("authenticates, creates a capture-intent order with exact amounts, and returns the approval redirect", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(completedOrder("order-1", "attempt-1")));
    const adapter = new PaypalPaymentAdapter(config, fetchImpl as unknown as PaypalFetch);
    const redirect = await adapter.createCheckout({
      reference: "attempt-1",
      amountMinor: 5_300,
      currency: "USD",
      subject: "Atlas Goods order",
      returnUrl: "https://shop.example.test/checkout/paypal/return?reference=attempt-1",
      cancelUrl: "https://shop.example.test/payment/attempt-1",
      expiresAt: new Date(Date.now() + 15 * 60_000),
      device: "desktop",
    });
    expect(redirect).toMatchObject({
      kind: "redirect",
      url: "https://www.sandbox.paypal.com/checkoutnow?token=order-1",
      providerReference: "order-1",
    });
    const createBody = JSON.parse((fetchImpl.mock.calls[1]![1] as { body: string }).body) as {
      intent: string;
      purchase_units: ReadonlyArray<{ reference_id: string; amount: { currency_code: string; value: string } }>;
    };
    expect(createBody.intent).toBe("CAPTURE");
    expect(createBody.purchase_units[0]).toMatchObject({ reference_id: "attempt-1", amount: { currency_code: "USD", value: "53.00" } });
  });

  it("confirms only matching capture results and rejects tampered amounts or references", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(completedOrder("order-2", "attempt-2")))
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(completedOrder("order-3", "another-attempt")));
    const adapter = new PaypalPaymentAdapter(config, fetchImpl as unknown as PaypalFetch);
    const request = { reference: "attempt-2", amountMinor: 5_300, currency: "USD" as const, providerReference: "order-2" };
    await expect(adapter.capture(request)).resolves.toMatchObject({
      provider: "paypal",
      status: "paid",
      providerTradeNo: "capture-order-2",
      amountMinor: 5_300,
    });
    await expect(adapter.capture({ ...request, reference: "attempt-2", providerReference: "order-3" }))
      .rejects.toMatchObject({ code: "invalid-response" });
    await expect(adapter.capture({ ...request, amountMinor: 5_299 }))
      .rejects.toMatchObject({ code: "invalid-response" });
  });

  it("maps query statuses and closes by honoring an approved buyer or releasing an untouched order", async () => {
    const approvedOrder = { id: "order-4", status: "APPROVED", purchase_units: [{ custom_id: "attempt-4", amount: { currency_code: "USD", value: "53.00" } }] };
    const createdOrder = { id: "order-5", status: "CREATED", purchase_units: [{ custom_id: "attempt-5", amount: { currency_code: "USD", value: "53.00" } }] };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(approvedOrder))
      .mockResolvedValueOnce(jsonResponse(completedOrder("order-4", "attempt-4")))
      .mockResolvedValueOnce(jsonResponse(createdOrder));
    const adapter = new PaypalPaymentAdapter(config, fetchImpl as unknown as PaypalFetch);
    await expect(adapter.close({ reference: "attempt-4", amountMinor: 5_300, currency: "USD", providerReference: "order-4" }))
      .resolves.toMatchObject({ status: "paid", providerTradeNo: "capture-order-4" });
    await expect(adapter.close({ reference: "attempt-5", amountMinor: 5_300, currency: "USD", providerReference: "order-5" }))
      .resolves.toMatchObject({ status: "closed" });
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      "https://api-m.sandbox.paypal.com/v2/checkout/orders/order-4",
      "https://api-m.sandbox.paypal.com/v2/checkout/orders/order-4/capture",
      "https://api-m.sandbox.paypal.com/v2/checkout/orders/order-5",
    ]);
  });

  it("refuses CNY and surfaces provider failures as unavailable", async () => {
    const fetchImpl = vi.fn();
    const adapter = new PaypalPaymentAdapter(config, fetchImpl as unknown as PaypalFetch);
    await expect(adapter.createCheckout({
      reference: "x", amountMinor: 100, currency: "CNY", subject: "x",
      returnUrl: "https://shop.example.test/return", expiresAt: new Date(Date.now() + 60_000), device: "desktop",
    })).rejects.toMatchObject({ code: "invalid-response" });
    expect(fetchImpl).not.toHaveBeenCalled();
    fetchImpl.mockResolvedValueOnce(jsonResponse({ error: "invalid_client" }, 401));
    await expect(adapter.query({ reference: "x", amountMinor: 100, currency: "USD", providerReference: "order-x" }))
      .rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("PayPal refund adapter", () => {
  it("refunds a capture with exact amounts and returns the refund id", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ id: "refund-1", status: "COMPLETED" }, 201));
    const adapter = new PaypalPaymentAdapter(config, fetchImpl as unknown as PaypalFetch);
    await expect(adapter.refund({ reference: "attempt-9", providerTradeNo: "capture-order-9", amountMinor: 5_300, currency: "USD" }))
      .resolves.toMatchObject({ provider: "paypal", reference: "attempt-9", amountMinor: 5_300, refundTradeNo: "refund-1" });
    const [url, init] = fetchImpl.mock.calls[1]! as [string, { body: string }];
    expect(url).toBe("https://api-m.sandbox.paypal.com/v2/payments/captures/capture-order-9/refund");
    expect(JSON.parse(init.body)).toMatchObject({ amount: { currency_code: "USD", value: "53.00" } });
  });

  it("rejects a non-completed refund", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ id: "refund-2", status: "PENDING" }, 201));
    const adapter = new PaypalPaymentAdapter(config, fetchImpl as unknown as PaypalFetch);
    await expect(adapter.refund({ reference: "attempt-9", providerTradeNo: "capture-order-9", amountMinor: 5_300, currency: "USD" }))
      .rejects.toMatchObject({ code: "invalid-response" });
  });
});
