# Foundation v1 implementation plan

This plan turns the accepted PRD into engineering milestones. Work stays in the current task: planning, implementation, review and acceptance are all owned here.

## Working rules

1. Product language comes from `CONTEXT.md`; accepted ADRs outrank the prototype.
2. A milestone is complete only after typecheck, interface tests, production build and its browser path are green.
3. Tests cross the highest useful interface. They describe Merchant or Shopper outcomes, not React or Prisma internals.
4. China Station and Global Station remain independently deployable. Shared rules move down into Core; regional and provider behavior never leaks sideways between applications.
5. `.env.local`, `.memory`, browser artifacts, build output, local databases and uploaded runtime files never enter Git.

## Milestones

| ID | Outcome | Depends on | Acceptance path |
| --- | --- | --- | --- |
| M0 | Engineering baseline | PRD | Install once; both Stations typecheck, test, build, start and answer health checks independently |
| M1 | Merchant establishes Store identity | M0 | Owner signs in, edits identity, refreshes, and Shopper sees the same persisted name/logo/footer; China filing fields never appear in Global Station |
| M2 | Merchant publishes the first Product | M1 | Create Product, merchant-named Options and Variants, upload images, set price/stock/category; Shopper can browse and 0 stock cannot be added |
| M3 | Shopper reaches a valid Checkout quote | M2 | Register/login, cart a Variant, enter address, choose matching Shipping Rate, apply one Discount Code and see a server-calculated no-tax total |
| M4 | China Station creates a paid Order | M3 | Alipay sandbox success confirms one Order and decrements reserved stock once; duplicate or invalid notifications cannot duplicate effects; WeChat remains disabled |
| M5 | Global Station creates paid Orders | M3 | PayPal and Stripe each complete a sandbox payment; language/currency selection and fallback are explicit and Order amounts are snapshotted |
| M6 | Merchant fulfills and notifies | M4 or M5 | Merchant sees a paid Order, enters tracking, marks shipped; Shopper sees tracking; paid/new-order/shipped Notice Mail events are deduplicated and retryable |
| M7 | Shopper and Merchant finish Return Requests | M6 | Unshipped approval refunds; shipped approval waits for goods; confirmation refunds once; rejection and retry states remain visible |
| M8 | Storefront Contact reaches Inbox | M1 | Anonymous or signed-in Shopper starts an on-site Conversation; Merchant sees unread state and replies in Inbox; widget never covers purchase controls |
| M9 | Foundation release hardening | M4–M8 | Desktop/mobile primary paths, authorization, recovery, backup/restore, migration, accessibility and patched dependency gates all pass |

## Current status

- M0 was committed and pushed as the formal engineering baseline.
- M1 is complete: the one Merchant owner signs in, edits Store identity and images, and both Storefronts read the persisted result through the same interfaces.
- M2 is complete: Merchant-owned Groups, Products, Options, Variants, prices, stock, weights and disk images persist in PostgreSQL-backed workflows; both Storefronts browse the Catalog and reject zero or insufficient stock at the server boundary.
- M3 is complete: Shopper Account authentication, mutable Cart, persisted Address, Merchant Discount Code / Shipping Rate / Store Handbook configuration, and the server-calculated no-tax Checkout Quote run in both Station flavors.
- M4 is complete for China Station: the pending-payment boundary holds immutable Payment Attempts with active Stock Reservations, and signature-verified Alipay evidence confirms exactly one Order and one stock decrement while duplicate or invalid notifications change nothing. WeChat remains disabled, and the Portal payment reconciliation table gives the Merchant an explicit recovery path for expired reservations.
- M5 is complete for Global Station: PayPal and Stripe ride the same Payment Attempt socket (ADR 0035), each provider completed a deterministic-adapter browser payment, Order amounts are USD-snapshotted, and the language-isolation debt found during acceptance (mixed-language chrome, raw status enums, OS-locale file inputs, a Tailwind cascade-layer bug on link colors) is eliminated.
- M6 is complete: the Merchant ships paid Orders with a tracking snapshot from the Portal, the Shopper sees tracking, and the three Notice Mail letters enqueue exactly once per business event and drain through owner-configured SMTP with a visible, retryable outbox.
- M7 is complete: one reason-bearing Return Request per paid Order, Merchant approval gates all money movement, unshipped approvals refund immediately through provider adapters while shipped approvals wait for confirmed goods, refunds apply exactly once with verified evidence, and rejections plus request history stay visible.
- M8 is next: Storefront Contact reaches Inbox — on-site conversations, unread state, replies, and a chat widget that never covers purchase controls.

