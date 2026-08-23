-- Domain constraints that Prisma's schema language cannot express. Dropping first also repairs
-- development databases that received these checks while the preceding migration was being authored.
ALTER TABLE "CatalogGroup" DROP CONSTRAINT IF EXISTS "CatalogGroup_flavor_check";
ALTER TABLE "CatalogGroup" DROP CONSTRAINT IF EXISTS "CatalogGroup_position_check";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_flavor_check";
ALTER TABLE "ProductImage" DROP CONSTRAINT IF EXISTS "ProductImage_position_check";
ALTER TABLE "ProductOption" DROP CONSTRAINT IF EXISTS "ProductOption_position_check";
ALTER TABLE "ProductOptionValue" DROP CONSTRAINT IF EXISTS "ProductOptionValue_position_check";
ALTER TABLE "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_sell_price_check";
ALTER TABLE "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_original_price_check";
ALTER TABLE "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_stock_check";
ALTER TABLE "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_weight_check";
ALTER TABLE "Cart" DROP CONSTRAINT IF EXISTS "Cart_flavor_check";
ALTER TABLE "CartLine" DROP CONSTRAINT IF EXISTS "CartLine_quantity_check";

ALTER TABLE "CatalogGroup" ADD CONSTRAINT "CatalogGroup_flavor_check" CHECK ("flavor" IN ('cn', 'global'));
ALTER TABLE "CatalogGroup" ADD CONSTRAINT "CatalogGroup_position_check" CHECK ("position" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_flavor_check" CHECK ("flavor" IN ('cn', 'global'));
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_position_check" CHECK ("position" >= 0);
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_position_check" CHECK ("position" >= 0);
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_position_check" CHECK ("position" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_sell_price_check" CHECK ("sellPriceMinor" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_original_price_check" CHECK ("originalPriceMinor" IS NULL OR "originalPriceMinor" > "sellPriceMinor");
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stock_check" CHECK ("stock" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_weight_check" CHECK ("weightGrams" > 0);
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_flavor_check" CHECK ("flavor" IN ('cn', 'global'));
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_quantity_check" CHECK ("quantity" > 0);
