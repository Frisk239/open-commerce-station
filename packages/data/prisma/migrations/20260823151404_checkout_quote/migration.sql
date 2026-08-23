-- CreateTable
CREATE TABLE "Shopper" (
    "id" TEXT NOT NULL,
    "flavor" VARCHAR(16) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shopper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopperAddress" (
    "id" TEXT NOT NULL,
    "shopperId" TEXT NOT NULL,
    "recipientName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "region" VARCHAR(120) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "district" VARCHAR(120),
    "postalCode" VARCHAR(32),
    "line1" VARCHAR(240) NOT NULL,
    "line2" VARCHAR(240),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopperAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "flavor" VARCHAR(16) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "percentageBps" INTEGER,
    "amountMinor" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "flavor" VARCHAR(16) NOT NULL,
    "nameZh" VARCHAR(160),
    "nameEn" VARCHAR(160),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "countryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minWeightGrams" INTEGER NOT NULL DEFAULT 0,
    "maxWeightGrams" INTEGER,
    "priceMinor" INTEGER NOT NULL,
    "freeOverMinor" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "flavor" VARCHAR(16) NOT NULL,
    "slug" VARCHAR(32) NOT NULL,
    "bodyZh" TEXT,
    "bodyEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("flavor","slug")
);

-- CreateIndex
CREATE INDEX "Shopper_flavor_createdAt_idx" ON "Shopper"("flavor", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Shopper_flavor_email_key" ON "Shopper"("flavor", "email");

-- CreateIndex
CREATE INDEX "ShopperAddress_shopperId_isDefault_updatedAt_idx" ON "ShopperAddress"("shopperId", "isDefault", "updatedAt");

-- CreateIndex
CREATE INDEX "DiscountCode_flavor_enabled_createdAt_idx" ON "DiscountCode"("flavor", "enabled", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_flavor_code_key" ON "DiscountCode"("flavor", "code");

-- CreateIndex
CREATE INDEX "ShippingRate_flavor_enabled_position_idx" ON "ShippingRate"("flavor", "enabled", "position");

-- AddForeignKey
ALTER TABLE "ShopperAddress" ADD CONSTRAINT "ShopperAddress_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain constraints not expressible in the Prisma schema.
ALTER TABLE "Shopper" ADD CONSTRAINT "Shopper_flavor_check" CHECK ("flavor" IN ('cn', 'global'));
ALTER TABLE "Shopper" ADD CONSTRAINT "Shopper_email_normalized_check" CHECK ("email" = lower("email"));
ALTER TABLE "ShopperAddress" ADD CONSTRAINT "ShopperAddress_country_code_check" CHECK ("countryCode" = upper("countryCode") AND char_length("countryCode") = 2);
CREATE UNIQUE INDEX "ShopperAddress_one_default_per_shopper" ON "ShopperAddress"("shopperId") WHERE "isDefault" = true;

ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_flavor_check" CHECK ("flavor" IN ('cn', 'global'));
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_code_normalized_check" CHECK ("code" = upper("code") AND char_length("code") > 0);
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_value_check" CHECK (
    ("kind" = 'percentage' AND "percentageBps" BETWEEN 1 AND 10000 AND "amountMinor" IS NULL)
    OR ("kind" = 'fixed' AND "amountMinor" > 0 AND "percentageBps" IS NULL)
);

ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_flavor_check" CHECK ("flavor" IN ('cn', 'global'));
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_weight_check" CHECK (
    "minWeightGrams" >= 0 AND ("maxWeightGrams" IS NULL OR "maxWeightGrams" >= "minWeightGrams")
);
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_price_check" CHECK ("priceMinor" >= 0);
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_free_over_check" CHECK ("freeOverMinor" IS NULL OR "freeOverMinor" > 0);
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_position_check" CHECK ("position" >= 0);

ALTER TABLE "Policy" ADD CONSTRAINT "Policy_flavor_check" CHECK ("flavor" IN ('cn', 'global'));
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_slug_check" CHECK ("slug" IN ('privacy', 'terms', 'returns', 'shipping'));
INSERT INTO "Policy" ("flavor", "slug", "updatedAt") VALUES
    ('cn', 'privacy', CURRENT_TIMESTAMP),
    ('cn', 'terms', CURRENT_TIMESTAMP),
    ('cn', 'returns', CURRENT_TIMESTAMP),
    ('cn', 'shipping', CURRENT_TIMESTAMP),
    ('global', 'privacy', CURRENT_TIMESTAMP),
    ('global', 'terms', CURRENT_TIMESTAMP),
    ('global', 'returns', CURRENT_TIMESTAMP),
    ('global', 'shipping', CURRENT_TIMESTAMP);
