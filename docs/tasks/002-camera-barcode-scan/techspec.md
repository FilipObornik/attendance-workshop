# Techspec: Camera-based barcode scanning on `/scan`

**PRD:** ./prd.md
**Status:** Draft
**Last updated:** 2026-05-25

## 1. Summary
Replace the manual token text input on `/scan` with a live camera-based Code128 scanner using `@zxing/browser`. On a successful decode the page auto-submits to the existing `POST /api/scan` with the current entry/exit toggle. If camera permission is denied (or `getUserMedia` is unavailable), the page transparently falls back to the existing manual input. UI-only change — no API contract change, no schema change.

## 2. Architecture context
- **Surfaces touched**: [ ] admin   [x] /scan public   [ ] db   [x] lib (pure)   [x] tests
- **Auth posture**: Unauthenticated. The barcode token IS the credential — unchanged.
- **Server vs client**: `app/scan/page.tsx` is already `"use client"`. The scanner is a new client child component. No new server surface.
- **Mutation pattern**: Unchanged — single `POST /api/scan` from the client. No server action.
- **DB access**: N/A — the API route (`app/api/scan/route.ts`) is the only DB toucher and is unchanged.
- **Applicable rules**:
  - `.claude/rules/scan-public.md` — "DO NOT: Render user names, emails, or any PII on `/scan` or in `/api/scan` responses." → success UI shows only `Welcome back` / `Goodbye` + timestamp. No new fields are read from the API response.
  - `.claude/rules/scan-public.md` — "Return generic errors (\"Invalid code\") — never leak whether a user exists. In particular, unknown-token and malformed-payload must produce the same status + body." → client maps every non-2xx and every thrown decode/network error to the same `"Invalid code"` UI string.
  - `.claude/rules/scan-public.md` — "Do not log full tokens to console/telemetry." → the decoded token is sent to `/api/scan` and dropped from client state. No `console.log(token)` paths.
  - `.claude/rules/scan-public.md` boundary clause — N/A this iteration (no new `users` field), but flagged for `tasks` ordering if combined with a schema change later.
- **Deliberate divergences**: none.

## 3. Affected files
| Path | New / Modified | Why |
|------|----------------|-----|
| `package.json` | M | Add `@zxing/browser` dependency (and its peer `@zxing/library` if not transitively installed). |
| `lib/scan-debounce.ts` | N | Pure helper: given `(token, now, lastAcceptedAt)` decide accept/skip with a 5s window. Vitest-friendly. |
| `components/scan/barcode-scanner.tsx` | N | Client component owning the `<video>` element, `@zxing/browser` reader lifecycle, and the `onDecode(token)` callback. Surfaces a `permissionState: "pending" \| "granted" \| "denied" \| "unsupported"` for the parent to switch UI. |
| `app/scan/page.tsx` | M | Replace the token text input with `<BarcodeScanner>` when permission is granted; render existing manual input as fallback when denied/unsupported. Keep entry/exit toggle and result panel. Wire auto-submit through the existing `fetch("/api/scan", ...)` path. |
| `tests/unit/scan-debounce.test.ts` | N | Cover the 5s same-token debounce: accept first, reject same token within 5s, accept different token, accept same token after 5s. |
| `tests/e2e/scan.spec.ts` | M | Force-deny camera permission in the test context so the existing happy-path + PII assertions run against the manual-fallback UI. No new camera-driven assertions. |

Order: dependency → pure helper → component → page wiring → tests.

## 4. Data model & migration
None. No schema change.

## 5. API contract
**No endpoint changes.** The existing `POST /api/scan` is used verbatim. Restated here for the implementer's convenience — do not modify:

### `POST /api/scan`
- **Auth**: public.
- **Request** (zod, unchanged in `app/api/scan/route.ts`):
  ```
  { token: string (min 1), type: "entry" | "exit" }
  ```
- **Response 200**:
  ```
  { type: "entry" | "exit", at: string /* ISO timestamp */ }
  ```
