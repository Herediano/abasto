-- AlterTable
ALTER TABLE "price_lists" ADD COLUMN     "branch_id" UUID;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_branch_id_tenant_id_fkey" FOREIGN KEY ("branch_id", "tenant_id") REFERENCES "branches"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
