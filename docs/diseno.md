# Diseño — Abasto

> La estrella polar del diseño. Antes de tocar una pantalla, un componente o un
> color, se chequea contra este documento. Complementa `docs/producto.md` (qué es
> el sistema); esto es **cómo se ve, cómo se navega y por qué**.
>
> Es un documento vivo —«Hecho» y «Lo que sigue» se actualizan a medida que se
> avanza— pero **las bases** (el sistema visual, las reglas, la navegación) no se
> tocan sin una razón fuerte y escrita.

## Estado (2026-09)

- **El escritorio y el encabezado están cerrados.** La estética a la que
  llegaron —el sticker de offset duro, la barra unificada sticky full-width, el
  Preguntar flotante, la grilla arrastrable, el color por módulo en las
  tarjetas— es la buena y costó varias vueltas llegar ahí. No se rediseñan: lo
  que dice este doc sobre esas dos pantallas es descriptivo, no una propuesta a
  revisar. Cualquier detalle del código que se desvíe del texto de abajo para
  esas dos pantallas, **gana el código** (y se corrige el texto, no la pantalla).
- **La experiencia de los módulos todavía no se trabajó.** Lo que hay adentro de
  cada módulo (Precios, Reportes, Stock, Clientes…) creció suelto, pantalla por
  pantalla, sin un molde real. Eso es lo que sigue. El criterio viejo de
  **«bento»** para las pantallas de lectura **queda descartado** —la dirección
  nueva está en definición (ver «El módulo»).
- `docs/producto.md` está desactualizado en varios puntos de alcance; cuando
  discrepe con el código, manda el código.

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
| Nombre | **Abasto**. En pantalla el logotipo es `abasto.ai`, con el `.ai` en cian primario. |
| Tono | Una herramienta de trabajo tranquila. No estrésa, no vende, no adorna. Confianza antes que personalidad. |
| Se gana el `.ai` | La IA **sugiere, nunca decide**. Cada función con IA lleva su etiqueta `IA` y se puede descartar. |

### Tipografía — una sola familia

**Geist** (Vercel) para todo: marca, títulos, cuerpo, interfaz y los números de
los datos. Es una grotesca neutra y fina, con buen ritmo a tamaño de texto y
suficiente presencia en los tamaños grandes. La jerarquía sale del **peso y el
tracking** de la misma familia, no de meter una segunda cara.

- Una sola familia: `--font-sans` y `--font-display` apuntan a Geist; la marca y
  el número hero usan `.type-display` (peso 800, tracking más cerrado), el resto
  ancho y peso normales.
- **Figuras tabulares** (`.tabular` → `font-variant-numeric: tabular-nums`). Toda
  columna de precio o cantidad alinea por dígito en la misma cara que el resto
  —sin bloque monoespacio que corte la tabla.

**Monoespacio: solo para identificadores de máquina.** SKU, código de barras,
lote, CUIT, token. Nunca para etiquetas chiquitas ni para columnas de datos
(esas van con `tabular-nums` de Geist). La cara mono se decide en la
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
  · 800 reservado a la marca y al número hero (`.type-display`).
- El `letter-spacing` negativo (`-0.02em`) solo en h1/h2/h3. El cuerpo, nunca.

### Color

La paleta **Yerba**: cian vibrante sobre neutros arena cálidos. Claro y oscuro
siempre, con los mismos tokens (`--ab-*` en `frontend/src/styles.css`,
referenciados por `@theme inline`), así el tema cambia en tiempo de ejecución.
El primario es `--ab-primary` (`#0b748c` en claro, `#37b4cc` en oscuro; el
oscuro baja de luces para que el cian no hiera sobre fondo oscuro).

#### Base y semántica

| Rol | Qué es |
|---|---|
| Fondo / superficie / superficie levantada | Neutros arena. Tres niveles, nada más. |
| Tinta / tinta suave / tinta tenue | Texto. Tres niveles. Nunca un negro teñido a mano. |
| Línea / línea suave | Bordes. Dos pesos. |
| **Cian primario** | **La única acción sólida.** Si aparece cian lleno, se toca. |
| Ámbar | **Aviso.** Sin precio, por vencer, bajo mínimo. |
| Rojo ladrillo | **Problema.** Vencido, faltante, diferencia de arqueo. |

Regla: **el color de acción es uno solo** (el cian). El ámbar y el rojo no son decorativos
—aparecen cuando hay algo que avisar o algo que está mal, y en dosis mínimas (un
puntito), nunca como fondo de un bloque. El dato clave de las tarjetas es
siempre monocromo: la alerta la lleva el puntito, sola.

