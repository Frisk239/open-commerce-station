# Redis in the first version

Development Docker runs Redis next to Postgres. The first version may use it for sessions, cache, and later mail queues. It is not a second database of record; orders and catalog stay in PostgreSQL.

**Status:** accepted

**Considered Options:** no Redis in v1; Redis from the start

**Consequences:** Compose has three long-lived stores in spirit: Postgres (source of truth), Redis (speed and short-lived), disk (images). Deploy docs must include Redis. Do not put orders only in Redis.
