# China Station application

Independently deployable Next.js application for Mainland China. It composes shared commerce rules with Chinese defaults, CNY, China filing fields and the Alipay capability. WeChat Pay remains visible only as a future disabled capability until its own accepted implementation slice.

```powershell
pnpm dev
pnpm typecheck
pnpm build
pnpm start
```

Local default port: `3000`. Health check: `/api/health`.
