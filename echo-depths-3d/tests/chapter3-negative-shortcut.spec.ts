import { expect, test } from '@playwright/test'
import { advanceTicks, holdKey, moveAxis, pressKey, readState, rotateCameraCardinal, startChapter, waitForState } from './runtime-helpers'

async function recordPlayerCore(page: Parameters<typeof startChapter>[0]): Promise<void> {
  await rotateCameraCardinal(page)
  await pressKey(page, 'r')
  await holdKey(page, 'd', 54)
  await pressKey(page, 'e')
  await expect.poll(async () => (await readState(page)).cores['memory-core']?.carriedBy).toBe('player')
}

test.describe('Chapter 3 independent negative runtime contracts', () => {
  test('A — direct Player receiver interaction cannot fill without the Core', async ({ page }) => {
    test.setTimeout(150_000)
    await startChapter(page, 3)
    await rotateCameraCardinal(page)
    await moveAxis(page, 'z', 1.6, 'reach receiver lane')
    try { await moveAxis(page, 'x', 6.6, 'walk toward receiver without Echo', 1_200) } catch { /* divider is the negative result */ }
    await pressKey(page, 'e')
    expect((await readState(page)).objectives.facts).not.toContain('receiver-filled')
  })

  test('B — carried Core cannot use the Player one-way route', async ({ page }) => {
    test.setTimeout(150_000)
    await startChapter(page, 3)
    await recordPlayerCore(page)
    await moveAxis(page, 'z', -2, 'approach the Player route while carrying')
    await moveAxis(page, 'x', 0.5, 'push carried Core into the physical gate')
    await advanceTicks(page, 20)
    const current = await readState(page)
    expect(current.cores['memory-core']?.position.x ?? 99).toBeLessThan(0.5)
    expect(current.objectives.facts).not.toContain('temporal-gate-rejected')
  })

  test('C — thrown Core is stopped by the temporal gate collider', async ({ page }) => {
    test.setTimeout(150_000)
    await startChapter(page, 3)
    await recordPlayerCore(page)
    await moveAxis(page, 'z', -2.3, 'enter the Player route')
    await moveAxis(page, 'x', -0.8, 'reach west throw point')
    await holdKey(page, 'd', 1)
    await pressKey(page, 'k')
    await advanceTicks(page, 30)
    const core = (await readState(page)).cores['memory-core']
    expect(core?.position.x ?? 99).toBeLessThan(3.6)
  })

  test('D — a second thrown attempt cannot bypass the gate', async ({ page }) => {
    test.setTimeout(150_000)
    await startChapter(page, 3)
    await recordPlayerCore(page)
    await moveAxis(page, 'z', -2.3, 'enter the Player route')
    await moveAxis(page, 'x', -0.8, 'reach west throw point')
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await holdKey(page, 'd', 1)
      await pressKey(page, 'k')
      await advanceTicks(page, 20)
    }
    expect((await readState(page)).cores['memory-core']?.position.x ?? 99).toBeLessThan(4)
  })

  test('E — divider edge movement does not bypass the authored crossings', async ({ page }) => {
    test.setTimeout(150_000)
    await startChapter(page, 3)
    await rotateCameraCardinal(page)
    await moveAxis(page, 'z', -0.2, 'line up divider edge')
    try { await moveAxis(page, 'x', 5.0, 'attempt edge bypass', 900) } catch { /* the wall stopped the attempt */ }
    const current = await readState(page)
    expect(current.player?.position.x ?? 99).toBeLessThan(6)
  })

  test('F — jump and dash inputs do not cross the closed Player wall', async ({ page }) => {
    test.setTimeout(150_000)
    await startChapter(page, 3)
    await rotateCameraCardinal(page)
    await page.keyboard.down('d')
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page.keyboard.down('Space')
      await page.keyboard.down('Shift')
      await advanceTicks(page, 10)
      await page.keyboard.up('Shift')
      await page.keyboard.up('Space')
    }
    await page.keyboard.up('d')
    expect((await readState(page)).player?.position.x ?? 99).toBeLessThan(3.6)
  })

  test('G — closed shutter blocks a Core from entering the transfer lane', async ({ page }) => {
    test.setTimeout(150_000)
    await startChapter(page, 3)
    await recordPlayerCore(page)
    await moveAxis(page, 'z', -2.3, 'enter the Player route')
    await moveAxis(page, 'x', -0.8, 'reach shutter throw point')
    await holdKey(page, 'd', 1)
    await pressKey(page, 'k')
    await advanceTicks(page, 40)
    const current = await readState(page)
    expect(current.barriers?.['transfer-shutter']?.open).toBe(false)
  })

  test('H — open shutter allows the Echo throw to use the same Core', async ({ page }) => {
    test.setTimeout(180_000)
    await startChapter(page, 3)
    await recordPlayerCore(page)
    await moveAxis(page, 'z', 1.6, 'enter transfer lane')
    await moveAxis(page, 'x', -0.8, 'reach west throw point')
    await holdKey(page, 'd', 1)
    await pressKey(page, 'k')
    await moveAxis(page, 'z', -2.3, 'line up the Player route')
    try { await moveAxis(page, 'x', 4.4, 'cross Player route') } catch { /* divider remains physical */ }
    await pressKey(page, 'r')
    await waitForState(page, (current) => current.barriers?.['transfer-shutter']?.open === true, 240, 'shutter did not open for the live Player')
    expect((await readState(page)).cores['memory-core']).toBeDefined()
  })

  test('I — Player interference leaves Echo unable to duplicate the Core', async ({ page }) => {
    test.setTimeout(180_000)
    await startChapter(page, 3)
    await rotateCameraCardinal(page)
    await pressKey(page, 'r')
    await holdKey(page, 'd', 54)
    await pressKey(page, 'e')
    await holdKey(page, 'a', 18)
    await pressKey(page, 'r')
    await advanceTicks(page, 120)
    const current = await readState(page)
    expect(Object.keys(current.cores)).toEqual(['memory-core'])
  })

  test('J — Echo pickup keeps one canonical Core record', async ({ page }) => {
    test.setTimeout(180_000)
    await startChapter(page, 3)
    await recordPlayerCore(page)
    await pressKey(page, 'r')
    await waitForState(page, (current) => current.echo.tick >= 59, 180, 'Echo did not reach recorded pickup')
    expect(Object.keys((await readState(page)).cores)).toEqual(['memory-core'])
  })

  test('K — a new real recording replaces the previous Echo tape', async ({ page }) => {
    test.setTimeout(180_000)
    await startChapter(page, 3)
    await rotateCameraCardinal(page)
    await pressKey(page, 'r')
    await holdKey(page, 'd', 18)
    await pressKey(page, 'r')
    await expect.poll(async () => (await readState(page)).echoesCreated).toBe(1)
    await pressKey(page, 'r')
    await holdKey(page, 'a', 18)
    await pressKey(page, 'r')
    await expect.poll(async () => (await readState(page)).echoesCreated).toBe(2)
  })
})
