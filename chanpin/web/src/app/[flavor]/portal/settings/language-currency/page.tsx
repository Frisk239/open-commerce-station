"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { Plus, TrashSimple } from "@phosphor-icons/react/dist/ssr";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { useFlavorState, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { CurrencyCode, Flavor, LocaleCode } from "@/lib/types";

const ALL_CURRENCIES: CurrencyCode[] = ["CNY", "USD", "EUR", "GBP"];

/** 语言和货币：主语言 + 打开哪些语言；记账货币 + 可见货币（手填汇率）；老板自己的界面语言。 */
export default function LangCurSettings({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const saveSettings = useShop((s) => s.saveSettings);
  const toast = useShop((s) => s.toast);

  const [primary, setPrimary] = useState<LocaleCode>(st.settings.primaryLocale);
  const [locales, setLocales] = useState<LocaleCode[]>(st.settings.locales);
  const [accounting, setAccounting] = useState<CurrencyCode>(st.settings.accounting);
  const [currencies, setCurrencies] = useState(st.settings.currencies.map((c) => ({ ...c })));
  const [ownerLocale, setOwnerLocale] = useState<LocaleCode>(st.settings.ownerLocale);

  const toggleLocale = (l: LocaleCode, on: boolean) => {
    if (l === primary) return; // 主语言必开
    setLocales((ls) => (on ? [...new Set([...ls, l])] : ls.filter((x) => x !== l)));
  };

  const save = () => {
    saveSettings(f, {
      primaryLocale: primary,
      locales: [...new Set([primary, ...locales])],
      accounting,
      currencies: currencies.map((c) => ({ ...c, rate: c.code === accounting ? 1 : c.rate || 1 })),
      ownerLocale,
    });
    toast(t("p.set.saved"));
  };

  const available = ALL_CURRENCIES.filter((c) => !currencies.some((x) => x.code === c));

  return (
    <div className="max-w-2xl space-y-5">
      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <p className="text-sm font-semibold text-ink">{t("p.lc.locales")}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t("p.lc.localesHint")}</p>
          <div className="mt-3 space-y-2.5">
            {(["zh", "en"] as LocaleCode[]).map((l) => (
              <label key={l} className="flex items-center gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={l === primary || locales.includes(l)}
                  disabled={l === primary}
                  onChange={(e) => toggleLocale(l, e.target.checked)}
                  className="h-4 w-4 accent-pine-700"
                />
                {l === "zh" ? t("p.lc.zh") : t("p.lc.en")}
                {l === primary ? (
                  <span className="rounded-full bg-pine-100 px-2 py-0.5 text-[11px] font-medium text-pine-800">
                    {t("p.lc.primary")} · {t("p.pages.primaryTag")}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
          <div className="mt-4 max-w-56">
            <Field label={t("p.lc.primary")}>
              <Select
                value={primary}
                onChange={(e) => {
                  const next = e.target.value as LocaleCode;
                  setPrimary(next);
                  setLocales((ls) => [...new Set([next, ...ls])]);
                }}
              >
                <option value="zh">{t("p.lc.zh")}</option>
                <option value="en">{t("p.lc.en")}</option>
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="text-sm font-semibold text-ink">{t("p.lc.accounting")}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t("p.lc.accountingHint")}</p>
          <div className="mt-3 max-w-56">
            <Select
              value={accounting}
              onChange={(e) => {
                const next = e.target.value as CurrencyCode;
                setAccounting(next);
                setCurrencies((cs) =>
                  cs.some((c) => c.code === next) ? cs.map((c) => (c.code === next ? { ...c, rate: 1 } : c)) : [...cs, { code: next, rate: 1 }],
                );
              }}
            >
              {ALL_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="border-t border-line-soft pt-4">
          <p className="text-sm font-semibold text-ink">{t("p.lc.currencies")}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t("p.lc.currenciesHint")}</p>
          <div className="mt-3 space-y-2.5">
            {currencies.map((c, idx) => (
              <div key={c.code} className="flex flex-wrap items-center gap-2.5">
                <span className={`w-14 font-mono text-sm font-semibold ${c.code === accounting ? "text-pine-700" : "text-ink"}`}>{c.code}</span>
                {c.code === accounting ? (
                  <span className="text-xs text-ink-faint">1</span>
                ) : (
                  <Input
                    value={c.rate.toString()}
                    inputMode="decimal"
                    onChange={(e) =>
                      setCurrencies((cs) => cs.map((x, i) => (i === idx ? { ...x, rate: parseFloat(e.target.value) || 0 } : x)))
                    }
                    className="h-9 w-28"
                    aria-label={`${t("p.lc.rate")} ${c.code}`}
                  />
                )}
                <span className="text-xs text-ink-faint">{t("p.lc.rate")}</span>
                {c.code !== accounting ? (
                  <button
                    type="button"
                    onClick={() => setCurrencies((cs) => cs.filter((x) => x.code !== c.code))}
                    aria-label={t("p.ship.delete")}
                    className="rounded-lg p-1.5 text-ink-faint hover:bg-rose-50 hover:text-rose-600"
                  >
                    <TrashSimple size={14} />
                  </button>
                ) : null}
              </div>
            ))}
            {available.length > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrencies((cs) => [...cs, { code: available[0], rate: 1 }])}
              >
                <Plus size={13} />
                {t("p.lc.addCurrency")}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <p className="text-sm font-semibold text-ink">{t("p.lc.ownerLang")}</p>
        <div className="mt-3 flex gap-2">
          {(["zh", "en"] as LocaleCode[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setOwnerLocale(l)}
              className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                ownerLocale === l ? "bg-pine-700 text-white" : "border border-line bg-white text-ink-soft hover:text-ink"
              }`}
            >
              {l === "zh" ? t("p.lc.zh") : t("p.lc.en")}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save}>{t("p.set.save")}</Button>
      </div>
    </div>
  );
}
