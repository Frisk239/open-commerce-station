# Store identity closeout

**Milestone:** M1
**Verdict:** passed

## Delivered

- Prisma 7 schema and deployable migration for Station identity and one Merchant owner.
- Lazy PostgreSQL Adapter behind `readStoreIdentity`, `writeStoreIdentity`, `authenticateOwner` and owner provisioning interfaces.
- Auth.js Credentials login with bcrypt, JWT session, 12-hour expiry, custom login pages and authorization repeated inside every Server Action.
- Shared Merchant Portal Store identity form for name, logo, favicon, public email, footer and China-only filing values.
- Disk image Adapter with 5 MB limit, magic-byte allowlist, UUID filenames, absolute upload root, immutable caching and `nosniff` responses.
- Dynamic Storefront title, header identity, contact email, footer and official China filing links.
- Root `.env.local` command runner, explicit trusted-host contract and documented migration/owner provisioning path.

## Evidence

- `pnpm typecheck`: passed across all eight implementation workspaces.
- `pnpm test`: 12 unit/interface tests passed; the database suite is skipped in the environment-free default gate.
- `pnpm test:db`: 3 tests passed against a separately migrated `open_commerce_station_test` PostgreSQL database.
- `pnpm build`: both Next.js 16.3.2 applications produced standalone builds with all M1 routes dynamic.
- Standalone smoke: both persisted Storefronts returned 200, both anonymous Portal routes redirected to login, and Auth.js session/login endpoints ran with the explicit trusted-host contract.
- `pnpm audit --audit-level high`: no known vulnerabilities after pinning Prisma CLI's vulnerable `deepmerge-ts` transitive dependency to the compatible patched 8.0.2 release.
- Browser, China Station: protected redirect, correct login, name/logo/favicon/contact/footer/filing save, refreshed persistence and zero console warnings/errors.
- Browser, Global Station: rejected bad credentials, correct login, no filing controls, save/refresh persistence and zero console warnings/errors.
- HTTP media: CN image returned `200 image/png` plus `X-Content-Type-Options: nosniff`; the same CN path returned `404` from Global Station.

## Interface decisions

- Applications do not import generated Prisma records or concatenate upload paths.
- `packages/portal` owns the whole update transaction across validation, disk staging, database persistence and old-image cleanup.
- Server reads use React `cache` for per-request deduplication. UI mutations use Server Actions; Auth.js and public media use Route Handlers.
- Global filing isolation is enforced twice: the form omits the controls and the data Adapter persists those columns as null.
- Prisma 7.9.1 still requests `deepmerge-ts` 7.1.5, so the workspace lockfile overrides it to 8.0.2; client generation, migration deploy, database integration and both production builds verify compatibility.

## Debt carried into M2

- Distributed login attempt throttling and owner password reset are not implemented.
- Auth.js v5 remains a beta-tag dependency and is isolated for later migration.
- Store Handbook content still has no real routes; its labels remain non-clickable until content editing lands.
- The scheduled Next.js security release on 2026-08-26 must be applied before public deployment.
