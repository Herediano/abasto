-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "logo" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferences" JSONB;
