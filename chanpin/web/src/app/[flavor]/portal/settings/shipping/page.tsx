"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { Plus, TrashSimple } from "@phosphor-icons/react/dist/ssr";
import { Button, Card, Input } from "@/components/ui";
import { useFlavorState, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { Flavor, LocaleCode, ShippingRate } from "@/lib/types";

/** 运费规则：名称 + 运费 + 满额免邮。结账必须选一种。 */
export default function ShippingSettings({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const saveSettings = useShop((s) => s.saveSettings);
  const saveRate = useShop((s) => s.saveRate);
  const deleteRate = useShop((s) => s.deleteRate);
  const toast = useShop((s) => s.toast);

  const [draft, setDraft] = useState<ShippingRate | null>(null);

  const primary = st.settings.primaryLocale;
  const nameOf = (r: ShippingRate) => r.name[primary as LocaleCode] ?? Object.values(r.name)[0] ?? "";

  const addRow = () => {
    setDraft({ id: `r-${Date.now().toString(36)}`, name: { [primary]: "" } as ShippingRate["name"], price: 0 });
  };

  const upsert = (rate: ShippingRate, name: string, price: string, freeOver: string) => {
    saveRate(f, {
      ...rate,
      name: { ...rate.name, [primary]: name } as ShippingRate["name"],
      price: Math.round(parseFloat(price || "0") * 100) || 0,
      freeOver: freeOver.trim() ? Math.round(parseFloat(freeOver) * 100) : undefined,
    });
  };

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm leading-relaxed text-ink-soft">{t("p.ship.hint")}</p>

      <Card className="divide-y divide-line-soft">
        {st.shippingRates.map((r) => (
          <RateRow key={r.id} flavor={f} rate={r} name={nameOf(r)} onSaved={() => toast(t("p.set.saved"))} />
        ))}
        {draft ? (
          <div className="px-5 py-4">
            <NewRateForm
              flavor={f}
              rate={draft}
              onCreate={(name, price, freeOver) => {
                upsert(draft, name, price, freeOver);
                setDraft(null);
                toast(t("p.set.saved"));
              }}
              onCancel={() => setDraft(null)}
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between px-5 py-3.5">
          <Button size="sm" variant="secondary" onClick={addRow}>
            <Plus size={13} />
            {t("p.ship.add")}
          </Button>
          <p className="text-xs text-ink-faint">{st.settings.accounting}</p>
        </div>
      </Card>
    </div>
  );
}

function RateRow({
  flavor,
  rate,
  name,
  onSaved,
}: {
  flavor: Flavor;
  rate: ShippingRate;
  name: string;
  onSaved: () => void;
}) {
  const t = useT(flavor, "portal");
  const saveRate = useShop((s) => s.saveRate);
  const deleteRate = useShop((s) => s.deleteRate);
  const [editName, setEditName] = useState(name);
  const [price, setPrice] = useState((rate.price / 100).toString());
  const [freeOver, setFreeOver] = useState(rate.freeOver ? (rate.freeOver / 100).toString() : "");

  return (
    <div className="grid gap-2.5 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_110px_130px_auto] sm:items-center">
      <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t("p.ship.namePh")} aria-label={t("p.ship.name")} />
      <Input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} aria-label={t("p.ship.price")} />
      <Input value={freeOver} inputMode="decimal" onChange={(e) => setFreeOver(e.target.value)} placeholder={t("p.ship.freeOverPh")} aria-label={t("p.ship.freeOver")} />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            saveRate(flavor, {
              ...rate,
              name: { ...rate.name, [useShop.getState().flavors[flavor].settings.primaryLocale]: editName.trim() } as ShippingRate["name"],
              price: Math.round(parseFloat(price || "0") * 100) || 0,
              freeOver: freeOver.trim() ? Math.round(parseFloat(freeOver) * 100) : undefined,
            });
            onSaved();
          }}
        >
          {t("p.set.save")}
        </Button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t("common.confirm"))) deleteRate(flavor, rate.id);
          }}
          aria-label={t("p.ship.delete")}
          className="rounded-lg p-2 text-ink-faint hover:bg-rose-50 hover:text-rose-600"
        >
          <TrashSimple size={15} />
        </button>
      </div>
    </div>
  );
}

function NewRateForm({
  flavor,
  rate,
  onCreate,
  onCancel,
}: {
  flavor: Flavor;
  rate: ShippingRate;
  onCreate: (name: string, price: string, freeOver: string) => void;
  onCancel: () => void;
}) {
  const t = useT(flavor, "portal");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [freeOver, setFreeOver] = useState("");

  return (
    <div className="grid gap-2.5 rounded-lg border border-dashed border-line bg-mist/50 p-3.5 sm:grid-cols-[minmax(0,1fr)_110px_130px_auto] sm:items-center">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("p.ship.namePh")} aria-label={t("p.ship.name")} />
      <Input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} placeholder={t("p.ship.price")} aria-label={t("p.ship.price")} />
      <Input value={freeOver} inputMode="decimal" onChange={(e) => setFreeOver(e.target.value)} placeholder={t("p.ship.freeOverPh")} aria-label={t("p.ship.freeOver")} />
      <div className="flex gap-2">
        <Button size="sm" disabled={!name.trim()} onClick={() => onCreate(name, price, freeOver)}>
          {t("p.cats.add")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
