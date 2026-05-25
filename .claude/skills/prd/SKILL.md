---
name: prd
description: Turn a GitHub issue or rough idea into a product-quality PRD via a short conversational discovery. Triggers on "write a PRD", "draft requirements", "let's spec this issue", "/prd", or when the user wants to begin a new feature from an issue. Writes to docs/tasks/<slug>/prd.md. STOPS at WHAT/WHY — the techspec stage owns HOW.
---

# PRD skill

This skill creates a **product** doc — what we're building and why. Technical design
(stack, data shapes, file paths, API contracts) belongs to the **techspec** skill,
not here.

## What this skill does

1. Looks up the issue (or accepts a freeform idea).
2. Reflects the problem back to the user in their own words for confirmation.
3. Runs a short conversational discovery — 3–6 questions, one at a time, focused on
   the parts the issue leaves ambiguous.
4. Writes `docs/tasks/<slug>/prd.md` using `.claude/templates/prd.md`.
5. Summarizes the result and asks the user whether to refine or move on to techspec.

## How to invoke

Hand the work to the `prd-writer` subagent. The subagent owns the full discovery
conversation and the file write. From this skill, your job is just:

1. Identify the issue number (or freeform idea) from the user's prompt. If it's
   unclear, ask once: "Which issue (or idea) should I PRD?"
2. Spawn the subagent with that context.
3. When it returns, the subagent's summary is already in the conversation — don't
   restate it. Just ask the user whether to (a) refine the PRD, (b) move on to the
   `techspec` skill, or (c) stop.

## What this skill MUST NOT do

- Write code, file paths, function names, SQL, or API contracts.
- Generate the techspec, task list, or implementation. Those are separate stages —
  the user (or downstream skill) triggers them deliberately.
- Skip the discovery conversation. Even a "trivial" issue deserves the reflect-back
  pass — that's where misreads get caught.
- Create placeholder files. If only `prd.md` is needed, only `prd.md` is created.

## Worked example

See `docs/tasks/000-example-sort-dashboard/prd.md` for the shape and voice of a
well-written PRD on a small feature.
