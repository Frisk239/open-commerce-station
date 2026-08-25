import { createHash } from "node:crypto";
import type { CatalogProductDraft, CheckoutAddress, RefundPaymentEvidence } from "@ocs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addVariantToCart,
  applyOrderRefund,
  confirmPaymentAttempt,
  confirmReturnGoodsReceived,
  createPaymentAttempt,
  decideReturnRequest,
  getPrismaClient,
  listOrderReturnRequests,
  markOrderShipped,
  readShopperOrder,
  registerShopper,
  requestShopperReturn,
  saveCatalogProduct,
  saveShippingRate,
  setPaymentMethodEnabled,
} from "../src/index";

const runDatabaseTests = process.env.OCS_RUN_DB_TESTS === "1";
const password = "returns-test-password";
const address: CheckoutAddress = {
  recipientName: "退货测试员", phone: "13800000000", countryCode: "CN", region: "上海市", city: "上海市", district: "浦东新区", line1: "世纪大道 5 号",
};

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function draft(name: string, stock = 4): CatalogProductDraft {
  return {
    name: { zh: name }, story: { zh: "退货集成测试商品" }, imageUrls: [`/media/cn/${name}.webp`], groupIds: [], options: [],
    variants: [{ key: "single", selection: {}, sellPriceMinor: 15_000, stock, weightGrams: 500 }], published: true,
  };
}

function paidEvidence(reference: string, amountMinor: number, suffix: string) {
  return {
    provider: "alipay" as const, reference, amountMinor, currency: "CNY" as const, status: "paid" as const,
    providerTradeNo: `trade-${suffix}`, event: { externalId: `event-${suffix}`, kind: "notify" as const, payloadDigest: digest(suffix) },
  };
}

function refundEvidence(reference: string, amountMinor: number, suffix: string): RefundPaymentEvidence {
  return {
    provider: "alipay", reference, amountMinor, currency: "CNY", refundTradeNo: `refund-${suffix}`,
    event: { externalId: `refund-event-${suffix}`, kind: "query", payloadDigest: digest(`refund-${suffix}`) },
  };
}

async function paidOrder(cartToken: string, productSuffix: string) {
  const product = await saveCatalogProduct("cn", draft(`退货订单${productSuffix}`));
  await addVariantToCart("cn", cartToken, product.variants[0]!.id, 1);
  const rateId = (await getPrismaClient().shippingRate.findFirstOrThrow()).id;
  const attempt = await createPaymentAttempt({
    flavor: "cn", provider: "alipay", currency: "CNY", cartToken,
    shopperEmail: "buyer@returns.test", address, selectedShippingRateId: rateId,
  });
  return { order: await confirmPaymentAttempt(paidEvidence(attempt.id, attempt.totalMinor, `ret-${productSuffix}`)), attemptId: attempt.id, totalMinor: attempt.totalMinor };
}

describe.skipIf(!runDatabaseTests)("PostgreSQL Return Request interface", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("open_commerce_station_test")) {
      throw new Error("Database integration tests require a dedicated open_commerce_station_test database.");
    }
    const database = getPrismaClient();
    await database.returnRequest.deleteMany({});
    await database.mailOutbox.deleteMany({});
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
    await database.shopper.deleteMany({ where: { email: { endsWith: "@returns.test" } } });
    await registerShopper("cn", "buyer@returns.test", password);
    await saveShippingRate("cn", { name: { zh: "退货测试配送" }, enabled: true, countryCodes: ["CN"], regions: [], minWeightGrams: 0, priceMinor: 1_000, position: 0 });
    await setPaymentMethodEnabled("cn", "alipay", true);
  });

  afterAll(async () => {
    const database = getPrismaClient();
    await database.returnRequest.deleteMany({});
    await database.mailOutbox.deleteMany({});
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
    await database.shopper.deleteMany({ where: { email: { endsWith: "@returns.test" } } });
    await setPaymentMethodEnabled("cn", "alipay", false);
    await database.$disconnect();
  });

  it("refunds an unshipped order once after approval and keeps rejection visible", async () => {
    const { order, attemptId, totalMinor } = await paidOrder("ret-unshipped-cart", "A");
    // One pending request per Order.
    await requestShopperReturn("cn", "buyer@returns.test", order.number, "尺寸不合适");
    await expect(requestShopperReturn("cn", "buyer@returns.test", order.number, "再想想")).rejects.toMatchObject({ code: "invalid-state" });
    const history = await listOrderReturnRequests("cn", order.number);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ status: "open", reason: "尺寸不合适" });

    // Money does not move without agreement.
    await expect(applyOrderRefund(refundEvidence(attemptId, totalMinor, "early"))).rejects.toMatchObject({ code: "invalid-state" });

    await decideReturnRequest("cn", order.number, "approved", "同意退货");
    const refunded = await applyOrderRefund(refundEvidence(attemptId, totalMinor, "unshipped"));
    expect(refunded).toMatchObject({ paymentStatus: "refunded", returnStatus: "refunded", refundTradeNo: "refund-unshipped" });
    expect(refunded.refundedAt).toBeDefined();
    // Repeat refund evidence changes nothing.
    const again = await applyOrderRefund(refundEvidence(attemptId, totalMinor, "unshipped"));
    expect(again.paymentStatus).toBe("refunded");
    // Rejected requests stay visible and one-shot.
    const rejected = await paidOrder("ret-rejected-cart", "B");
    await requestShopperReturn("cn", "buyer@returns.test", rejected.order.number, "颜色不对");
    await decideReturnRequest("cn", rejected.order.number, "rejected", "超出退货范围");
    expect((await readShopperOrder("cn", "buyer@returns.test", rejected.order.number))?.returnStatus).toBe("rejected");
    await expect(requestShopperReturn("cn", "buyer@returns.test", rejected.order.number, "再申请")).rejects.toMatchObject({ code: "invalid-state" });
    expect((await listOrderReturnRequests("cn", rejected.order.number))[0]).toMatchObject({ status: "rejected", note: "超出退货范围" });
  });

  it("waits for goods on a shipped order, blocks shipping during the request, and refunds on confirmation", async () => {
    const { order, attemptId, totalMinor } = await paidOrder("ret-shipped-cart", "C");
    // Ship first, then request the return.
    await markOrderShipped("cn", order.number, "SF-RET-111");
    await requestShopperReturn("cn", "buyer@returns.test", order.number, "商品有瑕疵");
    await decideReturnRequest("cn", order.number, "approved");
    // Approved + shipped = waiting for goods; refund is not allowed yet by confirmation guard order.
    const waiting = await readShopperOrder("cn", "buyer@returns.test", order.number);
    expect(waiting).toMatchObject({ returnStatus: "approved", fulfillmentStatus: "shipped" });
    // Confirm the goods came back, then refund once.
    await confirmReturnGoodsReceived("cn", order.number);
    const refunded = await applyOrderRefund(refundEvidence(attemptId, totalMinor, "shipped"));
    expect(refunded).toMatchObject({ paymentStatus: "refunded", returnStatus: "refunded" });

    // An open request blocks shipping a different order's goods.
    const blocked = await paidOrder("ret-blocked-cart", "D");
    await requestShopperReturn("cn", "buyer@returns.test", blocked.order.number, "拍错了");
    await expect(markOrderShipped("cn", blocked.order.number, "SF-NO-999")).rejects.toMatchObject({ code: "invalid-state" });
  });
});
