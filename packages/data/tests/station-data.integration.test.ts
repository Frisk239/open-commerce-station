import { hash } from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authenticateOwner,
  getPrismaClient,
  provisionOwner,
  readStoreIdentity,
  writeStoreIdentity,
} from "../src/index";

const runDatabaseTests = process.env.OCS_RUN_DB_TESTS === "1";

describe.skipIf(!runDatabaseTests)("PostgreSQL data interface", () => {
  const ownerEmail = "integration-owner@example.test";

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("open_commerce_station_test")) {
      throw new Error("Database integration tests require a dedicated open_commerce_station_test database.");
    }

    await getPrismaClient().station.deleteMany();
    await getPrismaClient().owner.deleteMany({ where: { email: ownerEmail } });
  });

  afterAll(async () => {
    await getPrismaClient().station.deleteMany();
    await getPrismaClient().owner.deleteMany({ where: { email: ownerEmail } });
    await getPrismaClient().$disconnect();
  });

  it("persists China identity and restores it through the public read interface", async () => {
    await writeStoreIdentity("cn", {
      name: "山川商店",
      contactEmail: "hello@example.test",
      footerLine: "山川商店 · 上海",
      icp: "沪ICP备12345678号",
    });

    await expect(readStoreIdentity("cn")).resolves.toMatchObject({
      name: "山川商店",
      contactEmail: "hello@example.test",
      footerLine: "山川商店 · 上海",
      icp: "沪ICP备12345678号",
    });
  });

  it("removes China-only filing values at the Global persistence boundary", async () => {
    await writeStoreIdentity("global", {
      name: "Atlas Goods",
      icp: "must-not-cross-the-flavor-boundary",
      policeRecord: "must-not-cross-the-flavor-boundary",
    });

    const identity = await readStoreIdentity("global");
    const record = await getPrismaClient().station.findUniqueOrThrow({ where: { flavor: "global" } });

    expect(identity).not.toHaveProperty("icp");
    expect(identity).not.toHaveProperty("policeRecord");
    expect(record.icp).toBeNull();
    expect(record.policeRecord).toBeNull();
  });

  it("authenticates the provisioned Merchant owner and rejects a wrong password", async () => {
    const password = "integration-password-only";
    await provisionOwner(ownerEmail, await hash(password, 4));

    await expect(authenticateOwner(ownerEmail.toUpperCase(), password)).resolves.toMatchObject({
      email: ownerEmail,
      name: "Merchant",
    });
    await expect(authenticateOwner(ownerEmail, "wrong-password")).resolves.toBeNull();
    await expect(getPrismaClient().owner.count()).resolves.toBe(1);
  });
});
