# Test Plan

## 2026-08-13 First-Load Tutorial Results

- `npm test`: PASS -- 1 file, 6 logic tests passed.
- `npm run build`: PASS -- TypeScript and Vite completed; only the known non-blocking Phaser bundle-size advisory remains.
- `npx playwright test --workers=1 --reporter=line`: PASS -- 9/9. The suite verifies frozen time/movement/recording, R bypass prevention, E/Enter/pointer begin paths, fresh seed state, the unchanged complete two-sector solution, motion/fullscreen/restart regressions, and 1440x900 / 1366x768 / 1024x768 tutorial layouts.
- Required web-game client: PASS -- two Enter-started action iterations rendered gameplay and JSON state with `tutorial.visible: false`; no error artifact was generated.
- Visual inspection: PASS -- the initial tutorial, smallest supported tutorial viewport, and both final client gameplay frames were opened. Tutorial hierarchy is legible and unclipped, and gameplay state matches the JSON output.
- Human-test boundary: this is machine and visual verification only. Tutorial comprehension still requires the second human playtest.
- Production: PASS -- deployment `dpl_FZeHEgyPSV4JWdzfgstjH4AxZ7RQ` is Ready at `https://echo-heist-gamma.vercel.app`; required assets returned HTTP 200, and two public web-game client iterations produced a frozen tutorial frame followed by a matching live echo frame with no error artifact.

## 2026-08-13 Deterministic Pilgrim Motion Results

- `npm test -- --run`: PASS -- 1 file, 6 logic tests passed.
- `npm run build`: PASS -- TypeScript and Vite completed; only the known non-blocking Phaser bundle-size advisory remains.
- `npx playwright test --workers=1`: PASS -- 6/6 in 2.5 minutes. The suite now validates four facing-specific walk frame ranges, the up-turn frames, blocked x=51 idle behavior, echo replay frames, dedicated echo-hold frame, the unchanged full solution, fullscreen/restart/replay, and three viewport layouts.
- Required web-game client: PASS -- two iterations produced rendered canvas and JSON state, with `animationState`/`animationFrame` populated and no error artifact.
- Visual inspection: PASS -- the 48-frame atlas and final turn, up/left/right/down walk, wall-rest, echo-replay, echo-hold, and client screenshots were opened at original resolution. Directional silhouettes and ribbon flow read clearly; replay afterimages stay restrained; the hold pose remains distinct.
- Gameplay contract audit: PASS -- `src/game/logic.ts` is untouched. All sector coordinates, collision dimensions, speed, timer, sample interval, controls, and solution timings remain unchanged.
- Production: PASS -- deployment `dpl_2vooYKVsnrPC1mAyhhZaJPPrv9nz` is READY at the retained public alias. Page/motion assets returned HTTP 200, and the required client ran twice against production with correct animation state/frame, rendered screenshots, and no error artifact.

## 2026-08-12 Woven Under-Temple Results

- `npm test`: PASS -- 1 file, 6 tests passed.
- `npm run build`: PASS -- TypeScript and Vite completed; only the known non-blocking Phaser bundle-size warning remains.
- `npm run test:e2e -- --timeout=60000`: PASS -- 5/5, including full two-sector solution, fullscreen/exit/restart/replay, runtime failure collection, and 1440x900 / 1366x768 / 1024x768 layouts.
- Required web-game client: PASS -- generated rendered canvas/state output using deterministic stepping with no error artifact.
- Visual inspection: PASS -- initial, bound echo, open veil, partial braid, latched gate, victory, and fresh client captures were opened; player/echo silhouettes are legible, the gate reads as organic root-stone/silk, and no pixel font, arcade frame, neon laser, or boxed pixel modal remains.
- Gameplay contract audit: PASS -- no change to `logic.ts`, sector coordinates, collisions, timing, control bindings, replay determinism, `render_game_to_text`, or `advanceTime`.

## Automated Commands

- `npm test` — run Vitest logic tests once.
- `npm run build` — type-check and create the Vite production build.
- `npm run test:e2e` — run Playwright browser, full-solution, state-capture, and responsive-layout tests.

