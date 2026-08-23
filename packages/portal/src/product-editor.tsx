"use client";

import { combinationKey, pickLocalizedText } from "@ocs/core";
import type {
  CatalogGroupView,
  CatalogOptionDraft,
  CatalogProductDraft,
  CatalogProductView,
  CatalogVariantDraft,
  LocaleCode,
  StationFlavor,
  VariantCombination,
} from "@ocs/core";
import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import type { CatalogFormState } from "./catalog";

interface ProductEditorProps {
  readonly flavor: StationFlavor;
  readonly product?: CatalogProductView;
  readonly groups: readonly CatalogGroupView[];
  readonly action: (state: CatalogFormState, formData: FormData) => Promise<CatalogFormState>;
  readonly saved?: boolean;
}

function newKey(prefix: "option" | "value"): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function blankDraft(locale: LocaleCode): CatalogProductDraft {
  return {
    name: { [locale]: "" },
    story: { [locale]: "" },
    imageUrls: [],
    groupIds: [],
    options: [],
    variants: [{ key: "single", selection: {}, sellPriceMinor: 0, stock: 0, weightGrams: 1 }],
    published: false,
  };
}

function editorCombinations(options: readonly CatalogOptionDraft[], locale: LocaleCode): VariantCombination[] {
  if (options.length === 0) return [{ key: "single", selection: {}, label: "" }];
  const optionOrder = options.map((option) => option.key);
  let combinations: VariantCombination[] = [{ key: "", selection: {}, label: "" }];
  for (const option of options) {
    combinations = combinations.flatMap((current) => option.values.map((value) => {
      const selection = { ...current.selection, [option.key]: value.key };
      const valueName = value.name[locale]?.trim() || "—";
      return {
        key: combinationKey(selection, optionOrder),
        selection,
        label: current.label ? `${current.label} / ${valueName}` : valueName,
      };
    }));
  }
  return combinations;
}

function syncVariants(
  options: readonly CatalogOptionDraft[],
  current: readonly CatalogVariantDraft[],
  locale: LocaleCode,
): readonly CatalogVariantDraft[] {
  const previous = new Map(current.map((variant) => [variant.key, variant]));
  const fallback = current[0];
  return editorCombinations(options, locale).map((combination) => ({
    ...combination,
    sellPriceMinor: previous.get(combination.key)?.sellPriceMinor ?? fallback?.sellPriceMinor ?? 0,
    originalPriceMinor: previous.get(combination.key)?.originalPriceMinor ?? fallback?.originalPriceMinor,
    stock: previous.get(combination.key)?.stock ?? fallback?.stock ?? 0,
    weightGrams: previous.get(combination.key)?.weightGrams ?? fallback?.weightGrams ?? 1,
  }));
}

function minorAmount(value: string): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

const copy = {
  cn: {
    eyebrow: "Merchant Portal · 商品",
    titleNew: "新建商品",
    titleEdit: "编辑商品",
    name: "商品名",
    story: "商品故事",
    images: "商品图片",
    existing: "已上传图片",
    remove: "移除",
    groups: "所属分组（可多选）",
    options: "选项与规格",
    addOption: "添加选项",
    optionName: "选项名，例如：颜色",
    valueName: "选项值，例如：黑色",
    addValue: "添加选项值",
    variants: "规格价格与库存",
    sellPrice: "售价（元）",
    originalPrice: "原价（可选）",
    stock: "库存",
    weight: "重量（克）",
    publish: "立即发布到店面",
    save: "保存商品",
    saved: "商品已保存。",
    invalidFields: "没有保存：请检查商品名、图片、选项、价格、库存与重量。",
    invalidImage: "没有保存：图片必须是真实的 JPG、PNG 或 WebP，且不超过 5 MB。",
    notFound: "这个商品已不存在。",
    noOptions: "没有选项时，商品仍有且仅有一个可购买规格。",
    soldOut: "售罄",
    lowStock: "低库存",
  },
  global: {
    eyebrow: "Merchant Portal · Products",
    titleNew: "New product",
    titleEdit: "Edit product",
    name: "Product name",
    story: "Product story",
    images: "Product images",
    existing: "Uploaded images",
    remove: "Remove",
    groups: "Groups (select any)",
    options: "Options and variants",
    addOption: "Add option",
    optionName: "Option name, e.g. Color",
    valueName: "Option value, e.g. Black",
    addValue: "Add value",
    variants: "Variant price and stock",
    sellPrice: "Sell price (USD)",
    originalPrice: "Original price (optional)",
    stock: "Stock",
    weight: "Weight (grams)",
    publish: "Publish to Storefront now",
    save: "Save product",
    saved: "Product saved.",
    invalidFields: "Not saved: check the name, images, Options, prices, stock, and weight.",
    invalidImage: "Not saved: images must be genuine JPG, PNG, or WebP files no larger than 5 MB.",
    notFound: "This Product no longer exists.",
    noOptions: "With no Options, the Product still has exactly one purchasable Variant.",
    soldOut: "Sold out",
    lowStock: "Low stock",
  },
} as const;

