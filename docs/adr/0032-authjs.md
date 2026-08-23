# Auth.js for Shopper and owner login

Email-and-password sign-in uses Auth.js. Shopper checkout login and the single owner Portal login both go through it. Google-style OAuth waits; the same library can add it later.

**Status:** accepted

**Considered Options:** Auth.js; hand-rolled sessions only

**Consequences:** Credentials provider in v1. Redis may hold sessions if we wire it that way; Postgres remains the account source of truth.
