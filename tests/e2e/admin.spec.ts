// Admin happy-path e2e.
//
// How to run:
//   Terminal 1: docker compose up -d && pnpm db:migrate && pnpm db:seed
//   Terminal 2: pnpm dev
//   Terminal 3: pnpm test:e2e
//
// This spec runs under the `admin` Playwright project, which loads storage
// state created in tests/e2e/global-setup.ts (admin already signed in).

import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./fixtures/seed-tokens";

test.describe.serial("admin happy path", () => {
  test("unauthenticated visit to /admin redirects to sign-in", async ({
    browser,
  }) => {
    // Use a clean context (no stored cookies) to assert the auth gate.
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await page.goto("/admin");
    await expect(page).toHaveURL(/sign-in/);
    await expect(
      page.getByRole("heading", { name: "Admin sign-in" }),
    ).toBeVisible();
    await context.close();
  });

  test("sign-in flow lands on /admin", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin(\/|$)/);
    await context.close();
  });

  test("create user, view barcode, dashboard renders", async ({ page }) => {
    // Already signed-in via storageState from global-setup.
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: /create user/i }),
    ).toBeVisible();

    // Create a new user with a unique email per run.
    const stamp = Date.now();
    const name = `E2E User ${stamp}`;
    const email = `e2e+${stamp}@example.com`;

    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: /create user/i }).click();

    // Success state: link to the new user's detail page appears.
    const viewLink = page.getByRole("link", { name: /view barcode/i });
    await expect(viewLink).toBeVisible({ timeout: 10_000 });

    // Detail page renders a PNG-data-url barcode for the new user.
    await viewLink.click();
    await page.waitForURL(/\/admin\/users\/[0-9a-f-]+/i);
    const barcode = page.getByRole("img", {
      name: new RegExp(`barcode for ${name}`, "i"),
    });
    await expect(barcode).toBeVisible();
    const src = await barcode.getAttribute("src");
    expect(src).toMatch(/^data:image\/png/);

    // Dashboard renders both cards.
    await page.goto("/admin/dashboard");
    await expect(page.getByText(/currently in/i)).toBeVisible();
    await expect(page.getByText(/today's logs/i)).toBeVisible();
  });
});
