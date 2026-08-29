import { describe, expect, it } from 'vitest'
import { CHAPTERS } from '../game/chapters'
import { CHAPTER_LAYOUTS, type BoxDefinition, type DeviceDefinition } from './layouts'

const top = (box: BoxDefinition): number => box.position[1] + box.size[1]
const overlap = (a: BoxDefinition, b: BoxDefinition, axis: 0 | 2): number => Math.min(
  a.position[axis] + a.size[axis],
  b.position[axis] + b.size[axis],
) - Math.max(
  a.position[axis] - a.size[axis],
  b.position[axis] - b.size[axis],
)

describe('Chapter 3-5 authored level architecture', () => {
  it('keeps Chapter 3 vertical while separating the player crossing from the Core transfer lane', () => {
    const layout = CHAPTER_LAYOUTS[3]
    const boxes = new Map(layout.boxes.map((box) => [box.id, box]))
    const devices = new Map(layout.devices.map((device) => [device.id, device]))
    const steps = ['descent-step-1', 'descent-step-2', 'descent-step-3'].map((id) => boxes.get(id)!)

    expect([...boxes.keys()]).toEqual(expect.arrayContaining([
      'atrium-upper-west',
      'descent-step-1',
      'descent-step-2',
      'descent-step-3',
      'atrium-lower',
      'atrium-east',
    ]))
    expect(steps.map(top)).toEqual([2, 1, 0.2])
    expect(top(boxes.get('atrium-upper-west')!)).toBeGreaterThan(top(steps[0]!))
    expect(top(steps[2]!)).toBeCloseTo(top(boxes.get('atrium-lower')!))
    expect(overlap(boxes.get('atrium-upper-west')!, steps[0]!, 2)).toBeGreaterThan(0)
    expect(overlap(steps[0]!, steps[1]!, 0)).toBeGreaterThan(0)
    expect(overlap(steps[1]!, steps[2]!, 0)).toBeGreaterThan(0)

    expect(devices.get('atrium-one-way')?.position[2]).toBeLessThan(0)
    expect(devices.get('transfer-shutter')?.position[2]).toBeGreaterThan(0)
    expect(devices.get('transfer-shutter')?.openAtX).toBeGreaterThan(devices.get('atrium-one-way')!.position[0])
    expect(devices.get('memory-core')?.position[1]).toBeGreaterThan(devices.get('core-receiver')!.position[1] + 2)
    expect(devices.get('memory-core')?.position[0]).toBeLessThan(devices.get('transfer-shutter')!.position[0])
    expect(devices.get('core-receiver')?.position[0]).toBeGreaterThan(devices.get('transfer-shutter')!.position[0])
  })

  it('builds Chapter 4 as a covered patrol floor with a readable stair flank', () => {
    const layout = CHAPTER_LAYOUTS[4]
    const boxes = new Map(layout.boxes.map((box) => [box.id, box]))
    const watcher = layout.devices.find((device) => device.id === 'watcher')
    const steps = ['flank-step-a', 'flank-step-b', 'flank-step-c'].map((id) => boxes.get(id)!)

    expect([...boxes.keys()]).toEqual(expect.arrayContaining([
      'gallery-floor',
      'gallery-flank',
      'flank-step-a',
      'flank-step-b',
      'flank-step-c',
      'cover-a',
      'cover-b',
    ]))
    expect(steps.map(top)).toEqual([0.68, 1.13, 1.58])
    expect(top(boxes.get('gallery-floor')!)).toBeLessThan(top(steps[0]!))
    expect(top(steps[2]!)).toBeLessThan(top(boxes.get('gallery-flank')!))
    expect(overlap(steps[0]!, steps[1]!, 0)).toBeGreaterThan(0)
    expect(overlap(steps[1]!, steps[2]!, 0)).toBeGreaterThan(0)
    expect(overlap(steps[2]!, boxes.get('gallery-flank')!, 0)).toBeGreaterThan(0)
    expect(top(boxes.get('gallery-flank')!)).toBeGreaterThan((watcher?.position[1] ?? 0) + 1.3)
    expect(watcher?.to).toBeDefined()
    expect(Math.abs((watcher?.position[0] ?? 0) - (watcher?.to?.[0] ?? 0))).toBeGreaterThanOrEqual(3.5)
  })

  it('uses exactly one powered moving platform and a clear upper route in Chapter 5', () => {
    const layout = CHAPTER_LAYOUTS[5]
    const boxes = new Map(layout.boxes.map((box) => [box.id, box]))
    const devices = new Map(layout.devices.map((device) => [device.id, device]))
    const moving = layout.devices.filter((device) => ['elevator', 'platform', 'bridge'].includes(device.kind))
    const platform = devices.get('well-platform')!
    const mid = boxes.get('well-mid')!
    const upper = boxes.get('well-upper')!
    const flank = boxes.get('guardian-flank')!

    expect(moving.map((device) => device.id)).toEqual(['well-platform'])
    expect(devices.has('well-elevator')).toBe(false)
    expect(top(boxes.get('well-lower')!)).toBeLessThan(top(mid))
    expect(top(mid)).toBeLessThan(top(upper))
    expect(boxes.get('well-ramp')?.rotation?.[2]).toBeGreaterThan(0.5)
    expect(platform.to?.[1]).toBeGreaterThan(platform.position[1] + 2)
    expect((platform.position[0] + platform.size![0]) - (upper.position[0] - upper.size[0])).toBeGreaterThanOrEqual(0.7)
    expect((mid.position[0] + mid.size[0]) - (platform.position[0] - platform.size![0])).toBeGreaterThanOrEqual(2)
    expect(overlap(upper, flank, 0)).toBeGreaterThanOrEqual(0.7)
    expect(top(flank)).toBeGreaterThan(devices.get('guardian')!.position[1] + 1.3)
    expect(layout.decor.some((decor) => decor.id === 'upper-pillar')).toBe(false)
    expect(layout.pillars.filter((pillar) => pillar[1] > 3).every((pillar) => pillar[0] >= 9)).toBe(true)
  })

  it('keeps configuration IDs, spawn points, and exits synchronized with Chapters 3-5 layouts', () => {
    const expectedKinds = (chapterIndex: 3 | 4 | 5): Array<readonly [string, DeviceDefinition['kind']]> => {
      const chapter = CHAPTERS[chapterIndex - 1]!
      return [
        ...chapter.plates.map((item) => [item.id, 'plate'] as const),
        ...chapter.levers.map((item) => [item.id, 'lever'] as const),
        ...chapter.doorIds.map((id) => [id, 'door'] as const),
        ...chapter.elevatorIds.map((id) => [id, 'elevator'] as const),
        ...chapter.platformIds.map((id) => [id, 'platform'] as const),
        ...chapter.bridgeIds.map((id) => [id, 'bridge'] as const),
        ...chapter.trapIds.map((id) => [id, 'trap'] as const),
        ...chapter.crates.map((item) => [item.id, 'crate'] as const),
        ...chapter.cores.map((item) => [item.id, 'core'] as const),
        ...chapter.enemies.map((item) => [item.id, 'enemy'] as const),
      ]
    }

    for (const chapterIndex of [3, 4, 5] as const) {
      const chapter = CHAPTERS[chapterIndex - 1]!
      const layout = CHAPTER_LAYOUTS[chapterIndex]
      const devices = new Map(layout.devices.map((device) => [device.id, device]))
      const exit = devices.get('exit')
      expect([chapter.playerSpawn.x, chapter.playerSpawn.y, chapter.playerSpawn.z]).toEqual(layout.start)
      expect([chapter.exitCenter.x, chapter.exitCenter.y, chapter.exitCenter.z]).toEqual(exit?.position)
      for (const [id, kind] of expectedKinds(chapterIndex)) {
        expect(devices.get(id)?.kind, `${chapter.id} references missing ${kind} ${id}`).toBe(kind)
      }
    }

    expect(CHAPTERS[2]?.mechanics).toContain('echo')
    expect(CHAPTERS[4]?.mechanics).not.toContain('elevator')
  })

  it('removes small resource props that look interactive but have no gameplay role', () => {
    for (const [chapter, id] of [[3, 'west-cog'], [4, 'gallery-log'], [5, 'well-fuel']] as const) {
      expect(CHAPTER_LAYOUTS[chapter].decor.some((decor) => decor.id === id)).toBe(false)
    }
  })
})
