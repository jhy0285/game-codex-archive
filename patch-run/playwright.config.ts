import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5471',
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5471',
    url: 'http://127.0.0.1:5471',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
