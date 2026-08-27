# ECHO DEPTHS Codex Work Log

All entries use Asia/Seoul dates.

## 2026-08-14 — Repository intake

- Read the repository-root agent instructions and migration, project-index, machine-setup, and deployment records.
- Confirmed repository `main`, remote `origin` at `https://github.com/jhy0285/game-codex-archive.git`, and intake base commit `022f499`.
- Recorded the pre-existing protected-project change at `echo-heist/package-lock.json` and kept it outside the new game's scope.
- Confirmed protected sibling boundaries for `404-not-found`, `boss-forge`, `echo-heist`, `patch-run`, and `hollow knight`.
- Created and retained `PLAN.md` before implementation, as required by the delivery order.

## 2026-08-14 — Game foundation

- Added the independent Vite/strict-TypeScript project with Three.js, `@dimforge/rapier3d-compat`, Vitest, and Playwright configuration.
- Kept WebGL rendering and semantic HTML/CSS presentation separate; React is not part of the project.
- Added the loading, language, title, chapter selection, HUD, pause, completion, ending, portrait guidance, and error modes in English and Korean.
- Added desktop pointer/keyboard input and multi-touch movement, camera, and action routing with pointer capture and safety release.

## 2026-08-14 — Physics, camera, and presentation

- Implemented the Rapier world and a capsule-based position-kinematic character controller.
- Added gravity, acceleration/deceleration, autostep, slope handling, snap-to-ground, coyote time, jump buffer, landing, dash, and player/echo collision filtering.
- Added the damped quarter-view camera with velocity look-ahead, wall collision shortening, obstruction fade, and restrained shake.
- Added landing dust, dash afterimages, attack/device waves, echo route feedback, core trajectory preview, and generated Web Audio cues.
- Added resize, orientation, device-pixel-ratio, fullscreen rejection, WebGL context loss, and runtime disposal handling.

## 2026-08-14 — Deterministic echo

- Implemented the 60 Hz fixed-step accumulator and test-controlled time advancement.
- Implemented normalized/quantized movement, facing, held interaction, and discrete action recording without per-frame coordinates.
- Implemented one replacement echo, full record-start motor/world snapshot rewind, present-to-echo carry/device ownership transfer, shared motor/action replay, safe terminal hold, path preview, translucent character presentation, and timeline state.
- Added state text through `render_game_to_text()` and restricted development operations through `echoDepthsDebug`.

## 2026-08-14 — Authored chapters

- Added five separate 3D layouts with lower, middle, and upper routes.
- Added lever/plate/door dependencies, dynamic crate and core bodies, elevators, a moving platform, a rotating bridge, receivers, traps, exits, and campaign transitions.
- Added the Chapter 1 lever/echo-plate tutorial, Chapter 2 lift/counterweight drop, Chapter 3 cross-height core catch/redirect, Chapter 4 fixed watcher/cover/trap solution, and Chapter 5 powered machinery/guardian/dual-seal/timed escape.
- Added ending statistics, rank, begin-again, chapter selection, sequential production unlocks, and full run/chapter rebuild paths.

## 2026-08-14 — KayKit acquisition and integration

- Acquired the four official free KayKit archives through their itch.io anonymous download flow without authentication, payment, or a third-party mirror.
- Selected 50 files totaling 5,703,863 bytes from 69,272,631 bytes of source archives and excluded the ZIP files from the public bundle.
- Copied the four CC0 license texts and created runtime manifest plus machine-readable provenance.
- Added `GLTFLoader`, skeleton cloning, official Knight model use, five animation-library loads, 13 required clip mappings, `AnimationMixer` crossfades, locomotion time scaling, echo material treatment, and code-built animated fallback.
- Verified current lengths and SHA-256 values against provenance for all 50 selected files: 50/50 and 50/50.
- Downscaled the two shared 1024×1024 source color maps to 512×512 with high-quality bicubic resampling; the runtime PNGs total 118,983 bytes and their output hashes are recorded in provenance.

## 2026-08-14 — Automated evidence

- Strict TypeScript and the final Vite production build pass after source recovery.
- Vitest after final hardening: PASS, 16 files and 72 tests.
- Unit coverage includes fixed stepping, input-only echo replay, five objective contracts, reset, devices, trajectory, sight, knockback, ranks/statistics, Korean/English completeness, and a real Rapier fixed-sensor/kinematic-actor overlap.
- Playwright passes 8/8 in 2.3 minutes, local production smoke passes 5/5 in 46.2 seconds, and the inspected capture set has no observed black frame, missing actor/model, clipped primary UI, or unreadable copy.
- Runtime review findings were corrected with full motor/world snapshot capture and restoration, authored ramp/downward core routes, original-distance guardian contact, live dual-seal state, dual interaction outlines, carry animation, allocation-free throw preview, fast-tap edge capture, fixed-sensor collision types, trap/core-loss feedback, three-ray wall/door clearance, stale actor-target cleanup, smoothed actor facing, temporal pulses, audio/input reset, asynchronous rebuild protection, and isolated actor asset ownership.
- Human play review has not been represented as complete. Physical controls, real-device touch, puzzle discovery, feel, difficulty, bilingual nuance, animation polish, audio balance, and fun remain human judgments.

## 2026-08-14 — Disk-full recovery

- During late runtime hardening, the system volume reached zero free bytes while two patch writes were in flight. The failed writes left `src/world/DungeonWorld.ts` and `src/physics/RapierWorld.ts` at zero bytes.
- All file writes were frozen immediately. Successful source-creation and update patches were located in the local Codex JSONL history, disk space was reclaimed, and both files were reconstructed before work resumed.
- The intended interaction-outline and sensor-collision changes were reapplied to the recovered files. Strict TypeScript, Vitest 72/72, the final production build, Playwright 8/8, and local production smoke 5/5 now pass.

