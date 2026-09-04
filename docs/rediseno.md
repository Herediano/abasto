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

## Lo que sigue, en orden

1. **Pasar el resto de las páginas al molde de Productos**: stock, ingresos,
   egresos, historial, vencimientos, reposición, proveedores, clientes, ventas.
   Mismo patrón de buscador + filtros en panel + chips, y tablas con las
   columnas justas.
2. **Terminar el cambio de íconos.** El riel y la caja ya usan Phosphor; el
   resto de las páginas sigue en Lucide. Es un reemplazo mecánico de imports.
3. **Selector de tema** (claro / oscuro / sistema) en algún lugar del riel. Los
   tokens ya lo soportan, falta el control y guardar la preferencia.
4. **Panel del encargado**, que todavía no existe: es la pantalla donde el bento
   tiene sentido de verdad.

Más adelante, y ya con cambios de backend detrás (ver `docs/producto.md`):
rangos y permisos, sucursales como entidad propia, caja/arqueo, pago dividido,
cuenta corriente, pesables.

## Deudas conocidas

- **Nada está pusheado a GitHub.** Los commits están locales: el WSL es nuevo y
  no tiene credenciales de GitHub guardadas. Hace falta `gh auth login` o un
  token personal, y después `git push origin main`.
- **Categorías salió del riel** porque el feature está sin definir, pero la
  página `/catalog/categories` sigue existiendo y el filtro por categoría sigue
  en Productos. Queda así hasta que se decida qué hacer con categorías.
- **El nombre del proyecto en el repo sigue siendo `smart-erp`** y el tenant de
  prueba se llama «Mayorista Demo». Renombrar a Abasto es una pasada aparte.
