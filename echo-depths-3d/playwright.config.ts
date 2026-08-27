import { defineConfig, devices } from '@playwright/test'

const localBaseUrl = 'http://127.0.0.1:4537'
const environment = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const externalBaseUrl = environment.PLAYWRIGHT_BASE_URL
const reuseExistingServer = environment.PLAYWRIGHT_REUSE_SERVER === '1'

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/production/**',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: externalBaseUrl ?? localBaseUrl,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  ...(externalBaseUrl ? {} : {
    webServer: {
      command: 'node ./node_modules/vite/bin/vite.js --host=127.0.0.1 --port=4537',
      env: { VITE_E2E_DEBUG_API: '1' },
      url: localBaseUrl,
      reuseExistingServer,
      timeout: 120_000,
    },
  }),
})