#### Color por módulo — identidad, no estado

En el escritorio, cada tarjeta lleva un **matiz propio** en la pastilla del
ícono, una franja al costado, el borde y un lavado tenue del fondo. Sirve para
**encontrar el módulo por color sin leer**. Adentro del módulo el matiz
desaparece: manda el cian acción.

Los matices se generan con una receta, no a ojo:

- **Arcoíris completo** a OKLCH con croma alto (0.20) y luz media fija (0.60),
  rotando solo el matiz (`H`). La distinción manda: cada módulo es de una
  familia de color diferente —rojo, naranja, oro, lima, esmeralda, cian, azul,
  violeta, magenta.
- **Distancia mínima** de matiz entre dos módulos cualesquiera ≥ ~30° —varios
  pares quedan a 40-50°. La separación se ve de un vistazo.
- **No se esquiva cian ni ámbar** (decisión del dueño del producto): los
  colores de identidad pueden rozar los de semáforo y el primario porque la
  alerta la lleva el puntito, no el color de la tarjeta.
- Máximo ~10 matices. Los módulos que viven adentro de Ajustes (Usuarios,
  Rangos) comparten un **pizarra de croma bajo** —son sistema, no operación.
- En oscuro se ajusta la luz del matiz, no el croma, contra la superficie
  correspondiente.

Los valores concretos viven en `frontend/src/lib/modules.tsx`; acá va la receta.

### Fondo

El fondo es la base del sistema (arena en claro, forestal en oscuro) con un
**lavado tenue de cian** (`--ab-primary`) por dos esquinas —arriba a la
izquierda y abajo a la derecha—. Acompaña, no compite. Reglas:

- **Cero costo de runtime**: dos `radial-gradient` CSS (los lavados de esquina).
  Pintura única, sin animar, sin imágenes, sin JS, sin `transition`. No compite
  con los motivos de los módulos ni con las tarjetas (que llevan sus propios
  lavados).
- **Sutil siempre**: los lavados van entre 12 % y 15 % de alfa del
  `--ab-primary`. Si se nota como un "diseño de fondo" cargado, pasó de largo.
- **`background-attachment: fixed`** en puntero fino (pintura única); en
  táctiles se vuelve a `scroll` para no repintar en cada scroll.

### Forma

- **Radio**: cuatro pasos —`lg` 12 px (paneles), `md` 9 px (botones, chips,
  inputs), `sm` 6 px (`kbd`, marcas chicas) y **`xs` 5 px, reservado a las
  tarjetas del escritorio**: la cáscara sticker (radio mínimo + sombra
  desplazada) se lee mejor con el radio chico, y es el único lugar del sistema
  que lo usa. No se usan valores sueltos (`rounded-[10px]` y compañía): si algo
  no entra en los pasos, el problema es el elemento, no el radio. **Dos formas
  totalmente redondas** salen de la escala a propósito: la **píldora** (`badge`,
  chip de filtro, contador — un token de conteo o de estado, no una superficie)
  y el **avatar** (siempre circular, de la persona o de la empresa).
- **Elevación**: una tercera sombra, la **sticker**, está reservada a las
  tarjetas del escritorio (en oscuro, offset duro negro; en claro, el mismo
  offset neutro): apoya la tarjeta en el tablero y define su "despegue" en
  hover. Las otras dos significan algo: `card` (1 px, apenas despega) para una
  superficie de contenido; `float` (1 px + halo suave) para algo que se levantó
  por encima —un menú, un diálogo, el botón de caja. Todo lo demás está al ras.
  La elevación no decora: marca jerarquía.
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
- **El hover de las tarjetas del escritorio**: la tarjeta vive *apoyada*
  (`translateY(1px)`) y al pasar el mouse **se despega** 3 px mientras la sombra
  sticker se desplaza hacia atrás —un levante, pero con la física del sticker,
  no la flotación blanda de la tarjeta SaaS. En el mismo gesto se intensifican
  el borde y el motivo. El resto del sistema no levanta nada en hover.
- **Prohibido**: animaciones de entrada al cargar; fade-and-slide-up por
  sección; la flechita que se corre; levantar tarjetas con sombra suave
  genérica (`rgba(0,0,0,.1)`) que no pertenece al sistema.
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
- **El cian es la única acción sólida.** Si aparece cian lleno, se puede tocar.
  El ámbar es aviso, el rojo es problema.
