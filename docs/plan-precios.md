# Plan — Precios, importación y promociones

> Investigación y decisiones para ordenar todo lo relacionado con precios.
> Estado: **Etapas 0 a 3 hechas** (2026-09-11). Precios Cuidados salió del plan:
> el programa ya no está vigente, no se implementa.

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
- **Precios → "Importar precios"** (hecho) → solo costo y venta sobre productos
  existentes; no crea nada. Usa el mismo `ImportWizard` con un set de columnas
  más chico (`PRICE_IMPORT_FIELDS` en `price-import.util.ts`) y las mismas 3
  fases en `POST /prices/import`. El viejo `products/import-prices`, que
  adivinaba las columnas y aplicaba de una sin previa, se eliminó.
  El **nombre** dejó de tener su checkbox: se actualiza sólo si se mapea esa
  columna, que es la misma garantía ("no reescribir el catálogo por accidente")
  expresada con el mecanismo del wizard en vez de un flag aparte.

Todo lo de bajo nivel (parseo xlsx/csv, formato de número argentino) salió de
`price-import.util.ts` a `sheet-import.util.ts`, que ahora comparten los dos.
Proveedor/código/costo por fila queda para una siguiente pasada.

### 3 · Poner / cambiar precios

1. **En el producto** (hecho): costo y venta editables en la pestaña Precios,
   margen y ganancia en vivo, "calcular la venta con margen X%" (redondea a la
   decena). Guarda con la barra "Guardar cambios" del producto vía
   `PUT /products/:id/price` (costo → campo del producto + historial; venta →
   `ProductPrice` de la lista base vía `guardarPrecio`, `source: 'manual'`).
2. **Módulo Precios → Actualizar** (hecho): A qué → Qué le hago → Revisar y
   aplicar, con "guardar como criterio" y programar integrados al flujo.
3. **Criterios guardados** (`PriceRule`): ya existe, es la pieza que se re-aplica
   con un clic cuando llega el aumento.
4. **Margen objetivo por categoría** (hecho, 2026-09-11): `Category.targetMargin`
   (opcional, se carga en Categorías). "Fijar un margen" tiene un check "usar el
   margen objetivo de cada categoría" — con eso resuelve el % producto por
   producto según su categoría en vez de aplanar todo a un único número. Los
   productos de una categoría sin margen cargado quedan afuera con el motivo a
   la vista.

### 4 · Promociones (hecho, 2026-09-11)

El modelo (`Promotion` + `config` JSON, tipos `nxm / a_plus_b / percent / amount
/ special_price`, scope, vigencia) sigue siendo el mismo. Se agregó:

1. **Alta en criollo**: el diálogo elige el tipo con tarjetas en lenguaje llano
   ("Llevá 3, pagá 2", "20% de descuento", etc.) en vez de un `<select>`, y
   ahora también permite editar una promo ya creada (antes sólo se podía borrar).
2. **Prioridad + exclusividad**: `Promotion.priority` (orden de evaluación,
   se arrastra la fila en la tabla — `PUT /promotions/reorder` persiste el
   orden) y `Promotion.exclusive` (default `true`). `sale-pricing.util.ts` ya
   no elige "la que más descuenta": evalúa en orden de prioridad y gana la
   primera que aplica; si esa no es exclusiva, sigue sumando el descuento de
   las siguientes hasta la próxima exclusiva o el final de la lista.
3. Sacar el cartel *"todavía no se aplican"* (hecho).

### 5 · Repaso post-etapa-3 (hecho, 2026-09-11)

Con las etapas 0-3 cerradas, un repaso del circuito completo (compras → costo →
venta → escalas → promos) encontró tres puntos flojos, cerrados en la misma
pasada:

1. **El costo no se actualizaba después de la primera compra.** `costPrice`
   sólo se cargaba si estaba en `null`; las compras siguientes actualizaban
   `ProductSupplier.lastCost` (visible en la ficha) pero nunca el costo real,
   así que el margen calculado podía quedar desactualizado sin que nadie se
   entere. Ahora es una elección del negocio: `Tenant.autoUpdateCostOnPurchase`
   (Ajustes → La empresa). Apagado (default): la compra queda registrada y el
   producto aparece en Precios → Actualizar → "Costos por sincronizar" para
   decidir a mano, así se puede armar el aumento de venta antes de tocar nada.
   Encendido: cada factura confirmada pisa el costo directo.
2. **Las escalas por cantidad (`PriceTier`) sólo se cargaban producto por
   producto.** Ahora también:
   - Precios → Actualizar → **"Precio por cantidad"**: la misma selección
     apilable de siempre + "desde N unidades, X% menos que la venta actual",
     con preview antes de aplicar. Escribe escalas, no el precio único — un
     producto sigue con precio único si nunca se le cargó ninguna.
   - El importador de precios entiende tres columnas nuevas y opcionales
     (`tier3Price`, `tier6Price`, `tier12Price` — "Precio por 3/6/12 o más").
     Sin mapearlas, el producto queda con precio único; es el negocio el que
     elige si un producto lleva precio por cantidad al mapear esa columna.
3. **Las promociones sólo tenían rango de fechas.** Se agregó día de la semana
   (`Promotion.daysOfWeek`, chips D L M X J V S — ninguno marcado = todos los
   días) y franja horaria opcional (`startTime`/`endTime`). Es AND con el
   rango de fechas. La tabla lo muestra en criollo y compacto ("Vie, sáb y dom
   · 18:00 a 22:00") en vez de esconderlo en el JSON.

## El plan, por etapas

| Etapa | Qué | Estado |
|---|---|---|
| **0** | Precio editable en la pestaña Precios del producto + margen en vivo + "calcular venta". Barrer carteles vencidos. | **hecho** |
| **1** | Componente `ImportWizard` (subir → mapear → preview → aplicar), usado por Productos → "Importar" y por Precios → "Importar precios". | **hecho** |
| **2** | Simplificar "Actualizar": selección apilable (categorías, marcas, proveedor, productos a mano, margen, antigüedad, sin precio) con contador en vivo; operaciones nombradas por el trabajo real; redondeo como modificador; criterios con % opcional; margen objetivo por categoría. | **hecho** |
| **3** | Promos: diálogos por tipo + orden por prioridad + flag exclusiva. | **hecho** |
| **4** | ~~"Precios Cuidados" como lista/flag~~ — programa dado de baja, no se implementa. | descartado |
| **5** | Costo automático opcional + panel de sincronización; precio por cantidad como actualización masiva y en el importador; promos con día/horario. | **hecho** |

## Lo que NO hacer

Motor de reglas tipo SAP CPQ, scraping de precios de la competencia, repricing
dinámico por demanda, condiciones combinatorias ("comprá $X de A y $Y de B…"),
nada de "Precios Cuidados" (el programa no está vigente).
Para un mayorista argentino: listas + % masivo + nxm/descuento simple + un import
que ande, alcanza y sobra.
