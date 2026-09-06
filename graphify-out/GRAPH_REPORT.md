# Graph Report - erp-modular-vision-56c436  (2026-09-06)

## Corpus Check
- 178 files · ~101,827 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1353 nodes · 3511 edges · 96 communities (70 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 140 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f19efac`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- sales.service.ts
- app.module.ts
- dependencies
- permissions.catalog.ts
- "tenants"
- ProductsController
- UsersController
- graphify Skill Pipeline (Claude Code)
- StockService
- escritorio-page.tsx
- RequirePermission
- compilerOptions
- AuthRequest
- PosPage
- errorMessage
- auth-background.tsx
- dependencies
- CajaService
- Product Definition (Abasto Vision)
- ProductsPage
- Reference Catalog Category Classification
- PriceListsController
- PriceRulesController
- useAuth
- CustomersController
- price-import.util.ts
- StockInPage
- prices.service.ts
- theme.ts
- seed-demo.ts
- compilerOptions
- devDependencies
- SalesService
- seed.ts
- enrich-reference-categories.ts
- Mayorista ERP Project Overview
- Rangos Permission System (RBAC)
- Tenants Controller
- products table
- CuentasCorrientesController
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
- CategoriesPage
- backend/package.json
- CuentasCorrientesService
- CategoriesController
- ReportesController
- ExpirationsPage
- EscritorioController
- price-resolver.util.ts
- SalesHistoryPage
- SupervisorAuthDialog
- App
- graphify.js
- @nestjs/platform-express
- stock.service.ts
- @prisma/client
- reflect-metadata
- 0015_product_reference/migration.sql
- .constructor
- RangosService
- rxjs
- SalesController
- SuppliersController
- WarehousesController
- PurchasesService
- Diseño — Abasto
- AuthService

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 116 edges
2. `RequirePermission()` - 99 edges
3. `errorMessage()` - 93 edges
4. `api()` - 82 edges
5. `cn()` - 56 edges
6. `PrismaService` - 54 edges
7. `useAuth()` - 52 edges
8. `"tenants"` - 31 edges
9. `JwtAuthGuard` - 29 edges
10. `ProductsController` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Mayorista ERP README Overview` --semantically_similar_to--> `Mayorista ERP Project Overview`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `AdminGuard (admin-only write gate)` --references--> `JwtAuthGuard`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.guard.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `JwtAuthGuard`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.guard.ts
- `Manual Validation Style (no DTOs)` --references--> `AuthService`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.service.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `AuthRequest`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Platform Skill Mirror (Claude Code vs OpenCode)** — _claude_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_mention_dispatch, _claude_skills_graphify_skill_subagent_dispatch_requirement [INFERRED 0.85]
- **Modular Step-to-Reference Delegation Pattern** — _claude_skills_graphify_skill_pipeline, _claude_skills_graphify_references_github_and_merge_doc, _claude_skills_graphify_references_transcribe_doc, _claude_skills_graphify_references_extraction_spec_doc, _claude_skills_graphify_references_exports_doc [INFERRED 0.85]
- **Multi-Tenant Data Isolation Pattern** — claude_multi_tenancy, docs_modelo_datos_base_overview, backend_prisma_schema_schema, docs_producto_empresa_sucursal_usuario [INFERRED 0.85]
- **Purchase Invoice Confirmation Flow** — claude_purchase_invoice_lifecycle, docs_investigacion_compras_flow, docs_api_purchases_endpoints, backend_src_purchases_service_purchasesservice, docs_modelo_datos_base_stock_movements [INFERRED 0.85]

## Communities (96 total, 8 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.07
Nodes (117): EmptyState(), Field(), PageHeader(), ProductPicker(), LineaCotizada, PageSpinner(), Spinner(), TEMAS (+109 more)

### Community 1 - "sales.service.ts"
Cohesion: 0.21
Nodes (12): alcanza(), cotizar(), Db, descuentoPromo(), LineaCotizada, LineaPedida, PromoConfig, PromoFila (+4 more)

### Community 2 - "app.module.ts"
Cohesion: 0.21
Nodes (12): JwtAuthGuard, Injectable, AuthUser, Usuario, PermissionGuard, Injectable, MODOS_REDONDEO, TAX_RATES (+4 more)

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
Cohesion: 0.11
Nodes (21): guardarPrecio(), buscarProductoIds(), condicionTermino(), normalizar(), assertTaxRate(), parseOptionalDecimal(), ProductsController, Body (+13 more)

### Community 7 - "UsersController"
Cohesion: 0.21
Nodes (9): Body, Controller, Get, Param, Post, Put, Req, UseGuards (+1 more)

### Community 8 - "graphify Skill Pipeline (Claude Code)"
Cohesion: 0.07
Nodes (39): CLAUDE.md graphify Pointer, Add URL & Watch Folder Reference, Extra Exports & Benchmark Reference, Confidence Score Rubric, Extraction Subagent Prompt Spec, Node ID Format Rule, GitHub Clone & Cross-Repo Merge Reference, Commit Hook & CLAUDE.md Integration Reference (+31 more)

### Community 9 - "StockService"
Cohesion: 0.13
Nodes (14): StockController, Body, Controller, Get, Inject, Param, Post, Query (+6 more)

### Community 10 - "escritorio-page.tsx"
Cohesion: 0.11
Nodes (23): CommandPalette(), norm(), EscritorioShell(), PaletteContext, usePalette(), compact(), EscritorioSummary, pendientes() (+15 more)

### Community 11 - "RequirePermission"
Cohesion: 0.11
Nodes (19): entero(), monto(), parseConfig(), PromotionsController, SCOPES, Tipo, TIPOS, Body (+11 more)

### Community 12 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 13 - "AuthRequest"
Cohesion: 0.22
Nodes (11): AuthRequest, PricesController, Body, Controller, Delete, Get, Param, Post (+3 more)

### Community 14 - "PosPage"
Cohesion: 0.11
Nodes (16): ProductSearchDialog(), alTeclear(), elegible(), elegir(), money(), describirPromo(), fmtHora(), PosPage() (+8 more)

### Community 15 - "errorMessage"
Cohesion: 0.14
Nodes (37): api(), errorMessage(), UsersPage(), submitCreate(), submitEdit(), CustomersPage(), openCuenta(), registrarPago() (+29 more)

### Community 16 - "auth-background.tsx"
Cohesion: 0.16
Nodes (20): AuthBackground(), alCambiarVisibilidad(), crearFormas(), dibujar(), elegirPosicionLado(), loop(), obtenerRectObstaculo(), paso() (+12 more)

### Community 17 - "dependencies"
Cohesion: 0.11
Nodes (19): argon2, dependencies, argon2, class-transformer, class-validator, exceljs, jsonwebtoken, @nestjs/common (+11 more)

### Community 18 - "CajaService"
Cohesion: 0.11
Nodes (16): CashRegistersController, CashShiftsController, Body, Controller, Get, Inject, Param, Post (+8 more)

### Community 19 - "Product Definition (Abasto Vision)"
Cohesion: 0.17
Nodes (12): Integración con ARCA (sin definir), Caja / Arqueo, CashMovement Model, CashRegister Model, CashShift Model, Cuenta Corriente de Clientes, CustomerAccountMovement Model, Empresa → Sucursal → Usuario Structure (+4 more)

### Community 20 - "ProductsPage"
Cohesion: 0.18
Nodes (8): ApiError, downloadFile(), ProductsPage(), clearCatalog(), createCategory(), exportExcel(), importCatalog(), exportPrices()

### Community 21 - "Reference Catalog Category Classification"
Cohesion: 0.40
Nodes (5): classify-reference-categories.ts script, enrich-reference-categories.ts script, Brand/Keyword Offline Classifier, Reference Catalog Category Classification, Precios Claros API (category tree)

### Community 22 - "PriceListsController"
Cohesion: 0.17
Nodes (11): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+3 more)