- **Botones — una escala fija, un rol cada uno.** `primary` (cian lleno): la
  **única** acción sólida de la pantalla, una sola, arriba a la derecha de la
  cabecera (`Nuevo <cosa>`, `Cargar factura`). `outline`: lo secundario
  (Editar, Exportar, Filtros, Activar/Desactivar, paginación). `ghost` /
  `size="icon"`: lo terciario e inline (quitar un chip, el lápiz de fila de un
  módulo sin detalle) — siempre con `aria-label`. `destructive`: **solo** lo irreversible, nunca al
  lado del `primary` (va al final, separado, o en el detalle), y siempre detrás
  de una confirmación que nombra el ítem. Tamaños: `icon` inline en filas, `sm`
  en barras densas y paginación, default en cabeceras y diálogos. Hover: solo
  cambia color (los destructivos a rojo); nada «levanta» salvo las tarjetas del
  escritorio.
- **El estado lo dice el dato, no un marco.** «3 lotes», «4 vencidos», «+17,8 %
  vs ayer»: el texto lleva la noticia, y **la cifra clave se tiñe** —con el matiz
  del módulo para lo que le es propio (nombres, montos), ámbar cuando es un aviso
  (plazos, conteos pendientes), rojo cuando está mal. Nunca el bloque entero, una
  cifra en dosis mínimas. Un puntito ámbar o rojo arriba a la derecha basta para
  marcar «acá hay algo». Los pendientes del día viven en la **campana** del
  encabezado: el conteo arriba a la derecha del ícono y, al abrirla, un item por
  cosa con el **puntito del color del módulo** al que enlaza —una versión mínima
  de su tarjeta, no un recuadro de alerta.
- **Si se puede tocar, el cursor lo dice.** Todo botón, toggle y fila
  interactiva lleva la manito en hover (regla global en `styles.css`); lo
  deshabilitado, `not-allowed`.
- **La estructura es información.** Bordes, franjas, numeración, divisiones:
  codifican algo del contenido, no lo decoran. Marcadores numerados (01 / 02 /
  03) solo si el contenido de verdad es una secuencia.
- **No se decora con tarjetas.** La elevación y los grupos siempre significan
  algo. Un recuadro con borde, fondo y sombra dice «objeto aparte»: se gasta
  cuando de verdad hay un objeto aparte, no para separar dos grupos de una misma
  pantalla (para eso alcanza el aire y un título). Cómo se resuelve la lectura
  de un módulo está en definición; el criterio de «bento» (grilla de tiles
  heterogéneos de distinto tamaño) quedó atrás.
- **Consistencia.** Si editar un registro se hace de una manera en Clientes, la
  misma manera vale en Proveedores y Productos. Quien aprende una pantalla
  entiende las demás.
- **Progresividad.** El caso simple es el default, no una configuración que hay
  que desarmar. Una sola sucursal, un solo usuario, sin cuenta corriente, sin
  lotes: el sistema no pide nada de eso para funcionar.

### Piso de calidad — sin anunciarlo

- Responsive hasta una columna en el teléfono.
- Foco de teclado visible en **todo** elemento interactivo (anillo de 2 px del
  primario, `offset` 2 px). Hay una **regla global** en `styles.css`
  (`:where(a[href], button, input, …):focus-visible`) con especificidad 0: los
  componentes que ya definen su anillo lo pisan, el resto lo hereda.
- `prefers-reduced-motion` respetado — regla global que corta las animaciones
  (spinners, pulsos); las transiciones de color en hover no son movimiento.
- Contraste AA: 4.5:1 en texto, 3:1 en elementos de interfaz.
- Paleta armónica en claro y en oscuro —se revisa en los dos. El tema **sigue al
  sistema** (y reacciona a sus cambios) hasta la primera vez que el usuario toca
  el botón; ahí queda fijo. Solo la elección explícita se guarda.
- **Fechas y montos, en un solo lugar** (`lib/format.ts`): `money` / `quantity` /
  `fecha` / `fechaHora` / `hora` / `inputDate`. Una fecha escrita distinto en dos
  pantallas hace dudar del dato. `fecha` trata la fecha sola sin corrimiento de
  zona; `fechaHora` pasa el timestamp a hora local.

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

La pantalla de inicio —y **la navegación principal**— es el escritorio: una
**caja con todos los módulos**, una tarjeta por módulo. Se entra al escritorio,
se toca un módulo, se trabaja adentro, se vuelve al escritorio para ir a otro.
Adentro de un módulo hay un atajo: el botón ☰ del encabezado despliega un riel
de íconos para saltar directo a otro módulo (ver «El módulo → El riel»). El
escritorio no tiene ese riel.

