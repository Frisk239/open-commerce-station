import { pickLocalizedText } from "@ocs/core";
import type { ReservedPolicy, StationFlavor } from "@ocs/core";
import Link from "next/link";

export function PolicyPage({ flavor, policy }: { readonly flavor: StationFlavor; readonly policy: ReservedPolicy }) {
  const zh = flavor === "cn";
  const title = pickLocalizedText(policy.title, zh ? "zh" : "en", zh ? "zh" : "en");
  const body = pickLocalizedText(policy.body, zh ? "zh" : "en", zh ? "zh" : "en");
  return <main className="min-h-screen bg-stone-50 px-5 py-12 text-stone-950 md:px-10 md:py-20"><article className="mx-auto max-w-3xl"><Link href="/" className="text-sm font-semibold underline underline-offset-4">{zh ? "返回店铺" : "Back to store"}</Link><p className="mt-12 text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Store Policy</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.04em]">{title}</h1>{body ? <div className="mt-9 whitespace-pre-wrap rounded-3xl border border-stone-200 bg-white p-7 leading-8 md:p-10">{body}</div> : <div className="mt-9 rounded-3xl border border-dashed border-stone-300 p-10 text-stone-500">{zh ? "Merchant 尚未填写这份政策。购买前请联系商家确认。" : "The Merchant has not written this policy yet. Contact the store before purchasing."}</div>}</article></main>;
}