### Community 23 - "PriceRulesController"
Cohesion: 0.12
Nodes (19): Decimalish, priceChange(), PriceField, PriceHistoryEntry, PriceSource, toNumber(), PriceRulesController, Body (+11 more)

### Community 24 - "useAuth"
Cohesion: 0.12
Nodes (19): PermissionRoute(), FullScreenRoute(), ProtectedRoute(), useAuth(), LoginPage(), submit(), SignupPage(), submit() (+11 more)

### Community 25 - "CustomersController"
Cohesion: 0.17
Nodes (11): CustomersController, Body, Controller, Get, Inject, Param, Post, Put (+3 more)

### Community 26 - "price-import.util.ts"
Cohesion: 0.20
Nodes (14): BARCODE_ALIASES, COST_ALIASES, detectDelimiter(), findColumn(), matrixFromCsv(), matrixFromXlsx(), NAME_ALIASES, normalizeHeader() (+6 more)

### Community 27 - "StockInPage"
Cohesion: 0.18
Nodes (7): draftKey(), readDraft(), StockInPage(), addLine(), cancelCorrection(), createProductInline(), submit()

### Community 28 - "prices.service.ts"
Cohesion: 0.13
Nodes (15): Inject, Inject, BulkInput, OPERATIONS, OperationType, PricesService, Rounding, ROUNDINGS (+7 more)

