# Prisma talks to PostgreSQL

Schema, migrations, and TypeScript types for store data go through Prisma. This is not a second database. Swapping Prisma later is possible but not planned.

**Status:** accepted

**Considered Options:** Prisma; Drizzle; raw SQL only

**Consequences:** `packages/core` (or a data package) owns the Prisma schema. Apps do not each invent tables. Docker Postgres is the database Prisma targets.
