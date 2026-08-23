import { createHash, randomUUID } from "node:crypto";
import {
  buildVariantCombinations,
  canAddVariantQuantity,
  pickLocalizedText,
  validateCatalogProductDraft,
} from "@ocs/core";
import type {
  CatalogGroupView,
  CatalogProductDraft,
  CatalogProductView,
  CatalogVariantView,
  CartLineView,
  CartView,
  LocalizedText,
  LocaleCode,
  StationFlavor,
} from "@ocs/core";
import { getPrismaClient } from "./client";
import { Prisma } from "./generated/prisma/client";

const productInclude = {
  images: { orderBy: { position: "asc" as const } },
  groups: true,
  options: {
    orderBy: { position: "asc" as const },
    include: { values: { orderBy: { position: "asc" as const } } },
  },
  variants: {
    orderBy: { combinationKey: "asc" as const },
    include: { selections: true },
  },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export interface CatalogGroupDraft {
  readonly name: LocalizedText;
  readonly parentId?: string;
  readonly position?: number;
}

export class CatalogDataError extends Error {
  constructor(
    readonly code: "not-found" | "invalid-group" | "unavailable" | "out-of-stock",
    message: string,
  ) {
    super(message);
    this.name = "CatalogDataError";
  }
}

function localized(zh: string | null, en: string | null): LocalizedText {
  return { zh: zh ?? undefined, en: en ?? undefined };
}

function primaryLocale(flavor: StationFlavor): LocaleCode {
  return flavor === "cn" ? "zh" : "en";
}

function slugBase(name: string, fallback: string): string {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || fallback;
}

function uniqueSlug(name: string, fallback: string): string {
  return `${slugBase(name, fallback)}-${randomUUID().slice(0, 8)}`;
}

function toProductView(record: ProductRecord): CatalogProductView {
  const options = record.options.map((option) => ({
    key: option.key,
    name: localized(option.nameZh, option.nameEn),
    values: option.values.map((value) => ({
      key: value.key,
      name: localized(value.nameZh, value.nameEn),
    })),
  }));
  const locale = primaryLocale(record.flavor as StationFlavor);
  const combinations = buildVariantCombinations(options, locale);
  const combinationLabels = new Map(combinations.map((combination) => [combination.key, combination.label]));
  const combinationPositions = new Map(combinations.map((combination, position) => [combination.key, position]));
  const optionById = new Map(record.options.map((option) => [option.id, option]));
  const valueById = new Map(record.options.flatMap((option) => option.values.map((value) => [value.id, value] as const)));
  const variants: CatalogVariantView[] = record.variants.map((variant) => {
    const selection = Object.fromEntries(variant.selections.map((entry) => {
      const option = optionById.get(entry.optionId);
      const value = valueById.get(entry.valueId);
      if (!option || !value) throw new Error("Variant selection references missing Option data.");
      return [option.key, value.key];
    }));
    return {
      id: variant.id,
      key: variant.combinationKey,
      selection,
      label: combinationLabels.get(variant.combinationKey) ?? "",
      sellPriceMinor: variant.sellPriceMinor,
      originalPriceMinor: variant.originalPriceMinor ?? undefined,
      stock: variant.stock,
      weightGrams: variant.weightGrams,
    };
  }).sort((left, right) => (combinationPositions.get(left.key) ?? 0) - (combinationPositions.get(right.key) ?? 0));

  return {
    id: record.id,
    flavor: record.flavor as StationFlavor,
    slug: record.slug,
    name: localized(record.nameZh, record.nameEn),
    story: localized(record.storyZh, record.storyEn),
    imageUrls: record.images.map((image) => image.url),
    groupIds: record.groups.map((group) => group.groupId),
    options,
    variants,
    published: record.published,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listCatalogGroups(flavor: StationFlavor): Promise<CatalogGroupView[]> {
  const groups = await getPrismaClient().catalogGroup.findMany({
    where: { flavor },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return groups.map((group) => ({
    id: group.id,
    slug: group.slug,
    name: localized(group.nameZh, group.nameEn),
    parentId: group.parentId ?? undefined,
    position: group.position,
    productCount: group._count.products,
  }));
}

export async function saveCatalogGroup(
  flavor: StationFlavor,
  draft: CatalogGroupDraft,
  id?: string,
): Promise<CatalogGroupView> {
  const locale = primaryLocale(flavor);
  const name = draft.name[locale]?.trim();
  if (!name || name.length > 160) throw new CatalogDataError("invalid-group", "Group name is required in the primary language.");
  if (!Number.isSafeInteger(draft.position ?? 0) || (draft.position ?? 0) < 0) {
    throw new CatalogDataError("invalid-group", "Group position must be a non-negative integer.");
  }
  if (id && draft.parentId === id) throw new CatalogDataError("invalid-group", "A Group cannot be its own parent.");

  const database = getPrismaClient();
  if (id) {
    const current = await database.catalogGroup.findFirst({ where: { id, flavor } });
    if (!current) throw new CatalogDataError("not-found", "Group not found.");
  }
  if (draft.parentId) {
    const parent = await database.catalogGroup.findFirst({ where: { id: draft.parentId, flavor } });
    if (!parent) throw new CatalogDataError("invalid-group", "Parent Group does not belong to this Station.");

    const visited = new Set<string>();
    let ancestorId: string | null = parent.id;
    while (ancestorId) {
      if (ancestorId === id) throw new CatalogDataError("invalid-group", "A Group parent cycle is not allowed.");
      if (visited.has(ancestorId)) throw new CatalogDataError("invalid-group", "The selected Group hierarchy already contains a cycle.");
      visited.add(ancestorId);
      const ancestor: { parentId: string | null } | null = await database.catalogGroup.findFirst({
        where: { id: ancestorId, flavor },
        select: { parentId: true },
      });
      ancestorId = ancestor?.parentId ?? null;
    }
  }

  const data = {
    nameZh: draft.name.zh?.trim() || null,
    nameEn: draft.name.en?.trim() || null,
    parentId: draft.parentId || null,
    position: draft.position ?? 0,
  };
  const group = id
    ? await database.catalogGroup.update({ where: { id }, data, include: { _count: { select: { products: true } } } })
    : await database.catalogGroup.create({
        data: { flavor, slug: uniqueSlug(name, "group"), ...data },
        include: { _count: { select: { products: true } } },
      });

  return {
    id: group.id,
    slug: group.slug,
    name: localized(group.nameZh, group.nameEn),
    parentId: group.parentId ?? undefined,
    position: group.position,
    productCount: group._count.products,
  };
}

export async function deleteCatalogGroup(flavor: StationFlavor, id: string): Promise<void> {
  const result = await getPrismaClient().catalogGroup.deleteMany({ where: { id, flavor } });
  if (result.count !== 1) throw new CatalogDataError("not-found", "Group not found.");
}

export async function listPortalProducts(flavor: StationFlavor): Promise<CatalogProductView[]> {
  const products = await getPrismaClient().product.findMany({
    where: { flavor, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: productInclude,
  });
  return products.map(toProductView);
}

export async function readPortalProduct(flavor: StationFlavor, id: string): Promise<CatalogProductView | null> {
  const product = await getPrismaClient().product.findFirst({
    where: { id, flavor, deletedAt: null },
    include: productInclude,
  });
  return product ? toProductView(product) : null;
}

export async function listPublishedProducts(
  flavor: StationFlavor,
  filter: { readonly groupSlug?: string; readonly query?: string } = {},
): Promise<CatalogProductView[]> {
  const query = filter.query?.trim();
  const products = await getPrismaClient().product.findMany({
    where: {
      flavor,
      published: true,
      deletedAt: null,
      groups: filter.groupSlug ? { some: { group: { slug: filter.groupSlug, flavor } } } : undefined,
      OR: query ? [
        { nameZh: { contains: query, mode: "insensitive" } },
        { nameEn: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ] : undefined,
    },
    orderBy: { createdAt: "desc" },
    include: productInclude,
  });
  return products.map(toProductView);
}

export async function readPublishedProduct(flavor: StationFlavor, slug: string): Promise<CatalogProductView | null> {
  const product = await getPrismaClient().product.findFirst({
    where: { flavor, slug, published: true, deletedAt: null },
    include: productInclude,
  });
  return product ? toProductView(product) : null;
}

export async function saveCatalogProduct(
  flavor: StationFlavor,
  draft: CatalogProductDraft,
  id?: string,
): Promise<CatalogProductView> {
  const locale = primaryLocale(flavor);
  validateCatalogProductDraft(draft, locale);
  const database = getPrismaClient();

  const productId = await database.$transaction(async (transaction) => {
    if (draft.groupIds.length > 0) {
      const groupCount = await transaction.catalogGroup.count({ where: { id: { in: [...draft.groupIds] }, flavor } });
      if (groupCount !== draft.groupIds.length) {
        throw new CatalogDataError("invalid-group", "A selected Group does not belong to this Station.");
      }
    }

    const existing = id ? await transaction.product.findFirst({ where: { id, flavor, deletedAt: null } }) : null;
    if (id && !existing) throw new CatalogDataError("not-found", "Product not found.");
    const productData = {
      nameZh: draft.name.zh?.trim() || null,
      nameEn: draft.name.en?.trim() || null,
      storyZh: draft.story.zh?.trim() || null,
      storyEn: draft.story.en?.trim() || null,
      published: draft.published,
    };
    const product = existing
      ? await transaction.product.update({ where: { id: existing.id }, data: productData })
      : await transaction.product.create({
          data: {
            flavor,
            slug: uniqueSlug(pickLocalizedText(draft.name, locale, locale), "product"),
            ...productData,
          },
        });

    const existingVariants = await transaction.productVariant.findMany({
      where: { productId: product.id },
      select: { id: true, combinationKey: true },
    });
    const variantIdsByKey = new Map(existingVariants.map((variant) => [variant.combinationKey, variant.id]));
    await transaction.variantSelection.deleteMany({ where: { variant: { productId: product.id } } });
    await transaction.productOption.deleteMany({ where: { productId: product.id } });
    await transaction.productImage.deleteMany({ where: { productId: product.id } });
    await transaction.productGroupAssignment.deleteMany({ where: { productId: product.id } });

    if (draft.imageUrls.length > 0) {
      await transaction.productImage.createMany({
        data: draft.imageUrls.map((url, position) => ({ productId: product.id, url, position })),
      });
    }
    if (draft.groupIds.length > 0) {
      await transaction.productGroupAssignment.createMany({
        data: draft.groupIds.map((groupId) => ({ productId: product.id, groupId })),
      });
    }

    const optionIds = new Map<string, string>();
    const valueIds = new Map<string, string>();
    for (const [position, option] of draft.options.entries()) {
      const optionId = randomUUID();
      optionIds.set(option.key, optionId);
      await transaction.productOption.create({
        data: {
          id: optionId,
          productId: product.id,
          key: option.key,
          nameZh: option.name.zh?.trim() || null,
          nameEn: option.name.en?.trim() || null,
          position,
        },
      });
      await transaction.productOptionValue.createMany({
        data: option.values.map((value, valuePosition) => {
          const valueId = randomUUID();
          valueIds.set(`${option.key}:${value.key}`, valueId);
          return {
            id: valueId,
            optionId,
            key: value.key,
            nameZh: value.name.zh?.trim() || null,
            nameEn: value.name.en?.trim() || null,
            position: valuePosition,
          };
        }),
      });
    }

    const nextVariantKeys = draft.variants.map((variant) => variant.key);
    await transaction.productVariant.deleteMany({
      where: { productId: product.id, combinationKey: { notIn: nextVariantKeys } },
    });
    for (const variant of draft.variants) {
      const existingVariantId = variantIdsByKey.get(variant.key);
      const variantData = {
        sellPriceMinor: variant.sellPriceMinor,
        originalPriceMinor: variant.originalPriceMinor ?? null,
        stock: variant.stock,
        weightGrams: variant.weightGrams,
      };
      const variantId = existingVariantId ?? randomUUID();
      if (existingVariantId) {
        await transaction.productVariant.update({ where: { id: existingVariantId }, data: variantData });
      } else {
        await transaction.productVariant.create({
          data: {
            id: variantId,
            productId: product.id,
            combinationKey: variant.key,
            ...variantData,
          },
        });
      }
      const selections = Object.entries(variant.selection).map(([optionKey, valueKey]) => ({
        variantId,
        optionId: optionIds.get(optionKey)!,
        valueId: valueIds.get(`${optionKey}:${valueKey}`)!,
      }));
      if (selections.length > 0) await transaction.variantSelection.createMany({ data: selections });
    }

    return product.id;
  });
  const saved = await database.product.findUniqueOrThrow({ where: { id: productId }, include: productInclude });
  return toProductView(saved);
}

export async function deleteCatalogProduct(flavor: StationFlavor, id: string): Promise<void> {
  const result = await getPrismaClient().product.updateMany({
    where: { id, flavor, deletedAt: null },
    data: { published: false, deletedAt: new Date() },
  });
  if (result.count !== 1) throw new CatalogDataError("not-found", "Product not found.");
}

function cartTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function serializable<T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getPrismaClient().$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 2) throw error;
    }
  }
  throw new Error("Serializable transaction retry exhausted.");
}

export async function addVariantToCart(
  flavor: StationFlavor,
  cartToken: string,
  variantId: string,
  quantity: number,
): Promise<{ readonly quantity: number; readonly lineCount: number }> {
  return serializable(async (transaction) => {
    const variant = await transaction.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant || variant.product.flavor !== flavor || !variant.product.published || variant.product.deletedAt) {
      throw new CatalogDataError("unavailable", "Variant is not available on this Storefront.");
    }

    const tokenHash = cartTokenHash(cartToken);
    const existingCart = await transaction.cart.findUnique({ where: { tokenHash } });
    if (existingCart && existingCart.flavor !== flavor) {
      throw new CatalogDataError("unavailable", "Cart belongs to another Station flavor.");
    }
    const cart = existingCart ?? await transaction.cart.create({ data: { flavor, tokenHash } });
    const line = await transaction.cartLine.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });
    const currentQuantity = line?.quantity ?? 0;
    if (!canAddVariantQuantity(variant.stock, quantity, currentQuantity)) {
      throw new CatalogDataError("out-of-stock", "Requested quantity exceeds available stock.");
    }

    const saved = await transaction.cartLine.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity },
      update: { quantity: { increment: quantity } },
    });
    const lineCount = await transaction.cartLine.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });
    return { quantity: saved.quantity, lineCount: lineCount._sum.quantity ?? 0 };
  });
}

