// Helpers for surfacing seeded data into Playwright specs.
//
// Tokens in `db/seed.ts` are randomized (randomBytes(12).toString("hex")), so we
// cannot hardcode them. Instead, at global-setup time we query the same Postgres
// database the app uses (via DATABASE_URL) and pick a fresh seeded user. The
// chosen user is written to disk and re-read by individual specs.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const SEED_USERS = [
  { name: "Ada Lovelace", email: "ada@example.com" },
  { name: "Alan Turing", email: "alan@example.com" },
  { name: "Grace Hopper", email: "grace@example.com" },
] as const;

export const ADMIN_EMAIL =
  process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
export const ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

export type SeededUser = {
  id: string;
  name: string;
  email: string;
  barcodeToken: string;
};

export const SEED_USER_FILE = join(
  process.cwd(),
  "tests",
  "e2e",
  ".auth",
  "seed-user.json",
);

export function readSeededUser(): SeededUser {
  const raw = readFileSync(SEED_USER_FILE, "utf8");
  return JSON.parse(raw) as SeededUser;
}
