import RAPIER from '@dimforge/rapier3d-compat'

export type Vec3 = { x: number; y: number; z: number }
export type Quaternion = { x: number; y: number; z: number; w: number }

export type PhysicsEntityKind =
  | 'player'
  | 'echo'
  | 'floor'
  | 'wall'
  | 'crate'
  | 'core'
  | 'door'
  | 'plate'
  | 'lever'
  | 'elevator'
  | 'platform'
  | 'trap'
  | 'enemy'
  | 'exit'
  | 'gate'
  | 'shutter'

export type PhysicsTag = {
  id: string
  kind: PhysicsEntityKind
  carried?: boolean
  nonBlocking?: boolean
}

export type BodyRecord = {
  tag: PhysicsTag
  body: RAPIER.RigidBody
  collider: RAPIER.Collider
}

export class RapierWorld {
  readonly world: RAPIER.World
  private readonly records = new Map<string, BodyRecord>()
  private disposed = false

  private constructor() {
    this.world = new RAPIER.World({ x: 0, y: -18, z: 0 })
    this.world.timestep = 1 / 60
  }

  static async create(): Promise<RapierWorld> {
    await RAPIER.init()
    return new RapierWorld()
  }

  createStaticBox(
    id: string,
    kind: PhysicsEntityKind,
    center: Vec3,
    half: Vec3,
    sensor = false,
    rotation?: Quaternion,
  ): BodyRecord {
    const bodyDescription = RAPIER.RigidBodyDesc.fixed().setTranslation(center.x, center.y, center.z)
    if (rotation) bodyDescription.setRotation(rotation)
    const body = this.world.createRigidBody(bodyDescription)
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setSensor(sensor).setFriction(0.92),
      body,
    )
    return this.register({ tag: { id, kind }, body, collider })
  }

  createDynamicBox(id: string, kind: 'crate' | 'core', center: Vec3, half: Vec3, density = 1): BodyRecord {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(center.x, center.y, center.z)
        .setLinearDamping(0.34)
        .setAngularDamping(1.8)
        .setCcdEnabled(kind === 'core'),
    )
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setDensity(density).setFriction(0.82).setRestitution(kind === 'core' ? 0.42 : 0.05),
      body,
    )
    return this.register({ tag: { id, kind }, body, collider })
  }

  createDynamicBall(id: string, center: Vec3, radius: number): BodyRecord {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(center.x, center.y, center.z)
        .setLinearDamping(0.12)
        .setAngularDamping(0.24)
        .setCcdEnabled(true),
    )
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(radius).setDensity(0.82).setFriction(0.46).setRestitution(0.56),
      body,
    )
    return this.register({ tag: { id, kind: 'core' }, body, collider })
  }

  createKinematicBox(id: string, kind: 'door' | 'elevator' | 'platform' | 'enemy', center: Vec3, half: Vec3): BodyRecord {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(center.x, center.y, center.z),
    )
    const collider = this.world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setFriction(0.94), body)
    return this.register({ tag: { id, kind }, body, collider })
  }

  createActor(id: string, kind: 'player' | 'echo', center: Vec3): BodyRecord {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(center.x, center.y, center.z),
    )
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.48, 0.31).setFriction(0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    )
    return this.register({ tag: { id, kind }, body, collider })
  }

  createSensor(id: string, kind: 'plate' | 'lever' | 'trap' | 'exit' | 'gate', center: Vec3, half: Vec3): BodyRecord {
    const record = this.createStaticBox(id, kind, center, half, true)
    record.collider.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL)
    return record
  }

  record(id: string): BodyRecord | undefined {
    return this.records.get(id)
  }

  all(): readonly BodyRecord[] {
    return [...this.records.values()]
  }

  /**
   * Kinematic position-based shutter. The shutter is a physical body that
   * blocks dynamic cores/crates when closed. Callers drive open/close by calling
   * `setNextKinematicTranslation` on the returned body.
   */
  createShutter(id: string, center: Vec3, half: Vec3): BodyRecord {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(center.x, center.y, center.z),
    )
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setFriction(0.92).setRestitution(0.18),
      body,
    )
    return this.register({ tag: { id, kind: 'shutter' }, body, collider })
  }

  remove(id: string): void {
    const record = this.records.get(id)
    if (!record) return
    this.world.removeRigidBody(record.body)
    this.records.delete(id)
  }

  step(): void {
    this.world.step()
  }

  intersections(sensor: RAPIER.Collider, accepted: ReadonlySet<PhysicsEntityKind>): BodyRecord[] {
    const result: BodyRecord[] = []
    this.world.intersectionPairsWith(sensor, (other) => {
      const tag = other.parent()?.userData as PhysicsTag | undefined
      if (!tag || !accepted.has(tag.kind)) return
      const record = this.records.get(tag.id)
      if (record) result.push(record)
    })
    return result.sort((a, b) => a.tag.id.localeCompare(b.tag.id))
  }

  castRay(
    origin: Vec3,
    direction: Vec3,
    maxToi: number,
    excludeIds: ReadonlySet<string>,
    acceptedKinds?: ReadonlySet<PhysicsEntityKind>,
  ): BodyRecord | undefined {
    const ray = new RAPIER.Ray(origin, direction)
    const hit = this.world.castRay(ray, maxToi, true, undefined, undefined, undefined, undefined, (collider) => {
      if (collider.isSensor()) return false
      const tag = collider.parent()?.userData as PhysicsTag | undefined
      if (!tag) return acceptedKinds === undefined
      return !excludeIds.has(tag.id) && (acceptedKinds === undefined || acceptedKinds.has(tag.kind))
    })
    if (!hit) return undefined
    const tag = hit.collider.parent()?.userData as PhysicsTag | undefined
    return tag ? this.records.get(tag.id) : undefined
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.records.clear()
    this.world.free()
  }

  private register(record: BodyRecord): BodyRecord {
    record.body.userData = record.tag
    this.records.set(record.tag.id, record)
    return record
  }
}

export { RAPIER }
