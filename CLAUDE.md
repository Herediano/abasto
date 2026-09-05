# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Abasto is a multi-tenant ERP for wholesale supermarkets, in early/foundational stage. Backend: NestJS + TypeScript + Prisma + PostgreSQL. Frontend: React + TypeScript + Vite.

## Commands

Start Postgres locally:

```bash
docker compose -f infra/docker/compose.yml up -d
```

Backend (run from `backend/`):

```bash
npm run start:dev    # tsx watch, dev server
npm run start        # run once, no watch
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate deploy
npm run db:seed      # tsx prisma/seed.ts
npx prisma migrate dev --name <name>   # create a new migration
```

Frontend (run from `frontend/`):

```bash
npm run dev       # vite dev server
npm run build     # tsc -b && vite build
npm run preview
```

There is no test suite and no lint config in this repo yet — don't look for `npm test` or `npm run lint`.

## Architecture

- **Layout**: `backend/` (NestJS + Prisma + Postgres API), `frontend/` (React + Vite SPA), `infra/docker/` (local Postgres via Compose), `docs/` (Spanish-language notes on data-model and workflow decisions — worth reading before changing the schema or the purchases/stock flows).

- **Multi-tenancy**: one shared Postgres schema; every business table carries `tenant_id`. The tenant is always derived server-side from the authenticated JWT (`request.user.tenantId`) — it is never accepted from the client. Parent models declare a composite `@@unique([id, tenantId])`, and child rows reference `[parentId, tenantId]` as their FK, so a child can only ever join to a parent in the same tenant (see `backend/prisma/schema.prisma`).

- **Auth**: `JwtAuthGuard` (`backend/src/auth.guard.ts`) is applied per-controller with `@UseGuards` and populates `request.user` (typed as `AuthRequest` in `auth.types.ts`) by verifying the Bearer token in `auth.service.ts`. `AdminGuard` stacks on top of it to gate admin-only writes (`role: 'admin'` vs `'user'`). Passwords are hashed with Argon2id; JWTs are signed with `JWT_SECRET` and expire after 8 hours.

- **Validation style**: controllers/services validate bodies manually (`typeof` checks, throwing `BadRequestException` / `UnprocessableEntityException` / `ConflictException`) rather than DTOs + class-validator, even though a global `ValidationPipe` is registered in `main.ts`. Controllers are thin — simple resources call Prisma directly (e.g. `products.controller.ts`), while anything transactional is delegated to a co-located service (`stock.service.ts`, `purchases.service.ts`, `auth.service.ts`).

- **Stock ledger**: `stock_movements` is an append-only ledger, never updated in place except through the one guarded path described below. Current stock for a product/lot/warehouse is `SUM(quantity)` (positive for inbound movement types, negative for outbound). Writes (`stock.service.ts`) take a `pg_advisory_xact_lock` keyed on `tenant:product:lot:warehouse` and run under `Serializable` isolation to prevent races and negative stock.

- **Purchase invoices** (`purchases.service.ts`): lifecycle is `draft` → `confirm` (creates `purchase_in` stock movements for each line) → `corrected` (reverses the prior movements with `adjustment_out`, re-creates `purchase_in` movements for the new lines, and snapshots the prior invoice state into `purchase_invoice_revisions`). Confirmed/corrected invoices are treated as history and are not edited directly outside this flow.

- **Frontend**: the whole app is `frontend/src/App.tsx` — no router library, just manual `window.history.pushState`-based path state, a single shared `api()` fetch wrapper, and the session persisted to `localStorage`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
