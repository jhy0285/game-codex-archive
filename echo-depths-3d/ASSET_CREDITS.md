# ECHO DEPTHS Asset Credits and Provenance

Snapshot: 2026-08-14, Asia/Seoul.

## Ownership statement

The KayKit character, animation clips, dungeon models, resource models, and source textures shipped under `public/assets/kaykit/` were created and distributed by **Kay Lousberg**. They were not created by the ECHO DEPTHS project. Credit is voluntary under the license, but this project credits the creator as:

> Kay Lousberg — www.kaylousberg.com

The game-specific layout, physics, echo rules, device behavior, procedural mechanisms, lighting, effects, UI, and generated Web Audio cues are implemented in this repository. No Hollow Knight code, characters, levels, animations, sound, or artwork is used.

## License

All four source packs state **Creative Commons Zero v1.0 Universal (CC0 1.0)**:

- License URL: `https://creativecommons.org/publicdomain/zero/1.0/`
- Commercial use: allowed
- Attribution required: no
- Creator's suggested credit: `Kay Lousberg, www.kaylousberg.com`
- Pack wording: the content is free for personal, educational, and commercial projects

The original copied terms ship at:

- `public/assets/kaykit/licenses/Adventurers-License.txt`
- `public/assets/kaykit/licenses/Character-Animations-License.txt`
- `public/assets/kaykit/licenses/Dungeon-Pack-License.txt`
- `public/assets/kaykit/licenses/Resource-Bits-License.txt`

## Official sources and acquired archives

Acquisition used each official itch.io page's anonymous **“No thanks, just take me to the downloads”** path. It required neither authentication nor payment. No third-party mirror was used.

| Pack | Official page | Free archive | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| KayKit Adventurers 2.0 | `https://kaylousberg.itch.io/kaykit-adventurers` | `KayKit_Adventurers_2.0_FREE.zip` | 13,024,345 | `abe48f4763fba0896bab486ee9e6d08ca6b5b3884b9601f235c8847ae94dc479` |
| KayKit Character Animations 1.1 | `https://kaylousberg.itch.io/kaykit-character-animations` | `KayKit_Character_Animations_1.1.zip` | 14,858,957 | `65882f31f905ad2e953819648a59287cdeab8f623908d5ef701971d3758be20f` |
| KayKit Dungeon Pack 1.1 | `https://kaylousberg.itch.io/kaykit-dungeon-pack` | `KayKit_Dungeon_Pack_1.1_FREE.zip` | 32,868,755 | `6acb859d1aefae074f937d1e6f13656a7312b2bdb6d9f1232ebdade8d93d6a1c` |
| KayKit Resource Bits 1.0 | `https://kaylousberg.itch.io/resource-bits` | `KayKit_ResourceBits_1.0_FREE.zip` | 8,520,574 | `7056f1310896a4612a67703fd6d5af389fcccdeb46df0a89e2322aa8e3bcfcf7` |

The four archives total 69,272,631 bytes. Their recorded working acquisition location is `work/kaykit-downloads/`; archives are not placed in `public/` and are not part of the production selection.

## Production selection summary

The exact selection contains 50 files and 5,703,863 bytes, about 8.2% of the four source-archive bytes. Omitting the unused archive contents reduces that comparison by about 91.8%.

| Type | Files | Bytes |
| --- | ---: | ---: |
| GLB character/animation data | 6 | 5,039,800 |
| GLTF model descriptors | 19 | 61,106 |
| GLTF binary buffers | 19 | 478,036 |
| PNG textures | 2 | 118,983 |
| Copied license texts | 4 | 5,938 |
| **Total** | **50** | **5,703,863** |

`manifest.json` and `provenance.json` add two metadata files and are not included in the 50-file source selection count.

## Exact selected files

### Adventurers 2.0

Source character:

`KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb`

Shipped files:

```text
public/assets/kaykit/characters/Knight.glb
public/assets/kaykit/licenses/Adventurers-License.txt
```

### Character Animations 1.1

Source directory:

`KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/`

Shipped files:

