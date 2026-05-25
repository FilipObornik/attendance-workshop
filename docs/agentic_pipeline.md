# The Agentic Pipeline

Five skills + one subagent. Each stage writes artifacts into `docs/tasks/<slug>/`
for the next stage to read.

```
GitHub issue
    │
    ▼  prd skill          → spawns prd-writer subagent  → docs/tasks/<slug>/prd.md
PRD
    │
    ▼  techspec skill     → docs/tasks/<slug>/techspec.md
Techspec
    │
    ▼  tasks skill        → docs/tasks/<slug>/_plan.md + TaskCreate entries
Task graph (with explicit blocking deps)
    │
    ▼  implement skill    → ready tasks dispatched concurrently as background
                            subagents; verify-feature auto-runs after each iteration
Working code + tests
    │
    ▼  verify-feature     → Build + SQL + curl + Playwright (final pass)
Verified diff
    │
    ▼  code review        → /code-review or equivalent
Reviewed diff
    │
    ▼  gh pr create
```

Only one subagent definition lives under `.claude/agents/`: `prd-writer`, because
PRD discovery is conversational. Every other stage is a skill that does the work
directly.

## When to skip stages

- **Trivial change** (typo, sort order): skip PRD, go straight to techspec or directly to code.
- **Spike / exploration**: skip all, work on a throwaway branch.

## When NOT to skip

- Anything cross-cutting.
- Anything touching the DB schema.
- Anything user-visible.
- Anything security-relevant (touches `/scan` or auth).

## Parallelism

The `tasks` skill biases hard toward parallelism. Each task carries explicit
`Depends on` (blocking deps) and `Parallel-safe with` (concurrent peers).

The `implement` skill walks the dependency graph:

- **Ready** = every blocker is `Done`. Dispatch immediately.
- **Blocked** = at least one blocker is still `Pending` or `In progress`.
- All ready tasks in the current iteration are dispatched **in one message** as
  parallel background subagents — no waiting between siblings.

Blocking only happens when there's a real reason: DB migrations before consumers,
shared component additions before importers, PII boundary on `/scan` (see
`.claude/rules/scan-public.md`), etc. DB migrations always run alone in their
iteration (concurrent migrations race on `_migrations`).

## Verification discipline

Every techspec ends with a "Verification plan" section. The `verify-feature` skill
runs four channels:

1. **Build** — `pnpm tsc --noEmit && pnpm lint` (full `pnpm build + vitest run`
   on the final pass)
2. **SQL** — via the Postgres MCP server (points at local docker DB)
3. **curl** — against the running dev server
4. **Playwright** — via the playwright MCP server

`implement` auto-invokes `verify-feature` after every dispatch iteration. Build
must stay green or the dispatch loop halts. SQL/curl/Playwright are allowed to be
DEFERRED mid-implementation if the techspec assertions reference code that hasn't
shipped yet.

The final `verify-feature` call (after the last task) runs all four channels
in full. All must be green before declaring the feature done.
