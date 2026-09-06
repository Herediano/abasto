# Diseño — Abasto

> La estrella polar del diseño. Antes de tocar una pantalla, un componente o un
> color, se chequea contra este documento. Complementa `docs/producto.md` (qué es
> el sistema); esto es **cómo se ve, cómo se navega y por qué**.
>
> Es un documento vivo —«Hecho» y «Lo que sigue» se actualizan a medida que se
> avanza— pero **las bases** (el sistema visual, las reglas, el escritorio, el
> módulo, la navegación) no se tocan sin una razón fuerte y escrita.

## Cómo leer este documento

El sistema visual de acá abajo está armado sobre reglas de oficio, no sobre
gusto: escala tipográfica con pasos definidos, color en OKLCH con luz y croma
fijos, una única apuesta de carácter y el resto callado, movimiento reservado a
un solo momento. Cuando una pantalla nueva tiene una duda de forma, color o
tamaño, la respuesta sale de acá y no de una decisión suelta.

---

## El sistema visual

### Marca

| | |
|---|---|
| Nombre | **Abasto**. En pantalla el logotipo es `abasto.ai`, con el `.ai` en verde primario. |
| Tono | Una herramienta de trabajo tranquila. No estrésa, no vende, no adorna. Confianza antes que personalidad. |
| Se gana el `.ai` | La IA **sugiere, nunca decide**. Cada función con IA lleva su etiqueta `IA` y se puede descartar. |

### Tipografía — una sola familia

**Archivo** (Omnibus-Type, Buenos Aires) para todo: marca, títulos, cuerpo,
interfaz y los números de los datos. Es una grotesque con carácter de ingeniería
—terminaciones diagonales, aperturas amplias— que se calla a tamaño de texto y
se planta en los tamaños grandes. La jerarquía sale del **peso y el ancho** de la
misma familia, no de meter una segunda cara.

- Elegir una fundición de Buenos Aires para un producto hecho en Argentina para
  mayoristas argentinos es una decisión anclada en el tema, no un default.
- Es variable: un archivo, ejes `wght` (400–700) y `wdth`. La marca y el número
  hero usan el ancho **Expanded** y peso alto; todo lo demás, ancho normal.
- Trae **figuras tabulares** y **cero barrado**. Toda columna de precio o
  cantidad alinea por dígito en la misma cara que el resto —sin bloque monoespacio
  que corte la tabla.

**Monoespacio: solo para identificadores de máquina.** SKU, código de barras,
lote, CUIT, token. Nunca para etiquetas chiquitas ni para columnas de datos
(esas van con `tabular-nums` de Archivo). La cara mono se decide en la
implementación; su uso es la excepción, no la regla.

#### Escala

Base **14 px** (`0.875rem`). Pasos fijos —no se inventan tamaños entre medio:

| Paso | rem / px | Uso |
|---|---|---|
| micro | 0.6875 / 11 | marcas de tiempo, `kbd`, notas al pie |
| chico | 0.8125 / 13 | texto secundario, celdas de tabla densas |
| base | 0.875 / 14 | cuerpo, inputs, la mayoría de la interfaz |
| grande | 1.0 / 16 | fila enfatizada, encabezado de grupo |
| h3 | 1.125 / 18 | dato clave de la tarjeta, subtítulo |
| h2 | 1.5 / 24 | título de módulo |
| h1 | 1.75 / 28 | saludo del escritorio (el héroe de esa pantalla) |
| display | 2.5–3.0 / 40–48 | **el único** número grande, adentro de Ventas |

- **Interlínea**: 1.5 en cuerpo, 1.1–1.2 en títulos.
- **Medida**: menos de 80 caracteres por línea; ~66 es el ideal para texto
  corrido.
- **Pesos**: 400 cuerpo · 500 etiquetas y navegación · 600 títulos y datos clave
  · 700 reservado a la marca y al número hero.
- El `letter-spacing` negativo (`-0.02em`) solo en h1/h2/h3. El cuerpo, nunca.

### Color

