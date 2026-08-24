# Fulfillment and Notice Mail vertical cut (M6)

## Outcome

M6 is complete. The Merchant opens a paid Order in the Portal, enters a tracking number, and marks it shipped; the Shopper's order view shows the tracking immediately. Every payment confirmation enqueues the paid letter (to the Shopper) and the new-order letter (to the owner), and every shipment enqueues the shipped letter with the tracking snapshot — each exactly once, keyed by its business event. Letters drain through the owner-configured SMTP transport (ADR 0033) or, in development, a deterministic adapter that logs instead of sending; failures stay visible in the Portal outbox with retry. The Shopper password-reset token table ships in the migration; the request-and-reset flow remains follow-up work outside this milestone's acceptance path.

## Shipped interfaces

- Core Notice Mail composition: the three letters (ADR 0017) plus the system reset letter, rendered in each Station's voice with exact minor-unit amounts and order snapshots; event-key helpers for deduplication.
- Prisma models and constrained migration: Order tracking fields with a shipped-state CHECK (shipped ⇔ shippedAt + trackingNumber), the deduplicated MailOutbox (unique flavor + eventKey, status machine, attempt ceiling), standalone MailConfig (owner SMTP settings; the FK to Station identity was dropped so mail can be configured before identity), and single-use expiring ShopperPasswordReset tokens.
- Data operations: `markOrderShipped` (one-shot transition with the shipped letter), `enqueuePaidOrderNotices` (wired into every confirmation path of `confirmPaymentAttempt`), `drainNoticeMails` (per-flavor in-process mutex, once-only send marking), `retryNoticeMail`, MailConfig read/save with password-never-echoes semantics, and Portal outbox listing.
- Plugins: `MailTransportAdapter` seam, `createNodemailerTransport` (lazy-loaded SMTP), and `DeterministicMailTransport` for dev/test.
- Apps (both Stations): Portal ship form and shipped banner on the order detail, Portal mail page (SMTP settings + outbox with per-letter retry and body preview), mail nav entry, shopper tracking display, and mail flush hooks on the payment status page and the ship action.

## Verification

- `pnpm typecheck`, `pnpm test` (including 20 Core tests with the new mail composition suite), `pnpm build` for both Stations, and `pnpm audit --prod`: all green.
- Dedicated-database gate: the new fulfillment-mail integration suite (3 tests) covers the SMTP settings round-trip without password echo, paid-letter deduplication under repeated confirmation, the one-shot ship transition with its tracking letter, drain-once semantics, failed-letter retry, and no-resend of sent letters. All other database suites still pass (station, catalog, checkout, payment).
- End-to-end evidence against the live development database with real modules: a confirmed Order (duplicate confirmation included) produced exactly one paid letter and one owner letter; marking shipped produced the shipped letter containing the tracking number; the Shopper order read returned `fulfillment: shipped` with the tracking; drains delivered every letter exactly once. The composed subjects rendered in the Station voice (支付成功 / 新订单 / 已发货, each with the order number and store name).
- Browser walkthrough was blocked by an in-app webview environment failure (all input events intercepted late in the session; the identical login/cart/checkout flows passed in the M4 and M5 sessions). The scripted end-to-end run above exercises the same code paths the pages call.

## Boundary notes for M7 and beyond

- Return Requests (M7) read the Order's fulfillment snapshot to decide refund branches; the shipped-state CHECK guards the facts they need.
- The ShopperPasswordReset table and the outbox's `password-reset` letter kind are ready; the request page, tokenized email, and reset form remain follow-up work.
- Mail draining is page-triggered (ship action, payment status, Portal mail page) with the outbox as the backbone; a scheduled worker can call `drainNoticeMails` unchanged when the station grows.
- The owner fallback for the new-order letter is the Station contact email until MailConfig supplies an explicit owner mailbox.
