-- Renombra products.internal_code -> products.sku (SKU es el término estándar).
-- El índice de trigramas y la función product_haystack referencian la columna,
-- así que se bajan, se renombra y se rearman.

DROP INDEX IF EXISTS "products_haystack_trgm_idx";
DROP FUNCTION IF EXISTS product_haystack(text, text, text, text);

ALTER TABLE "products" RENAME COLUMN "internal_code" TO "sku";
ALTER INDEX "products_tenant_id_internal_code_key" RENAME TO "products_tenant_id_sku_key";

CREATE FUNCTION product_haystack(name text, brand text, barcode text, sku text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ' ' || regexp_replace(
    lower(unaccent(concat_ws(' ', name, brand, barcode, sku))),
    '[^a-z0-9]+', ' ', 'g'
  ) || ' ';
$$;

CREATE INDEX IF NOT EXISTS "products_haystack_trgm_idx"
  ON "products"
  USING gin (product_haystack(name, brand, barcode, sku) gin_trgm_ops);
