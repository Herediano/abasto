-- AlterTable
ALTER TABLE "price_rules" ADD COLUMN     "tier_min_qty" DECIMAL(14,3),
ADD COLUMN     "use_category_margin" BOOLEAN NOT NULL DEFAULT false;
