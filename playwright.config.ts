import { defineConfig } from "@playwright/test";
import { join } from "node:path";

const adminStorageState = join(
  __dirname,
  "tests",
  "e2e",
  ".auth",
  "admin.json",
);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    {
      name: "anon",
      testMatch: /scan\.spec\.ts/,
    },
    {
      name: "admin",
      testMatch: /admin\.spec\.ts/,
      use: { storageState: adminStorageState },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
