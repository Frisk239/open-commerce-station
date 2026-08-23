"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, ArrowCounterClockwise, ChatCircleDots, Plus } from "@phosphor-icons/react/dist/ssr";
import { Badge, Button, Card } from "@/components/ui";
import { Money } from "@/components/money";
import { MailPreview } from "@/components/storefront/MailPreview";
import { orderStatusText } from "@/lib/chat-engine";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import { pickText, type Flavor, type Order } from "@/lib/types";

function statusTone(o: Order) {
  if (o.returnStatus === "refunded") return "neutral" as const;
  if (o.returnStatus === "requested" || o.returnStatus === "waiting_goods") return "amber" as const;
  if (o.status === "shipped") return "sky" as const;
  return "pine" as const;
}

export default function PortalHome({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;

  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const locale = useLocale(f, "portal");
  const empty = useShop((s) => s.ui.empty[f]);
  const setEmpty = useShop((s) => s.setEmpty);

  const toShip = st.orders.filter((o) => o.status === "paid" && !o.returnStatus);
  const toReturn = st.orders.filter((o) => o.returnStatus === "requested");
  const unread = st.threads.filter((x) => x.unread);
  const emptyPolicies = st.policies.filter((p) => !pickText(p.body, st.settings.primaryLocale, st.settings.primaryLocale).trim());
  const newestPaid = st.orders.find((o) => o.status === "paid");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-ink">{st.settings.name}</h1>

      {/* 今日待办 */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        <Link href={`/${f}/portal/orders`} className="group rounded-xl border border-line bg-white p-5 transition-colors hover:border-pine-400">
          <div className="flex items-center justify-between text-ink-soft">
            <p className="text-sm">{t("p.home.toShip")}</p>
            <Package size={17} />
          </div>
          <p className="mt-2 text-3xl font-bold text-ink">{toShip.length}</p>
        </Link>
        <Link href={`/${f}/portal/orders`} className="group rounded-xl border border-line bg-white p-5 transition-colors hover:border-pine-400">
          <div className="flex items-center justify-between text-ink-soft">
            <p className="text-sm">{t("p.home.toReturn")}</p>
            <ArrowCounterClockwise size={17} />
          </div>
          <p className="mt-2 text-3xl font-bold text-ink">{toReturn.length}</p>
        </Link>
        <Link href={`/${f}/portal/inbox`} className="group rounded-xl border border-line bg-white p-5 transition-colors hover:border-pine-400">
          <div className="flex items-center justify-between text-ink-soft">
            <p className="text-sm">{t("p.home.unreadChat")}</p>
            <ChatCircleDots size={17} />
          </div>
          <p className="mt-2 text-3xl font-bold text-ink">{unread.length}</p>
        </Link>
      </div>

      {toShip.length === 0 && toReturn.length === 0 && unread.length === 0 ? (
        <Card>
          <p className="px-5 py-6 text-center text-sm text-ink-soft">{t("p.home.allClear")}</p>
        </Card>
      ) : null}

      {/* 最新订单 */}
      <Card>
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
          <p className="text-sm font-semibold text-ink">{t("p.home.latestOrders")}</p>
          <Link href={`/${f}/portal/orders`} className="text-xs text-pine-700 hover:underline">
            {t("p.navOrders")} →
          </Link>
        </div>
        {st.orders.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-ink-soft">{t("p.orders.empty")}</p>
        ) : (
          st.orders.slice(0, 5).map((o) => (
            <Link
              key={o.id}
              href={`/${f}/portal/orders/${o.id}`}
              className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-3 last:border-b-0 hover:bg-mist/60"
            >
              <div className="min-w-0">
                <p className="font-mono text-[13px] font-semibold text-ink">{o.number}</p>
                <p className="truncate text-xs text-ink-soft">
                  {o.shopperEmail} · {o.createdAt}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge tone={statusTone(o)}>{orderStatusText(o, locale)}</Badge>
                <p className="text-sm font-medium text-ink">
                  <Money flavor={f} minor={o.total} mode="portal" />
                </p>
              </div>
            </Link>
          ))
        )}
      </Card>

      {/* 说明页提醒 */}
      {emptyPolicies.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm text-amber-900">
            {t("p.home.policyTip")}
            {emptyPolicies.map((p) => pickText(p.title, locale, st.settings.primaryLocale)).join("、")}
          </p>
          <Link href={`/${f}/portal/pages`}>
            <Button size="sm" variant="secondary">
              {t("p.home.goWrite")}
            </Button>
          </Link>
        </div>
      ) : null}

      {/* 来单邮件预览 */}
      {newestPaid ? (
        <div>
          <p className="mb-2.5 text-sm font-semibold text-ink">{t("p.home.newOrderMail")}</p>
          <MailPreview flavor={f} order={newestPaid} type="newOrder" mode="portal" label={t("p.order.mailNewOrder")} />
        </div>
      ) : null}

      {/* 原型数据切换 */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{t("p.home.demoData")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{t("p.home.demoDataHint")}</p>
          </div>
          <Button variant={empty ? "primary" : "secondary"} size="sm" onClick={() => setEmpty(f, !empty)}>
            {empty ? t("p.home.toDemoData") : t("p.home.toDemoEmpty")}
          </Button>
        </div>
        {st.products.length === 0 ? (
          <Link href={`/${f}/portal/products/new`} className="mt-4 inline-flex items-center gap-1 text-sm text-pine-700 hover:underline">
            <Plus size={14} />
            {t("p.products.new")}
          </Link>
        ) : null}
      </Card>
    </div>
  );
}
