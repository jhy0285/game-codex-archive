import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { AssetLibrary } from '../render/AssetLibrary'
import { RapierWorld } from '../physics/RapierWorld'
import { CharacterMotor } from '../physics/CharacterMotor'
import { CHAPTER_LAYOUTS, type StageNumber } from '../levels/layouts'
import { canActorRequestExit, DungeonWorld, type ActorContext } from './DungeonWorld'

const actor = (id: string, kind: 'player' | 'echo', position: readonly [number, number, number]): ActorContext => ({
  id,
  kind,
  position: new THREE.Vector3(...position),
  facingYaw: 0,
  interactHeld: false,
})

const assets = (resourceCount = 0, environmentCount = 0): AssetLibrary => ({
  environmentModels: () => Array.from({ length: environmentCount }, () => {
    const model = new THREE.Group()
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()))
    return model
  }),
  resourceModels: () => Array.from({ length: resourceCount }, () => {
    const model = new THREE.Group()
    model.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial()))
    return model
  }),
}) as unknown as AssetLibrary

const createWorld = async (chapter: StageNumber, resourceCount = 0, environmentCount = 0) => {
  const physics = await RapierWorld.create()
  const scene = new THREE.Scene()
  const world = new DungeonWorld(scene, physics, assets(resourceCount, environmentCount), chapter)
  return { physics, scene, world }
}

const stepWorld = (
  world: DungeonWorld,
  physics: RapierWorld,
  tick: number,
  actors: readonly ActorContext[],
) => {
  world.beforePhysics(tick, actors)
  physics.step()
  world.afterPhysics(actors)
}