## 2026-08-14 — Documentation snapshot

- Added the local agent contract, readme, game rules/solutions, task ledger, verification record, asset credits, deployment record, this work log, and progress handoff.
- Kept `PLAN.md` unchanged during the documentation pass.
- Recorded release state without an external-release claim: six local implementation/test commits exist through `26893d2`, the documentation is not yet in a complete release commit, and no GitHub push, Vercel project ID, deployment ID, candidate URL, production alias, public validation, or Vercel log result exists in this snapshot.

## 2026-08-15 — GitHub and production release

- Committed the final runtime hardening as `0ea2318872b14876fcb4e15a974d48ea586709e5` and the hosted-smoke filter plus deployment-secret ignore rules as `4e77423fe378ce5d5c95b48d29933386bd26f5b0`.
- Pushed the independent `echo-depths-3d` history on `main` to `https://github.com/jhy0285/game-codex-archive`; the unrelated `echo-heist/package-lock.json` modification remained unstaged and uncommitted.
- Created and configured the isolated Vercel project `echo-depths-3d`, ID `prj_s42Kw6wf1BRmonXJKpoyE29m1G9Z`, under team `ai-build3`, with Root Directory `echo-depths-3d`, Vite, `npm ci`, `npm run build`, and `dist`.
- Verified candidate `dpl_6PkCsMr1xN8nRTReziHgJP45LZDd` at `https://echo-depths-3d-d9o1c7o5e-ai-build3.vercel.app`: production smoke PASS 5/5 in 59.7 seconds.
- Promoted the verified candidate to production deployment `dpl_9iieCJ7GovQ4yeHH8rDzT5SxCwYP`; public alias `https://echo-depths-3d.vercel.app` returned HTTP 200 and production smoke passed 5/5 in about 1.1 minutes.
- Inspected the Vercel production build: `npm ci` found 0 vulnerabilities, TypeScript plus Vite completed, 38 modules transformed, deployment status Ready. The public browser collectors reported no application page, console, or first-party request failures.
- Kept further mobile refinement and exhaustive browser expansion out of closeout. Real-device touch comfort and all other subjective play qualities remain human-review items.

## 2026-08-15 — PC interaction and layout repair

- Reproduced the desktop failure where the `E · Use mechanism` prompt appeared while `E` was rejected because the actor had not entered the much smaller Rapier sensor volume.
- Reserved `E` for interaction and moved keyboard camera yaw to `Q` / `C`; prompt discovery and interaction now share one nearby-device range.
- Added regressions for capsule blocking against authored solid geometry and loose cargo, prompt-visible lever activation, the real keyboard `E` flow, and the production-bundle version of that flow.
- Replaced repeated all-model perimeter dressing with sparse chapter-authored KayKit placements. Structural dressing receives a matching Rapier collider and camera-obstruction entry; torches remain visual-only.
- Local validation passed: strict build, Vitest 75/75 across 16 files, Playwright 8/8, and local production smoke 5/5. Candidate and production deployment evidence is pending this repair's release.

## 2026-08-15 — PC repair production release

- Corrected the repair commit author to the Vercel-team account and pushed `0c4630afc9bf35f7874ab321f4050050128962fd` to `origin/main`; the remote head was verified after the lease-protected update.
- The project-level local Vercel static builder could not spawn `cmd.exe` after its own `npm ci` on this Windows host. The separately verified `npm run build` output was packaged as 57 standard Vercel Build Output static files and accepted by `vercel deploy --prebuilt --dry` before upload.
- Candidate `dpl_A97dm31JWoJPN7u8kUvSCGTGjDyW` at `https://echo-depths-3d-7c96p2th9-ai-build3.vercel.app` reached Ready and passed the protected browser smoke 5/5 in 1.3 minutes, including the real desktop `E` lever path.
- Promoted that candidate to production deployment `dpl_5oyUeBUT7ra13ZAeFeCNWSTbJWhT` (`https://echo-depths-3d-31zcpamui-ai-build3.vercel.app`). The public alias `https://echo-depths-3d.vercel.app` is Ready and passed the public production smoke 5/5 in 1.1 minutes.
- Vercel reported no runtime logs for the static deployment. The two author-blocked Preview attempts were not promoted.

## 2026-08-15 — First-descent sensor and feedback follow-up

- Reproduced the first chapter through real desktop keyboard input: `E` latched `tutorial-lever`, but a finished echo standing on `echo-plate` remained inactive and left `first-door` closed.
- Found that the capsule character controller included Rapier gameplay sensors in movement collision, lifting the echo above the first plate's overlap volume. The controller now excludes tagged plate, lever, trap, and exit sensors while the existing Rapier intersection queries remain active.
- Added visible first-lever confirmation, staged lever/plate/exit objectives, active lever emissive feedback, sensor-transparent motor coverage, live first-gate coverage, and a complete PC keyboard Chapter 1 route regression through exit `E` and the chapter-complete screen.
- Local evidence: strict Vite build passed, Vitest passed 77/77 across 16 files, Playwright passed 9/9 in 2.7 minutes, and the final local production-bundle smoke passed 6/6 in 1.4 minutes.
- Committed source `31884e12f602ff9c1773881d6766d1768ce6a742`, pushed it to `origin/main`, and verified the remote head before deployment.
- Candidate `dpl_F6rWbcdYon6Q9mVUUzaEPvVGeRAT` at `https://echo-depths-3d-lf5tp01cw-ai-build3.vercel.app` reached Ready and passed protected smoke 6/6 in 2.3 minutes, including the complete first-chapter PC route.
- Promoted that candidate to production deployment `dpl_76sKrPvgfYcSJCoLUqXAxD8UdbQJ` (`https://echo-depths-3d-qmod9hnws-ai-build3.vercel.app`). The public alias `https://echo-depths-3d.vercel.app` returned HTTP 200 and passed public smoke 6/6 in 2.1 minutes.
- Vercel logs show Ready after retrieving 58 deployment files and using prebuilt `.vercel/output` artifacts. The final local production-bundle smoke also passed 6/6 in 1.4 minutes.