### Community 29 - "theme.ts"
Cohesion: 0.53
Nodes (5): aplicar(), leer(), prefiereOscuro(), Theme, useTheme()

### Community 30 - "seed-demo.ts"
Cohesion: 0.24
Nodes (13): bare(), CATEGORIAS, CLIENTES, daysAgo(), daysFromNow(), main(), money(), pad() (+5 more)

### Community 31 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, module, moduleResolution, outDir, skipLibCheck (+5 more)

### Community 32 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, prisma, tsx, @types/express, @types/multer, @types/node, typescript, typescript (+5 more)

### Community 33 - "SalesService"
Cohesion: 0.25
Nodes (3): SalesService, Inject, Injectable

### Community 35 - "enrich-reference-categories.ts"
Cohesion: 0.27
Nodes (11): apiGet(), Categoria, HEADERS, main(), pickSucursalBatches(), prisma, Producto, productosDeRubro() (+3 more)

### Community 36 - "Mayorista ERP Project Overview"
Cohesion: 0.22
Nodes (11): Graphify Knowledge Graph Workflow (AGENTS.md), main.ts Bootstrap (ValidationPipe), Graphify Knowledge Graph Workflow (CLAUDE.md), Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger, Manual Validation Style (no DTOs), Purchase Invoices Endpoints (+3 more)

### Community 37 - "Rangos Permission System (RBAC)"
Cohesion: 0.33
Nodes (7): Prisma schema.prisma, Multi-Tenancy Strategy, GET /auth/me Endpoint, caja.autorizar_anulacion Permission, RangoPermission Model, Rangos Permission System (RBAC), User.rangoId Field

### Community 38 - "Tenants Controller"
Cohesion: 0.24
Nodes (7): TenantsController, Controller, Get, Inject, Param, Req, UseGuards

### Community 39 - "products table"
Cohesion: 0.22
Nodes (10): Auth Endpoints (signup/login/users), API Base Reference, Products Endpoints, Category Model (per-tenant), POST /products/import-reference, product_reference Global Table, GET /product-reference/:ean, SEPA Open Data Source (+2 more)

### Community 40 - "CuentasCorrientesController"
Cohesion: 0.26
Nodes (8): CuentasCorrientesController, Body, Controller, Get, Param, Post, Req, UseGuards

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
Cohesion: 0.08
Nodes (17): TIPOS_MOVIMIENTO, Usuario, HealthController, Controller, Get, Inject, activarPreciosVigentes(), PrismaModule (+9 more)

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

### Community 52 - "CategoriesPage"
Cohesion: 0.33
Nodes (3): CategoriesPage(), confirmDelete(), submit()

