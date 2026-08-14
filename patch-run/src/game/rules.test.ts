import { describe, expect, it } from 'vitest'
import {
  bounceStats,
  canDamageEnemyAfterBounce,
  nextScheduledPatch,
  PATCH_DESCRIPTIONS,
  patchesDue,
  secondsUntilNextPatch,
} from './rules'

describe('patch schedule', () => {
  it('activates the three patches in the fixed 20-second order', () => {
    expect(patchesDue(19_999)).toEqual([])
    expect(patchesDue(20_000)).toEqual(['RICOCHET'])
    expect(patchesDue(40_000)).toEqual(['RICOCHET', 'GROWTH'])
    expect(patchesDue(60_000)).toEqual(['RICOCHET', 'GROWTH', 'FRIENDLY FIRE'])
  })

  it('reports the next patch and countdown', () => {
    expect(nextScheduledPatch(20_000)?.id).toBe('GROWTH')
    expect(secondsUntilNextPatch(39_001)).toBe(1)
    expect(nextScheduledPatch(60_000)).toBeNull()
  })

  it('provides a concise explanation for every installed rule', () => {
    expect(PATCH_DESCRIPTIONS.RICOCHET).toContain('REBOUND')
    expect(PATCH_DESCRIPTIONS.GROWTH).toContain('SIZE AND DAMAGE')
    expect(PATCH_DESCRIPTIONS['FRIENDLY FIRE']).toContain('ARMED AGAINST ENEMIES')
  })
})

describe('stacked bullet behavior', () => {
  it('makes a ricochet visibly larger and more damaging with growth', () => {
    expect(bounceStats(20, 1, true)).toEqual({ damage: 45, scale: 2.1 })
    expect(bounceStats(20, 1, false)).toEqual({ damage: 20, scale: 1 })
  })

  it('arms bounced bullets against enemies only after friendly fire', () => {
    expect(canDamageEnemyAfterBounce(false, false)).toBe(true)
    expect(canDamageEnemyAfterBounce(true, false)).toBe(false)
    expect(canDamageEnemyAfterBounce(true, true)).toBe(true)
  })
})
