# Abasto

ERP multi-empresa para negocios que **compran, stockean y venden mercadería en
mostrador** (mayoristas, autoservicios, almacenes, distribuidoras…), pensado como
servicio (SaaS B2B) para Argentina.

> **In English, briefly** — Abasto is a multi-tenant ERP for Argentine
> cash-&-carry / wholesale retail: purchasing, stock ledger with lots and expiry,
> POS with split payments, cash-drawer shifts and reconciliation, customer credit
> accounts, price lists, and a company-defined permission system (*rangos*).
> Backend is NestJS + Prisma + PostgreSQL; frontend is React + Vite. Early,
> foundational stage — no test suite, no lint config yet. Setup instructions are
> below (in Spanish).

Documento de trabajo, no vidriera. Para la visión completa, leer
[`docs/producto.md`](docs/producto.md) y [`docs/diseno.md`](docs/diseno.md): son
las estrellas polares del proyecto y se chequean antes de construir cualquier
pantalla o cambiar el modelo de datos.

---

## Qué es

Un ERP para negocios que hacen siempre el mismo trabajo — *comprar mercadería,
stockearla, venderla en mostrador, cobrar en caja* — a distinto tamaño y
profundidad. Los sustantivos no cambian (producto, stock, lote, proveedor,
cliente, precio, caja, turno); cambia el volumen.

- **Contra quién se diseña:** el **supermercado mayorista**. Es el caso más
  exigente (varias sucursales, cuenta corriente, pesables, lotes con
  vencimiento, factura A con IVA discriminado, personal con roles separados) y
  el que más paga por que el sistema no falle. Un kiosco es el mismo sistema con
  las partes duras apagadas.
- **Venta 100% presencial, cash & carry:** el cliente entra, agarra, pasa por
  caja, se escanea, paga (efectivo, tarjeta, transferencia, QR, cuenta
  corriente) y se va. No hay pedidos por teléfono ni reparto.
- **Multi-empresa:** cada negocio es una *empresa* aislada. Un esquema de
  Postgres compartido; el tenant sale siempre del JWT, nunca del cliente.
- **Facturación por ARCA:** todavía sin integrar. Se diseña tratando a ARCA como
  una caja negra que recibe una venta y devuelve un CAE.
- **Progresividad:** el caso simple (una sucursal, un usuario, sin cuenta
  corriente, sin lotes) es el *default*, no una configuración que hay que
  desarmar. El escritorio y las rutas se arman por permiso.
- **IA como capa transversal:** no un módulo, sino algo que se invoca con
  `Ctrl+K`, lee lo que ya está en el sistema y responde en contexto. Regla:
  **sugiere, nunca decide.** (Hoy `Ctrl+K` sólo salta entre módulos.)

**Fuera de alcance:** rubros cuyo sustantivo central es "un turno en un
calendario con una persona" (consultorio, peluquería, taller). Es otro núcleo,
no otro módulo.

## Estado actual (2026-09)

Etapa fundacional. **No hay suite de tests ni configuración de lint todavía.**

**Construido y en pie:**

- **Rangos (RBAC por empresa):** 7 rangos de fábrica (Cajero, Repositor,
  Recepción, Administrativo, Supervisor de caja, Encargado, Dueño), clonables y
  editables. Permisos resueltos en cada request contra la base; el token **no
  vence** (se revoca desactivando al usuario o sacándole el permiso).
- **Libro de stock append-only:** existencia = `SUM(quantity)` por
  tenant/producto/lote/depósito. Escrituras bajo `pg_advisory_xact_lock` +
  `Serializable` para evitar stock negativo y carreras.
- **Facturas de compra:** `draft` → `confirm` (genera movimientos `purchase_in`)
  → `corrected` (revierte, re-crea y snapshotea la versión anterior).
- **Caja / turno / arqueo:** apertura con fondo, movimientos durante el turno,
  cierre con arqueo (esperado / contado / diferencia) y desglose por medio de
  pago. Sin turno abierto no se vende.
- **Pago dividido:** varios medios por venta (`cash | card | transfer | qr |
  account`) que tienen que sumar el total.
- **Cuenta corriente de clientes:** límite de crédito, "account" como medio de
  pago, movimientos y cobros, estado de cuenta.
