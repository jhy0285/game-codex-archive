# ECHO DEPTHS Progress

Snapshot: 2026-08-27, Asia/Seoul.

## Current state

Chapter 5 now has controller-safe physical overlap from the powered platform to the upper floor, across the Guardian flank seam, and along the final bridge and lower boarding apron. These changes do not fill the center void or connect the separate lower Player and Echo/Core transfer lanes. Camera-facing outer walls are split into lower containment and upper parapets, the doubled upper pillar is gone, and the final door retracts laterally instead of remaining overhead in the quarter-view camera. Its open fact and full 15-second escape begin only after the collider is physically clear.

Local acceptance is current: `npm ci` reports 0 vulnerabilities, Vitest passes 143/143 across 18 files, and the 38-module production build passes. A complete 20-case Playwright run passed 19 cases and identified one touch automation route attempting to walk straight through the occupied receiver; after adding the real west-side sidestep, the affected Chapter 5 desktop and touch routes passed 2/2 in 7.5 minutes. Final upper-flank and open-door captures were inspected.

Source `9dd9e6ca444a42df3ddcd6d144f56b513924746a` is on `origin/main`. Candidate `dpl_GhFLxjcg12jgC2kXYdKh1c3HHko1` passed production smoke 6/6 and direct Chapter 5 desktop/mobile checks, then promoted as Ready production `dpl_Hf9RE2xVSnJETE9ki9kW4h3drFjh`. The public alias serves `index-CAFm-gyQ.js`, passes smoke 6/6, exposes five chapter cards, enters Chapter 5 in both viewports, exposes no debug API, and produced no collected browser errors. The static deployment reported no runtime logs.

The Chapter 3–5 level-design rebuild is complete on `feat/ch3-ch5-level-design-rebuild`, based directly on `origin/main` at `410366f88ff3b935dc3137c161e886e3af523357`. Chapter 3 is now a flat, legible WEST/EAST split with separate Player and Core lanes, a real east-triggered transfer shutter, and a protected catch basin. Chapter 4 is an articulated surveillance gallery with safe entry, LOS cover, a zero-jump walkable ramp, high rear flank, physical trap, and exit. Chapter 5 now uses one recording, one physical Core, one transfer, one powered platform, and one continuous Echo timeline from Core duty to the lower seal before the present Player completes the upper flank and live dual seal.

The camera uses chapter-specific distance, pitch, focus, and mobile framing for Chapters 3–5 while preserving the Chapter 1–2 defaults. It considers raised floors and platforms as occluders, fades only geometry actually between the camera and Player, and applies camera-side perimeter cutaways instead of globally hiding floors. Hidden receiver provenance (`upperThrowArmed`, `core-thrown-down`, downward-velocity history) and the unused second Chapter 5 lift are removed; victory depends on current physical outcomes.

Current Chapter 5 overhaul evidence is PASS: strict Vite production build (38 modules); Vitest 18 files / 142 tests; real desktop Chapter 5 completion 1/1 in 3.0 minutes; real touch-only Chapter 5 completion 1/1 (test body 5.2 minutes, with delayed Windows reporter return). Receiver-gated Guardian dormancy, stable lower-Echo lure hold, vertical contact fairness, 20-second final tape, 15-second final escape, exact sight display, character presentation, and non-colliding route guidance are covered. An additional render-smoke run advanced through its desktop case but its separate mobile result could not be finalized because the Windows runner stopped returning filesystem/reporter output; the stronger mobile full-completion acceptance remains valid. No new asset binary or sibling project changed.

Chapter 5's Guardian is now an animated clone of the already shipped official KayKit Knight instead of the procedural dodecahedron sentry. It stays sealed until the real Core activates `power-receiver`, then prioritizes the live lower-seal Echo while holding the central arena, exposing a lit rear seal and dimming its front shield. The exact active FOV is shown on the floor, the receiver/platform/dual-lane/final-exit relationships have restrained non-colliding cables and beacons, and a Player below the dais is no longer killed through the floor.

