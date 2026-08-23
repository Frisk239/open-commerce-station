import { describe, expect, it } from "vitest";
import { calculateCheckoutQuote, CheckoutValidationError } from "../src/checkout";

const line = {
  variantId: "variant-1",
  productId: "product-1",
  productSlug: "travel-mug",
  productName: { en: "Travel mug" },
  variantLabel: "Large",
  sellPriceMinor: 10_000,
  stock: 3,
  weightGrams: 500,
  quantity: 2,
  available: true,
};

const address = {
  recipientName: "Shopper",
  phone: "+1 555 0100",
  countryCode: "US",
  region: "CA",
  city: "San Francisco",
  postalCode: "94107",
  line1: "1 Market Street",
};

const rates = [{
  id: "standard",
  name: { en: "Standard" },
  enabled: true,
  countryCodes: ["US"],
  regions: ["CA"],
  minWeightGrams: 0,
  maxWeightGrams: 2000,
  priceMinor: 800,
  freeOverMinor: 19_000,
  position: 0,
}];

describe("Checkout Quote", () => {
  it("uses Sell Price, applies one percentage code, then evaluates free shipping", () => {
    expect(calculateCheckoutQuote({
      flavor: "global",
      currency: "USD",
      lines: [line],
      address,
      shippingRates: rates,
      discount: { id: "discount", code: "WELCOME10", kind: "percentage", percentageBps: 1000, enabled: true },
    })).toMatchObject({
      subtotalMinor: 20_000,
      discountMinor: 2_000,
      discountedSubtotalMinor: 18_000,
      shippingMinor: 800,
      totalMinor: 18_800,
      totalWeightGrams: 1000,
    });
  });

  it("caps a fixed code at the merchandise subtotal", () => {
    expect(calculateCheckoutQuote({
      flavor: "global",
      currency: "USD",
      lines: [{ ...line, quantity: 1 }],
      address,
      shippingRates: rates,
      discount: { id: "discount", code: "ALL", kind: "fixed", amountMinor: 50_000, enabled: true },
    })).toMatchObject({ discountMinor: 10_000, discountedSubtotalMinor: 0, shippingMinor: 800, totalMinor: 800 });
  });

  it("rejects unavailable Cart lines and unmatched Shipping Rates", () => {
    expect(() => calculateCheckoutQuote({
      flavor: "global", currency: "USD", lines: [{ ...line, stock: 0 }], address, shippingRates: rates,
    })).toThrowError(expect.objectContaining({ code: "invalid-cart" }) as CheckoutValidationError);
    expect(() => calculateCheckoutQuote({
      flavor: "global", currency: "USD", lines: [line], address: { ...address, countryCode: "GB" }, shippingRates: rates,
    })).toThrowError(expect.objectContaining({ code: "no-shipping-rate" }) as CheckoutValidationError);
    expect(() => calculateCheckoutQuote({
      flavor: "global", currency: "USD", lines: [{ ...line, sellPriceMinor: -1 }], address, shippingRates: rates,
    })).toThrowError(expect.objectContaining({ code: "invalid-cart" }) as CheckoutValidationError);
  });

  it("requires China Station district details and Global postal code", () => {
    expect(() => calculateCheckoutQuote({
      flavor: "cn",
      currency: "CNY",
      lines: [line],
      address: { ...address, countryCode: "CN", region: "上海市", city: "上海市", district: "" },
      shippingRates: [{ ...rates[0]!, countryCodes: ["CN"], regions: [] }],
    })).toThrowError(expect.objectContaining({ code: "invalid-address" }) as CheckoutValidationError);
  });
});
