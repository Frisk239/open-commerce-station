"use client";

import { pickLocalizedText } from "@ocs/core";
import type { CatalogOptionDraft, CatalogVariantView, CurrencyCode, LocaleCode } from "@ocs/core";
import { useActionState, useState } from "react";

export interface CartActionState {
  readonly status?: "added" | "error";
  readonly error?: "unavailable" | "out-of-stock" | "invalid-quantity";
  readonly lineCount?: number;
  readonly variantId?: string;
}

interface ProductPurchasePanelProps {
  readonly options: readonly CatalogOptionDraft[];
  readonly variants: readonly CatalogVariantView[];
  readonly locale: LocaleCode;
  readonly currency: CurrencyCode;
  readonly action: (state: CartActionState, formData: FormData) => Promise<CartActionState>;
}

export function ProductPurchasePanel({ options, variants, locale, currency, action }: ProductPurchasePanelProps) {
  const firstVariant = variants[0]!;
  const [selection, setSelection] = useState<Readonly<Record<string, string>>>(firstVariant.selection);
  const [state, formAction, pending] = useActionState(action, {});
  const selectedVariant = variants.find((variant) => options.every((option) => variant.selection[option.key] === selection[option.key])) ?? firstVariant;
  const money = new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", { style: "currency", currency });
  const soldOut = selectedVariant.stock === 0;
  const lowStock = selectedVariant.stock > 0 && selectedVariant.stock <= 5;
  const text = locale === "zh" ? {
    original: "原价",
    stock: soldOut ? "该规格已售罄" : lowStock ? `仅剩 ${selectedVariant.stock} 件` : `有货 · ${selectedVariant.stock} 件`,
    quantity: "数量",
    add: soldOut ? "已售罄" : "加入购物车",
    adding: "正在加入…",
    added: `已加入购物车${state.lineCount ? ` · 共 ${state.lineCount} 件` : ""}`,
    error: state.error === "invalid-quantity" ? "请输入有效数量。" : state.error === "out-of-stock" ? "库存不足，请减少数量。" : "该规格暂时不可购买。",
  } : {
    original: "Original",
    stock: soldOut ? "This Variant is sold out" : lowStock ? `Only ${selectedVariant.stock} left` : `In stock · ${selectedVariant.stock}`,
    quantity: "Quantity",
    add: soldOut ? "Sold out" : "Add to cart",
    adding: "Adding…",
    added: `Added to cart${state.lineCount ? ` · ${state.lineCount} items` : ""}`,
    error: state.error === "invalid-quantity" ? "Enter a valid quantity." : state.error === "out-of-stock" ? "Not enough stock. Reduce the quantity." : "This Variant is no longer available.",
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="text-2xl font-bold">{money.format(selectedVariant.sellPriceMinor / 100)}</p>
        {selectedVariant.originalPriceMinor ? <p className="text-sm text-stone-500 line-through"><span className="sr-only">{text.original}: </span>{money.format(selectedVariant.originalPriceMinor / 100)}</p> : null}
      </div>

      {options.map((option) => (
        <fieldset key={option.key} className="mt-7">
          <legend className="text-sm font-bold">{pickLocalizedText(option.name, locale, locale)}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {option.values.map((value) => {
              const active = selection[option.key] === value.key;
              return <button key={value.key} type="button" aria-pressed={active} onClick={() => setSelection((current) => ({ ...current, [option.key]: value.key }))} className={`rounded-full border px-4 py-2 text-sm font-semibold ${active ? "border-stone-950 bg-stone-950 text-white" : "border-stone-300 bg-white hover:border-stone-500"}`}>{pickLocalizedText(value.name, locale, locale)}</button>;
            })}
          </div>
        </fieldset>
      ))}

      <p className={`mt-6 text-sm font-semibold ${soldOut ? "text-stone-500" : lowStock ? "text-amber-700" : "text-emerald-700"}`}>{text.stock}</p>
      <form action={formAction} className="mt-5 flex flex-wrap gap-3">
        <input type="hidden" name="variantId" value={selectedVariant.id} />
        <label className="sr-only" htmlFor="quantity">{text.quantity}</label>
        <input key={selectedVariant.id} id="quantity" name="quantity" type="number" min="1" max={Math.max(1, selectedVariant.stock)} defaultValue="1" className="w-20 rounded-full border border-stone-300 px-4 py-3 text-center font-semibold" />
        <button type="submit" disabled={soldOut || pending} className="min-w-44 flex-1 rounded-full bg-stone-950 px-6 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600">{pending ? text.adding : text.add}</button>
      </form>
      {state.variantId === selectedVariant.id && state.status === "added" ? <p role="status" className="mt-4 text-sm font-semibold text-emerald-700">{text.added}</p> : null}
      {state.variantId === selectedVariant.id && state.status === "error" ? <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{text.error}</p> : null}
    </div>
  );
}
