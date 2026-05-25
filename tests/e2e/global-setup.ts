// Playwright global-setup.
//
// Two jobs:
//   1. Pick a seeded user (with a fresh random barcode token) directly from
//      Postgres so specs can post a real, valid scan. We re-use the project's
//      DATABASE_URL — same database the dev server reads from.
//   2. Sign the admin in once via Supabase Auth and persist storage state to
//      `tests/e2e/.auth/admin.json`. Admin specs reuse it via `storageState`.
//
// Assumes:
//   - `docker compose up -d` is running.
//   - `pnpm db:migrate && pnpm db:seed` has been run at least once.
//   - The dev server is running on http://localhost:3000.

import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  SEED_USER_FILE,
  type SeededUser,
} from "./fixtures/seed-tokens";

async function pickSeededUser(): Promise<SeededUser> {
  // Lazy import so this file doesn't load `postgres` unless setup runs.
  const { db } = await import("../../db/client");
  const { users } = await import("../../db/schema");
  const { isNull, asc } = await import("drizzle-orm");

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      barcodeToken: users.barcodeToken,
    })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.createdAt))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(
      "No seeded users found. Run `pnpm db:migrate && pnpm db:seed` first.",
    );
  }
  return rows[0];
}

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  // 1. Seeded user → JSON on disk.
  const user = await pickSeededUser();
  mkdirSync(dirname(SEED_USER_FILE), { recursive: true });
  writeFileSync(SEED_USER_FILE, JSON.stringify(user, null, 2));

  // 2. Admin storage state.
  const adminStatePath = join(
    process.cwd(),
    "tests",
    "e2e",
    ".auth",
    "admin.json",
  );

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 }),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);

  await context.storageState({ path: adminStatePath });
  await browser.close();
}
