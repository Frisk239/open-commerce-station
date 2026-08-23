# Global Station application

Independently deployable Next.js application for selling outside Mainland China. It composes shared commerce rules with English/USD defaults and the PayPal and Stripe capabilities. Multilingual Merchant content and extra currencies are implemented through shared Core rules plus Global Station configuration.

```powershell
pnpm dev
pnpm typecheck
pnpm build
pnpm start
```

Local default port: `3001`. Health check: `/api/health`.