```text
public/assets/kaykit/animations/Rig_Medium_General.glb
public/assets/kaykit/animations/Rig_Medium_MovementBasic.glb
public/assets/kaykit/animations/Rig_Medium_MovementAdvanced.glb
public/assets/kaykit/animations/Rig_Medium_CombatMelee.glb
public/assets/kaykit/animations/Rig_Medium_Tools.glb
public/assets/kaykit/licenses/Character-Animations-License.txt
```

### Dungeon Pack 1.1

Source model directory:

`KayKit_Dungeon_Pack_1.1_FREE/Assets/gltf/`

Shipped files:

```text
public/assets/kaykit/environment/floor_tile_large.gltf
public/assets/kaykit/environment/floor_tile_large.bin
public/assets/kaykit/environment/floor_tile_small.gltf
public/assets/kaykit/environment/floor_tile_small.bin
public/assets/kaykit/environment/wall.gltf
public/assets/kaykit/environment/wall.bin
public/assets/kaykit/environment/wall_corner.gltf
public/assets/kaykit/environment/wall_corner.bin
public/assets/kaykit/environment/wall_half.gltf
public/assets/kaykit/environment/wall_half.bin
public/assets/kaykit/environment/wall_doorway.gltf
public/assets/kaykit/environment/wall_doorway.bin
public/assets/kaykit/environment/stairs.gltf
public/assets/kaykit/environment/stairs.bin
public/assets/kaykit/environment/stairs_wide.gltf
public/assets/kaykit/environment/stairs_wide.bin
public/assets/kaykit/environment/stairs_narrow.gltf
public/assets/kaykit/environment/stairs_narrow.bin
public/assets/kaykit/environment/column.gltf
public/assets/kaykit/environment/column.bin
public/assets/kaykit/environment/pillar.gltf
public/assets/kaykit/environment/pillar.bin
public/assets/kaykit/environment/box_large.gltf
public/assets/kaykit/environment/box_large.bin
public/assets/kaykit/environment/box_small.gltf
public/assets/kaykit/environment/box_small.bin
public/assets/kaykit/environment/crates_stacked.gltf
public/assets/kaykit/environment/crates_stacked.bin
public/assets/kaykit/environment/floor_tile_big_spikes.gltf
public/assets/kaykit/environment/floor_tile_big_spikes.bin
public/assets/kaykit/environment/torch_lit.gltf
public/assets/kaykit/environment/torch_lit.bin
public/assets/kaykit/environment/dungeon_texture.png
public/assets/kaykit/licenses/Dungeon-Pack-License.txt
```

### Resource Bits 1.0

Source model directory:

`KayKit_ResourceBits_1.0_FREE/Assets/gltf/`

Shipped files:

```text
public/assets/kaykit/resources/Parts_Cog.gltf
public/assets/kaykit/resources/Parts_Cog.bin
public/assets/kaykit/resources/Fuel_A_Barrel.gltf
public/assets/kaykit/resources/Fuel_A_Barrel.bin
public/assets/kaykit/resources/Wood_Log_A.gltf
public/assets/kaykit/resources/Wood_Log_A.bin
public/assets/kaykit/resources/resource_bits_texture.png
public/assets/kaykit/licenses/Resource-Bits-License.txt
```

Per-file source paths, public URLs, byte lengths, and SHA-256 hashes are recorded in `public/assets/kaykit/provenance.json`.

## Animation use

`AssetLibrary` loads `Knight.glb` and the five animation GLBs with Three.js `GLTFLoader`. It clones the skinned model with `SkeletonUtils.clone`, collects clips from the character and animation libraries, maps aliases to the game's 13 required states, and passes the normalized clips to `CharacterAnimator`.

