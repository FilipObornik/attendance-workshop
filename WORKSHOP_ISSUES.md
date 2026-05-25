# Seeded GitHub Issues

Import these into the workshop repo. Order matters — labelled by suggested workshop flow.

**Suggested labels:**
- `size:S` / `size:M` / `size:L` / `size:XL`
- `workshop:warmup` / `workshop:live-demo` / `workshop:parallel` / `workshop:bait` / `workshop:attendee`
- `area:admin` / `area:scan` / `area:api` / `area:db`

**Import command (when ready):**
```bash
# Each issue below is delimited by `---`. Use `gh issue create` with the title and body.
```

---

## Issue #1 — Sort dashboard "Currently in" by entry time (newest first)

**Labels:** `size:S`, `workshop:warmup`, `area:admin`

### Context
The admin dashboard at `/admin/dashboard` shows a "Currently in office" card listing all users whose last log was an entry. Today the list comes back in whatever order Postgres feels like returning it. Workshop attendees have asked to scan trends by recency.

### What we want
Order the "Currently in" list by entry time, most recent first.

### Acceptance criteria
- The card shows users sorted by their most recent entry timestamp, descending.
- Order is stable across page reloads.
- No new dependencies.

### Notes
This is a warm-up issue. We'll use it to walk through the full pipeline (`/prd` → `/spec` → `/tasks` → implement → `/verify`) on something boring so attendees learn the tooling without learning a feature at the same time.

---

## Issue #2 — Add camera-based barcode scanning to `/scan`

**Labels:** `size:M`, `workshop:live-demo`, `area:scan`

### Context
Right now `/scan` has a text input where a visitor pastes their barcode token and picks "entry" or "exit". That works but defeats the point of the barcodes printed on user cards.

The API endpoint `POST /api/scan` already accepts `{ token, type }` and is the contract we're keeping — this issue is purely the **frontend scanner**.

### What we want
Replace the manual text input with a camera-based barcode scanner. When the camera reads a valid Code128 barcode, the page should call `POST /api/scan` with the decoded token and the currently-selected entry/exit toggle.

### Suggested library
`@zxing/browser` — works in the browser, no native deps. Confirm current API via Context7 before coding (it changes between versions).

### Acceptance criteria
- Opening `/scan` requests camera permission and shows a live video preview.
- Pointing the camera at a valid Code128 barcode triggers a single POST to `/api/scan`.
- Successful scan shows "Welcome back" or "Goodbye" + timestamp. No PII (name, email).
- Failed scan (unknown token) shows generic "Invalid code". Never reveals whether the user exists.
- The entry/exit toggle defaults to "entry" and persists across scans until changed.
- If camera permission is denied, the page falls back to the manual text input.
- No regressions in the existing Playwright `scan.spec.ts` happy path.

### Out of scope
- Multi-camera selection (use default).
- Mobile-specific UI polish.
- Scan history on this page.

### Open questions (don't answer in advance — the agent should ask)
- Should scanning auto-submit, or require a confirmation tap after the scan?
- How should we debounce — same-token scans within N seconds collapse to one?

### Verification plan hint
- **SQL:** `select count(*) from attendance_logs where created_at > now() - interval '1 minute'` before/after a scan
- **curl:** the API hasn't changed — `curl -X POST /api/scan -d '{"token":"...","type":"entry"}'` should still work identically
- **Playwright:** harder for camera — use the manual-fallback path for e2e; mock the scanner module for component tests

---

## Issue #3 — Prevent double entries (entry must follow exit, and vice versa)

**Labels:** `size:M`, `workshop:live-demo`, `area:api`, `area:scan`

### Context
Right now `/api/scan` accepts any `{ token, type }` and writes a log. Nothing stops a user from scanning "entry" twice in a row, which corrupts our "currently in" dashboard and any future hours-worked calculation.

### What we want
A user's logs must alternate entry → exit → entry → exit. Reject scans that violate this.

### Acceptance criteria
- `POST /api/scan` with `type=entry` returns **409 Conflict** if the user's last log is also an entry (and not auto-closed).
- Same for `type=exit` when last log is an exit OR the user has no logs at all.
- The error response body is `{ "error": "invalid_state", "message": "<friendly text>" }`.
- The scanner page surfaces this as a toast — no PII, just "Already checked in" / "Not checked in yet".
- The "Currently in" dashboard count remains correct after attempted bad scans (no row written on 409).

### Where the rule should live
This is a teaching moment — discuss in the spec whether validation lives in the API handler, a DB constraint, both, or a service-layer function. Recommend at least the API check; DB constraint is bonus.

### Verification plan hint
- **SQL:** insert two entries for one user manually → confirm the second is rejected when going through the API
- **curl:** two consecutive `entry` posts — second must be 409
- **Playwright:** scan, scan again — expect the error toast

---

## Issue #4 — Weekly hours summary per user

**Labels:** `size:M`, `workshop:parallel`, `area:admin`, `area:api`

### Context
Admins want to see, per user, how many hours they spent in the office this week. We have entry/exit pairs — we just need to sum the deltas.

### What we want
- New endpoint: `GET /api/users/:id/summary?week=YYYY-WW` (ISO week format)
- New section on `/admin/users/[id]/page.tsx` showing the current week's total hours and a per-day breakdown.

