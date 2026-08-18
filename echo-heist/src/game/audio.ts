export type SoundCue =
  | 'start'
  | 'step'
  | 'interact'
  | 'bind'
  | 'pulse'
  | 'throw'
  | 'plate'
  | 'door'
  | 'dash'
  | 'hit'
  | 'fail'
  | 'receiver'
  | 'guardian'
  | 'escape'

type Tone = {
  frequency: number
  duration: number
  gain: number
  offset?: number
  endFrequency?: number
  type?: OscillatorType
}

const CUES: Readonly<Record<SoundCue, readonly Tone[]>> = {
  start: [
    { frequency: 220, endFrequency: 440, duration: 0.18, gain: 0.05, type: 'triangle' },
    { frequency: 660, duration: 0.12, gain: 0.025, offset: 0.14, type: 'sine' },
  ],
  step: [{ frequency: 86, duration: 0.035, gain: 0.012, type: 'square' }],
  interact: [{ frequency: 310, endFrequency: 390, duration: 0.08, gain: 0.035, type: 'triangle' }],
  bind: [
    { frequency: 520, endFrequency: 130, duration: 0.28, gain: 0.055, type: 'sawtooth' },
    { frequency: 780, endFrequency: 260, duration: 0.31, gain: 0.025, offset: 0.03, type: 'sine' },
  ],
  pulse: [
    { frequency: 120, endFrequency: 48, duration: 0.12, gain: 0.075, type: 'square' },
    { frequency: 820, endFrequency: 260, duration: 0.09, gain: 0.022, type: 'sine' },
  ],
  throw: [{ frequency: 190, endFrequency: 520, duration: 0.15, gain: 0.045, type: 'triangle' }],
  plate: [
    { frequency: 280, duration: 0.11, gain: 0.038, type: 'sine' },
    { frequency: 420, duration: 0.14, gain: 0.03, offset: 0.07, type: 'sine' },
  ],
  door: [
    { frequency: 72, endFrequency: 125, duration: 0.35, gain: 0.06, type: 'sawtooth' },
    { frequency: 240, duration: 0.2, gain: 0.02, offset: 0.18, type: 'triangle' },
  ],
  dash: [{ frequency: 720, endFrequency: 160, duration: 0.13, gain: 0.04, type: 'sawtooth' }],
  hit: [{ frequency: 58, endFrequency: 38, duration: 0.09, gain: 0.085, type: 'square' }],
  fail: [
    { frequency: 190, endFrequency: 70, duration: 0.3, gain: 0.055, type: 'triangle' },
    { frequency: 48, duration: 0.2, gain: 0.04, offset: 0.08, type: 'square' },
  ],
  receiver: [
    { frequency: 330, duration: 0.13, gain: 0.04, type: 'sine' },
    { frequency: 495, duration: 0.15, gain: 0.035, offset: 0.08, type: 'sine' },
    { frequency: 742, duration: 0.2, gain: 0.03, offset: 0.16, type: 'sine' },
  ],
  guardian: [
    { frequency: 95, endFrequency: 42, duration: 0.42, gain: 0.09, type: 'sawtooth' },
    { frequency: 620, endFrequency: 90, duration: 0.34, gain: 0.035, offset: 0.06, type: 'square' },
  ],
  escape: [
    { frequency: 220, endFrequency: 440, duration: 0.36, gain: 0.045, type: 'triangle' },
    { frequency: 330, endFrequency: 660, duration: 0.42, gain: 0.04, offset: 0.18, type: 'triangle' },
    { frequency: 550, endFrequency: 1_100, duration: 0.55, gain: 0.035, offset: 0.38, type: 'sine' },
  ],
}

export class GameAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private unlocked = false
  private enabled = true

  isEnabled() {
    return this.enabled
  }

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.72
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') await this.context.resume()
    this.unlocked = true
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? 0.72 : 0, this.context.currentTime, 0.02)
    }
  }

  toggle() {
    this.setEnabled(!this.enabled)
    return this.enabled
  }

  cue(name: SoundCue) {
    if (!this.unlocked || !this.enabled || !this.context || !this.master) return
    const now = this.context.currentTime
    for (const tone of CUES[name]) this.playTone(tone, now)
  }

  private playTone(tone: Tone, now: number) {
    if (!this.context || !this.master) return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const start = now + (tone.offset ?? 0)
    const end = start + tone.duration
    oscillator.type = tone.type ?? 'sine'
    oscillator.frequency.setValueAtTime(tone.frequency, start)
    if (tone.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, end)
    }
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, tone.gain), start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(start)
    oscillator.stop(end + 0.02)
  }

  dispose() {
    if (this.context) void this.context.close()
    this.context = null
    this.master = null
    this.unlocked = false
  }
}