## 2026-08-15 — First-two-stage completion release

- Reproduced the Chapter 1 bypass: the previous low gate and connected upper floor allowed a player jump around the locked passage. The replacement is a full-height gate, a gated ramp, and a narrowed upper floor that begins beyond the passage; the decorative horizontal stair bar was removed.
- Reproduced a snapshot regression that reset all device colliders, including fixed pressure/lever/exit sensors, to non-sensor mode. Snapshot restore now changes only moving surfaces, leaving fixed gameplay sensors live for the echo plate.
- Reworked Chapter 2 around a player-boarded lift and an adjacent static upper dock. The lift waits for boarding, carries the player through a custom support path, and the crate's open drop edge leads to the lower cargo plate without a blocking balcony.
- Added regression coverage for the locked first gate, snapshot-preserved pressure sensor, Chapter 2 dock traversal, cargo fall, and full Chapter 2 route. The existing real desktop keyboard `E` interaction coverage remains in place; development-only manual stepping makes the new full-route checks deterministic.
- Local evidence: strict Vite build passed, Vitest passed 81/81 across 16 files, Playwright passed 11/11 in 2.6 minutes, and final local production smoke passed 6/6 in 40.6 seconds.
- Committed source `3612837e6ff74eacc9d8457ae9d61b75f1b23445`, pushed it to `origin/main`, and verified the remote head before deployment. Candidate `dpl_B41ZFUiE1u4TKGg3PgVm1v8H4GtE` passed protected smoke 6/6 in 1.0 minute.
- Promoted production `dpl_GFqr3mn3kSzE4qb9i3JSPDrSE6L2` (`https://echo-depths-3d-r4kieaoa7-ai-build3.vercel.app`). The public alias `https://echo-depths-3d.vercel.app` returned HTTP 200 and passed 6/6 smoke in 52.7 seconds. Vercel reports Ready and no runtime logs for the static deployment.

## 2026-08-16 — PC orientation, carry, and render-cost follow-up

- Added Stage 00, a safe skippable orientation room ahead of Chapter 1. Its six visible PC drills cover movement, camera yaw, jump, console interaction, camera-led crate carry, and record/release; it does not count toward the five campaign chapters or elapsed campaign statistics.
- Added a complete Korean/English desktop control reference to Settings. The carried-object target now derives from the active camera heading and interpolates briefly toward that target, avoiding movement-yaw orbiting while retaining immediate pickup placement.
- Capped device pixel ratio at `1.5`, reduced the desktop directional shadow map to 1536px, and sample camera-obstruction raycasts/material fades at 30 Hz. A 1440×900 browser assertion bounds render calls below 300 and triangles below 300,000.
- Local evidence passed: strict TypeScript, Vitest 83/83 in 16 files, Vite production build, Playwright 13/13 in 3.3 minutes, and local production-bundle smoke 6/6 in 44.9 seconds. The Stage 00 PC screenshot was reviewed with no observed black frame, missing actor, or clipped primary UI.
- No KayKit asset, provenance, or sibling project files changed. Source `3a9b0f9add8570c7271e2f41546e379e8a5f84b3` was pushed to `origin/main` and the remote head was verified.
- Candidate `dpl_8EMLhJqJPs4RAu6mNYfMgCz1cu9S` at `https://echo-depths-3d-gmyhyvoil-ai-build3.vercel.app` reached Ready and passed browser smoke 6/6 in 53.7 seconds.
- Promoted production `dpl_H6tdJdqpqS82QWid7dFpHbgzpzFi` (`https://echo-depths-3d-j4bfnkrlk-ai-build3.vercel.app`) is Ready. The public alias `https://echo-depths-3d.vercel.app` returned HTTP 200 and passed public browser smoke 6/6 in 1.1 minutes.

## 2026-08-16 — Carry visual anchoring follow-up

- Reproduced a visible carry defect after camera-heading placement: a low catch-up rate let cargo fall into the character silhouette while moving, and a high target height left it near the head.
- The visible mesh now holds at the hand side and chest height with a 1.02-unit minimum forward gap; large heading changes snap to that safe target. The separate kinematic carry collider remains at the authored forward/height path, preserving the Chapter 2 counterweight drop.
- Added a movement-and-180-degree-turn visual clearance regression and a held-crate Stage 00 screenshot. The capture shows the crate outside the character silhouette; Chapter 2's physical cargo route still passes.
- Source `b1d49811ba0361a8816f69e73f553d9fd022a696` was pushed to `origin/main` with remote-head verification. Local evidence passed strict TypeScript, Vitest 84/84 in 16 files, Vite build, Playwright 13/13 in 3.0 minutes, and local production smoke 6/6 in 50.4 seconds.
- Candidate `dpl_3xxaY6kiZowbhANr9D6NkuHam2RZ` at `https://echo-depths-3d-2nfru1hyn-ai-build3.vercel.app` reached Ready and passed smoke 6/6 in 1.2 minutes. Promoted production `dpl_FJYteX8jJN6tRvSqiKnkyGfwJ1Vx` (`https://echo-depths-3d-7ui65p294-ai-build3.vercel.app`) is Ready; the public alias returned HTTP 200 and passed smoke 6/6 in 1.3 minutes.

