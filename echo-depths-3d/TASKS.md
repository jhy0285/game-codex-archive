# ECHO DEPTHS Delivery Ledger

Snapshot: 2026-08-25, Asia/Seoul.

This ledger separates implementation present in the source tree from verification, external release, and human judgment. A source-complete row does not by itself mean the game is production-released.

## Implementation present

| Area | State | Evidence |
| --- | --- | --- |
| Independent project scaffold | Present | Vite, strict TypeScript, Three.js, Rapier 3D, Vitest, Playwright configuration, no React |
| 3D application shell | Present | Three.js WebGL canvas plus separate HTML/CSS screens, HUD, touch layer, loading, errors, pause, ending |
| Character physics | Present | Rapier capsule kinematic controller, autostep, slope rules, ground snap, gravity, jump buffering, coyote time, landing, dash |
| Camera | Present | Chapter-specific Chapter 3–5 framing, mobile widening, east-landmark focus, camera-side perimeter cutaway, raised-floor/platform obstruction handling, orbit preservation across rewind, damping, and shake; Chapters 1–2 retain their original profile |
| Deterministic echo | Present | Full motor/world record-start snapshot plus 60 Hz quantized input/action and transform/facing tape, collision-aware kinematic replay, shared world action resolver, ownership transfer to one replacement echo, terminal held use |
| Dynamic interactions | Present | Crate and Core carry/drop/throw with camera-heading placement, ballistic preview, physical gates/shutters, direction-aware player passage, pressure plates, levers, collision-driven receivers, doors, fixed-sensor/kinematic overlap configuration, and prompt-matched interaction range |
| Vertical machinery | Present | Chapter 2 counterweight elevator, Chapter 4 walkable ramp, and Chapter 5's single receiver-powered boarding platform; no redundant final elevator or required precision-jump chain |
| Enemy puzzles | Present | Deterministic patrol/alert/investigate/chase/recovery, live Player/Echo FOV and Rapier LOS through cover, world-space bell stimulus, visible-target switching, rear/high strike validation, physical knockback-only trap defeat, Guardian positional seal rule |
| Orientation and five chapters | Present | Skippable Stage 00 PC tutorial, five campaign layouts, chapter transitions, final 35-second escape, stats, rank, replay, chapter selection |
| Character presentation | Present | Official KayKit character and five clip libraries loaded through GLTFLoader, 13 AnimationMixer states with crossfades, locomotion speed scaling, and smoothed visual yaw |
| Asset fallback | Present | Code-built animated character is selected when model loading or full clip mapping fails; runtime reports asset status |
| Localization | Present | Korean and English runtime catalogs and localized chapter/UI/failure/ending/orientation copy |
| Desktop and mobile input | Present | Keyboard, mouse, virtual stick, camera drag, multi-touch actions, pointer capture, release safety, 48 px minimum targets |
| Runtime resilience | Present | `1.5` pixel-ratio cap, 30 Hz camera-obstruction sampling, desktop 1536px shadows, resize/orientation handling, fullscreen rejection safety, WebGL loss screen, rebuild-generation guard, and reload-on-restore |
| Reset and teardown | Present | Chapter/campaign rebuild, stale actor-target cleanup, physics/controller/animation/world/line disposal, input clearing, application destroy path |
| Interaction feedback | Present | Localized proximity prompt, cyan BoxHelper selection outline, temporal record pulses, route line, trajectory preview, device/enemy effects |
| Test-facing state | Present | `render_game_to_text`, deterministic `advanceTime`, and development-only constrained debug API |
| Asset provenance | Present | Four official archives, copied licenses, exact 50-file selection, SHA-256 ledger, manifest, credits |

## Verification gates

