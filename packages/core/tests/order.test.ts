import { describe, expect, it } from "vitest";
import { availableStock, formatProviderAmount, parseProviderAmount, validatePaidEvidence } from "../src/order";

describe("Payment and reservation rules", () => {
  it("expresses provider amounts without floating point", () => {
    expect(formatProviderAmount(10_005)).toBe("100.05");
    expect(parseProviderAmount("100.05")).toBe(10_005);
    expect(parseProviderAmount("8.8")).toBe(880);
    expect(() => parseProviderAmount("1.001")).toThrowError(expect.objectContaining({ code: "invalid-amount" }));
  });

  it("subtracts reservations from Storefront availability", () => {
    expect(availableStock(3, 2)).toBe(1);
    expect(() => availableStock(1, 2)).toThrowError(expect.objectContaining({ code: "invalid-status" }));
  });

  it("accepts only paid evidence for the exact provider, reference, amount, and currency", () => {
    const evidence = { expectedProvider: "alipay", expectedReference: "attempt-1", expectedAmountMinor: 10200, expectedCurrency: "CNY", provider: "alipay", reference: "attempt-1", amountMinor: 10200, currency: "CNY", status: "paid", providerTradeNo: "trade-1" } as const;
    expect(() => validatePaidEvidence(evidence)).not.toThrow();
    expect(() => validatePaidEvidence({ ...evidence, amountMinor: 10199 })).toThrowError(expect.objectContaining({ code: "invalid-amount" }));
    expect(() => validatePaidEvidence({ ...evidence, status: "pending" })).toThrowError(expect.objectContaining({ code: "invalid-status" }));
  });
});
