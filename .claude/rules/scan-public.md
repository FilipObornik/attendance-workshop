---
paths:
  - "app/scan/**"
  - "app/api/scan/**"
---

# Scanner — PUBLIC, UNAUTHENTICATED

Critical: `/scan` and `/api/scan` are reachable by anyone. The barcode token IS the credential.

DO:
- Validate tokens server-side in `/api/scan`. Never trust client-side state.
- Return generic errors ("Invalid code") — never leak whether a user exists.
  In particular, unknown-token and malformed-payload must produce the same status + body.
- Rate-limit aggressively (IP + token) when adding any rate-limiting layer.

DO NOT:
- Render user names, emails, or any PII on `/scan` or in `/api/scan` responses.
- Add auth here — that defeats the purpose. The token is the auth.
- Log full tokens to console/telemetry. Hash them if you must log.

After a scan succeeds, show only: "Welcome back" / "Goodbye" + timestamp.

## Boundary with other surfaces

When a feature adds or changes a field on `users` (or any other shape that
might appear in `/api/scan` responses), the task that touches `/scan` or
`/api/scan` must be **sequenced after** the task that adds the field — never
run them in parallel. This forces a deliberate check that the new field isn't
accidentally leaked into the public response. The `tasks` skill encodes this
as a `Depends on:` edge.
