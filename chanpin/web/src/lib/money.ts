import type { CurrencyCode, LocaleCode } from "./types";

const SYMBOLS: Record<CurrencyCode, string> = {
  CNY: "¥",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * 金额统一以记账货币的「分」存储。展示货币按手填汇率换算。
 * 用 Intl 而不是手拼字符串，避免小数位错。
 */
export function formatMoney(
  minor: number,
  code: CurrencyCode,
  rate = 1,
): string {
  const value = (minor * rate) / 100;
  const localeTag = code === "CNY" ? "zh-CN" : "en-US";
  try {
    return new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency: code,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${SYMBOLS[code]}${value.toFixed(2)}`;
  }
}

export function currencySymbol(code: CurrencyCode): string {
  return SYMBOLS[code] ?? code;
}

export function localeTag(locale: LocaleCode): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}
