-- Kit/combo: un producto armado con stock de otros. Ver ProductComponent en
-- schema.prisma y product-kit.util.ts.
CREATE TABLE "product_components" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "kit_product_id" UUID NOT NULL,
    "component_product_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_components_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_components_tenant_id_kit_product_id_component_produc_key" ON "product_components"("tenant_id", "kit_product_id", "component_product_id");

CREATE INDEX "product_components_tenant_id_component_product_id_idx" ON "product_components"("tenant_id", "component_product_id");

ALTER TABLE "product_components" ADD CONSTRAINT "product_components_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_components" ADD CONSTRAINT "product_components_kit_product_id_tenant_id_fkey" FOREIGN KEY ("kit_product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_components" ADD CONSTRAINT "product_components_component_product_id_tenant_id_fkey" FOREIGN KEY ("component_product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
