"use client";

import type { ReactNode } from "react";
import { OWNER_EMAIL } from "@/mock/seed";
import { useShop } from "@/mock/store";
import { useLocale, useMoney, useT } from "@/lib/hooks";
import { pickText, type Flavor, type Order } from "@/lib/types";

export type MailType = "paid" | "shipped" | "newOrder";

/**
 * 三封通知信的预览（原型不真发）。信头用店名或标志，与页眉、结账顶栏同一来源。
 */
export function MailPreview({
  flavor,
  order,
  type,
  mode = "shop",
  label,
}: {
  flavor: Flavor;
  order: Order;
  type: MailType;
  mode?: "shop" | "portal";
  label?: ReactNode;
}) {
  const s = useShop((st) => st.flavors[flavor].settings);
  const t = useT(flavor, mode === "portal" ? "portal" : "shop");
  const locale = useLocale(flavor, mode === "portal" ? "portal" : "shop");
  const fmt = useMoney(flavor, mode === "portal" ? "portal" : "shop");
  const colon = locale === "zh" ? "：" : ": ";

  const subjectKey = type === "paid" ? "mail.paidSubject" : type === "shipped" ? "mail.shippedSubject" : "mail.newOrderSubject";
  const bodyKey = type === "paid" ? "mail.paidBody" : type === "shipped" ? "mail.shippedBody" : "mail.newOrderBody";
  const to = type === "newOrder" ? OWNER_EMAIL : order.shopperEmail;

  const body = (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line bg-mist px-5 py-4">
        {s.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.logoUrl} alt={s.name} className="h-7 w-auto max-w-[140px] object-contain" />
        ) : (
          <span className="text-[15px] font-bold text-ink">{s.name}</span>
        )}
      </div>
      <div className="space-y-4 px-5 py-5 text-sm">
        <p className="text-xs text-ink-faint">
          {t("mail.to")}: {to}
        </p>
        <p className="font-semibold text-ink">
          {t(subjectKey)}
          {colon}
          <span className="font-mono">{order.number}</span>
        </p>
        <p className="leading-relaxed text-ink-soft">{t(bodyKey)}</p>

        <div className="rounded-lg border border-line-soft">
          {order.lines.map((l) => (
            <div key={l.variantId} className="flex items-center gap-3 border-b border-line-soft px-3.5 py-2.5 last:border-b-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.image} alt="" className="h-10 w-10 rounded-md object-cover" />
              <p className="flex-1 text-ink">
                {l.name}
                {l.variantLabel ? <span className="text-ink-soft"> · {l.variantLabel}</span> : null}
                <span className="text-ink-soft"> ×{l.qty}</span>
              </p>
              <p className="text-ink-soft">{fmt(l.price * l.qty)}</p>
            </div>
          ))}
          <div className="space-y-1 px-3.5 py-2.5 text-xs text-ink-soft">
            <p className="flex justify-between">
              <span>{t("checkout.subtotal")}</span>
              <span>{fmt(order.subtotal)}</span>
            </p>
            {order.discountOff > 0 ? (
              <p className="flex justify-between">
                <span>
                  {t("checkout.discount")} {order.discountCode}
                </span>
                <span>-{fmt(order.discountOff)}</span>
              </p>
            ) : null}
            <p className="flex justify-between">
              <span>
                {t("checkout.shippingFee")} · {order.shippingName}
              </span>
              <span>{order.shippingPrice === 0 ? (locale === "zh" ? "免邮" : "Free") : fmt(order.shippingPrice)}</span>
            </p>
            <p className="flex justify-between pt-1 text-sm font-semibold text-ink">
              <span>{t("mail.totalPaid")}</span>
              <span>{fmt(order.total)}</span>
            </p>
          </div>
        </div>

        {type === "shipped" && order.tracking ? (
          <p className="text-ink">
            {t("mail.tracking")}
            {colon}
            <span className="font-mono font-semibold">{order.tracking}</span>
          </p>
        ) : null}

        <p className="border-t border-line-soft pt-3 text-xs text-ink-faint">
          © {s.name} · {pickText({ zh: "这是一封演示预览，没有真的发出。", en: "This is a preview email. Nothing was really sent." }, locale, s.primaryLocale)}
        </p>
      </div>
    </div>
  );

  if (label) {
    return (
      <details className="group">
        <summary className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium text-pine-700 hover:bg-pine-50">
          {label}
        </summary>
        <div className="mt-3">{body}</div>
      </details>
    );
  }
  return body;
}
