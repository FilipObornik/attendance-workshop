---
name: verify-feature
description: Verify a feature against its techspec across four channels — Build, SQL, curl, Playwright. Runs in two modes: fast per-iteration (auto-invoked by `implement`) and final pass (after the last task or on demand). Triggers on "verify", "check the feature", "run verification", "/verify-feature", or as the auto callback from `implement`. Refuses to declare success if any required channel is red.
---

# Verify-feature skill

Runs the verification plan from `docs/tasks/<slug>/techspec.md` §9. The gate
between "code is written" and "feature is done".

Runs in two **modes**, distinguished by the caller:

- **Per-iteration mode** (default; called by `implement` after each dispatch
  iteration) — cheap, fast. Only the lightweight half of Build runs.
- **Final-pass mode** (called by `implement` after the last task, or by the
  user on demand before opening a PR) — full Build + every applicable SQL /
  curl / Playwright assertion.

If the caller doesn't specify, assume **final-pass** when invoked by a human
("verify the feature", "/verify-feature") and **per-iteration** when invoked
mid-implementation by the `implement` skill.

## Channels (run in this order — fail fast on Build)

### 1. Build — always required

**Per-iteration mode** (fast — runs after every implement dispatch):
```bash
pnpm tsc --noEmit
pnpm lint
```

**Final-pass mode** (slow — runs once at the end):
```bash
pnpm tsc --noEmit
pnpm lint
pnpm vitest run
pnpm build
```

Why split: `pnpm build` (20–60s) and full `pnpm vitest run` would dominate
mid-implementation iterations and frequently RED-out for legitimate reasons
(task 2 hasn't shipped the file task 1 imports yet). Save them for the final
pass when the feature is complete.

If ANY Build command fails, the verification is RED. Don't proceed to the
other channels — the underlying code is broken; SQL/curl/Playwright would be
noise.

### 2. SQL — when the techspec calls for it

Execute every SQL block in techspec §9 via the `postgres` MCP server (points
at local docker DB by default), or directly:

```bash
docker exec attendance-workshop-db-1 psql -U postgres -d postgres -c "<query>"
```

Compare actual rows against the expected rows in the techspec. Report exact
diff if they don't match.

### 3. curl — when the techspec calls for it

Execute every curl block in techspec §9 against `http://localhost:3000` (or
wherever `pnpm dev` is currently listening — check `lsof -iTCP:3000-3010` first;
Next auto-drifts if 3000 is taken).

If no dev server is running:
- Mark SKIPPED — "dev server not running"
- Surface to the caller; don't claim success on an un-run channel

For `/scan` endpoints, additionally assert the response carries NO PII:
no `@` in any string field, no seeded user's name, no email. Per
`.claude/rules/scan-public.md`.

### 4. Playwright — when the techspec calls for it

Execute the Playwright assertion(s) from techspec §9 via the `playwright` MCP
server. Same dev-server precondition as curl.

For UI changes touching `/scan`, additionally assert the rendered page contains
no PII.

## Process

### 1. Pre-flight
- Identify the slug. If unclear, list `docs/tasks/` with a non-empty `_plan.md`
  and ask.
- Read `docs/tasks/<slug>/techspec.md` §9 (Verification plan).
- Identify which of channels 2–4 the techspec actually specifies. Channel 1
  always runs.
- Determine mode (per-iteration vs final-pass).

### 2. Channel 1: Build
Run the Build commands for the current mode. Capture stderr. If any command
exits non-zero:
- Mark verification RED on Build.
- Surface the first failing command + its tail-20 of output.
- Stop. Don't run other channels.

### 3. Channels 2–4
For each applicable channel, run its block(s) from §9 exactly as written.
Capture results. Channels 2–4 are independent — one failing doesn't
short-circuit the others, so you get the full picture.

In per-iteration mode, if a channel references code that hasn't shipped yet
(e.g. an endpoint not built until task 3, but you're verifying after task 1),
mark it DEFERRED rather than RED.

### 4. Report

Single compact summary per channel:

```
[GREEN] Build       — tsc clean, lint clean
[GREEN] SQL         — query returned expected 3 rows ordered DESC
[RED]   curl        — /api/scan returned 500 instead of 200; see error below
[SKIP]  Playwright  — dev server not running
```

If any required channel is RED, the feature is not done. Surface the specific
failure and stop.

If everything is GREEN, return success. The caller decides what's next.

## What this skill MUST NOT do

- Declare success if any required channel is RED. Even one failure = feature
  not done.
- Skip Build to save time. Build is the fastest channel and the most likely
  to catch regressions; never skip.
- Run channels 2–4 if Build is RED. Garbage in, garbage out.
- Fabricate channel results because a channel is hard to run. If Playwright
  can't run, say SKIPPED; don't make up a green check.
- Modify code to make a channel pass. Verification only — fixes go through
  `implement`.
- Run `pnpm build` or full vitest in per-iteration mode. Too slow; save for
  final pass.
