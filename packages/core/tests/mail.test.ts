import { describe, expect, it } from "vitest";
import { composeNoticeMail, noticeMailEventKey } from "../src/mail";

const order = {
  number: "OC20260824TEST",
  flavor: "cn" as const,
  shopperEmail: "buyer@example.test",
  currency: "CNY" as const,
  totalMinor: 11_200,
  lines: [{ productName: { zh: "测试陶杯", en: "Test mug" }, quantity: 1 }],
};

describe("Notice Mail composition", () => {
  it("composes the three letters with store voice and exact amounts", () => {
    const paid = composeNoticeMail({ kind: "paid", order, storeName: "山川商店", ownerEmail: "owner@example.test" });
    expect(paid.toEmail).toBe("buyer@example.test");
    expect(paid.subject).toContain("OC20260824TEST");
    expect(paid.bodyText).toContain("¥112.00");
    expect(paid.bodyText).toContain("测试陶杯 × 1");

    const owner = composeNoticeMail({ kind: "owner-new-order", order, storeName: "山川商店", ownerEmail: "owner@example.test" });
    expect(owner.toEmail).toBe("owner@example.test");
    expect(owner.bodyText).toContain("buyer@example.test");

    const shipped = composeNoticeMail({ kind: "shipped", order: { ...order, trackingNumber: "SF123456" }, storeName: "山川商店", ownerEmail: "owner@example.test" });
    expect(shipped.bodyText).toContain("SF123456");
  });

  it("renders the English voice for the Global Station", () => {
    const globalOrder = { ...order, flavor: "global" as const, currency: "USD" as const, lines: [{ productName: { en: "Trail mug" }, quantity: 2 }] };
    const paid = composeNoticeMail({ kind: "paid", order: globalOrder, storeName: "Atlas Goods", ownerEmail: "owner@example.test" });
    expect(paid.subject).toContain("Payment received");
    expect(paid.bodyText).toContain("$");
    expect(paid.bodyText).toContain("Trail mug × 2");
  });

  it("keys letters by business event for deduplication", () => {
    expect(noticeMailEventKey("paid", "OC1")).toBe("paid:OC1");
    expect(noticeMailEventKey("shipped", "OC1")).toBe("shipped:OC1");
  });
});