## M0 acceptance checklist

- [x] Root pnpm workspace installs all applications and packages.
- [x] China Station and Global Station start on separate ports.
- [x] Both applications produce Next.js standalone builds.
- [x] Both health endpoints return the correct Station flavor.
- [x] Browser rendering has meaningful content, loaded CSS and icon, no framework overlay, and zero console errors.
- [x] Core and Config interfaces have behavior tests.
- [x] `docker compose config` validates PostgreSQL and Redis services.
- [x] A clean `pnpm verify` run is recorded after all baseline edits.
- [x] Initial Git baseline excludes secrets, browser artifacts and runtime output.

## M1 acceptance checklist

- [x] Prisma 7 migration owns Station identity and the one Merchant owner in PostgreSQL.
- [x] Auth.js Credentials login validates server-side against bcrypt and protects both the Portal layout and every mutation.
- [x] Store identity saves through one operation that stages disk images, commits PostgreSQL and cleans replaced files.
- [x] Storefront title, header, contact email, footer and China filing links read persisted identity after refresh.
- [x] Global Station does not render filing inputs and clears filing values at the persistence boundary.
- [x] Media accepts JPG, PNG and WebP signatures up to 5 MB, serves `nosniff`, rejects traversal paths and prevents cross-flavor reads.
- [x] Unit/interface tests, dedicated Postgres integration tests, production builds and both browser paths pass.

## M2 acceptance checklist

- [x] Merchant can create, edit, publish, unpublish and soft-delete a physical Product in either Station.
- [x] Product name, story and multiple JPG/PNG/WebP images persist through one staged disk-and-database operation.
- [x] Merchant-defined Options generate the complete Variant Cartesian product; zero Options still produces exactly one Variant.
- [x] Every Variant owns integer minor-unit Sell Price, optional higher original price, stock and positive shipping weight.
- [x] Merchant can create, edit, order, nest and delete Groups; Product membership is many-to-many and Group deletion never deletes Product.
- [x] Shopper can browse all published Products, search, filter by Group, open a detail page and switch merchant-defined choices.
- [x] Zero stock is visibly sold out and disabled; the Cart mutation also rejects zero stock and cumulative quantities above current stock.
- [x] Stable Variant combinations retain their identifiers and Cart lines across Product repricing; removed combinations cascade safely.
- [x] Fresh migrations, unit tests, PostgreSQL integration tests, production builds and desktop/mobile browser paths pass for both Station flavors.

## M3 acceptance checklist

- [x] Anonymous browsing remains public, while Cart → Checkout requires a flavor-scoped email/password Shopper Account and returns to Checkout after registration or login.
- [x] Owner and Shopper sessions use separate Auth.js boundaries; the Account surface only reads the current flavor's Shopper and persisted default Address.
- [x] Cart renders current Product, Variant, price, quantity and line total, and supports stock-checked update, line removal and clear operations.
- [x] Merchant can create, edit, enable and delete percentage/fixed Discount Codes and region/weight/free-over Shipping Rates in the protected Portal.
- [x] China and Global Address shapes validate at the server; unmatched Shipping Rates, inactive Codes and invalid Cart lines return explicit feedback.
- [x] Checkout re-reads live Variant price, stock, publication and weight; applies one Code from Sell Price; evaluates free shipping after discount; selects a matching Rate; and emits a no-tax total without trusting browser amounts.
- [x] Four reserved Store Handbook pages exist after migration, remain publicly readable when empty, and are linked from both Storefront footer and Checkout.
- [x] A fresh four-migration database, 26 unit/interface tests, 15 PostgreSQL tests, both production builds, production dependency audit and real dual-flavor browser flows pass.

## M4 acceptance checklist

