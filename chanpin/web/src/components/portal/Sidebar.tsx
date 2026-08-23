"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Package,
  Bag,
  FolderSimple,
  Ticket,
  ChatCircleDots,
  FileText,
  Gear,
  Storefront,
  SignOut,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/components/ui";
import { useFlavorState, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { DictKey } from "@/lib/i18n";
import type { Flavor } from "@/lib/types";

const NAV: Array<{ href: string; key: DictKey; icon: Icon }> = [
  { href: "", key: "p.navHome", icon: House },
  { href: "/orders", key: "p.navOrders", icon: Package },
  { href: "/products", key: "p.navProducts", icon: Bag },
  { href: "/categories", key: "p.navCategories", icon: FolderSimple },
  { href: "/discounts", key: "p.navDiscounts", icon: Ticket },
  { href: "/inbox", key: "p.navInbox", icon: ChatCircleDots },
  { href: "/pages", key: "p.navPages", icon: FileText },
  { href: "/settings", key: "p.navSettings", icon: Gear },
];

export function Sidebar({ flavor }: { flavor: Flavor }) {
  const st = useFlavorState(flavor);
  const t = useT(flavor, "portal");
  const pathname = usePathname();
  const logout = useShop((s) => s.logoutOwner);
  const unread = st.threads.filter((x) => x.unread).length;
  const toShip = st.orders.filter((o) => o.status === "paid" && !o.returnStatus).length;

  const item = (n: (typeof NAV)[number], mobile = false) => {
    const href = `/${flavor}/portal${n.href}`;
    const active = n.href === "" ? pathname === href : pathname.startsWith(href);
    const badge = n.key === "p.navInbox" ? unread : n.key === "p.navOrders" ? toShip : 0;
    const Icon = n.icon;
    return (
      <Link
        key={n.key}
        href={href}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
          active ? "bg-pine-700 text-white" : "text-ink-soft hover:bg-pine-100/70 hover:text-ink",
          mobile && "shrink-0 whitespace-nowrap px-3.5",
        )}
      >
        <Icon size={16} className={active ? "text-white" : "text-ink-faint"} />
        {t(n.key)}
        {badge > 0 ? (
          <span
            className={cn(
              "ml-auto flex items-center justify-center rounded-full px-1 text-[10px] font-bold",
              active ? "bg-white/25 text-white" : "bg-pine-700 text-white",
            )}
            style={{ height: 18, minWidth: 18 }}
          >
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <>
      {/* 桌面左栏 */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-white px-3 py-4 lg:flex">
        <Link href={`/${flavor}/portal`} className="mb-5 flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pine-700 text-white">
            <Storefront size={16} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-ink">{st.settings.name}</span>
            <span className="block text-xs text-ink-faint">{flavor === "cn" ? "国内站" : "出海站"}</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5">{NAV.map((n) => item(n))}</nav>
        <div className="space-y-0.5 border-t border-line-soft pt-3">
          <Link
            href={`/${flavor}`}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-pine-100/70 hover:text-ink"
          >
            <Storefront size={16} className="text-ink-faint" />
            {t("p.viewStore")}
          </Link>
          <button
            type="button"
            onClick={() => logout(flavor)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-pine-100/70 hover:text-ink"
          >
            <SignOut size={16} className="text-ink-faint" />
            {t("p.logout")}
          </button>
        </div>
      </aside>

      {/* 手机顶部横导航 */}
      <div className="fixed inset-x-0 top-0 z-30 border-b border-line bg-white lg:hidden">
        <div className="flex items-center gap-2 px-3 pt-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-pine-700 text-white">
            <Storefront size={14} />
          </span>
          <p className="truncate text-sm font-bold text-ink">{st.settings.name}</p>
          <Link href={`/${flavor}`} className="ml-auto text-xs text-pine-700">
            {t("p.viewStore")}
          </Link>
          <button type="button" onClick={() => logout(flavor)} className="text-xs text-ink-soft">
            {t("p.logout")}
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 pt-1.5">{NAV.map((n) => item(n, true))}</nav>
      </div>
      <div className="h-[86px] lg:hidden" />
    </>
  );
}