## 2026-08-17 — Late-chapter clearability repair

- Found that Chapter 3's lower floor could not physically reach the elevated bridge/east floor, its core throw was not tuned for the lower catch, and a nearby pillar/collider made the intended route awkward. Added a physical descent, continuous lower/east walk, collision-safe active bridge behavior, and a catchable Chapter 3 throw profile.
- Found that Chapter 4's widened trap overlapped the watcher at spawn and that an echo lure could be overwritten by player sight. Moved the trap out of the spawn volume and made an active echo lure keep the watcher in the readable high-flank strike lane.
- Found that Chapter 5's lower seal did not itself establish guardian attention, forcing an undocumented sight-cone detour. A powered echo-held lower seal now reliably marks the guardian's echo target.
- Added Chapter 3 motor traversal plus real Chapter 3 core/bridge/exit, Chapter 4 lure/trap/exit, and Chapter 5 core/guardian/dual-seal/exit tests without debug fact injection. Local build, Vitest 88/88, Playwright 13/13, a targeted full Chapter 2 browser route, and Chapter 3–5 screenshot review pass. No assets or sibling files changed.

## 2026-08-17 — Late-chapter clearability production release

- Pushed source `6046e009bdce64e90c109d1b117d774a957391d0` and companion documentation record `46602c27d2038b583143fcfcd4f05f9545c2b652` to `origin/main`; the remote head was verified.
- Local production preview passed browser smoke 6/6 in 38.0 seconds. The separately verified Vite output was copied into the existing prebuilt Vercel static output without touching protected sibling projects.
- Candidate `dpl_3AN2dPKpusX5waCJnAMoTv7i1Wc2` at `https://echo-depths-3d-f88l5omh7-ai-build3.vercel.app` reached Ready and passed production browser smoke 6/6 in 56.5 seconds.
- Promoted that candidate to production `dpl_DT6wvejwq8Txz1BtMTpfvRaiP17s` at `https://echo-depths-3d-1il7sg54s-ai-build3.vercel.app`. The public alias `https://echo-depths-3d.vercel.app` is Ready, returned HTTP 200, and passed public smoke 6/6 in 56.7 seconds. Vercel reports a static prebuilt build with no application runtime logs.

## 2026-08-17 — Pressure-scanner presentation repair

- Replaced every oversized circular campaign pressure-button mesh with the same compact floor-security scanner assembly: metal deck, raised frame, inset scan panel, two guide rails, and four accent-lit beacons.
- Kept the original Rapier plate sensors, interaction boundaries, cargo mass rules, and echo requirements unchanged. Active pressure now depresses the scan panel and increases panel/beacon emission rather than scaling the whole object.
- Added a world regression for all Chapter 1, 2, and 5 plate assemblies, compact deck dimensions, preserved sensor tags, and active echo feedback. Local validation passed Vite build, Vitest 89/89 across 16 files, Playwright 13/13 in 3.0 minutes, local production smoke 6/6 in 44.4 seconds, and a 1440×900 Chapter 1 visual capture review. No KayKit assets or protected sibling files changed.

## 2026-08-17 — Pressure-scanner presentation production release

- Pushed source `6b17461598bc2c6999265dcb0b9b57cef2dfdb5b` to `origin/main` and verified the remote head before deployment.
- Candidate `dpl_8uP6jsXu17BHB1WUo79ipXe3H7HR` at `https://echo-depths-3d-8ghnf1fzn-ai-build3.vercel.app` reached Ready and passed production browser smoke 6/6 in 1.1 minutes.
- Promoted that candidate to production `dpl_2EoEkQKZQmJmn91VJnFtFHcuwh9y` at `https://echo-depths-3d-1b9y3li8h-ai-build3.vercel.app`. The public alias `https://echo-depths-3d.vercel.app` is Ready, returned HTTP 200, and passed public smoke 6/6 in 54.4 seconds.
- Vercel retrieved 64 files, used the prebuilt static output, and reported Ready with no application runtime logs. Candidate and public browser runs collected no page, console, or first-party request failures.

## 2026-08-17 — Industrial device presentation repair

- Rebuilt the remaining primitive device visuals without changing their Rapier records: all levers are console pedestals; doors are framed vault panels; elevators, platforms, and bridges are reinforced decks; crates have braces and seals; cores have containment halos; traps are recessed arrays; exits and receivers are structured stations; and enemies are armored sentries.
- Added industrial footing, crowns, and accent signal bands to the shared stage pillars. Console screens/indicators, door stripes, platform beacons, and receiver parts now report active state through emission.
- Added an assembly regression that builds Stage 00 plus every campaign chapter and requires each device type's named visual parts while its existing physics record remains present. Local evidence passed Vite build, Vitest 90/90 across 16 files, the PC render-budget and all-chapter capture review, and Playwright 13/13 in 3.9 minutes. No KayKit asset, provenance, coordinate, puzzle-rule, or protected sibling file changed.

## 2026-08-17 — Industrial device presentation production release

