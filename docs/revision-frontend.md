# Revisión total del frontend — Abasto

> Análisis de diseño y código de `frontend/src` (67 archivos, ~11.200 líneas).
> Contrastado contra `docs/diseno.md` y `docs/producto.md`. Fecha: 2026-09-06.
> `tsc -b` pasa limpio; no hay `console.log`, `any` ni `@ts-ignore` sueltos.
>
> **Re-verificado 2026-09-12** contra el código actual (ver "Estado" y la
> columna Estado de la tabla en §6): las secciones 3-7 quedaron escritas al
> momento del análisis original y no se actualizaron cuando se fueron
> cerrando ítems — la lista de abajo es la fuente de verdad vigente.

---

## Estado (rama `fix/revision-deudas`)

**Hecho:**

- **Fechas**: `lib/format.ts` con `fecha` / `fechaHora` / `hora` / `inputDate`.
  Reemplazados ~30 usos de `.slice(0,10)` y `toLocaleString()` sueltos. Bugs #3 y #4.
- **401**: `api.ts` + `auth-context` cierran la cuenta activa al vencer el token
  (→ `/login`). Bug #2. La copia de tablas ahora manda `X-Branch`. Bug #1.
- **Foco de teclado**: regla global en `styles.css` para todo interactivo. Bug #8.
  `prefers-reduced-motion` corta animaciones. Bug #9.
- **Menús**: `ui/menu.tsx` sobre Radix DropdownMenu — reemplaza los 3 menús a
  mano (export, cuenta, sucursal), accesibles de verdad. §4.
- **Ctrl+K**: navegación con flechas + Enter + ítem activo. §4.
- **Escala tipográfica**: fuera `text-lg/xl/2xl/3xl`; `<h2>` de módulo a `text-h2`;
  `<Section>` compartido (Ajustes + Reportes + listo para Precios). §3.1
- **Guardas de ruta**: todas las rutas de módulo detrás de `<PermissionRoute>`. §5.4
- **Tema**: sigue al sistema hasta la primera elección. Bug #5.
- **Primitivos**: sin sombra en inputs; Dialog a `shadow-float`; `Kbd` unificado
  (4 tratamientos → 1); avatares circulares; píldoras documentadas. §3.4, §3.5, §3.6
- **Color**: `text-emerald-600` → token; verde sólido de "otra sucursal" → aviso
  ámbar. Bug #10, §3.3
- **Copy**: "tenant" fuera de la UI.
- **Deps pineadas** (`react`, `typescript`, `vite`, …). §5.3
- **Precios en pestañas** (§3.7, confirmado 2026-09-12) — `prices-page.tsx` ya
  usa el mecanismo `views` de `ModuleScreen` (Listas / Actualizar / Promociones
  / Etiquetas / Calendario / Historial); dejó de ser un solo scroll apilado.
- **4 menús a mano → `<Menu>` compartido** (confirmado 2026-09-12) — el
  switcher de sucursal se fusionó dentro de `user-menu.tsx`; `account-list.tsx`
  dejó de ser un dropdown (es una lista estática en Ajustes).
- **Molde de Productos en Ventas / Stock / Vencimientos** (confirmado
  2026-09-12) — las cuatro páginas ya comparten `<ListFilters>`.
- **`AVATAR_COLORS` en la receta OKLCH**, **2 usos sueltos de escala
  tipográfica** (`page-header.tsx`, `spinner.tsx`), **badges de estado en
  tablas documentado en `diseno.md`**, **bugs #6 y #7** (error+EmptyState
  superpuestos; `sales-history` con params inconsistentes) — cerrados 2026-09-12.
- **`setActiveBranch` sin `reload()`** (2026-09-12) — ahora remonta las rutas
  vía `useBranchVersion()` en vez de recargar el navegador. Ver §7.
- **`useResource`** (2026-09-12) — hook creado y adoptado en `stock-page.tsx`
  como primer caso real. Ver "Único punto con cierre parcial" en §7: el resto
  de las páginas queda para migrar de a una, a propósito.