Cumple dos funciones a la vez: **navegación** y **centro de estado del negocio**.
Entrás a la mañana, ves de un vistazo dónde hay algo para atender, y entrás ahí.

### El encabezado — liviano, el saludo es el héroe

Tres franjas, de menos a más peso hacia abajo:

1. **Identidad, compacta.** El logo de la empresa a tamaño chico, el nombre, y
   `abasto.ai` —los dos legibles, ninguno como membrete. A la derecha, las
   herramientas a la misma altura: sucursal, **campana** (los pendientes del
   día), **tareas** (checklist personal) y **cuenta** (con el tema adentro).
2. **El héroe de la pantalla.** La fecha en capitalización normal, el saludo
   según la hora (Buen día / Buenas tardes / Buenas noches) en h1 y, si estás
   parado en una sucursal que no es la tuya, la indicación para volver. Los
   pendientes del día no compiten acá: viven en la campana de la franja 1.
3. **Pegado a la grilla.**
   **Abrir Mostrador** (si el rango opera caja) a la izquierda, arriba del grid,
   con el molde de tarjeta de acción —cascarón compacto, borde, superficie
   neutra y la franja de color solo para él—. El **Preguntar** (Ctrl + K) fue el
   reemplazo de Configurar: no hay modo de edición, la personalización vive en
   la tarjeta misma, y la chispa flota por la pantalla (adosada en reposo), se
   arrastra y recuerda su posición por dispositivo.

### La tarjeta — un solo molde para las ~14

Todas las tarjetas son **iguales**: mismo tamaño, mismo borde, misma estructura.
Ninguna más grande que otra (Ventas incluida —el gráfico grande vive **adentro**
del módulo).

Anatomía, siempre en el mismo lugar:

1. **Cabecera**: el ícono en un chip redondeado (radio `md`, 32 px, relleno del
   **color del módulo**) y el **nombre** a su derecha, en la misma fila, escala
   `h3` (20 px, peso 600) —el título de la tarjeta, lo primero que se lee. Una
   **franja** del color del módulo corre por el borde izquierdo.
2. **Dato clave** en display (escala `h2`, 24 px), lo único que de verdad
   importa saber sin entrar (`$ 1,28 M`, `Abierta`, `3`). **Siempre lo mismo**:
   un número (con unidad corta) o una palabra de estado —nunca una frase. Es
   **monocromo**: el color no describe estado acá.
3. **Un renglón de contexto** de **una sola línea**, con espacio fijo en todas
   las tarjetas: misma cara, mismo tamaño (escala `micro`, 12 px), mismo lugar,
   pegado abajo. Lleva **solo la información útil que el dato clave no cuenta**
   (ejemplos de productos, tendencia, plazos, proveedor); **gris, uniforme, sin
   tintes** (`bajo el mínimo · jamón cocido`, `+17,8 % que ayer · 43 tickets`).
   Sin relleno, sin repetir el dato: lo que no aporta, no va. El nombre del
   módulo nunca queda por debajo de esta línea.
4. **Puntito de aviso** (ámbar/rojo) arriba a la derecha, solo si hay algo
   pendiente. Los puntos 2 y 3 son siempre del mismo gris robusto: **la única
   señal de alerta en la tarjeta es el puntito** —una cifra teñida no compite
   con él, todas las tarjetas hablan igual y la mirada busca una única cosa.

Identidad de marca: el **header** lleva únicamente el logo y el nombre de la
empresa; el brand completo **"abasto.ai"** (logo + nombre + marca) vive en el
**footer**, discreto y al pie.

La identidad se refuerza con el **color del módulo** (punto 1, más el borde y el
lavado del fondo) y con un **motivo de línea** propio —grande y tenue, saliéndose
por una esquina, teñido con ese color: Ventas unas barras que suben, Caja una
registradora, Vencimientos un calendario, Precios una etiqueta. Es carácter que
significa algo. Al pasar el mouse, la tarjeta **se despega del tablero**: la
sombra sticker se desplaza y el borde y el motivo se intensifican —un levante
físico, el del sticker, no la flotación blanda de una tarjeta SaaS (ver
"Movimiento", más arriba).

### Se arma por permiso

**Es una sola pantalla, igual para todos.** Qué tarjetas trae sale del rango,
igual que antes el riel: sin `stock.ver` no hay tarjeta de Stock. No hay un
«escritorio de encargado» y otro de administrativo; hay **el escritorio**, y cada
uno ve su recorte.

### Estado tranquilo

