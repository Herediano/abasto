ALTER TYPE "PurchaseInvoiceStatus" ADD VALUE 'corrected';

CREATE TABLE "purchase_invoice_revisions" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_invoice_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_invoice_revisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_invoice_revisions_invoice_id_tenant_id_fkey" FOREIGN KEY ("invoice_id", "tenant_id") REFERENCES "purchase_invoices"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_invoice_revisions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "purchase_invoice_revisions_tenant_id_invoice_id_created_at_idx" ON "purchase_invoice_revisions"("tenant_id", "invoice_id", "created_at");
