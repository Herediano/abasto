# Graph Report - erp-modular-vision-56c436  (2026-09-06)

## Corpus Check
- 182 files · ~104,814 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1384 nodes · 3621 edges · 93 communities (65 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 141 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `acd3cfd7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- SalesService
- app.module.ts
- dependencies
- permissions.catalog.ts
- "tenants"
- ProductsController
- UsersController
- graphify Skill Pipeline (Claude Code)
- StockService
- escritorio-page.tsx
- promotions.controller.ts
- compilerOptions
- PricesController
- money
- errorMessage
- auth-background.tsx
- dependencies
- CajaService
- Product Definition (Abasto Vision)
- .token
- Reference Catalog Category Classification
- PriceListsController
- PriceRulesController
- api
- CustomersController
- price-import.util.ts
- StockInPage
- prices.service.ts
- ventas-chart.tsx
- seed-demo.ts
- compilerOptions
- devDependencies
- UsersPage
- seed.ts
- enrich-reference-categories.ts
- Mayorista ERP Project Overview
- Rangos Permission System (RBAC)
- Tenants Controller
- products table
- ProductSearchDialog
- compilerOptions
- scripts
- main.ts
- PriceActivationService
- ProductReferenceController
- Base Data Model
- PrismaService
- allowScripts
- import-reference-from-xlsx.ts
- Purchases/Reception/Stock Research
- RangosPage
- WarehousesPage
- backend/package.json
- StockHistoryPage
- CategoriesController
- ReportesController
- ExpirationsPage
- EscritorioController
- SalesHistoryPage
- SupervisorAuthDialog
- App
- graphify.js
- @nestjs/platform-express
- @prisma/client
- reflect-metadata
- 0015_product_reference/migration.sql
- .constructor
- RangosService
- rxjs
- AuthRequest
- SuppliersController
- WarehousesController
- PurchasesService
- Diseño — Abasto

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 119 edges
2. `RequirePermission()` - 102 edges
3. `errorMessage()` - 92 edges
4. `api` - 85 edges
5. `cn()` - 62 edges
6. `useAuth()` - 58 edges
7. `PrismaService` - 56 edges
8. `"tenants"` - 31 edges
9. `JwtAuthGuard` - 29 edges
10. `ProductsController` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Mayorista ERP README Overview` --semantically_similar_to--> `Mayorista ERP Project Overview`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Manual Validation Style (no DTOs)` --references--> `AuthService`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.service.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `AuthRequest`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.types.ts
- `Manual Validation Style (no DTOs)` --references--> `ProductsController`  [EXTRACTED]
  CLAUDE.md → backend/src/products.controller.ts
- `Purchase Invoice Lifecycle (draft/confirm/corrected)` --references--> `PurchasesService`  [EXTRACTED]
  CLAUDE.md → backend/src/purchases.service.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Platform Skill Mirror (Claude Code vs OpenCode)** — _claude_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_mention_dispatch, _claude_skills_graphify_skill_subagent_dispatch_requirement [INFERRED 0.85]
- **Modular Step-to-Reference Delegation Pattern** — _claude_skills_graphify_skill_pipeline, _claude_skills_graphify_references_github_and_merge_doc, _claude_skills_graphify_references_transcribe_doc, _claude_skills_graphify_references_extraction_spec_doc, _claude_skills_graphify_references_exports_doc [INFERRED 0.85]
- **Multi-Tenant Data Isolation Pattern** — claude_multi_tenancy, docs_modelo_datos_base_overview, backend_prisma_schema_schema, docs_producto_empresa_sucursal_usuario [INFERRED 0.85]
- **Purchase Invoice Confirmation Flow** — claude_purchase_invoice_lifecycle, docs_investigacion_compras_flow, docs_api_purchases_endpoints, backend_src_purchases_service_purchasesservice, docs_modelo_datos_base_stock_movements [INFERRED 0.85]

## Communities (93 total, 10 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.06
Nodes (126): EmptyState(), ExportMenu(), download(), Field(), PermissionRoute(), FullScreenRoute(), ProtectedRoute(), PageHeader() (+118 more)

### Community 1 - "SalesService"
Cohesion: 0.05
Nodes (37): Db, registrarMovimientoCuenta(), CuentasCorrientesController, Body, Controller, Get, Inject, Param (+29 more)

### Community 2 - "app.module.ts"
Cohesion: 0.15
Nodes (20): JwtAuthGuard, Inject, Injectable, AuthService, Injectable, AuthUser, Usuario, csvCell() (+12 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (48): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, @phosphor-icons/react, @radix-ui/react-checkbox, @radix-ui/react-dialog (+40 more)

### Community 4 - "permissions.catalog.ts"
Cohesion: 0.09
Nodes (19): AuthController, Body, Controller, Get, Inject, Post, Req, UseGuards (+11 more)

### Community 5 - ""tenants""
Cohesion: 0.11
Nodes (31): "customers", "product_lots", "products", "suppliers", "tenants", "warehouses", "stock_movements", "users" (+23 more)

### Community 6 - "ProductsController"
Cohesion: 0.12
Nodes (20): buscarProductoIds(), condicionTermino(), normalizar(), assertTaxRate(), parseOptionalDecimal(), ProductsController, Body, Controller (+12 more)

### Community 7 - "UsersController"
Cohesion: 0.18
Nodes (10): Body, Controller, Get, Inject, Param, Post, Put, Req (+2 more)

### Community 8 - "graphify Skill Pipeline (Claude Code)"
Cohesion: 0.07
Nodes (39): CLAUDE.md graphify Pointer, Add URL & Watch Folder Reference, Extra Exports & Benchmark Reference, Confidence Score Rubric, Extraction Subagent Prompt Spec, Node ID Format Rule, GitHub Clone & Cross-Repo Merge Reference, Commit Hook & CLAUDE.md Integration Reference (+31 more)

### Community 9 - "StockService"
Cohesion: 0.11
Nodes (18): StockController, Body, Controller, Get, Inject, Param, Post, Query (+10 more)

### Community 10 - "escritorio-page.tsx"
Cohesion: 0.08
Nodes (30): CommandPalette(), norm(), EscritorioShell(), PaletteContext, usePalette(), TEMAS, ThemeToggle(), compact() (+22 more)

### Community 11 - "promotions.controller.ts"
Cohesion: 0.12
Nodes (17): entero(), monto(), parseConfig(), PromotionsController, SCOPES, Tipo, TIPOS, Body (+9 more)

### Community 12 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 13 - "PricesController"
Cohesion: 0.16
Nodes (11): activarPreciosVigentes(), PricesController, Body, Controller, Delete, Inject, Param, Post (+3 more)

### Community 14 - "money"
Cohesion: 0.10
Nodes (16): money(), parseWeighedBarcode(), describirPromo(), fmtHora(), PosPage(), abrirTurno(), agregarMovimiento(), cambiarCantidad() (+8 more)

### Community 15 - "errorMessage"
Cohesion: 0.16
Nodes (20): errorMessage(), submit(), submit(), PricesPage(), addTramo(), apply(), buildBody(), calculate() (+12 more)

### Community 16 - "auth-background.tsx"
Cohesion: 0.16
Nodes (20): AuthBackground(), alCambiarVisibilidad(), crearFormas(), dibujar(), elegirPosicionLado(), loop(), obtenerRectObstaculo(), paso() (+12 more)

### Community 17 - "dependencies"
Cohesion: 0.11
Nodes (19): argon2, dependencies, argon2, class-transformer, class-validator, exceljs, jsonwebtoken, @nestjs/common (+11 more)

### Community 18 - "CajaService"
Cohesion: 0.18
Nodes (6): Inject, CajaService, monto(), texto(), Inject, Injectable

### Community 19 - "Product Definition (Abasto Vision)"
Cohesion: 0.17
Nodes (12): Integración con ARCA (sin definir), Caja / Arqueo, CashMovement Model, CashRegister Model, CashShift Model, Cuenta Corriente de Clientes, CustomerAccountMovement Model, Empresa → Sucursal → Usuario Structure (+4 more)

### Community 20 - ".token"
Cohesion: 0.20
Nodes (11): CustomersPage(), openCuenta(), registrarPago(), submit(), toggleActive(), ProductsPage(), clearCatalog(), createCategory() (+3 more)

### Community 21 - "Reference Catalog Category Classification"
Cohesion: 0.40
Nodes (5): classify-reference-categories.ts script, enrich-reference-categories.ts script, Brand/Keyword Offline Classifier, Reference Catalog Category Classification, Precios Claros API (category tree)

### Community 22 - "PriceListsController"
Cohesion: 0.17
Nodes (11): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+3 more)

### Community 23 - "PriceRulesController"
Cohesion: 0.12
Nodes (19): Decimalish, priceChange(), PriceField, PriceHistoryEntry, PriceSource, toNumber(), PriceRulesController, Body (+11 more)

### Community 24 - "api"
Cohesion: 0.13
Nodes (16): api, CategoriesPage(), confirmDelete(), submit(), margin(), ProductDetailPage(), addBarcode(), addTier() (+8 more)

### Community 25 - "CustomersController"
Cohesion: 0.17
Nodes (11): CustomersController, Body, Controller, Get, Inject, Param, Post, Put (+3 more)

### Community 26 - "price-import.util.ts"
Cohesion: 0.20
Nodes (14): BARCODE_ALIASES, COST_ALIASES, detectDelimiter(), findColumn(), matrixFromCsv(), matrixFromXlsx(), NAME_ALIASES, normalizeHeader() (+6 more)

### Community 27 - "StockInPage"
Cohesion: 0.16
Nodes (8): draftKey(), readDraft(), StockInPage(), addLine(), cancelCorrection(), createProductInline(), submit(), submitCancelInvoice()

### Community 28 - "prices.service.ts"
Cohesion: 0.14
Nodes (15): Inject, MODOS_REDONDEO, BulkInput, OPERATIONS, OperationType, PricesService, Rounding, ROUNDINGS (+7 more)

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

### Community 33 - "UsersPage"
Cohesion: 0.40
Nodes (3): UsersPage(), submitCreate(), submitEdit()

### Community 35 - "enrich-reference-categories.ts"
Cohesion: 0.27
Nodes (11): apiGet(), Categoria, HEADERS, main(), pickSucursalBatches(), prisma, Producto, productosDeRubro() (+3 more)

### Community 36 - "Mayorista ERP Project Overview"
Cohesion: 0.28
Nodes (9): Graphify Knowledge Graph Workflow (AGENTS.md), Graphify Knowledge Graph Workflow (CLAUDE.md), Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger, Purchase Invoices Endpoints, Recommended Purchase Confirmation Flow, Postgres Docker Compose Service (+1 more)

### Community 37 - "Rangos Permission System (RBAC)"
Cohesion: 0.33
Nodes (7): Prisma schema.prisma, Multi-Tenancy Strategy, GET /auth/me Endpoint, caja.autorizar_anulacion Permission, RangoPermission Model, Rangos Permission System (RBAC), User.rangoId Field

### Community 38 - "Tenants Controller"
Cohesion: 0.24
Nodes (7): TenantsController, Controller, Get, Inject, Param, Req, UseGuards

### Community 39 - "products table"
Cohesion: 0.22
Nodes (10): Auth Endpoints (signup/login/users), API Base Reference, Products Endpoints, Category Model (per-tenant), POST /products/import-reference, product_reference Global Table, GET /product-reference/:ean, SEPA Open Data Source (+2 more)

### Community 40 - "ProductSearchDialog"
Cohesion: 0.83
Nodes (4): ProductSearchDialog(), alTeclear(), elegible(), elegir()

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

### Community 47 - "PrismaService"
Cohesion: 0.07
Nodes (18): Inject, TIPOS_MOVIMIENTO, Usuario, HealthController, Controller, Get, Inject, PrismaModule (+10 more)

### Community 48 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, argon2@0.45.1, esbuild@0.28.2, prisma@6.19.3, @prisma/client@6.19.3, @prisma/engines@6.19.3

### Community 49 - "import-reference-from-xlsx.ts"
Cohesion: 0.47
Nodes (5): cellText(), findColumn(), HEADERS, main(), prisma

### Community 50 - "Purchases/Reception/Stock Research"
Cohesion: 0.33
Nodes (6): ARCA: Emisión y Autorización de Factura Electrónica, ARCA: Régimen General y Clases de Comprobantes, GS1 Global Traceability Standard, Oracle Procurement Three-Way Match Docs, Purchases/Reception/Stock Research, Three-Way Match Concept

### Community 51 - "RangosPage"
Cohesion: 0.40
Nodes (5): RangosPage(), abrirEdicion(), borrar(), crear(), guardar()

### Community 53 - "backend/package.json"
Cohesion: 0.40
Nodes (4): name, prisma, seed, private

### Community 55 - "CategoriesController"
Cohesion: 0.16
Nodes (12): CategoriesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 56 - "ReportesController"
Cohesion: 0.22
Nodes (7): ReportesController, Controller, Get, Inject, Query, Req, UseGuards

### Community 57 - "ExpirationsPage"
Cohesion: 0.40
Nodes (4): daysRemaining(), ExpirationsPage(), submitEdit(), urgencyBadge()

### Community 58 - "EscritorioController"
Cohesion: 0.25
Nodes (6): EscritorioController, Controller, Get, Inject, Req, UseGuards

### Community 60 - "SalesHistoryPage"
Cohesion: 0.50
Nodes (4): comprobante(), fechaHora(), SalesHistoryPage(), anular()

### Community 61 - "SupervisorAuthDialog"
Cohesion: 1.00
Nodes (3): SupervisorAuthDialog(), reset(), submit()

### Community 62 - "App"
Cohesion: 0.33
Nodes (5): Frontend Architecture (single App.tsx, no router), frontend/index.html Entry Point, App(), AuthProvider(), readStoredSession()

### Community 88 - "RangosService"
Cohesion: 0.12
Nodes (13): RangosController, Body, Controller, Delete, Get, Inject, Param, Post (+5 more)

### Community 91 - "AuthRequest"
Cohesion: 0.13
Nodes (23): AuthRequest, CashRegistersController, CashShiftsController, Body, Controller, Get, Param, Post (+15 more)

### Community 92 - "SuppliersController"
Cohesion: 0.15
Nodes (12): SuppliersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 93 - "WarehousesController"
Cohesion: 0.18
Nodes (10): Body, Controller, Get, Inject, Param, Post, Put, Req (+2 more)

### Community 94 - "PurchasesService"
Cohesion: 0.12
Nodes (14): main.ts Bootstrap (ValidationPipe), PurchasesController, Body, Controller, Get, Inject, Param, Post (+6 more)

### Community 95 - "Diseño — Abasto"
Cohesion: 0.11
Nodes (17): Configurable, Deudas conocidas, Diseño — Abasto, Dos excepciones, por contexto de trabajo, El escritorio, El módulo — también un solo molde, El sistema visual, cerrado, Estado tranquilo (+9 more)

## Knowledge Gaps
- **275 isolated node(s):** `name`, `private`, `start:dev`, `start`, `db:generate` (+270 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 503 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `app.module.ts` to `permissions.catalog.ts`, `UsersController`, `PrismaService`, `.token`, `PurchasesService`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `AuthRequest` to `SalesService`, `app.module.ts`, `permissions.catalog.ts`, `ProductsController`, `UsersController`, `StockService`, `promotions.controller.ts`, `PricesController`, `PriceListsController`, `PriceRulesController`, `CustomersController`, `prices.service.ts`, `Tenants Controller`, `CategoriesController`, `ReportesController`, `EscritorioController`, `RangosService`, `SuppliersController`, `WarehousesController`, `PurchasesService`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Why does `api` connect `api` to `api.ts`, `UsersPage`, `escritorio-page.tsx`, `money`, `errorMessage`, `RangosPage`, `.token`, `WarehousesPage`, `StockHistoryPage`, `ExpirationsPage`, `StockInPage`, `SalesHistoryPage`, `ventas-chart.tsx`, `App`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **What connects `name`, `private`, `start:dev` to the rest of the system?**
  _275 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06474957151018854 - nodes in this community are weakly interconnected._
- **Should `SalesService` be split into smaller, more focused modules?**
  _Cohesion score 0.05423728813559322 - nodes in this community are weakly interconnected._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1455505279034691 - nodes in this community are weakly interconnected._