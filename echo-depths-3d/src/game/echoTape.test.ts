import { describe, expect, it } from 'vitest'
import { EchoTape } from './echoTape'
import { createInputFrame, dequantizeMovement, inputFramesEqual } from './input'
import { ActionBits, type InputFrame } from './types'

type Snapshot = {
  tick: number
  actor: { x: number; z: number }
  doorOpen: boolean
}

const simulate = (frames: readonly InputFrame[]) => {
  const state = { x: 0, z: 0, jumps: 0, interactions: 0, attacks: 0 }
  for (const frame of frames) {
    const movement = dequantizeMovement(frame)
    state.x += movement.x
    state.z += movement.z
    if ((frame.pressedMask & ActionBits.Jump) !== 0) state.jumps += 1
    if ((frame.pressedMask & ActionBits.Interact) !== 0) state.interactions += 1
    if ((frame.pressedMask & ActionBits.Attack) !== 0) state.attacks += 1
  }
  return state
}

describe('EchoTape', () => {
  it('records canonical input and no actor coordinates', () => {
    const tape = new EchoTape<Snapshot>()
    tape.start({ tick: 9, actor: { x: 4, z: -2 }, doorOpen: false })
    tape.record(createInputFrame({ moveX: 1, aimYaw: Math.PI, pressedMask: ActionBits.Jump }))
    const recording = tape.finish()
    expect(recording).not.toBeNull()
    const frame = recording!.frames[0]
    expect(frame).toEqual({ moveX: 127, moveZ: 0, aimYawQ: 32768, heldMask: 0, pressedMask: ActionBits.Jump })
    expect(Object.keys(frame!)).toEqual(['moveX', 'moveZ', 'aimYawQ', 'heldMask', 'pressedMask'])
  })

  it('deep-clones the record-start snapshot', () => {
    const source: Snapshot = { tick: 2, actor: { x: 1, z: 2 }, doorOpen: false }
    const tape = new EchoTape<Snapshot>()
    tape.start(source)
    source.actor.x = 99
    const saved = tape.recordStartSnapshot
    expect(saved?.actor.x).toBe(1)
    if (saved) saved.actor.z = 88
    expect(tape.recordStartSnapshot?.actor.z).toBe(2)
  })

  it('replays an identical action sequence through the same reducer', () => {
    const frames = [
      createInputFrame({ moveX: 1, moveZ: 0.2, aimYaw: 0 }),
      createInputFrame({ moveX: 1, moveZ: 0, aimYaw: 0, pressedMask: ActionBits.Jump }),
      createInputFrame({ moveX: 0, moveZ: -1, aimYaw: Math.PI, pressedMask: ActionBits.Interact }),
      createInputFrame({ moveX: -1, moveZ: 0, aimYaw: Math.PI, pressedMask: ActionBits.Attack }),
    ]
    const tape = new EchoTape<Snapshot>()
    tape.start({ tick: 0, actor: { x: 0, z: 0 }, doorOpen: false })
    for (const frame of frames) tape.record(frame)
    tape.finish()
    tape.beginReplay()
    const replay = frames.map(() => tape.nextReplayFrame())
    expect(replay.every((frame, index) => inputFramesEqual(frame, frames[index]!))).toBe(true)
    expect(simulate(replay)).toEqual(simulate(frames))
  })

  it('holds only interaction after replay and suppresses repeated actions', () => {
    const tape = new EchoTape<Snapshot>()
    tape.start({ tick: 0, actor: { x: 0, z: 0 }, doorOpen: false })
    tape.record(createInputFrame({
      moveZ: 1,
      aimYaw: 1,
      heldMask: ActionBits.Interact | ActionBits.Attack,
      pressedMask: ActionBits.Jump | ActionBits.Attack,
    }))
    tape.finish()
    tape.beginReplay()
    tape.nextReplayFrame()
    const terminal = tape.nextReplayFrame()
    expect(terminal.moveX).toBe(0)
    expect(terminal.moveZ).toBe(0)
    expect(terminal.pressedMask).toBe(0)
    expect(terminal.heldMask).toBe(ActionBits.Interact)
    expect(tape.mode).toBe('holding')
  })

  it('replaces the previous recording when a new recording starts', () => {
    const tape = new EchoTape<Snapshot>()
    tape.start({ tick: 1, actor: { x: 1, z: 1 }, doorOpen: false })
    tape.record(createInputFrame({ moveX: 1 }))
    tape.finish()
    tape.start({ tick: 5, actor: { x: 5, z: 5 }, doorOpen: true })
    tape.record(createInputFrame({ moveZ: -1 }))
    tape.finish()
    expect(tape.durationTicks).toBe(1)
    expect(tape.recordStartSnapshot?.tick).toBe(5)
    expect(tape.frameAt(0).moveZ).toBe(-127)
  })

  it('finishes automatically at the authored capacity', () => {
    const tape = new EchoTape<Snapshot>({ maxFrames: 2 })
    tape.start({ tick: 0, actor: { x: 0, z: 0 }, doorOpen: false })
    expect(tape.record(createInputFrame({ moveX: 1 }))).toBe(true)
    expect(tape.record(createInputFrame({ moveZ: 1 }))).toBe(true)
    expect(tape.mode).toBe('ready')
    expect(() => tape.record(createInputFrame())).toThrow()
  })
})
