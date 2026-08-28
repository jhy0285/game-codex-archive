# ECHO DEPTHS Verification Record

Snapshot: 2026-08-27, Asia/Seoul.

## Current result

| Layer | Command or method | Result |
| --- | --- | --- |
| Strict TypeScript | `npx tsc --noEmit` / build compiler | PASS |
| Production bundle | `npm run build` | PASS — 38 modules; JS 3,675.40 kB, CSS 22.71 kB; existing large-chunk warning remains non-fatal |
| Unit, pure-rule, state, and physics regression tests | `npm test -- --run` | PASS — 18 files, 143 tests |
| Complete development browser regression | `npm run test:e2e` against a fixed loopback Vite server | 19 unaffected cases passed in the complete 20-case run; the sole touch Chapter 5 failure was a straight-line receiver collision, not a game failure. After adding the canonical west sidestep, the affected Chapter 5 desktop/touch pair passed 2/2 in 7.5 minutes. |
| Chapter 5 safety and final-door regression | layout/world Vitest plus real desktop and touch Playwright routes | PASS — lower lanes remain separated; platform/flank/bridge/apron overlaps are guarded; final-door fact and 15-second timer begin only after the laterally retracting collider clears. |
| Chapter 5 candidate verification | production-smoke plus direct desktop/mobile UI entry against `dpl_GhFLxjcg12jgC2kXYdKh1c3HHko1` | PASS — smoke 6/6 in 1.2 minutes; HTTP 200, five cards, Chapter 5 playing, KayKit, mobile controls, no debug API, and no collected browser errors. |
| Chapter 5 production verification | production-smoke plus direct desktop/mobile UI entry against `https://echo-depths-3d.vercel.app` | PASS — `dpl_Hf9RE2xVSnJETE9ki9kW4h3drFjh` Ready; smoke 6/6 in 1.0 minute; `index-CAFm-gyQ.js`; no collected console/page/request errors and no production debug API. |
| Focused Chapter 5 desktop completion | `playwright test tests/chapter4-5-temporal.spec.ts -g "Chapter 5 completes"` with inherited production base URL removed | PASS — 1/1 in 3.0 minutes; one tape, one Core, receiver power, stable Guardian lure, high rear strike, live seals, 15-second escape, exit |
| Focused Chapter 5 touch completion | `playwright test tests/chapter4-5-mobile-walkthrough.spec.ts -g "Chapter 5 completes"` with inherited production base URL removed | PASS — 1/1; touch-only Core/Echo/platform/Guardian/seal/exit route. Test body completed in 5.2 minutes; Windows reporter/PTY returned late |
| Additional render smoke | `tests/chapter3-5-render-smoke.spec.ts` | Desktop Chapters 3–5 advanced into the mobile case without browser errors; the extra mobile result could not be independently finalized because the local Windows runner stopped returning filesystem/reporter output. The stronger touch-only full completion above remains the mobile acceptance result |

