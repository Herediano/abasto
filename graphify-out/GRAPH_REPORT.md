# Graph Report - erp-modular-vision-56c436  (2026-09-06)

## Corpus Check
- 194 files · ~114,899 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1474 nodes · 3919 edges · 100 communities (72 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 148 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `be599817`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- SalesService
- app.module.ts
- dependencies
- AuthService
- "tenants"
- RequirePermission
- prices.service.ts
- graphify Skill Pipeline (Claude Code)
- StockService
- escritorio-page.tsx
- PromotionsController
- compilerOptions
- PurchasesService
- money
- .token
- auth-background.tsx
- dependencies
- CajaService
- Product Definition (Abasto Vision)
- AuthRequest
- StockController
- PriceListsController
- PriceRulesController
- WarehousesPage
- CustomersController
- price-import.util.ts
- StockInPage
- products.controller.ts
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
- price-resolver.util.ts
- ProductReferenceController
- Base Data Model
- promotions.controller.ts
- allowScripts
- import-reference-from-xlsx.ts
- Purchases/Reception/Stock Research
- auth.service.ts
- SalesController
- backend/package.json
- PurchasesController
- CategoriesController
- ReportesController
- errorMessage
- EscritorioController
- PrismaService
- SalesHistoryPage
- SupervisorAuthDialog
- App
- graphify.js
- @nestjs/platform-express
- CategoriesPage
- @prisma/client
- reflect-metadata
- 0015_product_reference/migration.sql
- .constructor
- Mayorista ERP README Overview
- rxjs
- RangosPage
- CashShiftsController
- SuppliersController
- WarehousesController
- branch.ts
- Diseño — Abasto
- ExpirationsPage
- ProductSearchDialog
- SuppliersPage
- .constructor

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 126 edges
2. `errorMessage()` - 103 edges
3. `RequirePermission()` - 102 edges
4. `api` - 99 edges
5. `cn()` - 71 edges
6. `useAuth()` - 69 edges
7. `PrismaService` - 60 edges
8. `"tenants"` - 31 edges
9. `JwtAuthGuard` - 30 edges
10. `ProductsController` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Mayorista ERP README Overview` --semantically_similar_to--> `Mayorista ERP Project Overview`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `AdminGuard (admin-only write gate)` --references--> `JwtAuthGuard`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.guard.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `JwtAuthGuard`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.guard.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `AuthService`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.service.ts
- `Manual Validation Style (no DTOs)` --references--> `AuthService`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.service.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Platform Skill Mirror (Claude Code vs OpenCode)** — _claude_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_mention_dispatch, _claude_skills_graphify_skill_subagent_dispatch_requirement [INFERRED 0.85]
- **Modular Step-to-Reference Delegation Pattern** — _claude_skills_graphify_skill_pipeline, _claude_skills_graphify_references_github_and_merge_doc, _claude_skills_graphify_references_transcribe_doc, _claude_skills_graphify_references_extraction_spec_doc, _claude_skills_graphify_references_exports_doc [INFERRED 0.85]
- **Multi-Tenant Data Isolation Pattern** — claude_multi_tenancy, docs_modelo_datos_base_overview, backend_prisma_schema_schema, docs_producto_empresa_sucursal_usuario [INFERRED 0.85]
- **Purchase Invoice Confirmation Flow** — claude_purchase_invoice_lifecycle, docs_investigacion_compras_flow, docs_api_purchases_endpoints, backend_src_purchases_service_purchasesservice, docs_modelo_datos_base_stock_movements [INFERRED 0.85]

## Communities (100 total, 10 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.06
Nodes (141): BranchSwitcher(), EmptyState(), ExportMenu(), download(), Field(), PermissionRoute(), EscritorioShell(), FullScreenRoute() (+133 more)

### Community 1 - "SalesService"
Cohesion: 0.06
Nodes (28): Db, registrarMovimientoCuenta(), CuentasCorrientesController, Body, Controller, Get, Inject, Param (+20 more)

### Community 2 - "app.module.ts"
Cohesion: 0.26
Nodes (9): JwtAuthGuard, Injectable, PermissionGuard, Injectable, CFG, LABELS, Period, PERMISSION_KEY (+1 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (48): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, @phosphor-icons/react, @radix-ui/react-checkbox, @radix-ui/react-dialog (+40 more)

### Community 4 - "AuthService"
Cohesion: 0.05
Nodes (29): AuthController, Body, Controller, Get, Inject, Post, Req, UseGuards (+21 more)

### Community 5 - ""tenants""
Cohesion: 0.11
Nodes (31): "customers", "product_lots", "products", "suppliers", "tenants", "warehouses", "stock_movements", "users" (+23 more)

### Community 6 - "RequirePermission"
Cohesion: 0.16
Nodes (17): assertTaxRate(), parseOptionalDecimal(), ProductsController, Body, Controller, Delete, Get, Param (+9 more)

### Community 7 - "prices.service.ts"
Cohesion: 0.17
Nodes (17): guardarPrecio(), MODOS_REDONDEO, aplicarModo(), aplicarTramos(), BulkInput, OPERATIONS, OperationType, PricesService (+9 more)

### Community 8 - "graphify Skill Pipeline (Claude Code)"
Cohesion: 0.07
Nodes (39): CLAUDE.md graphify Pointer, Add URL & Watch Folder Reference, Extra Exports & Benchmark Reference, Confidence Score Rubric, Extraction Subagent Prompt Spec, Node ID Format Rule, GitHub Clone & Cross-Repo Merge Reference, Commit Hook & CLAUDE.md Integration Reference (+31 more)

### Community 9 - "StockService"
Cohesion: 0.14
Nodes (10): Body, Inject, Post, Scope, StockService, Inject, Injectable, IN_MOVEMENT_TYPES (+2 more)

### Community 10 - "escritorio-page.tsx"
Cohesion: 0.06
Nodes (50): AccountList(), iniciales(), CommandPalette(), norm(), PaletteContext, usePalette(), TEMAS, ThemeToggle() (+42 more)

### Community 11 - "PromotionsController"
Cohesion: 0.17
Nodes (11): PromotionsController, Body, Controller, Delete, Get, Inject, Param, Post (+3 more)

### Community 12 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 13 - "PurchasesService"
Cohesion: 0.22
Nodes (4): Inject, PurchasesService, Inject, Injectable

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

### Community 18 - "CajaService"
Cohesion: 0.18
Nodes (6): Inject, CajaService, monto(), texto(), Inject, Injectable

### Community 19 - "Product Definition (Abasto Vision)"
Cohesion: 0.15
Nodes (13): Integración con ARCA (sin definir), Caja / Arqueo, CashMovement Model, CashRegister Model, CashShift Model, Cuenta Corriente de Clientes, CustomerAccountMovement Model, Empresa → Sucursal → Usuario Structure (+5 more)

### Community 20 - "AuthRequest"
Cohesion: 0.17
Nodes (13): AuthRequest, Get, Req, PricesController, Body, Controller, Delete, Get (+5 more)

### Community 21 - "StockController"
Cohesion: 0.29
Nodes (8): StockController, Controller, Get, Param, Query, Req, Res, UseGuards

### Community 22 - "PriceListsController"
Cohesion: 0.17
Nodes (11): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+3 more)

### Community 23 - "PriceRulesController"
Cohesion: 0.21
Nodes (10): PriceRulesController, Body, Controller, Delete, Get, Param, Post, Put (+2 more)

### Community 24 - "WarehousesPage"
Cohesion: 0.33
Nodes (3): WarehousesPage(), submit(), submitCaja()

### Community 25 - "CustomersController"
Cohesion: 0.17
Nodes (11): CustomersController, Body, Controller, Get, Inject, Param, Post, Put (+3 more)

### Community 26 - "price-import.util.ts"
Cohesion: 0.20
Nodes (14): BARCODE_ALIASES, COST_ALIASES, detectDelimiter(), findColumn(), matrixFromCsv(), matrixFromXlsx(), NAME_ALIASES, normalizeHeader() (+6 more)

### Community 27 - "StockInPage"
Cohesion: 0.16
Nodes (8): draftKey(), readDraft(), StockInPage(), addLine(), cancelCorrection(), createProductInline(), submit(), submitCancelInvoice()

### Community 28 - "products.controller.ts"
Cohesion: 0.18
Nodes (13): csvCell(), ExportColumn, sendExport(), Decimalish, priceChange(), PriceField, PriceHistoryEntry, PriceSource (+5 more)

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
Cohesion: 0.13
Nodes (21): api, iniciales(), PasswordSection(), submit(), PerfilSection(), submit(), SucursalesSection(), submit() (+13 more)

### Community 35 - "enrich-reference-categories.ts"
Cohesion: 0.27
Nodes (11): apiGet(), Categoria, HEADERS, main(), pickSucursalBatches(), prisma, Producto, productosDeRubro() (+3 more)

### Community 36 - "Mayorista ERP Project Overview"
Cohesion: 0.16
Nodes (15): Graphify Knowledge Graph Workflow (AGENTS.md), main.ts Bootstrap (ValidationPipe), AdminGuard (admin-only write gate), Auth Architecture (JWT, Guards, Argon2id), Graphify Knowledge Graph Workflow (CLAUDE.md), Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger (+7 more)

### Community 37 - "Rangos Permission System (RBAC)"
Cohesion: 0.33
Nodes (7): Prisma schema.prisma, Multi-Tenancy Strategy, GET /auth/me Endpoint, caja.autorizar_anulacion Permission, RangoPermission Model, Rangos Permission System (RBAC), User.rangoId Field

### Community 38 - "Tenants Controller"
Cohesion: 0.24
Nodes (7): TenantsController, Controller, Get, Inject, Param, Req, UseGuards

### Community 39 - "BranchesController"
Cohesion: 0.18
Nodes (10): BranchesController, Body, Controller, Get, Inject, Param, Post, Put (+2 more)

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

### Community 44 - "price-resolver.util.ts"
Cohesion: 0.16
Nodes (11): PriceActivationService, Inject, Injectable, activarPreciosVigentes(), Db, ListaResuelta, precioExplicito(), PriceSource (+3 more)

### Community 45 - "ProductReferenceController"
Cohesion: 0.25
Nodes (6): ProductReferenceController, Controller, Get, Inject, Param, UseGuards

### Community 46 - "Base Data Model"
Cohesion: 0.44
Nodes (9): Catalog Endpoints (Warehouses/Suppliers/Lots), customers table, Base Data Model, product_lots table, products table, stock_movements table, suppliers table, tenants table (+1 more)

### Community 47 - "promotions.controller.ts"
Cohesion: 0.38
Nodes (6): entero(), monto(), parseConfig(), SCOPES, Tipo, TIPOS

### Community 48 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, argon2@0.45.1, esbuild@0.28.2, prisma@6.19.3, @prisma/client@6.19.3, @prisma/engines@6.19.3

### Community 49 - "import-reference-from-xlsx.ts"
Cohesion: 0.47
Nodes (5): cellText(), findColumn(), HEADERS, main(), prisma

### Community 50 - "Purchases/Reception/Stock Research"
Cohesion: 0.33
Nodes (6): ARCA: Emisión y Autorización de Factura Electrónica, ARCA: Régimen General y Clases de Comprobantes, GS1 Global Traceability Standard, Oracle Procurement Three-Way Match Docs, Purchases/Reception/Stock Research, Three-Way Match Concept

### Community 51 - "auth.service.ts"
Cohesion: 0.17
Nodes (11): TIMEZONES, AuthUser, ALL, DEFAULT_RANGOS, PERMISSION_KEYS, PermissionDef, PermissionKey, PERMISSIONS (+3 more)

### Community 52 - "SalesController"
Cohesion: 0.23
Nodes (10): SalesController, Body, Controller, Get, Param, Post, Query, Req (+2 more)

### Community 53 - "backend/package.json"
Cohesion: 0.40
Nodes (4): name, prisma, seed, private

### Community 54 - "PurchasesController"
Cohesion: 0.29
Nodes (8): PurchasesController, Body, Controller, Get, Param, Post, Req, UseGuards

### Community 55 - "CategoriesController"
Cohesion: 0.16
Nodes (12): CategoriesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 56 - "ReportesController"
Cohesion: 0.22
Nodes (7): ReportesController, Controller, Get, Inject, Query, Req, UseGuards

### Community 57 - "errorMessage"
Cohesion: 0.15
Nodes (15): errorMessage(), fileToResizedDataUrl(), UsersPage(), submitCreate(), submitEdit(), EmpresaSection(), pickLogo(), submit() (+7 more)

### Community 58 - "EscritorioController"
Cohesion: 0.40
Nodes (4): EscritorioController, Controller, Inject, UseGuards

### Community 59 - "PrismaService"
Cohesion: 0.06
Nodes (25): BootstrapService, Inject, Injectable, TIPOS_MOVIMIENTO, Usuario, CuentasCorrientesService, Inject, Injectable (+17 more)

### Community 60 - "SalesHistoryPage"
Cohesion: 0.50
Nodes (4): comprobante(), fechaHora(), SalesHistoryPage(), anular()

### Community 61 - "SupervisorAuthDialog"
Cohesion: 1.00
Nodes (3): SupervisorAuthDialog(), reset(), submit()

### Community 62 - "App"
Cohesion: 0.29
Nodes (6): Frontend Architecture (single App.tsx, no router), frontend/index.html Entry Point, App(), AuthProvider(), persist(), readAccounts()

### Community 65 - "CategoriesPage"
Cohesion: 0.33
Nodes (3): CategoriesPage(), confirmDelete(), submit()

### Community 88 - "Mayorista ERP README Overview"
Cohesion: 0.17
Nodes (11): classify-reference-categories.ts script, enrich-reference-categories.ts script, Category Model (per-tenant), POST /products/import-reference, product_reference Global Table, GET /product-reference/:ean, Brand/Keyword Offline Classifier, Reference Catalog Category Classification (+3 more)

### Community 90 - "RangosPage"
Cohesion: 0.40
Nodes (5): RangosPage(), abrirEdicion(), borrar(), crear(), guardar()

### Community 91 - "CashShiftsController"
Cohesion: 0.24
Nodes (10): CashRegistersController, CashShiftsController, Body, Controller, Get, Param, Post, Query (+2 more)

### Community 92 - "SuppliersController"
Cohesion: 0.15
Nodes (12): SuppliersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 93 - "WarehousesController"
Cohesion: 0.18
Nodes (10): Body, Controller, Get, Inject, Param, Post, Put, Req (+2 more)

### Community 94 - "branch.ts"
Cohesion: 0.67
Nodes (3): activeBranchFor(), read(), Stored

### Community 95 - "Diseño — Abasto"
Cohesion: 0.12
Nodes (17): Configurable, Deudas conocidas, Diseño — Abasto, Dos excepciones, por contexto de trabajo, El escritorio, El módulo — también un solo molde, El sistema visual, cerrado, Estado tranquilo (+9 more)

### Community 96 - "ExpirationsPage"
Cohesion: 0.40
Nodes (4): daysRemaining(), ExpirationsPage(), submitEdit(), urgencyBadge()

### Community 97 - "ProductSearchDialog"
Cohesion: 0.83
Nodes (4): ProductSearchDialog(), alTeclear(), elegible(), elegir()

## Knowledge Gaps
- **279 isolated node(s):** `name`, `private`, `start:dev`, `start`, `db:generate` (+274 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 521 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `AuthService` to `app.module.ts`, `auth.service.ts`, `Mayorista ERP Project Overview`, `.token`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `AuthRequest` to `SalesService`, `app.module.ts`, `AuthService`, `RequirePermission`, `prices.service.ts`, `StockService`, `PromotionsController`, `StockController`, `PriceListsController`, `PriceRulesController`, `CustomersController`, `products.controller.ts`, `Mayorista ERP Project Overview`, `Tenants Controller`, `BranchesController`, `RangosController`, `promotions.controller.ts`, `SalesController`, `PurchasesController`, `CategoriesController`, `ReportesController`, `CashShiftsController`, `SuppliersController`, `WarehousesController`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Why does `api` connect `api` to `api.ts`, `CategoriesPage`, `SuppliersPage`, `ExpirationsPage`, `escritorio-page.tsx`, `money`, `.token`, `WarehousesPage`, `errorMessage`, `RangosPage`, `StockInPage`, `SalesHistoryPage`, `ventas-chart.tsx`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **What connects `name`, `private`, `start:dev` to the rest of the system?**
  _279 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05624079995939293 - nodes in this community are weakly interconnected._
- **Should `SalesService` be split into smaller, more focused modules?**
  _Cohesion score 0.06448979591836734 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._