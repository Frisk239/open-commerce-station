"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Money } from "@/components/money";
import { ProductCard } from "@/components/storefront/ProductCard";
import { HOME_COPY } from "@/mock/seed";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { pickText, type Flavor } from "@/lib/types";

export default function HomePage({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;

  const st = useFlavorState(f);
  const locale = useLocale(f);
  const t = useT(f);
  const copy = HOME_COPY[f];
  const products = st.products.filter((p) => p.active);
  const featured = products.slice(0, 8);
  // 主推位给第一件可售商品：桌面占两列两行
  const lead = featured.find((p) => p.variants.some((v) => v.stock > 0)) ?? featured[0];
  const rest = lead ? featured.filter((p) => p.id !== lead.id) : [];
  const shippingPolicy = st.policies.find((p) => p.slug === "shipping");
  const returnsPolicy = st.policies.find((p) => p.slug === "returns");

  const heroTitle = pickText(copy.heroTitle, locale, st.settings.primaryLocale);

  return (
    <div>
      {/* 杂志版 Hero：左文（纸色）右图（出血），字锚左下，不对称 */}
      <section className="lg:flex lg:min-h-[70svh]">
        <div className="flex flex-col justify-end px-4 pb-12 pt-14 sm:px-6 lg:w-[58%] lg:shrink-0 lg:pb-16 lg:pr-12 xl:w-[54%]">
          <h1 className="font-display text-[42px] font-black leading-[1.06] tracking-[-0.02em] text-ink sm:text-6xl xl:text-[76px] xl:leading-[1.03]">
            {heroTitle}
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-ink-soft">
            {pickText(copy.heroSub, locale, st.settings.primaryLocale)}
          </p>
          <Link
            href={`/${f}/products`}
            className="mt-8 inline-flex h-11 w-fit items-center gap-1.5 bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-pine-800"
          >
            {t("product.allProducts")}
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="relative mt-10 h-[48svh] min-h-[300px] lg:mt-0 lg:h-auto lg:min-h-0 lg:flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://picsum.photos/seed/${copy.heroSeed}/2000/1100`} alt={heroTitle} className="photo absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {featured.length === 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <p className="font-display text-2xl font-bold tracking-tight text-ink">{t("product.emptyTitle")}</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{t("product.emptyBody")}</p>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{st.settings.name}</h2>
            <Link href={`/${f}/products`} className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
              {t("nav.all")}
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {lead ? (
              <LeadTile key={lead.id} flavor={f} product={lead} line={pickText(copy.featuredLine, locale, st.settings.primaryLocale)} shopName={st.settings.name} />
            ) : null}
            {rest.map((p) => (
              <ProductCard key={p.id} flavor={f} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://picsum.photos/seed/${copy.aboutSeed}/1200/900`}
            alt=""
            className="photo aspect-[4/3] w-full object-cover"
          />
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {pickText(copy.aboutTitle, locale, st.settings.primaryLocale)}
            </h2>
            <p className="mt-4 max-w-prose text-[15px] leading-8 text-ink-soft">
              {pickText(copy.aboutBody, locale, st.settings.primaryLocale)}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {shippingPolicy ? (
                <Link
                  href={`/${f}/pages/shipping`}
                  className="inline-flex items-center gap-1 text-pine-700 underline-offset-4 hover:underline"
                >
                  {pickText(shippingPolicy.title, locale, st.settings.primaryLocale)}
                  <ArrowRight size={13} />
                </Link>
              ) : null}
              {returnsPolicy ? (
                <Link
                  href={`/${f}/pages/returns`}
                  className="inline-flex items-center gap-1 text-pine-700 underline-offset-4 hover:underline"
                >
                  {pickText(returnsPolicy.title, locale, st.settings.primaryLocale)}
                  <ArrowRight size={13} />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * 首页主推位：占两列的大图 + 店名一句人话 + 价格。
 * 手机单列按 4:5 出图；sm 占整行；lg 起占两列两行，图片吃掉格子拉伸后的余高。
 */
function LeadTile({
  flavor,
  product,
  line,
  shopName,
}: {
  flavor: Flavor;
  product: ReturnType<typeof useFlavorState>["products"][number];
  line: string;
  shopName: string;
}) {
  const st = useFlavorState(flavor);
  const locale = useLocale(flavor);
  const t = useT(flavor);
  const name = pickText(product.name, locale, st.settings.primaryLocale);
  const cheapest = product.variants.reduce(
    (min, v) => (v.price < min.price ? v : min),
    product.variants[0] ?? { price: 0, compareAt: undefined, stock: 0, id: "", selection: {} },
  );
  const allOut = product.variants.every((v) => v.stock <= 0);

  return (
    <Link href={`/${flavor}/products/${product.slug}`} className="group flex flex-col sm:col-span-2 lg:row-span-2">
      <div className="relative overflow-hidden bg-mist aspect-[4/5] lg:aspect-auto lg:flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0]}
          alt={name}
          className="photo absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        {allOut ? (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white">
            {t("product.soldOut")}
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">{shopName}</p>
          <p className="mt-1.5 font-display text-xl font-bold leading-snug tracking-tight text-ink group-hover:underline group-hover:underline-offset-4 sm:text-2xl">
            {line}
          </p>
        </div>
        <p className="shrink-0 pb-0.5 text-right text-[15px] text-ink">
          <Money flavor={flavor} minor={cheapest.price} />
          {cheapest.compareAt ? (
            <span className="ml-1.5 block text-xs text-ink-faint line-through">
              <Money flavor={flavor} minor={cheapest.compareAt} />
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
