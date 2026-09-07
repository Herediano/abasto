# Graph Report - abasto  (2026-09-06)

## Corpus Check
- 232 files · ~145,312 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1738 nodes · 4571 edges · 132 communities (99 shown, 14 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 159 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da3d21c9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- prices-page.tsx
- escritorio.ts
- app.module.ts
- devDependencies
- AuthService
- "tenants"
- ProductsController
- 3. Diseño — adherencia al sistema visual
- graphify Skill Pipeline (Claude Code)
- StockService
- escritorio-page.tsx
- promotions.controller.ts
- compilerOptions
- AuthRequest
- money
- api
- auth-background.tsx
- dependencies
- price-import.util.ts
- .update
- CajaService
- permissions.catalog.ts
- PriceListsController
- branch.ts
- PriceRulesController
- CustomersController
- i18n/utils.ts
- StockInPage
- CuentasCorrientesService
- ventas-chart.tsx
- seed-demo.ts
- compilerOptions
- devDependencies
- SalesHistoryPage
- seed.ts
- enrich-reference-categories.ts
- errorMessage
- SuppliersPage
- Tenants Controller
- BranchesController
- RangosPage
- compilerOptions
- scripts
- main.ts
- cn
- useTheme
- Product Definition (Abasto Vision)
- ProductReferenceController
- allowScripts
- import-reference-from-xlsx.ts
- modules.tsx
- PricesController
- landing/package.json
- backend/package.json
- user-menu.tsx
- CategoriesController
- ReportesController
- useAuth
- EscritorioController
- credit-notes.service.ts
- SuppliersController
- RequirePermission
- SupervisorAuthDialog
- graphify.js
- @nestjs/platform-express
- products-page.tsx
- @prisma/client
- reflect-metadata
- 0015_product_reference/migration.sql
- PurchasesService
- api.ts
- rxjs
- dependencies
- Abasto — landing
- RangosService
- WarehousesController
- landing/tsconfig.json
- Diseño — Abasto
- pos-page.tsx
- sales-history-page.tsx
- stock.service.ts
- CreditNotesController
- EmpresaSection
- ajustes-page.tsx
- frontend/package.json
- .constructor
- ExpirationsPage
- SalesController
- SalesService
- @radix-ui/react-dropdown-menu
- prefs.ts
- WarehousesPage
- prices.service.ts
- opencode.json
- Mayorista ERP Project Overview
- products table
- Base Data Model
- command-palette.tsx
- clsx
- @phosphor-icons/react
- @radix-ui/react-slot
- react
- price-resolver.util.ts
- PriceActivationService
- Rangos Permission System (RBAC)
- PricesService
- Purchases/Reception/Stock Research
- BootstrapService
- purchases.service.ts
- UsersPage
- ProductSearchDialog
- PrismaModule
- HealthController

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 142 edges
2. `RequirePermission()` - 114 edges
3. `errorMessage()` - 112 edges
4. `api` - 105 edges
5. `cn()` - 82 edges
6. `useAuth()` - 72 edges
7. `PrismaService` - 62 edges
8. `"tenants"` - 31 edges
9. `JwtAuthGuard` - 31 edges
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

## Communities (132 total, 14 thin omitted)

### Community 0 - "prices-page.tsx"
Cohesion: 0.13
Nodes (17): PriceAuditRow, PriceRule, RoundingRule, ScheduledChange, ARS, esD, esT, fechaHora() (+9 more)

### Community 1 - "escritorio.ts"
Cohesion: 0.36
Nodes (8): compact(), ejemplos(), EscritorioSummary, lc(), Pendiente, plural(), statFor(), TileStat

### Community 2 - "app.module.ts"
Cohesion: 0.14
Nodes (21): JwtAuthGuard, Injectable, TIMEZONES, AuthUser, METODOS_PAGO, TIPOS_MOVIMIENTO, Usuario, csvCell() (+13 more)

### Community 3 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, tailwindcss, tailwindcss-animate, @tailwindcss/vite, @types/react, @types/react-dom, typescript, vite (+9 more)

### Community 4 - "AuthService"
Cohesion: 0.10
Nodes (16): AuthController, Body, Controller, Get, Inject, Post, Req, UseGuards (+8 more)

### Community 5 - ""tenants""
Cohesion: 0.11
Nodes (31): "customers", "product_lots", "products", "suppliers", "tenants", "warehouses", "stock_movements", "users" (+23 more)

### Community 6 - "ProductsController"
Cohesion: 0.12
Nodes (20): buscarProductoIds(), condicionTermino(), normalizar(), assertTaxRate(), parseOptionalDecimal(), ProductsController, Body, Controller (+12 more)

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
Cohesion: 0.18
Nodes (16): BranchSwitcher(), setActiveBranch(), pendientes(), hora(), hueFor(), AbrirMostrador(), AccionTile(), applyOrder() (+8 more)

### Community 11 - "promotions.controller.ts"
Cohesion: 0.10
Nodes (21): describirPromo(), entero(), monto(), parseConfig(), PromotionsController, SCOPES, Tipo, TIPO_LABEL (+13 more)

### Community 12 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 13 - "AuthRequest"
Cohesion: 0.18
Nodes (13): AuthRequest, PurchasesController, Body, Controller, Get, Param, Post, Req (+5 more)

### Community 14 - "money"
Cohesion: 0.11
Nodes (14): money(), parseWeighedBarcode(), describirPromo(), PosPage(), abrirTurno(), agregarMovimiento(), cambiarCantidad(), cerrarTurno() (+6 more)

### Community 15 - "api"
Cohesion: 0.12
Nodes (33): api, PasswordSection(), submit(), CustomersPage(), openCuenta(), registrarPago(), submit(), toggleActive() (+25 more)

### Community 16 - "auth-background.tsx"
Cohesion: 0.16
Nodes (20): AuthBackground(), alCambiarVisibilidad(), crearFormas(), dibujar(), elegirPosicionLado(), loop(), obtenerRectObstaculo(), paso() (+12 more)

### Community 17 - "dependencies"
Cohesion: 0.11
Nodes (19): argon2, dependencies, argon2, class-transformer, class-validator, exceljs, jsonwebtoken, @nestjs/common (+11 more)

### Community 18 - "price-import.util.ts"
Cohesion: 0.20
Nodes (14): BARCODE_ALIASES, COST_ALIASES, detectDelimiter(), findColumn(), matrixFromCsv(), matrixFromXlsx(), NAME_ALIASES, normalizeHeader() (+6 more)

### Community 19 - ".update"
Cohesion: 0.18
Nodes (10): Body, Controller, Get, Inject, Param, Post, Put, Req (+2 more)

### Community 20 - "CajaService"
Cohesion: 0.18
Nodes (6): Inject, CajaService, monto(), texto(), Inject, Injectable

### Community 21 - "permissions.catalog.ts"
Cohesion: 0.22
Nodes (8): ALL, DEFAULT_RANGOS, PERMISSION_KEYS, PermissionDef, PermissionKey, PERMISSIONS, SYSTEM_RANGO_NAMES, Db

### Community 22 - "PriceListsController"
Cohesion: 0.15
Nodes (13): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+5 more)

