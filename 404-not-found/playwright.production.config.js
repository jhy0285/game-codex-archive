import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "production.spec.js",
  timeout: 60_000,
  workers: 1,
  use: {
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
  },
  reporter: "line",
});