The independent `echo-depths-3d` source tree contains a skippable Stage 00 PC orientation room before the five-chapter 3D time-echo campaign, ending, strict TypeScript source, pure-rule and physics tests, KayKit character/animation integration, bilingual HTML/CSS UI, desktop/mobile input, and deterministic browser-facing state API.

The local verification record currently shows:

- strict TypeScript after source recovery: PASS;
- Vite production build: final post-recovery PASS;
- Vitest after the first-descent sensor/gate repair: PASS, 16 files and 77 tests;
- Playwright functional/layout verification: PASS, 9/9 in 2.7 minutes;
- local production-bundle smoke: PASS, 6/6 in 1.4 minutes;
- representative chapter/settings/echo/ending/mobile capture inspection: PASS;
- post-review snapshot, guardian, live-synchronizer, ramp/core-route, sensor, lifecycle, and feedback corrections: strict compiler, unit, production-bundle, and browser checks passed;
- human physical-input and subjective play review: not recorded;
- runtime implementation `0ea2318` and hosted-smoke hardening `4e77423` committed on `main`, with the final release records included in the release push;
- isolated Vercel project, verified candidate, promoted production deployment, public alias, and build-log review: complete.
- PC interaction/layout repair `0c4630a` pushed to `main`; protected candidate `dpl_A97dm31JWoJPN7u8kUvSCGTGjDyW` passed 5/5 in 1.3 minutes and promoted production `dpl_5oyUeBUT7ra13ZAeFeCNWSTbJWhT` passed public smoke 5/5 in 1.1 minutes.
- First-descent sensor/gate follow-up `31884e1`: verified candidate `dpl_F6rWbcdYon6Q9mVUUzaEPvVGeRAT` passed protected smoke 6/6 in 2.3 minutes and promoted production `dpl_76sKrPvgfYcSJCoLUqXAxD8UdbQJ` passed public smoke 6/6 in 2.1 minutes.
- PC follow-up `3a9b0f9` is pushed and remote-head verified. Local validation passed strict TypeScript, Vite build, Vitest 83/83, Playwright 13/13 in 3.3 minutes, local production smoke 6/6 in 44.9 seconds, and Stage 00 1440×900 visual review. Candidate `dpl_8EMLhJqJPs4RAu6mNYfMgCz1cu9S` passed 6/6 in 53.7 seconds; production `dpl_H6tdJdqpqS82QWid7dFpHbgzpzFi` is Ready, the public alias returned HTTP 200, and public smoke passed 6/6 in 1.1 minutes.
- Carry-anchor follow-up `b1d4981` is pushed and remote-head verified. It separates the visible hand-side cargo mesh from its authored drop collider. Strict TypeScript, Vitest 84/84, Playwright 13/13 in 3.0 minutes, and local smoke 6/6 in 50.4 seconds pass; candidate `dpl_3xxaY6kiZowbhANr9D6NkuHam2RZ` passed 6/6 in 1.2 minutes and promoted production `dpl_FJYteX8jJN6tRvSqiKnkyGfwJ1Vx` returned HTTP 200 and passed 6/6 in 1.3 minutes.
- Late-chapter clearability source `6046e00` is pushed and verified: Chapter 3 has a physical west-to-east route and catchable echo throw, Chapter 4's trap begins outside the watcher overlap and lure holds a readable strike lane, and Chapter 5's powered echo-held lower seal reliably lures the guardian. Strict build, Vitest 88/88, Playwright 13/13 in 3.1 minutes, targeted Chapter 2 browser completion in 54.2 seconds, and Chapter 3–5 screenshot review pass. Candidate `dpl_3AN2dPKpusX5waCJnAMoTv7i1Wc2` passed 6/6 in 56.5 seconds; production `dpl_DT6wvejwq8Txz1BtMTpfvRaiP17s` is Ready, the alias returned HTTP 200, and public smoke passed 6/6 in 56.7 seconds.
- Pressure-scanner presentation source `6b17461` is pushed and released: the Chapter 1 echo plate, Chapter 2 cargo plate, and Chapter 5 lower seal use low-profile security-scanner assemblies rather than flat circular buttons. Sensor bounds and puzzle rules remain intact; the panel and four beacons report active state. Build, Vitest 89/89, Playwright 13/13, and PC Chapter 1 capture review pass. Candidate `dpl_8uP6jsXu17BHB1WUo79ipXe3H7HR` passed 6/6 in 1.1 minutes; production `dpl_2EoEkQKZQmJmn91VJnFtFHcuwh9y` is Ready, the alias returned HTTP 200, and public smoke passed 6/6 in 54.4 seconds.
- Industrial device presentation source `0c9b60e` is pushed and released: all Stage 00–Chapter 5 levers, doors, moving decks, cargo, cores, traps, exits, receivers, enemies, and pillars now use layered industrial meshes with chapter accent lighting. Existing Rapier bodies, sensors, coordinates, and authored routes are unchanged. Build, Vitest 90/90, PC budget/all-chapter capture review, and Playwright 13/13 in 3.9 minutes pass. Candidate `dpl_24QfQ97NV5ZfJSnvNe7pJ97pc6vz` passed 6/6 in 2.0 minutes; production `dpl_GmnucrocKXFNKB5qqFarh4rdV8Df` is Ready, the alias returned HTTP 200, and public smoke passed 6/6 in 1.8 minutes.

