# Return Request vertical cut (M7)

## Outcome

M7 is complete. The Shopper opens one Return Request per paid Order with a stated reason; the Merchant approves or refuses it with an optional decision note, and money never moves without that agreement (ADR 0010). An unshipped approval refunds immediately through the original payment path; a shipped approval waits for the goods, and the Merchant's confirmation triggers the refund. Refunds execute through provider adapters (Alipay trade refund, PayPal capture refund, Stripe PaymentIntent refund) carrying verified evidence, apply exactly once, and stay retryable without double-paying when a provider call fails. Rejections and the request history stay visible on both sides; an open request blocks shipping.

## Shipped interfaces

- Core: `RefundPaymentEvidence` with `validateRefundEvidence` (provider, reference, amount, currency, refund trade id, digest shape), `ReturnStatus` labels, and `OrderView` extended with `providerTradeNo`, `paymentReference`, `refundTradeNo` and `refundedAt`.
- Prisma models and constrained migration: Order refund fields with a refund-state CHECK (refunded ⇔ refundedAt + refundTradeNo; returnStatus refunded implies paymentStatus refunded), and the ReturnRequest history table (status machine, Shopper reason, Merchant note, opened/decided timestamps).
- Data operations (`packages/data/src/returns.ts`): `requestShopperReturn` (one request per Order lifetime, reason required, shopper-scoped), `decideReturnRequest` (approved/rejected with note), `applyOrderRefund` (verified-evidence, guarded one-shot transition on paid+approved, idempotent on repeats), `confirmReturnGoodsReceived` (shipped+approved guard), and `listOrderReturnRequests`; `markOrderShipped` now refuses an Order holding any return state.
- Plugins: optional `refund` on the provider seam; Alipay refund with `out_request_no` idempotency and signed-response verification, PayPal capture refund with exact amounts, Stripe refund with minor-unit amounts, and the deterministic adapter's instant refund evidence.
- Apps (both Stations): the Shopper order page holds the reason form and live return states; the Portal order detail shows the request history with reason and note, approve/refuse with a decision note, confirm-goods-and-refund (shipped) or retry-refund (unfulfilled), and the refund executes through the Station's provider immediately after approval as required.

## Verification

- `pnpm verify` (typecheck, all unit suites, both production builds) and `pnpm audit --prod`: green.
- Plugin suites grew to 21 tests including refund coverage for all three production adapters (request shape, exact amounts, provider ids, rejection paths).
- Dedicated-database gate: the new returns integration suite (2 tests) proves the unshipped one-shot refund with pre-approval money guard, the rejected state's visibility and one-request-per-Order rule with the note on record, the shipped waiting branch with confirm-then-refund, repeat-evidence idempotency, and the ship-block while a request is open. All prior suites still pass.
- End-to-end evidence against the live development database with real modules: both branches ran to `paymentStatus: refunded` with the refund trade number and timestamp recorded; repeat refund evidence changed nothing; the request history kept the Shopper reason and the Merchant note; shipping during an open request failed with the domain error.
- Browser walkthrough stayed blocked by the in-app webview environment failure documented in the M6 closeout; the scripted run exercises the same code paths the pages call.

## Boundary notes for M8 and beyond

- The Storefront Contact / Inbox milestone can start Return Requests from chat and show order-aware return state; the data operations here are the seam.
- Refund notice letters are outside ADR 0017's three-letter scope; if the product later wants refund confirmations in mail, the outbox and composition seam accept a new kind without schema change (the CHECK already enumerates it).
- Partial refunds remain modeled at the payment-contract level (`partially-refunded`, amount-bearing refund requests) but no product flow uses them yet.
