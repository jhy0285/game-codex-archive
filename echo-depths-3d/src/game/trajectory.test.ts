import { describe, expect, it } from 'vitest'
import {
  calculateLaunchVelocity,
  isWithinCatchVolume,
  positionOnBallisticArc,
  previewTrajectory,
  redirectVelocity,
} from './trajectory'

describe('core trajectory', () => {
  it('calculates a launch velocity that reaches the target at the authored time', () => {
    const origin = { x: -3, y: 4, z: 1 }
    const target = { x: 5, y: 1, z: -2 }
    const velocity = calculateLaunchVelocity(origin, target, 1.25)
    const reached = positionOnBallisticArc(origin, velocity, 1.25)
    expect(reached.x).toBeCloseTo(target.x, 8)
    expect(reached.y).toBeCloseTo(target.y, 8)
    expect(reached.z).toBeCloseTo(target.z, 8)
  })

  it('previews the same analytic ballistic positions used by the throw helper', () => {
    const origin = { x: 1, y: 2, z: 3 }
    const velocity = { x: 6, y: 8, z: -2 }
    const points = previewTrajectory(origin, velocity, { stepSeconds: 0.1, maxTicks: 10 })
    expect(points).toHaveLength(11)
    for (const point of points) {
      expect(point.position).toEqual(
        positionOnBallisticArc(origin, velocity, point.timeSeconds),
      )
    }
  })

  it('stops preview when the collision predicate is reached', () => {
    const points = previewTrajectory(
      { x: 0, y: 1, z: 0 },
      { x: 4, y: 3, z: 0 },
      { maxTicks: 200, stopWhen: (point) => point.position.y <= 0 },
    )
    expect(points.length).toBeLessThan(201)
    expect(points.at(-1)!.position.y).toBeLessThanOrEqual(0)
  })

  it('redirects horizontal travel while preserving vertical velocity', () => {
    const redirected = redirectVelocity({ x: 6, y: -3, z: 0 }, { x: 0, y: 0, z: 1 })
    expect(redirected).toEqual({ x: 0, y: -3, z: 8 })
  })

  it('uses a forgiving but bounded catch volume', () => {
    const actor = { x: 0, y: 1, z: 0 }
    expect(isWithinCatchVolume(actor, { x: 1.2, y: 2.2, z: 0.3 })).toBe(true)
    expect(isWithinCatchVolume(actor, { x: 1.5, y: 1, z: 0 })).toBe(false)
    expect(isWithinCatchVolume(actor, { x: 0.2, y: 2.6, z: 0 })).toBe(false)
  })
})
