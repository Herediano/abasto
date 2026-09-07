-- AlterTable
ALTER TABLE "sale_payments" ADD COLUMN     "surcharge_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "surcharge_total" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "payment_adjustments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "method" "PaymentMethodType" NOT NULL,
    "percent" DECIMAL(6,3) NOT NULL,

    CONSTRAINT "payment_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_adjustments_tenant_id_branch_id_idx" ON "payment_adjustments"("tenant_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_adjustments_tenant_id_branch_id_method_key" ON "payment_adjustments"("tenant_id", "branch_id", "method");

-- AddForeignKey
ALTER TABLE "payment_adjustments" ADD CONSTRAINT "payment_adjustments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_adjustments" ADD CONSTRAINT "payment_adjustments_branch_id_tenant_id_fkey" FOREIGN KEY ("branch_id", "tenant_id") REFERENCES "branches"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;
