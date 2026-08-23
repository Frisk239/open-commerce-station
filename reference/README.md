# Local reference projects

Clone open-source projects used for local development reference into the category folders below.

Git ignores everything in this directory except this file, so the clones, their history, and their licenses stay local. These trees are study material only. They do not choose a stack for open-commerce-station. Copy ideas and contracts — not licenses or vendor lock-in — into `packages/core`, `packages/plugins`, or the two store apps.

## Layout

```
reference/
  headless/                 Global engines and storefronts
  independent-station/      Branded DTC / cross-border stations
  china-mall/               Mainland B2C catalog, order, member
  payments/                 Official provider SDKs
  customer-service/         Inbox / widget (Chatwoot)
  ops/                      Email campaigns (listmonk), analytics (umami)
  china-adapters/           WeChat Pay, 快递100, 省市区, 发票 SDK
  ai-support/               How to feed a store handbook to AI (RAGFlow, AnythingLLM)
```

## Open this when

| You are working on | Start here |
| --- | --- |
| `packages/plugins` seam, module vs adapter | `headless/vendure`, then `headless/medusa` |
| `apps/store-global` regions, Stripe, PayPal | `headless/medusa`, `payments/stripe-node`, `payments/paypal-typescript-server-sdk` |
| Storefront UI (PDP, cart, checkout) | `headless/saleor-storefront`, `headless/vercel-commerce` |
| GraphQL / multi-channel catalog | `headless/saleor` |
| A smaller full-stack TypeScript store | `headless/evershop` |
| Independent-station product shape (i18n, multi-currency, brand site) | `independent-station/innoshop`, `independent-station/beikeshop` |
| `apps/store-cn` Alipay and local operations | `independent-station/shopxo`, `payments/alipay-sdk-nodejs-all` |
| Shared catalog / SKU / cart / order / member language | `china-mall/mall`, then `china-mall/mall4j` |
| Inbox, live chat widget, omnichannel desk | `customer-service/chatwoot` |
| Campaign / newsletter mail | `ops/listmonk` |
| Privacy-first store analytics | `ops/umami` |
| China WeChat Pay, 快递, 省市区, 发票 protocol | `china-adapters/` |
| AI reading store pages / FAQ as a handbook | `ai-support/ragflow`, `ai-support/anything-llm` |

## Inventory

### headless/

