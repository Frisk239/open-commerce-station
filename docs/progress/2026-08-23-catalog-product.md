# Catalog Product vertical cut

## Outcome

M2 is complete for China Station and Global Station. A Merchant can organize Groups, create a physical Product, define arbitrary Options and values, operate every generated Variant, upload real product images, and publish or unpublish the listing. A Shopper can browse, search, filter, open the Product, switch choices and add an available Variant to a persisted anonymous Cart. Zero and insufficient stock are rejected again at the PostgreSQL-backed server boundary.

## Shipped interfaces

- Core Catalog validation and deterministic Option-to-Variant Cartesian combinations.
- Prisma models and deployable migrations for Group, Product, images, Option values, Variants, selections, Cart and Cart lines, with database numeric and flavor constraints.
- Flavor-isolated Group and Product persistence, soft Product deletion and stable Variant identifiers across repricing.
- Staged disk image uploads that roll back new files when validation or persistence fails and clean replaced files after commit.
- Shared Merchant Portal Product editor and Group manager, with authenticated Station-specific Server Actions.
- Storefront home Catalog, all-Products search and Group filter, Product detail, choice switching, original price, low-stock/sold-out display and Cart mutation.

## Verification

- `pnpm typecheck`: all workspace projects passed.
- `pnpm test`: Core, Config, Media and Portal suites passed; database suites remain intentionally skipped in the unit gate.
- `pnpm test:db`: 3 Store identity and 6 Catalog PostgreSQL integration tests passed against a dedicated database recreated from all three migrations.
- `pnpm build`: both Next.js 16.3.2 standalone applications compiled and emitted every Portal and Storefront Catalog route.
- `pnpm audit --prod`: no known production dependency vulnerabilities.
- Browser acceptance: both Stations published a real uploaded image; China exercised two merchant-named Variants including sold-out and cumulative-stock rejection, while Global exercised the zero-Option/single-Variant path. Product unpublish hid the China detail page. Product detail and Portal editing were also checked at a 390 px viewport with no horizontal overflow.

All temporary Products, Groups, Cart data, upload copies and the browser-test owner were removed after acceptance.

## Boundary notes for M3

- Cart stores only Variant identity and quantity. It deliberately does not snapshot or trust client price/stock; Checkout must re-read both.
- Editing a Product preserves Variant identifiers for unchanged combination keys, so existing Cart lines survive repricing and revalidate against current facts.
- Cart does not reserve or decrement stock. The future Order/payment workflow owns the once-only reservation/decrement decision.
