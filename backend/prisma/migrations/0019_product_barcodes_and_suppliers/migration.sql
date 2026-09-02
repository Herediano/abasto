-- CreateTable
CREATE TABLE "product_barcodes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "barcode" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_suppliers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "supplier_code" TEXT,
    "last_cost" DECIMAL(14,2),
    "last_purchase_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_barcodes_tenant_id_product_id_idx" ON "product_barcodes"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_tenant_id_barcode_key" ON "product_barcodes"("tenant_id", "barcode");

-- CreateIndex
CREATE INDEX "product_suppliers_tenant_id_product_id_idx" ON "product_suppliers"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_suppliers_tenant_id_product_id_supplier_id_key" ON "product_suppliers"("tenant_id", "product_id", "supplier_id");

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_product_id_tenant_id_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_product_id_tenant_id_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_supplier_id_tenant_id_fkey" FOREIGN KEY ("supplier_id", "tenant_id") REFERENCES "suppliers"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
