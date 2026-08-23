import { PrismaPg } from "@prisma/adapter-pg";
import { compare } from "bcryptjs";
import { createBlankStore, resolveStoreIdentity } from "@ocs/core";
import type { StationFlavor, StoreIdentity } from "@ocs/core";
import { PrismaClient } from "./generated/prisma/client";

export interface AuthenticatedOwner {
  readonly id: string;
  readonly email: string;
  readonly name: "Merchant";
}

interface PrismaSingleton {
  client?: PrismaClient;
}

const prismaSingleton = globalThis as typeof globalThis & PrismaSingleton;
const DUMMY_PASSWORD_HASH = "$2b$12$FCh.TUFvh.8HYxBSmexDnOGNxYMQuyAG92.0WaaH6mEyGs4/P/KaW";

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

function cleanOptional(value: string | undefined, maximumLength: number, label: string): string | null {
  const cleaned = value?.trim();

  if (cleaned && cleaned.length > maximumLength) {
    throw new Error(`${label} must be ${maximumLength} characters or fewer.`);
  }

  return cleaned ? cleaned : null;
}

export async function readStoreIdentity(flavor: StationFlavor): Promise<StoreIdentity & { name: string; footerLine: string }> {
  const record = await getPrismaClient().station.findUnique({ where: { flavor } });

  if (!record) {
    return resolveStoreIdentity(flavor, createBlankStore(flavor).identity);
  }

  return resolveStoreIdentity(flavor, {
    name: record.name,
    logoUrl: record.logoUrl ?? undefined,
    faviconUrl: record.faviconUrl ?? undefined,
    contactEmail: record.contactEmail ?? undefined,
    footerLine: record.footerLine ?? undefined,
    icp: record.icp ?? undefined,
    policeRecord: record.policeRecord ?? undefined,
    policeBadgeUrl: record.policeBadgeUrl ?? undefined,
  });
}

export async function writeStoreIdentity(
  flavor: StationFlavor,
  input: StoreIdentity,
): Promise<StoreIdentity & { name: string; footerLine: string }> {
  const requestedName = input.name?.trim();

  if (!requestedName || requestedName.length > 120) {
    throw new Error("Store name is required and must be 120 characters or fewer.");
  }

  const contactEmail = cleanOptional(input.contactEmail, 320, "Contact email");

  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error("Contact email must be a valid email address.");
  }

  const identity = resolveStoreIdentity(flavor, input);
  const filing = flavor === "cn"
    ? {
        icp: cleanOptional(identity.icp, 120, "ICP filing number"),
        policeRecord: cleanOptional(identity.policeRecord, 120, "Police filing number"),
        policeBadgeUrl: cleanOptional(identity.policeBadgeUrl, 512, "Police badge URL"),
      }
    : { icp: null, policeRecord: null, policeBadgeUrl: null };
  const data = {
    name: identity.name,
    logoUrl: cleanOptional(identity.logoUrl, 512, "Logo URL"),
    faviconUrl: cleanOptional(identity.faviconUrl, 512, "Favicon URL"),
    contactEmail,
    footerLine: cleanOptional(input.footerLine, 240, "Footer line"),
    ...filing,
  };

  const record = await getPrismaClient().station.upsert({
    where: { flavor },
    create: { flavor, ...data },
    update: data,
  });

  return resolveStoreIdentity(flavor, {
    name: record.name,
    logoUrl: record.logoUrl ?? undefined,
    faviconUrl: record.faviconUrl ?? undefined,
    contactEmail: record.contactEmail ?? undefined,
    footerLine: record.footerLine ?? undefined,
    icp: record.icp ?? undefined,
    policeRecord: record.policeRecord ?? undefined,
    policeBadgeUrl: record.policeBadgeUrl ?? undefined,
  });
}

export async function authenticateOwner(email: string, password: string): Promise<AuthenticatedOwner | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const owner = await getPrismaClient().owner.findUnique({ where: { email: normalizedEmail } });
  // Always perform the same expensive comparison so unknown emails do not get a fast timing oracle.
  const validPassword = await compare(password, owner?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!owner || !validPassword) {
    return null;
  }

  return { id: owner.id, email: owner.email, name: "Merchant" };
}

export async function provisionOwner(email: string, passwordHash: string): Promise<{ id: string; email: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.includes("@")) {
    throw new Error("OWNER_EMAIL must be a valid email address.");
  }

  if (!/^\$2[aby]\$/.test(passwordHash)) {
    throw new Error("OWNER_PASSWORD_HASH must be a bcrypt hash. Run `pnpm owner:hash` first.");
  }

  return getPrismaClient().$transaction(async (database) => {
    const existingOwners = await database.owner.findMany({
      orderBy: { createdAt: "asc" },
      take: 2,
      select: { id: true },
    });

    if (existingOwners.length > 1) {
      throw new Error("This v1 deployment must contain exactly one Merchant owner. Resolve the duplicate rows before provisioning.");
    }

    const existingOwner = existingOwners[0];
    if (existingOwner) {
      return database.owner.update({
        where: { id: existingOwner.id },
        data: { email: normalizedEmail, passwordHash },
        select: { id: true, email: true },
      });
    }

    return database.owner.create({
      data: { email: normalizedEmail, passwordHash },
      select: { id: true, email: true },
    });
  });
}
