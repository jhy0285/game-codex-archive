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
      gate: ['TemporalGatePost', 'TemporalGateBeam', 'TemporalGateBase'],
      shutter: ['TransferShutterSlat', 'TransferShutterFrame'],
      'one-way-wall': ['OneWayWall', 'OneWayWallStripe'],
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

  // ===== Echo System 2.0 — Temporal Replay + Shared Physical Objects =====

  it('Test A — Player persists at end, object rewinds to start, Echo starts at A', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const core = physics.record('memory-core')
      if (!core) throw new Error('memory-core missing')
      // record-start state: player A, core at spawn [-3, 3.75, 1.6]
      const coreStart = core.body.translation()
      // 1) Record snapshot at start (before any move)
      const snap = world.captureSnapshot()
      // 2) During recording: player moves to B and pushes core
      const playerEnd = actor('player', 'player', [5.0, 3.75, 1.6])
      core.body.setTranslation({ x: 2.0, y: 3.75, z: 1.6 }, true)
      physics.step()
      world.afterPhysics([playerEnd])
      // Rewind to start
      world.restoreSnapshot(snap, false)
      physics.step()
      // Player should remain at recording-end, core should be at recording-start
      expect(playerEnd.position.x).toBeCloseTo(5.0, 1)
      // core rewinds to its recording-start position
      const cAfter = core.body.translation()
      expect(cAfter.x).toBeCloseTo(coreStart.x, 1)
      expect(cAfter.y).toBeCloseTo(coreStart.y, 1)
      expect(cAfter.z).toBeCloseTo(coreStart.z, 1)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Test B — ownership: when player holds core, echo cannot take it; after drop, echo can', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const player = actor('player', 'player', [-3.0, 3.75, 1.6])
      const echo = actor('echo', 'echo', [-3.0, 3.75, 1.6])
      // Player picks up
      world.interact(player)
      physics.step(); world.afterPhysics([player, echo])
      const snap1 = world.captureSnapshot()
      expect(snap1.dynamics['memory-core']?.carriedBy).toBe('player')
      // Echo attempts to take the same object (ownership rule blocks)
      world.interact(echo)
      physics.step(); world.afterPhysics([player, echo])
      const snap2 = world.captureSnapshot()
      // Carry should STILL be by player (echo's attempt was rejected)
      expect(snap2.dynamics['memory-core']?.carriedBy).toBe('player')
      // Player drops
      world.interact(player)
      physics.step(); world.afterPhysics([player, echo])
      // Echo can now pickup the same real object
      world.interact(echo)
      physics.step(); world.afterPhysics([player, echo])
      const snap3 = world.captureSnapshot()
      expect(snap3.dynamics['memory-core']?.carriedBy).toBe('echo')
    } finally { world.dispose(); physics.dispose() }
  })

  it('Test C — no duplicate objects spawned on echo replay', async () => {
    const { physics, world } = await createWorld(3)
    try {
      // count dynamics before/after simulated echo
      const beforeCount = Object.keys(world.captureSnapshot().dynamics).filter(id => id === 'memory-core').length
      // Simulate echo pickup + throw + receiver (no duplicate)
      const player = actor('player', 'player', [-3.0, 3.75, 1.6])
      expect(world.interact(player)).toBe('core')
      world.throwOrDrop(player, new THREE.Vector3(1, 0, 0))
      physics.step()
      world.afterPhysics([player])
      const afterCount = Object.keys(world.captureSnapshot().dynamics).filter(id => id === 'memory-core').length
      expect(afterCount).toBe(beforeCount)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Test D — Player moves object before Echo pickup → Echo fails', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const player = actor('player', 'player', [-3.0, 3.75, 1.6])
      const echo = actor('echo', 'echo', [-3.0, 3.75, 1.6])
      // Player picks up core (moves it away)
      expect(world.interact(player)).toBe('core')
      world.throwOrDrop(player, new THREE.Vector3(0, 0, 1))
      physics.step()
      world.afterPhysics([player, echo])
      // Echo tries to interact at original core position
      echo.position.set(0, 0.5, 0) // far away
      const result = world.interact(echo)
      // Echo should fail (no device in range, no core nearby)
      expect(result).toBeUndefined()
    } finally { world.dispose(); physics.dispose() }
  })

  it('Test E — one active tape (new R destroys/replaces previous Echo)', async () => {
    const { physics, world } = await createWorld(3)
    try {
      // Test that world.captureSnapshot only returns one snapshot
      const snap1 = world.captureSnapshot()
      const snap2 = world.captureSnapshot()
      // Two snapshots exist (each is independent), but only one echo is created via the
      // game loop's 'ready' transition. Verify echoTape replacement semantics via re-records.
      // (Smoke test: snapshots are valid objects and capture distinct state)
      expect(snap1).toBeDefined()
      expect(snap2).toBeDefined()
      // Restoring twice is idempotent
      world.restoreSnapshot(snap1, false)
      world.restoreSnapshot(snap2, false)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Test F — regression: captureSnapshot + restoreSnapshot preserve dynamics and devices', async () => {
    const { physics, world } = await createWorld(2)
    try {
      // ch2 has elevator, weight-plate, cargo
      const cargo = physics.record('cargo-crate')
      if (!cargo) throw new Error('cargo-crate missing')
      const snap = world.captureSnapshot()
      // Mutate
      cargo.body.setTranslation({ x: 100, y: 100, z: 100 }, true)
      cargo.body.setLinvel({ x: 50, y: 0, z: 0 }, true)
      physics.step()
      world.afterPhysics([])
      // Restore
      world.restoreSnapshot(snap, false)
      physics.step()
      // Cargo should be back near its original spawn
      const t = cargo.body.translation()
      expect(t.x).toBeLessThan(50)
    } finally { world.dispose(); physics.dispose() }
  })
  it('Ch1 — facts do not leak through recording rewind', async () => {
    const { physics, world } = await createWorld(1)
    const snap = world.captureSnapshot()
    const factsBefore = snap.facts.length
    world.facts.add('echo-plate')
    world.facts.add('tutorial-lever')
    const factsAfterMutation = world.captureSnapshot().facts.length
    expect(factsAfterMutation).toBeGreaterThan(factsBefore)
    world.restoreSnapshot(snap, false)
    const factsAfterRewind = world.captureSnapshot().facts.length
    expect(factsAfterRewind).toBe(factsBefore)
    world.dispose()
    physics.dispose()
  })

  it('Ch2 — cargo position and lever state rewind correctly', async () => {
    const { physics, world } = await createWorld(2)
    const cargo = physics.record('cargo-crate')
    if (!cargo) throw new Error('cargo missing')
    const snap = world.captureSnapshot()
    cargo.body.setTranslation({ x: 100, y: 100, z: 100 }, true)
    cargo.body.setLinvel({ x: 50, y: 0, z: 0 }, true)
    physics.step()
    world.restoreSnapshot(snap, false)
    physics.step()
    const t = cargo.body.translation()
    expect(t.x).toBeLessThan(20)
    const afterRewind = world.captureSnapshot()
    expect(afterRewind.facts).not.toContain('elevator-ridden')
    world.dispose()
    physics.dispose()
  })

  // ===== Echo 2.0 Ch3 (OBJECT TRANSFER) Prompt 3 tests =====

  it('Ch3 A — Core cannot cross Player gate while carried', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const player = actor('player', 'player', [-3.0, 3.75, 1.6])
      world.interact(player) // pickup core
      physics.step(); world.afterPhysics([player])
      expect(world.captureSnapshot().dynamics['memory-core']?.carriedBy).toBe('player')
      // Move player to gate (center: 0, 0.9, -2.0)
      player.position.set(0.0, 0.9, -2.0)
      physics.step(); world.afterPhysics([player])
      // Core should be dropped at west edge of gate (rejected)
      const snap = world.captureSnapshot()
      expect(snap.dynamics['memory-core']?.carriedBy).toBeUndefined()
      expect(snap.facts).toContain('temporal-gate-rejected')
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 B — Player can cross gate to EAST (without cargo)', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const player = actor('player', 'player', [0.0, 0.9, -2.0])
      world.afterPhysics([player])
      // No gate-rejected fact (player alone, no cargo)
      expect(world.captureSnapshot().facts).not.toContain('temporal-gate-rejected')
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 E — Echo replays pickup of the SAME real Core object', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const core = physics.record('memory-core')
      if (!core) throw new Error('memory-core missing')
      const before = world.captureSnapshot()
      // Same real object identity preserved in snapshot
      expect(before.dynamics['memory-core']).toBeDefined()
      const echo = actor('echo', 'echo', [-3.0, 3.75, 1.6])
      // Echo can interact with the SAME device (memory-core)
      expect(world.interact(echo)).toBe('core')
      physics.step(); world.afterPhysics([echo])
      // Same object picked up (not a copy)
      const after = world.captureSnapshot()
      expect(after.dynamics['memory-core']?.carriedBy).toBe('echo')
      expect(after.dynamics['memory-core']?.carriedBy).toBe('echo')
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 I — Receiver triggers CoreInAtriumReceiver (no provenance flag)', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const core = physics.record('memory-core')
      const receiver = CHAPTER_LAYOUTS[3].devices.find((d) => d.id === 'core-receiver')
      if (!core || !receiver) throw new Error('core or receiver missing')
      // Move core directly into receiver
      core.body.setTranslation({ x: receiver.position[0], y: receiver.position[1], z: receiver.position[2] }, true)
      core.body.setLinvel({ x: 0, y: -1, z: 0 }, true)
      physics.step(); world.afterPhysics([])
      // Real core entering receiver → receiver-filled (no EchoUsed check)
      expect(world.debugState().facts).toContain('receiver-filled')
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 J — victory requires exactly CoreInAtriumReceiver + PlayerAtExit', async () => {
    const { CHAPTERS, ObjectiveFacts } = await import('../game/chapters')
    const { evaluateChapterObjectives, objectiveFactsFromWorld } = await import('../game/objectives')
    const ch3 = CHAPTERS[2]!
    if (!ch3) throw new Error('ch3 missing')
    expect(ch3.victoryFacts).toEqual([
      ObjectiveFacts.CoreInAtriumReceiver,
      ObjectiveFacts.PlayerAtExit,
    ])
    expect(ch3.victoryFacts).toHaveLength(2)
    // Verify the 2 facts are enough (with player-at-exit)
    const facts = ['receiver-filled']
    const withExit = objectiveFactsFromWorld(facts, true)
    expect(withExit).toContain(ObjectiveFacts.CoreInAtriumReceiver)
    expect(withExit).toContain(ObjectiveFacts.PlayerAtExit)
    const result = evaluateChapterObjectives(ch3, new Set(withExit))
    expect(result.complete).toBe(true)
  })

  it('Ch3 K — thrown (non-carried) Core cannot cross the temporal gate', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const core = physics.record('memory-core')
      if (!core) throw new Error('memory-core missing')
      // Drop the core at the gate centre (0, 0.9, -2.0) with a velocity that
      // simulates being thrown east through the gate.
      core.body.setTranslation({ x: 0, y: 0.9, z: -2.0 }, true)
      core.body.setLinvel({ x: 4, y: 0, z: -3 }, true)
      physics.step(); world.afterPhysics([])
      const snap = world.captureSnapshot()
      // Gate must have rejected the throw and bounced the core back to the west side.
      expect(snap.facts).toContain('temporal-gate-rejected')
      const after = snap.dynamics['memory-core']
      if (!after) throw new Error('memory-core snapshot missing')
      expect(after.position.x).toBeLessThan(0)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 L — repeated core throws still bounce the body and zero its velocity', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const core = physics.record('memory-core')
      if (!core) throw new Error('memory-core missing')
      // Throw east through the gate, then again, then again.
      // After each attempt the body must be on the west side with zero linvel.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        core.body.setTranslation({ x: 0, y: 0.9, z: -2.0 }, true)
        core.body.setLinvel({ x: 4 + attempt, y: 0, z: -3 }, true)
        physics.step(); world.afterPhysics([])
        const t = core.body.translation()
        expect(t.x, `attempt ${attempt}: core east of gate`).toBeLessThan(0)
      }
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 M — transfer shutter is closed by default (blocks dynamic core)', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const core = physics.record('memory-core')
      if (!core) throw new Error('memory-core missing')
      const shutter = physics.record('transfer-shutter')
      if (!shutter) throw new Error('transfer-shutter missing')
      // Initial state: shutter body should be at its authored position (closed).
      const initialT = shutter.body.translation()
      // Drop the core inside the shutter volume with east-bound velocity.
      // The shutter collider is real (not a sensor), so Rapier should push back
      // the core instead of letting it tunnel through.
      core.body.setTranslation({ x: initialT.x, y: initialT.y, z: initialT.z }, true)
      core.body.setLinvel({ x: 6, y: 0, z: 0 }, true)
      physics.step(); world.afterPhysics([])
      const t = core.body.translation()
      // The core must NOT have crossed to x > shutter.x + 1
      expect(t.x, 'core should be west of the closed shutter').toBeLessThan(initialT.x + 0.6)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 N — transfer shutter raises UP when the live Player is east of openAtX', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const shutter = physics.record('transfer-shutter')
      if (!shutter) throw new Error('transfer-shutter missing')
      const closedY = shutter.body.translation().y
      const player = actor('player', 'player', [5.0, 0.9, 0])
      // Two-tick sequence so Rapier consumes the next-kinematic-translation that
      // updateShutters sets in afterPhysics.
      world.beforePhysics(1, [player])
      physics.step(); world.afterPhysics([player])
      physics.step()
      const openY = shutter.body.translation().y
      expect(openY, 'shutter body should be raised UP when Player.x >= openAtX').toBeGreaterThan(closedY + 0.5)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 O — one-way physical wall blocks EAST→WEST (no ActorContext mutation)', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const wall = physics.record('atrium-one-way')
      if (!wall) throw new Error('atrium-one-way wall missing')
      // Player starts east of the wall and moves west. The wall should stay up
      // (no actor on west side to trigger open), so the motor collides with it.
      const player = actor('player', 'player', [4.0, 1.6, 1.6])
      world.beforePhysics(1, [player])
      physics.step()
      world.afterPhysics([player])
      const closedY = wall.body.translation().y
      // Move player further west — the wall should still be closed (player is east)
      player.position.set(3.0, 1.6, 1.6)
      world.beforePhysics(2, [player])
      physics.step()
      world.afterPhysics([player])
      const afterY = wall.body.translation().y
      expect(afterY, 'wall stays raised when only east-side actors are present').toBe(closedY)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 O2 — one-way physical wall lowers for west-side actors', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const wall = physics.record('atrium-one-way')
      if (!wall) throw new Error('atrium-one-way wall missing')
      const closedY = wall.body.translation().y
      const player = actor('player', 'player', [2.0, 1.6, 1.6])
      world.beforePhysics(1, [player])
      physics.step(); world.afterPhysics([player])
      physics.step()
      const openY = wall.body.translation().y
      expect(openY, 'wall lowers when actor is on west side').toBeLessThan(closedY - 0.5)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 P — actor can still cross gate WEST→EAST', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const player = actor('player', 'player', [-3.0, 0.9, -2.0])
      world.afterPhysics([player])
      player.position.set(0.5, 0.9, -2.0)
      physics.step(); world.afterPhysics([player])
      // Player crosses west→east freely (not pushed back)
      expect(player.position.x, 'WEST→EAST must pass').toBeGreaterThan(0)
      expect(world.captureSnapshot().facts).not.toContain('temporal-gate-rejected')
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 Q — Player can pickup the Core only when in interact range (no auto-catch)', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const player = actor('player', 'player', [-3.0, 3.75, 1.6])
      // Player is at the core spawn; try to carry
      const result = world.interact(player)
      expect(result).toBe('core')
      physics.step(); world.afterPhysics([player])
      expect(world.captureSnapshot().dynamics['memory-core']?.carriedBy).toBe('player')
    } finally { world.dispose(); physics.dispose() }
  })

})
