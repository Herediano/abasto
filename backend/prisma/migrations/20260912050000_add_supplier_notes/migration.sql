-- Nota de crédito/débito de proveedor estructurada. Ver SupplierNote /
-- SupplierNoteLine en schema.prisma y supplier-notes.service.ts.
CREATE TYPE "SupplierNoteKind" AS ENUM ('credit_note', 'debit_note');

CREATE TABLE "supplier_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "kind" "SupplierNoteKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "supplier_doc_type" TEXT,
    "supplier_point_of_sale" TEXT,
    "supplier_number" TEXT,
    "supplier_issue_date" DATE,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "tax_total" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "user_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_notes_id_tenant_id_key" ON "supplier_notes"("id", "tenant_id");

CREATE INDEX "supplier_notes_tenant_id_supplier_id_occurred_at_idx" ON "supplier_notes"("tenant_id", "supplier_id", "occurred_at");

CREATE TABLE "supplier_note_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "note_id" UUID NOT NULL,
    "purchase_invoice_id" UUID NOT NULL,
    "purchase_invoice_line_id" UUID,
    "product_id" UUID,
    "product_lot_id" UUID,
    "description" TEXT NOT NULL,
    "returns_stock" BOOLEAN NOT NULL DEFAULT false,
    "quantity" DECIMAL(14,3),
    "unit_amount" DECIMAL(14,2),
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "line_subtotal" DECIMAL(14,2) NOT NULL,
    "line_tax" DECIMAL(14,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "supplier_note_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_note_lines_id_tenant_id_key" ON "supplier_note_lines"("id", "tenant_id");

CREATE INDEX "supplier_note_lines_tenant_id_note_id_idx" ON "supplier_note_lines"("tenant_id", "note_id");

CREATE INDEX "supplier_note_lines_tenant_id_purchase_invoice_id_idx" ON "supplier_note_lines"("tenant_id", "purchase_invoice_id");

CREATE INDEX "supplier_note_lines_tenant_id_purchase_invoice_line_id_idx" ON "supplier_note_lines"("tenant_id", "purchase_invoice_line_id");

ALTER TABLE "supplier_account_movements" ADD COLUMN "supplier_note_id" UUID;

ALTER TABLE "supplier_notes" ADD CONSTRAINT "supplier_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_notes" ADD CONSTRAINT "supplier_notes_supplier_id_tenant_id_fkey" FOREIGN KEY ("supplier_id", "tenant_id") REFERENCES "suppliers"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_notes" ADD CONSTRAINT "supplier_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_note_lines" ADD CONSTRAINT "supplier_note_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_note_lines" ADD CONSTRAINT "supplier_note_lines_note_id_tenant_id_fkey" FOREIGN KEY ("note_id", "tenant_id") REFERENCES "supplier_notes"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_note_lines" ADD CONSTRAINT "supplier_note_lines_purchase_invoice_id_tenant_id_fkey" FOREIGN KEY ("purchase_invoice_id", "tenant_id") REFERENCES "purchase_invoices"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_note_lines" ADD CONSTRAINT "supplier_note_lines_purchase_invoice_line_id_tenant_id_fkey" FOREIGN KEY ("purchase_invoice_line_id", "tenant_id") REFERENCES "purchase_invoice_lines"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_note_lines" ADD CONSTRAINT "supplier_note_lines_product_id_tenant_id_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_note_lines" ADD CONSTRAINT "supplier_note_lines_product_lot_id_tenant_id_fkey" FOREIGN KEY ("product_lot_id", "tenant_id") REFERENCES "product_lots"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_account_movements" ADD CONSTRAINT "supplier_account_movements_supplier_note_id_tenant_id_fkey" FOREIGN KEY ("supplier_note_id", "tenant_id") REFERENCES "supplier_notes"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
