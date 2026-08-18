import * as THREE from 'three'
import type { BodyRecord, RapierWorld, Vec3 } from './RapierWorld'
import { RAPIER } from './RapierWorld'

const WALK_SPEED = 4.25
const DASH_SPEED = 10.8
const WALK_ACCELERATION = 28
const DASH_ACCELERATION = 46
const RELEASE_DECELERATION = 18
const REVERSAL_ACCELERATION = 44

export type MotorInput = {
  moveX: number
  moveZ: number
  jumpPressed: boolean
  dashPressed: boolean
}

export type MotorSnapshot = {
  position: Vec3
  velocity: Vec3
  grounded: boolean
  facingYaw: number
  dashTicks: number
  coyoteTicks: number
  jumpBufferTicks: number
  dashCooldownTicks: number
}

export class CharacterMotor {
  readonly id: string
  readonly record: BodyRecord
  readonly velocity = new THREE.Vector3()
  readonly position = new THREE.Vector3()
  grounded = false
  landedThisTick = false
  jumpedThisTick = false
  dashedThisTick = false
  facingYaw = 0
  private readonly controller: RAPIER.KinematicCharacterController
  private coyoteTicks = 0
  private jumpBufferTicks = 0
  private dashTicks = 0
  private dashCooldownTicks = 0
  private readonly desired = new THREE.Vector3()
  private readonly movement = new THREE.Vector3()
  private supportDelta = new THREE.Vector3()
  private supportedByPlatform = false

  constructor(physics: RapierWorld, record: BodyRecord) {
    this.id = record.tag.id
    this.record = record
    const translation = record.body.translation()
    this.position.set(translation.x, translation.y, translation.z)
    this.controller = physics.world.createCharacterController(0.025)
    this.controller.enableAutostep(0.46, 0.22, false)
    this.controller.enableSnapToGround(0.28)
    this.controller.setMaxSlopeClimbAngle(0.82)
    this.controller.setMinSlopeSlideAngle(0.96)
    this.controller.setSlideEnabled(true)
    this.controller.setApplyImpulsesToDynamicBodies(false)
  }

  setSupportDelta(delta: THREE.Vector3, supported = false): void {
    this.supportDelta.copy(delta)
    this.supportedByPlatform = supported
  }

  prepare(input: MotorInput, fixedDelta = 1 / 60): void {
    this.landedThisTick = false
    this.jumpedThisTick = false
    this.dashedThisTick = false
    if (input.jumpPressed) this.jumpBufferTicks = 7
    else this.jumpBufferTicks = Math.max(0, this.jumpBufferTicks - 1)
    const supported = this.grounded || this.supportedByPlatform
    if (supported) this.coyoteTicks = 6
    else this.coyoteTicks = Math.max(0, this.coyoteTicks - 1)
    this.dashCooldownTicks = Math.max(0, this.dashCooldownTicks - 1)

    const desired = this.desired.set(input.moveX, 0, input.moveZ)
    if (desired.lengthSq() > 1) desired.normalize()
    if (desired.lengthSq() > 0.001) this.facingYaw = Math.atan2(desired.x, desired.z)

    if (input.dashPressed && this.dashCooldownTicks === 0 && desired.lengthSq() > 0.01) {
      this.dashTicks = 9
      this.dashCooldownTicks = 38
      this.dashedThisTick = true
    }
    const dashActive = this.dashTicks > 0
    this.dashTicks = Math.max(0, this.dashTicks - 1)
    const topSpeed = dashActive ? DASH_SPEED : WALK_SPEED
    const horizontalAlignment = this.velocity.x * desired.x + this.velocity.z * desired.z
    const reversing = desired.lengthSq() > 0.001 && horizontalAlignment < -0.08
    const acceleration = desired.lengthSq() === 0
      ? RELEASE_DECELERATION
      : reversing
        ? REVERSAL_ACCELERATION
        : dashActive
          ? DASH_ACCELERATION
          : WALK_ACCELERATION
    const targetX = desired.x * topSpeed
    const targetZ = desired.z * topSpeed
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetX, acceleration, fixedDelta)
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetZ, acceleration, fixedDelta)

    if (this.jumpBufferTicks > 0 && this.coyoteTicks > 0) {
      this.velocity.y = 7.15
      this.jumpBufferTicks = 0
      this.coyoteTicks = 0
      this.grounded = false
      this.jumpedThisTick = true
    } else if (!supported) {
      this.velocity.y = Math.max(-14, this.velocity.y - 18 * fixedDelta)
    } else {
      this.velocity.y = 0
    }

    this.movement.set(
      this.velocity.x * fixedDelta + this.supportDelta.x,
      this.velocity.y * fixedDelta + this.supportDelta.y,
      this.velocity.z * fixedDelta + this.supportDelta.z,
    )
    this.supportDelta.set(0, 0, 0)
    this.controller.computeColliderMovement(
      this.record.collider,
      this.movement,
      undefined,
      undefined,
      (collider) => {
        const tag = collider.parent()?.userData as { kind?: string; carried?: boolean; nonBlocking?: boolean } | undefined
        if (tag?.carried || tag?.nonBlocking) return false
        if (tag?.kind === 'plate' || tag?.kind === 'lever' || tag?.kind === 'trap' || tag?.kind === 'exit') return false
        return tag?.kind !== 'player' && tag?.kind !== 'echo'
      },
    )
    const corrected = this.controller.computedMovement()
    const wasGrounded = this.grounded
    this.grounded = this.controller.computedGrounded()
      || (this.supportedByPlatform && !this.jumpedThisTick && this.velocity.y <= 0)
    if (this.grounded && !wasGrounded && this.velocity.y < -1.1) this.landedThisTick = true
    if (this.grounded && this.velocity.y < 0) this.velocity.y = 0
    this.record.body.setNextKinematicTranslation({
      x: this.position.x + corrected.x,
      y: this.position.y + corrected.y,
      z: this.position.z + corrected.z,
    })
  }

  syncAfterStep(): void {
    const translation = this.record.body.translation()
    this.position.set(translation.x, translation.y, translation.z)
  }

  teleport(position: Vec3): void {
    this.record.body.setTranslation(position, true)
    this.record.body.setNextKinematicTranslation(position)
    this.position.set(position.x, position.y, position.z)
    this.velocity.set(0, 0, 0)
    this.grounded = false
  }

  snapshot(): MotorSnapshot {
    return {
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
      grounded: this.grounded,
      facingYaw: this.facingYaw,
      dashTicks: this.dashTicks,
      coyoteTicks: this.coyoteTicks,
      jumpBufferTicks: this.jumpBufferTicks,
      dashCooldownTicks: this.dashCooldownTicks,
    }
  }

  restore(snapshot: MotorSnapshot): void {
    this.teleport(snapshot.position)
    this.velocity.set(snapshot.velocity.x, snapshot.velocity.y, snapshot.velocity.z)
    this.grounded = snapshot.grounded
    this.facingYaw = snapshot.facingYaw
    this.dashTicks = snapshot.dashTicks
    this.coyoteTicks = snapshot.coyoteTicks
    this.jumpBufferTicks = snapshot.jumpBufferTicks
    this.dashCooldownTicks = snapshot.dashCooldownTicks
  }

  dispose(): void {
    this.controller.free()
  }
}