La paleta **Yerba**: verde pino sobre neutros arena cálidos. Claro y oscuro
siempre, con los mismos tokens (`--ab-*` en `frontend/src/styles.css`,
referenciados por `@theme inline`), así el tema cambia en tiempo de ejecución.

#### Base y semántica

| Rol | Qué es |
|---|---|
| Fondo / superficie / superficie levantada | Neutros arena. Tres niveles, nada más. |
| Tinta / tinta suave / tinta tenue | Texto. Tres niveles. Nunca un negro teñido a mano. |
| Línea / línea suave | Bordes. Dos pesos. |
| **Verde primario** | **La única acción sólida.** Si aparece verde lleno, se toca. |
| Ámbar | **Aviso.** Sin precio, por vencer, bajo mínimo. |
| Rojo ladrillo | **Problema.** Vencido, faltante, diferencia de arqueo. |

Regla: **el color de acción es uno solo**. El ámbar y el rojo no son decorativos
—aparecen cuando hay algo que avisar o algo que está mal, y en dosis mínimas (un
puntito, una cifra teñida), nunca como fondo de un bloque.

#### Color por módulo — identidad, no estado

En el escritorio, cada tarjeta lleva un **matiz propio** en la pastilla del
ícono, una franja al costado, el borde y un lavado tenue del fondo. Sirve para
**encontrar el módulo por color sin leer**. Adentro del módulo el matiz
desaparece: manda el verde acción.

Los matices se generan con una receta, no a ojo:

- **OKLCH con luz y croma fijos**, se rota **solo el matiz** (`H`). Así los ~10
  colores tienen el mismo peso visual y ninguno grita más que otro.
- El arco permitido esquiva el **verde** (acción) y el **naranja/ámbar** (aviso):
  se usan matices de ~200° a ~360° y de 0° a ~30° (azules, violetas, magentas,
  rojos fríos, rosas). Nada entre 40° y 150°.
- **Distancia mínima** entre dos módulos cualesquiera ≥ ~22° de matiz, para que
  se distingan de un vistazo.
- Máximo ~10 matices. Los módulos que viven adentro de Ajustes (Usuarios,
  Rangos) comparten un **pizarra de croma bajo** —son sistema, no operación.
- En oscuro se ajusta la luz del matiz, no el croma, contra la superficie
  correspondiente.

Los valores concretos viven en `frontend/src/lib/modules.tsx`; acá va la receta.

### Forma

- **Radio**: exactamente tres pasos —`lg` 12 px (tarjetas, paneles), `md` 9 px
  (botones, chips, inputs), `sm` 6 px (`kbd`, marcas chicas). No se usan valores
  sueltos (`rounded-[10px]` y compañía): si algo no entra en los tres pasos, el
  problema es el elemento, no el radio.
- **Elevación**: dos sombras y significan algo. `card` (1 px, apenas despega) para
  una superficie de contenido; `float` (1 px + halo suave) para algo que se
  levantó por encima —un menú, un diálogo, el botón de caja. Todo lo demás está
  al ras. La elevación no decora: marca jerarquía.
- **Borde**: un peso para separar superficies (`line`), uno más tenue para
  divisiones internas (`line-soft`). El color del borde puede teñirse con el
  matiz del módulo en el escritorio —ahí es identidad.

### Espacio — el aire es una regla, con número

Base de **4 px**. Pasos: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64.

- Entre bloques distintos de una pantalla: **24**.
- Entre elementos de un mismo grupo: **12**.
- Apretado (ícono y su texto, chip y su contenido): **8**.
- **Poca información a la vez.** Un entorno de trabajo no tiene que estresar. Si
  una pantalla se siente llena, se saca, no se achica el espacio.

### Movimiento — un solo momento

- **El momento**: la tarjeta del escritorio **se despliega** en la cabecera del
  módulo (View Transitions API; comparten `view-transition-name`; ~220 ms;
  `cubic-bezier(0.2, 0, 0, 1)`; sin rebote). Volver es el reverso exacto. Esa
  transición es *la* animación del sistema —todo lo demás es secundario.
- **Respuesta a una acción**: abrir, expandir, confirmar pueden animar para
  mostrar **qué cambió** (≤ 150 ms).
