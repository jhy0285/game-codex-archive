import { describe, expect, it } from 'vitest'
import { canSeeTarget, evaluateSight, type SightObserver } from './sight'

const observer: SightObserver = {
  position: { x: 0, y: 1.6, z: 0 },
  forward: { x: 0, y: 0, z: 1 },
  range: 8,
  fovRadians: Math.PI / 2,
  maxVerticalDelta: 2.5,
}

describe('deterministic enemy sight', () => {
  it('sees a target inside its cone and rejects range, height, and angle', () => {
    expect(canSeeTarget(observer, { position: { x: 1, y: 1.6, z: 5 }, radius: 0.35 })).toBe(true)
    expect(evaluateSight(observer, { position: { x: 0, y: 1.6, z: 9 } }).reason).toBe('range')
    expect(evaluateSight(observer, { position: { x: 0, y: 5, z: 3 } }).reason).toBe('height')
    expect(evaluateSight(observer, { position: { x: 5, y: 1.6, z: 0 } }).reason).toBe('angle')
  })

  it('uses authored pillars and walls as line-of-sight occluders', () => {
    const result = evaluateSight(
      observer,
      { position: { x: 0, y: 1.6, z: 6 } },
      [{
        id: 'pillar-a',
        min: { x: -0.6, y: 0, z: 2.4 },
        max: { x: 0.6, y: 3.2, z: 3.4 },
      }],
    )
    expect(result).toMatchObject({ visible: false, reason: 'occluded', occluderId: 'pillar-a' })
  })

  it('is independent of occluder input order', () => {
    const target = { position: { x: 0, y: 1.6, z: 7 } }
    const near = {
      id: 'a-near', min: { x: -1, y: 0, z: 2 }, max: { x: 1, y: 3, z: 2.5 },
    }
    const far = {
      id: 'z-far', min: { x: -1, y: 0, z: 5 }, max: { x: 1, y: 3, z: 5.5 },
    }
    expect(evaluateSight(observer, target, [far, near]).occluderId).toBe('a-near')
    expect(evaluateSight(observer, target, [near, far]).occluderId).toBe('a-near')
  })
})
