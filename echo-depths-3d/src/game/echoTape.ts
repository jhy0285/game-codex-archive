import { cloneInputFrame, createInputFrame } from './input'
import { ActionBits, NEUTRAL_INPUT, type InputFrame } from './types'

export type EchoTapeMode = 'idle' | 'recording' | 'ready' | 'replaying' | 'holding'

export type EchoRecording<TSnapshot> = Readonly<{
  snapshot: TSnapshot
  frames: readonly InputFrame[]
  terminalHeldMask: number
}>

export type EchoTapeOptions<TSnapshot> = Readonly<{
  maxFrames?: number
  cloneSnapshot?: (snapshot: TSnapshot) => TSnapshot
  terminalHeldMask?: number
}>

const defaultClone = <T>(value: T): T => structuredClone(value)

export class EchoTape<TSnapshot> {
  readonly maxFrames: number
  readonly allowedTerminalHeldMask: number

  private readonly cloneSnapshot: (snapshot: TSnapshot) => TSnapshot
  private currentMode: EchoTapeMode = 'idle'
  private startSnapshot: TSnapshot | null = null
  private frames: InputFrame[] = []
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

  start(snapshot: TSnapshot) {
    this.startSnapshot = this.cloneSnapshot(snapshot)
    this.frames = []
    this.replayTick = 0
    this.currentMode = 'recording'
  }

  record(frame: InputFrame) {
    if (this.currentMode !== 'recording') {
      throw new Error('EchoTape.record requires recording mode')
    }
    if (this.frames.length >= this.maxFrames) return false
    this.frames.push(cloneInputFrame(frame))
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

  nextReplayFrame(): InputFrame {
    if (this.currentMode === 'ready') this.beginReplay()
    if (this.currentMode !== 'replaying' && this.currentMode !== 'holding') {
      return NEUTRAL_INPUT
    }

    const frame = this.frames[this.replayTick]
    if (frame) {
      this.replayTick += 1
      if (this.replayTick >= this.frames.length) this.currentMode = 'holding'
      return cloneInputFrame(frame)
    }
    this.currentMode = 'holding'
    return this.terminalFrame()
  }

  replace(recording: EchoRecording<TSnapshot>) {
    if (recording.frames.length === 0) {
      throw new RangeError('An echo recording must contain at least one frame')
    }
    this.startSnapshot = this.cloneSnapshot(recording.snapshot)
    this.frames = recording.frames.slice(0, this.maxFrames).map(cloneInputFrame)
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
      terminalHeldMask,
    }
  }

  reset() {
    this.startSnapshot = null
    this.frames = []
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
