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
- M3 is next: turn the persisted anonymous Cart into an authenticated Checkout quote with address, Shipping Rate, Discount Code and one server-calculated total.

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
