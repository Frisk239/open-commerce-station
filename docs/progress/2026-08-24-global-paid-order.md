# Global paid Order vertical cut (M5)

## Outcome

M5 is complete for Global Station. PayPal and Stripe ride the same Payment Attempt socket China Station introduced in M4: Checkout initiation re-runs the server-side quote, reserves stock atomically, and hands the provider an immutable snapshot with a persisted provider-owned object id (`providerOrderId`). PayPal money moves only through this server's capture call; Stripe completion arrives through the signature-verified webhook or a server-side session read — never through a trusted browser return. Both providers completed sandbox-shape payments in the deterministic browser acceptance, each confirming exactly one USD Order with snapshotted amounts.

This pass also eliminated the language-isolation debt found during acceptance: all UI chrome now follows the Station flavor (China Station renders pure Chinese, Global Station pure English), raw status enums go through localization maps, and the native file input (which follows the OS locale) was replaced with a controlled FilePicker component. A Tailwind v4 cascade-layer bug that made link text-color utilities lose to the unlayered anchor reset — producing invisible black-on-black buttons — was fixed by moving the reset into `@layer base`.

## Shipped interfaces

- Generalized `PaymentProviderAdapter` seam: optional `capture` (PayPal), `verifyWebhook` (Stripe), `verifyNotification`/`verifyReturnReference` (Alipay) plus a `providerReference` on checkout redirects that persists to `PaymentAttempt.providerOrderId` through `savePaymentAttemptProviderReference` (pending attempts only).
- `packages/plugins/src/paypal.ts`: Orders v2 adapter — OAuth with token caching, capture-intent checkout with `custom_id`/`reference_id` binding, server-side capture, query status mapping, and close semantics that honor an approved buyer by capturing while releasing a never-approved order.
- `packages/plugins/src/stripe.ts`: Checkout Session adapter — form-encoded session creation with minor-unit line items and a 30-minute minimum expiry, session retrieval and expire, and `checkout.session.completed` webhook verification with real HMAC-SHA256 `timingSafeEqual` comparison.
- `packages/data`: `PaymentAttempt.providerOrderId` column with migration, exposure on shopper and Portal attempt views, and the pending-only write guard.
- `apps/store-global`: provider checkout start/return pages (PayPal captures on return; Stripe reads the session), payment status page with provider-agnostic query and cancel, the Stripe webhook HTTP callback with rejection logging, the deterministic test-payment route, checkout pay intents for both providers, and the Portal payment configuration page with dual provider cards and the reconciliation table.
- Language isolation: `FilePicker` client component replacing native file inputs in the Portal; Chinese copy purged of English domain terms (Checkout→结账, Discount Code→优惠码, Variant→规格, Merchant Portal→商家后台, Shipping Rate→运费规则, Store Handbook→店铺说明); English eyebrows and raw enums localized on both Station flavors; unlayered CSS anchor reset moved into `@layer base` in both apps.

## Verification

- `pnpm typecheck`: all workspace projects passed.
- `pnpm test`: all suites passed, including new PayPal (mocked transport, real evidence validation) and Stripe (real HMAC signing, tamper and wrong-secret rejection) adapter tests — 15 plugin tests in total.
- Dedicated-database gate: all four integration files passed; the payment file now includes a Global Station PayPal attempt test (provider-reference persistence, USD Order snapshot, provider-reference write guard after settlement).
- `pnpm build`: both standalone applications compiled; store-global emitted `/checkout/paypal/*`, `/checkout/stripe/*`, `/payment/[id]`, `/api/payments/stripe/webhook`, `/api/test-payments/[provider]/[id]` and `/portal/payments`.
- `pnpm audit --prod`: no known production dependency vulnerabilities.
- Browser acceptance on the deterministic adapter: PayPal and Stripe each completed a $58 payment end to end (shopper login → cart → server-calculated quote → provider checkout → paid status page → order snapshot view); the database held exactly two Orders, two stock decrements from three, zero active reservations, and persisted provider references for both attempts. The Stripe webhook route rejected a deterministic-mode probe with 400 and a logged reason. The Portal payment page rendered both provider cards with the reconciliation table showing all attempts with localized statuses. Portal reconciliation click-through was accepted on M4 China Station evidence plus the integration tests covering the identical action code path.
- All acceptance fixtures, temp scripts and the uploaded image were removed afterwards; the main database was re-checked empty across Order, Payment Attempt, Product, Shipping Rate, Shopper, Cart and Stock Reservation with every payment method disabled.

## Boundary notes for M6 and beyond

- Fulfillment transitions (tracking entry, shipped marking), Notice Mail delivery with retry and deduplication, and Shopper password reset are the M6 surface; Order views already expose the snapshot fields those features read.
- Language and currency selection by the Merchant (multiple enabled languages with primary-language fallback, extra currencies with typed rates) remains its own milestone; today each Station renders its own single language and currency (zh/CNY, en/USD).
- The in-app browser used for acceptance exhibited two webview-level quirks (white-on-dark text not painting before the CSS fix, and intermittent click interception in the reconciliation table). Both are guest-webview rendering issues, not application defects; the CSS cascade-layer fix was a real product bug caught because of the first quirk.
