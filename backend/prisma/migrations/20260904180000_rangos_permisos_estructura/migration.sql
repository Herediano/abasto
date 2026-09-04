-- Estructura del sistema de rangos. rango_id se agrega NULLABLE a propósito:
-- un script aparte (backfill-rangos.ts) siembra los 7 rangos de fábrica por
-- tenant y migra a cada usuario desde su role actual antes de que una
-- segunda migración lo vuelva obligatorio y borre role/UserRole.

-- CreateTable
CREATE TABLE "rangos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rangos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rango_permissions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "rango_id" UUID NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "rango_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rangos_tenant_id_idx" ON "rangos"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "rangos_tenant_id_name_key" ON "rangos"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "rangos_id_tenant_id_key" ON "rangos"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "rango_permissions_tenant_id_rango_id_idx" ON "rango_permissions"("tenant_id", "rango_id");

-- CreateIndex
CREATE UNIQUE INDEX "rango_permissions_rango_id_key_key" ON "rango_permissions"("rango_id", "key");

-- AddForeignKey
ALTER TABLE "rangos" ADD CONSTRAINT "rangos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rango_permissions" ADD CONSTRAINT "rango_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rango_permissions" ADD CONSTRAINT "rango_permissions_rango_id_tenant_id_fkey" FOREIGN KEY ("rango_id", "tenant_id") REFERENCES "rangos"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: rango_id nullable por ahora, se completa con el backfill.
ALTER TABLE "users" ADD COLUMN "rango_id" UUID;
