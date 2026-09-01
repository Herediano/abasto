ALTER TABLE "users" ADD COLUMN "warehouse_id" UUID;

CREATE TABLE "purchase_invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "warehouse_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "invoice_type" TEXT NOT NULL,
  "point_of_sale" TEXT NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "issue_date" DATE NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "subtotal" DECIMAL(14,2) NOT NULL,
  "tax_total" DECIMAL(14,2) NOT NULL,
  "total" DECIMAL(14,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_invoice_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "product_lot_id" UUID,
  "barcode" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unit_cost" DECIMAL(14,2) NOT NULL,
  "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "line_subtotal" DECIMAL(14,2) NOT NULL,
  "line_tax" DECIMAL(14,2) NOT NULL,
  "line_total" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "purchase_invoice_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_invoices_id_tenant_id_key" ON "purchase_invoices"("id", "tenant_id");
CREATE UNIQUE INDEX "purchase_invoices_tenant_id_invoice_type_point_of_sale_invoice_number_key" ON "purchase_invoices"("tenant_id", "invoice_type", "point_of_sale", "invoice_number");
CREATE INDEX "purchase_invoices_tenant_id_issue_date_idx" ON "purchase_invoices"("tenant_id", "issue_date");
CREATE UNIQUE INDEX "purchase_invoice_lines_id_tenant_id_key" ON "purchase_invoice_lines"("id", "tenant_id");
CREATE INDEX "purchase_invoice_lines_tenant_id_invoice_id_idx" ON "purchase_invoice_lines"("tenant_id", "invoice_id");

ALTER TABLE "users" ADD CONSTRAINT "users_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_tenant_id_fkey" FOREIGN KEY ("supplier_id", "tenant_id") REFERENCES "suppliers"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_warehouse_id_tenant_id_fkey" FOREIGN KEY ("warehouse_id", "tenant_id") REFERENCES "warehouses"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_invoice_id_tenant_id_fkey" FOREIGN KEY ("invoice_id", "tenant_id") REFERENCES "purchase_invoices"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_product_id_tenant_id_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_product_lot_id_tenant_id_fkey" FOREIGN KEY ("product_lot_id", "tenant_id") REFERENCES "product_lots"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