### Community 23 - "branch.ts"
Cohesion: 0.67
Nodes (3): activeBranchFor(), read(), Stored

### Community 24 - "PriceRulesController"
Cohesion: 0.21
Nodes (10): PriceRulesController, Body, Controller, Delete, Get, Param, Post, Put (+2 more)

### Community 25 - "CustomersController"
Cohesion: 0.16
Nodes (12): CustomersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 26 - "i18n/utils.ts"
Cohesion: 0.06
Nodes (34): lang, t, year, home, lang, links, t, enHref (+26 more)

### Community 27 - "StockInPage"
Cohesion: 0.16
Nodes (9): draftKey(), readDraft(), StockInPage(), addLine(), cancelCorrection(), createProductInline(), startCorrection(), submit() (+1 more)

### Community 28 - "CuentasCorrientesService"
Cohesion: 0.15
Nodes (12): CuentasCorrientesController, Body, Controller, Get, Inject, Param, Post, Req (+4 more)

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

### Community 33 - "SalesHistoryPage"
Cohesion: 0.50
Nodes (4): comprobante(), SalesHistoryPage(), anular(), confirmarDevolucion()

### Community 35 - "enrich-reference-categories.ts"
Cohesion: 0.27
Nodes (11): apiGet(), Categoria, HEADERS, main(), pickSucursalBatches(), prisma, Producto, productosDeRubro() (+3 more)

