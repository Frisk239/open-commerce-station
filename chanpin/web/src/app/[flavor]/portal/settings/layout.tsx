"use client";

import { use, type ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import { useT } from "@/lib/hooks";
import type { DictKey } from "@/lib/i18n";
import type { Flavor } from "@/lib/types";

const TABS: Array<{ slug: string; key: DictKey }> = [
  { slug: "", key: "p.set.profile" },
  { slug: "payments", key: "p.set.payments" },
  { slug: "shipping", key: "p.set.shipping" },
  { slug: "language-currency", key: "p.set.langcur" },
  { slug: "notifications", key: "p.set.mail" },
  { slug: "chat", key: "p.set.chat" },
];

export default function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ flavor: string }>;
}) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const t = useT(f, "portal");
  const pathname = usePathname();

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-ink">{t("p.navSettings")}</h1>
      <nav className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const href = `/${f}/portal/settings${tab.slug ? `/${tab.slug}` : ""}`;
          const active = pathname === href;
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                "shrink-0 rounded-lg px-3.5 py-2 text-sm transition-colors",
                active ? "bg-pine-700 text-white" : "border border-line bg-white text-ink-soft hover:text-ink",
              )}
            >
              {t(tab.key)}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
