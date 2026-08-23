"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { TrashSimple } from "@phosphor-icons/react/dist/ssr";
import { Button, Card, EmptyBlock, Input } from "@/components/ui";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import { pickText, type Flavor } from "@/lib/types";

export default function PortalCategories({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const locale = useLocale(f, "portal");
  const addCategory = useShop((s) => s.addCategory);
  const deleteCategory = useShop((s) => s.deleteCategory);
  const [name, setName] = useState("");

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-ink">{t("p.navCategories")}</h1>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap gap-2.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("p.cats.newPh")}
            className="max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                addCategory(f, name.trim());
                setName("");
              }
            }}
          />
          <Button
            disabled={!name.trim()}
            onClick={() => {
              addCategory(f, name.trim());
              setName("");
            }}
          >
            {t("p.cats.add")}
          </Button>
        </div>
      </Card>

      {st.categories.length === 0 ? (
        <Card className="mt-4">
          <EmptyBlock title={t("p.cats.empty")} />
        </Card>
      ) : (
        <Card className="mt-4 divide-y divide-line-soft">
          {st.categories.map((c) => {
            const count = st.products.filter((p) => p.categoryIds.includes(c.id)).length;
            return (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm font-medium text-ink">{pickText(c.name, locale, st.settings.primaryLocale)}</p>
                <div className="flex items-center gap-4">
                  <p className="text-xs text-ink-soft">
                    {count} {t("p.cats.count")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t("p.cats.deleteConfirm"))) deleteCategory(f, c.id);
                    }}
                    aria-label={t("p.cats.delete")}
                    className="rounded-lg p-1.5 text-ink-faint hover:bg-rose-50 hover:text-rose-600"
                  >
                    <TrashSimple size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