describe('DungeonWorld authored runtime contracts', () => {
  it('builds a safe orientation stage with a console, practice crate, and no campaign objectives', async () => {
    const { physics, world } = await createWorld(0)
    try {
      expect(world.nearestInteractable(new THREE.Vector3(-3.5, 1.08, 0.8))?.id).toBe('orientation-console')
      expect(world.debugState().objectiveFacts).toEqual([])
      expect(physics.record('practice-crate')).toBeDefined()
      expect(world.debugState().doors).toEqual({})
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('matches the authored ramp visual rotation and gives authored decor matching solid colliders', async () => {
    const { physics, scene, world } = await createWorld(5, 3, 16)
    try {
      const rampDefinition = CHAPTER_LAYOUTS[5].boxes.find((box) => box.id === 'well-ramp')
      const rampVisual = scene.getObjectByName('well-ramp')
      const rampBody = physics.record('well-ramp')
      const resourceDecor: THREE.Object3D[] = []
      const environmentDecor: THREE.Object3D[] = []
      scene.traverse((object) => {
        if (object.name.startsWith('ResourceDecor-')) resourceDecor.push(object)
        if (object.name.startsWith('EnvironmentDecor-')) environmentDecor.push(object)
      })

      expect(rampDefinition?.rotation?.[2]).toBeGreaterThan(0.5)
      expect(rampVisual).toBeDefined()
      expect(rampBody).toBeDefined()
      expect(rampBody?.body.rotation().z).toBeCloseTo(rampVisual?.quaternion.z ?? 0, 6)
      expect(rampBody?.body.rotation().w).toBeCloseTo(rampVisual?.quaternion.w ?? 0, 6)
      const decor = CHAPTER_LAYOUTS[5].decor
      expect(resourceDecor).toHaveLength(decor.filter((definition) => definition.source === 'resource').length)
      expect(environmentDecor).toHaveLength(decor.filter((definition) => definition.source === 'environment').length)
      for (const definition of decor.filter((definition) => definition.solid)) {
        expect(physics.record(`decor-${definition.id}`)).toBeDefined()
      }
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('lets the shared capsule motor climb the authored Chapter 5 ramp onto the middle floor', async () => {
    const { physics, world } = await createWorld(5)
    const record = physics.createActor('ramp-player', 'player', { x: -6.15, y: 1.24, z: -0.8 })
    const motor = new CharacterMotor(physics, record)
    try {
      let highestY = motor.position.y
      let groundedTicks = 0
      for (let tick = 0; tick < 115; tick += 1) {
        motor.prepare({
          moveX: tick < 10 ? 0 : 1,
          moveZ: 0,
          jumpPressed: false,
          dashPressed: false,
        })
        physics.step()
        motor.syncAfterStep()
        highestY = Math.max(highestY, motor.position.y)
        if (motor.grounded) groundedTicks += 1
      }

      const traversal = { x: motor.position.x, y: motor.position.y, highestY, groundedTicks }
      expect(motor.position.x, JSON.stringify(traversal)).toBeGreaterThan(-0.8)
      expect(highestY).toBeGreaterThan(3.35)
      expect(groundedTicks).toBeGreaterThan(70)
    } finally {
      motor.dispose()
      world.dispose()
      physics.dispose()
    }
  })

  it('allows only the current player, never the echo, to request and complete an exit', async () => {
    const { physics, world } = await createWorld(1)
    try {
      const exitPosition = CHAPTER_LAYOUTS[1].devices.find((device) => device.id === 'exit')?.position
      const platePosition = CHAPTER_LAYOUTS[1].devices.find((device) => device.id === 'echo-plate')?.position
      if (!exitPosition || !platePosition) throw new Error('Chapter 1 exit or echo plate is missing')
      const echoBody = physics.createActor('echo', 'echo', { x: exitPosition[0], y: exitPosition[1], z: exitPosition[2] })
      const echoAtExit = actor('echo', 'echo', exitPosition)
      physics.step()

      expect(canActorRequestExit('echo')).toBe(false)
      expect(world.interact(echoAtExit)).toBeUndefined()
      world.afterPhysics([echoAtExit])
      expect(world.complete).toBe(false)

      echoBody.body.setTranslation({ x: platePosition[0], y: platePosition[1], z: platePosition[2] }, true)
      echoBody.body.setNextKinematicTranslation({ x: platePosition[0], y: platePosition[1], z: platePosition[2] })
      const echoAtPlate = actor('echo', 'echo', platePosition)
      physics.createActor('player', 'player', { x: exitPosition[0], y: exitPosition[1], z: exitPosition[2] })
      const playerAtExit = actor('player', 'player', exitPosition)
      physics.step()
      world.performDebugSolutionStep(0, playerAtExit, echoAtPlate)
      world.afterPhysics([playerAtExit, echoAtPlate])

      expect(canActorRequestExit('player')).toBe(true)
      expect(world.interact(playerAtExit)).toBe('exit')
      world.afterPhysics([playerAtExit, echoAtPlate])
      expect(world.complete).toBe(true)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('uses the same nearby range for the interaction prompt and a visibly active lever action', async () => {
    const { physics, scene, world } = await createWorld(1)
    try {
      const promptedPlayer = actor('player', 'player', [-3.625, 1.265, 2.025])

      expect(world.nearestInteractable(promptedPlayer.position)?.id).toBe('tutorial-lever')
      expect(world.interact(promptedPlayer)).toBe('lever')
      expect(world.debugState().facts).toContain('tutorial-lever')
      world.beforePhysics(1, [promptedPlayer])
      const handle = scene.getObjectByName('LeverHandle')
      if (!(handle instanceof THREE.Mesh) || !(handle.material instanceof THREE.MeshStandardMaterial)) {
        throw new Error('Tutorial lever handle is missing its standard material')
      }
      expect(handle.rotation.z).toBeGreaterThan(-0.3)
      expect(handle.material.emissiveIntensity).toBeGreaterThan(0.8)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('emits door and pressure-scanner sounds only when their authored states change', async () => {
    const { physics, world } = await createWorld(1)
    try {
      const leverPosition = CHAPTER_LAYOUTS[1].devices.find((device) => device.id === 'tutorial-lever')?.position
      const platePosition = CHAPTER_LAYOUTS[1].devices.find((device) => device.id === 'echo-plate')?.position
      if (!leverPosition || !platePosition) throw new Error('Chapter 1 audio devices are missing')
      const player = actor('player', 'player', leverPosition)
      const echo = actor('echo', 'echo', platePosition)
      const echoBody = physics.createActor('echo', 'echo', { x: platePosition[0], y: platePosition[1], z: platePosition[2] })

      expect(world.interact(player)).toBe('lever')
      world.beforePhysics(1, [player, echo])
      physics.step()
      world.afterPhysics([player, echo])
      expect(world.takeAudioEvents()).toEqual([{ type: 'plate', id: 'echo-plate', pressed: true }])

      world.beforePhysics(2, [player, echo])
      expect(world.takeAudioEvents()).toEqual([{ type: 'door', id: 'first-door', open: true }])

      echoBody.body.setTranslation({ x: 30, y: 1, z: 30 }, true)
      echoBody.body.setNextKinematicTranslation({ x: 30, y: 1, z: 30 })
      physics.step()
      world.afterPhysics([player, echo])
      expect(world.takeAudioEvents()).toEqual([{ type: 'plate', id: 'echo-plate', pressed: false }])

      world.beforePhysics(3, [player, echo])
      expect(world.takeAudioEvents()).toEqual([{ type: 'door', id: 'first-door', open: false }])
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('starts and stops a moving-elevator sound with actual authored motion', async () => {
    const { physics, world } = await createWorld(2)
    try {
      const leverPosition = CHAPTER_LAYOUTS[2].devices.find((device) => device.id === 'lift-lever')?.position
      const elevator = CHAPTER_LAYOUTS[2].devices.find((device) => device.id === 'counter-elevator')
      if (!leverPosition || !elevator?.position) throw new Error('Chapter 2 lift audio devices are missing')
      const elevatorSize = elevator.size ?? [0.55, 0.55, 0.55]
      const echo = actor('echo', 'echo', leverPosition)
      echo.interactHeld = true
      const player = actor('player', 'player', [
        elevator.position[0],
        elevator.position[1] + elevatorSize[1] + 0.1,
        elevator.position[2],
      ])

      expect(world.interact(echo)).toBe('lever')
      world.beforePhysics(1, [player, echo])
      expect(world.takeAudioEvents()).toEqual([{ type: 'mechanism', id: 'counter-elevator', mechanism: 'elevator', moving: true }])

      echo.interactHeld = false
      world.beforePhysics(30, [player, echo])
      expect(world.takeAudioEvents()).toEqual([])
      world.beforePhysics(31, [player, echo])
      expect(world.takeAudioEvents()).toEqual([{ type: 'mechanism', id: 'counter-elevator', mechanism: 'elevator', moving: false }])
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('renders every authored device type as an industrial puzzle prop without changing physics records', async () => {
    const expectedParts = {
      plate: ['SecurityScannerDeck', 'SecurityScannerPanel', 'SecurityScannerBeacons'],
      lever: ['ControlConsoleBase', 'ControlConsoleScreen', 'LeverPivot', 'LeverHandle', 'ControlConsoleIndicator'],
      door: ['VaultDoorCore', 'VaultDoorFace', 'VaultDoorRails', 'VaultDoorStatusStripes'],
      elevator: ['IndustrialPlatformDeck', 'IndustrialPlatformInset', 'IndustrialPlatformRails', 'IndustrialPlatformBeacons'],
      platform: ['IndustrialPlatformDeck', 'IndustrialPlatformInset', 'IndustrialPlatformRails', 'IndustrialPlatformBeacons'],
      bridge: ['IndustrialPlatformDeck', 'IndustrialPlatformInset', 'IndustrialPlatformRails', 'IndustrialPlatformBeacons'],
      crate: ['CargoShell', 'CargoCornerBraces', 'CargoBands', 'CargoSeal'],
      core: ['CoreCrystal', 'CoreEquator', 'CoreHalo', 'CoreLight'],
      trap: ['TrapHousing', 'TrapWarningRails', 'TrapSpikes'],
      exit: ['ExitPlinth', 'ExitTransitArch', 'ExitBeam', 'ExitBeacons'],
      receiver: ['ReceiverCradle', 'ReceiverRing', 'ReceiverProngs', 'ReceiverBeam'],
      enemy: ['SentryBase', 'SentryShell', 'SentryEye', 'SentryHalo', 'SentryFins', 'SightCone'],
    } as const

    for (const chapter of [0, 1, 2, 3, 4, 5] as const) {
      const { physics, scene, world } = await createWorld(chapter)
      try {
        const firstPillar = scene.getObjectByName('pillar-0')
        expect(firstPillar?.getObjectByName('PillarFooting')).toBeInstanceOf(THREE.Mesh)
        expect(firstPillar?.getObjectByName('PillarCrown')).toBeInstanceOf(THREE.Mesh)
        expect(firstPillar?.getObjectByName('PillarSignalBands')).toBeInstanceOf(THREE.InstancedMesh)

        for (const definition of CHAPTER_LAYOUTS[chapter].devices) {
          const device = scene.getObjectByName(definition.id)
          expect(device).toBeInstanceOf(THREE.Group)
          expect(physics.record(definition.id)).toBeDefined()
          for (const part of expectedParts[definition.kind]) {
            expect(device?.getObjectByName(part), `${definition.id} is missing ${part}`).toBeDefined()
          }
        }
      } finally {
        world.dispose()
        physics.dispose()
      }
    }
  })

  it('renders every pressure sensor as a compact airport-style scanner and brightens it when engaged', async () => {
    for (const chapter of [1, 2, 5] as const) {
      const { physics, scene, world } = await createWorld(chapter)
      try {
        const definition = CHAPTER_LAYOUTS[chapter].devices.find((device) => device.kind === 'plate')
        if (!definition?.size) throw new Error(`Chapter ${chapter} pressure plate is missing`)
        const scanner = scene.getObjectByName(definition.id)
        const deck = scanner?.getObjectByName('SecurityScannerDeck')
        const frame = scanner?.getObjectByName('SecurityScannerFrame')
        const panel = scanner?.getObjectByName('SecurityScannerPanel')
        const rails = scanner?.getObjectByName('SecurityScannerRails')
        const beacons = scanner?.getObjectByName('SecurityScannerBeacons')

        expect(scanner).toBeInstanceOf(THREE.Group)
        expect(deck).toBeInstanceOf(THREE.Mesh)
        expect(frame).toBeInstanceOf(THREE.Mesh)
        expect(panel).toBeInstanceOf(THREE.Mesh)
        expect(rails).toBeInstanceOf(THREE.InstancedMesh)
        expect(beacons).toBeInstanceOf(THREE.InstancedMesh)
        expect((deck as THREE.Mesh).geometry).toBeInstanceOf(THREE.BoxGeometry)
        expect(((deck as THREE.Mesh).geometry as THREE.BoxGeometry).parameters.width).toBeLessThan(definition.size[0] * 2)
        expect((beacons as THREE.InstancedMesh).count).toBe(4)
        expect(physics.record(definition.id)?.tag.kind).toBe('plate')
      } finally {
        world.dispose()
        physics.dispose()
      }
    }

    const { physics, scene, world } = await createWorld(1)
    try {
      const platePosition = CHAPTER_LAYOUTS[1].devices.find((device) => device.id === 'echo-plate')?.position
      if (!platePosition) throw new Error('Chapter 1 scanner plate is missing')
      physics.createActor('scanner-echo', 'echo', { x: platePosition[0], y: 1.265, z: platePosition[2] })
      stepWorld(world, physics, 1, [actor('scanner-echo', 'echo', [platePosition[0], 1.265, platePosition[2]])])
      const panel = scene.getObjectByName('echo-plate')?.getObjectByName('SecurityScannerPanel')
      const beacons = scene.getObjectByName('echo-plate')?.getObjectByName('SecurityScannerBeacons')
      if (!(panel instanceof THREE.Mesh) || !(panel.material instanceof THREE.MeshStandardMaterial)) {
        throw new Error('Scanner panel is missing its standard material')
      }
      if (!(beacons instanceof THREE.InstancedMesh) || !(beacons.material instanceof THREE.MeshStandardMaterial)) {
        throw new Error('Scanner beacons are missing their standard material')
      }

      expect(world.debugState().pressurePlates['echo-plate']?.active).toBe(true)
      expect(panel.scale.y).toBeLessThan(1)
      expect(panel.material.emissiveIntensity).toBeGreaterThan(0.8)
      expect(beacons.material.emissiveIntensity).toBeGreaterThan(0.8)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('opens the first gate when a grounded echo remains on the lower pressure seal', async () => {
    const { physics, world } = await createWorld(1)
    const platePosition = CHAPTER_LAYOUTS[1].devices.find((device) => device.id === 'echo-plate')?.position
    if (!platePosition) throw new Error('Chapter 1 echo plate is missing')
    const echoRecord = physics.createActor('echo', 'echo', { x: platePosition[0], y: 1.265, z: platePosition[2] })
    const echoMotor = new CharacterMotor(physics, echoRecord)
    try {
      const player = actor('player', 'player', [-3.625, 1.265, 2.025])
      const echo = actor('echo', 'echo', [platePosition[0], 1.265, platePosition[2]])
      expect(world.interact(player)).toBe('lever')

      for (let tick = 1; tick <= 24; tick += 1) {
        world.beforePhysics(tick, [player, echo])
        echoMotor.prepare({ moveX: 0, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step()
        echoMotor.syncAfterStep()
        echo.position.copy(echoMotor.position)
        world.afterPhysics([player, echo])
      }
      world.beforePhysics(25, [player, echo])

      const state = world.debugState()
      expect(state.pressurePlates['echo-plate']?.active).toBe(true)
      expect(state.pressurePlates['echo-plate']?.actor).toBe('echo')
      expect(state.facts).toContain('echo-plate')
      expect(state.doors['first-door']?.open).toBe(true)
    } finally {
      echoMotor.dispose()
      world.dispose()
      physics.dispose()
    }
  })

  it('keeps pressure sensors active after restoring an echo snapshot', async () => {
    const { physics, world } = await createWorld(1)
    const platePosition = CHAPTER_LAYOUTS[1].devices.find((device) => device.id === 'echo-plate')?.position
    if (!platePosition) throw new Error('Chapter 1 echo plate is missing')
    try {
      const snapshot = world.captureSnapshot()
      world.restoreSnapshot(snapshot, true)
      physics.createActor('echo', 'echo', { x: platePosition[0], y: 1.265, z: platePosition[2] })
      const echo = actor('echo', 'echo', [platePosition[0], 1.265, platePosition[2]])

      physics.step()
      world.afterPhysics([echo])

      expect(world.debugState().pressurePlates['echo-plate']?.active).toBe(true)
      expect(world.debugState().pressurePlates['echo-plate']?.actor).toBe('echo')
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('drops the Chapter 2 counterweight from the dock onto the lower weight plate', async () => {
    const { physics, world } = await createWorld(2)
    try {
      const carrier = actor('player', 'player', [5.05, 4.915, 1.55])
      for (let tick = 0; tick < 90; tick += 1) physics.step()

      expect(world.interact(carrier)).toBe('crate')
      expect(world.isCarrying('player', 'crate')).toBe(true)
      carrier.position.set(2.14, 4.915, 3.504)
      carrier.facingYaw = 0
      world.beforePhysics(1, [carrier])
      physics.step()
      world.afterPhysics([carrier])

      expect(world.interact(carrier)).toBe('crate')
      expect(world.isCarrying('player', 'crate')).toBe(false)
      for (let tick = 2; tick < 180; tick += 1) {
        world.beforePhysics(tick, [carrier])
        physics.step()
        world.afterPhysics([carrier])
      }

      const state = world.debugState()
      expect(state.pressurePlates['weight-plate']?.active, JSON.stringify(state)).toBe(true)
      expect(state.facts).toContain('cargo-plate')
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('holds cargo ahead of the camera heading beside the carrying hand without changing movement-facing direction', async () => {
    const { physics, scene, world } = await createWorld(2)
    try {
      const carrier = actor('player', 'player', [5.05, 4.915, 1.55])
      carrier.facingYaw = 0
      carrier.carryYaw = Math.PI / 2
      for (let tick = 0; tick < 90; tick += 1) physics.step()

      expect(world.interact(carrier)).toBe('crate')
      expect(world.isCarrying('player', 'crate')).toBe(true)
      carrier.position.set(4.2, 4.915, 0.8)
      for (let tick = 0; tick < 10; tick += 1) {
        world.beforePhysics(tick, [carrier])
        physics.step()
      }

      const crate = scene.getObjectByName('cargo-crate')
      if (!crate) throw new Error('Carried crate visual is missing')
      expect(crate.position.x).toBeCloseTo(carrier.position.x + 1.16, 1)
      expect(crate.position.z).toBeCloseTo(carrier.position.z - 0.98, 1)
      expect(carrier.facingYaw).toBe(0)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('keeps carried cargo in front of the carrier through movement and a camera turn', async () => {
    const { physics, scene, world } = await createWorld(2)
    try {
      const carrier = actor('player', 'player', [5.05, 4.915, 1.55])
      for (let tick = 0; tick < 90; tick += 1) physics.step()

      expect(world.interact(carrier)).toBe('crate')
      carrier.position.set(4.25, 4.915, 0.8)
      world.beforePhysics(1, [carrier])
      physics.step()

      const crate = scene.getObjectByName('cargo-crate')
      if (!crate) throw new Error('Carried crate visual is missing')
      expect(crate.position.z - carrier.position.z).toBeGreaterThan(1.01)
      expect(crate.position.y - carrier.position.y).toBeGreaterThan(0.14)

      carrier.carryYaw = Math.PI
      world.beforePhysics(2, [carrier])
      physics.step()

      expect(carrier.position.z - crate.position.z).toBeGreaterThan(1.01)
      expect(crate.position.y - carrier.position.y).toBeGreaterThan(0.14)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('keeps the Chapter 2 player motor grounded while traversing the dock', async () => {
    const { physics, world } = await createWorld(2)
    const record = physics.createActor('dock-player', 'player', { x: 2.1, y: 4.915, z: -0.7 })
    const motor = new CharacterMotor(physics, record)
    try {
      const player = actor('dock-player', 'player', [2.1, 4.915, -0.7])
      for (let tick = 1; tick <= 75; tick += 1) {
        world.beforePhysics(tick, [player])
        motor.prepare({ moveX: 1, moveZ: 0.45, jumpPressed: false, dashPressed: false })
        physics.step()
        motor.syncAfterStep()
        player.position.copy(motor.position)
        world.afterPhysics([player])
      }

      expect(motor.grounded).toBe(true)
      expect(motor.position.x).toBeGreaterThan(3)
      expect(motor.position.y).toBeGreaterThan(4.7)
    } finally {
      motor.dispose()
      world.dispose()
      physics.dispose()
    }
  })




  it('requires a Chapter 5 upper launch and descending receiver entry before core power completes', async () => {
    const { physics, world } = await createWorld(5)
    try {
      const core = physics.record('paradox-core')
      const receiver = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'power-receiver')?.position
      if (!core || !receiver) throw new Error('Chapter 5 core or receiver is missing')

      core.body.setTranslation({ x: receiver[0], y: receiver[1], z: receiver[2] }, true)
      core.body.setLinvel({ x: 0, y: -1, z: 0 }, true)
      physics.step()
      world.afterPhysics([])
      expect(world.debugState().cores['paradox-core']?.receiver).toBe(false)
      expect(world.debugState().facts).not.toContain('core-receiver')

      const coreStart = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'paradox-core')?.position
      if (!coreStart) throw new Error('Chapter 5 core start is missing')
      core.body.setTranslation({ x: coreStart[0], y: coreStart[1], z: coreStart[2] }, true)
      core.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      physics.step()
      world.afterPhysics([])
      const carrier = actor('player', 'player', coreStart)
      expect(world.interact(carrier)).toBe('core')
      expect(world.isCarrying('player', 'core')).toBe(true)
      carrier.position.set(-1, 3.75, -0.8)
      expect(world.throwOrDrop(carrier, new THREE.Vector3(-1, 0, 0))).toBe('core')
      expect(world.debugState().facts).toContain('core-thrown-down')
      expect(world.isCarrying('player', 'core')).toBe(false)
      expect(world.captureSnapshot().dynamics['paradox-core']?.upperThrowArmed).toBe(true)

      let deliveryTicks = 0
      while (!world.debugState().cores['paradox-core']?.receiver && deliveryTicks < 120) {
        physics.step()
        world.afterPhysics([])
        deliveryTicks += 1
      }
      expect(world.debugState().cores['paradox-core']?.receiver).toBe(true)
      expect(deliveryTicks).toBeGreaterThan(20)
      expect(deliveryTicks).toBeLessThan(80)
      expect(world.debugState().facts).toEqual(expect.arrayContaining(['core-thrown-down', 'core-receiver']))
      expect(world.debugState().objectiveFacts.slice(0, 2)).toEqual(['core-thrown-down', 'core-receiver'])
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('clears Chapter 4 by having the echo lure a stationary watcher into the reachable flank trap', async () => {
    const { physics, world } = await createWorld(4)
    try {
      const echo = actor('echo', 'echo', [-0.8, 0.72, 3.1])
      echo.interactHeld = true
      const player = actor('player', 'player', [2.7, 3.25, -0.95])
      expect(world.interact(echo)).toBe('lever')
      stepWorld(world, physics, 1, [player, echo])
      expect(world.debugState().facts).toContain('lured-by-echo')
      expect(world.attack(player, new THREE.Vector3(-1, 0, 1)), JSON.stringify({ player: player.position, state: world.debugState() })).toBe('watcher')

      for (let tick = 2; tick < 90 && !world.debugState().enemies.watcher?.defeated; tick += 1) {
        stepWorld(world, physics, tick, [player, echo])
      }
      stepWorld(world, physics, 90, [player, echo])

      const trapped = world.debugState()
      expect(trapped.facts).toEqual(expect.arrayContaining(['lured-by-echo', 'watcher-trapped']))
      expect(trapped.enemies.watcher?.defeated).toBe(true)
      expect(trapped.doors['gallery-door']?.open).toBe(true)
      player.position.set(8.35, 1.08, -1.8)
      expect(world.interact(player)).toBe('exit')
      world.afterPhysics([player, echo])
      expect(world.complete).toBe(true)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('clears the full Chapter 5 objective chain after a real core delivery, echo seal lure, high attack, and dual seal', async () => {
    const { physics, world } = await createWorld(5)
    try {
      const coreStart = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'paradox-core')?.position
      const lowerSeal = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'lower-seal')?.position
      const upperSeal = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'upper-seal')?.position
      if (!coreStart || !lowerSeal || !upperSeal) throw new Error('Chapter 5 route devices are missing')
      for (let tick = 0; tick < 48; tick += 1) physics.step()

      const carrier = actor('player', 'player', coreStart)
      expect(world.interact(carrier)).toBe('core')
      carrier.position.set(-1, 3.75, -0.8)
      stepWorld(world, physics, 1, [carrier])
      expect(world.throwOrDrop(carrier, new THREE.Vector3(-1, 0, 0))).toBe('core')
      for (let tick = 2; tick < 120 && !world.debugState().cores['paradox-core']?.receiver; tick += 1) {
        stepWorld(world, physics, tick, [carrier])
      }
      expect(world.debugState().facts).toEqual(expect.arrayContaining(['core-thrown-down', 'core-receiver']))

      physics.createActor('echo', 'echo', { x: lowerSeal[0], y: lowerSeal[1], z: lowerSeal[2] })
      const echo = actor('echo', 'echo', lowerSeal)
      const player = actor('player', 'player', [1.7, 5.3, 2.5])
      stepWorld(world, physics, 120, [player, echo])
      expect(world.debugState().facts).toEqual(expect.arrayContaining(['lower-seal-echo', 'guardian-target-echo']))
      expect(world.attack(player, new THREE.Vector3(0, 0, 1))).toBe('guardian')

      player.position.set(...upperSeal)
      player.interactHeld = true
      expect(world.interact(player)).toBe('lever')
      stepWorld(world, physics, 121, [player, echo])
      stepWorld(world, physics, 122, [player, echo])

      const opened = world.debugState()
      expect(opened.facts).toEqual(expect.arrayContaining([
        'guardian-defeated', 'lower-seal-echo', 'upper-seal-player', 'dual-seal',
      ]))
      expect(opened.doors['final-door']?.open).toBe(true)
      expect(opened.escapeSeconds).toBeGreaterThan(0)
      player.position.set(8.85, 5.78, 0.3)
      expect(world.interact(player)).toBe('exit')
      world.afterPhysics([player, echo])
      expect(world.complete).toBe(true)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('keeps the Chapter 5 passage open only while both actors still hold their live seals', async () => {
    const { physics, world } = await createWorld(5)
    try {
      const lowerSeal = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'lower-seal')?.position
      const upperSeal = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'upper-seal')?.position
      if (!lowerSeal || !upperSeal) throw new Error('Chapter 5 seals are missing')
      const echoBody = physics.createActor('echo', 'echo', {
        x: lowerSeal[0], y: lowerSeal[1], z: lowerSeal[2],
      })
      physics.createActor('player', 'player', {
        x: upperSeal[0], y: upperSeal[1], z: upperSeal[2],
      })
      const echo = actor('echo', 'echo', lowerSeal)
      const player = actor('player', 'player', upperSeal)
      physics.step()

      const required = world.debugState().objectiveFacts
      for (let step = 0; step < required.length; step += 1) world.performDebugSolutionStep(step, player, echo)
      world.afterPhysics([player, echo])
      for (let tick = 0; tick < 60; tick += 1) {
        world.beforePhysics(tick, [player, echo])
        physics.step()
        world.afterPhysics([player, echo])
      }

      expect(world.debugState().facts).toEqual(expect.arrayContaining(['dual-seal', 'lower-seal-echo', 'upper-seal-player']))
      const liveState = world.debugState()
      expect(liveState.doors['final-door']?.open, JSON.stringify(liveState)).toBe(true)

      echoBody.body.setTranslation({ x: 20, y: 20, z: 20 }, true)
      echoBody.body.setNextKinematicTranslation({ x: 20, y: 20, z: 20 })
      physics.step()
      for (let tick = 60; tick < 120; tick += 1) {
        world.beforePhysics(tick, [player])
        physics.step()
        world.afterPhysics([player])
      }

      expect(world.debugState().facts).toContain('dual-seal')
      expect(world.debugState().facts).not.toContain('lower-seal-echo')
      expect(world.debugState().doors['final-door']?.open).toBe(false)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('fails clearly when an unfilled puzzle core falls out of the playable world', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const core = physics.record('memory-core')
      if (!core) throw new Error('Chapter 3 core is missing')
      core.body.setTranslation({ x: 0, y: -5, z: 0 }, true)
      physics.step()
      world.afterPhysics([])

      expect(world.failed).toBe(true)
      expect(world.failureReason).toBe('core-lost')
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('disposes an expired transient effect exactly once before world teardown', async () => {
    const { physics, scene, world } = await createWorld(4)
    try {
      expect(world.attack(actor('player', 'player', [1.4, 0.98, -0.4]), new THREE.Vector3(1, 0, 0))).toBe('watcher')
      const wave = scene.getObjectByName('TemporalWave')
      if (!(wave instanceof THREE.Mesh)) throw new Error('Temporal wave was not created')
      let disposeCount = 0
      wave.geometry.addEventListener('dispose', () => { disposeCount += 1 })

      for (let tick = 0; tick < 72; tick += 1) world.afterPhysics([])

      expect(scene.getObjectByName('TemporalWave')).toBeUndefined()
      expect(disposeCount).toBe(1)
      world.dispose()
      expect(disposeCount).toBe(1)
    } finally {
      if (scene.getObjectByName('Chapter4')) world.dispose()
      physics.dispose()
    }
  })
})
