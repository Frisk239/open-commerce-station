import { pickLocalizedText } from "@ocs/core";
import { listCatalogGroups, listPublishedProducts } from "@ocs/data";
import { CatalogGrid } from "@ocs/storefront/catalog-grid";
import Link from "next/link";
import { getStoreIdentity } from "../../store";

export const dynamic = "force-dynamic";

export default async function CatalogPage({ searchParams }: { readonly searchParams: Promise<{ q?: string; group?: string }> }) {
  const params = await searchParams;
  const [identity, groups, products] = await Promise.all([
    getStoreIdentity(),
    listCatalogGroups("cn"),
    listPublishedProducts("cn", { query: params.q, groupSlug: params.group }),
  ]);
  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 px-5 py-4 md:px-10"><Link href="/" className="font-bold">{identity.name}</Link><nav aria-label="店面导航" className="flex gap-5 text-sm text-stone-600"><Link href="/products">全部商品</Link><Link href="/portal">商家后台</Link></nav></header>
      <section className="mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Catalog</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.04em]">全部商品</h1></div><p className="text-sm text-stone-500">{products.length} 件商品</p></div>
        <form className="mt-8 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_14rem_auto]">
          <label className="sr-only" htmlFor="catalog-search">搜索商品</label><input id="catalog-search" name="q" defaultValue={params.q ?? ""} placeholder="搜索商品" className="rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-emerald-700" />
          <label className="sr-only" htmlFor="catalog-group">商品分组</label><select id="catalog-group" name="group" defaultValue={params.group ?? ""} className="rounded-xl border border-stone-300 bg-white px-4 py-2.5"><option value="">所有分组</option>{groups.map((group) => <option key={group.id} value={group.slug}>{pickLocalizedText(group.name, "zh", "zh")}</option>)}</select>
          <button className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-bold text-white">筛选</button>
        </form>
        <div className="mt-10"><CatalogGrid products={products} locale="zh" currency="CNY" emptyTitle="没有找到商品" emptyBody="试试清空搜索词或选择其他分组。" /></div>
      </section>
    </main>
  );
}
