import Link from "next/link";
import { createBlankStore, pickLocalizedText } from "@ocs/core";
import { getStationConfig } from "@ocs/config";
import { listPublishedProducts } from "@ocs/data";
import { CatalogGrid } from "@ocs/storefront/catalog-grid";
import Image from "next/image";
import { getStoreIdentity } from "../store";

export const dynamic = "force-dynamic";

export default async function StorefrontHome() {
  const config = getStationConfig("global");
  const store = createBlankStore(config.flavor);
  const [identity, products] = await Promise.all([getStoreIdentity(), listPublishedProducts("global")]);

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4 md:px-10">
        <Link href="/" aria-label={identity.name} className="flex min-h-8 items-center">
          {identity.logoUrl ? <Image src={identity.logoUrl} alt={identity.name} width={176} height={36} className="max-h-9 max-w-44 object-contain" /> : <span className="text-sm font-bold tracking-tight">{identity.name}</span>}
        </Link>
        <nav aria-label="Storefront navigation" className="flex gap-5 text-sm text-stone-600">
          <Link href="/products">All products</Link>
          <Link href="#handbook">Store handbook</Link>
        </nav>
      </header>

      <section className="grid min-h-[68svh] place-items-center px-6 py-20 text-center">
        <div className="max-w-2xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">Global Station</p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.04em] md:text-7xl">{products.length > 0 ? "Physical goods, thoughtfully selected" : "Products are coming soon"}</h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-stone-600">{products.length > 0 ? "Independently selected, priced, and fulfilled by the Merchant. Explore everything currently available." : "This Independent Station is ready to configure and operate. The Merchant has not published the first Product yet."}</p>
          {products.length > 0 ? <Link href="/products" className="mt-8 inline-block rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white">Browse all products</Link> : null}
        </div>
      </section>

      <section id="products" className="border-y border-stone-200 px-6 py-20 md:px-10">
        <div className="mx-auto max-w-7xl"><div className="mb-9 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Catalog</p><h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">Latest products</h2></div>{products.length > 0 ? <Link href="/products" className="text-sm font-semibold underline underline-offset-4">View all</Link> : null}</div><CatalogGrid products={products.slice(0, 8)} locale="en" currency="USD" emptyTitle="The Catalog is still empty" emptyBody="Products will appear here after the Merchant publishes them." /></div>
      </section>

      <footer id="handbook" className="px-6 py-10 md:px-10">
        <nav aria-label="Store handbook" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-stone-600">
          {store.policies.map((policy) => (
            <span key={policy.slug}>{pickLocalizedText(policy.title, "en", "en")}</span>
          ))}
        </nav>
        {identity.contactEmail ? <a href={`mailto:${identity.contactEmail}`} className="mt-6 inline-block text-sm text-stone-600 underline decoration-stone-300 underline-offset-4">{identity.contactEmail}</a> : null}
        <p className="mt-8 text-sm text-stone-500">{identity.footerLine}</p>
      </footer>
    </main>
  );
}