- **Prohibido**: animaciones de entrada al cargar; que cada tarjeta se levante
  (`translateY`) en hover; fade-and-slide-up por sección; la flechita que se
  corre. El hover de una tarjeta solo **intensifica el borde y el motivo** —sin
  transform.
- `prefers-reduced-motion: reduce` corta toda animación; la transición degrada a
  corte instantáneo.

### Íconos

**Phosphor**. Contorno para lo inactivo, **relleno para lo activo**. Un ícono
está para reconocer, no para decorar: si no ayuda a identificar algo, no va.

### Redacción

- **Capitalización**: primera letra en mayúscula, el resto en minúscula (salvo
  nombres propios y siglas). Una oración con sentido, no un pegote de palabras.
  Nunca arranca en minúscula ni con dos puntos. «Para mirar hoy: 2 productos bajo
  mínimo y 4 lotes por vencer.», no «para mirar hoy: …».
- **Sin versalitas.** Ninguna etiqueta va en `UPPERCASE` con `letter-spacing`
  abierto —ni «PARA MIRAR HOY», ni «OCULTOS», ni la fecha. Si hace falta una
  etiqueta, es una oración corta en capitalización normal; muchas veces no hace
  falta ninguna y el contenido habla solo.
- **Desde la cabeza del usuario.** Se nombra lo que la persona entiende, no cómo
  está hecho el sistema. Un usuario administra notificaciones, no configura
  webhooks.
- **Voz activa.** El botón dice qué pasa al tocarlo: «Guardar cambios», no
  «Enviar». La acción conserva el nombre en todo el flujo: el botón «Publicar»
  produce el aviso «Publicado».
- **El vacío y el error dan dirección, no ánimo.** El error explica qué pasó y
  cómo salir, en la voz de la interfaz —no pide disculpas ni es vago. Una
  pantalla vacía es una invitación a hacer algo.

---

## Reglas de diseño

- **Una sola apuesta.** El carácter se gasta en un lugar. En el escritorio, ese
  lugar es doble y está elegido: **el despliegue tarjeta → módulo** y **el color
  + motivo por módulo**. Todo lo que rodea eso queda callado —superficies
  neutras, un peso de borde, tipografía tranquila. Antes de sumar un detalle, se
  saca otro.
- **El verde es la única acción sólida.** Si aparece verde lleno, se puede tocar.
  El ámbar es aviso, el rojo es problema.
- **El estado lo dice el dato, no un marco.** «3 lotes», «4 vencidos», «+17,8 %
  vs ayer»: texto plano, sin teñir. Un puntito ámbar o rojo arriba a la derecha
  basta para marcar «acá hay algo». Los pendientes del día bajo el saludo son
  **chips**, uno por cosa, cada uno con el color del módulo al que enlaza —una
  versión mínima de su tarjeta, no un recuadro de alerta.
- **Si se puede tocar, el cursor lo dice.** Todo botón, toggle y fila
  interactiva lleva la manito en hover (regla global en `styles.css`); lo
  deshabilitado, `not-allowed`.
- **La estructura es información.** Bordes, franjas, numeración, divisiones:
  codifican algo del contenido, no lo decoran. Marcadores numerados (01 / 02 /
  03) solo si el contenido de verdad es una secuencia.
- **Bento para mirar, formularios tranquilos para hacer.** La elevación y los
  grupos siempre significan algo; no se decora con tarjetas.
- **Consistencia.** Si editar un registro se hace de una manera en Clientes, la
  misma manera vale en Proveedores y Productos. Quien aprende una pantalla
  entiende las demás.
- **Progresividad.** El caso simple es el default, no una configuración que hay
  que desarmar. Una sola sucursal, un solo usuario, sin cuenta corriente, sin
  lotes: el sistema no pide nada de eso para funcionar.

### Piso de calidad — sin anunciarlo

- Responsive hasta una columna en el teléfono.
- Foco de teclado visible en **todo** elemento interactivo (anillo de 2 px del
  primario, `offset` 2 px).
- `prefers-reduced-motion` respetado.
- Contraste AA: 4.5:1 en texto, 3:1 en elementos de interfaz.
- Paleta armónica en claro y en oscuro —se revisa en los dos.

