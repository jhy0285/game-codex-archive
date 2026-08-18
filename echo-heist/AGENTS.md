# ECHO HEIST Repository Rules

1. GAME.md is the authoritative game-design contract.
2. MILESTONES.md is the authoritative schedule.
3. The six-chapter complete-game scope in GAME.md is approved; additions beyond it require an explicit contract change.
4. New ideas must be documented and approved before implementation.
5. Prefer a small working implementation over reusable architecture.
6. Avoid broad refactors during gameplay feature work.
7. No multiplayer.
8. No account system.
9. No backend.
10. No inventory system.
11. No second campaign, side mode, procedural mode, or online progression beyond the authored six chapters.
12. No dialogue system.
13. No level editor.
14. No monetization.
15. Browser load-to-play friction must stay extremely low.
16. Restart must always be fast.
17. Gameplay readability is more important than visual complexity.
18. Every task must have observable acceptance criteria.
19. After changing gameplay, run build/tests.
20. Use Playwright to open the actual game where practical.
21. Do not claim a human playtest happened unless a human actually performed it.
22. Keep TASKS.md synchronized with reality.
23. Record meaningful Codex work in CODEX_LOG.md.
24. Never silently change the core game design because implementation is difficult.
25. The internal release deadline is 2026-08-25.
26. 2026-08-26 is buffer only.
27. Preserve FIRST CUT's documented coordinates and solution unless a tested contract change explicitly replaces them.
28. Never use Hollow Knight code, characters, assets, audio, maps, UI, or exact motifs.
29. Desktop keyboard/mouse and mobile landscape touch must both reach the ending.
30. Portrait mobile must pause safely and provide a readable rotation path.
31. Restart, bind, chapter transition, ending replay, and chapter select must not leak listeners, timers, echoes, objects, hazards, or score state.