Chapter 5-specific unit coverage now proves receiver-gated Guardian dormancy, exact 8.5-unit/`0.94π` displayed-and-detected active FOV, lower-Echo lure hold at the central dais, front shield/rear seal state, horizontal plus vertical contact overlap, qualified high/rear strike, latched timer start without restart, chapter-authored Echo capacity, route-guide assembly, and the existing one-Core full solution.
| Chapter 4–5 success captures | focused desktop/mobile Playwright rerun with `ECHO_DEPTHS_SCREENSHOT_DIR` | PASS — 4/4 in 6.9 minutes; four PNG artifacts generated from successful physical routes |
| 2026-08-25 external release | Git/Vercel inspection | No deployment or production promotion performed; `main`, `fix/echo2-ch3-structural`, existing production, assets, and siblings unchanged |
| Local production-bundle smoke | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4541 npm run test:production` | PASS — 6/6 in 1.1 minutes |
| PC movement and camera continuity | Unit camera/motor checks plus real browser mouse drag then `W` movement | PASS — continuous 30 Hz obstruction sampling, bounded vertical orbit, smooth release, decisive reversal, and live keyboard movement |
| Chapter 2 desktop route | Playwright manual-step browser route | PASS — echo-held lift, board, cargo plate, and exit in 54.2 seconds |
| Local production-bundle smoke | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4541 npm run test:production` | PASS — 6/6 in 44.4 seconds |
| Local visual inspection | Settings, Stage 00, Chapter 1 console lever, Chapters 1–5 industrial devices, echo, ending, portrait/landscape captures | PASS for black-frame, missing-model, primary-overflow, device readability, and readability checks |
| Post-review runtime corrections | Source review plus strict compiler/unit/browser rerun | PASS locally |
| Candidate deployment | Browser run against `https://echo-depths-3d-d9o1c7o5e-ai-build3.vercel.app` | PASS — 5/5 in 59.7 seconds |
| Production deployment | Browser run and log review against `https://echo-depths-3d.vercel.app` | PASS — HTTP 200 and 5/5 in about 1.1 minutes; Vercel build Ready |
| PC-repair candidate deployment | Protected browser run against `https://echo-depths-3d-7c96p2th9-ai-build3.vercel.app` with Vercel automation bypass | PASS — `dpl_A97dm31JWoJPN7u8kUvSCGTGjDyW`, 5/5 in 1.3 minutes, including real desktop `E` interaction |
| PC-repair production deployment | Public browser run and log review against `https://echo-depths-3d.vercel.app` | PASS — `dpl_5oyUeBUT7ra13ZAeFeCNWSTbJWhT` Ready; 5/5 in 1.1 minutes; no Vercel runtime logs |
| First-descent candidate deployment | Protected browser run against `https://echo-depths-3d-lf5tp01cw-ai-build3.vercel.app` with Vercel automation bypass | PASS — `dpl_F6rWbcdYon6Q9mVUUzaEPvVGeRAT`, 6/6 in 2.3 minutes, including the complete PC Chapter 1 route |
| First-descent production deployment | Public browser run and log review against `https://echo-depths-3d.vercel.app` | PASS — `dpl_76sKrPvgfYcSJCoLUqXAxD8UdbQJ` Ready; 6/6 in 2.1 minutes, including Chapter 1 completion |
| First-two-stage candidate deployment | Protected browser run against `https://echo-depths-3d-8833u0nev-ai-build3.vercel.app` with Vercel automation bypass | PASS — `dpl_B41ZFUiE1u4TKGg3PgVm1v8H4GtE`, 6/6 in 1.0 minute |
| First-two-stage production deployment | Public browser run and log review against `https://echo-depths-3d.vercel.app` | PASS — `dpl_GFqr3mn3kSzE4qb9i3JSPDrSE6L2` Ready; HTTP 200 and 6/6 in 52.7 seconds |
| PC-orientation candidate deployment | Browser run against `https://echo-depths-3d-gmyhyvoil-ai-build3.vercel.app` | PASS — `dpl_8EMLhJqJPs4RAu6mNYfMgCz1cu9S` Ready; 6/6 in 53.7 seconds |
| PC-orientation production deployment | Public browser run and log review against `https://echo-depths-3d.vercel.app` | PASS — `dpl_H6tdJdqpqS82QWid7dFpHbgzpzFi` Ready; HTTP 200 and 6/6 in 1.1 minutes |
| Carry-anchor candidate deployment | Browser run against `https://echo-depths-3d-2nfru1hyn-ai-build3.vercel.app` | PASS — `dpl_3xxaY6kiZowbhANr9D6NkuHam2RZ` Ready; 6/6 in 1.2 minutes |
| Carry-anchor production deployment | Public browser run and log review against `https://echo-depths-3d.vercel.app` | PASS — `dpl_FJYteX8jJN6tRvSqiKnkyGfwJ1Vx` Ready; HTTP 200 and 6/6 in 1.3 minutes |
| Pressure-scanner candidate deployment | Browser run against `https://echo-depths-3d-8ghnf1fzn-ai-build3.vercel.app` | PASS — `dpl_8uP6jsXu17BHB1WUo79ipXe3H7HR` Ready; 6/6 in 1.1 minutes, including the desktop Chapter 1 echo-plate route |
| Pressure-scanner production deployment | Public browser run and Vercel log review against `https://echo-depths-3d.vercel.app` | PASS — `dpl_2EoEkQKZQmJmn91VJnFtFHcuwh9y` Ready; HTTP 200 and 6/6 in 54.4 seconds; no application runtime logs |
| Industrial-device candidate deployment | Browser run against `https://echo-depths-3d-kn26k7qm1-ai-build3.vercel.app` | PASS — `dpl_24QfQ97NV5ZfJSnvNe7pJ97pc6vz` Ready; 6/6 in 2.0 minutes, including the desktop Chapter 1 console-lever and echo-plate route |
| Industrial-device production deployment | Public browser run and Vercel log review against `https://echo-depths-3d.vercel.app` | PASS — `dpl_GmnucrocKXFNKB5qqFarh4rdV8Df` Ready; HTTP 200 and 6/6 in 1.8 minutes; no application runtime logs |
| PC-control candidate deployment | Browser run against `https://echo-depths-3d-b6amhisx3-ai-build3.vercel.app` | PASS — `dpl_2mR1KvPWjb2tFffvbtsmyyvxEDEA` Ready; 6/6 in 1.1 minutes |
| PC-control production deployment | Public browser run and Vercel log review against `https://echo-depths-3d.vercel.app` | PASS — `dpl_6xtAgui3NMukXpfwJzCe3B3Rz4bV` Ready; HTTP 200 and 6/6 in 54.5 seconds; prebuilt static output with no application runtime logs |
| Device-audio candidate deployment | Browser run against `https://echo-depths-3d-dsx4v836g-ai-build3.vercel.app` | PASS — `dpl_4woHwEHVLuGd8kXj8LAVGJg5Ypaz` Ready; smoke 6/6 in 1.1 minutes |
| Device-audio and all-chapter production | Public browser run and Vercel log review against `https://echo-depths-3d.vercel.app` | PASS — `dpl_48KTUWgRHef83bXB9u7Xd9koT3CC` Ready; HTTP 200 and final public smoke 6/6 in 1.2 minutes using 68 prebuilt files |
| Temporary all-chapter access | Fresh Chapter Select browser assertion | PASS — source `b2e687a` enables Chapters 1–5 before a clear and is included in the verified production deployment |
| Human play review | Physical input and subjective review | Not performed in the current record |

