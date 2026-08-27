# ECHO DEPTHS Game Contract

## Premise

The player descends a five-chamber temporal vault with one collaborator: a deterministic replay of their own recent actions. Each room is rewound when a recording is released. The echo performs the recorded route while the present player takes a complementary route through a different height, timing window, or line of sight.

The design uses 3D space as a rule, not as presentation alone. Floors are separated vertically; stairs and jumps change access; crates fall between levels; cores follow ballistic arcs; elevators and platforms carry actors; walls and pillars block sight; attacks have direction and height leverage; and final mechanisms require two versions of the same character.

## Runtime loop

1. A new campaign begins in the safe Stage 00 orientation chamber. It teaches PC movement, camera orbit, jump, `E` interaction, carry, and echo recording/release; it can be skipped and does not count as one of the five chapters.
2. The player enters a campaign chapter at its authored start.
3. Pressing `R` begins a fixed-tick recording and removes any older echo.
4. The tape captures current actor motor state and the mutable dungeon state, then quantizes movement, facing, held use, jump, use, attack, throw, and dash into one frame per 60 Hz simulation tick.
5. Pressing `R` again, or reaching the chapter-authored runtime limit (12/15/18/18/20 seconds for Chapters 1–5), seals the tape.
6. The chapter is rebuilt, the record-start motor and dungeon snapshots are restored, present-owned carry/device state is transferred to the past echo, and both actors begin from the recorded motor state.
7. The echo consumes one recorded transform/facing sample and one recorded input frame per fixed tick. Its real kinematic body follows the drift-free transform sample while recorded interactions, throws, attacks, and held use enter the same world resolver as present-player actions.
8. When replay finishes, the echo stands at its last simulated position. One-shot actions cease; held use may remain active so a momentary lever stays held.
9. Creating a new tape removes the old echo and restarts this cycle.

The displayed route line visualizes the same tick-aligned position samples that drive Echo 2.0 playback; it never grants collision, interaction, or objective facts by itself.

`EchoSnapshot` combines the player's `MotorSnapshot` with `DungeonWorldSnapshot`. It preserves position, velocity, grounded state, facing, dash phase/cooldown, coyote time, jump buffer, world facts, device transforms and active ownership, remaining hold time, elevator/platform motion progress and timeline phase, crate/core transforms and linear/angular velocity, dynamic versus kinematic body type, carry ownership, receiver state, enemy state/target/target visibility/facing/last-known and stimulus positions/alert-search-recovery timers/knockback/detection/defeat, and escape ticks. Restore clears failure/completion transients, retains the fixed gameplay sensors' sensor configuration, and remaps past player ownership to the echo before replay begins.

## Determinism

The simulation step is `1/60` second. Movement axes are normalized and quantized to signed 127-step values. Facing is quantized over 65,536 yaw values. Actions are bit fields divided into held and newly pressed states. Render-frame time is accumulated into fixed steps, with a capped catch-up path for stalled frames and a direct deterministic advancement path for tests.

The active runtime order is:

1. consume present input and transform camera-relative movement to world-space intent;
2. read the next echo frame;
3. update held levers, elevators, the moving platform, carried objects, doors, and the final timer;
4. sample moving-support displacement and prepare both capsule motors;
5. resolve present and echo interactions, throws, attacks, jumps, and dashes;
6. step Rapier;
7. synchronize actor positions, dynamic cargo, and core visuals;
8. evaluate plates, receivers, enemies, derived facts, exits, failures, HUD, and effects.

Both actors use capsule-shaped, position-based kinematic bodies. The character controller provides autostep, ground snapping, slope limits, gravity, coyote time, jump buffering, landing, acceleration/deceleration, and dash. Normal input builds speed responsively, released input decelerates more gradually, and a true opposite input uses a stronger reversal response; the same fixed 60 Hz motor executes present and echo frames. Each controller excludes player and echo colliders, so the two actors can cross without blocking one another. Fixed plate, lever, trap, and exit sensors enable Rapier collision types for kinematic participants, allowing the overlap query to observe player, echo, and enemy bodies.

## Interaction rules

