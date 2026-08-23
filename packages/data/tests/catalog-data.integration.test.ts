import type { CatalogProductDraft } from "@ocs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addVariantToCart,
  deleteCatalogGroup,
  deleteCatalogProduct,
  getPrismaClient,
  listCatalogGroups,
  listPublishedProducts,
  readPublishedProduct,
  saveCatalogGroup,
  saveCatalogProduct,
} from "../src/index";

const runDatabaseTests = process.env.OCS_RUN_DB_TESTS === "1";

function singleVariantDraft(
  name: string,
  input: { readonly published?: boolean; readonly stock?: number; readonly groupIds?: readonly string[] } = {},
): CatalogProductDraft {
  return {
    name: { zh: name },
    story: { zh: `${name} 的商品故事` },
    imageUrls: [`/media/cn/product-${name}.webp`],
    groupIds: input.groupIds ?? [],
    options: [],
    variants: [{
      key: "single",
      selection: {},
      sellPriceMinor: 12_900,
      originalPriceMinor: 15_900,
      stock: input.stock ?? 3,
      weightGrams: 480,
    }],
    published: input.published ?? true,
  };
}

describe.skipIf(!runDatabaseTests)("PostgreSQL catalog interface", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("open_commerce_station_test")) {
      throw new Error("Database integration tests require a dedicated open_commerce_station_test database.");
    }

    const database = getPrismaClient();
    await database.cart.deleteMany();
    await database.product.deleteMany();
    await database.catalogGroup.deleteMany();
  });

  afterAll(async () => {
    const database = getPrismaClient();
    await database.cart.deleteMany();
    await database.product.deleteMany();
    await database.catalogGroup.deleteMany();
    await database.$disconnect();
  });

  it("persists nested Groups while preventing parent cycles", async () => {
    const parent = await saveCatalogGroup("cn", { name: { zh: "生活方式" }, position: 0 });
    const child = await saveCatalogGroup("cn", { name: { zh: "日用器物" }, parentId: parent.id, position: 1 });
    const grandchild = await saveCatalogGroup("cn", { name: { zh: "杯具" }, parentId: child.id, position: 2 });

    await expect(saveCatalogGroup("cn", { name: parent.name, parentId: grandchild.id }, parent.id))
      .rejects.toMatchObject({ code: "invalid-group" });
    await expect(saveCatalogGroup("global", { name: { en: "Wrong station" }, parentId: parent.id }))
      .rejects.toMatchObject({ code: "invalid-group" });
    await expect(listCatalogGroups("cn")).resolves.toHaveLength(3);
  });

  it("publishes complete Option combinations and keeps drafts private", async () => {
    const group = (await listCatalogGroups("cn"))[0]!;
    const publishedDraft: CatalogProductDraft = {
      name: { zh: "旅行杯" },
      story: { zh: "适合每天携带的旅行杯。" },
      imageUrls: ["/media/cn/product-travel-cup.webp", "/media/cn/product-travel-cup-detail.webp"],
      groupIds: [group.id],
      options: [{
        key: "size",
        name: { zh: "容量" },
        values: [
          { key: "small", name: { zh: "小杯" } },
          { key: "large", name: { zh: "大杯" } },
        ],
      }],
      variants: [
        { key: "size=small", selection: { size: "small" }, sellPriceMinor: 9_900, stock: 5, weightGrams: 360 },
        { key: "size=large", selection: { size: "large" }, sellPriceMinor: 12_900, stock: 2, weightGrams: 480 },
      ],
      published: true,
    };
    const product = await saveCatalogProduct("cn", publishedDraft);
    await saveCatalogProduct("cn", singleVariantDraft("内部草稿", { published: false }));

    await expect(listPublishedProducts("cn")).resolves.toHaveLength(1);
    await expect(listPublishedProducts("cn", { groupSlug: group.slug })).resolves.toHaveLength(1);
    await expect(listPublishedProducts("cn", { query: "旅行" })).resolves.toHaveLength(1);
    await expect(readPublishedProduct("global", product.slug)).resolves.toBeNull();
    expect(product.variants.map((variant) => variant.label)).toEqual(["小杯", "大杯"]);

    await saveCatalogProduct("cn", { ...publishedDraft, published: false }, product.id);
    await expect(readPublishedProduct("cn", product.slug)).resolves.toBeNull();
    const republished = await saveCatalogProduct("cn", publishedDraft, product.id);
    await expect(readPublishedProduct("cn", product.slug)).resolves.toMatchObject({ id: product.id, published: true });

    const stableVariantId = republished.variants[0]!.id;
    await addVariantToCart("cn", "preserved-cart-token", stableVariantId, 1);
    const repriced = await saveCatalogProduct("cn", {
      ...publishedDraft,
      variants: publishedDraft.variants.map((variant) => variant.key === "size=small" ? { ...variant, sellPriceMinor: 8_900 } : variant),
    }, product.id);
    expect(repriced.variants[0]).toMatchObject({ id: stableVariantId, sellPriceMinor: 8_900 });
    await expect(getPrismaClient().cartLine.count({ where: { variantId: stableVariantId } })).resolves.toBe(1);
  });

  it("deletes Group structure without deleting assigned Products", async () => {
    const groups = await listCatalogGroups("cn");
    const parent = groups.find((group) => group.name.zh === "生活方式")!;
    const child = groups.find((group) => group.name.zh === "日用器物")!;
    const grandchild = groups.find((group) => group.name.zh === "杯具")!;
    const product = (await listPublishedProducts("cn"))[0]!;
    await saveCatalogProduct("cn", { ...singleVariantDraft("分组独立商品"), groupIds: [grandchild.id] });

    await deleteCatalogGroup("cn", parent.id);
    expect((await listCatalogGroups("cn")).find((group) => group.id === child.id)?.parentId).toBeUndefined();
    await deleteCatalogGroup("cn", grandchild.id);

    await expect(readPublishedProduct("cn", product.slug)).resolves.toMatchObject({ id: product.id });
    await expect(listPublishedProducts("cn", { query: "分组独立" })).resolves.toHaveLength(1);
  });

  it("revalidates stock and Station flavor when adding a Variant to Cart", async () => {
    const unavailable = await saveCatalogProduct("cn", singleVariantDraft("售罄商品", { stock: 0 }));
    const available = await saveCatalogProduct("cn", singleVariantDraft("限量商品", { stock: 2 }));
    const unavailableVariantId = unavailable.variants[0]!.id;
    const availableVariantId = available.variants[0]!.id;

    await expect(addVariantToCart("cn", "zero-stock-token", unavailableVariantId, 1))
      .rejects.toMatchObject({ code: "out-of-stock" });
    await expect(addVariantToCart("global", "wrong-flavor-token", availableVariantId, 1))
      .rejects.toMatchObject({ code: "unavailable" });
    await expect(addVariantToCart("cn", "limited-token", availableVariantId, 1))
      .resolves.toEqual({ quantity: 1, lineCount: 1 });
    await expect(addVariantToCart("cn", "limited-token", availableVariantId, 1))
      .resolves.toEqual({ quantity: 2, lineCount: 2 });
    await expect(addVariantToCart("cn", "limited-token", availableVariantId, 1))
      .rejects.toMatchObject({ code: "out-of-stock" });
  });

  it("soft-deletes Products from both Merchant and public reads", async () => {
    const product = await saveCatalogProduct("cn", singleVariantDraft("待删除商品"));
    await deleteCatalogProduct("cn", product.id);

    await expect(readPublishedProduct("cn", product.slug)).resolves.toBeNull();
    await expect(deleteCatalogProduct("global", product.id)).rejects.toMatchObject({ code: "not-found" });
  });

  it("enforces numeric catalog constraints in PostgreSQL", async () => {
    const database = getPrismaClient();
    const product = await database.product.create({
      data: { flavor: "cn", slug: "constraint-probe", nameZh: "约束探针" },
    });

    await expect(database.productVariant.create({
      data: {
        id: "constraint-probe-variant",
        productId: product.id,
        combinationKey: "single",
        sellPriceMinor: 100,
        stock: -1,
        weightGrams: 100,
      },
    })).rejects.toThrow();
  });
});
