-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('deposit', 'withdrawal', 'expense');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('cash', 'card', 'transfer', 'qr', 'account');

-- CreateEnum
CREATE TYPE "CustomerAccountMovementType" AS ENUM ('sale', 'payment', 'adjustment');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "account_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "credit_limit" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_weighed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "shift_id" UUID;

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_shifts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cash_register_id" UUID NOT NULL,
    "opened_by_id" UUID NOT NULL,
    "closed_by_id" UUID,
    "status" "ShiftStatus" NOT NULL DEFAULT 'open',
    "opening_cash" DECIMAL(14,2) NOT NULL,
    "opening_notes" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "expected_cash" DECIMAL(14,2),
    "counted_cash" DECIMAL(14,2),
    "cash_difference" DECIMAL(14,2),
    "closing_notes" TEXT,

    CONSTRAINT "cash_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "method" "PaymentMethodType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reference" TEXT,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_account_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" "CustomerAccountMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balance_after" DECIMAL(14,2) NOT NULL,
    "sale_id" UUID,
    "user_id" UUID NOT NULL,
    "notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_account_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_registers_tenant_id_warehouse_id_idx" ON "cash_registers"("tenant_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_registers_id_tenant_id_key" ON "cash_registers"("id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_registers_tenant_id_warehouse_id_name_key" ON "cash_registers"("tenant_id", "warehouse_id", "name");

-- CreateIndex
CREATE INDEX "cash_shifts_tenant_id_cash_register_id_status_idx" ON "cash_shifts"("tenant_id", "cash_register_id", "status");

-- CreateIndex
CREATE INDEX "cash_shifts_tenant_id_opened_by_id_status_idx" ON "cash_shifts"("tenant_id", "opened_by_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cash_shifts_id_tenant_id_key" ON "cash_shifts"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "cash_movements_tenant_id_shift_id_idx" ON "cash_movements"("tenant_id", "shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_movements_id_tenant_id_key" ON "cash_movements"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "sale_payments_tenant_id_sale_id_idx" ON "sale_payments"("tenant_id", "sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_payments_id_tenant_id_key" ON "sale_payments"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "customer_account_movements_tenant_id_customer_id_occurred_a_idx" ON "customer_account_movements"("tenant_id", "customer_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_account_movements_id_tenant_id_key" ON "customer_account_movements"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_shift_id_idx" ON "sales"("tenant_id", "shift_id");

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_warehouse_id_tenant_id_fkey" FOREIGN KEY ("warehouse_id", "tenant_id") REFERENCES "warehouses"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_cash_register_id_tenant_id_fkey" FOREIGN KEY ("cash_register_id", "tenant_id") REFERENCES "cash_registers"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_shift_id_tenant_id_fkey" FOREIGN KEY ("shift_id", "tenant_id") REFERENCES "cash_shifts"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_tenant_id_fkey" FOREIGN KEY ("sale_id", "tenant_id") REFERENCES "sales"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_account_movements" ADD CONSTRAINT "customer_account_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_account_movements" ADD CONSTRAINT "customer_account_movements_customer_id_tenant_id_fkey" FOREIGN KEY ("customer_id", "tenant_id") REFERENCES "customers"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_account_movements" ADD CONSTRAINT "customer_account_movements_sale_id_tenant_id_fkey" FOREIGN KEY ("sale_id", "tenant_id") REFERENCES "sales"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_account_movements" ADD CONSTRAINT "customer_account_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_shift_id_tenant_id_fkey" FOREIGN KEY ("shift_id", "tenant_id") REFERENCES "cash_shifts"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un turno abierto por caja y por usuario a la vez. Prisma no declara WHERE en
-- @@unique, así que van a mano: son la garantía real, el chequeo en el
-- service es sólo para dar un mensaje legible antes de pegar contra esto.
CREATE UNIQUE INDEX "cash_shifts_one_open_per_register" ON "cash_shifts"("cash_register_id") WHERE "status" = 'open';
CREATE UNIQUE INDEX "cash_shifts_one_open_per_user" ON "cash_shifts"("opened_by_id") WHERE "status" = 'open';
