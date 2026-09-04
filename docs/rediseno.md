# Rediseño de la interfaz — estado y plan

> Complementa `docs/producto.md` (qué es el sistema). Esto es **cómo se ve** y
> hasta dónde llegamos. Se actualiza a medida que avanza.

## El sistema visual, cerrado

| | |
|---|---|
| Nombre | **Abasto**. En pantalla el logotipo es `abasto.ai` con el `.ai` en verde. |
| Paleta | **Yerba** — verde pino sobre neutros arena cálidos. Claro y oscuro siempre. |
| Tipografía | **Bricolage Grotesque** para títulos y marca · **Spline Sans** para trabajar · **Spline Sans Mono** para datos y códigos. |
| Íconos | **Phosphor**. Contorno para inactivo, **relleno para activo**. |
| Navegación | **Sólo riel a la izquierda.** No hay barra superior de aplicación. |
| Caja | Pantalla completa, fuera del riel. |

Las variables viven en `frontend/src/styles.css` como `--ab-*`, y `@theme inline`
las referencia: por eso el tema cambia en tiempo de ejecución y cualquier
componente que use los tokens semánticos (`bg-card`, `text-muted-foreground`,
`border-border`) se adapta solo.

### Reglas de diseño

- **Aire.** Poca información a la vez. Un entorno de trabajo no tiene que
  estresar.
- **El verde es la única acción sólida.** Si aparece verde lleno, se puede
  tocar. El ámbar es aviso, el rojo es problema.
- **Bento para mirar, formularios tranquilos para hacer.** La elevación y los
  grupos siempre significan algo; no se decora con tarjetas.
- **La IA sugiere, nunca decide.** Cada función con IA lleva su etiqueta `IA` y
  se puede descartar. Así el `.ai` del logotipo se lo gana.

### Maquetas de referencia

- Dirección visual y análisis del rubro:
  https://claude.ai/code/artifact/50282710-f4c6-43c9-b31e-f4db4bff4d50
- Pantallas de referencia (Productos y Caja):
  https://claude.ai/code/artifact/9829081b-4cc8-4036-9eb8-39687e165359

## Hecho

- **Tokens** (`styles.css`) y fuentes (`index.html`). Toda la app quedó en Yerba.
- **Esqueleto** (`app-shell.tsx`): sin barra superior; riel con logotipo y
  sucursal arriba, Caja como botón de modo, navegación agrupada, usuario abajo.
  Íconos Phosphor con relleno en el activo.
- **`PageHeader` pegajoso**: título y acciones siguen al scrollear.
- **Productos** — el molde de todo listado: los siete selectores de filtro se
  fueron a un panel detrás del botón «Filtros», lo activo vuelve como chips que
  se sacan de a uno, y la tabla pasó de diez columnas a seis (el código de
  barras va debajo del nombre; categoría y margen quedaron en el detalle).
- **Componentes compartidos**: tabla con más aire y cabecera sobre superficie
  levantada, tarjeta con una sola sombra, botón `outline` que se tiñe de verde
  al pasar por encima.
- **Caja fuera del riel**: ruta a pantalla completa (`FullScreenRoute`) con su
  propia franja de estado del turno.
- **Caja rediseñada por dentro**: dos columnas. A la izquierda el lector con
  anillo verde (siempre enfocado) y el carrito; a la derecha el panel con
  cliente, subtotal, descuentos, IVA, el **total grande**, los medios de pago
  como botones y Cobrar al pie. Atajos reales: `F2` lector, `F4` cliente, `F8`
  quitar la última línea.
- **Selector de tema** en el pie del riel: claro → oscuro → automático. En
  automático no estampa nada y manda el sistema; elegir uno estampa `data-theme`
  y le gana. Se guarda en `localStorage` (`lib/theme.ts`).
- **Íconos migrados a Phosphor** en toda la app: los 20 archivos que quedaban en
  Lucide. `lucide-react` ya no se usa.
- **Herramientas de la caja**: selector de tema propio (el cajero no tiene riel),
  `F3` buscador único que resuelve las dos consultas del mostrador —«¿cuánto
  sale?» mirando y «el código no lee» con Agregar—, cotizando los resultados
  visibles en un solo pedido para mostrar el precio real del cliente; y `F6` las
  promociones vigentes explicadas en palabras.
