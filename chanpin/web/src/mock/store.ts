"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { makeBlank, makeSeed, OWNER_EMAIL, OWNER_PASS } from "./seed";
import { aiReply } from "@/lib/chat-engine";
import { formatMoney } from "@/lib/money";
import { pickText } from "@/lib/types";
import type {
  Address,
  CartLine,
  Category,
  ChatThread,
  CurrencyCode,
  Discount,
  Flavor,
  FlavorState,
  LocaleCode,
  Order,
  OrderLine,
  PaymentMethod,
  Policy,
  PolicySlug,
  Product,
  Settings,
  ShippingRate,
  Variant,
} from "@/lib/types";

interface Session {
  shopperEmail: string | null;
  owner: boolean;
}

interface UIState {
  shopLocale: Record<Flavor, LocaleCode>; // 顾客当前店面语言
  displayCurrency: Record<Flavor, CurrencyCode>; // 顾客当前展示货币
  empty: Record<Flavor, boolean>; // 空白店预览
  toast: { id: number; text: string } | null;
}

interface PlaceOrderArgs {
  address: Address;
  shippingRateId: string;
  method: PaymentMethod;
  discountCode?: string;
  locale: LocaleCode;
}

interface OcsStore {
  flavors: Record<Flavor, FlavorState>;
  session: Record<Flavor, Session>;
  ui: UIState;
  snapshots: Record<Flavor, FlavorState | null>;

  // 会话
  loginShopper(f: Flavor, email: string, pass: string): boolean;
  registerShopper(f: Flavor, email: string, pass: string, name: string): boolean;
  logoutShopper(f: Flavor): void;
  loginOwner(f: Flavor, email: string, pass: string): boolean;
  logoutOwner(f: Flavor): void;

  // 购物车
  addToCart(f: Flavor, productId: string, variantId: string, qty: number): boolean;
  setCartQty(f: Flavor, variantId: string, qty: number): void;
  removeCartLine(f: Flavor, variantId: string): void;
  clearCart(f: Flavor): void;

  // 目录
  saveProduct(f: Flavor, product: Product): void;
  deleteProduct(f: Flavor, id: string): void;
  addCategory(f: Flavor, name: string): void;
  deleteCategory(f: Flavor, id: string): void;
  saveDiscount(f: Flavor, discount: Discount): void;
  deleteDiscount(f: Flavor, id: string): void;
  saveRate(f: Flavor, rate: ShippingRate): void;
  deleteRate(f: Flavor, id: string): void;
  savePolicy(f: Flavor, slug: PolicySlug, body: { zh?: string; en?: string }): void;
  saveSettings(f: Flavor, patch: Partial<Settings>): void;

  // 订单与退货
  placeOrder(f: Flavor, args: PlaceOrderArgs): Order | null;
  markShipped(f: Flavor, orderId: string, tracking: string): void;
  requestReturn(f: Flavor, orderId: string, reason: string): void;
  decideReturn(f: Flavor, orderId: string, approve: boolean, note?: string): void;
  confirmReturnReceived(f: Flavor, orderId: string): void;

  // 聊天
  shopperSend(f: Flavor, text: string): void;
  staffReply(f: Flavor, threadId: string, text: string): void;
  markThreadRead(f: Flavor, threadId: string): void;