| Directory | Upstream | Why it is here |
| --- | --- | --- |
| `medusa/` | [medusajs/medusa](https://github.com/medusajs/medusa) | Headless engine with module/plugin split, multi-region, Stripe and PayPal. Closest global Shopify-alternative architecture. |
| `vendure/` | [vendurehq/vendure](https://github.com/vendurehq/vendure) | TypeScript core with the cleanest plugin API. Use when designing `packages/plugins`. |
| `saleor/` | [saleor/saleor](https://github.com/saleor/saleor) | GraphQL-first headless core, multi-channel catalog and checkout. |
| `saleor-storefront/` | [saleor/storefront](https://github.com/saleor/storefront) | Next.js App Router storefront against a headless API. |
| `evershop/` | [evershopcommerce/evershop](https://github.com/evershopcommerce/evershop) | Smaller TypeScript full-stack store: catalog, checkout, admin in one readable tree. |
| `vercel-commerce/` | [vercel/commerce](https://github.com/vercel/commerce) | Compact Next.js storefront patterns (PDP, cart, checkout UI). |

### independent-station/

| Directory | Upstream | Why it is here |
| --- | --- | --- |
| `innoshop/` | [innocommerce/innoshop](https://github.com/innocommerce/innoshop) | Chinese-origin independent station: Laravel modules, i18n, multi-currency, Stripe/PayPal plugins. |
| `beikeshop/` | [beikeshop/beikeshop](https://github.com/beikeshop/beikeshop) | Cross-border independent station: i18n, multi-currency, PayPal/Stripe, Alipay via plugin. |
| `shopxo/` | [gongfuxiang/shopxo](https://github.com/gongfuxiang/shopxo) | Mainland China independent mall (PC + H5), MIT, Alipay and local operations. |

### china-mall/

| Directory | Upstream | Why it is here |
| --- | --- | --- |
| `mall/` | [macrozheng/mall](https://github.com/macrozheng/mall) | High-star Chinese B2C domain model: catalog, SKU, cart, order, member, admin. |
| `mall4j/` | [gz-yami/mall4j](https://github.com/gz-yami/mall4j) | Smaller modern Java B2C (Spring Boot + Vue3) with Alipay-era China checkout. |

### payments/

| Directory | Upstream | Why it is here |
| --- | --- | --- |
| `stripe-node/` | [stripe/stripe-node](https://github.com/stripe/stripe-node) | Official Stripe Node SDK. Pair with PaymentIntent, not legacy Tokens. |
| `paypal-typescript-server-sdk/` | [paypal/PayPal-TypeScript-Server-SDK](https://github.com/paypal/PayPal-TypeScript-Server-SDK) | Official PayPal server SDK for Sandbox REST calls. |
| `alipay-sdk-nodejs-all/` | [alipay/alipay-sdk-nodejs-all](https://github.com/alipay/alipay-sdk-nodejs-all) | Official Alipay Node SDK for RSA2 sign/verify. |
| `alipay-easysdk/` | [alipay/alipay-easysdk](https://github.com/alipay/alipay-easysdk) | Official Alipay Easy SDK (Java/C#/PHP/TS) for comparing provider adapters. |

### customer-service/

| Directory | Upstream | Why it is here |
| --- | --- | --- |
| `chatwoot/` | [chatwoot/chatwoot](https://github.com/chatwoot/chatwoot) | Shopify Inbox / Gorgias analog: storefront widget, email, WhatsApp, help center. MIT core. |

### ops/

| Directory | Upstream | Why it is here |
| --- | --- | --- |
| `listmonk/` | [knadh/listmonk](https://github.com/knadh/listmonk) | Self-hosted campaigns and lists. Not transactional order mail. |
| `umami/` | [umami-software/umami](https://github.com/umami-software/umami) | One-script store analytics, MIT. |

### china-adapters/

| Directory | Upstream | Why it is here |
| --- | --- | --- |
| `wechatpay-axios-plugin/` | [TheNorthMemory/wechatpay-axios-plugin](https://github.com/TheNorthMemory/wechatpay-axios-plugin) | WeChat Pay APIv3 (Native / H5 / JSAPI). |
| `kuaidi100-php-demo/` | [kuaidi100-api/php-demo](https://github.com/kuaidi100-api/php-demo) | Official 快递100 track / 电子面单 flow. |
| `china-area-data/` | [airyland/china-area-data](https://github.com/airyland/china-area-data) | 省市区 data for China checkout. |
| `invoice-sdk-nodejs/` | [fapiaoapi/invoice-sdk-nodejs](https://github.com/fapiaoapi/invoice-sdk-nodejs) | 数电发票 request shape (provider, not a tax engine). |

### ai-support/

| Directory | Upstream | Why it is here |
| --- | --- | --- |
| `ragflow/` | [infiniflow/ragflow](https://github.com/infiniflow/ragflow) | How lasting store copy is looked up, not dumped into one prompt. |
| `anything-llm/` | [Mintplex-Labs/anything-llm](https://github.com/Mintplex-Labs/anything-llm) | Smaller “upload docs and ask” shape. |

## Considered, not cloned

| Project | Reason skipped |
| --- | --- |
| WooCommerce, PrestaShop, Shopware | Too large and too coupled to WordPress/legacy PHP storefronts. |
| Bagisto, Sylius | Overlap with InnoShop/BeikeShop (Laravel/PHP commerce) and with Vendure's plugin model. |
| Spree | Ruby stack is unlikely to be the implementation language. |
| CRMEB, Tigshop, litemall | Mini-program / multi-end China malls, not independent-station shaped. |
| Reaction Commerce | Discontinued. |
| medusajs/nextjs-starter-medusa | Archived; storefront now lives in the Medusa monorepo. |
| Your Next Store | Stripe-only Next.js store; overlap with `vercel-commerce`. |
| Bytedesk | China WeChat CS; GitHub tree is ~2.4GB. Channel model is documented in research notes instead. |
| Live Helper Chat, Zammad | CS overlap with Chatwoot, or ITSM-shaped and large. |
| saleor/saleor-dashboard | Merchant Portal UI. Full checkout on Windows fails: the tree contains `.github/instructions/*.instructions.md` (`*` is not a legal NTFS filename). Read it on GitHub; Saleor core is already cloned. |
| Dify, FastGPT | Large AI app builders. Study later if we need a full workflow studio; not the store's CS product. |

Re-clone into the matching category after a reset:

```powershell
git clone https://github.com/<owner>/<repo>.git reference/<category>/<directory>
```
