CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "tenants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" TEXT NOT NULL, "legal_name" TEXT, "tax_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "sku" TEXT NOT NULL, "barcode" TEXT,
  "name" TEXT NOT NULL, "description" TEXT, "category" TEXT, "unit" TEXT NOT NULL, "brand" TEXT,
  "maneja_vencimiento" BOOLEAN NOT NULL DEFAULT false, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "suppliers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "name" TEXT NOT NULL, "legal_name" TEXT,
  "tax_id" TEXT, "email" TEXT, "phone" TEXT, "address" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "customers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "name" TEXT NOT NULL, "legal_name" TEXT,
  "tax_id" TEXT, "email" TEXT, "phone" TEXT, "address" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "warehouses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "name" TEXT NOT NULL, "code" TEXT NOT NULL,
  "address" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "product_lots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "product_id" UUID NOT NULL,
  "warehouse_id" UUID NOT NULL, "supplier_id" UUID, "lot_number" TEXT NOT NULL, "expiration_date" DATE,
  "received_at" DATE, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_lots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_id_tenant_id_key" ON "products"("id", "tenant_id");
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");
CREATE UNIQUE INDEX "suppliers_id_tenant_id_key" ON "suppliers"("id", "tenant_id");
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");
CREATE UNIQUE INDEX "customers_id_tenant_id_key" ON "customers"("id", "tenant_id");
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");
CREATE UNIQUE INDEX "warehouses_id_tenant_id_key" ON "warehouses"("id", "tenant_id");
CREATE UNIQUE INDEX "warehouses_tenant_id_code_key" ON "warehouses"("tenant_id", "code");
CREATE INDEX "warehouses_tenant_id_idx" ON "warehouses"("tenant_id");
CREATE UNIQUE INDEX "product_lots_id_tenant_id_key" ON "product_lots"("id", "tenant_id");
CREATE UNIQUE INDEX "product_lots_scope_key" ON "product_lots"("tenant_id", "product_id", "warehouse_id", "lot_number");
CREATE INDEX "product_lots_expiration_idx" ON "product_lots"("tenant_id", "expiration_date");
CREATE INDEX "product_lots_warehouse_idx" ON "product_lots"("tenant_id", "warehouse_id");

ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_lots" ADD CONSTRAINT "product_lots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_lots" ADD CONSTRAINT "product_lots_product_scope_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_lots" ADD CONSTRAINT "product_lots_warehouse_scope_fkey" FOREIGN KEY ("warehouse_id", "tenant_id") REFERENCES "warehouses"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_lots" ADD CONSTRAINT "product_lots_supplier_scope_fkey" FOREIGN KEY ("supplier_id", "tenant_id") REFERENCES "suppliers"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
