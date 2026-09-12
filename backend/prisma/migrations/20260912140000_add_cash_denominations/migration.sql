-- AlterTable
ALTER TABLE "cash_shifts" ADD COLUMN "cash_count" JSONB;

-- AlterTable
ALTER TABLE "cash_movements" ADD COLUMN "denominations" JSONB;