Si no hay nada pendiente, el escritorio no queda vacío: queda **tranquilo**. Cada
tarjeta muestra su versión en calma (`Al día`, `0 lotes`) y la campana no tiene
nada que atender («Hoy no hay nada urgente.»). Un escritorio en calma es la señal
de que está todo bien.

### Configurable

La personalización está **directo sobre la tarjeta**, sin modo intermedio:
ocultar desde el botón del ángulo (aparece en hover, con "Deshacer" navegable),
mostrar de nuevo desde la fila **Ocultos**, **reordenar arrastrando** y **dar
tamaño** estirando los bordes (o la esquina) de la misma tarjeta. La densidad de
las tablas es otra cosa: vive sola en la cabecera de cada módulo
(espacioso / compacto), donde el cambio se ve sobre la tabla real. Todo se
guarda por dispositivo en `localStorage`. Con control — jerarquía clara, no un
caos de widgets. Personalización más profunda (fijar, destacar, y que el orden
viaje con la cuenta) es más adelante.

### La caja no es una tarjeta

La caja es un **modo de trabajo**, no un módulo que se navega: pantalla
completa, el mundo del cajero. En el escritorio vive en una **tarjeta de acción
compacta** —cascarón del mismo aire que las tarjetas, superficie neutra y dos
renglones, pero con **dos barras de color, una por cada costado** en vez de la
franja única a la izquierda— para que el ojo la lea como la tarjeta principal
de esa fila. Se llama **«Abrir Mostrador»**, va **primera, a la izquierda de la
fila**, arriba del grid: el cajero la ve antes de mirar las tarjetas. La **barra
de estado se lee del color de las dos rieles** —cian sólido si el turno está
abierto, rojo sólido si no—, no de las letras: el texto es siempre del tinte de
lectura, y un punto cian parpadea en la etiqueta mientras hay turno abierto. El
renglón de contexto lleva lo que el cajero quiere saber sin entrar: desde qué
hora, cuántos tickets y cuánto efectivo hay. Al abrir la app siempre se cae en
el escritorio (no hay preferencia de "entrar directo a"); para un cajero, esa
tarjeta es lo primero que ve.

### El celular

Repositor, o cualquiera desde el teléfono → mismo escritorio, misma idea, **una
sola columna**. Es una variante de maquetado, no otro concepto.

---

## El módulo — un solo molde (en construcción)

> **Esto es la zona de trabajo activa.** El escritorio y el encabezado ya están;
> lo de adentro de cada módulo creció suelto y ahora tiene un molde. Se está
> aplicando módulo por módulo —el primero es **Ventas**—. Hasta que esté en
> todos, algunas pantallas todavía se ven al viejo estilo (recuadros apilados).

El molde tiene **tres partes fijas** en el cuerpo, siempre en el mismo orden. El
componente `ModuleScreen` (`components/module-screen.tsx`) las arma; una pantalla
nueva no maqueta ninguna a mano. La navegación entre módulos NO es parte del
molde — ya existe y no se toca (ver «El riel», abajo).

### El riel de módulos — NO SE TOCA

Un **botón ☰** en el encabezado de cada módulo que, al tocarlo, **despliega el
riel ahí mismo, hacia abajo** (los íconos de los módulos, para saltar de uno a
otro sin volver al escritorio). Es como está y funciona bien: **no es una
columna fija**, no empuja el layout, se abre y se cierra desde ese botón y ya.
Cualquier cambio en el riel se pide y se escribe acá primero.

### 1 · La cabecera — `PageHeader`, pegajosa

A la izquierda **← Escritorio** (+ `Esc`), el **chip del ícono con el matiz del
módulo** + rastro + el **título en h2 (24 px)**; a la derecha **Filtros**,
**Exportar** y la **acción principal** (`Cargar factura`, `Registrar cobro`…).
Los filtros viven detrás del botón y lo activo vuelve como **chips** que se
sacan de a uno.

### 2 · Línea de resumen — las cifras que importan

Una sola línea de texto **chico** (no tiles grandes) con las 2 a 4 cifras clave
del módulo: `Hoy $1,28 M · 43 tickets · promedio $29.700`. Monocroma; una cifra
se tiñe **solo** si es una alerta (ámbar aviso, ladrillo problema). Es opcional:
un módulo que no tiene una cifra de cabecera no la lleva.

### 3 · Vistas — una a la vez

Una **fila de pestañas** que nombra lo que hay para ver, y **debajo una sola
vista ocupando todo el ancho**. Ventas: `Comprobantes` · `Resumen`. Precios:
`Listas` · `Actualizar` · `Promociones` · `Historial`. Un listado simple puede
tener una sola vista y entonces no muestra la fila.

