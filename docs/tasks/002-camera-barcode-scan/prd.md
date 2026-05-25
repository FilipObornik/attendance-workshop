# PRD — Camera-based Barcode Scanning on `/scan`

**Source issue:** [#2 Add camera-based barcode scanning to `/scan`](https://github.com/FilipObornik/attendance-workshop/issues/2)
**Status:** Draft
**Owner:** Filip
**Date:** 2026-05-25

---

## 1. Overview & Objectives

The `/scan` page today exposes a text input where a visitor pastes their barcode token and picks entry/exit. This defeats the purpose of the printed barcode cards. We will replace the text input with a **live camera barcode scanner** that reads the token directly off the user's card and submits to the existing `POST /api/scan` endpoint.

**Goal:** A visitor can walk up to the kiosk, point their card at the camera, and be logged in/out within ~1 second — no typing, no PII on screen.

**Non-goal:** Changing the backend contract. `POST /api/scan` with `{ token, type }` stays exactly as is.

## 2. Target Audience

- **Primary:** Workshop / event visitors checking themselves in or out via a shared kiosk (laptop or tablet) at the door.
- **Secondary:** The workshop demo audience watching the live agentic build of this feature.

## 3. Problem & Motivation

Manual token entry is slow, error-prone, and reveals the token in plain text. The whole point of issuing printed Code128 barcodes is that the card itself becomes the credential — a scanner closes that loop.

## 4. Core Features

### F1 — Live camera preview with barcode decoding

- On `/scan` load, request camera permission and show a live `<video>` preview.
- Continuously decode frames looking for **Code128** barcodes.
- Use `@zxing/browser`. Confirm current API via Context7 before coding — version drift between releases is real.
- **Acceptance:**
  - Page loads → browser camera permission prompt appears.
  - On grant, video preview is visible and running.
  - On deny, page falls back to the existing manual text input (F4).

### F2 — Auto-submit on successful decode

- The moment a Code128 barcode is decoded, the page calls `POST /api/scan` with `{ token: <decoded>, type: <selectedType> }`.
- No confirmation tap. Speed wins; the entry/exit toggle is the only deliberate user input.
- **Acceptance:**
  - Pointing the camera at a valid card triggers exactly one POST per scan event.
  - The decoded token value is what's sent — no transformation.

### F3 — Same-token debounce (5 seconds)

- After a successful POST for token `T`, ignore further decodes of `T` for **5 seconds**.
- A different token decoded during that window submits normally.
- After 5s, the same token can be scanned again (legitimate re-entry).
- **Acceptance:**
  - Holding the same card in front of the camera produces one POST, not a flood.
  - A different card scanned 1s later still submits.

### F4 — Manual fallback when permission denied or camera unavailable

- If `getUserMedia` rejects (denied / no camera / insecure context), render the existing text input + submit button unchanged.
- Show a small explanatory note: "Camera unavailable — enter token manually."
- **Acceptance:**
  - Denying permission in the browser swaps the UI to the manual input without a page reload.
  - The manual flow uses the same `POST /api/scan` call path.

### F5 — Entry/Exit toggle with persistence

- Toggle defaults to `entry`.
- Selection persists across scans **within the page session** (not across reloads — kiosk operator can reset by refreshing).
- Toggle is visible above or beside the video preview at all times.
- **Acceptance:**
  - Switching to `exit` and scanning sends `type: "exit"`.
  - Three successive scans without touching the toggle all use the same value.

### F6 — Feedback messaging (privacy-preserving)

- **Success (valid token, entry):** `"Welcome back"` + timestamp (local time, HH:MM).
- **Success (valid token, exit):** `"Goodbye"` + timestamp.
- **Failure (unknown token / API 4xx):** Generic `"Invalid code"` — never reveals whether the user exists.
- Message clears or is replaced when the next scan happens.
- **Acceptance:**
  - No name, email, or any PII appears in the DOM.
  - Failure response is indistinguishable for "no such user" vs "token format invalid".

## 5. Out of Scope (this iteration)

- Multi-camera selection — use browser default.
- Mobile-specific UI polish (responsive only as far as comes for free).
- On-page scan history.
- Sound / haptic feedback.
- Support for barcode formats other than Code128.

## 6. Technical Stack

| Concern | Choice | Notes |
|---|---|---|
| Scanner lib | `@zxing/browser` | Pure-JS, no native deps. Verify API via Context7 — `BrowserMultiFormatReader` / `decodeFromVideoDevice` shape has changed across versions. |
| Framework | Next.js 15 App Router, React 19 | Already in repo. |
| Component type | `"use client"` | `/scan` is already a client component. |
| API contract | `POST /api/scan { token, type }` | **Unchanged.** |
| Camera API | `navigator.mediaDevices.getUserMedia` | Requires HTTPS or `localhost`. |
| Tests | Vitest (component) + Playwright (manual-fallback path only) | Camera cannot be reliably driven in headless e2e. Mock the scanner module in component tests. |

## 7. Conceptual Data Model

**No schema changes.** The existing tables suffice:

- `users(id, name, email, barcode_token UNIQUE, ...)` — `barcode_token` is what the camera decodes.
- `attendance_logs(id, user_id, type, timestamp, auto_closed)` — new row per successful scan, as today.

## 8. UI Design Principles

- **Single visible affordance:** the video preview. The entry/exit toggle sits above it. Manual input is hidden unless the camera fails.
- **Privacy by default:** no names, no emails, ever — only the generic welcome/goodbye + time.
- **Kiosk-friendly:** large toggle, large feedback text, high contrast. No tiny buttons.
- **No modal dialogs** — feedback is inline, transient, replaced by the next scan.

## 9. Security & Privacy

- The barcode token IS the credential — same threat model as today. No additional auth on `/scan`.
- Failure messages MUST be generic (F6) to avoid user-enumeration via timing or wording.
- The decoded token never leaves the page except via the existing `POST /api/scan`.
- Camera stream is local-only — no frames uploaded anywhere.

## 10. Development Phases

| Phase | Scope | Verification |
|---|---|---|
| **P1** | Wire `@zxing/browser`, get live preview + decode logging | Manual: see decoded token in console when pointed at a card |
| **P2** | Auto-submit decoded token to `/api/scan` with current toggle value | curl parity check + SQL row count |
| **P3** | 5s same-token debounce | Component test mocking the scanner |
| **P4** | Permission-denied fallback to manual input | Manual: deny permission in browser, confirm fallback |
| **P5** | Welcome/Goodbye/Invalid messaging, no-PII audit | Playwright (manual-fallback path) + DOM inspection |

## 11. Challenges & Mitigations

| Challenge | Mitigation |
|---|---|
| `@zxing/browser` API drift between versions | Resolve current API via Context7 before writing code. Pin the version in `package.json`. |
| Camera permission UX varies by browser | F4 fallback is the safety net. Don't try to detect-then-prompt — just call `getUserMedia` and react. |
| Double-firing on steady camera | F3 debounce (5s same-token). |
| Playwright cannot grant a real camera | E2E covers only the manual-fallback path. Component tests mock the scanner module. |
| Insecure context (http on a non-localhost host) | `getUserMedia` will reject → F4 fallback kicks in automatically. |

## 12. Future Possibilities

- Multi-camera picker (front/back, USB scanner).
- Audible chime on success/failure.
- Self-service "I forgot my card" flow (one-time code by email).
- QR code support alongside Code128.
- Admin dashboard live tile showing recent scans.

## 13. Verification Plan (handoff to `/verify-feature`)

- **SQL:** `select count(*) from attendance_logs where timestamp > now() - interval '1 minute'` before and after a scan.
- **curl:** `curl -X POST http://localhost:3000/api/scan -d '{"token":"<seed-token>","type":"entry"}'` — must behave identically to before this change.
- **Playwright:** Existing `scan.spec.ts` happy path runs against the manual-fallback UI (permission denied) — no regression.

## 14. Open Questions — Resolved

- **Auto-submit vs confirm tap?** → **Auto-submit immediately.**
- **Debounce window for same token?** → **5 seconds.**

---

**Next stage:** `/techspec` to translate this into a concrete implementation plan grounded in the repo's `lib/` + `app/scan/` structure.
