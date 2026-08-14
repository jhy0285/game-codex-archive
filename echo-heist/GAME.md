# ECHO HEIST

- **Title:** ECHO HEIST
- **Hook:** Record a route, cut it exactly when you choose, then coordinate with the echo that holds its final position.
- **Player fantasy:** Coordinate a heist with a perfectly faithful past version of yourself.
- **Controls:** E, Enter, or pointer begins from the first-load tutorial; WASD move, Space lock the current recording and start the next loop, E interact/extract, R restart the current sector, F fullscreen, Esc leave fullscreen.
- **First 10 seconds after beginning:** Movement starts recording automatically; the switch, sealed door, and goal are visible.
- **First 30 seconds:** Step onto the switch, press Space to lock the route immediately, then cross while the echo holds its final position.
- **Target 3-minute experience:** Learn manual echo locking in Sector 1, then use two synchronized bodies to charge and latch a dual-switch vault in Sector 2.
- **Core loop:** Move and act for up to 20 seconds, lock the recording when ready, then coordinate with the replayed prior loop.
- **Win condition:** Clear both sectors by entering each goal zone and pressing E.
- **Lose condition:** There is no death state in Gate 1; a failed attempt rolls into the next loop.
- **Score condition:** Gate 1 records the number of loops used; fewer loops is better.

## Must Build

Two compact sectors, manual Space recording lock, a 20-second maximum loop, automatic recording, one reliable ghost that holds its final position, pressure-switch/door interaction, a dual-switch synchronization puzzle, sector transition, victory, and fast restart.

## Should Build

Readable environmental art, clear object silhouettes, and restrained feedback motion that preserve puzzle readability.

### Approved First-Load Tutorial Prelude

Before the first recording begins, show one full-canvas tutorial prelude inside the existing Woven Under-Temple presentation. It teaches the complete Sector 1 idea in one glance: move and record with WASD, bind the route with Space, let the echo replay and hold its final position, cross the opened veil, and press E at the well. E, Enter, or a pointer press begins play immediately. The tutorial is interface instruction, not dialogue or story progression.

Visual thesis: a quiet ritual inscription over the same painted sanctuary, using the existing memory sigil, ink wash, ivory type, and open composition rather than a rectangular settings panel.

Content plan: one title, four short mechanic lines in play order, one dominant begin prompt, and one small utility-controls line.

Interaction thesis: the sanctuary and memory sigil continue their restrained ambient motion behind a darkened field; the begin prompt breathes gently; dismissal removes the veil in one input and releases a fresh 20-second recording.

Observable acceptance criteria:

- A fresh page load exposes `mode: "tutorial"` and exactly one visible canvas.
- The tutorial remains readable at 1440x900, 1366x768, and 1024x768 without clipping, overlap, or document scroll.
- While it is open, WASD, Space, and R cannot move the player, consume loop time, create an echo, increment locks, or bypass the tutorial.
- E, Enter, and pointer press each begin exactly one fresh Sector 1 run with 20 seconds, Loop 1, one seed recording sample, and no ghost.
- The tutorial does not reappear on sector transition, R restart, victory replay, or another loop within the same page session.
- The existing two-sector route, timing, geometry, controls, victory, restart, and deterministic test hooks continue to pass unchanged after dismissal.

### Approved Visual Direction -- Woven Under-Temple

The two approved sectors may be visually rebuilt as an original hand-painted gothic insect-fable. Keep every gameplay rule, coordinate, collision, control, timer, and puzzle requirement unchanged. Present the route puzzle as a memory-weaving rite inside a subterranean sanctuary: ink charcoal, bone ivory, faded mulberry, oxidized teal, enormous roots, hanging bells, burial silk, stone glyph shrines, a veiled gate, layered fog, and foreground silhouettes.

This direction may study broad presentation principles from atmospheric hand-painted games, including layered environments, readable silhouettes, particles, parallax, and camera feedback. It must not copy franchise characters, exact horn shapes, locations, motifs, logos, sprites, code, or extracted assets. All runtime artwork must be original, generated for this project, code-drawn, or explicitly licensed.

Observable acceptance criteria:

- Exactly two sectors and the existing complete solution remain unchanged.
- The old facility and Dream Fracture pixel backgrounds/sprites/fonts are no longer requested or rendered at runtime.
- Player, echo, shrines, veiled gate, goal, reliquary obstacles, HUD, transition, and victory presentation read as one original hand-painted under-temple style.
- Player and echo, idle and occupied switches, closed and open barriers, partial relay charge, latched relay, and goal interaction are distinguishable without relying only on labels.
- The screen contains at least background, gameplay/mist, and foreground-root depth planes, with a sparse ivory serif interface and no pixel font, arcade frame, neon laser, or rectangular modal presentation.
- `npm test`, `npm run build`, the two-sector Playwright solution, fresh web-game client output, and desktop/laptop layout checks pass without asset or texture errors.

Atmospheric depth polish may add original generated paintings, transparent character art, code-drawn organic glyphs, fog/silk planes, pooled particles, restrained camera impulses, and ink-wash transitions. These additions are presentation only: sector count, geometry, collisions, timing, controls, puzzle logic, and the complete solution must remain unchanged.

## Never Build

Multiplayer, accounts, backend, database, inventory, campaign, dialogue, level editor, or monetization.

## Parking Lot

Enemies, a second simultaneous ghost, and any additional puzzle mechanics beyond the approved two sectors remain deferred.

- Any additional visual themes beyond the approved Woven Under-Temple presentation remain deferred.

### Future Interaction Roadmap -- Not Approved

None of the mechanics below may be implemented until the second human playtest is complete and one candidate is explicitly promoted into the Gate 2 contract. Promotion must amend the current requirement that the existing two-sector solution remain unchanged.

#### First Gate 2 Candidate -- Echo Brace

Prototype one axis-locked sliding reliquary in a Sector 2 variant, not a third sector. Loop 1 ends with the player at one marked brace position. In Loop 2, the echo holds that position as a physical stopper while the current player shoves the reliquary along one authored lane into one socket, opening the exit.

This candidate uses only WASD, Space, E, R, and the existing final-position hold. It adds no carrying state, inventory, free physics, throw input, attack, enemy, jump, second ghost, or additional stage.

Observable promotion criteria:

- Exactly two sectors remain and Sector 1 is unchanged.
- The room contains exactly one sliding object, one axis, one socket, and one brace marker.
- The puzzle is solvable in two loops with the existing controls and impossible without the echo stopper because a solo shove overshoots the socket.
- Idle, sliding, misaligned, and socketed states are visually distinct; every failed attempt resets deterministically in under one second.
- Unit tests, build, Playwright, and a human test verify the route, reset, frame-rate consistency, and a recognizable cooperation moment within 60 seconds.

Only if Echo Brace tests well, evaluate these separately: one room-local shard with one fixed throw/catch arc; one fixed-direction deflection puzzle; then at most one deterministic, telegraphed guardian obstacle. A key may only be an immediate room-local socket state, never inventory.

Continue to defer free-angle throwing, general carrying or stacking, collectible keys, jumping, targeted combat, health or damage, enemy AI, multiple movable objects, additional simultaneous ghosts, campaign progression, story/dialogue systems, and additional stages. Do not extract, reverse-engineer, or imitate Hollow Knight code, assets, characters, locations, or signature motifs; only broad readability principles may inform original work.