La vista es **una tabla, un gráfico, o secciones de formulario** — **sin
recuadro**. Una sección dentro de una vista es: título en h3 + una línea fina +
el contenido, con 24 px de aire entre secciones. Adentro de una vista **nunca
hay tarjetas**. La elevación queda para lo que de verdad flota (un menú, un
diálogo), no para agrupar.

El estado vacío de una vista **trae su acción** (`Todavía no cargaste productos`
→ botón `Crear producto` ahí mismo), nunca es solo un cartel.

### 4 · El listado — filas, selección y acciones

Un listado es una vista más (una tabla). Cómo se opera sobre sus filas está
**estandarizado** — Productos, Proveedores, Clientes, Depósitos, Categorías,
Usuarios y Rangos se comportan igual, aprender uno es aprender todos.

**Cada acción vive en UN solo lugar.** Antes de sumar un botón a un listado se
enumeran las superficies donde ya podría estar —fila, barra de selección,
cabecera del detalle, cabecera de la pantalla— y se elige una. Repetir una
acción en dos lugares (y peor, una destructiva) es el error a no cometer.

- **La fila abre el ítem, y no tiene nada más.** Si el módulo tiene pantalla de
  detalle (hoy solo Productos), **toda la fila es el destino**: click —o Enter
  con foco— abre el detalle. Cursor de manito, `hover:bg-subtle` (ya en
  `TableRow`). **Cero controles en la fila** —ni ojo, ni lápiz, ni activar, ni
  borrar—; solo el checkbox en la canaleta izquierda, cuya celda hace
  `stopPropagation` para no navegar. El módulo sin detalle sí lleva un `ghost`
  `size="icon"` de lápiz que abre su diálogo de edición.
- **El detalle es la única casa del ítem, y se edita en el lugar.** Nada de
  diálogo modal para editar: los campos son editables directo en la pantalla y
  una **barra pegajosa bajo las pestañas** («Tenés cambios sin guardar» ·
  `Descartar` · `Guardar cambios`) aparece cuando algo cambió. El alta usa la
  misma pantalla en modo nuevo (`/<recurso>/new`): sin pestañas, la barra dice
  `Crear`. Cabecera del detalle: solo `Activar/Desactivar` (`outline`) y
  `Eliminar` (`ghost`, ícono + texto, hover a rojo, al final).
- **El detalle se ordena en pestañas** (`ModuleScreen` con `views`): agrupan por
  tema, una a la vez. Productos: `General` (datos + códigos de barras) · `Stock`
  (existencias por depósito + proveedores) · `Precios` (costo/venta, escalas,
  historial). El resumen (`SummaryLine` + un renglón de contexto) va arriba de
  las pestañas.
- **Selección + barra de lote — la única acción de la lista.** Solo donde el
  volumen lo pide (Productos). **Barra pegajosa bajo el `PageHeader`**
  (superficie `accent`, `size="sm"`, selects `h-8`), agrupada: `N seleccionados`
  · `Cambiar:` [categoría] [marca] [IVA] · `|` · `Activar` `Desactivar`
  `Eliminar` · `Limpiar selección`. Cubre 1 a N: «desactivar este» = marcarlo y
  usar la barra. Se limpia sola al cambiar filtro, página o tras aplicar.
- **Destructivo siempre con confirmación** cuyo título nombra el ítem («Eliminar
  «Yerba La Merced»» / «Eliminar 12 productos») y cuyo cuerpo dice qué pasa y si
  se puede deshacer. `Eliminar` es borrado real solo si el ítem no tiene
  historia; si la tiene, se desactiva (y se avisa).

### Lo que el molde deja afuera

Bento (grilla de tiles de distinto tamaño), todo picado en tarjetas del mismo
radio y la misma sombra, un segundo color o una segunda tipografía para «darle
vida», tablas envueltas en un `Card`. El carácter ya se gastó en el escritorio;
adentro del módulo manda la claridad.

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
- **Entre módulos**, el riel que despliega el botón ☰ del encabezado (ver «El
  módulo → El riel») permite saltar sin volver al escritorio. Es navegación
  rápida entre pares, no una barra que duplica el escritorio: no lleva estado
  del negocio, no se puede configurar, y en el escritorio no existe.
