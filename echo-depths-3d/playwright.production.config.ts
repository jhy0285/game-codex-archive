import { defineConfig, devices } from '@playwright/test'

const environment = (globalThis as typeof globalThis & {
  process?: { env?: Readonly<Record<string, string | undefined>> }
}).process?.env
const configuredBaseUrl = environment?.PLAYWRIGHT_BASE_URL?.trim()

if (!configuredBaseUrl) {
  throw new Error(
    'PLAYWRIGHT_BASE_URL is required for the production smoke suite. Refusing to start a local server.',
  )
}

let baseURL: string
try {
  const parsed = new URL(configuredBaseUrl)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`unsupported protocol ${parsed.protocol}`)
  }
  parsed.hash = ''
  baseURL = parsed.toString().replace(/\/$/, '')
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error)
  throw new Error(`PLAYWRIGHT_BASE_URL must be a valid HTTP(S) URL: ${detail}`)
}

export default defineConfig({
  testDir: './tests/production',
  outputDir: './output/playwright-production-results',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL,
    navigationTimeout: 45_000,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'production-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
