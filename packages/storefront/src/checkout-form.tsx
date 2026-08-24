"use client";

import { pickLocalizedText } from "@ocs/core";
import type { CheckoutAddress, CheckoutQuote, CurrencyCode, PaymentMethodView, StationFlavor } from "@ocs/core";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export interface CheckoutFormFields extends CheckoutAddress {
  readonly discountCode: string;
  readonly selectedShippingRateId: string;
}

export interface CheckoutActionState {
  readonly fields: CheckoutFormFields;
  readonly quote?: CheckoutQuote;
  readonly error?: "empty-cart" | "invalid-cart" | "invalid-address" | "invalid-discount" | "no-shipping-rate" | "invalid-shipping-rate" | "payment-disabled" | "payment-recovery" | "out-of-stock" | "unexpected";
}

interface CheckoutFormProps {
  readonly flavor: StationFlavor;
  readonly currency: CurrencyCode;
  readonly email: string;
  readonly storeName: string;
  readonly logoUrl?: string;
  readonly initialFields: CheckoutFormFields;
  readonly paymentMethods?: readonly PaymentMethodView[];
  readonly action: (state: CheckoutActionState, formData: FormData) => Promise<CheckoutActionState>;
}

type PayIntent = "quote" | "pay-alipay" | "pay-paypal" | "pay-stripe";

