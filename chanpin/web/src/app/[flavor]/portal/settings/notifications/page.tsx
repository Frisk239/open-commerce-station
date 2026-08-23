"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { Button, Card, Field, Input } from "@/components/ui";
import { useFlavorState, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { Flavor } from "@/lib/types";

/** SMTP 表单：三封通知信的发出渠道。原型只存表单 + 预览，不真发。 */
export default function MailSettings({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const saveSettings = useShop((s) => s.saveSettings);
  const toast = useShop((s) => s.toast);

  const [smtp, setSmtp] = useState({ ...st.settings.smtp });

  const save = () => {
    saveSettings(f, { smtp });
    toast(t("p.set.saved"));
  };

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm leading-relaxed text-ink-soft">{t("p.mail.hint")}</p>

      <Card className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("p.mail.host")}>
            <Input value={smtp.host} onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))} placeholder="smtp.example.com" />
          </Field>
          <Field label={t("p.mail.port")}>
            <Input value={smtp.port} onChange={(e) => setSmtp((s) => ({ ...s, port: e.target.value }))} placeholder="465" inputMode="numeric" />
          </Field>
          <Field label={t("p.mail.user")}>
            <Input value={smtp.user} onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))} />
          </Field>
          <Field label={t("p.mail.pass")}>
            <Input type="password" value={smtp.pass} onChange={(e) => setSmtp((s) => ({ ...s, pass: e.target.value }))} />
          </Field>
        </div>
        <Field label={t("p.mail.from")}>
          <Input value={smtp.from} onChange={(e) => setSmtp((s) => ({ ...s, from: e.target.value }))} placeholder="notice@yourshop.com" />
        </Field>
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line-soft pt-4">
          <Button
            variant="secondary"
            onClick={() => {
              saveSettings(f, { smtp });
              toast(t("p.mail.testOk"));
            }}
          >
            <PaperPlaneTilt size={14} />
            {t("p.mail.test")}
          </Button>
          <Button onClick={save}>{t("p.set.save")}</Button>
        </div>
      </Card>
    </div>
  );
}
