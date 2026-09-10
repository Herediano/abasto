# Plan — Precios, importación y promociones

> Investigación y decisiones para ordenar todo lo relacionado con precios.
> Estado: **Etapa 0 hecha** (2026-09-10). El resto, pendiente.

## El problema real

Hasta la Etapa 0 **no había forma de ponerle el precio a un solo producto**. Los
precios se cargaban únicamente por:

- la herramienta masiva (`POST /prices/bulk`) — aplica a *todos / una categoría /
  una marca*, nunca a un producto suelto;
- el import de Excel (`POST /products/import-prices`) — matchea por código de
  barras y solo pisa productos que ya existen;
- confirmar una compra — solo el costo, la primera vez.

Además había carteles vencidos: la pestaña Promociones decía *"todavía no se
aplican"* cuando sí se aplican (`sale-pricing.util.ts`, F6 en la caja).

## Cómo lo hacen otros

- **Odoo**: las listas viven aparte del catálogo, pero la ficha del producto
  muestra y edita el precio, y admite reglas de lista ahí mismo (relativas al
  costo, a la lista, o a otra lista).
- **Dux / Contabilium** (Argentina): múltiples listas, productos asociados a
  listas, carga y actualización masiva desde Excel. El import vive con los datos
  que importa.
- **Motores de promo** (retail): se evalúan de arriba hacia abajo, gana la
  primera que pega; flag "exclusiva" para que no se combine. Nada de condiciones
  combinatorias.

## Decisiones

### 1 · ¿Precios es módulo o pestaña?

Sigue siendo módulo, pero se parte por *cantidad*:

- **Un producto** (ver/poner precio, margen, escalas por cantidad) → **pestaña
  Precios del producto**, editable.
- **El conjunto** (listas, actualización masiva, criterios, redondeo,
  promociones, auditoría, cambios programados) → **módulo Precios**.

Misma regla que proveedores y reposición: *un producto se maneja en su pantalla;
el conjunto, en el módulo*.

### 2 · ¿Dónde va el importador?

**No en Proveedores.** Un solo componente `ImportWizard`
(`components/import-wizard.tsx`) — subir → mapear columnas → previsualizar →
aplicar — reusado en dos botones:

- **Productos → "Importar"** (hecho) → crea/actualiza productos: nombre, marca,
  categoría (tiene que existir), unidad, IVA, bulto, mín/máx, costo, venta,
  vencimiento. Match por código de barras. Celda vacía = no cambiar ese campo.
  Backend: `sheet-import.util.ts` (leer la grilla, `autoMap` por índice de
  columna), `product-import.util.ts` (campos + `planProductRows`),
  `POST /products/import` en 3 fases (`phase=inspect|preview|apply`).
- **Precios → "Importar precios"** → solo costo y venta sobre productos
  existentes. Todavía usa su propio diálogo (`import-prices`); falta migrarlo
  al mismo wizard con un set de columnas más chico.

Todo lo de bajo nivel (parseo xlsx/csv, formato de número argentino) salió de
`price-import.util.ts` a `sheet-import.util.ts`, que ahora comparten los dos.
Proveedor/código/costo por fila queda para una siguiente pasada.

### 3 · Poner / cambiar precios

1. **En el producto** (hecho): costo y venta editables en la pestaña Precios,
   margen y ganancia en vivo, "calcular la venta con margen X%" (redondea a la
   decena). Guarda con la barra "Guardar cambios" del producto vía
   `PUT /products/:id/price` (costo → campo del producto + historial; venta →
   `ProductPrice` de la lista base vía `guardarPrecio`, `source: 'manual'`).
2. **Módulo Precios → Actualizar** (pendiente): simplificar. Hoy son 8
   selectores; dejar A qué → Qué → Calcular → Aplicar, y meter "guardar como
   criterio" y "programar" en un `<details>`.
3. **Criterios guardados** (`PriceRule`): ya existe, es la pieza que se re-aplica
   con un clic cuando llega el aumento. Ponerla más a mano.

### 4 · Promociones

El modelo (`Promotion` + `config` JSON, tipos `nxm / a_plus_b / percent / amount
/ special_price`, scope, vigencia) está bien. Falta:

1. **Alta en criollo**: un diálogo por tipo ("Llevá 3, pagá 2" / "20% en Bebidas,
   viernes a domingo"), no el formulario genérico.
2. **Prioridad**: cuando dos promos pegan sobre el mismo producto, la lista se
   evalúa de arriba hacia abajo y gana la primera (arrastrable) + flag
   "exclusiva" (no se combina).
3. Sacar el cartel *"todavía no se aplican"* (hecho).

## El plan, por etapas

| Etapa | Qué | Estado |
|---|---|---|
| **0** | Precio editable en la pestaña Precios del producto + margen en vivo + "calcular venta". Barrer carteles vencidos. | **hecho** |
| **1** | Componente `ImportWizard` (subir → mapear → preview → aplicar) para Productos → "Importar". Falta que "Importar precios" del módulo Precios reuse el mismo wizard (hoy sigue con su diálogo propio). | **hecho (productos)** |
| **2** | Simplificar "Actualizar". Margen objetivo por categoría para "sugerir precio". | — |
| **3** | Promos: diálogos por tipo + orden por prioridad + flag exclusiva. | — |
| **4** | Nice to have: "Precios Cuidados" como lista/flag; comparar contra la lista anterior; etiquetas de lo que cambió. | — |

## Lo que NO hacer

Motor de reglas tipo SAP CPQ, scraping de precios de la competencia, repricing
dinámico por demanda, condiciones combinatorias ("comprá $X de A y $Y de B…").
Para un mayorista argentino: listas + % masivo + nxm/descuento simple + un import
que ande, alcanza y sobra.
