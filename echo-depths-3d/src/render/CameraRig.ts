import * as THREE from 'three'
import type { StageNumber } from '../levels/layouts'

type CameraProfile = {
  yaw: number
  pitch: number
  distance: number
  fov: number
  lookAhead: number
  focusX: number
}

const DEFAULT_PROFILE: CameraProfile = {
  yaw: Math.PI / 4,
  pitch: 0.72,
  distance: 12.8,
  fov: 43,
  lookAhead: 0.75,
  focusX: 0,
}

const CHAPTER_PROFILES: Readonly<Record<StageNumber, CameraProfile>> = {
  0: DEFAULT_PROFILE,
  1: DEFAULT_PROFILE,
  2: DEFAULT_PROFILE,
  3: { yaw: 0.82, pitch: 0.74, distance: 15.2, fov: 46, lookAhead: 0.9, focusX: 2.6 },
  4: { yaw: 0.76, pitch: 0.72, distance: 14.8, fov: 45, lookAhead: 0.85, focusX: 2.2 },
  5: { yaw: 0.72, pitch: 0.78, distance: 15.8, fov: 47, lookAhead: 0.95, focusX: 2.5 },
}

const MOBILE_BREAKPOINT = 700
const MIN_OBSTRUCTION_DISTANCE = 3.8
const PERIMETER_WALL = /^(atrium|gallery|well)-(north|south|west(?:-wall)?|east(?:-wall)?)$/

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera
  private readonly target = new THREE.Vector3()
  private readonly playerPoint = new THREE.Vector3()
  private readonly desired = new THREE.Vector3()
  private readonly lookAt = new THREE.Vector3()
  private readonly followOffset = new THREE.Vector3(0, 1.05, 0)
  private readonly framingOffset = new THREE.Vector3()
  private readonly horizontalVelocity = new THREE.Vector3()
  private readonly cameraDirection = new THREE.Vector3()
  private readonly obstructionDirection = new THREE.Vector3()
  private readonly fadeDirection = new THREE.Vector3()
  private readonly cameraFromPlayer = new THREE.Vector3()
  private readonly obstructionWorldPosition = new THREE.Vector3()
  private readonly fadeRaycaster = new THREE.Raycaster()
  private readonly obstructionHits: THREE.Intersection[] = []
  private readonly fadeHits: THREE.Intersection[] = []
  private readonly faded = new Set<THREE.Object3D>()
  private obstructionElapsed = Number.POSITIVE_INFINITY
  private chapter: StageNumber = 0
  private yaw = DEFAULT_PROFILE.yaw
  private pitch = DEFAULT_PROFILE.pitch
  private targetPitch = this.pitch
  private distance = DEFAULT_PROFILE.distance
  private lookAhead = DEFAULT_PROFILE.lookAhead
  private obstructionTargetDistance = this.distance
  private obstructionDistance = this.distance
  private shake = 0
  private obstructionMeshes: THREE.Mesh[] = []

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(DEFAULT_PROFILE.fov, aspect, 0.08, 120)
    this.camera.position.set(8, 10, 8)
  }

  setChapter(chapter: StageNumber, viewportWidth: number): void {
    this.chapter = chapter
    const profile = CHAPTER_PROFILES[chapter]
    this.yaw = profile.yaw
    this.pitch = profile.pitch
    this.targetPitch = profile.pitch
    this.applyViewportProfile(viewportWidth)
    this.obstructionTargetDistance = this.distance
    this.obstructionDistance = this.distance
    this.obstructionElapsed = Number.POSITIVE_INFINITY
  }

  snapTo(player: THREE.Vector3): void {
    this.playerPoint.copy(player).add(this.followOffset)
    this.target.copy(this.playerPoint).add(this.framingOffset)
    this.lookAt.copy(this.target)
    const horizontal = Math.cos(this.pitch)
    this.cameraDirection.set(
      Math.sin(this.yaw) * horizontal,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * horizontal,
    )
    this.desired.copy(this.lookAt).addScaledVector(this.cameraDirection, this.distance)
    this.camera.position.copy(this.desired)
    this.camera.lookAt(this.lookAt)
  }

  setObstructions(meshes: THREE.Mesh[]): void {
    this.restoreObstructionMaterials()
    this.obstructionMeshes = meshes
    this.obstructionElapsed = Number.POSITIVE_INFINITY
    this.obstructionTargetDistance = this.distance
    this.obstructionDistance = this.distance
  }

  rotate(yawDelta: number, pitchDelta = 0): void {
    this.yaw += yawDelta
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + pitchDelta, 0.48, 0.94)
  }

  nudgeShake(amount: number): void {
    this.shake = Math.min(0.28, this.shake + amount)
  }

  forward(out: THREE.Vector3): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize()
  }

  right(out: THREE.Vector3): THREE.Vector3 {
    return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize()
  }

  update(player: THREE.Vector3, velocity: THREE.Vector3, deltaSeconds: number, raycaster: THREE.Raycaster): void {
    const follow = 1 - Math.exp(-deltaSeconds * 7.5)
    this.pitch = THREE.MathUtils.damp(this.pitch, this.targetPitch, 18, deltaSeconds)
    this.horizontalVelocity.copy(velocity).setY(0)
    if (this.horizontalVelocity.lengthSq() > 0.01) this.horizontalVelocity.normalize().multiplyScalar(this.lookAhead)
    this.playerPoint.copy(player).add(this.followOffset)
    this.target.copy(this.playerPoint).add(this.framingOffset).add(this.horizontalVelocity)
    this.lookAt.lerp(this.target, follow)

    const horizontal = Math.cos(this.pitch)
    this.cameraDirection.set(
      Math.sin(this.yaw) * horizontal,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * horizontal,
    )

    this.obstructionElapsed += deltaSeconds
    if (this.obstructionElapsed >= 1 / 30) {
      this.obstructionElapsed = 0
      this.updateObstructions(raycaster)
    }
    const obstructionResponse = this.obstructionTargetDistance < this.obstructionDistance ? 28 : 11
    this.obstructionDistance = THREE.MathUtils.damp(
      this.obstructionDistance,
      this.obstructionTargetDistance,
      obstructionResponse,
      deltaSeconds,
    )
    this.desired.copy(this.lookAt).addScaledVector(this.cameraDirection, this.obstructionDistance)

    const shakeMagnitude = this.shake
    this.shake *= Math.exp(-deltaSeconds * 14)
    const now = performance.now()
    this.desired.x += Math.sin(now * 0.047) * shakeMagnitude
    this.desired.y += Math.cos(now * 0.061) * shakeMagnitude * 0.45
    this.camera.position.lerp(this.desired, 1 - Math.exp(-deltaSeconds * 9))
    this.camera.lookAt(this.lookAt)
  }

  private updateObstructions(raycaster: THREE.Raycaster): void {
    this.obstructionDirection.copy(this.cameraDirection)
    raycaster.set(this.lookAt, this.obstructionDirection)
    raycaster.far = this.distance
    this.obstructionHits.length = 0
    const hit = raycaster.intersectObjects(this.obstructionMeshes, false, this.obstructionHits)[0]
    // A perimeter wall very close to the focus point cannot be solved by
    // clamping to the minimum distance: that leaves the camera behind the wall
    // and destroys the overview. Keep the authored wide framing and cut away
    // that exact surface; only pull forward for obstacles with enough room to
    // remain outside them.
    this.obstructionTargetDistance = hit
      && hit.distance >= MIN_OBSTRUCTION_DISTANCE + 0.32
      && hit.distance < this.distance - 0.3
      ? hit.distance - 0.32
      : this.distance

    this.fadeDirection.copy(this.lookAt).sub(this.camera.position)
    const fadeDistance = this.fadeDirection.length()
    this.fadeRaycaster.set(this.camera.position, this.fadeDirection.normalize())
    this.fadeRaycaster.near = 0
    this.fadeRaycaster.far = fadeDistance
    this.fadeHits.length = 0
    this.fadeRaycaster.intersectObjects(this.obstructionMeshes, false, this.fadeHits)
    this.faded.clear()
    for (const entry of this.fadeHits) this.faded.add(entry.object)
    this.fadeDirection.copy(this.playerPoint).sub(this.camera.position)
    const playerFadeDistance = this.fadeDirection.length()
    this.fadeRaycaster.set(this.camera.position, this.fadeDirection.normalize())
    this.fadeRaycaster.far = playerFadeDistance
    this.fadeHits.length = 0
    this.fadeRaycaster.intersectObjects(this.obstructionMeshes, false, this.fadeHits)
    for (const entry of this.fadeHits) this.faded.add(entry.object)
    if (this.chapter >= 3) {
      this.cameraFromPlayer.copy(this.camera.position).sub(this.playerPoint)
      const cameraDistance = this.cameraFromPlayer.length()
      this.cameraFromPlayer.normalize()
      for (const mesh of this.obstructionMeshes) {
        if (!PERIMETER_WALL.test(mesh.name)) continue
        mesh.getWorldPosition(this.obstructionWorldPosition)
        this.obstructionWorldPosition.sub(this.playerPoint)
        const wallDistance = this.obstructionWorldPosition.length()
        if (wallDistance >= cameraDistance * 1.08) continue
        const cameraSide = this.obstructionWorldPosition.normalize().dot(this.cameraFromPlayer)
        if (cameraSide > 0.28) this.faded.add(mesh)
      }
    }
    for (const mesh of this.obstructionMeshes) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue
        const shouldFade = this.faded.has(mesh)
        material.transparent = shouldFade
        material.opacity = shouldFade ? 0 : 1
        material.depthWrite = !shouldFade
      }
    }
  }

  private applyViewportProfile(viewportWidth: number): void {
    const profile = CHAPTER_PROFILES[this.chapter]
    const mobile = viewportWidth < MOBILE_BREAKPOINT
    this.distance = profile.distance * (mobile ? 1.14 : 1)
    this.lookAhead = profile.lookAhead * (mobile ? 0.75 : 1)
    this.framingOffset.set(profile.focusX * (mobile ? 0.72 : 1), 0, 0)
    this.targetPitch = THREE.MathUtils.clamp(profile.pitch + (mobile ? 0.06 : 0), 0.48, 0.94)
    this.camera.fov = profile.fov + (mobile ? 5 : 0)
    this.camera.updateProjectionMatrix()
  }

  private restoreObstructionMaterials(): void {
    for (const mesh of this.obstructionMeshes) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue
        material.transparent = false
        material.opacity = 1
        material.depthWrite = true
      }
    }
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height)
    this.applyViewportProfile(width)
    this.camera.updateProjectionMatrix()
  }
}