The prior production release record remains valid for its source commit. The PC interaction/layout repair is released on the current production alias; human feel review remains intentionally separate.

## Implemented game

- Three.js quarter-view WebGL dungeon with HTML/CSS loading, language, title, chapter select, HUD, pause, completion, ending, rotation, and error layers.
- Rapier 3D world with a capsule kinematic controller, stairs, slopes, gravity, jump, landing, dash, dynamic cargo/core bodies, fixed sensors enabled for kinematic overlap, elevators, platforms, doors, traps, and enemies.
- 60 Hz echo input tape with full motor/world record-start snapshots, present-to-echo ownership transfer, quantized movement/facing/actions, one replacement echo, shared simulation path, terminal interaction hold, route feedback, and non-colliding actors.
- Five authored vertical chapters: tutorial plate, counterweight elevator, cross-height core/bridge, watcher cover/knockback trap, and core-powered guardian/dual-seal timed escape.
- Ending with elapsed time, echo count, failure count, restart count, chapters cleared, rank, full replay, and chapter selection.
- Korean and English UI catalogs with completeness tests.
- Keyboard, mouse, virtual stick, touch camera, six touch actions, HUD pause/sound/fullscreen, pointer capture, and safe release.
- Camera damping, look-ahead, collision shortening, obstruction fade, smoothed character facing, effects, generated audio, mobile quality limits, resize/orientation handling, and WebGL error handling.
- Nearest-interactable outline and localized prompt, record/release temporal pulses, route feedback, and ballistic throw preview.
- Full runtime rebuild/disposal path with a stale-generation guard, actor/device/enemy-target cleanup, and deterministic test hooks.
- Stage 00 orientation drills and full bilingual Settings control reference; carried cargo follows the active camera heading with a short visual settle.
- PC renderer cost guardrails: `1.5` maximum pixel ratio, 1536px desktop shadows, and 30 Hz obstruction sampling; browser regression bounds 1440×900 calls and triangles.

## Assets

- Four official free KayKit packs acquired from their author, Kay Lousberg, under CC0 1.0.
- Exact production selection: 50 files, 5,703,863 bytes.
- Current provenance audit: 50/50 length matches and 50/50 SHA-256 matches.
- GLTFLoader loads the Knight, five animation libraries, and selected environment/resource models.
- AnimationMixer drives Idle, Walk, Run, Jump, Fall, Land, Carry, Throw, Interact, Attack, Dash, Hit, and Defeat with crossfades and locomotion speed scaling.
- The two shared 1024×1024 source color maps are optimized to 512×512 with bicubic resampling; the runtime PNGs total 118,983 bytes.
- No source archive is included in `public/`, and no Hollow Knight asset or code is used.

