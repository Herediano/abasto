# Definición del producto — Abasto

> La estrella polar. Antes de diseñar o construir una pantalla, se chequea contra
> este documento. Es un documento vivo: se corrige a medida que se aprende, pero
> las **bases** de acá no se olvidan.

## Qué es

Un ERP para **negocios que compran, stockean y venden mercadería en mostrador**
de Argentina, vendido como **servicio (SaaS B2B)**. Cada negocio es una
**empresa** aislada dentro del sistema.

El **cliente principal, y contra quien se diseña, es el supermercado mayorista**:
es el caso más exigente — varias sucursales, cuenta corriente, pesables, lotes
con vencimiento, factura A con IVA discriminado, personal con roles separados. Un
error de stock o un arqueo mal cerrado le cuesta plata de verdad, así que paga en
serio por que el sistema no falle.

Venta **100% presencial, tipo cash & carry**: el cliente entra a la sucursal,
agarra los productos, pasa por caja, se escanea cada uno, paga (efectivo,
tarjeta, transferencia, QR, cuenta corriente…) y se va. No hay pedidos por
teléfono ni reparto.

Facturación **por ARCA** (fiscal, con CAE). La forma de integración todavía no
está definida — se diseña tratando a ARCA como una caja negra que recibe una
venta y devuelve un CAE.

## Alcance — qué es y qué no

Hay dos ejes por los que un ERP se puede generalizar. Sólo uno nos interesa.

**Eje que abarcamos — mismo trabajo, distinto tamaño.** Mayorista, minorista,
autoservicio, kiosco, almacén, distribuidora, dietética, ferretería, corralón,
pet shop, verdulería, fiambrería. Todos hacen el mismo trabajo: *comprar
mercadería, stockearla, venderla en mostrador, cobrar en caja*. Los sustantivos
son idénticos — producto, stock, lote, proveedor, cliente, precio, caja, turno.
Lo que cambia es la profundidad y el volumen, no el modelo de datos. El
mayorista es el techo; los demás son el mismo sistema con las partes duras
apagadas.

**Eje que NO abarcamos — otro trabajo.** Consultorio, peluquería, taller
mecánico, eventos, inmobiliaria, estudio profesional. Ahí el sustantivo central
deja de ser "producto con stock" y pasa a ser "un turno en un calendario con una
persona". Eso es **otro núcleo, no otro módulo**. No se construye para estos
rubros hasta que un cliente real lo pague, y aún entonces se evalúa como
producto aparte. El nombre *Abasto* ya marca el límite: significa algo para todo
el primer eje y nada para un consultorio.

**Cómo se generaliza sin costo.** No hardcodeando supuestos: `productLotId` es
nullable (producto sin lotes ya funciona), `manejaVencimiento` e `isWeighed` son
flags por producto con default `false` (el default *es* el caso del kiosco), el
límite de crédito vacío = sin cuenta corriente, una sola sucursal tiene que ser
el caso trivial y no un caso especial. Cada vez que algo se resuelve como "flag
del producto/empresa" en vez de "cómo funciona el sistema", generaliza gratis.
Construir *para* un rubro (un módulo nuevo) es caro y se pospone; no asumir es
gratis y se hace siempre.

**Lo que cuesta de este eje, y hay que tener en cuenta al construir:**

- **Condición fiscal.** Un monotributista emite factura C o ticket; un
  responsable inscripto emite A con IVA discriminado y le vende a otro RI. Son
  dos condiciones, no una — cuando se defina ARCA, definirla sabiendo esto.
- **Onboarding.** Un kiosquero que abre Abasto y se topa con siete rangos,
  sucursales, lotes con vencimiento y listas de precios derivadas se va en dos
  minutos. La progresividad (ver más abajo) no es filosofía: es este problema.
- **Rangos.** Los 7 de fábrica asumen un mayorista con personal. En un negocio
  de una persona el dueño es cajero, repositor y administrativo a la vez — falta
  un preset "negocio de una persona".

## Progresividad

