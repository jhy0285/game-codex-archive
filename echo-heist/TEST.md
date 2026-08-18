# ECHO HEIST — Verification Record

Last updated: 2026-08-14

## Clean-machine baseline

Run from `echo-heist`:

```powershell
npm.cmd ci
npm.cmd test -- --run
npm.cmd run build
npm.cmd run test:e2e
```

PowerShell on this PC blocks `npm.ps1`; `npm.cmd` is the standard Windows executable from the same Node installation.

## Latest local result

| Check | Result |
|---|---|
| `npm.cmd ci` | PASS — 50 packages, 0 vulnerabilities |
| Vitest | PASS — 14/14 |
| TypeScript + Vite production build | PASS |
| Playwright | PASS — 10/10 |
| Local console/page errors | PASS — 0 |
| Same-origin failed requests / HTTP ≥400 | PASS — 0 |

Vite reports Phaser’s minified bundle above its generic 500 kB advisory threshold. This is a non-failing size advisory, not a runtime or asset-loading error.

## Vitest coverage

- Six authored chapters and final system combination.
- Fixed-step equivalence across split render deltas.
- Echo interpolation, final-position hold, and discrete action windows.
- Mutable object reset with declared persistent-latch filtering.
- Player, echo, and cargo plate occupancy.
- ALPHA’s explicit echo-only requirement.
- Deterministic core redirection and travel.
- Laser warning/active/recovery/bypass phases.
- Sentinel success with different selves/opposite directions/in-window.
- Sentinel rejection for same actor, same side, and late timing.
- Circle collision against authored blockers.
- English/Korean UI-key completeness and all six chapter copy/label translations.

## Playwright coverage

1. Language selector, Korean-to-title transition, English selection, keyboard start, canvas load, runtime failure collection.
2. Real `WASD` walking, Space bind, echo-held ALPHA, exit, and chapter clear.
3. Cargo pickup/carry/drop/plate snap, echo role split, and exact chapter restart.
4. Recorded pickup and throw replay, current-self core redirection, receiver latch.
5. Opposite current/echo sentinel pulses and guardian breach.
6. Laser contact explanation/reset and active-beam phase dash.
7. ZERO HOUR objective combination, escape transition, ending, replay reset.
8. 1440×900 responsive containment, symmetric centering, and no overflow.
9. 1024×768 responsive containment, symmetric centering, and no overflow.
10. 390×844 portrait auto-pause, 844×390 landscape transition, visible touch controls, and actual D-pad movement.

Screenshots are generated under ignored `output/playwright-complete-game/`.

## Browser-assisted visual/mechanics review

- Title, FIRST CUT, DEAD WEIGHT, CROSS SIGNAL, SENTINEL SHIFT, FRACTURE RUN, ending, portrait rotation screen, and landscape touch layout were rendered and inspected.
- Vite error overlay query: clear.
- Browser page-error collection: empty.
- Browser console: Vite connection and Phaser startup messages only; no errors.
- `render_game_to_text()` confirmed six chapters and complete state boundaries.
- Korean language selection rendered a fully localized title and in-play HUD/tutorial; `document.documentElement.lang` changed to `ko` and no browser errors appeared.

## Production verification — 2026-08-14

| Item | Result |
|---|---|
| Release code commit | `981e06714cd56fb19a3f694cb9e652afbe4f9b15` |
| Vercel deployment | `dpl_Fbo12msRhd8GU7zFcaWAY84eovEd` — READY, Production |
| Immutable deployment URL | `https://echo-heist-fhgw3l79o-ai-build3.vercel.app` |
| Preserved public alias | `https://echo-heist-gamma.vercel.app` |
| Built artifacts | `index-Ddr_kSnK.js`, `index-CU3Xn9Wp.css` |
| Public page/console errors | PASS — 0 |

- The public alias loaded the ECHO HEIST title and canvas without authentication and exposed six chapter metadata through the production-safe text renderer.
- Pressing `2` selected Korean and changed the live state to `language: ko`, the HTML language to `ko`, and the visible title/stage copy to Korean; the in-play HUD and tutorial were visually inspected.
- After a fresh reload, pressing `1` selected English and restored the English title/state cleanly.
- Enter started FIRST CUT at the documented player position; the production-only check confirmed `echoHeistDebug` is not exposed.
- At 1440×900 the canvas was centered with equal gaps and no document overflow.
- At 390×844 the Korean running game auto-paused with Korean rotation guidance; at 844×390 it resumed, displayed localized touch controls, centered at equal 110 px side gaps, and produced no overflow.
- The browser console contained only Phaser’s startup banner and no error entry.
- The immutable candidate was authenticated with `vercel curl` before alias promotion; the public alias was then re-opened in a fresh browser session.

## Human-only review

A fresh player remains the correct evaluator for subjective 15–25 minute pacing, first-minute comprehension, action feel, sound comfort, sentinel timing, and physical-phone ergonomics. Automation verifies operation and state integrity, not those opinions.
