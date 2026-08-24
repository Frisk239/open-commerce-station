-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "reservedStock" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PaymentMethodConfig" (
    "flavor" VARCHAR(16) NOT NULL,
    "provider" VARCHAR(24) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("flavor","provider")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "publicId" VARCHAR(64) NOT NULL,
    "flavor" VARCHAR(16) NOT NULL,
    "shopperId" TEXT NOT NULL,
    "cartId" TEXT,
    "checkoutFingerprint" CHAR(64) NOT NULL,
    "provider" VARCHAR(24) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "currency" CHAR(3) NOT NULL,
    "subtotalMinor" INTEGER NOT NULL,
    "discountCode" VARCHAR(64),
    "discountMinor" INTEGER NOT NULL,
    "shippingRateReference" VARCHAR(191),
    "shippingNameZh" VARCHAR(160),
    "shippingNameEn" VARCHAR(160),
    "shippingMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "totalWeightGrams" INTEGER NOT NULL,
    "recipientName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "region" VARCHAR(120) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "district" VARCHAR(120),
    "postalCode" VARCHAR(32),
    "line1" VARCHAR(240) NOT NULL,
    "line2" VARCHAR(240),
    "providerTradeNo" VARCHAR(128),
    "failureCode" VARCHAR(80),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttemptLine" (
    "id" TEXT NOT NULL,
    "paymentAttemptId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantReference" VARCHAR(191) NOT NULL,
    "productReference" VARCHAR(191) NOT NULL,
    "productSlug" VARCHAR(180) NOT NULL,
    "productNameZh" VARCHAR(160),
    "productNameEn" VARCHAR(160),
    "variantLabel" VARCHAR(512) NOT NULL,
    "imageUrl" VARCHAR(512),
    "unitPriceMinor" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineSubtotalMinor" INTEGER NOT NULL,
    "unitWeightGrams" INTEGER NOT NULL,

    CONSTRAINT "PaymentAttemptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "paymentAttemptId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantReference" VARCHAR(191) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "committedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderEvent" (
    "id" TEXT NOT NULL,
    "paymentAttemptId" TEXT NOT NULL,
    "provider" VARCHAR(24) NOT NULL,
    "externalId" VARCHAR(191) NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "payloadDigest" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" VARCHAR(64) NOT NULL,
    "flavor" VARCHAR(16) NOT NULL,
    "shopperId" TEXT NOT NULL,
    "paymentAttemptId" TEXT NOT NULL,
    "paymentStatus" VARCHAR(24) NOT NULL DEFAULT 'paid',
    "fulfillmentStatus" VARCHAR(24) NOT NULL DEFAULT 'unfulfilled',
    "returnStatus" VARCHAR(24) NOT NULL DEFAULT 'none',
    "provider" VARCHAR(24) NOT NULL,
    "providerTradeNo" VARCHAR(128) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "subtotalMinor" INTEGER NOT NULL,
    "discountCode" VARCHAR(64),
    "discountMinor" INTEGER NOT NULL,
    "shippingRateReference" VARCHAR(191),
    "shippingNameZh" VARCHAR(160),
    "shippingNameEn" VARCHAR(160),
    "shippingMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "recipientName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "region" VARCHAR(120) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "district" VARCHAR(120),
    "postalCode" VARCHAR(32),
    "line1" VARCHAR(240) NOT NULL,
    "line2" VARCHAR(240),
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantReference" VARCHAR(191) NOT NULL,
    "productReference" VARCHAR(191) NOT NULL,
    "productSlug" VARCHAR(180) NOT NULL,
    "productNameZh" VARCHAR(160),
    "productNameEn" VARCHAR(160),
    "variantLabel" VARCHAR(512) NOT NULL,
    "imageUrl" VARCHAR(512),
    "unitPriceMinor" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineSubtotalMinor" INTEGER NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_publicId_key" ON "PaymentAttempt"("publicId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_shopperId_status_createdAt_idx" ON "PaymentAttempt"("shopperId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_expiresAt_idx" ON "PaymentAttempt"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerTradeNo_key" ON "PaymentAttempt"("provider", "providerTradeNo");

-- CreateIndex
CREATE INDEX "PaymentAttemptLine_variantId_idx" ON "PaymentAttemptLine"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttemptLine_paymentAttemptId_variantReference_key" ON "PaymentAttemptLine"("paymentAttemptId", "variantReference");

-- CreateIndex
CREATE INDEX "StockReservation_variantId_status_expiresAt_idx" ON "StockReservation"("variantId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockReservation_paymentAttemptId_variantReference_key" ON "StockReservation"("paymentAttemptId", "variantReference");

-- CreateIndex
CREATE INDEX "PaymentProviderEvent_paymentAttemptId_createdAt_idx" ON "PaymentProviderEvent"("paymentAttemptId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderEvent_provider_externalId_key" ON "PaymentProviderEvent"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentAttemptId_key" ON "Order"("paymentAttemptId");

-- CreateIndex
CREATE INDEX "Order_flavor_createdAt_idx" ON "Order"("flavor", "createdAt");

-- CreateIndex
CREATE INDEX "Order_shopperId_createdAt_idx" ON "Order"("shopperId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_fulfillmentStatus_createdAt_idx" ON "Order"("fulfillmentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttemptLine" ADD CONSTRAINT "PaymentAttemptLine_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttemptLine" ADD CONSTRAINT "PaymentAttemptLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProviderEvent" ADD CONSTRAINT "PaymentProviderEvent_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain constraints and idempotency indexes not expressible in the Prisma schema.
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_reserved_stock_check" CHECK (
    "reservedStock" >= 0 AND "reservedStock" <= "stock"
);

ALTER TABLE "PaymentMethodConfig" ADD CONSTRAINT "PaymentMethodConfig_provider_check" CHECK (
    ("flavor" = 'cn' AND "provider" IN ('alipay', 'wechat'))
    OR ("flavor" = 'global' AND "provider" IN ('paypal', 'stripe'))
);
ALTER TABLE "PaymentMethodConfig" ADD CONSTRAINT "PaymentMethodConfig_wechat_disabled_check" CHECK (
    "provider" <> 'wechat' OR "enabled" = false
);

ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_flavor_provider_check" CHECK (
    ("flavor" = 'cn' AND "provider" = 'alipay')
    OR ("flavor" = 'global' AND "provider" IN ('paypal', 'stripe'))
);
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_status_check" CHECK (
    "status" IN ('pending', 'paid', 'failed', 'cancelled', 'expired')
);
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_amount_check" CHECK (
    "subtotalMinor" >= 0 AND "discountMinor" >= 0 AND "discountMinor" <= "subtotalMinor"
    AND "shippingMinor" >= 0 AND "totalMinor" = "subtotalMinor" - "discountMinor" + "shippingMinor"
    AND "totalWeightGrams" >= 0
);
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_currency_check" CHECK (
    "currency" IN ('CNY', 'USD', 'EUR', 'GBP')
);
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_address_check" CHECK (
    "countryCode" = upper("countryCode") AND char_length("countryCode") = 2
);
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paid_state_check" CHECK (
    ("status" = 'paid' AND "paidAt" IS NOT NULL AND "providerTradeNo" IS NOT NULL)
    OR ("status" <> 'paid' AND "paidAt" IS NULL)
);
CREATE UNIQUE INDEX "PaymentAttempt_one_pending_fingerprint" ON "PaymentAttempt"("shopperId", "provider", "checkoutFingerprint") WHERE "status" = 'pending';

