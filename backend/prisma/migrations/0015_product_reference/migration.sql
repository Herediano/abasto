CREATE TABLE "product_reference" (
  "ean" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "brand" TEXT,
  "source" TEXT NOT NULL DEFAULT 'sepa',
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_reference_pkey" PRIMARY KEY ("ean")
);
