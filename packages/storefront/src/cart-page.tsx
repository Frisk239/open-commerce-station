import { pickLocalizedText } from "@ocs/core";
import type { CartView, CurrencyCode, LocaleCode } from "@ocs/core";
import Image from "next/image";
import Link from "next/link";

interface CartPageProps {
  readonly cart: CartView;
  readonly locale: LocaleCode;
  readonly currency: CurrencyCode;
  readonly updateAction: (formData: FormData) => void | Promise<void>;
  readonly clearAction: (formData: FormData) => void | Promise<void>;
  readonly error?: "out-of-stock" | "unavailable";
}

export function CartPage({ cart, locale, currency, updateAction, clearAction, error }: CartPageProps) {
  const zh = locale === "zh";
  const money = new Intl.NumberFormat(zh ? "zh-CN" : "en-US", { style: "currency", currency });
  const copy = zh ? {
    title: "购物车", back: "继续购物", empty: "购物车还是空的", emptyBody: "从全部商品中选择一个有库存的 Variant。",
    price: "单价", quantity: "数量", update: "更新", remove: "移除", clear: "清空购物车", total: "商品小计", checkout: "前往 Checkout",
    invalid: "购物车里有失效或库存不足的商品，请先调整。", stockError: "库存不足，数量没有更新。", unavailable: "该商品已经下架或不可用。",
  } : {
    title: "Cart", back: "Continue shopping", empty: "Your Cart is empty", emptyBody: "Choose an in-stock Variant from all Products.",
    price: "Unit price", quantity: "Quantity", update: "Update", remove: "Remove", clear: "Clear Cart", total: "Merchandise subtotal", checkout: "Continue to Checkout",
    invalid: "One or more Cart lines are unavailable or short on stock. Adjust them first.", stockError: "Not enough stock. Quantity was not updated.", unavailable: "This Product is unpublished or unavailable.",
  };

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10 text-stone-950 md:px-10 md:py-16">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Storefront</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.04em]">{copy.title}</h1></div>
          <Link href="/products" className="text-sm font-semibold underline underline-offset-4">{copy.back}</Link>
        </div>
        {error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error === "out-of-stock" ? copy.stockError : copy.unavailable}</p> : null}
        {cart.lines.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-stone-300 py-16 text-center"><h2 className="text-2xl font-semibold">{copy.empty}</h2><p className="mt-3 text-stone-500">{copy.emptyBody}</p></div>
        ) : <>
          <div className="mt-10 overflow-hidden rounded-3xl border border-stone-200 bg-white">
            {cart.lines.map((line, index) => (
              <article key={line.variantId} className="grid gap-4 border-b border-stone-100 p-5 last:border-0 sm:grid-cols-[6rem_1fr_auto] sm:items-center">
                {line.imageUrl ? <Image src={line.imageUrl} alt="" width={192} height={192} loading={index === 0 ? "eager" : "lazy"} className="size-24 rounded-2xl object-cover" /> : <div className="size-24 rounded-2xl bg-stone-100" />}
                <div>
                  <h2 className="font-bold">{line.available ? <Link href={`/products/${line.productSlug}`}>{pickLocalizedText(line.productName, locale, locale)}</Link> : pickLocalizedText(line.productName, locale, locale)}</h2>
                  {line.variantLabel ? <p className="mt-1 text-sm text-stone-500">{line.variantLabel}</p> : null}
                  <p className="mt-2 text-sm text-stone-600">{copy.price}: {money.format(line.sellPriceMinor / 100)} · {money.format((line.sellPriceMinor * line.quantity) / 100)}</p>
                  {!line.available ? <p className="mt-2 text-sm font-semibold text-red-700">{line.stock < line.quantity ? copy.stockError : copy.unavailable}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <form action={updateAction} className="flex items-center gap-2">
                    <input type="hidden" name="variantId" value={line.variantId} />
                    <label className="sr-only" htmlFor={`quantity-${line.variantId}`}>{copy.quantity}</label>
                    <input id={`quantity-${line.variantId}`} name="quantity" type="number" min="1" max={Math.max(1, line.stock)} required defaultValue={line.quantity} className="w-20 rounded-full border border-stone-300 px-3 py-2 text-center text-sm" />
                    <button className="rounded-full border border-stone-300 px-3 py-2 text-sm font-semibold">{copy.update}</button>
                  </form>
                  <form action={updateAction}>
                    <input type="hidden" name="variantId" value={line.variantId} /><input type="hidden" name="quantity" value="0" />
                    <button className="px-2 py-2 text-sm font-semibold text-red-700">{copy.remove}</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
          {cart.hasInvalidLines ? <p role="alert" className="mt-5 text-sm font-semibold text-red-700">{copy.invalid}</p> : null}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-stone-950 p-6 text-white">
            <form action={clearAction}><button className="text-sm font-semibold text-stone-300 underline underline-offset-4">{copy.clear}</button></form>
            <div className="text-right"><p className="text-sm text-stone-400">{copy.total}</p><p className="mt-1 text-2xl font-bold">{money.format(cart.subtotalMinor / 100)}</p></div>
            <Link aria-disabled={cart.hasInvalidLines} href={cart.hasInvalidLines ? "/cart" : "/checkout"} className={`rounded-full px-6 py-3 text-sm font-bold ${cart.hasInvalidLines ? "pointer-events-none bg-stone-700 text-stone-400" : "bg-emerald-600 text-white"}`}>{copy.checkout}</Link>
          </div>
        </>}
      </section>
    </main>
  );
}
