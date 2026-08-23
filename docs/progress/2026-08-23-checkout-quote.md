# Checkout Quote vertical cut

## Outcome

M3 is complete for China Station and Global Station. An anonymous Shopper can build a persisted Cart, but Checkout requires a flavor-isolated email/password Shopper Account. The Shopper supplies the Station-appropriate delivery Address, enters at most one Discount Code, selects a matching Shipping Rate and receives a live no-tax Checkout Quote calculated entirely from server-side facts. The Merchant operates Codes, Rates and the four reserved Store Handbook pages from protected Portal surfaces.

## Shipped interfaces

- Core Address validation, percentage/fixed discount calculation, region/weight/free-over shipping matching and integer-minor-unit Checkout Quote composition.
- Prisma models and constrained migration for Shopper, default Address, Discount Code, Shipping Rate and the four seeded Policy records.
- Bcrypt Shopper registration/authentication, flavor ownership checks, default Address persistence and separately named Auth.js sessions from the Merchant owner.
- Current-fact Cart reads plus stock-checked quantity update, line removal and clear operations.
- Protected Merchant Portal CRUD for Discount Codes and Shipping Rates, plus editable Store Handbook content.
- Public Cart, Shopper login/register/account, Checkout and Policy routes in both Station flavors, with all four Policy links at Checkout and in the Storefront footer.

## Verification

- `pnpm typecheck`: all workspace projects passed.
- `pnpm test`: 14 Core, 2 Config, 3 Media and 7 Portal tests passed; the 15 database tests remain intentionally skipped in this unit gate.
- Fresh database gate: `open_commerce_station_test` was dropped and recreated, all four migrations deployed, then 3 Store identity, 6 Catalog and 6 Checkout PostgreSQL integration tests passed.
- `pnpm build`: both Next.js 16.3.2 standalone applications compiled and emitted Account, Cart, Checkout, Policy and Portal commerce routes.
- `pnpm audit --prod`: no known production dependency vulnerabilities.
- Browser acceptance: both Station flavors created Merchant configuration through the protected Portal, added a real Product to Cart, enforced Shopper registration and returned to Checkout. China rejected an unmatched province and produced `¥100 − ¥10 + ¥12 = ¥102`; Global rejected an invalid Code and produced `$50 − $5 + $8 = $53`. Both cases prove that a free-over threshold is evaluated after discount. Shopper Address persistence, owner/Shopper identity coexistence, public empty Policy behavior, Cart quantity updates and a clean post-fix runtime log were also checked.

All temporary Owner, Shopper, Product, Cart, Discount Code, Shipping Rate and uploaded image fixtures were removed after acceptance and verified absent from the main database.

## Boundary notes for M4 and M5

- Checkout Quote is recalculable and does not reserve stock, create an Order or trust any client-submitted amount. Payment initiation must re-run the same facts inside the pending-payment/reservation boundary.
- A successful payment must snapshot Product/Variant labels, Address, Code, Rate, currency and every amount before later Catalog edits can affect history.
- Shopper password reset is deliberately coupled to the Notice Mail delivery/retry boundary and remains for M6; Account ownership is already flavor-scoped for future Order reads.
