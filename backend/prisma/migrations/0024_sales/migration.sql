-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "customer_id" UUID,
    "user_id" UUID NOT NULL,
    "price_list_id" UUID NOT NULL,
    "doc_type" TEXT NOT NULL DEFAULT 'internal',
    "point_of_sale" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "cae" TEXT,
    "cae_expires_at" TIMESTAMP(3),
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "cancel_reason" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_lot_id" UUID,
    "barcode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "list_price" DECIMAL(14,2) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "promotion_id" UUID,
    "promotion_name" TEXT,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "line_subtotal" DECIMAL(14,2) NOT NULL,
    "line_tax" DECIMAL(14,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "sale_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_sequences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "point_of_sale" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sale_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_tenant_id_occurred_at_idx" ON "sales"("tenant_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_id_tenant_id_key" ON "sales"("id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tenant_id_doc_type_point_of_sale_number_key" ON "sales"("tenant_id", "doc_type", "point_of_sale", "number");

-- CreateIndex
CREATE INDEX "sale_lines_tenant_id_sale_id_idx" ON "sale_lines"("tenant_id", "sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_sequences_tenant_id_doc_type_point_of_sale_key" ON "sale_sequences"("tenant_id", "doc_type", "point_of_sale");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_tenant_id_fkey" FOREIGN KEY ("customer_id", "tenant_id") REFERENCES "customers"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_sale_id_tenant_id_fkey" FOREIGN KEY ("sale_id", "tenant_id") REFERENCES "sales"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_product_id_tenant_id_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_sequences" ADD CONSTRAINT "sale_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
