"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Badge, Button, Card, Input } from "@/components/ui";
import { Money } from "@/components/money";
import { MailPreview } from "@/components/storefront/MailPreview";
import { orderStatusText } from "@/lib/chat-engine";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { Flavor } from "@/lib/types";

/**
 * 订单详情：发货填运单号；退货申请在这里同意 / 拒绝。
 * 未发货同意 = 立即退款；已发货同意 = 等顾客寄回，收到货再完成退款。
 */
export default function PortalOrderDetail({ params }: { params: Promise<{ flavor: string; id: string }> }) {
  const { flavor, id } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;

  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const locale = useLocale(f, "portal");
  const markShipped = useShop((s) => s.markShipped);
  const decideReturn = useShop((s) => s.decideReturn);
  const confirmReceived = useShop((s) => s.confirmReturnReceived);
  const toast = useShop((s) => s.toast);

  const [tracking, setTracking] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const order = st.orders.find((o) => o.id === id);
  if (!order) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-soft">{t("p.order.notFound")}</p>
        <Link href={`/${f}/portal/orders`} className="mt-3 inline-block text-sm text-pine-700 hover:underline">
          ← {t("p.navOrders")}
        </Link>
      </div>
    );
  }
  const o = order;
  const rs = o.returnStatus;
  const tone = rs === "refunded" ? "neutral" : rs === "requested" || rs === "waiting_goods" ? "amber" : o.status === "shipped" ? "sky" : "pine";

  return (
    <div className="space-y-5">
      <Link href={`/${f}/portal/orders`} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft size={14} />
        {t("p.navOrders")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold text-ink">{o.number}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {o.shopperEmail} · {o.createdAt} · {o.method === "alipay" ? "Alipay" : o.method === "paypal" ? "PayPal" : "Stripe"}
          </p>
        </div>
        <Badge tone={tone as "neutral"}>{orderStatusText(o, locale)}</Badge>
      </div>

      {/* 发货 */}
      {o.status === "paid" && rs !== "refunded" ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">{t("p.order.shipTitle")}</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder={t("p.order.trackingPh")}
              className="max-w-xs"
            />
            <Button
              disabled={!tracking.trim()}
              onClick={() => {
                markShipped(f, o.id, tracking.trim());
                toast(t("p.order.shippedAt") + " " + tracking.trim());
              }}
            >
              {t("p.order.markShipped")}
            </Button>
          </div>
        </Card>
      ) : null}
      {o.status === "shipped" ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">{t("p.order.shipTitle")}</p>
          <p className="mt-2 text-sm text-ink">
            {t("order.tracking")}：<span className="font-mono font-semibold">{o.tracking}</span>
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {t("p.order.shippedAt")} {o.shippedAt}
          </p>
          <div className="mt-3">
            <MailPreview flavor={f} order={o} type="shipped" mode="portal" label={t("p.order.mailShipped")} />
          </div>
        </Card>
      ) : null}

      {/* 退货申请 */}
      {rs === "requested" ? (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">{t("p.order.returnCardTitle")}</p>
            <Badge tone="amber">{t("p.order.requestedTag")}</Badge>
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            {t("p.order.returnReason")}：{o.returnReason}
          </p>
          <p className="mt-2 rounded-lg bg-mist px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-soft">
            {o.status === "paid" ? t("p.order.approveUnshippedNote") : t("p.order.approveShippedNote")}
          </p>
          {rejectOpen ? (
            <div className="mt-3.5 space-y-2.5">
              <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={t("p.order.rejectNotePh")} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    decideReturn(f, o.id, false, rejectNote.trim());
                    setRejectOpen(false);
                  }}
                >
                  {t("p.order.reject")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRejectOpen(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => decideReturn(f, o.id, true)}>
                {t("p.order.approve")}
              </Button>
              <Button size="sm" variant="danger" onClick={() => setRejectOpen(true)}>
                {t("p.order.reject")}
              </Button>
            </div>
          )}
        </Card>
      ) : null}
      {rs === "waiting_goods" ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{t("p.order.returnCardTitle")}</p>
              <p className="mt-1 text-[13px] text-ink-soft">{t("p.order.waitingGoodsTag")} · {t("p.order.approveShippedNote")}</p>
            </div>
            <Button size="sm" onClick={() => confirmReceived(f, o.id)}>
              {t("p.order.confirmRefund")}
            </Button>
          </div>
        </Card>
      ) : null}
      {rs === "refunded" ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">
            {t("p.order.returnCardTitle")} · <Badge tone="neutral">{t("p.order.refundedTag")}</Badge>
          </p>
        </Card>
      ) : null}
      {rs === "rejected" ? (
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">
            {t("p.order.returnCardTitle")} · <Badge tone="neutral">{t("p.order.rejectedTag")}</Badge>
          </p>
          {o.returnNote ? <p className="mt-2 text-[13px] text-ink-soft">{o.returnNote}</p> : null}
        </Card>
      ) : null}

      {/* 明细 */}
      <Card className="overflow-x-auto">
        <p className="border-b border-line-soft px-5 py-3 text-sm font-semibold text-ink">{t("p.order.linesTitle")}</p>
        {o.lines.map((l) => (
          <div key={l.variantId} className="flex items-center gap-3.5 border-b border-line-soft px-5 py-3 last:border-b-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.image} alt="" className="photo h-12 w-10 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{l.name}</p>
              <p className="text-xs text-ink-soft">
                {l.variantLabel || "-"} ×{l.qty}
              </p>
            </div>
            <p className="text-sm text-ink">
              <Money flavor={f} minor={l.price * l.qty} mode="portal" />
            </p>
          </div>
        ))}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">{t("p.order.addressTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {o.address.name} · {o.address.phone}
            <br />
            {o.address.region ? `${o.address.region} ` : ""}
            {o.address.city ? `${o.address.city} ` : ""}
            {o.address.line1}
            {o.address.line2 ? ` ${o.address.line2}` : ""}
            {o.address.zip ? ` ${o.address.zip}` : ""}
            <br />
            {o.address.country}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">{t("p.order.moneyTitle")}</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <p className="flex justify-between text-ink-soft">
              <span>{t("p.order.subtotal")}</span>
              <Money flavor={f} minor={o.subtotal} mode="portal" />
            </p>
            {o.discountOff > 0 ? (
              <p className="flex justify-between text-pine-700">
                <span>
                  {t("p.order.discount")} {o.discountCode}
                </span>
                <span>
                  -<Money flavor={f} minor={o.discountOff} mode="portal" />
                </span>
              </p>
            ) : null}
            <p className="flex justify-between text-ink-soft">
              <span>
                {t("p.order.shippingFee")} · {o.shippingName}
              </span>
              <span>
                {o.shippingPrice === 0 ? (locale === "zh" ? "免邮" : "Free") : <Money flavor={f} minor={o.shippingPrice} mode="portal" />}
              </span>
            </p>
            <p className="flex justify-between border-t border-line-soft pt-1.5 text-base font-semibold text-ink">
              <span>{t("p.order.total")}</span>
              <Money flavor={f} minor={o.total} mode="portal" />
            </p>
          </div>
        </Card>
      </div>

      <div className="space-y-3 pb-4">
        <MailPreview flavor={f} order={o} type="paid" mode="portal" label={t("p.order.mailPaid")} />
        <MailPreview flavor={f} order={o} type="newOrder" mode="portal" label={t("p.order.mailNewOrder")} />
      </div>
    </div>
  );
}