The local machine reports Node.js `v22.17.0` and npm `10.9.2`. The build command runs `tsc -b` before `vite build`. The recovered source passes the strict compiler settings in `tsconfig.json`: unused checks, fallthrough checks, unchecked-index checks, exact optional properties, isolated modules, and no emitted TypeScript output.

## Reproduce locally

From `echo-depths-3d/`:

```powershell
npm ci
npm test -- --run
npm run build
npm run test:e2e
```

Run the local game directly when visual inspection is needed:

```powershell
npm run dev
```

Development base URL: `http://127.0.0.1:4537`.

Production-bundle preview:

```powershell
npm run preview
```

Preview base URL: `http://127.0.0.1:4538`.

## 2026-08-25 temporal-mastery evidence

- `src/world/DungeonWorld.test.ts` now proves real bell stimulus without direct target assignment, visible Echo acquisition, the full attention lifecycle, late-patrol LOS, snapshot restoration of all perception timers/positions, rear/high attack acceptance, frontal/low rejection, physical knockback-to-trap, blocked early exit, one-Core receiver delivery, Guardian cover/target switching, positional strike rejection, powered-platform support motion, live dual seals, final door, and exit.
- `src/game/chapters.test.ts` requires minimal outcome facts: Chapter 4 hazard neutralization and Chapter 5 Core receiver, Guardian defeat, and final-door release. Internal throw/distraction/seal-history facts do not inflate victory requirements.
- `tests/chapter4-5-temporal.spec.ts` completes Chapters 4 and 5 through ordinary desktop keyboard input. `tests/chapter4-5-mobile-walkthrough.spec.ts` repeats both complete solutions using touch joystick, touch camera, and touch action buttons only.
- The full browser run also retains the Chapter 3 no-shortcut suite: one canonical Core, gate/shutter collisions, one-way direction, replacement Echo lifecycle, and full OBJECT TRANSFER. Its second-throw route uses the actual west edge of the half-width-3 temporal gate so the carried Core clears the physical collider before the negative attempt.
- No test calls an authored solution step, mutates world facts, teleports an actor/Core, sets defeated/receiver/seal/complete state, or enables test-only physics. Manual stepping advances the production fixed-step path; browser motion and actions remain real keyboard or touch events.

## Historical Vitest evidence: 88 passing tests

| File | Passing tests | Coverage represented |
| --- | ---: | --- |
| `src/game/fixedStep.test.ts` | 4 | 60 ticks/second, fragmented deltas, stalled-frame cap, invalid configuration |
| `src/game/echoTape.test.ts` | 6 | canonical input-only recording, snapshot cloning, identical action replay, safe terminal hold, replacement, capacity seal |
| `src/game/chapters.test.ts` | 10 | five authored chapters, every chapter's full victory fact set, watcher hazard rule, final guardian/synchronizer/timer rule, world-fact mapping |
| `src/game/devices.test.ts` | 5 | actor/cargo plate filtering, mass threshold, inactive bodies, momentary/toggle/latch levers, deterministic echo priority |
| `src/game/trajectory.test.ts` | 5 | launch solution, analytic preview, collision stop, redirect, generous bounded catch volume |
| `src/game/sight.test.ts` | 3 | cone/range/height rejection, pillar and wall occlusion, order independence |
| `src/game/knockback.test.ts` | 3 | directional cone, high-side multiplier without health, mass and speed cap |
| `src/game/i18n.test.ts` | 4 | complete Korean/English catalogs, missing-value detection, chapter/objective keys, variable substitution |
| `src/game/state.test.ts` | 7 | fresh chapter state, complete campaign reset, transient facts, exact timeout tick, objective-gated completion, rank stability, independent metrics |
| `src/physics/RapierWorld.test.ts` | 6 | real fixed-sensor/kinematic overlap, sensor-transparent capsule movement, rotated static collider orientation, character blocking against solid geometry and cargo, and upper-dock traversal |
| `src/app/failureReason.test.ts` | 8 | localized mapping for trap, lost core, timeout, sight, guardian, echo, and generic defeat |
| `src/audio/AudioDirector.test.ts` | 2 | active cue reset and sound-preference preservation |
| `src/world/DungeonWorld.test.ts` | 22 | Stage 00 containment, camera-heading hand placement, movement/turn hand-clearance, authored drop trajectory, ramp traversal, authored solid decor, compact pressure-scanner construction/active feedback, industrial assembly coverage for every device type, prompt/action range, live grounded echo-plate gate, snapshot-preserved sensors, player-only exit, Chapter 2 cargo/dock route, Chapter 3 physical descent/bridge and full core route, Chapter 4 echo lure/high-flank trap route, Chapter 5 core/guardian/dual-seal exit chain, core loss, effect disposal |
| `src/render/AssetLibrary.test.ts` | 2 | truthful KayKit activation and procedural fallback status |
| `src/render/CameraRig.test.ts` | 1 | caller-owned direction-vector reuse |
| `src/ui/i18n.test.ts` | 2 | saved-language parsing/storage and UI translation completeness |
| **Total** | **88** | **All recorded Vitest checks passed** |

Parameterized cases are counted individually. The final suite contains 16 test files and 88 passing tests.

