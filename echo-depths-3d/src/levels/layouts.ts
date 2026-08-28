export type ChapterNumber = 1 | 2 | 3 | 4 | 5
export type StageNumber = 0 | ChapterNumber

export type Point3 = readonly [number, number, number]
export type Size3 = readonly [number, number, number]

export type BoxDefinition = {
  id: string
  position: Point3
  size: Size3
  rotation?: Point3
  tone?: 'stone' | 'trim' | 'void' | 'wood' | 'safe' | 'echo' | 'danger'
  wall?: boolean
  /** Raised floor that may fade when it blocks the active chapter camera. */
  occluder?: boolean
}

export type DeviceDefinition = {
  id: string
  kind: 'plate' | 'lever' | 'door' | 'elevator' | 'platform' | 'bridge' | 'crate' | 'core' | 'trap' | 'exit' | 'enemy' | 'receiver' | 'gate' | 'shutter' | 'one-way-wall' | 'return-gate'
  position: Point3
  size?: Size3
  to?: Point3
  axis?: 'x' | 'z'
  /** Optional trigger threshold for shutters: shutter opens when live Player.x >= this value. */
  openAtX?: number
}

export type DecorDefinition = {
  id: string
  source: 'environment' | 'resource'
  modelIndex: number
  position: Point3
  rotationY?: number
  scale?: number
  solid?: boolean
}

export type ChapterLayout = {
  chapter: StageNumber
  start: Point3
  echoAnchor: Point3
  boxes: readonly BoxDefinition[]
  devices: readonly DeviceDefinition[]
  pillars: readonly Point3[]
  decor: readonly DecorDefinition[]
  accent: number
  fog: number
}

const floor = (
  id: string,
  position: Point3,
  size: Size3,
  tone: BoxDefinition['tone'] = 'stone',
  rotation?: Point3,
): BoxDefinition => rotation ? { id, position, size, tone, rotation } : { id, position, size, tone }
const wall = (id: string, position: Point3, size: Size3): BoxDefinition => ({ id, position, size, tone: 'trim', wall: true })
const occludingFloor = (
  id: string,
  position: Point3,
  size: Size3,
  tone: BoxDefinition['tone'] = 'stone',
  rotation?: Point3,
): BoxDefinition => ({ ...floor(id, position, size, tone, rotation), occluder: true })

