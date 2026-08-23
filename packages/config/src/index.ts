import type { CurrencyCode, LocaleCode, StationFlavor } from "@ocs/core";

export type PaymentCapability = "alipay" | "wechat" | "paypal" | "stripe";

export interface StationConfig {
  readonly flavor: StationFlavor;
  readonly primaryLocale: LocaleCode;
  readonly accountingCurrency: CurrencyCode;
  readonly payments: ReadonlyArray<{
    readonly capability: PaymentCapability;
    readonly availability: "available" | "coming-later";
  }>;
  readonly filingFields: boolean;
}

const CONFIGS: Record<StationFlavor, StationConfig> = {
  cn: {
    flavor: "cn",
    primaryLocale: "zh",
    accountingCurrency: "CNY",
    payments: [
      { capability: "alipay", availability: "available" },
      { capability: "wechat", availability: "coming-later" },
    ],
    filingFields: true,
  },
  global: {
    flavor: "global",
    primaryLocale: "en",
    accountingCurrency: "USD",
    payments: [
      { capability: "paypal", availability: "available" },
      { capability: "stripe", availability: "available" },
    ],
    filingFields: false,
  },
};

export function getStationConfig(flavor: StationFlavor): StationConfig {
  return CONFIGS[flavor];
}
