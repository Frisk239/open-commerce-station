# Paid Order vertical cut (M4)

## Outcome

M4 is complete for China Station. Checkout initiation re-runs the full server-side quote inside a serializable transaction, reserves stock atomically, and hands Alipay an immutable Payment Attempt snapshot. A signature-verified Alipay notification — or an explicit query on return, on the payment status page, or from the Portal — confirms exactly one Order per attempt and converts the reservation into one permanent stock decrement. Duplicate, forged, or invalid notifications cannot duplicate any effect, and WeChat Pay remains a disabled slot. This closeout pass added the explicit recovery path the milestone was missing: a Portal reconciliation table where the Merchant sees every Payment Attempt and can settle pending ones, which releases expired reservations without shopper cooperation.

## Shipped interfaces

- Core payment rules: integer provider amount formatting/parsing, reservation-aware available stock, and strict paid-evidence validation (provider, reference, amount, currency).
- Prisma models and constrained migration for Payment Attempt, its line snapshots, Stock Reservation, Payment Provider Event, the Order snapshot tables and flavor-scoped Payment Method configuration.
- Serializable-transaction data operations: idempotent attempt creation (checkout fingerprint + partial unique index), once-only confirmation (unique Order per attempt, event dedup), trusted-evidence-only closure, and Portal attempt reads for reconciliation.
- `packages/plugins`: production Alipay adapter (signed page/wap checkout, `checkNotifySignV2` notification and return verification, app_id/seller_id checks, query and close) plus a deterministic contract adapter forbidden in production.
- `apps/store-cn`: payment start/return/status pages, shopper cancel action that confirms instead of closing when the provider reports paid, the Alipay notify HTTP callback with server-side rejection logging, Portal payment configuration with WeChat permanently disabled, and the new payment reconciliation table with a per-attempt 核销 action.
- store-global received read-only Order views only; Global payment providers remain M5 work.

## Verification

- `pnpm typecheck`: all workspace projects passed.
- `pnpm test`: Core, Config, Media, Portal and Plugins suites passed, including real-RSA Alipay signature, tampering, and merchant-mismatch tests.
- Dedicated-database gate (`open_commerce_station_test`): all four integration files passed — 3 Store identity, 6 Catalog, 6 Checkout and 6 Payment tests (deduplicated initiation, concurrent final-unit race, mismatched-evidence rejection, once-only confirmation with snapshot survival, trusted closure, and the new Portal reconciliation reads).
- `pnpm build`: both standalone applications compiled; store-cn emitted `/checkout/alipay/start/[id]`, `/checkout/alipay/return`, `/payment/[id]`, `/api/payments/alipay/notify` and `/portal/payments`.
- `pnpm audit --prod`: no known production dependency vulnerabilities.
- Browser acceptance on the deterministic adapter (dev server, real modules): Owner toggled Alipay off and back on with WeChat locked out; the Shopper logged in, carted a ¥100 Product, received a server-calculated ¥112 quote, paid, and landed on a paid status page holding Order `OC…`; the Order page showed snapshotted lines, Address, Shipping Rate and totals. A repeated paid notify returned `success` while the database still held exactly one Order and one stock decrement; a forged amount and a garbage notify both returned `failure` with the new server log naming the rejection code. A pending attempt holding the final unit was released through the Portal 核销 action (`cancelled`, reservation freed, available stock restored, still exactly one Order).
- All acceptance fixtures, temp scripts and the uploaded image were removed afterwards; the main database was re-checked empty across Order, Payment Attempt, Product, Shipping Rate, Shopper, Cart and Stock Reservation.

## Boundary notes for M5 and M6

- Global Station payment (PayPal and Stripe) reuses the Payment Attempt socket: provider adapters belong in `packages/plugins`, evidence must satisfy `validatePaidEvidence`, and Order snapshots must be taken from the attempt, never from live Catalog reads.
- Automatic expiry sweeping is deliberately absent: reservations are released only through trusted provider evidence (shopper return/status/cancel or Portal reconciliation). A scheduled sweeper, if ever added, must query the provider before releasing and must never race a late paid notification; paid evidence outranks local expiry (ADR 0034).
- Fulfillment transitions, Notice Mail delivery and Shopper password reset remain M6 work; Order views already expose the needed snapshot fields.
