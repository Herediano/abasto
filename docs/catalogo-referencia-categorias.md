# Categorías del catálogo de referencia

## De dónde salen los productos

`product_reference` (tabla global, una fila por EAN) se llena a partir de datos
abiertos de **SEPA** (Sistema Electrónico de Publicidad de Precios Argentinos,
`datos.produccion.gob.ar`). SEPA da nombre, marca, presentación y precio, pero
**no informa el rubro/categoría de cada producto**.

## Clasificador principal: por nombre y marca (offline)

Los nombres del catálogo son muy descriptivos (`NIVEA CREMA...`, `ARIEL JABON
LIQ...`, `PAMPERS PAÑAL...`), así que la vía principal es un set de reglas por
marca + palabra clave, sin ninguna API:

```bash
cd backend
npm run db:classify-categories                  # aplica
npm run db:classify-categories -- --dry-run      # solo informa (cobertura + ejemplos sin clasificar)
npm run db:classify-categories -- --dry-run --list-unmatched   # lista completa de lo que no matcheó
npm run db:classify-categories -- --force        # reclasifica también las que ya tienen category
```

Cobertura actual ~83%. Lo que no matcha queda en `null` y se resuelve a mano
desde el filtro **"Sin categoría"** del listado de productos. Para subir la
cobertura se agregan marcas/keywords en
`backend/scripts/classify-reference-categories.ts` (mapa `POR_MARCA` y array
`REGLAS`) y se vuelve a correr con `--force`.

## Fuente alternativa: árbol de Precios Claros (API)

La misma fuente (Precios Claros) sí tiene la clasificación, pero por otra vía: su
API de navegación (`d3e6htiiul5ek9.cloudfront.net/prod`) no trae la categoría
dentro de cada producto, permite pedir "los productos de la categoría X". El
árbol tiene 11 rubros de nivel 1:

Almacén · Congelados · Frescos · Bebidas con alcohol · Bebidas sin alcohol ·
Limpieza · Perfumería y cuidado personal · Bebés · Mascotas ·
Electrodomésticos y hogar · Construcción

`backend/scripts/enrich-reference-categories.ts` recorre esos 11 rubros, junta
los EAN de cada uno y escribe `product_reference.category` con el nombre canónico
del rubro. Es idempotente y solo actualiza filas que ya existen (la creación la
sigue haciendo la carga de SEPA). EAN que la API no lista quedan sin categoría.

Ojo: el catálogo vivo de Precios Claros hoy es chico y clasifica solo una
fracción de las referencias, por eso es la fuente **alternativa/complementaria**
y no la principal. Usa etiquetas de rubro propias que no coinciden exactamente
con las del clasificador por marca — si se combinan las dos vías conviene
unificar la lista de rubros primero.

```bash
cd backend
npm run db:enrich-categories                 # aplica
npm run db:enrich-categories -- --dry-run     # solo informa
npm run db:enrich-categories -- --rubros=02,07 # solo Almacén y Limpieza
```

## Cómo llega la categoría al tenant

`Category` es por tenant; `product_reference.category` es un texto global. Al
cargar el catálogo regional (`POST /products/import-reference`), por cada rubro
distinto se reusa la `Category` del tenant que tenga ese nombre (sin distinguir
mayúsculas) o se crea una nueva, y se asigna `product.categoryId`.

En el alta individual por escaneo, `GET /product-reference/:ean` devuelve también
`category`; el formulario la preselecciona solo si el tenant ya tiene esa
categoría (no la crea solo para no ensuciar el listado).

El tenant después puede renombrar o fusionar rubros desde su módulo de
categorías sin romper nada: los productos referencian la categoría por `id`.
