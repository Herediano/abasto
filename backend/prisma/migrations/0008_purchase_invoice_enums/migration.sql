CREATE TYPE "PurchaseInvoiceType" AS ENUM ('A', 'B', 'C', 'E', 'M', 'other');
CREATE TYPE "PurchaseInvoiceStatus" AS ENUM ('draft', 'confirmed', 'cancelled');

ALTER TABLE "purchase_invoices" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "purchase_invoices"
  ALTER COLUMN "invoice_type" TYPE "PurchaseInvoiceType" USING "invoice_type"::"PurchaseInvoiceType",
  ALTER COLUMN "status" TYPE "PurchaseInvoiceStatus" USING "status"::"PurchaseInvoiceStatus";

ALTER TABLE "purchase_invoices" ALTER COLUMN "status" SET DEFAULT 'draft'::"PurchaseInvoiceStatus";
