-- Sucursal (Branch) separada del depósito (Warehouse).
-- Antes `warehouses` era sucursal Y depósito. Esta migración crea una sucursal
-- por cada depósito existente y los enlaza 1:1 — no cambia la semántica, sólo
-- separa las entidades para poder tener varios depósitos por sucursal.

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");
CREATE UNIQUE INDEX "branches_id_tenant_id_key" ON "branches"("id", "tenant_id");
CREATE UNIQUE INDEX "branches_tenant_id_code_key" ON "branches"("tenant_id", "code");

ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Una sucursal por depósito existente (mismo nombre, código y dirección).
INSERT INTO "branches" ("id", "tenant_id", "name", "code", "address", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), "tenant_id", "name", "code", "address", "is_active", now(), now()
FROM "warehouses";

-- Enlace: primero nullable, se completa por (tenant, code) que es único en ambas tablas.
ALTER TABLE "warehouses" ADD COLUMN "branch_id" UUID;

UPDATE "warehouses" w
SET "branch_id" = b."id"
FROM "branches" b
WHERE b."tenant_id" = w."tenant_id" AND b."code" = w."code";

ALTER TABLE "warehouses" ALTER COLUMN "branch_id" SET NOT NULL;

CREATE INDEX "warehouses_tenant_id_branch_id_idx" ON "warehouses"("tenant_id", "branch_id");

ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branch_id_tenant_id_fkey" FOREIGN KEY ("branch_id", "tenant_id") REFERENCES "branches"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
