# Techspec: Sort dashboard "Currently in" by entry time (newest first)

**PRD:** ./prd.md
**Status:** Approved
**Last updated:** 2026-05-25

## 1. Summary
Add a deterministic ordering to the admin dashboard's "Currently in" card so the
most recent entry is at the top. UI-only change with a parallel ordering on the
matching JSON endpoint. No schema impact.

## 2. Architecture context
- **Surfaces touched**: [x] admin   [ ] /scan public   [ ] db   [ ] lib   [x] tests
- **Auth posture**: `requireAdmin()` already enforced in `app/(admin)/layout.tsx`.
- **Server vs client**: dashboard page stays a Server Component; no new `"use client"`.
- **Mutation pattern**: N/A (read-only feature).
- **DB access**: through `db/client.ts` only.
- **Applicable rules**:
  - `.claude/rules/admin-area.md` — "Use Server Components by default; `\"use client\"`
    only for interactive widgets." → dashboard remains server-rendered.
  - `.claude/rules/database.md` — no schema change, so append-only migration rule
    is N/A; no destructive ops.
- **Deliberate divergences**: none.

## 3. Affected files
| Path | New / Modified | Why |
|------|----------------|-----|
| `app/(admin)/admin/dashboard/page.tsx` | M | Order the "currently in" query by latest entry timestamp DESC. |
| `app/api/attendance/currently-in/route.ts` | M | Same ordering on the JSON endpoint for parity. |
| `tests/e2e/admin.spec.ts` | M | Extend dashboard test to assert the order in the rendered list. |

## 4. Data model & migration
None. Existing `attendance_logs (user_id, type, timestamp)` already carries the data
we need.

## 5. API contract
### `GET /api/attendance/currently-in`
- **Auth**: admin (`requireAdmin()`, unchanged).
- **Request**: none.
- **Response** (unchanged shape, new ordering guarantee):
  ```
  { currentlyIn: [{ id: string, name: string, since: string /* ISO timestamp */ }] }
  ```
- **Ordering guarantee** (new): `currentlyIn` MUST be sorted by `since` descending.
- **Errors**: unchanged.
- **PII rule**: N/A (admin endpoint).

## 6. UI plan
- **Route**: `/admin/dashboard` — Server Component, no change.
- **Components reused**: `<CurrentlyInCard>` from `components/attendance/`.
- **New components needed**: none.
- **State & data flow**: page fetches via Drizzle directly; passes ordered array
  to `<CurrentlyInCard>` which renders in array order.
- **Loading / empty / error states**: unchanged. Empty state already handled by
  `<CurrentlyInCard>`.

## 7. Dependencies
None.

## 8. Test plan
- **Unit**: none — query-order change has no pure logic to isolate.
- **E2E**: extend `tests/e2e/admin.spec.ts` to seed two entries with known timestamps
  and assert the newer-entry user appears first in the rendered list.

## 9. Verification plan
- **SQL** (via local Postgres):
  ```bash
  docker exec attendance-workshop-db-1 psql -U postgres -d postgres -c "
    with latest as (
      select user_id,
             (array_agg(type order by timestamp desc))[1] as last_type,
             max(timestamp) as last_time
      from attendance_logs group by user_id
    )
    select u.name, l.last_time
    from latest l join users u on u.id = l.user_id
    where l.last_type = 'entry' and u.deleted_at is null
    order by l.last_time desc;
  "
  ```
  Expect: rows already ordered DESC by `last_time`.

- **curl** (admin storage state required; see `tests/e2e/global-setup.ts`):
  ```bash
  curl -s --cookie "$(cat tests/e2e/.auth/admin-cookie.txt)" \
    http://localhost:3000/api/attendance/currently-in | jq
  ```
  Expect: `currentlyIn[0].since >= currentlyIn[1].since` (non-increasing).

- **Playwright**: open `/admin/dashboard` as the seeded admin, read the
  "Currently in" list rows, assert timestamps are non-increasing top-to-bottom.

## 10. Task breakdown hints
Single wave. Two parallel-safe edits (page + endpoint) followed by the e2e
assertion. Could be one PR by one attendee in ~15 min.

## 11. Risks & rollback
- **Risk**: a future query change re-introduces non-determinism if `ORDER BY` is
  dropped. Mitigation: e2e assertion catches regressions.
- **Rollback**: revert the PR. No data shape changed.
