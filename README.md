# open-commerce-station

An open-source, source-delivered Foundation for a real Independent Station. A Merchant deploys exactly one flavor, configures it in the Merchant Portal, and operates it without changing application code.

## Applications

| Application | Product boundary | Current payment target | Local port |
| --- | --- | --- | --- |
| `apps/store-cn` | China Station | Alipay; WeChat Pay remains a disabled future capability | 3000 |
| `apps/store-global` | Global Station | PayPal and Stripe | 3001 |

The applications are independently deployable Next.js applications. Shared commerce rules belong in `packages/core`; station composition belongs in `packages/config`; true provider adapters belong in `packages/plugins` only when both production and test adapters exist.

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

Run either station:

```powershell
pnpm dev:cn      # http://localhost:3000
pnpm dev:global  # http://localhost:3001
```

Start local data services when a milestone needs persistence:

```powershell
pnpm db:up
pnpm db:down
```

Each production build uses Next.js standalone output. Package-level `pnpm start` copies the static assets into the standalone tree and runs its generated server.

## Verification seam

Following the engineering style proven in Live-Translator, tests sit on a small number of useful seams:

- `packages/core`: externally observable commerce and Storefront rules.
- `packages/config`: one-deploy/one-flavor application composition.
- Browser path: each Station's public UI and public HTTP callbacks, running through real application modules.
- Provider contracts: production and deterministic test adapters for payment and Notice Mail, added when those flows are implemented.

The standard gate is `pnpm verify`, followed by a browser path check for any UI or Route Handler change.

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

- Storefronts currently render the real empty-station shell, but Merchant Portal, persistence and owner authentication are not implemented yet.
- PostgreSQL and Redis are configured but no Prisma schema or runtime adapter is connected yet.
- Product, Checkout, Order, payment, Fulfillment, Return Request, Inbox and Notice Mail remain on the implementation plan.
- Next.js has announced a scheduled security patch for 2026-08-26; upgrade from 16.3.2 to the patched release before any public deployment.
