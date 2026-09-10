# Graph Report - abasto  (2026-09-10)

## Corpus Check
- 260 files · ~167,062 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1848 nodes · 5086 edges · 107 communities (99 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 175 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `80bb9ac1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sidebar.ts
- escritorio.ts
- AuthRequest
- devDependencies
- AuthService
- stock-in-page.tsx
- react
- 3. Diseño — adherencia al sistema visual
- graphify Skill Pipeline (Claude Code)
- StockService
- escritorio-page.tsx
- PromotionsController
- compilerOptions
- PriceRulesController
- PosPage
- errorMessage
- auth-background.tsx
- dependencies
- escritorio-shell.tsx
- EscritorioController
- RequirePermission
- credit-notes.service.ts
- PriceListsController
- .create
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
- CreditNotesService
- enrich-reference-categories.ts
- price-import.util.ts
- cn
- Tenants Controller
- BranchesController
- .update
- compilerOptions
- scripts
- price-activation.service.ts
- .constructor
- useTheme
- Product Definition (Abasto Vision)
- useAuth
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
- product-detail-page.tsx
- import-reference-from-xlsx.ts
- SuppliersController
- alert.tsx
- SupervisorAuthDialog
- graphify.js
- rangos.service.ts
- PrismaService
- Mayorista ERP README Overview
- WarehousesPage
- sales.service.ts
- products.controller.ts
- PurchasesService
- ProductsController
- TasksController
- downloadFile
- CategoriesPage
- UsersPage
- vite.config.ts
- SucursalesSection
- CajaService
- branch.ts
- ajustes-page.tsx
- ProductReferenceController
- scripts
- api.ts
- dependencies
- Abasto — landing
- RangosService
- WarehousesController
- landing/tsconfig.json
- Diseño — Abasto
- sales-history-page.tsx
- use-async.ts
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

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 151 edges
2. `RequirePermission()` - 117 edges
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

## Communities (107 total, 6 thin omitted)

### Community 0 - "sidebar.ts"
Cohesion: 0.36
Nodes (7): emit(), listeners, open, setSidebarOpen(), subscribe(), toggleSidebar(), useSidebar()

### Community 1 - "escritorio.ts"
Cohesion: 0.21
Nodes (13): compact(), DIA_INI, ejemplos(), lc(), Pendiente, plural(), serieBars(), statFor() (+5 more)

### Community 2 - "AuthRequest"
Cohesion: 0.17
Nodes (25): JwtAuthGuard, Injectable, AuthRequest, METODOS_PAGO, TIPOS_MOVIMIENTO, Usuario, csvCell(), ExportColumn (+17 more)

### Community 3 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, tailwindcss, tailwindcss-animate, @tailwindcss/vite, @types/react, @types/react-dom, typescript, vite (+1 more)

### Community 4 - "AuthService"
Cohesion: 0.10
Nodes (18): AuthController, Body, Controller, Get, Inject, Patch, Post, Req (+10 more)

### Community 5 - "stock-in-page.tsx"
Cohesion: 0.11
Nodes (25): ModuleView, ProductPicker(), STOCK_VIEWS, StockView, Input, Select, Textarea, Lot (+17 more)

### Community 6 - "react"
Cohesion: 0.15
Nodes (19): Task, Sidebar(), SidebarToggle(), SidebarItem(), SidebarItemProps, PageHeader(), Checkbox, Kbd() (+11 more)

### Community 7 - "3. Diseño — adherencia al sistema visual"
Cohesion: 0.07
Nodes (29): 1. Veredicto, 2. Lo que está sólido — no tocar, 3.10 Login — ¿segunda apuesta de carácter?, 3.1 La escala tipográfica no se aplica  · *alto impacto, bajo esfuerzo*, 3.2 Valores arbitrarios  · *el doc: "no se usan valores sueltos"*, 3.3 Color — el verde sólido como estado, 3.4 Radio inconsistente, 3.5 Elevación — "todo lo demás está al ras" (+21 more)

### Community 8 - "graphify Skill Pipeline (Claude Code)"
Cohesion: 0.07
Nodes (39): CLAUDE.md graphify Pointer, Add URL & Watch Folder Reference, Extra Exports & Benchmark Reference, Confidence Score Rubric, Extraction Subagent Prompt Spec, Node ID Format Rule, GitHub Clone & Cross-Repo Merge Reference, Commit Hook & CLAUDE.md Integration Reference (+31 more)

### Community 9 - "StockService"
Cohesion: 0.12
Nodes (15): StockController, Body, Controller, Get, Inject, Param, Post, Query (+7 more)

### Community 10 - "escritorio-page.tsx"
Cohesion: 0.17
Nodes (20): hora(), prefetchRoute(), AbrirMostrador(), aSize(), Caja, cap(), centrarTablero(), computeLayout() (+12 more)

### Community 11 - "PromotionsController"
Cohesion: 0.12
Nodes (17): describirPromo(), entero(), monto(), parseConfig(), PromotionsController, Body, Controller, Delete (+9 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 13 - "PriceRulesController"
Cohesion: 0.21
Nodes (10): PriceRulesController, Body, Controller, Delete, Get, Param, Post, Put (+2 more)

### Community 14 - "PosPage"
Cohesion: 0.12
Nodes (11): parseWeighedBarcode(), PosPage(), abrirTurno(), agregarMovimiento(), cambiarCantidad(), cerrarTurno(), cobrar(), onKey() (+3 more)

### Community 15 - "errorMessage"
Cohesion: 0.14
Nodes (29): errorMessage(), submit(), submit(), CustomersPage(), openCuenta(), registrarPago(), submit(), toggleActive() (+21 more)

### Community 16 - "auth-background.tsx"
Cohesion: 0.16
Nodes (20): AuthBackground(), alCambiarVisibilidad(), crearFormas(), dibujar(), elegirPosicionLado(), loop(), obtenerRectObstaculo(), paso() (+12 more)

### Community 17 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, argon2, class-transformer, class-validator, exceljs, jsonwebtoken, @nestjs/common, @nestjs/core (+6 more)

### Community 18 - "escritorio-shell.tsx"
Cohesion: 0.11
Nodes (24): AppHeader(), EscritorioShell(), onKey(), PaletteContext, SummaryContext, useEscritorioSummary(), usePalette(), pctDePx() (+16 more)

### Community 19 - "EscritorioController"
Cohesion: 0.25
Nodes (6): EscritorioController, Controller, Get, Inject, Req, UseGuards

### Community 20 - "RequirePermission"
Cohesion: 0.24
Nodes (12): CashRegistersController, CashShiftsController, Body, Controller, Get, Param, Post, Query (+4 more)

### Community 21 - "credit-notes.service.ts"
Cohesion: 0.12
Nodes (16): REFUND_METHODS, Usuario, Db, registrarMovimientoCuenta(), CuentasCorrientesController, Body, Controller, Get (+8 more)

### Community 22 - "PriceListsController"
Cohesion: 0.15
Nodes (13): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+5 more)

### Community 23 - ".create"
Cohesion: 0.20
Nodes (8): assertTaxRate(), normalizeSaleUnit(), parseIva(), parseOptionalDecimal(), Body, Post, UploadedFile, UseInterceptors

### Community 24 - "SalesService"
Cohesion: 0.11
Nodes (15): SalesController, Body, Controller, Get, Inject, Param, Post, Query (+7 more)

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
Nodes (23): Db, guardarPrecio(), ListaResuelta, precioExplicito(), PriceSource, redondear2(), resolverPrecio(), resolverPrecios() (+15 more)

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

### Community 34 - "CreditNotesService"
Cohesion: 0.13
Nodes (15): CreditNotesController, Body, Controller, Get, Inject, Param, Post, Query (+7 more)

### Community 35 - "enrich-reference-categories.ts"
Cohesion: 0.27
Nodes (11): apiGet(), Categoria, HEADERS, main(), pickSucursalBatches(), prisma, Producto, productosDeRubro() (+3 more)

### Community 36 - "price-import.util.ts"
Cohesion: 0.20
Nodes (14): BARCODE_ALIASES, COST_ALIASES, detectDelimiter(), findColumn(), matrixFromCsv(), matrixFromXlsx(), NAME_ALIASES, normalizeHeader() (+6 more)

### Community 37 - "cn"
Cohesion: 0.20
Nodes (22): ModuleSection(), Skeleton(), TableSkeleton(), PageSpinner(), Card, CardContent, CardDescription, CardHeader (+14 more)

### Community 38 - "Tenants Controller"
Cohesion: 0.24
Nodes (7): TenantsController, Controller, Get, Inject, Param, Req, UseGuards

### Community 39 - "BranchesController"
Cohesion: 0.18
Nodes (12): BranchesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 40 - ".update"
Cohesion: 0.18
Nodes (10): Body, Controller, Get, Inject, Param, Post, Put, Req (+2 more)

### Community 41 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 42 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, db:enrich-categories, db:generate, db:import-reference, db:migrate, db:seed, db:seed-demo, start (+1 more)

### Community 43 - "price-activation.service.ts"
Cohesion: 0.24
Nodes (6): PriceActivationService, Inject, Injectable, activarPreciosVigentes(), Cron, @nestjs/schedule

### Community 45 - "useTheme"
Cohesion: 0.43
Nodes (7): aplicar(), elegido(), media(), sistema(), Theme, useTheme(), PreferenciasSection()

### Community 46 - "Product Definition (Abasto Vision)"
Cohesion: 0.17
Nodes (12): Integración con ARCA (sin definir), Caja / Arqueo, CashMovement Model, CashRegister Model, CashShift Model, Cuenta Corriente de Clientes, CustomerAccountMovement Model, Empresa → Sucursal → Usuario Structure (+4 more)

### Community 47 - "useAuth"
Cohesion: 0.17
Nodes (23): ExportButton(), PermissionRoute(), stockViews(), StockItem, useAuth(), ARS, esD, esT (+15 more)

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

### Community 58 - "product-detail-page.tsx"
Cohesion: 0.16
Nodes (12): Badge(), badgeVariants, Category, PriceTier, EMPTY_FORM, FormState, IVA_OPCIONES, PACK_NAMES (+4 more)

### Community 59 - "import-reference-from-xlsx.ts"
Cohesion: 0.47
Nodes (5): cellText(), findColumn(), HEADERS, main(), prisma

### Community 60 - "SuppliersController"
Cohesion: 0.15
Nodes (12): SuppliersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 61 - "alert.tsx"
Cohesion: 0.26
Nodes (9): Field(), TEMAS, ThemeToggle(), Alert(), alertVariants, Session, AuthLayout(), LoginPage() (+1 more)

### Community 62 - "SupervisorAuthDialog"
Cohesion: 1.00
Nodes (3): SupervisorAuthDialog(), reset(), submit()

### Community 64 - "rangos.service.ts"
Cohesion: 0.28
Nodes (7): ALL, DEFAULT_RANGOS, PERMISSION_KEYS, PermissionDef, PermissionKey, PERMISSIONS, SYSTEM_RANGO_NAMES

### Community 65 - "PrismaService"
Cohesion: 0.07
Nodes (17): Inject, BootstrapService, Inject, Injectable, Inject, HealthController, Controller, Get (+9 more)

### Community 66 - "Mayorista ERP README Overview"
Cohesion: 0.20
Nodes (9): classify-reference-categories.ts script, enrich-reference-categories.ts script, Auth Endpoints (signup/login/users), API Base Reference, Products Endpoints, Brand/Keyword Offline Classifier, Reference Catalog Category Classification, Precios Claros API (category tree) (+1 more)

### Community 67 - "WarehousesPage"
Cohesion: 0.33
Nodes (3): WarehousesPage(), submit(), submitCaja()

### Community 68 - "sales.service.ts"
Cohesion: 0.21
Nodes (12): alcanza(), cotizar(), Db, descuentoPromo(), LineaCotizada, LineaPedida, PromoConfig, PromoFila (+4 more)

### Community 69 - "products.controller.ts"
Cohesion: 0.08
Nodes (24): prisma, Decimalish, priceChange(), PriceField, PriceHistoryEntry, PriceSource, toNumber(), buscarProductoIds() (+16 more)

### Community 70 - "PurchasesService"
Cohesion: 0.13
Nodes (14): main.ts Bootstrap (ValidationPipe), PurchasesController, Body, Controller, Get, Inject, Param, Post (+6 more)

### Community 71 - "ProductsController"
Cohesion: 0.13
Nodes (15): ProductsController, Controller, Delete, Get, Inject, Param, Put, Query (+7 more)

### Community 72 - "TasksController"
Cohesion: 0.17
Nodes (11): TasksController, Body, Controller, Delete, Get, Inject, Param, Patch (+3 more)

### Community 73 - "downloadFile"
Cohesion: 0.25
Nodes (10): go(), copy(), download(), toQs(), ApiError, branchHeaders(), downloadFile(), exportText() (+2 more)

### Community 74 - "CategoriesPage"
Cohesion: 0.33
Nodes (3): CategoriesPage(), confirmDelete(), submit()

### Community 75 - "UsersPage"
Cohesion: 0.40
Nodes (3): UsersPage(), submitCreate(), submitEdit()

### Community 77 - "SucursalesSection"
Cohesion: 0.40
Nodes (3): SucursalesSection(), accion(), submit()

### Community 78 - "CajaService"
Cohesion: 0.16
Nodes (6): Inject, CajaService, monto(), texto(), Inject, Injectable

### Community 79 - "branch.ts"
Cohesion: 0.50
Nodes (4): activeBranchFor(), read(), setActiveBranch(), Stored

### Community 80 - "ajustes-page.tsx"
Cohesion: 0.15
Nodes (14): AccountList(), RowList(), RowListItem(), DialogDescription, Branch, PaymentAdjustment, PaymentMethod, settingsModules() (+6 more)

### Community 81 - "ProductReferenceController"
Cohesion: 0.25
Nodes (6): ProductReferenceController, Controller, Get, Inject, Param, UseGuards

### Community 82 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 88 - "api.ts"
Cohesion: 0.06
Nodes (36): CashMovement, CashShift, CreditNoteLine, Customer, CustomerAccount, CustomerAccountMovement, LowStockProduct, Permission (+28 more)

### Community 90 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, class-variance-authority, clsx, motion, @phosphor-icons/react, @radix-ui/react-checkbox, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu (+7 more)

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
Cohesion: 0.40
Nodes (4): exclude, extends, include, astro/tsconfigs/strict

### Community 95 - "Diseño — Abasto"
Cohesion: 0.05
Nodes (44): 1 · La cabecera — `PageHeader`, pegajosa, 2 · Línea de resumen — las cifras que importan, 3 · Vistas — una a la vez, 4 · El listado — filas, selección y acciones, Base y semántica, Color, Color por módulo — identidad, no estado, Configurable (+36 more)

### Community 97 - "sales-history-page.tsx"
Cohesion: 0.17
Nodes (30): EmptyState(), ExportMenu(), ExportParams, ActiveFilter, ListFilters(), ModuleScreen(), SummaryLine(), LineaCotizada (+22 more)

### Community 101 - "use-async.ts"
Cohesion: 0.14
Nodes (12): fileToResizedDataUrl(), ActionStatus, useAsyncAction(), UseAsyncActionOptions, useDataLoader(), UseDataLoaderOptions, EmpresaSection(), pickLogo() (+4 more)

### Community 103 - "frontend/package.json"
Cohesion: 0.11
Nodes (18): tailwindcss, @tailwindcss/vite, typescript, name, private, type, version, clsx (+10 more)

### Community 105 - "api"
Cohesion: 0.11
Nodes (26): api, AjustesPagoDialog(), guardar(), formOf(), ivaLabel(), margin(), ProductDetailPage(), addBarcode() (+18 more)

### Community 113 - "PricesController"
Cohesion: 0.20
Nodes (10): PricesController, Body, Controller, Delete, Get, Param, Post, Query (+2 more)

### Community 114 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 116 - "Mayorista ERP Project Overview"
Cohesion: 0.22
Nodes (11): Graphify Knowledge Graph Workflow (AGENTS.md), Frontend Architecture (single App.tsx, no router), Graphify Knowledge Graph Workflow (CLAUDE.md), Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger, Purchase Invoices Endpoints, Recommended Purchase Confirmation Flow (+3 more)

### Community 117 - "products table"
Cohesion: 0.33
Nodes (7): Category Model (per-tenant), POST /products/import-reference, product_reference Global Table, GET /product-reference/:ean, SEPA Open Data Source, products table, Productos por Peso (Pesables)

### Community 118 - "Base Data Model"
Cohesion: 0.50
Nodes (8): Catalog Endpoints (Warehouses/Suppliers/Lots), customers table, Base Data Model, product_lots table, stock_movements table, suppliers table, tenants table, warehouses table

### Community 125 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 127 - "Rangos Permission System (RBAC)"
Cohesion: 0.33
Nodes (7): Prisma schema.prisma, Multi-Tenancy Strategy, GET /auth/me Endpoint, caja.autorizar_anulacion Permission, RangoPermission Model, Rangos Permission System (RBAC), User.rangoId Field

### Community 131 - "Purchases/Reception/Stock Research"
Cohesion: 0.33
Nodes (6): ARCA: Emisión y Autorización de Factura Electrónica, ARCA: Régimen General y Clases de Comprobantes, GS1 Global Traceability Standard, Oracle Procurement Three-Way Match Docs, Purchases/Reception/Stock Research, Three-Way Match Concept

## Knowledge Gaps
- **451 isolated node(s):** `$schema`, `plugin`, `name`, `private`, `start:dev` (+446 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 694 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `AuthService` to `PrismaService`, `AuthRequest`, `PurchasesService`, `.update`, `errorMessage`?**
  _High betweenness centrality (0.323) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `AuthRequest` to `AuthService`, `StockService`, `PromotionsController`, `PriceRulesController`, `EscritorioController`, `RequirePermission`, `credit-notes.service.ts`, `PriceListsController`, `.create`, `SalesService`, `CustomersController`, `prices.service.ts`, `CreditNotesService`, `Tenants Controller`, `BranchesController`, `.update`, `CategoriesController`, `ReportesController`, `SuppliersController`, `products.controller.ts`, `PurchasesService`, `ProductsController`, `TasksController`, `RangosService`, `WarehousesController`, `PricesController`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **Why does `api` connect `api` to `stock-in-page.tsx`, `react`, `PosPage`, `errorMessage`, `escritorio-shell.tsx`, `StockInPage`, `ventas-chart.tsx`, `cn`, `useAuth`, `RangosPage`, `user-menu.tsx`, `product-detail-page.tsx`, `alert.tsx`, `WarehousesPage`, `downloadFile`, `CategoriesPage`, `UsersPage`, `SucursalesSection`, `ajustes-page.tsx`, `api.ts`, `sales-history-page.tsx`, `use-async.ts`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **What connects `$schema`, `plugin`, `name` to the rest of the system?**
  _451 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AuthService` be split into smaller, more focused modules?**
  _Cohesion score 0.09871794871794871 - nodes in this community are weakly interconnected._
- **Should `stock-in-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1126984126984127 - nodes in this community are weakly interconnected._
- **Should `3. Diseño — adherencia al sistema visual` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._