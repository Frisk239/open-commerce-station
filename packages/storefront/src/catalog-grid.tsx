import { pickLocalizedText } from "@ocs/core";
import type { CatalogProductView, CurrencyCode, LocaleCode } from "@ocs/core";
import Image from "next/image";
import Link from "next/link";

interface CatalogGridProps {
  readonly products: readonly CatalogProductView[];
  readonly locale: LocaleCode;
  readonly currency: CurrencyCode;
  readonly emptyTitle: string;
  readonly emptyBody: string;
}

export function CatalogGrid({ products, locale, currency, emptyTitle, emptyBody }: CatalogGridProps) {
  const money = new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", { style: "currency", currency });
  if (products.length === 0) {
    return <div className="rounded-3xl border border-dashed border-stone-300 px-6 py-16 text-center"><h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{emptyTitle}</h2><p className="mt-3 text-stone-500">{emptyBody}</p></div>;
  }

  return (
    <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => {
        let minimum = Number.POSITIVE_INFINITY;
        let maximum = 0;
        let totalStock = 0;
        for (const variant of product.variants) {
          minimum = Math.min(minimum, variant.sellPriceMinor);
          maximum = Math.max(maximum, variant.sellPriceMinor);
          totalStock += variant.stock;
        }
        const price = minimum === maximum
          ? money.format(minimum / 100)
          : `${money.format(minimum / 100)} – ${money.format(maximum / 100)}`;
        return (
          <article key={product.id} className="group">
            <Link href={`/products/${product.slug}`} className="block overflow-hidden rounded-3xl bg-stone-100">
              <Image src={product.imageUrls[0]!} alt={pickLocalizedText(product.name, locale, locale)} width={800} height={800} loading={index < 4 ? "eager" : "lazy"} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
            </Link>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div><h2 className="font-bold leading-5"><Link href={`/products/${product.slug}`}>{pickLocalizedText(product.name, locale, locale)}</Link></h2><p className="mt-2 text-sm text-stone-600">{price}</p></div>
              {totalStock === 0 ? <span className="shrink-0 rounded-full bg-stone-200 px-2 py-1 text-xs font-semibold text-stone-600">{locale === "zh" ? "售罄" : "Sold out"}</span> : totalStock <= 5 ? <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{locale === "zh" ? `仅 ${totalStock} 件` : `${totalStock} left`}</span> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