### Tells a evitar

Marcas de página generada. No van, aunque «queden bien»:

- Etiqueta en VERSALITA rastreada arriba de cada título.
- Una palabra del título en itálica, bold o color para «destacarla».
- `→` pegado al texto de un botón o de un link.
- Em dash espaciado como etiqueta: «PALABRA — fragmento».
- Cadena de metadatos con puntos medios decorativos. Un `·` que separa dos datos
  reales está bien; tres o más es chrome.
- Negro teñido (`#0B0B0B`, `#111`) en lugar de la tinta del token.
- Monoespacio como cara de etiquetas chiquitas.
- Todo picado en tarjetas del mismo radio con la misma sombra gris.
- Gradientes como decoración.
- Fondo crema + serif de alto contraste + acento terracota. No es Yerba.

---

## El escritorio

La pantalla de inicio —y **la única navegación**— es el escritorio: una **caja
con todos los módulos**, una tarjeta por módulo. Se entra al escritorio, se toca
un módulo, se trabaja adentro, se vuelve al escritorio para ir a otro. No hay
riel que lo duplique.

Cumple dos funciones a la vez: **navegación** y **centro de estado del negocio**.
Entrás a la mañana, ves de un vistazo dónde hay algo para atender, y entrás ahí.

### El encabezado — liviano, el saludo es el héroe

Tres franjas, de menos a más peso hacia abajo:

1. **Identidad, compacta.** El logo de la empresa a tamaño chico, el nombre, y
   `abasto.ai` —los dos legibles, ninguno como membrete. A la derecha, las
   herramientas a la misma altura: sucursal, tema, cuenta.
2. **El héroe de la pantalla.** La fecha en capitalización normal, el saludo
   según la hora (Buen día / Buenas tardes / Buenas noches) en h1, y los
   pendientes del día como **chips con el color de su módulo** (o «Hoy no hay
   nada urgente.»).
3. **Pegado a la grilla.** El conteo de módulos, **Preguntar** (Ctrl + K) y
   Configurar.

### La tarjeta — un solo molde para las ~14

Todas las tarjetas son **iguales**: mismo tamaño, mismo borde, misma estructura.
Ninguna más grande que otra (Ventas incluida —el gráfico grande vive **adentro**
del módulo).

Anatomía, siempre en el mismo lugar:

1. **Ícono** en un chip redondeado (radio `md`), relleno del **color del
   módulo**, arriba a la izquierda, con una **franja** del mismo color por el
   borde izquierdo.
2. **Nombre** del módulo.
3. **Dato clave** en display chico, lo único que de verdad importa saber sin
   entrar (`$ 1,28 M`, `3 lotes`, `Abierta`, `43 pendientes`).
4. **Un renglón de contexto** debajo, con espacio fijo en todas las tarjetas:
   misma cara, mismo tamaño, mismo lugar, pegado abajo. Capitalización normal,
   sin teñir (`Vencen en ≤ 2 días · jamón cocido`).
5. **Puntito de aviso** (ámbar/rojo) arriba a la derecha, solo si hay algo
   pendiente.

La identidad se refuerza con el **color del módulo** (punto 1, más el borde y el
lavado del fondo) y con un **motivo de línea** propio —grande y tenue, saliéndose
por una esquina, teñido con ese color: Ventas unas barras que suben, Caja una
registradora, Vencimientos un calendario, Precios una etiqueta. Es carácter que
significa algo. Al pasar el mouse, **el borde y el motivo se intensifican y nada
más** —la tarjeta no se levanta.

### Se arma por permiso

**Es una sola pantalla, igual para todos.** Qué tarjetas trae sale del rango,
igual que antes el riel: sin `stock.ver` no hay tarjeta de Stock. No hay un
«escritorio de encargado» y otro de administrativo; hay **el escritorio**, y cada
uno ve su recorte.

### Estado tranquilo

Si no hay nada pendiente, el escritorio no queda vacío: queda **tranquilo**. Cada
tarjeta muestra su versión en calma (`Al día`, `0 lotes`) y el renglón bajo el
saludo pasa a «Hoy no hay nada urgente.». Un escritorio en calma es la señal de
que está todo bien.

