"use client";

import Link from "next/link";
import { ArrowRight, Storefront, Gear } from "@phosphor-icons/react/dist/ssr";
import { useShop } from "@/mock/store";
import { pic } from "@/lib/img";
import { t } from "@/lib/i18n";
import { cn } from "@/components/ui";
import type { Flavor } from "@/lib/types";

/** 选站页：漂亮、短，不是安装向导。每张卡可在「演示店 / 空白店」之间切换。 */
export default function ChoosePage() {
  const empty = useShop((s) => s.ui.empty);
  const setEmpty = useShop((s) => s.setEmpty);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <title>Open Commerce Station</title>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine-700">Open Commerce Station</p>
      <h1 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {t("zh", "choose.title")}
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">{t("zh", "choose.sub")}</p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {(["cn", "global"] as Flavor[]).map((f) => (
          <FlavorCard key={f} flavor={f} empty={empty[f]} onToggle={(v) => setEmpty(f, v)} />
        ))}
      </div>

      <p className="mt-10 text-sm text-ink-soft">{t("zh", "choose.accounts")}</p>
    </main>
  );
}

function FlavorCard({
  flavor,
  empty,
  onToggle,
}: {
  flavor: Flavor;
  empty: boolean;
  onToggle: (v: boolean) => void;
}) {
  const zh = flavor === "cn";
  const seed = zh ? "shimu-hero-room-9" : "np-hero-room-7";
  const title = zh ? t("zh", "choose.cn") : t("zh", "choose.global");
  const sub = zh ? t("zh", "choose.cnSub") : t("zh", "choose.globalSub");

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pic(seed, 1200, 750)} alt="" className="photo aspect-[16/10] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-white/85">{sub}</p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${flavor}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-pine-700 px-4 text-sm font-medium text-white transition-colors hover:bg-pine-800"
          >
            <Storefront size={16} />
            {t("zh", "choose.enter")}
            <ArrowRight size={14} />
          </Link>
          <Link
            href={`/${flavor}/portal`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-mist"
          >
            <Gear size={16} />
            {t("zh", "choose.enterPortal")}
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-4">
          <div className="inline-flex rounded-lg border border-line bg-mist p-0.5 text-[13px]">
            <button
              type="button"
              onClick={() => onToggle(false)}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                !empty ? "bg-white text-ink shadow-sm" : "text-ink-soft",
              )}
            >
              {t("zh", "choose.demoMode")}
            </button>
            <button
              type="button"
              onClick={() => onToggle(true)}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                empty ? "bg-white text-ink shadow-sm" : "text-ink-soft",
              )}
            >
              {t("zh", "choose.emptyPreview")}
            </button>
          </div>
          {empty ? <p className="text-xs text-ink-faint">{t("zh", "choose.emptyHint")}</p> : null}
        </div>
      </div>
    </section>
  );
}
