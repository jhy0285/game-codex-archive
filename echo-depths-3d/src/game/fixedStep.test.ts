import { describe, expect, it } from 'vitest'
import {
  FIXED_STEP_MS,
  FixedStepAccumulator,
  fixedStepsForDelta,
} from './fixedStep'

describe('FixedStepAccumulator', () => {
  it('advances exactly sixty simulation ticks per second', () => {
    const accumulator = new FixedStepAccumulator()
    let calls = 0
    const result = accumulator.advance(1000, () => {
      calls += 1
    })
    expect(result.steps).toBe(60)
    expect(calls).toBe(60)
    expect(result.remainderMs).toBeCloseTo(0, 8)
  })

  it('produces the same tick count for fragmented render deltas', () => {
    const accumulator = new FixedStepAccumulator()
    const deltas = [7, 9, 14, 22, 5, 33, 41, 19, 50]
    const elapsed = deltas.reduce((sum, value) => sum + value, 0)
    let steps = 0
    for (const delta of deltas) steps += accumulator.advance(delta).steps
    const direct = fixedStepsForDelta(0, elapsed)
    expect(steps).toBe(direct.steps)
    expect(accumulator.remainderMs).toBeCloseTo(direct.remainderMs, 8)
  })

  it('caps a stalled render frame and reports discarded time', () => {
    const accumulator = new FixedStepAccumulator()
    const result = accumulator.update(1000)
    expect(result.steps).toBe(15)
    expect(result.droppedMs).toBeCloseTo(750, 6)
    expect(result.remainderMs).toBeLessThan(FIXED_STEP_MS)
  })

  it('rejects invalid step options', () => {
    expect(() => new FixedStepAccumulator({ stepMs: 0 })).toThrow(RangeError)
    expect(() => new FixedStepAccumulator({ maxStepsPerFrame: 0 })).toThrow(RangeError)
  })
})
