# Playtest Record

## 2026-08-13 -- First-Load Tutorial Machine Verification

- **What changed:** A first-load ritual prelude now teaches WASD recording, Space binding, echo final-position hold, veil crossing, and E extraction before the 20-second timer begins.
- **What was exercised:** Tutorial freeze under 3 seconds of deterministic time, held movement, Space, and R; separate E, Enter, and pointer begin paths; fresh seed state; fullscreen/restart; every motion state; full two-sector completion; victory replay; and three supported viewport sizes.
- **Visual checks:** Opened the full-size and 1024x768 tutorial captures plus two post-dismissal gameplay captures. The title, three-step sequence, goal sentence, primary begin prompt, and utility controls remain visible without clipping or overlap.
- **Automation result:** Vitest 6/6, production build, Playwright 9/9, and two required web-game client iterations passed; no page, asset, texture, request, HTTP, or console failure was reported.
- **Still requires a human playtest:** Whether a new player understands why Space returns them to the start, whether they anticipate the echo's final hold, and whether the tutorial reduces Sector 1 hesitation without feeling text-heavy.
- **Production verification:** The same machine client inspected the public Vercel alias before and after Enter. The initial state remained frozen at 20 seconds with one recording seed, and the next state rendered Loop 2 with a final-position echo; no runtime error artifact was generated.

## 2026-08-11 — Machine Verification

- **What was exercised:** Initial load; one visible canvas; WASD movement; automatic recording; visible 20-second countdown; Loop 1 movement to the switch; automatic loop reset; one visible replay ghost; ghost-held switch; door opening; current-player door crossing; goal entry; E extraction; victory screen; and R full restart. Headless and headed Chromium screenshots and the machine-readable game state were inspected.
- **Obvious confusion risks:** A player may leave the switch before the loop ends, or reach the goal without noticing the E extraction prompt. The top objective line and in-goal prompt mitigate both, but only a human test can confirm comprehension.
- **Bugs discovered:** Vitest initially collected the Playwright suite; a large simulated movement step could tunnel through the sealed door; WebGL screenshots were initially black; and an already-running dev server conflicted with the Playwright web server.
- **Fixes applied:** Scoped Vitest to source unit tests; changed door collision to continuous crossing checks; preserved the WebGL drawing buffer for screenshots; and allowed Playwright to reuse an existing server.
- **Still requires a human playtest:** Movement feel, whether the Loop 1 objective is understood without coaching, whether the ghost is visually distinct, whether the open-door moment is noticed, and whether restart feels immediate.

No human playtest had been performed as of the 2026-08-11 machine-verification entry.

## 2026-08-12 — Human Feedback, First Sector

- **What was played:** The human played the first map of the Gate 1 build.
- **What worked:** The underlying echo puzzle logic felt sound.
- **Requested changes:** Let the player end a recording at a chosen moment so the echo stops where intended; improve the rough visual design with actual assets; add a harder map with more complex interaction.
- **Implementation interpretation:** Space will lock the current recording and start the next loop; the echo will replay that route and then hold its final position. E remains the interaction/extraction key.
- **Still untested by a human:** The revised manual-lock mechanic, new visuals, and second-sector dual-switch puzzle.

## 2026-08-12 — Revised Build Machine Verification

- **What was exercised:** Space locked a sub-two-second path; the echo replayed then held its final position; Sector 1 was cleared; Sector 2 synchronized ALPHA and BETA, charged for 1.2 seconds, latched the vault gate, and reached final victory.
- **Visual checks:** Generated environment asset, player/ghost separation, echo trail, lock pulse, switch holder labels, relay charge/latch state, opening gate, and overlays were inspected in screenshots.
- **Bugs discovered:** The first revised Playwright assertion rejected valid switch coordinate fields because it used exact object equality.
- **Fix applied:** Changed the assertion to compare the required interaction fields while retaining the richer game state.
- **Still requires a human playtest:** Whether Space is discovered naturally, whether the new art meets the desired quality bar, and whether Sector 2 is challenging without being confusing.

## 2026-08-12 -- itch.io Asset Verification

- **What changed:** Imported one coherent CC0 sci-fi facility pack from itch.io for the player, echo, switches, electric gate, portal, consoles, wall accents, and crate obstacles.
- **What was exercised:** Loaded both sectors, animated the player/echo and gate/portal sprites, latched the dual-signal vault, and reached the final victory overlay.
- **Visual checks:** Inspected the completed Sector 1, latched Sector 2, and heist-complete captures. Interactive objects remain readable over the environment and cyan still consistently identifies echo/vault state.
- **Bug discovered and fixed:** Removed a missing-frame warning by changing the second computer decoration from invalid frame 2 to valid frame 1.
- **Still requires a human playtest:** Whether the imported art now meets the desired quality bar and whether any sprite scale should be adjusted during normal play.

## 2026-08-12 -- Dream Fracture Machine Verification

- **What changed:** Replaced the runtime facility presentation with two original surreal backdrops, original code-drawn player/echo and interaction sprites, a local licensed pixel font, restrained particles, a memory-thread trail, a diamond lock ripple, a fracture barrier, and dream-themed overlays.
- **What was exercised:** Initial load, WASD/A movement, Space lock, echo replay and final hold, Sector 1 opening and transition, Sector 2 partial synchronization and permanent latch, goal interaction, victory, and fast R restart.
- **State-specific visual checks:** Opened and inspected Sector 1 initial, immediate lock, echo-held/open, sector-clear, Sector 2 initial, partial charge, latched/open, and victory captures. Player/echo, switch occupancy, barrier state, obstacle collision silhouettes, goal, and HUD agreed with the machine-readable state.
- **Responsive checks:** Opened and inspected 1440x900, 1366x768, and 1024x768 captures. The centered canvas remained fully visible at a 1.6 ratio with no document scroll.
- **Bugs discovered and fixed:** Regenerated backgrounds whose decorative shapes could imply nonexistent collision, removed app padding that caused canvas overflow/aspect drift, and made `advanceTime` disable automatic frames so screenshot latency cannot enter a recorded route.
- **Automation result:** Vitest 6/6, production build, Playwright 5/5, and the provided web-game client passed without fatal/runtime asset errors. The Vite Phaser bundle-size warning is non-blocking.
- **Human-test boundary:** This entry is machine and visual verification only. A human has not yet evaluated the final Dream Fracture build, Space discoverability, or Sector 2 difficulty.