export async function readCart(flavor: StationFlavor, cartToken: string): Promise<CartView> {
  const cart = await getPrismaClient().cart.findUnique({
    where: { tokenHash: cartTokenHash(cartToken) },
    include: {
      lines: {
        orderBy: { createdAt: "asc" },
        include: {
          variant: {
            include: {
              product: { include: { images: { orderBy: { position: "asc" } } } },
              selections: { include: { option: true, value: true } },
            },
          },
        },
      },
    },
  });
  if (!cart || cart.flavor !== flavor) return { lines: [], quantity: 0, subtotalMinor: 0, hasInvalidLines: false };

  const locale = primaryLocale(flavor);
  const lines: CartLineView[] = cart.lines.map((line) => {
    const product = line.variant.product;
    const available = product.flavor === flavor
      && product.published
      && !product.deletedAt
      && line.variant.stock > 0
      && line.quantity <= line.variant.stock;
    const variantLabel = [...line.variant.selections]
      .sort((left, right) => left.option.position - right.option.position)
      .map((selection) => localized(selection.value.nameZh, selection.value.nameEn)[locale] ?? "")
      .filter(Boolean)
      .join(" / ");
    return {
      variantId: line.variantId,
      productId: product.id,
      productSlug: product.slug,
      productName: localized(product.nameZh, product.nameEn),
      variantLabel,
      imageUrl: product.images[0]?.url,
      sellPriceMinor: line.variant.sellPriceMinor,
      stock: line.variant.stock,
      weightGrams: line.variant.weightGrams,
      quantity: line.quantity,
      available,
    };
  });
  return {
    lines,
    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalMinor: lines.reduce((sum, line) => sum + line.sellPriceMinor * line.quantity, 0),
    hasInvalidLines: lines.some((line) => !line.available),
  };
}

