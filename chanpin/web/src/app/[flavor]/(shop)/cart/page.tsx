"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Minus, Plus, TrashSimple, ShoppingBag } from "@phosphor-icons/react/dist/ssr";
import { Button, EmptyBlock } from "@/components/ui";
import { Money } from "@/components/money";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { cartSubtotal, resolveCart, useShop, variantLabelOf } from "@/mock/store";
import type { Flavor } from "@/lib/types";

export default function CartPage({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;

  const st = useFlavorState(f);
  const locale = useLocale(f);
  const t = useT(f);
  const setQty = useShop((s) => s.setCartQty);
  const removeLine = useShop((s) => s.removeCartLine);

  const lines = resolveCart(st).filter((l) => l.variant.stock > 0 || l.line.qty <= l.variant.stock);
  const subtotal = cartSubtotal(st);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t("cart.title")}</h1>

      {lines.length === 0 ? (
        <EmptyBlock
          icon={<ShoppingBag size={36} />}
          title={t("cart.empty")}
          action={
            <Link href={`/${f}/products`}>
              <Button>{t("cart.emptyCta")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
          <div className="divide-y divide-line-soft rounded-xl border border-line bg-white">
            {lines.map(({ line, product, variant }) => {
              const label = variantLabelOf(product, variant, locale, st.settings.primaryLocale);
              return (
                <div key={line.variantId} className="flex gap-4 p-4 sm:p-5">
                  <Link href={`/${f}/products/${product.slug}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.images[0]} alt="" className="photo h-24 w-20 rounded-lg object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/${f}/products/${product.slug}`} className="block truncate text-[15px] font-medium text-ink hover:underline hover:underline-offset-4">
                          {product.name[locale] ?? product.name[st.settings.primaryLocale]}
                        </Link>
                        {label ? <p className="mt-0.5 text-[13px] text-ink-soft">{label}</p> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(f, line.variantId)}
                        aria-label={t("cart.remove")}
                        className="rounded-lg p-1.5 text-ink-faint hover:bg-mist hover:text-ink"
                      >
                        <TrashSimple size={16} />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex h-9 items-center rounded-lg border border-line">
                        <button
                          type="button"
                          aria-label="minus"
                          className="flex h-full w-8 items-center justify-center text-ink-soft hover:text-ink"
                          onClick={() => setQty(f, line.variantId, line.qty - 1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-7 text-center text-sm">{line.qty}</span>
                        <button
                          type="button"
                          aria-label="plus"
                          className="flex h-full w-8 items-center justify-center text-ink-soft hover:text-ink disabled:opacity-40"
                          disabled={line.qty >= variant.stock}
                          onClick={() => setQty(f, line.variantId, line.qty + 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <p className="text-[15px] font-medium text-ink">
                        <Money flavor={f} minor={variant.price * line.qty} />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="h-fit rounded-xl border border-line bg-white p-5 lg:sticky lg:top-24">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-ink-soft">{t("cart.subtotal")}</p>
              <p className="text-lg font-semibold text-ink">
                <Money flavor={f} minor={subtotal} />
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">{t("cart.shipNote")}</p>
            <Link href={`/${f}/checkout`} className="mt-5 block">
              <Button size="lg" className="w-full">
                {t("cart.checkout")}
              </Button>
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
