-- DropForeignKey
ALTER TABLE "purchase_invoice_lines" DROP CONSTRAINT "purchase_invoice_lines_invoice_id_tenant_id_fkey";

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "purchase_invoice_lines" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "purchase_invoices" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_invoice_id_tenant_id_fkey" FOREIGN KEY ("invoice_id", "tenant_id") REFERENCES "purchase_invoices"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "purchase_invoices_tenant_id_invoice_type_point_of_sale_invoice_" RENAME TO "purchase_invoices_tenant_id_invoice_type_point_of_sale_invo_key";
