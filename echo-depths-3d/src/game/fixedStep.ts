export const FIXED_STEP_MS = 1000 / 60
export const FIXED_STEP_SECONDS = 1 / 60

export type FixedStepResult = Readonly<{
  steps: number
  remainderMs: number
  alpha: number
  droppedMs: number
}>

export type FixedStepOptions = Readonly<{
  stepMs?: number
  maxFrameDeltaMs?: number
  maxStepsPerFrame?: number
}>

const finiteNonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0

export class FixedStepAccumulator {
  readonly stepMs: number
  readonly maxFrameDeltaMs: number
  readonly maxStepsPerFrame: number

  private remainder = 0

  constructor(options: FixedStepOptions = {}) {
    this.stepMs = options.stepMs ?? FIXED_STEP_MS
    this.maxFrameDeltaMs = options.maxFrameDeltaMs ?? 250
    this.maxStepsPerFrame = options.maxStepsPerFrame ?? 15

    if (!(this.stepMs > 0) || !Number.isFinite(this.stepMs)) {
      throw new RangeError('stepMs must be a finite positive number')
    }
    if (!(this.maxFrameDeltaMs > 0) || !Number.isFinite(this.maxFrameDeltaMs)) {
      throw new RangeError('maxFrameDeltaMs must be a finite positive number')
    }
    if (!Number.isInteger(this.maxStepsPerFrame) || this.maxStepsPerFrame < 1) {
      throw new RangeError('maxStepsPerFrame must be a positive integer')
    }
  }

  get remainderMs() {
    return this.remainder
  }

  reset(remainderMs = 0) {
    this.remainder = finiteNonNegative(remainderMs) % this.stepMs
  }

  update(deltaMs: number, onStep?: (stepSeconds: number) => void): FixedStepResult {
    const requestedDelta = finiteNonNegative(deltaMs)
    const acceptedDelta = Math.min(requestedDelta, this.maxFrameDeltaMs)
    let droppedMs = requestedDelta - acceptedDelta
    const total = this.remainder + acceptedDelta
    const timingEpsilon = this.stepMs * 1e-9
    const availableSteps = Math.floor((total + timingEpsilon) / this.stepMs)
    const steps = Math.min(availableSteps, this.maxStepsPerFrame)

    for (let index = 0; index < steps; index += 1) {
      onStep?.(this.stepMs / 1000)
    }

    let nextRemainder = Math.max(0, total - steps * this.stepMs)
    if (nextRemainder + timingEpsilon >= this.stepMs) {
      const overflowSteps = Math.floor((nextRemainder + timingEpsilon) / this.stepMs)
      const overflowMs = overflowSteps * this.stepMs
      droppedMs += overflowMs
      nextRemainder -= overflowMs
    }
    this.remainder = Math.max(0, nextRemainder)

    return {
      steps,
      remainderMs: this.remainder,
      alpha: Math.min(1, this.remainder / this.stepMs),
      droppedMs,
    }
  }

  advance(milliseconds: number, onStep?: (stepSeconds: number) => void): FixedStepResult {
    const requestedDelta = finiteNonNegative(milliseconds)
    const total = this.remainder + requestedDelta
    const steps = Math.floor((total + this.stepMs * 1e-9) / this.stepMs)

    for (let index = 0; index < steps; index += 1) {
      onStep?.(this.stepMs / 1000)
    }

    this.remainder = Math.max(0, total - steps * this.stepMs)
    return {
      steps,
      remainderMs: this.remainder,
      alpha: Math.min(1, this.remainder / this.stepMs),
      droppedMs: 0,
    }
  }
}

export const fixedStepsForDelta = (
  remainderMs: number,
  deltaMs: number,
  stepMs = FIXED_STEP_MS,
): FixedStepResult => {
  const accumulator = new FixedStepAccumulator({
    stepMs,
    maxFrameDeltaMs: Number.MAX_VALUE,
    maxStepsPerFrame: Number.MAX_SAFE_INTEGER,
  })
  accumulator.reset(remainderMs)
  return accumulator.advance(deltaMs)
}
