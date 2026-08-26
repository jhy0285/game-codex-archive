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
      'gallery-entry',
      'gallery-bell-route',
      'gallery-covered-flank',
      'gallery-patrol',
      'gallery-ramp',
      'gallery-high-flank',
    ]))
    expect([...boxes.keys()].some((id) => id.startsWith('flank-step'))).toBe(false)
    expect(boxes.get('gallery-ramp')?.rotation?.[2]).toBeGreaterThan(0.14)
    expect(boxes.get('gallery-high-flank')?.occluder).toBe(true)
    expect(top(boxes.get('gallery-high-flank')!)).toBeGreaterThan((watcher?.position[1] ?? 0) + 0.9)
    expect(watcher?.to).toBeDefined()
  })

  it('uses one recording topology and exactly one powered moving device in Chapter 5', () => {
    const layout = CHAPTER_LAYOUTS[5]
    const devices = new Map(layout.devices.map((device) => [device.id, device]))
    const moving = layout.devices.filter((device) => ['elevator', 'platform', 'bridge'].includes(device.kind))

    expect(moving.map((device) => device.id)).toEqual(['well-platform'])
    expect(devices.has('well-elevator')).toBe(false)
    expect(devices.get('well-player-gate')?.position[2]).toBeLessThan(0)
    expect(devices.get('well-transfer-shutter')?.position[2]).toBeGreaterThan(0)
    expect(devices.get('well-one-way')?.size?.[1]).toBeGreaterThanOrEqual(3.6)
    expect(devices.get('well-one-way')?.size?.[2]).toBeGreaterThanOrEqual(2.65)
    expect(devices.get('lower-seal')?.position[1]).toBeLessThan(1)
    expect(devices.get('upper-seal')?.position[1]).toBeGreaterThan(3)
    expect(devices.get('guardian')?.to).toBeDefined()
    expect(layout.boxes.find((box) => box.id === 'well-upper')?.occluder).toBe(true)
    expect(layout.boxes.find((box) => box.id === 'well-platform-apron')?.rotation?.[2]).toBeLessThan(0)
  })
})
