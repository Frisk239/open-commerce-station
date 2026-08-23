"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Badge, Button, Card, Textarea } from "@/components/ui";
import { Money } from "@/components/money";
import { MailPreview } from "@/components/storefront/MailPreview";
import { orderStatusText } from "@/lib/chat-engine";
import { useFlavorState, useLocale, useSession, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { Flavor } from "@/lib/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function ShopperOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ flavor: string; id: string }>;
  searchParams: SearchParams;
}) {
  const { flavor, id } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const sp = use(searchParams);
  const justPaid = sp.paid === "1";

  const st = useFlavorState(f);
  const session = useSession(f);
  const locale = useLocale(f);
  const t = useT(f);
  const requestReturn = useShop((s) => s.requestReturn);

  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!session.shopperEmail) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-lg font-medium text-ink">{t("checkout.needLogin")}</p>
        <Link href={`/${f}/login?next=/${f}/account`} className="mt-6 inline-block rounded-lg bg-pine-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-pine-800">
          {t("checkout.loginFirst")}
        </Link>
      </div>
    );
  }

  const order = st.orders.find((o) => o.id === id && o.shopperEmail === session.shopperEmail);
  if (!order) notFound();

  const methodLabel =
    order.method === "alipay" ? "Alipay" : order.method === "paypal" ? "PayPal" : order.method === "stripe" ? "Stripe" : order.method;
  const rs = order.returnStatus;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href={`/${f}/account`} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft size={14} />
        {t("order.backToOrders")}
      </Link>

      {justPaid ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-pine-200 bg-pine-50 p-4 sm:p-5">
          <CheckCircle size={22} className="mt-0.5 shrink-0 text-pine-700" weight="fill" />
          <div>
            <p className="font-semibold text-pine-900">{t("success.title")}</p>
            <p className="mt-0.5 text-sm text-pine-800/80">{t("success.body")}</p>
          </div>
        </div>
      ) : null}

      <header className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold text-ink">{order.number}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {t("account.placedAt")}: {order.createdAt} · {t("order.paymentMethod")}: {methodLabel}
          </p>
        </div>
        <Badge tone={rs === "refunded" ? "neutral" : rs === "requested" || rs === "waiting_goods" ? "amber" : order.status === "shipped" ? "sky" : "pine"}>
          {orderStatusText(order, locale)}
        </Badge>
      </header>

      {/* 状态与运单 */}
      <Card className="mt-6 p-5">
        {order.tracking ? (
          <p className="text-sm text-ink">
            {t("order.tracking")}：<span className="font-mono font-semibold">{order.tracking}</span>
          </p>
        ) : rs !== "refunded" ? (
          <p className="text-sm text-ink-soft">{order.status === "paid" ? t("order.paid") : t("order.shipped")}</p>
        ) : (
          <p className="text-sm text-ink-soft">{t("order.refunded")}</p>
        )}
        {order.shippedAt ? <p className="mt-1 text-xs text-ink-faint">{order.shippedAt}</p> : null}

        {/* 退货 */}
        <div className="mt-4 border-t border-line-soft pt-4">
          {!rs ? (
            reasonOpen ? (
              <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-ink-soft">{t("order.returnHint")}</p>
                <Textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("order.returnReasonPh")}
                  aria-label={t("order.returnReason")}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!reason.trim()}
                    onClick={() => {
                      requestReturn(f, order.id, reason.trim());
                      setReasonOpen(false);
                    }}
                  >
                    {t("order.submitReturn")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReasonOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setReasonOpen(true)}>
                {t("order.requestReturn")}
              </Button>
            )
          ) : null}

          {rs === "requested" ? <p className="text-sm text-amber-700">{t("order.returnRequested")}</p> : null}
          {rs === "waiting_goods" ? (
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">{t("order.returnWaiting")}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-amber-700/90">{t("order.returnSentBack")}</p>
            </div>
          ) : null}
          {rs === "rejected" ? (
            <div>
              <p className="text-sm text-ink-soft">{t("order.returnRejected")}</p>
              {order.returnNote ? <p className="mt-1 rounded-lg bg-mist p-2.5 text-[13px] text-ink-soft">{order.returnNote}</p> : null}
            </div>
          ) : null}
          {rs === "refunded" ? <p className="text-sm text-ink-soft">{t("order.refunded")}</p> : null}
        </div>
      </Card>

      {/* 商品 */}
      <Card className="mt-4 overflow-hidden">
        <p className="border-b border-line-soft px-5 py-3 text-sm font-semibold text-ink">{t("order.linesTitle")}</p>
        {order.lines.map((l) => (
          <div key={l.variantId} className="flex items-center gap-3.5 border-b border-line-soft px-5 py-3.5 last:border-b-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.image} alt="" className="photo h-14 w-11 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{l.name}</p>
              {l.variantLabel ? <p className="text-xs text-ink-soft">{l.variantLabel}</p> : null}
              <p className="text-xs text-ink-faint">×{l.qty}</p>
            </div>
            <p className="text-sm text-ink">
              <Money flavor={f} minor={l.price * l.qty} />
            </p>
          </div>
        ))}
      </Card>

      {/* 地址与金额 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">{t("order.addressTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {order.address.name} · {order.address.phone}
            <br />
            {order.address.region ? `${order.address.region} ` : ""}
            {order.address.city ? `${order.address.city} ` : ""}
            {order.address.line1}
            {order.address.line2 ? ` ${order.address.line2}` : ""}
            {order.address.zip ? ` ${order.address.zip}` : ""}
            <br />
            {order.address.country}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">{t("checkout.summary")}</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <p className="flex justify-between text-ink-soft">
              <span>{t("checkout.subtotal")}</span>
              <Money flavor={f} minor={order.subtotal} />
            </p>
            {order.discountOff > 0 ? (
              <p className="flex justify-between text-pine-700">
                <span>
                  {t("checkout.discount")} {order.discountCode}
                </span>
                <span>
                  -<Money flavor={f} minor={order.discountOff} />
                </span>
              </p>
            ) : null}
            <p className="flex justify-between text-ink-soft">
              <span>
                {t("checkout.shippingFee")} · {order.shippingName}
              </span>
              <span>
                {order.shippingPrice === 0 ? (locale === "zh" ? "免邮" : "Free") : <Money flavor={f} minor={order.shippingPrice} />}
              </span>
            </p>
            <p className="flex justify-between border-t border-line-soft pt-1.5 text-base font-semibold text-ink">
              <span>{t("checkout.total")}</span>
              <Money flavor={f} minor={order.total} />
            </p>
          </div>
        </Card>
      </div>

      {/* 邮件预览：下单成功；已发货再挂已发货信 */}
      <div className="mt-6 space-y-3">
        {justPaid ? (
          <div>
            <p className="mb-2 text-sm font-medium text-ink-soft">{t("success.mailPreview")}</p>
            <MailPreview flavor={f} order={order} type="paid" />
          </div>
        ) : (
          <MailPreview flavor={f} order={order} type="paid" label={t("success.mailPreview")} />
        )}
        {order.status === "shipped" ? (
          <MailPreview flavor={f} order={order} type="shipped" label={t("order.mailShippedPreview")} />
        ) : null}
      </div>
    </div>
  );
}