## Local verification complete

The browser pass checked first-run language flow, real input, echo recording/replay, every chapter's required facts, ending/restart, fullscreen rejection, KayKit HTTP loading and active animation, four target viewports, portrait guidance, landscape touch, document bounds, visible 3D output, and runtime error/request collection. The functional run and representative visual capture review both pass locally.

Runtime review corrections preserve the mutable motor/world snapshot, check guardian contact with the original distance, and require the current lower-plate plus upper-lever hold throughout the final passage. The authored ramp/downward core routes, player/echo interaction outlines, carry animation, allocation-free throw preview, fixed-sensor collision types, trap/core-loss feedback, three-ray enemy clearance, stale target cleanup, smoothed facing, temporal pulses, rebuild generation protection, audio/input reset, and actor-owned asset cleanup are connected. The PC repair also makes `E` interaction prompt-matched and unambiguous, confirms character blocking against solids and cargo, and replaces repeated non-physical set dressing with authored solid dressing. The first-descent follow-up excludes sensor bodies from capsule movement, preserves sensor overlap, and covers the real keyboard lever → echo plate → exit completion route. Strict TypeScript, 77 tests, the final build, Playwright 9/9, local production smoke 6/6, protected candidate smoke 6/6, and public production smoke 6/6 pass.

## Recovery record

During late runtime hardening, the system volume reached zero free bytes and failed patch writes reduced `src/world/DungeonWorld.ts` and `src/physics/RapierWorld.ts` to zero bytes. File writes were frozen, space was reclaimed, the successful local Codex patch history was used to reconstruct both sources, and the intended changes were reapplied. The recovered tree now passes strict TypeScript, Vitest 72/72, the final build, and both local browser suites.

## Human-review boundary

A person still needs to judge physical-keyboard feel, mouse comfort, real-device multi-touch reach and drift, camera and motion comfort, jump/dash/attack/catch feel, puzzle discovery, watcher/guardian fairness, pacing, difficulty, bilingual nuance, animation polish, audio balance, and fun. Automated state and screenshot checks do not establish these qualities.

## Release boundary

The required deployment target is a new Vercel project named `echo-depths-3d` with Root Directory `echo-depths-3d`. Existing sibling projects and aliases are protected, especially `echo-heist` and `https://echo-heist-gamma.vercel.app`.

The project `echo-depths-3d` (`prj_s42Kw6wf1BRmonXJKpoyE29m1G9Z`) uses Root Directory `echo-depths-3d`. Candidate `dpl_6PkCsMr1xN8nRTReziHgJP45LZDd` passed 5/5 before promotion; production `dpl_9iieCJ7GovQ4yeHH8rDzT5SxCwYP` passed 5/5 at `https://echo-depths-3d.vercel.app`. The PC repair release from `0c4630a` then verified candidate `dpl_A97dm31JWoJPN7u8kUvSCGTGjDyW` (5/5 in 1.3 minutes) and production `dpl_5oyUeBUT7ra13ZAeFeCNWSTbJWhT` (public 5/5 in 1.1 minutes) on the same alias. Protected sibling projects and aliases were unchanged.

## Completion handoff

The code, verification record, GitHub push, isolated Vercel deployment, production alias, and public smoke are complete. Remaining observations are human-only physical control feel, real-device touch comfort, puzzle discovery, difficulty, bilingual nuance, animation/audio polish, and fun; mobile refinement is explicitly deferred rather than expanded during this closeout.

The unrelated intake modification at `echo-heist/package-lock.json` remains outside this project's staging scope.

## 2026-08-15 — First-two-stage completion repair

