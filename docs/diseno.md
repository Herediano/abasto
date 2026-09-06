# Diseño — Abasto

> La estrella polar del diseño. Antes de tocar una pantalla, un componente o un
> color, se chequea contra este documento. Complementa `docs/producto.md` (qué es
> el sistema); esto es **cómo se ve, cómo se navega y por qué**. Es un documento
> vivo —«Hecho» y «Lo que sigue» se actualizan a medida que se avanza— pero
> **las bases** (sistema visual, reglas, el escritorio, el módulo, navegación) no
> se tocan sin una razón fuerte y escrita.

## El sistema visual, cerrado

| | |
|---|---|
| Nombre | **Abasto**. En pantalla el logotipo es `abasto.ai` con el `.ai` en verde. |
| Paleta | **Yerba** — verde pino sobre neutros arena cálidos. Claro y oscuro siempre. |
| Tipografía | **Bricolage Grotesque** para títulos, marca y los números que importan · **Spline Sans** para trabajar · **Spline Sans Mono** para datos y códigos. |
| Íconos | **Phosphor**. Contorno para inactivo, **relleno para activo**. |
| Navegación | **El escritorio.** No hay riel ni barra de navegación: se entra al escritorio y desde ahí a cada módulo. |
| Caja | Pantalla completa, fuera del escritorio (su propio mundo). |

Las variables viven en `frontend/src/styles.css` como `--ab-*`, y `@theme inline`
las referencia: por eso el tema cambia en tiempo de ejecución y cualquier
componente que use los tokens semánticos (`bg-card`, `text-muted-foreground`,
`border-border`) se adapta solo.

## Reglas de diseño

- **Aire.** Poca información a la vez. Un entorno de trabajo no tiene que
  estresar.
- **El verde es la única acción sólida.** Si aparece verde lleno, se puede
  tocar. El ámbar es aviso, el rojo es problema. **No hay un color por módulo** —
  el color siempre significa estado, nunca identidad.
- **El estado lo dice el dato, no un marco.** «▲ 17,8 %» en verde, «3 lotes» en
  ámbar, «4 vencidos» en rojo. Un puntito basta para marcar «acá hay algo».
- **Bento para mirar, formularios tranquilos para hacer.** La elevación y los
  grupos siempre significan algo; no se decora con tarjetas.
- **Consistencia.** Si editar un registro se hace de una manera en Clientes, la
  misma manera vale en Proveedores y Productos. No hay diez formas de hacer lo
  mismo. Quien aprende una pantalla entiende las demás.
- **Progresividad.** El caso simple es el default, no una configuración que hay
  que desarmar. Una sola sucursal, un solo usuario, sin cuenta corriente, sin
  lotes: el sistema no tiene que pedir nada de eso para funcionar.
- **La IA sugiere, nunca decide.** Cada función con IA lleva su etiqueta `IA` y
  se puede descartar. Así el `.ai` del logotipo se lo gana.

## El escritorio

La pantalla de inicio —y **la única navegación**— es el escritorio: una **caja
con todos los módulos** del sistema, una tarjeta por módulo. Se entra al
escritorio, se toca un módulo, se trabaja adentro, se vuelve al escritorio para
ir a otro. El escritorio es el nexo; no hay riel que lo duplique.

Cumple dos funciones a la vez: **navegación** y **centro de estado del negocio**.
Entrás a la mañana, ves de un vistazo dónde hay algo para atender, y entrás ahí.

### La tarjeta — un solo molde para las ~14

Todas las tarjetas son **iguales**: mismo tamaño, mismo borde, misma estructura.
Ninguna más grande que otra (Ventas incluida — el gráfico grande vive **adentro**
del módulo Ventas, no en el escritorio).

Anatomía, siempre en el mismo lugar:

1. **Ícono** en un chip redondeado (arriba a la izquierda).
2. **Nombre** del módulo.
3. **Dato clave** en Bricolage, grande — lo único que de verdad importa saber sin
   entrar (`$ 1,28 M`, `3 lotes`, `Abierta`, `43 pendientes`).
4. **Una línea de contexto** debajo, con el color del estado si corresponde.
5. **Puntito de aviso** (ámbar/rojo) arriba a la derecha, sólo si hay algo
   pendiente.

La consistencia se cierra con la cáscara; la **identidad** la da un **motivo de
línea** propio de cada módulo —grande y tenue, saliéndose por una esquina—:
Ventas unas barras que suben, Caja una registradora, Vencimientos un calendario,
Compras un camión, Precios una etiqueta, Reportes un gráfico. Es carácter que
significa algo, no adorno, y no gasta color. Al pasar el mouse el motivo se tiñe
de verde y el chip se llena.

