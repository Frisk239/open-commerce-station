import type { DiscountRuleView, StationFlavor } from "@ocs/core";

interface DiscountManagerProps {
  readonly flavor: StationFlavor;
  readonly discounts: readonly DiscountRuleView[];
  readonly saveAction: (formData: FormData) => void | Promise<void>;
  readonly deleteAction: (formData: FormData) => void | Promise<void>;
  readonly saved?: boolean;
  readonly error?: boolean;
}

const copy = {
  cn: { eyebrow: "Merchant Portal · 优惠", title: "Discount Code", intro: "每次 Checkout 最多使用一个 Code；优惠始终从 Sell Price 小计扣减。", code: "Code", kind: "类型", percent: "按比例", fixed: "固定金额", value: "数值", active: "启用", create: "新建 Code", save: "保存", remove: "删除", saved: "Discount Code 已保存。", error: "没有保存：请检查 Code、类型与数值。" },
  global: { eyebrow: "Merchant Portal · Discounts", title: "Discount Codes", intro: "Checkout accepts one Code at a time, always deducted from the Sell Price subtotal.", code: "Code", kind: "Type", percent: "Percentage", fixed: "Fixed amount", value: "Value", active: "Enabled", create: "New Code", save: "Save", remove: "Delete", saved: "Discount Code saved.", error: "Not saved: check the Code, type, and value." },
} as const;

function Fields({ flavor, discount }: { readonly flavor: StationFlavor; readonly discount?: DiscountRuleView }) {
  const labels = copy[flavor];
  const value = discount?.kind === "percentage" ? (discount.percentageBps ?? 0) / 100 : (discount?.amountMinor ?? 0) / 100;
  return <>{discount ? <input type="hidden" name="id" value={discount.id} /> : null}<label className="text-xs font-semibold text-stone-600">{labels.code}<input name="code" required maxLength={64} defaultValue={discount?.code ?? ""} className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 font-mono text-sm uppercase text-stone-950" /></label><label className="text-xs font-semibold text-stone-600">{labels.kind}<select name="kind" defaultValue={discount?.kind ?? "percentage"} className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950"><option value="percentage">{labels.percent}</option><option value="fixed">{labels.fixed}</option></select></label><label className="text-xs font-semibold text-stone-600">{labels.value}<input name="value" required type="number" min="0.01" step="0.01" defaultValue={value || ""} className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-950" /></label><label className="flex items-center gap-2 pb-2 text-sm font-semibold"><input name="enabled" type="checkbox" defaultChecked={discount?.enabled ?? true} className="size-4 accent-emerald-700" />{labels.active}</label></>;
}

export function DiscountManager({ flavor, discounts, saveAction, deleteAction, saved, error }: DiscountManagerProps) {
  const labels = copy[flavor];
  return <section><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">{labels.eyebrow}</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.035em]">{labels.title}</h1><p className="mt-3 max-w-2xl leading-7 text-stone-600">{labels.intro}</p>{saved ? <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{labels.saved}</p> : null}{error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{labels.error}</p> : null}<form action={saveAction} className="mt-8 grid gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-[1.5fr_1fr_1fr_auto_auto] md:items-end md:p-7"><Fields flavor={flavor} /><button className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-bold text-white">{labels.create}</button></form><div className="mt-6 space-y-3">{discounts.map((discount) => <div key={discount.id} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:grid-cols-[1.5fr_1fr_1fr_auto_auto_auto] md:items-end"><form action={saveAction} className="contents"><Fields flavor={flavor} discount={discount} /><button className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">{labels.save}</button></form><form action={deleteAction}><input type="hidden" name="id" value={discount.id} /><button className="rounded-full px-4 py-2 text-sm font-semibold text-red-700">{labels.remove}</button></form></div>)}</div></section>;
}
