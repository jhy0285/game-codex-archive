# NOW

- Run a human control-feel playtest. Complete when movement, aim, shooting, cyan EVADE feedback, red damage feedback, and restart observations are dated and recorded in PLAYTEST.md.
- Run a human 65-second patch-readability playtest. Complete when the tester sees all three large rule cards, can repeat each explanation, and understands the RICOCHET × GROWTH interaction without prompting.

# NEXT

- Address only Gate 1 blockers found by the human playtest. Complete when each blocker is reproducibly fixed and Vitest, build, Playwright smoke, and the gameplay checklist pass again.

# LATER

- Gate 2 work may begin on 2026-08-14. Complete only against a separately approved Gate 2 task list.

# BLOCKED

- Human playtest observations require a human tester; machine verification must not be presented as a substitute.

# DONE

- The Drowned Scriptorium actors now use articulated motion rigs instead of translating static cutouts: eight player presentation states and five enemy states, deterministic state/frame telemetry, and same-position frame comparison captures. Gate 1 physics, timings, routes, and collision bodies remain unchanged.
- The canonical `/` and `/overdrive` build is now the original hand-painted Drowned Scriptorium: flooded gothic root sanctuary, ivory curse runner, pursuing seed husks, curse-seed projectiles, engraved living-inscription HUD, organic splinter impacts, and layered fog/foreground silhouettes. Gate 1 rules and `/pixel` remain unchanged.
- Drowned Scriptorium machine verification passes Vitest 5/5, production build, Playwright 2/2, and the required provided web-game client; pre-patch, damage, inscription, growth ricochet, death, and navigation captures were visually inspected.
- The premium root/OVERDRIVE build now uses an original painterly PATCH FORGE arena, original transparent player/enemy sprites, layered atmospheric motion, batched animated engine/core light, arrival effects, and restrained combat shake while preserving Gate 1 rules and fast restart.
- The build selector keeps `/pixel` available, `/` now opens the premium build, and browser automation covers selector navigation plus F fullscreen/Escape exit.
- Required repository documents exist with the supplied project rules and schedule.
- Gate 1 prototype is implemented with movement, aim/shoot, dash, one pursuing enemy, combat, death, restart, and the fixed three-patch stack.
- Vitest passes 5 rule tests, the production build succeeds, and the Playwright smoke passes load/movement/feedback/patch/death/clean-restart checks with no fatal page error.
- Provided-client browser captures were visually inspected for normal combat, the RICOCHET × GROWTH moment, and the corrected death overlay.
- Visual polish now includes ship/drone silhouettes, aim reticle, projectile trails, radar depth, large described patch cards, distinct hit and EVADE feedback, and a persistent grown ricochet.
- Applied licensed CC0 ship, laser, shield, sound, and seamless-space assets; replaced per-projectile trail objects with one batched graphics pass and throttled HUD redraws to reduce frame-time spikes.
