import {
  calculateCheckoutQuote,
  CheckoutValidationError,
} from "@ocs/core";
import type {
  CheckoutAddress,
  CheckoutQuote,
  CurrencyCode,
  DiscountKind,
  DiscountRuleView,
  LocalizedText,
  PolicySlug,
  ReservedPolicy,
  ShippingRateView,
  StationFlavor,
} from "@ocs/core";
import { readCart } from "./catalog";
import { getPrismaClient } from "./client";
import { Prisma } from "./generated/prisma/client";

export interface DiscountCodeDraft {
  readonly code: string;
  readonly kind: DiscountKind;
  readonly percentageBps?: number;
  readonly amountMinor?: number;
  readonly enabled: boolean;
}

export interface ShippingRateDraft {
  readonly name: LocalizedText;
  readonly enabled: boolean;
  readonly countryCodes: readonly string[];
  readonly regions: readonly string[];
  readonly minWeightGrams: number;
  readonly maxWeightGrams?: number;
  readonly priceMinor: number;
  readonly freeOverMinor?: number;
  readonly position: number;
}

export class CheckoutDataError extends Error {
  constructor(readonly code: "not-found" | "invalid-discount" | "invalid-shipping", message: string) {
    super(message);
    this.name = "CheckoutDataError";
  }
}

function localized(zh: string | null, en: string | null): LocalizedText {
  return { zh: zh ?? undefined, en: en ?? undefined };
}

function primaryLocale(flavor: StationFlavor): "zh" | "en" {
  return flavor === "cn" ? "zh" : "en";
}

function normalizedList(values: readonly string[], maximum: number): string[] {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  if (cleaned.length > maximum || new Set(cleaned.map((value) => value.toLocaleUpperCase())).size !== cleaned.length) {
    throw new CheckoutDataError("invalid-shipping", "Shipping regions must be unique and within the supported limit.");
  }
  return cleaned;
}

function toDiscount(record: { id: string; code: string; kind: string; percentageBps: number | null; amountMinor: number | null; enabled: boolean }): DiscountRuleView {
  return {
    id: record.id,
    code: record.code,
    kind: record.kind as DiscountKind,
    percentageBps: record.percentageBps ?? undefined,
    amountMinor: record.amountMinor ?? undefined,
    enabled: record.enabled,
  };
}

function toRate(record: {
  id: string;
  nameZh: string | null;
  nameEn: string | null;
  enabled: boolean;
  countryCodes: string[];
  regions: string[];
  minWeightGrams: number;
  maxWeightGrams: number | null;
  priceMinor: number;
  freeOverMinor: number | null;
  position: number;
}): ShippingRateView {
  return {
    id: record.id,
    name: localized(record.nameZh, record.nameEn),
    enabled: record.enabled,
    countryCodes: record.countryCodes,
    regions: record.regions,
    minWeightGrams: record.minWeightGrams,
    maxWeightGrams: record.maxWeightGrams ?? undefined,
    priceMinor: record.priceMinor,
    freeOverMinor: record.freeOverMinor ?? undefined,
    position: record.position,
  };
}

export async function listDiscountCodes(flavor: StationFlavor): Promise<DiscountRuleView[]> {
  return (await getPrismaClient().discountCode.findMany({ where: { flavor }, orderBy: { createdAt: "desc" } })).map(toDiscount);
}

export async function saveDiscountCode(flavor: StationFlavor, draft: DiscountCodeDraft, id?: string): Promise<DiscountRuleView> {
  const code = draft.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,64}$/.test(code)) throw new CheckoutDataError("invalid-discount", "Discount Code contains unsupported characters.");
  if (draft.kind === "percentage" && (!Number.isSafeInteger(draft.percentageBps) || !draft.percentageBps || draft.percentageBps > 10_000)) {
    throw new CheckoutDataError("invalid-discount", "Percentage discount must be between 0.01% and 100%.");
  }
  if (draft.kind === "fixed" && (!Number.isSafeInteger(draft.amountMinor) || !draft.amountMinor || draft.amountMinor <= 0)) {
    throw new CheckoutDataError("invalid-discount", "Fixed discount must be a positive amount.");
  }
  const data = {
    code,
    kind: draft.kind,
    percentageBps: draft.kind === "percentage" ? draft.percentageBps! : null,
    amountMinor: draft.kind === "fixed" ? draft.amountMinor! : null,
    enabled: draft.enabled,
  };
  const database = getPrismaClient();
  try {
    if (id) {
      const existing = await database.discountCode.findFirst({ where: { id, flavor } });
      if (!existing) throw new CheckoutDataError("not-found", "Discount Code not found.");
      return toDiscount(await database.discountCode.update({ where: { id }, data }));
    }
    return toDiscount(await database.discountCode.create({ data: { flavor, ...data } }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CheckoutDataError("invalid-discount", "This Discount Code already exists on the Station.");
    }
    throw error;
  }
}

export async function deleteDiscountCode(flavor: StationFlavor, id: string): Promise<void> {
  const result = await getPrismaClient().discountCode.deleteMany({ where: { id, flavor } });
  if (result.count !== 1) throw new CheckoutDataError("not-found", "Discount Code not found.");
}

export async function listShippingRates(flavor: StationFlavor, enabledOnly = false): Promise<ShippingRateView[]> {
  return (await getPrismaClient().shippingRate.findMany({
    where: { flavor, enabled: enabledOnly ? true : undefined },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  })).map(toRate);
}

