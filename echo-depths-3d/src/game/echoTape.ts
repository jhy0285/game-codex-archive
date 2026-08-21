import { cloneInputFrame, createInputFrame } from './input'
import { ActionBits, NEUTRAL_INPUT, type InputFrame, type Vector3 } from './types'

export type EchoTapeMode = 'idle' | 'recording' | 'ready' | 'replaying' | 'holding'

export type EchoRecording<TSnapshot> = Readonly<{
  snapshot: TSnapshot
  frames: readonly InputFrame[]
  /**
   * Tick-aligned echo replay samples (one entry per recorded frame). The echo
   * follows these samples as the authoritative source of motion during replay,
   * so it cannot drift even when raw input is replayed through physics.
   */
  path: readonly Vector3[]
  /** Tick-aligned facing yaw samples (one entry per recorded frame). */
  yaws: readonly number[]
  terminalHeldMask: number
}>

export type EchoTapeOptions<TSnapshot> = Readonly<{
  maxFrames?: number
  cloneSnapshot?: (snapshot: TSnapshot) => TSnapshot
  terminalHeldMask?: number
}>

const defaultClone = <T>(value: T): T => structuredClone(value)
const clonePathPoint = (p: Vector3): Vector3 => ({ x: p.x, y: p.y, z: p.z })

export class EchoTape<TSnapshot> {
  readonly maxFrames: number
  readonly allowedTerminalHeldMask: number

  private readonly cloneSnapshot: (snapshot: TSnapshot) => TSnapshot
  private currentMode: EchoTapeMode = 'idle'
  private startSnapshot: TSnapshot | null = null
  private frames: InputFrame[] = []
  private path: Vector3[] = []
  private yaws: number[] = []
  private replayTick = 0

  constructor(options: EchoTapeOptions<TSnapshot> = {}) {
    this.maxFrames = options.maxFrames ?? 15 * 60
    this.allowedTerminalHeldMask = options.terminalHeldMask ?? ActionBits.Interact
    this.cloneSnapshot = options.cloneSnapshot ?? defaultClone

    if (!Number.isInteger(this.maxFrames) || this.maxFrames < 1) {
      throw new RangeError('maxFrames must be a positive integer')
    }
  }

  get mode() {
    return this.currentMode
  }

  get durationTicks() {
    return this.frames.length
  }

  get playbackTick() {
    return this.replayTick
  }

  get isRecording() {
    return this.currentMode === 'recording'
  }

  get hasRecording() {
    return this.startSnapshot !== null && this.frames.length > 0
  }

  get recordStartSnapshot(): TSnapshot | null {
    return this.startSnapshot === null ? null : this.cloneSnapshot(this.startSnapshot)
  }

  /** Tick-aligned path samples captured during recording (read-only). */
  get recordedPath(): readonly Vector3[] {
    return this.path
  }

  /** Tick-aligned yaw samples captured during recording (read-only). */
  get recordedYaws(): readonly number[] {
    return this.yaws
  }

  start(snapshot: TSnapshot) {
    this.startSnapshot = this.cloneSnapshot(snapshot)
    this.frames = []
    this.path = []
    this.yaws = []
    this.replayTick = 0
    this.currentMode = 'recording'
  }

  record(frame: InputFrame, position?: Vector3, facingYaw?: number): boolean {
    if (this.currentMode !== 'recording') {
      throw new Error('EchoTape.record requires recording mode')
    }
    if (this.frames.length >= this.maxFrames) return false
    this.frames.push(cloneInputFrame(frame))
    if (position) this.path.push(clonePathPoint(position))
    if (typeof facingYaw === 'number') this.yaws.push(facingYaw)
    if (this.frames.length === this.maxFrames) this.finish()
    return true
  }

  finish(): EchoRecording<TSnapshot> | null {
    if (this.currentMode !== 'recording' || this.startSnapshot === null) return null
    if (this.frames.length === 0) this.frames.push(NEUTRAL_INPUT)
    this.currentMode = 'ready'
    this.replayTick = 0
    return this.exportRecording()
  }

