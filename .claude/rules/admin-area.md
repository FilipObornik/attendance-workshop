---
paths:
  - "app/(admin)/**"
---

# Admin Area

You are inside an authenticated route group. Assume `auth.user` exists (enforced via
`requireAdmin()` in `app/(admin)/layout.tsx` and the API routes that mutate user data).

- Use Server Components by default; `"use client"` only for interactive widgets.
- Mutations: API routes that call `requireAdmin()`, OR server actions. Either is fine.
- Safe to render PII here (emails, names) — this is behind auth.
- Reuse `<UserTable>`, `<CurrentlyInCard>`, `<LogList>` from `components/attendance/`.
- Reuse shadcn primitives from `components/ui/`.