**Pendiente** (razón en cada caso — ver "Deudas conocidas" de `diseno.md`):

- **ESLint** (§5.2) — `typescript-eslint` exige `typescript <6.1.0`; el
  proyecto está en `^7.0.2`. Bloqueado en la librería, no hay nada para hacer
  del lado de Abasto hasta que publiquen soporte.
- **`dangerouslySetInnerHTML` en `ModuleMotif`** (§5.7) — dato constante, sin
  riesgo real; convertir 14 motivos a JSX es trabajo sin beneficio para el usuario.
- **Migrar el resto de las ~17 páginas a `useResource`** — deliberadamente
  incremental, no un refactor de una sola pasada (ver razón en §7).

---

## 1. Veredicto

El **concepto de diseño es fuerte y está bien pensado**: `docs/diseno.md` es un
sistema real (escala tipográfica con pasos, color OKLCH con receta, una sola
apuesta de carácter, movimiento reservado a un momento). El escritorio y la caja
(`pos-page`) están a la altura de ese documento.

El **problema es la ejecución**: el código todavía no aplica su propio sistema.
Lo dice el propio `diseno.md` en "Deudas conocidas" — *"El código todavía no
sigue este documento"*. Esta revisión pone número y ubicación a esa deuda, más
una capa de problemas de arquitectura (sin librería de datos, componentes
duplicados, dependencias sin pinear) y ~10 bugs concretos.

Nada es estructural: el andamiaje (router, tokens, Radix, tabla, Card) está
bien. Es trabajo de terminación y consolidación, priorizable.

---

## 2. Lo que está sólido — no tocar