## Runtime corrections after source review

- Echo recording now captures/restores player motor state and the mutable dungeon snapshot, including device/dynamic transforms, velocities, body/carry ownership, receiver, enemy, support motion, facts, and timer.
- Chapter 5 guardian contact uses the original target distance before normalizing its movement direction.
- The lower echo plate and upper player lever are evaluated as current simultaneous state; their facts are removed on release.
- Carry animation, hold-to-preview/release-to-throw behavior, fast-tap throw edge capture, trap sensor intersections, smoothed actor facing, three-ray wall/door checks before enemy displacement, stale actor-target cleanup, interaction highlighting, temporal pulses, asynchronous rebuild protection, and actor-owned cloned asset cleanup are connected in runtime.
- Fixed gameplay sensors now opt into the Rapier collision types needed for fixed-sensor/kinematic-body pairs; the new test exercises an actual physics step and intersection query.

Strict TypeScript, all 77 unit tests, the final production build, the 9-scenario development browser suite, and the 5-scenario local production smoke pass after the PC interaction/layout repair.

## PC interaction and layout repair

- `E` is tested from a real keyboard event at the exact point where the desktop prompt is visible; the tutorial lever must latch in both the development suite and production-bundle smoke.
- `Q` / `C` now rotate the camera, leaving `E` as an unambiguous interaction key.
- Physics regressions prove that the shared capsule motor stops at authored solid geometry and loose cargo. A world regression proves that a prompt-visible lever accepts interaction.
- Chapter screenshots were re-inspected at `1440x900`. Repeated, non-physical perimeter decor was replaced with sparse per-chapter dressing; visible structural dressing has matching Rapier collision and camera-obstruction registration.
- Release evidence: source `0c4630a` built as 57 prebuilt static files after the local strict Vite build, candidate `dpl_A97dm31JWoJPN7u8kUvSCGTGjDyW` passed protected smoke 5/5 in 1.3 minutes, and promoted production `dpl_5oyUeBUT7ra13ZAeFeCNWSTbJWhT` passed public smoke 5/5 in 1.1 minutes.

## First-descent sensor and feedback follow-up

- The production-style keyboard reproduction placed a stopped echo at the first plate while the plate stayed inactive: the capsule controller treated sensor colliders as walkable solids and lifted the echo above the overlap volume.
- The motor now ignores tagged gameplay sensors for movement while Rapier continues to report their intersections. A physics regression and a world regression require a grounded echo to keep `echo-plate` active and open `first-door`.
- The first lever prompt names its action, `E` shows a bilingual latch explanation, and the objective progresses through lever, echo plate, and exit states. The ninth desktop Playwright story drives the complete keyboard route through the chapter-complete screen.
- Release evidence: source `31884e1` was uploaded as 58 Vercel Build Output files, candidate `dpl_F6rWbcdYon6Q9mVUUzaEPvVGeRAT` passed 6/6 in 2.3 minutes, and promoted production `dpl_76sKrPvgfYcSJCoLUqXAxD8UdbQJ` passed the public 6/6 smoke in 2.1 minutes.

## First-two-stage completion repair

- Chapter 1 now has a full-height closed gate, a gated ramp, and a narrowed upper floor beyond the passage. The removed horizontal stair dressing can no longer block the intended ascent, and a regression proves that jumping cannot reach the upper exit while `first-door` is closed.
- Snapshot restoration no longer changes fixed plate, lever, or exit colliders into blocking solids. The regression records and rewinds the Chapter 1 echo route, then requires the real pressure sensor to remain active and open the gate.
- Chapter 2's lift waits for the player to board, carries the player to an adjacent static upper dock, and leaves an open cargo drop edge. Regressions cover dock traversal, carrying the crate, its fall onto the lower plate, and the completion route.
- The 11-story PC suite retains a real-keyboard `E` interaction assertion and adds deterministic fixed-tick scenarios only to avoid render-frame timing races. Mobile behavior is outside this repair's validation scope.
- Release evidence: source `3612837` passed strict build, Vitest 81/81, Playwright 11/11, and local production smoke 6/6. Candidate `dpl_B41ZFUiE1u4TKGg3PgVm1v8H4GtE` passed protected smoke 6/6 in 1.0 minute; promoted production `dpl_GFqr3mn3kSzE4qb9i3JSPDrSE6L2` passed public smoke 6/6 in 52.7 seconds.

## PC orientation, carrying, and render-cost follow-up

- A real-keyboard Stage 00 story completes movement, camera rotation, jump, console `E`, crate carry `E`, and record/release `R`; it then starts Chapter 1 through the visible continue control. The same test captures the 1440×900 tutorial screen.
- Settings is asserted to expose all nine keyboard/mouse control entries in both languages. The carry regression keeps the actor facing unchanged while proving the carried crate moves toward the camera heading.
- The 1440×900 render-state check requires a device pixel ratio no higher than `1.5`, fewer than 300 draw calls, and fewer than 300,000 triangles. Camera obstruction raycasts/fade work is sampled at 30 Hz.
- Release evidence: source `3a9b0f9` passed strict TypeScript, Vitest 83/83, Vite build, Playwright 13/13 in 3.3 minutes, and local production smoke 6/6 in 44.9 seconds. Candidate `dpl_8EMLhJqJPs4RAu6mNYfMgCz1cu9S` passed 6/6 in 53.7 seconds; promoted production `dpl_H6tdJdqpqS82QWid7dFpHbgzpzFi` returned HTTP 200 and passed 6/6 in 1.1 minutes.

