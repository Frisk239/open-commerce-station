# Complete Independent Station capabilities

Research snapshot for grilling product form. Not an ADR. Not a stack choice.

A complete Independent Station is a merchant-owned branded site that can **sell, fulfill, support, and run again** without writing application code. Shopify-class stations split work into Theme (layout) vs Merchant Portal (operations). Apps fill channels (chat, pixels, carriers), not the order engine.

Primary sources: [Shopify admin](https://help.shopify.com/en/manual/shopify-admin), [Shopify Inbox](https://help.shopify.com/en/manual/inbox), [Shopify fulfillment](https://help.shopify.com/en/manual/fulfillment/features-overview), [Medusa Commerce Modules](https://docs.medusajs.com/resources/commerce-modules), [Shoplazza](https://www.shoplazza.cn/), [BeikeShop](https://docs.beikeshop.com/about/introduction.html), [InnoShop](https://docs.innoshop.cn/zh/introduction/architecture.html), [Alipay 电脑网站支付](https://opendocs.alipay.com/open/00dn7j), [企业微信·微信客服](https://developer.work.weixin.qq.com/document/path/94638).

## Capability layers

| Layer | Job | Typical home |
| --- | --- | --- |
| Storefront | Shopper browse, cart, checkout, order status | Theme |
| Merchant Portal | Catalog, orders, customers, theme content, settings | First-party |
| Payments | Capture, refund, wallets | First-party + provider plugin |
| Fulfillment | Rates, tracking, labels | First-party rates; carrier as plugin |
| Customer service | Widget / launcher + inbox + order context | First-party slot; Chatwoot-class or channel QR |
| Notifications | Order email/SMS | First-party transactional |
| Marketing | Abandoned checkout, campaigns, pixels | Plugin / later |
| Analytics | Sales snapshot, traffic | First-party basic + Umami/GA |

Do not copy: mini-program mall DNA (拼团, 砍价, 三级分销, 直播带货, 多商户入驻) and marketplace ERP (领星/店小秘 as the product).

## Merchant Portal nav (Shopify-shaped)

```
Home
Orders
Catalog
Customers
Online store     theme, menus, pages
Discounts
Inbox
Analytics
Apps
Settings
  Payments · Shipping · Tax · Domains · Staff · Notifications · Markets
```

Sources: [Shopify admin overview](https://help.shopify.com/en/manual/shopify-admin/shopify-admin-overview), [Medusa Admin](https://docs.medusajs.com/user-guide/), BeikeShop default sidebar.

## Must exist to sell

Physical goods, one flavor (China Station or Global Station):

1. Theme: home, collection, PDP, cart, legal pages; merchant edits content slots  
2. Catalog: product, media, price, inventory, one category, one menu  
3. Checkout: guest allowed; address; shipping rate; tax rule  
4. Payments: China = Alipay Page + WAP; Global = Stripe PaymentIntent + PayPal (+ Apple/Google Pay via Stripe)  
5. Orders: list, detail, capture, fulfill with tracking paste  
6. Transactional mail: order confirm; staff new-order alert  
7. Owner login in Merchant Portal  
8. Policies linked at checkout  

China Station extra to sell locally: 省市区 address, SMS OTP, 运费模板, 微信客服 URL/QR, ICP footer display, invoice **request** (provider can be stub).

## Shortly after first sale

Refund / cancel · returns · customer profile · Inbox (human chat or email) · discount code · custom domain · shipping notification · reviews · staff role · tax/sales report.

China: 快递轨迹订阅, 电子面单, WeChat Pay Native/H5, 数电发票 provider.  
Global: duties/DDP fields, cookie/consent, VAT display.

## Customer service is four layers

Shopify Inbox is a **widget + staff chat**, not a helpdesk. Gorgias-class value is **order context in the ticket**. Shoplazza/SHOPLINE also ship a **WhatsApp/WeChat launcher** (`wa.me` / QR) with no live-chat protocol.

| Layer | What | Day-one shape |
| --- | --- | --- |
| Storefront contact | Widget and/or messenger launcher | Merchant toggle, no theme code |
| Inbox | Email + chat + one messenger | Chatwoot-class or channel window |
| Order context | Tracking, refund from the thread | Without this, CS is a toy |
| Self-serve | FAQ + order status | Pages + account |

China default messenger is 微信/企微. Global default is email + WhatsApp/IG. That is a **channel split**, not a feature toggle.

Sources: [Shopify Inbox](https://help.shopify.com/en/manual/inbox), [Gorgias vs Inbox](https://www.gorgias.com/comparison/shopify-inbox), [Shoplazza WhatsApp 悬浮窗](https://helpcenter.shoplazza.com/hc/zh-cn/articles/53604682740249).

## Wait / plugin / never-core

Wait: gift cards, subscriptions, bundles, price lists, multi-warehouse, Flow automation, AI agent, theme marketplace, marketing cloud, POS.

China never-core: 拼团, 砍价, 分销, 直播, 六端小程序, 多商户, 同城骑手.

Global never-core for this Foundation: Shopify POS, marketplace sync, Shop Pay itself, Capital.

## Medusa module names (shared language, not a stack pick)

Product, Pricing, Inventory, Stock Location, Cart, Order, Payment, Fulfillment, Customer, Promotion, Region, Tax, Sales Channel, Store, Currency, User, Auth, Translation. [List](https://docs.medusajs.com/resources/commerce-modules).

## Full feature checklist (for grilling, not a v1 promise)

| Area | Items |
| --- | --- |
| Storefront | Theme, home, collection, PDP, cart, checkout, search, CMS pages, blog, guest checkout, order status, reviews, i18n, multi-currency, cookie banner |
| Portal | Home, products/variants/media, collections, orders, fulfill, refund, returns, customers, discounts, pages/menus, staff, reports, plugins |
| Pay Global | Stripe PaymentIntent, PayPal, Apple/Google Pay, capture/refund, webhooks, fraud/3DS |
| Pay China | Alipay Page+WAP, later WeChat Native/H5/JSAPI, refund |
| Ship | Zones/rates, location, tracking paste; later labels, 快递100, DDP/duties |
| Tax | Inclusive vs exclusive; destination rates; China 发票 request |
| CS | Widget and/or WhatsApp/WeChat launcher; inbox; order in ticket; FAQ |
| Mail | Transactional templates; later campaigns (listmonk-class) |
| Marketing | Abandoned checkout, GA/Meta/TikTok pixels, product feed — plugin |
| Legal | Privacy, terms, refund, shipping; GDPR export/delete; ICP footer (China) |
| China-only | SMS OTP, 省市区, 运费模板, 微信客服 QR, 发票, 国内快递, 人民币 |
| Not this product | 拼团/砍价/分销/直播/小程序商城/多商户/POS/marketplace ERP |

## Clone additions (this round)

Already had engines, independent stations, china malls, payment SDKs. This round added Chatwoot, listmonk, umami, and China adapters (WeChat Pay, 快递100, 省市区, 发票 SDK). See `reference/README.md`.

Skipped as too large, wrong job, or blocked on Windows: Bytedesk (~2.4GB), Live Helper Chat, Zammad, WooCommerce/Bagisto/Shopware, saleor-dashboard (illegal `*` filename on NTFS).
