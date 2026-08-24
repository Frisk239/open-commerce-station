-- AlterTable: fulfillment tracking snapshot
ALTER TABLE "Order" ADD COLUMN "trackingNumber" VARCHAR(191);
ALTER TABLE "Order" ADD COLUMN "shippedAt" TIMESTAMP(3);

-- CreateTable: owner-configured SMTP transport for the three Notice Mails
CREATE TABLE "MailConfig" (
    "flavor" VARCHAR(16) NOT NULL,
    "host" VARCHAR(255) NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "username" VARCHAR(255),
    "password" VARCHAR(512),
    "fromEmail" VARCHAR(320) NOT NULL,
    "ownerToEmail" VARCHAR(320) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailConfig_pkey" PRIMARY KEY ("flavor")
);

-- CreateTable: deduplicated, retryable Notice Mail outbox
CREATE TABLE "MailOutbox" (
    "id" TEXT NOT NULL,
    "flavor" VARCHAR(16) NOT NULL,
    "eventKey" VARCHAR(191) NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "toEmail" VARCHAR(320) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "bodyText" TEXT NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" VARCHAR(500),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable: single-use, expiring Shopper password reset tokens
CREATE TABLE "ShopperPasswordReset" (
    "id" TEXT NOT NULL,
    "shopperId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopperPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailOutbox_flavor_eventKey_key" ON "MailOutbox"("flavor", "eventKey");
CREATE INDEX "MailOutbox_flavor_status_createdAt_idx" ON "MailOutbox"("flavor", "status", "createdAt");
CREATE UNIQUE INDEX "ShopperPasswordReset_tokenHash_key" ON "ShopperPasswordReset"("tokenHash");
CREATE INDEX "ShopperPasswordReset_shopperId_createdAt_idx" ON "ShopperPasswordReset"("shopperId", "createdAt");

-- AddForeignKey
ALTER TABLE "MailConfig" ADD CONSTRAINT "MailConfig_flavor_fkey" FOREIGN KEY ("flavor") REFERENCES "Station"("flavor") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopperPasswordReset" ADD CONSTRAINT "ShopperPasswordReset_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain constraints
ALTER TABLE "Order" ADD CONSTRAINT "Order_shipped_state_check" CHECK (
    ("fulfillmentStatus" = 'shipped' AND "shippedAt" IS NOT NULL AND "trackingNumber" IS NOT NULL)
    OR ("fulfillmentStatus" = 'unfulfilled' AND "shippedAt" IS NULL)
);
ALTER TABLE "MailOutbox" ADD CONSTRAINT "MailOutbox_status_check" CHECK (
    ("status" = 'sent' AND "sentAt" IS NOT NULL)
    OR ("status" IN ('pending', 'failed') AND "sentAt" IS NULL)
);
ALTER TABLE "MailOutbox" ADD CONSTRAINT "MailOutbox_kind_check" CHECK (
    "kind" IN ('paid', 'shipped', 'owner-new-order', 'password-reset')
);
