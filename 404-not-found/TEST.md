# Verification

## 2026-08-13 final local verification

- `npm run build` — PASS (Vite 8.2.1)
- `npm run test:e2e -- tests/smoke.spec.js` — PASS, 5/5
  - title, movement, attack animation, clean restart
  - Act I completion transitions to Act II checkpoint
  - Act II Husk → Redactor → mixed wave progression and gate activation
  - Blind Archivist three-pattern cycle and recovery-only vulnerability
  - boss death as the sole final-completion condition
- Mandatory web-game client — PASS, 2 iterations
  - final output: `output/web-game/final-local-v4/`
  - state: `mode=play`, Act I, jump/attack animation, player projectile positions
  - `errors-*.json`: 0 files
- Visual inspection — PASS
  - `output/e2e/act-2-wave-1.png`
  - `output/e2e/act-2-wave-3.png`
  - `output/e2e/act-3-boss.png`
  - `output/e2e/boss-index-telegraph.png`
  - `output/e2e/boss-core-recover.png`
  - `output/e2e/final-restored-page.png`
  - `output/web-game/final-local-v3/shot-0.png` and `shot-1.png`

## 2026-08-13 production verification

- Deployment: `C6ijGgV72EbPUgQB4qhH6mQQGY3M` (Ready)
- Alias: `https://404-not-found-phi-seven.vercel.app`
- `npx playwright test --config=playwright.production.config.js` — PASS, 2/2
- Remote `/` and the three WebP assets plus `/favicon.svg` — HTTP 200
- Unknown route — HTTP 404, then interactive redirect to `/?from=404` with `sessionStorage.void-route-entry=404`
- Remote state: `act.total=3`, Act II wave 1/3 with Husk, Act III Blind Archivist 12/12 and `vulnerable=false`
- Remote screenshot: `output/e2e/production-act-3.png`, visually inspected at original resolution
- Browser console/page errors: 0
