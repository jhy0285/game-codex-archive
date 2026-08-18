# ECHO HEIST — Asset Credits and Rights Record

Verified for the complete-game runtime on 2026-08-14.

## Murphy’s Dad — Sci-Fi Facility Asset Pack (runtime)

- Creator: Murphy’s Dad
- Source: https://murphysdad.itch.io/sci-fi-facility
- License: Creative Commons Zero v1.0 Universal (CC0)
- License reference: https://creativecommons.org/publicdomain/zero/1.0/
- Local license text: `public/assets/neon-facility/README.txt`
- Original downloaded archive: `archive/prototype-assets/itch-public-original/murphysdad-sci-fi-facility.zip`
- Runtime selection:
  - `public/assets/neon-facility/tileset.png`
  - `public/assets/neon-facility/crates_spritesheet.png`
  - `public/assets/neon-facility/guard_orange_spritesheet.png`
  - `public/assets/neon-facility/portal_spritesheet.png`
  - `public/assets/neon-facility/orb_spritesheet.png`
- Runtime treatment: nearest-neighbor scale, authored frame selection, tinting, lighting, and code-rendered effects. The game does not claim authorship of the source sprite sheets.
- Credit is not required by CC0, but is retained in appreciation of the creator.

## Original ECHO HEIST presentation (runtime)

- Creator: project-authored code implemented with Codex under the user’s direction.
- Files: `src/game/pixelArt.ts`, `src/game/scenes/EchoScene.ts`, `src/game/audio.ts`, and `src/style.css`.
- Includes: the cyan time-runner sprite and directional animation, magenta echo identity, floor pattern, plates, gate field, receiver, launch trajectory, echo preview, pulse rings, particles, laser state language, HUD, title/ending layouts, touch controls, and Web Audio sound cues.
- Audio: synthesized at runtime with oscillators and gain envelopes. No third-party music or sound recordings are included.

## Silkscreen font (runtime)

- Creator: Jason Kottke
- Source: https://github.com/googlefonts/silkscreen
- License: SIL Open Font License 1.1
- Runtime files: `public/assets/fonts/silkscreen/Silkscreen-Regular.ttf`, `Silkscreen-Bold.ttf`
- Local license: `public/assets/fonts/silkscreen/OFL.txt`

## Pixel_Poem license review (not imported)

- Reviewed source: https://pixel-poem.itch.io/dungeon-assetpuck
- Review date: 2026-08-14
- Published terms at review: free and commercial project use and modification are permitted; redistribution and resale are prohibited; credit is appreciated but not required.
- Decision: no Pixel_Poem files are in this repository or build. The already-vetted CC0 Sci-Fi Facility pack fits the cyber-vault direction and is safer for a public source archive.

## Previous visual direction (archived, not deployed)

- The former generated Woven Reliquary, Bellroot Ossuary, Memory Pilgrim, and Dream Fracture files are preserved under `archive/previous-runtime/`.
- Their former source modules and atlas script are preserved under `archive/previous-runtime/source/`.
- `.vercelignore` excludes `archive`, and the complete-game runtime does not request these files.
- Their detailed generation provenance remains recoverable in Git history and `CODEX_LOG.md`.

## Prohibited reference boundary

No Hollow Knight source code, character, sprite, map, UI, music, sound, logo, or extracted asset is used by ECHO HEIST. The work applies only general interaction principles such as responsive input, readable silhouettes, coherent feedback, and polished transitions.

## Public release / contest suitability

- The contest requires a browser-playable public link; the current Vite build meets that delivery format.
- Runtime third-party assets have explicit CC0 or OFL terms compatible with public web delivery.
- No paid, account-bound, unclear-license, or non-redistributable asset is included.
