import type { DiscountKind, PolicySlug, StationFlavor } from "@ocs/core";
import {
  CheckoutDataError,
  saveDiscountCode,
  saveShippingRate,
  writePolicy,
} from "@ocs/data";
import type { DiscountCodeDraft, ShippingRateDraft } from "@ocs/data";
import { z } from "zod";

const idField = z.string().min(1).optional();
const discountFields = z.object({
  id: idField,
  code: z.string().trim().min(1).max(64),
  kind: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().positive().max(1_000_000),
  enabled: z.boolean(),
});
const shippingFields = z.object({
  id: idField,
  name: z.string().trim().min(1).max(160),
  countries: z.string().max(1000),
  regions: z.string().max(5000),
  minWeightGrams: z.coerce.number().int().nonnegative(),
  maxWeightGrams: z.union([z.literal(""), z.coerce.number().int().nonnegative()]),
  price: z.coerce.number().nonnegative().max(1_000_000),
  freeOver: z.union([z.literal(""), z.coerce.number().positive().max(1_000_000)]),
  position: z.coerce.number().int().nonnegative(),
  enabled: z.boolean(),
});
const policyFields = z.object({
  slug: z.enum(["privacy", "terms", "returns", "shipping"]),
  body: z.string().max(100_000),
});

export class CommerceSettingsFormError extends Error {
  constructor(readonly code: "invalid-fields" | "not-found", message: string) {
    super(message);
    this.name = "CommerceSettingsFormError";
  }
}

export interface ParsedDiscountForm { readonly id?: string; readonly draft: DiscountCodeDraft; }
export interface ParsedShippingForm { readonly id?: string; readonly draft: ShippingRateDraft; }

function optionalId(formData: FormData): string | undefined {
  const value = formData.get("id");
  return typeof value === "string" && value ? value : undefined;
}

function values(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function amountMinor(value: number): number {
  return Math.round(value * 100);
}

function translateDataError(error: unknown): never {
  if (error instanceof CheckoutDataError) {
    throw new CommerceSettingsFormError(error.code === "not-found" ? "not-found" : "invalid-fields", error.message);
  }
  throw error;
}

export function parseDiscountForm(formData: FormData): ParsedDiscountForm {
  const result = discountFields.safeParse({
    id: optionalId(formData),
    code: formData.get("code"),
    kind: formData.get("kind"),
    value: formData.get("value"),
    enabled: formData.get("enabled") === "on",
  });
  if (!result.success) throw new CommerceSettingsFormError("invalid-fields", "Discount Code fields are invalid.");
  const kind: DiscountKind = result.data.kind;
  return { id: result.data.id, draft: {
    code: result.data.code,
    kind,
    percentageBps: kind === "percentage" ? Math.round(result.data.value * 100) : undefined,
    amountMinor: kind === "fixed" ? amountMinor(result.data.value) : undefined,
    enabled: result.data.enabled,
  } };
}

export async function updateDiscountFromForm(flavor: StationFlavor, formData: FormData): Promise<void> {
  const parsed = parseDiscountForm(formData);
  try {
    await saveDiscountCode(flavor, parsed.draft, parsed.id);
  } catch (error) { translateDataError(error); }
}

export function parseShippingForm(flavor: StationFlavor, formData: FormData): ParsedShippingForm {
  const result = shippingFields.safeParse({
    id: optionalId(formData),
    name: formData.get("name"),
    countries: formData.get("countries") ?? "",
    regions: formData.get("regions") ?? "",
    minWeightGrams: formData.get("minWeightGrams") ?? 0,
    maxWeightGrams: formData.get("maxWeightGrams") ?? "",
    price: formData.get("price"),
    freeOver: formData.get("freeOver") ?? "",
    position: formData.get("position") ?? 0,
    enabled: formData.get("enabled") === "on",
  });
  if (!result.success) throw new CommerceSettingsFormError("invalid-fields", "Shipping Rate fields are invalid.");
  const locale = flavor === "cn" ? "zh" : "en";
  return { id: result.data.id, draft: {
    name: { [locale]: result.data.name },
    enabled: result.data.enabled,
    countryCodes: values(result.data.countries),
    regions: values(result.data.regions),
    minWeightGrams: result.data.minWeightGrams,
    maxWeightGrams: result.data.maxWeightGrams === "" ? undefined : result.data.maxWeightGrams,
    priceMinor: amountMinor(result.data.price),
    freeOverMinor: result.data.freeOver === "" ? undefined : amountMinor(result.data.freeOver),
    position: result.data.position,
  } };
}

export async function updateShippingRateFromForm(flavor: StationFlavor, formData: FormData): Promise<void> {
  const parsed = parseShippingForm(flavor, formData);
  try {
    await saveShippingRate(flavor, parsed.draft, parsed.id);
  } catch (error) { translateDataError(error); }
}

export async function updatePolicyFromForm(flavor: StationFlavor, formData: FormData): Promise<void> {
  const result = policyFields.safeParse({ slug: formData.get("slug"), body: formData.get("body") ?? "" });
  if (!result.success) throw new CommerceSettingsFormError("invalid-fields", "Policy content is invalid.");
  const body = flavor === "cn" ? { zh: result.data.body } : { en: result.data.body };
  await writePolicy(flavor, result.data.slug as PolicySlug, body);
}
