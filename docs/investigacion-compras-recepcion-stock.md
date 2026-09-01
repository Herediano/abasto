# Investigación: compras, recepción y stock

## Qué datos son realmente relevantes

La factura recibida debe conservarse como documento de compra, separada de los movimientos de stock que produce. La cabecera mínima es proveedor, tipo de comprobante, punto de venta, número, fecha, moneda, subtotal, impuestos, total y estado. En Argentina, los comprobantes se distinguen por clase (A, B, C, E, entre otras) y los comprobantes electrónicos autorizados incluyen CAE; esta primera etapa registra la factura recibida, pero no integra todavía la validación fiscal con ARCA.

Cada línea necesita barcode, descripción tomada del catálogo, cantidad, precio unitario, alícuota de IVA, subtotal, impuesto e importe final. Guardar la descripción y el barcode como una foto histórica evita que una modificación posterior del producto cambie el contenido histórico de la factura.

El costo unitario debe permanecer en la factura aunque el stock actual solo sea una cantidad. Más adelante permitirá calcular costo promedio, valorización y cuentas a pagar.

## Flujo recomendado

1. El usuario crea una factura en estado `draft`.
2. Busca cada producto por barcode y agrega cantidad, precio y, cuando corresponda, lote.
3. El sistema calcula subtotal, impuestos y total; no se deben confiar totales enviados por el navegador.
4. Al confirmar la recepción, se genera un movimiento `purchase_in` por cada línea dentro de una transacción.
5. La factura pasa a `confirmed` y no puede volver a generar stock.

Este patrón separa captura de confirmación y evita duplicar existencias por doble click o recarga. Es conceptualmente equivalente a la recepción formal y al control de coincidencia entre pedido, recepción y factura usado en sistemas de compras; si más adelante agregamos órdenes de compra, se podrá aplicar un control de tres vías.

## Sucursal y depósito

El usuario queda asociado a un depósito/sucursal. En el ingreso no se selecciona depósito manualmente: el backend obtiene `warehouseId` del usuario autenticado y rechaza la operación si no tiene asignación. Los permisos por función (administrativo, cajero, tesorero, encargado, etc.) quedan como siguiente capa; no se deben confundir con la sucursal.

## Decisiones de esta primera implementación

- Barcode obligatorio y único por tenant.
- Código interno opcional para búsquedas internas.
- Facturas de compra con estado borrador/confirmada/anulada.
- Confirmar factura genera stock; crear borrador no genera stock.
- Lote obligatorio para productos que manejan vencimiento.
- El total se calcula en backend con `quantity * unitCost` e impuestos.
- No se almacena todavía una imagen/PDF de la factura ni se hace OCR automático; pueden agregarse después como evidencia adjunta y asistencia de carga, sin reemplazar la revisión humana.

## Fuentes consultadas

- [ARCA: régimen general y clases de comprobantes](https://www.arca.gob.ar/facturacion/regimen-general/comprobantes.asp)
- [ARCA: emisión y autorización de factura electrónica](https://www.arca.gob.ar/fe/emision-autorizacion/consideraciones.asp)
- [GS1: estándar global de trazabilidad](https://www.gs1.org/standards/gs1-global-traceability-standard/current-standard)
- [Oracle: control de tres vías](https://docs.oracle.com/en/cloud/saas/procurement/25c/oapro/match-approval-level-options.html)