export function ProductEditor({ flavor, product, groups, action, saved }: ProductEditorProps) {
  const locale: LocaleCode = flavor === "cn" ? "zh" : "en";
  const labels = copy[flavor];
  const [draft, setDraft] = useState<CatalogProductDraft>(() => product ?? blankDraft(locale));
  const [state, formAction, pending] = useActionState(action, {});
  const variantLabels = useMemo(
    () => new Map(editorCombinations(draft.options, locale).map((entry) => [entry.key, entry.label])),
    [draft.options, locale],
  );

  function replaceOptions(options: readonly CatalogOptionDraft[]) {
    setDraft((current) => ({ ...current, options, variants: syncVariants(options, current.variants, locale) }));
  }

  function updateOption(index: number, next: CatalogOptionDraft) {
    replaceOptions(draft.options.map((option, position) => position === index ? next : option));
  }

  function updateVariant(key: string, patch: Partial<CatalogVariantDraft>) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant) => variant.key === key ? { ...variant, ...patch } : variant),
    }));
  }

  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">{labels.eyebrow}</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.035em]">{product ? labels.titleEdit : labels.titleNew}</h1>
      {saved ? <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{labels.saved}</p> : null}
      {state.error ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {state.error === "invalid-image" ? labels.invalidImage : state.error === "not-found" ? labels.notFound : labels.invalidFields}
        </p>
      ) : null}

      <form action={formAction} className="mt-8 space-y-7">
        <input type="hidden" name="productId" value={product?.id ?? ""} />
        <input type="hidden" name="draft" value={JSON.stringify(draft)} />

        <section className="grid gap-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-7">
          <label className="text-sm font-semibold">
            {labels.name}
            <input required maxLength={160} value={draft.name[locale] ?? ""} onChange={(event) => setDraft({ ...draft, name: { ...draft.name, [locale]: event.target.value } })} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="text-sm font-semibold">
            {labels.story}
            <textarea maxLength={10_000} rows={6} value={draft.story[locale] ?? ""} onChange={(event) => setDraft({ ...draft, story: { ...draft.story, [locale]: event.target.value } })} className="mt-2 block w-full resize-y rounded-xl border border-stone-300 px-4 py-3 font-normal leading-6 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="text-sm font-semibold">
            {labels.images}
            <input name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm font-normal text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
          </label>
          {draft.imageUrls.length > 0 ? (
            <div>
              <p className="text-sm font-semibold">{labels.existing}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {draft.imageUrls.map((url, index) => (
                  <div key={url} className="rounded-xl border border-stone-200 p-2">
                    <Image src={url} alt="" width={320} height={320} loading={index === 0 ? "eager" : "lazy"} className="aspect-square w-full rounded-lg object-cover" />
                    <button type="button" onClick={() => setDraft({ ...draft, imageUrls: draft.imageUrls.filter((entry) => entry !== url) })} className="mt-2 text-xs font-semibold text-red-700">{labels.remove}</button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <fieldset>
            <legend className="text-sm font-semibold">{labels.groups}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {groups.map((group) => (
                <label key={group.id} className="flex items-center gap-2 rounded-full border border-stone-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={draft.groupIds.includes(group.id)} onChange={(event) => setDraft({
                    ...draft,
                    groupIds: event.target.checked ? [...draft.groupIds, group.id] : draft.groupIds.filter((id) => id !== group.id),
                  })} className="size-4 accent-emerald-700" />
                  {pickLocalizedText(group.name, locale, locale)}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{labels.options}</h2>
            <button type="button" disabled={draft.options.length >= 5} onClick={() => {
              const option: CatalogOptionDraft = {
                key: newKey("option"),
                name: { [locale]: "" },
                values: [{ key: newKey("value"), name: { [locale]: "" } }],
              };
              replaceOptions([...draft.options, option]);
            }} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">{labels.addOption}</button>
          </div>
          {draft.options.length === 0 ? <p className="mt-4 text-sm text-stone-500">{labels.noOptions}</p> : null}
          <div className="mt-5 space-y-4">
            {draft.options.map((option, optionIndex) => (
              <div key={option.key} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex gap-3">
                  <input required value={option.name[locale] ?? ""} placeholder={labels.optionName} onChange={(event) => updateOption(optionIndex, { ...option, name: { ...option.name, [locale]: event.target.value } })} className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700" />
                  <button type="button" onClick={() => replaceOptions(draft.options.filter((_, index) => index !== optionIndex))} className="text-sm font-semibold text-red-700">{labels.remove}</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {option.values.map((value, valueIndex) => (
                    <div key={value.key} className="flex items-center rounded-xl border border-stone-300 bg-white">
                      <input required value={value.name[locale] ?? ""} placeholder={labels.valueName} onChange={(event) => updateOption(optionIndex, {
                        ...option,
                        values: option.values.map((entry, index) => index === valueIndex ? { ...entry, name: { ...entry.name, [locale]: event.target.value } } : entry),
                      })} className="w-36 rounded-l-xl px-3 py-2 text-sm outline-none" />
                      {option.values.length > 1 ? <button type="button" aria-label={labels.remove} onClick={() => updateOption(optionIndex, { ...option, values: option.values.filter((_, index) => index !== valueIndex) })} className="px-2 text-red-700">×</button> : null}
                    </div>
                  ))}
                  <button type="button" disabled={option.values.length >= 50} onClick={() => updateOption(optionIndex, { ...option, values: [...option.values, { key: newKey("value"), name: { [locale]: "" } }] })} className="rounded-xl border border-dashed border-stone-400 px-3 py-2 text-sm font-semibold">{labels.addValue}</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-7">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{labels.variants}</h2>
          <div className="mt-5 space-y-3">
            {draft.variants.map((variant) => (
              <div key={variant.key} className="grid gap-3 rounded-2xl border border-stone-200 p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,1fr)] lg:items-end">
                <p className="flex items-center gap-2 self-center text-sm font-bold">{variantLabels.get(variant.key) || "Single Variant"}{variant.stock <= 5 ? <span className={`rounded-full px-2 py-1 text-[0.65rem] font-bold ${variant.stock === 0 ? "bg-stone-200 text-stone-700" : "bg-amber-100 text-amber-800"}`}>{variant.stock === 0 ? labels.soldOut : labels.lowStock}</span> : null}</p>
                <label className="text-xs font-semibold text-stone-600">{labels.sellPrice}<input required min="0" step="0.01" type="number" value={(variant.sellPriceMinor / 100).toFixed(2)} onChange={(event) => updateVariant(variant.key, { sellPriceMinor: minorAmount(event.target.value) })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950" /></label>
                <label className="text-xs font-semibold text-stone-600">{labels.originalPrice}<input min="0" step="0.01" type="number" value={variant.originalPriceMinor === undefined ? "" : (variant.originalPriceMinor / 100).toFixed(2)} onChange={(event) => updateVariant(variant.key, { originalPriceMinor: event.target.value ? minorAmount(event.target.value) : undefined })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950" /></label>
                <label className="text-xs font-semibold text-stone-600">{labels.stock}<input required min="0" step="1" type="number" value={variant.stock} onChange={(event) => updateVariant(variant.key, { stock: Math.max(0, Math.trunc(Number(event.target.value))) })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950" /></label>
                <label className="text-xs font-semibold text-stone-600">{labels.weight}<input required min="1" step="1" type="number" value={variant.weightGrams} onChange={(event) => updateVariant(variant.key, { weightGrams: Math.max(1, Math.trunc(Number(event.target.value))) })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-950" /></label>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-stone-950 p-5 text-white">
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} className="size-5 accent-emerald-500" />{labels.publish}</label>
          <button disabled={pending} type="submit" className="ml-auto rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{pending ? "…" : labels.save}</button>
        </div>
      </form>
    </section>
  );
}
