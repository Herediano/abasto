-- Ya corrió prisma/backfill-rangos.ts: todo usuario existente tiene rango_id.
-- Ahora se vuelve obligatorio y se borra role/UserRole, que quedan
-- reemplazados por completo por el sistema de rangos.

ALTER TABLE "users" ALTER COLUMN "rango_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "users_tenant_id_rango_id_idx" ON "users"("tenant_id", "rango_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_rango_id_tenant_id_fkey" FOREIGN KEY ("rango_id", "tenant_id") REFERENCES "rangos"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role";

-- DropEnum
DROP TYPE "UserRole";
