// Public scan happy-path e2e.
//
// How to run:
//   Terminal 1: docker compose up -d && pnpm db:migrate && pnpm db:seed
//   Terminal 2: pnpm dev
//   Terminal 3: pnpm test:e2e
//
// Seeded tokens are random (db/seed.ts uses randomBytes), so a Playwright
// global-setup (tests/e2e/global-setup.ts) reads a seeded user out of the
// project Postgres and writes it to tests/e2e/.auth/seed-user.json. This spec
// reads that file via the readSeededUser() helper.

import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { readSeededUser } from "./fixtures/seed-tokens";

const adminStorageState = join(
  process.cwd(),
  "tests",
  "e2e",
  ".auth",
  "admin.json",
);

// Camera-based scanner can't be reliably driven in headless e2e. Force the
// manual-fallback UI by making navigator.mediaDevices look unsupported before
// the page loads. The fallback DOM is identical to the pre-camera version of
// /scan, so the existing assertions still hold.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      get: () => undefined,
    });
  });
});

test.describe.serial("scan happy path", () => {
  test("scan page renders", async ({ page }) => {
    await page.goto("/scan");
    await expect(page.getByRole("heading", { name: "Scan" })).toBeVisible();
  });

  test("bad token returns a generic 'Invalid code' (no info leak)", async ({
    page,
  }) => {
    await page.goto("/scan");
    await page.getByLabel("Token").fill("not-a-real-token-zzz");
    await page.getByRole("button", { name: "Submit" }).click();

    const result = page.getByTestId("scan-result");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Invalid code");
    // The error must not distinguish "malformed" vs "unknown".
    const text = (await result.textContent()) ?? "";
    expect(text.toLowerCase()).not.toContain("malformed");
    expect(text.toLowerCase()).not.toContain("unknown");
    expect(text.toLowerCase()).not.toContain("not found");
    // And it must not include any email-shaped string.
    await expect(result).not.toContainText("@");
  });

  test("valid token: entry succeeds, no PII rendered, dashboard reflects it", async ({
    page,
    browser,
  }) => {
    const user = readSeededUser();

    // Submit an entry scan with a real seeded token.
    await page.goto("/scan");
    await page.getByLabel("Token").fill(user.barcodeToken);
    // Default "Entry" is already selected — click it defensively to be explicit.
    await page.getByRole("button", { name: "Entry" }).click();
    await page.getByRole("button", { name: "Submit" }).click();

    const result = page.getByTestId("scan-result");
    await expect(result).toBeVisible();
    // Success copy from app/scan/page.tsx for entry.
    await expect(result).toContainText(/welcome back/i);

    // Critical: no PII rendered on the public scan page.
    const text = (await result.textContent()) ?? "";
    expect(text).not.toContain("@");
    expect(text).not.toContain(user.email);
    expect(text).not.toContain(user.name);

    // Dashboard reflects: open as admin in a fresh context.
    const adminCtx = await browser.newContext({
      storageState: adminStorageState,
    });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto("/admin/dashboard");
    const currentlyIn = adminPage.getByText(/currently in/i).first();
    await expect(currentlyIn).toBeVisible();
    // The seeded user we just signed in should appear in the "Currently in" list.
    await expect(adminPage.getByText(user.name).first()).toBeVisible({
      timeout: 10_000,
    });
    await adminCtx.close();
  });
});

// TODO: this suite mutates shared seeded users (it inserts an entry log for
// the first seeded user). Re-running consecutively still works for the
// happy-path assertion, but if you need a clean state between runs, re-run
// `pnpm db:seed` (it wipes attendance_logs).
