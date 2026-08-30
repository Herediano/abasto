-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('purchase_in', 'sale_out', 'transfer_in', 'transfer_out', 'adjustment_in', 'adjustment_out');

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_lot_id" UUID,
    "warehouse_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "operation_id" UUID,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference_type" TEXT,
    "reference_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_product_id_warehouse_id_idx" ON "stock_movements"("tenant_id", "product_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_product_lot_id_warehouse_id_idx" ON "stock_movements"("tenant_id", "product_lot_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_occurred_at_idx" ON "stock_movements"("tenant_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_id_tenant_id_key" ON "stock_movements"("id", "tenant_id");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_tenant_id_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_lot_id_tenant_id_fkey" FOREIGN KEY ("product_lot_id", "tenant_id") REFERENCES "product_lots"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_tenant_id_fkey" FOREIGN KEY ("warehouse_id", "tenant_id") REFERENCES "warehouses"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