- **Tokens Yerba** (`styles.css`): claro/oscuro con las mismas variables, cambio
  en runtime, disciplina casi total — un solo color crudo de Tailwind en toda la
  app (ver bug #10).
- **El escritorio** (`escritorio-page.tsx`): la única pantalla que aplica la
  escala (`text-h1/h2/h3`), los radios y el foco visible en todos sus botones.
- **La caja** (`pos-page.tsx`): layout a pantalla completa, `type-display` para
  el total, atajos F-key, estados de "sin turno / sin sucursal / sin caja" bien
  resueltos.
- **`lib/format.ts`**: `money()` y `quantity()` centralizados y bien hechos.
  (Falta el equivalente para fechas — ver §5.)
- **Multi-cuenta** (`auth-context.tsx`): varias sesiones por dispositivo,
  alternar sin re-login, migración del formato viejo.
- **`diseno.md`** es honesto sobre su propia deuda. Eso vale.

---

## 3. Diseño — adherencia al sistema visual

### 3.1 La escala tipográfica no se aplica  · *alto impacto, bajo esfuerzo*

El sistema define 8 pasos (`--text-micro` … `--text-display`). El código usa
tamaños de Tailwind fuera de esa escala:

| Dónde | Ahora | Debería |
|---|---|---|
| `page-header.tsx:47` — título de módulo | `text-lg` (18px) | `text-h2` (24px) — el doc dice "título de módulo → h2" |
| `prices-page.tsx` ×8 (`:449, :505, :523, :682, :720, :774, :817, :872`) | `<h2 className="text-sm">` | encabezado de sección = `text-grande` o `text-h3` |
| `product-detail-page.tsx:147` — nombre del producto | `text-2xl` | `text-h2` |
| `product-detail-page.tsx:164,170,176,182` — datos clave | `text-xl` | `text-h3` / `text-h2` |
| `pos-page.tsx:435,522,542,692` | `text-lg` | `text-grande` / la que corresponda |
| `login-page.tsx:89` — marca | `text-3xl` | `text-display` |
| `login-page.tsx:92` — título | `text-lg` | `text-h3` |

`prices-page` es el caso más raro: un `<h2>` semántico renderizado a 14px, 8
veces en la misma pantalla. `ajustes-page.tsx:41` ya tiene el componente
`Section` bien hecho (h2 a `text-grande`, molde consistente) — hay que
**promoverlo a componente compartido** y usarlo en `prices` y donde haga falta.

### 3.2 Valores arbitrarios  · *el doc: "no se usan valores sueltos"*

- `escritorio-page.tsx`: `min-h-[168px]`, `size-[104px]`, `size-[7px]`, `size-[18px]`
- `command-palette.tsx`: `size-[17px]`, `top-[12vh]`, `max-h-[52vh]`
- `theme-toggle.tsx:22`: `size-[18px]` (usar `size-4` o `size-5`)
- `kbd.tsx:12`: `min-w-[1.5rem]`
- **`export-menu.tsx:117-119`**: inyecta un `<style>` por render con
  `border-radius:5px`, `padding:7px 9px`, `font-size:13px` — tres valores fuera
  de escala (existe el token `chico` = 13px) en CSS crudo. El peor caso.

### 3.3 Color — el verde sólido como estado

El doc es tajante: *"El verde es la única acción sólida. Si aparece verde lleno,
se toca."* Se rompe en:

- `page-header.tsx:53-56` — badge "otra sucursal": `border-primary bg-primary
  text-primary-foreground`. Verde lleno, no es un botón.
- `branch-switcher.tsx:56-57` — el trigger cuando estás fuera de tu sucursal:
  mismo verde lleno para marcar un **estado**.
- `sales-history-page.tsx:214` — **`text-emerald-600` crudo** (único color de
  Tailwind fuera del sistema en toda la app). Debería ser un token.
- `badge.tsx:14` — el comentario del variant `accent` dice "ámbar suave" pero
  `bg-accent` es verde (`primary-soft`). Comentario mentiroso.
- `prefs.ts:73` `AVATAR_COLORS` — 7 hex a mano (`#2563eb`, `#7c3aed`, `#db2777`…)
  fuera de la receta OKLCH del sistema. Es dato personal, no sistema, pero
  desentona; se podría derivar de la misma rueda que `hueFor`.

### 3.4 Radio inconsistente

El sistema tiene 3 pasos (`lg` 12 / `md` 9 / `sm` 6). Conviven:

- `rounded-full` en `badge.tsx`, los chips de filtro de `products-page.tsx:310`,
  el contador de filtros, los toggles de métrica de `ventas-chart.tsx:146`, los
  toggles de `stock-nav`. Los chips "para mirar hoy" del escritorio, en cambio,
  son `rounded-md`. Hay que elegir: o los pills son `rounded-full` y se
  documenta como 4º paso, o van a `md`.
- `kbd.tsx:11` usa `rounded` (4px), no `rounded-sm` (6px). El doc dice kbd = sm.

### 3.5 Elevación — "todo lo demás está al ras"

- `input.tsx`, `select.tsx`, `checkbox.tsx` llevan `shadow-xs`. El doc: solo
  `card` y `float` significan algo, el resto al ras.
- `dialog.tsx:16` usa `shadow-lg` de Tailwind en vez del token `shadow-float`.

### 3.6 `kbd` — tres tratamientos distintos

- `components/ui/kbd.tsx`: `font-sans`, `bg-secondary`, `rounded`
- `escritorio-page.tsx` (inline): `font-mono`, `bg-primary/10`
- `page-header.tsx:36` (inline): `font-mono`, `border`
- `pos-page.tsx:607` (inline): `font-mono`, `text-xs`, `border`

Cuatro. El componente `Kbd` casi no se usa. Unificar y usarlo siempre.

### 3.7 Densidad de pantalla — "poca información a la vez"

- **`prices-page.tsx`** apila 8 secciones (`Listas`, `Planillas`, `Actualización
  masiva`, `Cambios programados`, `Criterios`, `Redondeo`, `Promociones`,
  `Auditoría`) en un scroll. Es la pantalla que más estresa de la app. Va en
  pestañas o sub-navegación (como `stock-nav`).
- El **"molde de Productos"** (buscar siempre a mano + resto de filtros en panel
  + lo activo vuelve como chips) solo está en `products-page`. `sales-history`,
  `stock-history`, `expirations` muestran 4-7 selectores siempre abiertos. Ya
  está anotado como pendiente #1 en `diseno.md`.

### 3.8 Estado por Badge de color vs "punto + texto monocromo"

El escritorio predica *"la única señal de alerta es el puntito; una cifra teñida
no compite con él"*. Pero las tablas (`products`, `sales-history`,
`expirations`) marcan estado con `<Badge variant="success|warning|destructive">`
de fondo teñido. Las dos filosofías conviven sin que nadie lo haya decidido.
Recomendación: **es razonable permitir badges de estado en columnas de tabla**
(es un patrón legible), pero hay que escribirlo en `diseno.md` para que deje de
ser deriva.

