"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageSquare } from "@phosphor-icons/react/dist/ssr";
import { Button, Card, Field, Input } from "@/components/ui";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import { pickText, type Flavor } from "@/lib/types";

/** 店铺资料：店名、标志、小图标、页脚、备案号。改一次，页眉、结账、邮件预览一起变。 */
export default function ProfileSettings({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const locale = useLocale(f, "portal");
  const saveSettings = useShop((s) => s.saveSettings);
  const toast = useShop((s) => s.toast);

  const [form, setForm] = useState({
    name: st.settings.name,
    logoUrl: st.settings.logoUrl ?? "",
    faviconUrl: st.settings.faviconUrl ?? "",
    contactEmail: st.settings.contactEmail ?? "",
    footerLine: st.settings.footerLine ?? "",
    icp: st.settings.icp ?? "",
    policeRecord: st.settings.policeRecord ?? "",
    policeBadgeUrl: st.settings.policeBadgeUrl ?? "",
  });
  const logoInput = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);
  const badgeInput = useRef<HTMLInputElement>(null);

  const readImage = (file: File, cb: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result));
    reader.readAsDataURL(file);
  };

  const emptyPolicies = st.policies.filter((p) => !pickText(p.body, st.settings.primaryLocale, st.settings.primaryLocale).trim());

  const save = () => {
    saveSettings(f, {
      name: form.name.trim() || st.settings.name,
      logoUrl: form.logoUrl || undefined,
      faviconUrl: form.faviconUrl || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      footerLine: form.footerLine.trim() || undefined,
      ...(f === "cn"
        ? {
            icp: form.icp.trim() || undefined,
            policeRecord: form.policeRecord.trim() || undefined,
            policeBadgeUrl: form.policeBadgeUrl || undefined,
          }
        : {}),
    });
    toast(t("p.set.saved"));
  };

  return (
    <div className="max-w-2xl space-y-5">
      {emptyPolicies.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">{t("p.set.policyTipTitle")}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-amber-800/90">
            {t("p.set.policyTipBody")}（
            {emptyPolicies.map((p) => pickText(p.title, locale, st.settings.primaryLocale)).join("、")}）
          </p>
          <Link href={`/${f}/portal/pages`} className="mt-2 inline-block text-[13px] font-medium text-amber-900 underline-offset-4 hover:underline">
            {t("p.home.goWrite")} →
          </Link>
        </div>
      ) : null}

      <Card className="space-y-5 p-5 sm:p-6">
        <Field label={t("p.set.name")} hint={t("p.set.nameHint")}>
          <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">{t("p.set.logo")}</p>
          <div className="flex flex-wrap items-center gap-3">
            {form.logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logoUrl} alt="logo" className="h-10 w-auto max-w-[180px] rounded-md border border-line bg-white object-contain p-1" />
                <Button size="sm" variant="secondary" onClick={() => setForm((s) => ({ ...s, logoUrl: "" }))}>
                  {t("p.set.logoRemove")}
                </Button>
              </>
            ) : (
              <>
                <span className="text-[15px] font-bold text-ink">{form.name || "我的店"}</span>
                <Button size="sm" variant="secondary" onClick={() => logoInput.current?.click()}>
                  <ImageSquare size={14} />
                  {t("p.set.logoUpload")}
                </Button>
              </>
            )}
            <input
              ref={logoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readImage(file, (url) => setForm((s) => ({ ...s, logoUrl: url })));
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">{t("p.set.favicon")}</p>
          <div className="flex flex-wrap items-center gap-3">
            {form.faviconUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.faviconUrl} alt="favicon" className="h-8 w-8 rounded-md border border-line object-contain" />
                <Button size="sm" variant="secondary" onClick={() => setForm((s) => ({ ...s, faviconUrl: "" }))}>
                  {t("p.set.logoRemove")}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => faviconInput.current?.click()}>
                {t("p.set.faviconUpload")}
              </Button>
            )}
            <input
              ref={faviconInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/x-icon"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readImage(file, (url) => setForm((s) => ({ ...s, faviconUrl: url })));
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{t("p.set.faviconHint")}</p>
        </div>

        <Field label={t("p.set.contactEmail")} hint={t("p.set.contactEmailHint")}>
          <Input type="email" value={form.contactEmail} onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))} />
        </Field>

        <Field label={t("p.set.footerLine")} hint={t("p.set.footerLineHint")}>
          <Input value={form.footerLine} onChange={(e) => setForm((s) => ({ ...s, footerLine: e.target.value }))} />
        </Field>

        {f === "cn" ? (
          <div className="space-y-5 rounded-xl bg-mist/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">备案（仅国内站）</p>
            <Field label={t("p.set.icp")} hint={t("p.set.icpHint")}>
              <Input value={form.icp} onChange={(e) => setForm((s) => ({ ...s, icp: e.target.value }))} placeholder="京ICP备XXXXXXXX号-X" />
            </Field>
            <Field label={t("p.set.police")} hint={t("p.set.policeHint")}>
              <Input value={form.policeRecord} onChange={(e) => setForm((s) => ({ ...s, policeRecord: e.target.value }))} />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">{t("p.set.policeBadge")}</p>
              <div className="flex flex-wrap items-center gap-3">
                {form.policeBadgeUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.policeBadgeUrl} alt="" className="h-8 w-8 object-contain" />
                    <Button size="sm" variant="secondary" onClick={() => setForm((s) => ({ ...s, policeBadgeUrl: "" }))}>
                      {t("p.set.logoRemove")}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => badgeInput.current?.click()}>
                    {t("p.set.policeBadgeUpload")}
                  </Button>
                )}
                <input
                  ref={badgeInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readImage(file, (url) => setForm((s) => ({ ...s, policeBadgeUrl: url })));
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end border-t border-line-soft pt-4">
          <Button onClick={save}>{t("p.set.save")}</Button>
        </div>
      </Card>
    </div>
  );
}
