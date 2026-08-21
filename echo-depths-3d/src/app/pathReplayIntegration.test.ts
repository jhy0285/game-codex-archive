import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { RapierWorld } from '../physics/RapierWorld'
import { CharacterMotor } from '../physics/CharacterMotor'
import { DungeonWorld } from '../world/DungeonWorld'
import type { StageNumber } from '../levels/layouts'
import { ActionBits, createInputFrame } from '../game'
import { EchoTape } from '../game/echoTape'

type Snapshot = { tick: number }

const stubAssets = () => ({
  environmentModels: () => [],
  resourceModels: () => [],
  status: 'kaykit' as const,
})

const createActorContext = (id: string, kind: 'player' | 'echo', motor: CharacterMotor) => ({
  id,
  kind,
  position: motor.position,
  facingYaw: motor.facingYaw,
  interactHeld: false,
})

const createChapter = async (chapter: StageNumber) => {
  const physics = await RapierWorld.create()
  const scene = new THREE.Scene()
  const world = new DungeonWorld(scene, physics, stubAssets() as never, chapter)
  return { physics, scene, world }
}

// Place a floor so the echo stays grounded during replay (gravity pulls
// kinematic actors down between ticks; without a floor, the echo drifts y).


/* unused */


describe('Echo 2.0 path-replay integration (collision-aware follower)', () => {
  it('echo follows the recorded path tick-by-tick without falling behind', async () => {
    const { physics, world } = await createChapter(0)
    try {
      const playerRec = physics.createActor('p', 'player', { x: 0, y: 1, z: 0 })
      const echoRec = physics.createActor('e', 'echo', { x: 0, y: 1, z: 0 })
      const player = new CharacterMotor(physics, playerRec)
      const echo = new CharacterMotor(physics, echoRec)
      // Record a 30-tick eastward path.
      const tape = new EchoTape<Snapshot>()
      tape.start({ tick: 0 })
      for (let i = 0; i < 30; i += 1) {
        const pos = { x: i * 0.07, y: 1, z: 0 }
        tape.record(createInputFrame({ moveX: 1 }), pos, 0)
        // Advance echo to mimic real-time recording: set the body so subsequent replay matches.
        echoRec.body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true)
      }
      tape.finish()
      const recording = tape.exportRecording()!
      // Replace resets replayTick and copies frames + path + yaws.
      tape.reset()
      tape.replace(recording)
      // Simulate 30 ticks of replay using the same motor.setRecordedTranslation flow.
      const playerCtx = createActorContext('p', 'player', player)
      const echoCtx = createActorContext('e', 'echo', echo)
      // Spawn echo at recorded[0].
      echoRec.body.setTranslation({ x: recording.path[0]!.x, y: recording.path[0]!.y, z: recording.path[0]!.z }, true)
      for (let tick = 0; tick < 30; tick += 1) {
        const echoFrame = tape.nextReplayFrame()
        const point = tape.pathAt(tape.playbackTick)!
        const input = {
          moveX: 0,
          moveZ: 0,
          jumpPressed: Boolean(echoFrame.pressedMask & ActionBits.Jump),
          dashPressed: Boolean(echoFrame.pressedMask & ActionBits.Dash),
        }
        // pass tick for debugging via global
        ;(globalThis as { tick?: number }).tick = tick
        echo.setRecordedTranslation(point, input)
        world.beforePhysics(tick + 1, [playerCtx, echoCtx])
        physics.step()
        echo.syncAfterStep()
        world.afterPhysics([playerCtx, echoCtx])
        // Now the echo's body should be at or very near the recorded sample.
        const bodyT = echoRec.body.translation()
        // The collision-aware replay applies Rapier's controller correction.
        // We assert the echo is following (not stuck) and stays within a small
        // tolerance of the recorded sample on flat ground with no obstacles.
        // Any per-tick drift larger than 0.06m is a regression of the path follower.
        const target = recording.path[tape.playbackTick]!
        const dx = Math.abs(bodyT.x - target.x)
        const dz = Math.abs(bodyT.z - target.z)
        expect(dx, `tick ${tick}: echo x drift ${dx} > 0.06 (target=${target.x} body=${bodyT.x})`).toBeLessThan(0.06)
        expect(dz, `tick ${tick}: echo z drift ${dz} > 0.06`).toBeLessThan(0.06)
        tape.consumeReplayFrame()
      }
    } finally { world.dispose(); physics.dispose() }
  })

  it('echo pickup action fires at the same tick position as the recording', async () => {
    const { physics, world } = await createChapter(0)
    try {
      const playerRec = physics.createActor('p', 'player', { x: 0, y: 1, z: 0 })
      const echoRec = physics.createActor('e', 'echo', { x: 0, y: 1, z: 0 })
      const player = new CharacterMotor(physics, playerRec)
      const echo = new CharacterMotor(physics, echoRec)
      // Record: 5 ticks of neutral, then E pressed (pickup) at tick 5.
      const tape = new EchoTape<Snapshot>()
      tape.start({ tick: 0 })
      for (let i = 0; i < 5; i += 1) {
        tape.record(createInputFrame({}), { x: 0, y: 1, z: 0 }, 0)
      }
      tape.record(createInputFrame({ pressedMask: ActionBits.Interact }), { x: 0, y: 1, z: 0 }, 0)
      tape.finish()
      const recording = tape.exportRecording()!
      tape.reset()
      tape.replace(recording)
      const playerCtx = createActorContext('p', 'player', player)
      const echoCtx = createActorContext('e', 'echo', echo)
      // First 5 ticks: no action. Tick 5: E pressed (interact action).
      let pickupTick = -1
      for (let tick = 0; tick < 6; tick += 1) {
        const echoFrame = tape.nextReplayFrame()
        const point = tape.pathAt(tape.playbackTick)!
        echo.setRecordedTranslation(point, {
          moveX: 0, moveZ: 0,
          jumpPressed: Boolean(echoFrame.pressedMask & ActionBits.Jump),
          dashPressed: Boolean(echoFrame.pressedMask & ActionBits.Dash),
        })
        world.beforePhysics(tick + 1, [playerCtx, echoCtx])
        physics.step()
        echo.syncAfterStep()
        world.afterPhysics([playerCtx, echoCtx])
        if ((echoFrame.pressedMask & ActionBits.Interact) !== 0) pickupTick = tick
        tape.consumeReplayFrame()
      }
      expect(pickupTick).toBe(5)
    } finally { world.dispose(); physics.dispose() }
  })

  it('echo cannot tunnel through a wall — controller collision pushes back', async () => {
    const { physics, world } = await createChapter(0)
    try {
      // Build a thin wall directly in front of the echo and record a path that
      // would put it inside the wall. The replay should stop the echo on the
      // west side of the wall.
      const wall = physics.createStaticBox('w', 'wall', { x: 1.0, y: 1.0, z: 0 }, { x: 0.1, y: 1.0, z: 1.0 })
      const echoRec = physics.createActor('e', 'echo', { x: 0, y: 1, z: 0 })
      const echo = new CharacterMotor(physics, echoRec)
      const tape = new EchoTape<Snapshot>()
      tape.start({ tick: 0 })
      for (let i = 0; i < 10; i += 1) {
        tape.record(createInputFrame({ moveX: 1 }), { x: 0.5 + i * 0.1, y: 1, z: 0 }, 0)
      }
      tape.finish()
      const recording = tape.exportRecording()!
      tape.reset()
      tape.replace(recording)
      const echoCtx = createActorContext('e', 'echo', echo)
      const initialT = wall.body.translation()
      for (let tick = 0; tick < 10; tick += 1) {
        const echoFrame = tape.nextReplayFrame()
        const point = tape.pathAt(tape.playbackTick)!
        echo.setRecordedTranslation(point, {
          moveX: 0, moveZ: 0,
          jumpPressed: Boolean(echoFrame.pressedMask & ActionBits.Jump),
          dashPressed: Boolean(echoFrame.pressedMask & ActionBits.Dash),
        })
        world.beforePhysics(tick + 1, [echoCtx])
        physics.step()
        world.afterPhysics([echoCtx])
        tape.consumeReplayFrame()
      }
      // Echo must NOT have crossed to x > wall.x (the wall is a real collider).
      const echoT = echoRec.body.translation()
      expect(echoT.x, 'echo must not have tunneled through the wall').toBeLessThan(initialT.x)
    } finally { world.dispose(); physics.dispose() }
  })
})
