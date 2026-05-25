# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Attendance workshop app — teaching repo for agentic engineering with Claude Code. Real, small Next.js attendance tracker; See `docs/ARCHITECTURE.md` and `docs/agentic_pipeline.md` for the big picture.

## Commands
Package manager is **pnpm** — never `npm` or `yarn`.

| Command              | Purpose                                                      |
|----------------------|--------------------------------------------------------------|
| `pnpm dev`           | Next.js dev server (http://localhost:3000)                   |
| `pnpm lint`          | ESLint (`next lint`)                                         |
| `pnpm typecheck`     | `tsc --noEmit`                                               |
| `pnpm test`          | Vitest unit tests (one-shot)                                 |
| `pnpm test -- <file>`| Run a single Vitest file                                     |
| `pnpm test:watch`    | Vitest watch                                                 |
| `pnpm test:e2e`      | Playwright (auto-spawns dev server per `playwright.config.ts`) |
| `pnpm db:generate`   | Generate Drizzle migration from `db/schema.ts`               |
| `pnpm db:migrate`    | Apply migrations to local Postgres                           |
| `pnpm db:seed`       | Seed demo users + logs + admin GoTrue user                   |
| `pnpm db:reset`      | Wipe volumes, restart Postgres, migrate, seed                |

Local stack: `docker compose up -d` brings up Supabase (Postgres :54322, Kong/Auth :54321, Studio :54323).

## Architecture

- **Next.js 15 App Router**, React 19 RC. Server Components by default; `"use client"` only for `/scan`, the create-user form, and Supabase Auth pages.
- **Two surfaces**:
  - Public `/scan` — the barcode token IS the credential; no auth, no PII rendered. `POST /api/scan` accepts `{ token, type }`.
  - Authenticated `/admin/*` — guarded in `app/(admin)/layout.tsx` via Supabase Auth.
- **DB access** through Drizzle ORM via `db/client.ts` only. Don't instantiate Drizzle elsewhere. Schema in `db/schema.ts` is the single source of truth; migrations are append-only in `db/migrations/`.
- **Domain model**:
  - `users(id, name, email, barcode_token UNIQUE, created_at, deleted_at NULL)`
  - `attendance_logs(id, user_id FK, type ∈ {entry,exit}, timestamp, auto_closed)`
  - `deleted_at` and `auto_closed` are pre-shipped so workshop migrations stay clean.
- **Where work goes**: pure logic in `lib/*` (vitest), DB shape in `db/schema.ts`, UI in `app/` + `components/`. shadcn primitives live in `components/ui/` — extend, don't reinvent (use the `add-shadcn-component` skill first).

## Agentic pipeline
The repo is organized around a slash-command pipeline. Artifacts always live in `docs/tasks/<slug>/`. Worked example: `docs/tasks/000-example-sort-dashboard/`.

```
GitHub issue → /prd → /techspec → /tasks → /implement → /verify-feature → PR
```

Each stage reads the previous stage's artifact. Always create the task folder when starting a new feature; never leave empty placeholders.

## Verification discipline

A feature is not "done" until verified three ways (use `/verify-feature`):

1. **SQL** — query Postgres (via Supabase MCP) to show the row changed.
2. **curl** — hit the API endpoint, show the response.
3. **Playwright** — drive the UI end-to-end.

Type checking and unit tests verify code correctness, not feature correctness.
