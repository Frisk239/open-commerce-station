import Link from "next/link";
import { createBlankStore, pickLocalizedText, resolveStoreIdentity } from "@ocs/core";
import { getStationConfig } from "@ocs/config";

export default function StorefrontHome() {
  const config = getStationConfig("cn");
  const store = createBlankStore(config.flavor);
  const identity = resolveStoreIdentity(config.flavor, store.identity);

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4 md:px-10">
        <span className="text-sm font-bold tracking-tight">{identity.name}</span>
        <nav aria-label="店面导航" className="flex gap-5 text-sm text-stone-600">
          <Link href="#products">全部商品</Link>
          <Link href="#handbook">店铺说明</Link>
        </nav>
      </header>

      <section className="grid min-h-[68svh] place-items-center px-6 py-20 text-center">
        <div className="max-w-2xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">China Station</p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.04em] md:text-7xl">商品即将上架</h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-stone-600">这是一家已经可以配置和经营的独立站，只是 Merchant 还没有发布第一件 Product。</p>
        </div>
      </section>

      <section id="products" className="border-y border-stone-200 px-6 py-20 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Catalog 还是空的</h2>
        <p className="mt-3 text-stone-600">Merchant 发布 Product 后，它们会出现在这里。</p>
      </section>

      <footer id="handbook" className="px-6 py-10 md:px-10">
        <nav aria-label="店铺说明" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-stone-600">
          {store.policies.map((policy) => (
            <span key={policy.slug}>{pickLocalizedText(policy.title, "zh", "zh")}</span>
          ))}
        </nav>
        <p className="mt-8 text-sm text-stone-500">{identity.footerLine}</p>
      </footer>
    </main>
  );
}