- **Pesables:** `Product.isWeighed`, parseo de código de balanza (prefijo 20–29)
  en la caja.
- **Precios:** listas con derivación y vigencia, historial de precios, reglas y
  tramos por cantidad, promociones configurables.
- **Ventas:** no se editan, sólo se anulan. Anular un ítem del carrito pide
  autorización de alguien con el permiso `caja.autorizar_anulacion`.
- **Frontend — el escritorio:** grilla de módulos armada por permiso, con dato
  vivo por tarjeta, sin riel de navegación. Caja a pantalla completa. Exportar
  (Excel / CSV / copiar) en los listados principales.
- **Catálogo de referencia global** para autocompletar productos por código de
  barras.

**Pendiente / conocido:**

- **Sucursal como entidad propia:** hoy se usa `Warehouse` (depósito) para las
  dos cosas; hay que separarlas.
- **Integración con ARCA**, recargo/descuento por medio de pago,
  devoluciones / notas de crédito, transferencias de stock entre sucursales.
- **Capa de IA real en `Ctrl+K`** (hoy sólo navega).
- **Zona horaria:** las columnas `DateTime` son `timestamp without time zone` y
  el sistema mezcla convenciones (Prisma escribe UTC, `@default(now())` escribe
  local). Pendiente pasarlas a `timestamptz`.

## Cómo está organizado

```
backend/    API NestJS + TypeScript + Prisma (PostgreSQL). Corre con tsx, sin build.
frontend/   SPA React + TypeScript + Vite + Tailwind v4.
infra/docker/  compose.yml — Postgres 16 para desarrollo local.
docs/       Decisiones de producto, diseño, modelo de datos y API (en español).
graphify-out/  Grafo de conocimiento del código (ver más abajo).
```

No hay `package.json` en la raíz: `backend/` y `frontend/` son proyectos npm
independientes.

## Cómo montar todo

### Requisitos

- **Node.js ≥ 20** y npm.
- **PostgreSQL 16** — vía Docker (recomendado, portable) o instalación nativa.
- Docker + Docker Compose, sólo si se usa la opción Docker para la base.

### 1. Base de datos

**Opción A — Docker (recomendada).** Desde la raíz del repo:

```bash
docker compose -f infra/docker/compose.yml up -d
```

Levanta Postgres 16 en `localhost:5432` con base `abasto`, usuario `postgres` y
contraseña `postgres` — que es exactamente lo que espera el `DATABASE_URL` de
ejemplo. Para apagarlo: `docker compose -f infra/docker/compose.yml down` (agregar
`-v` para borrar también los datos).

**Opción B — Postgres nativo.** Instalar PostgreSQL 16, crear una base vacía
llamada `abasto` y ajustar `DATABASE_URL` en `backend/.env` con el usuario,
contraseña y puerto reales. (En la máquina de desarrollo principal Postgres corre
así, como servicio nativo en `localhost:5432`.)

### 2. Backend

Desde `backend/`:

```bash
cp .env.example .env          # PowerShell: copy .env.example .env
```

Editar `.env` y poner un `JWT_SECRET` largo y aleatorio. Ajustar `DATABASE_URL`
si se usó la opción B. Después:

```bash
npm install
npm run db:generate           # prisma generate (genera el cliente tipado)
npm run db:migrate            # prisma migrate deploy (aplica todas las migraciones)
npm run db:seed               # opcional: carga el catálogo de referencia global
npm run start:dev            # API en http://localhost:3000/api (watch con tsx)
```

Verificar: `curl http://localhost:3000/api/health` → `{"status":"ok","database":"ok"}`.

### 3. Frontend

Desde `frontend/`:

```bash
cp .env.example .env          # opcional; el default ya apunta a http://localhost:3000/api
npm install
npm run dev                   # Vite en http://localhost:5173
```

### 4. Crear la primera empresa

No hay usuario semilla. Abrir el frontend, ir a **`/signup`** y crear la empresa +
el primer usuario (queda como **Dueño**, con todos los permisos). Toda empresa
nace operable: se crea sola una sucursal ("Casa Central"), su caja ("Caja 1") y
una lista de precios base ("Mostrador").

`POST /api/auth/signup` es la única forma de crear un tenant nuevo.

### 5. Datos de demo (opcional)

