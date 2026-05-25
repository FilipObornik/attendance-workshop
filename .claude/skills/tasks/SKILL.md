---
name: tasks
description: Decompose an approved techspec into the most parallel-executable task graph possible, using Claude Code's built-in task system (TaskCreate) and writing a snapshot to docs/tasks/<slug>/_plan.md. Each task has explicit blocking dependencies. Triggers on "break down the spec", "plan the work", "decompose into tasks", "/tasks", or right after a techspec is approved. STOPS at planning — the `implement` skill builds.
---

# Tasks skill

This skill turns an approved techspec into a runnable task graph **optimized for
parallel execution**. The `implement` skill consumes the graph and runs every
non-blocked task concurrently in isolated git worktrees.

## Required reading (load every time)

- `.claude/CLAUDE.md` — pipeline, conventions.
- `.claude/rules/admin-area.md`, `.claude/rules/scan-public.md`,
  `.claude/rules/database.md` — to enforce the repo-specific blocking rules below.
- `docs/tasks/<slug>/techspec.md` — source of truth. §3 (Affected files) and §10
  (Task breakdown hints) drive decomposition.

## What this skill produces

Two artifacts (single source of truth, two views):

1. **Live task graph** — via `TaskCreate`, one entry per task. The `implement`
   skill drives off this.
2. **Snapshot** at `docs/tasks/<slug>/_plan.md` — flat markdown rendering for
   cross-session continuity and PR review.

Do NOT create per-task markdown files. The built-in task system holds tasks;
`_plan.md` is just a snapshot.

## Decomposition principles

### Bias hard toward parallelism

When choosing between "two tasks that share a file (sequential)" and "two tasks
on disjoint files (parallel)", prefer the parallel split. Concretely:

- **Disjoint file sets** — if two changes can be expressed as edits to disjoint
  files, make them separate tasks. The `implement` skill will run them
  concurrently in worktrees.
- **Per-file granularity is often right** — "rename usages in `app/admin/page.tsx`"
  and "rename usages in `app/scan/page.tsx`" are two parallel tasks, not one
  serial "rename all usages" task.
- **Don't artificially block on shared infra** — the dev server, migrations, and
  `.env` are off-limits in worktree subagents anyway, so they don't create
  hidden coupling between tasks.

### When to block (the must-be-sequential cases)

Mark a task as blocked by another (`Depends on: N`) only when there's a **real**
dependency:

- **DB migrations block consumers.** Any task that reads/writes a new column
  must `Depends on:` the migration task. Two migration tasks must serialize on
  each other (`Depends on:` whichever was authored first) — two concurrent
  migrations race on `_migrations`.
- **Schema → seed.** Seed updates that reference new columns block on the
  migration.
- **Library version bumps** that change call sites block on the bump task.
- **Shared component additions** (e.g. `npx shadcn add dialog`) block on the
  add task — anything importing the new primitive depends on it existing.
- **PII boundary on `/scan`** — when a task adds/changes a `users` field and
  another touches `/scan` or `/api/scan`, the scan-side task must `Depends on:`
  the user-side task. See `.claude/rules/scan-public.md` "Boundary with other
  surfaces" for the why.

### When NOT to block

- Test and implementation **stay in the same task**, never split across two
  tasks blocked on each other.
- Don't add cosmetic dependencies ("task 2 should come after task 1 because
  it's smaller"). Order only encodes correctness, not preference.
- UI changes touching different routes are parallel by default — they share
  no files.

### Task sizing

- Each task: **30–90 min** of implementer work. Smaller → fold into a sibling
  on the same file. Larger → split.
- Each task touches a **disjoint** file set from its `Parallel-safe with` peers.
  Verify pairwise.

## Process

### 1. Pre-flight

- Identify the slug. If unclear, list `docs/tasks/` and ask.
- Confirm `docs/tasks/<slug>/techspec.md` exists with `Status: Approved`. If
  it's Draft, warn and ask before proceeding.

### 2. Decide if decomposition is needed

Skip decomposition if the techspec is trivially small. Heuristic:

- Total effort "S" (~< 90 min) AND ≤ 2 files AND no schema change → **skip**.
  `TaskCreate` a single task pointing at the techspec. Write a one-line
  `_plan.md` saying "single task, no decomposition".

Otherwise, decompose with maximum parallelism (see principles above).

### 3. Build the task graph

For each task, capture:

- **Title**: `<verb> <object> — <one-line scope>`
- **Files** (exhaustive — drives the parallel-safety check)
- **Depends on** (list of task IDs that must finish first, or `none`)
- **Parallel-safe with** (peer task IDs that can run concurrently, or `runs alone`)
- **Acceptance** (1–3 bullets derived from the techspec)
- **Effort** (S / M / L)
- **Notes** (anything not in the techspec the implementer needs)

Validate the graph before writing:

- No cycles in `Depends on`.
- Every pair of `Parallel-safe with` peers has disjoint `Files`.
- DB migration tasks have no parallel peers.

### 4. Push to Claude Code's task system

Call `TaskCreate` for each task. Encode the per-task body so the `implement`
skill (and worktree subagents) can parse it:

```
Files:
- <path>
- <path>

Depends on: 1, 3
Parallel-safe with: 2, 4

Acceptance:
- [ ] <criterion>
- [ ] <criterion>

Notes: <anything>
```

Mark all `Pending`. Don't mark anything `In progress` — `implement` owns that.

### 5. Write `_plan.md`

A flat snapshot for cross-session continuity:

```markdown
# Plan: <feature title>

**Techspec:** ./techspec.md
**Last updated:** YYYY-MM-DD

## Summary
<1–2 sentences>

## Task graph

| # | Title | Files | Effort | Depends on | Parallel with | Status |
|---|-------|-------|--------|------------|---------------|--------|
| 1 | …     | …     | S      | none       | 2, 3          | Pending |
| 2 | …     | …     | M      | none       | 1, 3          | Pending |
| 3 | …     | …     | S      | none       | 1, 2          | Pending |
| 4 | …     | …     | M      | 1, 2, 3    | none          | Pending |

## Execution shape (derived)
- **Step 1** (parallel): tasks 1, 2, 3 → 3 worktree subagents concurrently
- **Step 2** (inline): task 4 (depends on all of step 1)

## Verification gate
After the last task, run the `verify-feature` skill against
`./techspec.md` §9 (SQL + curl + Playwright). Don't ship without all three.
```

The "Execution shape" section is a derived view — compute it by topologically
sorting the graph and grouping by depth. Show it so humans can sanity-check
the parallelism.

### 6. Hand off

Summarize in chat:

- "Decomposed into N tasks. Max parallelism: K tasks can run concurrently in
  step 1."
- Call out any blocking deps and the reason ("task 4 blocks on task 1 because
  the migration adds the column it reads").
- Ask: "Refine the plan, or hand off to `/implement`?"

Do not auto-invoke `implement`.

## What this skill MUST NOT do

- Create per-task markdown files. Use `TaskCreate` + `_plan.md` only.
- Default to sequential when parallel is possible. Bias hard toward parallelism.
- Add a blocking dep without a real reason. Cosmetic ordering is not a reason.
- Decompose a Draft techspec without warning.
- Spawn a subagent. All logic lives in this skill.
- Execute any task.

## Anti-patterns to refuse

- One mega-task "implement the feature". That's just the techspec with a
  checkbox.
- Splitting implementation from its test into two blocked tasks.
- A "Wave 1: do everything" with no parallel split when files are disjoint.
- Blocking dep with no reason given. Every `Depends on` needs a one-line "why".
- Tasks >90 min — split. Tasks <15 min — fold.
