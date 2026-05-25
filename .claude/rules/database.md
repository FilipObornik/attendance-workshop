---
paths:
  - "db/**"
  - "drizzle.config.ts"
---

# Database

- Schema is in `db/schema.ts`. Migrations in `db/migrations/` are append-only.
- NEVER edit an existing migration file. Generate a new one: `pnpm db:generate`.
- NEVER drop a column without a deprecation step (nullable → backfill → drop).
- Soft delete via `deleted_at`. Hard deletes are forbidden.
- `attendance_logs.auto_closed` exists from day one — keep it accurate.
- Local DB lives in docker-compose. Reset with `pnpm db:reset` (destroys volume).
