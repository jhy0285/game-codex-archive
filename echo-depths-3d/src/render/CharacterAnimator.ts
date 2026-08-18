import * as THREE from 'three'

export type CharacterState =
  | 'Idle'
  | 'Walk'
  | 'Run'
  | 'Jump'
  | 'Fall'
  | 'Land'
  | 'Carry'
  | 'Throw'
  | 'Interact'
  | 'Attack'
  | 'Dash'
  | 'Hit'
  | 'Defeat'

export const REQUIRED_CHARACTER_STATES: readonly CharacterState[] = [
  'Idle',
  'Walk',
  'Run',
  'Jump',
  'Fall',
  'Land',
  'Carry',
  'Throw',
  'Interact',
  'Attack',
  'Dash',
  'Hit',
  'Defeat',
]

type ActorPalette = {
  cloth: number
  armor: number
  glow: number
  skin: number
  opacity?: number
}

type ActorRig = {
  root: THREE.Group
  clips: THREE.AnimationClip[]
}

const track = (node: string, property: string, values: number[], duration = 0.8): THREE.NumberKeyframeTrack =>
  new THREE.NumberKeyframeTrack(`${node}.${property}`, [0, duration / 2, duration], values)

const vectorTrack = (node: string, property: string, values: number[], duration = 0.8): THREE.VectorKeyframeTrack =>
  new THREE.VectorKeyframeTrack(`${node}.${property}`, [0, duration / 2, duration], values)

function limbMaterial(color: number, opacity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.08,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  })
}

