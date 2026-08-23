# PostgreSQL in Docker

Application data lives in PostgreSQL. Local development runs Postgres in Docker. The first version does not support swapping databases. Production may reuse the same image; how a helper deploys it is later, not a hosting product.

**Status:** accepted

**Considered Options:** PostgreSQL; MySQL; SQLite as the only store

**Consequences:** `chanpin/` need not run Docker. Implementation apps expect a Compose (or equivalent) Postgres service. Document the Compose file next to the apps, not as a SaaS.
