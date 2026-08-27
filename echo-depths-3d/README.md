# ECHO DEPTHS

ECHO DEPTHS is an independent 3D quarter-view time-echo puzzle-action game. The present player records a route, releases one replaying echo, and cooperates with that past performance across stairs, balconies, elevators, moving platforms, thrown cores, pressure mechanisms, and deterministic enemies.

The game is a Vite static application written in strict TypeScript. Three.js renders the dungeon canvas, Rapier 3D owns collision and character movement, and a separate HTML/CSS layer owns menus, HUD, touch controls, loading, pause, errors, rotation guidance, and the ending. React is not used.

## Current release evidence

Snapshot: 2026-08-27, Asia/Seoul.

- `main` contains the complete Chapter 1–5 rebuild. The current Chapter 5 safety pass widens the moving-platform landing, Guardian flank seam, final bridge, and boarding apron without joining the separate lower Player and Echo/Core lanes. Tall camera-facing outer walls now become lower containment plus upper parapets, and an overlapping upper-pillar prop was removed.
- The Chapter 5 final door now slides east out of the quarter-view camera, becomes logically open only after its collider clears the passage, and starts the full 15-second escape at that physical-open moment. The occupied receiver is treated as a real obstacle in both desktop and touch walkthrough routes.
- Current local gates pass: `npm ci` reports 0 vulnerabilities, the strict production build transforms 38 modules, Vitest passes 143/143 across 18 files, 19 unaffected Playwright cases passed in one complete run, and the corrected Chapter 5 desktop/touch completion pair then passed 2/2. Successful final-state captures were visually inspected.
- Source `9dd9e6ca444a42df3ddcd6d144f56b513924746a` is pushed to `origin/main`. Candidate `dpl_GhFLxjcg12jgC2kXYdKh1c3HHko1` passed production smoke 6/6 and direct Chapter 5 desktop/mobile inspection, then promoted production `dpl_Hf9RE2xVSnJETE9ki9kW4h3drFjh` became Ready. The public [production URL](https://echo-depths-3d.vercel.app) serves `index-CAFm-gyQ.js`, passes smoke 6/6, exposes all five chapter cards, enters Chapter 5 on desktop/mobile, and reports no collected console/page/request errors or production debug API.

- `npm ci`, strict TypeScript, and the final Vite production build pass on the recovered tree.
- Vitest passes all 96 tests across 16 test files, including device-audio transition/loop regression, camera-obstruction continuity, vertical orbit, responsive reversal, compact-scanner construction/active-feedback, industrial device assembly, and Chapters 3–5 completion regressions.
- The development Playwright suite passes 15/15 in 3.6 minutes; it includes real PC mouse/keyboard input, an initial Chapter Select availability check for all five campaign stages, the Chapter 1 door/echo-plate route, and the Chapter 2 echo lever → lift → cargo plate → exit route.
- The captured language/settings, Stage 00 orientation room, echo, Chapters 1–5, ending, portrait, and landscape screens were inspected with no black frame, missing actor/model, clipped primary UI, or unreadable copy observed.
- The runtime hardening commit `0ea2318` and hosted-smoke commit `4e77423` are on `main`; the game is published from the isolated Vercel project `echo-depths-3d` (`prj_s42Kw6wf1BRmonXJKpoyE29m1G9Z`).
- Candidate production-smoke validation passed 5/5 before promotion, and the final public production smoke passed 5/5 at [https://echo-depths-3d.vercel.app](https://echo-depths-3d.vercel.app). The production deployment is `dpl_9iieCJ7GovQ4yeHH8rDzT5SxCwYP`.
- The PC repair reserves `E` for interaction, makes the prompt and action use one range, adds visible-prop collision coverage, and replaces the repeated perimeter dressing with compact per-chapter authored dressing. Source commit `0c4630a` was verified on candidate `dpl_A97dm31JWoJPN7u8kUvSCGTGjDyW` (5/5 in 1.3 minutes), then promoted as production `dpl_5oyUeBUT7ra13ZAeFeCNWSTbJWhT`; the public smoke passed 5/5 in 1.1 minutes.
- The first-descent follow-up keeps gameplay sensors out of the capsule movement filter while preserving Rapier overlap queries. `E` now identifies the lever, confirms the latch, advances the objective to the echo plate, and announces the opened gate. A real desktop keyboard route verifies lever → recording → echo plate → exit completion locally.
- Follow-up source `31884e1` was verified on candidate `dpl_F6rWbcdYon6Q9mVUUzaEPvVGeRAT` (6/6 in 2.3 minutes), then promoted as production `dpl_76sKrPvgfYcSJCoLUqXAxD8UdbQJ`; the public [production URL](https://echo-depths-3d.vercel.app) passed the same 6/6 smoke in 2.1 minutes.
- Source `3612837` closes the Chapter 1 closed-door jump bypass with a full-height gate and gated ramp, removes the stray stair bar, preserves fixed gameplay sensors during snapshot restore, and completes Chapter 2's echo lever → boarded lift → upper dock → cargo-drop route. Candidate `dpl_B41ZFUiE1u4TKGg3PgVm1v8H4GtE` passed protected smoke 6/6 in 1.0 minute; production `dpl_GFqr3mn3kSzE4qb9i3JSPDrSE6L2` is Ready and the public [production URL](https://echo-depths-3d.vercel.app) passed 6/6 in 52.7 seconds.
- Source `3a9b0f9` adds a skippable Stage 00 orientation room before Chapter 1, a full controls reference in Settings, camera-heading carry placement with a short visual settle, a `1.5` device-pixel-ratio cap, and throttled camera-obstruction work. Its 1440×900 regression bounds render calls below 300 and triangles below 300,000. Candidate `dpl_8EMLhJqJPs4RAu6mNYfMgCz1cu9S` passed 6/6 in 53.7 seconds; promoted production `dpl_H6tdJdqpqS82QWid7dFpHbgzpzFi` is Ready and the public [production URL](https://echo-depths-3d.vercel.app) returned HTTP 200 and passed 6/6 in 1.1 minutes.
- Source `b1d4981` anchors carried cargo at the character's visible hand side, guarantees a minimum forward gap through movement and camera turns, and keeps an independent carry collider at the authored drop trajectory. Candidate `dpl_3xxaY6kiZowbhANr9D6NkuHam2RZ` passed 6/6 in 1.2 minutes; promoted production `dpl_FJYteX8jJN6tRvSqiKnkyGfwJ1Vx` is Ready and the public [production URL](https://echo-depths-3d.vercel.app) returned HTTP 200 and passed 6/6 in 1.3 minutes.
- Source `6046e00` repairs late-campaign clearability: Chapter 3 now has a physical descent and continuous bridge-side walk, a catch-height throw, and an unobstructed east route; Chapter 4 keeps the echo-lured watcher in its readable strike position and uses a reachable non-overlapping trap; Chapter 5 treats the powered echo-held lower seal as the guardian lure. Local strict build, 88 Vitest checks, Playwright 13/13, and visual Chapter 3–5 capture review pass. Candidate `dpl_3AN2dPKpusX5waCJnAMoTv7i1Wc2` passed 6/6 in 56.5 seconds; promoted production `dpl_DT6wvejwq8Txz1BtMTpfvRaiP17s` is Ready, and the public [production URL](https://echo-depths-3d.vercel.app) returned HTTP 200 and passed 6/6 in 56.7 seconds.
- Source `6b17461` replaces the oversized circular pressure buttons in Chapters 1, 2, and 5 with compact security scanners: a low metal deck, inset scan panel, guide rails, and four accent-lit beacons. Existing Rapier sensor volumes and all echo/cargo puzzle conditions are unchanged. Candidate `dpl_8uP6jsXu17BHB1WUo79ipXe3H7HR` passed 6/6 in 1.1 minutes; promoted production `dpl_2EoEkQKZQmJmn91VJnFtFHcuwh9y` is Ready, and the public [production URL](https://echo-depths-3d.vercel.app) returned HTTP 200 and passed 6/6 in 54.4 seconds.
- Source `0c9b60e` gives every chapter's interactive machinery the same authored industrial language: console levers, vault doors, reinforced elevators/platforms/bridges, framed cargo, contained cores, recessed traps, transit arches, receiver cradles, armored sentries, and signal-banded structural pillars. The visual meshes remain separate from existing Rapier bodies and sensors. Candidate `dpl_24QfQ97NV5ZfJSnvNe7pJ97pc6vz` passed 6/6 in 2.0 minutes; promoted production `dpl_GmnucrocKXFNKB5qqFarh4rdV8Df` is Ready, and the public [production URL](https://echo-depths-3d.vercel.app) returned HTTP 200 and passed 6/6 in 1.8 minutes.
- Source `a7e88b1` refines the PC control path without changing echo frames or authored puzzle speeds: movement eases to a stop, reverses decisively, mouse drag supports a bounded vertical orbit, and camera collision shortening remains continuous between 30 Hz ray probes. Candidate `dpl_2mR1KvPWjb2tFffvbtsmyyvxEDEA` passed 6/6 in 1.1 minutes; promoted production `dpl_6xtAgui3NMukXpfwJzCe3B3Rz4bV` is Ready, and the public [production URL](https://echo-depths-3d.vercel.app) returned HTTP 200 and passed 6/6 in 54.5 seconds.
- Source `6555825` adds distinct synthesized device audio: lever/carry actions, pressure scanner press/release, vault-door open/close, receiver charge, and moving elevator/platform/bridge start, loop, and stop. Candidate `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz` passed production smoke 6/6 in 1.1 minutes, then promoted production `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC` returned HTTP 200 and passed public smoke 6/6 in 1.2 minutes.
- Source `b2e687a` opens every Chapter Select card from Chapters 1–5 before any clear on the public production URL. `STARTING_UNLOCKED_THROUGH` is the single restore point: set it back to `1` when sequential campaign unlocking should return. Stage 00 remains the separate Start-flow tutorial. Build, 96 unit tests, a targeted Chapter Select browser assertion, the full 15/15 Playwright suite, candidate smoke 6/6, and public smoke 6/6 pass.
- Physical-keyboard and real-device touch feel, subjective puzzle readability, fairness, difficulty, and overall fun remain human-review work. Automated desktop-keyboard and mobile-touch Chapter 4–5 walkthroughs cover the complete physical solutions without test-only state mutation.

Exact GitHub, candidate, production, build-log, and public verification evidence is recorded in `DEPLOYMENT.md` and `TEST.md`.

## Run locally

Requirements: Node.js and npm. The recorded local machine uses Node.js `v22.17.0` and npm `10.9.2`.

```powershell
npm ci
npm run dev
```

Vite serves the development build at `http://127.0.0.1:4537`.

```powershell
npm test -- --run
npm run build
npm run preview
npm run test:e2e
```

The preview server uses `http://127.0.0.1:4538`. See `TEST.md` for verified automation and the remaining human-review boundary.

## Controls

### Desktop

| Input | Action |
| --- | --- |
| `WASD` or arrow keys | Move |
| Mouse drag or `Q` / `C` | Orbit the camera; vertical drag adjusts height, `Q` / `C` yaw |
| `Space` | Jump |
| `E` | Use a mechanism, carry, set down, or catch |
| Left mouse or `J` | Directional attack and core redirect |
| Hold, then release right mouse or `K` | Preview the trajectory, then throw the carried object |
| `Shift` | Dash |
| `R` | Start or finish echo recording |
| `Esc` | Pause or resume |
| `F` or the HUD button | Request fullscreen |

`E` is reserved for interaction. Whenever the cyan outline and `E` prompt are visible, pressing `E` uses that nearby object; it never rotates the camera. Drag horizontally to yaw, vertically to adjust the quarter-view height, or use `Q` / `C` to yaw. The player's nearest usable object receives a cyan outline and localized prompt; an active echo receives a separate violet interactable outline.

When carrying a crate or core, turn the camera toward the intended path: its visible mesh holds at the character's hand side with a guaranteed forward gap and quick settle rather than orbiting through the character. Its carry collider remains on the authored drop path, so Chapter 2 cargo placement stays reliable.

### Mobile

The left zone is a virtual movement stick, the right zone rotates the camera, and separate buttons provide jump, use, attack, throw, dash, and echo. Pause, sound, and fullscreen remain available in the HUD. Pointer capture supports simultaneous movement, camera, and action input. Input is released safely on pointer end or cancellation, window blur, page hiding, and orientation change. Portrait orientation shows localized landscape guidance and pauses simulation.

## Echo rule

The runtime advances gameplay at 60 fixed ticks per second. A recording stores quantized world-space movement axes, discrete jump, interaction, attack, throw, and dash presses, plus tick-aligned position and facing samples. The transform samples make Echo 2.0 replay drift-free; they are consumed in lockstep with the ordinary recorded actions.

Starting a recording captures a motor snapshot plus the mutable dungeon snapshot. The motor record includes position, velocity, grounded state, facing, dash phase/cooldown, coyote time, and jump buffer. The dungeon record includes facts; device transforms, active actor, hold time, and motion progress; crate/core transforms, velocities, body type, and carry ownership; receiver state; enemy state, facing, target visibility, last-known/stimulus positions, alert/search/recovery timers, knockback, detection, and defeat; platform timeline phase; and escape time. Fixed gameplay plates, levers, and exits retain their Rapier sensor configuration when that snapshot is restored. Finishing the tape rebuilds the chapter, restores that record-start state, remaps past player ownership to the echo, applies each recorded transform through the Echo's real kinematic body, and routes recorded actions through the same world resolver used by the present player. When the tape ends, the echo stops moving, suppresses one-shot actions, and may continue holding interaction. Starting another recording dissolves and replaces the previous echo. Player and echo character controllers ignore one another.

The current runtime tape limit is 15 seconds. A cyan/magenta route line, timeline, translucent actor, record-start/end temporal pulses, recording feedback, and replay state communicate the loop.

## Chapters

**Stage 00 — ORIENTATION CHAMBER** — a safe, skippable PC-only drill before the campaign: move, rotate the camera, jump, activate a console, lift a crate, and record/release an echo. The Settings screen contains the same complete keyboard and mouse reference.

1. **THE FIRST DESCENT** — record the tutorial lever and a final plate hold, then climb the stair and jump route through the gate.
2. **COUNTERWEIGHT HALL** — let the echo hold the lower lift lever, ride upward, and drop the upper crate onto the lower weight plate.
3. **THE SPLIT ATRIUM** — have the echo throw the core and hold the bridge lever; catch, redirect, and socket the core from the present route.
4. **THE WATCHER'S GALLERY** — record the Echo ringing the physical bell and remaining visible, stay behind cover, climb the real upper flank, strike from the rear and above, and let the resulting physical knockback carry the Watcher into the spike trap before using the released exit.
5. **THE PARADOX WELL** — use the first Echo recording to carry and throw the one physical Core into the receiver, replace it with a second recording that ends on the lower seal, ride the powered platform, make the Guardian truly see the Echo, break the rear seal from above, hold the upper seal at the same time, and escape through the released final door within 35 seconds.

`GAME.md` records the actual device conditions and full solution sequence for every chapter.

## Technical structure

| Area | Primary files | Responsibility |
| --- | --- | --- |
| Application loop | `src/app/GameApp.ts` | Modes, 60 Hz stepping, echo lifecycle, campaign transitions, stats, reset, stale-async-rebuild guard, public test API |
| Physics | `src/physics/RapierWorld.ts`, `src/physics/CharacterMotor.ts` | Rapier world, rigid bodies, fixed sensors configured for kinematic overlap, capsule controller, gravity, stairs, slopes, jump, dash |
| World | `src/world/DungeonWorld.ts`, `src/levels/layouts.ts` | Stage 00 orientation room plus five rendered/physical campaign layouts, devices, cargo, cores, enemies, doors, elevators, moving platform, victory facts |
| Pure rules | `src/game/` | Input quantization, echo tape, fixed stepping, authored objectives, devices, trajectory, sight, knockback, reset state, localization tests |
| Rendering | `src/render/` | KayKit loading, skeleton cloning, clip mapping, AnimationMixer crossfades, camera follow and obstruction handling |
| UI/input | `src/ui/`, `index.html`, `src/style.css` | Bilingual HTML/CSS presentation, desktop and multi-touch input, fullscreen safety |
| Audio | `src/audio/AudioDirector.ts` | Generated Web Audio cues and teardown |

Visual meshes and Rapier records are separate. Dynamic objects and actors synchronize from physics after each simulation step, while character meshes ease toward the deterministic motor yaw. Chapter rebuild disposes actor controllers, animation actions, world geometry/materials, physics bodies/colliders, route geometry, and trajectory geometry before creating the next runtime. A generation token discards an obsolete asynchronous Rapier initialization if a newer rebuild or application destruction wins the race.

## KayKit assets

The public bundle contains a selected 50-file, 5,703,863-byte subset from the official free KayKit Adventurers, Character Animations, Dungeon Pack, and Resource Bits archives. The two shared 1024×1024 color maps were downscaled to 512×512 with bicubic resampling. `GLTFLoader` loads the character, five animation libraries, and selected environment/resource models from `public/assets/kaykit/manifest.json`. `AnimationMixer` maps 13 required states and crossfades between them. If loading or clip coverage fails, the game falls back to its code-built animated rig and reports `assetStatus: "procedural"`.

All four packs are by Kay Lousberg and carry CC0 1.0 terms. The exact selected files, archive hashes, file hashes, dimensions, and transformation record are in `ASSET_CREDITS.md` and `public/assets/kaykit/provenance.json`. No Hollow Knight code, characters, animation, sound, or artwork is used.

## Test interface

The browser exposes:

- `window.render_game_to_text()` — JSON containing mode, language, chapter, camera and player state, echo state, timer, plates, levers, doors, elevators, cores, enemies, objective facts, score, reset/failure counts, touch-control visibility, fullscreen state, asset status, fixed tick, and escape time.
- `window.advanceTime(milliseconds)` — deterministic fixed-step advancement.
- `window.echoDepthsDebug` — development-only chapter selection, manual fixed-tick advancement, chapter restart, and asset-status reading. It exposes no authored solution step, direct fact injection, teleport, or production surface.

## Repository boundary

This project is confined to `echo-depths-3d/`. The sibling projects `404-not-found`, `boss-forge`, `echo-heist`, `patch-run`, and `hollow knight` are protected. Their files, names, Git history, Vercel projects, and production aliases are outside this game's release scope. In particular, the `echo-heist` Vercel project and `https://echo-heist-gamma.vercel.app` may not be reused.

## Project records

- `PLAN.md` — pre-implementation delivery contract
- `GAME.md` — rules, systems, chapter solutions, ending, and reset contract
- `TEST.md` — commands, automated evidence, browser matrix, and human boundary
- `ASSET_CREDITS.md` — license and provenance ledger
- `DEPLOYMENT.md` — isolated release procedure and present external state
- `TASKS.md`, `progress.md`, `CODEX_LOG.md` — implementation and verification history
