export type StationFlavor = "cn" | "global";
export type LocaleCode = "zh" | "en";
export type CurrencyCode = "CNY" | "USD" | "EUR" | "GBP";
export type PolicySlug = "privacy" | "terms" | "returns" | "shipping";

export interface LocalizedText {
  readonly zh?: string;
  readonly en?: string;
}

export interface StoreIdentity {
  readonly name: string;
  readonly logoUrl?: string;
  readonly faviconUrl?: string;
  readonly contactEmail?: string;
  readonly footerLine?: string;
  readonly icp?: string;
  readonly policeRecord?: string;
  readonly policeBadgeUrl?: string;
}

export interface ReservedPolicy {
  readonly slug: PolicySlug;
  readonly title: LocalizedText;
  readonly body: LocalizedText;
}

const POLICY_TITLES: Record<PolicySlug, LocalizedText> = {
  privacy: { zh: "隐私", en: "Privacy" },
  terms: { zh: "服务条款", en: "Terms" },
  returns: { zh: "退货说明", en: "Returns" },
  shipping: { zh: "运费说明", en: "Shipping" },
};

export function createBlankStore(flavor: StationFlavor): {
  identity: StoreIdentity;
  policies: ReservedPolicy[];
} {
  return {
    identity: {
      name: flavor === "cn" ? "我的店" : "My Shop",
    },
    policies: (Object.keys(POLICY_TITLES) as PolicySlug[]).map((slug) => ({
      slug,
      title: POLICY_TITLES[slug],
      body: {},
    })),
  };
}

export function resolveStoreIdentity(
  flavor: StationFlavor,
  input: Partial<StoreIdentity>,
  year = new Date().getUTCFullYear(),
): Required<Pick<StoreIdentity, "name" | "footerLine">> & StoreIdentity {
  const fallback = createBlankStore(flavor).identity;
  const name = input.name?.trim() || fallback.name;
  const footerLine = input.footerLine?.trim() || `© ${year} ${name}`;

  const identity: Required<Pick<StoreIdentity, "name" | "footerLine">> & StoreIdentity = {
    ...input,
    name,
    footerLine,
  };

  if (flavor === "global") {
    const { icp: _icp, policeRecord: _policeRecord, policeBadgeUrl: _policeBadgeUrl, ...globalIdentity } = identity;
    return globalIdentity;
  }

  return identity;
}

export function pickLocalizedText(text: LocalizedText, locale: LocaleCode, primary: LocaleCode): string {
  return text[locale]?.trim() || text[primary]?.trim() || "";
}

export function chinaPoliceRecordUrl(record: string): string {
  return `https://beian.mps.gov.cn/#/query/webSearch?code=${encodeURIComponent(record.trim())}`;
}

export * from "./catalog";
export * from "./checkout";
export * from "./shopper";
