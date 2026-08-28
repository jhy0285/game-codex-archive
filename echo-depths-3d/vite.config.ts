import { cloudflare } from '@cloudflare/vite-plugin'
import { sites } from '@openai/sites-vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: command === 'build'
    ? [
        sites(),
        cloudflare({
          viteEnvironment: { name: 'server' },
          config: {
            name: 'echo-depths-3d',
            main: './worker/index.ts',
            compatibility_date: '2026-08-25',
            assets: {
              binding: 'ASSETS',
              not_found_handling: 'single-page-application',
            },
          },
        }),
      ]
    : [],
  server: {
    host: '127.0.0.1',
    port: 4537,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4538,
    strictPort: true,
  },
  build: {
    target: 'es2022',
  },
}))
