import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CameraRig } from './CameraRig'

describe('CameraRig direction outputs', () => {
  it('writes forward and right into caller-owned vectors', () => {
    const camera = new CameraRig(1)
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()

    expect(camera.forward(forward)).toBe(forward)
    expect(camera.right(right)).toBe(right)
    expect(forward.length()).toBeCloseTo(1)
    expect(right.length()).toBeCloseTo(1)
    expect(forward.dot(right)).toBeCloseTo(0)
  })

  it('keeps a shortened obstruction distance stable between 30 Hz probes', () => {
    const camera = new CameraRig(1)
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 0.8), new THREE.MeshBasicMaterial())
    wall.position.set(2, 3, 2)
    wall.updateMatrixWorld()
    camera.setObstructions([wall])
    const player = new THREE.Vector3()
    const velocity = new THREE.Vector3()
    const raycaster = new THREE.Raycaster()

    for (let frame = 0; frame < 120; frame += 1) camera.update(player, velocity, 1 / 60, raycaster)

    const focus = new THREE.Vector3(0, 1.05, 0)
    const blockedDistance = camera.camera.position.distanceTo(focus)
    camera.update(player, velocity, 1 / 120, raycaster)
    const nextDistance = camera.camera.position.distanceTo(focus)

    expect(blockedDistance).toBeLessThan(5)
    expect(nextDistance - blockedDistance).toBeLessThan(0.08)
  })

  it('eases vertical camera drag within a comfortable orbit range', () => {
    const camera = new CameraRig(1)
    const player = new THREE.Vector3()
    const velocity = new THREE.Vector3()
    const raycaster = new THREE.Raycaster()

    for (let frame = 0; frame < 120; frame += 1) camera.update(player, velocity, 1 / 60, raycaster)
    const heightBeforeDrag = camera.camera.position.y
    camera.rotate(0, 1)
    for (let frame = 0; frame < 60; frame += 1) camera.update(player, velocity, 1 / 60, raycaster)

    expect(camera.camera.position.y).toBeGreaterThan(heightBeforeDrag + 1)
    expect(camera.camera.position.y).toBeLessThan(12)
  })
})
