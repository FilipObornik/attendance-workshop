# Attendance Workshop

A small, deliberately boring attendance tracker built as a teaching repo for **agentic
engineering with Claude Code**. The workshop's seeded GitHub issues (see
`WORKSHOP_ISSUES.md`) are the curriculum — *they are not pre-built*.

Stack: Next.js 15 (App Router) · TypeScript · Drizzle ORM · Supabase (local via
docker-compose) · Tailwind · shadcn/ui · Vitest · Playwright.

## Quickstart

Requirements: Node 20+, pnpm 9+, Docker.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

No manual Supabase Studio steps required — `pnpm db:seed` also creates the admin
GoTrue user (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`) via the admin API.

Open:
- App:           http://localhost:3000
- Scanner:       http://localhost:3000/scan
- Admin:         http://localhost:3000/admin (sign in with the seeded admin credentials)
- Supabase Studio: http://localhost:54323

## Scripts

| Command            | What it does                                       |
|--------------------|----------------------------------------------------|
| `pnpm dev`         | Next.js dev server                                  |
| `pnpm lint`        | ESLint                                              |
| `pnpm typecheck`   | `tsc --noEmit`                                      |
| `pnpm test`        | Vitest unit tests                                   |
| `pnpm test:e2e`    | Playwright (needs `pnpm dev` running, or auto-spawn)|
| `pnpm db:generate` | Generate Drizzle migration from schema              |
| `pnpm db:migrate`  | Apply migrations to local Postgres                  |
| `pnpm db:seed`     | Seed demo users + logs                              |
| `pnpm db:reset`    | Wipe and re-seed local DB                           |

## The workshop pipeline

Read `docs/agentic-pipeline.md`. TL;DR:

```
GitHub issue → /prd → /techspec → /tasks → /implement → /verify-feature → PR
```

Each stage writes artifacts to `docs/tasks/<slug>/` that the next stage reads. A worked
example lives at `docs/tasks/000-example-sort-dashboard/`.

## Layout

```
app/             Next.js routes (admin + /scan + /api)
components/      shadcn primitives + attendance widgets
db/              schema, client, migrations, seed
lib/             barcode, supabase, auth helpers
tests/           vitest (unit) + playwright (e2e)
.claude/         agents, skills, hooks, templates, settings
docs/            architecture + flow + tasks
```
