/*
  Warnings:

  - Added the required column `totalWeightGrams` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitWeightGrams` to the `OrderLine` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "totalWeightGrams" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "unitWeightGrams" INTEGER NOT NULL;

ALTER TABLE "Order" ADD CONSTRAINT "Order_total_weight_check" CHECK ("totalWeightGrams" >= 0);
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_unit_weight_check" CHECK ("unitWeightGrams" >= 0);
