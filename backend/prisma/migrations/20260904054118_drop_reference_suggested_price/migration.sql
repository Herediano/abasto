/*
  Warnings:

  - You are about to drop the column `suggested_price` on the `product_reference` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product_reference" DROP COLUMN "suggested_price",
ALTER COLUMN "source" SET DEFAULT 'xlsx';