El sistema tiene que servirle a un negocio chico sin abrumarlo. La complejidad
empresarial no se muestra toda de entrada: aparece a medida que el negocio la
pide. El mecanismo ya existe — el riel y las rutas se arman por permiso, no por
un flag global — pero vale como principio: **el caso simple (una sucursal, un
usuario, sin cuenta corriente, sin lotes) es el default, no una configuración
que hay que desarmar.**

## IA como capa transversal

La IA no es un módulo aparte: es una capa que lee lo que ya está en el sistema y
responde en contexto. La regla de diseño (`docs/diseno.md`) manda: **la IA
sugiere, nunca decide** — cada función con IA lleva su etiqueta y se puede
descartar. Así el `.ai` del logotipo se lo gana.

Norte de lo que tiene que poder contestar, cruzando módulos: cuánto se vendió
hoy / esta semana, qué productos rotan menos, qué hay que comprar y a quién, qué
precios cambiaron, qué clientes tienen deuda, qué gastos subieron, qué productos
tienen más margen. La forma es un buscador que se invoca con `Ctrl+K` desde
cualquier lado y se va (ver `docs/diseno.md`), no una pantalla propia. No se
construye hasta que haya datos reales que valga la pena consultar así.

## Estructura: Empresa → Sucursal → Usuario

Se crea primero la **empresa**. Dentro de la empresa, quien esté a cargo (dueño o
un usuario con permiso para eso) crea **sucursales**, define **rangos** y crea
**usuarios**, cada uno asignado a una sucursal con un rango.

Cantidad de usuarios **ilimitada** (nunca se sabe cuánta gente pasa por una
empresa).

### Alcance de datos

| Nivel | Datos | Motivo |
|---|---|---|
| **Empresa** | Catálogo de productos, proveedores, clientes, rangos y permisos, usuarios, lista de precios base | Un producto es el mismo en toda la empresa (mismo código, mismo nombre). Los permisos se definen una vez. |
| **Sucursal** | Stock, cajas y turnos, ventas, recepción de mercadería, **precio efectivo**, etiquetas, reposición, cuentas corrientes | Cada sucursal tiene su propio stock y su propia caja. Una sucursal en otra ciudad puede tener otros precios. |

La empresa define una **lista de precios base**; cada sucursal la hereda y puede
tener ajustes propios.

### Quién ve qué

- **Usuario de sucursal:** ve y opera **solo** los datos de su sucursal.
- **Rango con permiso "navegar entre sucursales":** puede cambiar de sucursal y
  operar en otra. (Reemplaza la idea de "usuario en varias sucursales".)
- **Dueño / super-admin de la empresa:** ve **todas** las sucursales, pero
  **elige cómo** — vista consolidada con desglose y drill-down, nunca todo
  encimado. También: crear sucursales, definir rangos, crear/asignar usuarios,
  mover stock entre sucursales.

## Rangos (permisos) — construido 2026-09-04

Cada empresa configura qué puede hacer cada rango. Es un RBAC definido por la
empresa: `Rango` (clonable, editable) + `RangoPermission` (una fila por clave
concedida, texto libre contra un catálogo del código — no un enum de base de
datos, para poder sumar permisos sin migrar nada).

- El sistema trae **7 rangos de fábrica**: Cajero, Repositor, **Recepción**
  (recibe mercadería, controla contra la factura, mermas, devoluciones a
  proveedor — separado de Administrativo a propósito, para que quien descarga
  el camión no sea necesariamente quien ajusta precios), Administrativo,
  Supervisor de caja, Encargado, Dueño (todos los permisos). La empresa los usa
  tal cual **o** los clona y modifica.
- Los permisos se muestran **agrupados por área** (Caja, Ventas, Stock, Compras,
  Precios, Productos, Proveedores, Clientes, Promociones, Depósitos, Usuarios,
  Rangos, Reportes, Sucursales) × acción — ver/crear/editar/anular donde
  encaja; Caja tiene sus propias acciones (operar, ver todas las cajas,
  autorizar anulación, administrar) porque no entraba bien en ese molde.
- Los permisos peligrosos se marcan distinto en la pantalla de Rangos.
- "Gestionar usuarios" y "gestionar rangos" son permisos separados a propósito
  — alguien puede dar de alta empleados sin poder redefinir qué puede hacer
  cada rango.
