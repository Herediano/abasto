# Graph Report - smart-erp  (2026-09-04)

## Corpus Check
- 171 files · ~92,107 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1262 nodes · 3349 edges · 88 communities (61 shown, 9 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 137 edges (avg confidence: 0.85)
- Token cost: 298,573 input · 0 output

## Community Hubs (Navigation)
- Frontend App Shell & UI Kit
- Cuenta Corriente Ledger
- Auth Bootstrap & Guards
- Styling Utility Deps
- Prisma Seed Data
- Base Schema Migration
- Product Search Utility
- Rangos Permissions Controller
- Graphify Skill Docs (Claude)
- Stock Controller
- Price History Utility
- Promotions Controller
- Backend TS Config
- Prices Controller & Auth Types
- Pesable & Theme Utils
- Price Rules UI Page
- Caja Register Controllers
- Auth & Validation Deps
- Caja Service
- Caja & Arqueo Domain Concepts
- Customers Page UI
- Categories Controller
- Price Lists Controller
- Price Rules Controller
- Product Detail Page
- Customers Controller
- Price Import Utility
- Stock In Draft Page
- Sales Controller
- Suppliers Controller
- Shared NestJS Decorators
- Frontend TS Config
- Backend Dev Dependencies
- Purchases Controller
- Purchases Service
- Reference Category Enrichment Script
- Graphify Workflow & ERP Overview
- Multi-Tenancy & RBAC Docs
- Tenants Controller
- API Reference Docs
- Frontend Architecture Docs
- Frontend Node TS Config
- Backend NPM Scripts
- App Module Bootstrap
- Price Activation Service
- Product Reference Controller
- Data Model Docs (Catalog)
- Health Controller
- Backend Package Versions
- Reference Import Script (xlsx)
- External Compliance Citations
- Rangos Admin Page
- Categories Page UI
- Root Package Metadata
- Reference Category Classifier Docs
- Frontend API Client Errors
- Users Admin Page
- Expirations Page
- Product Search Dialog
- Suppliers Page UI
- Sales History Page
- Supervisor Auth Dialog
- Stock History Page
- OpenCode Graphify Plugin
- NestJS Express Platform Dep
- NestJS Schedule Dep
- Prisma Client Dep
- Reflect Metadata Dep
- Product Reference Migration
- Inject Constructor Pattern

## God Nodes (most connected - your core abstractions)
1. `AuthRequest` - 112 edges
2. `RequirePermission()` - 97 edges
3. `errorMessage()` - 93 edges
4. `api()` - 82 edges
5. `cn()` - 52 edges
6. `PrismaService` - 50 edges
7. `useAuth()` - 48 edges
8. `"tenants"` - 31 edges
9. `ProductsController` - 28 edges
10. `JwtAuthGuard` - 27 edges

## Surprising Connections (you probably didn't know these)
- `App Shell / Rail Navigation (app-shell.tsx)` --conceptually_related_to--> `App()`  [INFERRED]
  docs/rediseno.md → frontend/src/App.tsx
- `UI Redesign (Abasto Design System)` --references--> `Theme`  [EXTRACTED]
  docs/rediseno.md → frontend/src/lib/theme.ts
- `Mayorista ERP README Overview` --semantically_similar_to--> `Mayorista ERP Project Overview`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `AdminGuard (admin-only write gate)` --references--> `JwtAuthGuard`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.guard.ts
- `Auth Architecture (JWT, Guards, Argon2id)` --references--> `JwtAuthGuard`  [EXTRACTED]
  CLAUDE.md → backend/src/auth.guard.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Modular Step-to-Reference Delegation Pattern** — _claude_skills_graphify_skill_pipeline, _claude_skills_graphify_references_github_and_merge_doc, _claude_skills_graphify_references_transcribe_doc, _claude_skills_graphify_references_extraction_spec_doc, _claude_skills_graphify_references_exports_doc [INFERRED 0.85]
- **Dual-Platform Skill Mirror (Claude Code vs OpenCode)** — _claude_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_pipeline, _opencode_skills_graphify_skill_mention_dispatch, _claude_skills_graphify_skill_subagent_dispatch_requirement [INFERRED 0.85]
- **Purchase Invoice Confirmation Flow** — claude_purchase_invoice_lifecycle, docs_investigacion_compras_flow, docs_api_purchases_endpoints, backend_src_purchases_service_purchasesservice, docs_modelo_datos_base_stock_movements [INFERRED 0.85]
- **Multi-Tenant Data Isolation Pattern** — claude_multi_tenancy, docs_modelo_datos_base_overview, backend_prisma_schema_schema, docs_producto_empresa_sucursal_usuario [INFERRED 0.85]
- **RBAC Rangos System** — docs_producto_rangos, docs_rediseno_rangos_ui, docs_producto_rango_permission, docs_producto_user_rangoid, claude_adminguard_concept [INFERRED 0.85]

## Communities (88 total, 9 thin omitted)

### Community 0 - "Frontend App Shell & UI Kit"
Cohesion: 0.06
Nodes (128): EmptyState(), Field(), PermissionRoute(), AppShell(), NAV_GROUPS, NavItem, TEMAS, FullScreenRoute() (+120 more)

### Community 1 - "Cuenta Corriente Ledger"
Cohesion: 0.05
Nodes (37): Db, registrarMovimientoCuenta(), CuentasCorrientesController, Body, Controller, Get, Inject, Param (+29 more)

### Community 2 - "Auth Bootstrap & Guards"
Cohesion: 0.14
Nodes (21): JwtAuthGuard, Injectable, AuthUser, TIPOS_MOVIMIENTO, Usuario, Usuario, PermissionGuard, Injectable (+13 more)

### Community 3 - "Styling Utility Deps"
Cohesion: 0.04
Nodes (48): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, @phosphor-icons/react, @radix-ui/react-checkbox, @radix-ui/react-dialog (+40 more)

### Community 4 - "Prisma Seed Data"
Cohesion: 0.06
Nodes (28): findOrCreateCustomer(), findOrCreateSupplier(), main(), prisma, seedReferenceCatalog(), AuthController, Body, Controller (+20 more)

### Community 5 - "Base Schema Migration"
Cohesion: 0.11
Nodes (31): "customers", "product_lots", "products", "suppliers", "tenants", "warehouses", "stock_movements", "users" (+23 more)

### Community 6 - "Product Search Utility"
Cohesion: 0.12
Nodes (20): buscarProductoIds(), condicionTermino(), normalizar(), assertTaxRate(), parseOptionalDecimal(), ProductsController, Body, Controller (+12 more)

### Community 7 - "Rangos Permissions Controller"
Cohesion: 0.07
Nodes (24): RangosController, Body, Controller, Delete, Get, Inject, Param, Post (+16 more)

### Community 8 - "Graphify Skill Docs (Claude)"
Cohesion: 0.07
Nodes (39): CLAUDE.md graphify Pointer, Add URL & Watch Folder Reference, Extra Exports & Benchmark Reference, Confidence Score Rubric, Extraction Subagent Prompt Spec, Node ID Format Rule, GitHub Clone & Cross-Repo Merge Reference, Commit Hook & CLAUDE.md Integration Reference (+31 more)

### Community 9 - "Stock Controller"
Cohesion: 0.11
Nodes (17): StockController, Body, Controller, Get, Inject, Param, Post, Query (+9 more)

### Community 10 - "Price History Utility"
Cohesion: 0.09
Nodes (25): Decimalish, priceChange(), PriceField, PriceHistoryEntry, PriceSource, toNumber(), guardarPrecio(), Inject (+17 more)

### Community 11 - "Promotions Controller"
Cohesion: 0.12
Nodes (17): entero(), monto(), parseConfig(), PromotionsController, SCOPES, Tipo, TIPOS, Body (+9 more)

### Community 12 - "Backend TS Config"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 13 - "Prices Controller & Auth Types"
Cohesion: 0.19
Nodes (13): AuthRequest, PricesController, Body, Controller, Delete, Get, Param, Post (+5 more)

### Community 14 - "Pesable & Theme Utils"
Cohesion: 0.12
Nodes (12): parseWeighedBarcode(), aplicar(), leer(), Theme, useTheme(), fmtHora(), PosPage(), cambiarCantidad() (+4 more)

### Community 15 - "Price Rules UI Page"
Cohesion: 0.18
Nodes (17): PricesPage(), addTramo(), apply(), buildBody(), calculate(), cancelScheduled(), deleteList(), deletePromo() (+9 more)

### Community 16 - "Caja Register Controllers"
Cohesion: 0.24
Nodes (11): CashRegistersController, CashShiftsController, Body, Controller, Get, Param, Post, Query (+3 more)

### Community 17 - "Auth & Validation Deps"
Cohesion: 0.11
Nodes (19): argon2, dependencies, argon2, class-transformer, class-validator, exceljs, jsonwebtoken, @nestjs/common (+11 more)

### Community 18 - "Caja Service"
Cohesion: 0.18
Nodes (6): Inject, CajaService, monto(), texto(), Inject, Injectable

### Community 19 - "Caja & Arqueo Domain Concepts"
Cohesion: 0.14
Nodes (19): product-search.util.ts (backend fuzzy search), Integración con ARCA (sin definir), Caja / Arqueo, CashMovement Model, CashRegister Model, CashShift Model, Cuenta Corriente de Clientes, CustomerAccountMovement Model (+11 more)

### Community 20 - "Customers Page UI"
Cohesion: 0.16
Nodes (16): errorMessage(), submit(), submit(), CustomersPage(), openCuenta(), registrarPago(), submit(), toggleActive() (+8 more)

### Community 21 - "Categories Controller"
Cohesion: 0.16
Nodes (12): CategoriesController, Body, Controller, Delete, Get, Inject, Param, Post (+4 more)

### Community 22 - "Price Lists Controller"
Cohesion: 0.17
Nodes (11): PriceListsController, Body, Controller, Delete, Get, Inject, Param, Post (+3 more)

### Community 23 - "Price Rules Controller"
Cohesion: 0.21
Nodes (10): PriceRulesController, Body, Controller, Delete, Get, Param, Post, Put (+2 more)

### Community 24 - "Product Detail Page"
Cohesion: 0.16
Nodes (15): api(), margin(), ProductDetailPage(), addBarcode(), addTier(), removeBarcode(), removeTier(), WarehousesPage() (+7 more)

### Community 25 - "Customers Controller"
Cohesion: 0.17
Nodes (11): CustomersController, Body, Controller, Get, Inject, Param, Post, Put (+3 more)

### Community 26 - "Price Import Utility"
Cohesion: 0.20
Nodes (14): BARCODE_ALIASES, COST_ALIASES, detectDelimiter(), findColumn(), matrixFromCsv(), matrixFromXlsx(), NAME_ALIASES, normalizeHeader() (+6 more)

### Community 27 - "Stock In Draft Page"
Cohesion: 0.16
Nodes (8): draftKey(), readDraft(), StockInPage(), addLine(), cancelCorrection(), createProductInline(), submit(), submitCancelInvoice()

### Community 28 - "Sales Controller"
Cohesion: 0.25
Nodes (9): SalesController, Body, Controller, Get, Param, Post, Query, Req (+1 more)

### Community 29 - "Suppliers Controller"
Cohesion: 0.18
Nodes (10): SuppliersController, Body, Controller, Get, Inject, Param, Post, Put (+2 more)

### Community 30 - "Shared NestJS Decorators"
Cohesion: 0.18
Nodes (10): Body, Controller, Get, Inject, Param, Post, Put, Req (+2 more)

### Community 31 - "Frontend TS Config"
Cohesion: 0.14
Nodes (13): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, module, moduleResolution, outDir, skipLibCheck (+5 more)

### Community 32 - "Backend Dev Dependencies"
Cohesion: 0.15
Nodes (13): devDependencies, prisma, tsx, @types/express, @types/multer, @types/node, typescript, typescript (+5 more)

### Community 33 - "Purchases Controller"
Cohesion: 0.29
Nodes (8): PurchasesController, Body, Controller, Get, Param, Post, Req, UseGuards

### Community 34 - "Purchases Service"
Cohesion: 0.22
Nodes (4): Inject, PurchasesService, Inject, Injectable

### Community 35 - "Reference Category Enrichment Script"
Cohesion: 0.27
Nodes (11): apiGet(), Categoria, HEADERS, main(), pickSucursalBatches(), prisma, Producto, productosDeRubro() (+3 more)

### Community 36 - "Graphify Workflow & ERP Overview"
Cohesion: 0.22
Nodes (11): Graphify Knowledge Graph Workflow (AGENTS.md), main.ts Bootstrap (ValidationPipe), Graphify Knowledge Graph Workflow (CLAUDE.md), Mayorista ERP Project Overview, Purchase Invoice Lifecycle (draft/confirm/corrected), Append-only Stock Ledger, Manual Validation Style (no DTOs), Purchase Invoices Endpoints (+3 more)

### Community 37 - "Multi-Tenancy & RBAC Docs"
Cohesion: 0.24
Nodes (10): Prisma schema.prisma, Multi-Tenancy Strategy, GET /auth/me Endpoint, caja.autorizar_anulacion Permission, RangoPermission Model, Rangos Permission System (RBAC), User.rangoId Field, POST /auth/authorize-supervisor (+2 more)

### Community 38 - "Tenants Controller"
Cohesion: 0.24
Nodes (7): TenantsController, Controller, Get, Inject, Param, Req, UseGuards

### Community 39 - "API Reference Docs"
Cohesion: 0.22
Nodes (10): Auth Endpoints (signup/login/users), API Base Reference, Products Endpoints, Category Model (per-tenant), POST /products/import-reference, product_reference Global Table, GET /product-reference/:ean, SEPA Open Data Source (+2 more)

### Community 40 - "Frontend Architecture Docs"
Cohesion: 0.22
Nodes (8): Frontend Architecture (single App.tsx, no router), App Shell / Rail Navigation (app-shell.tsx), Yerba Design Tokens & Typography, frontend/index.html Entry Point, App(), AuthProvider(), readStoredSession(), styles.css Design Tokens (--ab-*)

### Community 41 - "Frontend Node TS Config"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include, vite.config.ts

### Community 42 - "Backend NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, db:enrich-categories, db:generate, db:import-reference, db:migrate, db:seed, start, start:dev

### Community 43 - "App Module Bootstrap"
Cohesion: 0.32
Nodes (5): AppModule, Module, bootstrap(), PrismaExceptionFilter, Catch

### Community 44 - "Price Activation Service"
Cohesion: 0.32
Nodes (4): PriceActivationService, Inject, Injectable, Cron

### Community 45 - "Product Reference Controller"
Cohesion: 0.25
Nodes (6): ProductReferenceController, Controller, Get, Inject, Param, UseGuards

### Community 46 - "Data Model Docs (Catalog)"
Cohesion: 0.50
Nodes (8): Catalog Endpoints (Warehouses/Suppliers/Lots), customers table, Base Data Model, product_lots table, stock_movements table, suppliers table, tenants table, warehouses table

### Community 47 - "Health Controller"
Cohesion: 0.29
Nodes (4): HealthController, Controller, Get, Inject

### Community 48 - "Backend Package Versions"
Cohesion: 0.33
Nodes (6): allowScripts, argon2@0.45.1, esbuild@0.28.2, prisma@6.19.3, @prisma/client@6.19.3, @prisma/engines@6.19.3

### Community 49 - "Reference Import Script (xlsx)"
Cohesion: 0.47
Nodes (5): cellText(), findColumn(), HEADERS, main(), prisma

### Community 50 - "External Compliance Citations"
Cohesion: 0.33
Nodes (6): ARCA: Emisión y Autorización de Factura Electrónica, ARCA: Régimen General y Clases de Comprobantes, GS1 Global Traceability Standard, Oracle Procurement Three-Way Match Docs, Purchases/Reception/Stock Research, Three-Way Match Concept

### Community 51 - "Rangos Admin Page"
Cohesion: 0.40
Nodes (5): RangosPage(), abrirEdicion(), borrar(), crear(), guardar()

### Community 52 - "Categories Page UI"
Cohesion: 0.33
Nodes (3): CategoriesPage(), confirmDelete(), submit()

### Community 53 - "Root Package Metadata"
Cohesion: 0.40
Nodes (4): name, prisma, seed, private

### Community 54 - "Reference Category Classifier Docs"
Cohesion: 0.40
Nodes (5): classify-reference-categories.ts script, enrich-reference-categories.ts script, Brand/Keyword Offline Classifier, Reference Catalog Category Classification, Precios Claros API (category tree)

### Community 55 - "Frontend API Client Errors"
Cohesion: 0.40
Nodes (4): ApiError, downloadFile(), uploadFile(), exportExcel()

### Community 56 - "Users Admin Page"
Cohesion: 0.40
Nodes (3): UsersPage(), submitCreate(), submitEdit()

### Community 57 - "Expirations Page"
Cohesion: 0.40
Nodes (4): daysRemaining(), ExpirationsPage(), submitEdit(), urgencyBadge()

### Community 58 - "Product Search Dialog"
Cohesion: 0.83
Nodes (4): ProductSearchDialog(), alTeclear(), elegible(), elegir()

### Community 60 - "Sales History Page"
Cohesion: 0.50
Nodes (4): comprobante(), fechaHora(), SalesHistoryPage(), anular()

### Community 61 - "Supervisor Auth Dialog"
Cohesion: 1.00
Nodes (3): SupervisorAuthDialog(), reset(), submit()

## Knowledge Gaps
- **231 isolated node(s):** `name`, `private`, `start:dev`, `start`, `db:generate` (+226 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 438 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `Prisma Seed Data` to `Auth Bootstrap & Guards`, `Graphify Workflow & ERP Overview`, `Rangos Permissions Controller`, `Prices Controller & Auth Types`, `Price Rules UI Page`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **Why does `AuthRequest` connect `Prices Controller & Auth Types` to `Cuenta Corriente Ledger`, `Auth Bootstrap & Guards`, `Purchases Controller`, `Prisma Seed Data`, `Product Search Utility`, `Rangos Permissions Controller`, `Tenants Controller`, `Stock Controller`, `Price History Utility`, `Promotions Controller`, `Caja Register Controllers`, `Categories Controller`, `Price Lists Controller`, `Price Rules Controller`, `Customers Controller`, `Sales Controller`, `Suppliers Controller`, `Shared NestJS Decorators`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `PrismaService` connect `Auth Bootstrap & Guards` to `Cuenta Corriente Ledger`, `Purchases Service`, `Prisma Seed Data`, `Product Search Utility`, `Rangos Permissions Controller`, `Tenants Controller`, `Stock Controller`, `Price History Utility`, `Promotions Controller`, `Price Activation Service`, `Product Reference Controller`, `Health Controller`, `Caja Service`, `Categories Controller`, `Price Lists Controller`, `Customers Controller`, `Suppliers Controller`, `Shared NestJS Decorators`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `name`, `private`, `start:dev` to the rest of the system?**
  _231 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend App Shell & UI Kit` be split into smaller, more focused modules?**
  _Cohesion score 0.06439393939393939 - nodes in this community are weakly interconnected._
- **Should `Cuenta Corriente Ledger` be split into smaller, more focused modules?**
  _Cohesion score 0.053005464480874315 - nodes in this community are weakly interconnected._
- **Should `Auth Bootstrap & Guards` be split into smaller, more focused modules?**
  _Cohesion score 0.13906359189378056 - nodes in this community are weakly interconnected._