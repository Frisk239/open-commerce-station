# Data

This is the one PostgreSQL seam for both Station applications. Apps call the deep `readStoreIdentity`, `writeStoreIdentity`, and `authenticateOwner` interfaces; Prisma 7 and `pg` remain behind them.

## Schema and owner provisioning

```powershell
pnpm db:up
$env:DATABASE_URL = "postgresql://open_commerce_station:local-development-only@localhost:5432/open_commerce_station"
pnpm --filter @ocs/data db:migrate:dev

$env:OWNER_PASSWORD = "replace-with-a-long-local-password"
pnpm owner:hash
Remove-Item Env:OWNER_PASSWORD

$env:OWNER_EMAIL = "merchant@example.com"
$env:OWNER_PASSWORD_HASH = "paste-the-generated-bcrypt-hash"
pnpm db:seed
```

Production uses `pnpm db:migrate` during deployment. Never commit the real URL, password, Auth.js secret, or password hash.
