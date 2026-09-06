-- El usuario se asigna a una sucursal (antes se derivaba de su depósito).

-- AlterTable
ALTER TABLE "users" ADD COLUMN "branch_id" UUID;

-- Rellena la sucursal de los usuarios actuales desde el depósito que tenían.
UPDATE "users" u
SET "branch_id" = w."branch_id"
FROM "warehouses" w
WHERE w."id" = u."warehouse_id";

-- CreateIndex
CREATE INDEX "users_tenant_id_branch_id_idx" ON "users"("tenant_id", "branch_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_tenant_id_fkey" FOREIGN KEY ("branch_id", "tenant_id") REFERENCES "branches"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
