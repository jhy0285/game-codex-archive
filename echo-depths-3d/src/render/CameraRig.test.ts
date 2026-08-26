import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CameraRig } from './CameraRig'

describe('CameraRig chapter framing', () => {
  it('preserves the Chapter 1 profile and widens later chapters on mobile', () => {
    const rig = new CameraRig(16 / 9)
    const player = new THREE.Vector3(-5.4, 1.08, 3.8)

    rig.setChapter(1, 1280)
    rig.snapTo(player)
    const chapterOneDistance = rig.camera.position.distanceTo(player.clone().add(new THREE.Vector3(0, 1.05, 0)))
    expect(chapterOneDistance).toBeCloseTo(12.8, 4)
    expect(rig.camera.fov).toBe(43)

    rig.setChapter(5, 480)
    rig.snapTo(player)
    const mobileDistance = rig.camera.position.distanceTo(player.clone().add(new THREE.Vector3(0, 1.05, 0)))
    expect(mobileDistance).toBeGreaterThan(17)
    expect(rig.camera.fov).toBe(52)
  })

  it('fades a registered raised floor that blocks the player sight line', () => {
    const rig = new CameraRig(16 / 9)
    const player = new THREE.Vector3(0, 1, 0)
    rig.setChapter(5, 1280)
    rig.snapTo(player)

    const material = new THREE.MeshStandardMaterial()
    const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 8), material)
    floor.position.copy(rig.camera.position).lerp(player.clone().add(new THREE.Vector3(0, 1.05, 0)), 0.45)
    floor.updateMatrixWorld(true)
    rig.setObstructions([floor])
    rig.update(player, new THREE.Vector3(), 1 / 30, new THREE.Raycaster())

    expect(material.transparent).toBe(true)
    expect(material.opacity).toBeLessThan(0.2)
  })

  it('keeps wide authored framing when a perimeter wall is too close to clear', () => {
    const rig = new CameraRig(16 / 9)
    const player = new THREE.Vector3(-7, 1.08, 2.8)
    rig.setChapter(3, 1280)
    rig.snapTo(player)

    const focus = player.clone().add(new THREE.Vector3(2.6, 1.05, 0))
    const direction = rig.camera.position.clone().sub(focus).normalize()
    const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 0.2), new THREE.MeshStandardMaterial())
    wall.position.copy(focus).addScaledVector(direction, 2.1)
    wall.lookAt(focus)
    wall.updateMatrixWorld(true)
    rig.setObstructions([wall])
    for (let frame = 0; frame < 120; frame += 1) {
      rig.update(player, new THREE.Vector3(), 1 / 60, new THREE.Raycaster())
    }

    expect(rig.camera.position.distanceTo(focus)).toBeGreaterThan(13)
    expect((wall.material as THREE.MeshStandardMaterial).opacity).toBe(0)
  })
})
