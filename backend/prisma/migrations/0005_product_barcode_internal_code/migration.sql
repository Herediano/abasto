-- Preserve existing products while making the barcode the primary catalog identifier.
UPDATE "products"
SET "barcode" = 'LEGACY-' || replace("id"::text, '-', '')
WHERE "barcode" IS NULL OR btrim("barcode") = '';

ALTER TABLE "products" RENAME COLUMN "sku" TO "internal_code";

DROP INDEX IF EXISTS "products_tenant_id_sku_key";
CREATE UNIQUE INDEX "products_tenant_id_barcode_key" ON "products"("tenant_id", "barcode");
CREATE UNIQUE INDEX "products_tenant_id_internal_code_key" ON "products"("tenant_id", "internal_code");

ALTER TABLE "products" ALTER COLUMN "barcode" SET NOT NULL;