ALTER TABLE "PaymentAttemptLine" ADD CONSTRAINT "PaymentAttemptLine_amount_check" CHECK (
    "unitPriceMinor" >= 0 AND "quantity" > 0 AND "lineSubtotalMinor" = "unitPriceMinor" * "quantity" AND "unitWeightGrams" >= 0
);

ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_state_check" CHECK (
    "quantity" > 0 AND (
        ("status" = 'active' AND "variantId" IS NOT NULL AND "committedAt" IS NULL AND "releasedAt" IS NULL)
        OR ("status" = 'committed' AND "variantId" IS NULL AND "committedAt" IS NOT NULL AND "releasedAt" IS NULL)
        OR ("status" = 'released' AND "variantId" IS NULL AND "releasedAt" IS NOT NULL AND "committedAt" IS NULL)
    )
);

ALTER TABLE "PaymentProviderEvent" ADD CONSTRAINT "PaymentProviderEvent_provider_check" CHECK (
    "provider" IN ('alipay', 'paypal', 'stripe') AND "kind" IN ('notify', 'query', 'return')
);

ALTER TABLE "Order" ADD CONSTRAINT "Order_flavor_provider_check" CHECK (
    ("flavor" = 'cn' AND "provider" = 'alipay')
    OR ("flavor" = 'global' AND "provider" IN ('paypal', 'stripe'))
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_status_check" CHECK (
    "paymentStatus" IN ('paid', 'refunded', 'partially-refunded')
    AND "fulfillmentStatus" IN ('unfulfilled', 'shipped')
    AND "returnStatus" IN ('none', 'requested', 'approved', 'rejected', 'refunded')
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_amount_check" CHECK (
    "subtotalMinor" >= 0 AND "discountMinor" >= 0 AND "discountMinor" <= "subtotalMinor"
    AND "shippingMinor" >= 0 AND "totalMinor" = "subtotalMinor" - "discountMinor" + "shippingMinor"
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_currency_check" CHECK ("currency" IN ('CNY', 'USD', 'EUR', 'GBP'));
ALTER TABLE "Order" ADD CONSTRAINT "Order_address_check" CHECK (
    "countryCode" = upper("countryCode") AND char_length("countryCode") = 2
);

ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_amount_check" CHECK (
    "unitPriceMinor" >= 0 AND "quantity" > 0 AND "lineSubtotalMinor" = "unitPriceMinor" * "quantity"
);

INSERT INTO "PaymentMethodConfig" ("flavor", "provider", "enabled", "updatedAt") VALUES
    ('cn', 'alipay', false, CURRENT_TIMESTAMP),
    ('cn', 'wechat', false, CURRENT_TIMESTAMP),
    ('global', 'paypal', false, CURRENT_TIMESTAMP),
    ('global', 'stripe', false, CURRENT_TIMESTAMP);
