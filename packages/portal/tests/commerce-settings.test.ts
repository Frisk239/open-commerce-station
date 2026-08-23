import { describe, expect, it } from "vitest";
import { CommerceSettingsFormError, parseDiscountForm, parseShippingForm } from "../src/commerce-settings";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(entries).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("Merchant commerce settings input", () => {
  it("converts percentage and fixed Discount values to minor-unit drafts", () => {
    expect(parseDiscountForm(form({ code: " save10 ", kind: "percentage", value: "10", enabled: "on" })).draft).toEqual({ code: "save10", kind: "percentage", percentageBps: 1000, amountMinor: undefined, enabled: true });
    expect(parseDiscountForm(form({ code: "five", kind: "fixed", value: "5.25" })).draft.amountMinor).toBe(525);
  });

  it("normalizes Shipping Rate lists and money without losing explicit zero price", () => {
    expect(parseShippingForm("global", form({ name: "Ground", countries: "US, CA", regions: "NY, ON", minWeightGrams: "0", maxWeightGrams: "2000", price: "7.50", freeOver: "100", position: "2", enabled: "on" })).draft).toEqual({ name: { en: "Ground" }, enabled: true, countryCodes: ["US", "CA"], regions: ["NY", "ON"], minWeightGrams: 0, maxWeightGrams: 2000, priceMinor: 750, freeOverMinor: 10000, position: 2 });
  });

  it("rejects invalid Discount and Shipping boundaries before persistence", () => {
    expect(() => parseDiscountForm(form({ code: "", kind: "percentage", value: "0" }))).toThrow(CommerceSettingsFormError);
    expect(() => parseShippingForm("cn", form({ name: "", price: "-1" }))).toThrow(CommerceSettingsFormError);
  });
});
