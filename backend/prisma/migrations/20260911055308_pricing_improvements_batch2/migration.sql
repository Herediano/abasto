-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "days_of_week" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "end_time" TEXT,
ADD COLUMN     "start_time" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "auto_update_cost_on_purchase" BOOLEAN NOT NULL DEFAULT false;
