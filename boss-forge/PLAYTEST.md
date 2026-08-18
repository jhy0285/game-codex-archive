# Playtest Record

## 2026-08-14 -- New-PC Interactive Agent QA

This is direct in-app-browser agent observation, not a human playtest.

- **Exercised:** selected RADIAL BURST plus AIMED SHOT, confirmed the exact-two selection feedback and enabled awaken action, entered combat, issued movement/shroud/pointer-strike inputs, and observed the clear defeat and return-to-altar presentation.
- **Visual result:** altar selection state, player/boss hierarchy, HUD health values, and result action remained legible at 1280x720. No browser console error was observed.
- **Automation paired with this pass:** Vitest 5/5, production build, and Playwright 5/5 all passed again on the new PC.
- **Human-only boundary:** physical mouse aim, dodge safety, telegraph fairness, pair-to-pair variety, difficulty/fight duration, fullscreen feel, and unaided replay still require a person. Earlier human feedback that three attack-only choices feel limited remains unresolved Gate 2 input, not permission to expand Gate 1.

## 2026-08-11 — Machine Verification

This is machine verification, not a human playtest.

- **What was exercised:** Page/canvas load; exact-two module selection; all three module pairs; selected-attacks-only behavior; movement; mouse aiming and sustained fire; dodge activation/cooldown; player and boss damage; RADIAL BURST, AIMED SHOT, and ROTATING BEAM telegraphs; win; death; R restart; result-button restart; state output; console errors.
- **Obvious confusion risks:** A human may still miss the brief dodge invulnerability, may not immediately understand that AIMED SHOT locks an old position, or may find the rotating beam warning/turn rate too strict.
- **Bugs discovered:** Vitest initially collected the Playwright spec; port 4173 served an unrelated ECHO HEIST project; WebGL headless captures were black; a very short R keypress could fall between update frames.
- **Fixes applied:** Scoped Vitest to `src/**/*.test.ts`; assigned strict browser-test port 4317 with no server reuse; selected Canvas rendering for reliable primitive-shape capture; added direct R keydown restart handling; added explicit boss HP text.
- **Still requires a human playtest:** Movement and aiming feel; dodge timing and perceived safety; first-read comprehension of every telegraph; perceived difference among all three pairs; overall difficulty and fight duration; fullscreen behavior on the target browser; full unaided configure/fight/win-or-lose/restart loops.

## 2026-08-12 — Human Feedback

This section records feedback explicitly provided by the human after playing the Gate 1 build.

- **What was observed:** The three attack-only choices feel too limited, the placeholder visual treatment is not enticing, and the current fight needs more combinatorial surprise and depth.
- **Requested direction:** Add selectable defense and movement behaviors alongside attacks; combine chosen action cards into varied boss patterns; use the high-level lessons of deliberate, telegraphed dark-fantasy boss combat; add a minimal authored asset pass; identify further ways to improve fun.
- **Immediate Gate 1 action completed:** Added original ruined-forge arena and forge-guardian assets, a restrained dark-fantasy palette, stronger typography, player silhouette, staged configuration reveal, boss idle motion, and brief hit shake while preserving the exact three-module/two-selection Gate 1 rules.
- **Parked for Gate 2 rather than silently changing Gate 1:** Four-card Boss Recipe (two Attack, one Movement, one Defense), selected-card-only pattern generation, and a guaranteed signature combination in the first 30 seconds.
- **Still untested by the human:** Movement/aim feel, dodge clarity, individual telegraph readability, difficulty, fullscreen, and unaided restart were not explicitly rated in this feedback.

## 2026-08-12 — Visual Upgrade Machine Verification

This is machine verification, not a second human playtest.

- **What was exercised:** Immediate/fast configuration clicks, all module pairs, movement, dodge, sustained fire, selected-attacks-only behavior, all telegraphs, active beam, win, death, button/R restart, state output, and console errors.
- **Visual inspection:** Configuration, RADIAL BURST, AIMED SHOT, ROTATING BEAM warning/active states, victory, and defeat captures were inspected. The arena detail stays mainly at the perimeter, warning lines remain high contrast, and the boss core remains a clear attack origin.
- **Bug discovered and fixed:** Fading the interactive start-button surface delayed fast clicks; the interaction surface now appears immediately while only non-interactive copy and ornament animate.
- **Results:** Vitest 5/5 PASS; production build PASS; Playwright 3/3 PASS; mandatory web-game client PASS with no console error artifact.
- **Human follow-up:** Judge whether the new presentation is sufficiently enticing and whether the boss/player silhouettes remain readable during live movement rather than still captures.
