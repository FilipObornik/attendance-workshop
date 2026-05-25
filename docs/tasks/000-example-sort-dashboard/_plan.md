# Plan: Sort dashboard "Currently in" by entry time (newest first)

**Techspec:** ./techspec.md
**Last updated:** 2026-05-25

## Summary
UI-only ordering change touching three disjoint files. Small enough that the
`tasks` skill would normally collapse it to a single task (per its
"skip decomposition if total effort is S AND ≤ 2 files AND no schema change"
heuristic). Three files puts it at the boundary — kept as three parallel
tasks here to demonstrate the format.

## Task graph

| # | Title                                     | Files                                            | Effort | Depends on | Parallel-safe with | Status |
|---|-------------------------------------------|--------------------------------------------------|--------|------------|--------------------|--------|
| 1 | Order "Currently in" query by entry DESC  | `app/(admin)/admin/dashboard/page.tsx`           | S      | none       | 2, 3               | Pending |
| 2 | Order JSON endpoint by entry DESC         | `app/api/attendance/currently-in/route.ts`       | S      | none       | 1, 3               | Pending |
| 3 | Add e2e assertion for dashboard ordering  | `tests/e2e/admin.spec.ts`                        | S      | none       | 1, 2               | Pending |

## Blocking-dep rationale
None — all three tasks edit disjoint files and have no logical dependency on
each other. The e2e assertion can be written ahead of the implementation
(it'll just fail until tasks 1 + 2 land); since all three ship together in
one iteration, ordering doesn't matter.

## Execution shape (derived)
- **Iteration 1** (parallel): dispatch tasks 1, 2, 3 as background subagents
  in a single message. They all run concurrently in the main working tree —
  disjoint files, no conflicts.
- After all three return: auto-`verify-feature` per the `implement` skill.

## Verification gate
After the iteration, run `verify-feature` in **final-pass mode** against
`./techspec.md` §9 (Build + SQL + curl + Playwright). Don't ship without
all applicable channels green.