export async function saveShippingRate(flavor: StationFlavor, draft: ShippingRateDraft, id?: string): Promise<ShippingRateView> {
  const locale = primaryLocale(flavor);
  const name = draft.name[locale]?.trim();
  if (!name || name.length > 160) throw new CheckoutDataError("invalid-shipping", "Shipping Rate name is required in the primary language.");
  if (!Number.isSafeInteger(draft.minWeightGrams) || draft.minWeightGrams < 0
    || (draft.maxWeightGrams !== undefined && (!Number.isSafeInteger(draft.maxWeightGrams) || draft.maxWeightGrams < draft.minWeightGrams))
    || !Number.isSafeInteger(draft.priceMinor) || draft.priceMinor < 0
    || (draft.freeOverMinor !== undefined && (!Number.isSafeInteger(draft.freeOverMinor) || draft.freeOverMinor <= 0))
    || !Number.isSafeInteger(draft.position) || draft.position < 0) {
    throw new CheckoutDataError("invalid-shipping", "Shipping Rate amounts, weights, or position are invalid.");
  }
  const countries = normalizedList(draft.countryCodes, 250).map((code) => code.toUpperCase());
  if (countries.some((code) => !/^[A-Z]{2}$/.test(code))) throw new CheckoutDataError("invalid-shipping", "Countries must use two-letter codes.");
  const data = {
    nameZh: draft.name.zh?.trim() || null,
    nameEn: draft.name.en?.trim() || null,
    enabled: draft.enabled,
    countryCodes: countries,
    regions: normalizedList(draft.regions, 500),
    minWeightGrams: draft.minWeightGrams,
    maxWeightGrams: draft.maxWeightGrams ?? null,
    priceMinor: draft.priceMinor,
    freeOverMinor: draft.freeOverMinor ?? null,
    position: draft.position,
  };
  const database = getPrismaClient();
  if (id) {
    const existing = await database.shippingRate.findFirst({ where: { id, flavor } });
    if (!existing) throw new CheckoutDataError("not-found", "Shipping Rate not found.");
    return toRate(await database.shippingRate.update({ where: { id }, data }));
  }
  return toRate(await database.shippingRate.create({ data: { flavor, ...data } }));
}

export async function deleteShippingRate(flavor: StationFlavor, id: string): Promise<void> {
  const result = await getPrismaClient().shippingRate.deleteMany({ where: { id, flavor } });
  if (result.count !== 1) throw new CheckoutDataError("not-found", "Shipping Rate not found.");
}

export async function calculatePersistedCheckoutQuote(input: {
  readonly flavor: StationFlavor;
  readonly currency: CurrencyCode;
  readonly cartToken: string;
  readonly address: CheckoutAddress;
  readonly discountCode?: string;
  readonly selectedShippingRateId?: string;
}): Promise<CheckoutQuote> {
  const [cart, rates] = await Promise.all([
    readCart(input.flavor, input.cartToken),
    listShippingRates(input.flavor, true),
  ]);
  const requestedCode = input.discountCode?.trim().toUpperCase();
  const discountRecord = requestedCode ? await getPrismaClient().discountCode.findUnique({
    where: { flavor_code: { flavor: input.flavor, code: requestedCode } },
  }) : null;
  if (requestedCode && (!discountRecord || !discountRecord.enabled)) {
    throw new CheckoutValidationError("invalid-discount", "Discount Code is invalid or inactive.");
  }
  return calculateCheckoutQuote({
    flavor: input.flavor,
    currency: input.currency,
    lines: cart.lines,
    address: input.address,
    shippingRates: rates,
    discount: discountRecord ? toDiscount(discountRecord) : undefined,
    selectedShippingRateId: input.selectedShippingRateId,
  });
}

const POLICY_SLUGS: readonly PolicySlug[] = ["privacy", "terms", "returns", "shipping"];

export async function listPolicies(flavor: StationFlavor): Promise<ReservedPolicy[]> {
  const records = await getPrismaClient().policy.findMany({ where: { flavor } });
  const bySlug = new Map(records.map((record) => [record.slug, record]));
  return POLICY_SLUGS.map((slug) => {
    const record = bySlug.get(slug);
    return {
      slug,
      title: {
        zh: { privacy: "隐私", terms: "服务条款", returns: "退货说明", shipping: "运费说明" }[slug],
        en: { privacy: "Privacy", terms: "Terms", returns: "Returns", shipping: "Shipping" }[slug],
      },
      body: { zh: record?.bodyZh ?? undefined, en: record?.bodyEn ?? undefined },
    };
  });
}

export async function readPolicy(flavor: StationFlavor, slug: PolicySlug): Promise<ReservedPolicy> {
  return (await listPolicies(flavor)).find((policy) => policy.slug === slug)!;
}

export async function writePolicy(flavor: StationFlavor, slug: PolicySlug, body: LocalizedText): Promise<void> {
  await getPrismaClient().policy.upsert({
    where: { flavor_slug: { flavor, slug } },
    create: { flavor, slug, bodyZh: body.zh?.trim() || null, bodyEn: body.en?.trim() || null },
    update: { bodyZh: body.zh?.trim() || null, bodyEn: body.en?.trim() || null },
  });
}
