import { describe, expect, it } from 'vitest'
import { applyKnockback, computeKnockback, type KnockbackSource } from './knockback'

const source: KnockbackSource = {
  position: { x: 0, y: 1, z: 0 },
  forward: { x: 1, y: 0, z: 0 },
  range: 2.4,
  halfAngleRadians: Math.PI / 4,
  baseStrength: 8,
  upwardStrength: 2,
  heightAdvantageThreshold: 0.75,
  heightAdvantageMultiplier: 1.35,
}

describe('directional knockback', () => {
  it('hits only targets inside the directional attack cone', () => {
    expect(computeKnockback(source, {
      position: { x: 2, y: 1, z: 0.4 }, mass: 1,
    }).hit).toBe(true)
    expect(computeKnockback(source, {
      position: { x: -1, y: 1, z: 0 }, mass: 1,
    }).hit).toBe(false)
    expect(computeKnockback(source, {
      position: { x: 4, y: 1, z: 0 }, mass: 1,
    }).hit).toBe(false)
  })

  it('amplifies a strike from the higher flank without using health', () => {
    const level = computeKnockback(source, { position: { x: 2, y: 1, z: 0 }, mass: 1 })
    const high = computeKnockback(
      { ...source, position: { x: 0, y: 2, z: 0 } },
      { position: { x: 2, y: 1, z: 0 }, mass: 1 },
    )
    expect(level.heightMultiplier).toBe(1)
    expect(high.heightMultiplier).toBe(1.35)
    expect(high.strength).toBeCloseTo(level.strength * 1.35)
  })

  it('accounts for mass and caps resulting horizontal speed', () => {
    const light = computeKnockback(source, { position: { x: 1, y: 1, z: 0 }, mass: 1 })
    const heavy = computeKnockback(source, { position: { x: 1, y: 1, z: 0 }, mass: 2 })
    expect(heavy.strength).toBeCloseTo(light.strength * 0.5)
    const velocity = applyKnockback({ x: 19, y: 0, z: 0 }, light, 20)
    expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(20)
  })
})