  // 原型控制
  setEmpty(f: Flavor, empty: boolean): void;
  setShopLocale(f: Flavor, locale: LocaleCode): void;
  setDisplayCurrency(f: Flavor, code: CurrencyCode): void;
  toast(text: string): void;
  clearToast(): void;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

let toastSeq = 0;

/**
 * 原型数据放内存 store；用 sessionStorage 持久化，刷新或直接输 URL 不丢购物车和订单。
 * skipHydration + 挂载后 rehydrate，避免 SSR 首帧与客户端不一致。
 */
export const useShop = create<OcsStore>()(
  persist(
    (set, get) => {
  const patchFlavor = (f: Flavor, fn: (st: FlavorState) => FlavorState) =>
    set((s) => ({ flavors: { ...s.flavors, [f]: fn(s.flavors[f]) } }));

  return {
    flavors: { cn: makeSeed("cn"), global: makeSeed("global") },
    session: { cn: { shopperEmail: null, owner: false }, global: { shopperEmail: null, owner: false } },
    ui: {
      shopLocale: { cn: "zh", global: "en" },
      displayCurrency: { cn: "CNY", global: "USD" },
      empty: { cn: false, global: false },
      toast: null,
    },
    snapshots: { cn: null, global: null },

    loginShopper(f, email, pass) {
      const st = get().flavors[f];
      const acc = st.shoppers.find((a) => a.email === email && a.password === pass);
      if (!acc) return false;
      set((s) => ({ session: { ...s.session, [f]: { ...s.session[f], shopperEmail: email } } }));
      // 访客聊天线程绑定到登录人
      const visitor = st.threads.find((t) => t.id === "visitor");
      if (visitor && visitor.messages.length > 0) {
        patchFlavor(f, (fs) => ({
          ...fs,
          threads: fs.threads.map((t) => (t.id === "visitor" ? { ...t, id: `t-${email}`, shopperEmail: email } : t)),
        }));
      }
      return true;
    },

    registerShopper(f, email, pass, name) {
      const st = get().flavors[f];
      if (st.shoppers.some((a) => a.email === email)) return false;
      patchFlavor(f, (fs) => ({ ...fs, shoppers: [...fs.shoppers, { email, password: pass, name }] }));
      set((s) => ({ session: { ...s.session, [f]: { ...s.session[f], shopperEmail: email } } }));
      return true;
    },

    logoutShopper(f) {
      set((s) => ({ session: { ...s.session, [f]: { ...s.session[f], shopperEmail: null } } }));
    },

    loginOwner(f, email, pass) {
      if (email.trim().toLowerCase() !== OWNER_EMAIL || pass !== OWNER_PASS) return false;
      set((s) => ({ session: { ...s.session, [f]: { ...s.session[f], owner: true } } }));
      return true;
    },

    logoutOwner(f) {
      set((s) => ({ session: { ...s.session, [f]: { ...s.session[f], owner: false } } }));
    },

    addToCart(f, productId, variantId, qty) {
      const st = get().flavors[f];
      const product = st.products.find((p) => p.id === productId);
      const variant = product?.variants.find((v) => v.id === variantId);
      if (!product || !variant || variant.stock <= 0) return false;
      const existing = st.cart.find((l) => l.variantId === variantId);
      const nextQty = Math.min((existing?.qty ?? 0) + qty, variant.stock);
      patchFlavor(f, (fs) => ({
        ...fs,
        cart: existing
          ? fs.cart.map((l) => (l.variantId === variantId ? { ...l, qty: nextQty } : l))
          : [...fs.cart, { productId, variantId, qty: nextQty }],
      }));
      return true;
    },

    setCartQty(f, variantId, qty) {
      const st = get().flavors[f];
      const line = st.cart.find((l) => l.variantId === variantId);
      if (!line) return;
      const product = st.products.find((p) => p.id === line.productId);
      const variant = product?.variants.find((v) => v.id === variantId);
      const capped = Math.max(1, Math.min(qty, variant?.stock ?? 1));
      patchFlavor(f, (fs) => ({ ...fs, cart: fs.cart.map((l) => (l.variantId === variantId ? { ...l, qty: capped } : l)) }));
    },

    removeCartLine(f, variantId) {
      patchFlavor(f, (fs) => ({ ...fs, cart: fs.cart.filter((l) => l.variantId !== variantId) }));
    },

    clearCart(f) {
      patchFlavor(f, (fs) => ({ ...fs, cart: [] }));
    },

    saveProduct(f, product) {
      patchFlavor(f, (fs) => {
        const exists = fs.products.some((p) => p.id === product.id);
        return {
          ...fs,
          seq: fs.seq + 1,
          products: exists ? fs.products.map((p) => (p.id === product.id ? product : p)) : [{ ...product }, ...fs.products],
        };
      });
    },

    deleteProduct(f, id) {
      patchFlavor(f, (fs) => ({
        ...fs,
        products: fs.products.filter((p) => p.id !== id),
        cart: fs.cart.filter((l) => l.productId !== id),
      }));
    },

    addCategory(f, name) {
      patchFlavor(f, (fs) => {
        const id = `c-${fs.seq + 1}`;
        const slug = `${id}`;
        const cat: Category = { id, slug, name: { [fs.settings.primaryLocale]: name } as Category["name"] };
        return { ...fs, seq: fs.seq + 1, categories: [...fs.categories, cat] };
      });
    },

    deleteCategory(f, id) {
      patchFlavor(f, (fs) => ({
        ...fs,
        categories: fs.categories.filter((c) => c.id !== id),
        products: fs.products.map((p) => ({ ...p, categoryIds: p.categoryIds.filter((c) => c !== id) })),
      }));
    },

    saveDiscount(f, discount) {
      patchFlavor(f, (fs) => {
        const exists = fs.discounts.some((d) => d.id === discount.id);
        return {
          ...fs,
          seq: fs.seq + 1,
          discounts: exists ? fs.discounts.map((d) => (d.id === discount.id ? discount : d)) : [...fs.discounts, discount],
        };
      });
    },

    deleteDiscount(f, id) {
      patchFlavor(f, (fs) => ({ ...fs, discounts: fs.discounts.filter((d) => d.id !== id) }));
    },

    saveRate(f, rate) {
      patchFlavor(f, (fs) => {
        const exists = fs.shippingRates.some((r) => r.id === rate.id);
        return {
          ...fs,
          seq: fs.seq + 1,
          shippingRates: exists ? fs.shippingRates.map((r) => (r.id === rate.id ? rate : r)) : [...fs.shippingRates, rate],
        };
      });
    },

    deleteRate(f, id) {
      patchFlavor(f, (fs) => ({ ...fs, shippingRates: fs.shippingRates.filter((r) => r.id !== id) }));
    },

    savePolicy(f, slug, body) {
      patchFlavor(f, (fs) => ({
        ...fs,
        policies: fs.policies.map((p) => (p.slug === slug ? { ...p, body: { ...p.body, ...body } } : p)),
      }));
    },

    saveSettings(f, patch) {
      patchFlavor(f, (fs) => ({ ...fs, settings: { ...fs.settings, ...patch } }));
    },

    placeOrder(f, args) {
      const st = get().flavors[f];
      const email = get().session[f].shopperEmail;
      if (!email || st.cart.length === 0) return null;

      const lines: OrderLine[] = [];
      for (const line of st.cart) {
        const product = st.products.find((p) => p.id === line.productId);
        const variant = product?.variants.find((v) => v.id === line.variantId);
        if (!product || !variant || variant.stock < line.qty) return null;
        lines.push({
          productId: product.id,
          variantId: variant.id,
          name: pickText(product.name, args.locale, st.settings.primaryLocale),
          variantLabel: variantLabelOf(product, variant, args.locale, st.settings.primaryLocale),
          price: variant.price,
          qty: line.qty,
          image: product.images[0] ?? "",
        });
      }
      const rate = st.shippingRates.find((r) => r.id === args.shippingRateId);
      if (!rate) return null;
      const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
      const code = args.discountCode
        ? st.discounts.find((d) => d.code.toUpperCase() === args.discountCode!.toUpperCase() && d.active)
        : undefined;
      const discountOff = code
        ? code.percent
          ? Math.round((subtotal * code.percent) / 100)
          : Math.min(code.amountOff ?? 0, subtotal)
        : 0;
      const shippingPrice = rate.freeOver && subtotal - discountOff >= rate.freeOver ? 0 : rate.price;
      const order: Order = {
        id: `o-${st.seq + 1}`,
        number: `${f === "cn" ? "CN" : "GE"}-${(f === "cn" ? 1023 : 2033) + st.orders.length + 1}`,
        createdAt: nowStamp(),
        shopperEmail: email,
        lines,
        address: args.address,
        shippingRateId: rate.id,
        shippingName: pickText(rate.name, args.locale, st.settings.primaryLocale),
        shippingPrice,
        discountCode: code?.code,
        discountOff,
        subtotal,
        total: subtotal - discountOff + shippingPrice,
        method: args.method,
        status: "paid",
      };
      patchFlavor(f, (fs) => ({
        ...fs,
        seq: fs.seq + 1,
        orders: [order, ...fs.orders],
        cart: [],
        // 扣库存
        products: fs.products.map((p) => ({
          ...p,
          variants: p.variants.map((v) => {
            const line = lines.find((l) => l.variantId === v.id);
            return line ? { ...v, stock: Math.max(0, v.stock - line.qty) } : v;
          }),
        })),
      }));
      return order;
    },

    markShipped(f, orderId, tracking) {
      patchFlavor(f, (fs) => ({
        ...fs,
        orders: fs.orders.map((o) =>
          o.id === orderId && o.status === "paid" ? { ...o, status: "shipped", tracking, shippedAt: nowStamp() } : o,
        ),
      }));
    },

    requestReturn(f, orderId, reason) {
      patchFlavor(f, (fs) => ({
        ...fs,
        orders: fs.orders.map((o) =>
          o.id === orderId && !o.returnStatus ? { ...o, returnStatus: "requested", returnReason: reason } : o,
        ),
      }));
    },

    decideReturn(f, orderId, approve, note) {
      patchFlavor(f, (fs) => ({
        ...fs,
        orders: fs.orders.map((o) => {
          if (o.id !== orderId || o.returnStatus !== "requested") return o;
          if (!approve) return { ...o, returnStatus: "rejected", returnNote: note ?? "" };
          return { ...o, returnStatus: o.status === "paid" ? "refunded" : "waiting_goods" };
        }),
      }));
    },

    confirmReturnReceived(f, orderId) {
      patchFlavor(f, (fs) => ({
        ...fs,
        orders: fs.orders.map((o) => (o.id === orderId && o.returnStatus === "waiting_goods" ? { ...o, returnStatus: "refunded" } : o)),
      }));
    },

    shopperSend(f, text) {
      const st = get().flavors[f];
      const email = get().session[f].shopperEmail;
      const locale = get().ui.shopLocale[f];
      const primary = st.settings.primaryLocale;
      const threadId = email ? `t-${email}` : "visitor";
      let thread = st.threads.find((t) => t.id === threadId);
      if (!thread) {
        thread = {
          id: threadId,
          shopperEmail: email ?? undefined,
          messages: [],
          escalated: false,
          unread: false,
          updatedAt: nowStamp(),
        };
      }
      const shopperMsg = { id: `m-${st.seq}-${Date.now()}`, role: "shopper" as const, text, at: nowStamp() };
      const orders = email ? st.orders.filter((o) => o.shopperEmail === email) : [];
      const ai = aiReply(text, {
        locale,
        primary,
        policies: st.policies,
        rates: st.shippingRates,
        orders,
        isLoggedIn: !!email,
        fmt: (m) => formatMoney(m, st.settings.accounting, 1),
      });
      const aiMsg = {
        id: `m-${st.seq}-${Date.now()}-ai`,
        role: "ai" as const,
        text: ai.text,
        at: nowStamp(),
        orderId: ai.orderId,
      };
      const updated: ChatThread = {
        ...thread,
        shopperEmail: email ?? thread.shopperEmail,
        messages: [...thread.messages, shopperMsg, aiMsg],
        escalated: thread.escalated || ai.escalate,
        unread: thread.unread || ai.escalate,
        updatedAt: nowStamp(),
      };
      patchFlavor(f, (fs) => ({
        ...fs,
        seq: fs.seq + 1,
        threads: fs.threads.some((t) => t.id === updated.id)
          ? fs.threads.map((t) => (t.id === updated.id ? updated : t))
          : [updated, ...fs.threads],
      }));
    },

    staffReply(f, threadId, text) {
      patchFlavor(f, (fs) => ({
        ...fs,
        seq: fs.seq + 1,
        threads: fs.threads.map((t) =>
          t.id === threadId
            ? { ...t, messages: [...t.messages, { id: `m-${fs.seq}-${Date.now()}`, role: "staff", text, at: nowStamp() }], updatedAt: nowStamp() }
            : t,
        ),
      }));
    },

    markThreadRead(f, threadId) {
      patchFlavor(f, (fs) => ({ ...fs, threads: fs.threads.map((t) => (t.id === threadId ? { ...t, unread: false } : t)) }));
    },

    setEmpty(f, empty) {
      set((s) => {
        if (empty) {
          return {
            flavors: { ...s.flavors, [f]: makeBlank(f) },
            snapshots: { ...s.snapshots, [f]: clone(s.flavors[f]) },
            ui: { ...s.ui, empty: { ...s.ui.empty, [f]: true } },
          };
        }
        const snap = s.snapshots[f];
        return {
          flavors: { ...s.flavors, [f]: snap ?? s.flavors[f] },
          snapshots: { ...s.snapshots, [f]: null },
          ui: { ...s.ui, empty: { ...s.ui.empty, [f]: false } },
        };
      });
    },

    setShopLocale(f, locale) {
      set((s) => ({ ui: { ...s.ui, shopLocale: { ...s.ui.shopLocale, [f]: locale } } }));
    },

    setDisplayCurrency(f, code) {
      set((s) => ({ ui: { ...s.ui, displayCurrency: { ...s.ui.displayCurrency, [f]: code } } }));
    },

    toast(text) {
      toastSeq += 1;
      set((s) => ({ ui: { ...s.ui, toast: { id: toastSeq, text } } }));
    },

    clearToast() {
      set((s) => ({ ui: { ...s.ui, toast: null } }));
    },
  };
    },
    {
      name: "ocs-proto",
      storage: createJSONStorage(() => sessionStorage),
      // 只持久化数据，不持久化 actions
      partialize: (s) =>
        ({ flavors: s.flavors, session: s.session, ui: s.ui }) as unknown as OcsStore,
      skipHydration: true,
    },
  ),
);

/* ---------------- 纯函数选择器 ---------------- */

export function variantLabelOf(product: Product, variant: Variant, locale: LocaleCode, primary: LocaleCode): string {
  return product.options
    .map((opt) => {
      const valueId = variant.selection[opt.id];
      const value = opt.values.find((v) => v.id === valueId);
      return value ? pickText(value.name, locale, primary) : "";
    })
    .filter(Boolean)
    .join(" / ");
}

export interface ResolvedCartLine {
  line: CartLine;
  product: Product;
  variant: Variant;
  label: string;
  lineTotal: number;
}

export function resolveCart(st: FlavorState): ResolvedCartLine[] {
  const out: ResolvedCartLine[] = [];
  for (const line of st.cart) {
    const product = st.products.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!product || !variant || product.active === false) continue;
    out.push({
      line,
      product,
      variant,
      label: variantLabelOf(product, variant, st.settings.primaryLocale, st.settings.primaryLocale),
      lineTotal: variant.price * line.qty,
    });
  }
  return out;
}

export function cartCount(st: FlavorState): number {
  return resolveCart(st).reduce((n, l) => n + l.line.qty, 0);
}

export function cartSubtotal(st: FlavorState): number {
  return resolveCart(st).reduce((n, l) => n + l.lineTotal, 0);
}

export function findPolicy(st: FlavorState, slug: PolicySlug): Policy | undefined {
  return st.policies.find((p) => p.slug === slug);
}
