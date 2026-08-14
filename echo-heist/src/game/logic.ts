export const GAME_WIDTH = 960
export const GAME_HEIGHT = 600
export const LOOP_DURATION_MS = 20_000
export const PLAYER_RADIUS = 15
export const PLAYER_SPEED = 220

export const ROOM = {
  left: 36,
  right: 924,
  top: 126,
  bottom: 566,
} as const

export type Point = { x: number; y: number }

export type EchoFrame = Point & {
  time: number
  interacting: boolean
}

export type CircleZone = Point & {
  id: string
  label: string
  radius: number
}

export type Rectangle = {
  x: number
  y: number
  width: number
  height: number
}

export type DoorDefinition = {
  x: number
  width: number
  doorTop: number
  doorBottom: number
}

export type SectorDefinition = {
  id: string
  name: string
  subtitle: string
  spawn: Point
  goal: CircleZone
  switches: readonly CircleZone[]
  door: DoorDefinition
  relayRequiredMs: number
  obstacles: readonly Rectangle[]
}

export const SECTORS: readonly SectorDefinition[] = [
  {
    id: 'first-cut',
    name: 'SECTOR 01 // FIRST CUT',
    subtitle: 'Lock an echo on the pressure link.',
    spawn: { x: 145, y: 360 },
    goal: { id: 'exit', label: 'EXIT', x: 790, y: 340, radius: 55 },
    switches: [
      { id: 'alpha', label: 'ALPHA', x: 300, y: 420, radius: 30 },
    ],
    door: { x: 584, width: 22, doorTop: 248, doorBottom: 424 },
    relayRequiredMs: 0,
    obstacles: [],
  },
  {
    id: 'dual-signal',
    name: 'SECTOR 02 // DUAL SIGNAL',
    subtitle: 'Synchronize two bodies. Latch the vault.',
    spawn: { x: 135, y: 360 },
    goal: { id: 'vault', label: 'VAULT', x: 822, y: 340, radius: 52 },
    switches: [
      { id: 'alpha', label: 'ALPHA', x: 286, y: 316, radius: 29 },
      { id: 'beta', label: 'BETA', x: 432, y: 426, radius: 29 },
    ],
    door: { x: 638, width: 22, doorTop: 248, doorBottom: 424 },
    relayRequiredMs: 1_200,
    obstacles: [
      { x: 372, y: 150, width: 50, height: 96 },
      { x: 336, y: 474, width: 76, height: 68 },
    ],
  },
]

export type FreshRun = {
  loop: number
  elapsed: number
  player: Point
  recording: EchoFrame[]
  previous: EchoFrame[]
}

export type SwitchOccupancy = {
  id: string
  active: boolean
  player: boolean
  ghost: boolean
}

export type RelayState = {
  chargeMs: number
  latched: boolean
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export function createFreshRun(spawn: Point = SECTORS[0]!.spawn): FreshRun {
  return {
    loop: 1,
    elapsed: 0,
    player: { ...spawn },
    recording: [{ time: 0, x: spawn.x, y: spawn.y, interacting: false }],
    previous: [],
  }
}

export function isInsideCircle(
  point: Point,
  circle: { x: number; y: number; radius: number },
  allowance = 0,
) {
  const dx = point.x - circle.x
  const dy = point.y - circle.y
  const radius = circle.radius + allowance
  return dx * dx + dy * dy <= radius * radius
}

export function getSwitchOccupancy(
  switches: readonly CircleZone[],
  player: Point,
  ghost: Point | null,
): SwitchOccupancy[] {
  return switches.map((switchZone) => {
    const playerActive = isInsideCircle(player, switchZone, -5)
    const ghostActive = ghost
      ? isInsideCircle(ghost, switchZone, -5)
      : false
    return {
      id: switchZone.id,
      active: playerActive || ghostActive,
      player: playerActive,
      ghost: ghostActive,
    }
  })
}

export function updateRelayState(
  current: RelayState,
  delta: number,
  allSwitchesActive: boolean,
  requiredMs: number,
): RelayState {
  if (current.latched) return current
  if (requiredMs <= 0) {
    return { chargeMs: 0, latched: allSwitchesActive }
  }

  const chargeMs = allSwitchesActive
    ? Math.min(requiredMs, current.chargeMs + delta)
    : Math.max(0, current.chargeMs - delta * 0.65)
  return { chargeMs, latched: chargeMs >= requiredMs }
}

export function sampleEcho(
  frames: readonly EchoFrame[],
  time: number,
): EchoFrame | null {
  if (frames.length === 0) return null
  if (time <= frames[0]!.time) return { ...frames[0]! }

  const last = frames[frames.length - 1]!
  if (time >= last.time) return { ...last }

  let low = 0
  let high = frames.length - 1
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2)
    if (frames[middle]!.time <= time) low = middle
    else high = middle
  }

  const start = frames[low]!
  const end = frames[high]!
  const duration = Math.max(1, end.time - start.time)
  const progress = (time - start.time) / duration
  return {
    time,
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
    interacting: progress < 0.5 ? start.interacting : end.interacting,
  }
}