| Gate | State at snapshot | Recorded result |
| --- | --- | --- |
| Strict TypeScript | Passed after source recovery | The recovered tree passes the strict compiler check |
| Production build | Passed | Final recovered-tree build passes; 38 modules transformed |
| Vitest | Passed after PC repair | 16 test files, 75 tests passed, including real Rapier overlap, actor/solid and actor/cargo collision, prompt/action range, ramp, puzzle-route, reset, audio, asset, and UI regressions |
| Playwright functional suite | Passed | 8/8 scenarios passed in 4.3 minutes, including a real desktop `E` interaction at the visible prompt |
| Local visual browser inspection | Passed representative review | Settings, echo, Chapters 1–5, ending, portrait, and landscape captures show no black frame, missing actor/model, clipped primary UI, or unreadable copy |
| Console, page, request failure review | Passed locally | Automatic browser collectors reported no unhandled page, console, or request failures |
| Chapter 5 integrated timeline | Corrected and covered | One recording transfers one canonical Core and ends on the lower seal; the present Player delivers that same Core, rides the only platform, exploits actual Guardian LOS/rear exposure, and holds the upper seal concurrently to release the final door |
| Chapter 4–5 temporal-mastery unit/physics gate | Passed locally | 17 Vitest files, 126/126; covers actual LOS/cover, attention lifecycle, snapshot restoration, strike rejection, physical trap entry, one Core, support motion, receiver, and live seals |
| Chapter 4–5 desktop/mobile browser gate | Passed locally | Full Playwright 25/25 in 24.6 minutes; focused success-capture rerun 4/4 in 6.9 minutes; keyboard-only desktop and touch-only mobile solutions |
| Candidate-deployment browser check | Passed | 5/5 in 59.7 seconds against the verified candidate |
| Production-URL browser check | Passed | 5/5 in about 1.1 minutes against `https://echo-depths-3d.vercel.app` |
| PC-repair candidate browser check | Passed | Protected candidate `dpl_A97dm31JWoJPN7u8kUvSCGTGjDyW` passed 5/5 in 1.3 minutes, including the desktop `E` path |
| PC-repair production browser check | Passed | Promoted production `dpl_5oyUeBUT7ra13ZAeFeCNWSTbJWhT` passed public smoke 5/5 in 1.1 minutes |
| First-descent sensor/gate regression | Passed locally | PC keyboard route now proves lever latch, live echo-plate overlap, opened gate, exit `E`, and chapter completion |
| PC orientation/carry/performance regression | Passed locally | Stage 00 and Settings controls, camera-heading hand carry, 1440×900 render budget, Vitest 84/84, Playwright 13/13, and local production smoke 6/6 |
| Late-chapter clearability regression | Passed locally | Chapter 2 browser completion plus real Chapter 3 core/bridge, Chapter 4 lure/trap, and Chapter 5 core/guardian/dual-seal/exit chains; Vitest 88/88 and Playwright 13/13 |

## Release records

