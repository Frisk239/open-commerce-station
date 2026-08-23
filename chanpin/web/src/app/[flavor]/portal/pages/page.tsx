"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { Badge, Button, Card, Textarea } from "@/components/ui";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import { pickText, POLICY_SLUGS, type Flavor, type PolicySlug } from "@/lib/types";

/** 四篇说明：隐私、服务条款、退货、运费。按开启的语言各写一份，空着回退主语言。 */
export default function PortalPages({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const locale = useLocale(f, "portal");
  const savePolicy = useShop((s) => s.savePolicy);
  const toast = useShop((s) => s.toast);

  const [slug, setSlug] = useState<PolicySlug>("returns");
  const policy = st.policies.find((p) => p.slug === slug)!;
  const primary = st.settings.primaryLocale;
  const second = st.settings.locales.find((l) => l !== primary) ?? null;

  const [bodyP, setBodyP] = useState(policy.body[primary] ?? "");
  const [bodyS, setBodyS] = useState(second ? (policy.body[second] ?? "") : "");
  const [dirty, setDirty] = useState(false);

  const switchTo = (next: PolicySlug) => {
    setSlug(next);
    const p = st.policies.find((x) => x.slug === next)!;
    setBodyP(p.body[primary] ?? "");
    setBodyS(second ? (p.body[second] ?? "") : "");
    setDirty(false);
  };

  const localeName = (l: string) => (l === "zh" ? "中文" : "English");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{t("p.navPages")}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">{t("p.pages.hint")}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {POLICY_SLUGS.map((s) => {
          const p = st.policies.find((x) => x.slug === s)!;
          const empty = !pickText(p.body, primary, primary).trim();
          return (
            <button
              key={s}
              type="button"
              onClick={() => switchTo(s)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors ${
                slug === s ? "bg-pine-700 text-white" : "border border-line bg-white text-ink-soft hover:text-ink"
              }`}
            >
              {pickText(p.title, locale, primary)}
              {empty ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    slug === s ? "bg-white/20 text-white" : "bg-mist text-ink-faint"
                  }`}
                >
                  {t("p.pages.emptyTag")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Card className="space-y-4 p-5">
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">
            {t("p.pages.body")} · {localeName(primary)}
            <span className="ml-2 text-xs font-normal text-ink-faint">{t("p.pages.primaryTag")}</span>
          </p>
          <Textarea
            rows={8}
            value={bodyP}
            onChange={(e) => {
              setBodyP(e.target.value);
              setDirty(true);
            }}
          />
        </div>
        {second ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">
              {t("p.pages.body")} · {localeName(second)}
            </p>
            <Textarea
              rows={6}
              value={bodyS}
              onChange={(e) => {
                setBodyS(e.target.value);
                setDirty(true);
              }}
              placeholder={bodyP}
            />
            <p className="mt-1.5 text-xs text-ink-faint">{t("p.lc.localesHint")}</p>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          {bodyP.trim() === "" ? <Badge tone="amber">{t("p.pages.emptyTag")}</Badge> : <span />}
          <Button
            onClick={() => {
              savePolicy(f, slug, {
                [primary]: bodyP.trim(),
                ...(second ? { [second]: bodyS.trim() } : {}),
              } as { zh?: string; en?: string });
              setDirty(false);
              toast(t("p.pages.saved"));
            }}
          >
            {t("p.pages.save")}
          </Button>
        </div>
        {dirty ? <p className="text-xs text-amber-700" /> : null}
      </Card>
    </div>
  );
}
