import { createHash } from "node:crypto";
import type { CatalogProductDraft, CheckoutAddress } from "@ocs/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  confirmPaymentAttempt,
  drainNoticeMails,
  getPrismaClient,
  listPortalNoticeMails,
  markOrderShipped,
  readMailConfig,
  registerShopper,
  retryNoticeMail,
  saveCatalogProduct,
  saveMailConfig,
  saveShippingRate,
  setPaymentMethodEnabled,
} from "../src/index";

const runDatabaseTests = process.env.OCS_RUN_DB_TESTS === "1";
const password = "fulfillment-test-password";
const address: CheckoutAddress = {
  recipientName: "发货测试员", phone: "13800000000", countryCode: "CN", region: "上海市", city: "上海市", district: "浦东新区", line1: "世纪大道 2 号",
};

function draft(name: string, stock = 2): CatalogProductDraft {
  return {
    name: { zh: name }, story: { zh: "发货集成测试商品" }, imageUrls: [`/media/cn/${name}.webp`], groupIds: [], options: [],
    variants: [{ key: "single", selection: {}, sellPriceMinor: 10_000, stock, weightGrams: 500 }], published: true,
  };
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function paidEvidence(reference: string, amountMinor: number, suffix: string) {
  return {
    provider: "alipay" as const, reference, amountMinor, currency: "CNY" as const, status: "paid" as const,
    providerTradeNo: `trade-${suffix}`, event: { externalId: `event-${suffix}`, kind: "notify" as const, payloadDigest: digest(suffix) },
  };
}

describe.skipIf(!runDatabaseTests)("PostgreSQL Fulfillment and Notice Mail interface", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("open_commerce_station_test")) {
      throw new Error("Database integration tests require a dedicated open_commerce_station_test database.");
    }
    const database = getPrismaClient();
    await database.mailOutbox.deleteMany({});
    await database.mailConfig.deleteMany({});
    await database.order.deleteMany({});
    await database.paymentProviderEvent.deleteMany({});
    await database.stockReservation.deleteMany({});
    await database.paymentAttempt.deleteMany({});
    await database.cart.deleteMany({});
    await database.productGroupAssignment.deleteMany({});
    await database.productImage.deleteMany({});
    await database.productOptionValue.deleteMany({});
    await database.productOption.deleteMany({});
    await database.productVariant.deleteMany({});
    await database.product.deleteMany({});
    await database.shippingRate.deleteMany({});
    await database.shopper.deleteMany({ where: { email: { endsWith: "@fulfillment.test" } } });
    await registerShopper("cn", "buyer@fulfillment.test", password);
    await saveShippingRate("cn", { name: { zh: "发货测试配送" }, enabled: true, countryCodes: ["CN"], regions: [], minWeightGrams: 0, priceMinor: 1_200, position: 0 });
    await setPaymentMethodEnabled("cn", "alipay", true);
    await saveMailConfig("cn", { host: "smtp.example.test", port: 465, secure: true, fromEmail: "shop@example.test", ownerToEmail: "owner@example.test" });
  });

  afterAll(async () => {
    const database = getPrismaClient();
    await database.mailOutbox.deleteMany({});
    await database.mailConfig.deleteMany({});
    await database.order.deleteMany({});
    await database.paymentProviderEvent.deleteMany({});
    await database.stockReservation.deleteMany({});
    await database.paymentAttempt.deleteMany({});
    await database.cart.deleteMany({});
    await database.productGroupAssignment.deleteMany({});
    await database.productImage.deleteMany({});
    await database.productOptionValue.deleteMany({});
    await database.productOption.deleteMany({});
    await database.productVariant.deleteMany({});
    await database.product.deleteMany({});
    await database.shippingRate.deleteMany({});
    await database.shopper.deleteMany({ where: { email: { endsWith: "@fulfillment.test" } } });
    await setPaymentMethodEnabled("cn", "alipay", false);
    await database.$disconnect();
  });

  it("round-trips SMTP settings without echoing the password", async () => {
    const config = await readMailConfig("cn");
    expect(config).toMatchObject({ host: "smtp.example.test", port: 465, secure: true, fromEmail: "shop@example.test", ownerToEmail: "owner@example.test", hasPassword: false });
    await saveMailConfig("cn", { host: "smtp.example.test", port: 465, secure: true, username: "shop", password: "secret-value", fromEmail: "shop@example.test", ownerToEmail: "owner@example.test" });
    await expect(readMailConfig("cn")).resolves.toMatchObject({ username: "shop", hasPassword: true });
    // A blank password keeps the stored one.
    await saveMailConfig("cn", { host: "smtp.example.test", port: 587, secure: false, fromEmail: "shop@example.test", ownerToEmail: "owner@example.test" });
    await expect(readMailConfig("cn")).resolves.toMatchObject({ port: 587, secure: false, hasPassword: true });
  });

  it("enqueues paid letters once per confirmed Order and ships with a tracking letter", async () => {
    const { addVariantToCart, createPaymentAttempt } = await import("../src/index");
    const product = await saveCatalogProduct("cn", draft("发货快照"));
    const variantId = product.variants[0]!.id;
    await addVariantToCart("cn", "fulfill-cart", variantId, 1);
    const attempt = await createPaymentAttempt({
      flavor: "cn", provider: "alipay", currency: "CNY", cartToken: "fulfill-cart",
      shopperEmail: "buyer@fulfillment.test", address, selectedShippingRateId: (await getPrismaClient().shippingRate.findFirstOrThrow()).id,
    });
    const order = await confirmPaymentAttempt(paidEvidence(attempt.id, attempt.totalMinor, "fulfill-paid"));
    expect(order.fulfillmentStatus).toBe("unfulfilled");
    expect(order.trackingNumber).toBeUndefined();

    // A repeated confirmation must not enqueue duplicate letters.
    await confirmPaymentAttempt(paidEvidence(attempt.id, attempt.totalMinor, "fulfill-paid"));
    const afterConfirm = await listPortalNoticeMails("cn");
    const paidLetters = afterConfirm.filter((mail) => mail.kind === "paid");
    const ownerLetters = afterConfirm.filter((mail) => mail.kind === "owner-new-order");
    expect(paidLetters).toHaveLength(1);
    expect(ownerLetters).toHaveLength(1);
    expect(ownerLetters[0]!.toEmail).toBe("owner@example.test");
    expect(paidLetters[0]!.status).toBe("pending");

    const shipped = await markOrderShipped("cn", order.number, "SF999888777");
    expect(shipped).toMatchObject({ fulfillmentStatus: "shipped", trackingNumber: "SF999888777" });
    expect(shipped.shippedAt).toBeDefined();
    // Second ship attempt is rejected.
    await expect(markOrderShipped("cn", order.number, "SF000")).rejects.toMatchObject({ code: "invalid-state" });

    const afterShip = await listPortalNoticeMails("cn");
    const shippedLetters = afterShip.filter((mail) => mail.kind === "shipped");
    expect(shippedLetters).toHaveLength(1);
    expect(shippedLetters[0]!.toEmail).toBe("buyer@fulfillment.test");
    expect(shippedLetters[0]!.bodyText).toContain("SF999888777");
  });

  it("drains letters once, marks failures retryable, and never re-sends sent letters", async () => {
    const send = vi.fn()
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockResolvedValue(undefined)
      .mockResolvedValue(undefined);
    const first = await drainNoticeMails("cn", send);
    expect(first).toMatchObject({ attempted: 3, sent: 2, failed: 1 });
    const afterFirst = await listPortalNoticeMails("cn");
    expect(afterFirst.filter((mail) => mail.status === "sent")).toHaveLength(2);
    const failed = afterFirst.find((mail) => mail.status === "failed");
    expect(failed?.lastError).toContain("smtp down");

    await retryNoticeMail("cn", failed!.id);
    const second = await drainNoticeMails("cn", send);
    expect(second).toMatchObject({ attempted: 1, sent: 1, failed: 0 });
    // A third drain finds nothing pending: sent letters never re-enter the pool.
    const third = await drainNoticeMails("cn", send);
    expect(third).toMatchObject({ attempted: 0 });
    expect(send).toHaveBeenCalledTimes(4);
  });
});
