export const GAME_WIDTH = 960
export const GAME_HEIGHT = 600
export const FIXED_STEP_MS = 1000 / 60
export const LOOP_DURATION_MS = 24_000
export const PLAYER_RADIUS = 14
export const CRATE_RADIUS = 17
export const PLAYER_MAX_SPEED = 205
export const PLAYER_ACCELERATION = 1_650
export const PLAYER_DECELERATION = 2_250
export const DASH_SPEED = 520
export const DASH_DURATION_MS = 190
export const DASH_COOLDOWN_MS = 560

export const WORLD_BOUNDS = {
  left: 32,
  right: 928,
  top: 112,
  bottom: 532,
} as const

export const ACTION_INTERACT = 1
export const ACTION_PULSE = 2
export const ACTION_DASH = 4

export type Direction = 'up' | 'down' | 'left' | 'right'
export type ActorId = 'player' | 'echo'
export type CrateKind = 'cargo' | 'core'
export type PlateAccepts = 'actor' | 'cargo' | 'any'
export type LaserPhase = 'warning' | 'active' | 'recovery'

export type Point = {
  x: number
  y: number
}

export type Velocity = {
  vx: number
  vy: number
}

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type EchoFrame = Point & {
  t: number
  facing: Direction
  actionMask: number
  moving: boolean
}

export type PlateDefinition = Point & {
  id: string
  label: string
  accepts: PlateAccepts
}

export type CrateDefinition = Point & {
  id: string
  kind: CrateKind
}

export type ReceiverDefinition = Point & {
  id: string
  radius: number
}

export type GuardianDefinition = Point & {
  patrolAxis: 'x' | 'y'
  patrolDistance: number
  patrolPeriodMs: number
  rift: Point
}

export type LaserDefinition = {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  periodMs: number
  warningMs: number
  activeMs: number
  offsetMs: number
  disabledByPlate?: string
}

export type StageDefinition = {
  id: string
  chapter: string
  title: string
  subtitle: string
  objective: string
  hint: string
  start: Point
  exit: Point
  door: Rect
  plates: readonly PlateDefinition[]
  crates: readonly CrateDefinition[]
  receiver?: ReceiverDefinition
  launchPad?: Point
  guardian?: GuardianDefinition
  lasers: readonly LaserDefinition[]
  obstacles: readonly Rect[]
  persistentObjectives: readonly string[]
  requiredObjectives: readonly string[]
  tutorial: readonly string[]
}

export type CrateState = CrateDefinition & Velocity & {
  carriedBy: ActorId | null
  airborne: boolean
  active: boolean
}

export type GuardianStrike = {
  actor: ActorId
  direction: Direction
  timeMs: number
}

export type GuardianState = Point & {
  defeated: boolean
  firstStrike: GuardianStrike | null
  feedback: 'idle' | 'armed' | 'late' | 'same-actor' | 'wrong-side' | 'breached'
}

export type StageRuntime = {
  crates: CrateState[]
  guardian: GuardianState | null
  latches: string[]
  hazardTimeMs: number
}

export type PlateOccupant = ActorId | 'cargo' | 'core' | null

export type ObjectiveState = {
  id: string
  complete: boolean
}

export type StageEvaluation = {
  doorOpen: boolean
  objectives: ObjectiveState[]
}

const stage = (definition: StageDefinition) => definition

