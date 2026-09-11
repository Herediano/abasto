-- Postgres restringe el search_path a pg_catalog/pg_temp mientras construye
-- índices por expresión (mitigación de CVE-2018-1058), así que la llamada a
-- unaccent() sin calificar el esquema falla con "function unaccent(text)
-- does not exist" en instalaciones donde la extensión vive en public y no en
-- pg_catalog. Se recrea la función calificando el esquema explícitamente.
CREATE OR REPLACE FUNCTION product_haystack(name text, brand text, barcode text, sku text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ' ' || regexp_replace(
    lower(public.unaccent(concat_ws(' ', name, brand, barcode, sku))),
    '[^a-z0-9]+', ' ', 'g'
  ) || ' ';
$$;