- Pushed source `0c9b60e522d38c7dd880d19efd9f87dc2ef2addf` to `origin/main` and verified the remote head before deployment.
- Candidate `dpl_24QfQ97NV5ZfJSnvNe7pJ97pc6vz` at `https://echo-depths-3d-kn26k7qm1-ai-build3.vercel.app` reached Ready and passed production browser smoke 6/6 in 2.0 minutes.
- Promoted that candidate to production `dpl_GmnucrocKXFNKB5qqFarh4rdV8Df` at `https://echo-depths-3d-bevvcpvaq-ai-build3.vercel.app`. The public alias `https://echo-depths-3d.vercel.app` is Ready, returned HTTP 200, and passed public smoke 6/6 in 1.8 minutes.
- Vercel retrieved 65 files, used the prebuilt static output, and reported Ready with no application runtime logs. Candidate and public browser runs collected no page, console, or first-party request failures.

## 2026-08-17 — PC movement and camera completion

- Preserved deterministic 60 Hz movement and echo replay inputs while making ordinary locomotion responsive, stopping gradual, and opposite-direction movement decisive. Added a physics regression for this exact release/reversal profile.
- Reworked camera obstruction handling so 30 Hz ray probes update a persistent desired distance and the camera damps toward it every render frame. Added clamped vertical mouse orbit, per-tick pointer-delta bounds, and bilingual Settings/help copy that distinguishes horizontal orbit from vertical height.
- Added unit regressions for stable obstruction distance and bounded vertical orbit, plus a real PC browser story that drags the canvas vertically and then proves `W` movement continues. Local evidence: `npm ci` zero vulnerabilities, Vite build, Vitest 93/93, and Playwright 14/14 in 3.2 minutes. No KayKit assets, puzzle coordinates, echo frame format, or protected sibling files changed.

## 2026-08-17 — PC movement and camera production release

- Pushed source `a7e88b1bf031020b57b6ff744ff0b1882b5f2ce1` to `origin/main`; remote `main` matched the local commit.
- Candidate `dpl_2mR1KvPWjb2tFffvbtsmyyvxEDEA` at `https://echo-depths-3d-b6amhisx3-ai-build3.vercel.app` reached Ready and passed production browser smoke 6/6 in 1.1 minutes.
- Promoted that candidate to production `dpl_6xtAgui3NMukXpfwJzCe3B3Rz4bV` at `https://echo-depths-3d-kadjb9d7n-ai-build3.vercel.app`. The public alias `https://echo-depths-3d.vercel.app` is Ready, returned HTTP 200, and passed public smoke 6/6 in 54.5 seconds.
- Vercel retrieved 66 files, used prebuilt static output, and reported Ready with no application runtime logs; candidate and public smoke collected no page, console, or first-party request failures.

## 2026-08-18 — Device motion audio completion

- Added distinct synthesized one-shot cues for levers, pickup/drop, pressure scanner press/release, vault-door opening/closing, receiver charge, and mechanism start/stop. Elevator, platform, and bridge loops are scoped to device IDs, so a repeated fixed tick cannot layer duplicate hums.
- Added world audio events only at actual door/plate transitions and authored transform motion boundaries. The app consumes those presentation events around the Rapier step; no device condition, actor coordinate, snapshot, or echo input is changed by audio.
- Added audio-director loop coverage plus Chapter 1 door/scanner and Chapter 2 elevator transition regressions. Local validation passed `npm ci` with zero vulnerabilities, Vite build, Vitest 96/96, Playwright 14/14 in 3.3 minutes, and local production smoke 6/6 in 1.1 minutes.

## 2026-08-18 — Device motion audio deployment pending

- Pushed source `6555825f68beab09bf289a7c83df2f194517da42` to `origin/main`; remote `main` matched the local source commit.
- Vercel candidate deployment did not begin: three `vercel@latest` attempts and one `vercel@59.1.3` attempt each failed while loading the authenticated user with `fetch failed`. The fourth attempt rebuilt the current source and refreshed the prebuilt static output first, but no deployment ID, candidate URL, production promotion, or public smoke exists for this source.
- The public alias `https://echo-depths-3d.vercel.app` therefore remains on prior verified production `dpl_6xtAgui3NMukXpfwJzCe3B3Rz4bV`. Deployment should resume from the existing verified `dist` only after Vercel authentication/network access recovers.

## 2026-08-18 — Temporary all-chapter access

- Opened Chapter Select cards 1–5 in a fresh session by centralizing the policy as `STARTING_UNLOCKED_THROUGH = 5`. Completion still records progress and refreshes the cards, while changing this constant to `1` later restores sequential locking. Stage 00 remains the separate Start-flow tutorial.
- Added a browser regression that opens Chapter Select before any clear and requires every card to be enabled. Strict Vite build, Vitest 96/96, the focused assertion, and full Playwright 15/15 in 3.6 minutes pass.
- Pushed source `b2e687a5220b48c02cb1a42eba15d25e14b437a0` to `origin/main`; remote `main` matched. The public alias remains unchanged because this source shares the device-audio Vercel candidate block described above.

## 2026-08-18 — Device audio and all-chapter production release

- Diagnosed the Vercel CLI `fetch failed` as Node's `SELF_SIGNED_CERT_IN_CHAIN` against the local trusted interception certificate. `NODE_OPTIONS=--use-system-ca` retained TLS validation and made `vercel whoami` succeed; TLS validation was not disabled.
- Rebuilt the source, refreshed the prebuilt static output, and deployed candidate `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz` at `https://echo-depths-3d-dsx4v836g-ai-build3.vercel.app`. It reached Ready and passed production smoke 6/6 in 1.1 minutes.
- Promoted production `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC` at `https://echo-depths-3d-kvrfv1856-ai-build3.vercel.app`. The public alias returned HTTP 200 and the final public smoke passed 6/6 in 1.2 minutes. Vercel used 68 prebuilt files and reported Ready with no application runtime logs.