export const STAGES: readonly StageDefinition[] = [
  stage({
    id: 'first-cut',
    chapter: '01',
    title: 'FIRST CUT',
    subtitle: 'Teach the lock to remember you.',
    objective: 'Leave your echo on ALPHA, then cross the veil.',
    hint: 'Stand on ALPHA, press ECHO, then run to the mint exit.',
    start: { x: 145, y: 360 },
    exit: { x: 790, y: 340 },
    door: { x: 570, y: 170, width: 28, height: 300 },
    plates: [{ id: 'alpha', label: 'ALPHA', x: 300, y: 420, accepts: 'actor' }],
    crates: [],
    lasers: [],
    obstacles: [],
    persistentObjectives: [],
    requiredObjectives: ['alpha'],
    tutorial: [
      'MOVE · Reach the amber ALPHA glyph.',
      'ECHO · Bind this route while standing on ALPHA.',
      'COOPERATE · Your past self holds the veil open.',
    ],
  }),
  stage({
    id: 'dead-weight',
    chapter: '02',
    title: 'DEAD WEIGHT',
    subtitle: 'Evidence opens doors when memory holds the line.',
    objective: 'Echo on ALPHA. Carry the cargo onto CARGO.',
    hint: 'E picks up or drops the amber crate. A carried crate snaps to the plate.',
    start: { x: 118, y: 350 },
    exit: { x: 820, y: 320 },
    door: { x: 610, y: 170, width: 28, height: 300 },
    plates: [
      { id: 'alpha', label: 'ALPHA', x: 270, y: 210, accepts: 'actor' },
      { id: 'cargo', label: 'CARGO', x: 470, y: 430, accepts: 'cargo' },
    ],
    crates: [{ id: 'cargo-a', kind: 'cargo', x: 245, y: 430 }],
    lasers: [],
    obstacles: [{ x: 390, y: 145, width: 38, height: 175 }],
    persistentObjectives: [],
    requiredObjectives: ['alpha', 'cargo'],
    tutorial: [
      'USE · Tap E near cargo to carry it.',
      'PLACE · Drop cargo inside the amber CARGO ring.',
      'DIVIDE · Only the echo can hold ALPHA while you work.',
    ],
  }),
  stage({
    id: 'cross-signal',
    chapter: '03',
    title: 'CROSS SIGNAL',
    subtitle: 'A message can turn a corner if two moments touch it.',
    objective: 'Record a core throw. Pulse it sideways into RECEIVER.',
    hint: 'Carry the core to LAUNCH, face up, and PULSE to throw. On replay, intercept it.',
    start: { x: 112, y: 430 },
    exit: { x: 820, y: 330 },
    door: { x: 650, y: 165, width: 28, height: 305 },
    plates: [],
    crates: [{ id: 'core-a', kind: 'core', x: 245, y: 430 }],
    receiver: { id: 'receiver', x: 515, y: 220, radius: 38 },
    launchPad: { x: 315, y: 405 },
    lasers: [],
    obstacles: [{ x: 420, y: 330, width: 44, height: 145 }],
    persistentObjectives: ['receiver'],
    requiredObjectives: ['receiver'],
    tutorial: [
      'THROW · PULSE while carrying sends the core forward.',
      'PREVIEW · The dotted line shows its fair, fixed trajectory.',
      'REDIRECT · Pulse the flying core from the side during echo replay.',
    ],
  }),
  stage({
    id: 'sentinel-shift',
    chapter: '04',
    title: 'SENTINEL SHIFT',
    subtitle: 'One strike turns the shield. Two moments break it.',
    objective: 'Hit the sentinel from opposite sides with current + echo.',
    hint: 'Record a left-side pulse after a short wait. Bind, dash right, answer the echo.',
    start: { x: 118, y: 330 },
    exit: { x: 835, y: 330 },
    door: { x: 690, y: 165, width: 28, height: 305 },
    plates: [],
    crates: [],
    guardian: {
      x: 505,
      y: 330,
      patrolAxis: 'y',
      patrolDistance: 54,
      patrolPeriodMs: 4_000,
      rift: { x: 610, y: 330 },
    },
    lasers: [],
    obstacles: [
      { x: 355, y: 200, width: 34, height: 90 },
      { x: 355, y: 370, width: 34, height: 90 },
    ],
    persistentObjectives: ['guardian'],
    requiredObjectives: ['guardian'],
    tutorial: [
      'PULSE · J emits a directional knockback wave.',
      'SYNC · The shield stays exposed for 1.3 seconds.',
      'OPPOSE · Echo and current must strike from different sides.',
    ],
  }),
  stage({
    id: 'fracture-run',
    chapter: '05',
    title: 'FRACTURE RUN',
    subtitle: 'The beams never lie. Read, phase, move.',
    objective: 'Echo on BYPASS. Move cargo, dash the live beam, escape.',
    hint: 'Warning beams are violet; red is live. Shift/DASH grants a short safe phase.',
    start: { x: 115, y: 430 },
    exit: { x: 840, y: 240 },
    door: { x: 710, y: 155, width: 28, height: 320 },
    plates: [
      { id: 'alpha', label: 'BYPASS', x: 255, y: 195, accepts: 'actor' },
      { id: 'cargo', label: 'CARGO', x: 565, y: 430, accepts: 'cargo' },
    ],
    crates: [{ id: 'cargo-b', kind: 'cargo', x: 250, y: 430 }],
    lasers: [
      {
        id: 'laser-a',
        x1: 385,
        y1: 150,
        x2: 385,
        y2: 510,
        periodMs: 3_200,
        warningMs: 900,
        activeMs: 1_150,
        offsetMs: 0,
        disabledByPlate: 'alpha',
      },
      {
        id: 'laser-b',
        x1: 635,
        y1: 150,
        x2: 635,
        y2: 510,
        periodMs: 3_200,
        warningMs: 900,
        activeMs: 1_150,
        offsetMs: 1_050,
      },
    ],
    obstacles: [],
    persistentObjectives: [],
    requiredObjectives: ['alpha', 'cargo'],
    tutorial: [
      'READ · Violet warns. Red burns. Dark cyan recovers.',
      'DASH · Shift phases through one short danger window.',
      'EXECUTE · Echo disables the first beam while you move cargo.',
    ],
  }),
  stage({
    id: 'zero-hour',
    chapter: '06',
    title: 'ZERO HOUR',
    subtitle: 'Steal back every second they took from you.',
    objective: 'Latch CARGO, SIGNAL, and SENTINEL. Echo on ALPHA. Escape.',
    hint: 'Progress nodes persist between binds. Solve one clean breach at a time.',
    start: { x: 100, y: 430 },
    exit: { x: 875, y: 320 },
    door: { x: 815, y: 155, width: 28, height: 320 },
    plates: [
      { id: 'alpha', label: 'ALPHA', x: 205, y: 185, accepts: 'actor' },
      { id: 'cargo', label: 'CARGO', x: 390, y: 455, accepts: 'cargo' },
    ],
    crates: [
      { id: 'cargo-final', kind: 'cargo', x: 205, y: 455 },
      { id: 'core-final', kind: 'core', x: 305, y: 355 },
    ],
    receiver: { id: 'receiver', x: 565, y: 190, radius: 36 },
    launchPad: { x: 430, y: 355 },
    guardian: {
      x: 675,
      y: 355,
      patrolAxis: 'y',
      patrolDistance: 45,
      patrolPeriodMs: 3_600,
      rift: { x: 755, y: 355 },
    },
    lasers: [
      {
        id: 'laser-final',
        x1: 620,
        y1: 145,
        x2: 620,
        y2: 510,
        periodMs: 3_000,
        warningMs: 850,
        activeMs: 1_050,
        offsetMs: 500,
        disabledByPlate: 'alpha',
      },
    ],
    obstacles: [{ x: 470, y: 315, width: 42, height: 135 }],
    persistentObjectives: ['cargo', 'receiver', 'guardian'],
    requiredObjectives: ['cargo', 'receiver', 'guardian', 'alpha'],
    tutorial: [
      'BREACH · CARGO, SIGNAL, and SENTINEL nodes latch between binds.',
      'COMBINE · Carry, throw, redirect, sync-strike, then record ALPHA.',
      'ESCAPE · Phase the last beam while your echo holds the lock.',
    ],
  }),
] as const

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const approach = (value: number, target: number, amount: number) => {
  if (value < target) return Math.min(value + amount, target)
  if (value > target) return Math.max(value - amount, target)
  return target
}