| Game state | Source file | Source clip |
| --- | --- | --- |
| Idle | `Rig_Medium_General.glb` | `Idle_A` |
| Walk | `Rig_Medium_MovementBasic.glb` | `Walking_A` |
| Run | `Rig_Medium_MovementBasic.glb` | `Running_A` |
| Jump | `Rig_Medium_MovementBasic.glb` | `Jump_Start` |
| Fall | `Rig_Medium_MovementBasic.glb` | `Jump_Idle` |
| Land | `Rig_Medium_MovementBasic.glb` | `Jump_Land` |
| Carry | `Rig_Medium_Tools.glb` | `Holding_A` |
| Throw | `Rig_Medium_General.glb` | `Throw` |
| Interact | `Rig_Medium_General.glb` | `Interact` |
| Attack | `Rig_Medium_CombatMelee.glb` | `Melee_1H_Attack_Slice_Horizontal` |
| Dash | `Rig_Medium_MovementAdvanced.glb` | `Dodge_Forward` |
| Hit | `Rig_Medium_General.glb` | `Hit_A` |
| Defeat | `Rig_Medium_General.glb` | `Death_A` |

The runtime creates an `AnimationMixer` per actor, crossfades regular state changes over 0.14 seconds and Hit/Defeat transitions over 0.06 seconds, and scales Walk/Run playback from movement speed with a `0.65` to `1.65` clamp. Echo materials are cloned, made 48% opaque, set to no depth write, and given cyan emission where supported.

If the character or all 13 mapped states are unavailable, the runtime uses its code-built animated rig. This fallback is project-created geometry and animation, not KayKit art. `render_game_to_text()` and the development asset query distinguish `kaykit` from `procedural` status.

## Environment and resource use

The manifest asks `GLTFLoader` to load all 16 selected dungeon GLTF models and all 3 selected Resource Bits GLTF models. Their adjacent `.bin` and PNG dependencies are fetched through the GLTF references.

`DungeonWorld.addDecor()` selects a small, chapter-authored subset of these models rather than repeating every model around every room. The placements are declared with each level, sit outside critical puzzle routes, and use matching Rapier collision boxes plus camera-obstruction registration whenever they are structural. Torches remain non-solid visual lighting. This keeps every visible blocking prop aligned with the playable space instead of presenting a decorative object that actors can walk through.

The playable floors, walls, pillars, mechanisms, doors, cores, enemies, traps, and effects remain chiefly project-created Three.js geometry paired with Rapier colliders. KayKit environment/resource clones provide authored set dressing; their source selection does not replace the physical layout.

## Optimization and modification record

- Only the selected 50 source files ship; none of the four ZIP archives ship.
- Forty-eight selected files were reorganized into `characters/`, `animations/`, `environment/`, `resources/`, and `licenses/` without altering their contents. The two shared texture transformations are recorded below.
- No geometry reduction, rig edit, animation edit, material bake, audio conversion, or source-model conversion is recorded.
- A current-file audit matched both byte length and SHA-256 for all 50 production files against the provenance ledger: 50/50 length matches and 50/50 hash matches.
- `dungeon_texture.png` was downscaled from the 1024×1024 source to a 512×512 runtime PNG with high-quality bicubic resampling; the output is 60,114 bytes with SHA-256 `03b9ebd6840ebafbb771d4137dd48c0c01d4a05fb0a312edf50dc1c85bdaaeb1`.
- `resource_bits_texture.png` was downscaled from the 1024×1024 source to a 512×512 runtime PNG with high-quality bicubic resampling; the output is 58,869 bytes with SHA-256 `aa3eaf778cf52cb663c1d32dd4b5847689c99259652dc3b20bee1be6788d1896`.
- The optimized runtime textures total 118,983 bytes. Geometry, animation data, UVs, and source style were not altered by this texture pass.
- Runtime performance work is separate from source-asset transformation: device pixel ratio is capped at 2 on desktop and 1.5 on mobile; mobile shadows use 1024 maps; loaded model geometry/material is reused through cloning; procedural chapter geometry/material is shared where the builder creates repeated pillars; and resources are disposed at teardown.

## Machine-readable records

- `public/assets/kaykit/manifest.json` defines runtime load order.
- `public/assets/kaykit/provenance.json` records schema version, verification date, author, acquisition method, license, archive hashes, source paths, public URLs, exact bytes, per-file hashes, production selection totals, and clip coverage.
- The copied license texts preserve the terms delivered with each source archive.

The provenance verification date is 2026-08-14. Any future asset-content change must update the public file, manifest where applicable, provenance bytes/hash, and this credit ledger in the same change.
