import { describe, expect, it, vi } from 'vitest'
import { AudioDirector } from './AudioDirector'

function fakeAudioContext() {
  const oscillators: Array<{
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
  }> = []
  const gains: Array<{ gain: { value: number; cancelScheduledValues: ReturnType<typeof vi.fn> } }> = []
  const destination = {}
  const context = {
    currentTime: 2,
    state: 'running',
    destination,
    createOscillator: vi.fn(() => {
      const oscillator = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn((target: unknown) => target),
        disconnect: vi.fn(),
        addEventListener: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscillators.push(oscillator)
      return oscillator
    }),
    createGain: vi.fn(() => {
      const gain = {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn((target: unknown) => target),
        disconnect: vi.fn(),
      }
      gains.push(gain)
      return gain
    }),
    createBiquadFilter: vi.fn(() => ({
      type: 'lowpass',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn((target: unknown) => target),
      disconnect: vi.fn(),
    })),
    close: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
  }
  return { context: context as unknown as AudioContext, oscillators, gains }
}

describe('AudioDirector lifecycle reset', () => {
  it('stops and disconnects active cues without closing the shared context', () => {
    const fake = fakeAudioContext()
    const director = new AudioDirector(() => fake.context)

    director.cue('attack')
    const oscillator = fake.oscillators[0]
    expect(oscillator).toBeDefined()

    director.reset()

    expect(oscillator?.stop).toHaveBeenCalledTimes(2)
    expect(oscillator?.disconnect).toHaveBeenCalledOnce()
    expect((fake.context.close as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })

  it('preserves the sound preference while cancelling scheduled master gain changes', () => {
    const fake = fakeAudioContext()
    const director = new AudioDirector(() => fake.context)
    director.cue('record')
    director.setEnabled(false)

    director.reset()

    expect(director.isEnabled()).toBe(false)
    expect(fake.gains[0]?.gain.cancelScheduledValues).toHaveBeenCalledWith(2)
    expect(fake.gains[0]?.gain.value).toBe(0)
  })

  it('plays distinct device cues and keeps one loop per moving mechanism', () => {
    const fake = fakeAudioContext()
    const director = new AudioDirector(() => fake.context)

    for (const cue of ['lever', 'doorOpen', 'doorClose', 'platePress', 'plateRelease', 'receiver'] as const) director.cue(cue)
    director.setMechanicalLoop('counter-elevator', 'elevator', true)
    director.setMechanicalLoop('counter-elevator', 'elevator', true)

    expect(fake.oscillators).toHaveLength(7)
    const loop = fake.oscillators[6]
    director.setMechanicalLoop('counter-elevator', 'elevator', false)

    expect(loop?.start).toHaveBeenCalledOnce()
    expect(loop?.stop).toHaveBeenCalledWith(2.03)
  })
})
