import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

interface PrismaSingleton {
  client?: PrismaClient;
}

const prismaSingleton = globalThis as typeof globalThis & PrismaSingleton;

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required to use @ocs/data. Copy the documented value into the deployment environment.");
  }

  return url;
}

export function getPrismaClient(): PrismaClient {
  if (!prismaSingleton.client) {
    const adapter = new PrismaPg({ connectionString: databaseUrl() });
    prismaSingleton.client = new PrismaClient({ adapter });
  }

  return prismaSingleton.client;
}
