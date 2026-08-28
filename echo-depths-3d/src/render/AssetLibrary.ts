import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CharacterAnimator, createAnimatedActor, REQUIRED_CHARACTER_STATES, type CharacterState } from './CharacterAnimator'

export type AssetStatus = 'loading' | 'kaykit' | 'procedural'

type ProgressHandler = (loaded: number, total: number, label: string) => void

type KayKitManifest = {
  character?: string
  animations?: string[]
  environment: string[]
  resources?: string[]
}

const MANIFEST_URL = '/assets/kaykit/manifest.json'

export class AssetLibrary {
  private readonly loader = new GLTFLoader()
  private readonly loaded = new Map<string, GLTF>()
  private manifest: KayKitManifest = { environment: [] }
  private progressHandler: ProgressHandler | undefined
  status: AssetStatus = 'loading'

  onProgress(handler: ProgressHandler): void {
    this.progressHandler = handler
  }

  async load(): Promise<void> {
    this.status = 'loading'
    this.progressHandler?.(0, 1, 'manifest')
    try {
      const response = await fetch(MANIFEST_URL, { cache: 'no-store' })
      if (!response.ok) throw new Error(`manifest ${response.status}`)
      this.manifest = (await response.json()) as KayKitManifest
      const urls = [
        ...(this.manifest.character ? [this.manifest.character] : []),
        ...(this.manifest.animations ?? []),
        ...this.manifest.environment,
        ...(this.manifest.resources ?? []),
      ]
      if (urls.length === 0) throw new Error('empty manifest')
      let loadedCount = 0
      await Promise.all(urls.map(async (url) => {
        const gltf = await this.loader.loadAsync(url)
        this.loaded.set(url, gltf)
        loadedCount += 1
        this.progressHandler?.(loadedCount, urls.length, url.split('/').at(-1) ?? url)
      }))
    } catch {
      this.status = 'procedural'
      this.progressHandler?.(1, 1, 'procedural runtime')
    }
  }

  createCharacter(echo = false): CharacterAnimator {
    const characterUrl = this.manifest.character
    const gltf = characterUrl ? this.loaded.get(characterUrl) : undefined
    if (gltf) {
      try {
        const clips = this.normalizeClips([
          ...gltf.animations,
          ...(this.manifest.animations ?? []).flatMap((url) => this.loaded.get(url)?.animations ?? []),
        ])
        if (clips.length !== REQUIRED_CHARACTER_STATES.length) return this.createProceduralCharacter(echo)
        const root = clone(gltf.scene) as THREE.Group
        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          object.geometry = object.geometry.clone()
          const source = Array.isArray(object.material) ? object.material : [object.material]
          const cloned = source.map((material) => material.clone())
          object.material = Array.isArray(object.material) ? cloned : cloned[0] ?? object.material
          object.castShadow = true
          object.receiveShadow = true
          if (echo) {
            for (const next of cloned) {
              next.transparent = true
              next.opacity = 0.48
              next.depthWrite = false
              if ('emissive' in next && next.emissive instanceof THREE.Color) next.emissive.set(0x28e7dc)
            }
          }
        })
        this.status = 'kaykit'
        return new CharacterAnimator(root, clips)
      } catch {
        return this.createProceduralCharacter(echo)
      }
    }
    return this.createProceduralCharacter(echo)
  }

  private createProceduralCharacter(echo: boolean): CharacterAnimator {
    this.status = 'procedural'
    return createAnimatedActor({
      cloth: echo ? 0x402d63 : 0x18293a,
      armor: echo ? 0xa957d4 : 0xd7ceb6,
      glow: echo ? 0x20f3dc : 0x4be8ff,
      skin: 0xefe7ce,
      opacity: echo ? 0.48 : 1,
    })
  }

  environmentModels(): THREE.Object3D[] {
    return this.cloneModels(this.manifest.environment)
  }

  resourceModels(): THREE.Object3D[] {
    return this.cloneModels(this.manifest.resources ?? [])
  }

  private cloneModels(urls: readonly string[]): THREE.Object3D[] {
    return urls
      .map((url) => this.loaded.get(url))
      .filter((gltf): gltf is GLTF => Boolean(gltf))
      .map((gltf) => {
        const model = clone(gltf.scene)
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
          }
        })
        return model
      })
  }

  private normalizeClips(source: readonly THREE.AnimationClip[]): THREE.AnimationClip[] {
    const aliases: Record<CharacterState, readonly string[]> = {
      Idle: ['idle_a', 'idle'],
      Walk: ['walking_a', 'walking'],
      Run: ['running_a', 'running'],
      Jump: ['jump_start'],
      Fall: ['jump_idle'],
      Land: ['jump_land'],
      Carry: ['holding_a', 'holding'],
      Throw: ['throw'],
      Interact: ['interact'],
      Attack: ['melee_1h_attack_slice_horizontal', 'melee_1h_attack_chop'],
      Dash: ['dodge_forward'],
      Hit: ['hit_a', 'hit'],
      Defeat: ['death_a', 'death'],
    }
    const normalized: THREE.AnimationClip[] = []
    for (const state of REQUIRED_CHARACTER_STATES) {
      const match = source.find((clip) => aliases[state].some((alias) => clip.name.toLowerCase() === alias || clip.name.toLowerCase().includes(alias)))
      if (match) {
        const normalizedClip = match.clone().resetDuration()
        normalizedClip.name = state
        normalized.push(normalizedClip)
      }
    }
    return normalized
  }

  dispose(): void {
    const textures = new Set<THREE.Texture>()
    for (const gltf of this.loaded.values()) {
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) textures.add(value)
          }
          material.dispose()
        }
      })
    }
    for (const texture of textures) texture.dispose()
    this.loaded.clear()
  }
}
