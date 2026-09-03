-- CreateTable
CREATE TABLE "price_lists" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "derives_from_id" UUID,
    "markup_percent" DECIMAL(6,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_prices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "price_list_id" UUID NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_lists_tenant_id_idx" ON "price_lists"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_tenant_id_name_key" ON "price_lists"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_id_tenant_id_key" ON "price_lists"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "product_prices_tenant_id_price_list_id_product_id_valid_fro_idx" ON "product_prices"("tenant_id", "price_list_id", "product_id", "valid_from");

-- CreateIndex
CREATE INDEX "product_prices_tenant_id_valid_from_idx" ON "product_prices"("tenant_id", "valid_from");

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_derives_from_id_fkey" FOREIGN KEY ("derives_from_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_tenant_id_fkey" FOREIGN KEY ("product_id", "tenant_id") REFERENCES "products"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_price_list_id_tenant_id_fkey" FOREIGN KEY ("price_list_id", "tenant_id") REFERENCES "price_lists"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Volcado de datos: cada tenant estrena una lista base "General" y sus precios
-- de venta actuales pasan a ser la primera fila vigente de esa lista.
-- Sin esto, product_prices arrancaria vacio y todos los productos quedarian
-- sin precio pese a tenerlo cargado.
INSERT INTO "price_lists" ("id", "tenant_id", "name", "is_default", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), t."id", 'General', true, true, NOW(), NOW()
FROM "tenants" t;

INSERT INTO "product_prices" ("id", "tenant_id", "product_id", "price_list_id", "price", "valid_from", "source", "created_at")
SELECT gen_random_uuid(), p."tenant_id", p."id", pl."id", p."sale_price", NOW(), 'manual', NOW()
FROM "products" p
JOIN "price_lists" pl ON pl."tenant_id" = p."tenant_id" AND pl."is_default" = true
WHERE p."sale_price" IS NOT NULL;
