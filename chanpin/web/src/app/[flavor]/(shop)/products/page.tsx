"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/ProductCard";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { pickText, type Flavor } from "@/lib/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ flavor: string }>;
  searchParams: SearchParams;
}) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const sp = use(searchParams);

  const st = useFlavorState(f);
  const locale = useLocale(f);
  const t = useT(f);
  const cat = first(sp.cat);
  const q = first(sp.q).trim().toLowerCase();

  const active = st.products.filter((p) => p.active);
  const filtered = active.filter((p) => {
    const inCat = !cat || p.categoryIds.some((id) => st.categories.find((c) => c.id === id)?.slug === cat);
    const name = pickText(p.name, locale, st.settings.primaryLocale).toLowerCase();
    const hit = !q || name.includes(q) || p.slug.includes(q);
    return inCat && hit;
  });

  const title = q ? `${t("product.searchResult")}「${q}」` : t("product.allProducts");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {st.categories.length > 0 ? (
          <nav className="flex flex-wrap gap-1.5" aria-label="categories">
            <Link
              href={`/${f}/products`}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                !cat ? "bg-ink text-white" : "border border-line bg-white text-ink-soft hover:border-ink/30 hover:text-ink"
              }`}
            >
              {t("product.filterAll")}
            </Link>
            {st.categories.map((c) => (
              <Link
                key={c.id}
                href={`/${f}/products?cat=${c.slug}`}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  cat === c.slug
                    ? "bg-ink text-white"
                    : "border border-line bg-white text-ink-soft hover:border-ink/30 hover:text-ink"
                }`}
              >
                {pickText(c.name, locale, st.settings.primaryLocale)}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      {active.length === 0 ? (
        <div className="flex flex-col items-center py-28 text-center">
          <p className="font-display text-2xl tracking-tight text-ink">{t("product.emptyTitle")}</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{t("product.emptyBody")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-28 text-center">
          <p className="text-lg font-medium text-ink">{t("product.noResults")}</p>
          <Link href={`/${f}/products`} className="mt-4 text-sm text-pine-700 underline-offset-4 hover:underline">
            {t("product.filterAll")}
          </Link>
        </div>
      ) : (
        <div className="mt-9 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} flavor={f} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
