"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { Badge, Card, Toggle } from "@/components/ui";
import { useFlavorState, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { Flavor } from "@/lib/types";

/** 收款：国内支付宝 + 灰色微信（稍后开放）；出海 PayPal / Stripe。原型全是假按钮。 */
export default function PaymentsSettings({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const saveSettings = useShop((s) => s.saveSettings);
  const toast = useShop((s) => s.toast);

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm leading-relaxed text-ink-soft">{t("p.pay.hint")}</p>

      <Card className="divide-y divide-line-soft">
        {f === "cn" ? (
          <>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-ink">{t("p.pay.alipay")}</p>
                <p className="mt-0.5 text-xs text-ink-soft">Alipay · 电脑网站支付 / 手机网站支付</p>
              </div>
              <Toggle
                on={st.settings.payments.alipay}
                onChange={(next) => {
                  saveSettings(f, { payments: { ...st.settings.payments, alipay: next } });
                  toast(t("p.set.saved"));
                }}
                label={t("p.pay.alipay")}
              />
            </div>
            <div className="flex items-center justify-between px-5 py-4 opacity-60">
              <div>
                <p className="text-sm font-semibold text-ink">{t("p.pay.wechat")}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{t("p.pay.wechatSoon")}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <Badge tone="neutral">{t("checkout.wechatSoon")}</Badge>
                <Toggle on={false} onChange={() => {}} disabled label={t("p.pay.wechat")} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-ink">{t("p.pay.paypal")}</p>
                <p className="mt-0.5 text-xs text-ink-soft">PayPal Checkout</p>
              </div>
              <Toggle
                on={st.settings.payments.paypal}
                onChange={(next) => {
                  saveSettings(f, { payments: { ...st.settings.payments, paypal: next } });
                  toast(t("p.set.saved"));
                }}
                label={t("p.pay.paypal")}
              />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-ink">{t("p.pay.stripe")}</p>
                <p className="mt-0.5 text-xs text-ink-soft">Stripe PaymentIntent · 信用卡</p>
              </div>
              <Toggle
                on={st.settings.payments.stripe}
                onChange={(next) => {
                  saveSettings(f, { payments: { ...st.settings.payments, stripe: next } });
                  toast(t("p.set.saved"));
                }}
                label={t("p.pay.stripe")}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
