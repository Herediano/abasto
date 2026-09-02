CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "tenants" ADD COLUMN "product_code_seq" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "categories_tenant_id_name_key" ON "categories"("tenant_id", "name");
CREATE INDEX "categories_tenant_id_idx" ON "categories"("tenant_id");

-- Backfill: turn existing free-text categories into rows, one per distinct (tenant, name)
INSERT INTO "categories" ("tenant_id", "name")
SELECT DISTINCT tenant_id, category FROM "products" WHERE category IS NOT NULL AND category <> '';

ALTER TABLE "products" ADD COLUMN "category_id" UUID;

UPDATE "products" p
SET "category_id" = c.id
FROM "categories" c
WHERE c.tenant_id = p.tenant_id AND c.name = p.category;

ALTER TABLE "products" DROP COLUMN "category";

ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed each tenant's product code sequence from its highest existing numeric internal code
UPDATE "tenants" t
SET "product_code_seq" = COALESCE((
  SELECT MAX(p.internal_code::int) FROM "products" p
  WHERE p.tenant_id = t.id AND p.internal_code ~ '^[0-9]+$'
), 0);
