import { pickLocalizedText } from "@ocs/core";
import { listPortalProducts } from "@ocs/data";
import Image from "next/image";
import Link from "next/link";
import { removeProduct } from "./actions";

export default async function ProductsPage({ searchParams }: { readonly searchParams: Promise<{ deleted?: string; error?: string }> }) {
  const [products, params] = await Promise.all([listPortalProducts("cn"), searchParams]);
  const money = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" });
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Merchant Portal · 商品</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.035em]">全部商品</h1><p className="mt-3 text-stone-600">草稿不会出现在店面；已发布商品会立即对顾客可见。</p></div>
        <Link href="/portal/products/new" className="rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white">新建商品</Link>
      </div>
      {params.deleted === "1" ? <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">商品已删除。</p> : null}
      {params.error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">找不到这个商品。</p> : null}
      <div className="mt-8 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        {products.length === 0 ? <p className="p-8 text-stone-500">还没有商品。先创建第一个 Product。</p> : products.map((product) => {
          const prices = product.variants.map((variant) => variant.sellPriceMinor);
          const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
          return <article key={product.id} className="grid gap-4 border-b border-stone-100 p-5 last:border-0 md:grid-cols-[5rem_1fr_auto] md:items-center">
            {product.imageUrls[0] ? <Image src={product.imageUrls[0]} alt="" width={160} height={160} className="size-20 rounded-2xl object-cover" /> : <div className="grid size-20 place-items-center rounded-2xl bg-stone-100 text-xs text-stone-400">无图片</div>}
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{pickLocalizedText(product.name, "zh", "zh")}</h2><span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.published ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>{product.published ? "已发布" : "草稿"}</span></div><p className="mt-2 text-sm text-stone-500">{money.format(Math.min(...prices) / 100)} · {product.variants.length} 个规格 · 库存 {stock}</p></div>
            <div className="flex gap-2"><Link href={`/portal/products/${product.id}`} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">编辑</Link><form action={removeProduct}><input type="hidden" name="id" value={product.id} /><button type="submit" className="rounded-full px-3 py-2 text-sm font-semibold text-red-700">删除</button></form></div>
          </article>;
        })}
      </div>
    </section>
  );
}
