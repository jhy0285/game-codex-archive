# NOW

- Finish the targeted human Gate 1 playtest. Complete when movement feel, aim feel, dodge timing, telegraph readability, difficulty, fullscreen, and unaided restart observations are recorded in PLAYTEST.md.

# NEXT

- Specify the Gate 2 Boss Recipe slice on 2026-08-14. Complete when one Movement card, one Defense card, and the selected-card-only pattern director have observable acceptance criteria without expanding further.
- Compare all three module pairs with a human player. Complete when the player can identify which pair was selected from the resulting fight and the observation is recorded.
- Tune confirmed Gate 1 readability or feel problems only. Complete when every change traces to a human observation and `npm test`, `npm run build`, and `npm run test:e2e` remain green.

# LATER

- Consider Parking Lot ideas only after the current milestone. Complete when each considered idea is explicitly accepted or remains parked in GAME.md.

# BLOCKED

- None currently.

# DONE

- Repository baseline inspected. Complete: the default Vite demo and installed fixed stack were identified on 2026-08-11.
- Project contracts created. Complete: AGENTS.md, GAME.md, MILESTONES.md, TASKS.md, TEST.md, PLAYTEST.md, and CODEX_LOG.md exist at repository root.
- Gate 1 configuration implemented. Complete: exactly three required modules appear, exactly two can be selected, and a two-module selection starts the fight.
- Gate 1 combat implemented. Complete: movement, aim, fire, dodge, player/boss health, all three telegraphed attacks, damage, win, death, and configuration restart work in the Phaser canvas.
- Automated verification completed. Complete: 5 Vitest checks, production build, 3 Playwright flows covering every module pair, and the web-game client all passed without fatal page errors.
- Minimum visual upgrade completed. Complete: original optimized arena and boss assets, revised typography/palette, staged menu reveal, player silhouette, boss idle motion, and hit feedback are integrated; every telegraph remains readable in inspected captures and all automated checks pass.
- Licensed itch.io UI pass implemented. Complete: Bloodlines health meters, button states, and result frame are integrated; provenance/license are documented; Vitest, build, Playwright, and the mandatory browser-client verification all pass.
- Reference-inspired Gate 1 combat polish completed. Complete: an original top-down Forge Runner asset, layered arena motion, deterministic dodge echoes/particles/shockwaves/projectile trails, richer attack telegraphs, final-HUD synchronization, honest loading state, and reliable F/Esc fullscreen handling are integrated; Vitest 5/5, build, Playwright 3/3, and the mandatory browser-client captures all pass.
- Gothic insect-fable re-art direction completed. Complete: one altar-scene configuration, an original Ashen Bell-Sanctum, Ivory Forge Pilgrim, Rootbound Bell-Smith, three depth planes, organic attack notation, serif/rune HUD, and arched results replace the former machine/Bloodlines presentation without changing the Gate 1 mechanic contract.
