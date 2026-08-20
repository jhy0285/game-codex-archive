import * as THREE from 'three'
import type { AssetLibrary } from '../render/AssetLibrary'
import type { BodyRecord, PhysicsEntityKind, RapierWorld, Vec3 } from '../physics/RapierWorld'
import { RAPIER } from '../physics/RapierWorld'
import { CHAPTER_LAYOUTS, type StageNumber, type DeviceDefinition } from '../levels/layouts'
import { canSeeTarget, computeKnockback, evaluatePressurePlate, isWithinCatchVolume, redirectVelocity } from '../game'
import type { PlateOccupant } from '../game'

export type ActorKind = 'player' | 'echo'

export type ActorContext = {
  id: string
  kind: ActorKind
  position: THREE.Vector3
  facingYaw: number
  carryYaw?: number
  interactHeld: boolean
}

export type WorldAudioEvent =
  | { type: 'door'; id: string; open: boolean }
  | { type: 'plate'; id: string; pressed: boolean }
  | { type: 'mechanism'; id: string; mechanism: 'elevator' | 'platform' | 'bridge'; moving: boolean }
  | { type: 'receiver'; id: string }

type DeviceRecord = {
  definition: DeviceDefinition
  root: THREE.Object3D
  body?: BodyRecord
  basePosition: THREE.Vector3
  active: boolean
  actor: ActorKind | undefined
  holdUntilTick: number
  motionProgress: number
  delta: THREE.Vector3
  motionSoundActive: boolean
}

type DynamicRecord = {
  id: string
  body: BodyRecord
  mesh: THREE.Object3D
  carriedBy: ActorKind | undefined
  upperThrowArmed: boolean
  postCatchFlightArmed: boolean
  redirectedCurrentFlight: boolean
  carryPosition: THREE.Vector3
  carryTarget: THREE.Vector3
}

type EffectRecord = {
  object: THREE.Object3D
  ticks: number
  geometry: THREE.BufferGeometry
  material: THREE.Material
}

type PlatformSupport = {
  delta: THREE.Vector3
  supported: boolean
}

export type WorldDebugState = {
  facts: string[]
  pressurePlates: Record<string, { active: boolean; actor?: ActorKind }>
  levers: Record<string, { active: boolean; actor?: ActorKind }>
  doors: Record<string, { open: boolean }>
  elevators: Record<string, { y: number; active: boolean }>
  cores: Record<string, { position: Vec3; carriedBy?: ActorKind; receiver: boolean }>
  enemies: Record<string, { position: Vec3; state: string; target?: ActorKind; defeated: boolean; detection: number }>
  objectiveFacts: string[]
  complete: boolean
  escapeSeconds: number
}

type TransformSnapshot = {
  position: Vec3
  rotation: { x: number; y: number; z: number; w: number }
}

type DeviceSnapshot = TransformSnapshot & {
  active: boolean
  actor?: ActorKind
  holdRemaining: number
  motionProgress: number
}

type DynamicSnapshot = TransformSnapshot & {
  velocity: Vec3
  angularVelocity: Vec3
  kinematic: boolean
  upperThrowArmed: boolean
  postCatchFlightArmed: boolean
  redirectedCurrentFlight: boolean
  carriedBy?: ActorKind
}

export type DungeonWorldSnapshot = {
  facts: string[]
  devices: Record<string, DeviceSnapshot>
  dynamics: Record<string, DynamicSnapshot>
  receiverFilled: boolean
  enemyState: string
  enemyTarget?: ActorKind
  enemyDefeated: boolean
  enemyDirection: number
  enemyForward: Vec3
  enemyKnock: Vec3
  enemyDetection: number
  escapeTicks: number
  timelineTick: number
}

const positionOf = (point: readonly [number, number, number]): THREE.Vector3 => new THREE.Vector3(point[0], point[1], point[2])

const PLATE_OCCUPANT_KINDS: ReadonlySet<PhysicsEntityKind> = new Set(['player', 'echo', 'crate', 'core'])
const CORE_KIND: ReadonlySet<PhysicsEntityKind> = new Set(['core'])
const TRAP_OCCUPANT_KINDS: ReadonlySet<PhysicsEntityKind> = new Set(['player', 'echo', 'enemy'])
const ENEMY_RAY_EXCLUSIONS: ReadonlySet<string> = new Set(['watcher', 'guardian'])
const SOLID_SIGHT_KINDS: ReadonlySet<PhysicsEntityKind> = new Set(['wall', 'door'])
const WELL_MIN_THROW_DROP = 2.2
const WELL_THROW_UPWARD_SPEED = 3.4
const ATRIUM_THROW_SPEED = 5.05
const ATRIUM_THROW_UPWARD_SPEED = 0.7
const CORE_LOST_Y = -4
const TRAJECTORY_STEP_SECONDS = 0.075
const TRAJECTORY_MAX_POINTS = 22
const TRAJECTORY_GRAVITY_Y = -18
const INTERACTION_RADIUS = 2.15
const CARRY_FORWARD_DISTANCE = 1.16
const CARRY_HAND_OFFSET = 0.98
const CARRY_HEIGHT = 0.15
const CARRY_PHYSICS_FORWARD_DISTANCE = 0.86
const CARRY_PHYSICS_HEIGHT = 1.12
const CARRY_MINIMUM_FORWARD_GAP = 1.02
const CARRY_FOLLOW_RATE = 0.72

export const canActorRequestExit = (actor: ActorKind): boolean => actor === 'player'

const withOptionalActor = (active: boolean, actor: ActorKind | undefined): { active: boolean; actor?: ActorKind } =>
  actor ? { active, actor } : { active }

export class DungeonWorld {
  readonly chapter: StageNumber
  readonly start: THREE.Vector3
  readonly echoAnchor: THREE.Vector3
  readonly staticObstructions: THREE.Mesh[] = []
  readonly facts = new Set<string>()
  complete = false
  failed = false
  failureReason = ''
  escapeTicks = 0
  private readonly root = new THREE.Group()
  private readonly devices = new Map<string, DeviceRecord>()
  private readonly dynamics = new Map<string, DynamicRecord>()
  private readonly materials: THREE.Material[] = []
  private readonly geometries: THREE.BufferGeometry[] = []
  private readonly effects: EffectRecord[] = []
  private readonly audioEvents: WorldAudioEvent[] = []
  private readonly playerInteractionOutline = new THREE.BoxHelper(new THREE.Object3D(), 0xffd47a)
  private readonly echoInteractionOutline = new THREE.BoxHelper(new THREE.Object3D(), 0x8d62ff)
  private enemyState = 'patrol'
  private enemyTarget: ActorKind | undefined
  private enemyDefeated = false
  private enemyDirection = 1
  private readonly enemyForward = new THREE.Vector3(0, 0, 1)
  private enemyKnock = new THREE.Vector3()
  private enemyDetection = 0
  private receiverFilled = false
  private currentTick = 0
  private platformPhaseOffset = 0
  private exitRequestedBy: ActorKind | undefined

  constructor(
    private readonly scene: THREE.Scene,
    private readonly physics: RapierWorld,
    private readonly assets: AssetLibrary,
    chapter: StageNumber,
  ) {
    this.chapter = chapter
    const layout = CHAPTER_LAYOUTS[chapter]
    this.start = positionOf(layout.start)
    this.echoAnchor = positionOf(layout.echoAnchor)
    this.root.name = `Chapter${chapter}`
    this.configureInteractionOutline(this.playerInteractionOutline, 'PlayerInteractionOutline')
    this.configureInteractionOutline(this.echoInteractionOutline, 'EchoInteractionOutline')
    this.root.add(this.playerInteractionOutline, this.echoInteractionOutline)
    this.scene.add(this.root)
    this.build()
  }

  beforePhysics(tick: number, actors: readonly ActorContext[]): void {
    this.currentTick = tick
    this.updateHeldLevers(actors)
    this.updatePlatforms(tick, actors)
    this.updateCarriedObjects(actors)
    this.updateDoors()
    if (this.chapter === 5 && this.escapeTicks > 0) {
      this.escapeTicks -= 1
      if (this.escapeTicks === 0 && !this.complete) {
        this.failed = true
        this.failureReason = 'collapse'
      }
    }
  }