### Se arma por permiso

**Es una sola pantalla, igual para todos.** Qué tarjetas trae sale del rango,
igual que antes el riel: sin `stock.ver` no hay tarjeta de Stock. No existe un
«escritorio de encargado» y otro de administrativo; existe **el escritorio**, y
cada uno ve su recorte. El encargado no ve otra pantalla: ve más tarjetas.

### Estado tranquilo

Si no hay nada pendiente, el escritorio no queda vacío: queda **tranquilo**. Cada
tarjeta muestra su versión en calma (`✓ Todo sobre el mínimo`, `✓ Nada vence en
7 días`) y el resumen de arriba pasa a ser un saludo. Un escritorio en calma es
la señal de que está todo bien.

### Configurable

Un modo «Configurar»: ocultar tarjetas, mostrarlas de nuevo, reordenarlas. Se
guarda por usuario (hoy `localStorage`, mañana en el perfil). Con control —
jerarquía clara, no un caos de widgets. Personalización más profunda (fijar,
destacar, tamaños) es más adelante.

### Dos excepciones, por contexto de trabajo

- **Cajero** → no cae en el escritorio. Entra directo a la caja (pantalla
  completa, fuera de todo). Un escritorio sería una parada de más entre el login
  y escanear.
- **Celular** (repositor, o cualquiera desde el teléfono) → mismo escritorio,
  misma idea, **una sola columna**. Es una variante de maquetado, no otro
  concepto.

## El módulo — también un solo molde

Todos los módulos se abren y se ven igual. Nada de que uno tenga barra lateral y
otro no.

- **Cabecera pegajosa** (`PageHeader`): a la izquierda **← Escritorio** (+ `Esc`),
  después el **chip con el ícono** + un rastro (`Escritorio / Vencimientos`) + el
  **título**; a la derecha las acciones —**Filtros**, **Exportar** y la **acción
  principal** del módulo (`Nueva venta`, `Cargar factura`, `Registrar cobro`…)—.
- **Filtros** viven detrás del botón; lo que está activo vuelve como **chips** que
  se sacan de a uno (el molde que ya estrenó Productos).
- **Cuerpo**: una tabla con las columnas justas, o el contenido propio del módulo
  (el gráfico en Ventas, la lista de reportes en Reportes). Tablas con aire,
  cabecera sobre superficie levantada, números en mono alineados por dígito.

## Navegación y continuidad

- **Escritorio ↔ módulo.** Tocás una tarjeta y **se despliega**: la tarjeta crece
  y se convierte en la cabecera del módulo (View Transitions API — la tarjeta y
  la cabecera comparten `view-transition-name`; el resto cruza suave; ~220 ms,
  ease-out, sin rebote; respeta `prefers-reduced-motion`; degrada a corte
  instantáneo donde no hay soporte). Volver es el reverso exacto: **← Escritorio**
  o **Esc**.
- **No perder el lugar.** El escritorio te espera como lo dejaste (scroll,
  configuración). A futuro, cada módulo conserva su contexto de trabajo (filtros,
  búsqueda, fila seleccionada) al ir y volver — «espacios de trabajo paralelos».
- **Adentro de un módulo**, su propia navegación cuando haga falta
  (`Escritorio → Clientes → Cliente → Historial`). Nunca una barra global con
  todo el sistema.
- **La caja** se abre desde el escritorio (botón de modo) y toma la pantalla
  completa; el cajero no ve el escritorio mientras cobra.

## IA — Ctrl + K, desde cualquier lado

La IA no es un módulo ni un panel fijo: es **algo que invocás y se va**. `Ctrl+K`
(o el botón «Preguntar») abre un buscador que:

- responde preguntas del negocio cruzando módulos («¿cuánto vendimos hoy?»,
  «¿qué tengo que comprar?», «¿qué clientes me deben?») — siempre con la
  etiqueta `IA` y descartables;
- y sirve para **saltar a un módulo** sin volver al escritorio, para el que ya
  aprendió el atajo.

## Exportar — la salida universal

En **toda lista y todo reporte**, siempre, en el mismo lugar de la cabecera, un
**Exportar** discreto → Excel / CSV / copiar. Por dos razones: la data es del
negocio y siempre tiene que poder salir; y en Argentina todo lo que se hace se lo
termina mandando al contador. Regla: **la pantalla contesta las 3 preguntas que
la gente siempre tiene; el Excel es para la 4ta, la impredecible, y para pasarle
datos a alguien de afuera.**

