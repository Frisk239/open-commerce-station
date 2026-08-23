# Engineering baseline closeout

**Milestone:** M0  
**Verdict:** passed

## Delivered

- Root pnpm workspace for both Station applications and shared packages.
- Independently runnable China Station and Global Station on ports 3000 and 3001.
- Next.js 16.3.2 App Router applications with Tailwind, Server Components and standalone output.
- Deep Core interface for blank Storefront identity, reserved Store Handbook pages and language fallback.
- Config interface for one-deploy/one-flavor defaults and payment capability composition.
- PostgreSQL 17 and Redis 7 Docker Compose services with health checks.
- Application health endpoints, standalone runner, icon and empty Storefront shell.
- Root install, build, typecheck, test, verify and data-service commands.

## Evidence

- `pnpm typecheck`: passed for Core, Config, Plugins, China Station and Global Station.
- `pnpm test`: 6 behavior tests passed across Core and Config.
- `pnpm build`: both Next.js applications produced standalone builds.
- `docker compose config --quiet`: passed.
- `pnpm audit --audit-level high`: no known vulnerabilities.
- HTTP smoke: both home pages returned 200; both health endpoints returned the correct flavor.
- Playwright CLI: both pages had meaningful content, one loaded stylesheet, an icon link, no error overlay, zero console errors and zero warnings.

## Engineering decisions

- The prototype's Next.js 15.4.6 was not copied because it is deprecated. The formal baseline uses current stable 16.3.2 and must take the announced 2026-08-26 security patch before public deployment.
- Live-Translator's Vitest 2 version was not copied because dependency audit found a patched critical vulnerability. The baseline uses Vitest 4.1.11 and Vite 8.2.2.
- Reads remain Server Components. Internal UI mutations will use Server Actions; Route Handlers are reserved for health checks and external provider callbacks.
- Provider seams are not invented early. Plugins gain an interface only with both a production adapter and a deterministic test adapter.
- On Windows, stop standalone servers before `pnpm verify`; a running generated server locks its build directory and prevents a clean rebuild.

## Debt carried into M1

- No Prisma schema, migration, database adapter, owner account or Merchant Portal yet.
- Store identity currently uses the Core blank-store default and is not persisted.
- Store Handbook links are visual labels until their real routes and persisted bodies are implemented.