- Source `3612837e6ff74eacc9d8457ae9d61b75f1b23445` closes the Chapter 1 closed-gate jump bypass, removes the stray stair bar, and keeps fixed pressure/lever/exit sensors live when a recording snapshot is restored.
- Chapter 2 now requires the player to board the echo-powered lift, arrives at a non-intersecting upper dock, and permits a carried crate to fall through the open edge onto the required lower plate.
- PC validation passed: strict Vite build, 16 Vitest files / 81 tests, Playwright 11/11 in 2.6 minutes, and local production smoke 6/6 in 40.6 seconds.
- Protected candidate `dpl_B41ZFUiE1u4TKGg3PgVm1v8H4GtE` passed 6/6 in 1.0 minute. Promoted production `dpl_GFqr3mn3kSzE4qb9i3JSPDrSE6L2` is Ready; `https://echo-depths-3d.vercel.app` returned HTTP 200 and passed public smoke 6/6 in 52.7 seconds.
- The scope is desktop PC only; mobile behavior was not extended or validated by this repair.

## 2026-08-16 — PC orientation, carry, and render-cost follow-up

- Stage 00 now blocks campaign start behind six optional but visible PC drills: movement, camera, jump, console interaction, crate carry, and echo release. It is safe, skippable, and excluded from campaign statistics.
- Settings now exposes the complete desktop keyboard/mouse map in Korean and English. Carry uses camera heading for desired-direction placement and smoothly settles the visual cargo target.
- The renderer caps pixel density at `1.5`, uses 1536px desktop shadows, and limits obstruction raycast/fade updates to 30 Hz. The 1440×900 browser regression remains below 300 calls and 300,000 triangles.
- Source `3a9b0f9` is pushed to `main`; local evidence is complete: strict TypeScript, 83 Vitest checks, Vite build, 13 Playwright stories, 6 production-bundle smoke checks, and a tutorial screenshot review. Candidate `dpl_8EMLhJqJPs4RAu6mNYfMgCz1cu9S` passed 6/6 in 53.7 seconds, then promoted production `dpl_H6tdJdqpqS82QWid7dFpHbgzpzFi` returned HTTP 200 and passed public smoke 6/6 in 1.1 minutes.
- Source `b1d4981` separates the hand-side visual cargo mesh from the unchanged authored carry collider. A 1.02-unit forward-gap regression covers movement and a 180-degree camera turn; Stage 00's held-crate capture was visually reviewed. Candidate `dpl_3xxaY6kiZowbhANr9D6NkuHam2RZ` passed 6/6 in 1.2 minutes; promoted production `dpl_FJYteX8jJN6tRvSqiKnkyGfwJ1Vx` returned HTTP 200 and passed public smoke 6/6 in 1.3 minutes.

## 2026-08-17 — Late-chapter clearability follow-up

- Chapter 3's upper-west shelf now has a climbable descent to the lower catch route. The aligned bridge no longer contributes a kinematic side wall, and the lower walk reaches the east receiver and exit floor.
- Chapter 4's echo lure holds the watcher in a readable strike lane; the moved trap no longer defeats the watcher before the player attacks from the upper flank.
- Chapter 5 now establishes guardian attention when the powered echo holds `lower-seal`, matching the authored cooperative route without a hidden sight-cone prerequisite.
- Source `6046e00` passes strict TypeScript/Vite, 88 Vitest checks, the 13-story Playwright suite, targeted real Chapter 2 browser completion, and local Chapter 3–5 visual review. No KayKit asset or sibling project changed. Candidate `dpl_3AN2dPKpusX5waCJnAMoTv7i1Wc2` passed 6/6 in 56.5 seconds, and production `dpl_DT6wvejwq8Txz1BtMTpfvRaiP17s` is Ready with public HTTP 200 and smoke 6/6 in 56.7 seconds.

## 2026-08-17 — PC movement and camera follow-up

