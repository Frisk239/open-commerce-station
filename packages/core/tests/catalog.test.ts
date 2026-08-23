import { describe, expect, it } from "vitest";
import {
  buildVariantCombinations,
  canAddVariantQuantity,
  CatalogValidationError,
  validateCatalogProductDraft,
} from "../src/catalog";

const options = [
  {
    key: "color",
    name: { zh: "颜色" },
    values: [
      { key: "black", name: { zh: "黑色" } },
      { key: "sand", name: { zh: "沙色" } },
    ],
  },
  {
    key: "size",
    name: { zh: "尺寸" },
    values: [
      { key: "small", name: { zh: "小" } },
      { key: "large", name: { zh: "大" } },
    ],
  },
] as const;

describe("Catalog Product aggregate", () => {
  it("gives a no-Option Product exactly one buyable Variant combination", () => {
    expect(buildVariantCombinations([], "zh")).toEqual([{ key: "single", selection: {}, label: "" }]);
  });

  it("builds the complete Merchant-named Option cartesian product", () => {
    expect(buildVariantCombinations(options, "zh")).toEqual([
      { key: "color=black|size=small", selection: { color: "black", size: "small" }, label: "黑色 / 小" },
      { key: "color=black|size=large", selection: { color: "black", size: "large" }, label: "黑色 / 大" },
      { key: "color=sand|size=small", selection: { color: "sand", size: "small" }, label: "沙色 / 小" },
      { key: "color=sand|size=large", selection: { color: "sand", size: "large" }, label: "沙色 / 大" },
    ]);
  });

  it("rejects a Product whose Variants do not cover every combination", () => {
    expect(() => validateCatalogProductDraft({
      name: { zh: "旅行杯" },
      story: {},
      imageUrls: ["/media/cn/product-example.png"],
      groupIds: [],
      options,
      variants: [],
      published: true,
    }, "zh")).toThrow(CatalogValidationError);
  });

  it("blocks zero stock and cart quantities above available stock", () => {
    expect(canAddVariantQuantity(0, 1)).toBe(false);
    expect(canAddVariantQuantity(3, 2, 1)).toBe(true);
    expect(canAddVariantQuantity(3, 3, 1)).toBe(false);
  });
});
