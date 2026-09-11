-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "exclusive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;
