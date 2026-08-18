# ECHO HEIST — Game Contract

## Product promise

ECHO HEIST is a complete 15–25 minute top-down neon pixel puzzle-action game. The player records one route, binds it into an echo, then cooperates with that replaying past self to break out of a time-locked facility.

The first minute teaches the complete core loop through play: move to a glyph, bind the route, watch the echo repeat it, and cross the gate while both selves occupy different roles.

## Runtime and delivery

- Stack: TypeScript, Phaser, Vite, Vitest, Playwright.
- Delivery: static browser build in the existing Echo Heist Vercel project.
- Production alias: `https://echo-heist-gamma.vercel.app`.
- Desktop and mobile are first-class. Keyboard, mouse/pointer, and touch controls must all reach the ending.
- The runtime must remain deterministic under variable render frame rates by advancing gameplay on a fixed simulation step.

## Controls

### Desktop

- `WASD` or arrows: move.
- `E`: interact, pick up, or drop an object.
- `J` or primary pointer: pulse attack; while carrying, throw in the facing direction.
- `Shift`: phase dash through a short danger window.
- `Space`: bind the current route and restart the loop with an echo.
- `R`: restart the current chapter from a clean state.
- `Esc`: pause/help; `F`: fullscreen.

### Touch

- Four-direction pad: move.
- `USE`: interact, pick up, or drop.
- `PULSE`: attack or throw.
- `DASH`: phase dash.
- `ECHO`: bind the route.
- Pause/help and sound controls remain reachable without covering the puzzle objective.

## Echo rules

1. A loop lasts 24 seconds.
2. The current player’s resolved position, facing, and discrete actions are recorded on fixed simulation ticks.
3. Binding returns the player and resettable world objects to the chapter start. One visible echo replays the previous route and actions from the same initial state.
4. When the recording ends, the echo remains at its final position and can continue holding a plate.
5. A new bind replaces the previous echo; echoes never accumulate.
6. Chapter-persistent security breaches are explicitly marked as latched. All other objects, projectiles, enemies, timers, and hazards reset identically on bind or restart.
7. `R`, chapter transition, ending replay, and full-game restart dispose or reset every transient state exactly once.

## Six-chapter campaign

### 1. FIRST CUT — Learn the echo

- Preserve the established start `(145, 360)`, ALPHA glyph near `(300, 420)`, veil around `x=584`, and exit well near `(790, 340)`.
- In-world prompts teach move, bind, then simultaneous cooperation in that order.
- Solution: record a route ending on ALPHA, bind it, and cross the open veil while the echo holds the glyph.

### 2. DEAD WEIGHT — Move the evidence

- Introduce pickup/carry/drop, a cargo crate, a cargo plate, and a second person-only glyph.
- The echo must hold ALPHA while the current player places the crate on CARGO and crosses the gate.
- Pushing and carrying use generous, deterministic collision and snap zones.

### 3. CROSS SIGNAL — The handoff

- Introduce directional throw and pulse redirection.
- The echo repeats a recorded pickup and throw from a clearly marked launch pad.
- The current player intercepts the slow, previewed trajectory and pulses the core into a receiver. The receiver latches when solved.
- Catch/redirection windows are visually generous and never require frame-perfect timing.

### 4. SENTINEL SHIFT — Two-sided strike

- Introduce a deterministic guardian with a readable patrol/telegraph cycle.
- A single pulse only exposes the shield. A current-player pulse and echo pulse inside the displayed sync window eject the guardian into a containment rift.
- Failure feedback identifies whether the second strike was early, late, or from the wrong side.

### 5. FRACTURE RUN — Read the danger

- Introduce phase dash and fixed-cycle laser hazards.
- The echo holds a bypass plate while the current player dashes through a telegraphed corridor, moves a crate to safety, and reaches the exit.
- Laser states use anticipation, active, and recovery colors; contact explains the failure and performs a fast clean retry.

### 6. ZERO HOUR — Final breach

- Combine at least four learned systems: echo plate, cargo crate, core throw/redirection, pulse, guardian/hazard, and dash.
- Security objectives latch in a readable three-node breach display so the finale is strategic rather than repetitive.
- Completing the final exit triggers a authored escape animation, statistics, ending text, chapter select, and a full replay option.

## Feel and presentation

- Art direction: dark navy and violet facility, cyan current player, magenta echo, amber interactables, red hazards, mint exits.
- Pixel assets render with nearest-neighbor sampling. Camera/UI transitions, particles, trails, lights, and screen feedback remain smooth.
- Player movement uses immediate input with controlled acceleration/deceleration, an input buffer for actions, four-way animation, and readable state silhouettes.
- Pulse, throw, crate impact, plate activation, gate opening, guardian breach, damage, and escape each receive coherent particles, a short shake/hit-stop where appropriate, and an original Web Audio cue.
- The timeline shows loop time, recording/replay, action markers, and the echo’s upcoming path.
- Camera framing always keeps authored puzzle information visible; it never hides a required object behind the mobile controls.

## Art and rights boundary

- Hollow Knight code, assets, characters, maps, audio, UI, and exact motifs are prohibited.
- General feel principles—responsive input, readable silhouettes, coherent feedback, and polished transitions—may inform the work.
- Runtime environment sprites may use selected files from Murphy’s Dad’s Sci-Fi Facility Asset Pack under CC0. Echo-specific characters, time effects, trajectories, UI, and color language are original code-rendered work.
- Pixel_Poem’s pack was license-checked on 2026-08-14 but is not imported: its no-redistribution term is less suitable for this public source archive, and the already-vetted CC0 cyber pack better matches the project.

## Completion gates

- Start screen, playable tutorial, six escalating chapters, ending, chapter select, sound toggle, and complete controls exist.
- Echo action replay, crates/plates, throw/redirection, pulse knockback, predictable guardian/hazards, and the finale are real mechanics rather than text-only claims.
- Unit tests cover deterministic sampling/fixed-step behavior, crate/plate logic, guardian sync, stage completion, and clean reset.
- Playwright covers desktop and mobile start-to-ending paths, repeated reset, layout, and runtime error collection.
- Build passes; local and production browser runs have zero console errors and no failed first-party requests.
- `progress.md`, `TASKS.md`, `TEST.md`, `PLAYTEST.md`, `ASSET_CREDITS.md`, and `CODEX_LOG.md` accurately record the shipped state and any remaining human-only feel checks.
