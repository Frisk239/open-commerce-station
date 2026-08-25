-- AlterTable: refund execution snapshot on the Order
ALTER TABLE "Order" ADD COLUMN "refundTradeNo" VARCHAR(128);
ALTER TABLE "Order" ADD COLUMN "refundedAt" TIMESTAMP(3);

-- CreateTable: visible request history (rejections and retries stay on record)
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_openedAt_idx" ON "ReturnRequest"("orderId", "openedAt");

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain constraints
ALTER TABLE "Order" ADD CONSTRAINT "Order_refund_state_check" CHECK (
    ("paymentStatus" = 'refunded' AND "refundedAt" IS NOT NULL AND "refundTradeNo" IS NOT NULL)
    OR ("paymentStatus" <> 'refunded' AND "refundedAt" IS NULL)
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_return_refund_check" CHECK (
    "returnStatus" <> 'refunded' OR "paymentStatus" = 'refunded'
);
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_status_check" CHECK (
    "status" IN ('open', 'approved', 'rejected')
);