- Source `a7e88b1` keeps the deterministic 60 Hz motor/echo contract and authored speed caps while separating responsive normal acceleration, softer release deceleration, and strong reversal braking.
- The PC camera now applies vertical drag through a clamped, damped orbit. Its obstruction target is sampled at 30 Hz, then retained and smoothed every render frame so close walls do not produce a 30 Hz distance pulse. Pointer deltas are capped per fixed tick to reject accidental jumps.
- Local validation passed `npm ci` with 0 vulnerabilities, strict Vite build, 16 files / 93 Vitest tests, targeted real mouse-to-keyboard input, all 14 Playwright stories in 3.2 minutes, and PC capture review. Candidate `dpl_2mR1KvPWjb2tFffvbtsmyyvxEDEA` passed 6/6 in 1.1 minutes; production `dpl_6xtAgui3NMukXpfwJzCe3B3Rz4bV` is Ready, returned public HTTP 200, and passed smoke 6/6 in 54.5 seconds.

## 2026-08-18 — Device motion audio follow-up

- Source `6555825` adds synthesized device-state audio without adding binary assets: dedicated lever/carry/scanner/door/receiver cues plus one low mechanical loop per actively moving elevator, platform, or bridge.
- `DungeonWorld` queues only real state-transition events. `GameApp` drains them on both sides of the physics step; events cannot alter Rapier state, snapshots, or the recorded echo frame contract.
- Local evidence passed `npm ci` with 0 vulnerabilities, strict Vite build, 16 files / 96 Vitest tests, 14 Playwright stories in 3.3 minutes, and local production smoke 6/6 in 1.1 minutes. The authenticated Vercel recovery then verified candidate `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz` with smoke 6/6 in 1.1 minutes and promoted production `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC`; the public alias returned HTTP 200 and final smoke passed 6/6 in 1.2 minutes.

## 2026-08-18 — Temporary all-chapter access

- Source `b2e687a` makes Chapters 1–5 immediately selectable before the player has cleared any stage. Stage 00 remains the separate Start-flow orientation room.
- `STARTING_UNLOCKED_THROUGH` owns the temporary policy and is set to `5`; setting it back to `1` will restore the former sequential unlock flow without changing UI or completion logic.
- Strict Vite build, 16 files / 96 Vitest tests, the focused fresh Chapter Select assertion, and all 15 Playwright stories pass. The source is included in candidate `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz` and promoted production `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC`; the public alias returned HTTP 200 and final smoke passed 6/6 in 1.2 minutes.


## 2026-08-18 -- Chapter 3 descent fix

The split-atrium descent was a thin tilted box hidden inside the upper floor box and floating above atrium-lower, so the player had no walkable path from the upper shelf to the lower catch zone. The fix in src/levels/layouts.ts adds three descent-step floor pieces south of the upper shelf (top surfaces y=2.0, y=1.0, y=0.2) and nudges memory-core east so its throw arc naturally lands in the catch zone. Local build PASS, Vitest 96/96, Playwright 15/15 in 3.6 minutes. No KayKit asset or sibling project changed.


## 2026-08-19 -- Plate feedback overhaul (chapter 1 echo-plate)

The user requested two things: (1) reframe the chapter 1 clear condition so that any physical body on the echo-plate (player, echo, crate, or core) is enough, rather than requiring echo specifically; (2) make the plate visual feedback unmistakable (full color change plus audio).

  - Fact gate in updatePlates relaxed: any actor on the echo-plate adds the fact, mirroring PLATE_OCCUPANT_KINDS. The press/release path now adds and removes the fact so a departed actor closes the door again.
  - canExit switched from deviceHeldBy(echo-plate, echo) to facts.has(echo-plate) so the design is consistent and the chapter is clearable by any actor.
  - Visually: the SecurityScannerPanel and SecurityScannerBeacons materials are cloned per-plate and lerp between a near-black navy (0x141820) and a bright white-cyan (0xeaffff) based on the device state, alongside the existing scale dip and emissive boost. The active color is distinct from any chapter accent so the state change is obvious.
  - Local evidence: 96/96 Vitest pass, including the door-close-on-echo-departure regression. A dedicated Playwright test (tests/player-walks-plate.spec.ts) confirms both the actor-agnostic fact addition and the visible color shift via the canvas.
  - Production redeploy via vercel redeploy; the canonical URL https://echo-depths-3d.vercel.app is updated and the user can confirm the new behavior from any browser, including a phone on a remote session.

