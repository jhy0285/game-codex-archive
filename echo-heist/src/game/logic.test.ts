import { describe, expect, it } from 'vitest'
import {
  ACTION_INTERACT,
  ACTION_PULSE,
  FIXED_STEP_MS,
  STAGES,
  actionFramesBetween,
  addLatch,
  createStageRuntime,
  evaluateStage,
  fixedStepsForDelta,
  getLaserPhase,
  getPlateOccupant,
  redirectVelocity,
  registerGuardianStrike,
  resolveCircleMovement,
  sampleEcho,
  stepFreeCrate,
  type EchoFrame,
  type GuardianState,
} from './logic.ts'

const frames: EchoFrame[] = [
  { t: 0, x: 10, y: 20, facing: 'right', moving: false, actionMask: 0 },
  { t: 100, x: 30, y: 40, facing: 'right', moving: true, actionMask: ACTION_INTERACT },
  { t: 200, x: 50, y: 40, facing: 'up', moving: true, actionMask: ACTION_PULSE },
]

describe('campaign contract', () => {
  it('contains six authored chapters with escalating required systems', () => {
    expect(STAGES).toHaveLength(6)
    expect(STAGES.map((stage) => stage.id)).toEqual([
      'first-cut',
      'dead-weight',
      'cross-signal',
      'sentinel-shift',
      'fracture-run',
      'zero-hour',
    ])
    expect(STAGES[0].start).toEqual({ x: 145, y: 360 })
    expect(STAGES[5].requiredObjectives).toEqual([
      'cargo',
      'receiver',
      'guardian',
      'alpha',
    ])
  })
})

describe('fixed-step echo recording', () => {
  it('produces the same simulation step count across split render deltas', () => {
    let remainder = 0
    let steps = 0
    for (const delta of [8, 9, 17, 33, 41, 12, 80]) {
      const result = fixedStepsForDelta(remainder, delta)
      remainder = result.remainderMs
      steps += result.steps
    }
    const single = fixedStepsForDelta(0, 200)
    expect(steps).toBe(single.steps)
    expect(remainder).toBeCloseTo(single.remainderMs, 8)
    expect(FIXED_STEP_MS * steps + remainder).toBeCloseTo(200, 8)
  })

  it('interpolates replay positions and holds the final resolved pose', () => {
    expect(sampleEcho(frames, 50)).toMatchObject({ x: 20, y: 30, facing: 'right' })
    expect(sampleEcho(frames, 250)).toMatchObject({
      x: 50,
      y: 40,
      facing: 'up',
      moving: false,
      actionMask: 0,
    })
  })

  it('emits discrete replay actions only inside the crossed time window', () => {
    expect(actionFramesBetween(frames, 0, 100).map((frame) => frame.actionMask)).toEqual([
      ACTION_INTERACT,
    ])
    expect(actionFramesBetween(frames, 100, 200).map((frame) => frame.actionMask)).toEqual([
      ACTION_PULSE,
    ])
    expect(actionFramesBetween(frames, 100, 199)).toEqual([])
  })
})

