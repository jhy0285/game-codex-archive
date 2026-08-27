# ECHO DEPTHS — Delivery Plan

Status: Chapter 3–5 rebuild is on `main`; the 2026-08-27 Chapter 5 stabilization widens only the canonical upper/boarding route, preserves the separated lower lanes, removes camera-blocking geometry, and synchronizes the final door's physical clearance with the 15-second escape.

## Product contract

ECHO DEPTHS is an independent 3D quarter-view time-echo puzzle-action game. The present player records deterministic fixed-step input and discrete actions, then cooperates with one replacement echo across vertically authored dungeon spaces. The complete browser game includes five chapters, an ending, English/Korean presentation, desktop/mobile controls, clean restart, tests, and a separate Vercel production project.

The project is isolated to `echo-depths-3d/`. The protected projects `404-not-found`, `boss-forge`, `echo-heist`, `patch-run`, and `hollow knight` remain unchanged, including their Vercel project identities and public aliases.

## Technical architecture

- Vite static application with strict TypeScript and no React.
- Three.js owns the WebGL scene; semantic HUD, menus, touch controls, loading, errors, pause, rotation guidance, and ending remain HTML/CSS.
- Rapier 3D compatibility build owns collision bodies and colliders. A capsule-based kinematic character controller handles slopes, stairs, gravity, jump, landing, and moving-platform displacement.
- Render meshes and physics handles are separate records and synchronize after each simulation step.
- A 60 Hz accumulator drives gameplay. Echo recordings store normalized movement axes, facing/camera intent, discrete action bits, and tick-aligned transform/facing samples per simulation tick; replay applies those samples through the real Echo kinematic body and sends recorded actions through the same world resolver from the same chapter snapshot.
- GLTFLoader loads selected KayKit GLTF/GLB files when available. AnimationMixer actions use named clips, normalized locomotion speed, and crossfades for Idle, Walk, Run, Jump, Fall, Land, Carry, Throw, Interact, Attack, Dash, Hit, and Defeat.
- If the official files require a manual itch.io download, implementation and testing continue with original code-native low-poly visual rigs while preserving the loader/mixer integration point. A release using those temporary rigs is not represented as KayKit-integrated.
- Shared geometries/materials and instancing are used for repeated dungeon pieces. Pixel ratio is capped and quality defaults adapt for mobile.
- World teardown removes listeners, physics handles, animation actions, audio nodes, object references, and GPU resources before a chapter or full-game reset.

## Core rules

1. Recording toggles with `R`; confirming creates exactly one echo and restores the mutable chapter snapshot.
2. The echo follows its recorded transform/facing samples one fixed tick at a time through its kinematic body, replays only recorded actions, and holds its final input-neutral pose when its recording ends. It never plans, tracks a moving Core, auto-interacts, aims, or retries.
3. Present player and echo do not collide with each other; both can operate plates, levers, carried objects, thrown cores, attacks, and baitable enemy perception.
4. Object and actor updates have a stable order: input, moving supports, character controller, actions, dynamic objects, devices, enemies, objectives, then presentation.
5. Catch, redirect, interaction, and simultaneous-device windows use generous spatial/time tolerances.
6. Patrols and guardian phases are deterministic and reset from authored seeds; no random choice can invalidate a learned solution.
7. Chapter select is available after language selection. Statistics record play time, echo count, failures, chapter restarts, and final rank.

## Authored chapters and solutions

### 1. THE FIRST DESCENT

A lower pressure plate overlooks an exit balcony reached by stairs and a short jump. Record a walk onto the plate, create the echo, then climb while the echo holds the door. Spatial lighting and the visible door cable teach the rule before text is needed.

### 2. COUNTERWEIGHT HALL

Record the lower lever interaction and final plate hold. On replay, ride the enabled elevator to the upper gallery, carry the counterweight crate, and drop it onto the elevated weight plate to open the exit.

### 3. THE SPLIT ATRIUM

Two flat, parallel routes make the temporal relationship readable: the Echo carries and throws the sole Core along the north transfer lane while the present Player crosses the south one-way passage. Reaching the east side opens the physical transfer shutter; the Player then retrieves the same landed Core from the catch basin, places it in the receiver, and exits. No stairs, hidden catch flag, scripted post-catch flight, or automatic receiver completion remains.

### 4. THE WATCHER'S GALLERY

Record the safe bell route and leave the Echo in the Watcher's real sight lane. During replay, the present Player moves behind substantial cover, walks up one long gentle ramp without jumping, reaches the high rear flank, and uses one qualified directional strike so physical knockback carries the Watcher into the trap. The bell remains only an investigation stimulus; FOV, Rapier LOS, height, facing, and the trap decide the outcome.

### 5. THE PARADOX WELL

Use one recording for both past duties: the Echo transfers the sole physical Core through the north lane and then finishes on the lower seal. The present Player crosses the separate south route, opens the shutter, retrieves that same Core, and places it in the receiver. That receiver powers the level's only moving platform; boarding makes it rise and carry the Player to the upper Guardian flank. A real Guardian-to-Echo sight line, rear/high strike, and live upper/lower seal synchronization release the timed final passage.

## Input and presentation

- Desktop: WASD/arrows, drag or Q/C camera, Space jump, E use/carry, left click or J attack, right click or K throw, Shift dash, R echo, Esc pause, F/fullscreen button.
- Mobile: persistent multi-touch joystick, camera drag surface, jump, use, attack/throw, dash, echo, pause, and fullscreen controls; every button has at least a 48 px touch box and pointer capture.
- Input state clears on pointer cancellation, blur, hidden visibility, pause, reset, and orientation changes.
- Portrait shows localized landscape guidance and pauses simulation without discarding input history.
- Echo translucency, cyan/magenta trails, recording pulses, replay time, route preview, interactable highlighting, trajectories, landing dust, attack waves, restrained shake, failure reasons, and camera obstruction fading provide readable feedback.

## Verification gates

1. `npm ci` succeeds from the committed lockfile.
2. `npm test -- --run` covers fixed stepping, deterministic record/replay, objectives, reset, trajectory, devices, sight, knockback, and localization completeness.
3. `npm run build` succeeds with strict TypeScript.
4. `npm run test:e2e` covers language/start, real inputs, all five solutions, ending/replay reset, four target layouts, portrait/landscape touch, fullscreen rejection safety, asset HTTP status, overflow, and runtime error collection.
5. Local browser captures are inspected for every chapter plus portrait and landscape mobile layouts; black frames, missing characters, broken animation, clipped HUD, unreadable text, errors, and failed first-party requests fail the gate.
6. Only `echo-depths-3d/` paths are staged. The unrelated existing `echo-heist/package-lock.json` change remains untouched.
7. For the 2026-08-25 rebuild, commits are pushed only to `feat/ch3-ch5-level-design-rebuild`; `main` remains untouched and the change is offered as a pull request based directly on `main`.
8. The rebuild performs no manual Vercel deployment or production promotion. An automatically created pull-request preview may be inspected, but earlier production records remain historical facts for their recorded commits.

## Release records

`README.md`, `AGENTS.md`, `GAME.md`, `TASKS.md`, `TEST.md`, `ASSET_CREDITS.md`, `DEPLOYMENT.md`, `CODEX_LOG.md`, and `progress.md` will record the final implementation, tested solutions, asset provenance, commit hashes, deployment ID, production URL, machine evidence, and remaining human-only feel review.
