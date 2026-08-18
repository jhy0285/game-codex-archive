import type { ActorKind, LeverRuntimeState } from './types'

export type PlateOccupantKind = ActorKind | 'cargo' | 'core'

export type PlateOccupant = Readonly<{
  id: string
  kind: PlateOccupantKind
  mass: number
  active?: boolean
}>

export type PressurePlateConfig = Readonly<{
  id: string
  accepts: 'actor' | 'cargo' | 'core' | 'any'
  requiredMass: number
}>

export type PressurePlateEvaluation = Readonly<{
  id: string
  pressed: boolean
  totalMass: number
  occupantIds: readonly string[]
  occupantKinds: readonly PlateOccupantKind[]
}>

const plateAccepts = (accepts: PressurePlateConfig['accepts'], kind: PlateOccupantKind) => {
  if (accepts === 'any') return true
  if (accepts === 'actor') return kind === 'player' || kind === 'echo'
  return accepts === kind
}

export const evaluatePressurePlate = (
  config: PressurePlateConfig,
  occupants: readonly PlateOccupant[],
): PressurePlateEvaluation => {
  const accepted = occupants
    .filter((occupant) => occupant.active !== false)
    .filter((occupant) => plateAccepts(config.accepts, occupant.kind))
    .sort((first, second) => first.id.localeCompare(second.id))
  const totalMass = accepted.reduce(
    (sum, occupant) => sum + Math.max(0, Number.isFinite(occupant.mass) ? occupant.mass : 0),
    0,
  )
  return {
    id: config.id,
    pressed: totalMass + Number.EPSILON >= Math.max(0, config.requiredMass),
    totalMass,
    occupantIds: accepted.map((occupant) => occupant.id),
    occupantKinds: accepted.map((occupant) => occupant.kind),
  }
}

export type LeverConfig = Readonly<{
  id: string
  mode: 'momentary' | 'toggle' | 'latch'
  allowedActors?: readonly ActorKind[]
}>

export type LeverInteractor = Readonly<{
  actor: ActorKind
  inRange: boolean
  interactHeld: boolean
  interactPressed: boolean
}>

const actorOrder = (actor: ActorKind) => actor === 'echo' ? 0 : 1

export const createLeverState = (id: string): LeverRuntimeState => ({
  id,
  active: false,
  latched: false,
  heldBy: null,
})

export const evaluateLever = (
  config: LeverConfig,
  previous: Readonly<LeverRuntimeState>,
  interactors: readonly LeverInteractor[],
): LeverRuntimeState => {
  const allowedActors = config.allowedActors ?? ['player', 'echo']
  const eligible = interactors
    .filter((interactor) => allowedActors.includes(interactor.actor))
    .filter((interactor) => interactor.inRange)
    .sort((first, second) => actorOrder(first.actor) - actorOrder(second.actor))

  if (config.mode === 'momentary') {
    const holder = eligible.find((interactor) => interactor.interactHeld)
    return {
      id: config.id,
      active: holder !== undefined,
      latched: false,
      heldBy: holder?.actor ?? null,
    }
  }

  const activator = eligible.find((interactor) => interactor.interactPressed)
  if (config.mode === 'toggle') {
    const active = activator ? !previous.active : previous.active
    return {
      id: config.id,
      active,
      latched: active,
      heldBy: null,
    }
  }

  const latched = previous.latched || activator !== undefined
  return {
    id: config.id,
    active: latched,
    latched,
    heldBy: null,
  }
}
