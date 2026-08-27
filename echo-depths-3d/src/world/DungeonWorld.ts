import * as THREE from 'three'
import type { AssetLibrary } from '../render/AssetLibrary'
import { createAnimatedActor, type CharacterAnimator, type CharacterState } from '../render/CharacterAnimator'
import type { BodyRecord, PhysicsEntityKind, RapierWorld, Vec3 } from '../physics/RapierWorld'
import { RAPIER } from '../physics/RapierWorld'
import { CHAPTER_LAYOUTS, type StageNumber, type DeviceDefinition } from '../levels/layouts'
import { CHAPTERS, canSeeTarget, computeKnockback, evaluatePressurePlate, isWithinCatchVolume, redirectVelocity } from '../game'
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
  | { type: 'shutter'; id: string; open: boolean }
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
  redirectedCurrentFlight: boolean
  carryPosition: THREE.Vector3
  carryTarget: THREE.Vector3
  recentlyDropped: number
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
  cores: Record<string, { position: Vec3; velocity: Vec3; carriedBy?: ActorKind; receiver: boolean }>
  crates: Record<string, { position: Vec3; carriedBy?: ActorKind }>
  enemies: Record<string, {
    position: Vec3
    forward: Vec3
    state: string
    target?: ActorKind
    targetVisible: boolean
    defeated: boolean
    detection: number
  }>
  barriers: Record<string, { position: Vec3; open?: boolean }>
  objectiveFacts: string[]
  complete: boolean
  failureReason: string
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
  enemyTargetVisible: boolean
  enemyTargetLockTicks: number
  enemyLastKnown: Vec3
  enemyAlertTicks: number
  enemySearchTicks: number
  enemyRecoveryTicks: number
  enemyStimulusTicks: number
  enemyStimulusPosition: Vec3
  escapeTicks: number
  timelineTick: number
}

const positionOf = (point: readonly [number, number, number]): THREE.Vector3 => new THREE.Vector3(point[0], point[1], point[2])

