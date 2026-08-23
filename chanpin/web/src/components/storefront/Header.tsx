"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  MagnifyingGlass,
  ShoppingBag,
  User,
  List,
  X,
  SignOut,
} from "@phosphor-icons/react/dist/ssr";
import { useFlavorState, useSession, useT, useLocale } from "@/lib/hooks";
import { cartCount, useShop } from "@/mock/store";
import { OPEN_CHAT_EVENT } from "@/components/storefront/ChatWidget";
import { pickText, type CurrencyCode, type Flavor, type LocaleCode } from "@/lib/types";

export function Header({ flavor }: { flavor: Flavor }) {
  const st = useFlavorState(flavor);
  const session = useSession(flavor);
  const t = useT(flavor);
  const locale = useLocale(flavor);
  const setShopLocale = useShop((s) => s.setShopLocale);
  const setDisplayCurrency = useShop((s) => s.setDisplayCurrency);
  const displayCurrency = useShop((s) => s.ui.displayCurrency[flavor]);
  const logout = useShop((s) => s.logoutShopper);
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  const count = cartCount(st);
  const locales = st.settings.locales;
  const currencies = st.settings.currencies;
  const base = `/${flavor}`;
  // 结账页不挂客服浮球（见 ChatWidget），入口收进顶栏文字，避免挡住付款按钮
  const onCheckout = /\/checkout$/.test(pathname);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `${base}/products?q=${encodeURIComponent(query)}` : `${base}/products`);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line-soft bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <button
          type="button"
          className="-ml-1.5 rounded-lg p-2 text-ink hover:bg-mist lg:hidden"
          aria-label={t("nav.menu")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={20} /> : <List size={20} />}
        </button>

        <Link href={base} className="flex shrink-0 items-center gap-2">
          {st.settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={st.settings.logoUrl} alt={st.settings.name} className="h-8 w-auto max-w-[160px] object-contain" />
          ) : (
            <span className="text-[17px] font-bold tracking-tight text-ink">{st.settings.name}</span>
          )}
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-ink-soft lg:flex" aria-label="primary">
          <Link href={`${base}/products`} className="hover:text-ink">
            {t("nav.all")}
          </Link>
          {st.categories.slice(0, 3).map((c) => (
            <Link
              key={c.id}
              href={`${base}/products?cat=${c.slug}`}
              className="hover:text-ink"
            >
              {pickText(c.name, locale, st.settings.primaryLocale)}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden w-52 md:block">
          <div className="relative">
            <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.searchPlaceholder")}
              aria-label={t("nav.searchPlaceholder")}
              className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-pine-500 focus:outline-none"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {onCheckout && st.settings.chatEnabled ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT))}
              className="mr-1 rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-mist hover:text-ink"
            >
              {t("nav.chat")}
            </button>
          ) : null}
          {locales.length > 1 ? (
            <select
              aria-label={t("nav.language")}
              value={locale}
              onChange={(e) => setShopLocale(flavor, e.target.value as LocaleCode)}
              className="mr-1 h-9 rounded-lg border border-line bg-white px-2 text-[13px] text-ink-soft"
            >
              {locales.map((l) => (
                <option key={l} value={l}>
                  {l === "zh" ? "中文" : "EN"}
                </option>
              ))}
            </select>
          ) : null}

          {currencies.length > 1 ? (
            <select
              aria-label={t("nav.currency")}
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(flavor, e.target.value as CurrencyCode)}
              className="mr-1 h-9 rounded-lg border border-line bg-white px-2 text-[13px] text-ink-soft"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          ) : null}

          {session.shopperEmail ? (
            <div className="flex items-center">
              <Link
                href={`${base}/account`}
                className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-mist hover:text-ink sm:flex"
              >
                <User size={17} />
                {t("nav.account")}
              </Link>
              <button
                type="button"
                onClick={() => logout(flavor)}
                className="rounded-lg p-2 text-ink-soft hover:bg-mist hover:text-ink"
                aria-label={t("nav.logout")}
                title={t("nav.logout")}
              >
                <SignOut size={17} />
              </button>
            </div>
          ) : (
            <Link href={`${base}/login`} className="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-mist hover:text-ink">
              {t("nav.login")}
            </Link>
          )}

          <Link
            href={`${base}/cart`}
            className="relative rounded-lg p-2 text-ink hover:bg-mist"
            aria-label={`${t("nav.cart")} (${count})`}
          >
            <ShoppingBag size={19} />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pine-700 px-1 text-[10px] font-semibold text-white">
                {count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-line-soft bg-paper px-4 pb-4 pt-3 lg:hidden">
          <form onSubmit={submitSearch} className="mb-3 md:hidden">
            <div className="relative">
              <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("nav.searchPlaceholder")}
                aria-label={t("nav.searchPlaceholder")}
                className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm focus:border-pine-500 focus:outline-none"
              />
            </div>
          </form>
          <div className="flex flex-col text-[15px]">
            <Link href={`${base}/products`} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-ink hover:bg-mist">
              {t("nav.all")}
            </Link>
            {st.categories.map((c) => (
              <Link
                key={c.id}
                href={`${base}/products?cat=${c.slug}`}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2.5 text-ink-soft hover:bg-mist"
              >
                {pickText(c.name, locale, st.settings.primaryLocale)}
              </Link>
            ))}
            {session.shopperEmail ? (
              <Link href={`${base}/account`} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-ink-soft hover:bg-mist">
                {t("nav.account")}
              </Link>
            ) : (
              <Link href={`${base}/login`} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-ink-soft hover:bg-mist">
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