### Community 36 - "errorMessage"
Cohesion: 0.10
Nodes (21): errorMessage(), AjustesPagoDialog(), guardar(), PerfilSection(), submit(), SucursalesSection(), accion(), submit() (+13 more)

### Community 38 - "Tenants Controller"
Cohesion: 0.24
Nodes (7): TenantsController, Controller, Get, Inject, Param, Req, UseGuards

### Community 39 - "BranchesController"
Cohesion: 0.18
Nodes (12): BranchesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 40 - "RangosPage"
Cohesion: 0.40
Nodes (5): RangosPage(), abrirEdicion(), borrar(), crear(), guardar()

### Community 41 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include, vite.config.ts

### Community 42 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, db:enrich-categories, db:generate, db:import-reference, db:migrate, db:seed, db:seed-demo, start (+1 more)

### Community 43 - "main.ts"
Cohesion: 0.32
Nodes (5): AppModule, Module, bootstrap(), PrismaExceptionFilter, Catch

### Community 44 - "cn"
Cohesion: 0.13
Nodes (19): Section(), TEMAS, ThemeToggle(), CardDescription, CardHeader, CardTitle, Checkbox, DialogDescription (+11 more)

### Community 45 - "useTheme"
Cohesion: 0.43
Nodes (7): aplicar(), elegido(), media(), sistema(), Theme, useTheme(), PreferenciasSection()

### Community 46 - "Product Definition (Abasto Vision)"
Cohesion: 0.17
Nodes (12): Integración con ARCA (sin definir), Caja / Arqueo, CashMovement Model, CashRegister Model, CashShift Model, Cuenta Corriente de Clientes, CustomerAccountMovement Model, Empresa → Sucursal → Usuario Structure (+4 more)

### Community 47 - "ProductReferenceController"
Cohesion: 0.25
Nodes (6): ProductReferenceController, Controller, Get, Inject, Param, UseGuards

### Community 48 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, argon2@0.45.1, esbuild@0.28.2, prisma@6.19.3, @prisma/client@6.19.3, @prisma/engines@6.19.3

### Community 49 - "import-reference-from-xlsx.ts"
Cohesion: 0.47
Nodes (5): cellText(), findColumn(), HEADERS, main(), prisma

### Community 50 - "modules.tsx"
Cohesion: 0.20
Nodes (9): BY_KEY, gridModules(), HUES, moduleByKey(), ModuleDef, ModuleMotif(), MODULES, visibleModules() (+1 more)

### Community 51 - "PricesController"
Cohesion: 0.17
Nodes (12): activarPreciosVigentes(), PricesController, Body, Controller, Delete, Get, Param, Post (+4 more)

### Community 52 - "landing/package.json"
Cohesion: 0.08
Nodes (25): astro, @astrojs/sitemap, @fontsource/bricolage-grotesque, @fontsource/spline-sans, @fontsource/spline-sans-mono, dependencies, astro, @astrojs/sitemap (+17 more)

### Community 53 - "backend/package.json"
Cohesion: 0.40
Nodes (4): name, prisma, seed, private

### Community 54 - "user-menu.tsx"
Cohesion: 0.24
Nodes (13): Menu, MenuBlock(), MenuContent, MenuGroup, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem (+5 more)

### Community 55 - "CategoriesController"
Cohesion: 0.16
Nodes (12): CategoriesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 56 - "ReportesController"
Cohesion: 0.25
Nodes (7): ReportesController, Controller, Get, Inject, Query, Req, UseGuards

### Community 57 - "useAuth"
Cohesion: 0.19
Nodes (18): PermissionRoute(), FullScreenRoute(), ProtectedRoute(), Movement, Supplier, useAuth(), fecha(), quantity() (+10 more)

### Community 58 - "EscritorioController"
Cohesion: 0.25
Nodes (6): EscritorioController, Controller, Get, Inject, Req, UseGuards

### Community 59 - "credit-notes.service.ts"
Cohesion: 0.22
Nodes (7): comprobante(), CreditNotesService, r2(), REFUND_METHODS, Inject, Injectable, Usuario

### Community 60 - "SuppliersController"
Cohesion: 0.15
Nodes (12): SuppliersController, Body, Controller, Get, Inject, Param, Post, Put (+4 more)

