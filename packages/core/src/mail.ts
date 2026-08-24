import type { CurrencyCode, LocalizedText } from "./index";

/** The three Notice Mail letters (ADR 0017); password-reset rides the same transport but is system mail. */
export type NoticeMailKind = "paid" | "shipped" | "owner-new-order" | "password-reset";

export interface NoticeMailOrderFacts {
  readonly number: string;
  readonly flavor: "cn" | "global";
  readonly shopperEmail: string;
  readonly currency: CurrencyCode;
  readonly totalMinor: number;
  readonly lines: ReadonlyArray<{
    readonly productName: LocalizedText;
    readonly quantity: number;
  }>;
  readonly trackingNumber?: string;
}

export interface NoticeMail {
  readonly kind: NoticeMailKind;
  readonly toEmail: string;
  readonly subject: string;
  readonly bodyText: string;
}

function money(currency: CurrencyCode): Intl.NumberFormat {
  return new Intl.NumberFormat(currency === "CNY" ? "zh-CN" : "en-US", { style: "currency", currency });
}

function lineSummary(order: NoticeMailOrderFacts, locale: "zh" | "en"): string {
  return order.lines
    .map((line) => {
      const name = line.productName[locale] ?? line.productName.zh ?? line.productName.en ?? "";
      return `  · ${name} × ${line.quantity}`;
    })
    .join("\n");
}

export function composeNoticeMail(input: {
  readonly kind: NoticeMailKind;
  readonly order: NoticeMailOrderFacts;
  readonly storeName: string;
  readonly ownerEmail: string;
}): NoticeMail {
  const zh = input.order.flavor === "cn";
  const locale = zh ? "zh" : "en";
  const format = money(input.order.currency);
  const total = format.format(input.order.totalMinor / 100);
  const store = input.storeName;
  const number = input.order.number;

  if (input.kind === "owner-new-order") {
    return {
      kind: "owner-new-order",
      toEmail: input.ownerEmail,
      subject: zh ? `新订单 ${number} · ${store}` : `New order ${number} · ${store}`,
      bodyText: zh
        ? `${store} 收到一笔新订单。\n\n订单号：${number}\n顾客：${input.order.shopperEmail}\n金额：${total}\n商品：\n${lineSummary(input.order, locale)}\n\n请前往商家后台处理发货。`
        : `${store} received a new order.\n\nOrder: ${number}\nShopper: ${input.order.shopperEmail}\nAmount: ${total}\nItems:\n${lineSummary(input.order, locale)}\n\nOpen the Merchant Portal to fulfill it.`,
    };
  }

  if (input.kind === "shipped") {
    const tracking = input.order.trackingNumber ?? "";
    return {
      kind: "shipped",
      toEmail: input.order.shopperEmail,
      subject: zh ? `你的订单 ${number} 已发货 · ${store}` : `Your order ${number} has shipped · ${store}`,
      bodyText: zh
        ? `你的订单已发货，感谢在 ${store} 购物。\n\n订单号：${number}\n金额：${total}\n运单号：${tracking}\n商品：\n${lineSummary(input.order, locale)}\n\n可在账户订单页随时查看进度。`
        : `Your order is on its way. Thanks for shopping at ${store}.\n\nOrder: ${number}\nAmount: ${total}\nTracking: ${tracking}\nItems:\n${lineSummary(input.order, locale)}\n\nYou can follow its progress anytime from your account orders page.`,
    };
  }

  if (input.kind === "password-reset") {
    return {
      kind: "password-reset",
      toEmail: input.order.shopperEmail,
      subject: zh ? `重置你的密码 · ${store}` : `Reset your password · ${store}`,
      bodyText: zh
        ? `你在 ${store} 申请了密码重置。如果是你本人操作，请使用邮件中的链接继续；链接一次性有效。若不是，忽略这封邮件即可。`
        : `A password reset was requested for your account at ${store}. If this was you, follow the link in this message; it works once. Otherwise, ignore this email.`,
    };
  }

  return {
    kind: "paid",
    toEmail: input.order.shopperEmail,
    subject: zh ? `支付成功 · 订单 ${number} · ${store}` : `Payment received · Order ${number} · ${store}`,
    bodyText: zh
      ? `感谢在 ${store} 购物，我们已收到你的付款。\n\n订单号：${number}\n金额：${total}\n商品：\n${lineSummary(input.order, locale)}\n\n发货后我们会再发一封带运单号的通知。`
      : `Thank you for shopping at ${store}. Your payment went through.\n\nOrder: ${number}\nAmount: ${total}\nItems:\n${lineSummary(input.order, locale)}\n\nWe will send another notice with tracking once it ships.`,
  };
}

export function noticeMailEventKey(kind: NoticeMailKind, reference: string): string {
  return `${kind}:${reference}`;
}