### Acceptance criteria
- Endpoint returns `{ totalMinutes: number, perDay: { [yyyy-mm-dd]: number } }`.
- Pairs entry → next exit. If an entry has no matching exit, that day's contribution is 0 (do NOT count "still inside" as worked hours — out of scope here, see Issue #6).
- If `week` is omitted, defaults to current ISO week in the server's timezone.
- The UI shows total as `Xh Ym`, and a small bar chart (use shadcn's existing chart primitives or a simple CSS grid — no new chart libs).

### Notes for parallelization
This issue and **Issue #3** touch disjoint files (API: different route; UI: different page; DB: no changes). They're explicitly designed to be a parallel-worktree demo. The `tasks` skill should put them on disjoint files so they run in parallel when run together.

### Verification plan hint
- **SQL:** aggregate entry/exit pairs in raw SQL, compare to endpoint output
- **curl:** `curl /api/users/<id>/summary?week=2026-W21`
- **Playwright:** visit user detail page, assert the total renders

---

## Issue #5 — Email validation on user creation

**Labels:** `size:S`, `workshop:attendee`, `area:admin`, `area:api`

### Context
The admin create-user form (`/admin`) accepts any string as an email. We've already seen "test", "foo@", and a phone number get saved.

### What we want
Server-side email validation on `POST /api/users`. Reject malformed addresses with 400.

### Acceptance criteria
- Invalid emails → 400 with `{ "error": "invalid_email" }`.
- Valid RFC 5322-ish formats accepted (don't go to spec-level pedantry — `zod.string().email()` is fine).
- Duplicate emails → 409 (this rule may not yet exist; if not, add it).
- The form shows the validation message inline.
- Existing rows in the DB are not migrated/cleaned — out of scope.

### Why this is for attendees
Small enough to do solo in 15 min during the workshop's hands-on segment after the live demos.

---

## Issue #6 — Soft-delete users (keep historical logs intact)

**Labels:** `size:M`, `workshop:attendee`, `area:admin`, `area:db`

### Context
Today there's no way to remove a user. We need one, but their historical attendance logs must remain queryable for compliance.

### What we want
Soft delete: set `users.deleted_at = now()`, hide from admin lists, but keep all FK relationships intact.

### Acceptance criteria
- New admin action "Delete user" on `/admin/users/[id]` (with confirm dialog).
- After delete: user is hidden from `/admin` list and "Currently in" dashboard.
- Their `attendance_logs` rows are untouched.
- Their `barcode_token` no longer authorizes scans — `POST /api/scan` returns 404.
- Reactivation is out of scope (no UI), but the DB shape should allow it (just nullify `deleted_at`).
- Any analytics endpoint (e.g. weekly summary from Issue #4) should still return historical data for deleted users when queried by ID.

### Verification plan hint
- **SQL:** confirm `deleted_at` set, logs still present
- **curl:** scan with deleted user's token → 404
- **Playwright:** delete user, refresh list, confirm gone

---

## Issue #7 — Auto-close dangling entries at midnight

**Labels:** `size:L`, `workshop:attendee`, `area:db`, `area:api`

### Context
If a user scans entry but never exit (forgets, leaves through a side door, goes home sick), their record stays "currently in" forever. This pollutes the dashboard and breaks hours calculations.

### What we want
A scheduled job runs daily at 00:00 (local server time) and closes any open entries from the previous day by inserting an exit log at 23:59:59 of that day, marked `auto_closed = true`.

### Acceptance criteria
- New migration: `attendance_logs.auto_closed boolean default false`.
- New scheduled function (Supabase cron or Next.js cron route, your call in the spec).
- The auto-inserted exit log has `auto_closed = true` and a timestamp of 23:59:59 of the entry day.
- The dashboard's "Currently in" card excludes users whose only open entry was auto-closed.
- The weekly summary (Issue #4) treats auto-closed exits as 0-duration for that pair (do NOT inflate hours).
- Idempotent: running the job twice on the same day does not produce duplicate exits.

### Verification plan hint
- **SQL:** insert an old open entry → invoke the job → confirm an exit row appeared with `auto_closed = true`
- **curl:** trigger the job endpoint directly (if implemented as an endpoint)
- **Playwright:** seed data, manually trigger, assert dashboard updates

---

## Issue #8 — Make it multi-tenant

**Labels:** `size:XL`, `workshop:bait`, `area:db`, `area:admin`, `area:scan`, `area:api`

### Context
We want to be able to support multiple offices / organizations.

### What we want
Multi-tenancy.

### Acceptance criteria
- It should work for multiple tenants.
- Data should be isolated.
- Admins should only see their own data.

---

> **Workshop note (do not include when importing):** This issue is **deliberately under-specified**. The point is to run `/prd` on it and watch the `prd-writer` subagent surface the dozen ambiguities (auth model? row-level security? per-tenant barcodes? subdomain routing? billing?). Then enter plan mode and show how planning catches the under-specification *before* any code is written. This is the most important pedagogical moment in the workshop — do not flesh this issue out before importing.

---

# Suggested workshop sequencing

| Slot           | Issue | Mode                       | Purpose                                                |
|----------------|-------|----------------------------|--------------------------------------------------------|
| Demo 1 (warm)  | #1    | Solo, full pipeline        | Teach the tooling on something boring                  |
| Demo 2 (wow)   | #2    | Solo, full pipeline        | Showcase clarifying questions + Context7 MCP           |
| Demo 3 (scale) | #3 + #4 | **Parallel worktrees**   | The "agentic orchestration" leap                       |
| Demo 4 (trap)  | #8    | `/prd` only, plan mode     | Show planning catching under-spec — STOP before code   |
| Hands-on       | #5, #6, #7 | Attendees, any mode    | Let them try with their own variations                 |

---

# Import script (rough)

```bash
# Once issues are split into one file per issue (or parsed from this one),
# loop and create:
gh issue create \
  --title "Sort dashboard \"Currently in\" by entry time (newest first)" \
  --label "size:S,workshop:warmup,area:admin" \
  --body-file issues/01-sort-dashboard.md

# Repeat for each issue. Consider a tiny shell script to parse this file's
# H2 sections into title + body if you want one-shot import.
```
