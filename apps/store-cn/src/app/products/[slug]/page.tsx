import { pickLocalizedText } from "@ocs/core";
import { readPublishedProduct } from "@ocs/data";
import { ProductPurchasePanel } from "@ocs/storefront/purchase-panel";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreIdentity } from "../../../store";
import { addToCart } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { readonly params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [identity, product] = await Promise.all([getStoreIdentity(), readPublishedProduct("cn", slug)]);
  if (!product) notFound();
  const name = pickLocalizedText(product.name, "zh", "zh");
  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4 md:px-10"><Link href="/" className="font-bold">{identity.name}</Link><Link href="/products" className="text-sm text-stone-600">返回全部商品</Link></header>
      <article className="mx-auto grid max-w-7xl gap-10 px-5 py-10 md:px-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)] lg:py-16">
        <div className="grid gap-4 sm:grid-cols-2">{product.imageUrls.map((url, index) => <Image key={url} src={url} alt={index === 0 ? name : `${name} ${index + 1}`} width={1000} height={1000} loading={index === 0 ? "eager" : "lazy"} className={`w-full rounded-3xl bg-stone-100 object-cover ${index === 0 ? "sm:col-span-2" : ""}`} />)}</div>
        <div className="h-fit lg:sticky lg:top-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Product</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.04em] md:text-5xl">{name}</h1><div className="mt-7"><ProductPurchasePanel options={product.options} variants={product.variants} locale="zh" currency="CNY" action={addToCart} /></div>{pickLocalizedText(product.story, "zh", "zh") ? <div className="mt-9 border-t border-stone-200 pt-7"><h2 className="text-sm font-bold">商品故事</h2><p className="mt-3 whitespace-pre-line leading-7 text-stone-600">{pickLocalizedText(product.story, "zh", "zh")}</p></div> : null}</div>
      </article>
    </main>
  );
}