- **Un permiso nuevo nunca aparece solo en un rango de una empresa que ya
  existe** — ni siquiera en los de fábrica. Sólo entra en el catálogo para
  tenants nuevos; los que ya existen se actualizan a mano desde Rangos. Esto es
  deliberado (falla cerrado) y va a repetirse cada vez que un módulo existente
  sume una función nueva — hay que volver a esa pantalla y repartirla.
- Los permisos se resuelven **en cada pedido** contra la base, nunca cacheados
  en el token — y el token **no vence**: en este rubro no hay sesiones de 8
  horas, la gente se loguea una vez y se queda. Revocar es desactivar al
  usuario o sacarle el permiso, no esperar a que expire nada. El frontend
  igual se refresca solo (`GET /auth/me` al abrir la app), así un cambio de
  rango se nota sin desloguearse.

## Usuarios y su pantalla principal

| Rol | Vive en… | Necesita | Dispositivo |
|---|---|---|---|
| **Cajero** | La pantalla de caja, todo el día | Escanear rápido, ver precio/stock al toque, cobrar con varios medios, facturar, consultas de todo tipo | PC + lector + impresora térmica |
| **Supervisor de caja** | Apertura y cierre | Abrir turno con fondo, arqueo, movimientos de efectivo, cierre por medio de pago, ver todas las cajas de la sucursal | PC |
| **Repositor** | En los pasillos | Consultar stock, precios, listados de reposición, imprimir etiquetas | Celular / cualquier dispositivo con acceso; **las etiquetas se imprimen en una PC** |
| **Administrativo** | Escritorio | Carga de facturas de compra, vencimientos, ajuste de precios, correcciones de stock | PC |
| **Encargado** | Panorama general | Ventas, márgenes, caja, alertas, reportes de la sucursal | PC |
| **Dueño** | Consolidado de la empresa | Todo lo anterior, cruzado entre sucursales, a su manera | PC |

## Los trabajos del día (jobs)

1. **Cobrar en caja** — lo más crítico y lo más usado. Escanear → precio (según
   cliente) → cobrar con uno o varios medios → facturar (ARCA) → descontar stock.
   Tiene que ser rápido y a prueba de errores.
2. **Abrir / cerrar caja** — turno, fondo inicial, movimientos de efectivo
   durante el turno, arqueo contra lo que dice el sistema, diferencia
   (sobrante/faltante), cierre por medio de pago.
3. **Recibir mercadería** — llega la factura de la distribuidora → se carga →
   entra a stock de la sucursal → actualiza el costo.
4. **Controlar / reajustar precios** — por costo, por inflación, masivo (por
   rubro, marca, lista).
5. **Reponer** — qué está bajo el mínimo, qué se va a vencer, qué pedir y a
   quién; imprimir etiquetas de lo que cambió.
6. **Ver cómo va el negocio** — dashboard del encargado / consolidado del dueño.

## Conceptos de dominio que hay que construir o completar

Ordenados por peso para un mayorista:

### Imprescindibles

- **Cuenta corriente de clientes.** Los comercios chicos compran fiado y pagan
  después. Límite de crédito por cliente, "venta a cuenta corriente" como forma
  de pago, cobros contra la cuenta, estado de cuenta. Sin esto muchos mayoristas
  no pueden usar el sistema.
- **Caja / arqueo de verdad.** Fondo inicial, movimientos durante el turno
  (retiros a caja fuerte, ingresos de cambio, gastos menores), cierre contando
  efectivo y comparando con el sistema, diferencia y quién cerró, reporte por
  medio de pago. Varias cajas por sucursal, cada una con su turno. El cajero ve
  su caja; el supervisor ve todas.
- **Pago dividido.** Una venta puede pagarse con varios medios ($30.000 efectivo
  + $20.000 transferencia). Cada medio puede pedir datos extra (tarjeta:
  cuotas/lote/cupón; transferencia: confirmación; QR: id de operación) para poder
  cuadrar el arqueo.