function makeMesh(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function createProceduralActor(palette: ActorPalette): ActorRig {
  const opacity = palette.opacity ?? 1
  const root = new THREE.Group()
  root.name = 'ActorRoot'

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 * opacity, depthWrite: false }),
  )
  shadow.name = 'ActorShadow'
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.025
  root.add(shadow)

  const bodyMaterial = limbMaterial(palette.cloth, opacity)
  const armorMaterial = limbMaterial(palette.armor, opacity)
  const skinMaterial = limbMaterial(palette.skin, opacity)
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: palette.glow,
    emissive: palette.glow,
    emissiveIntensity: opacity < 1 ? 2.2 : 1.1,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  })

  const hips = new THREE.Group()
  hips.name = 'Hips'
  hips.position.y = 0.78
  root.add(hips)

  const body = makeMesh('Body', new THREE.CapsuleGeometry(0.28, 0.52, 5, 10), bodyMaterial, [0, 0.45, 0])
  hips.add(body)
  const mantle = makeMesh('Mantle', new THREE.ConeGeometry(0.42, 0.72, 7, 1, true), bodyMaterial, [0, 0.28, 0.04])
  mantle.rotation.x = Math.PI
  hips.add(mantle)
  const head = makeMesh('Head', new THREE.SphereGeometry(0.29, 16, 12), skinMaterial, [0, 1.02, 0])
  head.scale.set(0.88, 1.05, 0.82)
  hips.add(head)
  const crest = makeMesh('Crest', new THREE.ConeGeometry(0.1, 0.36, 5), glowMaterial, [0, 1.34, -0.04])
  hips.add(crest)
  const visor = makeMesh('Visor', new THREE.BoxGeometry(0.32, 0.055, 0.045), glowMaterial, [0, 1.04, 0.255])
  hips.add(visor)

  const leftArm = makeMesh('LeftArm', new THREE.CapsuleGeometry(0.085, 0.38, 4, 8), armorMaterial, [-0.34, 0.55, 0])
  const rightArm = makeMesh('RightArm', new THREE.CapsuleGeometry(0.085, 0.38, 4, 8), armorMaterial, [0.34, 0.55, 0])
  const leftLeg = makeMesh('LeftLeg', new THREE.CapsuleGeometry(0.1, 0.34, 4, 8), armorMaterial, [-0.17, -0.06, 0])
  const rightLeg = makeMesh('RightLeg', new THREE.CapsuleGeometry(0.1, 0.34, 4, 8), armorMaterial, [0.17, -0.06, 0])
  hips.add(leftArm, rightArm, leftLeg, rightLeg)

  const weapon = makeMesh('Weapon', new THREE.CylinderGeometry(0.035, 0.055, 1.05, 7), glowMaterial, [0.55, 0.54, 0.12])
  weapon.rotation.z = -0.58
  hips.add(weapon)

  const duration = 0.8
  const clips: THREE.AnimationClip[] = [
    new THREE.AnimationClip('Idle', 1.6, [
      vectorTrack('Hips', 'scale', [1, 1, 1, 1.02, 0.97, 1.02, 1, 1, 1], 1.6),
      track('Mantle', 'rotation[z]', [0, 0.035, 0], 1.6),
    ]),
    new THREE.AnimationClip('Walk', duration, [
      track('LeftLeg', 'rotation[x]', [-0.5, 0.5, -0.5], duration),
      track('RightLeg', 'rotation[x]', [0.5, -0.5, 0.5], duration),
      track('LeftArm', 'rotation[x]', [0.35, -0.35, 0.35], duration),
      track('RightArm', 'rotation[x]', [-0.35, 0.35, -0.35], duration),
      vectorTrack('Hips', 'position', [0, 0.78, 0, 0, 0.84, 0, 0, 0.78, 0], duration),
    ]),
    new THREE.AnimationClip('Run', 0.56, [
      track('LeftLeg', 'rotation[x]', [-0.78, 0.78, -0.78], 0.56),
      track('RightLeg', 'rotation[x]', [0.78, -0.78, 0.78], 0.56),
      track('LeftArm', 'rotation[x]', [0.64, -0.64, 0.64], 0.56),
      track('RightArm', 'rotation[x]', [-0.64, 0.64, -0.64], 0.56),
      vectorTrack('Hips', 'position', [0, 0.78, 0, 0, 0.88, 0, 0, 0.78, 0], 0.56),
    ]),
    new THREE.AnimationClip('Jump', 0.42, [
      vectorTrack('Hips', 'position', [0, 0.78, 0, 0, 1.02, 0, 0, 0.92, 0], 0.42),
      track('LeftLeg', 'rotation[x]', [0, -0.68, -0.32], 0.42),
      track('RightLeg', 'rotation[x]', [0, 0.68, 0.32], 0.42),
    ]),
    new THREE.AnimationClip('Fall', 0.62, [
      track('LeftArm', 'rotation[z]', [0, -0.72, -0.48], 0.62),
      track('RightArm', 'rotation[z]', [0, 0.72, 0.48], 0.62),
      track('Mantle', 'rotation[x]', [Math.PI, 2.72, 2.84], 0.62),
    ]),
    new THREE.AnimationClip('Land', 0.34, [
      vectorTrack('Hips', 'scale', [1, 1, 1, 1.18, 0.68, 1.18, 1, 1, 1], 0.34),
      vectorTrack('Hips', 'position', [0, 0.78, 0, 0, 0.58, 0, 0, 0.78, 0], 0.34),
    ]),
    new THREE.AnimationClip('Carry', 0.92, [
      track('LeftArm', 'rotation[x]', [0, -1.46, -1.38], 0.92),
      track('RightArm', 'rotation[x]', [0, -1.46, -1.38], 0.92),
      vectorTrack('Hips', 'position', [0, 0.78, 0, 0, 0.82, 0, 0, 0.78, 0], 0.92),
    ]),
    new THREE.AnimationClip('Throw', 0.46, [
      track('RightArm', 'rotation[x]', [-1.2, 1.15, 0.1], 0.46),
      track('Weapon', 'rotation[z]', [-0.58, -1.1, -0.58], 0.46),
      track('Hips', 'rotation[y]', [0, -0.32, 0], 0.46),
    ]),
    new THREE.AnimationClip('Interact', 0.5, [
      track('LeftArm', 'rotation[x]', [0, -1.18, -0.22], 0.5),
      track('RightArm', 'rotation[x]', [0, -1.18, -0.22], 0.5),
      vectorTrack('Hips', 'position', [0, 0.78, 0, 0, 0.7, -0.12, 0, 0.78, 0], 0.5),
    ]),
    new THREE.AnimationClip('Attack', 0.38, [
      track('RightArm', 'rotation[z]', [0, -1.65, 0.22], 0.38),
      track('Weapon', 'rotation[z]', [-0.58, -2.1, -0.18], 0.38),
      track('Hips', 'rotation[y]', [0, 0.42, 0], 0.38),
    ]),
    new THREE.AnimationClip('Dash', 0.32, [
      vectorTrack('Hips', 'scale', [1, 1, 1, 0.82, 0.92, 1.46, 1, 1, 1], 0.32),
      track('Mantle', 'rotation[x]', [Math.PI, 2.44, Math.PI], 0.32),
    ]),
    new THREE.AnimationClip('Hit', 0.34, [
      track('Hips', 'rotation[z]', [0, 0.34, -0.08], 0.34),
      vectorTrack('Hips', 'scale', [1, 1, 1, 1.12, 0.88, 1.12, 1, 1, 1], 0.34),
    ]),
    new THREE.AnimationClip('Defeat', 0.92, [
      track('Hips', 'rotation[z]', [0, 0.48, 1.48], 0.92),
      vectorTrack('Hips', 'position', [0, 0.78, 0, 0, 0.5, 0, 0, 0.18, 0], 0.92),
    ]),
  ]

  return { root, clips }
}