- `E` activates nearby levers, picks up or sets down a crate/core, catches a nearby loose core while held, fills a receiver while carrying a core, or requests passage at an exit. The cyan outline, `E` prompt, and action use the same nearby-object query, so a displayed prompt always accepts the key. Carried cargo targets a point ahead of the active camera heading, then settles over a short interpolation rather than turning with locomotion yaw.
- Holding `K` or right mouse shows the carried core's dashed ballistic preview; releasing throws the carried object in the facing direction. A core receives stronger forward and upward velocity than a crate.
- `J` or left mouse attacks in the facing direction. A loose core within range is redirected. A watcher is pushed; higher attacks add leverage. The guardian accepts no health depletion and only yields to the authored flank condition.
- Pressure plates evaluate nearby actors and loose dynamic objects. They render as compact floor-security scanners with a metal deck, inset scan panel, guide rails, and four lit beacons; the panel depresses and all signal lights brighten when engaged. Chapter facts distinguish the required echo or cargo occupant.
- Momentary levers remain active while the recorded use input is held and the actor remains near them. Each lever is a console pedestal with a control screen, pivot, illuminated grip, and status indicator; the tutorial lever is latched.
- An exit completes only after every chapter-specific world fact is present and the player uses the passage.

## Feedback

The echo character uses transparent materials with cyan emission. Recording and playback states appear in the HUD timeline. A cyan/magenta path shows the sampled route, temporal rings mark record start and release, dashes create an afterimage, landings create a dust ring, attacks and device outcomes create restrained waves and camera shake, and a dashed ballistic line previews a carried core throw. Console screens, door stripes, platform beacons, and receiver rings brighten as their mechanisms activate; cores use containment halos, exits use transit arches, traps use recessed warning rails, and enemy characters use animated state markers plus their exact live sight sectors. The nearest usable object receives a cyan `BoxHelper` outline plus a localized prompt; device glow, opening doors, sight sectors, failure copy, and the 15-second final timer explain state changes.

Device state changes also drive synthesized Web Audio. Lever, pickup/drop, pressure-scanner press/release, vault-door open/close, and receiver charge each use a distinct one-shot cue. Elevators, powered moving platforms, and rotating bridges start a low mechanical loop only while their authored transform changes, then play a stop cue and release that loop at rest. These events are presentation-only; the fixed-step puzzle state and echo frames never depend on audio playback.

The camera is a damped quarter-view rig with velocity look-ahead, horizontal yaw, bounded vertical orbit, wall collision shortening, obstruction fading, and restrained shake. Pointer deltas are bounded per fixed tick to reject accidental jumps. Obstruction raycasts and material fading run at most 30 Hz, but the shortened camera distance is retained and damped every render frame, contracting quickly and recovering gently instead of snapping between probes. The renderer caps device pixel ratio at `1.5` and uses a 1536px desktop directional-shadow map. The rendered character yaw eases toward the fixed-step motor facing without changing the deterministic movement state.

## Chapters and actual solutions

### Stage 00 — ORIENTATION CHAMBER

**Rules taught:** PC movement, camera rotation, jump, `E` interaction, camera-led carrying, and echo recording/release.

This contained room has a console and practice crate but no campaign gate. The player completes six visible drills or chooses **Skip practice**. Completion starts Chapter 1 and does not affect chapter-clear statistics. Settings exposes the same keyboard/mouse control list at any time.

### Chapter 1 — THE FIRST DESCENT

**Rules taught:** movement, camera, jump, use, recording, replay, and an echo-held pressure plate.

The room begins on the lower floor. A latched tutorial lever, the cyan lower plate, a visible rising route, three clear steps, a gated jump ramp, and a full-height sealed upper gate expose the dependency spatially. The upper floor begins beyond the gate, so jumping beside or over a closed gate cannot bypass it.

**Solution:**

1. Press `E` at the tutorial lever to latch it, either before recording or during the tape.
2. Record a route to `echo-plate` and finish the tape while standing on the plate.
3. After the room rebuilds, let the echo repeat the route and stop on the plate.
4. As the present player, climb the three-step rise, jump to the gated ramp, cross only after the full-height gate opens, reach the upper exit, and press `E`.

Victory requires the tutorial lever fact, an echo specifically occupying the first plate, and the present player's exit request.

### Chapter 2 — COUNTERWEIGHT HALL

**Rules combined:** a momentary echo-held lever, vertical transport, upper cargo, and a lower mass plate.

