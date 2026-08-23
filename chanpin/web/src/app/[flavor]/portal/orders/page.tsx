"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, EmptyBlock } from "@/components/ui";
import { Money } from "@/components/money";
import { orderStatusText } from "@/lib/chat-engine";
import { useFlavorState, useLocale, useT } from "@/lib/hooks";
import type { Flavor, Order } from "@/lib/types";

function tone(o: Order) {
  if (o.returnStatus === "refunded") return "neutral" as const;
  if (o.returnStatus === "requested" || o.returnStatus === "waiting_goods") return "amber" as const;
  if (o.status === "shipped") return "sky" as const;
  return "pine" as const;
}

export default function PortalOrders({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const locale = useLocale(f, "portal");

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-ink">{t("p.navOrders")}</h1>

      {st.orders.length === 0 ? (
        <Card className="mt-6">
          <EmptyBlock title={t("p.orders.empty")} />
        </Card>
      ) : (
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-faint">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">{t("p.orders.buyer")}</th>
                <th className="px-3 py-3 font-medium">{t("p.orders.items")}</th>
                <th className="px-3 py-3 font-medium">{t("p.orders.payment")}</th>
                <th className="px-3 py-3 font-medium">{t("p.orders.status")}</th>
                <th className="px-3 py-3 text-right font-medium">{t("p.orders.total")}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {st.orders.map((o) => (
                <tr key={o.id} className="border-b border-line-soft last:border-b-0 hover:bg-mist/50">
                  <td className="px-5 py-3.5">
                    <Link href={`/${f}/portal/orders/${o.id}`} className="font-mono font-semibold text-pine-700 hover:underline">
                      {o.number}
                    </Link>
                    <p className="text-xs text-ink-faint">{o.createdAt}</p>
                  </td>
                  <td className="px-3 py-3.5 text-ink-soft">{o.shopperEmail}</td>
                  <td className="max-w-56 truncate px-3 py-3.5 text-ink-soft">
                    {o.lines.map((l) => `${l.name}×${l.qty}`).join(", ")}
                  </td>
                  <td className="px-3 py-3.5 text-ink-soft">
                    {o.method === "alipay" ? "Alipay" : o.method === "paypal" ? "PayPal" : "Stripe"}
                  </td>
                  <td className="px-3 py-3.5">
                    <Badge tone={tone(o)}>{orderStatusText(o, locale)}</Badge>
                    {o.returnStatus === "requested" ? (
                      <span className="ml-1.5 text-xs text-amber-700">{t("p.orders.returnBadge")}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3.5 text-right font-medium text-ink">
                    <Money flavor={f} minor={o.total} mode="portal" />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/${f}/portal/orders/${o.id}`} className="text-xs text-pine-700 hover:underline">
                      {t("p.orders.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
