# Graph Report - abasto  (2026-09-10)

## Corpus Check
- 266 files · ~173,722 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1903 nodes · 5272 edges · 104 communities (96 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 182 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ee0e2bc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sidebar.ts
- escritorio.ts
- app.module.ts
- devDependencies
- AuthService
- stock-in-page.tsx
- cn
- 3. Diseño — adherencia al sistema visual
- graphify Skill Pipeline (Claude Code)
- StockService
- escritorio-page.tsx
- PromotionsController
- compilerOptions
- PriceRulesController
- money
- .token
- auth-background.tsx
- dependencies
- escritorio-shell.tsx
- EscritorioController
- AuthRequest
- CuentasCorrientesController
- PriceListsController
- credit-notes.service.ts
- SalesController
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
- pos-page.tsx
- useAuth
- Tenants Controller
- BranchesController
- promotions.controller.ts
- compilerOptions
- scripts
- WarehousesPage
- .constructor
- useTheme
- Product Definition (Abasto Vision)
- stock-history-page.tsx
- allowScripts
- RangosPage
- modules.tsx
- branch.ts
- landing/package.json
- backend/package.json
- user-menu.tsx
- CategoriesController
- ReportesController
- PurchasesController
- downloadFile
- @prisma/client
- SuppliersController
- price-resolver.util.ts
- SupervisorAuthDialog
- graphify.js
- rangos.service.ts
- PrismaService
- Auth Architecture (JWT, Guards, Argon2id)
- ProductReferenceController
- SalesService
- products.controller.ts
- PurchasesService
- RequirePermission
- TasksController
- Plan — Precios, importación y promociones
- Purchases/Reception/Stock Research
- errorMessage
- vite.config.ts
- main.ts
- CategoriesPage
- scripts
- ProductSearchDialog
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

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 156 edges
2. `RequirePermission()` - 123 edges
3. `errorMessage()` - 122 edges
4. `api` - 111 edges
5. `cn()` - 99 edges
6. `useAuth()` - 76 edges
7. `react` - 68 edges
8. `PrismaService` - 64 edges
9. `@nestjs/common` - 46 edges
10. `@phosphor-icons/react` - 44 edges

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

## Communities (104 total, 6 thin omitted)

### Community 0 - "sidebar.ts"
Cohesion: 0.36
Nodes (7): emit(), listeners, open, setSidebarOpen(), subscribe(), toggleSidebar(), useSidebar()

### Community 1 - "escritorio.ts"
Cohesion: 0.21
Nodes (13): compact(), DIA_INI, ejemplos(), lc(), Pendiente, plural(), serieBars(), statFor() (+5 more)

### Community 2 - "app.module.ts"
Cohesion: 0.26
Nodes (11): JwtAuthGuard, Injectable, TIMEZONES, AuthUser, METODOS_PAGO, PermissionGuard, Injectable, MODOS_REDONDEO (+3 more)

### Community 3 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, tailwindcss, tailwindcss-animate, @tailwindcss/vite, @types/react, @types/react-dom, typescript, vite (+1 more)

### Community 4 - "AuthService"
Cohesion: 0.07
Nodes (25): AuthController, Body, Controller, Get, Inject, Patch, Post, Req (+17 more)

### Community 5 - "stock-in-page.tsx"
Cohesion: 0.14
Nodes (21): ModuleSection(), ModuleView, ProductPicker(), STOCK_VIEWS, StockView, Input, Kbd(), Textarea (+13 more)

### Community 6 - "cn"
Cohesion: 0.10
Nodes (29): AccountList(), SidebarItem(), SidebarItemProps, RowList(), RowListItem(), Skeleton(), TableSkeleton(), TEMAS (+21 more)

### Community 7 - "3. Diseño — adherencia al sistema visual"
Cohesion: 0.07
Nodes (29): 1. Veredicto, 2. Lo que está sólido — no tocar, 3.10 Login — ¿segunda apuesta de carácter?, 3.1 La escala tipográfica no se aplica  · *alto impacto, bajo esfuerzo*, 3.2 Valores arbitrarios  · *el doc: "no se usan valores sueltos"*, 3.3 Color — el verde sólido como estado, 3.4 Radio inconsistente, 3.5 Elevación — "todo lo demás está al ras" (+21 more)

### Community 8 - "graphify Skill Pipeline (Claude Code)"
Cohesion: 0.07
Nodes (39): CLAUDE.md graphify Pointer, Add URL & Watch Folder Reference, Extra Exports & Benchmark Reference, Confidence Score Rubric, Extraction Subagent Prompt Spec, Node ID Format Rule, GitHub Clone & Cross-Repo Merge Reference, Commit Hook & CLAUDE.md Integration Reference (+31 more)

### Community 9 - "StockService"
Cohesion: 0.12
Nodes (16): main.ts Bootstrap (ValidationPipe), StockController, Body, Controller, Get, Inject, Param, Post (+8 more)

### Community 10 - "escritorio-page.tsx"
Cohesion: 0.17
Nodes (20): useEscritorioSummary(), prefetchRoute(), AbrirMostrador(), aSize(), Caja, cap(), centrarTablero(), computeLayout() (+12 more)

### Community 11 - "PromotionsController"
Cohesion: 0.16
Nodes (13): describirPromo(), PromotionsController, Body, Controller, Delete, Get, Param, Post (+5 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 13 - "PriceRulesController"
Cohesion: 0.18
Nodes (13): PriceRulesController, Body, Controller, Delete, Get, Param, Post, Put (+5 more)

### Community 14 - "money"
Cohesion: 0.11
Nodes (15): money(), parseWeighedBarcode(), ReportesPage(), describirPromo(), PosPage(), abrirTurno(), agregarMovimiento(), cambiarCantidad() (+7 more)

### Community 15 - ".token"
Cohesion: 0.15
Nodes (21): ImportWizard(), doApply(), doPreview(), pickFile(), PricesPage(), addTramo(), apply(), buildBody() (+13 more)

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

### Community 20 - "AuthRequest"
Cohesion: 0.11
Nodes (18): AuthRequest, CashRegistersController, CashShiftsController, Body, Controller, Get, Inject, Param (+10 more)

### Community 21 - "CuentasCorrientesController"
Cohesion: 0.21
Nodes (9): CuentasCorrientesController, Body, Controller, Get, Inject, Param, Post, Req (+1 more)

### Community 22 - "PriceListsController"
Cohesion: 0.15
Nodes (13): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+5 more)

### Community 23 - "credit-notes.service.ts"
Cohesion: 0.19
Nodes (8): REFUND_METHODS, Usuario, Db, registrarMovimientoCuenta(), CuentasCorrientesService, Inject, Injectable, Usuario

### Community 24 - "SalesController"
Cohesion: 0.23
Nodes (10): SalesController, Body, Controller, Get, Param, Post, Query, Req (+2 more)

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
Nodes (15): Inject, Inject, BulkInput, OPERATIONS, OperationType, PricesService, Rounding, ROUNDINGS (+7 more)

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

### Community 36 - "pos-page.tsx"
Cohesion: 0.16
Nodes (19): ActiveFilter, LineaCotizada, Dialog, DialogContent, DialogFooter(), DialogHeader(), DialogTitle, DialogTrigger (+11 more)

### Community 37 - "useAuth"
Cohesion: 0.13
Nodes (24): ExportButton(), ExportParams, PermissionRoute(), NavRiel(), Sidebar(), SidebarToggle(), PageHeader(), Spinner() (+16 more)

### Community 38 - "Tenants Controller"
Cohesion: 0.24
Nodes (7): TenantsController, Controller, Get, Inject, Param, Req, UseGuards

### Community 39 - "BranchesController"
Cohesion: 0.18
Nodes (12): BranchesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 40 - "promotions.controller.ts"
Cohesion: 0.13
Nodes (16): TIPOS_MOVIMIENTO, Usuario, csvCell(), ExportColumn, sendExport(), entero(), monto(), parseConfig() (+8 more)

### Community 41 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 42 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, db:enrich-categories, db:generate, db:import-reference, db:migrate, db:seed, db:seed-demo, start (+1 more)

### Community 43 - "WarehousesPage"
Cohesion: 0.33
Nodes (3): WarehousesPage(), submit(), submitCaja()

### Community 45 - "useTheme"
Cohesion: 0.43
Nodes (7): aplicar(), elegido(), media(), sistema(), Theme, useTheme(), PreferenciasSection()

### Community 46 - "Product Definition (Abasto Vision)"
Cohesion: 0.15
Nodes (13): Integración con ARCA (sin definir), Caja / Arqueo, CashMovement Model, CashRegister Model, CashShift Model, Cuenta Corriente de Clientes, CustomerAccountMovement Model, Empresa → Sucursal → Usuario Structure (+5 more)

### Community 47 - "stock-history-page.tsx"
Cohesion: 0.15
Nodes (23): stockViews(), Movement, Supplier, ARS, esD, esT, fecha(), fechaHora() (+15 more)

### Community 48 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, argon2@0.45.1, esbuild@0.28.2, prisma@6.19.3, @prisma/client@6.19.3, @prisma/engines@6.19.3

### Community 49 - "RangosPage"
Cohesion: 0.40
Nodes (5): RangosPage(), abrirEdicion(), borrar(), crear(), guardar()

### Community 50 - "modules.tsx"
Cohesion: 0.17
Nodes (12): CommandPalette(), go(), onKeyDown(), norm(), BY_KEY, gridModules(), HUES, ModuleDef (+4 more)

### Community 51 - "branch.ts"
Cohesion: 0.50
Nodes (4): activeBranchFor(), read(), setActiveBranch(), Stored

### Community 52 - "landing/package.json"
Cohesion: 0.08
Nodes (23): dependencies, astro, @astrojs/sitemap, @fontsource/geist-mono, @fontsource/geist-sans, devDependencies, tailwindcss, @tailwindcss/vite (+15 more)

### Community 53 - "backend/package.json"
Cohesion: 0.11
Nodes (17): typescript, name, prisma, seed, private, argon2, class-transformer, class-validator (+9 more)

### Community 54 - "user-menu.tsx"
Cohesion: 0.16
Nodes (22): ChecklistToggle(), Task, NotificationBell(), Menu, MenuBlock(), MenuContent, MenuGroup, MenuItem (+14 more)

### Community 55 - "CategoriesController"
Cohesion: 0.16
Nodes (12): CategoriesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 56 - "ReportesController"
Cohesion: 0.30
Nodes (7): ReportesController, Controller, Get, Query, Req, Res, UseGuards

### Community 57 - "PurchasesController"
Cohesion: 0.29
Nodes (8): PurchasesController, Body, Controller, Get, Param, Post, Req, UseGuards

### Community 58 - "downloadFile"
Cohesion: 0.25
Nodes (10): go(), copy(), download(), toQs(), ApiError, branchHeaders(), downloadFile(), exportText() (+2 more)

### Community 59 - "@prisma/client"
Cohesion: 0.15
Nodes (9): prisma, CORRECTABLE_STATUSES, InvoiceLineInput, OtherTax, OtherTaxInput, Scope, IN_MOVEMENT_TYPES, OUT_MOVEMENT_TYPES (+1 more)

### Community 60 - "SuppliersController"
Cohesion: 0.15
Nodes (12): SuppliersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 61 - "price-resolver.util.ts"
Cohesion: 0.15
Nodes (13): PriceActivationService, Inject, Injectable, activarPreciosVigentes(), Db, ListaResuelta, precioExplicito(), PriceSource (+5 more)

### Community 62 - "SupervisorAuthDialog"
Cohesion: 1.00
Nodes (3): SupervisorAuthDialog(), reset(), submit()

### Community 64 - "rangos.service.ts"
Cohesion: 0.21
Nodes (9): ALL, DEFAULT_RANGOS, PERMISSION_KEYS, PermissionDef, PermissionKey, PERMISSIONS, SYSTEM_RANGO_NAMES, Db (+1 more)

### Community 65 - "PrismaService"
Cohesion: 0.06
Nodes (18): BootstrapService, Inject, Injectable, HealthController, Controller, Get, Inject, PrismaModule (+10 more)

### Community 66 - "Auth Architecture (JWT, Guards, Argon2id)"
Cohesion: 0.29
Nodes (6): AdminGuard (admin-only write gate), Auth Architecture (JWT, Guards, Argon2id), Auth Endpoints (signup/login/users), API Base Reference, Products Endpoints, Mayorista ERP README Overview

### Community 67 - "ProductReferenceController"
Cohesion: 0.25
Nodes (6): ProductReferenceController, Controller, Get, Inject, Param, UseGuards

### Community 68 - "SalesService"
Cohesion: 0.13
Nodes (15): alcanza(), cotizar(), Db, descuentoPromo(), LineaCotizada, LineaPedida, PromoConfig, PromoFila (+7 more)

### Community 69 - "products.controller.ts"
Cohesion: 0.05
Nodes (58): cellText(), findColumn(), HEADERS, main(), prisma, Decimalish, PriceField, PriceHistoryEntry (+50 more)

### Community 70 - "PurchasesService"
Cohesion: 0.22
Nodes (4): Inject, PurchasesService, Inject, Injectable

### Community 71 - "RequirePermission"
Cohesion: 0.13
Nodes (20): priceChange(), guardarPrecio(), normalizeSaleUnit(), parseOptionalDecimal(), ProductsController, Body, Controller, Delete (+12 more)

### Community 72 - "TasksController"
Cohesion: 0.17
Nodes (11): TasksController, Body, Controller, Delete, Get, Inject, Param, Patch (+3 more)

### Community 73 - "Plan — Precios, importación y promociones"
Cohesion: 0.18
Nodes (10): 1 · ¿Precios es módulo o pestaña?, 2 · ¿Dónde va el importador?, 3 · Poner / cambiar precios, 4 · Promociones, Cómo lo hacen otros, Decisiones, El plan, por etapas, El problema real (+2 more)

### Community 74 - "Purchases/Reception/Stock Research"
Cohesion: 0.33
Nodes (6): ARCA: Emisión y Autorización de Factura Electrónica, ARCA: Régimen General y Clases de Comprobantes, GS1 Global Traceability Standard, Oracle Procurement Three-Way Match Docs, Purchases/Reception/Stock Research, Three-Way Match Concept

### Community 75 - "errorMessage"
Cohesion: 0.10
Nodes (21): errorMessage(), UsersPage(), submitCreate(), submitEdit(), AjustesPagoDialog(), guardar(), SucursalesSection(), accion() (+13 more)

### Community 78 - "main.ts"
Cohesion: 0.27
Nodes (7): AppModule, Module, bootstrap(), PrismaExceptionFilter, Catch, @nestjs/core, reflect-metadata

### Community 79 - "CategoriesPage"
Cohesion: 0.33
Nodes (3): CategoriesPage(), confirmDelete(), submit()

### Community 82 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 84 - "ProductSearchDialog"
Cohesion: 0.83
Nodes (4): ProductSearchDialog(), alTeclear(), elegible(), elegir()

### Community 88 - "api.ts"
Cohesion: 0.05
Nodes (49): Badge(), badgeVariants, Checkbox, Label, Branch, CashMovement, Category, CreditNoteLine (+41 more)

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
Cohesion: 0.23
Nodes (31): EmptyState(), ExportMenu(), Field(), Step, ListFilters(), ModuleScreen(), SummaryLine(), PageSpinner() (+23 more)

### Community 101 - "use-async.ts"
Cohesion: 0.14
Nodes (12): fileToResizedDataUrl(), ActionStatus, useAsyncAction(), UseAsyncActionOptions, useDataLoader(), UseDataLoaderOptions, EmpresaSection(), pickLogo() (+4 more)

### Community 103 - "frontend/package.json"
Cohesion: 0.11
Nodes (18): tailwindcss, @tailwindcss/vite, typescript, name, private, type, version, clsx (+10 more)

### Community 105 - "api"
Cohesion: 0.12
Nodes (26): api, CustomersPage(), openCuenta(), registrarPago(), submit(), toggleActive(), formOf(), margin() (+18 more)

### Community 113 - "PricesController"
Cohesion: 0.20
Nodes (10): PricesController, Body, Controller, Delete, Get, Param, Post, Query (+2 more)

### Community 114 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 116 - "Mayorista ERP Project Overview"
Cohesion: 0.20
Nodes (12): Graphify Knowledge Graph Workflow (AGENTS.md), Frontend Architecture (single App.tsx, no router), Graphify Knowledge Graph Workflow (CLAUDE.md), Multi-Tenancy Strategy, Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger, Purchase Invoices Endpoints (+4 more)

### Community 117 - "products table"
Cohesion: 0.20
Nodes (11): classify-reference-categories.ts script, enrich-reference-categories.ts script, Category Model (per-tenant), POST /products/import-reference, product_reference Global Table, GET /product-reference/:ean, Brand/Keyword Offline Classifier, Reference Catalog Category Classification (+3 more)

### Community 118 - "Base Data Model"
Cohesion: 0.50
Nodes (8): Catalog Endpoints (Warehouses/Suppliers/Lots), customers table, Base Data Model, product_lots table, stock_movements table, suppliers table, tenants table, warehouses table

### Community 125 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 127 - "Rangos Permission System (RBAC)"
Cohesion: 0.40
Nodes (6): Prisma schema.prisma, GET /auth/me Endpoint, caja.autorizar_anulacion Permission, RangoPermission Model, Rangos Permission System (RBAC), User.rangoId Field

## Knowledge Gaps
- **467 isolated node(s):** `$schema`, `plugin`, `name`, `private`, `start:dev` (+462 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 711 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `AuthService` to `StockService`, `app.module.ts`, `Auth Architecture (JWT, Guards, Argon2id)`, `.token`?**
  _High betweenness centrality (0.342) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `AuthRequest` to `app.module.ts`, `AuthService`, `StockService`, `PromotionsController`, `PriceRulesController`, `EscritorioController`, `CuentasCorrientesController`, `PriceListsController`, `SalesController`, `CustomersController`, `prices.service.ts`, `CreditNotesService`, `Tenants Controller`, `BranchesController`, `promotions.controller.ts`, `CategoriesController`, `ReportesController`, `PurchasesController`, `SuppliersController`, `Auth Architecture (JWT, Guards, Argon2id)`, `products.controller.ts`, `RequirePermission`, `TasksController`, `RangosService`, `WarehousesController`, `PricesController`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Why does `api` connect `api` to `stock-in-page.tsx`, `cn`, `money`, `.token`, `escritorio-shell.tsx`, `StockInPage`, `ventas-chart.tsx`, `pos-page.tsx`, `useAuth`, `WarehousesPage`, `stock-history-page.tsx`, `RangosPage`, `user-menu.tsx`, `downloadFile`, `errorMessage`, `CategoriesPage`, `api.ts`, `sales-history-page.tsx`, `use-async.ts`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **What connects `$schema`, `plugin`, `name` to the rest of the system?**
  _467 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AuthService` be split into smaller, more focused modules?**
  _Cohesion score 0.07102040816326531 - nodes in this community are weakly interconnected._
- **Should `stock-in-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13548387096774195 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._