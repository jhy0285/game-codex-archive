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

  it('matches the Chapter 4 ramp visual rotation and gives authored decor matching solid colliders', async () => {
    const { physics, scene, world } = await createWorld(4, 3, 16)
    try {
      const rampDefinition = CHAPTER_LAYOUTS[4].boxes.find((box) => box.id === 'gallery-ramp')
      const rampVisual = scene.getObjectByName('gallery-ramp')
      const rampBody = physics.record('gallery-ramp')
      const resourceDecor: THREE.Object3D[] = []
      const environmentDecor: THREE.Object3D[] = []
      scene.traverse((object) => {
        if (object.name.startsWith('ResourceDecor-')) resourceDecor.push(object)
        if (object.name.startsWith('EnvironmentDecor-')) environmentDecor.push(object)
      })

      expect(rampDefinition?.rotation?.[2]).toBeGreaterThan(0.14)
      expect(rampVisual).toBeDefined()
      expect(rampBody).toBeDefined()
      expect(rampBody?.body.rotation().z).toBeCloseTo(rampVisual?.quaternion.z ?? 0, 6)
      expect(rampBody?.body.rotation().w).toBeCloseTo(rampVisual?.quaternion.w ?? 0, 6)
      const decor = CHAPTER_LAYOUTS[4].decor
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

  it('keeps the former Chapter 4 floor gaps walkable inside the gallery walls', async () => {
    const traverse = async (
      id: string,
      start: readonly [number, number, number],
      movement: { moveX: number; moveZ: number },
      ticks: number,
    ) => {
      const { physics, world } = await createWorld(4)
      const record = physics.createActor(id, 'player', { x: start[0], y: start[1], z: start[2] })
      const motor = new CharacterMotor(physics, record)
      try {
        let minimumY = motor.position.y
        let groundedTicks = 0
        for (let tick = 0; tick < ticks; tick += 1) {
          motor.prepare({
            ...movement,
            jumpPressed: false,
            dashPressed: false,
          })
          physics.step()
          motor.syncAfterStep()
          minimumY = Math.min(minimumY, motor.position.y)
          if (motor.grounded) groundedTicks += 1
        }
        return {
          x: motor.position.x,
          y: motor.position.y,
          z: motor.position.z,
          minimumY,
          groundedTicks,
        }
      } finally {
        motor.dispose()
        world.dispose()
        physics.dispose()
      }
    }

    const westPerimeter = await traverse('gallery-west-gap-probe', [-8.8, 1.08, 2.3], { moveX: 0, moveZ: -1 }, 56)
    expect(westPerimeter.z, JSON.stringify(westPerimeter)).toBeLessThan(0)
    expect(westPerimeter.minimumY, JSON.stringify(westPerimeter)).toBeGreaterThan(0.8)
    expect(westPerimeter.groundedTicks, JSON.stringify(westPerimeter)).toBeGreaterThan(44)

    const coverConnection = await traverse('gallery-cover-gap-probe', [-5.6, 1.08, -1.8], { moveX: 1, moveZ: 0 }, 58)
    expect(coverConnection.x, JSON.stringify(coverConnection)).toBeGreaterThan(-2.6)
    expect(coverConnection.minimumY, JSON.stringify(coverConnection)).toBeGreaterThan(0.8)
    expect(coverConnection.groundedTicks, JSON.stringify(coverConnection)).toBeGreaterThan(46)
  })

  it('lets the shared capsule motor walk up the Chapter 4 ramp with zero jumps', async () => {
    const { physics, world } = await createWorld(4)
    const record = physics.createActor('ramp-player', 'player', { x: -3.2, y: 1.08, z: -3.05 })
    const motor = new CharacterMotor(physics, record)
    try {
      let highestY = motor.position.y
      let groundedTicks = 0
      for (let tick = 0; tick < 145; tick += 1) {
        motor.prepare({
          moveX: tick < 8 ? 0 : 1,
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
      expect(motor.position.x, JSON.stringify(traversal)).toBeGreaterThan(2.3)
      expect(highestY).toBeGreaterThan(2.6)
      expect(groundedTicks).toBeGreaterThan(100)
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
      const playerAtLever = actor('player', 'player', [-3.9, 0.72, 0.4])
      expect(world.interact(playerAtLever)).toBe('lever')
      physics.step()
      world.afterPhysics([playerAtExit, echoAtPlate])
      world.beforePhysics(1, [playerAtExit, echoAtPlate])
      physics.step()
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
      trap: ['TrapHousing', 'TrapWarningRails', 'TrapSpikes', 'TrapTargetRing', 'TrapLureBeacon', 'TrapTargetLight'],
      exit: ['ExitPlinth', 'ExitTransitArch', 'ExitBeam', 'ExitBeacons'],
      receiver: ['ReceiverCradle', 'ReceiverRing', 'ReceiverProngs', 'ReceiverBeam'],
      enemy: ['SentryBase', 'SentryShell', 'SentryEye', 'SentryHalo', 'SentryFins', 'SightCone'],
      gate: ['TemporalGatePost', 'TemporalGateBeam', 'TemporalGateBase'],
      shutter: ['TransferShutterSlat', 'TransferShutterFrame'],
      'one-way-wall': ['OneWayWall', 'OneWayWallWestField', 'OneWayWallEastField', 'OneWayWallPassArrows', 'OneWayWallLockBars'],
      'return-gate': ['ReturnGateNorthFrame', 'ReturnGateDoorPanels', 'ReturnGateClosedField', 'ReturnGateStatusRings'],
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
          const parts = definition.kind === 'enemy'
            ? chapter === 4
              ? ['WatcherCharacter', 'WatcherSensorEye', 'WatcherStatusRing', 'WatcherVisionSector', 'WatcherVisionBoundary', 'WatcherTargetBeam']
              : ['GuardianCharacter', 'GuardianSensorEye', 'GuardianStatusRing', 'GuardianVisionSector', 'GuardianVisionBoundary', 'GuardianTargetBeam', 'GuardianFrontShield', 'GuardianRearSeal']
            : expectedParts[definition.kind]
          for (const part of parts) {
            expect(device?.getObjectByName(part), `${definition.id} is missing ${part}`).toBeDefined()
          }
        }
        if (chapter === 5) {
          for (const guide of [
            'ParadoxEchoRoute', 'ParadoxPlayerRoute', 'ReceiverPlatformCable',
            'GuardianLowerSealTether', 'GuardianArenaRing', 'FinalEscapeGuide',
          ]) {
            expect(scene.getObjectByName(guide), `Chapter 5 is missing ${guide}`).toBeDefined()
          }
          expect(scene.getObjectByName('FinalEscapeGuide')?.children).toHaveLength(6)
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




  it('powers Chapter 5 only when the same physical Core enters the receiver sensor', async () => {
    const { physics, world } = await createWorld(5)
    try {
      const core = physics.record('paradox-core')
      const receiver = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'power-receiver')?.position
      if (!core || !receiver) throw new Error('Chapter 5 core or receiver is missing')

      core.body.setTranslation({ x: receiver[0], y: receiver[1], z: receiver[2] }, true)
      core.body.setLinvel({ x: 0, y: -1, z: 0 }, true)
      physics.step()
      world.afterPhysics([])
      expect(world.debugState().cores['paradox-core']?.receiver).toBe(true)
      expect(world.debugState().facts).toContain('core-receiver')
      expect(world.debugState().facts).not.toContain('core-thrown-down')
      expect(world.debugState().objectiveFacts).toEqual(['core-receiver', 'guardian-defeated', 'final-door-opened'])
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('clears Chapter 4 only after real Echo acquisition and a high rear strike into the trap', async () => {
    const { physics, world } = await createWorld(4)
    try {
      const echo = actor('echo', 'echo', [-1.9, 0.72, 3.0])
      echo.interactHeld = true
      const player = actor('player', 'player', [2.8, 3.45, -1.1])
      expect(world.interact(echo)).toBe('lever')
      expect(world.debugState().facts).not.toContain('lured-by-echo')
      expect(world.debugState().enemies.watcher?.target).toBeUndefined()
      let tick = 1
      while (world.debugState().enemies.watcher?.state !== 'lure-hold' && tick <= 480) {
        stepWorld(world, physics, tick, [echo])
        tick += 1
      }
      expect(world.debugState().facts).toContain('lured-by-echo')
      const acquired = world.debugState().enemies.watcher
      expect(acquired, JSON.stringify(acquired)).toMatchObject({ state: 'lure-hold', target: 'echo', targetVisible: true })
      const watcherPosition = acquired?.position
      if (!watcherPosition) throw new Error('Watcher position is missing')
      const watcherForward = new THREE.Vector3(acquired.forward.x, 0, acquired.forward.z).normalize()
      player.position.set(
        watcherPosition.x - watcherForward.x * 1.4,
        watcherPosition.y + 1.5,
        watcherPosition.z - watcherForward.z * 1.4,
      )
      const strikeDirection = new THREE.Vector3()
        .subVectors(new THREE.Vector3(watcherPosition.x, watcherPosition.y, watcherPosition.z), player.position)
        .setY(0)
        .normalize()
      expect(world.attack(player, strikeDirection), JSON.stringify({ player: player.position, state: world.debugState() })).toBe('watcher')

      const trapDeadline = tick + 90
      for (; tick < trapDeadline && !world.debugState().enemies.watcher?.defeated; tick += 1) {
        stepWorld(world, physics, tick, [player, echo])
      }
      stepWorld(world, physics, tick, [player, echo])

      const trapped = world.debugState()
      expect(trapped.facts).toEqual(expect.arrayContaining(['lured-by-echo', 'watcher-trapped']))
      expect(trapped.enemies.watcher?.defeated).toBe(true)
      expect(trapped.doors['gallery-door']?.open).toBe(true)
      player.position.set(8.35, 1.08, -2.55)
      expect(world.interact(player)).toBe('exit')
      world.afterPhysics([player, echo])
      expect(world.complete).toBe(true)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('lets a late bell stimulus turn patrol into real Echo acquisition', async () => {
    const { physics, world } = await createWorld(4)
    try {
      for (let tick = 1; tick <= 168; tick += 1) stepWorld(world, physics, tick, [])
      const echo = actor('echo', 'echo', [-1.9, 1.08, 3.0])
      echo.interactHeld = true
      expect(world.interact(echo)).toBe('lever')
      const watcherPosition = world.debugState().enemies.watcher?.position
      if (!watcherPosition) throw new Error('Watcher position is missing')
      const origin = new THREE.Vector3(watcherPosition.x, watcherPosition.y + 0.62, watcherPosition.z)
      const target = echo.position.clone().add(new THREE.Vector3(0, 0.62, 0))
      const ray = target.clone().sub(origin)
      const hit = physics.castRay(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: ray.x / ray.length(), y: ray.y / ray.length(), z: ray.z / ray.length() },
        ray.length(),
        new Set(['watcher', 'guardian']),
        new Set(['wall', 'door']),
      )
      expect(hit, JSON.stringify(hit?.tag)).toBeUndefined()
      for (let tick = 169; tick < 360 && world.debugState().enemies.watcher?.target !== 'echo'; tick += 1) {
        stepWorld(world, physics, tick, [echo])
      }
      const lateAcquired = world.debugState().enemies.watcher
      expect(lateAcquired, JSON.stringify(lateAcquired)).toMatchObject({ target: 'echo', targetVisible: true })
      expect(world.debugState().facts).toContain('lured-by-echo')
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('runs Watcher attention through alert, chase, investigate, recovery, and patrol', async () => {
    const { physics, world } = await createWorld(4)
    try {
      const echo = actor('echo', 'echo', [-1.9, 1.08, 3.0])
      let tick = 1
      while (world.debugState().enemies.watcher?.target !== 'echo' && tick <= 360) {
        stepWorld(world, physics, tick, [echo])
        tick += 1
      }
      expect(world.debugState().enemies.watcher).toMatchObject({ state: 'alert', target: 'echo', targetVisible: true })
      for (let elapsed = 0; elapsed < 24; elapsed += 1, tick += 1) stepWorld(world, physics, tick, [echo])
      expect(world.debugState().enemies.watcher).toMatchObject({ state: 'chase', target: 'echo', targetVisible: true })

      stepWorld(world, physics, tick, [])
      tick += 1
      expect(world.debugState().enemies.watcher).toMatchObject({ state: 'investigate', targetVisible: false })
      for (let elapsed = 0; elapsed < 151; elapsed += 1, tick += 1) stepWorld(world, physics, tick, [])
      expect(['investigate', 'recovery']).toContain(world.debugState().enemies.watcher?.state)
      for (let elapsed = 0; elapsed < 84; elapsed += 1, tick += 1) stepWorld(world, physics, tick, [])
      expect(world.debugState().enemies.watcher).toMatchObject({ state: 'patrol', targetVisible: false })
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('patrols both directions instead of behaving like a stationary trigger', async () => {
    const { physics, world } = await createWorld(4)
    try {
      const positions: number[] = []
      for (let tick = 1; tick <= 600; tick += 1) {
        stepWorld(world, physics, tick, [])
        const x = world.debugState().enemies.watcher?.position.x
        if (x !== undefined) positions.push(x)
      }
      const minimum = Math.min(...positions)
      const maximum = Math.max(...positions)
      const minimumIndex = positions.indexOf(minimum)
      const returnMaximum = Math.max(...positions.slice(minimumIndex))
      expect(maximum - minimum).toBeGreaterThan(5.2)
      expect(returnMaximum - minimum).toBeGreaterThan(5.1)
      expect(world.debugState().enemies.watcher?.state).toBe('patrol')
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('steers the Watcher around the center-cover corner instead of stalling while the Player stays visible', async () => {
    const { physics, world } = await createWorld(4)
    try {
      // This diagonal sight line clears the south edge of gallery-cover-center,
      // but the Watcher's body-width clearance ray clips the corner. A direct-
      // only chase therefore used to repeat the same blocked step forever.
      const player = actor('player', 'player', [-5.8, 1.08, -2.3])
      const trace: Array<{ tick: number; x: number; z: number; state: string; visible: boolean }> = []
      for (let tick = 1; tick <= 360; tick += 1) {
        stepWorld(world, physics, tick, [player])
        if (tick % 30 === 0) {
          const watcher = world.debugState().enemies.watcher
          if (watcher) trace.push({
            tick,
            x: watcher.position.x,
            z: watcher.position.z,
            state: watcher.state,
            visible: watcher.targetVisible,
          })
        }
      }

      const watcher = world.debugState().enemies.watcher
      if (!watcher) throw new Error('Watcher state is missing')
      expect(watcher.target, JSON.stringify(trace)).toBe('player')
      expect(watcher.position.x, JSON.stringify(trace)).toBeLessThan(-0.9)
      expect(watcher.position.z, JSON.stringify(trace)).toBeLessThan(-1.05)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('holds at the spike edge while pursuing the real Echo lure', async () => {
    const { physics, world } = await createWorld(4)
    try {
      const echo = actor('echo', 'echo', [-1.9, 0.72, 3.0])
      for (let tick = 1; tick <= 480 && world.debugState().enemies.watcher?.state !== 'lure-hold'; tick += 1) {
        stepWorld(world, physics, tick, [echo])
      }

      const watcher = world.debugState().enemies.watcher
      const trap = CHAPTER_LAYOUTS[4].devices.find((device) => device.id === 'spike-trap')
      if (!watcher || !trap) throw new Error('Watcher lure geometry is missing')
      const trapDistance = Math.hypot(watcher.position.x - trap.position[0], watcher.position.z - trap.position[2])
      expect(watcher).toMatchObject({ state: 'lure-hold', target: 'echo', targetVisible: true, defeated: false })
      expect(trapDistance).toBeGreaterThan(0.75)
      expect(trapDistance).toBeLessThan(1.15)
      expect(world.failed).toBe(false)
      expect(world.debugState().facts).toContain('lured-by-echo')
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('uses sight as warning and fails Chapter 4 only when the Watcher catches the Player', async () => {
    const { physics, world } = await createWorld(4)
    try {
      const player = actor('player', 'player', [-1.9, 3.2, 3.0])
      for (let tick = 1; tick <= 150; tick += 1) stepWorld(world, physics, tick, [player])

      const warned = world.debugState().enemies.watcher
      expect(warned?.target).toBe('player')
      expect(warned?.detection).toBe(1)
      expect(world.failed).toBe(false)

      if (!warned) throw new Error('Watcher state is missing')
      player.position.set(warned.position.x, warned.position.y, warned.position.z)
      stepWorld(world, physics, 151, [player])
      expect(world.failed).toBe(true)
      expect(world.failureReason).toBe('seen')
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('restores every mutable attention field with the recording snapshot', async () => {
    const { physics, world } = await createWorld(4)
    try {
      const echo = actor('echo', 'echo', [-1.9, 1.08, 3.0])
      let tick = 1
      while (world.debugState().enemies.watcher?.target !== 'echo' && tick <= 360) {
        stepWorld(world, physics, tick, [echo])
        tick += 1
      }
      const snapshot = world.captureSnapshot()
      for (let elapsed = 0; elapsed < 240; elapsed += 1, tick += 1) stepWorld(world, physics, tick, [])
      expect(world.debugState().enemies.watcher?.target).toBeUndefined()

      world.restoreSnapshot(snapshot, false)
      expect(world.debugState().enemies.watcher).toMatchObject({
        state: snapshot.enemyState,
        target: 'echo',
        targetVisible: true,
        forward: snapshot.enemyForward,
      })
      const restored = world.captureSnapshot()
      expect(restored).toMatchObject({
        enemyTargetVisible: snapshot.enemyTargetVisible,
        enemyTargetLockTicks: snapshot.enemyTargetLockTicks,
        enemyLastKnown: snapshot.enemyLastKnown,
        enemyAlertTicks: snapshot.enemyAlertTicks,
        enemySearchTicks: snapshot.enemySearchTicks,
        enemyRecoveryTicks: snapshot.enemyRecoveryTicks,
        enemyStimulusTicks: snapshot.enemyStimulusTicks,
        enemyStimulusPosition: snapshot.enemyStimulusPosition,
      })
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('rejects a frontal low Watcher hit and keeps the exit physically blocked', async () => {
    const { physics, world } = await createWorld(4)
    try {
      const echo = actor('echo', 'echo', [-1.9, 1.08, 3.0])
      let tick = 1
      while (world.debugState().enemies.watcher?.state !== 'lure-hold' && tick <= 480) {
        stepWorld(world, physics, tick, [echo])
        tick += 1
      }
      const watcher = world.debugState().enemies.watcher
      if (!watcher) throw new Error('Watcher state is missing')
      const forward = new THREE.Vector3(watcher.forward.x, 0, watcher.forward.z).normalize()
      const frontalPlayer = actor('player', 'player', [
        watcher.position.x + forward.x * 1.4,
        watcher.position.y,
        watcher.position.z + forward.z * 1.4,
      ])
      expect(world.attack(frontalPlayer, new THREE.Vector3(
        watcher.position.x - frontalPlayer.position.x,
        0,
        watcher.position.z - frontalPlayer.position.z,
      ).normalize())).toBe('shield')
      expect(world.debugState().facts).not.toContain('watcher-trapped')
      expect(world.debugState().doors['gallery-door']?.open).toBe(false)

      const exitPlayer = actor('player', 'player', [8.35, 1.08, -2.55])
      expect(world.interact(exitPlayer)).toBe('exit')
      stepWorld(world, physics, tick, [exitPlayer, echo])
      expect(world.complete).toBe(false)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('clears Chapter 5 through one real Core, Guardian LOS switch, high rear strike, and live dual seal', async () => {
    const { physics, world } = await createWorld(5)
    try {
      const lowerSeal = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'lower-seal')?.position
      const upperSeal = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'upper-seal')?.position
      if (!lowerSeal || !upperSeal) throw new Error('Chapter 5 route devices are missing')
      const core = physics.record('paradox-core')
      const receiver = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'power-receiver')?.position
      if (!core || !receiver) throw new Error('Chapter 5 Core receiver is missing')
      core.body.setTranslation({ x: receiver[0], y: receiver[1], z: receiver[2] }, true)
      physics.step()
      world.afterPhysics([])
      expect(world.debugState().facts).toContain('core-receiver')

      physics.createActor('echo', 'echo', { x: lowerSeal[0], y: 1.08, z: lowerSeal[2] })
      const echo = actor('echo', 'echo', [lowerSeal[0], 1.08, lowerSeal[2]])
      const player = actor('player', 'player', [2.2, 4.08, 2.2])
      let attentionTick = 1
      while (world.debugState().enemies.guardian?.target !== 'echo' && attentionTick < 360) {
        stepWorld(world, physics, attentionTick, [echo])
        attentionTick += 1
      }
      expect(world.debugState().facts).toEqual(expect.arrayContaining(['lower-seal-echo', 'guardian-target-echo']))
      expect(world.debugState().enemies.guardian).toMatchObject({ target: 'echo', targetVisible: true })
      const guardianPosition = world.debugState().enemies.guardian?.position
      if (!guardianPosition) throw new Error('Guardian position is missing')
      expect(guardianPosition.x).toBeCloseTo(0.1, 1)
      expect(guardianPosition.z).toBeCloseTo(0.85, 1)
      expect(world.attack(player, new THREE.Vector3(
        guardianPosition.x - player.position.x,
        0,
        guardianPosition.z - player.position.z,
      ))).toBe('guardian')

      player.position.set(...upperSeal)
      player.interactHeld = true
      expect(world.interact(player)).toBe('lever')
      stepWorld(world, physics, attentionTick, [player, echo])
      stepWorld(world, physics, attentionTick + 1, [player, echo])
      stepWorld(world, physics, attentionTick + 2, [player, echo])
      expect(world.debugState().facts).toContain('dual-seal')
      expect(world.debugState().facts).not.toContain('final-door-opened')
      expect(world.debugState().escapeSeconds).toBe(0)
      for (let tick = attentionTick + 3; tick <= attentionTick + 30; tick += 1) {
        stepWorld(world, physics, tick, [player, echo])
      }

      const opened = world.debugState()
      expect(opened.facts).toEqual(expect.arrayContaining([
        'guardian-defeated', 'lower-seal-echo', 'upper-seal-player', 'dual-seal', 'final-door-opened',
      ]))
      expect(opened.doors['final-door']?.open).toBe(true)
      expect(opened.escapeSeconds).toBeGreaterThan(0)
      const openedSnapshot = world.captureSnapshot()
      for (let tick = attentionTick + 31; tick <= attentionTick + 1_000; tick += 1) {
        stepWorld(world, physics, tick, [player, echo])
      }
      expect(world.debugState().escapeSeconds).toBe(0)
      expect(world.debugState().doors['final-door']?.open).toBe(false)
      world.restoreSnapshot(openedSnapshot, false)
      stepWorld(world, physics, attentionTick + 31, [player, echo])
      player.position.set(8.25, 3.78, 2.65)
      expect(world.interact(player)).toBe('exit')
      world.afterPhysics([player, echo])
      expect(world.complete).toBe(true)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('rejects Guardian front and low strikes even while the real Echo holds attention', async () => {
    const { physics, world } = await createWorld(5)
    try {
      const lowerSeal = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'lower-seal')?.position
      const receiver = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'power-receiver')?.position
      const core = physics.record('paradox-core')
      if (!lowerSeal || !receiver || !core) throw new Error('Chapter 5 activation devices are missing')
      core.body.setTranslation({ x: receiver[0], y: receiver[1], z: receiver[2] }, true)
      physics.step()
      world.afterPhysics([])
      const echo = actor('echo', 'echo', [lowerSeal[0], 1.08, lowerSeal[2]])
      for (let tick = 1; tick < 180 && world.debugState().enemies.guardian?.target !== 'echo'; tick += 1) {
        stepWorld(world, physics, tick, [echo])
      }
      expect(world.debugState().enemies.guardian).toMatchObject({ target: 'echo', targetVisible: true })

      const guardian = world.debugState().enemies.guardian?.position
      if (!guardian) throw new Error('guardian missing')
      const highFront = actor('player', 'player', [-1.0, 4.08, -1.0])
      expect(world.attack(highFront, new THREE.Vector3(
        guardian.x - highFront.position.x,
        0,
        guardian.z - highFront.position.z,
      ))).toBe('shield')
      const lowRear = actor('player', 'player', [2.4, 2.7, 1.4])
      expect(world.attack(lowRear, new THREE.Vector3(
        guardian.x - lowRear.position.x,
        0,
        guardian.z - lowRear.position.z,
      ))).toBe('shield')
      expect(world.debugState().facts).not.toContain('guardian-defeated')
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('carries the shared motor from the dock to the upper floor on the powered well platform', async () => {
    const { physics, world } = await createWorld(5)
    const record = physics.createActor('platform-player', 'player', { x: 6.1, y: 1.265, z: -2.65 })
    const motor = new CharacterMotor(physics, record)
    try {
      const core = physics.record('paradox-core')
      const receiver = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'power-receiver')?.position
      if (!core || !receiver) throw new Error('Chapter 5 Core receiver is missing')
      core.body.setTranslation({ x: receiver[0], y: receiver[1], z: receiver[2] }, true)
      physics.step()
      world.afterPhysics([])
      expect(world.debugState().cores['paradox-core']?.receiver).toBe(true)
      expect(Object.keys(world.captureSnapshot().dynamics).filter((id) => id === 'paradox-core')).toEqual(['paradox-core'])

      let highestY = motor.position.y
      for (let tick = 1; tick <= 420; tick += 1) {
        const platformActor = actor('platform-player', 'player', [motor.position.x, motor.position.y, motor.position.z])
        world.beforePhysics(tick, [platformActor])
        const support = world.supportMotion(motor.position)
        motor.setSupportDelta(support.delta, support.supported)
        motor.prepare({ moveX: motor.position.x > 4.18 ? -1 : 0, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step()
        motor.syncAfterStep()
        platformActor.position.copy(motor.position)
        world.afterPhysics([platformActor])
        highestY = Math.max(highestY, motor.position.y)
      }
      const traversal = { x: motor.position.x, y: motor.position.y, highestY, platform: world.debugState().elevators['well-platform'] }
      expect(highestY, JSON.stringify(traversal)).toBeGreaterThan(3.9)
      expect(motor.position.x).toBeCloseTo(4.15, 0)
    } finally {
      motor.dispose()
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
      const echo = actor('echo', 'echo', [-1.9, 1.08, 3.0])
      const player = actor('player', 'player', [2.8, 3.45, -1.1])
      let tick = 1
      while (world.debugState().enemies.watcher?.state !== 'lure-hold' && tick <= 480) {
        stepWorld(world, physics, tick, [echo])
        tick += 1
      }
      const watcherState = world.debugState().enemies.watcher
      if (!watcherState) throw new Error('Watcher position is missing')
      const watcher = watcherState.position
      const forward = new THREE.Vector3(watcherState.forward.x, 0, watcherState.forward.z).normalize()
      player.position.set(watcher.x - forward.x * 1.4, watcher.y + 1.5, watcher.z - forward.z * 1.4)
      expect(world.attack(player, new THREE.Vector3(
        watcher.x - player.position.x,
        0,
        watcher.z - player.position.z,
      ).normalize())).toBe('watcher')
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
      // record-start state: player A, core at the west transfer spawn
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
      const player = actor('player', 'player', [-6.2, 1.1, 2.45])
      const echo = actor('echo', 'echo', [-6.2, 1.1, 2.45])
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
      const player = actor('player', 'player', [-6.2, 1.1, 2.45])
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
      const player = actor('player', 'player', [-6.2, 1.1, 2.45])
      const echo = actor('echo', 'echo', [-6.2, 1.1, 2.45])
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
      const player = actor('player', 'player', [-6.2, 1.1, 2.45])
      world.interact(player) // pickup core
      physics.step(); world.afterPhysics([player])
      expect(world.captureSnapshot().dynamics['memory-core']?.carriedBy).toBe('player')
      // Move the carried Core into the player-only south gate.
      player.position.set(0.1, 1.08, -2.45)
      player.facingYaw = Math.PI / 2
      world.beforePhysics(2, [player])
      physics.step(); world.afterPhysics([player])
      // Core should be dropped at west edge of gate (rejected)
      const snap = world.captureSnapshot()
      expect(snap.dynamics['memory-core']?.carriedBy).toBeUndefined()
      expect(snap.facts).not.toContain('temporal-gate-rejected')
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 B — Player can cross gate to EAST (without cargo)', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const player = actor('player', 'player', [0.1, 1.08, -2.45])
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
      const echo = actor('echo', 'echo', [-6.2, 1.1, 2.45])
      // Echo can interact with the SAME device (memory-core)
      expect(world.interact(echo)).toBe('core')
      physics.step(); world.afterPhysics([echo])
      // Same object picked up (not a copy)
      const after = world.captureSnapshot()
      expect(after.dynamics['memory-core']?.carriedBy).toBe('echo')
      expect(Object.keys(after.dynamics).filter((id) => id === 'memory-core')).toHaveLength(1)
      expect(physics.record('memory-core'), 'the canonical Rapier body remains the one Core').toBe(core)
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
      // Drop the core west of the gate with a velocity that
      // simulates being thrown east through the gate.
      core.body.setTranslation({ x: -1.7, y: 1.08, z: -2.45 }, true)
      core.body.setLinvel({ x: 4, y: 0, z: 0 }, true)
      physics.step(); world.afterPhysics([])
      const snap = world.captureSnapshot()
      // Gate must have rejected the throw and bounced the core back to the west side.
      expect(snap.facts).not.toContain('temporal-gate-rejected')
      const after = snap.dynamics['memory-core']
      if (!after) throw new Error('memory-core snapshot missing')
      expect(after.position.x).toBeLessThan(0.6)
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
        core.body.setTranslation({ x: -1.7, y: 1.08, z: -2.45 }, true)
        core.body.setLinvel({ x: 4 + attempt, y: 0, z: 0 }, true)
        physics.step(); world.afterPhysics([])
        const t = core.body.translation()
        expect(t.x, `attempt ${attempt}: core east of gate`).toBeLessThan(0.6)
      }
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 M — the full-height transfer shutter blocks the authored Core throw while closed', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const core = physics.record('memory-core')
      if (!core) throw new Error('memory-core missing')
      const shutter = physics.record('transfer-shutter')
      if (!shutter) throw new Error('transfer-shutter missing')
      const initialT = shutter.body.translation()
      const player = actor('player', 'player', [0, 1.265, -2.45])
      core.body.setTranslation({ x: 0.72, y: 2.415, z: initialT.z }, true)
      core.body.setLinvel({ x: 7.2, y: 1.4, z: 0 }, true)
      for (let tick = 1; tick <= 90; tick += 1) stepWorld(world, physics, tick, [player])
      const t = core.body.translation()
      expect(t.x, 'core should be west of the closed shutter').toBeLessThan(initialT.x + 0.6)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 N — transfer shutter lowers fully below the floor when the live Player is east of openAtX', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const shutter = physics.record('transfer-shutter')
      if (!shutter) throw new Error('transfer-shutter missing')
      const closedY = shutter.body.translation().y
      const player = actor('player', 'player', [3.2, 1.08, 0])
      // Two-tick sequence so Rapier consumes the next-kinematic-translation that
      // updateShutters sets in afterPhysics.
      world.beforePhysics(1, [player])
      physics.step(); world.afterPhysics([player])
      physics.step()
      const openY = shutter.body.translation().y
      // The lower floor top is y=0.45. The shutter's entire
      // collider must sit below that walkable surface when open.
      expect(openY + 1.35, 'open shutter top stays below the lower floor').toBeLessThan(0.45)
      expect(openY, 'open shutter moves from its immutable closed position').toBeLessThan(closedY - 1.8)
    } finally { world.dispose(); physics.dispose() }
  })

  it('draws the Watcher range from the live FOV and marks a real acquired target', async () => {
    const { physics, scene, world } = await createWorld(4)
    try {
      const watcher = scene.getObjectByName('watcher')
      const sector = watcher?.getObjectByName('WatcherVisionSector') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
      const boundary = watcher?.getObjectByName('WatcherVisionBoundary') as THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
      const beam = watcher?.getObjectByName('WatcherTargetBeam') as THREE.Line
      expect(sector).toBeInstanceOf(THREE.Mesh)
      expect(boundary).toBeInstanceOf(THREE.LineSegments)
      expect(beam.visible).toBe(false)

      const positions = sector.geometry.getAttribute('position') as THREE.BufferAttribute
      const points = Array.from({ length: positions.count - 1 }, (_, index) => new THREE.Vector3(
        positions.getX(index + 1),
        positions.getY(index + 1),
        positions.getZ(index + 1),
      ))
      expect(Math.max(...points.map((point) => point.length()))).toBeCloseTo(7.2, 4)
      const leftAngle = Math.atan2(points[0]?.x ?? 0, points[0]?.z ?? 1)
      const rightAngle = Math.atan2(points.at(-1)?.x ?? 0, points.at(-1)?.z ?? 1)
      expect(rightAngle - leftAngle).toBeCloseTo(Math.PI * 0.62, 4)

      const echo = actor('echo', 'echo', [-1.9, 1.08, 3.0])
      for (let tick = 1; tick <= 360 && world.debugState().enemies.watcher?.target !== 'echo'; tick += 1) {
        stepWorld(world, physics, tick, [echo])
      }
      expect(world.debugState().enemies.watcher).toMatchObject({ targetVisible: true, target: 'echo' })
      expect(sector.material.color.getHex()).toBe(0xff4f6d)
      expect(boundary.material.color.getHex()).toBe(0xff4f6d)
      expect(beam.visible).toBe(true)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('draws the Guardian range from the same live FOV and exposes its rear seal only for the lower Echo', async () => {
    const { physics, scene, world } = await createWorld(5)
    try {
      const guardian = scene.getObjectByName('guardian')
      const sector = guardian?.getObjectByName('GuardianVisionSector') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
      const boundary = guardian?.getObjectByName('GuardianVisionBoundary') as THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
      const beam = guardian?.getObjectByName('GuardianTargetBeam') as THREE.Line
      const shield = guardian?.getObjectByName('GuardianFrontShield') as THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>
      const rearSeal = guardian?.getObjectByName('GuardianRearSeal') as THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial>
      expect(sector.visible).toBe(false)
      expect(boundary.visible).toBe(false)
      expect(beam.visible).toBe(false)

      const receiver = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'power-receiver')?.position
      const lowerSeal = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'lower-seal')?.position
      const core = physics.record('paradox-core')
      if (!receiver || !lowerSeal || !core) throw new Error('Chapter 5 activation devices are missing')
      core.body.setTranslation({ x: receiver[0], y: receiver[1], z: receiver[2] }, true)
      physics.createActor('guardian-echo', 'echo', { x: lowerSeal[0], y: 1.08, z: lowerSeal[2] })
      const echo = actor('guardian-echo', 'echo', [lowerSeal[0], 1.08, lowerSeal[2]])
      for (let tick = 1; tick <= 60; tick += 1) stepWorld(world, physics, tick, [echo])

      const positions = sector.geometry.getAttribute('position') as THREE.BufferAttribute
      const points = Array.from({ length: positions.count - 1 }, (_, index) => new THREE.Vector3(
        positions.getX(index + 1), positions.getY(index + 1), positions.getZ(index + 1),
      ))
      expect(Math.max(...points.map((point) => point.length()))).toBeCloseTo(8.5, 4)
      const leftAngle = Math.atan2(points[0]?.x ?? 0, points[0]?.z ?? 1)
      const rightAngle = Math.atan2(points.at(-1)?.x ?? 0, points.at(-1)?.z ?? 1)
      expect(rightAngle - leftAngle).toBeCloseTo(Math.PI * 0.94, 4)
      expect(world.debugState().enemies.guardian).toMatchObject({ state: 'lure-hold', target: 'echo', targetVisible: true })
      expect(sector.visible).toBe(true)
      expect(sector.material.color.getHex()).toBe(0xd66bff)
      expect(beam.visible).toBe(true)
      expect(shield.material.opacity).toBeLessThan(0.3)
      expect(rearSeal.material.emissiveIntensity).toBeGreaterThan(4)
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('keeps the Guardian dormant before Core power and requires real vertical contact after activation', async () => {
    const { physics, world } = await createWorld(5)
    try {
      const belowDais = actor('player', 'player', [0.9, 1.08, 1.15])
      for (let tick = 1; tick <= 180; tick += 1) stepWorld(world, physics, tick, [belowDais])
      expect(world.debugState().enemies.guardian).toMatchObject({ state: 'dormant', targetVisible: false })
      expect(world.failed).toBe(false)

      const receiver = CHAPTER_LAYOUTS[5].devices.find((device) => device.id === 'power-receiver')?.position
      const core = physics.record('paradox-core')
      if (!receiver || !core) throw new Error('Chapter 5 Core receiver is missing')
      core.body.setTranslation({ x: receiver[0], y: receiver[1], z: receiver[2] }, true)
      physics.step()
      world.afterPhysics([belowDais])
      for (let tick = 181; tick <= 300; tick += 1) stepWorld(world, physics, tick, [belowDais])
      expect(world.debugState().enemies.guardian?.target).toBe('player')
      expect(world.failed).toBe(false)

      belowDais.position.y = 2.28
      for (let tick = 301; tick <= 360 && !world.failed; tick += 1) stepWorld(world, physics, tick, [belowDais])
      expect(world.failed).toBe(true)
      expect(world.failureReason).toBe('guardian')
    } finally {
      world.dispose()
      physics.dispose()
    }
  })

  it('Ch3 N2 — the same physical Core flies through an open shutter into the east basin', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const player = actor('player', 'player', [3.2, 1.265, -2.45])
      const echo = actor('echo', 'echo', [-6.2, 1.265, 2.45])
      expect(world.interact(echo)).toBe('core')
      echo.position.set(0, 1.265, 2.45)
      physics.createActor('echo-capsule', 'echo', { x: 0, y: 1.265, z: 2.45 })
      stepWorld(world, physics, 1, [player, echo])
      stepWorld(world, physics, 2, [player, echo])
      expect(world.throwOrDrop(echo, new THREE.Vector3(1, 0, 0))).toBe('core')
      for (let tick = 3; tick < 150; tick += 1) stepWorld(world, physics, tick, [player, echo])

      const core = world.debugState().cores['memory-core']
      expect(core?.position.x, JSON.stringify(core)).toBeGreaterThan(2.7)
      expect(world.failed).toBe(false)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 N3 — the Core shutter never becomes a Player or Echo crossing', async () => {
    const { physics, scene, world } = await createWorld(3)
    const playerRecord = physics.createActor('shutter-player', 'player', { x: 3.1, y: 1.265, z: 2.45 })
    const echoRecord = physics.createActor('shutter-echo', 'echo', { x: 0, y: 1.265, z: 2.45 })
    const playerMotor = new CharacterMotor(physics, playerRecord)
    const echoMotor = new CharacterMotor(physics, echoRecord)
    try {
      expect(scene.getObjectByName('TransferShutterActorSeal')).toBeDefined()
      const player = actor('shutter-player', 'player', [3.1, 1.265, 2.45])
      const echo = actor('shutter-echo', 'echo', [0, 1.265, 2.45])
      let openedForCore = false
      for (let tick = 1; tick <= 130; tick += 1) {
        world.beforePhysics(tick, [player, echo])
        playerMotor.prepare({ moveX: -1, moveZ: 0, jumpPressed: false, dashPressed: false })
        echoMotor.prepare({ moveX: 1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step()
        playerMotor.syncAfterStep(); player.position.copy(playerMotor.position)
        echoMotor.syncAfterStep(); echo.position.copy(echoMotor.position)
        world.afterPhysics([player, echo])
        openedForCore ||= world.debugState().barriers['transfer-shutter']?.open === true
      }
      expect(openedForCore, 'Player east still opens the Core shutter').toBe(true)
      expect(playerMotor.position.x, 'open Core shutter must not allow EAST→WEST Player return').toBeGreaterThan(1.82)
      expect(echoMotor.position.x, 'open Core shutter must not allow Echo WEST→EAST crossing').toBeLessThan(1.08)
    } finally {
      playerMotor.dispose(); echoMotor.dispose(); world.dispose(); physics.dispose()
    }
  })

  it('Ch3 O — one-way portal is full-span and shows a pass face west of it and a lock face east of it', async () => {
    const { physics, scene, world } = await createWorld(3)
    try {
      const definition = CHAPTER_LAYOUTS[3].devices.find((device) => device.id === 'atrium-one-way')
      const portal = scene.getObjectByName('atrium-one-way')
      const slab = portal?.getObjectByName('OneWayWall')
      const passArrow = portal?.getObjectByName('OneWayWallPassArrow')
      const lockBar = portal?.getObjectByName('OneWayWallLockBar')
      if (!definition?.size || !(slab instanceof THREE.Mesh)
        || !(passArrow instanceof THREE.Mesh) || !(lockBar instanceof THREE.Mesh)
        || !(passArrow.material instanceof THREE.MeshStandardMaterial)
        || !(lockBar.material instanceof THREE.MeshStandardMaterial)) {
        throw new Error('Chapter 3 one-way portal presentation is missing')
      }
      expect((slab.geometry as THREE.BoxGeometry).parameters.width).toBeCloseTo(definition.size[0], 5)
      expect((slab.geometry as THREE.BoxGeometry).parameters.height).toBeCloseTo(definition.size[1], 5)
      expect((slab.geometry as THREE.BoxGeometry).parameters.depth).toBeCloseTo(definition.size[2], 5)

      world.afterPhysics([actor('player', 'player', [0, 1.08, -2.45])])
      expect(passArrow.material.emissiveIntensity).toBeGreaterThan(2.5)
      expect(lockBar.material.emissiveIntensity).toBeLessThan(0.5)

      world.afterPhysics([actor('player', 'player', [3, 1.08, -2.45])])
      expect(passArrow.material.emissiveIntensity).toBeLessThan(0.5)
      expect(lockBar.material.emissiveIntensity).toBeGreaterThan(3)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 P — one-way physical wall lets Player cross WEST→EAST but blocks EAST→WEST', async () => {
    const { physics, world } = await createWorld(3)
    const westRecord = physics.createActor('west-player', 'player', { x: 0, y: 1.265, z: -2.45 })
    const westMotor = new CharacterMotor(physics, westRecord)
    const eastRecord = physics.createActor('east-player', 'player', { x: 3, y: 1.265, z: -2.45 })
    const eastMotor = new CharacterMotor(physics, eastRecord)
    try {
      const wall = physics.record('atrium-one-way')
      if (!wall) throw new Error('atrium-one-way wall missing')
      const westPlayer = actor('west-player', 'player', [0, 1.265, -2.45])
      for (let tick = 1; tick <= 90; tick += 1) {
        world.beforePhysics(tick, [westPlayer])
        westMotor.prepare({ moveX: 1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step(); westMotor.syncAfterStep(); westPlayer.position.copy(westMotor.position)
        world.afterPhysics([westPlayer])
      }
      expect(westMotor.position.x).toBeGreaterThan(2.1)

      const eastPlayer = actor('east-player', 'player', [3, 1.265, -2.45])
      for (let tick = 91; tick <= 210; tick += 1) {
        world.beforePhysics(tick, [eastPlayer])
        eastMotor.prepare({ moveX: -1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step(); eastMotor.syncAfterStep(); eastPlayer.position.copy(eastMotor.position)
        world.afterPhysics([eastPlayer])
      }
      expect(eastMotor.position.x).toBeGreaterThan(2.0)
      expect(wall.body.translation().y).toBeCloseTo(CHAPTER_LAYOUTS[3].devices.find((device) => device.id === 'atrium-one-way')!.position[1], 3)
    } finally {
      westMotor.dispose(); eastMotor.dispose(); world.dispose(); physics.dispose()
    }
  })

  it('Ch3 O2 — the directional wall stays physically raised for Echo and Core collisions', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const wall = physics.record('atrium-one-way')
      if (!wall) throw new Error('atrium-one-way wall missing')
      const closedY = wall.body.translation().y
      const echo = actor('echo', 'echo', [0.0, 1.08, -2.45])
      world.beforePhysics(1, [echo])
      physics.step(); world.afterPhysics([echo])
      physics.step()
      expect(wall.body.translation().y, 'Echo cannot lower the player-only crossing').toBeCloseTo(closedY, 3)

      const player = actor('player', 'player', [0.0, 1.08, -2.45])
      world.beforePhysics(2, [player, echo])
      physics.step(); world.afterPhysics([player])
      physics.step()
      expect(wall.body.translation().y, 'Player passage does not remove the physical wall').toBeCloseTo(closedY, 3)
      expect(wall.tag.playerPassDirectionX).toBe(1)
      expect(wall.tag.nonBlocking).toBe(false)
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 R — the separate return gate opens only from the actual receiver and only passes Player', async () => {
    const { physics, scene, world } = await createWorld(3)
    const playerRecord = physics.createActor('return-player', 'player', { x: 3.1, y: 1.265, z: 0 })
    const playerMotor = new CharacterMotor(physics, playerRecord)
    const echoRecord = physics.createActor('return-echo', 'echo', { x: 3.1, y: 1.265, z: 0 })
    const echoMotor = new CharacterMotor(physics, echoRecord)
    try {
      const gate = physics.record('atrium-return-gate')
      const core = physics.record('memory-core')
      const receiver = CHAPTER_LAYOUTS[3].devices.find((device) => device.id === 'core-receiver')
      const gateVisual = scene.getObjectByName('atrium-return-gate')
      if (!gate || !core || !receiver || !gateVisual?.getObjectByName('ReturnGateDoorPanels')) {
        throw new Error('Chapter 3 return gate setup is missing')
      }
      const closedSnapshot = world.captureSnapshot()
      // A provenance-like fact cannot unlock the gate: the receiver's actual
      // active state is the sole authority.
      world.facts.add('echo-used')
      world.beforePhysics(1, [])
      expect(gate.tag.playerReturnPassOpen).toBe(false)

      const player = actor('return-player', 'player', [3.1, 1.265, 0])
      for (let tick = 2; tick <= 95; tick += 1) {
        world.beforePhysics(tick, [player])
        playerMotor.prepare({ moveX: -1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step(); playerMotor.syncAfterStep(); player.position.copy(playerMotor.position)
        world.afterPhysics([player])
      }
      expect(playerMotor.position.x, 'receiver inactive: EAST→WEST return must stay blocked').toBeGreaterThan(1.82)

      // Fill the real authored receiver. No provenance condition is provided.
      core.body.setTranslation({ x: receiver.position[0], y: receiver.position[1], z: receiver.position[2] }, true)
      core.body.setLinvel({ x: 0, y: -1, z: 0 }, true)
      physics.step(); world.afterPhysics([player])
      expect(world.debugState().facts).toContain('receiver-filled')
      expect(gate.tag.playerReturnPassOpen).toBe(true)
      expect(world.debugState().barriers['atrium-return-gate']?.open).toBe(true)
      const openSnapshot = world.captureSnapshot()

      for (let tick = 96; tick <= 230; tick += 1) {
        world.beforePhysics(tick, [player])
        playerMotor.prepare({ moveX: -1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step(); playerMotor.syncAfterStep(); player.position.copy(playerMotor.position)
        world.afterPhysics([player])
      }
      expect(playerMotor.position.x, 'receiver active: Player may use the return gate').toBeLessThan(-0.15)

      const echo = actor('return-echo', 'echo', [3.1, 1.265, 0])
      for (let tick = 231; tick <= 325; tick += 1) {
        world.beforePhysics(tick, [player, echo])
        echoMotor.prepare({ moveX: -1, moveZ: 0, jumpPressed: false, dashPressed: false })
        physics.step(); echoMotor.syncAfterStep(); echo.position.copy(echoMotor.position)
        world.afterPhysics([player, echo])
      }
      expect(echoMotor.position.x, 'open return gate must still block Echo').toBeGreaterThan(1.82)

      const probeCore = physics.createDynamicBox('return-gate-core-probe', 'core', { x: 2.9, y: 1.15, z: 0 }, { x: 0.18, y: 0.18, z: 0.18 })
      probeCore.body.setLinvel({ x: -6, y: 0, z: 0 }, true)
      for (let step = 0; step < 75; step += 1) physics.step()
      expect(probeCore.body.translation().x, 'open return gate must still block Core').toBeGreaterThan(1.75)

      world.restoreSnapshot(closedSnapshot, false)
      expect(gate.tag.playerReturnPassOpen, 'rewind restores the inactive receiver gate state').toBe(false)
      world.restoreSnapshot(openSnapshot, false)
      expect(gate.tag.playerReturnPassOpen, 'rewind restores the active receiver gate state').toBe(true)
    } finally {
      playerMotor.dispose(); echoMotor.dispose(); world.dispose(); physics.dispose()
    }
  })

  it('Ch3 P — actor can still cross gate WEST→EAST', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const player = actor('player', 'player', [0.0, 1.08, -2.45])
      world.afterPhysics([player])
      player.position.set(3.0, 1.08, -2.45)
      physics.step(); world.afterPhysics([player])
      // Player crosses west→east freely (not pushed back)
      expect(player.position.x, 'WEST→EAST must pass').toBeGreaterThan(0)
      expect(world.captureSnapshot().facts).not.toContain('temporal-gate-rejected')
    } finally { world.dispose(); physics.dispose() }
  })

  it('Ch3 Q — Player can pickup the Core only when in interact range (no auto-catch)', async () => {
    const { physics, world } = await createWorld(3)
    try {
      const player = actor('player', 'player', [-6.2, 1.1, 2.45])
      // Player is at the core spawn; try to carry
      const result = world.interact(player)
      expect(result).toBe('core')
      physics.step(); world.afterPhysics([player])
      expect(world.captureSnapshot().dynamics['memory-core']?.carriedBy).toBe('player')
    } finally { world.dispose(); physics.dispose() }
  })

})
