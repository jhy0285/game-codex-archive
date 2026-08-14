# Test Strategy

## 2026-08-12 Gothic Insect-Fable Re-Art Direction Results

- `npm test`: PASS — 1 file, 5 tests.
- `npm run build`: PASS — production emits only the original Ashen Bell-Sanctum (337.14 kB), Ivory Forge Pilgrim (87.51 kB), and Rootbound Bell-Smith (699.20 kB) raster assets; the existing non-blocking Phaser chunk-size warning remains.
- `npm run test:e2e`: PASS — 3/3 Chromium flows after the final player-silhouette adjustment and result-capture settling frame.
- Mandatory web-game client: PASS — configuration and live radial combat were captured; the fight JSON showed the correct two selected modules, eight radial projectiles, health, shroud cooldown, and no error artifact.
- Visual review: PASS — directly inspected altar configuration, live radial combat, aimed mark, rotating-beam tell and active sweep, victory, and defeat. The enlarged ivory pilgrim remains distinct against fog and foreground roots; the giant Bell-Smith, all tells, HUD values, and both result actions are readable.
- Scope review: PASS — Gate 1 selection, combat behavior, timings, controls, state hook, deterministic time hook, F/Esc fullscreen, R restart, and selected-attacks-only behavior remain unchanged.
- Production verification: PASS — Vercel deployment `5G1FfiNVMuRE7SkimgFtf9Mw9ect` is aliased to `https://boss-forge-seven.vercel.app`; the alias returned HTTP 200 with the expected title. Remote mandatory-client configuration and live-combat captures exposed correct state, rendered the new assets, and produced no browser error file.

## Commands

- `npm test` — run Vitest logic tests once.
- `npm run build` — type-check and create the production Vite build.
- `npm run test:e2e` — run Playwright browser tests against a managed Vite server on strict port 4317.

## Playwright Smoke and Gameplay Coverage

The browser suite verifies page title/load, one game canvas, no fatal page error, exact-two selection, fight start, clean R restart, result-button restart, movement, dodge, player damage output, boss death, player death, both result screens, all three module pairs, selected attacks only, and distinct attack telegraph states.

## Gameplay Regression Checklist

- [x] Configuration presents exactly RADIAL BURST, AIMED SHOT, and ROTATING BEAM.
- [x] Exactly two modules can be selected and the fight cannot start with another count.
- [x] Each of the three possible module pairs produces only its selected attacks.
- [x] WASD movement stays inside the arena and mouse aim follows the pointer.
- [x] Holding left click damages and can kill the boss.
- [x] Space dodge moves quickly, grants brief safety, and respects its cooldown.
- [x] Radial burst, aimed shot, and rotating beam each display a distinct telegraph before damage.
- [x] Boss attacks can damage and kill the player.
- [x] Boss death shows a win screen; player death shows a loss screen.
- [x] R or the result action returns to a clean configuration state.
- [x] F enters fullscreen and Esc exits fullscreen without losing the configuration state.
- [x] Space dodge produces observable afterimages and combat feedback state.

## 2026-08-11 Machine Results

- `npm test`: PASS — 1 file, 5 tests.
- `npm run build`: PASS — TypeScript and Vite production build completed.
- `npm run test:e2e`: PASS — 3 Chromium tests.
- Web-game Playwright client: PASS — action burst produced state JSON and a readable RADIAL BURST combat screenshot; no error JSON was produced.
- Visual inspection: PASS — configuration, RADIAL BURST, AIMED SHOT, ROTATING BEAM telegraph/active states, victory, and defeat were inspected in captured canvas images under `output/playwright/`.
- Non-blocking note: Vite reports a roughly 1.4 MB uncompressed Phaser bundle chunk. Gate 1 launch and tests are unaffected.

## 2026-08-12 Reference-Inspired Combat Polish Results

- `npm test`: PASS - 1 file, 5 tests.
- `npm run build`: PASS - selected top-down runner asset emitted at 167.04 kB; only the existing non-blocking Phaser chunk warning remains.
- `npm run test:e2e`: PASS - 3 Chromium tests, including fullscreen F/Esc and an observable dodge echo.
- Web-game Playwright client: PASS - configuration, active dodge, and radial combat states captured; text state included readiness, cooldowns, visible projectile positions, and effect counts; no error JSON was produced.
- Visual review: PASS - inspected aimed telegraph, beam warning/active, radial release, dodge trail, victory, and defeat. The final result HUD now visibly matches zero health in text state.

## 2026-08-12 Visual Upgrade Results

- `npm test`: PASS — 1 file, 5 tests.
- `npm run build`: PASS — optimized arena asset 116.54 kB, optimized boss asset 89.22 kB.
- `npm run test:e2e`: PASS — 3 Chromium tests after the visual changes.
- Web-game Playwright client: PASS — configuration and live RADIAL BURST fight captured with correct text state and no error artifact.
- Visual review: PASS — the authored arena/boss assets do not obscure player bullets, health UI, aiming reticle, or any of the three attack telegraphs.