### Configurable

Un modo «Configurar»: ocultar tarjetas, mostrarlas de nuevo y reordenarlas
arrastrando. La **densidad de las tablas** (cómoda / compacta) vive en la
cabecera de cada módulo —un botón junto a las acciones—, no acá ni en Ajustes,
para que se vea el cambio sobre una tabla real. Todo se guarda por dispositivo en
`localStorage`. Con control — jerarquía clara, no un caos de widgets.
Personalización más profunda (fijar, destacar, tamaños, y que el orden viaje con
la cuenta) es más adelante.

### La caja no es una tarjeta

La caja es un **modo de trabajo**, no un módulo que se navega: pantalla
completa, el mundo del cajero. En el escritorio vive en un **botón propio** en la
barra de arriba, junto al selector de sucursal y la cuenta, claramente distinto
de las tarjetas. El botón cambia de color según el turno —verde suave si la caja
está abierta, rojo suave si está cerrada—, en tonos apagados para verlo de un
vistazo sin que grite. Sin flecha pegada al texto: la etiqueta y el estado del
turno alcanzan. Al abrir la app siempre se cae en el escritorio (no hay
preferencia de "entrar directo a"); para un cajero, ese botón es lo primero que ve.

### El celular

Repositor, o cualquiera desde el teléfono → mismo escritorio, misma idea, **una
sola columna**. Es una variante de maquetado, no otro concepto.

---

## El módulo — también un solo molde

Todos los módulos se abren y se ven igual. Nada de que uno tenga barra lateral y
otro no.

- **Cabecera pegajosa** (`PageHeader`): a la izquierda **← Escritorio** (+ `Esc`),
  después el **chip con el ícono** + un rastro (`Escritorio / Vencimientos`) + el
  **título** en h2; a la derecha las acciones —**Filtros**, **Exportar** y la
  **acción principal** del módulo (`Nueva venta`, `Cargar factura`, `Registrar
  cobro`…).
- **Filtros** viven detrás del botón; lo que está activo vuelve como **chips** que
  se sacan de a uno (el molde que estrenó Productos).
- **Cuerpo**: una tabla con las columnas justas, o el contenido propio del módulo
  (el gráfico en Ventas, la lista en Reportes). Tablas con aire, cabecera sobre
  superficie levantada, números por dígito en `tabular-nums` de Archivo. El
  encabezado de columna va en capitalización normal —sin versalita.

---

## Navegación y continuidad

- **Escritorio ↔ módulo.** Tocás una tarjeta y **se despliega**: la tarjeta crece
  y se convierte en la cabecera del módulo (View Transitions; la tarjeta y la
  cabecera comparten `view-transition-name`; el resto cruza suave; ~220 ms,
  ease-out, sin rebote; respeta `prefers-reduced-motion`; degrada a corte
  instantáneo). Volver es el reverso exacto: **← Escritorio** o **Esc**.
- **No perder el lugar.** El escritorio te espera como lo dejaste (scroll,
  configuración). A futuro, cada módulo conserva su contexto de trabajo (filtros,
  búsqueda, fila seleccionada) al ir y volver —«espacios de trabajo paralelos».
- **Adentro de un módulo**, su propia navegación cuando haga falta
  (`Escritorio → Clientes → Cliente → Historial`). Nunca una barra global con
  todo el sistema.
- **La caja** se abre desde el escritorio (botón de modo) y toma la pantalla
  completa; el cajero no ve el escritorio mientras cobra.

---

## IA — Ctrl + K, desde cualquier lado

La IA no es un módulo ni un panel fijo: es **algo que invocás y se va**. `Ctrl+K`
(o el botón «Preguntar») abre un buscador que:

- responde preguntas del negocio cruzando módulos («¿cuánto vendimos hoy?»,
  «¿qué tengo que comprar?», «¿qué clientes me deben?») —siempre con la etiqueta
  `IA` y descartables;
- y sirve para **saltar a un módulo** sin volver al escritorio.

---

