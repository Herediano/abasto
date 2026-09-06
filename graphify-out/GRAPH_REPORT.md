# Graph Report - abasto  (2026-09-06)

## Corpus Check
- 221 files · ~131,624 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1611 nodes · 4100 edges · 116 communities (88 shown, 9 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 150 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `284ea6dc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- SalesService
- app.module.ts
- dependencies
- AuthService
- "tenants"
- AuthRequest
- prices.service.ts
- graphify Skill Pipeline (Claude Code)
- StockService
- escritorio-page.tsx
- PromotionsController
- compilerOptions
- PurchasesController
- money
- .token
- auth-background.tsx
- dependencies
- price-import.util.ts
- Product Definition (Abasto Vision)
- PricesController
- Purchases/Reception/Stock Research
- PriceListsController
- RequirePermission
- WarehousesPage
- CustomersController
- i18n/utils.ts
- StockInPage
- CajaService
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
- RangosController
- compilerOptions
- scripts
- main.ts
- PriceActivationService
- ProductReferenceController
- Base Data Model
- user-menu.tsx
- allowScripts
- import-reference-from-xlsx.ts
- errorMessage
- SuppliersController
- landing/package.json
- backend/package.json
- SalesController
- CategoriesController
- ReportesController
- RangosPage
- EscritorioController
- PriceRulesController
- AuthController
- SupervisorAuthDialog
- App
- graphify.js
- @nestjs/platform-express
- PurchasesService
- @prisma/client
- reflect-metadata
- 0015_product_reference/migration.sql
- SuppliersPage
- products table
- rxjs
- SalesHistoryPage
- Abasto — landing
- HealthController
- WarehousesController
- landing/tsconfig.json
- Diseño — Abasto
- StockController
- RangosService
- BootstrapService
- purchases.service.ts
- EmpresaSection
- .update
- PrismaModule
- .constructor
- permissions.catalog.ts
- modules.tsx
- command-palette.tsx
- escritorio.ts
- prefs.ts
- useTheme
- CategoriesPage
- product-search.util.ts
- ProductSearchDialog
- branch.ts
- opencode.json

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 127 edges
2. `errorMessage()` - 104 edges
3. `RequirePermission()` - 102 edges
4. `api` - 97 edges
5. `cn()` - 72 edges
6. `useAuth()` - 68 edges
7. `PrismaService` - 60 edges
8. `"tenants"` - 31 edges
9. `JwtAuthGuard` - 30 edges
10. `ProductsController` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Mayorista ERP README Overview` --semantically_similar_to--> `Mayorista ERP Project Overview`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `AuthService`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.service.ts
- `Manual Validation Style (no DTOs)` --references--> `AuthService`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.service.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `AuthRequest`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.types.ts
- `Manual Validation Style (no DTOs)` --references--> `ProductsController`  [EXTRACTED]
  CLAUDE.md → backend/src/products.controller.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Platform Skill Mirror (Claude Code vs OpenCode)** — _claude_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_mention_dispatch, _claude_skills_graphify_skill_subagent_dispatch_requirement [INFERRED 0.85]
- **Modular Step-to-Reference Delegation Pattern** — _claude_skills_graphify_skill_pipeline, _claude_skills_graphify_references_github_and_merge_doc, _claude_skills_graphify_references_transcribe_doc, _claude_skills_graphify_references_extraction_spec_doc, _claude_skills_graphify_references_exports_doc [INFERRED 0.85]
- **Multi-Tenant Data Isolation Pattern** — claude_multi_tenancy, docs_modelo_datos_base_overview, backend_prisma_schema_schema, docs_producto_empresa_sucursal_usuario [INFERRED 0.85]
- **Purchase Invoice Confirmation Flow** — claude_purchase_invoice_lifecycle, docs_investigacion_compras_flow, docs_api_purchases_endpoints, backend_src_purchases_service_purchasesservice, docs_modelo_datos_base_stock_movements [INFERRED 0.85]

## Communities (116 total, 9 thin omitted)

### Community 0 - "cn"
Cohesion: 0.06
Nodes (142): BranchSwitcher(), EmptyState(), ExportMenu(), download(), Field(), PermissionRoute(), FullScreenRoute(), ProtectedRoute() (+134 more)

### Community 1 - "SalesService"
Cohesion: 0.07
Nodes (26): Db, registrarMovimientoCuenta(), CuentasCorrientesController, Body, Controller, Get, Inject, Param (+18 more)

### Community 2 - "app.module.ts"
Cohesion: 0.11
Nodes (29): JwtAuthGuard, Injectable, TIMEZONES, AuthUser, TIPOS_MOVIMIENTO, Usuario, CuentasCorrientesService, Inject (+21 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (48): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, @phosphor-icons/react, @radix-ui/react-checkbox, @radix-ui/react-dialog (+40 more)

### Community 4 - "AuthService"
Cohesion: 0.17
Nodes (6): Inject, AuthService, normalizeEmail(), Inject, Injectable, validatePassword()

### Community 5 - ""tenants""
Cohesion: 0.11
Nodes (31): "customers", "product_lots", "products", "suppliers", "tenants", "warehouses", "stock_movements", "users" (+23 more)

### Community 6 - "AuthRequest"
Cohesion: 0.15
Nodes (18): AuthRequest, assertTaxRate(), parseOptionalDecimal(), ProductsController, Body, Controller, Delete, Get (+10 more)

### Community 7 - "prices.service.ts"
Cohesion: 0.08
Nodes (32): Decimalish, priceChange(), PriceField, PriceHistoryEntry, PriceSource, toNumber(), Db, guardarPrecio() (+24 more)

### Community 8 - "graphify Skill Pipeline (Claude Code)"
Cohesion: 0.07
Nodes (39): CLAUDE.md graphify Pointer, Add URL & Watch Folder Reference, Extra Exports & Benchmark Reference, Confidence Score Rubric, Extraction Subagent Prompt Spec, Node ID Format Rule, GitHub Clone & Cross-Repo Merge Reference, Commit Hook & CLAUDE.md Integration Reference (+31 more)

### Community 9 - "StockService"
Cohesion: 0.16
Nodes (8): Inject, Scope, StockService, Inject, Injectable, IN_MOVEMENT_TYPES, MovementInput, OUT_MOVEMENT_TYPES

### Community 10 - "escritorio-page.tsx"
Cohesion: 0.20
Nodes (13): usePalette(), setActiveBranch(), pendientes(), gridModules(), applyOrder(), cap(), Config, EscritorioPage() (+5 more)

### Community 11 - "PromotionsController"
Cohesion: 0.14
Nodes (14): entero(), monto(), parseConfig(), PromotionsController, Body, Controller, Delete, Get (+6 more)

### Community 12 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 13 - "PurchasesController"
Cohesion: 0.29
Nodes (8): PurchasesController, Body, Controller, Get, Param, Post, Req, UseGuards

### Community 14 - "money"
Cohesion: 0.10
Nodes (16): money(), parseWeighedBarcode(), describirPromo(), fmtHora(), PosPage(), abrirTurno(), agregarMovimiento(), cambiarCantidad() (+8 more)

### Community 15 - ".token"
Cohesion: 0.18
Nodes (17): PricesPage(), addTramo(), apply(), buildBody(), calculate(), cancelScheduled(), deleteList(), deletePromo() (+9 more)

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
Cohesion: 0.15
Nodes (13): Integración con ARCA (sin definir), Caja / Arqueo, CashMovement Model, CashRegister Model, CashShift Model, Cuenta Corriente de Clientes, CustomerAccountMovement Model, Empresa → Sucursal → Usuario Structure (+5 more)

### Community 20 - "PricesController"
Cohesion: 0.17
Nodes (12): activarPreciosVigentes(), PricesController, Body, Controller, Delete, Get, Param, Post (+4 more)

### Community 21 - "Purchases/Reception/Stock Research"
Cohesion: 0.33
Nodes (6): ARCA: Emisión y Autorización de Factura Electrónica, ARCA: Régimen General y Clases de Comprobantes, GS1 Global Traceability Standard, Oracle Procurement Three-Way Match Docs, Purchases/Reception/Stock Research, Three-Way Match Concept

### Community 22 - "PriceListsController"
Cohesion: 0.17
Nodes (11): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+3 more)

### Community 23 - "RequirePermission"
Cohesion: 0.26
Nodes (11): CashRegistersController, CashShiftsController, Body, Controller, Get, Param, Post, Query (+3 more)

### Community 24 - "WarehousesPage"
Cohesion: 0.33
Nodes (3): WarehousesPage(), submit(), submitCaja()

### Community 25 - "CustomersController"
Cohesion: 0.17
Nodes (11): CustomersController, Body, Controller, Get, Inject, Param, Post, Put (+3 more)

### Community 26 - "i18n/utils.ts"
Cohesion: 0.06
Nodes (34): lang, t, year, home, lang, links, t, enHref (+26 more)

### Community 27 - "StockInPage"
Cohesion: 0.16
Nodes (8): draftKey(), readDraft(), StockInPage(), addLine(), cancelCorrection(), createProductInline(), submit(), submitCancelInvoice()

### Community 28 - "CajaService"
Cohesion: 0.18
Nodes (6): Inject, CajaService, monto(), texto(), Inject, Injectable

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
Nodes (23): api, iniciales(), PasswordSection(), submit(), PerfilSection(), submit(), CustomersPage(), openCuenta() (+15 more)

### Community 35 - "enrich-reference-categories.ts"
Cohesion: 0.27
Nodes (11): apiGet(), Categoria, HEADERS, main(), pickSucursalBatches(), prisma, Producto, productosDeRubro() (+3 more)

### Community 36 - "Mayorista ERP Project Overview"
Cohesion: 0.24
Nodes (10): Graphify Knowledge Graph Workflow (AGENTS.md), main.ts Bootstrap (ValidationPipe), Graphify Knowledge Graph Workflow (CLAUDE.md), Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger, Manual Validation Style (no DTOs), Purchase Invoices Endpoints (+2 more)

### Community 37 - "Rangos Permission System (RBAC)"
Cohesion: 0.33
Nodes (7): Prisma schema.prisma, Multi-Tenancy Strategy, GET /auth/me Endpoint, caja.autorizar_anulacion Permission, RangoPermission Model, Rangos Permission System (RBAC), User.rangoId Field

### Community 38 - "Tenants Controller"
Cohesion: 0.24
Nodes (7): TenantsController, Controller, Get, Inject, Param, Req, UseGuards

### Community 39 - "BranchesController"
Cohesion: 0.16
Nodes (12): BranchesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 40 - "RangosController"
Cohesion: 0.20
Nodes (10): RangosController, Body, Controller, Delete, Get, Param, Post, Put (+2 more)

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

### Community 45 - "ProductReferenceController"
Cohesion: 0.25
Nodes (6): ProductReferenceController, Controller, Get, Inject, Param, UseGuards

### Community 46 - "Base Data Model"
Cohesion: 0.50
Nodes (8): Catalog Endpoints (Warehouses/Suppliers/Lots), customers table, Base Data Model, product_lots table, stock_movements table, suppliers table, tenants table, warehouses table

### Community 47 - "user-menu.tsx"
Cohesion: 0.33
Nodes (7): AccountList(), iniciales(), haceCuanto(), iniciales(), inicioDeSesion(), UserMenu(), AVATAR_COLORS

### Community 48 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, argon2@0.45.1, esbuild@0.28.2, prisma@6.19.3, @prisma/client@6.19.3, @prisma/engines@6.19.3

### Community 49 - "import-reference-from-xlsx.ts"
Cohesion: 0.47
Nodes (5): cellText(), findColumn(), HEADERS, main(), prisma

### Community 50 - "errorMessage"
Cohesion: 0.14
Nodes (15): errorMessage(), UsersPage(), submitCreate(), submitEdit(), SucursalesSection(), accion(), submit(), submit() (+7 more)

### Community 51 - "SuppliersController"
Cohesion: 0.15
Nodes (12): SuppliersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 52 - "landing/package.json"
Cohesion: 0.08
Nodes (25): astro, @astrojs/sitemap, @fontsource/bricolage-grotesque, @fontsource/spline-sans, @fontsource/spline-sans-mono, dependencies, astro, @astrojs/sitemap (+17 more)

### Community 53 - "backend/package.json"
Cohesion: 0.40
Nodes (4): name, prisma, seed, private

### Community 54 - "SalesController"
Cohesion: 0.20
Nodes (11): SalesController, Body, Controller, Get, Inject, Param, Post, Query (+3 more)

### Community 55 - "CategoriesController"
Cohesion: 0.16
Nodes (12): CategoriesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 56 - "ReportesController"
Cohesion: 0.22
Nodes (7): ReportesController, Controller, Get, Inject, Query, Req, UseGuards

### Community 57 - "RangosPage"
Cohesion: 0.40
Nodes (5): RangosPage(), abrirEdicion(), borrar(), crear(), guardar()

### Community 58 - "EscritorioController"
Cohesion: 0.25
Nodes (6): EscritorioController, Controller, Get, Inject, Req, UseGuards

### Community 59 - "PriceRulesController"
Cohesion: 0.15
Nodes (9): PriceRulesController, Controller, Get, Inject, UseGuards, Inject, PricesService, Inject (+1 more)

### Community 60 - "AuthController"
Cohesion: 0.23
Nodes (9): AuthController, Body, Controller, Get, Inject, Post, Req, UseGuards (+1 more)

### Community 61 - "SupervisorAuthDialog"
Cohesion: 1.00
Nodes (3): SupervisorAuthDialog(), reset(), submit()

### Community 62 - "App"
Cohesion: 0.29
Nodes (6): Frontend Architecture (single App.tsx, no router), frontend/index.html Entry Point, App(), AuthProvider(), persist(), readAccounts()

### Community 65 - "PurchasesService"
Cohesion: 0.22
Nodes (4): Inject, PurchasesService, Inject, Injectable

### Community 88 - "products table"
Cohesion: 0.14
Nodes (15): classify-reference-categories.ts script, enrich-reference-categories.ts script, Auth Endpoints (signup/login/users), API Base Reference, Products Endpoints, Category Model (per-tenant), POST /products/import-reference, product_reference Global Table (+7 more)

### Community 90 - "SalesHistoryPage"
Cohesion: 0.50
Nodes (4): comprobante(), fechaHora(), SalesHistoryPage(), anular()

### Community 91 - "Abasto — landing"
Cohesion: 0.25
Nodes (7): Abasto — landing, Correr, Cómo está armado, Deploy en Cloudflare Pages, El fondo, Pendientes (TO-DO), Sincronizar el tema con la app

### Community 92 - "HealthController"
Cohesion: 0.33
Nodes (4): HealthController, Controller, Get, Inject

### Community 93 - "WarehousesController"
Cohesion: 0.18
Nodes (10): Body, Controller, Get, Inject, Param, Post, Put, Req (+2 more)

### Community 94 - "landing/tsconfig.json"
Cohesion: 0.25
Nodes (7): exclude, extends, include, **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist

### Community 95 - "Diseño — Abasto"
Cohesion: 0.06
Nodes (36): Base y semántica, Color, Color por módulo — identidad, no estado, Configurable, Cómo leer este documento, Deudas conocidas, Diseño — Abasto, El celular (+28 more)

### Community 96 - "StockController"
Cohesion: 0.23
Nodes (10): StockController, Body, Controller, Get, Param, Post, Query, Req (+2 more)

### Community 97 - "RangosService"
Cohesion: 0.17
Nodes (5): Inject, RangosService, Inject, Injectable, Inject

### Community 99 - "BootstrapService"
Cohesion: 0.40
Nodes (3): BootstrapService, Inject, Injectable

### Community 100 - "purchases.service.ts"
Cohesion: 0.40
Nodes (4): CORRECTABLE_STATUSES, InvoiceLineInput, OtherTax, OtherTaxInput

### Community 101 - "EmpresaSection"
Cohesion: 0.50
Nodes (4): fileToResizedDataUrl(), EmpresaSection(), pickLogo(), submit()

### Community 102 - ".update"
Cohesion: 0.19
Nodes (9): Body, Controller, Get, Param, Post, Put, Req, UseGuards (+1 more)

### Community 103 - "PrismaModule"
Cohesion: 0.67
Nodes (3): PrismaModule, Module, Global

### Community 105 - "permissions.catalog.ts"
Cohesion: 0.20
Nodes (9): ALL, DEFAULT_RANGOS, PERMISSION_KEYS, PermissionDef, PermissionKey, PERMISSIONS, SYSTEM_RANGO_NAMES, Db (+1 more)

### Community 106 - "modules.tsx"
Cohesion: 0.22
Nodes (8): BY_KEY, hueFor(), HUES, moduleByKey(), ModuleDef, ModuleMotif(), MODULES, ModuleLink()

### Community 107 - "command-palette.tsx"
Cohesion: 0.31
Nodes (5): CommandPalette(), norm(), EscritorioShell(), PaletteContext, visibleModules()

### Community 108 - "escritorio.ts"
Cohesion: 0.36
Nodes (8): compact(), ejemplos(), EscritorioSummary, lc(), Pendiente, plural(), statFor(), TileStat

### Community 109 - "prefs.ts"
Cohesion: 0.36
Nodes (7): aplicarDensidad(), Density, leerDensidad(), leerTiles(), TileSize, useDensity(), useTiles()

### Community 110 - "useTheme"
Cohesion: 0.43
Nodes (6): aplicar(), leer(), prefiereOscuro(), Theme, useTheme(), PreferenciasSection()

### Community 111 - "CategoriesPage"
Cohesion: 0.33
Nodes (3): CategoriesPage(), confirmDelete(), submit()

### Community 112 - "product-search.util.ts"
Cohesion: 0.83
Nodes (3): buscarProductoIds(), condicionTermino(), normalizar()

### Community 113 - "ProductSearchDialog"
Cohesion: 0.83
Nodes (4): ProductSearchDialog(), alTeclear(), elegible(), elegir()

### Community 114 - "branch.ts"
Cohesion: 0.67
Nodes (3): activeBranchFor(), read(), Stored

### Community 115 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **347 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `name`, `private`, `start:dev` (+342 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 599 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `AuthService` to `RangosService`, `app.module.ts`, `Mayorista ERP Project Overview`, `.token`, `AuthController`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `AuthRequest` to `SalesService`, `app.module.ts`, `prices.service.ts`, `PromotionsController`, `PurchasesController`, `PricesController`, `PriceListsController`, `RequirePermission`, `CustomersController`, `Tenants Controller`, `BranchesController`, `RangosController`, `SuppliersController`, `SalesController`, `CategoriesController`, `ReportesController`, `EscritorioController`, `PriceRulesController`, `AuthController`, `WarehousesController`, `StockController`, `.update`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Why does `api` connect `api` to `cn`, `EmpresaSection`, `SuppliersPage`, `escritorio-page.tsx`, `money`, `CategoriesPage`, `.token`, `errorMessage`, `WarehousesPage`, `RangosPage`, `SalesHistoryPage`, `StockInPage`, `ventas-chart.tsx`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `name` to the rest of the system?**
  _347 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.05597989949748744 - nodes in this community are weakly interconnected._
- **Should `SalesService` be split into smaller, more focused modules?**
  _Cohesion score 0.06938020351526364 - nodes in this community are weakly interconnected._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11014492753623188 - nodes in this community are weakly interconnected._