  afterPhysics(actors: readonly ActorContext[]): void {
    this.syncDynamics()
    this.updatePlates(actors)
    this.updateCoreReceiver(actors)
    this.updateEnemy(actors)
    this.updateTrapHazards()
    this.evaluateDerivedFacts(actors)
    this.updateCoreLoss()
    if (this.exitRequestedBy === 'player' && this.canExit()) this.complete = true
    this.exitRequestedBy = undefined
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index]
      if (!effect) continue
      effect.ticks -= 1
      effect.object.rotation.y += 0.012
      effect.object.scale.multiplyScalar(0.985)
      if (effect.ticks <= 0) {
        this.disposeEffect(effect)
        this.effects.splice(index, 1)
      }
    }
  }

  interact(actor: ActorContext): string | undefined {
    // Carry가 있으면 E는 항상 drop 우선 (가까운 디바이스와 무관)
    const carried = [...this.dynamics.values()].find((entry) => entry.carriedBy === actor.kind)
    if (carried) {
      this.dropCarried(carried)
      return carried.body.tag.kind
    }
    const candidate = this.nearestDevice(actor.position, INTERACTION_RADIUS)
    if (!candidate) return undefined
    const { definition } = candidate
    if (definition.kind === 'lever') {
      candidate.active = true
      candidate.actor = actor.kind
      candidate.holdUntilTick = this.currentTick + 24
      this.facts.add(`${definition.id}:${actor.kind}`)
      if (definition.id === 'tutorial-lever') this.facts.add('tutorial-lever')
      if (definition.id === 'lure-bell' && actor.kind === 'echo') {
        this.facts.add('lured-by-echo')
        this.enemyTarget = 'echo'
        this.enemyState = 'lured'
      }
      return definition.kind
    }
    if (definition.kind === 'crate' || definition.kind === 'core') {
      this.toggleCarry(actor, definition.id)
      return definition.kind
    }
    if (definition.kind === 'receiver') {
      const carried = [...this.dynamics.values()].find((entry) => entry.carriedBy === actor.kind && entry.body.tag.kind === 'core')
      return carried && this.fillReceiver(carried) ? definition.kind : undefined
    }
    if (definition.kind === 'exit') {
      if (!canActorRequestExit(actor.kind)) return undefined
      this.exitRequestedBy = actor.kind
      return 'exit'
    }
    return undefined
  }

  throwOrDrop(actor: ActorContext, direction: THREE.Vector3): string | undefined {
    const carried = [...this.dynamics.values()].find((entry) => entry.carriedBy === actor.kind)
    if (!carried) return undefined
    carried.carriedBy = undefined
    carried.body.tag.carried = false
    carried.body.collider.setSensor(false)
    carried.body.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
    const origin = actor.position.clone().add(new THREE.Vector3(0, 1.15, 0)).addScaledVector(direction, 0.72)
    carried.body.body.setTranslation(origin, true)
    const isCore = carried.body.tag.kind === 'core'
    const coreThrowSpeed = this.chapter === 3 ? ATRIUM_THROW_SPEED : 7.2
    const impulse = direction.clone().normalize().multiplyScalar(isCore ? coreThrowSpeed : 3.8)
    impulse.y = isCore
      ? this.chapter === 3 ? ATRIUM_THROW_UPWARD_SPEED : this.chapter === 5 ? WELL_THROW_UPWARD_SPEED : 5.8
      : 2.4
    carried.body.body.setLinvel(impulse, true)
    if (this.chapter === 3 && isCore) {
      carried.redirectedCurrentFlight = false
      if (actor.kind === 'echo') {
        carried.postCatchFlightArmed = false
        this.facts.add('core-thrown-by-echo')
      }
    }
    if (this.chapter === 5 && isCore) {
      const receiver = this.devices.get('power-receiver')
      carried.upperThrowArmed = Boolean(receiver && origin.y - receiver.root.position.y >= WELL_MIN_THROW_DROP)
      if (carried.upperThrowArmed) this.facts.add('core-thrown-down')
    }
    return carried.body.tag.kind
  }

  attack(actor: ActorContext, direction: THREE.Vector3): string | undefined {
    const core = [...this.dynamics.values()].find((entry) =>
      entry.body.tag.kind === 'core'
      && !entry.carriedBy
      && !this.receiverFilled
      && (this.chapter !== 3 || !entry.redirectedCurrentFlight)
      && entry.body.body.bodyType() === RAPIER.RigidBodyType.Dynamic)
    if (core) {
      const p = core.body.body.translation()
      const corePosition = new THREE.Vector3(p.x, p.y, p.z)
      if (corePosition.distanceTo(actor.position) < 2.15) {
        const redirectedState = redirectVelocity(core.body.body.linvel(), this.vec(direction), 8.2)
        const redirected = new THREE.Vector3(redirectedState.x, Math.max(2.8, redirectedState.y * 0.45 + 2.6), redirectedState.z)
        core.body.body.setLinvel(redirected, true)
        core.redirectedCurrentFlight = true
        this.facts.add('core-redirected')
        this.spawnWave(corePosition, 0xc15bf2)
        return 'core'
      }
    }
    const enemy = this.devices.get(this.chapter === 5 ? 'guardian' : 'watcher')
    if (enemy && !this.enemyDefeated && enemy.root.position.distanceTo(actor.position) < 2.6) {
      if (this.chapter === 5) {
        const heightAdvantage = actor.position.y - enemy.root.position.y
        if (actor.kind === 'player' && this.enemyTarget === 'echo' && heightAdvantage > 1.3) {
          this.enemyDefeated = true
          this.enemyState = 'sealed'
          this.facts.add('guardian-defeated')
          this.spawnWave(enemy.root.position, 0x8e6dff)
          return 'guardian'
        }
        this.failureReason = 'guardian-shield'
        return 'shield'
      }
      const result = computeKnockback({
        position: this.vec(actor.position), forward: this.vec(direction), range: 2.6, halfAngleRadians: Math.PI * 0.62,
        baseStrength: 0.19, upwardStrength: 0, heightAdvantageThreshold: 1.3, heightAdvantageMultiplier: 1.65,
      }, { position: this.vec(enemy.root.position), mass: 1, radius: 0.55 })
      if (!result.hit) return undefined
      this.enemyKnock.set(result.impulse.x, 0, result.impulse.z)
      this.enemyState = 'knocked'
      this.spawnWave(enemy.root.position, 0xe95757)
      return 'watcher'
    }
    return undefined
  }

  nearestInteractable(position: THREE.Vector3): { id: string; kind: DeviceDefinition['kind']; distance: number } | undefined {
    const candidate = this.nearestDevice(position, INTERACTION_RADIUS)
    return candidate ? { id: candidate.definition.id, kind: candidate.definition.kind, distance: candidate.root.position.distanceTo(position) } : undefined
  }

  highlightInteractable(position: THREE.Vector3): void {
    this.highlightInteractables(position)
  }

  highlightInteractables(playerPosition: THREE.Vector3, echoPosition?: THREE.Vector3): void {
    this.updateInteractionOutline(this.playerInteractionOutline, playerPosition)
    if (echoPosition) this.updateInteractionOutline(this.echoInteractionOutline, echoPosition)
    else this.echoInteractionOutline.visible = false
  }

  carriedBy(actor: ActorKind): 'crate' | 'core' | undefined {
    const dynamic = [...this.dynamics.values()].find((entry) => entry.carriedBy === actor)
    return dynamic?.body.tag.kind === 'crate' || dynamic?.body.tag.kind === 'core' ? dynamic.body.tag.kind : undefined
  }

  isCarrying(actor: ActorKind, kind: 'crate' | 'core'): boolean {
    for (const entry of this.dynamics.values()) {
      if (entry.carriedBy === actor && entry.body.tag.kind === kind) return true
    }
    return false
  }

  takeAudioEvents(): WorldAudioEvent[] {
    return this.audioEvents.splice(0)
  }

  writeTrajectory(
    actor: ActorContext,
    direction: THREE.Vector3,
    positions: Float32Array,
    distances: Float32Array,
  ): number {
    const capacity = Math.min(TRAJECTORY_MAX_POINTS, Math.floor(positions.length / 3), distances.length)
    if (capacity <= 0) return 0
    const horizontalLength = Math.hypot(direction.x, direction.z)
    const directionX = horizontalLength > 0.000001 ? direction.x / horizontalLength : 0
    const directionZ = horizontalLength > 0.000001 ? direction.z / horizontalLength : 1
    const originX = actor.position.x + directionX * 0.72
    const originY = actor.position.y + 1.2
    const originZ = actor.position.z + directionZ * 0.72
    const upwardSpeed = this.chapter === 3 ? ATRIUM_THROW_UPWARD_SPEED : this.chapter === 5 ? WELL_THROW_UPWARD_SPEED : 5.8
    const horizontalSpeed = this.chapter === 3 ? ATRIUM_THROW_SPEED : 7.2
    const velocityX = directionX * horizontalSpeed
    const velocityZ = directionZ * horizontalSpeed
    let previousX = originX
    let previousY = originY
    let previousZ = originZ
    let cumulativeDistance = 0
    for (let index = 0; index < capacity; index += 1) {
      const time = index * TRAJECTORY_STEP_SECONDS
      const x = originX + velocityX * time
      const y = originY + upwardSpeed * time + TRAJECTORY_GRAVITY_Y * time * time * 0.5
      const z = originZ + velocityZ * time
      const offset = index * 3
      positions[offset] = x
      positions[offset + 1] = y
      positions[offset + 2] = z
      if (index > 0) cumulativeDistance += Math.hypot(x - previousX, y - previousY, z - previousZ)
      distances[index] = cumulativeDistance
      previousX = x
      previousY = y
      previousZ = z
    }
    return capacity
  }

  debugState(): WorldDebugState {
    const pressurePlates: WorldDebugState['pressurePlates'] = {}
    const levers: WorldDebugState['levers'] = {}
    const doors: WorldDebugState['doors'] = {}
    const elevators: WorldDebugState['elevators'] = {}
    const cores: WorldDebugState['cores'] = {}
    const enemies: WorldDebugState['enemies'] = {}
    for (const [id, device] of this.devices) {
      if (device.definition.kind === 'plate') pressurePlates[id] = withOptionalActor(device.active, device.actor)
      if (device.definition.kind === 'lever') levers[id] = withOptionalActor(device.active, device.actor)
      if (device.definition.kind === 'door') doors[id] = { open: device.active }
      if (device.definition.kind === 'elevator' || device.definition.kind === 'platform') {
        elevators[id] = { y: Number(device.root.position.y.toFixed(3)), active: device.active }
      }
      if (device.definition.kind === 'enemy') {
        const target = this.enemyTarget
        enemies[id] = target
          ? { position: this.vec(device.root.position), state: this.enemyState, target, defeated: this.enemyDefeated, detection: Number(this.enemyDetection.toFixed(3)) }
          : { position: this.vec(device.root.position), state: this.enemyState, defeated: this.enemyDefeated, detection: Number(this.enemyDetection.toFixed(3)) }
      }
    }
    for (const [id, dynamic] of this.dynamics) {
      if (dynamic.body.tag.kind !== 'core') continue
      const p = dynamic.body.body.translation()
      cores[id] = dynamic.carriedBy
        ? { position: { x: p.x, y: p.y, z: p.z }, carriedBy: dynamic.carriedBy, receiver: this.receiverFilled }
        : { position: { x: p.x, y: p.y, z: p.z }, receiver: this.receiverFilled }
    }
    return {
      facts: [...this.facts].sort(), pressurePlates, levers, doors, elevators, cores, enemies,
      objectiveFacts: this.requiredFacts(), complete: this.complete, escapeSeconds: Number((this.escapeTicks / 60).toFixed(1)),
    }
  }

  performDebugSolutionStep(step: number, player: ActorContext, echo: ActorContext | undefined): void {
    const required = this.requiredFacts()
    if (step < required.length) {
      const fact = required[step]
      if (fact) {
        this.facts.add(fact)
        this.applyDebugDeviceFact(fact)
      }
    }
    if (this.chapter === 1 && step === 0) this.facts.add('tutorial-lever')
    if (this.chapter === 5 && this.facts.has('dual-seal') && this.escapeTicks === 0) this.escapeTicks = 35 * 60
    if (step >= required.length) {
      const exit = this.devices.get('exit')
      if (exit) player.position.copy(exit.root.position)
      this.exitRequestedBy = 'player'
      this.complete = this.canExit()
    }
    if (echo && this.chapter > 0) void echo
  }

  resetFailure(): void {
    this.failed = false
    this.failureReason = ''
  }

  supportMotion(position: THREE.Vector3): PlatformSupport {
    for (const device of this.devices.values()) {
      if (!device.body || (device.definition.kind !== 'elevator' && device.definition.kind !== 'platform')) continue
      const size = device.definition.size ?? [0.55, 0.55, 0.55]
      const actorBottom = position.y - 0.79
      const platformTop = device.root.position.y + size[1]
      if (
        Math.abs(position.x - device.root.position.x) <= size[0] + 0.32 &&
        Math.abs(position.z - device.root.position.z) <= size[2] + 0.32 &&
        Math.abs(actorBottom - platformTop) <= 0.42
      ) return { delta: device.delta.clone(), supported: device.body.tag.nonBlocking === true }
    }
    return { delta: new THREE.Vector3(), supported: false }
  }

  captureSnapshot(): DungeonWorldSnapshot {
    const devices: Record<string, DeviceSnapshot> = {}
    const dynamics: Record<string, DynamicSnapshot> = {}
    for (const [id, device] of this.devices) {
      const base = {
        position: this.vec(device.root.position),
        rotation: {
          x: device.root.quaternion.x,
          y: device.root.quaternion.y,
          z: device.root.quaternion.z,
          w: device.root.quaternion.w,
        },
        active: device.active,
        holdRemaining: Math.max(0, device.holdUntilTick - this.currentTick),
        motionProgress: device.motionProgress,
      }
      devices[id] = device.actor ? { ...base, actor: device.actor } : base
    }
    for (const [id, dynamic] of this.dynamics) {
      const position = dynamic.body.body.translation()
      const rotation = dynamic.body.body.rotation()
      const velocity = dynamic.body.body.linvel()
      const angularVelocity = dynamic.body.body.angvel()
      const base = {
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
        velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
        angularVelocity: { x: angularVelocity.x, y: angularVelocity.y, z: angularVelocity.z },
        kinematic: dynamic.body.body.bodyType() === RAPIER.RigidBodyType.KinematicPositionBased,
        upperThrowArmed: dynamic.upperThrowArmed,
        postCatchFlightArmed: dynamic.postCatchFlightArmed,
        redirectedCurrentFlight: dynamic.redirectedCurrentFlight,
      }
      dynamics[id] = dynamic.carriedBy ? { ...base, carriedBy: dynamic.carriedBy } : base
    }
    const base = {
      facts: [...this.facts].sort(),
      devices,
      dynamics,
      receiverFilled: this.receiverFilled,
      enemyState: this.enemyState,
      enemyDefeated: this.enemyDefeated,
      enemyDirection: this.enemyDirection,
      enemyForward: this.vec(this.enemyForward),
      enemyKnock: this.vec(this.enemyKnock),
      enemyDetection: this.enemyDetection,
      escapeTicks: this.escapeTicks,
      timelineTick: this.currentTick + this.platformPhaseOffset,
    }
    return this.enemyTarget ? { ...base, enemyTarget: this.enemyTarget } : base
  }

  restoreSnapshot(snapshot: DungeonWorldSnapshot, transferPlayerStateToEcho: boolean): void {
    const remapActor = (actor: ActorKind | undefined): ActorKind | undefined =>
      transferPlayerStateToEcho && actor === 'player' ? 'echo' : actor

    this.facts.clear()
    for (const fact of snapshot.facts) this.facts.add(fact)
    this.receiverFilled = snapshot.receiverFilled
    this.enemyState = snapshot.enemyState
    this.enemyTarget = remapActor(snapshot.enemyTarget)
    this.enemyDefeated = snapshot.enemyDefeated
    this.enemyDirection = snapshot.enemyDirection
    this.enemyForward.set(snapshot.enemyForward.x, snapshot.enemyForward.y, snapshot.enemyForward.z)
    this.enemyKnock.set(snapshot.enemyKnock.x, snapshot.enemyKnock.y, snapshot.enemyKnock.z)
    this.enemyDetection = snapshot.enemyDetection
    this.escapeTicks = snapshot.escapeTicks
    this.platformPhaseOffset = snapshot.timelineTick
    this.complete = false
    this.failed = false
    this.failureReason = ''
    this.exitRequestedBy = undefined
    this.currentTick = 0

    for (const [id, saved] of Object.entries(snapshot.devices)) {
      const device = this.devices.get(id)
      if (!device) continue
      device.active = saved.active
      device.actor = remapActor(saved.actor)
      device.holdUntilTick = saved.holdRemaining
      device.motionProgress = saved.motionProgress
      device.root.position.set(saved.position.x, saved.position.y, saved.position.z)
      device.root.quaternion.set(saved.rotation.x, saved.rotation.y, saved.rotation.z, saved.rotation.w)
      if (device.body && device.body.body.bodyType() !== RAPIER.RigidBodyType.Fixed) {
        const movingSurface = device.definition.kind === 'elevator'
          || device.definition.kind === 'platform'
          || device.definition.kind === 'bridge'
        if (movingSurface) {
          const nonBlocking = this.chapter === 2 && device.definition.kind === 'elevator' && saved.motionProgress > 0
          device.body.tag.nonBlocking = nonBlocking
          device.body.collider.setSensor(nonBlocking)
        }
        device.body.body.setTranslation(saved.position, true)
        device.body.body.setNextKinematicTranslation(saved.position)
        device.body.body.setRotation(saved.rotation, true)
        device.body.body.setNextKinematicRotation(saved.rotation)
      }
    }

    for (const [id, saved] of Object.entries(snapshot.dynamics)) {
      const dynamic = this.dynamics.get(id)
      if (!dynamic) continue
      dynamic.carriedBy = remapActor(saved.carriedBy)
      dynamic.body.tag.carried = Boolean(dynamic.carriedBy)
      dynamic.body.collider.setSensor(Boolean(dynamic.carriedBy))
      dynamic.upperThrowArmed = saved.upperThrowArmed
      dynamic.postCatchFlightArmed = saved.postCatchFlightArmed
      dynamic.redirectedCurrentFlight = saved.redirectedCurrentFlight
      const kinematic = Boolean(dynamic.carriedBy) || saved.kinematic
      dynamic.body.body.setBodyType(
        kinematic ? RAPIER.RigidBodyType.KinematicPositionBased : RAPIER.RigidBodyType.Dynamic,
        true,
      )
      dynamic.body.body.setTranslation(saved.position, true)
      dynamic.body.body.setRotation(saved.rotation, true)
      dynamic.body.body.setLinvel(saved.velocity, true)
      dynamic.body.body.setAngvel(saved.angularVelocity, true)
      if (kinematic) {
        dynamic.body.body.setNextKinematicTranslation(saved.position)
        dynamic.body.body.setNextKinematicRotation(saved.rotation)
      }
      dynamic.mesh.position.set(saved.position.x, saved.position.y, saved.position.z)
      dynamic.mesh.quaternion.set(saved.rotation.x, saved.rotation.y, saved.rotation.z, saved.rotation.w)
      dynamic.carryPosition.set(saved.position.x, saved.position.y, saved.position.z)
      dynamic.carryTarget.copy(dynamic.carryPosition)
    }
  }

  releaseActor(actor: ActorKind): void {
    for (const dynamic of this.dynamics.values()) {
      if (dynamic.carriedBy !== actor) continue
      dynamic.carriedBy = undefined
      dynamic.body.tag.carried = false
      dynamic.body.collider.setSensor(false)
      dynamic.body.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
      dynamic.body.body.setLinvel({ x: 0, y: 0.2, z: 0 }, true)
      dynamic.body.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
    for (const device of this.devices.values()) {
      if (device.actor !== actor) continue
      device.actor = undefined
      if (device.definition.id !== 'tutorial-lever') device.active = false
      device.holdUntilTick = 0
    }
    if (this.enemyTarget === actor) {
      this.enemyTarget = undefined
      if (!this.enemyDefeated) this.enemyState = 'patrol'
      this.enemyDetection = 0
    }
  }

  dispose(): void {
    for (const effect of this.effects) this.disposeEffect(effect)
    this.effects.length = 0
    this.scene.remove(this.root)
    this.playerInteractionOutline.geometry.dispose()
    this.playerInteractionOutline.material.dispose()
    this.echoInteractionOutline.geometry.dispose()
    this.echoInteractionOutline.material.dispose()
    for (const geometry of this.geometries) geometry.dispose()
    for (const material of this.materials) material.dispose()
    this.devices.clear()
    this.dynamics.clear()
  }

  private build(): void {
    const layout = CHAPTER_LAYOUTS[this.chapter]
    const stone = this.material(0x2b3440, 0.84, 0.12)
    const trim = this.material(0x5f5962, 0.72, 0.22)
    const wood = this.material(0x473a35, 0.9, 0.02)
    for (const box of layout.boxes) {
      const material = box.tone === 'trim' ? trim : box.tone === 'wood' ? wood : stone
      const mesh = this.boxMesh(box.size, material)
      mesh.name = box.id
      mesh.position.set(...box.position)
      if (box.rotation) mesh.rotation.set(...box.rotation)
      this.root.add(mesh)
      this.physics.createStaticBox(box.id, box.wall ? 'wall' : 'floor', this.vec(mesh.position), {
        x: box.size[0], y: box.size[1], z: box.size[2],
      }, false, { x: mesh.quaternion.x, y: mesh.quaternion.y, z: mesh.quaternion.z, w: mesh.quaternion.w })
      if (box.wall) this.staticObstructions.push(mesh)
      this.addEdgeGlow(mesh, layout.accent)
    }

    const columnGeometry = this.geometry(new THREE.CylinderGeometry(0.42, 0.56, 3.6, 8))
    const columnMaterial = this.material(0x34323b, 0.86, 0.18)
    for (const [index, point] of layout.pillars.entries()) {
      const mesh = new THREE.Mesh(columnGeometry, columnMaterial)
      mesh.name = `pillar-${index}`
      mesh.position.set(point[0], point[1] + 1.3, point[2])
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.root.add(mesh)
      this.addPillarDetails(mesh, layout.accent)
      this.physics.createStaticBox(mesh.name, 'wall', this.vec(mesh.position), { x: 0.48, y: 1.8, z: 0.48 })
      this.staticObstructions.push(mesh)
    }

    for (const definition of layout.devices) this.buildDevice(definition, layout.accent)
    this.addDecor(layout.accent)
  }

  private buildDevice(definition: DeviceDefinition, accent: number): void {
    const position = positionOf(definition.position)
    const size = definition.size ?? [0.55, 0.55, 0.55]
    const glow = this.material(accent, 0.42, 0.42, accent)
    let root: THREE.Object3D
    let body: BodyRecord | undefined
    if (definition.kind === 'plate') {
      root = new THREE.Group()
      const scannerWidth = Math.max(1.05, size[0] * 1.5)
      const scannerDepth = Math.max(1.05, size[2] * 1.5)
      const deck = this.boxMesh([scannerWidth / 2, 0.06, scannerDepth / 2], this.material(0x27333b, 0.7, 0.45))
      deck.name = 'SecurityScannerDeck'
      deck.position.y = 0.06
      const scannerFrame = this.boxMesh([scannerWidth * 0.42, 0.045, scannerDepth * 0.42], this.material(0x63747b, 0.56, 0.66))
      scannerFrame.name = 'SecurityScannerFrame'
      scannerFrame.position.y = 0.165
      const panel = this.boxMesh([scannerWidth * 0.29, 0.032, scannerDepth * 0.28], glow.clone())
      panel.name = 'SecurityScannerPanel'
      panel.position.y = 0.27

      const railGeometry = this.geometry(new THREE.BoxGeometry(0.12, 0.12, scannerDepth * 0.72))
      const rails = new THREE.InstancedMesh(railGeometry, this.material(0x1b242b, 0.64, 0.5), 2)
      rails.name = 'SecurityScannerRails'
      const railMatrix = new THREE.Matrix4()
      for (const side of [-1, 1]) {
        railMatrix.makeTranslation(side * scannerWidth * 0.42, 0.21, 0)
        rails.setMatrixAt(side === -1 ? 0 : 1, railMatrix)
      }
      rails.instanceMatrix.needsUpdate = true

      const beaconGeometry = this.geometry(new THREE.BoxGeometry(0.14, 0.42, 0.14))
      const beacons = new THREE.InstancedMesh(beaconGeometry, this.material(accent, 0.3, 0.7, accent).clone(), 4)
      beacons.name = 'SecurityScannerBeacons'
      const beaconMatrix = new THREE.Matrix4()
      let beaconIndex = 0
      for (const xSide of [-1, 1]) {
        for (const zSide of [-1, 1]) {
          beaconMatrix.makeTranslation(xSide * scannerWidth * 0.42, 0.4, zSide * scannerDepth * 0.38)
          beacons.setMatrixAt(beaconIndex, beaconMatrix)
          beaconIndex += 1
        }
      }
      beacons.instanceMatrix.needsUpdate = true
      root.add(deck, scannerFrame, panel, rails, beacons)
      body = this.physics.createSensor(definition.id, 'plate', this.vec(position), { x: size[0], y: 0.18, z: size[2] })
    } else if (definition.kind === 'lever') {
      root = new THREE.Group()
      const base = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.46, 0.56, 0.18, 8)), this.material(0x18242d, 0.62, 0.58))
      base.name = 'ControlConsoleBase'
      base.position.y = 0.09
      const housing = this.boxMesh([0.3, 0.3, 0.25], this.material(0x2d3a44, 0.6, 0.6))
      housing.name = 'ControlConsoleHousing'
      housing.position.y = 0.46
      const screen = this.boxMesh([0.22, 0.1, 0.024], this.material(accent, 0.28, 0.52, accent))
      screen.name = 'ControlConsoleScreen'
      screen.position.set(0, 0.62, 0.276)
      screen.rotation.x = -0.18
      const pivot = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.15, 0.19, 0.22, 10)), this.material(0x5a6871, 0.45, 0.78))
      pivot.name = 'LeverPivot'
      pivot.position.y = 0.81
      const handle = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.075, 0.075, 0.78, 10)), glow)
      handle.name = 'LeverHandle'
      handle.position.y = 1.02
      handle.rotation.z = -0.42
      const grip = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(0.14, 12, 8)), this.material(accent, 0.24, 0.62, accent))
      grip.name = 'LeverGrip'
      grip.position.y = 0.38
      handle.add(grip)
      const indicator = this.boxMesh([0.07, 0.07, 0.07], this.material(accent, 0.2, 0.65, accent))
      indicator.name = 'ControlConsoleIndicator'
      indicator.position.set(0, 0.9, 0.27)
      root.add(base, housing, screen, pivot, handle, indicator)
      body = this.physics.createSensor(definition.id, 'lever', this.vec(position), { x: 0.7, y: 0.8, z: 0.7 })
    } else if (definition.kind === 'door') {
      root = new THREE.Group()
      const doorCore = this.boxMesh(size, this.material(0x1d2c36, 0.52, 0.68))
      doorCore.name = 'VaultDoorCore'
      const doorFace = this.boxMesh([0.055, size[1] * 0.74, size[2] * 0.72], this.material(0x3b4b55, 0.54, 0.72))
      doorFace.name = 'VaultDoorFace'
      doorFace.position.x = size[0] + 0.065
      const railGeometry = this.geometry(new THREE.BoxGeometry(size[0] * 2.3, size[1] * 1.62, 0.14))
      const rails = new THREE.InstancedMesh(railGeometry, this.material(0x111a21, 0.6, 0.72), 2)
      rails.name = 'VaultDoorRails'
      const railMatrix = new THREE.Matrix4()
      for (const [index, side] of [-1, 1].entries()) {
        railMatrix.makeTranslation(0, 0, side * size[2] * 0.84)
        rails.setMatrixAt(index, railMatrix)
      }
      rails.instanceMatrix.needsUpdate = true
      const stripeGeometry = this.geometry(new THREE.BoxGeometry(0.14, 0.07, size[2] * 1.24))
      const stripes = new THREE.InstancedMesh(stripeGeometry, this.material(accent, 0.26, 0.65, accent), 3)
      stripes.name = 'VaultDoorStatusStripes'
      const stripeMatrix = new THREE.Matrix4()
      for (const [index, height] of [-size[1] * 0.45, 0, size[1] * 0.45].entries()) {
        stripeMatrix.makeTranslation(size[0] + 0.12, height, 0)
        stripes.setMatrixAt(index, stripeMatrix)
      }
      stripes.instanceMatrix.needsUpdate = true
      root.add(doorCore, doorFace, rails, stripes)
      body = this.physics.createKinematicBox(definition.id, 'door', this.vec(position), { x: size[0], y: size[1], z: size[2] })
    } else if (definition.kind === 'elevator' || definition.kind === 'platform' || definition.kind === 'bridge') {
      root = new THREE.Group()
      const deck = this.boxMesh(size, this.material(0x293944, 0.58, 0.66))
      deck.name = 'IndustrialPlatformDeck'
      const deckInset = this.boxMesh([size[0] * 0.84, 0.035, size[2] * 0.84], this.material(0x52636b, 0.48, 0.7))
      deckInset.name = 'IndustrialPlatformInset'
      deckInset.position.y = size[1] + 0.045
      const railGeometry = this.geometry(new THREE.BoxGeometry(size[0] * 1.62, 0.065, 0.085))
      const rails = new THREE.InstancedMesh(railGeometry, this.material(0x162027, 0.58, 0.72), 2)
      rails.name = 'IndustrialPlatformRails'
      const railMatrix = new THREE.Matrix4()
      for (const [index, side] of [-1, 1].entries()) {
        railMatrix.makeTranslation(0, size[1] + 0.11, side * size[2] * 0.8)
        rails.setMatrixAt(index, railMatrix)
      }
      rails.instanceMatrix.needsUpdate = true
      const beaconGeometry = this.geometry(new THREE.BoxGeometry(0.12, 0.15, 0.12))
      const beacons = new THREE.InstancedMesh(beaconGeometry, this.material(accent, 0.26, 0.7, accent), 4)
      beacons.name = 'IndustrialPlatformBeacons'
      const beaconMatrix = new THREE.Matrix4()
      let beaconIndex = 0
      for (const xSide of [-1, 1]) {
        for (const zSide of [-1, 1]) {
          beaconMatrix.makeTranslation(xSide * size[0] * 0.8, size[1] + 0.16, zSide * size[2] * 0.8)
          beacons.setMatrixAt(beaconIndex, beaconMatrix)
          beaconIndex += 1
        }
      }
      beacons.instanceMatrix.needsUpdate = true
      root.add(deck, deckInset, rails, beacons)
      body = this.physics.createKinematicBox(definition.id, definition.kind === 'bridge' ? 'platform' : definition.kind, this.vec(position), {
        x: size[0], y: size[1], z: size[2],
      })
    } else if (definition.kind === 'crate') {
      root = new THREE.Group()
      const shell = this.boxMesh(size, this.material(0x6e5439, 0.68, 0.28))
      shell.name = 'CargoShell'
      const braceGeometry = this.geometry(new THREE.BoxGeometry(0.11, size[1] * 1.86, 0.11))
      const braces = new THREE.InstancedMesh(braceGeometry, this.material(0x1e2b31, 0.5, 0.8), 4)
      braces.name = 'CargoCornerBraces'
      const braceMatrix = new THREE.Matrix4()
      let braceIndex = 0
      for (const xSide of [-1, 1]) {
        for (const zSide of [-1, 1]) {
          braceMatrix.makeTranslation(xSide * size[0] * 0.82, 0, zSide * size[2] * 0.82)
          braces.setMatrixAt(braceIndex, braceMatrix)
          braceIndex += 1
        }
      }
      braces.instanceMatrix.needsUpdate = true
      const bandGeometry = this.geometry(new THREE.BoxGeometry(size[0] * 1.92, 0.08, size[2] * 2.08))
      const bands = new THREE.InstancedMesh(bandGeometry, this.material(0xd0954d, 0.42, 0.58, accent), 2)
      bands.name = 'CargoBands'
      const bandMatrix = new THREE.Matrix4()
      for (const [index, height] of [-size[1] * 0.44, size[1] * 0.44].entries()) {
        bandMatrix.makeTranslation(0, height, 0)
        bands.setMatrixAt(index, bandMatrix)
      }
      bands.instanceMatrix.needsUpdate = true
      const seal = this.boxMesh([size[0] * 0.3, size[1] * 0.17, 0.028], this.material(accent, 0.25, 0.66, accent))
      seal.name = 'CargoSeal'
      seal.position.set(0, 0, size[2] + 0.04)
      root.add(shell, braces, bands, seal)
      body = this.physics.createDynamicBox(definition.id, 'crate', this.vec(position), { x: size[0], y: size[1], z: size[2] }, 1.5)
    } else if (definition.kind === 'core') {
      root = new THREE.Group()
      const crystal = new THREE.Mesh(this.geometry(new THREE.IcosahedronGeometry(0.36, 2)), glow)
      crystal.name = 'CoreCrystal'
      const equator = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.47, 0.038, 8, 20)), this.material(accent, 0.25, 0.72, accent))
      equator.name = 'CoreEquator'
      equator.rotation.x = Math.PI / 2
      const halo = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.43, 0.03, 8, 20)), this.material(0xd6e7ed, 0.32, 0.8, accent))
      halo.name = 'CoreHalo'
      halo.rotation.y = Math.PI / 2
      root.add(crystal, equator, halo)
      body = this.physics.createDynamicBall(definition.id, this.vec(position), 0.38)
      const light = new THREE.PointLight(accent, 2.8, 5.5)
      light.name = 'CoreLight'
      root.add(light)
    } else if (definition.kind === 'trap') {
      root = new THREE.Group()
      const housing = this.boxMesh([size[0] * 0.82, 0.08, size[2] * 0.82], this.material(0x251d25, 0.64, 0.62))
      housing.name = 'TrapHousing'
      housing.position.y = 0.08
      const warningGeometry = this.geometry(new THREE.BoxGeometry(size[0] * 1.5, 0.045, 0.11))
      const warnings = new THREE.InstancedMesh(warningGeometry, this.material(0xe95757, 0.28, 0.55, 0xe95757), 2)
      warnings.name = 'TrapWarningRails'
      const warningMatrix = new THREE.Matrix4()
      for (const [index, side] of [-1, 1].entries()) {
        warningMatrix.makeTranslation(0, 0.2, side * size[2] * 0.7)
        warnings.setMatrixAt(index, warningMatrix)
      }
      warnings.instanceMatrix.needsUpdate = true
      const spikeGeometry = this.geometry(new THREE.ConeGeometry(0.13, 0.8, 5))
      const spikeMaterial = this.material(0x6c2730, 0.5, 0.62)
      const spikes = new THREE.InstancedMesh(spikeGeometry, spikeMaterial, 8)
      spikes.name = 'TrapSpikes'
      const spikeMatrix = new THREE.Matrix4()
      for (let i = 0; i < 8; i += 1) {
        spikeMatrix.makeTranslation((i % 4 - 1.5) * 0.48, 0.53, (Math.floor(i / 4) - 0.5) * 0.7)
        spikes.setMatrixAt(i, spikeMatrix)
      }
      spikes.instanceMatrix.needsUpdate = true
      root.add(housing, warnings, spikes)
      body = this.physics.createSensor(definition.id, 'trap', this.vec(position), { x: size[0], y: 0.65, z: size[2] })
    } else if (definition.kind === 'exit') {
      root = new THREE.Group()
      const plinth = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.88, 1.02, 0.18, 10)), this.material(0x17232b, 0.55, 0.7))
      plinth.name = 'ExitPlinth'
      plinth.position.y = 0.09
      const arch = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.76, 0.09, 10, 32)), glow)
      arch.name = 'ExitTransitArch'
      arch.position.y = 0.98
      const beam = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.28, 0.56, 2.1, 18, 1, true)), this.material(accent, 0.5, 0.18, accent, 0.22))
      beam.name = 'ExitBeam'
      beam.position.y = 0.96
      const beaconGeometry = this.geometry(new THREE.BoxGeometry(0.14, 0.48, 0.14))
      const beacons = new THREE.InstancedMesh(beaconGeometry, this.material(accent, 0.25, 0.72, accent), 2)
      beacons.name = 'ExitBeacons'
      const beaconMatrix = new THREE.Matrix4()
      beaconMatrix.makeTranslation(-0.7, 0.37, 0)
      beacons.setMatrixAt(0, beaconMatrix)
      beaconMatrix.makeTranslation(0.7, 0.37, 0)
      beacons.setMatrixAt(1, beaconMatrix)
      beacons.instanceMatrix.needsUpdate = true
      root.add(plinth, arch, beam, beacons)
      body = this.physics.createSensor(definition.id, 'exit', this.vec(position), { x: 0.9, y: 1.4, z: 0.9 })
    } else if (definition.kind === 'receiver') {
      root = new THREE.Group()
      const cradle = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.72, 0.9, 0.18, 10)), this.material(0x1b2631, 0.56, 0.68))
      cradle.name = 'ReceiverCradle'
      cradle.position.y = 0.09
      const ring = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.58, 0.075, 10, 28)), glow)
      ring.name = 'ReceiverRing'
      ring.rotation.x = Math.PI / 2
      ring.position.y = 0.24
      const prongGeometry = this.geometry(new THREE.BoxGeometry(0.12, 0.52, 0.12))
      const prongs = new THREE.InstancedMesh(prongGeometry, this.material(accent, 0.28, 0.68, accent), 3)
      prongs.name = 'ReceiverProngs'
      const prongMatrix = new THREE.Matrix4()
      for (const [index, angle] of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].entries()) {
        prongMatrix.makeTranslation(Math.sin(angle) * 0.54, 0.44, Math.cos(angle) * 0.54)
        prongs.setMatrixAt(index, prongMatrix)
      }
      prongs.instanceMatrix.needsUpdate = true
      const beam = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.16, 0.34, 1.1, 16, 1, true)), this.material(accent, 0.48, 0.2, accent, 0.18))
      beam.name = 'ReceiverBeam'
      beam.position.y = 0.62
      root.add(cradle, ring, prongs, beam)
      body = this.physics.createSensor(definition.id, 'plate', this.vec(position), { x: 0.9, y: 1.4, z: 0.9 })
    } else {
      root = new THREE.Group()
      const base = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(this.chapter === 5 ? 0.7 : 0.52, this.chapter === 5 ? 0.8 : 0.62, 0.22, 10)), this.material(0x221c29, 0.54, 0.65))
      base.name = 'SentryBase'
      base.position.y = 0.15
      const shell = new THREE.Mesh(this.geometry(new THREE.DodecahedronGeometry(this.chapter === 5 ? 0.78 : 0.56, 1)), this.material(0x5f2635, 0.58, 0.32, accent))
      shell.name = 'SentryShell'
      shell.position.y = 0.63
      const eye = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(0.12, 12, 8)), glow)
      eye.name = 'SentryEye'
      eye.position.set(0, 0.72, this.chapter === 5 ? 0.72 : 0.53)
      const ring = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(this.chapter === 5 ? 0.82 : 0.6, 0.035, 8, 20)), this.material(accent, 0.28, 0.7, accent))
      ring.name = 'SentryHalo'
      ring.rotation.x = Math.PI / 2
      ring.position.y = 0.65
      const finGeometry = this.geometry(new THREE.BoxGeometry(0.11, 0.36, 0.3))
      const fins = new THREE.InstancedMesh(finGeometry, this.material(0x25323b, 0.5, 0.72), 2)
      fins.name = 'SentryFins'
      const finMatrix = new THREE.Matrix4()
      finMatrix.makeTranslation(-0.62, 0.62, 0)
      fins.setMatrixAt(0, finMatrix)
      finMatrix.makeTranslation(0.62, 0.62, 0)
      fins.setMatrixAt(1, finMatrix)
      fins.instanceMatrix.needsUpdate = true
      root.add(base, shell, eye, ring, fins)
      body = this.physics.createKinematicBox(definition.id, 'enemy', this.vec(position), { x: size[0], y: size[1], z: size[2] })
      const cone = new THREE.Mesh(
        this.geometry(new THREE.ConeGeometry(2.6, 5.5, 24, 1, true, -Math.PI / 4, Math.PI / 2)),
        this.material(0xe95757, 0.5, 0, 0xe95757, 0.13),
      )
      cone.name = 'SightCone'
      cone.rotation.x = Math.PI / 2
      cone.rotation.z = -Math.PI / 2
      cone.position.set(0, 0.35, 2.2)
      root.add(cone)
    }
    root.name = definition.id
    root.position.copy(position)
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
    this.root.add(root)
    const record: DeviceRecord = {
      definition,
      root,
      basePosition: position.clone(),
      active: false,
      actor: undefined,
      holdUntilTick: 0,
      motionProgress: 0,
      delta: new THREE.Vector3(),
      motionSoundActive: false,
    }
    if (body) record.body = body
    this.devices.set(definition.id, record)
    if (body && (definition.kind === 'crate' || definition.kind === 'core')) {
      this.dynamics.set(definition.id, {
      id: definition.id,
      body,
      mesh: root,
      carriedBy: undefined,
      upperThrowArmed: false,
      postCatchFlightArmed: false,
      redirectedCurrentFlight: false,
      carryPosition: position.clone(),
      carryTarget: position.clone(),
      })
    }
  }

  private addPillarDetails(column: THREE.Mesh, accent: number): void {
    const base = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.56, 0.66, 0.16, 8)), this.material(0x19242c, 0.64, 0.68))
    base.name = 'PillarFooting'
    base.position.y = -1.65
    const crown = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.5, 0.58, 0.16, 8)), this.material(0x25323b, 0.58, 0.7))
    crown.name = 'PillarCrown'
    crown.position.y = 1.62
    const bandGeometry = this.geometry(new THREE.CylinderGeometry(0.49, 0.49, 0.075, 8))
    const bands = new THREE.InstancedMesh(bandGeometry, this.material(accent, 0.28, 0.68, accent), 3)
    bands.name = 'PillarSignalBands'
    const bandMatrix = new THREE.Matrix4()
    for (const [index, height] of [-0.82, 0, 0.82].entries()) {
      bandMatrix.makeTranslation(0, height, 0)
      bands.setMatrixAt(index, bandMatrix)
    }
    bands.instanceMatrix.needsUpdate = true
    column.add(base, crown, bands)
    column.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }

  private addDecor(accent: number): void {
    const layout = CHAPTER_LAYOUTS[this.chapter]
    const environment = this.assets.environmentModels()
    const resources = this.assets.resourceModels()
    for (const definition of layout.decor) {
      const models = definition.source === 'environment' ? environment : resources
      const model = models[definition.modelIndex]
      if (!model) continue
      model.name = `${definition.source === 'environment' ? 'EnvironmentDecor' : 'ResourceDecor'}-${definition.id}`
      model.position.set(...definition.position)
      model.rotation.y = definition.rotationY ?? 0
      model.scale.setScalar(definition.scale ?? 1)
      this.root.add(model)
      if (definition.solid) this.addDecorCollider(definition.id, model)
    }
    const moteGeometry = this.geometry(new THREE.BufferGeometry())
    const positions = new Float32Array(180 * 3)
    for (let i = 0; i < 180; i += 1) {
      positions[i * 3] = ((i * 47) % 211) / 10 - 10.5
      positions[i * 3 + 1] = ((i * 83) % 77) / 10 + 0.3
      positions[i * 3 + 2] = ((i * 29) % 97) / 10 - 4.8
    }
    moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const motes = new THREE.Points(moteGeometry, this.material(accent, 0.5, 0, accent, 0.33, true))
    motes.name = 'TemporalMotes'
    this.root.add(motes)
  }

  private addDecorCollider(id: string, model: THREE.Object3D): void {
    model.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(model)
    if (bounds.isEmpty()) return
    const size = bounds.getSize(new THREE.Vector3())
    if (size.x < 0.08 || size.y < 0.08 || size.z < 0.08) return
    const center = bounds.getCenter(new THREE.Vector3())
    this.physics.createStaticBox(`decor-${id}`, 'wall', this.vec(center), {
      x: size.x / 2,
      y: size.y / 2,
      z: size.z / 2,
    })
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) this.staticObstructions.push(object)
    })
  }

  private updateHeldLevers(actors: readonly ActorContext[]): void {
    for (const device of this.devices.values()) {
      if (device.definition.kind !== 'lever') continue
      const actor = actors.find((candidate) => candidate.kind === device.actor)
      const remainsHeld = actor && actor.interactHeld && actor.position.distanceTo(device.root.position) < 2.1
      const latched = device.definition.id === 'tutorial-lever'
      device.active = Boolean(latched && this.facts.has('tutorial-lever')) || Boolean(remainsHeld) || this.currentTick <= device.holdUntilTick
      const handle = device.root.getObjectByName('LeverHandle')
      if (handle instanceof THREE.Mesh) {
        handle.rotation.z = THREE.MathUtils.lerp(handle.rotation.z, device.active ? 0.52 : -0.42, 0.18)
      }
      this.setEmissiveIntensity(handle, device.active ? 2.35 : 0.8)
      this.setEmissiveIntensity(device.root.getObjectByName('ControlConsoleScreen'), device.active ? 1.55 : 0.54)
      this.setEmissiveIntensity(device.root.getObjectByName('ControlConsoleIndicator'), device.active ? 2.1 : 0.48)
    }
  }

  private updatePlatforms(tick: number, actors: readonly ActorContext[]): void {
    const phaseTick = tick + this.platformPhaseOffset
    for (const device of this.devices.values()) {
      const { definition } = device
      if (!definition.to || !device.body) continue
      let amount = 0
      if (definition.kind === 'elevator') {
        const powered = this.chapter === 2
          ? this.devices.get('lift-lever')?.active === true
          : this.facts.has('core-receiver')
        device.active = powered
        const canAscend = powered && (this.chapter !== 2 || device.motionProgress > 0 || this.playerBoardedPlatform(device, actors))
        device.motionProgress = THREE.MathUtils.clamp(device.motionProgress + (canAscend ? 0.008 : -0.008), 0, 1)
        amount = device.motionProgress
      } else if (definition.kind === 'platform') {
        device.active = this.facts.has('core-receiver')
        amount = device.active ? (Math.sin(phaseTick * 0.018 - Math.PI / 2) + 1) / 2 : 0
      }
      const target = positionOf(definition.to)
      const next = device.basePosition.clone().lerp(target, amount)
      device.delta.copy(next).sub(device.root.position)
      device.root.position.copy(next)
      const nonBlocking = this.chapter === 2 && definition.kind === 'elevator' && device.motionProgress > 0
      device.body.tag.nonBlocking = nonBlocking
      device.body.collider.setSensor(nonBlocking)
      if (device.body.body.bodyType() !== RAPIER.RigidBodyType.KinematicPositionBased) {
        device.body.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true)
        device.body.body.setTranslation(this.vec(next), true)
      }
      device.body.body.setNextKinematicTranslation(this.vec(next))
      this.updatePlatformPresentation(device)
      const mechanism = definition.kind === 'elevator' ? 'elevator' : 'platform'
      this.updateMotionSound(device, mechanism, device.delta.lengthSq() > 0.000001)
    }
    const bridge = this.devices.get('rotating-bridge')
    if (bridge?.body) {
      bridge.active = this.devices.get('bridge-lever')?.active === true
      const targetAngle = bridge.active ? 0 : Math.PI / 2
      const previousAngle = bridge.root.rotation.y
      bridge.root.rotation.y = THREE.MathUtils.lerp(bridge.root.rotation.y, targetAngle, 0.08)
      bridge.body.tag.nonBlocking = bridge.active
      bridge.body.collider.setSensor(bridge.active)
      bridge.body.body.setNextKinematicRotation({ x: 0, y: Math.sin(bridge.root.rotation.y / 2), z: 0, w: Math.cos(bridge.root.rotation.y / 2) })
      this.updatePlatformPresentation(bridge)
      this.updateMotionSound(bridge, 'bridge', Math.abs(bridge.root.rotation.y - previousAngle) > 0.0001)
    }
  }

  private playerBoardedPlatform(device: DeviceRecord, actors: readonly ActorContext[]): boolean {
    const player = actors.find((actor) => actor.kind === 'player')
    if (!player) return false
    const size = device.definition.size ?? [0.55, 0.55, 0.55]
    const platformTop = device.root.position.y + size[1]
    return Math.abs(player.position.x - device.root.position.x) <= size[0] + 0.24
      && Math.abs(player.position.z - device.root.position.z) <= size[2] + 0.24
      && player.position.y >= platformTop - 0.25
      && player.position.y <= platformTop + 1.2
  }

  private updateCarriedObjects(actors: readonly ActorContext[]): void {
    for (const dynamic of this.dynamics.values()) {
      if (!dynamic.carriedBy) continue
      const actor = actors.find((candidate) => candidate.kind === dynamic.carriedBy)
      if (!actor) continue
      this.placeCarriedObject(dynamic, actor, false)
    }
  }

  private updateDoors(): void {
    const open = this.doorCondition()
    for (const device of this.devices.values()) {
      if (device.definition.kind !== 'door' || !device.body) continue
      const wasOpen = device.active
      device.active = open
      if (wasOpen !== open) this.emitAudio({ type: 'door', id: device.definition.id, open })
      const targetY = device.basePosition.y + (open ? 4.8 : 0)
      device.root.position.y = THREE.MathUtils.lerp(device.root.position.y, targetY, 0.1)
      device.body.body.setNextKinematicTranslation({ x: device.basePosition.x, y: device.root.position.y, z: device.basePosition.z })
      this.setEmissiveIntensity(device.root.getObjectByName('VaultDoorStatusStripes'), open ? 1.8 : 0.35)
    }
  }

  private updatePlates(actors: readonly ActorContext[]): void {
    for (const device of this.devices.values()) {
      if (device.definition.kind !== 'plate' || !device.body) continue
      const intersections = this.physics.intersections(device.body.collider, PLATE_OCCUPANT_KINDS)
      const overlappingIds = new Set(intersections.map((record) => record.tag.id))
      const nearbyActors = actors.filter((candidate) => overlappingIds.has(candidate.id))
      const occupants: PlateOccupant[] = nearbyActors.map((candidate) => ({ id: candidate.id, kind: candidate.kind, mass: 1, active: true }))
      for (const record of intersections) {
        const dynamic = this.dynamics.get(record.tag.id)
        if (!dynamic || dynamic.carriedBy) continue
        occupants.push({ id: dynamic.id, kind: dynamic.body.tag.kind === 'crate' ? 'cargo' : 'core', mass: dynamic.body.tag.kind === 'crate' ? 1.5 : 0.8, active: true })
      }
      const cargoPlate = device.definition.id === 'weight-plate'
      const evaluation = evaluatePressurePlate({ id: device.definition.id, accepts: cargoPlate ? 'any' : 'actor', requiredMass: cargoPlate ? 0.6 : 1 }, occupants)
      const actor = nearbyActors.find((candidate) => candidate.kind === 'echo') ?? nearbyActors[0]
      const cargo = evaluation.occupantKinds.includes('cargo')
      const wasPressed = device.active
      device.active = evaluation.pressed
      if (wasPressed !== device.active) this.emitAudio({ type: 'plate', id: device.definition.id, pressed: device.active })
      device.actor = actor?.kind
      this.updatePlatePresentation(device)
      // echo-plate fact: tracks the device state (pressed/unpressed), not the specific actor.
      // PLATE_OCCUPANT_KINDS already includes player/echo/crate/core so any of them can satisfy it.
      if (device.definition.id === 'echo-plate') {
        if (device.active) this.facts.add('echo-plate')
        else this.facts.delete('echo-plate')
      }
      if (device.definition.id === 'weight-plate' && cargo) this.facts.add('cargo-plate')
      if (device.definition.id === 'lower-seal' && actor?.kind === 'echo') this.facts.add('lower-seal-echo')
    }
  }

  private updatePlatePresentation(device: DeviceRecord): void {
    const panel = device.root.getObjectByName('SecurityScannerPanel')
    const beacons = device.root.getObjectByName('SecurityScannerBeacons')
    // Two states: inactive (dim/dark) vs active (bright/illuminated chapter accent)
    const targetScale = device.active ? 0.42 : 1
    // Inactive: very dark navy (nearly black). Active: bright white-cyan (clearly different from any chapter accent).
    const activeColor = 0xeaffff
    const inactiveColor = 0x141820
    const targetColor = device.active ? activeColor : inactiveColor
    if (panel instanceof THREE.Mesh) {
      panel.scale.y = THREE.MathUtils.lerp(panel.scale.y, targetScale, 0.24)
      if (panel.material instanceof THREE.MeshStandardMaterial) {
        const currentColor = panel.material.color.getHex()
        const nextColor = Math.round(currentColor + ((targetColor - currentColor) * 0.18))
        panel.material.color.setHex(nextColor)
        panel.material.emissive.setHex(device.active ? activeColor : 0x000000)
        panel.material.emissiveIntensity = THREE.MathUtils.lerp(
          panel.material.emissiveIntensity,
          device.active ? 2.1 : 0.35,
          0.24,
        )
      }
    }
    if (beacons instanceof THREE.InstancedMesh && beacons.material instanceof THREE.MeshStandardMaterial) {
      const currentColor = beacons.material.color.getHex()
      const nextColor = Math.round(currentColor + ((targetColor - currentColor) * 0.18))
      beacons.material.color.setHex(nextColor)
      beacons.material.emissive.setHex(device.active ? activeColor : 0x000000)
      beacons.material.emissiveIntensity = THREE.MathUtils.lerp(
        beacons.material.emissiveIntensity,
        device.active ? 1.85 : 0.3,
        0.24,
      )
    }
  }

  private updateCoreReceiver(actors: readonly ActorContext[]): void {
    const receiver = this.devices.get(this.chapter === 5 ? 'power-receiver' : 'core-receiver')
    if (!receiver?.body || this.receiverFilled) return
    const core = [...this.dynamics.values()].find((entry) => entry.body.tag.kind === 'core')
    if (!core) return
    const p = core.body.body.translation()
    const corePosition = new THREE.Vector3(p.x, p.y, p.z)
    const coreInsideReceiver = this.physics
      .intersections(receiver.body.collider, CORE_KIND)
      .some((record) => record.tag.id === core.id)
    if (coreInsideReceiver && this.fillReceiver(core)) return
    if (!core.carriedBy) {
      const player = actors.find((actor) => actor.kind === 'player')
      if (player && isWithinCatchVolume(this.vec(player.position), this.vec(corePosition)) && player.interactHeld) {
        this.toggleCarry(player, core.id)
        this.facts.add('core-caught')
      }
    }
  }

  private updateCoreLoss(): void {
    if (this.failed || this.receiverFilled || (this.chapter !== 3 && this.chapter !== 5)) return
    for (const dynamic of this.dynamics.values()) {
      if (dynamic.body.tag.kind !== 'core' || dynamic.carriedBy) continue
      if (dynamic.body.body.translation().y >= CORE_LOST_Y) continue
      dynamic.body.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      this.failed = true
      this.failureReason = 'core-lost'
      return
    }
  }

  private updateEnemy(actors: readonly ActorContext[]): void {
    const id = this.chapter === 5 ? 'guardian' : 'watcher'
    const enemy = this.devices.get(id)
    if (!enemy?.body || this.enemyDefeated) {
      if (enemy && this.enemyDefeated) enemy.root.rotation.z = THREE.MathUtils.lerp(enemy.root.rotation.z, Math.PI / 2, 0.08)
      return
    }
    const echo = actors.find((actor) => actor.kind === 'echo')
    const player = actors.find((actor) => actor.kind === 'player')
    const seesEcho = echo ? this.hasLineOfSight(enemy.root.position, echo.position) : false
    const seesPlayer = player ? this.hasLineOfSight(enemy.root.position, player.position) : false
    if (this.chapter === 4 && this.facts.has('lured-by-echo')) {
      this.enemyTarget = 'echo'
      this.enemyState = 'lured'
      this.enemyDetection = Math.max(0, this.enemyDetection - 0.035)
    } else if (echo && seesEcho) {
      this.enemyTarget = 'echo'
      this.enemyState = 'lured'
      this.facts.add(this.chapter === 5 ? 'guardian-target-echo' : 'lured-by-echo')
      this.enemyDetection = Math.max(0, this.enemyDetection - 0.035)
    } else if (player && seesPlayer) {
      this.enemyTarget = 'player'
      this.enemyState = 'alert'
      if (this.chapter === 4) {
        this.enemyDetection = Math.min(1, this.enemyDetection + 1 / 90)
        if (this.enemyDetection >= 1) {
          this.failed = true
          this.failureReason = 'seen'
        }
      }
    } else {
      this.enemyDetection = Math.max(0, this.enemyDetection - 1 / 120)
      if (this.enemyTarget === 'player') {
        this.enemyTarget = undefined
        this.enemyState = 'patrol'
      }
    }
    if (this.enemyKnock.lengthSq() > 0.0001) {
      this.faceEnemy(enemy, this.enemyKnock)
      this.moveEnemy(enemy, this.enemyKnock)
      this.enemyKnock.multiplyScalar(0.92)
    } else if (this.enemyTarget) {
      if (this.chapter !== 4) {
        const target = actors.find((actor) => actor.kind === this.enemyTarget)
        if (target) {
          const direction = target.position.clone().sub(enemy.root.position).setY(0)
          const distance = direction.length()
          if (distance > 0.35) {
            this.faceEnemy(enemy, direction)
            this.moveEnemy(enemy, direction.normalize().multiplyScalar(this.chapter === 5 ? 0.018 : 0.028))
          }
          if (this.chapter === 5 && this.enemyTarget === 'player' && distance < 1.2) {
            this.failed = true
            this.failureReason = 'guardian'
          }
        }
      }
    } else if (enemy.definition.to) {
      const a = enemy.basePosition
      const b = positionOf(enemy.definition.to)
      const target = this.enemyDirection > 0 ? b : a
      const direction = target.clone().sub(enemy.root.position).setY(0)
      if (direction.length() < 0.18) this.enemyDirection *= -1
      else {
        this.faceEnemy(enemy, direction)
        this.moveEnemy(enemy, direction.normalize().multiplyScalar(0.022))
      }
    }
    enemy.body.body.setNextKinematicTranslation(this.vec(enemy.root.position))
    enemy.body.body.setNextKinematicRotation({
      x: enemy.root.quaternion.x,
      y: enemy.root.quaternion.y,
      z: enemy.root.quaternion.z,
      w: enemy.root.quaternion.w,
    })
  }

  private updateTrapHazards(): void {
    const trap = this.devices.get('spike-trap')
    if (!trap?.body) return
    const intersections = this.physics.intersections(trap.body.collider, TRAP_OCCUPANT_KINDS)
    const hasPlayer = intersections.some((record) => record.tag.kind === 'player')
    const hasEnemy = intersections.some((record) => record.tag.kind === 'enemy')
    if (hasPlayer) {
      this.failed = true
      this.failureReason = 'trap'
    }
    if (!this.enemyDefeated && hasEnemy) {
      this.enemyDefeated = true
      this.enemyState = 'trapped'
      this.facts.add('watcher-trapped')
      this.spawnWave(trap.root.position, 0xe95757)
    }
    // 시각: 트랩은 항상 위험 표시 (dim red), enemy가 위에 있으면 더 밝게 (빨간 위험 경고)
    const redColor = 0xe95757
    const targetHousing = hasEnemy ? 1.6 : 0.35
    const targetRails = hasEnemy ? 2.4 : 0.7
    const targetSpikes = hasEnemy ? 2.6 : 0.9
    const housing = trap.root.getObjectByName('TrapHousing')
    if (housing instanceof THREE.Mesh && housing.material instanceof THREE.MeshStandardMaterial) {
      housing.material.emissive.setHex(redColor)
      this.setEmissiveIntensity(housing, targetHousing)
    }
    const rails = trap.root.getObjectByName('TrapWarningRails')
    if (rails instanceof THREE.InstancedMesh && rails.material instanceof THREE.MeshStandardMaterial) {
      rails.material.emissive.setHex(redColor)
      this.setEmissiveIntensity(rails, targetRails)
    }
    const spikes = trap.root.getObjectByName('TrapSpikes')
    if (spikes instanceof THREE.Mesh && spikes.material instanceof THREE.MeshStandardMaterial) {
      spikes.material.emissive.setHex(redColor)
      this.setEmissiveIntensity(spikes, targetSpikes)
    }
  }

  private evaluateDerivedFacts(actors: readonly ActorContext[]): void {
    if (this.chapter === 2) {
      const player = actors.find((actor) => actor.kind === 'player')
      if (player && player.position.y > 3.2) this.facts.add('elevator-ridden')
      if (this.devices.get('lift-lever')?.actor === 'echo' && this.devices.get('lift-lever')?.active) this.facts.add('lift-lever-echo')
    }
    if (this.chapter === 5) {
      const lowerHeldByEcho = this.deviceHeldBy('lower-seal', 'echo')
      const upperHeldByPlayer = this.deviceHeldBy('upper-seal', 'player')
      if (lowerHeldByEcho) this.facts.add('lower-seal-echo')
      else this.facts.delete('lower-seal-echo')
      if (lowerHeldByEcho && this.facts.has('core-receiver')) {
        this.enemyTarget = 'echo'
        this.enemyState = 'lured'
        this.facts.add('guardian-target-echo')
      }
      if (upperHeldByPlayer) this.facts.add('upper-seal-player')
      else this.facts.delete('upper-seal-player')
      if (lowerHeldByEcho && upperHeldByPlayer && this.facts.has('guardian-defeated')) {
        this.facts.add('dual-seal')
        if (this.escapeTicks === 0) this.escapeTicks = 35 * 60
      }
    }
  }

  private syncDynamics(): void {
    for (const dynamic of this.dynamics.values()) {
      if (dynamic.carriedBy) continue
      const p = dynamic.body.body.translation()
      const r = dynamic.body.body.rotation()
      dynamic.mesh.position.set(p.x, p.y, p.z)
      dynamic.mesh.quaternion.set(r.x, r.y, r.z, r.w)
    }
  }

  private toggleCarry(actor: ActorContext, id: string): void {
    const dynamic = this.dynamics.get(id)
    if (!dynamic) return
    const already = [...this.dynamics.values()].find((entry) => entry.carriedBy === actor.kind)
    if (already && already !== dynamic) return
    if (dynamic.carriedBy === actor.kind) {
      this.dropCarried(dynamic)
      return
    }
    if (dynamic.carriedBy) return
    dynamic.carriedBy = actor.kind
    dynamic.body.tag.carried = true
    dynamic.body.collider.setSensor(true)
    dynamic.upperThrowArmed = false
    dynamic.redirectedCurrentFlight = false
    dynamic.body.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true)
    this.placeCarriedObject(dynamic, actor, true)
    if (id.includes('core') && actor.kind === 'player' && this.facts.has('core-thrown-by-echo')) {
      this.facts.add('core-caught')
      dynamic.postCatchFlightArmed = true
    }
  }

  private dropCarried(dynamic: DynamicRecord): void {
    dynamic.carriedBy = undefined
    dynamic.body.tag.carried = false
    dynamic.body.collider.setSensor(false)
    dynamic.body.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
    dynamic.body.body.setLinvel({ x: 0, y: 0.3, z: 0 }, true)
  }

  private placeCarriedObject(dynamic: DynamicRecord, actor: ActorContext, snap: boolean): void {
    const carryYaw = actor.carryYaw ?? actor.facingYaw
    const forwardX = Math.sin(carryYaw)
    const forwardZ = Math.cos(carryYaw)
    dynamic.carryTarget.set(
      actor.position.x + forwardX * CARRY_FORWARD_DISTANCE + Math.cos(carryYaw) * CARRY_HAND_OFFSET,
      actor.position.y + CARRY_HEIGHT,
      actor.position.z + forwardZ * CARRY_FORWARD_DISTANCE - Math.sin(carryYaw) * CARRY_HAND_OFFSET,
    )
    const carriedOffsetX = dynamic.carryPosition.x - actor.position.x
    const carriedOffsetZ = dynamic.carryPosition.z - actor.position.z
    const forwardGap = carriedOffsetX * forwardX + carriedOffsetZ * forwardZ
    if (snap || forwardGap < CARRY_MINIMUM_FORWARD_GAP || dynamic.carryPosition.distanceToSquared(dynamic.carryTarget) > 2.25) {
      dynamic.carryPosition.copy(dynamic.carryTarget)
    } else {
      dynamic.carryPosition.lerp(dynamic.carryTarget, CARRY_FOLLOW_RATE)
    }
    const bodyPosition = this.vec(dynamic.carryTarget.set(
      actor.position.x + forwardX * CARRY_PHYSICS_FORWARD_DISTANCE,
      actor.position.y + CARRY_PHYSICS_HEIGHT,
      actor.position.z + forwardZ * CARRY_PHYSICS_FORWARD_DISTANCE,
    ))
    if (snap) dynamic.body.body.setTranslation(bodyPosition, true)
    dynamic.body.body.setNextKinematicTranslation(bodyPosition)
    dynamic.mesh.position.copy(dynamic.carryPosition)
  }

  private fillReceiver(core: DynamicRecord): boolean {
    if (core.carriedBy || this.receiverFilled || core.body.body.bodyType() !== RAPIER.RigidBodyType.Dynamic) return false

    if (this.chapter === 5 && (!core.upperThrowArmed || !this.facts.has('core-thrown-down') || core.body.body.linvel().y > 0.35)) return false
    this.receiverFilled = true
    core.carriedBy = undefined
    core.body.tag.carried = false
    core.body.collider.setSensor(false)
    core.body.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    core.body.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true)
    const receiver = this.devices.get(this.chapter === 5 ? 'power-receiver' : 'core-receiver')
    if (receiver) {
      receiver.active = true
      core.body.body.setNextKinematicTranslation(this.vec(receiver.root.position.clone().add(new THREE.Vector3(0, 0.55, 0))))
      this.setEmissiveIntensity(receiver.root.getObjectByName('ReceiverRing'), 2.15)
      this.setEmissiveIntensity(receiver.root.getObjectByName('ReceiverProngs'), 1.8)
      this.setEmissiveIntensity(receiver.root.getObjectByName('ReceiverBeam'), 1.5)
      this.emitAudio({ type: 'receiver', id: receiver.definition.id })
    }
    this.facts.add(this.chapter === 5 ? 'core-receiver' : 'receiver-filled')
    if (this.chapter === 3 && this.facts.has('core-redirected')) this.facts.add('core-route-complete')
    return true
  }

  private updatePlatformPresentation(device: DeviceRecord): void {
    // 챕터 2 elevator는 챕터 1 echo-plate처럼 beacons 색이 dark navy → bright cyan으로 바뀜
    // 다른 챕터의 platform/bridge는 기존과 동일하게 intensity만 변화
    // 챕터 1/2 echo-plate·elevator 패턴: 모든 elevator/bridge/platform에 navy→bright cyan 발광
    const isMovingPlatform = device.definition.kind === 'elevator'
      || device.definition.kind === 'bridge'
      || device.definition.kind === 'platform'
    if (isMovingPlatform) {
      const activeColor = 0xeaffff
      const inactiveColor = 0x141820
      const beacons = device.root.getObjectByName('IndustrialPlatformBeacons')
      const inset = device.root.getObjectByName('IndustrialPlatformInset')
      if (beacons instanceof THREE.InstancedMesh && beacons.material instanceof THREE.MeshStandardMaterial) {
        const targetColor = device.active ? activeColor : inactiveColor
        const currentColor = beacons.material.color.getHex()
        const nextColor = Math.round(currentColor + ((targetColor - currentColor) * 0.18))
        beacons.material.color.setHex(nextColor)
        beacons.material.emissive.setHex(device.active ? activeColor : 0x000000)
        beacons.material.emissiveIntensity = THREE.MathUtils.lerp(
          beacons.material.emissiveIntensity,
          device.active ? 2.4 : 0.4,
          0.24,
        )
      }
      if (inset instanceof THREE.Mesh && inset.material instanceof THREE.MeshStandardMaterial) {
        inset.material.emissive.setHex(device.active ? activeColor : 0x000000)
        inset.material.emissiveIntensity = THREE.MathUtils.lerp(
          inset.material.emissiveIntensity,
          device.active ? 1.0 : 0.0,
          0.24,
        )
      }
    } else {
      this.setEmissiveIntensity(device.root.getObjectByName('IndustrialPlatformBeacons'), device.active ? 1.45 : 0.4)
    }
  }

  private updateMotionSound(device: DeviceRecord, mechanism: 'elevator' | 'platform' | 'bridge', moving: boolean): void {
    if (device.motionSoundActive === moving) return
    device.motionSoundActive = moving
    this.emitAudio({ type: 'mechanism', id: device.definition.id, mechanism, moving })
  }

  private emitAudio(event: WorldAudioEvent): void {
    this.audioEvents.push(event)
  }

  private setEmissiveIntensity(object: THREE.Object3D | undefined, target: number): void {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.InstancedMesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, target, 0.18)
      }
    }
  }

  private nearestDevice(position: THREE.Vector3, radius: number): DeviceRecord | undefined {
    let best: DeviceRecord | undefined
    let bestDistance = radius
    for (const device of this.devices.values()) {
      if (!['lever', 'crate', 'core', 'receiver', 'exit'].includes(device.definition.kind)) continue
      const distance = device.root.position.distanceTo(position)
      if (distance < bestDistance) {
        best = device
        bestDistance = distance
      }
    }
    return best
  }

  private configureInteractionOutline(outline: THREE.BoxHelper, name: string): void {
    outline.name = name
    outline.visible = false
    outline.renderOrder = 12
    outline.material.transparent = true
    outline.material.opacity = 0.92
    outline.material.depthTest = false
  }

  private updateInteractionOutline(outline: THREE.BoxHelper, position: THREE.Vector3): void {
    const candidate = this.nearestDevice(position, INTERACTION_RADIUS)
    if (!candidate) {
      outline.visible = false
      return
    }
    outline.setFromObject(candidate.root)
    outline.visible = true
  }

  private doorCondition(): boolean {
    if (this.chapter === 1) {
      // The echo-plate is a pressure scanner that accepts any physical body (player, echo, crate, core).
      // The chapter design uses echo as the canonical actor so the replay flow completes the fact,
      // but a player or dropped object can also satisfy the plate sensor. The fact represents
      // the device being pressed, not the specific actor.
      return this.facts.has('tutorial-lever') && this.facts.has('echo-plate')
    }
    if (this.chapter === 2) {
      return this.deviceHeldBy('lift-lever', 'echo') && this.devices.get('weight-plate')?.active === true && this.facts.has('elevator-ridden')
    }
    if (this.chapter === 3) {
      return this.facts.has('receiver-filled')
    }
    if (this.chapter === 4) {
      return this.facts.has('lured-by-echo') && this.facts.has('watcher-trapped')
    }
    return this.deviceHeldBy('lower-seal', 'echo')
      && this.deviceHeldBy('upper-seal', 'player')
      && this.facts.has('core-thrown-down')
      && this.facts.has('core-receiver')
      && this.facts.has('guardian-target-echo')
      && this.facts.has('guardian-defeated')
      && this.facts.has('dual-seal')
      && this.escapeTicks > 0
  }

  private canExit(): boolean {
    if (this.chapter === 0) return false
    if (this.chapter === 5 && this.escapeTicks <= 0) return false
    return this.doorCondition()
  }

  private deviceHeldBy(id: string, actor: ActorKind): boolean {
    const device = this.devices.get(id)
    return device?.active === true && device.actor === actor
  }

  private applyDebugDeviceFact(fact: string): void {
    const activate = (id: string, actor?: ActorKind) => {
      const device = this.devices.get(id)
      if (!device) return
      device.active = true
      device.actor = actor
      device.holdUntilTick = Number.MAX_SAFE_INTEGER
    }
    if (fact === 'echo-plate') activate('echo-plate')
    if (fact === 'lift-lever-echo') activate('lift-lever', 'echo')
    if (fact === 'cargo-plate') activate('weight-plate')
    if (fact === 'bridge-lever-echo') activate('bridge-lever', 'echo')
    if (fact === 'lower-seal-echo') activate('lower-seal', 'echo')
    if (fact === 'upper-seal-player') activate('upper-seal', 'player')
  }

  private requiredFacts(): string[] {
    if (this.chapter === 0) return []
    if (this.chapter === 1) return ['tutorial-lever', 'echo-plate']
    if (this.chapter === 2) return ['lift-lever-echo', 'elevator-ridden', 'cargo-plate']
    if (this.chapter === 3) return ['receiver-filled']
    if (this.chapter === 4) return ['lured-by-echo', 'watcher-trapped']
    return ['core-thrown-down', 'core-receiver', 'guardian-target-echo', 'guardian-defeated', 'lower-seal-echo', 'upper-seal-player', 'dual-seal']
  }

  private hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const direction = to.clone().sub(from)
    const distance = direction.length()
    if (!canSeeTarget({
      position: this.vec(from), forward: this.vec(this.enemyForward), range: this.chapter === 5 ? 7.5 : 6.5,
      fovRadians: this.enemyState === 'patrol' ? Math.PI * 0.72 : Math.PI * 1.5, maxVerticalDelta: 5,
    }, { position: this.vec(to), radius: 0.32 })) return false
    const hit = this.physics.castRay(
      this.vec(from.clone().add(new THREE.Vector3(0, 0.6, 0))),
      this.vec(direction.normalize()),
      distance,
      ENEMY_RAY_EXCLUSIONS,
      SOLID_SIGHT_KINDS,
    )
    return !hit
  }

  private faceEnemy(enemy: DeviceRecord, direction: THREE.Vector3): void {
    if (direction.lengthSq() <= 0.0001) return
    this.enemyForward.copy(direction).setY(0).normalize()
    enemy.root.rotation.y = Math.atan2(this.enemyForward.x, this.enemyForward.z)
  }

  private moveEnemy(enemy: DeviceRecord, displacement: THREE.Vector3): void {
    const distance = displacement.length()
    if (distance <= 0.0001) return
    const direction = displacement.clone().normalize()
    const side = new THREE.Vector3(-direction.z, 0, direction.x)
    const blocked = [-0.46, 0, 0.46].some((offset) => this.physics.castRay(
      this.vec(enemy.root.position.clone().add(new THREE.Vector3(0, 0.45, 0)).addScaledVector(side, offset)),
      this.vec(direction),
      distance + 0.58,
      ENEMY_RAY_EXCLUSIONS,
      SOLID_SIGHT_KINDS,
    ) !== undefined)
    if (!blocked) enemy.root.position.add(displacement)
  }

  private spawnWave(position: THREE.Vector3, color: number): void {
    const geometry = new THREE.RingGeometry(0.45, 0.58, 28)
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0,
      emissive: color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
    const ring = new THREE.Mesh(geometry, material)
    ring.name = 'TemporalWave'
    ring.position.copy(position).add(new THREE.Vector3(0, 0.08, 0))
    ring.rotation.x = -Math.PI / 2
    this.root.add(ring)
    this.effects.push({ object: ring, ticks: 72, geometry, material })
  }

  private disposeEffect(effect: EffectRecord): void {
    effect.object.parent?.remove(effect.object)
    effect.geometry.dispose()
    effect.material.dispose()
  }

  private addEdgeGlow(mesh: THREE.Mesh, color: number): void {
    const edges = new THREE.LineSegments(
      this.geometry(new THREE.EdgesGeometry(mesh.geometry, 25)),
      this.material(color, 0.5, 0, color, 0.22),
    )
    edges.scale.set(1.003, 1.003, 1.003)
    mesh.add(edges)
  }

  private boxMesh(size: readonly [number, number, number], material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(size[0] * 2, size[1] * 2, size[2] * 2)), material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  private geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry)
    return geometry
  }

  private material(
    color: number,
    roughness: number,
    metalness: number,
    emissive = 0x000000,
    opacity = 1,
    points = false,
  ): THREE.Material {
    const material = points
      ? new THREE.PointsMaterial({ color, size: 0.045, transparent: true, opacity, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? 0.8 : 0, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 })
    this.materials.push(material)
    return material
  }

  private vec(vector: THREE.Vector3): Vec3 {
    return { x: vector.x, y: vector.y, z: vector.z }
  }
}