## Exportar — la salida universal

En **toda lista y todo reporte**, siempre, en el mismo lugar de la cabecera, un
**Exportar** discreto → Excel / CSV / copiar. Por dos razones: la data es del
negocio y siempre tiene que poder salir; y en Argentina todo lo que se hace se lo
termina mandando al contador. Regla: **la pantalla contesta las 3 preguntas que
la gente siempre tiene; el Excel es para la 4ta, la impredecible, y para pasarle
datos a alguien de afuera.**

---

## Maquetas de referencia

- Dirección visual y análisis del rubro:
  https://claude.ai/code/artifact/50282710-f4c6-43c9-b31e-f4db4bff4d50
- Pantallas de referencia (Productos y Caja):
  https://claude.ai/code/artifact/9829081b-4cc8-4036-9eb8-39687e165359
- **Escritorio v4** (caja de 14 módulos, tarjetas con motivo, módulo desplegable,
  gráfico de Ventas adentro, Ctrl+K):
  https://claude.ai/code/artifact/32cc6074-d912-443f-b0f4-25592d6141da

> Las maquetas son de una etapa previa a este documento: sirven para el layout y
> el concepto, no para la tipografía (todavía Bricolage/Spline) ni para los
> matices por módulo (todavía a ojo). Manda el texto de arriba.

---

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
  **Preguntar** junto a la grilla.
- **Color por módulo** en las tarjetas (`HUES` en `lib/modules.tsx`): matiz
  propio por módulo en OKLCH (luz y croma fijos, solo rota el matiz; arco fuera
  del verde y el ámbar), repartido por toda la rueda para que ningún par sea
  confundible. Se aplica en grande —pastilla del ícono + franja + borde + lavado
  del fondo— para reconocer el módulo por color. Renglón de contexto con espacio
  fijo y tipografía pareja, en capitalización normal.
- **Densidad de tablas** en la cabecera de cada módulo (`useDensity`,
  `lib/prefs.ts`): un botón junto a las acciones alterna cómoda / compacta y el
  cambio se ve sobre la tabla que estás mirando.
- **Tipografía Archivo** (una familia; escala en tokens `--text-*`; `.type-display`
  para la marca y el número hero). El monoespacio solo para identificadores.
- **Menú de la cuenta**: varias cuentas con sesión abierta en el mismo
  dispositivo, alternar sin re-login, "Agregar otra cuenta" y "Salir" (cierra
  solo la activa) — `lib/auth-context.tsx`, `components/account-list.tsx`.