## Carry-anchor follow-up

- The visible cargo mesh now uses a chest-height, hand-side target, a 1.02-unit minimum forward gap, and a rapid catch-up rate. A 180-degree camera turn snaps the visual cargo to the new safe side rather than sweeping it through the character.
- The invisible carry collider retains its authored forward/height path so the Chapter 2 dock release and lower weight-plate drop remain unchanged. The physical route regression and full Chapter 2 browser route both pass.
- The Stage 00 browser path captures the held practice crate and visual inspection confirms the crate is outside the character silhouette.
- Release evidence: source `b1d4981` passed strict TypeScript, Vitest 84/84, Vite build, Playwright 13/13 in 3.0 minutes, and local production smoke 6/6 in 50.4 seconds. Candidate `dpl_3xxaY6kiZowbhANr9D6NkuHam2RZ` passed 6/6 in 1.2 minutes; promoted production `dpl_FJYteX8jJN6tRvSqiKnkyGfwJ1Vx` returned HTTP 200 and passed 6/6 in 1.3 minutes.

## Late-chapter clearability follow-up

- Chapter 3's physical route now descends from the west shelf, crosses an aligned bridge-side walk without a kinematic collider wall, and reaches the east receiver/exit floor. Its echo throw uses a lower, catchable arc.
- Chapter 4's lure locks the watcher in a readable strike lane. The trap no longer overlaps the starting watcher, and the high-flank knockback route reaches it deterministically.
- Chapter 5's powered, echo-held lower seal is an explicit guardian lure, so the intended powered-core → echo lure → high attack → dual-seal route does not require an unhinted sight-cone detour.
- Source `6046e00` passes strict TypeScript/Vite build, Vitest 88/88, Playwright 13/13 in 3.1 minutes, the targeted Chapter 2 browser completion in 54.2 seconds, and local Chapter 3–5 screenshot review. Candidate `dpl_3AN2dPKpusX5waCJnAMoTv7i1Wc2` passed 6/6 in 56.5 seconds; promoted production `dpl_DT6wvejwq8Txz1BtMTpfvRaiP17s` is Ready, and the public alias returned HTTP 200 and passed 6/6 in 56.7 seconds.

## Browser-facing API

### `window.render_game_to_text()`

Returns a JSON string containing:

- mode and language;
- chapter number;
- player position, velocity, grounded state, and current animation;
- echo mode, playback tick, duration, position, and animation when spawned;
- elapsed timer and final escape seconds;
- pressure plates, levers, doors, elevators/platforms, cores, and enemies;
- required objective facts, collected facts, and chapter completion;
- score, reset count, failures, and echoes created;
- mobile-control visibility and fullscreen state;
- KayKit/procedural asset status and fixed simulation tick.

### `window.advanceTime(milliseconds)`

Advances the same fixed-step loop used by real rendering without depending on wall-clock frame delivery. Negative and non-finite values are ignored.

### Development-only `window.echoDepthsDebug`

The development build exposes constrained operations for chapter selection, tutorial completion, manual fixed-tick stepping, exact tick advancement, chapter restart, and asset-status reading. It exposes no input injection, authored solution step, fact mutation, teleport, or outcome setter. The production build does not expose this object.

## Required Playwright story

Browser verification is only final when one coherent run covers:

1. loading and visible 3D scene with `assetStatus: "kaykit"`;
2. first-run English and Korean selection plus translated title, Settings control reference, HUD, objective, pause, failure, completion, ending, loading, error, and orientation copy;
3. Stage 00 start, each PC tutorial drill, skip/continue flow, and Chapter 1 transition;
4. real keyboard movement, jump, interaction, directional attack, throw, dash, camera movement, camera-heading carry, and echo recording/replay;
5. Chapter 1 lever plus echo plate;
6. Chapter 2 echo lever, elevator height, and cargo plate;
7. Chapter 3 echo core throw, catch, redirect, receiver, and bridge;
8. Chapter 4 real bell stimulus, cover, actual Echo visibility, rear/high strike, physical knockback-to-trap, released door, and exit;
9. Chapter 5 one real Core carried/thrown by the first Echo, replacement Echo lower-seal occupancy, actual Guardian visibility/target switch, powered-platform traversal, rear/high seal break, live simultaneous devices, final-door release, timer, and exit;
10. ending statistics, final rank, full replay reset, and chapter restart reset;
11. fullscreen success or rejection without unhandled errors;
12. portrait guidance at `390x844`, landscape multi-touch at `844x390`, and readable layouts at `1024x768` and `1440x900`;
13. no document overflow, clipped primary controls, black canvas, missing actor, broken animation, first-party asset failure, page error, console error, or request failure.

The fifteen-scenario browser suite covers this story through real keyboard/mouse/touch entry paths plus deterministic development-only chapter stepping. It also asserts that a fresh campaign leaves every Chapter Select card enabled. It passes 15/15, automatically rejects page errors, console errors, and request failures, and produced the inspected capture set. Subjective feel and unaided puzzle discovery remain human-review items.