const PLATE_OCCUPANT_KINDS: ReadonlySet<PhysicsEntityKind> = new Set(['player', 'echo', 'crate', 'core'])
const CORE_KIND: ReadonlySet<PhysicsEntityKind> = new Set(['core'])
const TRAP_OCCUPANT_KINDS: ReadonlySet<PhysicsEntityKind> = new Set(['player', 'echo', 'enemy'])
const ENEMY_RAY_EXCLUSIONS: ReadonlySet<string> = new Set(['watcher', 'guardian'])
const SOLID_SIGHT_KINDS: ReadonlySet<PhysicsEntityKind> = new Set(['wall', 'door'])
const WELL_THROW_UPWARD_SPEED = 2.4
// The recorded throw clears the shuttered lane and lands in the protected basin.
// It deliberately stops short of the receiver so the live Player must deliver
// this same physical Core.
const ATRIUM_THROW_SPEED = 7.2
const ATRIUM_THROW_UPWARD_SPEED = 1.4
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
const ENEMY_ALERT_TICKS = 18
const ENEMY_SEARCH_TICKS = 150
const ENEMY_RECOVERY_TICKS = 72
const ENEMY_STIMULUS_TICKS = 180
const WATCHER_TARGET_LOCK_TICKS = 120
const WATCHER_CHASE_SPEED = 0.041
const WATCHER_ECHO_LURE_SPEED = 0.032
const WATCHER_CONTACT_DISTANCE = 1.12
const WATCHER_CONTACT_VERTICAL_DELTA = 1.15
const WATCHER_TRAP_STANDOFF = 0.95
const WATCHER_REAR_DOT_MAX = -0.25
const GUARDIAN_REAR_DOT_MAX = -0.45
const GUARDIAN_CONTACT_DISTANCE = 1.12
const GUARDIAN_CONTACT_VERTICAL_DELTA = 0.82
const GUARDIAN_CHASE_SPEED = 0.026

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
  /** Live open/closed state per spatial Core-transfer shutter. */
  private readonly shutters = new Map<string, boolean>()
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
  private enemyTargetVisible = false
  private enemyTargetLockTicks = 0
  private readonly enemyLastKnown = new THREE.Vector3()
  private enemyAlertTicks = 0
  private enemySearchTicks = 0
  private enemyRecoveryTicks = 0
  private enemyStimulusTicks = 0
  private readonly enemyStimulusPosition = new THREE.Vector3()
  private enemyAnimator: CharacterAnimator | undefined
  private watcherVisionSector: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | undefined
  private watcherVisionBoundary: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | undefined
  private watcherTargetBeam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | undefined
  private watcherStatusRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial> | undefined
  private watcherSensorEye: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | undefined
  private watcherVisionFov = -1
  private guardianFrontShield: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial> | undefined
  private guardianRearSeal: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial> | undefined
  private guardianRearSealRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial> | undefined
  private guardianLowerTether: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | undefined
  private finalEscapeGuide: THREE.Group | undefined
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
    if (chapter === 5) this.enemyState = 'dormant'
    const enemy = this.devices.get(chapter === 5 ? 'guardian' : 'watcher')
    const attentionLandmark = this.devices.get(chapter === 5 ? 'lower-seal' : 'lure-bell')
    if (enemy && attentionLandmark) {
      this.faceEnemy(enemy, attentionLandmark.root.position.clone().sub(enemy.root.position).setY(0))
    }
    if (enemy) this.updateEnemyPresentation(enemy, this.enemyTargetVisible ? this.enemyLastKnown : undefined)
  }

  beforePhysics(tick: number, actors: readonly ActorContext[]): void {
    this.currentTick = tick
    this.updateHeldLevers(actors)
    this.updatePlatforms(tick, actors)
    this.updateCarriedObjects(actors)
    this.updateDoors()
    this.updateReturnGates()
    if (this.chapter === 5 && this.escapeTicks > 0) {
      this.escapeTicks -= 1
      if (this.escapeTicks === 0 && !this.complete) {
        this.failed = true
        this.failureReason = 'collapse'
      }
    }
  }

  afterPhysics(actors: readonly ActorContext[]): void {
    for (const dynamic of this.dynamics.values()) {
      if (dynamic.recentlyDropped > 0) {
        dynamic.recentlyDropped -= 1
        if (dynamic.recentlyDropped === 0 && !dynamic.carriedBy) {
          this.physics.setDynamicCollisionMode(dynamic.body.collider, false)
        }
      }
    }
    this.syncDynamics()
    this.updatePlates(actors)
    this.updateCoreReceiver(actors)
    this.updateReturnGates()
    this.updateEnemy(actors)
    this.enemyAnimator?.update(1 / 60)
    this.updateTrapHazards()
    this.updateTemporalGates()
    this.updateShutters(actors)
    this.updateOneWayWalls(actors)
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
      if (definition.id === 'lure-bell') {
        // The bell is only an audible world-space stimulus. It never grants a
        // target or puzzle fact by itself; the Watcher must still acquire an
        // actor through its real FOV and line-of-sight checks.
        this.enemyStimulusPosition.copy(candidate.root.position)
        this.enemyStimulusTicks = ENEMY_STIMULUS_TICKS
        this.enemyLastKnown.copy(candidate.root.position)
        this.enemySearchTicks = ENEMY_SEARCH_TICKS
        this.enemyRecoveryTicks = 0
        this.enemyState = 'alert'
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
    // A short actor-collision grace period prevents the thrower's reversing
    // capsule from batting its own projectile sideways. World geometry and
    // puzzle barriers remain solid throughout the physical flight.
    this.physics.setDynamicCollisionMode(carried.body.collider, true)
    carried.body.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
    const effectiveDir = direction.clone().normalize()
    const origin = actor.position.clone().add(new THREE.Vector3(0, 1.15, 0)).addScaledVector(effectiveDir, 0.72)
    carried.body.body.setTranslation(origin, true)
    const isCore = carried.body.tag.kind === 'core'
    const coreThrowSpeed = this.chapter === 3 || this.chapter === 5 ? ATRIUM_THROW_SPEED : 7.2
    const impulse = effectiveDir.clone().multiplyScalar(isCore ? coreThrowSpeed : 3.8)
    impulse.y = isCore
      ? this.chapter === 3 ? ATRIUM_THROW_UPWARD_SPEED : this.chapter === 5 ? WELL_THROW_UPWARD_SPEED : 5.8
      : 2.4
    carried.body.body.setLinvel(impulse, true)
    carried.recentlyDropped = 30
    return carried.body.tag.kind
  }

  attack(actor: ActorContext, direction: THREE.Vector3): string | undefined {
    // Ch3 removed: no air-redirect / catch-time mechanic. The core reaches the receiver
    // exclusively via the echo's recorded throw. Ch5 may still use the core field for its
    // own logic, so we keep `redirectedCurrentFlight` but only set it in non-Ch3 chapters.
    const allowRedirect = this.chapter !== 3 && this.chapter !== 0
    const core = allowRedirect
      ? [...this.dynamics.values()].find((entry) =>
          entry.body.tag.kind === 'core'
          && !entry.carriedBy
          && !this.receiverFilled
          && !entry.redirectedCurrentFlight
          && entry.body.body.bodyType() === RAPIER.RigidBodyType.Dynamic)
      : undefined
    if (core) {
      const p = core.body.body.translation()
      const corePosition = new THREE.Vector3(p.x, p.y, p.z)
      if (corePosition.distanceTo(actor.position) < 2.15) {
        const redirectedState = redirectVelocity(core.body.body.linvel(), this.vec(direction), 8.2)
        const redirected = new THREE.Vector3(redirectedState.x, Math.max(2.8, redirectedState.y * 0.45 + 2.6), redirectedState.z)
        core.body.body.setLinvel(redirected, true)
        core.redirectedCurrentFlight = true
        this.spawnWave(corePosition, 0xc15bf2)
        return 'core'
      }
    }
    const enemy = this.devices.get(this.chapter === 5 ? 'guardian' : 'watcher')
    const strikeRange = this.chapter >= 4 ? 3.5 : 2.6
    if (enemy && !this.enemyDefeated && enemy.root.position.distanceTo(actor.position) < strikeRange) {
      const horizontalToActor = actor.position.clone().sub(enemy.root.position).setY(0)
      const actorSideDot = horizontalToActor.lengthSq() > 0.0001
        ? horizontalToActor.normalize().dot(this.enemyForward)
        : 1
      if (this.chapter === 5) {
        const heightAdvantage = actor.position.y - enemy.root.position.y
        const directionToEnemy = enemy.root.position.clone().sub(actor.position).setY(0)
        const strikeDirection = direction.clone().setY(0).normalize()
        const strikeAimed = directionToEnemy.lengthSq() > 0.0001
          && strikeDirection.dot(directionToEnemy.normalize()) > 0.5
        if (
          actor.kind === 'player'
          && this.enemyTarget === 'echo'
          && this.enemyTargetVisible
          && actorSideDot <= GUARDIAN_REAR_DOT_MAX
          && heightAdvantage > 1.3
          && strikeAimed
        ) {
          this.enemyDefeated = true
          this.enemyState = 'sealed'
          this.enemyTargetVisible = false
          this.facts.add('guardian-defeated')
          this.spawnWave(enemy.root.position, 0x8e6dff)
          return 'guardian'
        }
        this.failureReason = 'guardian-shield'
        return 'shield'
      }
      const heightAdvantage = actor.position.y - enemy.root.position.y
      if (
        actor.kind !== 'player'
        || this.enemyTarget !== 'echo'
        || !this.enemyTargetVisible
        || actorSideDot > WATCHER_REAR_DOT_MAX
        || heightAdvantage < 0.8
      ) {
        this.failureReason = 'watcher-facing'
        return 'shield'
      }
      const result = computeKnockback({
        position: this.vec(actor.position), forward: this.vec(direction), range: strikeRange, halfAngleRadians: Math.PI * 0.42,
        baseStrength: 0.24, upwardStrength: 0, heightAdvantageThreshold: 1.3, heightAdvantageMultiplier: 1.55,
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
    const effectiveDir = direction.clone().normalize()
    const horizontalLength = Math.hypot(effectiveDir.x, effectiveDir.z)
    const directionX = horizontalLength > 0.000001 ? effectiveDir.x / horizontalLength : 0
    const directionZ = horizontalLength > 0.000001 ? effectiveDir.z / horizontalLength : 1
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
    const crates: WorldDebugState['crates'] = {}
    const enemies: WorldDebugState['enemies'] = {}
    const barriers: WorldDebugState['barriers'] = {}
    for (const [id, device] of this.devices) {
      if (device.definition.kind === 'plate') pressurePlates[id] = withOptionalActor(device.active, device.actor)
      if (device.definition.kind === 'lever') levers[id] = withOptionalActor(device.active, device.actor)
      if (device.definition.kind === 'door') doors[id] = { open: device.active }
      if (device.definition.kind === 'elevator' || device.definition.kind === 'platform') {
        elevators[id] = { y: Number(device.root.position.y.toFixed(3)), active: device.active }
      }
      if (device.definition.kind === 'enemy') {
        const target = this.enemyTarget
        const shared = {
          position: this.vec(device.root.position),
          forward: this.vec(this.enemyForward),
          state: this.enemyState,
          targetVisible: this.enemyTargetVisible,
          defeated: this.enemyDefeated,
          detection: Number(this.enemyDetection.toFixed(3)),
        }
        enemies[id] = target
          ? { ...shared, target }
          : shared
      }
      if (device.definition.kind === 'gate' || device.definition.kind === 'shutter' || device.definition.kind === 'one-way-wall' || device.definition.kind === 'return-gate') {
        const position = device.body?.body.translation() ?? device.root.position
        const open = device.definition.kind === 'shutter'
          ? this.shutters.get(device.definition.id)
          : device.definition.kind === 'return-gate' ? device.active : undefined
        barriers[device.definition.id] = open === undefined
          ? { position: { x: position.x, y: position.y, z: position.z } }
          : { position: { x: position.x, y: position.y, z: position.z }, open }
      }
    }
    for (const [id, dynamic] of this.dynamics) {
      const p = dynamic.body.body.translation()
      if (dynamic.body.tag.kind === 'crate') {
        crates[id] = dynamic.carriedBy
          ? { position: { x: p.x, y: p.y, z: p.z }, carriedBy: dynamic.carriedBy }
          : { position: { x: p.x, y: p.y, z: p.z } }
        continue
      }
      if (dynamic.body.tag.kind !== 'core') continue
      const velocity = dynamic.body.body.linvel()
      const shared = {
        position: { x: p.x, y: p.y, z: p.z },
        velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
        receiver: this.receiverFilled,
      }
      cores[id] = dynamic.carriedBy
        ? { ...shared, carriedBy: dynamic.carriedBy }
        : shared
    }
    return {
      facts: [...this.facts].sort(), pressurePlates, levers, doors, elevators, cores, crates, enemies, barriers,
      objectiveFacts: this.requiredFacts(), complete: this.complete, failureReason: this.failureReason,
      escapeSeconds: Number((this.escapeTicks / 60).toFixed(1)),
    }
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
        Math.abs(actorBottom - platformTop) <= 0.65
      ) return { delta: device.delta.clone(), supported: true }
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
      enemyTargetVisible: this.enemyTargetVisible,
      enemyTargetLockTicks: this.enemyTargetLockTicks,
      enemyLastKnown: this.vec(this.enemyLastKnown),
      enemyAlertTicks: this.enemyAlertTicks,
      enemySearchTicks: this.enemySearchTicks,
      enemyRecoveryTicks: this.enemyRecoveryTicks,
      enemyStimulusTicks: this.enemyStimulusTicks,
      enemyStimulusPosition: this.vec(this.enemyStimulusPosition),
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
    this.enemyTargetVisible = snapshot.enemyTargetVisible
    this.enemyTargetLockTicks = snapshot.enemyTargetLockTicks
    this.enemyLastKnown.set(snapshot.enemyLastKnown.x, snapshot.enemyLastKnown.y, snapshot.enemyLastKnown.z)
    this.enemyAlertTicks = snapshot.enemyAlertTicks
    this.enemySearchTicks = snapshot.enemySearchTicks
    this.enemyRecoveryTicks = snapshot.enemyRecoveryTicks
    this.enemyStimulusTicks = snapshot.enemyStimulusTicks
    this.enemyStimulusPosition.set(
      snapshot.enemyStimulusPosition.x,
      snapshot.enemyStimulusPosition.y,
      snapshot.enemyStimulusPosition.z,
    )
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
          const nonBlocking = (this.chapter === 2
            && device.definition.kind === 'elevator'
            && saved.motionProgress > 0)
            || (this.chapter === 5 && device.definition.kind === 'platform')
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
      const physicalCoreCarry = (this.chapter === 3 || this.chapter === 5)
        && dynamic.body.tag.kind === 'core'
        && Boolean(dynamic.carriedBy)
      dynamic.body.collider.setSensor(Boolean(dynamic.carriedBy) && !physicalCoreCarry)
      this.physics.setDynamicCollisionMode(dynamic.body.collider, physicalCoreCarry)
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
    // The return gate has no independent saved puzzle condition. It always
    // derives from the restored receiver's live active state.
    this.updateReturnGates(true)
    const enemy = this.devices.get(this.chapter === 5 ? 'guardian' : 'watcher')
    if (enemy) this.updateEnemyPresentation(enemy, this.enemyTargetVisible ? this.enemyLastKnown : undefined)
  }

  releaseActor(actor: ActorKind): void {
    for (const dynamic of this.dynamics.values()) {
      if (dynamic.carriedBy !== actor) continue
      dynamic.carriedBy = undefined
      dynamic.body.tag.carried = false
      dynamic.body.collider.setSensor(false)
      this.physics.setDynamicCollisionMode(dynamic.body.collider, false)
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
      this.enemyTargetVisible = false
      this.enemyTargetLockTicks = 0
      if (!this.enemyDefeated) this.enemyState = 'patrol'
      this.enemyDetection = 0
    }
  }

  dispose(): void {
    this.enemyAnimator?.dispose()
    this.enemyAnimator = undefined
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
    const safe = this.material(0x29454c, 0.78, 0.18)
    const echoRoute = this.material(0x463758, 0.72, 0.24, layout.accent, 0.08)
    const danger = this.material(0x4a2932, 0.76, 0.16, 0x7a2638, 0.08)
    for (const box of layout.boxes) {
      const baseMaterial = box.tone === 'trim'
        ? trim
        : box.tone === 'wood'
          ? wood
          : box.tone === 'safe'
            ? safe
            : box.tone === 'echo'
              ? echoRoute
              : box.tone === 'danger'
                ? danger
                : stone
      const material = box.wall || box.occluder ? this.cloneMaterial(baseMaterial) : baseMaterial
      const mesh = this.boxMesh(box.size, material)
      mesh.name = box.id
      mesh.position.set(...box.position)
      if (box.rotation) mesh.rotation.set(...box.rotation)
      this.root.add(mesh)
      this.physics.createStaticBox(box.id, box.wall ? 'wall' : 'floor', this.vec(mesh.position), {
        x: box.size[0], y: box.size[1], z: box.size[2],
      }, false, { x: mesh.quaternion.x, y: mesh.quaternion.y, z: mesh.quaternion.z, w: mesh.quaternion.w })
      if (box.wall || box.occluder) this.staticObstructions.push(mesh)
      this.addEdgeGlow(mesh, layout.accent)
    }

    const columnGeometry = this.geometry(new THREE.CylinderGeometry(0.42, 0.56, 3.6, 8))
    const columnMaterial = this.material(0x34323b, 0.86, 0.18)
    for (const [index, point] of layout.pillars.entries()) {
      const mesh = new THREE.Mesh(columnGeometry, this.cloneMaterial(columnMaterial))
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
    if (this.chapter === 5) this.buildParadoxGuidance()
    this.addDecor(layout.accent)
  }

  private buildDevice(definition: DeviceDefinition, accent: number): void {
    const position = positionOf(definition.position)
    const size = definition.size ?? [0.55, 0.55, 0.55]
    const glow = this.material(accent, 0.42, 0.42, accent)
    let root: THREE.Object3D
    let body: BodyRecord | undefined
    let staticSeal: THREE.Object3D | undefined
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
    } else if (definition.kind === 'gate') {
      root = new THREE.Group()
      root.name = 'TemporalGate'
      // The barrier blocks movement along X, so its visible opening must span
      // Z. The old gate was built across X and twice as tall as its collider,
      // which made it read as a clipped purple block instead of a passage.
      const height = size[1]
      const span = size[2]
      const depth = 0.18
      const postMat = this.material(0x24152f, 0.38, 0.76, 0x7f4de8)
      const trimMat = this.material(0x9067df, 0.24, 0.74, 0xc15bf2)
      const baseMat = this.material(0x181325, 0.62, 0.62, 0x3c245c)
      const membraneMat = new THREE.MeshBasicMaterial({
        color: 0x9c6cff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      this.materials.push(membraneMat)
      const postGeometry = this.geometry(new THREE.BoxGeometry(depth, height, 0.18))
      const topGeometry = this.geometry(new THREE.BoxGeometry(depth, 0.18, span))
      const railGeometry = this.geometry(new THREE.BoxGeometry(0.055, 0.055, span * 0.74))
      const baseGeometry = this.geometry(new THREE.BoxGeometry(depth + 0.14, 0.12, span + 0.28))
      const leftPost = new THREE.Mesh(postGeometry, postMat)
      leftPost.name = 'TemporalGatePost'
      leftPost.position.set(0, 0, -span * 0.5 + 0.09)
      const rightPost = new THREE.Mesh(postGeometry, this.cloneMaterial(postMat))
      rightPost.name = 'TemporalGatePostSouth'
      rightPost.position.set(0, 0, span * 0.5 - 0.09)
      const crown = new THREE.Mesh(topGeometry, trimMat)
      crown.name = 'TemporalGateCrown'
      crown.position.set(0, height * 0.5 - 0.09, 0)
      const base = new THREE.Mesh(baseGeometry, baseMat)
      base.name = 'TemporalGateBase'
      base.position.set(0, -height * 0.5 + 0.06, 0)
      const membrane = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(span * 0.78, height * 0.76)), membraneMat)
      membrane.name = 'TemporalGateMembrane'
      membrane.rotation.y = Math.PI / 2
      membrane.renderOrder = 2
      const rails = new THREE.Group()
      rails.name = 'TemporalGateScanRails'
      for (const [index, y] of [-height * 0.24, 0, height * 0.24].entries()) {
        const rail = new THREE.Mesh(railGeometry, this.cloneMaterial(trimMat))
        rail.name = index === 1 ? 'TemporalGateBeam' : 'TemporalGateScanRail'
        rail.position.set(-depth * 0.62, y, 0)
        rail.renderOrder = 3
        rails.add(rail)
      }
      const halo = new THREE.Mesh(
        this.geometry(new THREE.TorusGeometry(0.54, 0.032, 8, 28)),
        this.cloneMaterial(trimMat),
      )
      halo.name = 'TemporalGateHalo'
      halo.rotation.y = Math.PI / 2
      halo.scale.set(1, height * 0.3, span * 0.45)
      halo.renderOrder = 3
      const light = new THREE.PointLight(0xc15bf2, 2.3, 4.8)
      light.name = 'TemporalGateLight'
      root.add(leftPost, rightPost, crown, base, membrane, rails, halo, light)
      for (const part of [leftPost, rightPost, crown, base]) {
        part.castShadow = true
        part.receiveShadow = true
        this.addEdgeGlow(part, accent)
      }
      // The gate is a real collider. Rapier collision groups make it solid to
      // dynamic puzzle objects while Player/Echo capsules pass through.
      body = this.physics.createCoreBarrier(definition.id, this.vec(position), { x: size[0] / 2, y: size[1] / 2, z: size[2] / 2 })
    } else if (definition.kind === 'shutter') {
      // Physical shutter for Ch3's Core transfer lane. The retracting shutter
      // itself blocks the Core while closed; a separate actor-only seal stays
      // in the lane so Player/Echo can never use this as a return shortcut.
      root = new THREE.Group()
      const slatMat = this.material(0xc15bf2, 0.34, 0.6, 0x6b3a92)
      for (let i = 0; i < 4; i += 1) {
        const slat = this.boxMesh([size[0] * 0.76, size[1] * 0.18, size[2] * 0.88], slatMat.clone())
        slat.name = 'TransferShutterSlat'
        slat.position.set(0, -size[1] * 0.5 + (i + 0.5) * (size[1] * 0.25), 0)
        root.add(slat)
      }
      const frameMat = this.material(0x2a1a3a, 0.5, 0.5, 0x4a2a5a)
      const top = this.boxMesh([size[0] * 0.9, 0.1, size[2] * 0.98], frameMat); top.name = 'TransferShutterFrame'
      top.position.y = size[1] * 0.5 + 0.02
      root.add(top)
      body = this.physics.createShutter(definition.id, this.vec(position), { x: size[0] / 2, y: size[1] / 2, z: size[2] / 2 })
      if (this.chapter === 3) {
        this.physics.createShutterActorBarrier(`${definition.id}-actor-seal`, this.vec(position), {
          x: size[0] / 2,
          y: size[1] / 2,
          z: size[2] / 2,
        })
        staticSeal = new THREE.Group()
        staticSeal.name = `${definition.id}-actor-seal`
        staticSeal.position.copy(position)
        const sealMat = new THREE.MeshBasicMaterial({
          color: 0x68eaff,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
        this.materials.push(sealMat)
        const sealField = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(size[2] * 0.88, size[1] * 0.78)), sealMat)
        sealField.name = 'TransferShutterActorSeal'
        sealField.rotation.y = Math.PI / 2
        sealField.position.x = -size[0] * 0.53
        sealField.renderOrder = 4
        staticSeal.add(sealField)
        for (const y of [-size[1] * 0.24, 0, size[1] * 0.24]) {
          const lockRail = this.boxMesh([size[0] * 0.16, 0.045, size[2] * 0.82], this.cloneMaterial(slatMat))
          lockRail.name = 'TransferShutterActorSealRail'
          lockRail.position.set(-size[0] * 0.58, y, 0)
          staticSeal.add(lockRail)
        }
      }
    } else if (definition.kind === 'one-way-wall') {
      root = new THREE.Group()
      root.name = 'OneWayPassagePortal'
      // The collider is deliberately as substantial as the visible portal. A
      // small, thin slab made the rule look like a broken prop instead of an
      // authored crossing in the quarter-view camera.
      const height = size[1]
      const span = size[2]
      const depth = size[0]
      // The solid Rapier barrier must not render as a solid purple monolith.
      // Its volume stays as a faint silhouette behind the directional surfaces.
      const slabMat = this.material(0x171424, 0.38, 0.78, 0x44266b, 0.12)
      const frameMat = this.material(0x8e6af0, 0.2, 0.82, 0xc15bf2)
      const passMat = this.material(0x7be9ff, 0.2, 0.58, 0x7be9ff)
      const lockMat = this.material(0xff5c79, 0.28, 0.62, 0xff5c79)
      const westFieldMat = new THREE.MeshBasicMaterial({
        color: 0x5ee4ff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const eastFieldMat = new THREE.MeshBasicMaterial({
        color: 0x7f244a,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      this.materials.push(westFieldMat, eastFieldMat)
      const slab = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(depth, height, span)), slabMat)
      slab.name = 'OneWayWall'
      const northFrame = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(depth + 0.14, height + 0.22, 0.12)), frameMat)
      northFrame.name = 'OneWayWallNorthFrame'
      northFrame.position.z = -span * 0.5
      const southFrame = new THREE.Mesh(
        this.geometry(new THREE.BoxGeometry(depth + 0.14, height + 0.22, 0.12)),
        this.cloneMaterial(frameMat),
      )
      southFrame.name = 'OneWayWallSouthFrame'
      southFrame.position.z = span * 0.5
      const crown = new THREE.Mesh(
        this.geometry(new THREE.BoxGeometry(depth + 0.14, 0.14, span + 0.22)),
        this.cloneMaterial(frameMat),
      )
      crown.name = 'OneWayWallCrown'
      crown.position.y = height * 0.5
      const westField = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(span * 0.84, height * 0.84)), westFieldMat)
      westField.name = 'OneWayWallWestField'
      westField.rotation.y = Math.PI / 2
      westField.position.x = -depth * 0.5 - 0.012
      westField.renderOrder = 2
      const eastField = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(span * 0.84, height * 0.84)), eastFieldMat)
      eastField.name = 'OneWayWallEastField'
      eastField.rotation.y = -Math.PI / 2
      eastField.position.x = depth * 0.5 + 0.012
      eastField.renderOrder = 2

      // A top-facing row of bright arrows remains visible from the quarter-view
      // camera even when that camera is looking at the portal's locked face.
      const arrowGeometry = this.geometry(new THREE.ConeGeometry(0.22, 0.54, 4))
      const arrowShaftGeometry = this.geometry(new THREE.BoxGeometry(0.34, 0.06, 0.11))
      const arrows = new THREE.Group()
      arrows.name = 'OneWayWallPassArrows'
      for (const z of [-span * 0.27, 0, span * 0.27]) {
        const shaft = new THREE.Mesh(arrowShaftGeometry, this.cloneMaterial(passMat))
        shaft.name = 'OneWayWallPassShaft'
        shaft.position.set(-0.22, height * 0.5 + 0.16, z)
        arrows.add(shaft)
        const arrow = new THREE.Mesh(arrowGeometry, this.cloneMaterial(passMat))
        arrow.name = 'OneWayWallPassArrow'
        arrow.rotation.z = -Math.PI / 2
        arrow.position.set(0.14, height * 0.5 + 0.16, z)
        arrow.renderOrder = 4
        arrows.add(arrow)
      }
      arrows.userData.role = 'player-west-to-east-only'

      const lockBars = new THREE.Group()
      lockBars.name = 'OneWayWallLockBars'
      const lockBarGeometry = this.geometry(new THREE.BoxGeometry(0.055, 0.08, span * 0.7))
      for (const y of [-height * 0.23, 0, height * 0.23]) {
        const lockBar = new THREE.Mesh(lockBarGeometry, this.cloneMaterial(lockMat))
        lockBar.name = 'OneWayWallLockBar'
        lockBar.position.set(depth * 0.58, y, 0)
        lockBar.renderOrder = 4
        lockBars.add(lockBar)
      }
      const lockRing = new THREE.Mesh(
        this.geometry(new THREE.TorusGeometry(0.34, 0.045, 8, 20)),
        this.cloneMaterial(lockMat),
      )
      lockRing.name = 'OneWayWallLockSigil'
      lockRing.rotation.y = Math.PI / 2
      lockRing.position.x = depth * 0.58
      lockBars.add(lockRing)
      const lockCross = new THREE.Mesh(
        this.geometry(new THREE.BoxGeometry(0.05, 0.48, 0.055)),
        this.cloneMaterial(lockMat),
      )
      lockCross.name = 'OneWayWallLockCross'
      lockCross.rotation.x = Math.PI / 4
      lockCross.position.x = depth * 0.59
      lockBars.add(lockCross)

      const beaconGeometry = this.geometry(new THREE.OctahedronGeometry(0.15, 0))
      const beacons = new THREE.Group()
      beacons.name = 'OneWayWallBeacons'
      for (const z of [-span * 0.38, span * 0.38]) {
        const beacon = new THREE.Mesh(beaconGeometry, this.cloneMaterial(frameMat))
        beacon.position.set(0, height * 0.39, z)
        beacons.add(beacon)
      }
      const light = new THREE.PointLight(0x7be9ff, 2.4, 5.2)
      light.name = 'OneWayWallLight'
      light.position.x = -depth * 0.45
      root.add(slab, northFrame, southFrame, crown, westField, eastField, arrows, lockBars, beacons, light)
      for (const part of [slab, northFrame, southFrame, crown]) {
        part.castShadow = true
        part.receiveShadow = true
        this.addEdgeGlow(part, accent)
      }
      body = this.physics.createOneWayWall(definition.id, this.vec(position), {
        x: size[0] / 2,
        y: size[1] / 2,
        z: size[2] / 2,
      })
    } else if (definition.kind === 'return-gate') {
      root = new THREE.Group()
      root.name = 'PlayerReturnGate'
      const height = size[1]
      const span = size[2]
      const depth = size[0]
      const frameMat = this.material(0x222936, 0.48, 0.72, 0xff5c79)
      const panelMat = this.material(0x4d1d32, 0.34, 0.62, 0xff5c79)
      const trimMat = this.material(0x742445, 0.28, 0.56, 0xff5c79)
      const closedFieldMat = new THREE.MeshBasicMaterial({
        color: 0xff5c79,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const openFieldMat = new THREE.MeshBasicMaterial({
        color: 0x63ffd5,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      this.materials.push(closedFieldMat, openFieldMat)
      const northFrame = this.boxMesh([depth + 0.1, height, 0.1], frameMat)
      northFrame.name = 'ReturnGateNorthFrame'
      northFrame.position.z = -span * 0.5
      const southFrame = this.boxMesh([depth + 0.1, height, 0.1], this.cloneMaterial(frameMat))
      southFrame.name = 'ReturnGateSouthFrame'
      southFrame.position.z = span * 0.5
      const crown = this.boxMesh([depth + 0.1, 0.14, span + 0.16], this.cloneMaterial(trimMat))
      crown.name = 'ReturnGateCrown'
      crown.position.y = height * 0.5 - 0.07
      const base = this.boxMesh([depth + 0.12, 0.12, span + 0.16], this.cloneMaterial(trimMat))
      base.name = 'ReturnGateBase'
      base.position.y = -height * 0.5 + 0.06
      const panels = new THREE.Group()
      panels.name = 'ReturnGateDoorPanels'
      for (const direction of [-1, 1]) {
        const panel = this.boxMesh([depth * 0.8, height * 0.78, span * 0.39], this.cloneMaterial(panelMat))
        panel.name = 'ReturnGateDoorPanel'
        panel.position.z = direction * span * 0.22
        panel.userData.closedZ = direction * span * 0.22
        panel.userData.openZ = direction * span * 0.64
        panels.add(panel)
      }
      const closedField = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(span * 0.76, height * 0.7)), closedFieldMat)
      closedField.name = 'ReturnGateClosedField'
      closedField.rotation.y = Math.PI / 2
      closedField.position.x = -depth * 0.52
      closedField.renderOrder = 3
      const openField = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(span * 0.7, height * 0.68)), openFieldMat)
      openField.name = 'ReturnGateOpenField'
      openField.rotation.y = Math.PI / 2
      openField.position.x = -depth * 0.54
      openField.renderOrder = 4
      const rings = new THREE.Group()
      rings.name = 'ReturnGateStatusRings'
      for (const y of [-height * 0.22, 0, height * 0.22]) {
        const ring = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.16, 0.025, 8, 16)), this.cloneMaterial(trimMat))
        ring.rotation.y = Math.PI / 2
        ring.position.set(-depth * 0.6, y, 0)
        rings.add(ring)
      }
      const light = new THREE.PointLight(0xff5c79, 2.3, 5.2)
      light.name = 'ReturnGateLight'
      light.position.x = -depth * 0.72
      root.add(northFrame, southFrame, crown, base, panels, closedField, openField, rings, light)
      for (const part of [northFrame, southFrame, crown, base]) {
        part.castShadow = true
        part.receiveShadow = true
        this.addEdgeGlow(part, accent)
      }
      body = this.physics.createReturnGate(definition.id, this.vec(position), {
        x: size[0] / 2,
        y: size[1] / 2,
        z: size[2] / 2,
      })
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
      const targetRing = new THREE.Mesh(
        this.geometry(new THREE.TorusGeometry(size[0] * 1.22, 0.055, 8, 32)),
        this.material(0xe95757, 0.24, 0.18, 0xe95757, 0.82),
      )
      targetRing.name = 'TrapTargetRing'
      targetRing.position.y = 0.19
      targetRing.rotation.x = Math.PI / 2
      const lureBeacon = new THREE.Mesh(
        this.geometry(new THREE.CylinderGeometry(0.1, size[0] * 0.5, 1.35, 18, 1, true)),
        this.material(0xe95757, 0.32, 0.08, 0xe95757, 0.14),
      )
      lureBeacon.name = 'TrapLureBeacon'
      lureBeacon.position.y = 0.82
      const trapLight = new THREE.PointLight(0xe95757, 1.3, 4.5)
      trapLight.name = 'TrapTargetLight'
      trapLight.position.y = 0.75
      root.add(housing, warnings, spikes, targetRing, lureBeacon, trapLight)
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
      body = this.physics.createKinematicBox(definition.id, 'enemy', this.vec(position), { x: size[0], y: size[1], z: size[2] })
      if (this.chapter === 4) this.buildWatcherCharacter(root)
      else this.buildGuardianCharacter(root)
    }
    root.name = definition.id
    root.position.copy(position)
    const cameraOccludingDevice = this.chapter >= 3
      && (definition.kind === 'elevator' || definition.kind === 'platform' || definition.kind === 'bridge')
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const presentationOverlay = object.userData.presentationOverlay === true
        object.castShadow = !presentationOverlay
        object.receiveShadow = !presentationOverlay
        if (cameraOccludingDevice
          && (object.name === 'IndustrialPlatformDeck' || object.name === 'IndustrialPlatformInset')) {
          object.material = Array.isArray(object.material)
            ? object.material.map((material) => this.cloneMaterial(material))
            : this.cloneMaterial(object.material)
          this.staticObstructions.push(object)
        }
      }
    })
    if (staticSeal) this.root.add(staticSeal)
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
      redirectedCurrentFlight: false,
      carryPosition: position.clone(),
      carryTarget: position.clone(),
      recentlyDropped: 0,
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
      if (object instanceof THREE.Mesh) {
        object.material = Array.isArray(object.material)
          ? object.material.map((material) => this.cloneMaterial(material))
          : this.cloneMaterial(object.material)
        this.staticObstructions.push(object)
      }
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

  private updatePlatforms(_tick: number, actors: readonly ActorContext[]): void {
    for (const device of this.devices.values()) {
      const { definition } = device
      if (!definition.to || !device.body) continue
      // Enemy patrol endpoints also use `to`; only authored moving surfaces
      // belong in this platform reset/interpolation loop.
      if (definition.kind !== 'elevator' && definition.kind !== 'platform') continue
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
        const boarded = device.active && this.playerBoardedPlatform(device, actors)
        const ascending = boarded || (device.motionProgress > 0 && device.motionProgress < 1)
        device.motionProgress = THREE.MathUtils.clamp(
          device.motionProgress + (device.active && ascending ? 0.008 : -0.008),
          0,
          1,
        )
        amount = device.motionProgress
      }
      const target = positionOf(definition.to)
      const next = device.basePosition.clone().lerp(target, amount)
      device.delta.copy(next).sub(device.root.position)
      device.root.position.copy(next)
      const nonBlocking = (this.chapter === 2
        && definition.kind === 'elevator'
        && device.motionProgress > 0)
        || (this.chapter === 5 && definition.kind === 'platform')
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
    const requestedOpen = this.chapter === 5
      ? this.chapterFiveDoorReleased() && (!this.facts.has('final-door-opened') || this.escapeTicks > 0)
      : this.doorCondition()
    for (const device of this.devices.values()) {
      if (device.definition.kind !== 'door' || !device.body) continue
      const wasOpen = device.active
      if (this.chapter === 5) {
        const targetX = device.basePosition.x + (requestedOpen ? 2.8 : 0)
        device.root.position.x = THREE.MathUtils.lerp(device.root.position.x, targetX, requestedOpen ? 0.18 : 0.1)
        device.root.position.y = device.basePosition.y
      } else {
        const targetY = device.basePosition.y + (requestedOpen ? 4.8 : 0)
        device.root.position.y = THREE.MathUtils.lerp(device.root.position.y, targetY, 0.1)
      }
      const open = requestedOpen && (this.chapter !== 5 || device.root.position.x >= device.basePosition.x + 2.25)
      device.active = open
      if (this.chapter === 5 && open && !this.facts.has('final-door-opened')) {
        this.facts.add('final-door-opened')
        this.escapeTicks = CHAPTERS[4]?.escapeTimeTicks ?? 15 * 60
      }
      if (wasOpen !== open) this.emitAudio({ type: 'door', id: device.definition.id, open })
      device.body.body.setNextKinematicTranslation({ x: device.root.position.x, y: device.root.position.y, z: device.basePosition.z })
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
    if (!core.carriedBy && this.chapter !== 3) {
      // Ch3 removed: frame-precision catch mechanic. The echo records its own pickup,
      // the player records their own pickup after recording — no auto-catch on interactHeld.
      const player = actors.find((actor) => actor.kind === 'player')
      if (player && !core.recentlyDropped && isWithinCatchVolume(this.vec(player.position), this.vec(corePosition)) && player.interactHeld) {
        this.toggleCarry(player, core.id)
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

  private updateTemporalGates(): void {
    for (const [, device] of this.devices) {
      if (device.definition.kind !== 'gate' || !device.body) continue
      // A carried Core keeps a non-sensor collider while crossing the gate.
      // If Rapier reports contact, drop it at the contact position. There is
      // deliberately no coordinate correction or synthetic puzzle fact here;
      // the fixed collider and collision policy are the rejection mechanism.
      for (const record of this.physics.intersections(device.body.collider, new Set(['core', 'crate']))) {
        const dynamic = this.dynamics.get(record.tag.id)
        if (dynamic?.carriedBy) this.dropCarried(dynamic)
      }
      // Kinematic carried bodies do not always produce an intersection pair
      // when their target is advanced in the same Rapier step. Use the authored
      // collider bounds only to detect contact and release the object; never
      // move or reset its transform here.
      const gatePosition = device.body.body.translation()
      const gateSize = device.definition.size ?? [0.6, 0.6, 0.6]
      for (const dynamic of this.dynamics.values()) {
        if (!dynamic.carriedBy) continue
        const p = dynamic.body.body.translation()
        if (Math.abs(p.x - gatePosition.x) <= gateSize[0] / 2 + 0.5
          && Math.abs(p.y - gatePosition.y) <= gateSize[1] / 2 + 0.6
          && Math.abs(p.z - gatePosition.z) <= gateSize[2] / 2 + 0.5) {
          this.dropCarried(dynamic)
        }
      }
    }
  }

  /**
   * Spatial transfer-lane shutter. The shutter is closed by default and physically
   * blocks dynamic cores/crates (it has a real collider, not a sensor). It opens
   * only when the live Player is currently located on the EAST side of the
   * shutter (the `openZone` field of the device definition, or any position east
   * of the shutter's center x by default). When opened, the body is translated
   * downward so the lane is clear; when closed, the body sits in the lane.
   *
   * This deliberately ignores provenance facts (`EchoUsed`, `CoreThrownByEcho`,
   * etc.) so the shutter state never leaks from a previous recording timeline.
   */
  private updateShutters(actors: readonly ActorContext[]): void {
    if (this.chapter !== 3 && this.chapter !== 5) return
    for (const [, device] of this.devices) {
      if (device.definition.kind !== 'shutter' || !device.body) continue
      const size = device.definition.size ?? [1.4, 1.4, 1.6]
      const openAtX = device.definition.openAtX ?? 0
      const player = actors.find((a) => a.kind === 'player')
      const isOpen = !!player && player.position.x >= openAtX
      this.physics.setShutterOpen(device.body.collider, isOpen)
      // The authored transform is immutable. Opening lowers the full collider
      // beneath the lower floor instead of stacking offsets every tick or
      // raising it into the Core's flight path.
      const closedY = device.basePosition.y
      const openY = -size[1] - 0.5
      const target = {
        x: device.basePosition.x,
        y: isOpen ? openY : closedY,
        z: device.basePosition.z,
      }
      const t = device.body.body.translation()
      // Only move when the body is meaningfully off target — avoids jitter.
      if (Math.abs(t.x - target.x) > 0.01 || Math.abs(t.y - target.y) > 0.01 || Math.abs(t.z - target.z) > 0.01) {
        device.body.body.setNextKinematicTranslation(target)
        if (device.root) device.root.position.set(target.x, target.y, target.z)
      }
      const wasOpen = this.shutters.get(device.definition.id)
      this.shutters.set(device.definition.id, isOpen)
      const spatialFact = `${device.definition.id}:player-east`
      if (isOpen) this.facts.add(spatialFact)
      else this.facts.delete(spatialFact)
      // A rewind can place the live Player directly on the east side. Treat an
      // uninitialized-but-open shutter as a real opening so the HUD feedback
      // is tied to its physical state rather than a hard-coded player X value.
      if (isOpen && wasOpen !== true) this.emitAudio({ type: 'shutter', id: device.definition.id, open: true })
      else if (!isOpen && wasOpen === true) this.emitAudio({ type: 'shutter', id: device.definition.id, open: false })
    }
  }

  private updateOneWayWalls(actors: readonly ActorContext[]): void {
    for (const [, device] of this.devices) {
      if (device.definition.kind !== 'one-way-wall' || !device.body) continue
      // This is never an opening door. CharacterMotor ignores its collider only
      // for a live Player moving WEST→EAST. Echo and physical Core bodies always
      // collide, and a Player on the east side cannot return through it.
      const player = actors.find((actor) => actor.kind === 'player')
      const playerOnWestSide = player !== undefined && player.position.x < device.basePosition.x - 0.05
      const playerOnEastSide = player !== undefined && player.position.x > device.basePosition.x + 0.05
      this.physics.setOneWayWallOpen(device.body.collider, false)
      device.body.tag.nonBlocking = false
      const target = this.vec(device.basePosition)
      const t = device.body.body.translation()
      if (Math.abs(t.x - target.x) > 0.01 || Math.abs(t.y - target.y) > 0.01 || Math.abs(t.z - target.z) > 0.01) {
        device.body.body.setNextKinematicTranslation(target)
        if (device.root) device.root.position.set(target.x, target.y, target.z)
      }
      this.setOneWayWallPresentation(device.root, playerOnWestSide, playerOnEastSide)
    }
  }

  private buildWatcherCharacter(root: THREE.Object3D): void {
    const animator = this.assets.createWatcherCharacter?.() ?? createAnimatedActor({
      cloth: 0x16483e,
      armor: 0x27333d,
      glow: 0xff5c79,
      skin: 0xeadcc5,
    })
    this.enemyAnimator = animator
    animator.root.name = 'WatcherCharacter'
    animator.root.scale.setScalar(1.04)
    root.add(animator.root)

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x8cecff,
      emissive: 0x49d9ff,
      emissiveIntensity: 2.6,
      roughness: 0.22,
      metalness: 0.28,
    })
    this.materials.push(eyeMaterial)
    const sensorEye = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(0.075, 14, 10)), eyeMaterial)
    sensorEye.name = 'WatcherSensorEye'
    sensorEye.position.set(0, 0.72, 0.5)
    sensorEye.userData.presentationOverlay = true
    this.watcherSensorEye = sensorEye

    const statusMaterial = new THREE.MeshStandardMaterial({
      color: 0x8cecff,
      emissive: 0x49d9ff,
      emissiveIntensity: 1.9,
      transparent: true,
      opacity: 0.86,
      roughness: 0.2,
      metalness: 0.34,
      depthWrite: false,
    })
    this.materials.push(statusMaterial)
    const statusRing = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.31, 0.035, 8, 28)), statusMaterial)
    statusRing.name = 'WatcherStatusRing'
    statusRing.position.y = 1.34
    statusRing.rotation.x = Math.PI / 2
    statusRing.userData.presentationOverlay = true
    this.watcherStatusRing = statusRing

    const sectorMaterial = new THREE.MeshBasicMaterial({
      color: 0x49d9ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    this.materials.push(sectorMaterial)
    const sector = new THREE.Mesh(this.createWatcherSectorGeometry(), sectorMaterial)
    sector.name = 'WatcherVisionSector'
    sector.position.y = -0.88
    sector.renderOrder = 2
    sector.userData.presentationOverlay = true
    this.watcherVisionSector = sector

    const boundaryMaterial = new THREE.LineBasicMaterial({
      color: 0x8cecff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    })
    this.materials.push(boundaryMaterial)
    const boundary = new THREE.LineSegments(this.createWatcherBoundaryGeometry(), boundaryMaterial)
    boundary.name = 'WatcherVisionBoundary'
    boundary.position.y = -0.865
    boundary.renderOrder = 3
    boundary.userData.presentationOverlay = true
    this.watcherVisionBoundary = boundary

    const beamMaterial = new THREE.LineBasicMaterial({
      color: 0xff5c79,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
    this.materials.push(beamMaterial)
    const beamGeometry = this.geometry(new THREE.BufferGeometry())
    beamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3))
    const targetBeam = new THREE.Line(beamGeometry, beamMaterial)
    targetBeam.name = 'WatcherTargetBeam'
    targetBeam.visible = false
    targetBeam.frustumCulled = false
    targetBeam.userData.presentationOverlay = true
    this.watcherTargetBeam = targetBeam

    root.add(sector, boundary, targetBeam, sensorEye, statusRing)
    this.updateWatcherVisionGeometry(this.enemyFovRadians())
  }

  private buildGuardianCharacter(root: THREE.Object3D): void {
    const animator = this.assets.createGuardianCharacter?.() ?? createAnimatedActor({
      cloth: 0x24183c,
      armor: 0x6e5aa8,
      glow: 0xc881ff,
      skin: 0xd7c9b5,
    })
    this.enemyAnimator = animator
    animator.root.name = 'GuardianCharacter'
    animator.root.scale.setScalar(1.16)
    root.add(animator.root)

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc98cff,
      emissive: 0x9e52ec,
      emissiveIntensity: 2.4,
      roughness: 0.2,
      metalness: 0.35,
    })
    this.materials.push(eyeMaterial)
    const sensorEye = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(0.085, 14, 10)), eyeMaterial)
    sensorEye.name = 'GuardianSensorEye'
    sensorEye.position.set(0, 0.78, 0.54)
    sensorEye.userData.presentationOverlay = true
    this.watcherSensorEye = sensorEye

    const statusMaterial = new THREE.MeshStandardMaterial({
      color: 0xa96fff,
      emissive: 0x7439c2,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.9,
      roughness: 0.2,
      metalness: 0.42,
      depthWrite: false,
    })
    this.materials.push(statusMaterial)
    const statusRing = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.37, 0.042, 8, 30)), statusMaterial)
    statusRing.name = 'GuardianStatusRing'
    statusRing.position.y = 1.48
    statusRing.rotation.x = Math.PI / 2
    statusRing.userData.presentationOverlay = true
    this.watcherStatusRing = statusRing

    const shieldMaterial = new THREE.MeshStandardMaterial({
      color: 0xff5e7a,
      emissive: 0xb21f49,
      emissiveIntensity: 2.4,
      transparent: true,
      opacity: 0.82,
      roughness: 0.22,
      metalness: 0.62,
      depthWrite: false,
    })
    this.materials.push(shieldMaterial)
    const frontShield = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.54, 0.065, 8, 32)), shieldMaterial)
    frontShield.name = 'GuardianFrontShield'
    frontShield.position.set(0, 0.82, 0.5)
    frontShield.userData.presentationOverlay = true
    this.guardianFrontShield = frontShield

    const sealMaterial = new THREE.MeshStandardMaterial({
      color: 0xc881ff,
      emissive: 0x8e3fd9,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.92,
      roughness: 0.18,
      metalness: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    this.materials.push(sealMaterial)
    const rearSeal = new THREE.Mesh(this.geometry(new THREE.CircleGeometry(0.22, 6)), sealMaterial)
    rearSeal.name = 'GuardianRearSeal'
    rearSeal.position.set(0, 0.86, -0.48)
    rearSeal.rotation.y = Math.PI
    rearSeal.userData.presentationOverlay = true
    this.guardianRearSeal = rearSeal
    const rearSealRingMaterial = sealMaterial.clone()
    this.materials.push(rearSealRingMaterial)
    const rearSealRing = new THREE.Mesh(
      this.geometry(new THREE.TorusGeometry(0.29, 0.04, 8, 24)),
      rearSealRingMaterial,
    )
    rearSealRing.name = 'GuardianRearSealRing'
    rearSealRing.position.copy(rearSeal.position)
    rearSealRing.rotation.y = Math.PI
    rearSealRing.userData.presentationOverlay = true
    this.guardianRearSealRing = rearSealRing

    const sectorMaterial = new THREE.MeshBasicMaterial({
      color: 0x8e6dff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    this.materials.push(sectorMaterial)
    const sector = new THREE.Mesh(this.createWatcherSectorGeometry(), sectorMaterial)
    sector.name = 'GuardianVisionSector'
    sector.position.y = -0.83
    sector.renderOrder = 2
    sector.userData.presentationOverlay = true
    this.watcherVisionSector = sector

    const boundaryMaterial = new THREE.LineBasicMaterial({
      color: 0xb995ff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    })
    this.materials.push(boundaryMaterial)
    const boundary = new THREE.LineSegments(this.createWatcherBoundaryGeometry(), boundaryMaterial)
    boundary.name = 'GuardianVisionBoundary'
    boundary.position.y = -0.815
    boundary.renderOrder = 3
    boundary.userData.presentationOverlay = true
    this.watcherVisionBoundary = boundary

    const beamMaterial = new THREE.LineBasicMaterial({
      color: 0xd66bff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    })
    this.materials.push(beamMaterial)
    const beamGeometry = this.geometry(new THREE.BufferGeometry())
    beamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3))
    const targetBeam = new THREE.Line(beamGeometry, beamMaterial)
    targetBeam.name = 'GuardianTargetBeam'
    targetBeam.visible = false
    targetBeam.frustumCulled = false
    targetBeam.userData.presentationOverlay = true
    this.watcherTargetBeam = targetBeam

    root.add(sector, boundary, targetBeam, sensorEye, statusRing, frontShield, rearSeal, rearSealRing)
    this.updateWatcherVisionGeometry(this.enemyFovRadians())
  }

  private buildParadoxGuidance(): void {
    const addRoute = (
      name: string,
      points: THREE.Vector3[],
      color: number,
      opacity: number,
    ): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> => {
      const geometry = this.geometry(new THREE.BufferGeometry().setFromPoints(points))
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
      this.materials.push(material)
      const line = new THREE.Line(geometry, material)
      line.name = name
      line.renderOrder = 2
      line.userData.presentationOverlay = true
      this.root.add(line)
      return line
    }

    addRoute('ParadoxEchoRoute', [
      new THREE.Vector3(-7.4, 0.49, 2.7),
      new THREE.Vector3(-6.2, 0.49, 2.55),
      new THREE.Vector3(0.9, 0.49, 2.55),
      new THREE.Vector3(-3.7, 0.5, 1.1),
      new THREE.Vector3(-1.75, 0.5, -2.55),
    ], 0xa56dff, 0.58)
    addRoute('ParadoxPlayerRoute', [
      new THREE.Vector3(-7.4, 0.5, 2.25),
      new THREE.Vector3(-5.1, 0.5, -2.55),
      new THREE.Vector3(3.2, 0.5, -2.55),
      new THREE.Vector3(4.7, 0.5, 2.55),
      new THREE.Vector3(7.2, 0.5, 0.2),
      new THREE.Vector3(5.15, 0.53, -2.65),
    ], 0x61e7ff, 0.5)
    addRoute('ReceiverPlatformCable', [
      new THREE.Vector3(7.2, 0.56, 0.2),
      new THREE.Vector3(6.3, 0.56, -1.1),
      new THREE.Vector3(5.15, 0.56, -2.65),
      new THREE.Vector3(4.15, 0.56, -2.65),
    ], 0x5effc7, 0.68)
    this.guardianLowerTether = addRoute('GuardianLowerSealTether', [
      new THREE.Vector3(-1.75, 0.78, -2.55),
      new THREE.Vector3(0.8, 2.76, 0.85),
    ], 0xc15bf2, 0.08)

    const arenaMaterial = new THREE.MeshBasicMaterial({
      color: 0xc15bf2,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    })
    this.materials.push(arenaMaterial)
    const arena = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(1.45, 0.035, 8, 48)), arenaMaterial)
    arena.name = 'GuardianArenaRing'
    arena.position.set(0.8, 1.48, 0.85)
    arena.rotation.x = Math.PI / 2
    arena.userData.presentationOverlay = true
    this.root.add(arena)

    const finalGuide = new THREE.Group()
    finalGuide.name = 'FinalEscapeGuide'
    const beaconGeometry = this.geometry(new THREE.OctahedronGeometry(0.1, 0))
    const beaconMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd47a,
      emissive: 0xff8a3d,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.32,
      roughness: 0.22,
      metalness: 0.25,
      depthWrite: false,
    })
    this.materials.push(beaconMaterial)
    for (let index = 0; index < 6; index += 1) {
      const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial)
      beacon.name = `FinalEscapeBeacon${index + 1}`
      beacon.position.set(8.25, 3.54, 0.15 + index * 0.5)
      beacon.userData.presentationOverlay = true
      finalGuide.add(beacon)
    }
    finalGuide.visible = false
    this.finalEscapeGuide = finalGuide
    this.root.add(finalGuide)
  }

  private createWatcherSectorGeometry(): THREE.BufferGeometry {
    const segments = 32
    const geometry = this.geometry(new THREE.BufferGeometry())
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((segments + 2) * 3), 3))
    const indices: number[] = []
    for (let index = 0; index < segments; index += 1) indices.push(0, index + 1, index + 2)
    geometry.setIndex(indices)
    return geometry
  }

  private createWatcherBoundaryGeometry(): THREE.BufferGeometry {
    const segments = 32
    const geometry = this.geometry(new THREE.BufferGeometry())
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((segments + 2) * 2 * 3), 3))
    return geometry
  }

  /**
   * Chapter 3's middle passage is deliberately independent of the southern
   * one-way wall. Its only authority is the actual receiver device: once the
   * Core is seated, the live Player may pass, while Echo and Core collision
   * remains enabled even though the visible panels retract.
   */
  private updateReturnGates(silent = false): void {
    const receiver = this.devices.get('core-receiver')
    const open = receiver?.active === true
    for (const device of this.devices.values()) {
      if (device.definition.kind !== 'return-gate' || !device.body) continue
      const wasOpen = device.active
      device.active = open
      device.body.tag.playerReturnPassOpen = open
      this.setReturnGatePresentation(device.root, open)
      if (!silent && wasOpen !== open) this.emitAudio({ type: 'door', id: device.definition.id, open })
    }
  }
  private updateEnemy(actors: readonly ActorContext[]): void {
    const id = this.chapter === 5 ? 'guardian' : 'watcher'
    const enemy = this.devices.get(id)
    if (!enemy?.body || this.enemyDefeated) {
      if (enemy && this.enemyDefeated) {
        if (this.chapter === 4) enemy.root.rotation.z = THREE.MathUtils.lerp(enemy.root.rotation.z, Math.PI / 2, 0.08)
        this.updateEnemyPresentation(enemy)
      }
      return
    }
    if (this.chapter === 5 && !this.facts.has('core-receiver')) {
      this.enemyState = 'dormant'
      this.enemyTarget = undefined
      this.enemyTargetVisible = false
      this.enemyTargetLockTicks = 0
      this.enemyDetection = 0
      this.enemyAlertTicks = 0
      this.enemySearchTicks = 0
      this.enemyRecoveryTicks = 0
      this.enemyStimulusTicks = 0
      enemy.root.position.copy(enemy.basePosition)
      const lowerSeal = this.devices.get('lower-seal')
      if (lowerSeal) this.faceEnemy(enemy, lowerSeal.root.position.clone().sub(enemy.root.position).setY(0))
      enemy.body.body.setNextKinematicTranslation(this.vec(enemy.root.position))
      enemy.body.body.setNextKinematicRotation({
        x: enemy.root.quaternion.x,
        y: enemy.root.quaternion.y,
        z: enemy.root.quaternion.z,
        w: enemy.root.quaternion.w,
      })
      this.updateEnemyPresentation(enemy)
      return
    }
    if (this.chapter === 5 && this.enemyState === 'dormant') {
      this.enemyState = 'alert'
      this.enemyAlertTicks = ENEMY_ALERT_TICKS
    }
    const echo = actors.find((actor) => actor.kind === 'echo')
    const player = actors.find((actor) => actor.kind === 'player')
    const seesEcho = echo ? this.hasLineOfSight(enemy.root.position, echo.position) : false
    const seesPlayer = player ? this.hasLineOfSight(enemy.root.position, player.position) : false
    const visibleActors = [
      ...(echo && seesEcho ? [echo] : []),
      ...(player && seesPlayer ? [player] : []),
    ]
    const retainedTarget = visibleActors.find((actor) => actor.kind === this.enemyTarget)
    const targetLockActive = this.chapter === 4
      && this.enemyTarget !== undefined
      && this.enemyTargetLockTicks > 0
    const lowerSealEcho = this.chapter === 5
      && echo
      && seesEcho
      && this.deviceHeldBy('lower-seal', 'echo')
      ? echo
      : undefined
    const visibleTarget = lowerSealEcho ?? retainedTarget ?? (targetLockActive
      ? undefined
      : visibleActors
          .sort((a, b) => a.position.distanceToSquared(enemy.root.position) - b.position.distanceToSquared(enemy.root.position))[0])

    if (visibleTarget) {
      const changedTarget = this.enemyTarget !== visibleTarget.kind
      this.enemyTarget = visibleTarget.kind
      this.enemyTargetVisible = true
      this.enemyLastKnown.copy(visibleTarget.position)
      this.enemySearchTicks = ENEMY_SEARCH_TICKS
      this.enemyRecoveryTicks = 0
      this.enemyStimulusTicks = 0
      if (this.chapter === 4) this.enemyTargetLockTicks = WATCHER_TARGET_LOCK_TICKS
      if (changedTarget || ['patrol', 'investigate', 'recovery'].includes(this.enemyState)) {
        this.enemyAlertTicks = ENEMY_ALERT_TICKS
      }
      if (this.enemyAlertTicks > 0) {
        this.enemyState = 'alert'
        this.enemyAlertTicks -= 1
      } else if (this.chapter === 5 && visibleTarget.kind === 'echo' && lowerSealEcho) {
        this.enemyState = 'lure-hold'
      } else {
        this.enemyState = 'chase'
      }
      if (visibleTarget.kind === 'echo') {
        this.facts.add(this.chapter === 5 ? 'guardian-target-echo' : 'lured-by-echo')
        this.enemyDetection = Math.max(0, this.enemyDetection - 1 / 45)
      } else if (this.chapter === 4) {
        // Detection is a readable warning meter. Failure now requires the
        // Watcher to physically catch the present Player, never remote damage.
        this.enemyDetection = Math.min(1, this.enemyDetection + 1 / 75)
      }
    } else {
      const hadTarget = this.enemyTarget !== undefined
      this.enemyTargetVisible = false
      this.enemyAlertTicks = 0
      this.enemyDetection = Math.max(0, this.enemyDetection - 1 / 180)
      if (this.enemyTargetLockTicks > 0) this.enemyTargetLockTicks -= 1
      else this.enemyTarget = undefined
      if (this.enemyStimulusTicks > 0) {
        this.enemyStimulusTicks -= 1
        this.enemyLastKnown.copy(this.enemyStimulusPosition)
        this.enemySearchTicks = Math.max(this.enemySearchTicks, this.enemyStimulusTicks)
        this.enemyState = 'investigate'
      } else if (hadTarget || this.enemySearchTicks > 0) {
        this.enemySearchTicks = Math.max(0, this.enemySearchTicks - 1)
        this.enemyState = 'investigate'
        if (this.enemySearchTicks === 0) this.enemyRecoveryTicks = ENEMY_RECOVERY_TICKS
      } else if (this.enemyRecoveryTicks > 0) {
        this.enemyRecoveryTicks -= 1
        this.enemyState = 'recovery'
      } else {
        this.enemyState = 'patrol'
      }
    }
    if (this.enemyKnock.lengthSq() > 0.0001) {
      this.moveEnemy(enemy, this.enemyKnock)
      this.enemyKnock.multiplyScalar(0.92)
      this.enemyState = 'knocked'
    } else if (visibleTarget) {
      const direction = visibleTarget.position.clone().sub(enemy.root.position).setY(0)
      const distance = direction.length()
      this.faceEnemy(enemy, direction)
      if (this.enemyState === 'chase' && distance > 0.75) {
        if (this.chapter === 4 && visibleTarget.kind === 'echo') {
          const lurePosition = this.watcherLurePosition(visibleTarget.position)
          const lureDirection = lurePosition.sub(enemy.root.position).setY(0)
          if (lureDirection.length() > 0.18) {
            this.moveEnemy(enemy, lureDirection.normalize().multiplyScalar(WATCHER_ECHO_LURE_SPEED))
          } else {
            // The Watcher wants the Echo, but will not voluntarily step onto
            // the spikes. This is the stable rear-strike window for the Player.
            this.enemyState = 'lure-hold'
          }
        } else {
          const speed = this.chapter === 5 ? GUARDIAN_CHASE_SPEED : WATCHER_CHASE_SPEED
          this.moveEnemy(enemy, direction.normalize().multiplyScalar(speed))
        }
      }
      if (
        this.chapter === 5
        && visibleTarget.kind === 'player'
        && this.enemyState === 'chase'
        && distance < GUARDIAN_CONTACT_DISTANCE
        && Math.abs(visibleTarget.position.y - enemy.root.position.y) < GUARDIAN_CONTACT_VERTICAL_DELTA
      ) {
        this.failed = true
        this.failureReason = 'guardian'
      }
      if (
        this.chapter === 4
        && visibleTarget.kind === 'player'
        && this.enemyState === 'chase'
        && distance < WATCHER_CONTACT_DISTANCE
        && Math.abs(visibleTarget.position.y - enemy.root.position.y) < WATCHER_CONTACT_VERTICAL_DELTA
      ) {
        this.failed = true
        this.failureReason = 'seen'
      }
    } else if (this.enemyState === 'investigate') {
      const direction = this.enemyLastKnown.clone().sub(enemy.root.position).setY(0)
      if (this.chapter === 5) {
        this.faceEnemy(enemy, direction)
      } else if (direction.length() > 0.28) {
        this.faceEnemy(enemy, direction)
        this.moveEnemy(enemy, direction.normalize().multiplyScalar(0.021))
      } else {
        this.enemyForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.018).normalize()
        enemy.root.rotation.y = Math.atan2(this.enemyForward.x, this.enemyForward.z)
      }
    } else if (this.enemyState === 'recovery') {
      if (enemy.definition.to) {
        const patrolTarget = this.enemyDirection > 0 ? positionOf(enemy.definition.to) : enemy.basePosition
        this.faceEnemy(enemy, patrolTarget.sub(enemy.root.position).setY(0))
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
    } else if (this.enemyState === 'patrol') {
      // Stationary sentries still sweep their authored field instead of
      // behaving as a frozen trigger volume.
      this.enemyForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.006).normalize()
      enemy.root.rotation.y = Math.atan2(this.enemyForward.x, this.enemyForward.z)
    }
    enemy.body.body.setNextKinematicTranslation(this.vec(enemy.root.position))
    enemy.body.body.setNextKinematicRotation({
      x: enemy.root.quaternion.x,
      y: enemy.root.quaternion.y,
      z: enemy.root.quaternion.z,
      w: enemy.root.quaternion.w,
    })
    this.updateEnemyPresentation(enemy, visibleTarget?.position)
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
    if (!this.enemyDefeated && hasEnemy && this.enemyState === 'knocked') {
      this.enemyDefeated = true
      this.enemyState = 'trapped'
      this.enemyTargetVisible = false
      this.enemyTargetLockTicks = 0
      this.facts.add('watcher-trapped')
      this.spawnWave(trap.root.position, 0xe95757)
    }
    // The beacon makes the spikes read as the intended knockback target.
    // It intensifies while the Watcher is committed at the trap edge.
    const redColor = 0xe95757
    const watcherCommitted = hasEnemy || this.enemyState === 'lure-hold'
    const pulse = 1 + Math.sin(this.currentTick * 0.2) * 0.18
    const targetHousing = watcherCommitted ? 1.6 * pulse : 0.35
    const targetRails = watcherCommitted ? 2.4 * pulse : 0.7
    const targetSpikes = watcherCommitted ? 2.6 * pulse : 0.9
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
    const targetRing = trap.root.getObjectByName('TrapTargetRing')
    if (targetRing instanceof THREE.Mesh && targetRing.material instanceof THREE.MeshStandardMaterial) {
      targetRing.material.emissive.setHex(redColor)
      targetRing.material.emissiveIntensity = watcherCommitted ? 3.4 * pulse : 1.45 * pulse
      targetRing.scale.setScalar(watcherCommitted ? 1.05 + 0.06 * Math.sin(this.currentTick * 0.2) : 1)
    }
    const lureBeacon = trap.root.getObjectByName('TrapLureBeacon')
    if (lureBeacon instanceof THREE.Mesh && lureBeacon.material instanceof THREE.MeshStandardMaterial) {
      lureBeacon.material.emissive.setHex(redColor)
      lureBeacon.material.emissiveIntensity = watcherCommitted ? 2.6 * pulse : 0.8
      lureBeacon.material.opacity = this.enemyDefeated ? 0.03 : watcherCommitted ? 0.28 : 0.1
    }
    const trapLight = trap.root.getObjectByName('TrapTargetLight')
    if (trapLight instanceof THREE.PointLight) {
      trapLight.intensity = this.enemyDefeated ? 0.25 : watcherCommitted ? 3.3 * pulse : 1.1
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
      if (upperHeldByPlayer) this.facts.add('upper-seal-player')
      else this.facts.delete('upper-seal-player')
      if (
        lowerHeldByEcho
        && upperHeldByPlayer
        && this.facts.has('core-receiver')
        && this.facts.has('guardian-defeated')
        && !this.facts.has('dual-seal')
      ) {
        this.facts.add('dual-seal')
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
    const physicalCoreCarry = (this.chapter === 3 || this.chapter === 5) && dynamic.body.tag.kind === 'core'
    dynamic.body.collider.setSensor(!physicalCoreCarry)
    this.physics.setDynamicCollisionMode(dynamic.body.collider, physicalCoreCarry)
    dynamic.redirectedCurrentFlight = false
    dynamic.body.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true)
    this.placeCarriedObject(dynamic, actor, true)
    // Catching transfers the physical Core only; no pickup-time objective state is synthesized.
  }

  private dropCarried(dynamic: DynamicRecord): void {
    dynamic.carriedBy = undefined
    dynamic.body.tag.carried = false
    dynamic.body.collider.setSensor(false)
    this.physics.setDynamicCollisionMode(dynamic.body.collider, true)
    dynamic.body.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
    dynamic.body.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    // 직후 catch volume에 재 pickup 방지 (0.5초 cooldown)
    dynamic.recentlyDropped = 30
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
    // Ch3 removed: 'core-route-complete' (only ever added if 'core-redirected' was present).
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
      return this.facts.has('watcher-trapped')
    }
    return this.facts.has('final-door-opened')
      && this.escapeTicks > 0
  }

  private chapterFiveDoorReleased(): boolean {
    return this.facts.has('core-receiver')
      && this.facts.has('guardian-defeated')
      && this.facts.has('dual-seal')
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

  private requiredFacts(): string[] {
    if (this.chapter === 0) return []
    if (this.chapter === 1) return ['tutorial-lever', 'echo-plate']
    if (this.chapter === 2) return ['lift-lever-echo', 'elevator-ridden', 'cargo-plate']
    if (this.chapter === 3) return ['receiver-filled']
    if (this.chapter === 4) return ['watcher-trapped']
    return ['core-receiver', 'guardian-defeated', 'final-door-opened']
  }

  private hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const eye = from.clone().add(new THREE.Vector3(0, 0.62, 0))
    const target = to.clone().add(new THREE.Vector3(0, 0.62, 0))
    const direction = target.clone().sub(eye)
    const distance = direction.length()
    const fovRadians = this.enemyFovRadians()
    if (!canSeeTarget({
      position: this.vec(eye), forward: this.vec(this.enemyForward), range: this.enemyViewRange(),
      fovRadians, maxVerticalDelta: 5,
    }, { position: this.vec(target), radius: 0.32 })) return false
    const hit = this.physics.castRay(
      this.vec(eye),
      this.vec(direction.normalize()),
      distance,
      ENEMY_RAY_EXCLUSIONS,
      SOLID_SIGHT_KINDS,
    )
    return !hit
  }

  private enemyFovRadians(): number {
    return this.enemyState === 'patrol'
      ? Math.PI * 0.62
      : this.enemyState === 'recovery'
        ? Math.PI * 0.72
        : Math.PI * 0.94
  }

  private enemyViewRange(): number {
    return this.chapter === 5 ? 8.5 : 7.2
  }

  private updateWatcherVisionGeometry(fovRadians: number): void {
    const sector = this.watcherVisionSector
    const boundary = this.watcherVisionBoundary
    if (!sector || !boundary || Math.abs(this.watcherVisionFov - fovRadians) < 0.0001) return
    this.watcherVisionFov = fovRadians
    const range = this.enemyViewRange()
    const segments = 32
    const sectorAttribute = sector.geometry.getAttribute('position') as THREE.BufferAttribute
    const sectorPositions = sectorAttribute.array as Float32Array
    sectorPositions.set([0, 0, 0], 0)
    const points: THREE.Vector3[] = []
    for (let index = 0; index <= segments; index += 1) {
      const angle = -fovRadians / 2 + (fovRadians * index) / segments
      const point = new THREE.Vector3(Math.sin(angle) * range, 0, Math.cos(angle) * range)
      points.push(point)
      sectorPositions.set([point.x, point.y, point.z], (index + 1) * 3)
    }
    sectorAttribute.needsUpdate = true
    sector.geometry.computeBoundingSphere()

    const boundaryAttribute = boundary.geometry.getAttribute('position') as THREE.BufferAttribute
    const boundaryPositions = boundaryAttribute.array as Float32Array
    let cursor = 0
    const writePoint = (point: THREE.Vector3): void => {
      boundaryPositions.set([point.x, point.y, point.z], cursor)
      cursor += 3
    }
    const center = new THREE.Vector3()
    writePoint(center)
    writePoint(points[0] ?? center)
    writePoint(center)
    writePoint(points.at(-1) ?? center)
    for (let index = 0; index < segments; index += 1) {
      writePoint(points[index] ?? center)
      writePoint(points[index + 1] ?? center)
    }
    boundaryAttribute.needsUpdate = true
    boundary.geometry.computeBoundingSphere()
  }

  private updateEnemyPresentation(enemy: DeviceRecord, visibleTarget?: THREE.Vector3): void {
    if (this.chapter !== 4 && this.chapter !== 5) return
    const guardian = this.chapter === 5
    const dormant = guardian && this.enemyState === 'dormant'
    const defeated = this.enemyDefeated || this.enemyState === 'trapped'
    const acquired = this.enemyTargetVisible && Boolean(visibleTarget)
    const searching = ['alert', 'investigate'].includes(this.enemyState)
    const color = dormant
      ? 0x625b72
      : acquired
        ? guardian && this.enemyTarget === 'echo' ? 0xd66bff : 0xff4f6d
        : searching ? 0xffbd4a : guardian ? 0xa579ff : 0x49d9ff
    const pulse = 1 + Math.sin(this.currentTick * 0.22) * (acquired ? 0.13 : 0.045)

    this.updateWatcherVisionGeometry(this.enemyFovRadians())
    if (this.watcherVisionSector) {
      this.watcherVisionSector.visible = !defeated && !dormant
      this.watcherVisionSector.material.color.setHex(color)
      this.watcherVisionSector.material.opacity = acquired
        ? 0.18 + this.enemyDetection * 0.12
        : searching ? 0.15 : 0.1
    }
    if (this.watcherVisionBoundary) {
      this.watcherVisionBoundary.visible = !defeated && !dormant
      this.watcherVisionBoundary.material.color.setHex(color)
      this.watcherVisionBoundary.material.opacity = acquired ? 0.98 : searching ? 0.88 : 0.7
    }
    if (this.watcherStatusRing) {
      this.watcherStatusRing.visible = !defeated
      this.watcherStatusRing.material.color.setHex(color)
      this.watcherStatusRing.material.emissive.setHex(color)
      this.watcherStatusRing.material.emissiveIntensity = dormant ? 0.25 : acquired ? 3.2 : searching ? 2.4 : 1.7
      this.watcherStatusRing.material.opacity = dormant ? 0.24 : 0.86
      this.watcherStatusRing.scale.setScalar(pulse)
      this.watcherStatusRing.rotation.z = this.currentTick * 0.012
    }
    if (this.watcherSensorEye) {
      this.watcherSensorEye.visible = !defeated
      this.watcherSensorEye.material.color.setHex(color)
      this.watcherSensorEye.material.emissive.setHex(color)
      this.watcherSensorEye.material.emissiveIntensity = dormant ? 0.16 : acquired ? 4.5 : searching ? 3.2 : 2.4
      this.watcherSensorEye.scale.setScalar(pulse)
    }
    if (this.watcherTargetBeam) {
      this.watcherTargetBeam.visible = acquired && !dormant && !defeated
      this.watcherTargetBeam.material.color.setHex(color)
      if (acquired && visibleTarget) {
        enemy.root.updateMatrixWorld(true)
        const localTarget = enemy.root.worldToLocal(visibleTarget.clone())
        const position = this.watcherTargetBeam.geometry.getAttribute('position') as THREE.BufferAttribute
        position.setXYZ(0, 0, 0.72, 0.5)
        position.setXYZ(1, localTarget.x, localTarget.y, localTarget.z)
        position.needsUpdate = true
        this.watcherTargetBeam.geometry.computeBoundingSphere()
      }
    }

    if (guardian) {
      const exposed = acquired
        && this.enemyTarget === 'echo'
        && this.deviceHeldBy('lower-seal', 'echo')
        && !defeated
      if (this.guardianFrontShield) {
        this.guardianFrontShield.visible = !defeated
        this.guardianFrontShield.material.color.setHex(exposed ? 0x8c6ab8 : dormant ? 0x4f465b : 0xff5e7a)
        this.guardianFrontShield.material.emissive.setHex(exposed ? 0x3a2358 : dormant ? 0x231d2a : 0xb21f49)
        this.guardianFrontShield.material.emissiveIntensity = exposed ? 0.45 : dormant ? 0.12 : 2.6
        this.guardianFrontShield.material.opacity = exposed ? 0.22 : dormant ? 0.26 : 0.82
        this.guardianFrontShield.scale.setScalar(dormant ? 0.96 : pulse)
      }
      if (this.guardianRearSeal) {
        this.guardianRearSeal.visible = !defeated
        this.guardianRearSeal.material.emissiveIntensity = exposed ? 5.2 : dormant ? 0.18 : 1.1
        this.guardianRearSeal.material.opacity = exposed ? 1 : dormant ? 0.22 : 0.58
        this.guardianRearSeal.scale.setScalar(exposed ? pulse * 1.14 : 1)
      }
      if (this.guardianRearSealRing) {
        this.guardianRearSealRing.visible = !defeated
        this.guardianRearSealRing.material.emissiveIntensity = exposed ? 4.4 : dormant ? 0.12 : 0.9
        this.guardianRearSealRing.material.opacity = exposed ? 0.96 : dormant ? 0.18 : 0.5
        this.guardianRearSealRing.rotation.z = exposed ? -this.currentTick * 0.025 : 0
      }
      if (this.guardianLowerTether) {
        this.guardianLowerTether.visible = !defeated
        this.guardianLowerTether.material.opacity = exposed
          ? 0.86
          : this.facts.has('core-receiver') ? 0.2 : 0.06
        this.guardianLowerTether.material.color.setHex(exposed ? 0xe589ff : 0x7b5a9b)
      }
      const arena = this.root.getObjectByName('GuardianArenaRing')
      if (arena instanceof THREE.Mesh && arena.material instanceof THREE.MeshBasicMaterial) {
        arena.material.color.setHex(dormant ? 0x5b5269 : exposed ? 0xd66bff : color)
        arena.material.opacity = dormant ? 0.08 : exposed ? 0.42 : 0.2
        arena.scale.setScalar(exposed ? pulse : 1)
      }
      if (this.finalEscapeGuide) {
        this.finalEscapeGuide.visible = this.escapeTicks > 0 && !this.complete
        const urgency = this.escapeTicks > 0 ? 1 - this.escapeTicks / (CHAPTERS[4]?.escapeTimeTicks ?? 15 * 60) : 0
        const guidePulse = 0.9 + Math.sin(this.currentTick * (0.18 + urgency * 0.3)) * 0.2
        for (const child of this.finalEscapeGuide.children) {
          child.scale.setScalar(guidePulse)
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.opacity = 0.48 + urgency * 0.45
            child.material.emissiveIntensity = 1.8 + urgency * 3.2
          }
        }
      }
    }

    let animation: CharacterState = 'Idle'
    if (defeated) animation = 'Defeat'
    else if (this.enemyState === 'knocked') animation = 'Hit'
    else if (this.enemyState === 'lure-hold') animation = guardian ? 'Interact' : 'Attack'
    else if (this.enemyState === 'chase') animation = 'Run'
    else if (['patrol', 'investigate', 'recovery'].includes(this.enemyState)) animation = 'Walk'
    if (this.enemyAnimator && (this.enemyAnimator.state() !== animation || animation === 'Walk' || animation === 'Run')) {
      this.enemyAnimator.play(animation, animation === 'Run' ? 4.6 : 1.8)
    }
  }

  private faceEnemy(enemy: DeviceRecord, direction: THREE.Vector3): void {
    if (direction.lengthSq() <= 0.0001) return
    this.enemyForward.copy(direction).setY(0).normalize()
    enemy.root.rotation.y = Math.atan2(this.enemyForward.x, this.enemyForward.z)
  }

  private watcherLurePosition(echoPosition: THREE.Vector3): THREE.Vector3 {
    const trap = this.devices.get('spike-trap')
    if (!trap) return echoPosition.clone()
    const awayFromEcho = trap.root.position.clone().sub(echoPosition).setY(0)
    if (awayFromEcho.lengthSq() <= 0.0001) awayFromEcho.copy(this.enemyForward).multiplyScalar(-1)
    return trap.root.position.clone().add(awayFromEcho.normalize().multiplyScalar(WATCHER_TRAP_STANDOFF))
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
    if (!blocked) {
      enemy.root.position.add(displacement)
    }
  }

  /** Make the one-way rule legible from either side without changing physics. */
  private setOneWayWallPresentation(root: THREE.Object3D, playerOnWestSide: boolean, playerOnEastSide: boolean): void {
    this.setPresentationMaterial(root.getObjectByName('OneWayWallPassArrows'), 0x7be9ff, playerOnWestSide ? 2.8 : 0.35)
    this.setPresentationMaterial(root.getObjectByName('OneWayWallLockBars'), 0xff5c79, playerOnEastSide ? 3.1 : 0.38)
    this.setPresentationMaterial(root.getObjectByName('OneWayWallBeacons'), playerOnEastSide ? 0xff5c79 : 0x7be9ff, playerOnEastSide ? 2.5 : 1.7)
    const westField = root.getObjectByName('OneWayWallWestField')
    const eastField = root.getObjectByName('OneWayWallEastField')
    if (westField instanceof THREE.Mesh && westField.material instanceof THREE.MeshBasicMaterial) {
      westField.material.color.setHex(0x5ee4ff)
      westField.material.opacity = playerOnWestSide ? 0.08 : 0.2
    }
    if (eastField instanceof THREE.Mesh && eastField.material instanceof THREE.MeshBasicMaterial) {
      eastField.material.color.setHex(playerOnEastSide ? 0xff5c79 : 0x7f244a)
      eastField.material.opacity = playerOnEastSide ? 0.68 : 0.36
    }
    const light = root.getObjectByName('OneWayWallLight')
    if (light instanceof THREE.PointLight) {
      light.color.setHex(playerOnEastSide ? 0xff5c79 : 0x7be9ff)
      light.intensity = playerOnEastSide ? 2.8 : playerOnWestSide ? 2.5 : 1.25
    }
  }

  /** Visual-only open/closed feedback for the Player-only return gate. */
  private setReturnGatePresentation(root: THREE.Object3D, open: boolean): void {
    const panels = root.getObjectByName('ReturnGateDoorPanels')
    panels?.children.forEach((panel) => {
      const target = Number(open ? panel.userData.openZ : panel.userData.closedZ)
      if (Number.isFinite(target)) panel.position.z = THREE.MathUtils.lerp(panel.position.z, target, 0.22)
    })
    this.setPresentationMaterial(root.getObjectByName('ReturnGateDoorPanels'), open ? 0x63ffd5 : 0xff5c79, open ? 2.4 : 1.35)
    this.setPresentationMaterial(root.getObjectByName('ReturnGateStatusRings'), open ? 0x63ffd5 : 0xff5c79, open ? 3.1 : 1.2)
    const closedField = root.getObjectByName('ReturnGateClosedField')
    if (closedField instanceof THREE.Mesh && closedField.material instanceof THREE.MeshBasicMaterial) {
      closedField.material.color.setHex(0xff5c79)
      closedField.material.opacity = THREE.MathUtils.lerp(closedField.material.opacity, open ? 0.04 : 0.56, 0.22)
    }
    const openField = root.getObjectByName('ReturnGateOpenField')
    if (openField instanceof THREE.Mesh && openField.material instanceof THREE.MeshBasicMaterial) {
      openField.material.color.setHex(0x63ffd5)
      openField.material.opacity = THREE.MathUtils.lerp(openField.material.opacity, open ? 0.34 : 0, 0.22)
    }
    const light = root.getObjectByName('ReturnGateLight')
    if (light instanceof THREE.PointLight) {
      light.color.setHex(open ? 0x63ffd5 : 0xff5c79)
      light.intensity = open ? 3.3 : 2.1
    }
  }

  private setPresentationMaterial(object: THREE.Object3D | undefined, color: number, intensity: number): void {
    object?.traverse((part) => {
      if (!(part instanceof THREE.Mesh) && !(part instanceof THREE.InstancedMesh)) return
      const materials = Array.isArray(part.material) ? part.material : [part.material]
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.color.setHex(color)
          material.emissive.setHex(color)
          material.emissiveIntensity = intensity
        }
      }
    })
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

  private cloneMaterial(material: THREE.Material): THREE.Material {
    const clone = material.clone()
    this.materials.push(clone)
    return clone
  }

  private vec(vector: THREE.Vector3): Vec3 {
    return { x: vector.x, y: vector.y, z: vector.z }
  }
}
