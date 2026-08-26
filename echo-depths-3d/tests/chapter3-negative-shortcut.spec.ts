import { expect, test } from '@playwright/test'
import {
  advanceTicks,
  holdKey,
  moveAxisPrecise as moveAxis,
  pressKey,
  readState,
  rotateCameraCardinal,
  startChapter,
} from './runtime-helpers'

async function pickUpCore(page: Parameters<typeof startChapter>[0]): Promise<void> {
  await rotateCameraCardinal(page)
  await moveAxis(page, 'z', 2.45, 'reach the Core lane')
  await moveAxis(page, 'x', -6.2, 'reach the Core')
  await pressKey(page, 'e')
  await expect.poll(async () => (await readState(page)).cores['memory-core']?.carriedBy).toBe('player')
}

test.describe('Chapter 3 physical shortcut rejection', () => {
  test('a carried Core cannot use the player-only south gate', async ({ page }) => {
    test.setTimeout(180_000)
    await startChapter(page, 3)
    await pickUpCore(page)
    await moveAxis(page, 'x', -1.7, 'approach the west south-route turn')
    await moveAxis(page, 'z', -2.45, 'enter the player route with the Core')
    await holdKey(page, 'd', 120)
    const current = await readState(page)
    expect(current.cores['memory-core']?.carriedBy).toBeUndefined()
    expect(current.cores['memory-core']?.position.x ?? 99).toBeLessThan(1.0)
    expect(current.objectives.facts).not.toContain('receiver-filled')
  })

  test('the north transfer shutter blocks a throw until the live Player is east', async ({ page }) => {
    await startChapter(page, 3)
    await pickUpCore(page)
    await moveAxis(page, 'x', 0.0, 'reach the closed north shutter')
    const closed = await readState(page)
    expect(closed.barriers?.['transfer-shutter']?.open).toBe(false)
    await holdKey(page, 'd', 1)
    await pressKey(page, 'k')
    await advanceTicks(page, 60)
    const stopped = await readState(page)
    const shutterX = stopped.barriers?.['transfer-shutter']?.position.x ?? 1.45
    expect(stopped.cores['memory-core']?.position.x ?? 99).toBeLessThan(shutterX + 0.6)
    expect(stopped.objectives.facts).not.toContain('receiver-filled')
  })

  test('the solid center divider cannot be bypassed with jump and dash', async ({ page }) => {
    await startChapter(page, 3)
    await rotateCameraCardinal(page)
    await moveAxis(page, 'z', 0, 'line up the center divider')
    await moveAxis(page, 'x', 0.7, 'approach the center divider')
    await page.keyboard.down('d')
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page.keyboard.down('Space')
      await page.keyboard.down('Shift')
      await advanceTicks(page, 10)
      await page.keyboard.up('Shift')
      await page.keyboard.up('Space')
    }
    await page.keyboard.up('d')
    const result = await readState(page)
    expect(result.failureReason === 'fall' || (result.player?.position.x ?? 99) < 1.2).toBe(true)
  })

  test('the south passage remains one-way after the Player reaches east', async ({ page }) => {
    await startChapter(page, 3)
    await rotateCameraCardinal(page)
    await moveAxis(page, 'z', -2.45, 'line up the player-only passage')
    await moveAxis(page, 'x', 3.2, 'cross west to east')
    await holdKey(page, 'a', 120)
    const blocked = await readState(page)
    expect(blocked.player?.position.x ?? 0).toBeGreaterThan(2.1)
  })

  test('using the receiver without the same Core cannot complete the chapter', async ({ page }) => {
    await startChapter(page, 3)
    await rotateCameraCardinal(page)
    await moveAxis(page, 'z', -2.45, 'take the player-only passage')
    await moveAxis(page, 'x', 3.2, 'reach east')
    await moveAxis(page, 'z', 0.25, 'approach the empty receiver')
    await moveAxis(page, 'x', 8.0, 'stand at the empty receiver')
    await pressKey(page, 'e')
    const current = await readState(page)
    expect(current.objectives.facts).not.toContain('receiver-filled')
    expect(current.mode).toBe('playing')
    expect(Object.keys(current.cores)).toEqual(['memory-core'])
  })
})