export const directionVector = (direction: Direction): Point => {
  if (direction === 'up') return { x: 0, y: -1 }
  if (direction === 'down') return { x: 0, y: 1 }
  if (direction === 'left') return { x: -1, y: 0 }
  return { x: 1, y: 0 }
}

export const directionFromVector = (
  x: number,
  y: number,
  fallback: Direction,
): Direction => {
  if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) return fallback
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right'
  return y < 0 ? 'up' : 'down'
}

export const distanceSquared = (a: Point, b: Point) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export const pointInRadius = (point: Point, center: Point, radius: number) =>
  distanceSquared(point, center) <= radius * radius

export const fixedStepsForDelta = (
  accumulatorMs: number,
  deltaMs: number,
  stepMs = FIXED_STEP_MS,
) => {
  const safeDelta = clamp(deltaMs, 0, 250)
  const total = accumulatorMs + safeDelta
  const steps = Math.floor((total + 0.000001) / stepMs)
  return {
    steps,
    remainderMs: total - steps * stepMs,
  }
}

export const sampleEcho = (
  frames: readonly EchoFrame[],
  timeMs: number,
): EchoFrame | null => {
  if (frames.length === 0) return null
  if (timeMs <= frames[0].t) return { ...frames[0] }
  const last = frames[frames.length - 1]
  if (timeMs >= last.t) return { ...last, moving: false, actionMask: 0 }

  let low = 0
  let high = frames.length - 1
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2)
    if (frames[middle].t <= timeMs) low = middle
    else high = middle
  }

  const from = frames[low]
  const to = frames[high]
  const span = Math.max(1, to.t - from.t)
  const blend = clamp((timeMs - from.t) / span, 0, 1)
  return {
    t: timeMs,
    x: from.x + (to.x - from.x) * blend,
    y: from.y + (to.y - from.y) * blend,
    facing: blend < 0.5 ? from.facing : to.facing,
    actionMask: 0,
    moving: from.moving || to.moving,
  }
}

