# Global Station application

Independently deployable Next.js application for selling outside Mainland China. It composes shared commerce rules with English/USD defaults and the PayPal and Stripe capabilities. Multilingual Merchant content and extra currencies are implemented through shared Core rules plus Global Station configuration.

Run from the repository root so the ignored root `.env.local` contract is loaded:

```powershell
pnpm dev:global
pnpm --filter @ocs/store-global typecheck
pnpm --filter @ocs/store-global build
pnpm start:global
```

Local default port: `3001`. Health check: `/api/health`. The public Storefront is `/`; the protected Store identity page is `/portal/settings`. China filing controls are absent by construction.