export const CHAPTER_LAYOUTS: Readonly<Record<StageNumber, ChapterLayout>> = {
  0: {
    chapter: 0,
    start: [-5.2, 1.08, 3.2],
    echoAnchor: [-5.2, 1.08, 3.2],
    accent: 0x65d9f4,
    fog: 0x07131b,
    boxes: [
      floor('orientation-floor', [-0.5, 0, 0.5], [6.9, 0.45, 4.8]),
      floor('orientation-step', [-0.15, 0.34, -2.1], [1.2, 0.2, 0.72]),
      wall('orientation-north', [-0.5, 2.4, -4.5], [7.3, 2.4, 0.35]),
      wall('orientation-west', [-8.0, 2.4, 0.5], [0.35, 2.4, 4.8]),
      wall('orientation-east', [7.0, 2.4, 0.5], [0.35, 2.4, 4.8]),
    ],
    devices: [
      { id: 'orientation-console', kind: 'lever', position: [-2.4, 0.72, 0.2] },
      { id: 'practice-crate', kind: 'crate', position: [2.3, 1.02, 0.8], size: [0.52, 0.52, 0.52] },
    ],
    pillars: [[-6.6, 0.5, -2.5], [5.8, 0.5, -2.5]],
    decor: [
      { id: 'orientation-buttress', source: 'environment', modelIndex: 2, position: [-7.15, 0.45, 3.6], scale: 0.3, solid: true },
      { id: 'orientation-supplies', source: 'resource', modelIndex: 1, position: [5.5, 0.56, 3.25], scale: 0.36, solid: true },
    ],
  },
  1: {
    chapter: 1,
    start: [-5.4, 1.08, 3.8],
    echoAnchor: [-5.4, 1.08, 3.8],
    accent: 0x28e6d6,
    fog: 0x07131b,
    boxes: [
      floor('lower-floor', [-3.8, 0, 2.2], [5.2, 0.45, 4.1]),
      floor('landing', [2.8, 0.5, 0.4], [1.8, 0.4, 2.1]),
      floor('gate-ramp', [5.2, 2.07, -0.2], [1.0, 0.18, 1.2], 'stone', [0, 0, 0.503]),
      floor('upper-floor', [8.35, 2.4, -1.2], [2.25, 0.45, 3.6]),
      floor('step-1', [0.4, 0.32, 0.4], [0.7, 0.24, 1.4]),
      floor('step-2', [1.55, 0.68, 0.4], [0.7, 0.24, 1.4]),
      floor('step-3', [2.7, 1.04, 0.4], [0.7, 0.24, 1.4]),
      floor('jump-ledge', [4.3, 1.55, -0.2], [0.7, 0.2, 1.2]),
      wall('north-wall', [0, 2.5, -4.3], [10.5, 2.5, 0.35]),
      wall('gate-wall-a', [3.8, 2.6, -2.9], [0.35, 2.6, 1.1]),
      wall('gate-wall-b', [3.8, 2.6, 2.0], [0.35, 2.6, 1.1]),
    ],
    devices: [
      { id: 'tutorial-lever', kind: 'lever', position: [-3.9, 0.72, 0.4] },
      { id: 'echo-plate', kind: 'plate', position: [-0.9, 0.5, 3.2], size: [1.15, 0.12, 1.15] },
      { id: 'first-door', kind: 'door', position: [3.8, 2.25, -0.45], size: [0.34, 2.45, 1.25] },
      { id: 'exit', kind: 'exit', position: [8.6, 3.08, -1.2], size: [0.85, 1.4, 0.85] },
    ],
    pillars: [[-6.2, 0.5, -2.1], [-1.5, 0.5, -2.4], [7.9, 2.9, 1.2]],
    decor: [
      { id: 'entry-buttress', source: 'environment', modelIndex: 2, position: [-8.05, 0.45, -0.8], scale: 0.34, solid: true },
      { id: 'descent-column', source: 'environment', modelIndex: 9, position: [-7.7, 0.45, 5.3], scale: 0.32, solid: true },
      { id: 'spare-cog', source: 'resource', modelIndex: 0, position: [-7.15, 0.56, -0.45], scale: 0.42, solid: true },
    ],
  },
  2: {
    chapter: 2,
    start: [-6.4, 1.08, 4.1],
    echoAnchor: [-6.4, 1.08, 4.1],
    accent: 0xf1b35c,
    fog: 0x10131a,
    boxes: [
      floor('hall-lower', [-3, 0, 1.6], [6, 0.45, 4.5]),
      // The authored lower plate is east of the original hall edge. This is a
      // physical floor section for the cargo route; it does not bypass the
      // elevator, weight plate, door, or upper exit rules.
      floor('counterweight-plate-bridge', [1.2, 0, 1.65], [1.8, 0.45, 3.8]),
      floor('counterweight-dock', [5.6, 3.85, -0.5], [4.05, 0.25, 4]),
      wall('counter-north', [0, 3, -4.1], [10.5, 3, 0.35]),
      wall('counter-west', [-9.3, 3, 0], [0.35, 3, 4.5]),
      wall('counter-east', [9.3, 3, 0], [0.35, 3, 4.5]),
    ],
    devices: [
      { id: 'lift-lever', kind: 'lever', position: [-3.6, 0.72, -1.2] },
      { id: 'counter-elevator', kind: 'elevator', position: [0.2, 0.35, -0.7], size: [1.35, 0.25, 1.35], to: [0.2, 3.85, -0.7] },
      { id: 'cargo-crate', kind: 'crate', position: [5.7, 5.0, 1.6], size: [0.52, 0.52, 0.52] },
      { id: 'weight-plate', kind: 'plate', position: [0.9, 0.52, 3.7], size: [1.15, 0.12, 1.15] },
      { id: 'counter-door', kind: 'door', position: [7.2, 6.1, -0.5], size: [0.32, 2.15, 1.25] },
      { id: 'exit', kind: 'exit', position: [8.15, 4.68, -0.5] },
    ],
    pillars: [[-7.2, 0.5, -2.4], [-7.2, 0.5, 3.1], [4.3, 4.5, -2.8], [4.3, 4.5, 2.4]],
    decor: [
      { id: 'counter-buttress', source: 'environment', modelIndex: 3, position: [-8.5, 0.45, -2.7], scale: 0.34, solid: true },
      { id: 'counter-column', source: 'environment', modelIndex: 10, position: [-7.7, 0.45, 5.15], scale: 0.32, solid: true },
      { id: 'upper-supplies', source: 'environment', modelIndex: 13, position: [7.8, 4.45, 2.35], scale: 0.32, solid: true },
      { id: 'fuel-stock', source: 'resource', modelIndex: 1, position: [-8.05, 0.56, 2.8], scale: 0.42, solid: true },
    ],
  },
  3: {
    chapter: 3,
    start: [-7.0, 1.08, 2.8],
    echoAnchor: [-7.0, 1.08, 2.8],
    accent: 0xc15bf2,
    fog: 0x100c1a,
    boxes: [
      floor('atrium-west', [-5.0, 0, 0], [4.0, 0.45, 4.2], 'safe'),
      floor('atrium-player-crossing', [0.1, 0, -2.45], [1.8, 0.45, 1.1], 'safe'),
      floor('atrium-transfer-ledge', [0.1, 0, 2.45], [1.8, 0.45, 1.1], 'echo'),
      // A separate middle return corridor. Its gate only unlocks after the
      // physical Core has actually activated the east receiver.
      floor('atrium-return-crossing', [0.2, 0, 0], [2.9, 0.45, 1.55], 'safe'),
      floor('atrium-east', [5.8, 0, 0], [4.2, 0.45, 4.2], 'echo'),
      floor('atrium-catch-basin', [4.8, 0.12, 2.45], [2.25, 0.12, 1.35], 'echo'),
      wall('atrium-transfer-rail-south', [1.0, 0.55, 1.1], [1.4, 0.55, 0.14]),
      wall('atrium-transfer-rail-north', [0.1, 0.55, 3.8], [3.1, 0.55, 0.14]),
      wall('atrium-north', [0.4, 2.4, -4.45], [9.8, 2.4, 0.3]),
      wall('atrium-south', [0.4, 2.4, 4.45], [9.8, 2.4, 0.3]),
      wall('atrium-west-wall', [-9.4, 2.4, 0], [0.3, 2.4, 4.2]),
      wall('atrium-east-wall', [10.2, 2.4, 0], [0.3, 2.4, 4.2]),
      wall('atrium-player-rail', [-0.1, 0.65, -1.2], [1.45, 0.65, 0.14]),
      wall('atrium-player-outer-rail', [0.1, 0.65, -3.7], [3.1, 0.65, 0.14]),
      wall('atrium-basin-north-rail', [4.8, 0.72, 3.75], [2.25, 0.6, 0.14]),
      wall('atrium-basin-east-rail', [7.0, 0.72, 2.45], [0.14, 0.6, 1.15]),
    ],
    devices: [
      { id: 'memory-core', kind: 'core', position: [-6.2, 1.1, 2.45] },
      { id: 'temporal-gate', kind: 'gate', position: [0.1, 1.35, -2.45], size: [1.25, 2.7, 2.4] },
      { id: 'transfer-shutter', kind: 'shutter', position: [1.45, 1.35, 2.45], size: [0.7, 2.7, 2.4], openAtX: 2.7 },
      // The live Player may cross this full-height barrier only west → east.
      // Its height also closes the former jump/dash return shortcut.
      // A deliberately oversized portal: its frame needs to read as the whole
      // south crossing, rather than as a small purple pillar beside it.
      { id: 'atrium-one-way', kind: 'one-way-wall', position: [1.45, 1.8, -2.45], size: [0.8, 3.6, 2.85] },
      // This is intentionally separate from atrium-one-way. It remains closed
      // until the actual receiver is active, then admits only the live Player.
      { id: 'atrium-return-gate', kind: 'return-gate', position: [1.45, 1.35, 0], size: [0.74, 2.7, 1.55] },
      { id: 'core-receiver', kind: 'receiver', position: [8.0, 0.88, 0.25] },
      { id: 'atrium-door', kind: 'door', position: [9.45, 2.15, -0.65], size: [0.32, 2.1, 1.2] },
      { id: 'exit', kind: 'exit', position: [9.4, 1.08, -2.2] },
    ],
    pillars: [[-8.3, 0.5, -3.2], [-8.3, 0.5, 3.2], [8.8, 0.55, 3.15]],
    decor: [
      { id: 'west-ruin', source: 'environment', modelIndex: 4, position: [-8.4, 0.45, -0.5], scale: 0.32, solid: true },
      { id: 'east-pillar', source: 'environment', modelIndex: 10, position: [8.8, 0.45, 3.15], scale: 0.28, solid: true },
      { id: 'atrium-cargo', source: 'resource', modelIndex: 0, position: [-7.9, 0.56, -2.9], scale: 0.34, solid: true },
    ],
  },
  4: {
    chapter: 4,
    start: [-7.4, 1.08, 3.0],
    echoAnchor: [-7.4, 1.08, 3.0],
    accent: 0xe95757,
    fog: 0x140c10,
    boxes: [
      // A continuous inset foundation keeps the surveillance gallery readable
      // without turning a missed route edge into an unrelated fall/reset. The
      // colored route slabs sit 0.03 units above it, so entry, Echo, cover,
      // patrol, and exit ownership remain visible while the whole room stays
      // physically walkable inside the perimeter walls.
      floor('gallery-foundation', [-0.2, 0.36, 0], [9.15, 0.06, 4.35], 'safe'),
      floor('gallery-entry', [-6.3, 0, 2.2], [3.0, 0.45, 2.0], 'safe'),
      floor('gallery-bell-route', [-2.5, 0, 2.2], [1.0, 0.45, 2.0], 'echo'),
      floor('gallery-covered-flank', [-5.8, 0, -1.9], [1.6, 0.45, 2.3], 'safe'),
      floor('gallery-patrol', [0.8, 0, 0], [3.0, 0.45, 4.2], 'danger'),
      floor('gallery-exit-bay', [6.1, 0, 0], [2.3, 0.45, 4.2], 'safe'),
      floor('gallery-ramp', [0.0, 1.0, -3.05], [5.5, 0.18, 0.9], 'safe', [0, 0, 0.16]),
      occludingFloor('gallery-high-flank', [4.65, 1.6, -2.75], [2.25, 0.4, 1.35], 'safe'),
      wall('gallery-north', [-0.2, 2.8, -4.55], [9.6, 2.8, 0.35]),
      wall('gallery-south', [-0.2, 2.8, 4.55], [9.6, 2.8, 0.35]),
      wall('gallery-west', [-9.7, 2.8, 0], [0.35, 2.8, 4.5]),
      wall('gallery-east', [9.3, 2.8, 0], [0.35, 2.8, 4.5]),
      wall('gallery-entry-screen', [-4.0, 1.6, 0.55], [0.35, 1.6, 1.45]),
      wall('gallery-cover-center', [-1.2, 1.5, 0.45], [0.38, 1.5, 1.4]),
      wall('gallery-cover-east', [3.55, 1.5, 1.55], [0.38, 1.5, 1.2]),
      wall('gallery-flank-parapet', [3.9, 2.9, -1.45], [2.5, 0.5, 0.14]),
    ],
    devices: [
      { id: 'lure-bell', kind: 'lever', position: [-1.9, 0.72, 3.0] },
      // Sweep the full east corridor instead of pacing beside the trap. The
      // west endpoint still leaves the Watcher in reach of the Echo lure.
      { id: 'watcher', kind: 'enemy', position: [5.9, 0.98, -0.45], size: [0.48, 0.85, 0.48], to: [0.25, 0.98, -0.45] },
      { id: 'spike-trap', kind: 'trap', position: [1.1, 0.52, 1.15], size: [0.7, 0.2, 0.7] },
      { id: 'gallery-door', kind: 'door', position: [7.75, 2.4, -0.7], size: [0.32, 2.0, 1.2] },
      { id: 'exit', kind: 'exit', position: [8.35, 1.08, -2.55] },
    ],
    pillars: [[-8.3, 0.5, -3.1], [5.4, 0.5, 3.25], [7.8, 0.5, 3.25]],
    decor: [
      { id: 'gallery-doorway', source: 'environment', modelIndex: 5, position: [-8.7, 0.45, -2.8], scale: 0.3, solid: true },
      { id: 'cover-supplies', source: 'environment', modelIndex: 13, position: [-5.8, 0.45, -0.2], scale: 0.28, solid: true },
      { id: 'trap-torch', source: 'environment', modelIndex: 15, position: [5.8, 0.75, 3.7], scale: 0.3 },
      { id: 'gallery-log', source: 'resource', modelIndex: 2, position: [-8.2, 0.56, 1.0], scale: 0.34, solid: true },
    ],
  },
  5: {
    chapter: 5,
    start: [-7.4, 1.08, 2.7],
    echoAnchor: [-7.4, 1.08, 2.7],
    accent: 0x8e6dff,
    fog: 0x090719,
    boxes: [
      floor('well-west', [-5.0, 0, 0], [4.0, 0.45, 4.2], 'safe'),
      floor('well-player-crossing', [0.1, 0, -2.55], [1.8, 0.45, 1.0], 'safe'),
      floor('well-transfer-ledge', [0.1, 0, 2.55], [1.8, 0.45, 1.0], 'echo'),
      floor('well-east', [5.7, 0, 0], [4.1, 0.45, 4.2], 'danger'),
      floor('well-core-basin', [4.7, 0.12, 2.55], [2.1, 0.12, 1.25], 'echo'),
      wall('well-transfer-rail-south', [1.0, 0.55, 1.2], [1.4, 0.55, 0.14]),
      wall('well-transfer-rail-north', [0.1, 0.55, 3.85], [3.1, 0.55, 0.14]),
      // This is the Guardian's raised patrol arena, not a pressure plate. Keep
      // it neutral so the animated arena ring and vision cone communicate the
      // hazard instead of making the whole slab look like an inert switch.
      occludingFloor('guardian-dais', [0.9, 1.15, 0.9], [2.2, 0.3, 1.55], 'stone'),
      // The upper route deliberately stays isolated from both lower lanes, but its
      // playable seams need enough overlap for a real controller or touch input.
      occludingFloor('well-upper', [6.65, 3.0, -0.7], [2.35, 0.45, 3.4], 'safe'),
      occludingFloor('guardian-flank', [3.1, 3.0, 1.1], [2.15, 0.35, 1.8], 'safe'),
      floor('final-bridge', [8.15, 3.0, 2.35], [1.1, 0.35, 1.45], 'safe'),
      floor('well-platform-apron', [5.05, 0.4, -2.65], [0.9, 0.12, 0.85], 'safe', [0, 0, -0.23]),
      wall('well-north-lower-wall', [0.3, 1.2, -4.5], [9.8, 1.2, 0.3]),
      wall('well-north-upper-parapet', [6.65, 3.85, -4.4], [2.65, 0.4, 0.3]),
      wall('well-south-lower-wall', [0.3, 1.2, 4.5], [9.8, 1.2, 0.3]),
      wall('well-south-upper-parapet', [8.15, 3.85, 4.05], [1.55, 0.4, 0.3]),
      wall('well-west-wall', [-9.4, 4.0, 0], [0.3, 4.0, 4.2]),
      wall('well-east-lower-wall', [10.0, 1.2, 0], [0.3, 1.2, 4.2]),
      wall('well-east-upper-parapet', [9.55, 3.85, 0], [0.3, 0.4, 4.2]),
      wall('well-divider-center', [1.45, 2.0, 0], [0.3, 2.0, 1.35]),
      wall('well-player-rail', [-0.1, 0.65, -1.4], [1.45, 0.65, 0.14]),
      wall('well-player-outer-rail', [0.1, 0.65, -3.7], [3.1, 0.65, 0.14]),
      wall('well-basin-north-rail', [4.7, 0.72, 3.75], [2.1, 0.6, 0.14]),
      wall('well-basin-east-rail', [6.75, 0.72, 2.55], [0.14, 0.6, 1.0]),
    ],
    devices: [
      { id: 'paradox-core', kind: 'core', position: [-6.2, 1.1, 2.55] },
      { id: 'well-player-gate', kind: 'gate', position: [0.1, 1.35, -2.55], size: [1.25, 2.7, 2.2] },
      { id: 'well-transfer-shutter', kind: 'shutter', position: [1.45, 1.35, 2.55], size: [0.7, 2.7, 2.2], openAtX: 2.7 },
      { id: 'well-one-way', kind: 'one-way-wall', position: [1.45, 1.8, -2.55], size: [0.8, 3.6, 2.65] },
      { id: 'power-receiver', kind: 'receiver', position: [7.2, 0.88, 0.2] },
      { id: 'well-platform', kind: 'platform', position: [4.15, 0.5, -2.65], size: [0.8, 0.2, 0.85], to: [4.15, 3.25, -2.65] },
      // Keep the whole Guardian collider on its dais and clear of the center
      // divider. The old x=0.8 spawn intersected that wall by 0.35 units.
      { id: 'guardian', kind: 'enemy', position: [0.1, 2.28, 0.85], size: [0.7, 0.9, 0.7], to: [-0.45, 2.28, 0.15] },
      { id: 'lower-seal', kind: 'plate', position: [-1.75, 0.52, -2.55], size: [1.05, 0.12, 1.05] },
      { id: 'upper-seal', kind: 'lever', position: [6.8, 3.72, -1.25] },
      { id: 'final-door', kind: 'door', position: [8.35, 5.0, 1.2], size: [0.32, 2.15, 1.2] },
      { id: 'exit', kind: 'exit', position: [8.25, 3.78, 2.65] },
    ],
    pillars: [[-8.3, 0.5, -3.2], [-8.3, 0.5, 3.2], [9.0, 3.5, -3.55], [9.0, 3.5, 3.55]],
    decor: [
      { id: 'well-doorway', source: 'environment', modelIndex: 3, position: [-8.5, 0.45, -0.5], scale: 0.3, solid: true },
      { id: 'well-supplies', source: 'environment', modelIndex: 12, position: [-7.8, 0.45, -2.9], scale: 0.28, solid: true },
      { id: 'well-fuel', source: 'resource', modelIndex: 1, position: [-8.1, 0.56, 1.0], scale: 0.34, solid: true },
      { id: 'mid-torch', source: 'environment', modelIndex: 15, position: [3.1, 1.8, 0.2], scale: 0.28 },
    ],
  },
}