function collisionRectangles(
  sector: SectorDefinition,
  doorOpen: boolean,
): Rectangle[] {
  const { door } = sector
  const rectangles: Rectangle[] = [
    {
      x: door.x,
      y: ROOM.top,
      width: door.width,
      height: door.doorTop - ROOM.top,
    },
    {
      x: door.x,
      y: door.doorBottom,
      width: door.width,
      height: ROOM.bottom - door.doorBottom,
    },
    ...sector.obstacles,
  ]
  if (!doorOpen) {
    rectangles.push({
      x: door.x,
      y: door.doorTop,
      width: door.width,
      height: door.doorBottom - door.doorTop,
    })
  }
  return rectangles
}

export function resolvePlayerMovement(
  current: Point,
  movement: Point,
  doorOpen: boolean,
  sector: SectorDefinition = SECTORS[0]!,
): Point {
  const result = { ...current }
  const roomMinX = ROOM.left + PLAYER_RADIUS
  const roomMaxX = ROOM.right - PLAYER_RADIUS
  const roomMinY = ROOM.top + PLAYER_RADIUS
  const roomMaxY = ROOM.bottom - PLAYER_RADIUS
  const rectangles = collisionRectangles(sector, doorOpen)

  result.x = clamp(current.x + movement.x, roomMinX, roomMaxX)
  for (const rectangle of rectangles) {
    const withinVerticalSpan =
      current.y > rectangle.y - PLAYER_RADIUS &&
      current.y < rectangle.y + rectangle.height + PLAYER_RADIUS
    if (!withinVerticalSpan) continue

    const leftEdge = rectangle.x - PLAYER_RADIUS
    const rightEdge = rectangle.x + rectangle.width + PLAYER_RADIUS
    if (movement.x > 0 && current.x <= leftEdge && result.x > leftEdge) {
      result.x = leftEdge
    } else if (
      movement.x < 0 &&
      current.x >= rightEdge &&
      result.x < rightEdge
    ) {
      result.x = rightEdge
    }
  }

  result.y = clamp(current.y + movement.y, roomMinY, roomMaxY)
  for (const rectangle of rectangles) {
    const withinHorizontalSpan =
      result.x > rectangle.x - PLAYER_RADIUS &&
      result.x < rectangle.x + rectangle.width + PLAYER_RADIUS
    if (!withinHorizontalSpan) continue

    const topEdge = rectangle.y - PLAYER_RADIUS
    const bottomEdge = rectangle.y + rectangle.height + PLAYER_RADIUS
    if (movement.y > 0 && current.y <= topEdge && result.y > topEdge) {
      result.y = topEdge
    } else if (
      movement.y < 0 &&
      current.y >= bottomEdge &&
      result.y < bottomEdge
    ) {
      result.y = bottomEdge
    }
  }

  return result
}
