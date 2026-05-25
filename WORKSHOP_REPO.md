# Attendance Workshop — Repository Blueprint

> Design doc for the workshop repo. Lists the full file tree, what each `.claude/` artifact contains, and the rationale per teaching moment. Implementation comes later — this is the **map**.

---

## 1. Project at a glance

**Name:** `attendance-workshop` (suggested)

**What it does:** Office attendance tracker. Admins create users → each user gets a unique barcode token. A public `/scan` page logs entry/exit. Admin dashboard shows who's currently in.

**Stack:**
- Next.js 15 (App Router) + TypeScript
- **Supabase via `docker-compose`** (local Postgres + Auth + Studio — zero cloud provisioning for attendees)
- Drizzle ORM for typed schema + migrations
- shadcn/ui + Tailwind
- `bwip-js` (barcode generation) + `@zxing/browser` (camera scan — added via issue, not pre-built)
- Vitest (unit) + Playwright (e2e)
- ESLint + Prettier (lint hook hooks into ESLint only)

**Auth:** Supabase Auth on `/admin/*`. `/scan` is fully public (only the barcode token authorizes the action).

**Domain model:**
- `users` — `id`, `name`, `email`, `barcode_token` (unique random string), `created_at`, `deleted_at`
- `attendance_logs` — `id`, `user_id`, `type` ('entry' | 'exit'), `timestamp`, `auto_closed` (bool)

---

## 2. Scope (in a nutshell)

The base repo ships a **working, deliberately boring attendance tracker**. The workshop's seeded issues add the interesting bits — do not build them in advance.

### In scope (ships pre-built)

