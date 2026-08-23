import type { CatalogProductDraft, CheckoutAddress } from "@ocs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addVariantToCart,
  authenticateShopper,
  calculatePersistedCheckoutQuote,
  clearCart,
  deleteDiscountCode,
  deleteShippingRate,
  getPrismaClient,
  listDiscountCodes,
  listPolicies,
  listShippingRates,
  readCart,
  readDefaultAddress,
  readPolicy,
  registerShopper,
  saveCatalogProduct,
  saveDefaultAddress,
  saveDiscountCode,
  saveShippingRate,
  setCartLineQuantity,
  writePolicy,
} from "../src/index";

const runDatabaseTests = process.env.OCS_RUN_DB_TESTS === "1";
const shopperEmail = "checkout-shopper@example.test";
const shopperPassword = "checkout-test-password";
const address: CheckoutAddress = {
  recipientName: "Checkout Shopper",
  phone: "+1 555 0100",
  countryCode: "US",
  region: "CA",
  city: "San Francisco",
  postalCode: "94107",
  line1: "1 Market Street",
};

function productDraft(): CatalogProductDraft {
  return {
    name: { en: "Checkout mug" },
    story: { en: "Integration Product" },
    imageUrls: ["/media/global/product-checkout-test.webp"],
    groupIds: [],
    options: [],
    variants: [{ key: "single", selection: {}, sellPriceMinor: 10_000, stock: 3, weightGrams: 500 }],
    published: true,
  };
}

describe.skipIf(!runDatabaseTests)("PostgreSQL Checkout quote interface", () => {
  let variantId = "";

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("open_commerce_station_test")) {
      throw new Error("Database integration tests require a dedicated open_commerce_station_test database.");
    }
    const database = getPrismaClient();
    await database.cart.deleteMany();
    await database.product.deleteMany();
    await database.discountCode.deleteMany();
    await database.shippingRate.deleteMany();
    await database.shopper.deleteMany({ where: { email: shopperEmail } });
    const product = await saveCatalogProduct("global", productDraft());
    variantId = product.variants[0]!.id;
  });

  afterAll(async () => {
    const database = getPrismaClient();
    await database.cart.deleteMany();
    await database.product.deleteMany();
    await database.discountCode.deleteMany();
    await database.shippingRate.deleteMany();
    await database.shopper.deleteMany({ where: { email: shopperEmail } });
    await writePolicy("global", "privacy", {});
    await database.$disconnect();
  });

  it("registers and authenticates a flavor-isolated Shopper Account", async () => {
    await expect(registerShopper("global", shopperEmail.toUpperCase(), shopperPassword)).resolves.toMatchObject({
      email: shopperEmail,
      name: "Shopper",
    });
    await expect(authenticateShopper("global", shopperEmail, shopperPassword)).resolves.toMatchObject({ email: shopperEmail });
    await expect(authenticateShopper("cn", shopperEmail, shopperPassword)).resolves.toBeNull();
    await expect(registerShopper("global", shopperEmail, shopperPassword)).rejects.toMatchObject({ code: "duplicate-email" });
  });

  it("reads, updates, removes, and clears Cart lines against current stock", async () => {
    await addVariantToCart("global", "checkout-cart", variantId, 1);
    await expect(readCart("global", "checkout-cart")).resolves.toMatchObject({ quantity: 1, subtotalMinor: 10_000, hasInvalidLines: false });
    await setCartLineQuantity("global", "checkout-cart", variantId, 3);
    await expect(readCart("global", "checkout-cart")).resolves.toMatchObject({ quantity: 3, subtotalMinor: 30_000 });
    await expect(setCartLineQuantity("global", "checkout-cart", variantId, 4)).rejects.toMatchObject({ code: "out-of-stock" });
    await setCartLineQuantity("global", "checkout-cart", variantId, 0);
    await expect(readCart("global", "checkout-cart")).resolves.toMatchObject({ quantity: 0, lines: [] });
    await addVariantToCart("global", "checkout-cart", variantId, 1);
    await clearCart("global", "checkout-cart");
    await expect(readCart("global", "checkout-cart")).resolves.toMatchObject({ quantity: 0, lines: [] });
  });

  it("persists Merchant Discount Codes and Shipping Rates and calculates one no-tax quote", async () => {
    const discount = await saveDiscountCode("global", {
      code: "welcome10",
      kind: "percentage",
      percentageBps: 1000,
      enabled: true,
    });
    const rate = await saveShippingRate("global", {
      name: { en: "California ground" },
      enabled: true,
      countryCodes: ["us"],
      regions: ["CA"],
      minWeightGrams: 0,
      maxWeightGrams: 1000,
      priceMinor: 800,
      freeOverMinor: 20_000,
      position: 0,
    });
    await addVariantToCart("global", "quote-cart", variantId, 1);

    await expect(calculatePersistedCheckoutQuote({
      flavor: "global",
      currency: "USD",
      cartToken: "quote-cart",
      address,
      discountCode: "welcome10",
      selectedShippingRateId: rate.id,
    })).resolves.toMatchObject({
      subtotalMinor: 10_000,
      discountCode: "WELCOME10",
      discountMinor: 1_000,
      shippingMinor: 800,
      totalMinor: 9_800,
      selectedShippingRateId: rate.id,
    });
    await expect(calculatePersistedCheckoutQuote({
      flavor: "global", currency: "USD", cartToken: "quote-cart", address, discountCode: "missing",
    })).rejects.toMatchObject({ code: "invalid-discount" });
    await expect(listDiscountCodes("global")).resolves.toEqual([discount]);
    await expect(listShippingRates("global")).resolves.toEqual([rate]);
  });

  it("saves the Shopper default Address and rejects an unmatched destination", async () => {
    await expect(saveDefaultAddress("global", shopperEmail, address)).resolves.toMatchObject(address);
    await expect(readDefaultAddress("global", shopperEmail)).resolves.toMatchObject(address);
    await expect(calculatePersistedCheckoutQuote({
      flavor: "global",
      currency: "USD",
      cartToken: "quote-cart",
      address: { ...address, countryCode: "GB", region: "England" },
    })).rejects.toMatchObject({ code: "no-shipping-rate" });
  });

  it("keeps four reserved Policies and persists Merchant content", async () => {
    await expect(listPolicies("global")).resolves.toHaveLength(4);
    await writePolicy("global", "privacy", { en: "We only use order data to fulfill purchases." });
    await expect(readPolicy("global", "privacy")).resolves.toMatchObject({
      slug: "privacy",
      body: { en: "We only use order data to fulfill purchases." },
    });
  });

  it("deletes Merchant pricing configuration without crossing flavors", async () => {
    const discount = (await listDiscountCodes("global"))[0]!;
    const rate = (await listShippingRates("global"))[0]!;
    await expect(deleteDiscountCode("cn", discount.id)).rejects.toMatchObject({ code: "not-found" });
    await expect(deleteShippingRate("cn", rate.id)).rejects.toMatchObject({ code: "not-found" });
    await deleteDiscountCode("global", discount.id);
    await deleteShippingRate("global", rate.id);
    await expect(listDiscountCodes("global")).resolves.toEqual([]);
    await expect(listShippingRates("global")).resolves.toEqual([]);
  });
});
