# ECHO HEIST — Codex Development Log

## 2026-08-12 to 2026-08-13 — inherited prototype history

- Established the original two-sector Phaser/Vite/TypeScript game and 20-second position-replay echo.
- Added the preserved FIRST CUT geometry and the former dual-signal room.
- Added deterministic browser hooks, Vitest, Playwright, responsive canvas containment, and the original Vercel deployment.
- Explored Dream Fracture and Woven Under-Temple visual directions with original generated art.
- Added the locally archived Murphy’s Dad Sci-Fi Facility CC0 pack and documented its license.
- Migration baseline recorded 6/6 Vitest, build PASS, and 9/9 Playwright.

## 2026-08-14 — complete-game Goal

### Investigation

- Read all repository handoff/deployment documents and every Echo Heist contract, task, test, progress, credit, log, milestone, and playtest document.
- Confirmed clean `main` baseline at `08e3052` and the existing production alias/project identity.
- Reproduced the inherited baseline: `npm.cmd ci`, 6/6 Vitest, build PASS, 9/9 Playwright.
- Rendered and inspected the inherited title and both rooms before changing mechanics.
- Rechecked Pixel_Poem’s published license and the contest’s browser-link/playability requirements.

### Design decisions

- Kept the core “record past behavior, bind, cooperate with the replay” identity and preserved FIRST CUT’s documented coordinates and solution.
- Expanded to six chapters with one mechanic introduced per chapter and a multi-system finale.
- Selected the already-vetted CC0 cyber-facility pack instead of importing Pixel_Poem files with a no-redistribution term into a public source archive.
- Kept every room in an authored full-puzzle frame rather than using a camera crop that could hide required information.
- Required landscape on narrow mobile screens and auto-paused portrait orientation for readability and touch accuracy.

### Runtime implementation

- Rebuilt `logic.ts` around fixed 60 Hz stepping, action-bearing echo frames, deterministic object reset, plate evaluation, laser phases, projectile travel, and sentinel strike rules.
- Rebuilt `EchoScene.ts` with title, pause/help, six chapters, stage clear, escape, ending, replay, and chapter select states.
- Added movement acceleration/deceleration, action buffering, four-way pixel animation, carry/drop/push, throw, pulse redirection, dash, hazards, feedback, and clean reset boundaries.
- Added one visible replaying echo with movement, interact, throw, and pulse reproduction; a new bind replaces the old echo.
- Added persistent security nodes only where the finale contract declares them.
- Added code-rendered neon player/echo identities, path preview, action timeline, objective HUD, trajectories, plates, gates, receiver, pulse/rift effects, particles, shake, flash, and short hit-stop.
- Added Web Audio oscillator cues activated only after a user gesture.
- Added pointer pulse, touch D-pad/actions, portrait pause/rotation guidance, responsive containment, and nearest-neighbor rendering.
- Added a first-launch language selector, document-language metadata updates, complete English/Korean UI copy, localized six-chapter stage copy, world labels, prompts, feedback, overlays, and touch action labels.

### Asset transition

- Copied only selected CC0 cyber-facility sheets into `public/assets/neon-facility/` with the license text.
- Preserved old painted runtime files and source helpers under `archive/previous-runtime/`.
- Kept Silkscreen and its OFL text as the runtime font.
- Confirmed the game uses no Hollow Knight code or asset.

### Verification

- Expanded Vitest to 14 tests, adding translation-key completeness and six-chapter Korean copy coverage.
- Replaced the prior browser suite with 10 complete-game tests covering real keyboard FIRST CUT completion, every added mechanic, full replay reset, desktop containment, portrait pause, and landscape touch movement.
- Local latest result: 14/14 Vitest, build PASS, 10/10 Playwright.
- Browser-assisted rendering found no Vite overlay, page error, console error, or failed first-party request.

### Release

- Committed and pushed the complete six-chapter campaign as `8619fd808d899b5814becf8b28f37ecd6e529682` on GitHub `main`.
- Found a double-centering CSS defect during first public verification, added symmetric-gap browser assertions, reran the full 10/10 Playwright suite and production build, and pushed the correction as `99ab1a4316d135c4b45483d1cffefb408a1d569c`.
- Built a prebuilt Production artifact and deployed only the existing `echo-heist` Vercel project as `dpl_7e2fSNg4ZLerBDSBu3vwG9YrLdSS` (READY).
- Verified immutable artifacts `index-BA8tZAw9.js` and `index-CU3Xn9Wp.css` before promoting the preserved `https://echo-heist-gamma.vercel.app` alias.
- Re-opened the public alias in a fresh browser session and verified desktop title/start, six-chapter metadata, no production debug API, portrait auto-pause, landscape touch layout, exact centered containment, no overflow, and zero page/console errors.
- Added and pushed Korean localization as `981e06714cd56fb19a3f694cb9e652afbe4f9b15`, then built and deployed Production as `dpl_Fbo12msRhd8GU7zFcaWAY84eovEd` (READY) with immutable URL `https://echo-heist-fhgw3l79o-ai-build3.vercel.app`.
- Re-opened the preserved public alias and verified `2` → Korean title/HUD/tutorial/rotation/touch UI, fresh reload + `1` → English, six-chapter state, production debug exclusion, centered mobile canvas, and zero console/page errors.
