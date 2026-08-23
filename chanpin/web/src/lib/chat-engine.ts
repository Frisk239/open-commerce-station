import type { L10n, LocaleCode, Order, Policy, ShippingRate } from "./types";
import { pickText } from "./types";
import { t } from "./i18n";

/**
 * 假 AI：规则驱动，不接模型。
 * 规则顺序：退款词必转人工；退货词答退货说明；运费词答运费说明；
 * 订单词对上登录顾客的当前订单；其余礼貌兜底。
 * AI 永远不能同意退款，只能转人工。
 */
export interface AiInput {
  locale: LocaleCode;
  primary: LocaleCode;
  policies: Policy[];
  rates: ShippingRate[];
  orders: Order[]; // 该顾客自己的订单
  isLoggedIn: boolean;
  fmt: (minor: number) => string;
}

export interface AiOutput {
  text: string;
  escalate: boolean;
  orderId?: string;
}

function policyBody(policies: Policy[], slug: string, locale: LocaleCode, primary: LocaleCode): string {
  const p = policies.find((x) => x.slug === slug);
  if (!p) return "";
  const body = pickText(p.body, locale, primary).trim();
  if (!body) return "";
  return body.length > 240 ? `${body.slice(0, 240)}…` : body;
}

function rateSummary(rates: ShippingRate[], locale: LocaleCode, primary: LocaleCode, fmt: (m: number) => string): string {
  return rates
    .map((r) => {
      const name = pickText(r.name, locale, primary);
      const free = r.freeOver ? `（${t(locale, "checkout.freeOverPrefix")} ${fmt(r.freeOver)} ${t(locale, "checkout.freeOverSuffix")}）` : "";
      return `${name} ${fmt(r.price)}${free}`;
    })
    .join("；");
}

export function orderStatusText(o: Order, locale: LocaleCode): string {
  if (o.returnStatus === "refunded") return t(locale, "order.refunded");
  if (o.returnStatus === "waiting_goods") return t(locale, "order.returnWaiting");
  if (o.returnStatus === "requested") return t(locale, "order.returnRequested");
  if (o.returnStatus === "rejected") return o.tracking ? t(locale, "order.shipped") : t(locale, "order.paid");
  return o.status === "shipped" ? t(locale, "order.shipped") : t(locale, "order.paid");
}

export function aiReply(msg: string, input: AiInput): AiOutput {
  const text = msg.toLowerCase();
  const { locale } = input;

  // 1. 退款：转人工
  if (/退款|退钱|退我钱|refund|money back|charge back|chargeback/.test(text)) {
    return { text: t(locale, "chat.escalated"), escalate: true };
  }

  // 2. 退货 / 换货：答退货说明页
  if (/退货|退换|换货|怎么退|寄回|return|exchange|send it back|send back/.test(text)) {
    const body =
      policyBody(input.policies, "returns", input.locale, input.primary) ||
      t(locale, "order.returnHint");
    return { text: body, escalate: false };
  }

  // 3. 运费 / 时效：答运费说明页
  if (/运费|邮费|快递|发货|多久|几天|到货|物流|shipping|delivery|ship|how long|arrive/.test(text)) {
    const body =
      policyBody(input.policies, "shipping", input.locale, input.primary) ||
      rateSummary(input.rates, input.locale, input.primary, input.fmt);
    return { text: body, escalate: false };
  }

  // 4. 订单：登录才对得上这一单
  if (/订单|我的单|我的订单|单号|到哪|order|tracking|parcel|package|where is/.test(text)) {
    if (!input.isLoggedIn || input.orders.length === 0) {
      return { text: t(locale, "chat.needLogin"), escalate: false };
    }
    const latest = input.orders[0];
    const first = latest.lines[0];
    const head = first ? `${first.name} ×${first.qty}` : "";
    const zh = input.locale === "zh";
    const trackingPart = latest.tracking
      ? `${zh ? "，运单号" : ", tracking "}${latest.tracking}`
      : "";
    return {
      text: zh
        ? `${latest.number}（${head}）：${orderStatusText(latest, locale)}${trackingPart}`
        : `${latest.number} (${head}): ${orderStatusText(latest, locale)}${trackingPart}`,
      escalate: false,
      orderId: latest.id,
    };
  }

  // 5. 兜底
  return {
    text:
      locale === "zh"
        ? "我主要能回答运费、退货和订单进度的问题。涉及退款或别的麻烦，我帮你转店主人工处理。"
        : "I can answer shipping, returns and order-progress questions. For refunds or anything else I'll hand you to the owner.",
    escalate: false,
  };
}

export function l10n(text: L10n, locale: LocaleCode, primary: LocaleCode): string {
  return pickText(text, locale, primary);
}
