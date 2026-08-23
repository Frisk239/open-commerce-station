import { pickLocalizedText } from "@ocs/core";
import { listPortalProducts } from "@ocs/data";
import Image from "next/image";
import Link from "next/link";
import { removeProduct } from "./actions";

export default async function ProductsPage({ searchParams }: { readonly searchParams: Promise<{ deleted?: string; error?: string }> }) {
  const [products, params] = await Promise.all([listPortalProducts("global"), searchParams]);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Merchant Portal · Products</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.035em]">All products</h1><p className="mt-3 text-stone-600">Drafts stay private. Published Products appear on the Storefront immediately.</p></div>
        <Link href="/portal/products/new" className="rounded-full bg-stone-950 px-5 py-3 text-sm font-bold text-white">New product</Link>
      </div>
      {params.deleted === "1" ? <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Product deleted.</p> : null}
      {params.error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">That Product could not be found.</p> : null}
      <div className="mt-8 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        {products.length === 0 ? <p className="p-8 text-stone-500">No Products yet. Create the first one.</p> : products.map((product) => {
          const prices = product.variants.map((variant) => variant.sellPriceMinor);
          const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
          return <article key={product.id} className="grid gap-4 border-b border-stone-100 p-5 last:border-0 md:grid-cols-[5rem_1fr_auto] md:items-center">
            {product.imageUrls[0] ? <Image src={product.imageUrls[0]} alt="" width={160} height={160} className="size-20 rounded-2xl object-cover" /> : <div className="grid size-20 place-items-center rounded-2xl bg-stone-100 text-xs text-stone-400">No image</div>}
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{pickLocalizedText(product.name, "en", "en")}</h2><span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.published ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>{product.published ? "Published" : "Draft"}</span></div><p className="mt-2 text-sm text-stone-500">{money.format(Math.min(...prices) / 100)} · {product.variants.length} variants · {stock} in stock</p></div>
            <div className="flex gap-2"><Link href={`/portal/products/${product.id}`} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">Edit</Link><form action={removeProduct}><input type="hidden" name="id" value={product.id} /><button type="submit" className="rounded-full px-3 py-2 text-sm font-semibold text-red-700">Delete</button></form></div>
          </article>;
        })}
      </div>
    </section>
  );
}
