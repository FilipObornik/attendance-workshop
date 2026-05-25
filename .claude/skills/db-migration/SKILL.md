---
name: db-migration
description: Use whenever adding/changing a Postgres column, table, or index. Generates a Drizzle migration safely and tells you verification commands.
---

1. Edit `db/schema.ts` to reflect the new shape.
2. Run `pnpm db:generate` — creates a new file in `db/migrations/`.
3. Inspect the SQL. If it contains DROP COLUMN or DROP TABLE, STOP and ask the user
   to confirm — destructive operations require explicit OK.
4. Run `pnpm db:migrate` against local Supabase (docker-compose) to verify.
5. Verify via Supabase MCP: query information_schema to confirm shape.
6. Commit the migration file in the same commit as the schema change.

NEVER edit an existing migration. Always generate a new one.