function SubmitButton({ label, intent, className }: { readonly label: string; readonly intent: PayIntent; readonly className: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" name="intent" value={intent} disabled={pending} className={className}>{pending ? `${label}…` : label}</button>;
}

const payButtonCopy: Record<string, { readonly zh: string; readonly en: string; readonly className: string }> = {
  alipay: { zh: "前往支付宝支付", en: "Pay with Alipay", className: "bg-[#1677ff]" },
  paypal: { zh: "PayPal 付款", en: "Pay with PayPal", className: "bg-[#003087]" },
  stripe: { zh: "用银行卡付款（Stripe）", en: "Pay by card (Stripe)", className: "bg-[#635bff]" },
};

export function CheckoutForm({ flavor, currency, email, storeName, logoUrl, initialFields, paymentMethods = [], action }: CheckoutFormProps) {
  const [state, formAction] = useActionState(action, { fields: initialFields });
  const zh = flavor === "cn";
  const money = new Intl.NumberFormat(zh ? "zh-CN" : "en-US", { style: "currency", currency });
  const copy = zh ? {
    title: "结账", intro: "配送地址、优惠码与购物车会在服务器端实时校验。", account: "顾客账号", cart: "返回购物车", recipient: "收件人", phone: "手机号", country: "国家/地区", region: "省份", city: "城市", district: "区县", postal: "邮编", line1: "详细地址", line2: "补充地址（选填）", discount: "优惠码（选填）", calculate: "计算报价", shipping: "配送方式", subtotal: "商品小计", discountLine: "折扣", shippingLine: "运费", total: "应付总额", weight: "总重量", ready: "报价已由服务器实时校验。发起支付时会再次核价并预占库存。", paymentUnavailable: "商家尚未启用支付宝。微信支付将在后续版本开放。", noTax: "当前版本不计算税费。", errors: { "empty-cart": "购物车为空，请先添加商品。", "invalid-cart": "购物车中有下架、缺货或数量失效的规格。", "invalid-address": "请完整填写有效的中国大陆配送地址。", "invalid-discount": "优惠码不存在、未启用或已经失效。", "no-shipping-rate": "没有匹配该地址和重量的配送方式，请修改地址或联系商家。", "invalid-shipping-rate": "所选配送方式已不再适用，请重新选择。", "payment-disabled": "支付宝尚未配置或启用，请联系商家。", "payment-recovery": "上一笔支付仍需核验，请前往账户订单或稍后重试。", "out-of-stock": "商品库存刚刚发生变化，请返回购物车调整数量。", unexpected: "暂时无法处理结账，请稍后再试。" }, policies: "提交即表示你已阅读店铺政策。",
  } : {
    title: "Checkout", intro: "Your Address, Discount Code, and Cart are revalidated on the server for every quote.", account: "Shopper Account", cart: "Back to Cart", recipient: "Recipient name", phone: "Phone", country: "Country code", region: "State / region", city: "City", district: "District (optional)", postal: "Postal code", line1: "Address line 1", line2: "Address line 2 (optional)", discount: "Discount Code (optional)", calculate: "Calculate quote", shipping: "Shipping method", subtotal: "Merchandise subtotal", discountLine: "Discount", shippingLine: "Shipping", total: "Total", weight: "Total weight", ready: "This quote was revalidated on the server.", paymentUnavailable: "Online payment is not enabled yet.", noTax: "Taxes are not calculated in this version.", errors: { "empty-cart": "Your Cart is empty. Add a Product first.", "invalid-cart": "A Cart Variant is unpublished, out of stock, or has an invalid quantity.", "invalid-address": "Complete every required delivery Address field.", "invalid-discount": "That Discount Code is invalid or inactive.", "no-shipping-rate": "No Shipping Rate matches this Address and Cart weight. Change the Address or contact the Merchant.", "invalid-shipping-rate": "That Shipping Rate no longer applies. Choose again.", "payment-disabled": "Online payment is not configured or enabled.", "payment-recovery": "A previous payment still needs reconciliation.", "out-of-stock": "Inventory just changed. Return to your Cart and adjust the quantity.", unexpected: "We could not process Checkout. Try again shortly." }, policies: "By continuing, you acknowledge the store policies.",
  } as const;
  const quote = state.quote;
  const enabledMethods = paymentMethods.filter((method) => method.enabled && payButtonCopy[method.provider]);

  return <main className="min-h-screen bg-[#f3f0e8] px-5 py-10 text-stone-950 md:px-10 md:py-16"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-end justify-between gap-5"><div><Link href="/" aria-label={storeName} className="mb-8 flex min-h-8 items-center">{logoUrl ? <Image src={logoUrl} alt={storeName} width={176} height={36} className="max-h-9 max-w-44 object-contain" /> : <span className="text-sm font-bold tracking-tight">{storeName}</span>}</Link><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">{zh ? "结账报价" : "Checkout Quote"}</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.04em]">{copy.title}</h1><p className="mt-3 max-w-2xl text-stone-600">{copy.intro}</p></div><div className="text-right text-sm"><p className="text-stone-500">{copy.account}</p><Link href="/account" className="font-semibold underline underline-offset-4">{email}</Link><span className="mx-2 text-stone-300">·</span><Link href="/cart" className="underline underline-offset-4">{copy.cart}</Link></div></header>
    <form action={formAction} className="mt-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 md:p-8"><div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold">{copy.recipient}<input name="recipientName" required maxLength={120} defaultValue={state.fields.recipientName} autoComplete="name" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
        <label className="text-sm font-semibold">{copy.phone}<input name="phone" required maxLength={40} defaultValue={state.fields.phone} autoComplete="tel" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
        {zh ? <div className="text-sm font-semibold">{copy.country}<p className="mt-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 font-normal">中国（CN）</p><input type="hidden" name="countryCode" value="CN" /></div> : <label className="text-sm font-semibold">{copy.country}<input name="countryCode" required minLength={2} maxLength={2} defaultValue={state.fields.countryCode} autoComplete="country" placeholder="US" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal uppercase" /></label>}
        <label className="text-sm font-semibold">{copy.region}<input name="region" required maxLength={120} defaultValue={state.fields.region} autoComplete="address-level1" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
        <label className="text-sm font-semibold">{copy.city}<input name="city" required maxLength={120} defaultValue={state.fields.city} autoComplete="address-level2" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
        <label className="text-sm font-semibold">{copy.district}<input name="district" required={zh} maxLength={120} defaultValue={state.fields.district} autoComplete="address-level3" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
        <label className="text-sm font-semibold">{copy.postal}<input name="postalCode" required={!zh} maxLength={40} defaultValue={state.fields.postalCode} autoComplete="postal-code" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
        <label className="text-sm font-semibold sm:col-span-2">{copy.line1}<input name="line1" required maxLength={240} defaultValue={state.fields.line1} autoComplete="address-line1" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
        <label className="text-sm font-semibold sm:col-span-2">{copy.line2}<input name="line2" maxLength={240} defaultValue={state.fields.line2} autoComplete="address-line2" className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>
        <label className="text-sm font-semibold sm:col-span-2">{copy.discount}<input name="discountCode" maxLength={64} defaultValue={state.fields.discountCode} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-mono font-normal uppercase" /></label>
      </div>{state.error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{copy.errors[state.error]}</p> : null}<div className="mt-7 flex flex-wrap items-center justify-between gap-5"><div className="text-xs text-stone-500"><p>{copy.policies}</p><nav aria-label={zh ? "店铺政策" : "Store policies"} className="mt-2 flex flex-wrap gap-3">{(["privacy", "terms", "returns", "shipping"] as const).map((slug) => <Link key={slug} href={`/policies/${slug}`} className="underline underline-offset-2">{{ privacy: zh ? "隐私" : "Privacy", terms: zh ? "服务条款" : "Terms", returns: zh ? "退货说明" : "Returns", shipping: zh ? "运费说明" : "Shipping" }[slug]}</Link>)}</nav></div><SubmitButton intent="quote" label={copy.calculate} className="rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60" /></div></section>
      <aside className="rounded-[2rem] bg-stone-950 p-6 text-white md:p-8"><h2 className="text-xl font-bold">{copy.shipping}</h2>{quote ? <><div className="mt-5 space-y-3">{quote.shippingOptions.map((option) => <label key={option.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 ${option.id === quote.selectedShippingRateId ? "border-emerald-400 bg-emerald-950" : "border-stone-700"}`}><span className="flex items-center gap-3"><input type="radio" name="selectedShippingRateId" value={option.id} defaultChecked={option.id === quote.selectedShippingRateId} /><span>{pickLocalizedText(option.name, zh ? "zh" : "en", zh ? "zh" : "en")}</span></span><span className="font-semibold">{option.free ? (zh ? "免费" : "Free") : money.format(option.priceMinor / 100)}</span></label>)}</div><dl className="mt-7 space-y-3 border-t border-stone-700 pt-6 text-sm"><div className="flex justify-between"><dt className="text-stone-400">{copy.subtotal}</dt><dd>{money.format(quote.subtotalMinor / 100)}</dd></div>{quote.discountMinor > 0 ? <div className="flex justify-between text-emerald-300"><dt>{copy.discountLine} · {quote.discountCode}</dt><dd>−{money.format(quote.discountMinor / 100)}</dd></div> : null}<div className="flex justify-between"><dt className="text-stone-400">{copy.shippingLine}</dt><dd>{money.format(quote.shippingMinor / 100)}</dd></div><div className="flex justify-between text-stone-400"><dt>{copy.weight}</dt><dd>{quote.totalWeightGrams} g</dd></div><div className="flex justify-between border-t border-stone-700 pt-4 text-lg font-bold"><dt>{copy.total}</dt><dd>{money.format(quote.totalMinor / 100)}</dd></div></dl><p className="mt-6 rounded-xl bg-emerald-900/50 p-4 text-sm leading-6 text-emerald-100">{copy.ready}</p>{enabledMethods.length > 0 ? <div className="mt-4 grid gap-3">{enabledMethods.map((method) => { const button = payButtonCopy[method.provider]!; return <SubmitButton key={method.provider} intent={`pay-${method.provider}` as PayIntent} label={zh ? button.zh : button.en} className={`w-full rounded-full px-6 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 ${button.className}`} />; })}</div> : <p className="mt-4 rounded-xl border border-stone-700 p-4 text-sm text-stone-400">{copy.paymentUnavailable}</p>}<p className="mt-3 text-xs text-stone-500">{copy.noTax}</p></> : <p className="mt-5 text-sm leading-6 text-stone-400">{zh ? "填写地址后计算可用配送方式与最终金额。" : "Complete the Address to calculate matching Shipping Rates and the final amount."}</p>}</aside>
    </form>
  </div></main>;
}
