# Test Guide

## 2026-08-14 new-PC final regression

- `npm ci` and Playwright Chromium installation: PASS on Node 22.17.0 / npm 10.9.2.
- `npm test`: PASS, 5/5.
- `npm run build`: PASS; only the documented non-blocking Phaser chunk-size advisory remains.
- `npm run test:e2e`: PASS, 3/3, including articulated motion, all three scheduled patches/restart, and BITSHIFT-to-OVERDRIVE routing.
- Interactive in-app-browser agent QA inspected the canonical Drowned Scriptorium root, issued movement/Threadstep/aim/fire inputs, observed enemy pressure and the death/restart prompt, and found no console error. This is not a human playtest.
- No source, rule timing, route, mechanic, or production change was required; no deployment was attempted.

## Automated Commands

- `npm test` — runs Vitest unit coverage for patch timing and stacked bullet rules.
- `npm run build` — runs TypeScript and creates the Vite production bundle.
- `npm run test:e2e` — starts Vite and runs the Playwright smoke test.

## Playwright Smoke Test

`tests/smoke.spec.ts` verifies that the premium root page opens, a visible game canvas exists, movement changes player position, F enters fullscreen and Escape exits, dash contact safety executes, normal damage removes 16 health, all three scheduled patches activate, a grown ricochet persists after its wall collision, sustained fire stays within the batched render-object budget, no fatal page error occurs, death is reachable, and restart returns to a clean run. A dedicated motion scenario fixes the presentation clock and actor positions to compare idle/walk frames, then exercises fire, dash, player hit, and every enemy animation state. A third scenario opens BITSHIFT, uses the build-selector menu to return to OVERDRIVE, moves, aims, and fires.

## Gameplay Regression Checklist

- [ ] WASD moves responsively in all four directions and diagonal movement is normalized.
- [ ] Mouse aim follows the pointer and holding left click fires repeatedly.
- [ ] Space dash moves quickly, grants brief contact safety, and respects cooldown.
- [ ] The single enemy archetype pursues, damages, and can kill the player.
- [ ] Normal player shots damage and kill enemies; each kill awards 100 points.
- [ ] Countdown visibly reaches RICOCHET at 20 seconds, GROWTH at 40, and FRIENDLY FIRE at 60.
- [ ] A bullet bounces at most once after RICOCHET.
- [ ] After GROWTH, a bounced bullet is obviously larger, gold, higher-damage, and labels the interaction.
- [ ] After FRIENDLY FIRE, bounced shots damage enemies they subsequently hit.
- [ ] Death overlay appears and R/click restarts with full health, zero score, zero elapsed time, and no active patches.
- [ ] F toggles fullscreen and Escape exits it.

## Verification Record

**2026-08-13 motion machine verification:**

- Focused motion E2E PASS: deterministic fixed-position idle and walk frame pairs plus fire recoil, Threadstep smear/recovery, player hit, and Seed Husk emerge/skitter/anticipate/hit/death.
- Text-state parity PASS: `presentationClockMs`, player state/frame/state age, enemy state/frame, and death-frame telemetry match the captured poses.
- Visual inspection PASS: articulated mantle/feet/mask gait, blade recoil, dash stretch and afterimage, alternating root legs, enemy coil, hit tint/recoil, and death collapse are visible; top HUD overlap is removed.
- Final regression PASS: Vitest 5/5, build, and Playwright 3/3 including all prior Gate 1 interactions and `/pixel` navigation. Required web-game client passed twice locally and once on production with no error artifact.
- Production PASS: `https://patch-run-weld.vercel.app`, `/pixel`, `/overdrive`, and both articulated actor source files return HTTP 200; public text state exposes live animation states/frames and the public screenshot was inspected.
- No human control-feel test is claimed.

**2026-08-12 machine verification:**

- Drowned Scriptorium correction - PASS: original environment/player/enemy assets load; actor alpha corners and bounds pass validation; premium captures show the flooded sanctuary, curse runner, seed husks, engraved HUD, RICOCHET inscription, organic grown return, and death rite with no ship/radar/neon-SF presentation.
- Current automated result - PASS: Vitest 5/5, production build, Playwright 2/2, and the provided web-game client for two action iterations. The client state reports `THE DROWNED SCRIPTORIUM`; movement, Threadstep, aiming, curse-seed firing, kills, and score are represented consistently.
- Production verification - PASS: `https://patch-run-weld.vercel.app`, `/pixel`, `/overdrive`, and all three new asset paths return HTTP 200; the required client passed against the public root and its capture/state were inspected with no error artifact.
- PATCH FORGE upgrade: original arena/player/enemy assets load from the local server; alpha corners and subject bounds were validated before sprite integration.
- Expanded Playwright smoke - PASS: 2/2 scenarios covering the complete premium run plus BITSHIFT to OVERDRIVE menu navigation and fullscreen enter/exit.
- Sequential stability - PASS: 6/6 scenarios (`--repeat-each=3`) after replacing frame-polled F with a direct keydown binding.
- Provided web-game client - PASS after both the environment pass and final sprite pass; final state identifies `visualTheme: overdrive` and `environment: PATCH FORGE`, movement/dash/aim/fire operate, and no console-error artifact is emitted.
- Final visual inspection - PASS: premium baseline combat, EVADE, hit loss, large patch explanation, persistent grown ricochet, death/restart prompt, and build selector captures were opened and reviewed.
- `npm test` — PASS: 1 file, 5 tests including patch explanation coverage.
- `npm run build` — PASS after the visual-feedback implementation.
- `npm run test:e2e` — PASS: actual Space hold/EVADE safety, 16-damage feedback, described patch card, persistent growth ricochet, death, and restart.
- `npm run test:e2e -- --repeat-each=3` — PASS: 3/3 sequential polished-feedback runs after removing the dash/contact race.
- Provided web-game Playwright client — PASS: normal movement, dash, mouse aim/fire, enemy elimination, score change, and state parity; no console-error artifact.
- Visual inspection — PASS: normal combat, EVADE, damage, RICOCHET rule explanation, RICOCHET × GROWTH return, and death captures were reviewed.

- CC0 asset/performance pass: imported background/ships/laser/shield/audio load from the development server; the sustained-fire render-object budget passes; Playwright passes 3/3 sequential runs; imported-asset gameplay captures were reviewed with no console errors.

**2026-08-11 machine verification:**

- `npm test` — PASS: 1 file, 4 tests.
- `npm run build` — PASS: TypeScript and Vite production build; Vite reports only a non-blocking Phaser bundle-size warning.
- `npm run test:e2e` — PASS: 1 Playwright smoke test on dedicated port 5471.
- `npm run test:e2e -- --repeat-each=3` — PASS: 3 sequential browser runs after fixing the smoke to one worker and isolating its ricochet path from random enemies.
- Provided web-game Playwright client — PASS: movement, dash, aim, sustained shooting, enemy elimination, score change, state output, and screenshot capture exercised; no console-error artifact emitted.
- Visual inspection — PASS: normal arena, enlarged gold RICOCHET × GROWTH return, fixed patch status rows, full death overlay, zero-health HUD, and restart prompt are visible.
