import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.js/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173/smoke/",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/build-smoke.mjs && node tests/serve-dist.mjs",
    url: "http://127.0.0.1:4173/smoke/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