### Community 61 - "RequirePermission"
Cohesion: 0.23
Nodes (12): CashRegistersController, CashShiftsController, Body, Controller, Get, Param, Post, Query (+4 more)

### Community 62 - "SupervisorAuthDialog"
Cohesion: 1.00
Nodes (3): SupervisorAuthDialog(), reset(), submit()

### Community 65 - "products-page.tsx"
Cohesion: 0.17
Nodes (23): ActiveFilter, LineaCotizada, Badge(), badgeVariants, Button, ButtonProps, buttonVariants, Dialog (+15 more)

### Community 70 - "PurchasesService"
Cohesion: 0.18
Nodes (6): main.ts Bootstrap (ValidationPipe), Inject, PurchasesService, Inject, Injectable, Manual Validation Style (no DTOs)

### Community 88 - "api.ts"
Cohesion: 0.08
Nodes (33): copy(), download(), ProductPicker(), StockNav(), TABS, Textarea, ApiError, branchHeaders() (+25 more)

### Community 90 - "dependencies"
Cohesion: 0.13
Nodes (15): class-variance-authority, dependencies, class-variance-authority, @radix-ui/react-checkbox, @radix-ui/react-dialog, @radix-ui/react-label, react-dom, react-router-dom (+7 more)

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

### Community 96 - "pos-page.tsx"
Cohesion: 0.17
Nodes (11): CashRegister, CashShift, Customer, CustomerAccount, Promotion, Item, MOVIMIENTOS, Pago (+3 more)

### Community 97 - "sales-history-page.tsx"
Cohesion: 0.24
Nodes (27): EmptyState(), ExportMenu(), Field(), ListFilters(), PageHeader(), PageSpinner(), Alert(), alertVariants (+19 more)

### Community 99 - "stock.service.ts"
Cohesion: 0.60
Nodes (3): Scope, IN_MOVEMENT_TYPES, OUT_MOVEMENT_TYPES

### Community 100 - "CreditNotesController"
Cohesion: 0.20
Nodes (10): CreditNotesController, Body, Controller, Get, Inject, Param, Post, Query (+2 more)

### Community 101 - "EmpresaSection"
Cohesion: 0.50
Nodes (4): fileToResizedDataUrl(), EmpresaSection(), pickLogo(), submit()

### Community 102 - "ajustes-page.tsx"
Cohesion: 0.12
Nodes (20): AccountList(), Spinner(), Input, PaymentAdjustment, PaymentMethod, Session, setUnauthorizedHandler(), AuthContext (+12 more)

### Community 103 - "frontend/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, preview, type, version

### Community 105 - "ExpirationsPage"
Cohesion: 0.40
Nodes (5): daysRemaining(), ExpirationsPage(), openEdit(), submitEdit(), urgencyBadge()

### Community 106 - "SalesController"
Cohesion: 0.20
Nodes (11): SalesController, Body, Controller, Get, Inject, Param, Post, Query (+3 more)

### Community 107 - "SalesService"
Cohesion: 0.13
Nodes (11): Db, registrarMovimientoCuenta(), Usuario, LineaPedida, FORMAS_PAGO, PagoPedido, r2(), SalesService (+3 more)

### Community 109 - "prefs.ts"
Cohesion: 0.31
Nodes (8): aplicarDensidad(), AVATAR_COLORS, Density, leerDensidad(), leerTiles(), TileSize, useDensity(), useTiles()

### Community 111 - "WarehousesPage"
Cohesion: 0.33
Nodes (3): WarehousesPage(), submit(), submitCaja()

### Community 113 - "prices.service.ts"
Cohesion: 0.13
Nodes (19): Decimalish, priceChange(), PriceField, PriceHistoryEntry, PriceSource, toNumber(), guardarPrecio(), aplicarModo() (+11 more)

### Community 115 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 116 - "Mayorista ERP Project Overview"
Cohesion: 0.20
Nodes (11): Graphify Knowledge Graph Workflow (AGENTS.md), Frontend Architecture (single App.tsx, no router), Graphify Knowledge Graph Workflow (CLAUDE.md), Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger, Purchase Invoices Endpoints, Recommended Purchase Confirmation Flow (+3 more)

