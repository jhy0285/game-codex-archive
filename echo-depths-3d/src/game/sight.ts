import type { ReadonlyVector3 } from './types'

export type SightObserver = Readonly<{
  position: ReadonlyVector3
  forward: ReadonlyVector3
  range: number
  fovRadians: number
  maxVerticalDelta: number
}>

export type SightTarget = Readonly<{
  position: ReadonlyVector3
  radius?: number
}>

export type SightOccluder = Readonly<{
  id: string
  min: ReadonlyVector3
  max: ReadonlyVector3
}>

export type SightResult = Readonly<{
  visible: boolean
  reason: 'visible' | 'range' | 'height' | 'angle' | 'occluded'
  distance: number
  angleRadians: number
  occluderId: string | null
}>

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value))

const segmentIntersectsAabb = (
  start: ReadonlyVector3,
  end: ReadonlyVector3,
  box: SightOccluder,
) => {
  let near = 0
  let far = 1

  const testAxis = (origin: number, destination: number, minimum: number, maximum: number) => {
    const delta = destination - origin
    if (Math.abs(delta) < 0.000_001) return origin >= minimum && origin <= maximum
    const inverse = 1 / delta
    let first = (minimum - origin) * inverse
    let second = (maximum - origin) * inverse
    if (first > second) [first, second] = [second, first]
    near = Math.max(near, first)
    far = Math.min(far, second)
    return near <= far
  }

  if (!testAxis(start.x, end.x, box.min.x, box.max.x)) return false
  if (!testAxis(start.y, end.y, box.min.y, box.max.y)) return false
  if (!testAxis(start.z, end.z, box.min.z, box.max.z)) return false
  return far > 0.000_1 && near < 0.999_9
}

export const evaluateSight = (
  observer: SightObserver,
  target: SightTarget,
  occluders: readonly SightOccluder[] = [],
): SightResult => {
  const radius = Math.max(0, target.radius ?? 0)
  const dx = target.position.x - observer.position.x
  const dy = target.position.y - observer.position.y
  const dz = target.position.z - observer.position.z
  const horizontalDistance = Math.hypot(dx, dz)
  const distance = Math.hypot(dx, dy, dz)
  if (distance > observer.range + radius) {
    return { visible: false, reason: 'range', distance, angleRadians: Math.PI, occluderId: null }
  }
  if (Math.abs(dy) > observer.maxVerticalDelta + radius) {
    return { visible: false, reason: 'height', distance, angleRadians: Math.PI, occluderId: null }
  }

  const forwardLength = Math.hypot(observer.forward.x, observer.forward.z)
  const targetLength = Math.max(0.000_001, horizontalDistance)
  const dot = forwardLength < 0.000_001
    ? -1
    : clamp(
      (observer.forward.x * dx + observer.forward.z * dz) /
        (forwardLength * targetLength),
      -1,
      1,
    )
  const angleRadians = horizontalDistance < 0.000_001 ? 0 : Math.acos(dot)
  const angularAllowance = horizontalDistance <= radius
    ? Math.PI * 0.5
    : Math.asin(clamp(radius / horizontalDistance, 0, 1))
  if (angleRadians > observer.fovRadians * 0.5 + angularAllowance) {
    return { visible: false, reason: 'angle', distance, angleRadians, occluderId: null }
  }

  const orderedOccluders = [...occluders].sort((first, second) => first.id.localeCompare(second.id))
  const blocking = orderedOccluders.find((occluder) =>
    segmentIntersectsAabb(observer.position, target.position, occluder),
  )
  if (blocking) {
    return {
      visible: false,
      reason: 'occluded',
      distance,
      angleRadians,
      occluderId: blocking.id,
    }
  }

  return { visible: true, reason: 'visible', distance, angleRadians, occluderId: null }
}

export const canSeeTarget = (
  observer: SightObserver,
  target: SightTarget,
  occluders: readonly SightOccluder[] = [],
) => evaluateSight(observer, target, occluders).visible