## Playwright Coverage

- The page opens with exactly one visible canvas and the expected title.
- Runtime failure collection rejects page errors, console errors, failed requests, same-origin HTTP 400+, and texture/frame/asset/WebGL/404 warnings. Chromium's known `GPU stall due to ReadPixels` capture diagnostic alone is allowed.
- WASD moves the player and automatic recording advances.
- Space immediately locks the current recording and starts Loop 2 with a visible ghost.
- The ghost replays only the recorded duration and then holds its final position.
- R restores the current sector to Loop 1 with no ghost and a full timer.
- F enters fullscreen, Esc leaves fullscreen, and `render_game_to_text` reports the same state.
- Sector 1 opens while the locked echo holds ALPHA and advances with E.
- Sector 2 reports the ghost on ALPHA and the current player on BETA.
- The dual signal shows a partial charge, reaches 1.2 seconds, and permanently latches the second gate.
- The player can leave BETA, cross the latched gate, and complete the heist with E.
- E on the victory presentation begins a fresh Sector 1 run with zero bindings and no ghost.
- Eight state captures cover Sector 1 initial, manual lock, echo-held/open, sector clear, Sector 2 initial, partial charge, latched/open, and victory.
- 1440x900, 1366x768, and 1024x768 keep the 1.6-ratio canvas fully visible, centered, and free of document scroll.

## Gameplay Regression Checklist

- [x] WASD movement respects room, divider, and obstacle collision.
- [x] The visible 20-second maximum loop counts down.
- [x] Space creates a short replay without waiting for the timer.
- [x] A finished replay holds the final recorded position.
- [x] Sector 1 teaches the manual-lock interaction.
- [x] Sector 2 requires two simultaneous switch occupants.
- [x] Partial dual-signal charge is visible and full charge latches.
- [x] Both sectors and the final victory overlay are reachable.
- [x] R clears current-sector recording, ghost, timer, and puzzle state.
- [x] Both original Dream Fracture backgrounds load without blocking the game.
- [x] Code-drawn player, echo, knot, barrier, portal, and obstacle textures render without missing-frame warnings.
- [x] Six-frame directional actors, depth veils, vignette, pooled wisps/shards, state flashes, and camera impulses render without changing gameplay state.
- [x] F fullscreen, Esc fullscreen exit, R sector restart, sector-clear E advance, and victory E replay work end-to-end.
- [x] The local Silkscreen font removes the external runtime font dependency.
- [x] Once the deterministic hook is used, screenshot duration cannot alter recorded paths.

## 2026-08-12 Atmospheric Depth Results

- `npm test`: PASS -- 1 file, 6 tests passed.
- `npm run build`: PASS -- TypeScript and Vite completed; only the known non-blocking Phaser bundle-size warning remains.
- `npm run test:e2e`: PASS -- 5 tests passed, including the full two-sector solution, fullscreen enter/exit, R restart, sector/victory menus, fresh-run replay, and three responsive viewports.
- Web-game client: PASS -- two consecutive action iterations produced rendered canvas captures and matching JSON state with no error artifact.
- Visual inspection: PASS -- manual lock, partial relay, latched gate, victory, and final client gameplay captures were opened and checked for layering, feedback, readability, and missing assets.

## 2026-08-12 Results

Earlier prototype and itch.io verification history remains recorded in `CODEX_LOG.md` and `PLAYTEST.md`.

### Dream Fracture final verification

- `npm test`: PASS — 1 file, 6 tests passed.
- `npm run build`: PASS — TypeScript and Vite completed; the known non-blocking Phaser bundle-size warning remains.
- `npm run test:e2e`: PASS — 5 tests passed, including the complete two-sector solution and three responsive viewports.
- Web-game client: PASS — A movement, Space lock, final-position hold, JSON state, canvas capture, and error collection passed with no error artifact.
- Runtime assets: PASS — no old facility or `vault-floor` texture is requested by `src` or `index.html`; local fonts and both new backdrops load successfully.
- Visual inspection: PASS — all eight state captures plus 1440x900, 1366x768, and 1024x768 layout captures were opened and inspected.
