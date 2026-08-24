import { createHash } from "node:crypto";
import type { CatalogProductDraft, CheckoutAddress } from "@ocs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addVariantToCart,
  closePaymentAttempt,
  confirmPaymentAttempt,
  createPaymentAttempt,
  getPrismaClient,
  listPaymentMethods,
  listPortalPaymentAttempts,
  listShopperOrders,
  readCart,
  readPortalPaymentAttempt,
  readShopperOrder,
  registerShopper,
  saveCatalogProduct,
  saveShippingRate,
  setPaymentMethodEnabled,
} from "../src/index";

const runDatabaseTests = process.env.OCS_RUN_DB_TESTS === "1";
const password = "payment-test-password";
const address: CheckoutAddress = {
  recipientName: "支付测试员",
  phone: "13800000000",
  countryCode: "CN",
  region: "上海市",
  city: "上海市",
  district: "浦东新区",
  line1: "世纪大道 1 号",
};

function draft(name: string, stock = 1, price = 10_000): CatalogProductDraft {
  return {
    name: { zh: name },
    story: { zh: "支付集成测试商品" },
    imageUrls: [`/media/cn/${name}.webp`],
    groupIds: [],
    options: [],
    variants: [{ key: "single", selection: {}, sellPriceMinor: price, stock, weightGrams: 500 }],
    published: true,
  };
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function evidence(reference: string, amountMinor: number, suffix: string) {
  return {
    provider: "alipay" as const,
    reference,
    amountMinor,
    currency: "CNY" as const,
    status: "paid" as const,
    providerTradeNo: `trade-${suffix}`,
    event: { externalId: `event-${suffix}`, kind: "notify" as const, payloadDigest: digest(suffix) },
  };
}

describe.skipIf(!runDatabaseTests)("PostgreSQL Payment Attempt and paid Order interface", () => {
  let rateId = "";

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("open_commerce_station_test")) {
      throw new Error("Database integration tests require a dedicated open_commerce_station_test database.");
    }
    const database = getPrismaClient();
    await database.paymentProviderEvent.deleteMany();
    await database.order.deleteMany();
    await database.paymentAttempt.deleteMany();
    await database.productVariant.updateMany({ data: { reservedStock: 0 } });
    await database.cart.deleteMany();
    await database.product.deleteMany();
    await database.shippingRate.deleteMany();
    await database.shopper.deleteMany({ where: { email: { endsWith: "@payment.test" } } });
    await registerShopper("cn", "buyer@payment.test", password);
    await registerShopper("cn", "rival@payment.test", password);
    rateId = (await saveShippingRate("cn", {
      name: { zh: "测试配送" },
      enabled: true,
      countryCodes: ["CN"],
      regions: [],
      minWeightGrams: 0,
      priceMinor: 1_200,
      position: 0,
    })).id;
    await setPaymentMethodEnabled("cn", "alipay", true);
  });

  afterAll(async () => {
    const database = getPrismaClient();
    await database.paymentProviderEvent.deleteMany();
    await database.order.deleteMany();
    await database.paymentAttempt.deleteMany();
    await database.productVariant.updateMany({ data: { reservedStock: 0 } });
    await database.cart.deleteMany();
    await database.product.deleteMany();
    await database.shippingRate.deleteMany();
    await database.shopper.deleteMany({ where: { email: { endsWith: "@payment.test" } } });
    await setPaymentMethodEnabled("cn", "alipay", false);
    await database.$disconnect();
  });

  it("keeps only Alipay configurable while WeChat Pay remains disabled", async () => {
    await expect(listPaymentMethods("cn")).resolves.toEqual([
      { provider: "alipay", enabled: true },
      { provider: "wechat", enabled: false },
    ]);
    await expect(setPaymentMethodEnabled("cn", "wechat", true)).rejects.toMatchObject({ code: "unsupported" });
  });

  it("deduplicates repeated initiation and reserves stock only once", async () => {
    const product = await saveCatalogProduct("cn", draft("重复发起"));
    const variantId = product.variants[0]!.id;
    await addVariantToCart("cn", "duplicate-cart", variantId, 1);
    const input = {
      flavor: "cn" as const,
      provider: "alipay" as const,
      currency: "CNY" as const,
      cartToken: "duplicate-cart",
      shopperEmail: "buyer@payment.test",
      address,
      selectedShippingRateId: rateId,
    };
    const first = await createPaymentAttempt(input);
    const second = await createPaymentAttempt(input);
    expect(second.id).toBe(first.id);
    await expect(getPrismaClient().productVariant.findUniqueOrThrow({ where: { id: variantId } }))
      .resolves.toMatchObject({ stock: 1, reservedStock: 1 });
    await expect(readCart("cn", "duplicate-cart")).resolves.toMatchObject({ hasInvalidLines: true });
  });

  it("lets only one concurrent Shopper reserve the final unit", async () => {
    const product = await saveCatalogProduct("cn", draft("末件并发"));
    const variantId = product.variants[0]!.id;
    await Promise.all([
      addVariantToCart("cn", "race-buyer-cart", variantId, 1),
      addVariantToCart("cn", "race-rival-cart", variantId, 1),
    ]);
    const result = await Promise.allSettled([
      createPaymentAttempt({
        flavor: "cn", provider: "alipay", currency: "CNY", cartToken: "race-buyer-cart",
        shopperEmail: "buyer@payment.test", address, selectedShippingRateId: rateId,
      }),
      createPaymentAttempt({
        flavor: "cn", provider: "alipay", currency: "CNY", cartToken: "race-rival-cart",
        shopperEmail: "rival@payment.test", address, selectedShippingRateId: rateId,
      }),
    ]);
    expect(result.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(result.filter((item) => item.status === "rejected")).toHaveLength(1);
    await expect(getPrismaClient().productVariant.findUniqueOrThrow({ where: { id: variantId } }))
      .resolves.toMatchObject({ stock: 1, reservedStock: 1 });
  });

  it("rejects mismatched evidence, confirms once, snapshots facts, and clears the Cart", async () => {
    const originalDraft = draft("订单快照", 2, 20_000);
    const product = await saveCatalogProduct("cn", originalDraft);
    const variantId = product.variants[0]!.id;
    await addVariantToCart("cn", "paid-cart", variantId, 1);
    const attempt = await createPaymentAttempt({
      flavor: "cn", provider: "alipay", currency: "CNY", cartToken: "paid-cart",
      shopperEmail: "buyer@payment.test", address, selectedShippingRateId: rateId,
    });
    await expect(confirmPaymentAttempt(evidence(attempt.id, attempt.totalMinor + 1, "bad-amount")))
      .rejects.toMatchObject({ code: "invalid-evidence" });
    await expect(getPrismaClient().productVariant.findUniqueOrThrow({ where: { id: variantId } }))
      .resolves.toMatchObject({ stock: 2, reservedStock: 1 });

    const paidEvidence = evidence(attempt.id, attempt.totalMinor, "paid-once");
    const [first, second] = await Promise.all([
      confirmPaymentAttempt(paidEvidence),
      confirmPaymentAttempt(paidEvidence),
    ]);
    expect(second.number).toBe(first.number);
    expect(first).toMatchObject({
      provider: "alipay",
      subtotalMinor: 20_000,
      shippingMinor: 1_200,
      totalMinor: 21_200,
      address,
    });
    await expect(getPrismaClient().productVariant.findUniqueOrThrow({ where: { id: variantId } }))
      .resolves.toMatchObject({ stock: 1, reservedStock: 0 });
    await expect(readCart("cn", "paid-cart")).resolves.toMatchObject({ quantity: 0, lines: [] });
    await expect(getPrismaClient().order.count({ where: { paymentAttempt: { publicId: attempt.id } } })).resolves.toBe(1);

    await saveCatalogProduct("cn", { ...originalDraft, name: { zh: "已改名" }, variants: [{ ...originalDraft.variants[0]!, sellPriceMinor: 30_000 }] }, product.id);
    await expect(readShopperOrder("cn", "buyer@payment.test", first.number)).resolves.toMatchObject({
      number: first.number,
      subtotalMinor: 20_000,
      lines: [{ productName: { zh: "订单快照" }, unitPriceMinor: 20_000 }],
    });
    await expect(readShopperOrder("cn", "rival@payment.test", first.number)).resolves.toBeNull();
    await expect(listShopperOrders("cn", "buyer@payment.test")).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ number: first.number })]),
    );
  });

  it("releases a reservation only from trusted closed provider evidence", async () => {    const product = await saveCatalogProduct("cn", draft("取消释放"));
    const variantId = product.variants[0]!.id;
    await addVariantToCart("cn", "cancel-cart", variantId, 1);
    const attempt = await createPaymentAttempt({
      flavor: "cn", provider: "alipay", currency: "CNY", cartToken: "cancel-cart",
      shopperEmail: "buyer@payment.test", address, selectedShippingRateId: rateId,
    });
    const closed = {
      ...evidence(attempt.id, attempt.totalMinor, "closed"),
      status: "closed" as const,
      providerTradeNo: undefined,
      event: { externalId: "event-closed", kind: "query" as const, payloadDigest: digest("closed") },
    };
    const first = await closePaymentAttempt(closed, "cancelled");
    const second = await closePaymentAttempt(closed, "cancelled");
    expect(first.status).toBe("cancelled");
    expect(second.status).toBe("cancelled");
    await expect(getPrismaClient().productVariant.findUniqueOrThrow({ where: { id: variantId } }))
      .resolves.toMatchObject({ stock: 1, reservedStock: 0 });
  });

  it("exposes Portal attempt reads for explicit recovery", async () => {
    const product = await saveCatalogProduct("cn", draft("后台对账"));
    const variantId = product.variants[0]!.id;
    await addVariantToCart("cn", "portal-recovery-cart", variantId, 1);
    const attempt = await createPaymentAttempt({
      flavor: "cn", provider: "alipay", currency: "CNY", cartToken: "portal-recovery-cart",
      shopperEmail: "buyer@payment.test", address, selectedShippingRateId: rateId,
    });
    await expect(listPortalPaymentAttempts("cn")).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: attempt.id,
        status: "pending",
        shopperEmail: "buyer@payment.test",
        totalMinor: attempt.totalMinor,
      }),
    ]));
    await expect(readPortalPaymentAttempt("cn", attempt.id)).resolves.toMatchObject({
      id: attempt.id,
      status: "pending",
    });
    await expect(readPortalPaymentAttempt("global", attempt.id)).resolves.toBeNull();

    const closed = {
      ...evidence(attempt.id, attempt.totalMinor, "portal"),
      status: "closed" as const,
      providerTradeNo: undefined,
      event: { externalId: "event-portal", kind: "query" as const, payloadDigest: digest("portal") },
    };
    await closePaymentAttempt(closed, "expired");
    await expect(readPortalPaymentAttempt("cn", attempt.id)).resolves.toMatchObject({
      status: "expired",
      failureCode: "provider-expired",
    });
    await expect(getPrismaClient().productVariant.findUniqueOrThrow({ where: { id: variantId } }))
      .resolves.toMatchObject({ stock: 1, reservedStock: 0 });
  });
});
