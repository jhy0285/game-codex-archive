export type ChapterNumber = 1 | 2 | 3 | 4 | 5
export type StageNumber = 0 | ChapterNumber

export type Point3 = readonly [number, number, number]
export type Size3 = readonly [number, number, number]

export type BoxDefinition = {
  id: string
  position: Point3
  size: Size3
  rotation?: Point3
  tone?: 'stone' | 'trim' | 'void' | 'wood'
  wall?: boolean
}

export type DeviceDefinition = {
  id: string
  kind: 'plate' | 'lever' | 'door' | 'elevator' | 'platform' | 'bridge' | 'crate' | 'core' | 'trap' | 'exit' | 'enemy' | 'receiver' | 'gate'
  position: Point3
  size?: Size3
  to?: Point3
  axis?: 'x' | 'z'
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
    start: [-6.1, 3.58, 3.3],
    echoAnchor: [-2.0, 3.75, 1.6],
    accent: 0xc15bf2,
    fog: 0x100c1a,
    boxes: [
      floor('atrium-upper-west', [-4.6, 2.5, 1.4], [3.6, 0.45, 4.0]),
      // Descent stairs: replace the broken atrium-descent with three walkable steps
      // that descend from the upper floor's south edge (y=2.0 top) down to atrium-lower level.
      // Each step extends SOUTH of the upper floor (z=[-3.5, -1.5]) so the player walks straight
      // south off the upper shelf and lands on step 1 (almost flush with the upper's underside).
      // The easting offset lets the player step east onto each subsequent stair.
      floor('descent-step-1', [-1.5, 1.85, -2.5], [2.5, 0.15, 1.0]), // top y=2.0, south of upper (z=-3.5..-1.5)
      floor('descent-step-2', [-0.5, 0.85, -2.5], [2.5, 0.15, 1.0]), // top y=1.0, offset east 1
      floor('descent-step-3', [0.5, 0.05, -2.5], [2.5, 0.15, 1.0]), // top y=0.2, matches atrium-lower
      floor('atrium-lower', [-0.6, -0.25, 0], [4.9, 0.45, 4.3]),
      floor('atrium-east', [7.0, 0, -0.5], [2.8, 0.45, 3.7]),
      wall('atrium-north', [0, 3.2, -4.5], [10.5, 3.2, 0.35]),
    ],
    devices: [
      { id: 'memory-core', kind: 'core', position: [-3.0, 3.75, 1.6] },
      { id: 'temporal-gate', kind: 'gate', position: [0.0, 0.9, -2.0], size: [3.0, 2.2, 0.6] },
      { id: 'core-receiver', kind: 'receiver', position: [6.6, 0.88, 1.6] },
      { id: 'atrium-door', kind: 'door', position: [9.45, 2.15, -0.4], size: [0.32, 2.1, 1.2] },
      { id: 'exit', kind: 'exit', position: [10.2, 1.08, -0.4] },
    ],
    pillars: [[-0.2, 0.25, -0.2], [0.4, 0.25, 3.1], [-1.6, 0.25, 2.3], [7.4, 0.5, -2.4]],
    decor: [
      { id: 'west-ruin', source: 'environment', modelIndex: 4, position: [-7.75, 2.95, -1.8], scale: 0.34, solid: true },
      { id: 'east-pillar', source: 'environment', modelIndex: 10, position: [8.35, 0.45, -2.6], scale: 0.3, solid: true },
      { id: 'atrium-crate', source: 'environment', modelIndex: 12, position: [0.1, 0.2, -3.2], scale: 0.34, solid: true },
      { id: 'west-cog', source: 'resource', modelIndex: 0, position: [-7.4, 3.1, 4.35], scale: 0.38, solid: true },
    ],
  },
  4: {
    chapter: 4,
    start: [-7.2, 1.08, 3.8],
    echoAnchor: [-7.2, 1.08, 3.8],
    accent: 0xe95757,
    fog: 0x140c10,
    boxes: [
      floor('gallery-floor', [0, 0, 0], [9.2, 0.45, 4.5]),
      floor('gallery-flank', [3.7, 2.15, -2.3], [3.0, 0.4, 1.35]),
      floor('flank-step-a', [0.4, 0.4, -3.0], [0.7, 0.28, 1]),
      floor('flank-step-b', [1.5, 0.85, -3.0], [0.7, 0.28, 1]),
      floor('flank-step-c', [2.6, 1.3, -3.0], [0.7, 0.28, 1]),
      wall('gallery-north', [0, 2.8, -4.6], [9.6, 2.8, 0.35]),
      wall('cover-a', [-2.3, 1.5, 0.5], [0.4, 1.5, 1.7]),
      wall('cover-b', [2.1, 1.5, 1.2], [0.4, 1.5, 1.5]),
    ],
    devices: [
      { id: 'lure-bell', kind: 'lever', position: [-0.8, 0.72, 3.1] },
      { id: 'watcher', kind: 'enemy', position: [2.4, 0.98, -0.4], size: [0.48, 0.85, 0.48], to: [-1.1, 0.98, -0.4] },
      { id: 'spike-trap', kind: 'trap', position: [0.5, 0.52, 0.9], size: [1.35, 0.2, 1.45] },
      { id: 'gallery-door', kind: 'door', position: [7.5, 2.4, -1.8], size: [0.32, 2.0, 1.2] },
      { id: 'exit', kind: 'exit', position: [8.35, 1.08, -1.8] },
    ],
    pillars: [[-5.3, 0.5, -1.9], [-0.1, 0.5, 1.2], [4.2, 0.5, 0.2], [6.9, 0.5, 3.0]],
    decor: [
      { id: 'gallery-doorway', source: 'environment', modelIndex: 5, position: [-8.2, 0.45, -2.5], scale: 0.33, solid: true },
      { id: 'cover-supplies', source: 'environment', modelIndex: 13, position: [-5.85, 0.45, -2.85], scale: 0.32, solid: true },
      { id: 'trap-torch', source: 'environment', modelIndex: 15, position: [7.1, 0.75, 3.7], scale: 0.32 },
      { id: 'gallery-log', source: 'resource', modelIndex: 2, position: [-7.9, 0.56, 1.2], scale: 0.38, solid: true },
    ],
  },
  5: {
    chapter: 5,
    start: [-7.5, 1.08, 3.8],
    echoAnchor: [-7.5, 1.08, 3.8],
    accent: 0x8e6dff,
    fog: 0x090719,
    boxes: [
      floor('well-lower', [-4.6, 0, 1.2], [4.8, 0.45, 4.3]),
      floor('well-ramp', [-3.4, 1.7, -0.8], [2.35, 0.18, 0.55], 'stone', [0, 0, 0.5586]),
      floor('well-mid', [1.7, 2.5, -1.3], [3.1, 0.45, 3.1]),
      floor('well-upper', [6.8, 5.1, 0.3], [3.0, 0.45, 3.7]),
      floor('guardian-ring', [1.7, 2.65, 2.5], [2.7, 0.35, 1.55]),
      floor('escape-a', [4.5, 3.7, 3.5], [1.0, 0.25, 1.0]),
      floor('escape-b', [6.0, 4.4, 3.1], [1.0, 0.25, 1.0]),
      wall('well-north', [0, 4.0, -4.8], [10.5, 4, 0.35]),
      wall('well-cover-a', [-1.4, 1.5, 1.4], [0.4, 1.5, 1.4]),
      wall('well-cover-b', [4.1, 4.0, -0.4], [0.4, 1.4, 1.3]),
    ],
    devices: [
      { id: 'paradox-core', kind: 'core', position: [-5.7, 1.1, 2.0] },
      { id: 'power-receiver', kind: 'receiver', position: [-7.0, 0.92, -0.8] },
      { id: 'well-elevator', kind: 'elevator', position: [-0.2, 0.35, -2.6], size: [1.25, 0.25, 1.25], to: [-0.2, 2.4, -2.6] },
      { id: 'well-platform', kind: 'platform', position: [3.7, 2.8, -1.8], size: [1.05, 0.2, 1.05], to: [5.6, 4.85, -1.8] },
      { id: 'guardian', kind: 'enemy', position: [1.7, 3.58, 2.5], size: [0.7, 0.9, 0.7] },
      { id: 'lower-seal', kind: 'plate', position: [-3.1, 0.52, 3.6], size: [1.05, 0.12, 1.05] },
      { id: 'upper-seal', kind: 'lever', position: [6.2, 5.82, -1.7] },
      { id: 'final-door', kind: 'door', position: [8.0, 7.0, 0.3], size: [0.32, 2.15, 1.2] },
      { id: 'exit', kind: 'exit', position: [8.85, 5.78, 0.3] },
    ],
    pillars: [[-6.7, 0.5, -1.9], [-2.5, 0.5, -2.2], [1.7, 3.0, 0.3], [6.7, 5.6, 2.6]],
    decor: [
      { id: 'well-doorway', source: 'environment', modelIndex: 3, position: [-8.7, 0.45, -2.5], scale: 0.34, solid: true },
      { id: 'well-supplies', source: 'environment', modelIndex: 12, position: [-6.8, 0.45, -2.5], scale: 0.32, solid: true },
      { id: 'upper-pillar', source: 'environment', modelIndex: 10, position: [8.3, 5.55, 2.6], scale: 0.3, solid: true },
      { id: 'well-fuel', source: 'resource', modelIndex: 1, position: [-8.1, 0.56, 1.0], scale: 0.4, solid: true },
      { id: 'mid-torch', source: 'environment', modelIndex: 15, position: [3.45, 3.1, -3.6], scale: 0.3 },
    ],
  },
}
