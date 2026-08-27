import { describe, expect, it } from 'vitest'
import { CHAPTER_LAYOUTS, type BoxDefinition } from './layouts'

const top = (box: BoxDefinition): number => box.position[1] + box.size[1]

describe('Chapter 3-5 authored level architecture', () => {
  it('keeps Chapter 3 flat and separates the player crossing from the Core transfer lane', () => {
    const layout = CHAPTER_LAYOUTS[3]
    const floorIds = layout.boxes.filter((box) => !box.wall).map((box) => box.id)
    const devices = new Map(layout.devices.map((device) => [device.id, device]))

    expect(floorIds).toEqual(expect.arrayContaining([
      'atrium-west',
      'atrium-player-crossing',
      'atrium-transfer-ledge',
      'atrium-east',
      'atrium-catch-basin',
    ]))
    expect(floorIds.some((id) => id.includes('descent-step'))).toBe(false)
    expect(Math.max(...layout.boxes.filter((box) => !box.wall).map(top))).toBeLessThan(0.5)
    expect(devices.get('atrium-one-way')?.position[2]).toBeLessThan(0)
    expect(devices.get('atrium-one-way')?.size?.[1]).toBeGreaterThanOrEqual(3.6)
    expect(devices.get('atrium-one-way')?.size?.[2]).toBeGreaterThanOrEqual(2.85)
    expect(devices.get('transfer-shutter')?.position[2]).toBeGreaterThan(0)
    expect(devices.get('transfer-shutter')?.openAtX).toBeGreaterThan(devices.get('atrium-one-way')!.position[0])
    expect(devices.get('memory-core')?.position[0]).toBeLessThan(0)
    expect(devices.get('core-receiver')?.position[0]).toBeGreaterThan(0)
  })

  it('builds Chapter 4 as overlook, patrol corridor, bell route, ramp, and high rear flank', () => {
    const layout = CHAPTER_LAYOUTS[4]
    const boxes = new Map(layout.boxes.map((box) => [box.id, box]))
    const watcher = layout.devices.find((device) => device.id === 'watcher')

    expect([...boxes.keys()]).toEqual(expect.arrayContaining([
      'gallery-foundation',
      'gallery-entry',
      'gallery-bell-route',
      'gallery-covered-flank',
      'gallery-patrol',
      'gallery-ramp',
      'gallery-high-flank',
    ]))
    expect([...boxes.keys()].some((id) => id.startsWith('flank-step'))).toBe(false)
    const foundation = boxes.get('gallery-foundation')!
    const entry = boxes.get('gallery-entry')!
    expect(foundation.position[0] - foundation.size[0]).toBeLessThanOrEqual(-9.35)
    expect(foundation.position[0] + foundation.size[0]).toBeGreaterThanOrEqual(8.95)
    expect(foundation.position[2] - foundation.size[2]).toBeLessThanOrEqual(-4.35)
    expect(foundation.position[2] + foundation.size[2]).toBeGreaterThanOrEqual(4.35)
    expect(top(foundation)).toBeGreaterThan(0.4)
    expect(top(foundation)).toBeLessThan(top(entry))
    expect(boxes.get('gallery-ramp')?.rotation?.[2]).toBeGreaterThan(0.14)
    expect(boxes.get('gallery-high-flank')?.occluder).toBe(true)
    expect(top(boxes.get('gallery-high-flank')!)).toBeGreaterThan((watcher?.position[1] ?? 0) + 0.9)
    expect(watcher?.to).toBeDefined()
  })

  it('uses one recording topology and exactly one powered moving device in Chapter 5', () => {
    const layout = CHAPTER_LAYOUTS[5]
    const boxes = new Map(layout.boxes.map((box) => [box.id, box]))
    const devices = new Map(layout.devices.map((device) => [device.id, device]))
    const moving = layout.devices.filter((device) => ['elevator', 'platform', 'bridge'].includes(device.kind))
    const overlap = (a: BoxDefinition, b: BoxDefinition, axis: 0 | 2): number => Math.min(
      a.position[axis] + a.size[axis],
      b.position[axis] + b.size[axis],
    ) - Math.max(
      a.position[axis] - a.size[axis],
      b.position[axis] - b.size[axis],
    )

    expect(moving.map((device) => device.id)).toEqual(['well-platform'])
    expect(devices.has('well-elevator')).toBe(false)
    expect(devices.get('well-player-gate')?.position[2]).toBeLessThan(0)
    expect(devices.get('well-transfer-shutter')?.position[2]).toBeGreaterThan(0)
    expect(devices.get('well-one-way')?.size?.[1]).toBeGreaterThanOrEqual(3.6)
    expect(devices.get('well-one-way')?.size?.[2]).toBeGreaterThanOrEqual(2.65)
    expect(devices.get('lower-seal')?.position[1]).toBeLessThan(1)
    expect(devices.get('upper-seal')?.position[1]).toBeGreaterThan(3)
    expect(devices.get('guardian')?.to).toBeDefined()
    expect(boxes.get('well-upper')?.occluder).toBe(true)
    expect(boxes.get('well-platform-apron')?.rotation?.[2]).toBeLessThan(0)

    const upper = boxes.get('well-upper')!
    const flank = boxes.get('guardian-flank')!
    const finalBridge = boxes.get('final-bridge')!
    const apron = boxes.get('well-platform-apron')!
    const platform = devices.get('well-platform')!
    expect((platform.position[0] + platform.size![0]) - (upper.position[0] - upper.size[0])).toBeGreaterThanOrEqual(0.6)
    expect(overlap(upper, flank, 0)).toBeGreaterThanOrEqual(0.8)
    expect(overlap(upper, finalBridge, 2)).toBeGreaterThanOrEqual(0.3)
    expect(finalBridge.size[0]).toBeGreaterThanOrEqual(1.1)
    expect((platform.position[0] + platform.size![0]) - (apron.position[0] - apron.size[0])).toBeGreaterThanOrEqual(0.8)
    expect(layout.decor.some((decor) => decor.id === 'upper-pillar')).toBe(false)
    expect(layout.pillars.filter((pillar) => pillar[1] > 3).every((pillar) => pillar[0] >= 9)).toBe(true)
    expect(boxes.has('well-east-wall')).toBe(false)
    expect(top(boxes.get('well-east-lower-wall')!)).toBeLessThan(2.5)
    expect(boxes.get('well-east-upper-parapet')?.position[1]).toBeGreaterThan(3.4)
    expect((boxes.get('well-east-upper-parapet')!.position[0] - boxes.get('well-east-upper-parapet')!.size[0]) - (finalBridge.position[0] + finalBridge.size[0])).toBeLessThanOrEqual(0)
    expect(boxes.has('well-north')).toBe(false)
    expect(boxes.has('well-south')).toBe(false)
    expect(top(boxes.get('well-north-lower-wall')!)).toBeLessThan(2.5)
    expect(top(boxes.get('well-south-lower-wall')!)).toBeLessThan(2.5)
    expect((boxes.get('well-south-upper-parapet')!.position[2] - boxes.get('well-south-upper-parapet')!.size[2]) - (finalBridge.position[2] + finalBridge.size[2])).toBeLessThanOrEqual(0)

    const playerLane = boxes.get('well-player-crossing')!
    const echoLane = boxes.get('well-transfer-ledge')!
    expect((echoLane.position[2] - echoLane.size[2]) - (playerLane.position[2] + playerLane.size[2])).toBeGreaterThan(2)
  })
})