Para ver el sistema con productos, stock, dos semanas de ventas, clientes con
deuda y lotes por vencer:

```bash
# desde backend/, con la empresa ya creada en el paso 4
npm run db:seed-demo -- "<nombre exacto de la empresa>"
```

Es idempotente por marca (sólo toca lo que él mismo creó, con barcode `779DEMO…`).

## Comandos

**Backend** (desde `backend/`):

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | API con recarga (`tsx watch`) |
| `npm run start` | API sin watch |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Carga el catálogo de referencia global |
| `npm run db:seed-demo -- "<empresa>"` | Datos de demo para una empresa |
| `npx prisma migrate dev --name <nombre>` | Crear una migración nueva |

**Frontend** (desde `frontend/`):

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | Sirve el build |

## Variables de entorno

**`backend/.env`**

| Variable | Ejemplo | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/abasto` | Cadena de conexión de Prisma |
| `JWT_SECRET` | *(cadena larga y aleatoria)* | Firma los JWT. Hay un default inseguro para desarrollo. |
| `PORT` | `3000` | Opcional; puerto de la API (default `3000`) |

**`frontend/.env`**

| Variable | Ejemplo | Notas |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000/api` | Base de la API. Opcional; ese es el default. |

## Arquitectura en 30 segundos

- **Multi-tenancy:** un esquema compartido, cada tabla de negocio con
  `tenant_id`. El tenant se deriva server-side del JWT (`request.user.tenantId`),
  nunca se acepta del cliente. Los modelos padre declaran `@@unique([id,
  tenantId])` y los hijos referencian `[parentId, tenantId]` como FK, así un hijo
  sólo puede unirse a un padre del mismo tenant.
- **Auth:** `JwtAuthGuard` por controlador con `@UseGuards`, verifica el Bearer
  token y puebla `request.user`. `PermissionGuard` valida permisos de rango.
  Contraseñas con Argon2id.
- **Validación:** los controladores/servicios validan los bodies a mano
  (`typeof`, `BadRequestException` / `UnprocessableEntityException` /
  `ConflictException`), no DTOs + class-validator, aunque haya un `ValidationPipe`
  global. Controladores finos: los recursos simples llaman a Prisma directo, lo
  transaccional va a un servicio co-ubicado (`stock.service.ts`,
  `purchases.service.ts`, `caja.service.ts`, …).
- **Frontend:** rutas en `frontend/src/App.tsx`, una pantalla por archivo en
  `frontend/src/pages/`, wrapper `api()` en `lib/api.ts`, sesión en
  `localStorage` (`lib/auth-context.tsx`, `useAuth().can(...)`). La navegación es
  **el escritorio** (`/`): grilla de módulos armada por permiso; `ProtectedRoute`
  filtra por sesión, `PermissionRoute` por clave de permiso, `FullScreenRoute` es
  el modo sin marco de la caja.

## Documentación

Todo en `docs/`, en español:

| Archivo | Contenido |
|---|---|
| [`docs/producto.md`](docs/producto.md) | **Estrella polar.** Qué es el sistema, alcance, quién lo usa, los trabajos del día. |
| [`docs/diseno.md`](docs/diseno.md) | **Estrella polar del diseño.** Sistema visual, reglas, el escritorio, navegación. |
| [`docs/modelo-datos-base.md`](docs/modelo-datos-base.md) | Estrategia multi-tenant y tablas principales. |
| [`docs/api.md`](docs/api.md) | Endpoints base de la API. |
| [`docs/investigacion-compras-recepcion-stock.md`](docs/investigacion-compras-recepcion-stock.md) | Investigación del flujo compras → recepción → stock. |
| [`docs/catalogo-referencia-categorias.md`](docs/catalogo-referencia-categorias.md) | Catálogo de referencia y categorías. |

`CLAUDE.md` / `AGENTS.md` son guías para asistentes de IA que trabajan sobre el
repo.

### graphify

El repo trae un grafo de conocimiento del código en `graphify-out/`. Para
preguntas sobre la base de código:

```bash
graphify query "<pregunta>"      # subgrafo acotado a la pregunta
graphify explain "<concepto>"
graphify path "<A>" "<B>"         # relación entre dos símbolos
graphify update .                # regenerar tras cambios (sólo AST, sin costo de API)
```
