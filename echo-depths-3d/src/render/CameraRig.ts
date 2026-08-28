import * as THREE from 'three'

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera
  private readonly target = new THREE.Vector3()
  private readonly desired = new THREE.Vector3()
  private readonly lookAt = new THREE.Vector3()
  private readonly followOffset = new THREE.Vector3(0, 1.05, 0)
  private readonly horizontalVelocity = new THREE.Vector3()
  private readonly cameraDirection = new THREE.Vector3()
  private readonly obstructionDirection = new THREE.Vector3()
  private readonly fadeDirection = new THREE.Vector3()
  private readonly fadeRaycaster = new THREE.Raycaster()
  private readonly obstructionHits: THREE.Intersection[] = []
  private readonly fadeHits: THREE.Intersection[] = []
  private readonly faded = new Set<THREE.Object3D>()
  private obstructionElapsed = Number.POSITIVE_INFINITY
  private yaw = Math.PI / 4
  private pitch = 0.72
  private targetPitch = this.pitch
  private distance = 12.8
  private obstructionTargetDistance = this.distance
  private obstructionDistance = this.distance
  private shake = 0
  private obstructionMeshes: THREE.Mesh[] = []

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(43, aspect, 0.08, 120)
    this.camera.position.set(8, 10, 8)
  }

  setObstructions(meshes: THREE.Mesh[]): void {
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
    if (this.horizontalVelocity.lengthSq() > 0.01) this.horizontalVelocity.normalize().multiplyScalar(0.75)
    this.target.copy(player).add(this.followOffset).add(this.horizontalVelocity)
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
    this.desired.x += (Math.sin(now * 0.047) * shakeMagnitude)
    this.desired.y += (Math.cos(now * 0.061) * shakeMagnitude * 0.45)
    this.camera.position.lerp(this.desired, 1 - Math.exp(-deltaSeconds * 9))
    this.camera.lookAt(this.lookAt)

  }

  private updateObstructions(raycaster: THREE.Raycaster): void {
    this.obstructionDirection.copy(this.cameraDirection)
    raycaster.set(this.lookAt, this.obstructionDirection)
    raycaster.far = this.distance
    this.obstructionHits.length = 0
    const hit = raycaster.intersectObjects(this.obstructionMeshes, false, this.obstructionHits)[0]
    this.obstructionTargetDistance = hit && hit.distance < this.distance - 0.3
      ? Math.max(2.4, hit.distance - 0.32)
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
    for (const mesh of this.obstructionMeshes) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue
        const shouldFade = this.faded.has(mesh)
        material.transparent = shouldFade
        material.opacity = shouldFade ? 0.2 : 1
        material.depthWrite = !shouldFade
      }
    }
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
  }
}
