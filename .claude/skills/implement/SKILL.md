---
name: implement
description: Implement an approved plan from the `tasks` skill, dispatching every parallel-safe task concurrently as background subagents and respecting blocking dependencies. Triggers on "implement the plan", "implement tasks", "build it", "/implement", or after a plan is approved. Uses Claude Code's task system (TaskList/TaskUpdate) for live state and writes status back to docs/tasks/<slug>/_plan.md. Auto-invokes `verify-feature` after every iteration.
---

# Implement skill

Runs a plan to completion. Maximises parallelism: any task whose blocking deps
are satisfied is dispatched immediately as a background subagent. Sequential
work only happens at explicit blocking boundaries.

This is the only implementation skill. There is no `implement-next` — the user
either runs the whole plan or interrupts mid-way.

## Required reading (load every time)

- `.claude/CLAUDE.md` — conventions and verification discipline.
- `.claude/rules/admin-area.md`, `.claude/rules/scan-public.md`,
  `.claude/rules/database.md` — path-scoped rules auto-load when matching files
  are read; be aware they exist.
- `docs/tasks/<slug>/techspec.md` — the contract you're implementing against.
- `docs/tasks/<slug>/_plan.md` — task list with blocking deps. **This is the
  rehydration source of truth** if `TaskList` is empty.

## Process

### 1. Rehydrate state

- If `TaskList` shows tasks for this slug, that's the live state — use it.
- If `TaskList` is empty (fresh session), rebuild from `_plan.md`'s task table.
  For each row not marked `Done`, call `TaskCreate` with the task's title; the
  Files / Depends on / Parallel-safe fields stay in `_plan.md` (don't duplicate
  them into TaskCreate metadata — keep the two sources non-redundant).

### 2. Build the dispatch graph

From the live state + `_plan.md`:

- A task is **ready** when every blocker in its `Depends on` list is `Done`.
- A task is **blocked** when at least one blocker is still `Pending` /
  `In progress`.

### 3. Dispatch loop

Repeat until every task is `Done`:

1. Collect all ready tasks.
2. **If ≥ 2 ready tasks**: dispatch them concurrently — emit ONE message
   containing multiple `Agent` tool calls (subagent_type: `general-purpose`,
   `run_in_background: true`). Each call carries that task's constraints (see
   "Subagent dispatch contract" below). They all run in the same working tree
   — disjoint file sets, no worktrees.
3. **If exactly 1 ready task**: run it inline in this session.
4. Wait for background subagents to finish (the runtime notifies on
   completion — do NOT poll with sleep).
5. For each completed subagent: confirm its edits stayed within its `Files`
   list; mark its task `Done` via `TaskUpdate`; flip the row in `_plan.md`
   from `Pending` to `Done`.
6. **Invoke `verify-feature`** against `docs/tasks/<slug>/techspec.md`. React
   per the "Auto-verification" rules below.
7. Loop.

If the graph has a cycle or every remaining task is blocked, stop and report —
the plan has a bug, the user needs to fix it.

### 4. After the last task

- Summarize what shipped in 3–5 bullets.
- Invoke `verify-feature` one final time. Tell it this is the **final pass**
  (the skill bumps Build to include `pnpm build` + full `pnpm vitest run` and
  expects every applicable channel to be GREEN).
- If anything is RED or DEFERRED at the end, surface it. Feature isn't done.
- When everything is GREEN, recommend opening a PR. Do not push or open one.

## Auto-verification

After every dispatch iteration (step 6 above), call `verify-feature` against
the current task slug. Mandatory, not optional. React rules:

- **Build RED** → halt the dispatch loop. Code doesn't compile/lint. Surface
  the failure to the user. Don't keep spawning subagents on a broken base.
- **Build GREEN, others DEFERRED** → continue. Mid-implementation, SQL/curl/
  Playwright assertions often reference code that hasn't shipped yet. Expected.
- **Build GREEN, SQL/curl/Playwright GREEN** → continue. Partial-feature
  already verifiable — nice signal.
- **Build GREEN, but SQL/curl/Playwright RED** → halt. A completed task should
  be passing its piece of verification.

Per-iteration verify is **fast** (`tsc + lint` only — see `verify-feature`
SKILL for which channels are cheap). Don't try to skip it.

## Subagent dispatch contract

When dispatching a parallel task, the subagent's prompt MUST include:

- **Task title and acceptance criteria** (from `_plan.md`).
- **Files you may touch**: the task's `Files` list, verbatim. Editing any file
  not on this list is a parallelism violation — stop and report instead.
- **Do not touch shared infra**: don't run the dev server, don't run
  migrations, don't modify `.env`, don't touch `docker-compose.yml`, don't
  run git commands. The parent session owns those.
- **Path-scoped rules apply**: before editing any file under `app/(admin)/**`,
  `app/scan/**`, or `db/**`, re-read the matching `.claude/rules/*.md`.
- **Per-task verification**: run `pnpm tsc --noEmit` and `pnpm lint` on edited
  files before returning. Don't return red.
- **Return shape**: 3-bullet summary + the list of files actually changed.

All parallel tasks for an iteration go out in **one message** with multiple
`Agent` tool calls so they truly run concurrently. Never dispatch sequentially.

### Coordination caveat (same working tree)

Because subagents share the working tree (no worktrees), the disjoint-files
guarantee from `tasks` is load-bearing. If two parallel subagents land edits on
the same file, the second write silently clobbers the first. Mitigation:

- Trust `tasks` did its job — each parallel-safe peer set has disjoint `Files`.
- After each iteration, scan the changed files against the task list; surface
  any cross-task file overlap as a `tasks`-skill bug, before marking Done.
- The parent skill does NOT make git commits during the dispatch loop. Users
  commit when they want to.

## Blocking-dep examples

```
Task 1: add 'auto_closed' column                depends_on: -    parallel_safe: -
Task 2: implement /api/auto-close endpoint      depends_on: 1    parallel_safe: 3
Task 3: filter dashboard to exclude auto-closed depends_on: 1    parallel_safe: 2

Iteration 1 → ready: [1]                → run inline (migration alone anyway)
Iteration 2 → ready: [2, 3]             → dispatch 2 + 3 in parallel
Iteration 3 → ready: []                 → done
```

```
Task 1: rename helper in lib/foo.ts             depends_on: -
Task 2: rename usages in app/admin/page.tsx     depends_on: -
Task 3: rename usages in app/scan/page.tsx      depends_on: -

Iteration 1 → ready: [1, 2, 3]          → dispatch all three in parallel
```

## What this skill MUST NOT do

- Run tasks sequentially when they could run in parallel. Parallelism is the
  whole point.
- Touch files outside the current task's `Files` list (in any subagent or in
  this skill). Cross-task file edits indicate a plan bug.
- Skip the path-scoped rules. Even if a rule auto-loads, re-read it before
  editing.
- Mark a task `Done` if its acceptance criteria aren't met. Push back to the
  user instead.
- Skip the auto-`verify-feature` call after a dispatch iteration. Mandatory.
- Continue dispatching when `verify-feature` reports Build RED. Halt.
- Push, merge to main, open a PR, or make commits during the loop.

## Anti-patterns to refuse

- "Just run them all in one inline session because it's small" — defeats the
  workshop's parallelism demo. Always dispatch parallel subagents for ≥ 2
  ready tasks.
- Polling for background agent completion via sleep loops. Background agents
  notify on completion.
- Re-decomposing tasks mid-flight. If the plan is wrong, stop and ask the user
  to re-run `tasks`.
- Skipping per-iteration `verify-feature` to save time. Each call is cheap.