## Maquetas de referencia

- Dirección visual y análisis del rubro:
  https://claude.ai/code/artifact/50282710-f4c6-43c9-b31e-f4db4bff4d50
- Pantallas de referencia (Productos y Caja):
  https://claude.ai/code/artifact/9829081b-4cc8-4036-9eb8-39687e165359
- **Escritorio v4** (caja de 14 módulos, tarjetas con motivo, módulo desplegable,
  gráfico de Ventas adentro, Ctrl+K): https://claude.ai/code/artifact/32cc6074-d912-443f-b0f4-25592d6141da

## Hecho

- **Tokens** (`styles.css`) y fuentes (`index.html`). Toda la app en Yerba.
- **Productos** — el molde de todo listado: filtros en panel detrás de «Filtros»,
  lo activo vuelve como chips, tabla con las columnas justas.
- **`PageHeader` pegajoso**: título y acciones siguen al scrollear.
- **Componentes compartidos**: tabla con aire y cabecera sobre superficie
  levantada, tarjeta con una sola sombra, botón `outline` que se tiñe de verde.
- **Caja fuera de todo**: `FullScreenRoute` con su franja de estado del turno.
  Caja por dentro: lector con anillo verde, carrito, panel de cobro, total
  grande, medios como botones. Atajos `F2`/`F3`/`F4`/`F6`/`F7`/`F8`.
- **Selector de tema** (claro → oscuro → automático, `lib/theme.ts`).
- **Íconos Phosphor** en toda la app (Lucide ya no se usa).
- **Buscador de productos** (`product-search.util.ts` + `ProductSearchDialog`):
  tolera abreviaturas, acentos y errores de tipeo; el mismo `F3` en cualquier
  pantalla que necesite elegir un producto.
- **Turno de caja, arqueo y pago dividido**; **cuenta corriente**; **pesables**;
  **anular ítem con autorización de supervisor**; **rangos** (7 de fábrica,
  clonables; nav y rutas por permiso). Detalle en `docs/producto.md`.

## Lo que sigue, en orden

1. **El shell nuevo**: sacar el riel (`app-shell.tsx`), el escritorio como índice
   (`/`), el registro `MODULES` (ícono, motivo, ruta, permiso, rastro), la
   cabecera de módulo unificada con **← Escritorio** + `Esc`, y la transición
   tarjeta → módulo. Todas las páginas actuales siguen funcionando, adaptadas al
   molde.
2. **Datos vivos en las tarjetas**: endpoints de resumen por módulo para el dato
   clave (ventas de hoy, lotes por vencer, facturas sin cargar, bajo mínimo,
   saldo en la calle…). Hasta que existan, las tarjetas son lanzadores con el
   nombre y un contador simple.
3. **Ventas como módulo**: mover el gráfico interactivo (Hoy/Semana/Mes/Año ×
   Facturación/Margen/Tickets/Ticket promedio, hover, comparación) adentro del
   módulo, sobre datos reales.
4. **Exportar** como componente único en la cabecera de cada listado.
5. **Ctrl+K**: buscador de módulos primero; la capa de preguntas a la IA después.
6. **Pasar el resto de las páginas al molde de Productos** (buscador + filtros en
   panel + chips, columnas justas): stock, ingresos, egresos, historial,
   vencimientos, reposición, proveedores, ventas, turnos.
7. **Repasar los formularios** con la misma regla de aire y agrupación.
8. **Recargo/descuento por medio de pago** (falta modelo y que la caja lo
   muestre antes de confirmar).

Más adelante, con backend detrás (ver `docs/producto.md`): sucursales como
entidad propia, ARCA, devoluciones/notas de crédito, transferencias de stock,
conservación de contexto por módulo, personalización profunda del escritorio.

## Deudas conocidas

- **`CLAUDE.md` decía «single App.tsx, no router»** — quedó viejo: hay
  `react-router-dom`, `app-shell.tsx`, `page-header.tsx`, `protected-route.tsx`,
  `admin-route.tsx` (`PermissionRoute`) y un árbol `pages/`. Se corrige al hacer
  el shell nuevo.
- **Categorías salió del riel** (feature sin definir) pero `/catalog/categories`
  sigue existiendo y el filtro por categoría sigue en Productos. Queda así hasta
  que se decida qué hacer con categorías.
- **Renombre a Abasto**: completo salvo recrear el contenedor local de Postgres
  y volver a loguearse en el frontend (cambió la clave de `localStorage`).