## 2026-08-18 -- Chapter 3 descent stair repair

The split-atrium (Chapter 3) descent ramp shipped as a thin tilted box whose upper half was buried inside the upper floor box and whose lower half floated above atrium-lower with no walkable connection. The published objective and solution describe a present player who descends to the atrium-lower catch zone, but no path actually linked the upper shelf to the lower floor.

- Replaced the broken atrium-descent in src/levels/layouts.ts with three flat descent-step-N floor pieces positioned south of the upper shelf, each offset one unit east and one unit down from the previous. Top surfaces: step-1 y=2.0, step-2 y=1.0, step-3 y=0.2 (matching atrium-lower). The player now walks south off the upper shelf and steps east and down through the three stairs to reach atrium-lower cleanly.
- Moved memory-core from [-3.8, 3.75, 2.5] to [-3.0, 3.75, 1.6]. The new position sits closer to the upper shelf south edge, so the authored throw arc naturally aims over the descent stairs into the atrium-lower catch zone.
- Local evidence: npm run build strict TS PASS (38 modules), Vitest 96/96, Playwright 15/15 in 3.6 minutes. The spatial sweep screenshot pass confirms the player reaches the lower level via the new stairs.
- No KayKit assets, sibling projects, or puzzle logic changed. The authored solution sequence in GAME.md Chapter 3 still applies unchanged.


## 2026-08-19 -- Pressure scanner: actor-agnostic fact gate + dramatic color shift

Chapter 1s echo-plate fact was previously gated to actor?.kind === echo, but PLATE_OCCUPANT_KINDS already accepted player / echo / crate / core for physics intersection. The fact gate was inconsistent with the devices own broad occupancy detection, and the canExit condition was the even narrower deviceHeldBy(echo-plate, echo).

  - Removed the actor?.kind === echo gate in updatePlates. The echo-plate fact is now added whenever the device is pressed by any of the four allowed kinds. A player walk-on or a dropped crate/core now also sets the fact.
  - canExit for chapter 1 now uses facts.has(echo-plate) instead of deviceHeldBy(echo-plate, echo). The fact represents the device state, not the specific actor. Echo remains the canonical solution path (the replay lands it on the plate), but the design is more flexible.
  - Added fact removal in the press/release path: when the plate becomes unpressed, the fact is removed and the gated door re-closes. Previously the fact was sticky; a separate Vitest test verifies the door now correctly emits a doorClose audio event on echo departure.
  - updatePlatePresentation now changes both the panel AND beacons material colors (cloned per-plate) from a near-black dark navy (0x141820, inactive) to a bright white-cyan (0xeaffff, active), in addition to the existing scale dip and emissive boost. The active color is deliberately different from any chapter accent so the change is unmistakable.
  - Local evidence: 96/96 Vitest pass, plus a Playwright regression test that snapshots the plate in both states and confirms both facts/door open and the visual color shift.
  - Production redeploy via vercel redeploy of the existing Ready deployment. The new alias is echo-depths-3d-k07wf9fbd-ai-build3.vercel.app and the canonical URL is updated.

## 2026-08-25 — Chapter 4–5 attention and temporal-orchestration revision

- Created `feat/ch4-ch5-temporal-mastery` from `origin/fix/echo2-ch3-structural` at `8e84c7465a953caeec1a6be44bb3da264a969d75`; the base branch remains the open, unmerged PR #1 source.
- Replaced Chapter 4's direct lure lock with a deterministic Watcher that owns position, facing, state, current/last-known targets, stimulus, and alert/search/recovery timers. Per-tick Player/Echo FOV and Rapier LOS respect authored cover; the bell provides only a sound position.
- Rejected frontal/low Watcher attacks, accepted a rear/high Player strike, applied real knockback, and limited trap defeat to a Watcher already in knocked state. The gallery door and exit stay blocked until the physical hazard outcome.
- Rebuilt Chapter 5 around the same single `paradox-core`: a first recording carries and throws it into the receiver; a replacement recording walks to the lower seal. The receiver powers a vertical platform that physically carries the present Player to the upper Guardian flank.
- Removed the lower-seal direct target assignment. The Guardian uses actual FOV/LOS and may switch visible targets; only a rear/high Player strike while it targets the visible Echo breaks the seal. Live Echo lower occupancy plus live Player upper hold then latch final-door release and start the escape timer.
- Extended rewind snapshots with target visibility, last-known and stimulus positions, and attention timers. Preserved the 15-second 60 Hz Echo 2.0 tape, tick-aligned transform replay, recorded action resolver, deterministic update order, and no-planning Echo boundary.
- Added broad bilingual objectives and minimal outcome facts, targeted Rapier/logic regressions, desktop keyboard full solutions, mobile touch-only full solutions, and optional successful-route screenshot output. No debug solution step, direct fact setter, teleport, outcome setter, production debug API, or test-only physics was added.
- Final local evidence: `npm ci` 0 vulnerabilities; strict Vite build PASS (38 modules); Vitest 17 files / 126 tests PASS; Playwright 25/25 PASS in 24.6 minutes; focused success-capture rerun 4/4 PASS in 6.9 minutes. Four PNGs were visually inspected for visible gameplay, HUD, and touch controls.
- No KayKit or other asset changed. No sibling project, `main`, base repair branch, Vercel project, deployment, alias, or production site changed.

