Original prompt: https://github.com/TinTinWinata/hollow-knight-js 이거 참고해서, 구조 이해한다음, 해당 방식으로, 즉 할로우 나이트급의 고퀄리티 에셋으로 같은 game 폴더안에 boss-forge, echo-heist, patch-run 이런것들 고도화 해줘 404 not found도 해줘

## 2026-08-12

Decoded original prompt: 참고 저장소의 구조와 표현 기법을 이해해 game 폴더의 게임들과 404-not-found를 고품질 에셋으로 고도화.

- Visual thesis: a lost-signal shrine suspended in a moonlit data cavern, pairing hand-painted stone with restrained cyan archive light and small coral error embers.
- Content plan: poster-like 404 introduction, playable signal recovery, route-restored game links.
- Interaction thesis: mouse parallax and living fog establish depth; dash/collect bursts give tactile feedback; the dormant portal visibly blooms when all three signals are recovered.
- Created an original interactive `404 — Route Not Found` experience in the shared game folder.
- Added a generated, project-local hand-painted archive background; no source assets from the reference repository were copied.
- Implemented Canvas gameplay, layered fog/particles, responsive layout, keyboard/touch controls, signal collection, hazards, portal completion, procedural audio, fullscreen, restart, `render_game_to_text`, and deterministic `advanceTime`.
- `npm install` completed with 0 vulnerabilities; `npm run build` passed with Vite 8.2.1.
- Added Playwright smoke coverage for title presentation, deterministic movement, restart cleanliness, complete three-shard collection, portal activation, and the restored-route screen.
- Browser verification: 3/3 Playwright tests passed; title, active gameplay, and route-restored full-page screenshots were visually inspected; no page/console errors occurred.
- Production audit found the generated backdrop was initially development-only; moved it under `public/assets/` so `dist/assets/lost-archive-bg.png` is shipped by Vite.
- Final production build passed and emits both `index.html` and `404.html`; preview checks returned HTTP 200 for `/`, `/404.html`, and the 2.32 MB generated background.
- Final Playwright suite: 3/3 passed (start/movement/runtime errors, clean restart, complete playable signal-to-portal win flow).
- Deployed to Vercel production as `ai-build3/404-not-found`: `https://404-not-found-phi-seven.vercel.app`.
- Production verification returned HTTP 200 for `/`, `/404.html`, and the generated background. A remote Playwright boot test confirmed the canvas, start control, `render_game_to_text`, 3 signals, full player integrity, and no page/console errors.
- The supplied web-game client produced a valid canvas gameplay capture and `render_game_to_text` state. Its process did not exit after writing artifacts under this environment, so focused Playwright tests provide the authoritative end-to-end verification.
- TODO: human feel check for jump/dash timing on a physical keyboard and mobile touch controls.

## 2026-08-13 — 404 three-act expansion

- Follow-up prompt: "404 not found 더 고도화 시켜봐 게임 더 만들어봐 내용"
- Kept the original signal hunt as Act I, then added Act II **The Redacted Choir** and Act III **The Last Index** rather than replacing the established 404 poster.
- Act II now has its own Silent Stacks environment, distinct shelf-platform layout, a sealed archive gate, and three deterministic waves: charging Husk tutorial, elevated ranged Redactor, then a mixed reinforcement.
- Added `X`/`J`/mouse/touch attack, player idle/run/jump/fall/dash/attack states, projectile feedback, enemy telegraph/release/recover/death states, checkpoints, and per-act restart behavior.
- Added the Blind Archivist final boss with 12 HP, three ordered patterns (`index_ring`, `redaction_quill`, `memory_sweep`), sealed defense during attacks, a readable recovery-only damage window, pattern history, death sequence, and final completion only after boss defeat.
- Created and integrated original built-in imagegen assets for Silent Stacks, Index Throne, and the Blind Archivist. Chroma removal/alpha validation and exact prompts are recorded in `ASSET_CREDITS.md`; no franchise reference image or copied source asset was used.
- Exported all runtime art as WebP: total runtime image weight is about 1.21 MB instead of roughly 9.1 MB of source PNGs.
- Repaired mojibake in HTML/game-facing strings, exposed act/wave/enemy/projectile/boss/animation/vulnerability state through `render_game_to_text`, added stable `__gameTest` hooks, and fixed standalone completion links to the three live game deployments.
- Added reduced-motion-aware Canvas shake/parallax/transition intensity, a favicon, readable attack controls, a fifth mobile attack button, act-aware HUD, and an ink-wash act title treatment.
- Visual inspection caught and fixed overlapping Act III HUD/boss health elements, duplicate entry messages, and the dead boss bar remaining over the completion screen.
- Final boss presentation pass added distinct telegraph recoil, release lunge/afterimage, recovery slump with an exposed ivory core, three-quill lanes, sweep danger sector, and HP-phase mask cracks without changing mechanics.
- Verification: `npm run build` PASS; Playwright expansion suite 5/5 PASS; official web-game client 2 iterations PASS with movement+jump+attack states/canvas aligned and 0 error artifacts.
- TODO: physical-device feel pass for touch target spacing and jump/dash tuning remains a human QA task; no automated blocker remains.
- Production deployment `C6ijGgV72EbPUgQB4qhH6mQQGY3M` is Ready and aliased to `https://404-not-found-phi-seven.vercel.app`.
- Production Playwright 2/2 PASS: deployed canvas exposes the three-act state and Blind Archivist contract; an unknown path returns HTTP 404, loads `404.html`, records the 404 entry, and redirects into the interactive root. Final remote screenshot inspected; no console/page errors.