### Community 53 - "backend/package.json"
Cohesion: 0.40
Nodes (4): name, prisma, seed, private

### Community 54 - "CuentasCorrientesService"
Cohesion: 0.20
Nodes (6): Db, registrarMovimientoCuenta(), Inject, CuentasCorrientesService, Inject, Injectable

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

### Community 59 - "price-resolver.util.ts"
Cohesion: 0.36
Nodes (7): Db, ListaResuelta, precioExplicito(), PriceSource, redondear2(), resolverPrecio(), resolverPrecios()

### Community 60 - "SalesHistoryPage"
Cohesion: 0.50
Nodes (4): comprobante(), fechaHora(), SalesHistoryPage(), anular()

### Community 61 - "SupervisorAuthDialog"
Cohesion: 1.00
Nodes (3): SupervisorAuthDialog(), reset(), submit()

### Community 62 - "App"
Cohesion: 0.33
Nodes (5): Frontend Architecture (single App.tsx, no router), frontend/index.html Entry Point, App(), AuthProvider(), readStoredSession()

### Community 65 - "stock.service.ts"
Cohesion: 0.60
Nodes (3): Scope, IN_MOVEMENT_TYPES, OUT_MOVEMENT_TYPES

### Community 88 - "RangosService"
Cohesion: 0.12
Nodes (13): RangosController, Body, Controller, Delete, Get, Inject, Param, Post (+5 more)

### Community 91 - "SalesController"
Cohesion: 0.21
Nodes (10): SalesController, Body, Controller, Get, Inject, Param, Post, Query (+2 more)

### Community 92 - "SuppliersController"
Cohesion: 0.18
Nodes (10): SuppliersController, Body, Controller, Get, Inject, Param, Post, Put (+2 more)

### Community 93 - "WarehousesController"
Cohesion: 0.18
Nodes (10): Body, Controller, Get, Inject, Param, Post, Put, Req (+2 more)

### Community 94 - "PurchasesService"
Cohesion: 0.15
Nodes (11): PurchasesController, Body, Controller, Inject, Param, Post, Req, UseGuards (+3 more)

### Community 95 - "Diseño — Abasto"
Cohesion: 0.11
Nodes (17): Configurable, Deudas conocidas, Diseño — Abasto, Dos excepciones, por contexto de trabajo, El escritorio, El módulo — también un solo molde, El sistema visual, cerrado, Estado tranquilo (+9 more)

### Community 96 - "AuthService"
Cohesion: 0.17
Nodes (7): Inject, AuthService, Inject, Injectable, Inject, AdminGuard (admin-only write gate), Auth Architecture (JWT, Guards, Argon2id)

## Knowledge Gaps
- **266 isolated node(s):** `name`, `private`, `start:dev`, `start`, `db:generate` (+261 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 490 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `AuthService` to `app.module.ts`, `permissions.catalog.ts`, `Mayorista ERP Project Overview`, `errorMessage`?**
  _High betweenness centrality (0.229) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `AuthRequest` to `app.module.ts`, `permissions.catalog.ts`, `ProductsController`, `UsersController`, `StockService`, `RequirePermission`, `CajaService`, `PriceListsController`, `PriceRulesController`, `CustomersController`, `prices.service.ts`, `Tenants Controller`, `CuentasCorrientesController`, `CategoriesController`, `ReportesController`, `EscritorioController`, `RangosService`, `SalesController`, `SuppliersController`, `WarehousesController`, `PurchasesService`, `AuthService`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `errorMessage()` connect `errorMessage` to `api.ts`, `PosPage`, `RangosPage`, `CategoriesPage`, `ProductsPage`, `useAuth`, `ExpirationsPage`, `StockInPage`, `SalesHistoryPage`, `SupervisorAuthDialog`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `name`, `private`, `start:dev` to the rest of the system?**
  _266 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06905581325751908 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `permissions.catalog.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08602150537634409 - nodes in this community are weakly interconnected._