### 3.9 Alertas

`alert.tsx` — bloque con fondo teñido (`bg-destructive/10 text-destructive`,
etc.). El doc dice "nunca como fondo de un bloque" para ámbar/rojo; para un
`role="alert"` de formulario es defendible, pero el `text-success` sobre
`bg-success/10` queda al borde de AA en claro. Revisar contraste o usar
`text-foreground` + ícono de color.

### 3.10 Login — ¿segunda apuesta de carácter?

`auth-background.tsx` son 375 líneas de física en `<canvas>` (íconos que flotan
y chocan) + tarjeta "glass" (`bg-card/75 backdrop-blur-xl ring-white/10` — con
`ring-white/10` hardcodeado). El doc dice *"Una sola apuesta. El carácter se
gasta en un lugar"* y ese lugar es el despliegue tarjeta→módulo. El login es una
segunda apuesta grande. Puede quedarse (un login con personalidad no molesta),
pero conviene decidirlo a conciencia, no por inercia.

---

## 4. Diseño — componentes y consistencia

- **Dos sistemas de botón.** `components/ui/button.tsx` (cva, con foco visible) y
  ~30 `<button className="…">` crudos por toda la app. Los crudos casi nunca
  tienen anillo de foco (ver bug #8).
- **4 menús desplegables hechos a mano**, ninguno accesible, cada uno distinto:
  `export-menu.tsx`, `user-menu.tsx`, `branch-switcher.tsx`, `account-list.tsx`.
  Ninguno cierra con `Escape`, atrapa el foco ni navega con flechas. Ya usan
  Radix (Dialog, Checkbox, Label) — falta `@radix-ui/react-dropdown-menu` y un
  `<Menu>` compartido.
- **`command-palette.tsx`** no tiene navegación con ↑/↓ ni ítem activo: Enter
  elige `results[0]` y nada más. Un command palette necesita teclado.
- **El chip del ícono** se trata distinto en cada lado: el escritorio usa
  `hueFor(m.key)` (color del módulo, como manda el doc); `page-header.tsx:41` y
  `command-palette.tsx:90` usan `bg-accent` (verde) para todos.
- **Patrón clave-valor duplicado 3 veces**: `Section` (ajustes), grid de
  `<span>` (detalle de venta en `sales-history`), `<dl>` (`stock-history`,
  `user-menu`). Un `<DescriptionList>` compartido.
- **`iniciales()`** está copiado idéntico en `user-menu.tsx:10` y
  `ajustes-page.tsx:37`. **`fechaHora()`** idéntico en `sales-history-page.tsx:25`
  y `shifts-history-page.tsx:21`.

---

## 5. Código — arquitectura

### 5.1 No hay capa de datos  · *el mayor costo estructural*

17 páginas repiten a mano: `useState` de `loading` / `error` / `items`, effect de
debounce, `load()` inline, `eslint-disable react-hooks/exhaustive-deps`,
re-`load()` manual después de cada mutación. Sin dedup, sin caché, sin retry, sin
stale-while-revalidate, sin refetch al volver el foco.

→ Un hook `useResource(path, deps)` propio, o **TanStack Query**. Además sería el
lugar natural para el interceptor de 401 (bug #2) y para el `X-Branch` (bug #1).

### 5.2 Sin ESLint ni tests

Hay 17 comentarios `eslint-disable` para un linter **que no existe** (confirmado
en `CLAUDE.md`). Configurar ESLint + `eslint-plugin-react-hooks` marcaría esos 17
al toque. Sin suite de tests tampoco.

### 5.3 `package.json` — dependencias sin pinear

`"react": "latest"`, `"typescript": "latest"`, `"vite": "latest"`,
`"@types/react": "latest"`, `"@vitejs/plugin-react": "latest"`. El `package-lock`
las congela hoy, pero un `npm update` o un clon nuevo puede traer una major
distinta y romper sin aviso. Pinear a rango (`^19`, `^7`, …).

### 5.4 Guardas de ruta inconsistentes

En `App.tsx` solo `precios`, `usuarios`, `rangos` y `turnos` están envueltos en
`<PermissionRoute>`. `/stock`, `/stock/in|out|history|expirations|restock`,
`/catalog/*`, `/ventas/historial` cuelgan solo de `ProtectedRoute` (sesión). Un
usuario sin `stock.ver` que tipea `/stock` ve la cáscara + un error de API en vez
de un "no tenés acceso" o un redirect. El backend igual lo frena (no hay fuga de
datos), pero la UX es inconsistente.

### 5.5 Preferencias globales como estado local

`theme.ts` y `prefs.ts` (`useDensity`, `useTiles`): cada uno es un `useState`
local + `useEffect` que escribe `localStorage` y un atributo en `<html>`.
Problemas:

- El `useEffect` **persiste en el primer render**, no solo al cambiar → bug #5.
- No hay listener de `matchMedia` → si el SO cambia de tema con la app abierta,
  no pasa nada. `styles.css` está escrito para soportar un estado "seguir al
  sistema" (`:root:not([data-theme='light'])`) que `theme.ts` nunca produce.
- Sin sincronización entre pestañas (`storage` event).
- Si dos componentes llaman `useDensity()`, tienen estado separado hasta
  remontar (hoy solo lo usa `PageHeader`, pero es frágil).

→ `useSyncExternalStore` o un contexto mínimo.

### 5.6 `setActiveBranch` → `window.location.reload()`

`lib/branch.ts:39`. Cambiar de sucursal hace un reload completo — pierde la
transición, re-baja todo, parpadea. Contradice "No perder el lugar" del doc. Con
una capa de datos sería invalidar queries.

### 5.7 Menor

- `modules.tsx:179` — `ModuleMotif` usa `dangerouslySetInnerHTML` para los SVG.
  Los motivos son constantes del código (no hay riesgo real), pero se puede pasar
  a JSX y sacar el `dangerouslySetInnerHTML`.
- Vencimientos y Reposición son **tarjeta del escritorio y pestaña dentro de
  Stock** a la vez. `moduleForPath('/stock/in')` no matchea nada → el
  `PageHeader` de Ingreso/Egreso/Historial va sin chip ni rastro.

---

## 6. Bugs concretos

> **Columna Estado agregada 2026-09-12** tras re-chequear cada uno contra el código actual.

| # | Severidad | Bug | Ubicación | Estado |
|---|---|---|---|---|
| 1 | Alta | "Copiar tabla" hace su propio `fetch` sin `branchHeaders()` → copia datos de la sucursal equivocada si hay una sucursal no-propia activa. `downloadFile()` sí manda el header; `copy()` no. | `export-menu.tsx:66` | **RESUELTO** — `copy()` ahora usa `exportText()` de `lib/api`, que incluye `branchHeaders()` |
| 2 | Alta | Sesión vencida sin manejo. El JWT expira a las 8 h (backend); `refresh()` traga el 401 y "mantiene lo que había"; `api()` no tiene interceptor. Resultado: sesión muerta, cada pantalla con su error, sin volver a `/login`. | `auth-context.tsx:85`, `api.ts:383` | **RESUELTO** — `onUnauthorized` en `api.ts` |
| 3 | Media | Fecha con `new Date(x).toLocaleString()` **sin `'es-AR'`** → formato de EE.UU. en navegador en inglés. | `stock-history-page.tsx:229, 272` | **RESUELTO** — usa `fecha()`/`fechaHora()` de `lib/format.ts` |
| 4 | Media | Fechas ISO crudas visibles (`2026-09-15` en vez de `15/09/2026`) por usar `.slice(0, 10)`. ~15 lugares. | `stock-page.tsx:61`, `expirations-page.tsx:118`, `prices-page.tsx:615,700,853,924`, `product-detail-page.tsx:210,288,370`, `stock-in-page.tsx:580`, `stock-out-page.tsx:105`, … | **RESUELTO** (salvo 2 usos en `prices-page.tsx` para poblar `value` de `<input type="date">`, que no son texto visible — no es el mismo bug) |
| 5 | Media | `theme.ts` persiste el tema del sistema en el **primer render** (el `useEffect` corre siempre). Un visitante con SO oscuro queda "oscuro" fijo aunque después cambie el SO. | `theme.ts:36-43` | **RESUELTO** — solo aplica una elección guardada; hay listener de `matchMedia` |
| 6 | Baja | `error` y `EmptyState` se renderizan juntos: al fallar la carga se ve el Alert y abajo "No hay stock registrado". | `stock-page.tsx`, `expirations-page.tsx`, varias | **ABIERTO** |
| 7 | Baja | `sales-history` pasa `params={filtros}` (objeto) mientras `products` pasa `params={filterParams()}` (URLSearchParams). `ExportMenu` tolera ambos, pero el contrato quedó ambiguo. | `sales-history-page.tsx:76` | **ABIERTO** |
| 8 | Media (a11y) | Foco de teclado invisible en ~30 `<button>` crudos (todo menos el escritorio y lo que usa `<Button>`): `page-header` (volver, densidad), `theme-toggle`, los 4 dropdowns **y sus ítems**, `command-palette` (resultados), `stock-nav`, toggles de `ventas-chart`. Incumple el "piso de calidad" del propio doc. | ver §4 | **RESUELTO** — regla global `:focus-visible` en `styles.css` |
| 9 | Baja (a11y) | `Spinner` (`animate-spin`) y los skeletons (`animate-pulse`) no respetan `prefers-reduced-motion`. | `spinner.tsx`, `ventas-chart.tsx:159` | **RESUELTO** — regla global `@media (prefers-reduced-motion: reduce)` en `styles.css` |
| 10 | Cosmético | `text-emerald-600` crudo (único color Tailwind fuera del sistema). | `sales-history-page.tsx:214` | **RESUELTO** — sin coincidencias en el código actual |

**Quedan 2 bugs reales abiertos: #6 y #7.** El resto (#1-#5, #8-#10) está resuelto — la tabla había quedado congelada en el estado pre-fix aunque la sección "Estado" al principio del documento ya los daba por cerrados.

---

## 7. Plan de acción priorizado

> **Re-priorizado 2026-09-12, y vuelto a cerrar el mismo día**: se hizo una
> segunda pasada que atacó todo lo que quedaba abierto de P1 y P2. Lo que
> sigue es el resultado final — no quedan puntos "pendiente" de esta lista.

### Hecho (verificado y cerrado 2026-09-12)

- ~~Interceptor de 401~~ · ~~`X-Branch` en `copy()`~~ · ~~`fecha()`/`fechaHora()`~~ ·
  ~~anillo de foco global~~ · ~~pinar dependencias~~ · ~~`text-emerald-600` → token~~ ·
  ~~`prefers-reduced-motion`~~ (P0 completo)
- ~~`<Menu>` con Radix dropdown~~ · ~~`prices-page` en pestañas~~ · ~~Tema "seguir al
  sistema" (`matchMedia`)~~ · ~~`kbd` unificado~~ · ~~`command-palette` con
  navegación por teclado~~ · ~~sombra fuera de inputs/select/checkbox, `dialog` a
  `shadow-float`~~ · ~~valores arbitrarios del `<style>` de `export-menu`~~
  (ya estaban resueltos, confirmado en esta pasada)
- ~~**Molde de Productos** (buscador + panel de filtros + chips) a Ventas /
  Stock / Vencimientos~~ — **ya estaba hecho**: las cuatro páginas
  (`sales-history`, `stock-page`, `stock-history`, `expirations`) usan
  `<ListFilters>`, el mismo componente que Productos. El pendiente #1 original
  del doc estaba desactualizado.
- ~~**Guardas de ruta consistentes**~~ — **ya estaba hecho**: `App.tsx` envuelve
  todas las rutas de módulo en `<PermissionRoute>`; sólo `/` y `/ajustes`
  quedan sin permiso puntual (correcto: son siempre accesibles).
- ~~**Escala tipográfica a fondo**~~ — quedaban 2 usos reales de `text-lg`/`text-3xl`
  fuera de escala: el título de módulo (`page-header.tsx` → `text-h2`) y la
  marca del splash de arranque (`spinner.tsx` → `text-h1`, igual que el login).
- ~~**`AVATAR_COLORS`**~~ — pasaron de 7 hex a mano a la misma receta OKLCH que
  `hueFor` (`lib/modules.tsx`), con el primero fijo en `var(--color-primary)`.
- ~~**Badges de estado en tablas**~~ — decisión tomada y documentada en
  `diseno.md`: el "sólo puntito" rige la tarjeta del escritorio, no las tablas
  de un módulo, donde un `Badge` de columna queda permitido.
- ~~**Bug #6** (error + EmptyState superpuestos)~~ — `stock-page.tsx` y
  `expirations-page.tsx` ahora ocultan la tabla/EmptyState mientras hay error.
- ~~**Bug #7** (`sales-history` con objeto vs `URLSearchParams`)~~ — ahora usa
  el mismo `filterParams()` que el resto, para `load()` y para `ExportMenu`.
- ~~**`setActiveBranch` sin `reload()`**~~ — cambiar de sucursal ya no hace
  `window.location.reload()`. Ahora dispara un evento (`lib/branch.ts`,
  `useBranchVersion()`) que `App.tsx` usa como `key` de `<Routes>`: la app
  remonta y cada pantalla vuelve a pedir sus datos, sin el flash de un reload
  de navegador. Probado con dos sucursales reales (una con stock, otra sin) —
  el cambio se refleja al toque y `window` no pierde estado entre medio.

### Único punto con cierre parcial, a propósito

**Capa de datos (`useResource`)** — se creó [`lib/use-resource.ts`](../frontend/src/lib/use-resource.ts),
un hook chico que reemplaza el trío `loading`/`error`/`items` + `useEffect` a
mano, y se migró `stock-page.tsx` como primer caso real (probado en el
navegador, incluido el cambio de sucursal de arriba). **No se migraron las
otras ~17 páginas que repiten el mismo patrón** — es la misma razón que ya
daba este documento originalmente: es un refactor grande, sin suite de tests
que lo respalde, y migrar 17 archivos a ciegas en una sola pasada es más
riesgo del que vale la pena correr de una. Queda como trabajo incremental:
migrar una página a `useResource` cada vez que se la toque por otro motivo,
usando `stock-page.tsx` como referencia del patrón.

### ESLint — sigue bloqueado, no por elección

`typescript-eslint` exige `typescript >=4.8.4 <6.1.0`; el proyecto está en
`typescript ^7.0.2`. Instalarlo hoy rompería el rango de peer dependencies.
Sigue sin haber nada que hacer acá hasta que `typescript-eslint` publique
soporte para TS 7.