export class CharacterAnimator {
  readonly root: THREE.Group
  private readonly mixer: THREE.AnimationMixer
  private readonly actions = new Map<CharacterState, THREE.AnimationAction>()
  private current: CharacterState = 'Idle'
  private disposed = false

  constructor(root: THREE.Group, clips: readonly THREE.AnimationClip[]) {
    this.root = root
    this.mixer = new THREE.AnimationMixer(root)
    for (const state of REQUIRED_CHARACTER_STATES) {
      const clip = clips.find((candidate) => candidate.name.toLowerCase() === state.toLowerCase())
      if (clip) {
        const action = this.mixer.clipAction(clip)
        action.enabled = true
        action.setLoop(state === 'Defeat' ? THREE.LoopOnce : THREE.LoopRepeat, state === 'Defeat' ? 1 : Infinity)
        action.clampWhenFinished = state === 'Defeat'
        this.actions.set(state, action)
      }
    }
    this.actions.get('Idle')?.play()
  }

  play(state: CharacterState, movementSpeed = 0): void {
    if (this.disposed) return
    const next = this.actions.get(state) ?? this.actions.get('Idle')
    if (!next) return
    if (state === this.current && next.isRunning()) {
      if (state === 'Walk' || state === 'Run') next.timeScale = THREE.MathUtils.clamp(movementSpeed / 3.4, 0.65, 1.65)
      return
    }
    const previous = this.actions.get(this.current)
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play()
    if (state === 'Walk' || state === 'Run') next.timeScale = THREE.MathUtils.clamp(movementSpeed / 3.4, 0.65, 1.65)
    if (previous && previous !== next) next.crossFadeFrom(previous, state === 'Hit' || state === 'Defeat' ? 0.06 : 0.14, true)
    this.current = state
  }

  update(deltaSeconds: number): void {
    if (!this.disposed) this.mixer.update(deltaSeconds)
  }

  state(): CharacterState {
    return this.current
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.root)
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) material.dispose()
    })
  }
}

export function createAnimatedActor(palette: ActorPalette): CharacterAnimator {
  const rig = createProceduralActor(palette)
  return new CharacterAnimator(rig.root, rig.clips)
}
