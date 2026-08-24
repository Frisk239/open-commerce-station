# open-commerce-station

An open-source, source-delivered Foundation for a real Independent Station. A Merchant deploys exactly one flavor, configures it in the Merchant Portal, and operates it without changing application code.

## Applications

| Application | Product boundary | Current payment target | Local port |
| --- | --- | --- | --- |
| `apps/store-cn` | China Station | Alipay; WeChat Pay remains a disabled future capability | 3000 |
| `apps/store-global` | Global Station | PayPal and Stripe | 3001 |

The applications are independently deployable Next.js applications. Shared commerce rules belong in `packages/core`; station composition belongs in `packages/config`; PostgreSQL access, disk media and the Store identity operation live behind the deep interfaces in `packages/data`, `packages/media` and `packages/portal`. True provider adapters belong in `packages/plugins` only when both production and test adapters exist.

## Engineering baseline

Requirements:

- Node.js 22 or newer
- pnpm 10
- Docker Desktop for PostgreSQL and Redis

Install and verify:

```powershell
pnpm install
pnpm verify
docker compose config
```

Create the local runtime contract once, then fill only local values:

```powershell
Copy-Item .env.example .env.local
```

`DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and the absolute `UPLOAD_DIR` are required for M1. `AUTH_TRUST_HOST` confirms that the deployment's reverse proxy validates the public Host before forwarding. Root commands load `.env.local` with Node's native environment-file support; the file remains ignored by Git.

Start PostgreSQL, apply the development migration, and provision the one Merchant owner:

```powershell
pnpm db:up:postgres
pnpm db:migrate

$env:OWNER_PASSWORD = "replace-with-a-long-local-password"
pnpm owner:hash
Remove-Item Env:OWNER_PASSWORD

# Put the printed hash and owner email into .env.local, then:
pnpm db:seed
```

Run either station:

```powershell
pnpm dev:cn      # http://localhost:3000
pnpm dev:global  # http://localhost:3001
```

Redis joins the local stack when a later milestone needs queues, rate limiting or cache state:

```powershell
pnpm db:up
pnpm db:down
```

Each production build uses Next.js standalone output. Package-level `pnpm start` copies the static assets into the standalone tree and runs its generated server.

## Verification seam

Following the engineering style proven in Live-Translator, tests sit on a small number of useful seams:

- `packages/core`: externally observable commerce and Storefront rules.
- `packages/config`: one-deploy/one-flavor application composition.
- `packages/data`: the real PostgreSQL persistence boundary for Store identity, Catalog, Cart, Shopper Account, Address and Checkout pricing configuration, with dedicated-database integration tests.
- `packages/media`: image signature, size, path isolation and filesystem behavior.
- `packages/portal`: authenticated Store identity, Group, Product, Discount Code, Shipping Rate and Store Handbook mutations, including staged disk-image replacement and shared presentation.
- `packages/storefront`: shared Catalog, Cart, Shopper authentication, Policy and Checkout Quote presentation; reads and authorization remain in each Station's Server Components and Server Actions.
- Browser path: each Station's public UI and public HTTP callbacks, running through real application modules.
- Provider contracts: production and deterministic test adapters for payment and Notice Mail, added when those flows are implemented.

The standard gate is `pnpm verify`, followed by `pnpm test:db` against a migrated database named `open_commerce_station_test`, then a browser path check for any UI or Route Handler change.

## Product sources of truth

- `CONTEXT.md`: domain language and product boundaries
- `docs/prd.md`: Foundation v1 requirements and acceptance scope
- `docs/adr/`: accepted product and architecture decisions
- `docs/design/`: topic designs
- `chanpin/`: interaction and visual reference, not production implementation
- `docs/implementation-plan.md`: engineering order and current milestones

When these disagree, accepted ADRs win, then topic designs, then the prototype for interaction and visual intent.

## Local credentials

Real sandbox and test values belong only in `.env.local`, which is ignored by Git. The committed `.env.example` is the public variable contract and contains placeholders only. Never place passwords, keys, payment links or full external transaction identifiers in source, logs, screenshots, Issues or documentation.

See `docs/credential-handoff.md` for the validated sandbox inventory and handoff procedure.

## Current engineering debt

- Store identity is complete, but Owner login does not yet have distributed attempt throttling or a password-reset flow. Add the rate-limit boundary before exposing a production Portal to the public internet.
- Auth.js v5 is still published under its beta tag. The implementation is isolated in each application's `src/auth.ts`; re-evaluate the accepted ADR when Auth.js/Better Auth publishes its next stable migration path.
- Shopper password reset has its token table and outbox letter kind ready; the request page and reset form remain follow-up work. Return Request, Inbox, Storefront Contact and Order-aware Support remain on the implementation plan; both Station flavors create paid Orders through their provider adapters (Alipay, PayPal, Stripe) and fulfill them with tracked shipping notices.
- Merchant language and currency selection (multiple enabled languages with primary fallback, extra currencies with typed rates) remains future work; each Station currently renders one language and one currency.
- Reservation release is explicit, not scheduled: expired Stock Reservations are freed only through trusted provider evidence on the Shopper paths or the Portal payment reconciliation action. A scheduled sweeper, if ever added, must query the provider before releasing (ADR 0034).
- Next.js has announced a scheduled security patch for 2026-08-26; upgrade from 16.3.2 to the patched release before any public deployment.
