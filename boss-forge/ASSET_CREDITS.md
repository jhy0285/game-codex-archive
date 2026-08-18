# Original Gothic Asset Credits

All three live raster assets were generated for BOSS FORGE on 2026-08-12 with Codex's built-in OpenAI image-generation tool. No image, code, character, logo, sound, or environment from Hollow Knight or `TinTinWinata/hollow-knight-js` was copied or used as an input reference.

## Ashen Bell-Sanctum

- Runtime: `src/assets/gothic/ashen-bell-sanctum-game.jpg`
- Preserved source: `src/assets/gothic/ashen-bell-sanctum-source.png`
- Mode: built-in image generation, `stylized-concept`
- Final prompt:

> Original hand-painted gothic insect-fable dark-fantasy boss arena called the Ashen Bell-Sanctum: a vast underground ruined forge chapel seen from a steep overhead three-quarter game camera, with an open pale-stone combat floor at center and corroded hanging bells, rib-like arches, fossil shells, black roots, broken reliquaries, chains, and distant cavern pillars at the perimeter. Premium ink-wash and gouache 2D game background; storybook melancholy; moon-pale shafts, muted turquoise mineral cracks, sparse ember braziers, ash and thin ground fog; soot black, charcoal blue, old ivory, tarnished turquoise, and extremely restrained ember orange. One continuous 3:2 scene, no characters, UI, text, logos, watermarks, sci-fi machinery, neon circuitry, radar rings, franchise motifs, or copied game locations.

## Ivory Forge Pilgrim

- Runtime: `src/assets/gothic/ivory-pilgrim-game.png`
- Chroma/source files: `src/assets/gothic/ivory-pilgrim-chroma.png`, `src/assets/gothic/ivory-pilgrim.png`
- Mode: built-in image generation followed by the official `remove_chroma_key.py` helper
- Final prompt:

> Original tiny forge pilgrim for a gothic insect-fable dark-fantasy action game, strict 90-degree overhead view for rotation toward aim direction. A smooth asymmetrical old-ivory seed mask with three charcoal vent marks and no horns or antlers; soot-black split mantle, narrow wrapped limbs, one muted turquoise scarf tab, and a slim bone needle pointing toward the top. Hand-painted inked gouache sprite with paper grain and a compact readable silhouette. Isolated on a perfectly flat solid `#00ff00` chroma background with generous padding; no background lighting variation, shadows, floor, reflection, text, logo, watermark, sci-fi armor, robot design, knight plate, side/isometric view, or resemblance to an existing game hero.

## Rootbound Bell-Smith

- Runtime: `src/assets/gothic/rootbound-bell-smith-game.png`
- Chroma/source files: `src/assets/gothic/rootbound-bell-smith-chroma.png`, `src/assets/gothic/rootbound-bell-smith.png`
- Mode: built-in image generation followed by the official `remove_chroma_key.py` helper
- Final prompt:

> Original Rootbound Bell-Smith boss for a gothic insect-fable dark-fantasy action game, strict 90-degree overhead view. A large organic guardian with a broad asymmetrical cracked bell-shaped bronze shell fused with pale bone plates and black roots; six beetle limbs, a broken clay-censer cavity with a tiny ember heart, and a heavy root-and-bone ritual hammer; no face, eyes, horns, or antlers. Hand-painted inked gouache sprite with paper grain, tarnished bronze, bone ivory, muted turquoise patina, soot black, and one tiny ember core. Isolated on perfectly flat solid `#00ff00`; no shadows, floor, reflections, text, logo, watermark, sci-fi robot/drone/reactor/turbine, symmetric star silhouette, knight armor, neon, side/isometric view, copied boss, or franchise motif.

## Alpha and Runtime Processing

- Chroma removal used border auto-key sampling, soft matte, thresholds 12/220, and despill.
- Runtime sprites were alpha-cropped, padded, and downscaled without restyling.
- `ivory-pilgrim-game.png`: 213x512 source crop resized to 213x512; four transparent corners; 4 suspicious green edge pixels in automated inspection.
- `rootbound-bell-smith-game.png`: 677x720; four transparent corners; 41 suspicious green edge pixels across 487,440 pixels in automated inspection.
- The optimized runtime files are the only generated images imported by the production bundle.

## 2026-08-13 Motion Pass

No new raster asset was generated or imported for the animation upgrade. The player and boss continue to use the original credited PNGs above. Directional gait, mantle deformation, root tendons, shell anticipation/recoil, ember aperture, shadow response, and the cracked bell-hammer silhouette are original code-native Phaser geometry and transforms; therefore there is no additional image-generation prompt or third-party source to record.
