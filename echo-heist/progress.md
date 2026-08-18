# ECHO HEIST — Progress

Last updated: 2026-08-14

## Current state

The former two-room proof of concept has been replaced by a complete six-chapter neon pixel puzzle-action campaign with a title screen, progressive in-world teaching, authored ending, replay, and chapter select.

Implementation, automated verification, GitHub `main` synchronization, and deployment to the existing Echo Heist Vercel Production project are complete. The preserved public alias is `https://echo-heist-gamma.vercel.app`.

## Shipped gameplay

- 24-second fixed-step recording loop with one replaceable action-replaying echo.
- Responsive acceleration/deceleration, four-way animation, directional pulse, carry/drop, throw, trajectory redirection, and phase dash.
- Deterministic cargo, plates, gates, receiver, sentinel sync window, laser phases, persistent finale nodes, and clean reset boundaries.
- Six chapters:
  1. FIRST CUT — movement, bind, echo-held ALPHA.
  2. DEAD WEIGHT — carry cargo while the echo holds a separate role.
  3. CROSS SIGNAL — replayed pickup/throw plus current-self redirection.
  4. SENTINEL SHIFT — opposite-side current/echo pulse synchronization.
  5. FRACTURE RUN — readable laser cycles, bypass plate, cargo, and dash.
  6. ZERO HOUR — cargo, signal, sentinel, ALPHA, hazard, and final escape.
- Title instructions for desktop and mobile, sound toggle, pause/help, fullscreen, restart, ending statistics, rank, replay, and chapter select.
- Landscape touch controls and a portrait auto-pause/rotation screen so the room and controls are never compressed into an unreadable strip.
- Runtime-synthesized sound cues and original code-rendered player, echo, timeline, trajectory, pulse, gate, receiver, and feedback language.
- First-launch English/Korean selector with Korean localization for every visible UI surface: title, controls, HUD, stage copy, world labels, prompts, feedback, pause, chapter select, ending, rotation screen, and touch actions.

## Art transition

- Runtime now uses one coherent CC0 cyber-facility pixel base plus original ECHO HEIST effects.
- Previous painted visuals and source helpers are preserved under `archive/previous-runtime/` and excluded from Vercel builds.
- No Hollow Knight file, code, character, audio, UI, or map is used.

## Verified locally on 2026-08-14

- `npm.cmd ci`: PASS, 50 packages, 0 vulnerabilities.
- `npm.cmd test -- --run`: PASS, 14/14 Vitest tests.
- `npm.cmd run build`: PASS.
- `npm.cmd run test:e2e`: PASS, 10/10 Playwright tests.
- Real keyboard path through FIRST CUT: PASS.
- Browser-driven carry/drop, echo throw replay, core redirection, dual sentinel pulse, laser failure reset, dash safety, finale opening, ending, replay reset: PASS.
- Desktop 1440×900 and 1024×768 containment, symmetric centering, and no overflow: PASS.
- Mobile portrait auto-pause and 844×390 landscape touch movement: PASS.
- Local browser Vite overlay, page errors, failed same-origin requests, and console errors: none observed.

## Released on 2026-08-14

- Complete-game commit: `8619fd808d899b5814becf8b28f37ecd6e529682`.
- Responsive centering release commit: `99ab1a4316d135c4b45483d1cffefb408a1d569c`.
- Korean localization commit: `981e06714cd56fb19a3f694cb9e652afbe4f9b15`.
- Vercel Production deployment: `dpl_Fbo12msRhd8GU7zFcaWAY84eovEd`, READY.
- Immutable deployment: `https://echo-heist-fhgw3l79o-ai-build3.vercel.app`.
- Public alias: `https://echo-heist-gamma.vercel.app`.
- Public English/Korean selection, Korean title/HUD/tutorial, English reload selection, desktop start, six-chapter metadata, production debug exclusion, Korean portrait guidance, localized landscape touch layout, exact canvas centering, no overflow, and zero browser errors: PASS.

## Human follow-up after release

A fresh player should still complete one uninterrupted blind run to judge subjective pacing against the 15–25 minute target, tutorial wording, throw interception comfort, sentinel wait timing, sound balance, and physical-device touch feel. These are human-experience judgments and are not represented as completed by automation.