describe('objects, plates, and clean reset', () => {
  it('resets mutable objects while retaining only declared persistent objectives', () => {
    const stage = STAGES[5]
    const runtime = createStageRuntime(stage)
    runtime.crates[0].x = 777
    runtime.crates[0].vx = 150
    runtime.crates[0].carriedBy = 'player'
    addLatch(runtime, 'cargo')
    addLatch(runtime, 'not-allowed')
    const reset = createStageRuntime(stage, runtime.latches)
    expect(reset.crates[0]).toMatchObject({
      x: stage.crates[0].x,
      vx: 0,
      carriedBy: null,
      airborne: false,
      active: true,
    })
    expect(reset.latches).toEqual(['cargo'])
    expect(reset.hazardTimeMs).toBe(0)
  })

  it('distinguishes current, echo, and cargo occupancy', () => {
    const stage = STAGES[1]
    const runtime = createStageRuntime(stage)
    const alpha = stage.plates[0]
    const cargo = stage.plates[1]
    expect(getPlateOccupant(alpha, alpha, null, runtime.crates)).toBe('player')
    expect(getPlateOccupant(alpha, { x: 100, y: 100 }, alpha, runtime.crates)).toBe('echo')
    runtime.crates[0].x = cargo.x
    runtime.crates[0].y = cargo.y
    expect(getPlateOccupant(cargo, { x: 100, y: 100 }, null, runtime.crates)).toBe('cargo')
  })

  it('requires the echo—not the current player—to satisfy ALPHA', () => {
    const stage = STAGES[1]
    expect(evaluateStage(stage, { alpha: 'player', cargo: 'cargo' }, []).doorOpen).toBe(false)
    expect(evaluateStage(stage, { alpha: 'echo', cargo: 'cargo' }, []).doorOpen).toBe(true)
  })

  it('redirects and advances a thrown core deterministically', () => {
    const runtime = createStageRuntime(STAGES[2])
    const core = runtime.crates[0]
    const velocity = redirectVelocity('right', 300)
    core.vx = velocity.vx
    core.vy = velocity.vy
    core.airborne = true
    stepFreeCrate(core, 0.5, [])
    expect(core.x).toBeCloseTo(STAGES[2].crates[0].x + 150, 4)
    expect(core.y).toBe(STAGES[2].crates[0].y)
  })
})

describe('hazards and sentinel sync', () => {
  it('cycles warning, active, recovery, and deterministic bypass states', () => {
    const laser = STAGES[4].lasers[0]
    expect(getLaserPhase(laser, 100, false)).toBe('warning')
    expect(getLaserPhase(laser, laser.warningMs + 50, false)).toBe('active')
    expect(getLaserPhase(laser, laser.warningMs + laser.activeMs + 50, false)).toBe('recovery')
    expect(getLaserPhase(laser, laser.warningMs + 50, true)).toBe('recovery')
  })

  it('breaches the sentinel only with opposite selves and directions in-window', () => {
    const guardian: GuardianState = {
      x: 500,
      y: 300,
      defeated: false,
      firstStrike: null,
      feedback: 'idle',
    }
    expect(registerGuardianStrike(guardian, { actor: 'echo', direction: 'right', timeMs: 1_000 })).toBe('armed')
    expect(registerGuardianStrike(guardian, { actor: 'player', direction: 'left', timeMs: 1_900 })).toBe('breached')
    expect(guardian.defeated).toBe(true)
  })

  it('rejects same-actor, wrong-side, and late follow-up strikes', () => {
    const createGuardian = (): GuardianState => ({
      x: 500,
      y: 300,
      defeated: false,
      firstStrike: null,
      feedback: 'idle',
    })
    const same = createGuardian()
    registerGuardianStrike(same, { actor: 'echo', direction: 'right', timeMs: 0 })
    expect(registerGuardianStrike(same, { actor: 'echo', direction: 'left', timeMs: 500 })).toBe('same-actor')

    const side = createGuardian()
    registerGuardianStrike(side, { actor: 'echo', direction: 'right', timeMs: 0 })
    expect(registerGuardianStrike(side, { actor: 'player', direction: 'right', timeMs: 500 })).toBe('wrong-side')

    const late = createGuardian()
    registerGuardianStrike(late, { actor: 'echo', direction: 'right', timeMs: 0 })
    expect(registerGuardianStrike(late, { actor: 'player', direction: 'left', timeMs: 1_500 })).toBe('late')
  })

  it('resolves circle movement without tunnelling through authored blockers', () => {
    const point = resolveCircleMovement(
      { x: 100, y: 200 },
      { vx: 500, vy: 0 },
      0.2,
      [{ x: 160, y: 150, width: 30, height: 100 }],
    )
    expect(point.x).toBe(100)
    expect(point.y).toBe(200)
  })
})
