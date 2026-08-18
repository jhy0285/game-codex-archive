# ECHO DEPTHS Game Contract

## Premise

The player descends a five-chamber temporal vault with one collaborator: a deterministic replay of their own recent actions. Each room is rewound when a recording is released. The echo performs the recorded route while the present player takes a complementary route through a different height, timing window, or line of sight.

The design uses 3D space as a rule, not as presentation alone. Floors are separated vertically; stairs and jumps change access; crates fall between levels; cores follow ballistic arcs; elevators and platforms carry actors; walls and pillars block sight; attacks have direction and height leverage; and final mechanisms require two versions of the same character.

## Runtime loop

1. A new campaign begins in the safe Stage 00 orientation chamber. It teaches PC movement, camera orbit, jump, `E` interaction, carry, and echo recording/release; it can be skipped and does not count as one of the five chapters.
2. The player enters a campaign chapter at its authored start.
3. Pressing `R` begins a fixed-tick recording and removes any older echo.
4. The tape captures current actor motor state and the mutable dungeon state, then quantizes movement, facing, held use, jump, use, attack, throw, and dash into one frame per 60 Hz simulation tick.
5. Pressing `R` again, or reaching the 15-second runtime limit, seals the tape.
6. The chapter is rebuilt, the record-start motor and dungeon snapshots are restored, present-owned carry/device state is transferred to the past echo, and both actors begin from the recorded motor state.
7. The echo replays the same input frames through the same capsule motor and action resolver. It never follows a stored coordinate trail.
8. When replay finishes, the echo stands at its last simulated position. One-shot actions cease; held use may remain active so a momentary lever stays held.
9. Creating a new tape removes the old echo and restarts this cycle.

The displayed route line is a preview and feedback device. It is not the replay authority.

`EchoSnapshot` combines the player's `MotorSnapshot` with `DungeonWorldSnapshot`. It preserves position, velocity, grounded state, facing, dash phase/cooldown, coyote time, jump buffer, world facts, device transforms and active ownership, remaining hold time, elevator/platform motion progress and timeline phase, crate/core transforms and linear/angular velocity, dynamic versus kinematic body type, carry ownership, receiver state, enemy state/target/facing/knockback/detection/defeat, and escape ticks. Restore clears failure/completion transients, retains the fixed gameplay sensors' sensor configuration, and remaps past player ownership to the echo before replay begins.

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

The echo character uses transparent materials with cyan emission. Recording and playback states appear in the HUD timeline. A cyan/magenta path shows the sampled route, temporal rings mark record start and release, dashes create an afterimage, landings create a dust ring, attacks and device outcomes create restrained waves and camera shake, and a dashed ballistic line previews a carried core throw. Console screens, door stripes, platform beacons, and receiver rings brighten as their mechanisms activate; cores use containment halos, exits use transit arches, traps use recessed warning rails, and sentries use armored shells. The nearest usable object receives a cyan `BoxHelper` outline plus a localized prompt; device glow, opening doors, sight cones, failure copy, and the 35-second final timer explain state changes.

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

**Rules combined:** cross-height throwing, generous catching, directional redirect, a momentary bridge lever, and a rotating bridge.

The player and core begin on the west upper shelf. A wide physical descent leads to the lower catch area and the east-floor receiver/exit route. The aligned bridge is a visible cooperation signal while its active state keeps the exit dependency live.

**Solution:**

1. Begin recording, pick up `memory-core` with `E`, face the lower atrium/catch route, hold `K` or right mouse to preview the arc, and release to throw.
2. Continue the recorded route to `bridge-lever`, press and hold `E`, and finish the tape at the lever.
3. After rewind, take the present route toward the lower catch area while the echo repeats the throw.
4. Hold `E` inside the catch volume to receive the echo-thrown core. The world catch uses a forgiving proximity check and does not demand a single exact frame.
5. Use the bridge while the echo keeps it aligned. Throw the core toward the east receiver, then strike the loose core with a directional attack to redirect its horizontal velocity.
6. Land the redirected core in `core-receiver`, cross the east route, and use the exit.

Victory requires an echo-held bridge lever, a player catch of the echo-thrown core, a directional redirect, receiver fill, and exit use. Socketing after the redirect also records the completed core route.

### Chapter 4 — THE WATCHER'S GALLERY

**Rules combined:** a fixed patrol, sight range and facing, wall/pillar occlusion, echo bait, directional knockback, height leverage, and a spike hazard.

The watcher patrols a fixed segment until the echo rings `lure-bell`; it then holds its readable lure position while the present player takes the flank. Walls and pillars block Rapier sight rays. Patrol and knockback displacement use three parallel wall/door clearance rays across the enemy's width. The upper flank is reached through three stepped platforms. The watcher has no conventional damage goal.

**Solution:**

1. Record a route that emerges from cover, approaches `lure-bell`, and presses `E` as the echo. End where the replay will keep the watcher's attention away from the present flank.
2. On rewind, stay behind the authored cover until the echo uses the bell. The watcher deterministically locks attention to the echo and remains in the strike lane.
3. Move up `flank-step-a`, `flank-step-b`, and `flank-step-c` to `gallery-flank`, using the walls and pillars to break direct sight.
4. Face from the higher side toward `spike-trap` and use directional attacks to push the watcher along that vector. Height increases the push strength.
5. Continue until the watcher enters the trap, then use the exit.

Normal contact or repeated damage does not satisfy the room. Victory requires echo lure, hazard defeat, and exit use.

### Chapter 5 — THE PARADOX WELL

**Rules combined:** three height bands, a climbable well ramp, a downward core throw, a core-powered elevator and moving platform, guardian attention, high-side seal strike, echo plate, player lever, and a timed escape.

The lower start holds `paradox-core` and `lower-seal`. The physical `well-ramp` climbs to the middle lip; the exposed `power-receiver` sits below and west of that lip so the core must be delivered by a descending throw. The middle height contains the guardian. The powered route continues by elevator and oscillating platform to `upper-seal` and the final exit.

**Solution:**

1. Pick up `paradox-core`, carry it up `well-ramp`, and use the trajectory preview from the middle lip to throw west and downward into `power-receiver`. The receiver accepts only an armed upper launch entering while descending; carrying or dropping the core beside the socket cannot satisfy it.
2. Begin a recording that completes the core route and ends on `lower-seal`; after the receiver is powered, the replay's held lower seal reliably draws the guardian's attention.
3. After rewind, let the echo settle on the powered lower seal while the elevator and platform remain available.
4. As the present player, ride the powered elevator and moving platform to a point more than 1.3 world units above the guardian while staying within attack range on the opposite/high side.
5. Attack while the guardian still targets the echo. This breaks the rear seal; ordinary frontal attacks only report the shield condition and do not reduce health.
6. Reach `upper-seal`, press and hold `E` while the echo remains on `lower-seal`, and keep both devices active. Once core delivery, distraction, guardian seal, and both synchronizers are valid, the final door opens and a 35-second escape begins.
7. Traverse the upper escape platforms, reach the final passage, and press `E` before the countdown reaches zero.

The guardian is a positional cooperation puzzle rather than a health bar. Victory requires the authored upper-to-lower core throw, core power, echo distraction, a height-qualified player strike, the echo lower plate, the player upper lever, active escape timing, and exit use.

Guardian contact uses the original target distance before the chase vector is normalized. Final synchronization is live: leaving the lower plate or releasing the upper lever removes that active fact. The 35-second escape begins only when the echo currently occupies the lower seal, the player currently holds the upper lever, and the guardian seal is already broken.

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
