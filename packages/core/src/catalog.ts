import type { LocalizedText, LocaleCode, StationFlavor } from "./index";

export interface CatalogOptionValueDraft {
  readonly key: string;
  readonly name: LocalizedText;
}

export interface CatalogOptionDraft {
  readonly key: string;
  readonly name: LocalizedText;
  readonly values: readonly CatalogOptionValueDraft[];
}

export interface CatalogVariantDraft {
  readonly key: string;
  readonly selection: Readonly<Record<string, string>>;
  readonly sellPriceMinor: number;
  readonly originalPriceMinor?: number;
  readonly stock: number;
  readonly weightGrams: number;
}

export interface CatalogProductDraft {
  readonly name: LocalizedText;
  readonly story: LocalizedText;
  readonly imageUrls: readonly string[];
  readonly groupIds: readonly string[];
  readonly options: readonly CatalogOptionDraft[];
  readonly variants: readonly CatalogVariantDraft[];
  readonly published: boolean;
}

export interface VariantCombination {
  readonly key: string;
  readonly selection: Readonly<Record<string, string>>;
  readonly label: string;
}

export interface CatalogGroupView {
  readonly id: string;
  readonly slug: string;
  readonly name: LocalizedText;
  readonly parentId?: string;
  readonly position: number;
  readonly productCount: number;
}

export interface CatalogVariantView extends CatalogVariantDraft {
  readonly id: string;
  readonly label: string;
}

export interface CatalogProductView {
  readonly id: string;
  readonly flavor: StationFlavor;
  readonly slug: string;
  readonly name: LocalizedText;
  readonly story: LocalizedText;
  readonly imageUrls: readonly string[];
  readonly groupIds: readonly string[];
  readonly options: readonly CatalogOptionDraft[];
  readonly variants: readonly CatalogVariantView[];
  readonly published: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class CatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogValidationError";
  }
}

const SAFE_KEY = /^[a-zA-Z0-9_-]{1,80}$/;

function primaryText(text: LocalizedText, primaryLocale: LocaleCode, label: string): string {
  const value = text[primaryLocale]?.trim();
  if (!value) throw new CatalogValidationError(`${label} is required in the primary language.`);
  return value;
}

function assertUnique(values: readonly string[], label: string): void {
  const normalized = values.map((value) => value.trim().toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    throw new CatalogValidationError(`${label} must be unique.`);
  }
}

export function combinationKey(selection: Readonly<Record<string, string>>, optionOrder: readonly string[]): string {
  if (optionOrder.length === 0) return "single";
  return optionOrder.map((optionKey) => `${optionKey}=${selection[optionKey] ?? ""}`).join("|");
}

export function buildVariantCombinations(
  options: readonly CatalogOptionDraft[],
  primaryLocale: LocaleCode,
): VariantCombination[] {
  if (options.length === 0) return [{ key: "single", selection: {}, label: "" }];
  if (options.length > 5) throw new CatalogValidationError("A Product can have at most five Options.");

  assertUnique(options.map((option) => primaryText(option.name, primaryLocale, "Option name")), "Option names");
  assertUnique(options.map((option) => option.key), "Option keys");

  let combinations: VariantCombination[] = [{ key: "", selection: {}, label: "" }];
  for (const option of options) {
    if (!SAFE_KEY.test(option.key)) throw new CatalogValidationError("Option keys contain unsupported characters.");
    if (option.values.length === 0) throw new CatalogValidationError("Every Option needs at least one value.");
    if (option.values.length > 50) throw new CatalogValidationError("An Option can have at most 50 values.");

    const names = option.values.map((value) => primaryText(value.name, primaryLocale, "Option value"));
    assertUnique(names, "Option values");
    assertUnique(option.values.map((value) => value.key), "Option value keys");

    combinations = combinations.flatMap((current) => option.values.map((value) => {
      if (!SAFE_KEY.test(value.key)) throw new CatalogValidationError("Option value keys contain unsupported characters.");
      const selection = { ...current.selection, [option.key]: value.key };
      const valueName = primaryText(value.name, primaryLocale, "Option value");
      return {
        key: combinationKey(selection, options.map((entry) => entry.key)),
        selection,
        label: current.label ? `${current.label} / ${valueName}` : valueName,
      };
    }));

    if (combinations.length > 500) {
      throw new CatalogValidationError("Option values create more than 500 Variants; reduce the combinations.");
    }
  }

  return combinations;
}

export function validateCatalogProductDraft(
  draft: CatalogProductDraft,
  primaryLocale: LocaleCode,
): CatalogProductDraft {
  const name = primaryText(draft.name, primaryLocale, "Product name");
  if (name.length > 160) throw new CatalogValidationError("Product name must be 160 characters or fewer.");
  if ((draft.story[primaryLocale]?.length ?? 0) > 10_000) throw new CatalogValidationError("Product story is too long.");
  if (draft.imageUrls.length > 12) throw new CatalogValidationError("A Product can have at most 12 images.");
  if (draft.published && draft.imageUrls.length === 0) {
    throw new CatalogValidationError("A published Product needs at least one image.");
  }

  assertUnique(draft.imageUrls, "Product image URLs");
  assertUnique(draft.groupIds, "Product Group assignments");
  const combinations = buildVariantCombinations(draft.options, primaryLocale);
  const expectedKeys = combinations.map((combination) => combination.key).sort();
  const actualKeys = draft.variants.map((variant) => variant.key).sort();

  if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
    throw new CatalogValidationError("Variants must cover every Option combination exactly once.");
  }

  assertUnique(draft.variants.map((variant) => variant.key), "Variant combination keys");
  for (const variant of draft.variants) {
    if (!Number.isSafeInteger(variant.sellPriceMinor) || variant.sellPriceMinor < 0) {
      throw new CatalogValidationError("Sell Price must be a non-negative amount in minor currency units.");
    }
    if (
      variant.originalPriceMinor !== undefined
      && (!Number.isSafeInteger(variant.originalPriceMinor) || variant.originalPriceMinor <= variant.sellPriceMinor)
    ) {
      throw new CatalogValidationError("Original price must be greater than Sell Price when present.");
    }
    if (!Number.isSafeInteger(variant.stock) || variant.stock < 0) {
      throw new CatalogValidationError("Variant stock must be a non-negative integer.");
    }
    if (!Number.isSafeInteger(variant.weightGrams) || variant.weightGrams <= 0) {
      throw new CatalogValidationError("Every physical Variant needs a positive weight in grams.");
    }
  }

  return draft;
}

export function canAddVariantQuantity(stock: number, requestedQuantity: number, currentCartQuantity = 0): boolean {
  return Number.isSafeInteger(requestedQuantity)
    && requestedQuantity > 0
    && stock > 0
    && currentCartQuantity + requestedQuantity <= stock;
}
