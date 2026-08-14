import { describe, expect, it } from 'vitest'
import {
  LOOP_DURATION_MS,
  SECTORS,
  createFreshRun,
  getSwitchOccupancy,
  resolvePlayerMovement,
  sampleEcho,
  updateRelayState,
  type EchoFrame,
} from './logic.ts'

describe('echo timeline', () => {
  const frames: EchoFrame[] = [
    { time: 0, x: 100, y: 200, interacting: false },
    { time: 1000, x: 300, y: 400, interacting: true },
  ]

  it('interpolates a recorded path deterministically', () => {
    expect(sampleEcho(frames, 500)).toEqual({
      time: 500,
      x: 200,
      y: 300,
      interacting: true,
    })
  })

  it('holds the final locked position after playback ends', () => {
    expect(sampleEcho(frames, LOOP_DURATION_MS)).toEqual(frames[1])
  })
})

describe('sector rules', () => {
  it('reports separate player and ghost switch occupancy', () => {
    const sector = SECTORS[1]!
    const occupancy = getSwitchOccupancy(
      sector.switches,
      sector.switches[1]!,
      sector.switches[0]!,
    )
    expect(occupancy).toEqual([
      { id: 'alpha', active: true, player: false, ghost: true },
      { id: 'beta', active: true, player: true, ghost: false },
    ])
  })

  it('charges only while both switches are active and latches at full charge', () => {
    const partial = updateRelayState(
      { chargeMs: 0, latched: false },
      800,
      true,
      1200,
    )
    expect(partial).toEqual({ chargeMs: 800, latched: false })
    expect(updateRelayState(partial, 400, true, 1200)).toEqual({
      chargeMs: 1200,
      latched: true,
    })
  })

  it('blocks a sealed door and permits its open doorway', () => {
    const sector = SECTORS[0]!
    const fromLeft = { x: sector.door.x - 16, y: 330 }
    const movement = { x: 80, y: 0 }
    expect(resolvePlayerMovement(fromLeft, movement, false, sector).x).toBeLessThan(
      sector.door.x,
    )
    expect(resolvePlayerMovement(fromLeft, movement, true, sector).x).toBeGreaterThan(
      sector.door.x + sector.door.width,
    )
  })

  it('creates a clean loop from the selected sector spawn', () => {
    const spawn = SECTORS[1]!.spawn
    const state = createFreshRun(spawn)
    expect(state).toMatchObject({ loop: 1, elapsed: 0, player: spawn, previous: [] })
    expect(state.recording).toEqual([
      { time: 0, x: spawn.x, y: spawn.y, interacting: false },
    ])
  })
})