| Record | Current fact |
| --- | --- |
| Runtime implementation head | `0ea2318872b14876fcb4e15a974d48ea586709e5` |
| Hosted-smoke hardening | `4e77423fe378ce5d5c95b48d29933386bd26f5b0` |
| GitHub main push | Pushed to `origin/main`; remote head verified after the final release push |
| Vercel project | `echo-depths-3d`, ID `prj_s42Kw6wf1BRmonXJKpoyE29m1G9Z`, Root Directory `echo-depths-3d` |
| Candidate deployment | `dpl_6PkCsMr1xN8nRTReziHgJP45LZDd`; candidate smoke 5/5 |
| Production deployment | `dpl_9iieCJ7GovQ4yeHH8rDzT5SxCwYP`; alias `https://echo-depths-3d.vercel.app` |
| Public-site validation | HTTP 200 plus production smoke 5/5; no collected page, console, or first-party request errors |
| PC-repair source head | `0c4630afc9bf35f7874ab321f4050050128962fd`; pushed to `origin/main` and remote head verified |
| PC-repair candidate | `dpl_A97dm31JWoJPN7u8kUvSCGTGjDyW`; protected smoke 5/5 in 1.3 minutes |
| PC-repair production | `dpl_5oyUeBUT7ra13ZAeFeCNWSTbJWhT`; public alias `https://echo-depths-3d.vercel.app`, smoke 5/5 in 1.1 minutes |
| First-descent sensor/gate source | `31884e12f602ff9c1773881d6766d1768ce6a742`; pushed to `origin/main` and remote head verified |
| First-descent candidate | `dpl_F6rWbcdYon6Q9mVUUzaEPvVGeRAT`; protected smoke 6/6 in 2.3 minutes |
| First-descent production | `dpl_76sKrPvgfYcSJCoLUqXAxD8UdbQJ`; public alias `https://echo-depths-3d.vercel.app`, smoke 6/6 in 2.1 minutes |
| PC-orientation source | `3a9b0f9add8570c7271e2f41546e379e8a5f84b3`; pushed to `origin/main` and remote head verified |
| PC-orientation candidate | `dpl_8EMLhJqJPs4RAu6mNYfMgCz1cu9S`; smoke 6/6 in 53.7 seconds |
| PC-orientation production | `dpl_H6tdJdqpqS82QWid7dFpHbgzpzFi`; public alias `https://echo-depths-3d.vercel.app`, HTTP 200 and smoke 6/6 in 1.1 minutes |
| Carry-anchor source | `b1d49811ba0361a8816f69e73f553d9fd022a696`; pushed to `origin/main` and remote head verified |
| Carry-anchor candidate | `dpl_3xxaY6kiZowbhANr9D6NkuHam2RZ`; smoke 6/6 in 1.2 minutes |
| Carry-anchor production | `dpl_FJYteX8jJN6tRvSqiKnkyGfwJ1Vx`; public alias `https://echo-depths-3d.vercel.app`, HTTP 200 and smoke 6/6 in 1.3 minutes |
| Pressure-scanner source | `6b17461598bc2c6999265dcb0b9b57cef2dfdb5b`; pushed to `origin/main` with remote-head verification |
| Pressure-scanner candidate | `dpl_8uP6jsXu17BHB1WUo79ipXe3H7HR`; smoke 6/6 in 1.1 minutes |
| Pressure-scanner production | `dpl_2EoEkQKZQmJmn91VJnFtFHcuwh9y`; public alias `https://echo-depths-3d.vercel.app`, HTTP 200 and smoke 6/6 in 54.4 seconds |
| Industrial-device source | `0c9b60e522d38c7dd880d19efd9f87dc2ef2addf`; pushed to `origin/main` with remote-head verification |
| Industrial-device candidate | `dpl_24QfQ97NV5ZfJSnvNe7pJ97pc6vz`; smoke 6/6 in 2.0 minutes |
| Industrial-device production | `dpl_GmnucrocKXFNKB5qqFarh4rdV8Df`; public alias `https://echo-depths-3d.vercel.app`, HTTP 200 and smoke 6/6 in 1.8 minutes |

Exact Git and Vercel evidence is synchronized in `DEPLOYMENT.md`, `TEST.md`, `CODEX_LOG.md`, and `progress.md`.

## Runtime review corrections incorporated

- `EchoSnapshot` combines player motor state with facts, devices, dynamics, carry/body ownership, receiver, enemy target visibility/last-known and stimulus positions/attention timers, moving-platform progress, and timer state.
- Snapshot restoration transfers past player-held device and carried-object ownership to the echo.
- Guardian contact now checks the original player distance before normalizing movement.
- Chapter 5 lower and upper seal facts follow current echo occupancy and current player hold; releasing either device removes its live fact.
- Final-door release is latched only after the live Echo lower-seal occupancy and Player upper-seal hold coexist with the received Core and defeated Guardian; the objective model records the released outcome without requiring internal solution-history facts.
- Carry uses the Carry animation after one-shot actions finish, throw trajectory displays while held and launches on release, and a press/release edge preserves a fast throw tap.
- Fixed gameplay sensors enable all Rapier collision types, and a real-world regression proves a kinematic actor overlaps a fixed sensor.
- Trap outcomes use sensor intersections; enemy patrol, chase, and knockback displacement checks three parallel wall/door rays before movement; stale actor targets are cleared; enemies turn toward travel or targets; actor asset cleanup has isolated ownership.
- The nearest-interactable outline, record/release temporal pulses, smoothed actor facing, and asynchronous rebuild generation guard are connected.
- First-two-stage completion repair passes strict TypeScript, all 81 tests, the final build, Playwright 11/11, local production smoke 6/6, protected candidate smoke 6/6, and public production smoke 6/6. The verified candidate is promoted and recorded.
- The PC follow-up adds a non-campaign orientation stage, complete Settings controls, camera-heading carry placement, and bounded renderer work; strict TypeScript, 83 unit checks, 13 browser stories, and 6 production-bundle smoke checks pass locally before deployment.

## Browser verification scope completed locally

