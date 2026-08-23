"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { pickText, type Flavor, type PolicySlug } from "@/lib/types";

/** 四篇固定说明：隐私、服务条款、退货、运费。空正文显示「店主尚未填写」，不挡任何流程。 */
export default function PolicyPage({ params }: { params: Promise<{ flavor: string; slug: string }> }) {
  const { flavor, slug } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();

  const validSlugs: PolicySlug[] = ["privacy", "terms", "returns", "shipping"];
  if (!validSlugs.includes(slug as PolicySlug)) notFound();
  const f = flavor as Flavor;

  const st = useFlavorState(f);
  const locale = useLocale(f);
  const t = useT(f);
  const policy = st.policies.find((p) => p.slug === slug);
  if (!policy) notFound();

  const title = pickText(policy.title, locale, st.settings.primaryLocale);
  const body = pickText(policy.body, locale, st.settings.primaryLocale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      <div className="mt-4 border-t border-line pt-6">
        {body ? (
          <p className="whitespace-pre-line text-[15px] leading-8 text-ink-soft">{body}</p>
        ) : (
          <p className="rounded-xl bg-mist px-5 py-8 text-center text-sm text-ink-faint">{t("pages.empty")}</p>
        )}
      </div>
    </div>
  );
}
