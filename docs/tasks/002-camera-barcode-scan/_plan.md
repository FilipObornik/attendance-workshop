# Plan: Camera-based barcode scanning on `/scan`

**Techspec:** ./techspec.md
**Last updated:** 2026-05-25

## Summary
Replace the manual token input on `/scan` with a `@zxing/browser` camera scanner that auto-submits to the unchanged `POST /api/scan`, gated by a 5s same-token debounce. Manual input remains as the camera-denied fallback. UI-only; no schema or API contract change.

## Task graph

| # | Title | Files | Effort | Depends on | Parallel with | Status |
|---|-------|-------|--------|------------|---------------|--------|
| 1 | Add @zxing/browser dependency | `package.json`, `pnpm-lock.yaml` | S | none | 2 | Done |
| 2 | Add scan-debounce pure helper + unit tests | `lib/scan-debounce.ts`, `tests/unit/scan-debounce.test.ts` | S | none | 1 | Done |
| 3 | Build BarcodeScanner client component | `components/scan/barcode-scanner.tsx` | M | 1 | none | Done |
| 4 | Wire scanner into /scan page + update e2e | `app/scan/page.tsx`, `tests/e2e/scan.spec.ts` | M | 2, 3 | none | Done |

> Note: `@zxing/library` was added as a direct dependency during task 3 — it is a peer of `@zxing/browser` and pnpm does not auto-install peers. Pinned to `^0.22.0` to match the peer range.

## Execution shape (derived)
- **Step 1** (parallel): tasks 1, 2 → 2 worktree subagents concurrently
- **Step 2** (inline): task 3 (depends on 1 — imports `@zxing/browser`)
- **Step 3** (inline): task 4 (depends on 2 + 3 — imports debounce helper and scanner component)

## Blocking rationale
- **3 → 1**: scanner component imports `@zxing/browser`; the package must exist before the file can typecheck.
- **4 → 2**: page imports `shouldAcceptScan`.
- **4 → 3**: page imports `<BarcodeScanner>`.

## Verification gate
After task 4, run the `verify-feature` skill against `./techspec.md` §9:
- **Build**: `pnpm typecheck && pnpm lint && pnpm test`
- **SQL**: row-count delta in `attendance_logs` per accepted scan; no delta during 5s debounce window.
- **curl**: contract parity on `POST /api/scan` (200 with valid token, 400 `invalid_code` with bogus token).
- **Playwright**: `pnpm test:e2e` (exercises fallback DOM with camera denied; existing PII assertions enforced).
- **Manual**: real camera scan of a printed card — observe single POST, `Welcome back` + timestamp, no PII in DOM.

Don't ship without all four channels green.