- First-run language choice and persistence in Korean and English.
- Start screen, controls disclosure, sound, fullscreen, chapter selection, and sequential unlock behavior.
- Real keyboard movement, camera, jump, interaction, attack, throw, dash, and echo creation.
- Each chapter's world-fact solution and the final ending transition.
- Complete campaign replay and chapter restart state reset.
- Asset status `kaykit`, first-party model responses, and visible animated player/echo.
- Portrait guidance at `390x844` and landscape touch at `844x390`.
- Layouts at `1024x768` and `1440x900`.
- Document bounds, HUD clipping, readable text, black-frame detection, console errors, page errors, and failed requests.
- Safe behavior when fullscreen or orientation lock is rejected.

## Human-review scope

The following judgments require a person and are not assigned an automated pass:

- physical keyboard and mouse feel;
- real phone/tablet finger reach, edge drift, and simultaneous-touch comfort;
- camera comfort and motion sensitivity;
- jump, acceleration, landing, dash, attack, catch, and throw feel;
- discovery of each solution without reading this ledger;
- fairness and readability of watcher and guardian behavior;
- bilingual nuance and readability on physical displays;
- animation transitions, foot cadence, visual effects, and audio balance;
- subjective difficulty, pacing, satisfaction, and fun.

## Repository guard

The protected siblings `404-not-found`, `boss-forge`, `echo-heist`, `patch-run`, and `hollow knight` remain outside this delivery. Their Vercel projects and aliases are not release targets for ECHO DEPTHS. A pre-existing `echo-heist/package-lock.json` worktree change was visible at intake and is not part of this game's staging scope.

## 2026-08-15 — First two stages completion

- [x] Close the Chapter 1 closed-door jump bypass with a full-height gate and a gated ramp.
- [x] Remove the non-functional horizontal stair bar while retaining the intended three-step ascent.
- [x] Preserve fixed gameplay sensors across rewind snapshots so the echo plate remains live.
- [x] Complete Chapter 2's echo-held lift, boarded ride, upper dock, crate-drop, and exit sequence.
- [x] Pass PC-focused local build, 81 Vitest checks, 11 Playwright scenarios, local smoke, protected candidate smoke, and public production smoke.
- [x] Push source `3612837` and promote verified production deployment `dpl_GFqr3mn3kSzE4qb9i3JSPDrSE6L2`.

## 2026-08-16 — PC orientation, carry, and render-cost follow-up

- [x] Add a skippable Stage 00 tutorial before the five-chapter campaign.
- [x] Expose all desktop keyboard and mouse controls in Settings in Korean and English.
- [x] Place carried objects by camera heading with a short visual settle rather than movement-facing yaw.
- [x] Cap pixel density, lower desktop shadow cost, and sample obstruction fade/raycast work at 30 Hz.
- [x] Pass strict TypeScript, 83 Vitest checks, 13 Playwright stories, and 6 local production-bundle smoke checks.
- [x] Push source `3a9b0f9`, verify candidate `dpl_8EMLhJqJPs4RAu6mNYfMgCz1cu9S`, and promote production `dpl_H6tdJdqpqS82QWid7dFpHbgzpzFi`.
- [x] Anchor visible cargo beside the character's hand while retaining the authored physical drop route.
- [x] Pass the 84-test unit suite, full 13-story browser suite, local smoke, candidate smoke, and production smoke for source `b1d4981`.

## 2026-08-17 — Late-chapter clearability follow-up

- [x] Repair Chapter 3's disconnected descent/bridge route and reduce the echo-core throw to a catchable arc.
- [x] Keep the Chapter 4 echo-lured watcher in the high-flank strike lane and move the trap off its initial collision volume.
- [x] Make the Chapter 5 powered echo-held lower seal a reliable guardian lure.
- [x] Add direct world/physics completion regressions for Chapters 3–5 and a physical Chapter 3 descent/east-route traversal; pass 88 Vitest checks and 13 Playwright stories.
- [x] Verify candidate `dpl_3AN2dPKpusX5waCJnAMoTv7i1Wc2` and promote production `dpl_DT6wvejwq8Txz1BtMTpfvRaiP17s`; public alias returned HTTP 200 and smoke passed 6/6.

## 2026-08-17 — Pressure-scanner presentation follow-up

