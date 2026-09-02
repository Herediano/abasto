-- CreateTable
CREATE TABLE "product_price_history" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" DECIMAL(14,2),
    "new_value" DECIMAL(14,2) NOT NULL,
    "source" TEXT NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_price_history_tenant_id_product_id_created_at_idx" ON "product_price_history"("tenant_id", "product_id", "created_at");

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_product_id_tenant_id_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;
