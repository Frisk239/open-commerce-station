"use client";

import Link from "next/link";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { Money } from "@/components/money";
import { pickText, type Flavor } from "@/lib/types";

export function ProductCard({ flavor, product }: { flavor: Flavor; product: ReturnType<typeof useFlavorState>["products"][number] }) {
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
    <Link href={`/${flavor}/products/${product.slug}`} className="group block">
      {/* 杂志式卡片：图不带盒子边框和圆角 */}
      <div className="relative overflow-hidden bg-mist">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0]}
          alt={name}
          loading="lazy"
          className="photo aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {allOut ? (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white">
            {t("product.soldOut")}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <p className="text-[15px] font-medium leading-snug text-ink group-hover:underline group-hover:underline-offset-4">
          {name}
        </p>
        <p className="shrink-0 text-right text-[15px] text-ink">
          <Money flavor={flavor} minor={cheapest.price} />
          {cheapest.compareAt ? (
            <span className="ml-1.5 text-xs text-ink-faint line-through">
              <Money flavor={flavor} minor={cheapest.compareAt} />
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
