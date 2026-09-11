-- AlterTable
ALTER TABLE "price_rules" ADD COLUMN     "selection" JSONB,
ALTER COLUMN "scope_type" DROP NOT NULL;
