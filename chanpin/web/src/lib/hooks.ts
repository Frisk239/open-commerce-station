"use client";

import { useCallback } from "react";
import { useShop } from "@/mock/store";
import { t, type DictKey } from "./i18n";
import { formatMoney } from "./money";
import type { Flavor, LocaleCode } from "./types";

/**
 * 店面文案跟顾客语言走；后台文案跟老板界面语言走。
 * money 同理：店面按顾客展示货币换算，后台固定记账货币。
 */
export type UIMode = "shop" | "portal";

export function useT(flavor: Flavor, mode: UIMode = "shop") {
  const locale = useShop((s) =>
    mode === "shop" ? s.ui.shopLocale[flavor] : s.flavors[flavor].settings.ownerLocale,
  );
  return useCallback((key: DictKey) => t(locale, key), [locale]);
}

export function useLocale(flavor: Flavor, mode: UIMode = "shop"): LocaleCode {
  return useShop((s) => (mode === "shop" ? s.ui.shopLocale[flavor] : s.flavors[flavor].settings.ownerLocale));
}

export function useMoney(flavor: Flavor, mode: UIMode = "shop") {
  const settings = useShop((s) => s.flavors[flavor].settings);
  const display = useShop((s) =>
    mode === "shop" ? s.ui.displayCurrency[flavor] : s.flavors[flavor].settings.accounting,
  );
  const rate = mode === "shop" ? (settings.currencies.find((c) => c.code === display)?.rate ?? 1) : 1;
  return useCallback((minor: number) => formatMoney(minor, display, rate), [display, rate]);
}

export function useFlavorState(flavor: Flavor) {
  return useShop((s) => s.flavors[flavor]);
}

export function useSession(flavor: Flavor) {
  return useShop((s) => s.session[flavor]);
}
