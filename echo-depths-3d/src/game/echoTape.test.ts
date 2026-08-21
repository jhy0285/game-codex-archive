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
  it('captures a tick-aligned path sample per recorded frame', () => {
    const tape = new EchoTape<Snapshot>()
    tape.start({ tick: 0, actor: { x: 0, z: 0 }, doorOpen: false })
    for (let i = 0; i < 5; i += 1) {
      tape.record(
        createInputFrame({ moveX: 1 }),
        { x: i, y: 1, z: i * 2 },
        i * 0.5,
      )
    }
    expect(tape.recordedPath).toHaveLength(5)
    expect(tape.recordedYaws).toEqual([0, 0.5, 1, 1.5, 2])
    expect(tape.recordedPath[2]).toEqual({ x: 2, y: 1, z: 4 })
  })

  it('exposes pathAt / yawAt so replay stays aligned after rebuild', () => {
    const tape = new EchoTape<Snapshot>()
    tape.start({ tick: 0, actor: { x: 0, z: 0 }, doorOpen: false })
    for (let i = 0; i < 8; i += 1) {
      tape.record(createInputFrame({}), { x: i, y: 0.5, z: -i }, i * 0.1)
    }
    const recording = tape.finish()
    expect(recording).not.toBeNull()
    // Replace simulates GameApp's rebuildChapter() -> echoTape.replace() flow.
    // The recorded path must survive this round trip.
    tape.reset()
    tape.replace(recording!)
    expect(tape.recordedPath).toHaveLength(8)
    expect(tape.pathAt(3)).toEqual({ x: 3, y: 0.5, z: -3 })
    expect(tape.yawAt(7)).toBeCloseTo(0.7, 5)
    // Out-of-range ticks clamp to the last sample.
    expect(tape.pathAt(999)).toEqual({ x: 7, y: 0.5, z: -7 })
    expect(tape.yawAt(999)).toBeCloseTo(0.7, 5)
  })

  it('exportRecording/import round-trip preserves path and yaws', () => {
    const tape = new EchoTape<Snapshot>()
    tape.start({ tick: 1, actor: { x: 1, z: 1 }, doorOpen: false })
    tape.record(createInputFrame({ moveX: 1 }), { x: 2, y: 0, z: 3 }, 1.2)
    tape.record(createInputFrame({ moveZ: -1 }), { x: 4, y: 0, z: 5 }, -0.7)
    const exported = tape.exportRecording()
    expect(exported).not.toBeNull()
    expect(exported!.path).toHaveLength(2)
    expect(exported!.yaws).toEqual([1.2, -0.7])
    // Mutating the exported path must not affect future reads from the tape.
    ;(exported!.path[0] as { x: number }).x = 999
    expect(tape.pathAt(0)).toEqual({ x: 2, y: 0, z: 3 })
  })

  it('reset clears path and yaws alongside frames', () => {
    const tape = new EchoTape<Snapshot>()
    tape.start({ tick: 0, actor: { x: 0, z: 0 }, doorOpen: false })
    tape.record(createInputFrame({}), { x: 1, y: 2, z: 3 }, 0.5)
    tape.reset()
    expect(tape.recordedPath).toHaveLength(0)
    expect(tape.recordedYaws).toHaveLength(0)
    expect(tape.pathAt(0)).toBeNull()
    expect(tape.yawAt(0)).toBeNull()
  })

})
