-- Búsqueda de productos tolerante: sin acentos y con similitud para tipeos.
--
-- unaccent: "PAÑAL" y "panal" tienen que ser la misma cosa para el buscador.
-- pg_trgm:  permite ordenar por parecido y encontrar aunque haya un error de
--           tipeo ("cocacola", "gaseoza").
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- El texto sobre el que se busca: nombre, marca y códigos, en minúscula, sin
-- acentos y con toda la puntuación convertida en espacios, de modo que
-- "QUE.FONTINA" quede como " que fontina " y sus palabras sean alcanzables.
-- Va rodeado de espacios para que buscar " que " sea una palabra completa y
-- " que" sea "una palabra que empieza con que", sin necesidad de regex.
CREATE OR REPLACE FUNCTION product_haystack(name text, brand text, barcode text, internal_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ' ' || regexp_replace(
    lower(unaccent(concat_ws(' ', name, brand, barcode, internal_code))),
    '[^a-z0-9]+', ' ', 'g'
  ) || ' ';
$$;

-- Índice de trigramas sobre ese texto. Con ~6.000 productos por empresa el
-- escaneo secuencial ya sería aceptable, pero esto mantiene la búsqueda rápida
-- cuando un catálogo crezca.
CREATE INDEX IF NOT EXISTS products_haystack_trgm_idx
  ON products
  USING gin (product_haystack(name, brand, barcode, internal_code) gin_trgm_ops);