- **Errors**: `400 { error: "invalid_code" }` for malformed payload AND unknown token (identical — required by `scan-public.md`).
- **PII rule**: response carries no PII; client must not introduce any.

## 6. UI plan
- **Route**: `/scan` — `"use client"`, unchanged top-level shape.
- **Components reused**: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Input`, `Label` from `components/ui/`. No `components/attendance/*` composite applies (those are admin-side).
- **New components**:
  - `<BarcodeScanner>` in `components/scan/barcode-scanner.tsx`. Props:
    - `onDecode: (token: string) => void`
    - `onPermissionChange: (state: "pending" | "granted" | "denied" | "unsupported") => void`
    - `paused: boolean` — set true while a POST is in-flight or during the post-success grace period to prevent re-decoding.
- **State & data flow** (in `app/scan/page.tsx`):
  - `type: "entry" | "exit"` — existing toggle, default `"entry"`, persists in component state across scans within the session (unchanged behavior of the toggle component).
  - `permission: "pending" | "granted" | "denied" | "unsupported"` — driven by `BarcodeScanner`'s `onPermissionChange`.
  - `lastAccepted: { token: string; at: number } | null` — fed into `shouldAcceptScan` from `lib/scan-debounce.ts`.
  - `submitting: boolean`, `result: ScanResult | null` — already exist, reused.
  - On `onDecode(token)`:
    1. If `submitting` → ignore.
    2. If `!shouldAcceptScan(token, Date.now(), lastAccepted)` → ignore.
    3. Set `lastAccepted = { token, at: Date.now() }`, call existing `POST /api/scan` flow.
    4. Set `result` to the API response (or generic `"Invalid code"` on any error).
- **Loading state**: while a scan POST is in flight, scanner is `paused` and toggle is disabled.
- **Empty state**: no result yet → result panel hidden (current behavior).
- **Error state**: any non-2xx, network error, or scanner exception → result panel shows `"Invalid code"`. No distinction between causes.
- **Fallback**: when `permission === "denied" | "unsupported"`, render exactly the current manual `<Input>` + `Submit` form (kept inline in `app/scan/page.tsx` — do not extract). Add a small muted note: `"Camera unavailable — enter token manually."`

### `<BarcodeScanner>` lifecycle
- On mount: call `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`. On reject → `onPermissionChange("denied")` and stop. If `navigator.mediaDevices` is missing → `onPermissionChange("unsupported")`.
- On grant: `onPermissionChange("granted")`, then start `BrowserMultiFormatReader.decodeFromVideoDevice(undefined, videoRef.current, callback)` filtered to Code128.
  > Verify the exact `@zxing/browser` API via Context7 (`mcp__context7__resolve-library-id` → `query-docs`) before coding — the method signature and hint-passing has changed across versions.
- On successful decode (and not `paused`): call `onDecode(token)`.
- On unmount: `reader.reset()` and stop all tracks on the video stream.

## 7. Dependencies
- `@zxing/browser` — runtime.
  - Why this and not the standard lib: there is no browser-native Code128 decoder. `@zxing/browser` is the de-facto choice the issue explicitly calls out, has no native deps, and is Apache-2.0 licensed.
  - Pin to a specific minor (e.g. `^0.1.x`) — the API has shifted between 0.0.x and 0.1.x.
  - License: Apache-2.0. Maintenance: actively maintained as of 2026.

## 8. Test plan
- **Unit (Vitest)**:
  - `tests/unit/scan-debounce.test.ts` — covers `shouldAcceptScan(token, now, lastAccepted)`:
    - first scan always accepted (lastAccepted = null)
    - same token within 5000ms → rejected
    - same token at exactly 5000ms boundary → accepted
    - different token within 5000ms → accepted
- **E2E (Playwright)**:
  - `tests/e2e/scan.spec.ts` — set `permissions: []` (or explicitly deny via `context.grantPermissions([])` / browser context options) so `getUserMedia` rejects in test and the manual-fallback UI is what gets exercised. Existing assertions (heading visible, bad token → `"Invalid code"` with no PII, valid token → `"Welcome back"` with no PII, dashboard reflects entry) all continue to pass against the fallback DOM, which is the same form as today.
- **What we deliberately don't test**:
  - Real camera decoding end-to-end. Playwright cannot reliably feed a video stream of a barcode and we don't want flaky e2e. The `@zxing/browser` call is treated as a third-party adapter; we cover the debounce + UI plumbing with unit tests and rely on manual verification (§9) for the camera path itself.
  - Permission "granted" path in e2e for the same reason.

## 9. Verification plan
- **Build**:
  ```bash
  pnpm install
  pnpm typecheck && pnpm lint && pnpm test
  ```
  Expect: green.

- **SQL** (via local Postgres):
  ```bash
  docker exec attendance-workshop-db-1 psql -U postgres -d postgres -c "
    select count(*) as logs_last_minute
    from attendance_logs
    where timestamp > now() - interval '1 minute';
  "
  ```
  Run before a camera scan, then again ~5s after a successful scan of a seeded card. Expect: count increases by exactly 1 per accepted scan, and holding the same card steady for 4s does NOT increment again (debounce).

- **curl** (contract parity — proves the API was not changed):
  ```bash
  TOKEN=$(docker exec attendance-workshop-db-1 psql -U postgres -d postgres -tAc \
    "select barcode_token from users where deleted_at is null limit 1")
  curl -s -X POST http://localhost:3000/api/scan \
    -H 'content-type: application/json' \
    -d "{\"token\":\"$TOKEN\",\"type\":\"entry\"}" | jq
  ```
  Expect: `200` with `{ "type": "entry", "at": "<ISO>" }`. Same call with a bogus token expects `400 { "error": "invalid_code" }`. (Note: dev server defaults to `:3000` but may drift to `:3001+` if occupied — adjust accordingly.)

- **Playwright** (against `pnpm dev`):
  - Run `pnpm test:e2e` — the modified `scan.spec.ts` runs the existing scenarios against the manual-fallback DOM (permission denied in context).
  - Manual camera check (not automated): open `http://localhost:3000/scan` in Chrome, grant camera, point at a card printed from `/admin/users/[id]`, observe:
    - One POST to `/api/scan` per card presentation.
    - Result panel shows `"Welcome back"` + timestamp.
    - DOM contains no `@` and no seeded user's name (existing assertion structure already enforces this in the e2e fallback path).
    - Holding the card in frame for ≥5s triggers a second POST; pulling it away and re-presenting within 5s does not.

## 10. Task breakdown hints
- **Wave 1 (parallel-safe)**:
  - A: add `@zxing/browser` to `package.json` (`pnpm add @zxing/browser`).
  - B: create `lib/scan-debounce.ts` + `tests/unit/scan-debounce.test.ts`.
- **Wave 2 (depends on A)**: create `components/scan/barcode-scanner.tsx`.
- **Wave 3 (depends on B and Wave 2)**: modify `app/scan/page.tsx` to wire scanner + debounce + fallback.
- **Wave 4 (depends on Wave 3)**: update `tests/e2e/scan.spec.ts` to force-deny camera permission so it exercises the fallback.
- Solo-attendee friendly; no pairing needed.

## 11. Risks & rollback
- **Risk**: `@zxing/browser` API drift produces a silent no-op scanner (camera shows but never decodes). Mitigation: resolve current API via Context7 before coding; manual verification step in §9 will catch it immediately.
- **Risk**: A browser bug or HTTPS-only quirk makes `getUserMedia` reject on a staging URL → users land on manual fallback unexpectedly. Mitigation: that's the documented behavior (F4 in PRD); fallback UI is identical to today.
- **Risk**: Camera tracks not released on unmount → battery / privacy concern. Mitigation: explicit `reader.reset()` + `track.stop()` in cleanup; eyeball in DevTools → Permissions → Camera indicator turns off on navigation away.
- **Rollback**: revert the PR. No data shape changed, no migration, no API contract change — revert is sufficient and complete.
