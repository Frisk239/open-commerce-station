import { describe, expect, it } from "vitest";
import { CatalogFormError, parseCatalogDraft } from "../src/catalog";

const validDraft = {
  name: { en: "Travel mug" },
  story: { en: "A physical Product." },
  imageUrls: [],
  groupIds: [],
  options: [],
  variants: [{
    key: "single",
    selection: {},
    sellPriceMinor: 3900,
    stock: 2,
    weightGrams: 420,
  }],
  published: false,
};

describe("Merchant catalog input", () => {
  it("parses the JSON boundary into minor units and a single Variant", () => {
    expect(parseCatalogDraft(JSON.stringify(validDraft))).toEqual(validDraft);
  });

  it("rejects unsupported Option keys and negative stock before persistence", () => {
    expect(() => parseCatalogDraft(JSON.stringify({
      ...validDraft,
      options: [{ key: "unsafe key", name: { en: "Size" }, values: [{ key: "small", name: { en: "Small" } }] }],
      variants: [{ ...validDraft.variants[0], stock: -1 }],
    }))).toThrow(CatalogFormError);
  });
});
