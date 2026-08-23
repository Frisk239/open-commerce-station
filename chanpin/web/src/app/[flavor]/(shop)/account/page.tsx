"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package } from "@phosphor-icons/react/dist/ssr";
import { Badge, EmptyBlock } from "@/components/ui";
import { Money } from "@/components/money";
import { orderStatusText } from "@/lib/chat-engine";
import { useFlavorState, useLocale, useSession, useT } from "@/lib/hooks";
import type { Flavor, Order } from "@/lib/types";

function statusTone(o: Order) {
  if (o.returnStatus === "refunded") return "neutral" as const;
  if (o.returnStatus === "requested" || o.returnStatus === "waiting_goods") return "amber" as const;
  if (o.status === "shipped") return "sky" as const;
  return "pine" as const;
}

export default function AccountPage({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;

  const st = useFlavorState(f);
  const session = useSession(f);
  const locale = useLocale(f);
  const t = useT(f);

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

  const orders = st.orders.filter((o) => o.shopperEmail === session.shopperEmail);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t("account.title")}</h1>

      {orders.length === 0 ? (
        <EmptyBlock icon={<Package size={36} />} title={t("account.empty")} />
      ) : (
        <div className="mt-8 space-y-3.5">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/${f}/account/orders/${o.id}`}
              className="block rounded-xl border border-line bg-white p-4 transition-colors hover:border-ink/25 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold text-ink">{o.number}</p>
                <Badge tone={statusTone(o)}>{orderStatusText(o, locale)}</Badge>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-ink-soft">
                  {o.lines.map((l) => `${l.name}×${l.qty}`).join(", ")}
                </p>
                <p className="font-medium text-ink">
                  <Money flavor={f} minor={o.total} />
                </p>
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">
                {t("account.placedAt")}: {o.createdAt}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
