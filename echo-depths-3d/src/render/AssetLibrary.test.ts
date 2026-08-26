import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { describe, expect, it } from 'vitest'
import { AssetLibrary } from './AssetLibrary'

type AssetInternals = {
  manifest: { character?: string; watcherCharacter?: string; animations?: string[]; environment: string[] }
  loaded: Map<string, GLTF>
}

function installCharacterAsset(assets: AssetLibrary, animations: THREE.AnimationClip[]): void {
  const characterUrl = '/character.glb'
  const internals = assets as unknown as AssetInternals
  internals.manifest = { character: characterUrl, environment: [] }
  internals.loaded.set(characterUrl, {
    animations,
    scene: new THREE.Group(),
    scenes: [],
    cameras: [],
    asset: { version: '2.0' },
    parser: {} as GLTF['parser'],
    userData: {},
  })
}

describe('AssetLibrary active character status', () => {
  it('downgrades to procedural when a loaded KayKit character lacks required clips', () => {
    const assets = new AssetLibrary()
    installCharacterAsset(assets, [new THREE.AnimationClip('idle_a', 1, [])])
    const actor = assets.createCharacter()

    expect(assets.status).toBe('procedural')

    actor.dispose()
    assets.dispose()
  })

  it('reports KayKit only after all required clip-backed states validate', () => {
    const assets = new AssetLibrary()
    const clipNames = [
      'idle_a',
      'walking_a',
      'running_a',
      'jump_start',
      'jump_idle',
      'jump_land',
      'holding_a',
      'throw',
      'interact',
      'melee_1h_attack_slice_horizontal',
      'dodge_forward',
      'hit_a',
      'death_a',
    ]
    installCharacterAsset(assets, clipNames.map((name) => new THREE.AnimationClip(name, 1, [])))

    const actor = assets.createCharacter()

    expect(assets.status).toBe('kaykit')

    actor.dispose()
    assets.dispose()
  })

  it('builds the Watcher from its distinct manifest character with shared rig clips', () => {
    const assets = new AssetLibrary()
    const internals = assets as unknown as AssetInternals
    const watcherUrl = '/rogue-hooded.glb'
    const clipNames = [
      'idle_a', 'walking_a', 'running_a', 'jump_start', 'jump_idle', 'jump_land',
      'holding_a', 'throw', 'interact', 'melee_1h_attack_slice_horizontal',
      'dodge_forward', 'hit_a', 'death_a',
    ]
    const scene = new THREE.Group()
    scene.name = 'RogueHoodedSource'
    internals.manifest = { watcherCharacter: watcherUrl, environment: [] }
    internals.loaded.set(watcherUrl, {
      animations: clipNames.map((name) => new THREE.AnimationClip(name, 1, [])),
      scene,
      scenes: [],
      cameras: [],
      asset: { version: '2.0' },
      parser: {} as GLTF['parser'],
      userData: {},
    })

    const watcher = assets.createWatcherCharacter()

    expect(watcher.root.name).toBe('RogueHoodedSource')
    expect(watcher.state()).toBe('Idle')

    watcher.dispose()
    assets.dispose()
  })

  it('reuses the official Knight rig as the armored Chapter 5 Guardian', () => {
    const assets = new AssetLibrary()
    const clipNames = [
      'idle_a', 'walking_a', 'running_a', 'jump_start', 'jump_idle', 'jump_land',
      'holding_a', 'throw', 'interact', 'melee_1h_attack_slice_horizontal',
      'dodge_forward', 'hit_a', 'death_a',
    ]
    installCharacterAsset(assets, clipNames.map((name) => new THREE.AnimationClip(name, 1, [])))

    const guardian = assets.createGuardianCharacter()

    expect(guardian.root).toBeInstanceOf(THREE.Group)
    expect(guardian.state()).toBe('Idle')

    guardian.dispose()
    assets.dispose()
  })
})