- **Recargo / descuento por medio de pago.** Los mayoristas cobran más con
  tarjeta o descuentan por efectivo/transferencia.
- **Productos por peso (pesables).** Fiambres, a granel. Balanza, códigos de
  barras con peso embebido (prefijo 20–29), cantidad decimal.
- **Precios por tipo de cliente aplicados en caja.** Precio mostrador / mayorista
  / cliente grande. El cajero elige el cliente (o "consumidor final") y se aplica
  el precio correcto.

### Importantes

- **Transferencias de stock entre sucursales.** Mover mercadería de una sucursal
  a otra. Ya existen los tipos de movimiento; falta el flujo y el permiso.
- **Devoluciones / notas de crédito.** Cliente devuelve o la venta estuvo mal →
  nota de crédito fiscal, stock vuelve a entrar, plata sale o crédito a cuenta
  corriente.
- **Ofertas y tramos por cantidad en caja.** "Comprás 10+ y pagás menos" es core.
  Existen los tramos y las promociones configuradas; falta que la caja las
  aplique.
- **Reportes del encargado / dueño.** Ventas por día / sucursal / cajero / medio
  de pago; margen; más vendidos; sin rotación; stock valorizado; cuentas
  corrientes; comparativa entre sucursales; arqueos con diferencias.

### Convienen

- **Onboarding de empresa nueva.** Asistente guiado: crear sucursales, configurar
  ARCA, importar catálogo (sirve el catálogo de referencia), armar listas de
  precios, crear rangos, invitar usuarios. Si el onboarding duele, se van.
- **Etiquetas por lote.** "Imprimí las etiquetas de todos los productos que
  cambiaron de precio hoy". Distintos formatos (góndola, estantería, oferta).

## Sin definir todavía

- **Integración con ARCA.** Directa (web services WSFEv1) vs API de un tercero
  que maneje CAE, contingencia, etc. Para un equipo chico, un tercero suele ser
  lo sano. Se decide más adelante; la caja se diseña agnóstica.
- Cómo factura el SaaS a los mayoristas (por sucursal / por usuario / plano).

## Distancia entre el código actual y este objetivo

Al momento de escribir esto (2026-09):

- **Roles:** construido — reemplazados por completo por el sistema de rangos
  (`User.rangoId`, ya no existe `role`). Autorizar anular un ítem del carrito
  ahora valida el permiso `caja.autorizar_anulacion` de quien presta sus
  credenciales, no un rol fijo.
- **Sucursal:** no hay modelo de sucursal; se usa `Warehouse` (depósito). Hay que
  separar los conceptos.
- **Caja / turno / arqueo:** construido — `CashRegister`/`CashShift`/
  `CashMovement`. Apertura con fondo, movimientos durante el turno, cierre con
  arqueo (esperado/contado/diferencia) y desglose por medio de pago. Sin turno
  abierto no se vende. Falta: varias cajas por sucursal se pueden crear pero la
  UI de apertura no ofrece elegir cuál si hay más de una en pantallas fuera de
  la caja (sólo la propia pantalla de apertura las lista).
- **Pago:** construido el pago dividido — `SalePayment`, varios medios por
  venta (`cash | card | transfer | qr | account`) que tienen que sumar el
  total. Falta el recargo/descuento por medio de pago: hoy el total no cambia
  según cómo se pague.
- **Cuenta corriente:** construida — límite de crédito por cliente, "account"
  como medio de pago, `CustomerAccountMovement` (venta/cobro/ajuste, saldo
  cacheado), estado de cuenta y cobro manual.
- **Pesables:** construido para el flujo de mostrador — `Product.isWeighed`,
  parseo del código de balanza (prefijo 20-29) en la caja. Falta integración
  real de balanza (esto asume que el código ya viene escaneado) y el mismo
  parseo en otras pantallas si hiciera falta (hoy sólo caja).
- **Base sólida que se conserva:** libro de stock append-only con lotes y
  vencimientos, multi-tenant por `tenant_id`, facturas de compra con corrección,
  listas de precios con derivación y vigencia, historial de precios, ventas que
  no se editan (solo se anulan), catálogo de referencia global.
