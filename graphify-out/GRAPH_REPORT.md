# Graph Report - abasto  (2026-09-06)

## Corpus Check
- 230 files · ~143,519 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1716 nodes · 4443 edges · 115 communities (88 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 158 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `63146f29`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- CuentasCorrientesController
- app.module.ts
- dependencies
- AuthService
- "tenants"
- RequirePermission
- 3. Diseño — adherencia al sistema visual
- graphify Skill Pipeline (Claude Code)
- StockService
- escritorio-page.tsx
- PromotionsController
- compilerOptions
- PurchasesController
- money
- errorMessage
- auth-background.tsx
- dependencies
- price-import.util.ts
- Product Definition (Abasto Vision)
- PricesController
- Purchases/Reception/Stock Research
- PriceListsController
- AuthRequest
- prices.service.ts
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
- SalesController
- CategoriesController
- ReportesController
- ExpirationsPage
- EscritorioController
- PrismaService
- SuppliersController
- CajaService
- App
- graphify.js
- @nestjs/platform-express
- PriceRulesController
- @prisma/client
- reflect-metadata
- 0015_product_reference/migration.sql
- auth.service.ts
- Reference Catalog Category Classification
- rxjs
- SalesHistoryPage
- Abasto — landing
- RangosController
- WarehousesController
- landing/tsconfig.json
- Diseño — Abasto
- RangosPage
- products table
- useTheme
- CreditNotesController
- EmpresaSection
- prisma.service.ts
- UsersPage
- .constructor
- products.controller.ts
- modules.tsx
- command-palette.tsx
- escritorio.ts
- prefs.ts
- ProductSearchDialog
- PurchasesService
- SucursalesSection
- branch-switcher.tsx
- opencode.json

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 142 edges
2. `RequirePermission()` - 114 edges
3. `errorMessage()` - 112 edges
4. `api` - 105 edges
5. `cn()` - 73 edges
6. `useAuth()` - 72 edges
7. `PrismaService` - 62 edges
8. `"tenants"` - 31 edges
9. `JwtAuthGuard` - 31 edges
10. `ProductsController` - 28 edges

## Surprising Connections (you probably didn't know these)
- `AdminGuard (admin-only write gate)` --references--> `JwtAuthGuard`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.guard.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `JwtAuthGuard`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.guard.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `AuthService`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.service.ts
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

## Communities (115 total, 8 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.05
Nodes (151): EmptyState(), ExportMenu(), download(), Field(), PermissionRoute(), FullScreenRoute(), ProtectedRoute(), ActiveFilter (+143 more)

### Community 1 - "CuentasCorrientesController"
Cohesion: 0.21
Nodes (9): CuentasCorrientesController, Body, Controller, Get, Inject, Param, Post, Req (+1 more)

### Community 2 - "app.module.ts"
Cohesion: 0.18
Nodes (17): JwtAuthGuard, Injectable, METODOS_PAGO, csvCell(), ExportColumn, sendExport(), PermissionGuard, Injectable (+9 more)

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

### Community 7 - "3. Diseño — adherencia al sistema visual"
Cohesion: 0.07
Nodes (28): 1. Veredicto, 2. Lo que está sólido — no tocar, 3.10 Login — ¿segunda apuesta de carácter?, 3.1 La escala tipográfica no se aplica  · *alto impacto, bajo esfuerzo*, 3.2 Valores arbitrarios  · *el doc: "no se usan valores sueltos"*, 3.3 Color — el verde sólido como estado, 3.4 Radio inconsistente, 3.5 Elevación — "todo lo demás está al ras" (+20 more)

### Community 8 - "graphify Skill Pipeline (Claude Code)"
Cohesion: 0.07
Nodes (39): CLAUDE.md graphify Pointer, Add URL & Watch Folder Reference, Extra Exports & Benchmark Reference, Confidence Score Rubric, Extraction Subagent Prompt Spec, Node ID Format Rule, GitHub Clone & Cross-Repo Merge Reference, Commit Hook & CLAUDE.md Integration Reference (+31 more)

### Community 9 - "StockService"
Cohesion: 0.12
Nodes (16): main.ts Bootstrap (ValidationPipe), StockController, Body, Controller, Get, Inject, Param, Post (+8 more)

### Community 10 - "escritorio-page.tsx"
Cohesion: 0.19
Nodes (13): usePalette(), pendientes(), gridModules(), AccionTile(), applyOrder(), cap(), Config, EscritorioPage() (+5 more)

### Community 11 - "PromotionsController"
Cohesion: 0.12
Nodes (17): describirPromo(), entero(), monto(), parseConfig(), PromotionsController, Body, Controller, Delete (+9 more)

### Community 12 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 13 - "PurchasesController"
Cohesion: 0.29
Nodes (8): PurchasesController, Body, Controller, Get, Param, Post, Req, UseGuards

### Community 14 - "money"
Cohesion: 0.10
Nodes (17): money(), parseWeighedBarcode(), ReportesPage(), describirPromo(), fmtHora(), PosPage(), abrirTurno(), agregarMovimiento() (+9 more)

### Community 15 - "errorMessage"
Cohesion: 0.16
Nodes (20): errorMessage(), submit(), submit(), PricesPage(), addTramo(), apply(), buildBody(), calculate() (+12 more)

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
Cohesion: 0.20
Nodes (10): PricesController, Body, Controller, Delete, Get, Param, Post, Query (+2 more)

### Community 21 - "Purchases/Reception/Stock Research"
Cohesion: 0.33
Nodes (6): ARCA: Emisión y Autorización de Factura Electrónica, ARCA: Régimen General y Clases de Comprobantes, GS1 Global Traceability Standard, Oracle Procurement Three-Way Match Docs, Purchases/Reception/Stock Research, Three-Way Match Concept

### Community 22 - "PriceListsController"
Cohesion: 0.15
Nodes (13): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+5 more)