export async function setCartLineQuantity(
  flavor: StationFlavor,
  cartToken: string,
  variantId: string,
  quantity: number,
): Promise<void> {
  await serializable(async (transaction) => {
    const cart = await transaction.cart.findUnique({ where: { tokenHash: cartTokenHash(cartToken) } });
    if (!cart || cart.flavor !== flavor) throw new CatalogDataError("not-found", "Cart not found.");
    const line = await transaction.cartLine.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      include: { variant: { include: { product: true } } },
    });
    if (!line) throw new CatalogDataError("not-found", "Cart line not found.");
    if (quantity === 0) {
      await transaction.cartLine.delete({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
    } else {
      const product = line.variant.product;
      if (!Number.isSafeInteger(quantity) || quantity < 0
        || product.flavor !== flavor || !product.published || product.deletedAt) {
        throw new CatalogDataError("unavailable", "Variant is not available on this Storefront.");
      }
      if (line.variant.stock === 0 || quantity > line.variant.stock) {
        throw new CatalogDataError("out-of-stock", "Requested quantity exceeds available stock.");
      }
      await transaction.cartLine.update({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        data: { quantity },
      });
    }
    await transaction.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  });
}

export async function clearCart(flavor: StationFlavor, cartToken: string): Promise<void> {
  const cart = await getPrismaClient().cart.findUnique({ where: { tokenHash: cartTokenHash(cartToken) } });
  if (!cart || cart.flavor !== flavor) return;
  await getPrismaClient().cartLine.deleteMany({ where: { cartId: cart.id } });
}
