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
  tocar. El ámbar es aviso, el rojo es problema.
- **Si se puede tocar, el cursor lo dice.** Todo botón, toggle y fila
  interactiva lleva la manito en hover (regla global en `styles.css`); lo
  deshabilitado, `not-allowed`.
- **Cada módulo tiene su color, y sólo ahí.** En el escritorio, cada tarjeta
  lleva un matiz propio y saturado (azul Ventas, teal Caja, naranja Stock…) en la
  pastilla del ícono, una franja al costado, el borde y un lavado del fondo. Es
  **identidad, para encontrar el módulo por color sin leer** — nunca estado. Se
  mantiene lejos del verde «tocable» y de los tonos del aviso. Adentro del módulo
  el color desaparece: manda el verde acción.
- **El estado lo dice el dato, no un marco.** «3 lotes», «4 vencidos», «+17,8 %
  vs ayer»: texto plano, sin teñir. Un puntito ámbar o rojo arriba a la derecha
  basta para marcar «acá hay algo». Los pendientes del día bajo el saludo son
  **chips**, uno por cosa, cada uno con el color del módulo al que enlaza —una
  versión mínima de su tarjeta, no un recuadro de alerta.
- **Redacción.** Todo texto de interfaz: primera letra en mayúscula, el resto en
  minúscula (salvo nombres propios y siglas). Una oración con sentido, no un
  pegote de palabras. Nunca arranca en minúscula ni con dos puntos. «Para mirar
  hoy: 2 productos bajo mínimo y 4 lotes por vencer.», no «para mirar hoy: …».
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

1. **Ícono** en un chip redondeado, relleno del **color del módulo** (arriba a la
   izquierda), con una **franja** del mismo color por el borde izquierdo.
2. **Nombre** del módulo.
3. **Dato clave** en Bricolage, grande — lo único que de verdad importa saber sin
   entrar (`$ 1,28 M`, `3 lotes`, `Abierta`, `43 pendientes`).
4. **Un renglón de contexto** debajo, con **espacio fijo en todas las tarjetas**:
   misma fuente, mismo tamaño, mismo lugar, pegado abajo. En minúscula con
   mayúscula inicial, sin teñir (`Vencen en ≤ 2 días · jamón cocido`).
5. **Puntito de aviso** (ámbar/rojo) arriba a la derecha, sólo si hay algo
   pendiente.

La identidad se refuerza con el **color del módulo** (punto 1, y también en el
borde y un lavado tenue del fondo) y con un **motivo de línea** propio —grande y
tenue, saliéndose por una esquina, teñido con ese mismo color—: Ventas unas
barras que suben, Caja una registradora, Vencimientos un calendario, Precios una
etiqueta. Es carácter que significa algo, no adorno. Al pasar el mouse el borde y
el motivo se intensifican.

### Se arma por permiso

**Es una sola pantalla, igual para todos.** Qué tarjetas trae sale del rango,
igual que antes el riel: sin `stock.ver` no hay tarjeta de Stock. No existe un
«escritorio de encargado» y otro de administrativo; existe **el escritorio**, y
cada uno ve su recorte. El encargado no ve otra pantalla: ve más tarjetas.

### Estado tranquilo

Si no hay nada pendiente, el escritorio no queda vacío: queda **tranquilo**. Cada
tarjeta muestra su versión en calma (`Al día`, `0 lotes`) y el renglón bajo el
saludo pasa a «Hoy no hay nada urgente.». Un escritorio en calma es la señal de
que está todo bien.

### Configurable

Un modo «Configurar»: ocultar tarjetas, mostrarlas de nuevo, reordenarlas
arrastrando, y la **densidad de las tablas** (cómoda / compacta) —acá, no en
Ajustes, para que se cambie sobre los módulos—. Se guarda por dispositivo en
`localStorage`. Con control — jerarquía clara, no un caos de widgets.
Personalización más profunda (fijar, destacar, tamaños, y que el orden viaje con
la cuenta) es más adelante.

### La caja no es una tarjeta

La caja es un **modo de trabajo**, no un módulo que se navega: pantalla
completa, el mundo del cajero. En el escritorio vive en un **botón propio**
—ancho, con el color de Caja lleno, con el estado del turno al costado—, arriba
de la grilla y claramente distinto de las tarjetas. Al abrir la app siempre se
cae en el escritorio (no hay preferencia de "entrar directo a"); para un cajero,
ese botón es lo primero que ve.

### El celular

Repositor, o cualquiera desde el teléfono → mismo escritorio, misma idea, **una
sola columna**. Es una variante de maquetado, no otro concepto.

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
- **Selector de tema** (claro / oscuro, `lib/theme.ts`).
- **Íconos Phosphor** en toda la app (Lucide ya no se usa).
- **Buscador de productos** (`product-search.util.ts` + `ProductSearchDialog`):
  tolera abreviaturas, acentos y errores de tipeo; el mismo `F3` en cualquier
  pantalla que necesite elegir un producto.
- **Turno de caja, arqueo y pago dividido**; **cuenta corriente**; **pesables**;
  **anular ítem con autorización de supervisor**; **rangos** (7 de fábrica,
  clonables; nav y rutas por permiso). Detalle en `docs/producto.md`.
- **El escritorio sin riel**: se sacó `app-shell.tsx`; `/` es la grilla de
  módulos, armada por permiso (`lib/modules.tsx`), con dato vivo por tarjeta
  (`GET /api/escritorio`), puntito de aviso y estado tranquilo. Modo Configurar
  (ocultar / reordenar arrastrando, se guarda en `localStorage`). Botón
  **Preguntar** y selector de tema en el encabezado.