- [x] Checkout initiation re-runs the server-side quote inside the reservation transaction and never trusts browser amounts.
- [x] Stock Reservations are created atomically against available stock; concurrent final-unit races leave exactly one winner.
- [x] Repeated initiation with the same checkout fingerprint reuses one pending Payment Attempt and reserves stock once.
- [x] Signature-verified Alipay sandbox evidence (notification, return query, status-page query, or cancel) confirms exactly one Order and decrements reserved stock exactly once.
- [x] Duplicate paid notifications stay idempotent; forged amounts, other merchants, and unsigned payloads are rejected with logged reasons and no side effects.
- [x] Orders snapshot Product/Variant labels, Address, Discount Code, Shipping Rate, currency and every amount before later Catalog edits can affect history.
- [x] WeChat Pay remains a disabled slot at the Portal, the Storefront checkout and the database constraint level.
- [x] Paid evidence confirms an attempt regardless of local expiry, while reservation release requires trusted closed provider evidence (ADR 0034).
- [x] The Portal payment reconciliation table gives the Merchant an explicit recovery path: pending attempts are settled through a provider query, releasing expired reservations without shopper cooperation.
- [x] A dedicated-database integration gate (6 payment tests), unit tests, both production builds, the production dependency audit and a full deterministic-adapter browser flow pass; acceptance fixtures were removed afterwards.

## M5 acceptance checklist

- [x] PayPal and Stripe adapters implement the shared Payment Attempt seam with provider-owned object references persisted for recovery and reconciliation.
- [x] PayPal money moves only through server-side capture; an approved buyer's close is honored by capturing, and a never-approved order releases without side effects.
- [x] Stripe evidence comes from a server-side session read or the HMAC-verified `checkout.session.completed` webhook; the browser return alone confirms nothing.
- [x] Checkout initiation re-runs the server-side quote inside the reservation transaction for both providers, and every attempt carries an immutable amount, Address and currency snapshot.
- [x] PayPal and Stripe each completed a deterministic-adapter browser payment confirming exactly one USD Order with snapshotted amounts and one stock decrement.
- [x] The Portal payment page configures both providers with readiness gating and lists every attempt for reconciliation with localized statuses.
- [x] UI chrome follows the Station flavor exclusively (Chinese on China Station, English on Global Station); raw status enums, eyebrows and native file inputs are localized or replaced; the Tailwind cascade-layer anchor-reset bug is fixed on both apps.
- [x] The dedicated-database gate (7 payment tests including the Global PayPal path), 15 plugin unit tests, both production builds, the production dependency audit and the deterministic browser flows pass; acceptance fixtures were removed afterwards.

## M6 acceptance checklist

- [x] The Merchant opens a paid Order in the Portal, enters a tracking number, and marks it shipped in one action; a second ship attempt is rejected by the domain and the database shipped-state CHECK.
- [x] The Shopper order view shows the tracking number and the shipped status immediately after the transition.
- [x] Payment confirmation enqueues the paid letter (Shopper) and the new-order letter (owner fallback: Station contact email) exactly once per Order, under repeated and concurrent confirmations.
- [x] Shipping enqueues the shipped letter containing the tracking snapshot exactly once.
- [x] Letters drain through the owner-configured SMTP transport (nodemailer, ADR 0033) or the dev deterministic adapter; drains never re-send a sent letter, failures record their error and stay retryable from the Portal outbox.
- [x] The Portal mail page holds SMTP settings (password never echoes) and the outbox with per-letter retry and body preview.
- [x] UI chrome stays flavor-pure (Chinese on China Station, English on Global Station) across the new surfaces.
- [x] The dedicated-database gate (3 fulfillment-mail tests plus all prior suites), unit tests, both production builds and the audit pass; a scripted end-to-end run against the live development database confirmed the full flow with real modules; acceptance fixtures were removed afterwards.

## M7 acceptance checklist

- [x] The Shopper opens exactly one Return Request per paid Order with a required reason; repeats and post-rejection re-requests are rejected by the domain.
- [x] The Merchant approves or refuses with an optional decision note; money never moves without approval and the refusal state plus history stay visible on both sides.
- [x] Unshipped approval refunds immediately through the original payment path; shipped approval waits for goods and the confirmation triggers the refund.
- [x] Refunds ride verified provider evidence through the adapters (Alipay out_request_no idempotency, PayPal capture refund, Stripe PaymentIntent refund) and apply exactly once; repeat evidence and provider retries never double-pay.
- [x] Shipping is blocked while a Return Request is open.
- [x] The dedicated-database gate (2 returns tests plus all prior suites), 21 plugin tests, pnpm verify and the audit pass; a scripted end-to-end run on the live development database proved both branches; acceptance fixtures were removed afterwards.
