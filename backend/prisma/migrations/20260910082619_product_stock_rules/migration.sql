-- AlterTable
ALTER TABLE "products" ADD COLUMN     "max_stock" DECIMAL(14,3);

-- CreateTable
CREATE TABLE "product_stock_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "min_stock" DECIMAL(14,3),
    "max_stock" DECIMAL(14,3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_stock_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_stock_rules_tenant_id_branch_id_idx" ON "product_stock_rules"("tenant_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_stock_rules_product_id_branch_id_key" ON "product_stock_rules"("product_id", "branch_id");

-- AddForeignKey
ALTER TABLE "product_stock_rules" ADD CONSTRAINT "product_stock_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stock_rules" ADD CONSTRAINT "product_stock_rules_product_id_tenant_id_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stock_rules" ADD CONSTRAINT "product_stock_rules_branch_id_tenant_id_fkey" FOREIGN KEY ("branch_id", "tenant_id") REFERENCES "branches"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;