- **DB** — `users` + `attendance_logs` tables, Drizzle migrations, seed (3 users, sample logs)
- **Admin (`/admin/*`, auth'd via Supabase Auth)**
  - List users
  - Create user form (returns barcode token + renders Code128 barcode PNG)
  - User detail page
  - Dashboard: "Currently in" card + today's logs
- **Scanner (`/scan`, public, unauthenticated)**
  - **Manual token text input** + entry/exit toggle (camera scanning is intentionally an issue, not pre-built)
  - Posts to `/api/scan`
- **API**
  - `POST /api/users` — create user
  - `GET  /api/users` — list users
  - `POST /api/scan` — `{ token, type }` → write attendance log
  - `GET  /api/attendance/today`
  - `GET  /api/attendance/currently-in`
- **Infra**
  - `docker-compose.yml` — local Supabase (Postgres + Auth + Studio)
  - ESLint + Prettier, Vitest + Playwright preconfigured with 1 smoke test each
- **All `.claude/` artifacts** — 4 agents, 7 skills, 2 templates, 1 lint hook, team `settings.json`, `.mcp.json`
- **One worked example** at `docs/tasks/000-example-sort-dashboard/` (`prd.md` + `techspec.md`) so attendees see the artifact shape before producing their own

### Explicitly NOT in scope (these are the seeded issues — leave undone)

- Camera-based barcode scanning (manual input is the stand-in)
- Business rules (double-entry prevention, etc.)
- Analytics (weekly hours, per-user summaries)
- Soft delete
- Auto-close dangling entries
- Email validation on user creation
- Dashboard sorting (warm-up issue)
- Multi-tenancy (the deliberate-bait issue)

### Non-goals (never built, not even as issues)

- Mobile / native app
- Hardware scanner integration, multi-camera selection
- Email / Slack / push notifications
- Reporting / CSV export (beyond what an issue might add)
- Production deployment story — this is a teaching repo, `docker compose up` is the deploy target

### Acceptance criteria for "base repo is done"

1. Fresh laptop: `git clone` → `pnpm install` → `docker compose up -d` → `pnpm db:migrate && pnpm db:seed` → `pnpm dev` → working app in <5 min.
2. Admin can log in, create a user, see the barcode.
3. Scanner page accepts a token + type, writes a log, dashboard reflects it.
4. `pnpm lint && pnpm test && pnpm test:e2e` all pass.
5. Running the `prd` skill on a fake issue produces a `docs/tasks/<slug>/prd.md` matching the worked example's shape.
6. The `verify-feature` skill can execute SQL, curl, and Playwright against the running stack.

If all six pass, the base repo is workshop-ready.

---

## 3. Full repository tree

```
attendance-workshop/
├── CLAUDE.md                              # Root context: project, conventions, pipeline
├── README.md                              # Setup, workshop intro for attendees
├── .gitignore
├── .env.example
├── .mcp.json                              # Team MCP servers (committed)
├── docker-compose.yml                     # Supabase local stack (db, auth, studio, kong)
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── .eslintrc.cjs
├── .prettierrc
│
├── .claude/
│   ├── settings.json                      # Team settings (committed) — lint hook only
│   ├── settings.local.json.example        # Personal example (real one gitignored)
│   ├── agents/
│   │   ├── prd-writer.md
│   │   ├── spec-writer.md
│   │   ├── task-decomposer.md
│   │   └── reviewer.md
│   ├── skills/
│   │   ├── prd/SKILL.md                   # issue → docs/tasks/<slug>/prd.md
│   │   ├── techspec/SKILL.md              # prd.md → techspec.md
│   │   ├── tasks/SKILL.md                 # techspec.md → tasks/*.md
│   │   ├── implement-next/SKILL.md        # execute next ready task
│   │   ├── verify-feature/SKILL.md        # SQL + curl + Playwright
│   │   ├── db-migration/SKILL.md          # Drizzle migration discipline
│   │   └── add-shadcn-component/SKILL.md  # check shadcn before building UI
│   ├── templates/
│   │   ├── prd.md                         # Template used by the prd skill
│   │   └── techspec.md                    # Template used by the techspec skill
│   ├── rules/
│   │   ├── admin-area.md                  # paths: app/(admin)/**
│   │   ├── scan-public.md                 # paths: app/scan/**, app/api/scan/**
│   │   └── database.md                    # paths: db/**, drizzle.config.ts
│   └── hooks/
│       └── post-edit-lint.sh              # ESLint on Edit/Write — the only hook
│
├── docs/
│   ├── ARCHITECTURE.md                    # 1-pager of the system
│   ├── WORKSHOP-FLOW.md                   # The pipeline doc (PRD → spec → tasks → ...)
│   └── tasks/
│       └── 000-example-sort-dashboard/    # ONE worked example ships in the repo
│           ├── prd.md
│           ├── techspec.md
│           └── 01-add-order-by.md         # (optional) task breakdown file
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx                           # Landing → links to /scan and /admin
│   ├── globals.css
│   │
│   ├── (admin)/                           # ← .claude/rules/admin-area.md applies here
│   │   ├── layout.tsx                     # Wraps in auth check (requireAdmin())
│   │   ├── admin/
│   │   │   ├── page.tsx                   # User list + create form
│   │   │   ├── users/[id]/page.tsx        # User detail + barcode PNG
│   │   │   └── dashboard/page.tsx         # "Who's in" + today's logs
│   │
│   ├── scan/                              # ← .claude/rules/scan-public.md applies here
│   │   └── page.tsx                       # Manual token entry (camera added via issue)
│   │
│   └── api/
│       ├── users/route.ts                 # POST create, GET list
│       ├── scan/route.ts                  # POST { token, type } → log
│       └── attendance/
│           ├── today/route.ts
│           └── currently-in/route.ts
│
├── db/                                    # ← .claude/rules/database.md applies here
│   ├── schema.ts                          # Drizzle schema
│   ├── client.ts
│   ├── seed.ts                            # 3 fake users + sample logs
│   └── migrations/
│       └── 0000_init.sql
│
├── lib/
│   ├── barcode.ts                         # bwip-js wrapper → SVG/PNG
│   ├── supabase-server.ts
│   ├── supabase-browser.ts
│   └── auth.ts
│
├── components/
│   ├── ui/                                # shadcn primitives (button, input, table, dialog, toast)
│   └── attendance/
│       ├── user-table.tsx
│       ├── currently-in-card.tsx
│       └── log-list.tsx
│
└── tests/
    ├── unit/
    │   └── barcode.test.ts
    └── e2e/
        ├── scan.spec.ts                   # manual-entry flow
        └── admin.spec.ts
```

### Task folder convention (important)

Every feature lives at `docs/tasks/<kebab-slug>/`. Inside:

- **`prd.md`** — the PRD (always)
- **`techspec.md`** — the technical spec (always, written after PRD is approved)
- **`NN-<task>.md`** — optional task breakdown files when work is split into chunks

**Do not create placeholder `.md` files.** A folder exists only when its content does. If a feature is too small to warrant task breakdowns, just `prd.md` + `techspec.md` is fine.

---

## 4. Root `CLAUDE.md` (sketch)

```markdown
# Attendance Workshop

A teaching repo for agentic engineering with Claude Code. Track office attendance via
barcode scanning. Two surfaces: authenticated admin dashboard + public scanner page.

## Architecture
- Next.js App Router. Server Components by default; "use client" only for the scanner
  and interactive admin widgets.
- Supabase runs locally via `docker-compose up` — Postgres + Auth + Studio at :54323.
- DB access via Drizzle ORM through `db/client.ts`. Never instantiate Drizzle elsewhere.
- Auth: Supabase Auth, applied on `app/(admin)/layout.tsx`. `/scan` is intentionally
  public — the barcode token IS the credential.

## Conventions
- Server actions for admin mutations. API routes for the public scan endpoint.
- shadcn components in `components/ui/`. Don't reinvent — load the add-shadcn-component
  skill before building UI.
- Tests: Vitest for pure logic (`lib/*`), Playwright for user flows.

## The agentic pipeline (read docs/WORKSHOP-FLOW.md)
Skills (invoke by name or let them trigger by description):
1. `prd`             — GitHub issue → docs/tasks/<slug>/prd.md (asks clarifying Qs)
2. `techspec`        — prd.md → techspec.md
3. `tasks`           — techspec.md → NN-*.md task files (with parallel waves)
4. `implement-next`  — execute next ready task (fan out via worktrees if wave > 1)
5. `verify-feature`  — SQL + curl + Playwright triple-check

## Task folders
All planning artifacts live at `docs/tasks/<slug>/`. Always create the folder when
starting a new feature. Never create empty placeholder files.

## Verification discipline
Every feature MUST be verifiable three ways before it's "done":
1. **SQL** — query Supabase via MCP, show the row changed
2. **curl** — hit the endpoint, show the response
3. **Playwright** — drive the UI, show the outcome

## Path-scoped rules (`.claude/rules/`)

Topic-specific rules load automatically when Claude reads matching files:

- `.claude/rules/admin-area.md`  → `app/(admin)/**`             (auth context, server actions OK)
- `.claude/rules/scan-public.md` → `app/scan/**`, `app/api/scan/**` (UNAUTH, no PII)
- `.claude/rules/database.md`    → `db/**`, `drizzle.config.ts` (migration discipline)
```

---

## 5. Path-scoped rules (`.claude/rules/*.md`)

Per [Claude memory docs](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/),
each rule file has YAML frontmatter with a `paths:` glob. Claude loads the rule into context
when it reads a matching file — no nested CLAUDE.mds needed.

### `.claude/rules/admin-area.md`

```markdown
---
paths:
  - "app/(admin)/**"
---

# Admin Area

You are inside an authenticated route group. Assume `auth.user` exists (enforced via
`requireAdmin()` in `app/(admin)/layout.tsx` and the API routes that mutate user data).

- Use Server Components by default; `"use client"` only for interactive widgets.
- Mutations: API routes that call `requireAdmin()`, OR server actions. Either is fine.
- Safe to render PII here (emails, names) — this is behind auth.
- Reuse `<UserTable>`, `<CurrentlyInCard>`, `<LogList>` from `components/attendance/`.
- Reuse shadcn primitives from `components/ui/`.
```

### `.claude/rules/scan-public.md`

```markdown
---
paths:
  - "app/scan/**"
  - "app/api/scan/**"
---

# Scanner — PUBLIC, UNAUTHENTICATED

Critical: `/scan` and `/api/scan` are reachable by anyone. The barcode token IS the credential.

DO:
- Validate tokens server-side in `/api/scan`. Never trust client-side state.
- Return generic errors ("Invalid code") — never leak whether a user exists.
  In particular, unknown-token and malformed-payload must produce the same status + body.
- Rate-limit aggressively (IP + token) when adding any rate-limiting layer.

DO NOT:
- Render user names, emails, or any PII on `/scan` or in `/api/scan` responses.
- Add auth here — that defeats the purpose. The token is the auth.
- Log full tokens to console/telemetry. Hash them if you must log.

After a scan succeeds, show only: "Welcome back" / "Goodbye" + timestamp.
```

### `.claude/rules/database.md`

```markdown
---
paths:
  - "db/**"
  - "drizzle.config.ts"
---

# Database

- Schema is in `db/schema.ts`. Migrations in `db/migrations/` are append-only.
- NEVER edit an existing migration file. Generate a new one: `pnpm db:generate`.
- NEVER drop a column without a deprecation step (nullable → backfill → drop).
- `barcode_token` is UNIQUE and indexed. Don't change that without a plan.
- Soft delete via `deleted_at`. Hard deletes are forbidden.
- `attendance_logs.auto_closed` exists from day one — keep it accurate.
- Local DB lives in docker-compose. Reset with `pnpm db:reset` (destroys volume).
```

---

## 6. `.claude/settings.json` (team, committed)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": ".claude/hooks/post-edit-lint.sh" }]
      }
    ]
  },
  "permissions": {
    "allow": [
      "Bash(pnpm:*)",
      "Bash(npx shadcn:*)",
      "Bash(docker compose:*)",
      "Bash(gh issue view:*)",
      "Bash(gh pr create:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)"
    ]
  }
}
```

## 7. `.claude/settings.local.json.example` (personal, gitignored)

```json
{
  "model": "claude-opus-4-7",
  "permissions": {
    "allow": ["Bash(rm:*)", "Bash(pnpm db:reset)", "Bash(docker compose down -v)"]
  }
}
```

Teaching point: **destructive perms live in personal settings, not team.**

## 8. `.mcp.json` (team, committed)

```json
{
  "mcpServers": {
    "supabase":   { "command": "npx", "args": ["-y", "@supabase/mcp-server-supabase", "--read-only"] },
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] },
    "context7":   { "command": "npx", "args": ["-y", "@upstash/context7-mcp"] },
    "github":     { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] }
  }
}
```

Teaching point: **Supabase read-only by default** — write access is a personal opt-in.

---

## 9. Subagents (`.claude/agents/*.md`)

### `prd-writer.md`

```markdown
---
name: prd-writer
description: Convert a GitHub issue into a PRD at docs/tasks/<slug>/prd.md. Invoked by the `prd` skill.
tools: Bash, Read, Write, AskUserQuestion
---

You convert GitHub issues into PRDs that engineers can act on.

Process:
1. Fetch the issue: `gh issue view <num> --json title,body,labels,comments`
2. Derive a kebab slug from the title (or use NNN-<slug> matching the issue number).
3. Read `.claude/templates/prd.md` for format.
4. Read `docs/tasks/000-example-sort-dashboard/prd.md` as a worked example.
5. Identify ambiguities. Ask the user via AskUserQuestion (max 3 questions).
   Ambiguities to hunt for: scope edges, error behavior, who's the user, success metric.
6. Create `docs/tasks/<slug>/` if it doesn't exist. Write `prd.md` there.
   Do NOT create placeholder techspec.md or task files — those come later.

Rules:
- A PRD is WHAT and WHY, never HOW. No file paths, no function names.
- If the issue is too vague to PRD even after questions, say so — don't fabricate scope.
- Always include: Problem, Users, Success Criteria, Out of Scope, Open Questions.
```

### `spec-writer.md`

```markdown
---
name: spec-writer
description: Turn a PRD into a techspec at docs/tasks/<slug>/techspec.md. Invoked by the `techspec` skill.
tools: Read, Write, Grep, Glob, Bash
---

Process:
1. Read `docs/tasks/<slug>/prd.md`.
2. Explore the codebase to ground the spec — schema, existing endpoints, conventions.
3. Read `.claude/templates/techspec.md` for format.
4. Write `docs/tasks/<slug>/techspec.md`.

Techspec MUST include:
- Affected files (paths, with reason)
- Schema changes (if any) + migration plan
- API contracts (request/response shapes)
- UI changes (which components, which routes)
- Test plan (unit + e2e, named)
- Verification plan (SQL query, curl command, Playwright assertion)

Rules:
- No code. Pseudocode at most. File paths and signatures are encouraged.
- If the PRD has open questions, the techspec must answer them or escalate.
```

### `task-decomposer.md`

```markdown
---
name: task-decomposer
description: Break a techspec into ordered task files. Invoked by the `tasks` skill.
tools: Read, Write
---

Read `docs/tasks/<slug>/techspec.md`. Produce numbered task files
`docs/tasks/<slug>/NN-<short-title>.md` where each contains:

- Title
- Files touched
- Depends-on (other task numbers, if any)
- Parallel-safe with (list of task numbers it can run alongside)
- Acceptance criteria (copied/derived from techspec)

Also write a `docs/tasks/<slug>/_plan.md` (the only file with a leading underscore)
summarizing the waves — which tasks run together.

Wave rules:
- A task is parallel-safe iff its `files touched` set is disjoint from another's
  AND neither depends on the other.
- DB migrations always go alone in their own wave.

Do not create task files for trivial features — if the techspec is <90 min of work,
just say so and skip decomposition.
```

### `reviewer.md`

```markdown
---
name: reviewer
description: Review the current diff against the techspec. Bug-focused, not style.
tools: Bash, Read, Grep
---

Process:
1. `git diff main...HEAD` — read everything changed.
2. Read the linked techspec at `docs/tasks/<slug>/techspec.md`.
3. Check:
   - Does the diff satisfy each acceptance criterion?
   - Obvious bugs (off-by-one, missing await, unhandled error, race)?
   - Is `/scan` still PII-free? (security regression check)
   - Are migrations append-only?
   - Are there missing tests?
4. Output: numbered list of findings, each tagged [BLOCKER] / [SHOULD] / [NIT].

Do NOT comment on formatting/style — ESLint + Prettier handle that.
```

---

## 10. Skills (`.claude/skills/*/SKILL.md`)

Skills replace slash commands here. They trigger by description match (or explicit invocation) and own the pipeline.

### `prd/SKILL.md`
```markdown
---
name: prd
description: Convert a GitHub issue into a PRD. Trigger when the user wants to "write a PRD", "draft requirements", or runs /prd. Creates docs/tasks/<slug>/prd.md.
---

1. Take an issue number from the user's prompt (or ask).
2. Invoke the `prd-writer` subagent with that issue number.
3. When it returns, summarize the PRD in 3 bullets and ask if I should proceed to `techspec`.
```

### `techspec/SKILL.md`
```markdown
---
name: techspec
description: Turn an approved PRD into a technical spec. Trigger when the user wants to "write the spec", "design the implementation", or after a PRD is approved.
---

1. Identify the task slug (folder under docs/tasks/).
2. Confirm `prd.md` exists and is approved.
3. Invoke the `spec-writer` subagent.
4. After it writes `techspec.md`, list affected files and ask if I should run `tasks`.
```

### `tasks/SKILL.md`
```markdown
---
name: tasks
description: Decompose a techspec into ordered task files with parallel waves. Trigger when the user wants to "break down the spec" or "plan the work".
---

1. Identify the task slug.
2. Confirm `techspec.md` exists.
3. Invoke `task-decomposer`.
4. Show the wave plan from `_plan.md` and recommend which waves to parallelize via worktrees.
```

### `implement-next/SKILL.md`
```markdown
---
name: implement-next
description: Execute the next ready task from a task folder. Use when the user wants to "implement the next task" or "continue the work".
---

1. Read `docs/tasks/<slug>/_plan.md`.
2. Find the next unfinished wave.
3. If the wave has >1 task, propose spawning parallel worktree agents — wait for OK.
4. If 1 task, execute it directly.
5. Mark task done in `_plan.md` and stop.
```

### `verify-feature/SKILL.md`
```markdown
---
name: verify-feature
description: Run the techspec's verification plan — SQL + curl + Playwright. Use before declaring a feature done or opening a PR.
---

1. Read `docs/tasks/<slug>/techspec.md` → "Verification plan" section.
2. Execute all three channels:
   - SQL via supabase MCP
   - curl via Bash
   - Playwright via playwright MCP
3. Report pass/fail per channel.
4. Do NOT declare success unless all three pass.
```

### `db-migration/SKILL.md`
```markdown
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
```

### `add-shadcn-component/SKILL.md`
```markdown
---
name: add-shadcn-component
description: Use when adding a UI component that might already exist in shadcn/ui (button, dialog, table, toast, form, etc.) before writing one from scratch.
---

1. Check `components/ui/` — if it exists, import it.
2. Otherwise: `npx shadcn@latest add <name>`
3. Only write a custom component if shadcn doesn't have it.
4. Style with Tailwind classes; don't introduce new CSS files.
```

---

## 11. Hook (`.claude/hooks/post-edit-lint.sh`)

```bash
#!/usr/bin/env bash
# Runs ESLint on edited files after every Edit/Write.
# Static analysis only — no typecheck, no secret scan, no stop-hooks.
set -e

# Read the hook payload to find the file that was just edited.
payload=$(cat)
file=$(echo "$payload" | jq -r '.tool_input.file_path // empty')

if [ -z "$file" ] || [ ! -f "$file" ]; then
  exit 0
fi

# Only lint files ESLint cares about.
case "$file" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

pnpm eslint "$file" --max-warnings=0 2>&1 | tail -20
```

Teaching point: **one hook, one job.** Lint runs fast, surfaces issues immediately, and is the lowest-friction guardrail. Other checks (typecheck, tests) belong in `verify-feature`, not on every keystroke.

---

## 12. Templates (`.claude/templates/`)

### `.claude/templates/prd.md`
```markdown
# PRD: <title>

**Issue:** #NNN
**Status:** Draft | Approved
**Author:** @<user> (via Claude)

## Problem
<1–3 sentences. What's broken / missing / friction?>

## Users
<Who feels this? Admin / Scanner / both?>

## Success Criteria
- [ ] <observable outcome>
- [ ] <observable outcome>

## Out of Scope
- <thing we're explicitly NOT doing>

## Open Questions
- <thing we asked the user about>
```

### `.claude/templates/techspec.md`
```markdown
# Techspec: <title>

**PRD:** ./prd.md

## Affected files
| Path | Reason |
|------|--------|
| ...  | ...    |

## Schema changes
<None | description + migration plan>

## API contract
<endpoint, method, request, response, errors>

## UI changes
<routes, components touched>

## Test plan
- Unit: <file::test name>
- E2E:  <playwright spec>

## Verification plan
- **SQL:** `<query>` → expect `<result>`
- **curl:** `<command>` → expect `<status + body>`
- **Playwright:** open `<route>`, do `<action>`, assert `<outcome>`
```

---

## 13. `docs/WORKSHOP-FLOW.md` (the pipeline doc)

```markdown
# The Agentic Pipeline

Five skills. Each writes artifacts into `docs/tasks/<slug>/` for the next stage to read.

    GitHub issue
        │
        ▼  prd skill          subagent: prd-writer        → docs/tasks/<slug>/prd.md
    PRD
        │
        ▼  techspec skill     subagent: spec-writer       → docs/tasks/<slug>/techspec.md
    Techspec
        │
        ▼  tasks skill        subagent: task-decomposer   → docs/tasks/<slug>/NN-*.md + _plan.md
    Task list (with waves)
        │
        ▼  implement-next     (parallel worktrees if wave has >1 task)
    Working code + tests
        │
        ▼  verify-feature     MCP: supabase + playwright
    Verified diff
        │
        ▼  reviewer subagent
    Reviewed diff
        │
        ▼  gh pr create

When to skip stages:
- Trivial change (typo, sort order): skip PRD, go straight to techspec or directly to code.
- Spike/exploration: skip all, work in a worktree, throw it away.

When NOT to skip:
- Anything cross-cutting, anything touching the DB, anything user-visible.
```

---

## 14. Local Supabase via Docker Compose

Use the official Supabase self-host compose file as a starting point, trimmed to what we need:

- `db` (postgres)
- `auth` (gotrue)
- `kong` (api gateway)
- `studio` (web UI on :54323)
- `meta` (postgres-meta)

Attendees run:
```bash
docker compose up -d        # Postgres on :54322, Studio on :54323
pnpm db:migrate
pnpm db:seed
pnpm dev                    # Next.js on :3000
```

Reset with `pnpm db:reset` → `docker compose down -v && docker compose up -d && pnpm db:migrate && pnpm db:seed`.

Teaching points:
- **Zero cloud provisioning** — workshop starts in <2 minutes per laptop.
- **Reset is cheap** — agents can destroy and rebuild the DB without consequence.
- **Supabase MCP points at localhost** — read-only by default in team config.

---

## 15. Where each teaching capability shows up

| Capability                  | Lives in                                                          |
|-----------------------------|-------------------------------------------------------------------|
| Root `CLAUDE.md`            | `/CLAUDE.md`                                                      |
| Path-scoped rules           | `.claude/rules/{admin-area,scan-public,database}.md`              |
| Team settings               | `.claude/settings.json`                                           |
| Personal settings           | `.claude/settings.local.json.example`                             |
| Custom subagents            | `.claude/agents/` × 4                                             |
| Custom skills (pipeline)    | `.claude/skills/{prd,techspec,tasks,implement-next,verify-feature}/` |
| Custom skills (helpers)     | `.claude/skills/{db-migration,add-shadcn-component}/`             |
| Hook (lint only)            | `.claude/hooks/post-edit-lint.sh`                                 |
| Templates                   | `.claude/templates/{prd,techspec}.md`                             |
| MCP (team)                  | `.mcp.json` — supabase, playwright, context7, github              |
| Local DB                    | `docker-compose.yml`                                              |
| Task artifacts              | `docs/tasks/<slug>/{prd,techspec,NN-*}.md`                        |
| Worked example              | `docs/tasks/000-example-sort-dashboard/`                          |
| Worktree parallelism        | Demoed on Wave 2+ of any techspec                                 |
| `/verify` discipline        | `verify-feature` skill + every techspec's "Verification plan"     |
| Plan mode                   | Demoed on the "multi-tenant" bait issue                           |

---

## 16. Setup order (when actually building this)

1. Scaffold Next.js + Drizzle + ESLint + Prettier.
2. Author `docker-compose.yml` for Supabase. Smoke-test connection.
3. Drizzle schema + initial migration + seed (3 users, sample logs).
4. Build `/admin` (list, create user, barcode display) — Server Components only.
5. Build `/scan` page **with manual token input** (no camera yet).
6. Build `/api/scan` + `/api/users` + `/api/attendance/*`.
7. Wire admin dashboard ("Currently in" + today's logs).
8. Add Playwright smoke test for the manual-entry happy path.
9. Drop in all `.claude/` artifacts (agents, skills, templates, hook, settings, MCP).
10. Write `docs/tasks/000-example-sort-dashboard/{prd.md,techspec.md}` as the worked example.
11. Open the 8 seeded GitHub issues from `WORKSHOP_ISSUES.md`.
12. Done. Don't build any of the seeded issues — those are the workshop.

---

## 17. Open decisions for you

1. **pnpm vs npm vs bun** — affects hook scripts and docs.
2. **Drizzle vs Prisma** — Drizzle recommended.
3. **CZ vs EN** — language for CLAUDE.md / issues / templates.
4. **Repo visibility** — public template or private with invites?
