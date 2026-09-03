-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "price_list_id" UUID;

-- CreateTable
CREATE TABLE "price_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price_list_id" UUID NOT NULL,
    "target" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_value" TEXT,
    "operation_type" TEXT NOT NULL,
    "operation_value" DECIMAL(10,2),
    "rounding" TEXT,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounding_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "from_amount" DECIMAL(14,2) NOT NULL,
    "to_amount" DECIMAL(14,2),
    "mode" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rounding_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_tiers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "price_list_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "min_qty" DECIMAL(14,3) NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_value" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_rules_tenant_id_idx" ON "price_rules"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_rules_tenant_id_name_key" ON "price_rules"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "rounding_rules_tenant_id_from_amount_idx" ON "rounding_rules"("tenant_id", "from_amount");

-- CreateIndex
CREATE INDEX "price_tiers_tenant_id_product_id_idx" ON "price_tiers"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_tiers_tenant_id_price_list_id_product_id_min_qty_key" ON "price_tiers"("tenant_id", "price_list_id", "product_id", "min_qty");

-- CreateIndex
CREATE INDEX "promotions_tenant_id_valid_from_valid_to_idx" ON "promotions"("tenant_id", "valid_from", "valid_to");

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_price_list_id_tenant_id_fkey" FOREIGN KEY ("price_list_id", "tenant_id") REFERENCES "price_lists"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounding_rules" ADD CONSTRAINT "rounding_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_price_list_id_tenant_id_fkey" FOREIGN KEY ("price_list_id", "tenant_id") REFERENCES "price_lists"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_product_id_tenant_id_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