## 2026-08-25 — Chapter 4–5 temporal mastery

- Chapter 4 now requires an Echo that actually becomes visible after the physical bell stimulus, present-player cover use, a real upper rear flank, and physical knockback into the trap. The door cannot open from a scripted fact or an unknocked trap overlap.
- Chapter 5 now uses the same single Core through a first Echo carry/throw recording and a replacement lower-seal recording. The present Player rides the Core-powered platform, waits for actual Guardian-to-Echo visibility, lands the rear/high strike, and holds the upper seal simultaneously with the Echo to release the final door.
- Snapshot restoration covers every new attention field. Frontal/low attacks, early exits, fake receiver interaction, duplicate Core state, direct lower-seal target assignment, and non-simultaneous final seals are covered negatively.
- English/Korean objectives remain broad enough to preserve discovery. Outcome requirements are minimal and physical: Watcher trapped; Core received, Guardian defeated, final door released.
- Local final gates pass: build, Vitest 126/126, Playwright 25/25, and capture rerun 4/4. GitHub push/PR state is recorded after remote delivery; Vercel remains intentionally untouched.

## 2026-08-25 — One-way portal readability follow-up

The right-side Chapter 3 one-way object was visually reading as a small, ambiguous purple block even though its collision contract was already correct. Chapters 3 and 5 now use enlarged translucent portal frames: cyan arrows on top identify the only pass direction (live Player WEST → EAST), while red bars and a lock sigil identify the EAST-side no-return face. Echoes and physical Cores remain blocked on both directions. The HUD hints now state that rule explicitly in Korean and English. Local verification passed 18 Vitest files / 131 tests, strict Vite build, Chapter 3 visual capture, and empty browser error collection.

## 2026-08-25 — Chapter 3 receiver-gated return door

The Chapter 3 return route is now a distinct middle gate, not the red reverse face of `atrium-one-way`. It is closed until the physical `memory-core` has activated `core-receiver`; then its cyan field, light, and retracted panels indicate that only the live Player may cross. Echo and Core collision remains physical even while the Player-only route is visually open. The gate derives each frame and on snapshot restore from the receiver's active device state, so recording rewind/restart cannot retain a stale unlock. Targeted receiver/Player/Echo/Core/same-Core-transfer tests and the strict production build passed.

## 2026-08-25 — Chapter 3 transfer shutter correction

The east/north transfer shutter is now explicitly Core-only. Its full-span mechanical shutter blocks the physical Core until the Player is east, then retracts for the Echo's same-Core delivery. A separate cyan actor seal remains raised at all times, so neither Player nor Echo can traverse the north lane or bypass the receiver-gated return door. The rule is Chapter 3-specific and does not change Chapter 5 shutter behavior. Targeted Core/Player/Echo physics tests, production build, and a local Chapter 3 browser capture passed without console errors.

## 2026-08-26 — Chapter 4 Watcher character pass

The Chapter 4 Watcher is now the hooded Rogue from the same official KayKit Adventurers 2.0 series already used by the Player. It uses the existing Rig_Medium animations and is visually distinct from both the Player and the unchanged Chapter 5 Guardian. Its surveillance display is no longer a decorative approximation: the ground sector is generated from the same live range and FOV helpers used by target detection, with cyan patrol, amber search, red acquisition, a pulsing sensor/status ring, and a target beam gated by actual FOV plus Rapier line of sight. Local targeted tests, production build, real Chapter 4 completion, desktop rendering, portrait guidance, mobile landscape rendering, and browser error collection pass.

Production deployment `dpl_8AkqppynEF8urDfsXD6VSLuPfubD` is Ready at `https://echo-depths-playtest.vercel.app`. The stable alias and new model return HTTP 200, desktop/mobile Chapter 4 renders pass, production debug API is absent, and the browser error/console collectors are empty.

