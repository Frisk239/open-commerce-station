# China Station application

Independently deployable Next.js application for Mainland China. It composes shared commerce rules with Chinese defaults, CNY, China filing fields and the Alipay capability. WeChat Pay remains visible only as a future disabled capability until its own accepted implementation slice.

Run from the repository root so the ignored root `.env.local` contract is loaded:

```powershell
pnpm dev:cn
pnpm --filter @ocs/store-cn typecheck
pnpm --filter @ocs/store-cn build
pnpm start:cn
```

Local default port: `3000`. Health check: `/api/health`. The public Storefront is `/`; the protected Store identity page is `/portal/settings`.
