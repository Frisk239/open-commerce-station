"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { TrashSimple } from "@phosphor-icons/react/dist/ssr";
import { Badge, Button, Card, EmptyBlock, Input, Select, Toggle } from "@/components/ui";
import { Money } from "@/components/money";
import { useFlavorState, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { Flavor } from "@/lib/types";

export default function PortalDiscounts({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const saveDiscount = useShop((s) => s.saveDiscount);
  const deleteDiscount = useShop((s) => s.deleteDiscount);

  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");

  const create = () => {
    const v = parseFloat(value);
    if (!code.trim() || Number.isNaN(v)) return;
    saveDiscount(f, {
      id: `d-${Date.now().toString(36)}`,
      code: code.trim().toUpperCase(),
      ...(type === "percent" ? { percent: v } : { amountOff: Math.round(v * 100) }),
      active: true,
    });
    setCode("");
    setValue("");
  };

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-ink">{t("p.navDiscounts")}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t("p.disc.hint")}</p>

      <Card className="mt-6 p-5">
        <p className="text-sm font-semibold text-ink">{t("p.disc.new")}</p>
        <div className="mt-3.5 flex flex-wrap items-end gap-2.5">
          <div className="w-44">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("p.disc.codePh")} className="uppercase" />
          </div>
          <div className="w-36">
            <Select value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")}>
              <option value="percent">{t("p.disc.percent")}</option>
              <option value="fixed">{t("p.disc.fixed")}</option>
            </Select>
          </div>
          <div className="w-40">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              placeholder={type === "percent" ? t("p.disc.percentPh") : t("p.disc.fixedPh")}
            />
          </div>
          <Button disabled={!code.trim() || !value.trim()} onClick={create}>
            {t("p.cats.add")}
          </Button>
        </div>
      </Card>

      {st.discounts.length === 0 ? (
        <Card className="mt-4">
          <EmptyBlock title={t("p.disc.empty")} />
        </Card>
      ) : (
        <Card className="mt-4 divide-y divide-line-soft">
          {st.discounts.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <p className="font-mono text-sm font-semibold text-ink">{d.code}</p>
                <span className="text-xs text-ink-soft">
                  {d.percent
                    ? `-${d.percent}%`
                    : d.amountOff
                      ? `-${st.settings.accounting} ${(d.amountOff / 100).toFixed(2)}`
                      : "-"}
                </span>
                {d.amountOff ? (
                  <span className="text-xs text-ink-faint">
                    (<Money flavor={f} minor={d.amountOff} mode="portal" />)
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-4">
                <Badge tone={d.active ? "pine" : "neutral"}>{d.active ? t("p.disc.activeOn") : t("p.disc.off")}</Badge>
                <Toggle
                  on={d.active}
                  onChange={(next) => saveDiscount(f, { ...d, active: next })}
                  label={t("p.disc.activeOn")}
                />
                <button
                  type="button"
                  onClick={() => deleteDiscount(f, d.id)}
                  aria-label={t("p.disc.delete")}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-rose-50 hover:text-rose-600"
                >
                  <TrashSimple size={15} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
