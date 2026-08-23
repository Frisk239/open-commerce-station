"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { Check, LockSimple, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Button, Field, Input } from "@/components/ui";
import { Money } from "@/components/money";
import { useFlavorState, useLocale, useSession, useT } from "@/lib/hooks";
import { cartSubtotal, resolveCart, useShop, variantLabelOf } from "@/mock/store";
import { pickText, type Flavor, type PaymentMethod } from "@/lib/types";

export default function CheckoutPage({ params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;
  const isCn = f === "cn";

  const st = useFlavorState(f);
  const session = useSession(f);
  const locale = useLocale(f);
  const t = useT(f);
  const placeOrder = useShop((s) => s.placeOrder);
  const router = useRouter();

  const lines = useMemo(() => resolveCart(st), [st]);
  const subtotal = cartSubtotal(st);

  const [address, setAddress] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    zip: "",
    country: isCn ? "中国" : "United States",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rateId, setRateId] = useState("");
  const [rateError, setRateError] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState(false);
  const [processing, setProcessing] = useState<PaymentMethod | null>(null);

  const discount = appliedCode ? st.discounts.find((d) => d.code.toUpperCase() === appliedCode!.toUpperCase() && d.active) : undefined;
  const discountOff = discount
    ? discount.percent
      ? Math.round((subtotal * discount.percent) / 100)
      : Math.min(discount.amountOff ?? 0, subtotal)
    : 0;
  const rate = st.shippingRates.find((r) => r.id === rateId);
  const shippingPrice = rate ? (rate.freeOver && subtotal - discountOff >= rate.freeOver ? 0 : rate.price) : null;
  const total = subtotal - discountOff + (shippingPrice ?? 0);

  const displayCurrency = useShop((s) => s.ui.displayCurrency[f]);
  const currencyNote = displayCurrency !== st.settings.accounting;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-lg font-medium text-ink">{t("checkout.emptyCart")}</p>
        <Link href={`/${f}/products`} className="mt-6 inline-block">
          <Button>{t("cart.emptyCta")}</Button>
        </Link>
      </div>
    );
  }

  if (!session.shopperEmail) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-lg font-medium text-ink">{t("checkout.needLogin")}</p>
        <Link href={`/${f}/login?next=/${f}/checkout`} className="mt-6 inline-block">
          <Button size="lg">{t("checkout.loginFirst")}</Button>
        </Link>
      </div>
    );
  }

  const set = (key: keyof typeof address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress((a) => ({ ...a, [key]: e.target.value }));

  const applyCode = () => {
    const code = codeInput.trim().toUpperCase();
    const hit = st.discounts.find((d) => d.code.toUpperCase() === code && d.active);
    if (hit) {
      setAppliedCode(hit.code);
      setCodeError(false);
    } else {
      setAppliedCode(null);
      setCodeError(true);
    }
  };

  const pay = (method: PaymentMethod) => {
    const required: Array<keyof typeof address> = isCn
      ? ["name", "phone", "region", "line1"]
      : ["name", "line1", "city", "region", "zip", "country"];
    const nextErrors: Record<string, string> = {};
    for (const key of required) {
      if (!address[key].trim()) nextErrors[key] = " ";
    }
    setErrors(nextErrors);
    setRateError(!rateId);
    if (Object.keys(nextErrors).length > 0 || !rateId) return;

    setProcessing(method);
    // 假支付：1.2 秒后成功，没有任何真实网络请求
    setTimeout(() => {
      const order = placeOrder(f, {
        address,
        shippingRateId: rateId,
        method,
        discountCode: appliedCode ?? undefined,
        locale,
      });
      if (order) {
        router.push(`/${f}/account/orders/${order.id}?paid=1`);
      } else {
        setProcessing(null);
      }
    }, 1200);
  };

  const policyLinks = (
    <div className="mt-4 text-xs leading-relaxed text-ink-faint">
      <p>
        {t("checkout.policyNote")}
        <Link href={`/${f}/pages/terms`} className="text-pine-700 underline-offset-2 hover:underline">
          {pickText(st.policies.find((p) => p.slug === "terms")?.title, locale, st.settings.primaryLocale)}
        </Link>
      </p>
      <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {st.policies.map((p) => (
          <Link key={p.slug} href={`/${f}/pages/${p.slug}`} className="hover:text-ink-soft hover:underline">
            {pickText(p.title, locale, st.settings.primaryLocale)}
          </Link>
        ))}
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t("checkout.title")}</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        <div className="space-y-8">
          {/* 联系方式与地址 */}
          <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-ink">{t("checkout.contact")} · {t("checkout.address")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t("checkout.f.name")} error={errors.name ? t("common.required") : undefined}>
                <Input value={address.name} onChange={set("name")} autoComplete="name" />
              </Field>
              <Field label={t("checkout.f.phone")}>
                <Input value={address.phone} onChange={set("phone")} autoComplete="tel" />
              </Field>
              {isCn ? (
                <>
                  <Field label={`${t("checkout.f.region")}`} error={errors.region ? t("common.required") : undefined}>
                    <Input value={address.region} onChange={set("region")} placeholder="省 / 市 / 区" />
                  </Field>
                  <Field className="sm:col-span-2" label={t("checkout.f.line1")} error={errors.line1 ? t("common.required") : undefined}>
                    <Input value={address.line1} onChange={set("line1")} placeholder="街道、门牌、楼层" />
                  </Field>
                </>
              ) : (
                <>
                  <Field className="sm:col-span-2" label={t("checkout.f.line1")} error={errors.line1 ? t("common.required") : undefined}>
                    <Input value={address.line1} onChange={set("line1")} autoComplete="address-line1" />
                  </Field>
                  <Field className="sm:col-span-2" label={t("checkout.f.line2")}>
                    <Input value={address.line2} onChange={set("line2")} autoComplete="address-line2" />
                  </Field>
                  <Field label={t("checkout.f.city")} error={errors.city ? t("common.required") : undefined}>
                    <Input value={address.city} onChange={set("city")} autoComplete="address-level2" />
                  </Field>
                  <Field label={t("checkout.f.region")} error={errors.region ? t("common.required") : undefined}>
                    <Input value={address.region} onChange={set("region")} autoComplete="address-level1" />
                  </Field>
                  <Field label={t("checkout.f.zip")} error={errors.zip ? t("common.required") : undefined}>
                    <Input value={address.zip} onChange={set("zip")} autoComplete="postal-code" />
                  </Field>
                  <Field label={t("checkout.f.country")} error={errors.country ? t("common.required") : undefined}>
                    <Input value={address.country} onChange={set("country")} autoComplete="country-name" />
                  </Field>
                </>
              )}
            </div>
          </section>

          {/* 配送方式：必须选一种 */}
          <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-ink">{t("checkout.shipping")}</h2>
            <div className="mt-4 space-y-2.5">
              {st.shippingRates.map((r) => {
                const free = r.freeOver && subtotal - discountOff >= r.freeOver;
                const selected = rateId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRateId(r.id);
                      setRateError(false);
                    }}
                    aria-pressed={selected}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                      selected ? "border-pine-700 bg-pine-50" : "border-line hover:border-ink/30"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex items-center justify-center rounded-full border ${
                          selected ? "border-pine-700 bg-pine-700 text-white" : "border-line"
                        }`}
                        style={{ height: 18, width: 18 }}
                      >
                        {selected ? <Check size={11} weight="bold" /> : null}
                      </span>
                      <span className="text-sm font-medium text-ink">
                        {pickText(r.name, locale, st.settings.primaryLocale)}
                      </span>
                    </span>
                    <span className="text-sm text-ink">
                      {free ? (
                        <span className="font-medium text-pine-700">{t("checkout.freeShipping")}</span>
                      ) : (
                        <Money flavor={f} minor={r.price} />
                      )}
                      {r.freeOver ? (
                        <span className="ml-2 text-xs text-ink-faint">
                          {t("checkout.freeOverPrefix")} <Money flavor={f} minor={r.freeOver} /> {t("checkout.freeOverSuffix")}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {rateError ? <p className="mt-2.5 text-sm text-rose-600">{t("checkout.shippingRequired")}</p> : null}
          </section>

          {/* 优惠码 */}
          <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-ink">{t("checkout.discountLabel")}</h2>
            {discount ? (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-pine-200 bg-pine-50 px-4 py-2.5">
                <p className="flex items-center gap-1.5 text-sm font-medium text-pine-800">
                  <Sparkle size={14} />
                  {t("checkout.applied")} {discount.code}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCode(null);
                    setCodeInput("");
                  }}
                  className="text-xs text-pine-700 underline-offset-2 hover:underline"
                >
                  {t("checkout.removeCode")}
                </button>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder={t("checkout.discountPlaceholder")}
                  className="max-w-64"
                />
                <Button variant="secondary" onClick={applyCode}>
                  {t("checkout.apply")}
                </Button>
              </div>
            )}
            {codeError ? <p className="mt-2 text-sm text-rose-600">{t("checkout.invalidCode")}</p> : null}
          </section>

          <Link href={`/${f}/cart`} className="inline-block text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
            {t("checkout.backToCart")}
          </Link>
        </div>

        {/* 摘要与付款 */}
        <aside className="h-fit space-y-4 rounded-xl border border-line bg-white p-5 lg:sticky lg:top-24">
          <h2 className="text-[15px] font-semibold text-ink">{t("checkout.summary")}</h2>
          <div className="space-y-3">
            {lines.map(({ line, product, variant }) => (
              <div key={line.variantId} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.images[0]} alt="" className="photo h-12 w-10 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{product.name[locale] ?? product.name[st.settings.primaryLocale]}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {variantLabelOf(product, variant, locale, st.settings.primaryLocale)} ×{line.qty}
                  </p>
                </div>
                <p className="text-sm text-ink-soft">
                  <Money flavor={f} minor={variant.price * line.qty} />
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 border-t border-line-soft pt-3 text-sm">
            <p className="flex justify-between text-ink-soft">
              <span>{t("checkout.subtotal")}</span>
              <Money flavor={f} minor={subtotal} />
            </p>
            {discountOff > 0 ? (
              <p className="flex justify-between text-pine-700">
                <span>
                  {t("checkout.discount")} {discount!.code}
                </span>
                <span>
                  -<Money flavor={f} minor={discountOff} />
                </span>
              </p>
            ) : null}
            <p className="flex justify-between text-ink-soft">
              <span>{t("checkout.shippingFee")}</span>
              {shippingPrice === null ? (
                <span className="text-ink-faint">{t("checkout.shippingRequired")}</span>
              ) : shippingPrice === 0 ? (
                <span className="font-medium text-pine-700">{t("checkout.freeShipping")}</span>
              ) : (
                <Money flavor={f} minor={shippingPrice} />
              )}
            </p>
            <p className="flex justify-between pt-1.5 text-base font-semibold text-ink">
              <span>{t("checkout.total")}</span>
              <Money flavor={f} minor={total} />
            </p>
          </div>

          {currencyNote ? (
            <p className="rounded-lg bg-mist px-3 py-2 text-xs leading-relaxed text-ink-soft">
              {t("checkout.currencyNoteA")} {displayCurrency}
              {t("checkout.currencyNoteB")} {st.settings.accounting}.
            </p>
          ) : null}

          {/* 付款：国内支付宝 + 灰微信；出海 PayPal / Stripe */}
          <div className="space-y-2.5 border-t border-line-soft pt-4">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
              <LockSimple size={13} />
              {t("checkout.payWith")}
            </p>
            {isCn ? (
              <>
                {st.settings.payments.alipay ? (
                  <Button size="lg" className="w-full" disabled={!!processing} onClick={() => pay("alipay")}>
                    {processing === "alipay" ? t("checkout.processing") : t("checkout.payAlipay")}
                  </Button>
                ) : null}
                <button
                  type="button"
                  disabled
                  className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-mist text-sm font-medium text-ink-faint"
                >
                  WeChat Pay
                  <span className="rounded-full bg-line px-2 py-0.5 text-[11px]">{t("checkout.wechatSoon")}</span>
                </button>
              </>
            ) : (
              <>
                {st.settings.payments.stripe ? (
                  <Button size="lg" className="w-full" disabled={!!processing} onClick={() => pay("stripe")}>
                    {processing === "stripe" ? t("checkout.processing") : t("checkout.payStripe")}
                  </Button>
                ) : null}
                {st.settings.payments.paypal ? (
                  <Button size="lg" variant="secondary" className="w-full" disabled={!!processing} onClick={() => pay("paypal")}>
                    {processing === "paypal" ? t("checkout.processing") : t("checkout.payPaypal")}
                  </Button>
                ) : null}
              </>
            )}
          </div>

          {policyLinks}
        </aside>
      </div>
    </div>
  );
}
