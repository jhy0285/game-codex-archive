import { expect, test } from '@playwright/test'
import { advanceTicks, holdKey, moveAxis, pressKey, readState, rotateCameraCardinal, startChapter, waitForState } from './runtime-helpers'

test.describe('Chapter 3 recording lifecycle', () => {
  test('a second real keyboard recording replaces the first Echo tape', async ({ page }) => {
    test.setTimeout(180_000)
    await startChapter(page, 3)
    await rotateCameraCardinal(page)
    await pressKey(page, 'r')
    await holdKey(page, 'd', 24)
    await pressKey(page, 'r')
    await expect.poll(async () => (await readState(page)).echoesCreated).toBe(1)
    await waitForState(page, (current) => current.echo.mode === 'holding' || current.echo.mode === 'idle', 240, 'first Echo did not finish')

    const before = await readState(page)
    await pressKey(page, 'r')
    await holdKey(page, 'a', 18)
    await pressKey(page, 'r')
    await expect.poll(async () => (await readState(page)).echoesCreated).toBe(2)
    const replaced = await readState(page)
    expect(replaced.echoesCreated).toBeGreaterThan(before.echoesCreated ?? 0)
    expect(replaced.objectives.facts).not.toContain('temporal-gate-rejected')
  })

  test('recording rewind preserves the live Player and canonical Core object', async ({ page }) => {
    test.setTimeout(180_000)
    await startChapter(page, 3)
    await rotateCameraCardinal(page)
    await pressKey(page, 'r')
    await moveAxis(page, 'z', 2.45, 'reach the rewound Core lane')
    await moveAxis(page, 'x', -6.2, 'reach the rewound Core')
    await pressKey(page, 'e')
    const held = await readState(page)
    expect(held.cores['memory-core']?.carriedBy).toBe('player')
    await holdKey(page, 'a', 12)
    await pressKey(page, 'r')
    const rewound = await waitForState(page, (current) => current.echo.mode === 'replaying' || current.echo.mode === 'holding', 180, 'Echo did not replay the recording')
    expect(rewound.cores['memory-core']).toBeDefined()
    expect(rewound.cores['memory-core']?.position).toBeDefined()
  })
})
