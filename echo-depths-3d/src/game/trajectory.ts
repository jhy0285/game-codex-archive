import { cloneVector3, type ReadonlyVector3, type Vector3 } from './types'

export const DEFAULT_GRAVITY: ReadonlyVector3 = Object.freeze({ x: 0, y: -18, z: 0 })

export type TrajectoryPoint = Readonly<{
  tick: number
  timeSeconds: number
  position: ReadonlyVector3
  velocity: ReadonlyVector3
}>

export type TrajectoryOptions = Readonly<{
  gravity?: ReadonlyVector3
  stepSeconds?: number
  maxTicks?: number
  stopWhen?: (point: TrajectoryPoint) => boolean
}>

export const positionOnBallisticArc = (
  origin: ReadonlyVector3,
  initialVelocity: ReadonlyVector3,
  timeSeconds: number,
  gravity: ReadonlyVector3 = DEFAULT_GRAVITY,
): Vector3 => {
  const time = Math.max(0, Number.isFinite(timeSeconds) ? timeSeconds : 0)
  return {
    x: origin.x + initialVelocity.x * time + gravity.x * time * time * 0.5,
    y: origin.y + initialVelocity.y * time + gravity.y * time * time * 0.5,
    z: origin.z + initialVelocity.z * time + gravity.z * time * time * 0.5,
  }
}

export const calculateLaunchVelocity = (
  origin: ReadonlyVector3,
  target: ReadonlyVector3,
  flightTimeSeconds: number,
  gravity: ReadonlyVector3 = DEFAULT_GRAVITY,
): Vector3 => {
  if (!(flightTimeSeconds > 0) || !Number.isFinite(flightTimeSeconds)) {
    throw new RangeError('flightTimeSeconds must be a finite positive number')
  }
  const inverseTime = 1 / flightTimeSeconds
  const gravityScale = flightTimeSeconds * 0.5
  return {
    x: (target.x - origin.x) * inverseTime - gravity.x * gravityScale,
    y: (target.y - origin.y) * inverseTime - gravity.y * gravityScale,
    z: (target.z - origin.z) * inverseTime - gravity.z * gravityScale,
  }
}

export const previewTrajectory = (
  origin: ReadonlyVector3,
  initialVelocity: ReadonlyVector3,
  options: TrajectoryOptions = {},
): readonly TrajectoryPoint[] => {
  const gravity = options.gravity ?? DEFAULT_GRAVITY
  const stepSeconds = options.stepSeconds ?? 1 / 60
  const maxTicks = options.maxTicks ?? 120
  if (!(stepSeconds > 0) || !Number.isFinite(stepSeconds)) {
    throw new RangeError('stepSeconds must be a finite positive number')
  }
  if (!Number.isInteger(maxTicks) || maxTicks < 1) {
    throw new RangeError('maxTicks must be a positive integer')
  }

  const points: TrajectoryPoint[] = []
  for (let tick = 0; tick <= maxTicks; tick += 1) {
    const timeSeconds = tick * stepSeconds
    const point: TrajectoryPoint = {
      tick,
      timeSeconds,
      position: positionOnBallisticArc(origin, initialVelocity, timeSeconds, gravity),
      velocity: {
        x: initialVelocity.x + gravity.x * timeSeconds,
        y: initialVelocity.y + gravity.y * timeSeconds,
        z: initialVelocity.z + gravity.z * timeSeconds,
      },
    }
    points.push(point)
    if (tick > 0 && options.stopWhen?.(point)) break
  }
  return points
}

export const redirectVelocity = (
  velocity: ReadonlyVector3,
  direction: ReadonlyVector3,
  minimumSpeed = 8,
): Vector3 => {
  const horizontalLength = Math.hypot(direction.x, direction.z)
  if (horizontalLength < 0.000_001) return cloneVector3(velocity)
  const speed = Math.max(minimumSpeed, Math.hypot(velocity.x, velocity.z))
  return {
    x: (direction.x / horizontalLength) * speed,
    y: velocity.y,
    z: (direction.z / horizontalLength) * speed,
  }
}

export const isWithinCatchVolume = (
  actorPosition: ReadonlyVector3,
  corePosition: ReadonlyVector3,
  horizontalRadius = 1.35,
  verticalTolerance = 1.4,
) =>
  Math.hypot(
    corePosition.x - actorPosition.x,
    corePosition.z - actorPosition.z,
  ) <= horizontalRadius &&
  Math.abs(corePosition.y - actorPosition.y) <= verticalTolerance
