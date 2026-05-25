# Architecture

One-page summary. Code is the source of truth.

## System

```
┌────────────────────┐        ┌────────────────────┐
│  Public visitor    │        │  Admin (auth'd)    │
│  /scan             │        │  /admin/*          │
└─────────┬──────────┘        └─────────┬──────────┘
          │                              │
          ▼                              ▼
   POST /api/scan              Server Components +
          │                    /api/users, /api/attendance/*
          │                              │
          └──────────────┬───────────────┘
                         ▼
                   Drizzle ORM
                         │
                         ▼
         Postgres (Supabase, docker-compose, :54322)
         Auth via Supabase GoTrue (:54321 via Kong)
         Studio :54323
```

## Domain model

- **users** `(id, name, email, barcode_token UNIQUE, created_at, deleted_at NULL)`
- **attendance_logs** `(id, user_id FK, type ∈ {entry,exit}, timestamp, auto_closed)`

`deleted_at` and `auto_closed` exist from day one. Soft-delete and auto-close behaviour
are seeded workshop issues — the *columns* are pre-shipped so migrations don't pollute
the workshop demos.

## Surfaces

| Route                          | Auth      | Notes                                    |
|--------------------------------|-----------|------------------------------------------|
| `/`                            | Public    | Landing                                  |
| `/scan`                        | Public    | Manual token input. No PII rendered.     |
| `/sign-in`                     | Public    | Email + password (Supabase Auth)         |
| `/admin`                       | Auth      | User list + create form                  |
| `/admin/users/[id]`            | Auth      | Detail + Code128 barcode PNG             |
| `/admin/dashboard`             | Auth      | Currently-in + today's logs              |
| `POST /api/scan`               | Public    | `{ token, type }` → log row              |
| `GET  /api/users`              | Auth      | List                                     |
| `POST /api/users`              | Auth      | Create + generate token                  |
| `GET  /api/attendance/today`   | Auth      |                                          |
| `GET  /api/attendance/currently-in` | Auth |                                          |

## Where work happens

- Pure logic → `lib/*` (vitest covers it).
- DB shape → `db/schema.ts` (one source of truth; Drizzle types flow out).
- UI → Server Components by default; `"use client"` only for `/scan` and the create-user
  form. Auth pages must be client (they call Supabase Auth).
- Migrations → append-only files in `db/migrations/`. Apply with `pnpm db:migrate`.
