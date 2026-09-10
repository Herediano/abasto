# Graph Report - abasto  (2026-09-10)

## Corpus Check
- 258 files · ~165,348 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1840 nodes · 5060 edges · 104 communities (96 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 175 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `15965b9f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sidebar.ts
- escritorio.ts
- app.module.ts
- devDependencies
- AuthService
- stock-transfer-page.tsx
- useAuth
- 3. Diseño — adherencia al sistema visual
- graphify Skill Pipeline (Claude Code)
- StockService
- escritorio-page.tsx
- promotions.controller.ts
- compilerOptions
- PriceRulesController
- money
- .token
- auth-background.tsx
- dependencies
- escritorio-shell.tsx
- EscritorioController
- CajaService
- registrarMovimientoCuenta
- PriceListsController
- pos-page.tsx
- SalesService
- CustomersController
- i18n/utils.ts
- StockInPage
- prices.service.ts
- ventas-chart.tsx
- seed-demo.ts
- compilerOptions
- devDependencies
- lazy-pages.ts
- credit-notes.service.ts
- enrich-reference-categories.ts
- price-import.util.ts
- cn
- Tenants Controller
- BranchesController
- products.controller.ts
- compilerOptions
- scripts
- PriceActivationService
- .constructor
- useTheme
- Product Definition (Abasto Vision)
- stock-history-page.tsx
- allowScripts
- RangosPage
- modules.tsx
- main.ts
- landing/package.json
- backend/package.json
- user-menu.tsx
- CategoriesController
- ReportesController
- ProductSearchDialog
- RangosService
- import-reference-from-xlsx.ts
- SuppliersController
- PricesService
- SupervisorAuthDialog
- graphify.js
- CustomersPage
- ProductReferenceController
- WarehousesPage
- @prisma/client
- PurchasesService
- ProductsController
- TasksController
- downloadFile
- CategoriesPage
- vite.config.ts
- HealthController
- BootstrapService
- branch.ts
- PrismaModule
- scripts
- api.ts
- dependencies
- Abasto — landing
- AuthRequest
- WarehousesController
- landing/tsconfig.json
- Diseño — Abasto
- sales-history-page.tsx
- errorMessage
- frontend/package.json
- api
- rules/graphify.md
- workflows/graphify.md
- PricesController
- Frontend Design
- opencode.json
- Mayorista ERP Project Overview
- products table
- Base Data Model
- Web Interface Guidelines
- Rangos Permission System (RBAC)
- Purchases/Reception/Stock Research
- price-resolver.util.ts

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 150 edges
2. `RequirePermission()` - 116 edges
3. `errorMessage()` - 115 edges
4. `api` - 106 edges
5. `cn()` - 99 edges
6. `useAuth()` - 76 edges
7. `react` - 67 edges
8. `PrismaService` - 64 edges
9. `@nestjs/common` - 46 edges
10. `@phosphor-icons/react` - 43 edges

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

## Communities (104 total, 6 thin omitted)

### Community 0 - "sidebar.ts"
Cohesion: 0.36
Nodes (7): emit(), listeners, open, setSidebarOpen(), subscribe(), toggleSidebar(), useSidebar()

### Community 1 - "escritorio.ts"
Cohesion: 0.21
Nodes (13): compact(), DIA_INI, ejemplos(), lc(), Pendiente, plural(), serieBars(), statFor() (+5 more)

### Community 2 - "app.module.ts"
Cohesion: 0.17
Nodes (19): JwtAuthGuard, Injectable, TIMEZONES, AuthUser, METODOS_PAGO, Usuario, PermissionGuard, Injectable (+11 more)

### Community 3 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, tailwindcss, tailwindcss-animate, @tailwindcss/vite, @types/react, @types/react-dom, typescript, vite (+1 more)

### Community 4 - "AuthService"
Cohesion: 0.05
Nodes (34): AuthController, Body, Controller, Get, Inject, Patch, Post, Req (+26 more)

### Community 5 - "stock-transfer-page.tsx"
Cohesion: 0.23
Nodes (12): ProductPicker(), Spinner(), Alert(), alertVariants, Input, Textarea, Product, Session (+4 more)

### Community 6 - "useAuth"
Cohesion: 0.09
Nodes (28): AccountList(), ExportButton(), PermissionRoute(), RowList(), RowListItem(), Avatar(), DialogDescription, PaymentAdjustment (+20 more)

### Community 7 - "3. Diseño — adherencia al sistema visual"
Cohesion: 0.07
Nodes (29): 1. Veredicto, 2. Lo que está sólido — no tocar, 3.10 Login — ¿segunda apuesta de carácter?, 3.1 La escala tipográfica no se aplica  · *alto impacto, bajo esfuerzo*, 3.2 Valores arbitrarios  · *el doc: "no se usan valores sueltos"*, 3.3 Color — el verde sólido como estado, 3.4 Radio inconsistente, 3.5 Elevación — "todo lo demás está al ras" (+21 more)

### Community 8 - "graphify Skill Pipeline (Claude Code)"
Cohesion: 0.07
Nodes (39): CLAUDE.md graphify Pointer, Add URL & Watch Folder Reference, Extra Exports & Benchmark Reference, Confidence Score Rubric, Extraction Subagent Prompt Spec, Node ID Format Rule, GitHub Clone & Cross-Repo Merge Reference, Commit Hook & CLAUDE.md Integration Reference (+31 more)

### Community 9 - "StockService"
Cohesion: 0.13
Nodes (13): StockController, Body, Controller, Inject, Param, Post, Query, Req (+5 more)

### Community 10 - "escritorio-page.tsx"
Cohesion: 0.16
Nodes (21): useEscritorioSummary(), hora(), prefetchRoute(), AbrirMostrador(), aSize(), Caja, cap(), centrarTablero() (+13 more)

### Community 11 - "promotions.controller.ts"
Cohesion: 0.10
Nodes (21): describirPromo(), entero(), monto(), parseConfig(), PromotionsController, SCOPES, Tipo, TIPO_LABEL (+13 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 13 - "PriceRulesController"
Cohesion: 0.21
Nodes (10): PriceRulesController, Body, Controller, Delete, Get, Param, Post, Put (+2 more)

### Community 14 - "money"
Cohesion: 0.11
Nodes (15): money(), parseWeighedBarcode(), ReportesPage(), describirPromo(), PosPage(), abrirTurno(), agregarMovimiento(), cambiarCantidad() (+7 more)

### Community 15 - ".token"
Cohesion: 0.18
Nodes (17): PricesPage(), addTramo(), apply(), buildBody(), calculate(), cancelScheduled(), deleteList(), deletePromo() (+9 more)

### Community 16 - "auth-background.tsx"
Cohesion: 0.16
Nodes (20): AuthBackground(), alCambiarVisibilidad(), crearFormas(), dibujar(), elegirPosicionLado(), loop(), obtenerRectObstaculo(), paso() (+12 more)

### Community 17 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, argon2, class-transformer, class-validator, exceljs, jsonwebtoken, @nestjs/common, @nestjs/core (+6 more)

### Community 18 - "escritorio-shell.tsx"
Cohesion: 0.15
Nodes (19): AppHeader(), EscritorioShell(), onKey(), PaletteContext, SummaryContext, usePalette(), pctDePx(), PreguntarFlotante() (+11 more)

### Community 19 - "EscritorioController"
Cohesion: 0.25
Nodes (6): EscritorioController, Controller, Get, Inject, Req, UseGuards

### Community 20 - "CajaService"
Cohesion: 0.10
Nodes (19): CashRegistersController, CashShiftsController, Body, Controller, Get, Inject, Param, Post (+11 more)

### Community 21 - "registrarMovimientoCuenta"
Cohesion: 0.14
Nodes (13): registrarMovimientoCuenta(), CuentasCorrientesController, Body, Controller, Get, Inject, Param, Post (+5 more)

### Community 22 - "PriceListsController"
Cohesion: 0.15
Nodes (13): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+5 more)

### Community 23 - "pos-page.tsx"
Cohesion: 0.15
Nodes (23): ExportParams, ActiveFilter, LineaCotizada, Button, ButtonProps, buttonVariants, Dialog, DialogContent (+15 more)

### Community 24 - "SalesService"
Cohesion: 0.23
Nodes (4): r2(), SalesService, Inject, Injectable

### Community 25 - "CustomersController"
Cohesion: 0.16
Nodes (12): CustomersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 26 - "i18n/utils.ts"
Cohesion: 0.06
Nodes (35): lang, t, year, home, lang, links, t, enHref (+27 more)

### Community 27 - "StockInPage"
Cohesion: 0.16
Nodes (9): draftKey(), readDraft(), StockInPage(), addLine(), cancelCorrection(), createProductInline(), startCorrection(), submit() (+1 more)

### Community 28 - "prices.service.ts"
Cohesion: 0.13
Nodes (19): Decimalish, priceChange(), PriceField, PriceHistoryEntry, PriceSource, toNumber(), guardarPrecio(), aplicarModo() (+11 more)

### Community 29 - "ventas-chart.tsx"
Cohesion: 0.21
Nodes (11): COMPARA, fmt(), Metric, METRICS, pct(), Period, PERIODS, Serie (+3 more)

### Community 30 - "seed-demo.ts"
Cohesion: 0.24
Nodes (13): bare(), CATEGORIAS, CLIENTES, daysAgo(), daysFromNow(), main(), money(), pad() (+5 more)

### Community 31 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, module, moduleResolution, outDir, skipLibCheck (+3 more)

### Community 32 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, prisma, tsx, @types/express, @types/multer, @types/node, typescript

### Community 33 - "lazy-pages.ts"
Cohesion: 0.10
Nodes (33): FullScreenRoute(), ProtectedRoute(), FullPageLoading(), clearGuard(), guardTripped(), lazyPage(), loadOrReloadOnce(), noop() (+25 more)

### Community 34 - "credit-notes.service.ts"
Cohesion: 0.11
Nodes (17): CreditNotesController, Body, Controller, Get, Inject, Param, Post, Query (+9 more)

### Community 35 - "enrich-reference-categories.ts"
Cohesion: 0.27
Nodes (11): apiGet(), Categoria, HEADERS, main(), pickSucursalBatches(), prisma, Producto, productosDeRubro() (+3 more)

### Community 36 - "price-import.util.ts"
Cohesion: 0.20
Nodes (14): BARCODE_ALIASES, COST_ALIASES, detectDelimiter(), findColumn(), matrixFromCsv(), matrixFromXlsx(), NAME_ALIASES, normalizeHeader() (+6 more)

### Community 37 - "cn"
Cohesion: 0.11
Nodes (32): Task, Sidebar(), SidebarToggle(), SidebarItem(), SidebarItemProps, PageHeader(), Skeleton(), TableSkeleton() (+24 more)

### Community 38 - "Tenants Controller"
Cohesion: 0.24
Nodes (7): TenantsController, Controller, Get, Inject, Param, Req, UseGuards

### Community 39 - "BranchesController"
Cohesion: 0.18
Nodes (12): BranchesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 40 - "products.controller.ts"
Cohesion: 0.14
Nodes (16): csvCell(), ExportColumn, sendExport(), buscarProductoIds(), condicionTermino(), normalizar(), IVA_RATE, IVA_SITUACIONES (+8 more)

### Community 41 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 42 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, db:enrich-categories, db:generate, db:import-reference, db:migrate, db:seed, db:seed-demo, start (+1 more)

### Community 43 - "PriceActivationService"
Cohesion: 0.32
Nodes (4): PriceActivationService, Inject, Injectable, Cron

### Community 45 - "useTheme"
Cohesion: 0.43
Nodes (7): aplicar(), elegido(), media(), sistema(), Theme, useTheme(), PreferenciasSection()

### Community 46 - "Product Definition (Abasto Vision)"
Cohesion: 0.15
Nodes (13): Integración con ARCA (sin definir), Caja / Arqueo, CashMovement Model, CashRegister Model, CashShift Model, Cuenta Corriente de Clientes, CustomerAccountMovement Model, Empresa → Sucursal → Usuario Structure (+5 more)

### Community 47 - "stock-history-page.tsx"
Cohesion: 0.13
Nodes (26): ModuleSection(), ModuleView, STOCK_VIEWS, StockView, stockViews(), Movement, Supplier, ARS (+18 more)

### Community 48 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, argon2@0.45.1, esbuild@0.28.2, prisma@6.19.3, @prisma/client@6.19.3, @prisma/engines@6.19.3

### Community 49 - "RangosPage"
Cohesion: 0.40
Nodes (5): RangosPage(), abrirEdicion(), borrar(), crear(), guardar()

### Community 50 - "modules.tsx"
Cohesion: 0.15
Nodes (13): CommandPalette(), go(), onKeyDown(), norm(), NavRiel(), BY_KEY, gridModules(), hueFor() (+5 more)

### Community 51 - "main.ts"
Cohesion: 0.27
Nodes (7): AppModule, Module, bootstrap(), PrismaExceptionFilter, Catch, @nestjs/core, reflect-metadata

### Community 52 - "landing/package.json"
Cohesion: 0.08
Nodes (23): dependencies, astro, @astrojs/sitemap, @fontsource/geist-mono, @fontsource/geist-sans, devDependencies, tailwindcss, @tailwindcss/vite (+15 more)

### Community 53 - "backend/package.json"
Cohesion: 0.11
Nodes (17): typescript, name, prisma, seed, private, argon2, class-transformer, class-validator (+9 more)

### Community 54 - "user-menu.tsx"
Cohesion: 0.18
Nodes (20): ChecklistToggle(), NotificationBell(), Menu, MenuBlock(), MenuContent, MenuGroup, MenuItem, MenuLabel (+12 more)

### Community 55 - "CategoriesController"
Cohesion: 0.16
Nodes (12): CategoriesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 56 - "ReportesController"
Cohesion: 0.24
Nodes (8): ReportesController, Controller, Get, Inject, Query, Req, Res, UseGuards

### Community 57 - "ProductSearchDialog"
Cohesion: 0.83
Nodes (4): ProductSearchDialog(), alTeclear(), elegible(), elegir()

### Community 58 - "RangosService"
Cohesion: 0.27
Nodes (4): Inject, RangosService, Inject, Injectable

### Community 59 - "import-reference-from-xlsx.ts"
Cohesion: 0.47
Nodes (5): cellText(), findColumn(), HEADERS, main(), prisma

### Community 60 - "SuppliersController"
Cohesion: 0.15
Nodes (12): SuppliersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 61 - "PricesService"
Cohesion: 0.25
Nodes (5): Inject, Inject, PricesService, Inject, Injectable

### Community 62 - "SupervisorAuthDialog"
Cohesion: 1.00
Nodes (3): SupervisorAuthDialog(), reset(), submit()

### Community 64 - "CustomersPage"
Cohesion: 0.33
Nodes (5): CustomersPage(), openCuenta(), registrarPago(), submit(), toggleActive()

### Community 65 - "ProductReferenceController"
Cohesion: 0.25
Nodes (6): ProductReferenceController, Controller, Get, Inject, Param, UseGuards

### Community 67 - "WarehousesPage"
Cohesion: 0.33
Nodes (3): WarehousesPage(), submit(), submitCaja()

### Community 68 - "@prisma/client"
Cohesion: 0.11
Nodes (13): prisma, Db, CORRECTABLE_STATUSES, InvoiceLineInput, OtherTax, OtherTaxInput, FORMAS_PAGO, PagoPedido (+5 more)

### Community 70 - "PurchasesService"
Cohesion: 0.22
Nodes (4): Inject, PurchasesService, Inject, Injectable

### Community 71 - "ProductsController"
Cohesion: 0.11
Nodes (19): assertTaxRate(), normalizeSaleUnit(), parseIva(), parseOptionalDecimal(), ProductsController, Body, Controller, Delete (+11 more)

### Community 72 - "TasksController"
Cohesion: 0.17
Nodes (11): TasksController, Body, Controller, Delete, Get, Inject, Param, Patch (+3 more)

### Community 73 - "downloadFile"
Cohesion: 0.25
Nodes (10): go(), copy(), download(), toQs(), ApiError, branchHeaders(), downloadFile(), exportText() (+2 more)

### Community 74 - "CategoriesPage"
Cohesion: 0.33
Nodes (3): CategoriesPage(), confirmDelete(), submit()

### Community 77 - "HealthController"
Cohesion: 0.33
Nodes (4): HealthController, Controller, Get, Inject

### Community 78 - "BootstrapService"
Cohesion: 0.40
Nodes (3): BootstrapService, Inject, Injectable

### Community 79 - "branch.ts"
Cohesion: 0.50
Nodes (4): activeBranchFor(), read(), setActiveBranch(), Stored

### Community 80 - "PrismaModule"
Cohesion: 0.67
Nodes (3): PrismaModule, Module, Global

### Community 82 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 88 - "api.ts"
Cohesion: 0.07
Nodes (33): CashMovement, Category, CreditNoteLine, CustomerAccountMovement, LowStockProduct, Permission, PriceAuditRow, PriceHistoryRow (+25 more)

### Community 90 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, class-variance-authority, clsx, motion, @phosphor-icons/react, @radix-ui/react-checkbox, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu (+7 more)

### Community 91 - "Abasto — landing"
Cohesion: 0.25
Nodes (7): Abasto — landing, Correr, Cómo está armado, Deploy en Cloudflare Pages, El fondo, Pendientes (TO-DO), Sincronizar el tema con la app

### Community 92 - "AuthRequest"
Cohesion: 0.08
Nodes (33): AuthRequest, PurchasesController, Body, Controller, Get, Param, Post, Req (+25 more)

### Community 93 - "WarehousesController"
Cohesion: 0.15
Nodes (12): Body, Controller, Get, Inject, Param, Post, Put, Query (+4 more)

### Community 94 - "landing/tsconfig.json"
Cohesion: 0.40
Nodes (4): exclude, extends, include, astro/tsconfigs/strict

### Community 95 - "Diseño — Abasto"
Cohesion: 0.05
Nodes (44): 1 · La cabecera — `PageHeader`, pegajosa, 2 · Línea de resumen — las cifras que importan, 3 · Vistas — una a la vez, 4 · El listado — filas, selección y acciones, Base y semántica, Color, Color por módulo — identidad, no estado, Configurable (+36 more)

### Community 97 - "sales-history-page.tsx"
Cohesion: 0.18
Nodes (35): EmptyState(), ExportMenu(), Field(), ListFilters(), ModuleScreen(), SummaryLine(), PageSpinner(), Badge() (+27 more)

### Community 101 - "errorMessage"
Cohesion: 0.10
Nodes (24): errorMessage(), fileToResizedDataUrl(), ActionStatus, useAsyncAction(), UseAsyncActionOptions, useDataLoader(), UseDataLoaderOptions, AjustesPagoDialog() (+16 more)

### Community 103 - "frontend/package.json"
Cohesion: 0.11
Nodes (18): tailwindcss, @tailwindcss/vite, typescript, name, private, type, version, clsx (+10 more)

### Community 105 - "api"
Cohesion: 0.09
Nodes (27): api, UsersPage(), submitCreate(), submitEdit(), formOf(), ivaLabel(), margin(), ProductDetailPage() (+19 more)

### Community 113 - "PricesController"
Cohesion: 0.20
Nodes (10): PricesController, Body, Controller, Delete, Get, Param, Post, Query (+2 more)

### Community 114 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 116 - "Mayorista ERP Project Overview"
Cohesion: 0.18
Nodes (13): Graphify Knowledge Graph Workflow (AGENTS.md), main.ts Bootstrap (ValidationPipe), Frontend Architecture (single App.tsx, no router), Graphify Knowledge Graph Workflow (CLAUDE.md), Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger, Manual Validation Style (no DTOs) (+5 more)

### Community 117 - "products table"
Cohesion: 0.20
Nodes (11): classify-reference-categories.ts script, enrich-reference-categories.ts script, Category Model (per-tenant), POST /products/import-reference, product_reference Global Table, GET /product-reference/:ean, Brand/Keyword Offline Classifier, Reference Catalog Category Classification (+3 more)

### Community 118 - "Base Data Model"
Cohesion: 0.26
Nodes (12): Auth Endpoints (signup/login/users), Catalog Endpoints (Warehouses/Suppliers/Lots), API Base Reference, Products Endpoints, customers table, Base Data Model, product_lots table, stock_movements table (+4 more)

### Community 125 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 127 - "Rangos Permission System (RBAC)"
Cohesion: 0.33
Nodes (7): Prisma schema.prisma, Multi-Tenancy Strategy, GET /auth/me Endpoint, caja.autorizar_anulacion Permission, RangoPermission Model, Rangos Permission System (RBAC), User.rangoId Field

### Community 131 - "Purchases/Reception/Stock Research"
Cohesion: 0.33
Nodes (6): ARCA: Emisión y Autorización de Factura Electrónica, ARCA: Régimen General y Clases de Comprobantes, GS1 Global Traceability Standard, Oracle Procurement Three-Way Match Docs, Purchases/Reception/Stock Research, Three-Way Match Concept

### Community 139 - "price-resolver.util.ts"
Cohesion: 0.17
Nodes (16): Db, ListaResuelta, precioExplicito(), PriceSource, redondear2(), resolverPrecio(), resolverPrecios(), alcanza() (+8 more)

## Knowledge Gaps
- **449 isolated node(s):** `$schema`, `plugin`, `name`, `private`, `start:dev` (+444 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 692 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `AuthService` to `app.module.ts`, `Mayorista ERP Project Overview`, `.token`?**
  _High betweenness centrality (0.333) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `AuthRequest` to `app.module.ts`, `AuthService`, `StockService`, `promotions.controller.ts`, `PriceRulesController`, `EscritorioController`, `CajaService`, `registrarMovimientoCuenta`, `PriceListsController`, `CustomersController`, `credit-notes.service.ts`, `Tenants Controller`, `BranchesController`, `products.controller.ts`, `CategoriesController`, `ReportesController`, `SuppliersController`, `ProductsController`, `TasksController`, `WarehousesController`, `PricesController`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **Why does `api` connect `api` to `stock-transfer-page.tsx`, `useAuth`, `money`, `.token`, `escritorio-shell.tsx`, `pos-page.tsx`, `StockInPage`, `ventas-chart.tsx`, `cn`, `stock-history-page.tsx`, `RangosPage`, `user-menu.tsx`, `CustomersPage`, `WarehousesPage`, `downloadFile`, `CategoriesPage`, `api.ts`, `sales-history-page.tsx`, `errorMessage`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **What connects `$schema`, `plugin`, `name` to the rest of the system?**
  _449 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AuthService` be split into smaller, more focused modules?**
  _Cohesion score 0.054098360655737705 - nodes in this community are weakly interconnected._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.09047619047619047 - nodes in this community are weakly interconnected._
- **Should `3. Diseño — adherencia al sistema visual` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._