The lift lever and elevator start below. The lift starts moving only after the player boards while the echo holds the lever. Its upper stop is a static side dock rather than an intersecting balcony. The two-unit crate starts on that upper dock, and the weight plate lies below its open drop edge while the exit remains above.

**Solution:**

1. Record a route from the start to `lift-lever`.
2. Press and keep holding `E` at the lever, then finish the tape. Held interaction survives at the end of replay.
3. On rewind, wait for the echo to reach and hold the lever, then board `counter-elevator`. It rises only after the player boards and stops beside the upper dock.
4. Press `E` near `cargo-crate`, carry it to the open `balcony-drop` edge, and press `E` again to set it down so it falls onto `weight-plate` below.
5. With the echo still powering the lift and the crate activating the required cargo plate, go to the upper exit and press `E`.

An actor alone does not satisfy the authored cargo requirement in the pure device rules; the crate supplies the required mass.

### Chapter 3 — THE SPLIT ATRIUM

**Rules combined:** one rewindable physical Core, parallel flat routes, a player-only one-way passage, an east-side transfer shutter, and a receiver.

The west and east rooms share one floor height. The north lane is the Core-transfer route and the south lane is the present Player route. The central divider, colored floor zones, shutter, one-way barrier, and east catch basin show which actor owns each lane. There are no required stairs or jumps.

**Solution:**

1. Begin recording, pick up `memory-core`, carry it along the north lane to the transfer ledge, and throw it east.
2. Continue the same recording back through the west room and cross the south route, then finish the tape after reaching the east side. Generic rewind leaves the live Player at that recording-end position.
3. Release the Echo. The live Player's real east-side position opens `transfer-shutter` while the Echo replays the north-lane pickup and throw.
4. Wait for that same Core to land in the east catch basin, pick it up, and carry it to `core-receiver`.
5. Drop the Core into the receiver, cross to the open east passage, and use the exit.

Victory requires only the physical receiver outcome and exit use. Exactly one `memory-core` exists; it must pass the shutter as a Rapier body and intersect the receiver sensor. Pickup, throw, catch, or redirect history is not synthesized into victory.

### Chapter 4 — THE WATCHER'S GALLERY

**Rules combined:** a deterministic patrol, facing and field of view, Rapier line-of-sight, wall/pillar occlusion, auditory investigation, visible Echo bait, alert/investigate/chase/recovery states, directional rear attack, height leverage, physical knockback, and a spike hazard.

The Watcher owns a real world position and facing. Each fixed tick it tests both Player and Echo against range, state-dependent FOV, and a cover ray; chooses an actually visible target; preserves last-known/stimulus positions for investigation; and returns through recovery to its patrol. `lure-bell` supplies only a world-space sound stimulus—the bell does not assign a target or defeat state. Patrol, chase, investigation, and knockback displacement use three parallel wall/door clearance rays across the enemy's width. The upper flank is reached by one long, gentle, walkable ramp, and the Watcher has no conventional damage goal. A continuous inset foundation now spans the gallery inside its perimeter walls, so route-reading mistakes do not cause unrelated falls; the raised safe, Echo, patrol, ramp, and exit slabs remain visually distinct and retain their authored cover and height relationships.

**Solution:**

1. Record a route that emerges from cover, approaches `lure-bell`, presses `E`, and ends with the Echo standing in the Watcher's real sight lane.
2. On rewind, stay behind authored cover while the bell produces an investigation stimulus and the visible Echo becomes the Watcher's selected target.
3. Move through the covered west flank and walk up `gallery-ramp` to `gallery-high-flank`, using the walls and pillars to break direct sight. No jump is required.
4. Enter the rear attack cone from above, face toward the Watcher, and attack once. Frontal or low attacks are shielded; a valid strike applies physical knockback along the attack direction.
5. Let the knocked Watcher intersect the real `spike-trap`, then cross the released door and use the exit. The trap cannot neutralize a merely patrolling or chasing Watcher, and the exit remains blocked beforehand.

Normal contact or repeated damage does not satisfy the room. The objective model requires only the real hazard defeat outcome and exit use; bell and attention facts remain internal evidence of how the physical solution was performed.

### Chapter 5 — THE PARADOX WELL

**Rules combined:** one recording, one physical Core, separate flat Echo/Player transfer routes, one powered moving platform, live Guardian perception, a rear/high seal strike, Echo lower seal, Player upper seal, and a timed escape.