export const actionFramesBetween = (
  frames: readonly EchoFrame[],
  fromTimeMs: number,
  toTimeMs: number,
) => frames.filter((frame) => frame.t > fromTimeMs && frame.t <= toTimeMs && frame.actionMask !== 0)

const circleIntersectsRect = (point: Point, radius: number, rect: Rect) => {
  const closestX = clamp(point.x, rect.x, rect.x + rect.width)
  const closestY = clamp(point.y, rect.y, rect.y + rect.height)
  const dx = point.x - closestX
  const dy = point.y - closestY
  return dx * dx + dy * dy < radius * radius
}

export const resolveCircleMovement = (
  position: Point,
  velocity: Velocity,
  deltaSeconds: number,
  obstacles: readonly Rect[],
  radius = PLAYER_RADIUS,
): Point => {
  const bounds = WORLD_BOUNDS
  const next = { ...position }
  const proposedX = clamp(
    position.x + velocity.vx * deltaSeconds,
    bounds.left + radius,
    bounds.right - radius,
  )
  const xPoint = { x: proposedX, y: next.y }
  if (!obstacles.some((obstacle) => circleIntersectsRect(xPoint, radius, obstacle))) {
    next.x = proposedX
  }

  const proposedY = clamp(
    position.y + velocity.vy * deltaSeconds,
    bounds.top + radius,
    bounds.bottom - radius,
  )
  const yPoint = { x: next.x, y: proposedY }
  if (!obstacles.some((obstacle) => circleIntersectsRect(yPoint, radius, obstacle))) {
    next.y = proposedY
  }
  return next
}

export const createStageRuntime = (
  definition: StageDefinition,
  retainedLatches: readonly string[] = [],
): StageRuntime => {
  const allowed = new Set(definition.persistentObjectives)
  const latches = retainedLatches.filter((id) => allowed.has(id))
  return {
    crates: definition.crates.map((crate) => ({
      ...crate,
      vx: 0,
      vy: 0,
      carriedBy: null,
      airborne: false,
      active: true,
    })),
    guardian: definition.guardian
      ? {
          x: definition.guardian.x,
          y: definition.guardian.y,
          defeated: latches.includes('guardian'),
          firstStrike: null,
          feedback: latches.includes('guardian') ? 'breached' : 'idle',
        }
      : null,
    latches: [...latches],
    hazardTimeMs: 0,
  }
}

export const addLatch = (runtime: StageRuntime, id: string) => {
  if (!runtime.latches.includes(id)) runtime.latches.push(id)
}

export const getPlateOccupant = (
  plate: PlateDefinition,
  player: Point,
  echo: Point | null,
  crates: readonly CrateState[],
): PlateOccupant => {
  const radius = plate.accepts === 'cargo' ? 30 : 28
  if (plate.accepts !== 'cargo') {
    if (echo && pointInRadius(echo, plate, radius)) return 'echo'
    if (pointInRadius(player, plate, radius)) return 'player'
  }
  if (plate.accepts !== 'actor') {
    const crate = crates.find(
      (candidate) =>
        candidate.active &&
        candidate.carriedBy === null &&
        pointInRadius(candidate, plate, radius),
    )
    if (crate) return crate.kind
  }
  return null
}

export const evaluateStage = (
  definition: StageDefinition,
  occupants: Readonly<Record<string, PlateOccupant>>,
  latches: readonly string[],
): StageEvaluation => {
  const objectives = definition.requiredObjectives.map((id) => {
    if (id === 'alpha') {
      return { id, complete: occupants[id] === 'echo' }
    }
    if (id === 'cargo') {
      return {
        id,
        complete: occupants[id] === 'cargo' || latches.includes(id),
      }
    }
    return { id, complete: latches.includes(id) }
  })
  return {
    objectives,
    doorOpen: objectives.every((objective) => objective.complete),
  }
}