- **Adentro de un módulo**, su propia navegación cuando haga falta
  (`Escritorio → Clientes → Cliente → Historial`).
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
- **El molde de todo listado** en un componente (`components/list-filters.tsx`):
  buscador siempre a mano, el resto de los filtros detrás de «Filtros», lo activo
  vuelve como chips que se sacan de a uno, tabla con las columnas justas. Aplicado
  a Productos, Stock, Vencimientos, Ventas, Historial de movimientos, Reposición y
  Turnos de caja (los tres primeros filtran del lado del cliente sobre datos ya
  cargados; el resto contra el backend).
- **`PageHeader` pegajoso**: título y acciones siguen al scrollear.
- **Componentes compartidos**: tabla con aire y cabecera sobre superficie
  levantada, tarjeta con una sola sombra, botón `outline` que se tiñe de cian.
- **Caja fuera de todo**: `FullScreenRoute` con su franja de estado del turno.
  Caja por dentro: lector con anillo cian, carrito, panel de cobro, total
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
  propio por módulo en OKLCH (luz y croma fijos, solo rota el matiz; toda la
  rueda, sin esquivar el cian ni el ámbar), repartido para que ningún par sea
  confundible. Se aplica en grande —pastilla del ícono + franja + borde + lavado
  del fondo— para reconocer el módulo por color. Renglón de contexto con espacio
  fijo y tipografía pareja, en capitalización normal.
- **Densidad de tablas** (espacioso / compacto) en la cabecera de cada módulo
  (`useDensity`, `lib/prefs.ts`): un botón junto a las acciones alterna y el
  cambio se ve sobre la tabla que estás mirando (`styles.css`, `data-density`).
- **Tamaño de las tarjetas** del escritorio (chica / mediana / grande) desde el
  modo **Configurar** (`useTiles`, `lib/prefs.ts`): cambia la grilla y la altura
  de las tarjetas (`tiles-chica` / `tiles-grande` en `styles.css`).
- **Refactor visual completo**: escala tipográfica en tokens `text-*` (sin
  `text-[Npx]` arbitrarios) y radios limitados a `lg` / `md` / `sm`.