The lower west room holds the sole `paradox-core`. The Echo owns the north transfer lane and ends the same tape on `lower-seal`; the present Player owns the south one-way route. The east catch basin leads to `power-receiver`. That receiver powers both the only vertical device, `well-platform`, and the dormant Guardian. Before the real Core is seated, the Guardian remains sealed: its sight field and attack are disabled. The platform remains docked until boarded, carries the Player to the upper route, and returns after the Player steps off.

**Solution:**

1. Start recording, pick up the single `paradox-core`, carry it along the north lane, and throw it east from the transfer ledge.
2. Continue that same recording back through the west room to `lower-seal`, then finish the tape there. No replacement Echo is needed.
3. As the present Player, cross the south one-way route. The east-side crossing opens `well-transfer-shutter`, allowing the Echo's real Core to land in the basin while the Echo settles on the lower seal.
4. Pick up that same Core, place it in `power-receiver`, board the docked `well-platform`, and ride it to the upper floor.
5. Use the upper flank after the powered Guardian locks onto the Echo on `lower-seal`. It faces that Echo from the central dais without chasing out of the arena, dimming its front shield and lighting the rear seal. Attack from more than 1.3 world units above and inside the rear cone; frontal or low strikes do nothing.
6. Reach `upper-seal` and hold `E` while the Echo still physically occupies `lower-seal`. The live simultaneous occupancy latches final-door release and begins the 15-second escape.
7. Cross the upper bridge, reach the final passage, and press `E` before the countdown reaches zero.

The Guardian is a positional cooperation puzzle rather than a health bar. The objective model requires only the single Core in its real receiver, Guardian defeat from the qualified positional strike, final-door release, and exit use. Throw, attention, and seal facts remain internal causal evidence rather than inflated victory history.

The Guardian uses the same actual visibility pipeline and geometry as its displayed 8.5-unit sight sector; cover blocks targeting. A live Echo on the lower seal has puzzle-priority and creates a stable central `lure-hold` window, while an unopposed visible Player is pursued. Contact requires both horizontal and vertical body overlap, so a Player directly below the dais cannot be defeated through the floor. Final synchronization is live: release is latched only when the Echo currently occupies the lower seal, the Player currently holds the upper lever, the Core is in the receiver, and the Guardian seal is already broken. The opened door remains released while the 15-second escape and non-colliding exit beacons run.

## Ending and scoring

Completing Chapter 5 shows:

- total simulated play time;
- echoes created;
- failures;
- counted manual chapter restarts;
- chapters cleared;
- final rank;
- begin-again and chapter-selection actions.

The runtime rank uses a penalty made from elapsed seconds, echoes, failures, and restarts. Thresholds are `S < 620`, `A < 900`, `B < 1300`, and `C` otherwise.

Starting again clears elapsed time, echo count, failures, restarts, completed chapters, unlock progress, active tape, echo actor, path, chapter tick, world facts, carried objects, cores, plates, levers, doors, enemies, elevator/platform phase, effects, and current physics/animation runtime. Removing an actor also clears stale device ownership and enemy targeting. The selected language remains in local storage. Chapter rebuild disposes the old Rapier world and character controllers, world geometry/materials, animation actions, and per-run line geometry before recreating them. A generation check rejects an obsolete asynchronous physics result when a newer rebuild or destruction has occurred. Application-level input/HUD listeners are installed once and are removed when the application is destroyed.

## Language and presentation

First launch presents Korean and English selection. The choice is stored in `localStorage` and drives title, instructions, chapter names and summaries, objective copy, HUD labels, pause, touch actions, failures, completion, ending statistics, loading, error, fullscreen state, and portrait rotation guidance.

Chapter Select is temporarily open for all five campaign chapters in every build, including a fresh production session. `STARTING_UNLOCKED_THROUGH` is intentionally set to `5`; set it back to `1` to restore sequential campaign unlocking later. Stage 00 remains the separate Start-flow tutorial. Development builds may also select chapters through the constrained verification API.

## Source ownership boundary

The time-echo concept is implemented independently for this game. It does not reuse Echo Heist mechanics code, level coordinates, project identity, or deployment alias. KayKit supplies the credited CC0 models and animation clips. No Hollow Knight code, character, level, animation, sound, or artwork is present.
