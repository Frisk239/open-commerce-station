import type { CatalogProductDraft, CatalogProductView, StationFlavor } from "@ocs/core";
import { CatalogValidationError } from "@ocs/core";
import {
  CatalogDataError,
  readPortalProduct,
  saveCatalogGroup,
  saveCatalogProduct,
} from "@ocs/data";
import { getImageStore, MediaValidationError } from "@ocs/media";
import { z } from "zod";

const localizedText = z.object({
  zh: z.string().max(10_000).optional(),
  en: z.string().max(10_000).optional(),
});

const catalogDraft = z.object({
  name: localizedText,
  story: localizedText,
  imageUrls: z.array(z.string().max(512)).max(12),
  groupIds: z.array(z.string().min(1)).max(100),
  options: z.array(z.object({
    key: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    name: localizedText,
    values: z.array(z.object({
      key: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
      name: localizedText,
    })).min(1).max(50),
  })).max(5),
  variants: z.array(z.object({
    key: z.string().min(1).max(512),
    selection: z.record(z.string(), z.string()),
    sellPriceMinor: z.number().int().nonnegative(),
    originalPriceMinor: z.number().int().positive().optional(),
    stock: z.number().int().nonnegative(),
    weightGrams: z.number().int().positive(),
  })).min(1).max(500),
  published: z.boolean(),
});

const groupDraft = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(160),
  parentId: z.string().optional(),
  position: z.coerce.number().int().nonnegative(),
});

export type CatalogFormErrorCode = "invalid-fields" | "invalid-image" | "not-found";

export interface CatalogFormState {
  readonly error?: CatalogFormErrorCode;
}

export class CatalogFormError extends Error {
  constructor(readonly code: CatalogFormErrorCode, message: string) {
    super(message);
    this.name = "CatalogFormError";
  }
}

function productUploadFiles(formData: FormData): File[] {
  return formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export function parseCatalogDraft(value: FormDataEntryValue | null): CatalogProductDraft {
  if (typeof value !== "string") throw new CatalogFormError("invalid-fields", "Product draft is missing.");

  try {
    return catalogDraft.parse(JSON.parse(value));
  } catch {
    throw new CatalogFormError("invalid-fields", "Product fields are incomplete or invalid.");
  }
}

export async function updateCatalogProductFromForm(
  flavor: StationFlavor,
  formData: FormData,
): Promise<CatalogProductView> {
  const idValue = formData.get("productId");
  const id = typeof idValue === "string" && idValue ? idValue : undefined;
  const draft = parseCatalogDraft(formData.get("draft"));
  const current = id ? await readPortalProduct(flavor, id) : null;
  if (id && !current) throw new CatalogFormError("not-found", "Product not found.");

  const existingUrls = new Set(current?.imageUrls ?? []);
  if (draft.imageUrls.some((url) => !existingUrls.has(url))) {
    throw new CatalogFormError("invalid-fields", "Product images must come from the current Product or a new upload.");
  }

  const imageStore = getImageStore();
  const staged: string[] = [];
  try {
    for (const upload of productUploadFiles(formData)) {
      staged.push(await imageStore.save(flavor, "product", upload));
    }

    const saved = await saveCatalogProduct(flavor, {
      ...draft,
      imageUrls: [...draft.imageUrls, ...staged],
    }, id);
    const retained = new Set(saved.imageUrls);
    const replaced = [...existingUrls].filter((url) => !retained.has(url));
    await Promise.allSettled(replaced.map((url) => imageStore.remove(url)));
    return saved;
  } catch (error) {
    await Promise.allSettled(staged.map((url) => imageStore.remove(url)));
    if (error instanceof MediaValidationError) throw new CatalogFormError("invalid-image", error.message);
    if (error instanceof CatalogValidationError) throw new CatalogFormError("invalid-fields", error.message);
    if (error instanceof CatalogDataError && error.code === "not-found") {
      throw new CatalogFormError("not-found", error.message);
    }
    if (error instanceof CatalogDataError) throw new CatalogFormError("invalid-fields", error.message);
    throw error;
  }
}

export async function updateCatalogGroupFromForm(flavor: StationFlavor, formData: FormData): Promise<void> {
  const result = groupDraft.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    parentId: formData.get("parentId") || undefined,
    position: formData.get("position") ?? 0,
  });
  if (!result.success) throw new CatalogFormError("invalid-fields", "Group fields are invalid.");

  const locale = flavor === "cn" ? "zh" : "en";
  try {
    await saveCatalogGroup(flavor, {
      name: { [locale]: result.data.name },
      parentId: result.data.parentId,
      position: result.data.position,
    }, result.data.id);
  } catch (error) {
    if (error instanceof CatalogDataError && error.code === "not-found") {
      throw new CatalogFormError("not-found", error.message);
    }
    if (error instanceof CatalogDataError) throw new CatalogFormError("invalid-fields", error.message);
    throw error;
  }
}