  beginReplay() {
    if (!this.hasRecording) return false
    this.currentMode = 'replaying'
    this.replayTick = 0
    return true
  }

  frameAt(tick: number): InputFrame {
    if (!this.hasRecording) return NEUTRAL_INPUT
    const safeTick = Math.max(0, Math.trunc(tick))
    const frame = this.frames[safeTick]
    if (frame) return cloneInputFrame(frame)
    return this.terminalFrame()
  }

  /** Recorded position sample at the given tick, clamped to the recorded range. */
  pathAt(tick: number): Vector3 | null {
    if (this.path.length === 0) return null
    const safeTick = Math.max(0, Math.min(Math.trunc(tick), this.path.length - 1))
    return this.path[safeTick] ?? null
  }

  /** Recorded facing yaw sample at the given tick, clamped to the recorded range. */
  yawAt(tick: number): number | null {
    if (this.yaws.length === 0) return null
    const safeTick = Math.max(0, Math.min(Math.trunc(tick), this.yaws.length - 1))
    return this.yaws[safeTick] ?? null
  }

  /**
   * Read the input frame at the current playback index without advancing it.
   *
   * Tick-aligned callers MUST call `consumeReplayFrame()` exactly once per
   * replay tick, AFTER both this frame and its matching transform sample
   * (via `pathAt(replayTick)` / `yawAt(replayTick)`) have been consumed.
   * This decouples the frame read from the index advance so the first
   * replay frame pairs with `path[0]`, not `path[1]`.
   */
  nextReplayFrame(): InputFrame {
    if (this.currentMode === 'ready') this.beginReplay()
    if (this.currentMode !== 'replaying' && this.currentMode !== 'holding') {
      return NEUTRAL_INPUT
    }

    const frame = this.frames[this.replayTick]
    if (frame) return cloneInputFrame(frame)
    // Past the last recorded frame — stay in holding; the terminal frame
    // preserves only the allowed held-interaction bit (e.g. E).
    this.currentMode = 'holding'
    return this.terminalFrame()
  }

  /**
   * Advance `playbackTick` by one tick. Call this AFTER both the input frame
   * (`nextReplayFrame`) and the transform sample (`pathAt` / `yawAt`) for
   * the current tick have been consumed. No-op once `mode === 'holding'`.
   */
  consumeReplayFrame(): void {
    if (this.currentMode !== 'replaying') return
    this.replayTick += 1
    if (this.replayTick >= this.frames.length) {
      this.currentMode = 'holding'
    }
  }

  replace(recording: EchoRecording<TSnapshot>) {
    if (recording.frames.length === 0) {
      throw new RangeError('An echo recording must contain at least one frame')
    }
    this.startSnapshot = this.cloneSnapshot(recording.snapshot)
    this.frames = recording.frames.slice(0, this.maxFrames).map(cloneInputFrame)
    this.path = recording.path.slice(0, this.maxFrames).map(clonePathPoint)
    this.yaws = recording.yaws.slice(0, this.maxFrames)
    this.replayTick = 0
    this.currentMode = 'ready'
  }

  exportRecording(): EchoRecording<TSnapshot> | null {
    if (!this.hasRecording || this.startSnapshot === null) return null
    const lastFrame = this.frames[this.frames.length - 1]
    const terminalHeldMask = (lastFrame?.heldMask ?? 0) & this.allowedTerminalHeldMask
    return {
      snapshot: this.cloneSnapshot(this.startSnapshot),
      frames: this.frames.map(cloneInputFrame),
      path: this.path.map(clonePathPoint),
      yaws: this.yaws.slice(),
      terminalHeldMask,
    }
  }

  reset() {
    this.startSnapshot = null
    this.frames = []
    this.path = []
    this.yaws = []
    this.replayTick = 0
    this.currentMode = 'idle'
  }

  private terminalFrame(): InputFrame {
    const lastFrame = this.frames[this.frames.length - 1]
    if (!lastFrame) return NEUTRAL_INPUT
    return createInputFrame({
      aimYawQ: lastFrame.aimYawQ,
      heldMask: lastFrame.heldMask & this.allowedTerminalHeldMask,
    })
  }
}