## 2026-08-26 — Chapter 4 Watcher pursuit and trap clarity

- Corrected the generic platform updater so enemy `to` patrol endpoints are no longer interpreted as moving-platform transforms and reset every frame.
- The Watcher now visibly patrols both directions on a line separated from the spike bed, gives a short warning, chases the Player at a fair sub-player speed, and kills only on real contact.
- A real visible Echo locks attention and draws the Watcher to the spike edge. The Watcher stops there facing the Echo, creating a stable high/rear knockback window without destroying the Echo.
- The spike bed is the Chapter 4 finisher, not decoration: a pulsing ring/beacon/light marks it, only a knocked Watcher intersection opens the gallery, and bilingual objectives explain the action.
- Local evidence passes: 64 targeted unit checks, strict build, desktop Chapter 4 completion 1/1, touch-only Chapter 4 completion 1/1, and direct desktop render/console inspection.
- Pushed source `65bcbfe25a17e29dd0c6c5bc974f30731b18c4ef` and deployed isolated Vercel production `dpl_CnusTWnFjMNBrWYt9WnGe1RHjrvT`. The stable playtest alias serves the new bundle and passes public gameplay, localization, mobile, fullscreen, runtime-asset, console, and production-debug checks.

## 2026-08-27 — Chapter 4 continuous gallery floor

- Added a continuous muted-cyan foundation across the Chapter 4 room's full inner-wall footprint. The original colored route slabs remain raised by 0.03 units, so the intended safe/Echo/patrol/ramp/high-flank/exit language remains visible without interior fall holes.
- Preserved the complete Watcher puzzle: real bell stimulus, Echo target acquisition, cover, no-jump ramp, high/rear Player strike, physical knockback into the spikes, released door, and exit.
- Added direct motor coverage for both former fall regions. `npm ci` reports 0 vulnerabilities; Vitest passes 143/143; strict production build passes; focused touch/desktop Chapter 4 completion passes; and full Playwright passes 20/20 in 17.7 minutes.
- Current desktop and mobile captures were inspected. The floor reads continuously, the Watcher/trap/ramp remain visible, and no black frame, missing model, clipped HUD, or fatal browser error was observed.
- Source `29b2c461fd1fcbe6c21fc352929aa4b2b074981d` is pushed to `origin/main`. Candidate `dpl_7mTPt7rKgsLs1fYB6gynK28FLhtn` passed 6/6 in 1.2 minutes; promoted production `dpl_35J6WSrWsaVW1PnvgzXpjhrJDbjd` is Ready, and `https://echo-depths-3d.vercel.app` passed public smoke 6/6 in 57.4 seconds. Direct public Chapter 4 entry loads the matching bundle with KayKit active, no debug API, and no page/console errors.



## 2026-08-28 — Chapter 3–5 deep audit and Watcher navigation

- Reproduced a Chapter 4 chase stall where the Watcher's center LOS remained clear around `gallery-cover-center` but one body-width movement ray touched the wall; the direct-only mover then retried the same blocked vector forever.
- Added deterministic obstacle steering for chase, Echo-lure approach, and last-known-position investigation. Longer clearance probes choose a useful side arc, while patrol and physical strike knockback remain straight and deterministic.
- Added both world-level and real-browser regressions for the exact cover corner. The browser capture shows the Watcher rounding the obstacle toward the live Player with no page/console errors.
- Deep Chapter 3–5 acceptance found no further reproducible defect: Chapter 3 same-Core transfer and every shortcut rejection, Chapter 4 desktop/touch lure/trap completion, and Chapter 5 desktop/touch one-Core/platform/Guardian/live-seal completion all pass.
- Final local gates: `npm ci` 0 vulnerabilities; Vitest 144/144; strict production build; focused Chapter 3–5 Playwright 13/13; render smoke 2/2; full Playwright 21/21 in 20.5 minutes.