## PC movement and camera follow-up

- `CharacterMotor` retains authored top speeds and fixed-step echo inputs while using distinct regular acceleration, release deceleration, and opposite-direction braking. Rapier regression checks prove a nonzero easing release and a decisive reversal.
- `CameraRig` caches the last obstacle distance across 30 Hz ray probes, damps its per-frame recovery, and permits a clamped vertical mouse orbit. Unit tests reject a one-frame expansion between probes and keep the upper orbit bounded.
- The PC browser story drags the real canvas pointer vertically, waits for camera height to ease, then holds `W` and proves movement continues. `render_game_to_text()` supplies camera position solely as observable test state.

## Device audio follow-up

- `AudioDirector` has dedicated one-shot profiles for levers, pickup/drop, scanner press/release, door open/close, receiver charge, and mechanism start/stop. Elevator, platform, and bridge loops are keyed by device ID, so repeated world ticks cannot stack duplicate loops.
- `DungeonWorld` emits presentation events only when a door/plate state changes or a moving authored transform starts/stops. The app drains those events before and after physics, leaving puzzle state, snapshots, and echo input frames unchanged.
- Unit tests require a single mechanical loop per device, correct door/plate transition events, and an elevator start/stop derived from actual Chapter 2 movement. The full browser and local production-bundle suites pass without console, page, or request failures.

## Asset checks

The provenance audit compared every selected file's current byte length and SHA-256 hash against `public/assets/kaykit/provenance.json`:

- selected files checked: 50;
- length matches: 50/50;
- SHA-256 matches: 50/50;
- selected file bytes: 5,703,863.

Runtime browser verification must additionally establish HTTP success for the manifest, character, five animation libraries, GLTF dependencies, textures, and representative environment/resource models.

## Visual inspection boundary

Automated captures can establish visible pixels, dimensions, state text, and coarse animation change. Final local inspection still needs to reject black frames, missing geometry, unexpected procedural fallback, static or malformed characters, opaque echo materials, unreadable sight cones, clipped HUD, overlapping touch controls, illegible Korean/English copy, and confusing device feedback.

The compact-scanner regression also asserts the pressure sensor remains a Rapier `plate` sensor while every campaign plate has the deck, frame, scan panel, guide rails, and four instanced beacons. An engaged echo plate must depress and brighten the panel and beacon materials.

The industrial-device regression instantiates Stage 00 and all five campaign chapters. It requires console levers, vault doors, reinforced moving decks, cargo frames, core halos, recessed traps, transit/receiver structures, armored sentries, and pillar signal bands while preserving every named Rapier record.

## Human-only boundary

Even a clean Playwright run does not establish:

- real keyboard, mouse, phone, or tablet comfort;
- finger drift and multi-touch ergonomics on physical hardware;
- subjective camera comfort, jump timing, movement weight, or attack/catch feel;
- whether each puzzle teaches itself spatially;
- perceived fairness, difficulty, pacing, and fun;
- natural bilingual wording, animation polish, audio balance, or motion comfort.

Those claims require a person to play and record observations. No such human pass is represented here.

## 2026-08-28 — Chapter 3–5 deep-audit evidence

- Reproduction: a real Chapter 4 target at `(-5.8, 1.08, -2.3)` remained visible while the Watcher reached approximately `(-0.115, 0.98, -0.854)` and then repeated the same blocked chase step through tick 240. The failing trace established the center-cover corner stall before the fix.
- Fix regression: `DungeonWorld` now chooses a deterministic clear side arc only for chase/lure/investigation. The same test proves the Watcher passes `x < -0.9` and `z < -1.05`; physical knockback keeps the direct-only collision path.
- `npm ci`: PASS, 57 packages installed, 0 vulnerabilities.
- Vitest: PASS, 18 files / 144 tests.
- Strict production build: PASS, 38 modules; the existing large Three.js bundle warning remains non-fatal.
- Focused Chapter 3–5 Playwright: PASS, 13/13 in 14.5 minutes. This includes desktop/touch completions, Chapter 3 shortcut rejection and recording lifecycle, and Chapter 4/5 full physical solutions.
- New real-browser chase regression: PASS, 1/1 in 17.3 seconds; screenshot inspection shows the Watcher beyond the cover corner with no collected page/console errors.
- Chapter 3–5 render smoke: PASS, 2/2 in 34.5 seconds. Desktop Chapter 3–5 and mobile Chapter 4–5 frames show the intended routes, continuous Chapter 4 floor, and bounded HUD/touch controls; console/page/request collectors are empty.
- Full Playwright: PASS, 21/21 in 20.5 minutes, including Chapters 1–5, tutorial/UI, desktop/touch, shortcut rejection, rendering, and the new pursuit route.
- Candidate `dpl_Bkdp37fWGdxnRV2LMu5FECTBcVzd`: Ready and HTTP 200. The first hosted smoke run passed 5/6; its Chapter 1 fixed movement sequence fell and reset before the exit, while the five UI/mobile/fullscreen/asset checks passed. The unchanged candidate rerun passed 6/6 in 1.0 minute, identifying the first result as the documented pre-existing hosted-path flake rather than a runtime regression.
- Promoted production `dpl_BisUo1jHoNnXg73CANdkinMg96QN`: Ready at `https://echo-depths-3d.vercel.app`; public smoke PASS 6/6 in 1.1 minutes.
- Direct public Chapter 3–5 audit: each returned HTTP 200 and entered `playing` with `assetStatus: kaykit`; Chapter Select exposed five enabled cards, Chapter 5 showed mobile controls at `844x390`, fixed ticks advanced, production debug remained absent, and page/console/request error arrays were empty. The public bundle is `index-DT-5l4KY.js`.
- Vercel runtime-log review: no logs exist for the static production deployment; deployment/alias status is Ready.