## 2026-08-25 — Chapter 3–5 spatial level-design rebuild

- Created `feat/ch3-ch5-level-design-rebuild` directly from fetched `origin/main` `410366f88ff3b935dc3137c161e886e3af523357` and kept all work within `echo-depths-3d/`.
- Replaced Chapter 3's overlapping multi-floor/drop-step blockout with distinct flat WEST/EAST rooms, separate north Core and south Player lanes, a directional Player-only one-way passage, a live east-triggered physical transfer shutter, and a wide low-railed landing basin. The Echo replays the pickup and sends the same rewound `memory-core`; the live Player retrieves it and completes the real receiver intersection.
- Rebuilt Chapter 4 into linked entry, bell/patrol, covered flank, walkable-ramp, high-rear, trap, and exit spaces. Watcher attention comes from actual FOV/LOS and cover; no jump input is used by either desktop or mobile completion.
- Rebuilt Chapter 5 around a single 15-second recording and the single `paradox-core`. The same tape transfers the Core and continues to the lower seal; the live Player crosses separately, receives that Core, powers the only moving platform, reaches the Guardian's exposed rear while it sees the Echo, and holds the upper seal concurrently to release the final door.
- Removed the hidden `upperThrowArmed`, `core-thrown-down`, and downward-velocity receiver requirements and removed the unused `well-elevator`. Receiver, enemy, seal, and victory state now derive from current collision, visibility, position, and live occupancy outcomes.
- Added chapter-specific camera profiles, mobile-aware framing, raised-floor/platform obstruction candidates, exact player ray checks, and camera-side perimeter cutaways for Chapters 3–5. Chapter 1–2 retain their previous profile.
- Rewrote Korean/English objectives and guidance for the new routes and added fast layout, camera, physics/world, shortcut-negative, render, desktop, mobile, and production-bundle coverage.
- Final local evidence: Vitest 130/130; strict build PASS; render/framing 2/2 in 25.5 seconds; focused Chapter 3–5 completion 6/6 in 8.3 minutes; production-bundle smoke 6/6 in 47.6 seconds; full Playwright 20/20 in 12.6 minutes. Seventeen current screenshots were captured and representative frames inspected.
- No asset, sibling project, `main`, Vercel production deployment, domain, or alias was changed.

## 2026-08-25 — One-way portal visual correction

- Replaced the Chapter 3/5 one-way wall's small opaque visual slab with a full-height portal treatment. The real Rapier collider and CharacterMotor's Player WEST → EAST exception are unchanged.
- West-side traversal is now marked by cyan top-facing arrows; the opposite face carries red lock bars and a no-return sigil. The local Player side controls emphasis only, never the physical access rule.
- Enlarged the portal dimensions, clarified Korean/English hints, and added visual-state/dimension regressions. Vitest 131/131, Vite build, and local Chapter 3 browser capture passed.

## 2026-08-25 — Receiver-gated Chapter 3 return gate

- Added `atrium-return-gate` as a separate middle corridor device; it does not alter the existing `atrium-one-way` collider, arrows, or red lock face.
- The gate reads only `core-receiver.active`, not a recording/provenance fact. Closed/open visual states use red/cyan fields, lights, status rings, and panel retraction; Rapier continues to block Echo and Core while `CharacterMotor` admits only the live Player when active.
- Snapshot restore recomputes the gate from the restored receiver state. Targeted physics tests and the production build pass.

## 2026-08-25 — Chapter 3 transfer shutter actor seal

- Diagnosed the east shutter leak: `CharacterMotor` ignored every `shutter` collider, so Player and Echo could traverse the north lane despite its closed Core collider.
- Preserved the physical Core shutter and added a Chapter 3-only static actor barrier with an always-readable cyan field and rails. The retracting shutter now controls Core transfer only; Player/Echo remain blocked before and after opening.
- Added a regression proving closed Core denial, open same-Core delivery, Player EAST→WEST denial, and Echo WEST→EAST denial. Targeted tests, strict production build, and local Chapter 3 browser/console verification pass.

## 2026-08-26 — KayKit Chapter 4 Watcher

- Reacquired the official `KayKit_Adventurers_2.0_FREE.zip` through Kay Lousberg's itch.io anonymous download flow and verified its existing recorded archive identity: 13,024,345 bytes, SHA-256 `abe48f4763fba0896bab486ee9e6d08ca6b5b3884b9601f235c8847ae94dc479`.
- Added the unmodified `Rogue_Hooded.glb` selection (381,432 bytes, SHA-256 `e8f3233c6db190506fbef3ad855683e6cb8bd7350de637d923e14a08aef088dc`) and updated manifest, provenance totals, and asset credits.
- Replaced Chapter 4's primitive drone with the hooded Rogue character and shared KayKit animations. Chapter 5's armored procedural Guardian remains unchanged.
- Replaced the approximate floating cone with an exact ground sector driven by the same live FOV/range helpers used by detection. Patrol, search, acquired target, and defeat states now update fill, boundary, sensor, ring, beam, and animation without changing physics or puzzle facts.
- Targeted Vitest 55/55, strict build, real Chapter 4 completion 1/1, and desktop/mobile local visual/error review pass.
- Pushed source commit `d8623493c31270438ed3685f364ea238c220e2f6` to `origin/feat/ch3-ch5-level-design-rebuild`, deployed the verified bundle as Vercel production `dpl_8AkqppynEF8urDfsXD6VSLuPfubD`, and verified `https://echo-depths-playtest.vercel.app` on desktop and mobile landscape with no page/console errors or production debug API.