### Community 117 - "products table"
Cohesion: 0.18
Nodes (12): classify-reference-categories.ts script, enrich-reference-categories.ts script, Category Model (per-tenant), POST /products/import-reference, product_reference Global Table, GET /product-reference/:ean, Brand/Keyword Offline Classifier, Reference Catalog Category Classification (+4 more)

### Community 118 - "Base Data Model"
Cohesion: 0.26
Nodes (12): Auth Endpoints (signup/login/users), Catalog Endpoints (Warehouses/Suppliers/Lots), API Base Reference, Products Endpoints, customers table, Base Data Model, product_lots table, stock_movements table (+4 more)

### Community 119 - "command-palette.tsx"
Cohesion: 0.27
Nodes (7): CommandPalette(), go(), onKeyDown(), norm(), EscritorioShell(), PaletteContext, usePalette()

### Community 125 - "price-resolver.util.ts"
Cohesion: 0.18
Nodes (15): Db, ListaResuelta, precioExplicito(), PriceSource, redondear2(), resolverPrecio(), resolverPrecios(), alcanza() (+7 more)

### Community 126 - "PriceActivationService"
Cohesion: 0.32
Nodes (4): PriceActivationService, Inject, Injectable, Cron

### Community 127 - "Rangos Permission System (RBAC)"
Cohesion: 0.33
Nodes (7): Prisma schema.prisma, Multi-Tenancy Strategy, GET /auth/me Endpoint, caja.autorizar_anulacion Permission, RangoPermission Model, Rangos Permission System (RBAC), User.rangoId Field

### Community 129 - "PricesService"
Cohesion: 0.25
Nodes (5): Inject, Inject, PricesService, Inject, Injectable

### Community 131 - "Purchases/Reception/Stock Research"
Cohesion: 0.33
Nodes (6): ARCA: Emisión y Autorización de Factura Electrónica, ARCA: Régimen General y Clases de Comprobantes, GS1 Global Traceability Standard, Oracle Procurement Three-Way Match Docs, Purchases/Reception/Stock Research, Three-Way Match Concept

### Community 133 - "BootstrapService"
Cohesion: 0.40
Nodes (3): BootstrapService, Inject, Injectable

### Community 134 - "purchases.service.ts"
Cohesion: 0.40
Nodes (4): CORRECTABLE_STATUSES, InvoiceLineInput, OtherTax, OtherTaxInput

### Community 135 - "UsersPage"
Cohesion: 0.40
Nodes (3): UsersPage(), submitCreate(), submitEdit()

### Community 136 - "ProductSearchDialog"
Cohesion: 0.83
Nodes (4): ProductSearchDialog(), alTeclear(), elegible(), elegir()

### Community 137 - "PrismaModule"
Cohesion: 0.67
Nodes (3): PrismaModule, Module, Global

### Community 139 - "HealthController"
Cohesion: 0.33
Nodes (4): HealthController, Controller, Get, Inject

## Knowledge Gaps
- **387 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `name`, `private`, `start:dev` (+382 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 641 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `AuthService` to `app.module.ts`, `PurchasesService`, `AuthRequest`, `api`, `.update`?**
  _High betweenness centrality (0.245) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `AuthRequest` to `app.module.ts`, `AuthService`, `ProductsController`, `StockService`, `promotions.controller.ts`, `.update`, `PriceListsController`, `PriceRulesController`, `CustomersController`, `CuentasCorrientesService`, `Tenants Controller`, `BranchesController`, `PricesController`, `CategoriesController`, `ReportesController`, `EscritorioController`, `SuppliersController`, `RequirePermission`, `RangosService`, `WarehousesController`, `CreditNotesController`, `SalesController`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `api` connect `api` to `prices-page.tsx`, `UsersPage`, `escritorio-page.tsx`, `money`, `StockInPage`, `ventas-chart.tsx`, `SalesHistoryPage`, `errorMessage`, `SuppliersPage`, `RangosPage`, `cn`, `user-menu.tsx`, `useAuth`, `products-page.tsx`, `api.ts`, `pos-page.tsx`, `sales-history-page.tsx`, `EmpresaSection`, `ajustes-page.tsx`, `ExpirationsPage`, `WarehousesPage`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `name` to the rest of the system?**
  _387 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prices-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1440677966101695 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._