
-- CreateTable
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "customer_id" UUID,
    "user_id" UUID NOT NULL,
    "shift_id" UUID,
    "doc_type" TEXT NOT NULL DEFAULT 'credit_note',
    "point_of_sale" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refund_method" TEXT NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "tax_total" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "credit_note_id" UUID NOT NULL,
    "sale_line_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_lot_id" UUID,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "line_subtotal" DECIMAL(14,2) NOT NULL,
    "line_tax" DECIMAL(14,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "credit_note_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_notes_tenant_id_sale_id_idx" ON "credit_notes"("tenant_id", "sale_id");

-- CreateIndex
CREATE INDEX "credit_notes_tenant_id_occurred_at_idx" ON "credit_notes"("tenant_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_id_tenant_id_key" ON "credit_notes"("id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_tenant_id_doc_type_point_of_sale_number_key" ON "credit_notes"("tenant_id", "doc_type", "point_of_sale", "number");

-- CreateIndex
CREATE INDEX "credit_note_lines_tenant_id_credit_note_id_idx" ON "credit_note_lines"("tenant_id", "credit_note_id");

-- CreateIndex
CREATE INDEX "credit_note_lines_tenant_id_sale_line_id_idx" ON "credit_note_lines"("tenant_id", "sale_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_lines_id_tenant_id_key" ON "sale_lines"("id", "tenant_id");

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_sale_id_tenant_id_fkey" FOREIGN KEY ("sale_id", "tenant_id") REFERENCES "sales"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_credit_note_id_tenant_id_fkey" FOREIGN KEY ("credit_note_id", "tenant_id") REFERENCES "credit_notes"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_sale_line_id_tenant_id_fkey" FOREIGN KEY ("sale_line_id", "tenant_id") REFERENCES "sale_lines"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