## 2026-08-25 Chapter 3–5 level-design rebuild evidence

The current feature branch is based directly on `origin/main` `410366f88ff3b935dc3137c161e886e3af523357`. The final verification set covers the rebuilt spatial routes rather than injecting facts or teleporting actors:

- `npm test`: PASS, 18 files and 130 tests in 2.00 seconds. Layout checks cover route separation, zero-jump authored traversal, basin dimensions, Core/receiver separation, removal of the duplicate lift, and camera occluder registration. World/Rapier tests cover directional one-way collision, full-height closed shutters, actual receiver intersection, one canonical Core, actual Watcher/Guardian LOS, the single moving platform, and simultaneous live seals.
- `npm run build`: PASS, TypeScript project build plus Vite production bundle, 38 modules in 452 ms. The existing large Three.js bundle warning remains nonfatal.
- Chapter 3–5 render/framing smoke: PASS, 2/2 in 25.5 seconds. It loads each rebuilt chapter, checks fatal console/page/request errors, and checks Chapter 4–5 mobile landmark/control framing.
- Focused real-input completion: PASS, 6/6 in 8.3 minutes. It completes Chapter 3 on desktop and touch, Chapter 4 on desktop and touch with zero jump input, and Chapter 5 on desktop and touch with one recording, one Core, and one platform.
- Local production-bundle smoke: PASS, 6/6 in 47.6 seconds. It verifies the built bundle's language/title/start flow, Chapter 1 route, mobile layout, fullscreen rejection, KayKit dependencies, error collectors, and absence of `window.echoDepthsDebug`.
- Final full Playwright: PASS, 20/20 in 12.6 minutes with one worker. It includes Chapter 1–2 regression, Chapter 3 structural shortcut rejection and full completion, Chapter 4–5 desktop/mobile completion, rendering, UI, asset, console, page, and request checks.
- Visual evidence: 17 PNGs cover Chapter 3 start/shutter/transfer/receiver, Chapter 4 start/cover/high flank/trap plus mobile start/final state, and Chapter 5 start/transfer/receiver/upper flank/final door plus mobile start/final door. Representative frames were directly inspected for visible actors, landmarks, routes, HUD, and non-overlapping landscape touch controls.

The automated evidence does not establish physical-phone ergonomics, unaided first-time puzzle comprehension, subjective camera comfort, difficulty, pacing, or fun. Those remain human playtest items.

## 2026-08-25 — One-way portal visual correction

- `npm test -- --run`: PASS, 18 files / 131 tests. The new regression checks the full portal mesh dimensions plus bright west-side pass arrows and bright east-side lock bars without altering the directional collision contract.
- `npm run build`: PASS. The existing large Three.js bundle warning remains non-fatal.
- Local Chapter 3 visual review: PASS. The quarter-view camera shows the enlarged translucent portal and its three top-facing directional arrows; browser error collection was empty.

## 2026-08-25 — Chapter 3 return-gate targeted evidence

- `npm test -- --run src/world/DungeonWorld.test.ts -t "Ch3 R|Ch3 N2|Ch3 E"`: PASS, 3 selected tests. It verifies receiver-inactive EAST → WEST Player denial, receiver-active Player passage, open-gate Echo/Core denial, receiver-state rewind restoration, and the existing same-Core Echo transfer.
- `npm run build`: PASS. TypeScript and the Vite production bundle completed; the pre-existing large Three.js bundle warning is non-fatal.

## 2026-08-25 — Chapter 3 transfer shutter targeted evidence

- `npm test -- --run src/world/DungeonWorld.test.ts -t "Ch3 M|Ch3 N2|Ch3 N3"`: PASS, 3 selected tests. It verifies closed-shutter Core denial, the same physical Core crossing after the east-side opening, and Player/Echo denial on the open Core-only lane.
- `npm run build`: PASS. TypeScript and the Vite production bundle completed; the pre-existing large Three.js bundle warning is non-fatal.
- Local Chapter 3 browser capture: PASS. The shutter shows full-span slats plus a persistent cyan actor seal; browser error collection was empty.

## 2026-08-26 — Chapter 4 Watcher presentation evidence

