# ECHO HEIST — Playtest Record

Last updated: 2026-08-14

## Agent-operated local play review

This is an implementation and regression review, not a claim of human taste judgment.

| Flow | Input used | Result |
|---|---|---|
| Title → FIRST CUT | Real Enter key | PASS |
| Walk to ALPHA → bind → cross gate → exit | Real keyboard movement, Space, E | PASS |
| Pick up cargo → carry → snap to CARGO | Game actions in rendered browser | PASS |
| Echo-held ALPHA + current cargo role split | Replayed echo state + current interaction | PASS |
| Record pickup/throw → bind → current pulse redirect | Recorded action replay + pulse | PASS |
| Opposite-side sentinel sync | Echo pulse + current pulse | PASS |
| Active laser contact → fast clean retry | Hazard collision | PASS |
| Active laser crossing while phased | Dash action | PASS |
| ZERO HOUR four-objective gate | Cargo, signal, sentinel, echo ALPHA | PASS |
| Final exit → escape → ending → replay | E/use and ending button | PASS |
| Repeated chapter reset | R/debug action state check | PASS |
| Portrait → landscape | Responsive viewport rotation | PASS |
| Landscape D-pad movement | Actual pointer down/hold/up | PASS |

## Observations from rendered play

- Cyan current player, magenta echo, amber objects, mint completion, and red hazards are visually distinct.
- The echo’s future path dots and action markers make replay intent visible without pausing the simulation.
- Carry snap radius and core pulse radius are intentionally generous.
- Sentinel feedback differentiates exposed, late, same-self, wrong-side, and breached states.
- Laser warning, live, and recovery phases remain visually distinguishable at desktop and mobile-landscape scale.
- Full chapter restart clears echo, objects, guardian, hazards, latches, timers, and statistics that belong to the chapter.
- Portrait auto-pause prevents the 16:10 puzzle from becoming an unreadable 390×244 strip.

## Fresh-player human session requested

Ask a player who has not read `GAME.md` to complete the campaign without coaching, then record:

- Time to first successful bind and first gate crossing.
- Total first-completion time and number of binds/restarts.
- Whether carry/drop and throw/pulse are distinguished immediately.
- Whether the dotted handoff trajectory feels fair.
- Whether the sentinel’s deliberate wait-and-answer plan is understood.
- Whether laser colors and dash safety feel predictable.
- Whether sound levels are comfortable.
- Whether landscape touch controls are comfortable on a physical phone.
- Any point where the player can state the goal but cannot infer the next action.

This human session is the remaining source of subjective pacing and feel evidence. No automated result is presented as a substitute for it.
