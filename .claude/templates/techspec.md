# Techspec: <title>

**PRD:** ./prd.md
**Status:** Draft | Approved
**Last updated:** YYYY-MM-DD

> A techspec turns the PRD into HOW. It must align with the existing architecture
> documented in root `CLAUDE.md` and any applicable `.claude/rules/*.md`. Cite the
> rules you're following — and call out anywhere you're deliberately diverging.

## 1. Summary
2–3 sentences: what we're building, what part of the codebase it touches, and the
architectural shape of the change (UI-only / API-only / schema + plumbing / etc.).

## 2. Architecture context
Which surfaces are involved and which conventions govern the work.

- **Surfaces touched**: `[ ] admin`  `[ ] /scan public`  `[ ] db`  `[ ] lib (pure)`  `[ ] tests`
- **Auth posture**: `requireAdmin()` (admin) / unauthenticated (public scan) / N/A
- **Server vs client**: Server Component by default; list any `"use client"` islands
  and why they need to be client.
- **Mutation pattern**: server action (admin) / API route (public or admin) — pick one
  and justify.
- **DB access**: through `db/client.ts` only.
- **Applicable rules** (cite the file + the rule line that applies):
  - `.claude/rules/<...>.md` — "<verbatim rule>"
  - …
- **Deliberate divergences** (if any): rule, why we're not following it, mitigation.

## 3. Affected files
| Path | New / Modified | Why |
|------|----------------|-----|
| `app/...` | M | … |
| `db/...` | M | … |
| `components/...` | N | … |

Order matters: list in implementation order if there's a dependency chain.

## 4. Data model & migration
**Schema changes**: None / list.

If changing schema:
1. Edit `db/schema.ts`.
2. `pnpm db:generate` → new file in `db/migrations/` (append-only — never edit
   prior migrations).
3. New/changed columns:
   | Table | Column | Type | Nullable | Default | Notes |
4. Backfill plan if needed (nullable → backfill → NOT NULL is the pattern).
5. If a destructive op (DROP COLUMN/TABLE) is unavoidable, get explicit approval
   per `.claude/rules/database.md`.

## 5. API contract
For each endpoint touched:

### `<METHOD> /api/<path>`
- **Auth**: admin (`requireAdmin()`) / public
- **Request**: shape + validation (zod)
- **Response**: shape + status codes
- **Errors**: every non-200 path with status + body shape
- **PII rule**: if public, confirm response carries no PII per `.claude/rules/scan-public.md`

If using a server action instead, document its signature here under "Server action".

## 6. UI plan
- **Route(s)**: `/...` — Server Component / `"use client"` and why
- **Components reused**: shadcn primitives from `components/ui/`, attendance
  composites from `components/attendance/`
- **New components needed**: list them; check `components/ui/` BEFORE writing — if a
  shadcn primitive covers it, use it (load the `add-shadcn-component` skill)
- **State & data flow**: how the page gets its data (direct Drizzle in a Server
  Component / fetch in an effect / form submission)
- **Loading / empty / error states**: explicit behavior for each

## 7. Dependencies
New runtime / dev dependencies — should be rare. For each:
- Package + version
- Why this and not the standard lib / existing dep
- License + maintenance status check

## 8. Test plan
- **Unit (Vitest)** — for pure logic in `lib/*`:
  - `tests/unit/<file>.test.ts` — what it covers
- **E2E (Playwright)** — for user flows:
  - `tests/e2e/<file>.spec.ts` — scenarios
- **What we deliberately don't test**: list with reasoning (e.g. "DB-only changes
  covered by SQL verification below").

## 9. Verification plan (the three channels)
Every techspec MUST include all three. The `verify-feature` skill executes this
section verbatim — write it so it can be copy-pasted.

- **SQL** (via Supabase MCP, local Postgres on `:54322`):
  ```sql
  <query that proves the row state matches the spec>
  ```
  Expect: `<exact result>`

- **curl**:
  ```bash
  <command that exercises the endpoint, with realistic payload>
  ```
  Expect: `<status + body>`

- **Playwright** (against `pnpm dev`):
  - Open `<route>`
  - Do `<action>`
  - Assert `<outcome>` (assert PII-absence too if `/scan` is touched)

## 10. Task breakdown hints
For the `tasks` skill to consume. Just hints — the skill decides the final wave layout.

- Suggested wave plan: tasks A and B disjoint files → parallel; task C depends on A.
- DB migration tasks always go alone in their own wave.
- Indicate which tasks could be done by an attendee solo vs need pairing.

## 11. Risks & rollback
- **Risk**: <thing that could break in prod, how we'd notice>
- **Rollback**: <how we'd undo if it ships and burns> — usually "revert the PR";
  call out anything DB-shaped that revert alone wouldn't fix.