export const getLaserPhase = (
  laser: LaserDefinition,
  timeMs: number,
  disabled: boolean,
): LaserPhase => {
  if (disabled) return 'recovery'
  const cycle = ((timeMs + laser.offsetMs) % laser.periodMs + laser.periodMs) % laser.periodMs
  if (cycle < laser.warningMs) return 'warning'
  if (cycle < laser.warningMs + laser.activeMs) return 'active'
  return 'recovery'
}

export const distanceToSegmentSquared = (
  point: Point,
  start: Point,
  end: Point,
) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return distanceSquared(point, start)
  const projection = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    0,
    1,
  )
  return distanceSquared(point, {
    x: start.x + dx * projection,
    y: start.y + dy * projection,
  })
}

export const laserHitsPoint = (
  laser: LaserDefinition,
  point: Point,
  radius: number,
) =>
  distanceToSegmentSquared(
    point,
    { x: laser.x1, y: laser.y1 },
    { x: laser.x2, y: laser.y2 },
  ) <= (radius + 5) * (radius + 5)

export const guardianPositionAt = (
  guardian: GuardianDefinition,
  timeMs: number,
): Point => {
  const cycle = ((timeMs % guardian.patrolPeriodMs) + guardian.patrolPeriodMs) % guardian.patrolPeriodMs
  const phase = cycle / guardian.patrolPeriodMs
  const wave = Math.sin(phase * Math.PI * 2)
  return guardian.patrolAxis === 'x'
    ? { x: guardian.x + wave * guardian.patrolDistance, y: guardian.y }
    : { x: guardian.x, y: guardian.y + wave * guardian.patrolDistance }
}

const directionsOppose = (a: Direction, b: Direction) => {
  const first = directionVector(a)
  const second = directionVector(b)
  return first.x * second.x + first.y * second.y < -0.5
}

export const registerGuardianStrike = (
  guardian: GuardianState,
  strike: GuardianStrike,
  syncWindowMs = 1_300,
) => {
  if (guardian.defeated) return guardian.feedback
  const first = guardian.firstStrike
  if (!first) {
    guardian.firstStrike = { ...strike }
    guardian.feedback = 'armed'
    return guardian.feedback
  }

  const elapsed = strike.timeMs - first.timeMs
  if (elapsed > syncWindowMs || elapsed < 0) {
    guardian.firstStrike = { ...strike }
    guardian.feedback = 'late'
    return guardian.feedback
  }
  if (first.actor === strike.actor) {
    guardian.firstStrike = { ...strike }
    guardian.feedback = 'same-actor'
    return guardian.feedback
  }
  if (!directionsOppose(first.direction, strike.direction)) {
    guardian.firstStrike = { ...strike }
    guardian.feedback = 'wrong-side'
    return guardian.feedback
  }

  guardian.defeated = true
  guardian.firstStrike = null
  guardian.feedback = 'breached'
  return guardian.feedback
}

export const redirectVelocity = (
  direction: Direction,
  speed = 315,
): Velocity => {
  const vector = directionVector(direction)
  return { vx: vector.x * speed, vy: vector.y * speed }
}

export const stepFreeCrate = (
  crate: CrateState,
  deltaSeconds: number,
  obstacles: readonly Rect[],
) => {
  if (!crate.active || crate.carriedBy || (!crate.airborne && Math.hypot(crate.vx, crate.vy) < 1)) {
    return
  }
  const before = { x: crate.x, y: crate.y }
  const next = resolveCircleMovement(before, crate, deltaSeconds, obstacles, CRATE_RADIUS)
  if (Math.abs(next.x - before.x) < 0.01) crate.vx *= -0.28
  if (Math.abs(next.y - before.y) < 0.01) crate.vy *= -0.28
  crate.x = next.x
  crate.y = next.y
  const drag = crate.airborne ? 0.998 : 0.94
  crate.vx *= drag
  crate.vy *= drag
  if (Math.hypot(crate.vx, crate.vy) < 28) {
    crate.airborne = false
    crate.vx = 0
    crate.vy = 0
  }
}

export const copyEchoFrames = (frames: readonly EchoFrame[]) =>
  frames.map((frame) => ({ ...frame }))
