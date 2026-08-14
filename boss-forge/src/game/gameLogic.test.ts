import { describe, expect, it } from 'vitest'
import {
  ATTACK_MODULES,
  nextAttackModule,
  pointToSegmentDistance,
  toggleModuleSelection,
  type AttackModuleId,
} from './gameLogic'

describe('boss configuration', () => {
  it('contains exactly the three required attack modules', () => {
    expect(ATTACK_MODULES.map((module) => module.name)).toEqual([
      'RADIAL BURST',
      'AIMED SHOT',
      'ROTATING BEAM',
    ])
  })

  it('allows exactly two selections and ignores a third', () => {
    let selected: AttackModuleId[] = []
    selected = toggleModuleSelection(selected, 'RADIAL_BURST')
    selected = toggleModuleSelection(selected, 'AIMED_SHOT')
    selected = toggleModuleSelection(selected, 'ROTATING_BEAM')
    expect(selected).toEqual(['RADIAL_BURST', 'AIMED_SHOT'])
  })

  it('allows a selected module to be deselected', () => {
    expect(toggleModuleSelection(['RADIAL_BURST', 'ROTATING_BEAM'], 'RADIAL_BURST')).toEqual([
      'ROTATING_BEAM',
    ])
  })

  it('cycles only through modules chosen by the player', () => {
    const selected: AttackModuleId[] = ['AIMED_SHOT', 'ROTATING_BEAM']
    expect([0, 1, 2, 3].map((index) => nextAttackModule(selected, index))).toEqual([
      'AIMED_SHOT',
      'ROTATING_BEAM',
      'AIMED_SHOT',
      'ROTATING_BEAM',
    ])
  })
})

describe('beam collision math', () => {
  it('measures distance to the visible beam segment', () => {
    expect(pointToSegmentDistance(50, 8, 0, 0, 100, 0)).toBeCloseTo(8)
    expect(pointToSegmentDistance(120, 0, 0, 0, 100, 0)).toBeCloseTo(20)
  })
})
