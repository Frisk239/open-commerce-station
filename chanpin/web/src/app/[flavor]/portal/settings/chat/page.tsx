"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { Card, Toggle } from "@/components/ui";
import { useFlavorState, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { Flavor } from "@/lib/types";

/** 客服开关：同一聊天窗，AI 先答、退款转人工。 */
export default function ChatSettings({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const saveSettings = useShop((s) => s.saveSettings);
  const toast = useShop((s) => s.toast);

  return (
    <div className="max-w-2xl">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">{t("p.chat.enable")}</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-soft">{t("p.chat.hint")}</p>
          </div>
          <Toggle
            on={st.settings.chatEnabled}
            onChange={(next) => {
              saveSettings(f, { chatEnabled: next });
              toast(t("p.set.saved"));
            }}
            label={t("p.chat.enable")}
          />
        </div>
      </Card>
    </div>
  );
}
