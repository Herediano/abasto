# Graph Report - abasto  (2026-09-06)

## Corpus Check
- 230 files · ~143,519 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1721 nodes · 4441 edges · 114 communities (81 shown, 14 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 158 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4e83954d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- CategoriesPage
- app.module.ts
- dependencies
- AuthService
- "tenants"
- AuthRequest
- 3. Diseño — adherencia al sistema visual
- graphify Skill Pipeline (Claude Code)
- StockService
- escritorio-page.tsx
- promotions.controller.ts
- compilerOptions
- PurchasesController
- PosPage
- errorMessage
- auth-background.tsx
- dependencies
- price-import.util.ts
- Product Definition (Abasto Vision)
- PricesController
- BootstrapService
- PriceListsController
- SuppliersPage
- products.controller.ts
- CustomersController
- i18n/utils.ts
- StockInPage
- SalesService
- ventas-chart.tsx
- seed-demo.ts
- compilerOptions
- devDependencies
- api
- seed.ts
- enrich-reference-categories.ts
- Mayorista ERP Project Overview
- Rangos Permission System (RBAC)
- Tenants Controller
- BranchesController
- .token
- compilerOptions
- scripts
- main.ts
- PriceActivationService
- user-menu.tsx
- Base Data Model
- ProductReferenceController
- allowScripts
- import-reference-from-xlsx.ts
- credit-notes.service.ts
- WarehousesPage
- landing/package.json
- backend/package.json
- PrismaModule
- CategoriesController
- ReportesController
- ExpirationsPage
- EscritorioController
- HealthController
- SuppliersController
- CajaService
- SupervisorAuthDialog
- graphify.js
- @nestjs/platform-express
- PriceRulesController
- @prisma/client
- reflect-metadata
- 0015_product_reference/migration.sql
- Controller
- Mayorista ERP README Overview
- rxjs
- SalesHistoryPage
- Abasto — landing
- RangosService
- WarehousesController
- landing/tsconfig.json
- Diseño — Abasto
- Get
- products table
- useTheme
- CreditNotesService
- Inject
- purchases.service.ts
- UsersPage
- .constructor
- Req
- ajustes-page.tsx
- modules.tsx
- escritorio.ts
- prefs.ts
- UseGuards
- PurchasesService
- SucursalesSection
- opencode.json

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 141 edges
2. `RequirePermission()` - 114 edges
3. `errorMessage()` - 112 edges
4. `api` - 105 edges
5. `cn()` - 73 edges
6. `useAuth()` - 72 edges
7. `PrismaService` - 61 edges
8. `JwtAuthGuard` - 31 edges
9. `"tenants"` - 31 edges
10. `ProductsController` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Mayorista ERP README Overview` --semantically_similar_to--> `Mayorista ERP Project Overview`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Purchase Invoice Lifecycle (draft/confirm/corrected)` --references--> `PurchasesService`  [EXTRACTED]
  CLAUDE.md → backend/src/purchases.service.ts
- `Manual Validation Style (no DTOs)` --references--> `PurchasesService`  [EXTRACTED]
  CLAUDE.md → backend/src/purchases.service.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `AuthRequest`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.types.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `AuthService`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.service.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Platform Skill Mirror (Claude Code vs OpenCode)** — _claude_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_mention_dispatch, _claude_skills_graphify_skill_subagent_dispatch_requirement [INFERRED 0.85]
- **Modular Step-to-Reference Delegation Pattern** — _claude_skills_graphify_skill_pipeline, _claude_skills_graphify_references_github_and_merge_doc, _claude_skills_graphify_references_transcribe_doc, _claude_skills_graphify_references_extraction_spec_doc, _claude_skills_graphify_references_exports_doc [INFERRED 0.85]
- **Multi-Tenant Data Isolation Pattern** — claude_multi_tenancy, docs_modelo_datos_base_overview, backend_prisma_schema_schema, docs_producto_empresa_sucursal_usuario [INFERRED 0.85]
- **Purchase Invoice Confirmation Flow** — claude_purchase_invoice_lifecycle, docs_investigacion_compras_flow, docs_api_purchases_endpoints, backend_src_purchases_service_purchasesservice, docs_modelo_datos_base_stock_movements [INFERRED 0.85]

## Communities (114 total, 14 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.05
Nodes (154): frontend/index.html Entry Point, App(), EmptyState(), ExportMenu(), download(), Field(), PermissionRoute(), FullScreenRoute() (+146 more)

### Community 1 - "CategoriesPage"
Cohesion: 0.33
Nodes (3): CategoriesPage(), confirmDelete(), submit()

### Community 2 - "app.module.ts"
Cohesion: 0.13
Nodes (24): JwtAuthGuard, Injectable, TIMEZONES, AuthUser, METODOS_PAGO, CashRegistersController, TIPOS_MOVIMIENTO, Usuario (+16 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (48): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, @phosphor-icons/react, @radix-ui/react-checkbox, @radix-ui/react-dialog (+40 more)

### Community 4 - "AuthService"
Cohesion: 0.05
Nodes (34): AuthController, Body, Controller, Get, Inject, Post, Req, UseGuards (+26 more)

### Community 5 - ""tenants""
Cohesion: 0.11
Nodes (31): "customers", "product_lots", "products", "suppliers", "tenants", "warehouses", "stock_movements", "users" (+23 more)

### Community 6 - "AuthRequest"
Cohesion: 0.15
Nodes (20): AuthRequest, assertTaxRate(), parseOptionalDecimal(), ProductsController, Body, Controller, Delete, Get (+12 more)

### Community 7 - "3. Diseño — adherencia al sistema visual"
Cohesion: 0.07
Nodes (28): 1. Veredicto, 2. Lo que está sólido — no tocar, 3.10 Login — ¿segunda apuesta de carácter?, 3.1 La escala tipográfica no se aplica  · *alto impacto, bajo esfuerzo*, 3.2 Valores arbitrarios  · *el doc: "no se usan valores sueltos"*, 3.3 Color — el verde sólido como estado, 3.4 Radio inconsistente, 3.5 Elevación — "todo lo demás está al ras" (+20 more)

### Community 8 - "graphify Skill Pipeline (Claude Code)"
Cohesion: 0.07
Nodes (39): CLAUDE.md graphify Pointer, Add URL & Watch Folder Reference, Extra Exports & Benchmark Reference, Confidence Score Rubric, Extraction Subagent Prompt Spec, Node ID Format Rule, GitHub Clone & Cross-Repo Merge Reference, Commit Hook & CLAUDE.md Integration Reference (+31 more)

### Community 9 - "StockService"
Cohesion: 0.11
Nodes (18): StockController, Body, Controller, Get, Inject, Param, Post, Query (+10 more)

### Community 10 - "escritorio-page.tsx"
Cohesion: 0.15
Nodes (17): BranchSwitcher(), usePalette(), activeBranchFor(), read(), setActiveBranch(), Stored, pendientes(), AccionTile() (+9 more)

### Community 11 - "promotions.controller.ts"
Cohesion: 0.10
Nodes (21): describirPromo(), entero(), monto(), parseConfig(), PromotionsController, SCOPES, Tipo, TIPO_LABEL (+13 more)

### Community 12 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 13 - "PurchasesController"
Cohesion: 0.24
Nodes (8): PurchasesController, Body, Controller, Get, Param, Post, Req, UseGuards

### Community 14 - "PosPage"
Cohesion: 0.12
Nodes (12): parseWeighedBarcode(), fmtHora(), PosPage(), abrirTurno(), agregarMovimiento(), cambiarCantidad(), cerrarTurno(), cobrar() (+4 more)

### Community 15 - "errorMessage"
Cohesion: 0.14
Nodes (23): errorMessage(), EmpresaSection(), pickLogo(), submit(), submit(), submit(), PricesPage(), addTramo() (+15 more)

### Community 16 - "auth-background.tsx"
Cohesion: 0.16
Nodes (20): AuthBackground(), alCambiarVisibilidad(), crearFormas(), dibujar(), elegirPosicionLado(), loop(), obtenerRectObstaculo(), paso() (+12 more)

### Community 17 - "dependencies"
Cohesion: 0.11
Nodes (19): argon2, dependencies, argon2, class-transformer, class-validator, exceljs, jsonwebtoken, @nestjs/common (+11 more)

### Community 18 - "price-import.util.ts"
Cohesion: 0.20
Nodes (14): BARCODE_ALIASES, COST_ALIASES, detectDelimiter(), findColumn(), matrixFromCsv(), matrixFromXlsx(), NAME_ALIASES, normalizeHeader() (+6 more)

### Community 19 - "Product Definition (Abasto Vision)"
Cohesion: 0.17
Nodes (12): Integración con ARCA (sin definir), Caja / Arqueo, CashMovement Model, CashRegister Model, CashShift Model, Cuenta Corriente de Clientes, CustomerAccountMovement Model, Empresa → Sucursal → Usuario Structure (+4 more)

### Community 20 - "PricesController"
Cohesion: 0.15
Nodes (13): activarPreciosVigentes(), PricesController, Body, Controller, Delete, Get, Inject, Param (+5 more)

### Community 21 - "BootstrapService"
Cohesion: 0.40
Nodes (3): BootstrapService, Inject, Injectable

### Community 22 - "PriceListsController"
Cohesion: 0.15
Nodes (13): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+5 more)

### Community 24 - "products.controller.ts"
Cohesion: 0.08
Nodes (33): Decimalish, priceChange(), PriceField, PriceHistoryEntry, PriceSource, toNumber(), Db, guardarPrecio() (+25 more)

### Community 25 - "CustomersController"
Cohesion: 0.16
Nodes (12): CustomersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 26 - "i18n/utils.ts"
Cohesion: 0.06
Nodes (34): lang, t, year, home, lang, links, t, enHref (+26 more)

### Community 27 - "StockInPage"
Cohesion: 0.16
Nodes (8): draftKey(), readDraft(), StockInPage(), addLine(), cancelCorrection(), createProductInline(), submit(), submitCancelInvoice()

### Community 28 - "SalesService"
Cohesion: 0.05
Nodes (40): registrarMovimientoCuenta(), CuentasCorrientesController, Body, Controller, Get, Inject, Param, Post (+32 more)

### Community 29 - "ventas-chart.tsx"
Cohesion: 0.21
Nodes (11): COMPARA, fmt(), Metric, METRICS, pct(), Period, PERIODS, Serie (+3 more)

### Community 30 - "seed-demo.ts"
Cohesion: 0.24
Nodes (13): bare(), CATEGORIAS, CLIENTES, daysAgo(), daysFromNow(), main(), money(), pad() (+5 more)

### Community 31 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, module, moduleResolution, outDir, skipLibCheck (+5 more)

### Community 32 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, prisma, tsx, @types/express, @types/multer, @types/node, typescript, typescript (+5 more)

### Community 33 - "api"
Cohesion: 0.12
Nodes (24): api, AjustesPagoDialog(), guardar(), PasswordSection(), submit(), PerfilSection(), submit(), CustomersPage() (+16 more)

### Community 35 - "enrich-reference-categories.ts"
Cohesion: 0.27
Nodes (11): apiGet(), Categoria, HEADERS, main(), pickSucursalBatches(), prisma, Producto, productosDeRubro() (+3 more)

### Community 36 - "Mayorista ERP Project Overview"
Cohesion: 0.22
Nodes (11): Graphify Knowledge Graph Workflow (AGENTS.md), main.ts Bootstrap (ValidationPipe), Frontend Architecture (single App.tsx, no router), Graphify Knowledge Graph Workflow (CLAUDE.md), Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger, Manual Validation Style (no DTOs) (+3 more)

### Community 37 - "Rangos Permission System (RBAC)"
Cohesion: 0.33
Nodes (7): Prisma schema.prisma, Multi-Tenancy Strategy, GET /auth/me Endpoint, caja.autorizar_anulacion Permission, RangoPermission Model, Rangos Permission System (RBAC), User.rangoId Field

### Community 38 - "Tenants Controller"
Cohesion: 0.24
Nodes (7): TenantsController, Controller, Get, Inject, Param, Req, UseGuards

### Community 39 - "BranchesController"
Cohesion: 0.18
Nodes (12): BranchesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 40 - ".token"
Cohesion: 0.20
Nodes (11): RangosPage(), abrirEdicion(), borrar(), crear(), guardar(), ProductsPage(), clearCatalog(), createCategory() (+3 more)

### Community 41 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include, vite.config.ts

### Community 42 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, db:enrich-categories, db:generate, db:import-reference, db:migrate, db:seed, db:seed-demo, start (+1 more)

### Community 43 - "main.ts"
Cohesion: 0.32
Nodes (5): AppModule, Module, bootstrap(), PrismaExceptionFilter, Catch

### Community 44 - "PriceActivationService"
Cohesion: 0.32
Nodes (4): PriceActivationService, Inject, Injectable, Cron

### Community 45 - "user-menu.tsx"
Cohesion: 0.33
Nodes (7): AccountList(), iniciales(), haceCuanto(), iniciales(), inicioDeSesion(), UserMenu(), AVATAR_COLORS

### Community 46 - "Base Data Model"
Cohesion: 0.50
Nodes (8): Catalog Endpoints (Warehouses/Suppliers/Lots), customers table, Base Data Model, product_lots table, stock_movements table, suppliers table, tenants table, warehouses table

### Community 47 - "ProductReferenceController"
Cohesion: 0.25
Nodes (6): ProductReferenceController, Controller, Get, Inject, Param, UseGuards

### Community 48 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, argon2@0.45.1, esbuild@0.28.2, prisma@6.19.3, @prisma/client@6.19.3, @prisma/engines@6.19.3

### Community 49 - "import-reference-from-xlsx.ts"
Cohesion: 0.47
Nodes (5): cellText(), findColumn(), HEADERS, main(), prisma

### Community 50 - "credit-notes.service.ts"
Cohesion: 0.40
Nodes (3): REFUND_METHODS, Usuario, Db

### Community 51 - "WarehousesPage"
Cohesion: 0.33
Nodes (3): WarehousesPage(), submit(), submitCaja()

### Community 52 - "landing/package.json"
Cohesion: 0.08
Nodes (25): astro, @astrojs/sitemap, @fontsource/bricolage-grotesque, @fontsource/spline-sans, @fontsource/spline-sans-mono, dependencies, astro, @astrojs/sitemap (+17 more)

### Community 53 - "backend/package.json"
Cohesion: 0.40
Nodes (4): name, prisma, seed, private

### Community 54 - "PrismaModule"
Cohesion: 0.67
Nodes (3): PrismaModule, Module, Global

### Community 55 - "CategoriesController"
Cohesion: 0.16
Nodes (12): CategoriesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 56 - "ReportesController"
Cohesion: 0.25
Nodes (7): ReportesController, Controller, Get, Inject, Query, Req, UseGuards

### Community 57 - "ExpirationsPage"
Cohesion: 0.40
Nodes (4): daysRemaining(), ExpirationsPage(), submitEdit(), urgencyBadge()

### Community 58 - "EscritorioController"
Cohesion: 0.25
Nodes (6): EscritorioController, Controller, Get, Inject, Req, UseGuards

### Community 59 - "HealthController"
Cohesion: 0.33
Nodes (4): HealthController, Controller, Get, Inject

### Community 60 - "SuppliersController"
Cohesion: 0.15
Nodes (12): SuppliersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 61 - "CajaService"
Cohesion: 0.10
Nodes (16): CashShiftsController, Body, Controller, Get, Inject, Param, Post, Query (+8 more)

### Community 62 - "SupervisorAuthDialog"
Cohesion: 1.00
Nodes (3): SupervisorAuthDialog(), reset(), submit()

### Community 65 - "PriceRulesController"
Cohesion: 0.21
Nodes (10): PriceRulesController, Body, Controller, Delete, Get, Param, Post, Put (+2 more)

### Community 88 - "Mayorista ERP README Overview"
Cohesion: 0.20
Nodes (9): classify-reference-categories.ts script, enrich-reference-categories.ts script, Auth Endpoints (signup/login/users), API Base Reference, Products Endpoints, Brand/Keyword Offline Classifier, Reference Catalog Category Classification, Precios Claros API (category tree) (+1 more)

### Community 90 - "SalesHistoryPage"
Cohesion: 0.40
Nodes (5): comprobante(), fechaHora(), SalesHistoryPage(), anular(), confirmarDevolucion()

### Community 91 - "Abasto — landing"
Cohesion: 0.25
Nodes (7): Abasto — landing, Correr, Cómo está armado, Deploy en Cloudflare Pages, El fondo, Pendientes (TO-DO), Sincronizar el tema con la app

### Community 92 - "RangosService"
Cohesion: 0.11
Nodes (14): RangosController, Body, Controller, Delete, Get, Inject, Param, Post (+6 more)

### Community 93 - "WarehousesController"
Cohesion: 0.15
Nodes (12): Body, Controller, Get, Inject, Param, Post, Put, Query (+4 more)

### Community 94 - "landing/tsconfig.json"
Cohesion: 0.25
Nodes (7): exclude, extends, include, **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist

### Community 95 - "Diseño — Abasto"
Cohesion: 0.06
Nodes (36): Base y semántica, Color, Color por módulo — identidad, no estado, Configurable, Cómo leer este documento, Deudas conocidas, Diseño — Abasto, El celular (+28 more)

### Community 97 - "products table"
Cohesion: 0.17
Nodes (13): Category Model (per-tenant), POST /products/import-reference, product_reference Global Table, GET /product-reference/:ean, SEPA Open Data Source, ARCA: Emisión y Autorización de Factura Electrónica, ARCA: Régimen General y Clases de Comprobantes, GS1 Global Traceability Standard (+5 more)

### Community 99 - "useTheme"
Cohesion: 0.43
Nodes (6): aplicar(), leer(), prefiereOscuro(), Theme, useTheme(), PreferenciasSection()

### Community 100 - "CreditNotesService"
Cohesion: 0.12
Nodes (15): CreditNotesController, Body, Controller, Get, Inject, Param, Post, Query (+7 more)

### Community 102 - "purchases.service.ts"
Cohesion: 0.40
Nodes (4): CORRECTABLE_STATUSES, InvoiceLineInput, OtherTax, OtherTaxInput

### Community 103 - "UsersPage"
Cohesion: 0.40
Nodes (3): UsersPage(), submitCreate(), submitEdit()

### Community 106 - "ajustes-page.tsx"
Cohesion: 0.13
Nodes (14): Branch, PaymentAdjustment, PaymentMethod, fileToResizedDataUrl(), hueFor(), moduleByKey(), settingsModules(), AjustesPage() (+6 more)

### Community 107 - "modules.tsx"
Cohesion: 0.15
Nodes (11): CommandPalette(), norm(), EscritorioShell(), PaletteContext, BY_KEY, gridModules(), HUES, ModuleDef (+3 more)

### Community 108 - "escritorio.ts"
Cohesion: 0.36
Nodes (8): compact(), ejemplos(), EscritorioSummary, lc(), Pendiente, plural(), statFor(), TileStat

### Community 109 - "prefs.ts"
Cohesion: 0.36
Nodes (7): aplicarDensidad(), Density, leerDensidad(), leerTiles(), TileSize, useDensity(), useTiles()

### Community 111 - "PurchasesService"
Cohesion: 0.27
Nodes (4): Inject, PurchasesService, Inject, Injectable

### Community 112 - "SucursalesSection"
Cohesion: 0.40
Nodes (3): SucursalesSection(), accion(), submit()

### Community 115 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **382 isolated node(s):** `1. Veredicto`, `2. Lo que está sólido — no tocar`, `3.1 La escala tipográfica no se aplica  · *alto impacto, bajo esfuerzo*`, `3.2 Valores arbitrarios  · *el doc: "no se usan valores sueltos"*`, `3.3 Color — el verde sólido como estado` (+377 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 647 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `AuthService` to `.token`, `app.module.ts`, `Mayorista ERP Project Overview`?**
  _High betweenness centrality (0.236) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `AuthRequest` to `app.module.ts`, `AuthService`, `StockService`, `promotions.controller.ts`, `PurchasesController`, `PricesController`, `PriceListsController`, `products.controller.ts`, `CustomersController`, `SalesService`, `Tenants Controller`, `BranchesController`, `CategoriesController`, `ReportesController`, `SuppliersController`, `CajaService`, `PriceRulesController`, `RangosService`, `WarehousesController`, `CreditNotesService`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `api` connect `api` to `api.ts`, `CategoriesPage`, `UsersPage`, `.token`, `escritorio-page.tsx`, `ajustes-page.tsx`, `PosPage`, `errorMessage`, `SucursalesSection`, `WarehousesPage`, `SuppliersPage`, `ExpirationsPage`, `SalesHistoryPage`, `StockInPage`, `ventas-chart.tsx`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **What connects `1. Veredicto`, `2. Lo que está sólido — no tocar`, `3.1 La escala tipográfica no se aplica  · *alto impacto, bajo esfuerzo*` to the rest of the system?**
  _382 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05396584100867388 - nodes in this community are weakly interconnected._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._