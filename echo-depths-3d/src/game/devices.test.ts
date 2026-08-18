import { describe, expect, it } from 'vitest'
import {
  createLeverState,
  evaluateLever,
  evaluatePressurePlate,
} from './devices'

describe('pressure plates', () => {
  it('counts both present and echo as actors without conflating cargo', () => {
    const result = evaluatePressurePlate(
      { id: 'echo-plate', accepts: 'actor', requiredMass: 1 },
      [
        { id: 'crate', kind: 'cargo', mass: 4 },
        { id: 'echo', kind: 'echo', mass: 1 },
      ],
    )
    expect(result.pressed).toBe(true)
    expect(result.totalMass).toBe(1)
    expect(result.occupantIds).toEqual(['echo'])
  })

  it('requires authored cargo mass and ignores inactive bodies', () => {
    const config = { id: 'weight-plate', accepts: 'cargo', requiredMass: 2 } as const
    expect(evaluatePressurePlate(config, [{ id: 'light', kind: 'cargo', mass: 1 }]).pressed).toBe(false)
    expect(evaluatePressurePlate(config, [
      { id: 'a', kind: 'cargo', mass: 1 },
      { id: 'b', kind: 'cargo', mass: 1 },
      { id: 'inactive', kind: 'cargo', mass: 99, active: false },
    ]).pressed).toBe(true)
  })
})

describe('levers', () => {
  it('keeps a momentary lever active only while an in-range actor holds use', () => {
    const config = { id: 'lift-lever', mode: 'momentary' } as const
    const active = evaluateLever(config, createLeverState(config.id), [{
      actor: 'echo', inRange: true, interactHeld: true, interactPressed: false,
    }])
    expect(active).toMatchObject({ active: true, latched: false, heldBy: 'echo' })
    const released = evaluateLever(config, active, [{
      actor: 'echo', inRange: true, interactHeld: false, interactPressed: false,
    }])
    expect(released).toMatchObject({ active: false, heldBy: null })
  })

  it('gives echo stable priority when both actors hold the same lever', () => {
    const config = { id: 'bridge-lever', mode: 'momentary' } as const
    const result = evaluateLever(config, createLeverState(config.id), [
      { actor: 'player', inRange: true, interactHeld: true, interactPressed: false },
      { actor: 'echo', inRange: true, interactHeld: true, interactPressed: false },
    ])
    expect(result.heldBy).toBe('echo')
  })

  it('toggles once per press and permanently latches a latch lever', () => {
    const press = [{
      actor: 'player' as const,
      inRange: true,
      interactHeld: true,
      interactPressed: true,
    }]
    const toggleConfig = { id: 'toggle', mode: 'toggle' } as const
    const toggledOn = evaluateLever(toggleConfig, createLeverState('toggle'), press)
    expect(toggledOn.active).toBe(true)
    const noPress = [{ ...press[0]!, interactPressed: false }]
    expect(evaluateLever(toggleConfig, toggledOn, noPress).active).toBe(true)
    expect(evaluateLever(toggleConfig, toggledOn, press).active).toBe(false)

    const latchConfig = { id: 'latch', mode: 'latch' } as const
    const latched = evaluateLever(latchConfig, createLeverState('latch'), press)
    const outOfRange = [{ ...press[0]!, inRange: false, interactPressed: false }]
    expect(evaluateLever(latchConfig, latched, outOfRange).latched).toBe(true)
  })
})
