ALTER TABLE "products"
  ADD COLUMN "cost_price" DECIMAL(14,2),
  ADD COLUMN "sale_price" DECIMAL(14,2),
  ADD COLUMN "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 21,
  ADD COLUMN "min_stock" DECIMAL(14,3);
