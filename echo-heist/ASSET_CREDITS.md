# Asset Credits

## Woven Under-Temple original art (current runtime)

- **Creator:** OpenAI built-in image generation, directed for ECHO HEIST
- **Created:** 2026-08-12
- **Runtime files:** `public/assets/woven-reliquary/woven-reliquary.png`, `public/assets/woven-reliquary/bellroot-ossuary.png`, `public/assets/woven-reliquary/pilgrim-motion/memory-pilgrim-motion-atlas.png`
- **Identity source:** `public/assets/woven-reliquary/memory-pilgrim.png` is retained as the inspected original design source; the live player and echo now use the motion atlas described below.
- **Used for:** The two hand-painted sanctuary backdrops and the animated player/echo character. Gameplay glyphs, gate ornaments, fog, threads, particles, UI, and collision geometry are drawn separately in code.
- **Character alpha workflow:** The built-in model produced `memory-pilgrim-chroma.png` on a flat green field; the installed imagegen `remove_chroma_key.py` helper created `memory-pilgrim.png`. Validation confirmed RGBA output, four fully transparent corners, alpha bbox `(286, 104, 1049, 1151)`, and 374,103 visible pixels.
- **Design boundary:** Original hand-painted gothic insect-fable imagery only. No Hollow Knight/reference-repository characters, exact horn silhouettes, named motifs, sprites, UI layouts, logos, environments, or source code are included.
- **Reference-input disclosure:** No Hollow Knight screenshot, extracted file, repository asset, or other franchise image was supplied to the generator as an input/reference image. All three generation calls were text-only built-in imagegen requests.

### Final generation prompts

**Woven Reliquary backdrop:** `Create an original hand-painted gothic insect-fable dark-fantasy subterranean memory temple called the Woven Reliquary. A vast ink-dark sanctuary is viewed from a high three-quarter/top-down viewpoint; a broad calm navigable stone floor occupies the central 70 percent; enormous drowned roots, tarnished hanging bells, thin silk threads, tiny moths, bone-white ritual stones, and distant ribbed arches stay at the outer edges. Premium gouache and ink-wash 2D game environment, charcoal, bone ivory, faded mulberry, oxidized teal, restrained brass; no character, text, UI, grid, inner collision walls, pixel art, neon, exact franchise motifs, horned bug-knight silhouettes, logo, or watermark.`

**Bellroot Ossuary backdrop:** `Create an original hand-painted gothic insect-fable dark-fantasy Bellroot Ossuary, a high three-quarter/top-down stone nave with a broad empty walkable center. Gigantic roots, cracked ceremonial bells, translucent burial silk, dew, oval niches, and worn rune stones stay at the perimeter; foreground roots frame the bottom corners. Premium gouache, graphite, and ink wash with charcoal, parchment ivory, desaturated wine-purple, oxidized teal, and minute antique brass; no character, text, UI, central obstacle, pixel art, neon, exact franchise motif, logo, or watermark.`

**Memory pilgrim:** `Create exactly one original compact memory pilgrim for a hand-painted gothic insect-fable puzzle game: smooth round ivory remembrance mask, two short drooping leaf-like side fins instead of horns, charcoal cocoon cloak with faded mulberry lining, thin wrapped limbs, a brass thread spindle, oxidized-teal stitches, and a trailing silk ribbon. Full-body top-down three-quarter sprite, readable at small scale, on a perfectly uniform #00ff00 chroma-key background with no floor, shadow, text, watermark, horns, antlers, skull mask, sword, copyrighted character, pixel art, multiple views, or UI.`

## Memory pilgrim deterministic motion set (current runtime)

- **Creator and method:** OpenAI built-in image generation, directed for ECHO HEIST on 2026-08-13. The existing local `memory-pilgrim.png` was first opened with the image-inspection tool, then supplied as the sole identity/costume reference to four built-in image-generation calls. No external artwork, Hollow Knight image, repository sprite, or franchise reference file was supplied.
- **Directional chroma outputs:** `public/assets/woven-reliquary/pilgrim-motion/pilgrim-down-chroma.png`, `pilgrim-up-chroma.png`, `pilgrim-left-chroma.png`, and `pilgrim-right-chroma.png`.
- **Transparent masters:** `public/assets/woven-reliquary/pilgrim-motion/pilgrim-down.png`, `pilgrim-up.png`, `pilgrim-left.png`, and `pilgrim-right.png`.
- **Runtime atlas:** `public/assets/woven-reliquary/pilgrim-motion/memory-pilgrim-motion-atlas.png` (RGBA, 3072x1024, 256px cells, four directional rows and twelve columns per row).
- **Processing:** The installed imagegen `scripts/remove_chroma_key.py` helper removed each flat green field. `scripts/build_pilgrim_motion_atlas.py` then made presentation-only gouache-preserving transforms: six walk phases, three idle-breath phases, two turn phases, and one settled echo-hold phase per direction. The transforms affect only rendered pixels; player radius, coordinates, speed, collision, recording samples, and puzzle timing remain unchanged.
- **Alpha validation:** All four masters are RGBA 1254x1254 with alpha `0` in all four corners. Visible alpha bboxes are down `(318, 154, 1064, 1079)`, up `(298, 143, 1003, 1158)`, left `(297, 115, 1101, 1154)`, and right `(147, 198, 901, 1088)`.
- **Runtime behavior:** `EchoScene.ts` selects atlas frames only from deterministic `presentationTime`, resolved motion, facing, and replay state. The player uses actual resolved travel to prevent wall run-in-place; the echo adds deterministic delayed afterimages while replaying and switches to the dedicated hold frame at its final sample.
- **Design boundary:** The pilgrim remains an original ivory remembrance-mask figure with drooping leaf fins, cocoon cloth, spindle, stitches, and ribbon. Exact horn shapes, skull masks, swords, franchise characters, copied silhouettes, logos, UI, and named motifs were explicitly excluded.