- **Buscador de productos, ya no es sólo de la caja**: `product-search.util.ts`
  (backend) tolera abreviaturas («QUE.FONTINA»), acentos y errores de tipeo —
  necesario porque casi la mitad del catálogo real trae palabras cortadas — y
  ordena por relevancia. `ProductSearchDialog` (frontend) es el mismo `F3` en
  cualquier pantalla que necesite elegir un producto: ya está en la caja y en
  Ingreso, adaptado con `cotizarPara`/`exigirPrecio` según quién lo llama.
- **Turno de caja, arqueo y pago dividido**: `CashRegister` (una por sucursal,
  se crea sola al crear el depósito) y `CashShift` — abre con fondo inicial,
  sólo un turno abierto por caja y por usuario a la vez, cierra con arqueo
  (`expectedCash` calculado, `countedCash` a mano, `cashDifference`). Sin turno
  abierto no se puede vender. `CashMovement` para ingresos/retiros/gastos
  durante el turno. En la caja: `F7` abre el panel (movimientos + cerrar
  turno); al cerrar se ve el desglose por medio de pago. Historial completo en
  Turnos de caja (admin). Una venta ahora puede pagarse con varios medios
  (`SalePayment`) que tienen que sumar el total — el botón de "Cobrar" arranca
  con el medio elegido en el panel y "Agregar otro medio" abre el split.
- **Cuenta corriente**: límite de crédito por cliente (vacío = sin tope, 0 =
  bloqueada), «Cuenta corriente» como medio de pago en la caja (pide cliente,
  valida crédito disponible), estado de cuenta y cobro manual desde Clientes
  (ícono de billetera), saldo visible en la caja junto al nombre del cliente.
- **Pesables**: casillero «Pesable» en Productos; el código de balanza (prefijo
  `2`, código interno + peso en gramos embebido) se parsea en la caja
  (`lib/pesable.ts`) y agrega la línea con la cantidad decimal correcta sin
  buscar por barcode.
- **Anular un ítem del carrito** pide autorización: un cajero sin el permiso
  `caja.autorizar_anulacion` ve un diálogo pidiendo email y contraseña de un
  supervisor (`SupervisorAuthDialog`, contra `POST /auth/authorize-supervisor`)
  antes de poder sacar una línea (Trash, `F8`, o cantidad en 0); quien sí tiene
  el permiso lo hace directo. No emite token, es sólo un sí/no para esa acción.
- **Rangos**: reemplazan por completo a `role: admin|user`. 7 de fábrica
  (Cajero, Repositor, Recepción, Administrativo, Supervisor de caja, Encargado,
  Dueño), clonables y editables desde Rangos (grid por área, peligrosos
  remarcados). El riel y las rutas se arman por permiso, no por un flag de
  admin — un rango sin `productos.crear` ni ve el botón. La sesión no vence;
  se refresca sola (`GET /auth/me`) al abrir la app, así un cambio de rango se
  nota sin desloguearse. Probado con un cajero de verdad: nav filtrada,
  rutas bloqueadas, y el cambio de rango de otra pestaña se reflejó al
  recargar.

## Lo que sigue, en orden

1. **Pasar el resto de las páginas al molde de Productos**: stock, ingresos,
   egresos, historial, vencimientos, reposición, proveedores, ventas, turnos.
   Mismo patrón de buscador + filtros en panel + chips, y tablas con las
   columnas justas.
2. **Panel del encargado**, que todavía no existe: es la pantalla donde el bento
   tiene sentido de verdad.
3. **Repasar los formularios**: siguen siendo los de antes. Falta aplicarles la
   misma regla de aire y agrupación que al resto.
4. **Recargo/descuento por medio de pago**: pago dividido ya existe, pero
   ningún medio ajusta el total todavía (queda igual, cash o tarjeta). Falta
   modelo y que la caja lo muestre antes de confirmar.

Más adelante, y ya con cambios de backend detrás (ver `docs/producto.md`):
sucursales como entidad propia (hoy `Sucursales.navegar` existe como permiso
pero no hay selector que lo use), ARCA, devoluciones/notas de crédito,
transferencias de stock entre sucursales.

## Deudas conocidas

- **Categorías salió del riel** porque el feature está sin definir, pero la
  página `/catalog/categories` sigue existiendo y el filtro por categoría sigue
  en Productos. Queda así hasta que se decida qué hacer con categorías.
- **El nombre del proyecto en el repo sigue siendo `smart-erp`** y el tenant de
  prueba se llama «Mayorista Demo». Renombrar a Abasto es una pasada aparte.
