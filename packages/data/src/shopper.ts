import { compare, hash } from "bcryptjs";
import { validateCheckoutAddress } from "@ocs/core";
import type { CheckoutAddress, StationFlavor } from "@ocs/core";
import { getPrismaClient } from "./client";
import { Prisma } from "./generated/prisma/client";

const DUMMY_PASSWORD_HASH = "$2b$12$FCh.TUFvh.8HYxBSmexDnOGNxYMQuyAG92.0WaaH6mEyGs4/P/KaW";

export interface AuthenticatedShopper {
  readonly id: string;
  readonly email: string;
  readonly name: "Shopper";
}

export interface SavedAddress extends CheckoutAddress {
  readonly id: string;
}

export class ShopperDataError extends Error {
  constructor(readonly code: "duplicate-email" | "invalid-credentials" | "not-found", message: string) {
    super(message);
    this.name = "ShopperDataError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validPassword(password: string): boolean {
  return password.length >= 12 && password.length <= 128;
}

export async function registerShopper(flavor: StationFlavor, email: string, password: string): Promise<AuthenticatedShopper> {
  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !validPassword(password)) {
    throw new ShopperDataError("invalid-credentials", "Use a valid email and a password between 12 and 128 characters.");
  }

  try {
    const shopper = await getPrismaClient().shopper.create({
      data: { flavor, email: normalizedEmail, passwordHash: await hash(password, 12) },
    });
    return { id: shopper.id, email: shopper.email, name: "Shopper" };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ShopperDataError("duplicate-email", "A Shopper Account already uses this email on this Station.");
    }
    throw error;
  }
}

export async function authenticateShopper(
  flavor: StationFlavor,
  email: string,
  password: string,
): Promise<AuthenticatedShopper | null> {
  const normalizedEmail = normalizeEmail(email);
  const shopper = await getPrismaClient().shopper.findUnique({
    where: { flavor_email: { flavor, email: normalizedEmail } },
  });
  const passwordMatches = await compare(password, shopper?.passwordHash ?? DUMMY_PASSWORD_HASH);
  return shopper && passwordMatches ? { id: shopper.id, email: shopper.email, name: "Shopper" } : null;
}

export async function requireShopper(flavor: StationFlavor, email: string): Promise<AuthenticatedShopper> {
  const shopper = await getPrismaClient().shopper.findUnique({
    where: { flavor_email: { flavor, email: normalizeEmail(email) } },
  });
  if (!shopper) throw new ShopperDataError("not-found", "Shopper Account not found.");
  return { id: shopper.id, email: shopper.email, name: "Shopper" };
}

function toAddress(record: {
  id: string;
  recipientName: string;
  phone: string;
  countryCode: string;
  region: string;
  city: string;
  district: string | null;
  postalCode: string | null;
  line1: string;
  line2: string | null;
}): SavedAddress {
  return {
    id: record.id,
    recipientName: record.recipientName,
    phone: record.phone,
    countryCode: record.countryCode,
    region: record.region,
    city: record.city,
    district: record.district ?? undefined,
    postalCode: record.postalCode ?? undefined,
    line1: record.line1,
    line2: record.line2 ?? undefined,
  };
}

export async function readDefaultAddress(flavor: StationFlavor, email: string): Promise<SavedAddress | null> {
  const shopper = await requireShopper(flavor, email);
  const address = await getPrismaClient().shopperAddress.findFirst({
    where: { shopperId: shopper.id, isDefault: true },
  });
  return address ? toAddress(address) : null;
}

export async function saveDefaultAddress(
  flavor: StationFlavor,
  email: string,
  address: CheckoutAddress,
): Promise<SavedAddress> {
  validateCheckoutAddress(flavor, address);
  const shopper = await requireShopper(flavor, email);
  return getPrismaClient().$transaction(async (database) => {
    const current = await database.shopperAddress.findFirst({ where: { shopperId: shopper.id, isDefault: true } });
    const data = {
      recipientName: address.recipientName.trim(),
      phone: address.phone.trim(),
      countryCode: address.countryCode.trim().toUpperCase(),
      region: address.region.trim(),
      city: address.city.trim(),
      district: address.district?.trim() || null,
      postalCode: address.postalCode?.trim() || null,
      line1: address.line1.trim(),
      line2: address.line2?.trim() || null,
      isDefault: true,
    };
    const saved = current
      ? await database.shopperAddress.update({ where: { id: current.id }, data })
      : await database.shopperAddress.create({ data: { shopperId: shopper.id, ...data } });
    return toAddress(saved);
  });
}
