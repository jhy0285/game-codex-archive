export type Language = 'ko' | 'en'

export type GameMode =
  | 'language-select'
  | 'title'
  | 'chapter-select'
  | 'playing'
  | 'paused'
  | 'chapter-complete'
  | 'ending'
  | 'error'

export type ActorKind = 'player' | 'echo'

export type Vector3 = {
  x: number
  y: number
  z: number
}

export type ReadonlyVector3 = Readonly<Vector3>

export const vector3 = (x = 0, y = 0, z = 0): Vector3 => ({ x, y, z })

export const cloneVector3 = (value: ReadonlyVector3): Vector3 => ({
  x: value.x,
  y: value.y,
  z: value.z,
})

export const ActionBits = {
  Jump: 1 << 0,
  Interact: 1 << 1,
  Attack: 1 << 2,
  Throw: 1 << 3,
  Dash: 1 << 4,
} as const

export type ActionBit = (typeof ActionBits)[keyof typeof ActionBits]

export type InputFrame = Readonly<{
  moveX: number
  moveZ: number
  aimYawQ: number
  heldMask: number
  pressedMask: number
}>

export const NEUTRAL_INPUT: InputFrame = Object.freeze({
  moveX: 0,
  moveZ: 0,
  aimYawQ: 0,
  heldMask: 0,
  pressedMask: 0,
})

export type ActorState = {
  id: ActorKind
  position: Vector3
  velocity: Vector3
  grounded: boolean
  facingYaw: number
  carryingId: string | null
  defeated: boolean
}

export type EchoRuntimeState = {
  mode: 'absent' | 'recording' | 'replaying' | 'holding'
  tick: number
  durationTicks: number
  pathSamples: number
}

export type PlateRuntimeState = {
  id: string
  pressed: boolean
  totalMass: number
  occupantIds: string[]
}

export type LeverRuntimeState = {
  id: string
  active: boolean
  latched: boolean
  heldBy: ActorKind | null
}

export type DoorRuntimeState = {
  id: string
  open: boolean
  progress: number
}

export type ElevatorRuntimeState = {
  id: string
  floor: number
  targetFloor: number
  positionY: number
  active: boolean
}

export type CoreRuntimeState = {
  id: string
  position: Vector3
  velocity: Vector3
  carriedBy: ActorKind | null
  socketId: string | null
  redirected: boolean
}

export type CrateRuntimeState = {
  id: string
  position: Vector3
  velocity: Vector3
  carriedBy: ActorKind | null
  mass: number
}

export type EnemyRuntimeState = {
  id: string
  position: Vector3
  velocity: Vector3
  mode: 'patrol' | 'investigate' | 'alert' | 'stunned' | 'defeated'
  sightTarget: ActorKind | null
  detection: number
  defeatedBy: 'trap' | 'pit' | 'guardian-seal' | null
}

export type PlatformRuntimeState = {
  id: string
  position: Vector3
  phaseTick: number
  active: boolean
}

export type BridgeRuntimeState = {
  id: string
  angle: number
  targetAngle: number
  locked: boolean
}

export type TrapRuntimeState = {
  id: string
  armed: boolean
  triggered: boolean
}
