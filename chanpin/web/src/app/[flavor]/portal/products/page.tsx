"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { Badge, Button, Card, EmptyBlock } from "@/components/ui";
import { Money } from "@/components/money";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { pickText, type Flavor } from "@/lib/types";

export default function PortalProducts({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const locale = useLocale(f, "portal");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-ink">{t("p.navProducts")}</h1>
        <Link href={`/${f}/portal/products/new`}>
          <Button size="sm">
            <Plus size={14} />
            {t("p.products.new")}
          </Button>
        </Link>
      </div>

      {st.products.length === 0 ? (
        <Card className="mt-6">
          <EmptyBlock
            title={t("p.products.empty")}
            action={
              <Link href={`/${f}/portal/products/new`}>
                <Button>{t("p.products.new")}</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-faint">
                <th className="px-5 py-3 font-medium">{t("p.products.name")}</th>
                <th className="px-3 py-3 font-medium">{t("p.products.cat")}</th>
                <th className="px-3 py-3 font-medium">{t("p.products.variants")}</th>
                <th className="px-3 py-3 font-medium">{t("p.products.price")}</th>
                <th className="px-3 py-3 font-medium">{t("p.products.stock")}</th>
                <th className="px-3 py-3 font-medium">{t("p.products.status")}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {st.products.map((p) => {
                const stock = p.variants.reduce((n, v) => n + v.stock, 0);
                const minPrice = p.variants.reduce((m, v) => Math.min(m, v.price), Infinity);
                return (
                  <tr key={p.id} className="border-b border-line-soft last:border-b-0 hover:bg-mist/50">
                    <td className="px-5 py-3">
                      <Link href={`/${f}/portal/products/${p.id}`} className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.images[0]} alt="" className="photo h-11 w-9 rounded-md object-cover" />
                        <span className="max-w-56 truncate font-medium text-ink hover:underline hover:underline-offset-4">
                          {pickText(p.name, locale, st.settings.primaryLocale)}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink-soft">
                      {p.categoryIds
                        .map((id) => pickText(st.categories.find((c) => c.id === id)?.name, locale, st.settings.primaryLocale))
                        .filter(Boolean)
                        .join("、") || "-"}
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{p.variants.length}</td>
                    <td className="px-3 py-3 text-ink">
                      <Money flavor={f} minor={minPrice === Infinity ? 0 : minPrice} mode="portal" />
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{stock}</td>
                    <td className="px-3 py-3">
                      <Badge tone={p.active ? "pine" : "neutral"}>{p.active ? t("p.products.active") : t("p.products.draft")}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/${f}/portal/products/${p.id}`} className="text-xs text-pine-700 hover:underline">
                        {t("p.orders.view")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
