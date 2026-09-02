ALTER TABLE "purchase_invoices"
  ADD COLUMN "other_taxes" JSONB,
  ADD COLUMN "other_taxes_total" DECIMAL(14,2) NOT NULL DEFAULT 0;