### Community 23 - "AuthRequest"
Cohesion: 0.24
Nodes (12): AuthRequest, CashRegistersController, CashShiftsController, Body, Controller, Get, Param, Post (+4 more)

### Community 24 - "prices.service.ts"
Cohesion: 0.12
Nodes (24): Db, guardarPrecio(), ListaResuelta, precioExplicito(), PriceSource, redondear2(), resolverPrecio(), resolverPrecios() (+16 more)

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
Cohesion: 0.11
Nodes (17): alcanza(), cotizar(), Db, descuentoPromo(), LineaCotizada, LineaPedida, PromoConfig, PromoFila (+9 more)

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
Cohesion: 0.10
Nodes (22): api, AjustesPagoDialog(), guardar(), iniciales(), PasswordSection(), submit(), PerfilSection(), submit() (+14 more)

### Community 35 - "enrich-reference-categories.ts"
Cohesion: 0.27
Nodes (11): apiGet(), Categoria, HEADERS, main(), pickSucursalBatches(), prisma, Producto, productosDeRubro() (+3 more)

### Community 36 - "Mayorista ERP Project Overview"
Cohesion: 0.19
Nodes (13): Graphify Knowledge Graph Workflow (AGENTS.md), AdminGuard (admin-only write gate), Auth Architecture (JWT, Guards, Argon2id), Graphify Knowledge Graph Workflow (CLAUDE.md), Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger, Auth Endpoints (signup/login/users) (+5 more)

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
Cohesion: 0.16
Nodes (15): SupervisorAuthDialog(), reset(), submit(), margin(), ProductDetailPage(), addBarcode(), addTier(), removeBarcode() (+7 more)

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
Cohesion: 0.27
Nodes (5): PriceActivationService, Inject, Injectable, activarPreciosVigentes(), Cron

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
Cohesion: 0.13
Nodes (12): Inject, comprobante(), CreditNotesService, r2(), REFUND_METHODS, Injectable, Usuario, Db (+4 more)

### Community 51 - "WarehousesPage"
Cohesion: 0.33
Nodes (3): WarehousesPage(), submit(), submitCaja()

### Community 52 - "landing/package.json"
Cohesion: 0.08
Nodes (25): astro, @astrojs/sitemap, @fontsource/bricolage-grotesque, @fontsource/spline-sans, @fontsource/spline-sans-mono, dependencies, astro, @astrojs/sitemap (+17 more)

### Community 53 - "backend/package.json"
Cohesion: 0.40
Nodes (4): name, prisma, seed, private

### Community 54 - "SalesController"
Cohesion: 0.23
Nodes (10): SalesController, Body, Controller, Get, Param, Post, Query, Req (+2 more)

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

### Community 59 - "PrismaService"
Cohesion: 0.06
Nodes (17): BootstrapService, Inject, Injectable, Inject, Inject, HealthController, Controller, Get (+9 more)

### Community 60 - "SuppliersController"
Cohesion: 0.18
Nodes (11): SuppliersController, Body, Controller, Get, Param, Post, Put, Query (+3 more)

### Community 61 - "CajaService"
Cohesion: 0.16
Nodes (6): Inject, CajaService, monto(), texto(), Inject, Injectable

### Community 62 - "App"
Cohesion: 0.29
Nodes (6): Frontend Architecture (single App.tsx, no router), frontend/index.html Entry Point, App(), AuthProvider(), persist(), readAccounts()

### Community 65 - "PriceRulesController"
Cohesion: 0.21
Nodes (10): PriceRulesController, Body, Controller, Delete, Get, Param, Post, Put (+2 more)

### Community 70 - "auth.service.ts"
Cohesion: 0.17
Nodes (11): TIMEZONES, AuthUser, ALL, DEFAULT_RANGOS, PERMISSION_KEYS, PermissionDef, PermissionKey, PERMISSIONS (+3 more)

