-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('merma', 'rotura', 'vencido', 'otro');

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN "reason" "AdjustmentReason";