- **Tipografía Geist** (una familia; escala en tokens `--text-*`; `.type-display`
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
- **Exportar** unificado (Excel / CSV / copiar) en Productos, Stock, Ventas,
  Proveedores, Clientes, Depósitos, Turnos de caja, Listas de precios y
  Promociones (`components/export-menu.tsx` + `export.util.ts`).
- **Ctrl+K**: buscador de módulos (la capa de IA, después).
- **Formularios con aire y agrupación**: un solo molde de diálogo (cabecera
  fuera del `<form>`, aviso de error debajo, `grid`), campos en grupos con 24 px
  entre grupos y 12 px adentro (`gap-6` / `gap-3`), sin parches de margen
  negativo ni pasos fuera de escala (`gap-5`). Botones en voz activa: «Guardar
  cambios» al editar, «Crear <cosa>» al alta. El formulario de Productos pasó de
  lista plana de ~13 campos a cuatro grupos (identificación · unidades ·
  impuestos · reposición).
- **Productos, el módulo de referencia del molde de listado** (ver «El módulo →
  4 · El listado»): la fila abre el detalle y no tiene ningún control; el
  detalle es la única casa del producto y **se edita en el lugar** (sin modal,
  con barra «Guardar cambios»), ordenado en pestañas `General · Stock · Precios`;
  el alta usa la misma pantalla en `/catalog/products/new`. **Selección + barra
  de lote** agrupada = única acción de la lista (`PATCH /products/bulk`, `POST
  /products/bulk-delete`): categoría, marca, IVA, activar/desactivar, eliminar.
  **Eliminar producto** (`DELETE /products/:id`, permiso `productos.eliminar`):
  borrado real si nunca tuvo movimientos, si no se desactiva.
- **Margen en el gráfico de Ventas**: `SaleLine.unitCost` congela el costo del
  producto (`Product.costPrice`) al vender; el gráfico suma una métrica «Margen»
  (subtotal neto de promos − costo, comparada con el período anterior). Las
  ventas históricas se rellenaron con el costo actual; las líneas sin costo
  cuentan como costo 0.
- **Recargo / descuento por medio de pago, por sucursal** (`PaymentAdjustment`):
  un % por medio de pago y sucursal (+ recarga, − descuenta), que se configura en
  Ajustes → La empresa (botón de % por sucursal, sólo Dueño). La caja lo muestra
  por medio antes de confirmar y el neto va a `Sale.surchargeTotal` y a lo que
  cada `SalePayment` cobra. La cuenta corriente nunca lleva recargo.
- **Promociones y escalas por cantidad en la caja**: ya estaban — `cotizar`
  (`sale-pricing.util.ts`) aplica `PriceTier` y `Promotion` al cotizar y al
  confirmar; la caja muestra el descuento por línea y el total. F6 lista las
  ofertas vigentes.
- **Transferencias de stock entre sucursales** (`stock.service.transfer`,
  `POST /stock/transfer`, permiso `stock.transferir`): mueve mercadería de un
  depósito a otro en una transacción, dos asientos apareados (`transfer_out` +
  `transfer_in` con el mismo `operationId`). Pantalla propia en la nav de Stock
  («Transferir»).
- **Devoluciones / notas de crédito** (`CreditNote` + `CreditNoteLine`, permiso
  `ventas.devolver`): devolución total o parcial de una venta confirmada desde su
  detalle en Ventas. El stock reingresa (`adjustment_in`, ref `credit_note`) y la
  plata sale —efectivo del turno (`CashMovement` `expense`) o crédito a la cuenta
  corriente—. La venta original no se toca; numeración interna sin CAE.
- **Reportes del encargado / dueño** (módulo Reportes, `GET /reportes/panel`):
  para un rango de fechas —ventas por medio de pago, por cajero, comparativa entre
  sucursales, más vendidos con margen, stock valorizado, arqueos con diferencia y
  cuentas corrientes con saldo—. El margen y el stock valorizado sólo con
  `reportes.ver_plata`.
- **Seed de demo** (`npm run db:seed-demo -- "<empresa>"`) para ver todo con
  datos.

---

## Lo que sigue, en orden

### Diseño — la prioridad

1. **Definir la dirección del cuerpo del módulo** (ver «El módulo»): qué
   reemplaza al bento para las pantallas de lectura, cómo se ve una sección de
   formulario sin recuadro. Cuando esté, se escribe acá y recién ahí se aplica.
2. **Un molde por tipo de pantalla** y un componente que lo fije (cabecera +
   ancho + Exportar), para que ~20 módulos se sientan uno solo.
3. **Reportes** con la dirección nueva (hoy es todo tablas).
4. **Precios** agrupado (hoy son 8 recuadros en un scroll).
5. **`EmptyState` con acción**; barrer `text-xs` a la escala de tokens.

### Producto

1. **La capa de IA en Ctrl+K**: hoy es solo buscador de módulos; falta que
   responda preguntas del negocio cruzando módulos.
2. **Reportes que faltan**: productos sin rotación y etiquetas por lote.
3. **Datos extra por medio de pago** en la caja (cuotas/lote de tarjeta, id de QR)
   de forma estructurada, para cuadrar mejor el arqueo.
4. **Onboarding de empresa nueva** (asistente guiado: sucursales, ARCA, importar
   catálogo, listas de precios, rangos, invitar usuarios).

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

- **Molde de listado — falta la pasada de consistencia.** Productos ya lo sigue
  (ver «El módulo → 4 · El listado»). Falta alinear el resto: Clientes tiene un
  botón `Desactivar` suelto en la fila (va al diálogo de edición); Depósitos
  mezcla «Ver cajas» + lápiz; ninguno fuera de Productos tiene selección en
  lote todavía —se suma donde el volumen lo pida—.
- **`CLAUDE.md` decía «single App.tsx, no router»** — quedó viejo: hay
  `react-router-dom`, `page-header.tsx`, `protected-route.tsx`, `admin-route.tsx`
  (`PermissionRoute`) y un árbol `pages/`.
- **Categorías salió del riel** (feature sin definir) pero `/catalog/categories`
  sigue existiendo y el filtro por categoría sigue en Productos. Queda así hasta
  que se decida qué hacer con categorías.
- **El código se acercó bastante al documento** (ver `docs/revision-frontend.md`
  para el detalle de lo hecho y lo que falta). Quedan pendientes de peso:
  - **Precios en pestañas**: hoy son 8 secciones apiladas en un scroll. El
    `<Section>` compartido ya está; falta agruparlas (Listas / Actualizar /
    Promociones / Historial).
  - **Capa de datos**: cada listado repite `loading`/`error`/`items` a mano. Un
    `useResource` (o TanStack Query) los unificaría y sería el lugar para
    dedup/caché/refetch. El 401 ya se maneja global.
  - **ESLint**: `typescript-eslint` todavía no soporta TypeScript 7; queda para
    cuando el ecosistema alcance.
  - **`setActiveBranch` recarga la página entera** — se resuelve con la capa de
    datos (invalidar queries en vez de `location.reload()`).