- `npm test -- --run src/render/AssetLibrary.test.ts src/world/DungeonWorld.test.ts`: PASS, 2 files / 55 tests. Coverage checks the distinct Watcher manifest asset, full Watcher object assembly, exact 7.2-unit patrol range, exact `0.62π` live patrol FOV, red acquired-target state, and target-beam visibility.
- `npm run build`: PASS. TypeScript and the Vite production bundle completed; the existing large Three.js bundle warning remains non-fatal.
- `PLAYWRIGHT_BASE_URL='' npm run test:e2e -- tests/chapter4-5-temporal.spec.ts --grep "Chapter 4 completes" --workers=1`: PASS, 1/1 in 1.0 minute. The real bell, cover, walkable ramp, high rear strike, trap, door, and exit route remains complete.
- Local production-bundle visual review: PASS at desktop and `844x390`; the KayKit hooded Watcher, animated patrol, ground range sector, sensor marker, HUD, and touch controls render visibly. Portrait `390x844` correctly shows rotate guidance. `agent-browser errors` and `agent-browser console` were empty.
- The initial Playwright invocation was an infrastructure-only failure because the inherited `PLAYWRIGHT_BASE_URL` pointed to a production build with no development debug API. Clearing that variable started the configured development server and the same Chapter 4 story passed.
- Vercel production `dpl_8AkqppynEF8urDfsXD6VSLuPfubD`: READY. The stable alias, manifest, and `Rogue_Hooded.glb` returned HTTP 200; the model response length is 381,432 bytes. Public Chapter 4 desktop/mobile captures show the hooded Watcher and sight boundary; page errors and console logs are empty; `window.echoDepthsDebug` is `undefined`.

## 2026-08-26 — Chapter 4 pursuit/trap targeted evidence

- `npm test -- src/world/DungeonWorld.test.ts src/levels/layouts.test.ts src/game/i18n.test.ts src/ui/i18n.test.ts`: PASS, 4 files / 64 tests. New coverage proves a real two-way patrol, Echo acquisition and trap-edge hold, a saturated warning meter without remote failure, Player catch failure on contact, snapshot target-lock restoration, and the existing physical knock-into-trap clear.
- `npm run build`: PASS. TypeScript and the production Vite bundle complete; the pre-existing large Three.js bundle warning remains non-fatal.
- Local Chapter 4 desktop completion: PASS, 1/1 in 46.8 seconds. The real bell, cover, no-jump ramp, high rear strike, spike intersection, door, and exit route remain completable.
- Local Chapter 4 touch-only completion: PASS, 1/1 in 1.6 minutes.
- Local browser inspection: PASS. Separate frames show the hooded Watcher at different points of the south patrol line, visibly separated from the spike bed; the spike ring/beacon/light are readable and the browser console contains no fatal errors.
- The first two Playwright attempts did not exercise local gameplay because the machine-level `PLAYWRIGHT_BASE_URL` pointed at a production build without the development-only debug API. Explicitly selecting the E2E-enabled local server resolved the environment mismatch; both desktop and touch completion stories then passed.
- Vercel production `dpl_CnusTWnFjMNBrWYt9WnGe1RHjrvT`: READY and aliased to `https://echo-depths-playtest.vercel.app`. The public HTML returns HTTP 200 and references the new verified `index-DNG9ShK_.js` bundle.
- Public smoke: 5/5 gameplay/UI stories passed in 1.0 minute; the KayKit manifest/dependency story initially hit the workstation's self-signed certificate chain, then passed 1/1 in 3.9 seconds with Node system CAs. Public Chapter 4 loads, mobile portrait/landscape works, console/page errors are empty, and `window.echoDepthsDebug` is absent.

## 2026-08-27 — Chapter 4 continuous-floor evidence

- `npm ci`: PASS, 57 packages installed, 0 vulnerabilities.
- Focused layout/world regression: PASS, 6 selected checks. The new motor probes cross the former west-perimeter gap and the former cover-to-patrol gap while remaining above `y=0.8` and grounded for the required ticks; the existing no-jump ramp and Chapter 4 outcome tests remain green.
- `npm test -- --run`: PASS, 18 files / 143 tests.
- `npm run build`: PASS, strict TypeScript plus Vite, 38 modules. The existing large-bundle warning remains non-fatal.
- Focused Chapter 4 browser acceptance: PASS, touch and desktop 2/2 in 2.3 minutes before the final color adjustment; the final desktop rerun passed 1/1 in 55.9 seconds.
- Visual inspection: PASS. The revised foundation is a continuous muted-cyan floor inside the walls, while safe, Echo, patrol, ramp, high-flank, trap, and exit surfaces remain distinguishable. No black frame, missing actor, clipped HUD, or malformed Watcher was observed.
- Full development Playwright: PASS, 20/20 in 17.7 minutes. It retains Chapter 1–5 desktop/touch completion, Chapter 3 shortcut rejection, chapter selection, rendering, input, and UI coverage.
- Candidate `dpl_7mTPt7rKgsLs1fYB6gynK28FLhtn`: Ready; production-bundle smoke PASS 6/6 in 1.2 minutes. A direct Chapter 4 browser check loaded `index-BC8hbp0t.js`, reported `assetStatus: "kaykit"`, exposed no debug API, and collected no page/console errors.
- Promoted production `dpl_35J6WSrWsaVW1PnvgzXpjhrJDbjd`: Ready at `https://echo-depths-3d-1v1nzwuw9-ai-build3.vercel.app`, aliased to `https://echo-depths-3d.vercel.app`. Final public smoke PASS 6/6 in 57.4 seconds; direct public Chapter 4 entry and final floor capture PASS. The static deployment returned no runtime logs.