- **Ajustes** (`/ajustes`, desde el menú de la cuenta): perfil (nombre, email,
  color de avatar), contraseña, tema (también en el menú de la cuenta), sesiones
  del dispositivo; y solo para el Dueño, datos de la empresa (nombre, logo, zona
  horaria), **sucursales** y los accesos a Usuarios y Rangos, que salen del
  escritorio. Backend: `PATCH /auth/me`, `PATCH /auth/tenant`, `/branches`.
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
  —logo de la empresa, nombre, y `abasto.ai` debajo, ambos legibles— a la
  izquierda y las herramientas —sucursal, caja, cuenta, todas a la misma
  altura— a la derecha; el encabezado se mantiene compacto para que la grilla se
  vea apenas entrás; (2) fecha, saludo según la hora (Buen día / Buenas
  tardes / Buenas noches), y los pendientes del día como **chips con el color de
  su módulo** (o «Hoy no hay nada urgente.»); (3) el conteo de módulos +
  **Preguntar** + Configurar, pegado a la grilla. El menú de la cuenta muestra
  nombre, email, empresa, rango, sucursal, tema y desde cuándo está la sesión (del
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

---

## Lo que sigue, en orden

### Refactor del sistema visual (este documento)

1. **Tipografía a Archivo, una sola familia.** Cambiar `index.html` y los tokens
   `--font-*` en `styles.css`. Marca y número hero en Expanded/700; el resto en
   ancho normal. Sacar Bricolage y Spline Sans.
2. **Achicar el monoespacio a identificadores de máquina.** Sacar `font-mono` de
   toda etiqueta y toda columna de datos; dejarlo en SKU, código de barras,
   lote, CUIT, token. Las columnas numéricas pasan a `tabular-nums` +
   `slashed-zero` de Archivo.
3. **Escala tipográfica en tokens.** Reemplazar los `text-[13px]`, `text-[12.5px]`
   y compañía por los ocho pasos de la escala.
4. **Los ~14 matices por módulo en OKLCH.** Reescribir `HUES` en `lib/modules.tsx`
   con luz y croma fijos, rotando solo `H`, dentro del arco permitido, ≥ 22° de
   separación, bajando a ~10; Reposición sale del ámbar; Usuarios/Rangos comparten
   el pizarra. Ajustar el dark con luz, no croma.
5. **Radios a los tres tokens.** Sacar todo `rounded-[Npx]` y `rounded-2xl` /
   `rounded-xl` que no sea `lg` / `md` / `sm`.
6. **Calmar el movimiento.** Sacar el `hover:-translate-y` de las tarjetas y del
   botón de caja, la flechita que se corre, y cualquier animación de entrada. La
   transición tarjeta → módulo es la única.
7. **Sacar las versalitas.** «Para mirar hoy», «Ocultos», la fecha del
   escritorio, los encabezados de columna: capitalización normal.
8. **Sacar el `→`** del texto del botón de caja y de los chips de pendientes.

### Producto

9. **El molde de Productos al resto de los listados** (buscador + filtros en
   panel + chips que se sacan de a uno + columnas justas). Faltan Stock,
   Vencimientos, Ventas, ingresos/egresos/historial/reposición/turnos.
10. **Margen en el gráfico de Ventas**: guardar el costo al momento de la venta
    (`SaleLine.unitCost`) —falta migración y que la caja lo grabe.
11. **Exportar en el resto de los listados** (falta clientes, precios,
    promociones, turnos, depósitos).
12. **La capa de IA en Ctrl+K**: hoy es solo buscador de módulos; falta que
    responda preguntas del negocio cruzando módulos.
13. **Repasar los formularios** con la regla de aire y agrupación.
14. **Recargo/descuento por medio de pago** (falta modelo y que la caja lo
    muestre antes de confirmar).
15. **Transferencias de stock entre sucursales** (mover mercadería de un depósito
    a otro, con el ledger de las dos puntas).

---

## Resuelto

**Sucursales** — `Branch` es una entidad propia (migración `..._sucursales`), un
depósito pertenece a una sucursal, y una sucursal nace con su depósito y su caja.
Alta/edición en Ajustes (Dueño). La sucursal activa viaja en `X-Branch`
(localStorage, no en el token), validada en cada pedido contra
`sucursales.navegar`. Stock, ventas, caja, turnos, compras, vencimientos,
reposición y el gráfico de Ventas quedan acotados a la sucursal activa; catálogo,
precios, proveedores, clientes y cuenta corriente son de toda la empresa.

**Zona horaria** — las columnas `DateTime` pasaron a `timestamptz` (migración
`20260906073516_timestamptz`); Prisma y `@default(now())` guardan el instante
real y el listado de Ventas muestra la hora correcta. La zona horaria del negocio
se elige en Ajustes (`Tenant.timezone`).

Más adelante, con backend detrás (ver `docs/producto.md`): ARCA,
devoluciones/notas de crédito, transferencias de stock, conservación de contexto
por módulo, personalización profunda del escritorio.

---

## Deudas conocidas

- **`CLAUDE.md` decía «single App.tsx, no router»** — quedó viejo: hay
  `react-router-dom`, `page-header.tsx`, `protected-route.tsx`, `admin-route.tsx`
  (`PermissionRoute`) y un árbol `pages/`.
- **Categorías salió del riel** (feature sin definir) pero `/catalog/categories`
  sigue existiendo y el filtro por categoría sigue en Productos. Queda así hasta
  que se decida qué hacer con categorías.
- **El código todavía no sigue este documento.** La tipografía, los matices, los
  radios, el movimiento y las versalitas de arriba son el objetivo, no el estado
  actual —ver «Lo que sigue → Refactor del sistema visual».