- [x] Replace the oversized circular pressure-button meshes in Chapters 1, 2, and 5 with compact floor-security scanner assemblies.
- [x] Keep the authored Rapier sensor bounds and all echo/cargo puzzle logic unchanged while making the panel depress and its four beacons brighten on engagement.
- [x] Add construction and active-feedback coverage for every pressure sensor; pass the 89-test unit suite, production build, 13-story PC browser suite, and Chapter 1 visual capture review.

## 2026-08-17 — Industrial device presentation follow-up

- [x] Replace all remaining primitive interactive objects with console levers, vault doors, reinforced decks, framed cargo, contained cores, recessed traps, transit/receiver structures, and armored sentries.
- [x] Add signal-banded structural pillar dressing to every stage and active light feedback for consoles, doors, moving decks, and receivers without changing any Rapier body or sensor.
- [x] Add a Stage 00–Chapter 5 device-assembly regression; pass 90 Vitest checks, production build, PC render-budget check, all-chapter capture review, and 13-story browser coverage.

## 2026-08-17 — PC movement and camera follow-up

- [x] Keep fixed-step movement speeds and echo frames, but use smoother release deceleration with decisive opposite-direction braking.
- [x] Make the 30 Hz obstacle probe retain and damp camera distance per frame, preventing the camera from jumping outward between probes.
- [x] Connect and clamp vertical mouse drag as a comfortable PC camera orbit; update bilingual Settings control copy.
- [x] Add camera-obstruction, orbit, movement-response, and real mouse-to-keyboard browser regressions; pass 93 Vitest checks, 14 Playwright stories, candidate smoke 6/6, and public smoke 6/6.
- [x] Push source `a7e88b1` and promote verified production deployment `dpl_6xtAgui3NMukXpfwJzCe3B3Rz4bV`.

## 2026-08-18 — Device motion audio follow-up

- [x] Add dedicated synthesized cues for lever, pickup/drop, scanner press/release, vault door open/close, receiver charge, and mechanical start/stop.
- [x] Add device-ID-scoped loops for moving elevators, platforms, and bridges; stop and release them at rest or runtime reset.
- [x] Emit world presentation events only on authored door/plate/motion transitions; preserve all physics, puzzle, snapshot, and echo contracts.
- [x] Pass `npm ci` (0 vulnerabilities), 96 Vitest checks, production build, 14 browser stories, and local production smoke 6/6.
- [x] Create and verify candidate `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz`, then promote production `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC`; candidate and public smokes pass 6/6.

## 2026-08-18 — Temporary all-chapter access

- [x] Open all five campaign Chapter Select cards before any clear, while keeping Stage 00 as the separate Start-flow tutorial.
- [x] Centralize the temporary policy in `STARTING_UNLOCKED_THROUGH = 5` so changing it to `1` restores sequential unlocking.
- [x] Add a fresh-campaign browser regression; build, 96 Vitest checks, the targeted assertion, and the full 15-story Playwright suite pass.
- [x] Push source `b2e687a` to `origin/main` and verify the remote head.
- [x] Include all-chapter access in shared candidate `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz` and production `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC`; public smoke confirms the release.

## 2026-08-25 — Chapter 4–5 temporal mastery

- [x] Replace direct bell/plate targeting with actual Watcher and Guardian FOV, Rapier LOS, cover, visible-target selection, last-known/stimulus investigation, chase, recovery, and deterministic patrol.
- [x] Require Player-only rear/high attacks; reject frontal or low strikes; apply real knockback; defeat the Watcher only when a knocked body intersects the physical trap; keep exits blocked until real outcomes exist.
- [x] Preserve one canonical `paradox-core`; use a first Echo recording for physical carry/throw/receiver delivery and a replacement recording for live lower-seal occupancy.
- [x] Make the powered vertical platform physically carry the Player to the Guardian flank and require actual Echo visibility before the rear/high Guardian seal strike.
- [x] Require simultaneous live Echo lower-seal occupancy and Player upper-seal hold before latching final-door release and starting the 35-second escape.
- [x] Preserve the 15-second, 60 Hz Echo 2.0 contract and restore all mutable perception state in rewind snapshots; add no AI planning, teleport, auto-interaction, solution step, fact injection, or production debug surface.
- [x] Pass `npm ci` with 0 vulnerabilities, strict Vite build, Vitest 126/126, full Playwright 25/25, and focused desktop/mobile success-capture 4/4.
- [x] Limit source work to `echo-depths-3d/` on `feat/ch4-ch5-temporal-mastery`, based on `fix/echo2-ch3-structural`; leave `main`, the base repair branch, production deployment, assets, and siblings unchanged.

