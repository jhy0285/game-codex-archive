import { describe, expect, it } from 'vitest'
import { CharacterMotor } from './CharacterMotor'
import { RapierWorld } from './RapierWorld'

describe('RapierWorld gameplay sensors', () => {
  it('reports a kinematic actor overlapping a fixed sensor', async () => {
    const physics = await RapierWorld.create()
    try {
      const sensor = physics.createSensor(
        'test-plate',
        'plate',
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
      )
      physics.createActor('player', 'player', { x: 0, y: 0, z: 0 })

      physics.step()

      expect(physics.intersections(sensor.collider, new Set(['player'])).map((record) => record.tag.id)).toEqual(['player'])
    } finally {
      physics.dispose()
    }
  })

  it('uses a rotated fixed cuboid as a physical slope', async () => {
    const physics = await RapierWorld.create()
    try {
      const angle = Math.PI / 6
      const rotation = { x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }
      const ramp = physics.createStaticBox(
        'test-ramp',
        'floor',
        { x: 0, y: 0, z: 0 },
        { x: 2.4, y: 0.18, z: 1 },
        false,
        rotation,
      )
      const ball = physics.createDynamicBall('test-ball', { x: 0, y: 1.2, z: 0 }, 0.24)

      for (let tick = 0; tick < 120; tick += 1) physics.step()

      expect(ramp.body.rotation().z).toBeCloseTo(rotation.z, 5)
      expect(ball.body.translation().x).toBeLessThan(-0.45)
    } finally {
      physics.dispose()
    }
  })

  it('does not let a character motor stand on a gameplay sensor', async () => {
    const physics = await RapierWorld.create()
    const record = physics.createActor('echo', 'echo', { x: 0, y: 1.265, z: 0 })
    const motor = new CharacterMotor(physics, record)
    try {
      physics.createStaticBox('test-floor', 'floor', { x: 0, y: 0, z: 0 }, { x: 4, y: 0.45, z: 3 })
      const sensor = physics.createSensor('test-plate', 'plate', { x: 0, y: 0.5, z: 0 }, { x: 1.15, y: 0.18, z: 1.15 })

      for (let tick = 0; tick < 24; tick += 1) {
        motor.prepare({ moveX: 0, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step()
        motor.syncAfterStep()
      }

      expect(motor.grounded).toBe(true)
      expect(motor.position.y).toBeLessThan(1.3)
      expect(physics.intersections(sensor.collider, new Set(['echo'])).map((entry) => entry.tag.id)).toEqual(['echo'])
    } finally {
      motor.dispose()
      physics.dispose()
    }
  })

  it('blocks the kinematic character motor at authored solid geometry', async () => {
    const physics = await RapierWorld.create()
    const record = physics.createActor('player', 'player', { x: -2, y: 1.24, z: 0 })
    const motor = new CharacterMotor(physics, record)
    try {
      physics.createStaticBox('test-floor', 'floor', { x: 0, y: 0, z: 0 }, { x: 4, y: 0.45, z: 3 })
      physics.createStaticBox('test-wall', 'wall', { x: 0, y: 2, z: 0 }, { x: 0.3, y: 2, z: 2 })

      for (let tick = 0; tick < 180; tick += 1) {
        motor.prepare({ moveX: 1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step()
        motor.syncAfterStep()
      }

      expect(motor.grounded).toBe(true)
      expect(motor.position.x).toBeLessThan(-0.6)
    } finally {
      motor.dispose()
      physics.dispose()
    }
  })

  it('blocks the character motor at a loose cargo object', async () => {
    const physics = await RapierWorld.create()
    const record = physics.createActor('player', 'player', { x: -2, y: 1.24, z: 0 })
    const motor = new CharacterMotor(physics, record)
    try {
      physics.createStaticBox('test-floor', 'floor', { x: 0, y: 0, z: 0 }, { x: 4, y: 0.45, z: 3 })
      physics.createDynamicBox('test-crate', 'crate', { x: 0, y: 0.98, z: 0 }, { x: 0.5, y: 0.5, z: 0.5 })

      for (let tick = 0; tick < 180; tick += 1) {
        motor.prepare({ moveX: 1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step()
        motor.syncAfterStep()
      }

      expect(motor.grounded).toBe(true)
      expect(motor.position.x).toBeLessThan(-0.8)
    } finally {
      motor.dispose()
      physics.dispose()
    }
  })

  it('lets the character motor walk across a static docking deck', async () => {
    const physics = await RapierWorld.create()
    const record = physics.createActor('player', 'player', { x: 0, y: 1.39, z: 0 })
    const motor = new CharacterMotor(physics, record)
    try {
      physics.createStaticBox('test-dock', 'floor', { x: 0, y: 0.35, z: 0 }, { x: 4, y: 0.25, z: 3 })

      for (let tick = 0; tick < 45; tick += 1) {
        motor.prepare({ moveX: 1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step()
        motor.syncAfterStep()
      }

      expect(motor.grounded).toBe(true)
      expect(motor.position.x).toBeGreaterThan(1.5)
    } finally {
      motor.dispose()
      physics.dispose()
    }
  })

  it('brakes smoothly on release while reversing direction decisively', async () => {
    const physics = await RapierWorld.create()
    const record = physics.createActor('player', 'player', { x: 0, y: 1.24, z: 0 })
    const motor = new CharacterMotor(physics, record)
    try {
      physics.createStaticBox('test-floor', 'floor', { x: 0, y: 0, z: 0 }, { x: 8, y: 0.45, z: 3 })
      for (let tick = 0; tick < 48; tick += 1) {
        motor.prepare({ moveX: 1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step()
        motor.syncAfterStep()
      }
      const speedBeforeRelease = motor.velocity.x
      for (let tick = 0; tick < 6; tick += 1) {
        motor.prepare({ moveX: 0, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step()
        motor.syncAfterStep()
      }
      const speedAfterRelease = motor.velocity.x
      for (let tick = 0; tick < 10; tick += 1) {
        motor.prepare({ moveX: -1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step()
        motor.syncAfterStep()
      }

      expect(speedBeforeRelease).toBeGreaterThan(4)
      expect(speedAfterRelease).toBeGreaterThan(0.5)
      expect(speedAfterRelease).toBeLessThan(speedBeforeRelease)
      expect(motor.velocity.x).toBeLessThan(-3.5)
    } finally {
      motor.dispose()
      physics.dispose()
    }
  })
})
