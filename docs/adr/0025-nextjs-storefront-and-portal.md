# Next.js for Storefront and Merchant Portal

Both the Storefront and the Merchant Portal are Next.js apps in TypeScript. China Station and Global Station remain two independently deployable apps that share packages. We do not run a separate admin framework.

**Status:** accepted

**Considered Options:** Next.js for both; Next.js storefront plus a different admin shell

**Consequences:** `apps/store-cn` and `apps/store-global` are Next.js. Portal routes live with each app or a shared Next package composed into both. `chanpin/` prototypes should follow the same screens so they can guide this stack.