### Community 88 - "Reference Catalog Category Classification"
Cohesion: 0.40
Nodes (5): classify-reference-categories.ts script, enrich-reference-categories.ts script, Brand/Keyword Offline Classifier, Reference Catalog Category Classification, Precios Claros API (category tree)

### Community 90 - "SalesHistoryPage"
Cohesion: 0.40
Nodes (5): comprobante(), fechaHora(), SalesHistoryPage(), anular(), confirmarDevolucion()

### Community 91 - "Abasto — landing"
Cohesion: 0.25
Nodes (7): Abasto — landing, Correr, Cómo está armado, Deploy en Cloudflare Pages, El fondo, Pendientes (TO-DO), Sincronizar el tema con la app

### Community 92 - "RangosController"
Cohesion: 0.20
Nodes (10): RangosController, Body, Controller, Delete, Get, Param, Post, Put (+2 more)

### Community 93 - "WarehousesController"
Cohesion: 0.15
Nodes (12): Body, Controller, Get, Inject, Param, Post, Put, Query (+4 more)

### Community 94 - "landing/tsconfig.json"
Cohesion: 0.25
Nodes (7): exclude, extends, include, **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist

### Community 95 - "Diseño — Abasto"
Cohesion: 0.06
Nodes (36): Base y semántica, Color, Color por módulo — identidad, no estado, Configurable, Cómo leer este documento, Deudas conocidas, Diseño — Abasto, El celular (+28 more)

### Community 96 - "RangosPage"
Cohesion: 0.40
Nodes (5): RangosPage(), abrirEdicion(), borrar(), crear(), guardar()

### Community 97 - "products table"
Cohesion: 0.29
Nodes (8): Products Endpoints, Category Model (per-tenant), POST /products/import-reference, product_reference Global Table, GET /product-reference/:ean, SEPA Open Data Source, products table, Productos por Peso (Pesables)

### Community 99 - "useTheme"
Cohesion: 0.43
Nodes (6): aplicar(), leer(), prefiereOscuro(), Theme, useTheme(), PreferenciasSection()

### Community 100 - "CreditNotesController"
Cohesion: 0.24
Nodes (9): CreditNotesController, Body, Controller, Get, Param, Post, Query, Req (+1 more)

### Community 101 - "EmpresaSection"
Cohesion: 0.50
Nodes (4): fileToResizedDataUrl(), EmpresaSection(), pickLogo(), submit()

### Community 102 - "prisma.service.ts"
Cohesion: 0.12
Nodes (12): TIPOS_MOVIMIENTO, Usuario, PrismaModule, Module, CORRECTABLE_STATUSES, InvoiceLineInput, OtherTax, OtherTaxInput (+4 more)

### Community 103 - "UsersPage"
Cohesion: 0.40
Nodes (3): UsersPage(), submitCreate(), submitEdit()

### Community 105 - "products.controller.ts"
Cohesion: 0.23
Nodes (10): Decimalish, priceChange(), PriceField, PriceHistoryEntry, PriceSource, toNumber(), buscarProductoIds(), condicionTermino() (+2 more)

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

### Community 110 - "ProductSearchDialog"
Cohesion: 0.83
Nodes (4): ProductSearchDialog(), alTeclear(), elegible(), elegir()

### Community 111 - "PurchasesService"
Cohesion: 0.22
Nodes (4): Inject, PurchasesService, Inject, Injectable

### Community 112 - "SucursalesSection"
Cohesion: 0.40
Nodes (3): SucursalesSection(), accion(), submit()

### Community 114 - "branch-switcher.tsx"
Cohesion: 0.43
Nodes (5): BranchSwitcher(), activeBranchFor(), read(), setActiveBranch(), Stored

### Community 115 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **382 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `name`, `private`, `start:dev` (+377 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 642 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `AuthService` to `app.module.ts`, `Mayorista ERP Project Overview`, `auth.service.ts`, `.token`, `StockService`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `AuthRequest` to `CuentasCorrientesController`, `app.module.ts`, `AuthService`, `RequirePermission`, `StockService`, `PromotionsController`, `PurchasesController`, `PricesController`, `PriceListsController`, `prices.service.ts`, `CustomersController`, `Mayorista ERP Project Overview`, `Tenants Controller`, `BranchesController`, `SalesController`, `CategoriesController`, `ReportesController`, `EscritorioController`, `SuppliersController`, `PriceRulesController`, `RangosController`, `WarehousesController`, `CreditNotesController`, `products.controller.ts`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `api` connect `api` to `api.ts`, `RangosPage`, `EmpresaSection`, `UsersPage`, `.token`, `escritorio-page.tsx`, `money`, `errorMessage`, `SucursalesSection`, `branch-switcher.tsx`, `WarehousesPage`, `ExpirationsPage`, `SalesHistoryPage`, `StockInPage`, `ventas-chart.tsx`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `name` to the rest of the system?**
  _382 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054502369668246446 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `AuthService` be split into smaller, more focused modules?**
  _Cohesion score 0.053075396825396824 - nodes in this community are weakly interconnected._