- **Color por módulo** en las tarjetas (`HUES` en `lib/modules.tsx`): matiz
  saturado y propio en pastilla del ícono + franja + borde + lavado del fondo,
  para reconocer el módulo por color. Renglón de contexto con espacio fijo y
  tipografía pareja, en minúscula con mayúscula inicial.
- **Menú de la cuenta**: varias cuentas con sesión abierta en el mismo
  dispositivo, alternar sin re-login, "Agregar otra cuenta" y "Salir" (cierra
  sólo la activa) — `lib/auth-context.tsx`, `components/account-list.tsx`.
- **Ajustes** (`/ajustes`, desde el menú de la cuenta): perfil (nombre, email,
  color de avatar), contraseña, tema, sesiones del dispositivo; y sólo para el
  Dueño, datos de la empresa
  (nombre, logo, zona horaria), **sucursales** y los accesos a Usuarios y Rangos,
  que salen del escritorio. Backend: `PATCH /auth/me`, `PATCH /auth/tenant`,
  `/branches`.
- **Sucursal separada del depósito** + **selector de sucursal**: `Branch` es una
  entidad (`branches`); un depósito (`Warehouse`) pertenece a una sucursal. Toda
  sucursal nace con depósito + caja. El usuario se asigna a una **sucursal**
  (`User.branchId`, editable en Usuarios); el depósito operativo se deriva. La
  sucursal activa viaja en el header `X-Branch` (validado contra
  `sucursales.navegar`) y acota stock, ventas, caja, compras y vencimientos; el
  selector vive en el encabezado del escritorio (`components/branch-switcher.tsx`).
  Alta, edición, **desactivación y borrado** (si está vacía) de sucursales en
  Ajustes → La empresa.
- **Encabezado del escritorio, en tres franjas**: (1) barra con la identidad
  —logo de la empresa grande, nombre, y `abasto.ai` debajo, ambos legibles— a la
  izquierda y las herramientas —sucursal, tema, cuenta, todas a la misma
  altura— a la derecha; (2) fecha, saludo según la hora (Buen día / Buenas
  tardes / Buenas noches), y los pendientes del día como **chips con el color de
  su módulo** (o «Hoy no hay nada urgente.»); (3) el conteo de módulos +
  **Preguntar** + Configurar, pegado a la grilla. El menú de la cuenta muestra
  nombre, email, empresa, rango, sucursal y desde cuándo está la sesión (del
  `iat` del token), sin repetir nada.
- **Módulo unificado**: `PageHeader` con **← Escritorio** + `Esc` + chip +
  rastro; transición «se despliega» (View Transitions). Ingreso/Egreso/Historial
  son vistas de Stock (`components/stock-nav.tsx`), no tarjetas.
- **Gráfico de Ventas** dentro del módulo (Hoy/Semana/Mes/Año, hover,
  comparación con el período anterior; `GET /api/reportes/ventas`).
- **Exportar** unificado (Excel / CSV / copiar) en Productos, Stock, Ventas y
  Proveedores (`components/export-menu.tsx` + `export.util.ts`).
- **Ctrl+K**: buscador de módulos (la capa de IA, después).
- **Seed de demo** (`npm run db:seed-demo -- "<empresa>"`) para ver todo con
  datos.

## Lo que sigue, en orden

1. **El molde de Productos al resto de los listados** (buscador + filtros en
   panel detrás del botón + chips que se sacan de a uno + columnas justas).
   Hecho: Productos, Proveedores (buscador). Faltan: **Stock**, **Vencimientos**,
   **Ventas**, más ingresos/egresos/historial/reposición/turnos. (La cantidad
   que se mostraba como `72.000` ya está: todo pasa por `quantity()`.)
2. **Margen en el gráfico de Ventas**: hoy hay Facturación / Tickets / Ticket
   promedio. El margen necesita guardar el costo al momento de la venta
   (`SaleLine.unitCost`) — falta migración y que la caja lo grabe.
3. **Exportar en el resto de los listados** (hoy: Productos, Stock, Ventas,
   Proveedores). Falta clientes, precios, promociones, turnos, depósitos.
4. **La capa de IA en Ctrl+K**: hoy es sólo buscador de módulos; falta que
   responda preguntas del negocio cruzando módulos.
5. **Repasar los formularios** con la misma regla de aire y agrupación.
6. **Recargo/descuento por medio de pago** (falta modelo y que la caja lo
   muestre antes de confirmar).
7. **Transferencias de stock entre sucursales** (mover mercadería de un depósito
   a otro, con el ledger de las dos puntas).

Sucursales: **resuelto** — `Branch` es una entidad propia
(migración `..._sucursales`), un depósito (`Warehouse`) pertenece a una sucursal
y una sucursal nace con su depósito y su caja. Alta/edición en Ajustes (Dueño).
La **sucursal activa** viaja en el header `X-Branch` (localStorage, no en el
token), validada en cada pedido contra `sucursales.navegar`; el selector está en
el encabezado del escritorio. Stock, ventas, caja, turnos, compras, vencimientos,
reposición y el gráfico de Ventas quedan acotados a la sucursal activa; catálogo,
precios, proveedores, clientes y cuenta corriente son de toda la empresa.

Zona horaria: **resuelto** — las columnas `DateTime` pasaron a `timestamptz`
(migración `20260906073516_timestamptz`), Prisma y `@default(now())` ahora
guardan el instante que es y el listado de Ventas muestra la hora correcta. La
zona horaria del negocio se elige en Ajustes (`Tenant.timezone`).

Más adelante, con backend detrás (ver `docs/producto.md`): ARCA,
devoluciones/notas de crédito, transferencias de stock, conservación de
contexto por módulo, personalización profunda del escritorio.

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
