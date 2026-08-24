import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  AlipayPaymentAdapter,
  DeterministicPaymentAdapter,
  loadAlipayAdapterConfig,
} from "../src/index";
import type { AlipayAdapterConfig, AlipayClient } from "../src/index";

function keys() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

const appKeys = keys();
const providerKeys = keys();
const config: AlipayAdapterConfig = {
  appId: "2026000000000001",
  privateKey: appKeys.privateKey,
  alipayPublicKey: providerKeys.publicKey,
  gateway: "https://openapi.alipaydev.com/gateway.do",
  merchantPid: "2088000000000001",
};

function signedFields(overrides: Record<string, string> = {}): Record<string, string> {
  const fields = {
    app_id: config.appId,
    seller_id: config.merchantPid!,
    out_trade_no: "attempt-1",
    total_amount: "102.00",
    trade_status: "TRADE_SUCCESS",
    trade_no: "provider-trade-1",
    notify_id: "notify-1",
    ...overrides,
  };
  const content = Object.entries(fields)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const signer = createSign("RSA-SHA256");
  signer.update(content, "utf8");
  signer.end();
  return { ...fields, sign_type: "RSA2", sign: signer.sign(providerKeys.privateKey, "base64") };
}

describe("Alipay production adapter", () => {
  it("builds signed desktop and mobile redirects with exact minor-unit amounts", async () => {
    const adapter = new AlipayPaymentAdapter(config);
    const common = {
      reference: "attempt-redirect",
      amountMinor: 10_200,
      currency: "CNY" as const,
      subject: "测试订单",
      notifyUrl: "https://shop.example.test/api/payments/alipay/notify",
      returnUrl: "https://shop.example.test/checkout/alipay/return",
      expiresAt: new Date(Date.now() + 15 * 60_000),
    };
    const desktop = new URL((await adapter.createCheckout({ ...common, device: "desktop" })).url);
    const mobile = new URL((await adapter.createCheckout({ ...common, device: "mobile" })).url);
    expect(desktop.searchParams.get("method")).toBe("alipay.trade.page.pay");
    expect(mobile.searchParams.get("method")).toBe("alipay.trade.wap.pay");
    expect(JSON.parse(desktop.searchParams.get("biz_content")!)).toMatchObject({
      out_trade_no: "attempt-redirect",
      total_amount: "102.00",
      product_code: "FAST_INSTANT_TRADE_PAY",
    });
    expect(desktop.searchParams.get("sign_type")).toBe("RSA2");
    expect(desktop.searchParams.get("sign")).toBeTruthy();
  });

  it("accepts a valid raw notification and rejects tampering or another merchant", async () => {
    const adapter = new AlipayPaymentAdapter(config);
    await expect(adapter.verifyNotification(signedFields())).resolves.toMatchObject({
      reference: "attempt-1",
      amountMinor: 10_200,
      currency: "CNY",
      status: "paid",
      providerTradeNo: "provider-trade-1",
      event: { kind: "notify" },
    });
    const tampered = signedFields();
    tampered.total_amount = "1.00";
    await expect(adapter.verifyNotification(tampered)).rejects.toMatchObject({ code: "invalid-signature" });
    await expect(adapter.verifyNotification(signedFields({ seller_id: "another-merchant" })))
      .rejects.toMatchObject({ code: "invalid-response" });
    await expect(adapter.verifyReturnReference(signedFields())).resolves.toBe("attempt-1");
  });

  it("validates signed query responses and closes only a still-pending trade", async () => {
    const exec = vi.fn()
      .mockResolvedValueOnce({
        code: "10000", msg: "Success", outTradeNo: "attempt-query", tradeNo: "trade-query",
        totalAmount: "53.00", tradeStatus: "TRADE_SUCCESS",
      })
      .mockResolvedValueOnce({
        code: "10000", msg: "Success", outTradeNo: "attempt-close", tradeNo: "trade-close",
        totalAmount: "8.00", tradeStatus: "WAIT_BUYER_PAY",
      })
      .mockResolvedValueOnce({ code: "10000", msg: "Success", outTradeNo: "attempt-close", tradeNo: "trade-close" });
    const client: AlipayClient = {
      pageExecute: vi.fn(() => "https://example.test"),
      checkNotifySignV2: vi.fn(() => true),
      exec,
    };
    const adapter = new AlipayPaymentAdapter(config, client);
    await expect(adapter.query({ reference: "attempt-query", amountMinor: 5_300, currency: "CNY" }))
      .resolves.toMatchObject({ status: "paid", amountMinor: 5_300, providerTradeNo: "trade-query" });
    await expect(adapter.close({ reference: "attempt-close", amountMinor: 800, currency: "CNY" }))
      .resolves.toMatchObject({ status: "closed", amountMinor: 800 });
    expect(exec.mock.calls.map(([method]) => method)).toEqual([
      "alipay.trade.query", "alipay.trade.query", "alipay.trade.close",
    ]);
  });

  it("loads server-only key material and rejects an insecure gateway", () => {
    expect(loadAlipayAdapterConfig({
      ALIPAY_APP_ID: config.appId,
      ALIPAY_APP_PRIVATE_KEY: appKeys.privateKey.replace(/-----(?:BEGIN|END) PRIVATE KEY-----|\s/g, ""),
      ALIPAY_PUBLIC_KEY: providerKeys.publicKey.replace(/-----(?:BEGIN|END) PUBLIC KEY-----|\s/g, ""),
      ALIPAY_GATEWAY_URL: config.gateway,
    })).toMatchObject({ appId: config.appId, gateway: config.gateway });
    expect(() => loadAlipayAdapterConfig({
      ALIPAY_APP_ID: config.appId,
      ALIPAY_APP_PRIVATE_KEY: appKeys.privateKey,
      ALIPAY_PUBLIC_KEY: providerKeys.publicKey,
      ALIPAY_GATEWAY_URL: "http://openapi.alipaydev.com/gateway.do",
    })).toThrow(/HTTPS/);
  });
});

describe("deterministic Alipay contract adapter", () => {
  it("drives pending, paid, and closed outcomes without network access", async () => {
    const adapter = new DeterministicPaymentAdapter({ provider: "alipay", baseUrl: "http://localhost:3000", returnPath: "/checkout/alipay/return" });
    const request = { reference: "fake-1", amountMinor: 100, currency: "CNY" as const };
    await expect(adapter.createCheckout({
      ...request,
      subject: "Fake",
      notifyUrl: "http://localhost:3000/notify",
      returnUrl: "http://localhost:3000/return",
      expiresAt: new Date(Date.now() + 60_000),
      device: "desktop",
    })).resolves.toMatchObject({ kind: "redirect", url: expect.stringContaining("/api/test-payments/alipay/fake-1"), providerReference: "fake-alipay-fake-1" });
    await expect(adapter.query(request)).resolves.toMatchObject({ status: "pending" });
    adapter.settle("fake-1", "paid");
    await expect(adapter.query(request)).resolves.toMatchObject({ status: "paid", providerTradeNo: "fake-fake-1" });
    adapter.settle("fake-1", "pending");
    await expect(adapter.close(request)).resolves.toMatchObject({ status: "closed" });
  });
});
