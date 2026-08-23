export type Flavor = "cn" | "global";
export type LocaleCode = "zh" | "en";
export type CurrencyCode = "CNY" | "USD" | "EUR" | "GBP";
export type PaymentMethod = "alipay" | "wechat" | "paypal" | "stripe";
export type PolicySlug = "privacy" | "terms" | "returns" | "shipping";

/** 多语言文案：按 locale 取，缺了回退主语言 */
export type L10n = { zh?: string; en?: string };

export function pickText(text: L10n | undefined, locale: LocaleCode, primary: LocaleCode): string {
  if (!text) return "";
  return text[locale]?.trim() ? text[locale]! : text[primary] ?? "";
}

export interface OptionValue {
  id: string;
  name: L10n;
}
export interface ProductOption {
  id: string;
  name: L10n; // 老板自己起的名字：颜色 / 尺寸 / 容量
  values: OptionValue[];
}
export interface Variant {
  id: string;
  /** optionId -> valueId 的组合键 */
  selection: Record<string, string>;
  price: number; // 记账货币分
  compareAt?: number; // 可选划线原价
  stock: number;
}
export interface Product {
  id: string;
  slug: string;
  name: L10n;
  story: L10n;
  images: string[];
  categoryIds: string[];
  options: ProductOption[];
  variants: Variant[];
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: L10n;
}

export interface Discount {
  id: string;
  code: string;
  percent?: number; // 打 percent 折扣（10 = 9折意义上的减10%）
  amountOff?: number; // 固定减记账货币分
  active: boolean;
}

export interface ShippingRate {
  id: string;
  name: L10n;
  price: number; // 记账货币分
  freeOver?: number; // 满额包邮（记账货币分）
}

export interface Policy {
  slug: PolicySlug;
  title: L10n;
  body: L10n; // 空字符串 = 店主尚未填写
}

export interface Address {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  zip?: string;
  country: string;
}

export interface OrderLine {
  productId: string;
  variantId: string;
  name: string; // 下单时快照（当时语言）
  variantLabel: string;
  price: number;
  qty: number;
  image: string;
}

export type OrderStatus = "paid" | "shipped";
export type ReturnStatus = "requested" | "waiting_goods" | "refunded" | "rejected";

export interface Order {
  id: string;
  number: string;
  createdAt: string;
  shopperEmail: string;
  lines: OrderLine[];
  address: Address;
  shippingRateId: string;
  shippingName: string;
  shippingPrice: number;
  discountCode?: string;
  discountOff: number;
  subtotal: number;
  total: number;
  method: PaymentMethod;
  status: OrderStatus;
  returnStatus?: ReturnStatus;
  returnReason?: string;
  returnNote?: string;
  tracking?: string;
  shippedAt?: string;
}

export interface ShopperAccount {
  email: string;
  password: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  role: "shopper" | "ai" | "staff";
  text: string;
  at: string;
  orderId?: string; // AI 命中订单时挂上，气泡里渲染订单卡
}

export interface ChatThread {
  id: string;
  shopperEmail?: string; // 未登录是访客
  messages: ChatMessage[];
  escalated: boolean;
  unread: boolean;
  updatedAt: string;
}

export interface Settings {
  name: string;
  logoUrl?: string;
  faviconUrl?: string;
  contactEmail?: string;
  footerLine?: string;
  icp?: string; // 仅国内
  policeRecord?: string; // 仅国内
  policeBadgeUrl?: string; // 仅国内
  primaryLocale: LocaleCode;
  locales: LocaleCode[];
  accounting: CurrencyCode;
  currencies: { code: CurrencyCode; rate: number }[]; // 相对记账货币手填汇率，含记账货币自身 rate=1
  ownerLocale: LocaleCode;
  payments: { alipay: boolean; paypal: boolean; stripe: boolean };
  smtp: { host: string; port: string; user: string; pass: string; from: string };
  chatEnabled: boolean;
}

export interface CartLine {
  productId: string;
  variantId: string;
  qty: number;
}

export interface FlavorState {
  settings: Settings;
  categories: Category[];
  products: Product[];
  discounts: Discount[];
  shippingRates: ShippingRate[];
  policies: Policy[];
  orders: Order[];
  shoppers: ShopperAccount[];
  threads: ChatThread[];
  cart: CartLine[];
  seq: number; // id / 单号计数
}

export const POLICY_SLUGS: PolicySlug[] = ["privacy", "terms", "returns", "shipping"];
