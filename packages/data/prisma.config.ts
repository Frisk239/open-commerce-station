import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Client generation and production builds do not need a live database.
    url: process.env.DATABASE_URL ?? "postgresql://open_commerce_station:local-development-only@localhost:5432/open_commerce_station",
  },
});
