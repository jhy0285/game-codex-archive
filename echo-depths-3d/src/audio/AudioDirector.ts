export type AudioCue =
  | 'jump'
  | 'land'
  | 'dash'
  | 'attack'
  | 'interact'
  | 'lever'
  | 'pickup'
  | 'drop'
  | 'doorOpen'
  | 'doorClose'
  | 'platePress'
  | 'plateRelease'
  | 'receiver'
  | 'mechanismStart'
  | 'mechanismStop'
  | 'record'
  | 'echo'
  | 'solve'
  | 'fail'
  | 'complete'

export type MechanicalLoop = 'elevator' | 'platform' | 'bridge'

type ActiveCue = {
  oscillator: OscillatorNode
  filter: BiquadFilterNode
  gain: GainNode
}

export class AudioDirector {
  private context: AudioContext | undefined
  private master: GainNode | undefined
  private readonly activeCues = new Set<ActiveCue>()
  private readonly mechanicalLoops = new Map<string, ActiveCue>()
  private enabled = true
  private disposed = false

  constructor(private readonly createContext: () => AudioContext = () => new AudioContext()) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (this.master) this.master.gain.value = enabled ? 0.18 : 0
  }

  isEnabled(): boolean {
    return this.enabled
  }

  async resume(): Promise<void> {
    if (this.disposed || !this.enabled) return
    const context = this.ensureContext()
    if (context.state === 'suspended') await context.resume()
  }

  cue(cue: AudioCue): void {
    if (!this.enabled || this.disposed) return
    const context = this.ensureContext()
    const now = context.currentTime
    const settings: Record<AudioCue, [number, number, OscillatorType, number]> = {
      jump: [260, 440, 'sine', 0.16],
      land: [110, 72, 'triangle', 0.14],
      dash: [520, 150, 'sawtooth', 0.13],
      attack: [370, 92, 'square', 0.09],
      interact: [280, 350, 'sine', 0.12],
      lever: [460, 104, 'square', 0.14],
      pickup: [180, 420, 'triangle', 0.14],
      drop: [360, 118, 'triangle', 0.16],
      doorOpen: [84, 172, 'sawtooth', 0.46],
      doorClose: [190, 62, 'sawtooth', 0.42],
      platePress: [420, 176, 'square', 0.13],
      plateRelease: [150, 280, 'square', 0.1],
      receiver: [240, 780, 'sine', 0.5],
      mechanismStart: [82, 148, 'sawtooth', 0.2],
      mechanismStop: [146, 66, 'triangle', 0.18],
      record: [190, 620, 'triangle', 0.28],
      echo: [680, 210, 'sine', 0.34],
      solve: [330, 660, 'sine', 0.42],
      fail: [180, 58, 'sawtooth', 0.46],
      complete: [246, 740, 'triangle', 0.72],
    }
    const [start, end, type, duration] = settings[cue]
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const filter = context.createBiquadFilter()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(start, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, end), now + duration)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(cue === 'dash' || cue === 'attack' || cue.startsWith('door') ? 1300 : 2200, now)
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(cue === 'complete' ? 0.42 : 0.24, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    oscillator.connect(filter).connect(gain).connect(this.master ?? context.destination)
    const activeCue = { oscillator, filter, gain }
    this.activeCues.add(activeCue)
    oscillator.addEventListener('ended', () => this.releaseCue(activeCue), { once: true })
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
  }

  setMechanicalLoop(id: string, kind: MechanicalLoop, moving: boolean): void {
    const existing = this.mechanicalLoops.get(id)
    if (!moving) {
      if (existing) this.stopMechanicalLoop(id, existing)
      return
    }
    if (existing || !this.enabled || this.disposed) return
    const context = this.ensureContext()
    const now = context.currentTime
    const profiles: Record<MechanicalLoop, [number, number]> = {
      elevator: [76, 460],
      platform: [94, 620],
      bridge: [118, 760],
    }
    const [frequency, cutoff] = profiles[kind]
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const filter = context.createBiquadFilter()
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(frequency, now)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(cutoff, now)
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(kind === 'elevator' ? 0.075 : 0.055, now + 0.08)
    oscillator.connect(filter).connect(gain).connect(this.master ?? context.destination)
    const loop = { oscillator, filter, gain }
    this.mechanicalLoops.set(id, loop)
    oscillator.start(now)
  }

  reset(): void {
    const stopTime = this.context?.currentTime ?? 0
    for (const [id, loop] of [...this.mechanicalLoops]) this.stopMechanicalLoop(id, loop, stopTime)
    for (const cue of [...this.activeCues]) {
      try {
        cue.oscillator.stop(stopTime)
      } catch {
        // A naturally completed oscillator may already have stopped.
      }
      this.releaseCue(cue)
    }
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime)
      this.master.gain.value = this.enabled ? 0.18 : 0
    }
  }

  destroy(): void {
    if (this.disposed) return
    this.disposed = true
    this.reset()
    if (this.context && this.context.state !== 'closed') void this.context.close()
    this.context = undefined
    this.master = undefined
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = this.createContext()
      this.master = this.context.createGain()
      this.master.gain.value = this.enabled ? 0.18 : 0
      this.master.connect(this.context.destination)
    }
    return this.context
  }

  private releaseCue(cue: ActiveCue): void {
    if (!this.activeCues.delete(cue)) return
    cue.oscillator.disconnect()
    cue.filter.disconnect()
    cue.gain.disconnect()
  }

  private stopMechanicalLoop(id: string, loop: ActiveCue, stopTime = this.context?.currentTime ?? 0): void {
    if (this.mechanicalLoops.get(id) !== loop) return
    this.mechanicalLoops.delete(id)
    try {
      loop.gain.gain.cancelScheduledValues(stopTime)
      loop.gain.gain.setValueAtTime(0.001, stopTime)
      loop.oscillator.stop(stopTime + 0.03)
    } catch {}
    loop.oscillator.disconnect()
    loop.filter.disconnect()
    loop.gain.disconnect()
  }
}