## 2026-08-26 — Chapter 4 pursuit and spike-trap gameplay pass

The Watcher now performs the authored east/west patrol instead of being reset to its starting transform by the generic moving-platform loop. Its patrol line sits south of the spike bed, so the character does not appear to stroll harmlessly across the intended kill device.

Player detection is now readable warning and pursuit: after the short alert the Watcher runs toward the present Player, and failure occurs only when horizontal and vertical catch volumes overlap. A visible Echo remains the stable lure. The Watcher pursues it to a computed standoff on the near side of the physical spike trap, faces the Echo, and holds an attack pose; it neither consumes the Echo nor steps voluntarily into the kill zone. The existing Player-only high/rear strike and knocked-body trap intersection still own the clear.

The trap gained a pulsing red target ring, translucent beacon, and local light. Korean/English objectives now state that the Watcher must be knocked into the spikes. Target commitment is snapshot-restored so recording rewind remains deterministic. Targeted Vitest, strict build, desktop completion, touch-only completion, and local visual/console checks pass.

Source commit `65bcbfe25a17e29dd0c6c5bc974f30731b18c4ef` was pushed to `origin/feat/ch3-ch5-level-design-rebuild`. The verified static bundle was deployed as isolated Vercel production `dpl_CnusTWnFjMNBrWYt9WnGe1RHjrvT` and aliased to `https://echo-depths-playtest.vercel.app`. The public alias serves the new bundle, Chapter 4 renders on desktop, the production smoke set passes after using the workstation system CA for the asset request, console/page errors are empty, and the development debug API is absent.

## 2026-08-26 — Chapter 5 final-difficulty and Guardian fairness pass

- Replaced the procedural Chapter 5 sentry with a runtime-tinted clone of the existing official KayKit Knight rig. Added an animated front shield, rear weak seal, sensor/status ring, target beam, and ground sight sector generated from the same live range/FOV used by detection. No asset binary or provenance hash changed.
- Made `power-receiver` the Guardian's real activation authority. Before the same physical Core is seated, the Guardian remains dormant and cannot detect, chase, or defeat the Player. After activation, a visible Echo physically holding `lower-seal` has priority and the Guardian faces it from the central dais instead of chasing it out of attack range.
- Added vertical overlap to Guardian contact so floors separate danger correctly. Preserved the Player-only high/rear strike, actual LOS, same-Core transfer, single moving platform, live dual seal, and rewind snapshot behavior.
- Wired the authored Chapter 1–5 Echo capacities (12/15/18/18/20 seconds) into `GameApp`, reduced the final escape to 15 seconds, prevented timer restart, and added non-colliding dual-route/cable/tether/exit-beacon guidance.
- Local acceptance: Vitest 18 files / 142 tests PASS; strict production build PASS; real Chapter 5 desktop completion PASS 1/1 in 3.0 minutes; real touch-only Chapter 5 completion PASS 1/1 (test body 5.2 minutes). A first desktop rerun revealed that newly added collision rails blocked the side-entry exit path; those rails were removed and the same story passed. The inherited machine-level `PLAYWRIGHT_BASE_URL` also initially pointed at production without debug API; explicitly removing it selected the intended local server.

## 2026-08-27 — Chapter 4 gallery floor-safety pass

- Confirmed that the authored Chapter 4 solution was complete, but broad empty regions inside the outer walls were real fall/reset spaces rather than decoration. The canonical route avoided them, yet exploratory movement made the room feel unfinished.
- Added a thin continuous `gallery-foundation` covering the complete inner wall bounds. Existing safe, Echo, patrol, ramp, high-flank, and exit slabs remain slightly raised, preserving route colors, cover, sight, and attack height while removing unrelated interior falls.
- Changed the foundation from dark stone to the muted safe-floor material after the first desktop/mobile captures showed that a physically solid dark slab could still read as a void.
- Added two real `CharacterMotor` probes through the former west-perimeter and cover-to-patrol holes. Both must remain grounded and above the fall region; existing ramp, Watcher, trap, and exit regressions remain unchanged.
- Local acceptance passed: `npm ci` with 0 vulnerabilities, Vitest 143/143, strict Vite build, focused Chapter 4 touch/desktop completion, final desktop visual rerun, and full Playwright 20/20 in 17.7 minutes. No asset or sibling project changed.

## 2026-08-27 — Chapter 4 floor-safety production release

- Committed source as `29b2c461fd1fcbe6c21fc352929aa4b2b074981d`, pushed it to `origin/main`, and verified the remote branch SHA. The pre-existing untracked `marketing/` directory remained excluded.
- Deployed preview `dpl_7mTPt7rKgsLs1fYB6gynK28FLhtn` at `https://echo-depths-3d-eknwa5z11-ai-build3.vercel.app`. Vercel's `npm ci` found 0 vulnerabilities, the 38-module Vite build completed, and candidate smoke passed 6/6 in 1.2 minutes.
- Direct candidate Chapter 4 inspection confirmed the new `index-BC8hbp0t.js` bundle, enabled Chapter 4 card, active KayKit runtime, continuous gallery floor, absent production debug API, and empty page/console error collectors.
- Promoted the verified candidate to production `dpl_35J6WSrWsaVW1PnvgzXpjhrJDbjd` at `https://echo-depths-3d-1v1nzwuw9-ai-build3.vercel.app`. The stable alias `https://echo-depths-3d.vercel.app` points to it and passed public smoke 6/6 in 57.4 seconds plus direct Chapter 4 inspection. The static deployment reported no runtime logs.