## 2026-08-25 — Chapter 3–5 level-design rebuild

- [x] Branch `feat/ch3-ch5-level-design-rebuild` directly from verified `origin/main` `410366f88ff3b935dc3137c161e886e3af523357`; do not edit, merge, or deploy `main`.
- [x] Give Chapters 3–5 distinct wide/mobile framing, add raised-floor and platform obstruction handling, and cut away only camera-side perimeter geometry while preserving Chapter 1–2 defaults.
- [x] Rebuild Chapter 3 as readable WEST/EAST rooms with a flat Player-only one-way lane, separate Core lane, live east-triggered physical shutter, wide railed catch basin, and same-Core receiver delivery.
- [x] Rebuild Chapter 4 as a safe-entry surveillance gallery with real FOV/LOS cover, readable hazard/patrol space, a fully walkable ramp, high rear flank, physical trap resolution, and zero required jumps.
- [x] Rebuild Chapter 5 around one recording, one `paradox-core`, one transfer shutter, one powered moving platform, one continuous Echo Core-to-lower-seal timeline, actual Guardian exposure, and live dual seals.
- [x] Remove receiver provenance and unused-device dependencies, including `upperThrowArmed`, `core-thrown-down`, downward-velocity history, and `well-elevator`; keep completion tied to current physical results.
- [x] Synchronize Korean/English objectives and hints; add layout, camera, motor, Rapier/world, structural-negative, desktop, mobile, render, and production-bundle regressions.
- [x] Capture and inspect 17 current Chapter 3–5 desktop/mobile PNGs; pass Vitest 130/130, strict build, render smoke 2/2, focused completion 6/6, and production-bundle smoke 6/6.
- [x] Record the final full Playwright result and confirm that local verification did not mutate `main` or production; perform the feature-branch/PR handoff separately.

## 2026-08-25 — Chapter 3/5 one-way portal readability

- [x] Keep the fixed Player-only WEST → EAST collision rule; it is not a shutter and never opens for Echo or Core.
- [x] Resize the two one-way barriers to full portal proportions and replace the opaque purple slab read with a transparent directional field, top-facing cyan pass arrows, and a red east-side no-return seal.
- [x] Clarify the same rule in Korean and English Chapter 3/5 hints; add layout and world regressions for portal dimensions and west/east presentation state.

## 2026-08-25 — Chapter 3 receiver-gated return door

- [x] Keep `atrium-one-way` and its red east-side no-return face unchanged.
- [x] Add a separate middle `atrium-return-gate`, initially closed, which unlocks only from the actual `core-receiver` active state.
- [x] Allow only the live Player through the open return gate; retain real Echo and Core collision in both gate states.
- [x] Restore the gate deterministically from the receiver device state on recording rewind and restart; add closed/open color, light, field, and retracting-panel feedback.

## 2026-08-25 — Chapter 3 Core-only transfer shutter correction

- [x] Keep the east transfer shutter closed to physical Cores until the live Player reaches the east side.
- [x] Add a fixed, actor-only north-lane seal: Player and Echo cannot use an open Core shutter as a crossing or return shortcut.
- [x] Widen the visible shutter slats to the full transfer span and retain a cyan lock field/rails as the actor-only boundary.

## 2026-08-26 — Chapter 4 Watcher character and surveillance readability

- [x] Replace only the Chapter 4 procedural sentry with the official KayKit Adventurers 2.0 `Rogue_Hooded.glb`; keep the Chapter 5 Guardian unchanged.
- [x] Reuse the existing Rig_Medium animation mapping for Watcher idle, walk, run, hit, and defeat presentation.
- [x] Draw the Watcher's real 7.2-unit FOV as a ground sector and boundary, with cyan patrol, amber search, and red acquired-target states.
- [x] Show a pulsing sensor/ring and a red target beam only when the existing FOV, Rapier LOS, and target-selection logic has actually acquired Player or Echo.
- [x] Pass targeted unit tests, strict production build, the real Chapter 4 completion story, and desktop/mobile browser inspection before production deployment.
- [x] Deploy the verified static bundle to the isolated `echo-depths-playtest` Vercel production project and smoke the stable public alias.
