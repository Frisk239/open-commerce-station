"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "@phosphor-icons/react/dist/ssr";
import { Money } from "@/components/money";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import { pickText, type Flavor } from "@/lib/types";

export default function ProductPage({
  params,
}: {
  params: Promise<{ flavor: string; slug: string }>;
}) {
  const { flavor, slug } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;

  const st = useFlavorState(f);
  const locale = useLocale(f);
  const t = useT(f);
  const addToCart = useShop((s) => s.addToCart);
  const toast = useShop((s) => s.toast);

  const product = st.products.find((p) => p.slug === slug && p.active);
  const [imageIdx, setImageIdx] = useState(0);
  // 默认选中每个选项的第一个值
  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    product?.options.forEach((o) => {
      init[o.id] = o.values[0]?.id ?? "";
    });
    return init;
  });
  const [qty, setQty] = useState(1);

  const variant = useMemo(() => {
    if (!product) return undefined;
    if (product.options.length === 0) return product.variants[0];
    return product.variants.find((v) => product.options.every((o) => v.selection[o.id] === selection[o.id]));
  }, [product, selection]);

  if (!product) {
    notFound();
  }
  const p = product!;
  const name = pickText(p.name, locale, st.settings.primaryLocale);
  const story = pickText(p.story, locale, st.settings.primaryLocale);
  const soldOut = !variant || variant.stock <= 0;
  const lowStock = variant && variant.stock > 0 && variant.stock <= 3;
  const shippingPolicy = st.policies.find((x) => x.slug === "shipping");
  const returnsPolicy = st.policies.find((x) => x.slug === "returns");

  const doAdd = () => {
    if (!variant) return;
    const ok = addToCart(f, p.id, variant.id, qty);
    toast(ok ? t("toast.addedCart") : t("product.soldOut"));
  };

  // 购买区的按钮走墨色方角，不跟主题默认的圆角绿
  const buyBtn = "flex h-12 items-center justify-center gap-2 bg-ink text-sm font-semibold text-white transition-colors hover:bg-pine-800 disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* 图集 */}
        <div>
          <div className="overflow-hidden bg-mist">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.images[imageIdx]} alt={name} className="photo aspect-[4/5] w-full object-cover" />
          </div>
          {p.images.length > 1 ? (
            <div className="mt-3 flex gap-2.5">
              {p.images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setImageIdx(i)}
                  aria-label={`photo ${i + 1}`}
                  className={`overflow-hidden border-2 transition-colors ${
                    i === imageIdx ? "border-ink" : "border-transparent hover:border-line"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="photo h-16 w-14 object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* 买什么、怎么买 */}
        <div className="lg:pt-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{name}</h1>
          <p className="mt-4 flex items-baseline gap-2.5">
            {variant ? (
              <>
                <span className="text-2xl font-semibold text-ink">
                  <Money flavor={f} minor={variant.price} />
                </span>
                {variant.compareAt ? (
                  <span className="text-base text-ink-faint line-through">
                    <Money flavor={f} minor={variant.compareAt} />
                  </span>
                ) : null}
              </>
            ) : null}
          </p>

          {/* 选项：色块/文字按钮，不是下拉超市 */}
          <div className="mt-7 space-y-5">
            {p.options.map((o) => (
              <div key={o.id}>
                <p className="mb-2 text-sm font-medium text-ink">
                  {pickText(o.name, locale, st.settings.primaryLocale)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {o.values.map((v) => {
                    const active = selection[o.id] === v.id;
                    const label = pickText(v.name, locale, st.settings.primaryLocale);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelection((s) => ({ ...s, [o.id]: v.id }))}
                        className={`h-10 min-w-11 border px-3.5 text-sm transition-colors ${
                          active
                            ? "border-ink bg-ink text-white"
                            : "border-line bg-white text-ink hover:border-ink/40"
                        }`}
                        aria-pressed={active}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex items-center gap-4">
            <p className="text-sm text-ink-soft">{t("product.quantity")}</p>
            <div className="flex h-10 items-center border border-line bg-white">
              <button
                type="button"
                aria-label="minus"
                className="flex h-full w-9 items-center justify-center text-ink-soft hover:text-ink disabled:opacity-40"
                disabled={qty <= 1}
                onClick={() => setQty((n) => Math.max(1, n - 1))}
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-medium">{qty}</span>
              <button
                type="button"
                aria-label="plus"
                className="flex h-full w-9 items-center justify-center text-ink-soft hover:text-ink disabled:opacity-40"
                disabled={!!variant && qty >= variant.stock}
                onClick={() => setQty((n) => n + 1)}
              >
                <Plus size={14} />
              </button>
            </div>
            {soldOut ? (
              <span className="text-sm font-medium text-ink-faint">{t("product.soldOut")}</span>
            ) : lowStock ? (
              <span className="text-sm text-amber-700">
                {t("product.onlyLeft")} {variant!.stock} {t("product.piece")}
              </span>
            ) : null}
          </div>

          <div className="mt-6 hidden md:block">
            <button type="button" disabled={soldOut} onClick={doAdd} className={`${buyBtn} w-full`}>
              <ShoppingBag size={17} />
              {soldOut ? t("product.soldOut") : t("product.addToCart")}
            </button>
          </div>

          {/* 运费与退货：细文字链，不做说明盒 */}
          <p className="mt-8 border-t border-line-soft pt-4 text-[13px] leading-relaxed text-ink-soft">
            {t("product.shipNoteBody")}
            {shippingPolicy ? (
              <>
                {" · "}
                <Link href={`/${f}/pages/shipping`} className="text-pine-700 underline-offset-4 hover:underline">
                  {pickText(shippingPolicy.title, locale, st.settings.primaryLocale)}
                </Link>
              </>
            ) : null}
            {returnsPolicy ? (
              <>
                {" · "}
                <Link href={`/${f}/pages/returns`} className="text-pine-700 underline-offset-4 hover:underline">
                  {pickText(returnsPolicy.title, locale, st.settings.primaryLocale)}
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* 介绍 */}
      {story ? (
        <section className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-lg font-bold tracking-tight text-ink">{t("product.story")}</h2>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-ink-soft">{story}</p>
        </section>
      ) : null}

      {/* 手机端吸底购买条 */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-line bg-paper/95 p-3 backdrop-blur md:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-ink-soft">{name}</p>
          {variant ? (
            <p className="text-[15px] font-semibold text-ink">
              <Money flavor={f} minor={variant.price} />
            </p>
          ) : null}
        </div>
        <button type="button" onClick={doAdd} disabled={soldOut} className={`${buyBtn} h-11 shrink-0 px-5`}>
          <ShoppingBag size={16} />
          {soldOut ? t("product.soldOut") : t("product.addToCart")}
        </button>
      </div>
      <div className="h-16 md:hidden" />
    </div>
  );
}
