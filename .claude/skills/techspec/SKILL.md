---
name: techspec
description: Turn an approved PRD into a technical specification grounded in THIS repository's architecture, conventions, and `.claude/rules/`. Triggers on "write the spec", "draft the techspec", "design the implementation", "/techspec", or right after a PRD is approved. Writes to docs/tasks/<slug>/techspec.md. STOPS at the implementation plan — building is the next stage.
---

# Techspec skill

Produces a **technical** doc — exactly which files, schema deltas, API shapes,
and verification steps an engineer needs to ship the PRD. Building the feature
is a separate stage (`implement`).

## Required reading (load every time, in this order)

1. `.claude/CLAUDE.md` — architecture, conventions, pipeline.
2. `docs/ARCHITECTURE.md` — surfaces, routes, where things live.
3. `.claude/rules/admin-area.md`, `.claude/rules/scan-public.md`,
   `.claude/rules/database.md` — load **all three**. You're authoring a doc that
   touches multiple paths, so the path-frontmatter auto-loading isn't enough.
4. `docs/tasks/<slug>/prd.md` — the PRD you're spec'ing.
5. `docs/tasks/000-example-sort-dashboard/techspec.md` — worked example for voice.
6. `.claude/templates/techspec.md` — output shape.

These files are the **single source of truth** for repo conventions. Don't restate
their rules in the techspec — cite them with file + verbatim line in §2.

## Process

### 1. Pre-flight

- Identify the slug. If unclear, list `docs/tasks/` and ask.
- Confirm `docs/tasks/<slug>/prd.md` exists with `Status: Approved`. If it's
  Draft, warn and ask whether to proceed.

### 2. Ground in the actual codebase

Don't write from memory of "what a Next.js app usually does". Pattern-match
THIS repo before committing to a shape:

- UI patterns → glob `app/(admin)/admin/**/*.tsx` for how pages fetch data and
  lay out chrome.
- API patterns → read `app/api/scan/route.ts` and `app/api/users/route.ts` for
  validation + response shapes.
- DB patterns → read `db/schema.ts` + a recent migration in `db/migrations/`.
- Test patterns → read `tests/e2e/admin.spec.ts` for storage-state + fixtures.

If the existing code conflicts with a rule, that's a finding — surface it to
the user, don't paper over it.

### 3. Resolve PRD ↔ rule collisions before writing

If the PRD's acceptance criteria collide with a rule, stop and ask. Examples:

- "Render the user's name on /scan after success" → collides with
  `.claude/rules/scan-public.md`. Push back; ask the user to change the
  requirement or move it to the admin surface.
- "Drop the `barcode_token` column" → `.claude/rules/database.md` forbids
  destructive ops without a deprecation step. Plan one (nullable → backfill →
  drop) or get explicit approval.
- "Hard delete the user" → same rule forbids it. Push back; soft delete is the
  only option.

When the PRD has unresolved open questions that block the design, ask the user
via `AskUserQuestion` (max 3). Don't fabricate decisions.

### 4. Write the techspec

Fill `docs/tasks/<slug>/techspec.md` from `.claude/templates/techspec.md` —
every applicable section. Concrete rules:

- **Cite rules** in §2 with file + verbatim line.
- **List every file** in §3 with N (new) / M (modified), in implementation order.
- **§5 API contract** must have the exact zod shape (pseudocode signature is
  fine — no JS imports needed) and an exhaustive status code table.
- **§9 verification** must be runnable copy-paste. Use the existing patterns:
  - SQL via `docker exec attendance-workshop-db-1 psql -U postgres -d postgres -c "<query>"`
  - curl against `http://localhost:3000` (note: dev server can drift to 3001+
    if 3000 is taken — flag if relevant)
  - Playwright pattern from existing specs
- **PII assertion**: if the change touches `/scan` or `/api/scan` at all, add
  an explicit Playwright assertion that the success page contains no `@` and
  no seeded user's name.

### 5. Hand off

After writing, post a compact summary:

- **What it changes** (1 paragraph)
- **Files touched** (bullet list of paths)
- **Schema impact** (Yes/No + 1 line)
- **Rules cited** (bullet list)
- **Open questions still on the human** (bullets, or "none")
- Ask: "Refine the techspec, or hand off to `/tasks`?"

Do NOT auto-advance to `/tasks`.

## Hard rules

- Never write code. The techspec describes file paths, signatures, and shapes —
  pseudocode at most.
- Never invent file paths the codebase doesn't use. New file? Pick a location
  matching the existing structure (new pure helper → `lib/<file>.ts`; new admin
  page → `app/(admin)/admin/<segment>/page.tsx`).
- Never skip the rule-citation step in §2. Even if a rule is obviously in play,
  write it down so the engineer downstream doesn't have to re-derive.
- Never write past §11 of the template. Implementation steps live in `tasks`
  and `implement`, not here.
- Always include the triple-channel verification (SQL + curl + Playwright) plus
  a build check. If a channel genuinely doesn't apply (UI-only with no DB),
  say so explicitly and explain why — don't silently omit.
- Always write in English.

## Anti-patterns to refuse

- TypeScript code blocks longer than ~5 lines. Pseudocode signatures only.
- Inventing new architectural layers ("introduce a service layer for users")
  without an explicit PRD or rule mandate.
- Adding a new dependency to solve something existing code already does.
- Schema changes that work around a constraint instead of respecting it
  (e.g. parallel `users_v2` table to avoid the soft-delete rule).
- Verification plans that "test by running unit tests" — that's not feature
  verification, that's code verification.
- Pre-creating any `_plan.md` or task list. Decomposition is the `tasks` skill's
  job and it uses Claude Code's built-in task system.

## Output contract

A complete `docs/tasks/<slug>/techspec.md` that:

- Names every file touched (path + new/modified + reason)
- Specifies schema deltas with a migration plan (or "None" if none)
- Specifies every endpoint or server action with exact request/response shapes
  and status codes
- Lists which shadcn primitives and `components/attendance/*` composites are reused
- Includes a runnable verification block (Build + SQL + curl + Playwright)
- Cites the `.claude/rules/*.md` rules that govern the work
