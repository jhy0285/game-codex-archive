# Asset Credits

## Original Drowned Scriptorium Art (current `/` and `/overdrive` build)

- Creator/tool: OpenAI built-in image generation, directed, processed, and integrated by Codex
- Final files: `public/assets/drowned-scriptorium/drowned-scriptorium-arena.webp`, `curse-runner.png`, and `seed-husk.png`
- Runtime direction: an original hand-painted gothic insect-fable sanctuary flooded at its perimeter; a tiny ivory seed-shell curse runner; and a pursuing seed-husk insect. Ink, ivory, verdigris, and restrained acid gold replace the previous spacecraft/radar language.
- Environment prompt: "An original hand-painted top-down Drowned Scriptorium where living rules are carved into a submerged sanctuary; layered root arches, reliquaries, black water, fog and three floor seals; orthographic gameplay view; ink black, ivory, moss teal and restrained acid gold; no characters, text, sci-fi, radar, neon circuitry, logos or franchise motifs."
- Player prompt: "Strict top-down original tiny curse runner with an ivory seed-shell mask, charcoal moth-fold mantle and needle-like ritual stylus on a perfectly flat chroma background; ink-and-gouache game sprite; no horns, skull face, franchise motifs, sci-fi armor, text or watermark."
- Enemy prompt: "Strict top-down original seed-husk pursuer with almond bark carapace, crooked root legs, parchment wings and a split red seed core on a perfectly flat chroma background; ink-and-gouache game sprite; no horns, franchise motifs, drone or spacecraft language, text or watermark."
- Processing: generated in built-in mode; sources were copied into `tmp/imagegen/`; both actors passed the installed soft-matte/despill chroma-removal helper, transparent-corner validation, trimmed-square padding, and 384px optimized PNG export. The environment was center-cropped to the exact 904:496 arena ratio and exported as an 86-quality 1808×992 WebP.
- Motion integration (2026-08-13): no replacement bitmap or franchise reference was introduced. The existing generated Curse Runner is sliced at runtime into mask, blade, paired mantle, and feet regions; the existing Seed Husk is sliced into shell and paired wing regions, with six original code-drawn root legs. Phaser transforms, squash/stretch, recoil, tint, and controlled silhouettes create the state animation while retaining one consistent generated identity.
- Originality: no Hollow Knight image, character, sprite, or other proprietary game asset was used as an image input. The style goal is an independent gothic insect fable, not a reproduction of any franchise design.

All third-party assets currently shipped with PATCH//RUN are released under Creative Commons Zero (CC0 1.0). Attribution is not required, but the original creators and source pages are recorded here for provenance.

## Seamless Space Backgrounds

- Creator: Screaming Brain Studios
- Source: https://screamingbrainstudios.itch.io/seamless-space-backgrounds
- Used file: one 512 x 512 seamless nebula background, stored as `public/assets/screaming-brain-space/nebula.png`
- License: CC0 1.0 / public domain

## Space Shooter Remastered

- Creator: Kenney
- Source: https://kenney.nl/assets/space-shooter-remastered
- Used files: player ship, enemy ship, laser, shield, and three sound effects in `public/assets/kenney-space-shooter/`
- License: CC0 1.0 / public domain

License reference: https://creativecommons.org/publicdomain/zero/1.0/

## Original PATCH FORGE Art

- Creator/tool: OpenAI built-in image generation, directed and integrated by Codex
- Generated files: `public/assets/patch-forge/arena-patch-forge.webp`, `player-patch-needle.png`, and `enemy-rupture-warden.png`
- Art direction: an original midnight science-fantasy forge, ivory/cyan needle craft, and bone/crimson hunter drone; no Hollow Knight or other proprietary game assets were used as image inputs
- Processing: arena art was center-cropped to the gameplay aspect and exported as an 88-quality WebP; both sprite sources used a flat chroma-key background, the installed background-removal helper, transparent-edge validation, square padding, and 256px optimized PNG output
- Runtime use: premium `/` and `/overdrive` routes only; the existing BITSHIFT route keeps its licensed pixel-art pack

## 8x8 Space Shooter Pack (BITSHIFT build)

- Creator: Gustavo Vituri
- Source: https://gvituri.itch.io/space-shooter
- Used files: ship and projectile sprite sheets in `public/assets/pixel-bitshift/`
- License terms recorded from the asset page: personal and commercial use allowed; modification allowed; attribution not required; redistribution and NFT use prohibited

## 2D Space Shooter Sprites (OVERDRIVE build)

- Creator: Larzes
- Source: https://larzes.itch.io/2d-space-shooter-sprites
- Used files: player ship, two enemy types, missile, and pickup in `public/assets/overdrive/`
- License terms recorded from the creator's asset page/comments: free and commercial project use and modification allowed; standalone redistribution/resale prohibited

## Free UI Hologram Interface (OVERDRIVE build)

- Creator: Wenrexa
- Source: https://wenrexa.itch.io/holoui
- Used files: hologram panel fragments in `public/assets/overdrive/`
- License: CC0 1.0 / public domain
