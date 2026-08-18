import type { ReadonlyVector3, Vector3 } from './types'

export type KnockbackSource = Readonly<{
  position: ReadonlyVector3
  forward: ReadonlyVector3
  range: number
  halfAngleRadians: number
  baseStrength: number
  upwardStrength: number
  heightAdvantageThreshold: number
  heightAdvantageMultiplier: number
}>

export type KnockbackTarget = Readonly<{
  position: ReadonlyVector3
  mass: number
  radius?: number
}>

export type KnockbackResult = Readonly<{
  hit: boolean
  impulse: ReadonlyVector3
  strength: number
  heightMultiplier: number
  angleRadians: number
}>

const noKnockback = (angleRadians: number): KnockbackResult => ({
  hit: false,
  impulse: { x: 0, y: 0, z: 0 },
  strength: 0,
  heightMultiplier: 1,
  angleRadians,
})

export const computeKnockback = (
  source: KnockbackSource,
  target: KnockbackTarget,
): KnockbackResult => {
  const dx = target.position.x - source.position.x
  const dz = target.position.z - source.position.z
  const targetDistance = Math.hypot(dx, dz)
  if (targetDistance > source.range + Math.max(0, target.radius ?? 0)) {
    return noKnockback(Math.PI)
  }

  const forwardLength = Math.hypot(source.forward.x, source.forward.z)
  if (forwardLength < 0.000_001) return noKnockback(Math.PI)
  const targetLength = Math.max(0.000_001, targetDistance)
  const dot = Math.max(
    -1,
    Math.min(
      1,
      (source.forward.x * dx + source.forward.z * dz) /
        (forwardLength * targetLength),
    ),
  )
  const angleRadians = targetDistance < 0.000_001 ? 0 : Math.acos(dot)
  if (angleRadians > source.halfAngleRadians) return noKnockback(angleRadians)

  const heightDifference = source.position.y - target.position.y
  const heightMultiplier = heightDifference >= source.heightAdvantageThreshold
    ? source.heightAdvantageMultiplier
    : 1
  const mass = Math.max(0.25, Number.isFinite(target.mass) ? target.mass : 1)
  const strength = Math.max(0, source.baseStrength) * heightMultiplier / mass
  const directionX = source.forward.x / forwardLength
  const directionZ = source.forward.z / forwardLength
  return {
    hit: true,
    impulse: {
      x: directionX * strength,
      y: Math.max(0, source.upwardStrength) * heightMultiplier / mass,
      z: directionZ * strength,
    },
    strength,
    heightMultiplier,
    angleRadians,
  }
}

export const applyKnockback = (
  velocity: ReadonlyVector3,
  result: KnockbackResult,
  maxHorizontalSpeed = 20,
): Vector3 => {
  if (!result.hit) return { x: velocity.x, y: velocity.y, z: velocity.z }
  const nextX = velocity.x + result.impulse.x
  const nextZ = velocity.z + result.impulse.z
  const horizontalSpeed = Math.hypot(nextX, nextZ)
  const scale = horizontalSpeed > maxHorizontalSpeed
    ? Math.max(0, maxHorizontalSpeed) / horizontalSpeed
    : 1
  return {
    x: nextX * scale,
    y: velocity.y + result.impulse.y,
    z: nextZ * scale,
  }
}