### Final directional generation prompts

**Down/front master:** `Use case: style-transfer. Asset type: directional master sprite for a top-down hand-painted game character. Input image: identity and costume reference only. Create exactly the original memory pilgrim as one clean downward/front-facing top-down three-quarter sprite, with both dark eyes readable, feet separated for a walking cycle, and the pale stitched ribbon trailing to screen-right. Preserve these identity invariants: smooth round warm-ivory remembrance mask; two short drooping translucent teal leaf fins, never horns; charcoal cocoon cloak with faded mulberry lining; thin wrapped legs; brass thread spindle; oxidized-teal stitches; pale stitched ribbon; the same proportions, materials, personality, and original non-franchise design. Premium gouache and ink, one full body centered at consistent scale and foot baseline, on a perfectly flat #00ff00 background. No floor, shadow, text, watermark, border, horns, antlers, skull, sword, franchise character, pixel art, 3D render, chibi exaggeration, collage, or extra view.`

**Up/back master:** `Use case: style-transfer. Asset type: directional master sprite for a top-down hand-painted game character. Input image: identity and costume reference only. Create exactly the original memory pilgrim as one clean upward/away-facing top-down three-quarter sprite. Show the back of the cocoon cloak and only a narrow warm-ivory mask rim with no eyes; keep the drooping teal leaf fins, brass spindle, wrapped legs, teal stitches, and pale ribbon clearly identifiable. Preserve the same proportions, materials, personality, and original non-franchise design. Premium gouache and ink, one full body centered at consistent scale and foot baseline, on a perfectly flat #00ff00 background. No floor, shadow, text, watermark, border, horns, antlers, skull, sword, franchise character, pixel art, 3D render, chibi exaggeration, collage, or extra view.`

**Left master:** `Use case: style-transfer. Asset type: directional master sprite for a top-down hand-painted game character. Input image: identity and costume reference only. Create exactly the original memory pilgrim as one clean screen-left-facing top-down three-quarter sprite, with one dark eye readable, feet separated for a walking cycle, and the pale stitched ribbon trailing to screen-right. Preserve these identity invariants: smooth round warm-ivory remembrance mask; two short drooping translucent teal leaf fins, never horns; charcoal cocoon cloak with faded mulberry lining; thin wrapped legs; brass thread spindle; oxidized-teal stitches; pale stitched ribbon; the same proportions, materials, personality, and original non-franchise design. Premium gouache and ink, one full body centered at consistent scale and foot baseline, on a perfectly flat #00ff00 background. No floor, shadow, text, watermark, border, horns, antlers, skull, sword, franchise character, pixel art, 3D render, chibi exaggeration, collage, or extra view.`

**Right master:** `Use case: style-transfer. Asset type: directional master sprite for a top-down hand-painted game character. Input image: identity and costume reference only. Create exactly the original memory pilgrim as one clean screen-right-facing top-down three-quarter sprite, with one dark eye readable, feet separated for a walking cycle, and the pale stitched ribbon trailing to screen-left. Preserve these identity invariants: smooth round warm-ivory remembrance mask; two short drooping translucent teal leaf fins, never horns; charcoal cocoon cloak with faded mulberry lining; thin wrapped legs; brass thread spindle; oxidized-teal stitches; pale stitched ribbon; the same proportions, materials, personality, and original non-franchise design. Premium gouache and ink, one full body centered at consistent scale and foot baseline, on a perfectly flat #00ff00 background. No floor, shadow, text, watermark, border, horns, antlers, skull, sword, franchise character, pixel art, 3D render, chibi exaggeration, collage, or extra view.`

## Dream Fracture backgrounds (archived visual direction, not current runtime)

- **Creator:** OpenAI image generation, directed for ECHO HEIST
- **Created:** 2026-08-12
- **Local files:** `public/assets/dream-fracture/memory-garden.png`, `public/assets/dream-fracture/broken-orrery.png`
- **Used for:** Original stage backdrops. Gameplay objects, characters, UI, and collision geometry are drawn separately in code.
- **Design boundary:** No Fugue Shot files, logos, characters, or screen layouts are included.

## Silkscreen font (not current runtime)

- **Creator:** Jason Kottke
- **Source:** https://github.com/googlefonts/silkscreen
- **License:** SIL Open Font License 1.1
- **Local license:** `public/assets/fonts/silkscreen/OFL.txt`
- **Used for:** Local, offline HUD and interface typography.

## Sci-Fi Facility Asset Pack (archived, not used by the current runtime)

- **Creator:** Murphy's Dad
- **Source:** https://murphysdad.itch.io/sci-fi-facility
- **License:** Creative Commons Zero v1.0 Universal (CC0)
- **License reference:** https://creativecommons.org/publicdomain/zero/1.0/
- **Downloaded:** 2026-08-12 from itch.io's free download flow
- **Original archive:** `archive/prototype-assets/itch-public-original/murphysdad-sci-fi-facility.zip`
- **Local license/readme:** `archive/prototype-assets/itch-public-original/murphysdad/sci-fi-facility-asset-pack/README.txt`
- **Status:** Retained outside `public` as an earlier prototype archive, so it is recoverable but not copied into deployment builds. The Dream Fracture runtime does not request or render these textures.

Credit is not required by CC0, but it is retained here in appreciation of the creator.
