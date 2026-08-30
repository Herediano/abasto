-- DropIndex
DROP INDEX "product_lots_scope_key";

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_lots" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "suppliers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "warehouses" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "product_lots_tenant_id_product_id_lot_number_key" ON "product_lots"("tenant_id", "product_id", "lot_number");

-- RenameForeignKey
ALTER TABLE "product_lots" RENAME CONSTRAINT "product_lots_product_scope_fkey" TO "product_lots_product_id_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "product_lots" RENAME CONSTRAINT "product_lots_supplier_scope_fkey" TO "product_lots_supplier_id_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "product_lots" RENAME CONSTRAINT "product_lots_warehouse_scope_fkey" TO "product_lots_warehouse_id_tenant_id_fkey";

-- RenameIndex
ALTER INDEX "product_lots_expiration_idx" RENAME TO "product_lots_tenant_id_expiration_date_idx";

-- RenameIndex
ALTER INDEX "product_lots_warehouse_idx" RENAME TO "product_lots_tenant_id_warehouse_id_idx";
