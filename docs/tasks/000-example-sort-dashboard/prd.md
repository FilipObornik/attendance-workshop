# PRD: Sort dashboard "Currently in" by entry time (newest first)

**Issue:** #1
**Status:** Approved
**Author:** @workshop (via Claude)
**Last updated:** 2026-05-25

## 1. Overview & objective
Order the admin dashboard's "Currently in office" list by the time each person
checked in, most recent first. After this ships, admins can glance at the card and
immediately see who's just arrived versus who's been here a while.

## 2. Problem
Today the card returns users in whatever order Postgres feels like — effectively
random across reloads. When an admin opens `/admin/dashboard` in the morning to see
"who's in", they can't separate the early birds from the people who walked in two
minutes ago. Several admins have asked for "newest at the top" out of band.

## 3. Users
- **Admin** (primary) — wants a recency-ordered view to track arrivals as the day starts.

## 4. User stories / scenarios
1. Admin opens `/admin/dashboard` after sign-in.
2. The "Currently in" card lists everyone currently in the office.
3. The person at the top is the one who scanned `entry` most recently; the person at
   the bottom checked in earliest.
4. The order stays stable on reload — same data, same order.
5. If nobody is in, the card shows the existing empty state (unchanged).

## 5. Core requirements
- Sort "Currently in" by each user's latest `entry` timestamp, descending.
- Order is deterministic — refreshing the page does not reshuffle.
- No change to which users appear, only their order.
- No change to the "today's logs" panel (separate section).

## 6. Acceptance criteria
- [ ] The "Currently in" card shows users sorted by most recent entry, newest first.
- [ ] Two consecutive reloads with no scans in between show the same order.
- [ ] Existing unit and e2e tests still pass.
- [ ] No new dependencies and no DB schema change.

## 7. UX principles
- Visual design unchanged — same card, same row layout.
- No new affordances (toggle, sort menu, etc.) — sorting is the default behavior.

## 8. Success metrics
- Admin "recency" complaints in feedback channels drop to zero.

## 9. Non-goals / out of scope
- Relative-time labels ("5 min ago"). Wall-clock timestamps are fine.
- Sorting any other section (today's logs is already sorted; user list is unchanged).
- Pagination — workshop dataset is small.
- A user-configurable sort order.

## 10. Risks & open questions
- (none — this is the warm-up issue and is small enough to spec directly)

## 11. Future expansion
- Could later add a "time in office" duration next to each name.
