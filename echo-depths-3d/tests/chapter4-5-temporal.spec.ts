import { expect, test, type Page, type TestInfo } from '@playwright/test'
import {
  advanceTicks,
  holdKey,
  moveAxisPrecise as moveAxis,
  pressKey,
  readState,
  rotateCameraCardinal,
  startChapter,
  waitForState,
} from './runtime-helpers'

async function faceHorizontalTarget(
  page: Page,
  from: { x: number; z: number },
  to: { x: number; z: number },
): Promise<void> {
  const keys: string[] = []
  if (to.x < from.x - 0.1) keys.push('a')
  if (to.x > from.x + 0.1) keys.push('d')
  if (to.z < from.z - 0.1) keys.push('w')
  if (to.z > from.z + 0.1) keys.push('s')
  for (const key of keys) await page.keyboard.down(key)
  await advanceTicks(page, 1)
  for (const key of keys) await page.keyboard.up(key)
  await advanceTicks(page, 1)
}

async function attachSuccessScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const outputDir = process.env.ECHO_DEPTHS_SCREENSHOT_DIR
  const body = await page.screenshot(outputDir ? { path: `${outputDir}/${name}.png` } : {})
  await testInfo.attach(name, { body, contentType: 'image/png' })
}

test.describe('Chapters 4 and 5 temporal mastery', () => {
  test('Chapter 4 completes through the bell, cover, walkable ramp, high rear strike, and trap', async ({ page }, testInfo) => {
    test.setTimeout(360_000)
    await startChapter(page, 4)
    await attachSuccessScreenshot(page, testInfo, 'chapter-4-desktop-start-overview')
    await rotateCameraCardinal(page)

    await pressKey(page, 'r')
    await moveAxis(page, 'x', -1.9, 'record the safe bell route')
    await moveAxis(page, 'z', 3.0, 'stand at the lure bell')
    await pressKey(page, 'e')
    await pressKey(page, 'r')

    await moveAxis(page, 'x', -4.6, 'return behind the west cover')
    await moveAxis(page, 'z', 0.0, 'break the present Player sight line')
    const distracted = await waitForState(
      page,
      (current) => current.enemies?.watcher?.target === 'echo'
        && current.enemies.watcher.targetVisible === true,
      480,
      'the Watcher never acquired the real bell Echo',
    )
    expect(distracted.objectives.facts).toContain('lured-by-echo')
    await attachSuccessScreenshot(page, testInfo, 'chapter-4-desktop-cover-and-watcher')

    // No Space input: the common motor walks up the authored ramp.
    await moveAxis(page, 'z', -3.05, 'reach the low end of the gallery ramp')
    await advanceTicks(page, 20)
    await moveAxis(page, 'x', 2.8, 'walk up the gallery ramp', 1_200)
    await waitForState(
      page,
      (current) => (current.player?.position.y ?? 0) > 2.6,
      180,
      'the Player did not walk onto the high rear flank',
    )
    await moveAxis(page, 'z', -1.7, 'approach the Watcher from the high rear edge')

    const beforeStrike = await readState(page)
    const watcher = beforeStrike.enemies?.watcher
    const player = beforeStrike.player
    if (!watcher || !player) throw new Error(`strike actors unavailable: ${JSON.stringify(beforeStrike)}`)
    expect(watcher.target).toBe('echo')
    await attachSuccessScreenshot(page, testInfo, 'chapter-4-desktop-high-flank')
    await faceHorizontalTarget(page, player.position, watcher.position)
    await pressKey(page, 'j')

    const neutralized = await waitForState(
      page,
      (current) => current.enemies?.watcher?.defeated === true
        && current.objectives.facts.includes('watcher-trapped'),
      240,
      'physical knockback did not put the Watcher in the trap',
    )
    expect(neutralized.doors?.['gallery-door']?.open).toBe(true)
    await attachSuccessScreenshot(page, testInfo, 'chapter-4-desktop-neutralized')

    await moveAxis(page, 'z', -3.05, 'return to the walkable ramp')
    await moveAxis(page, 'x', -4.6, 'walk down from the high flank', 1_200)
    await waitForState(page, (current) => (current.player?.position.y ?? 99) < 1.5, 180, 'the Player did not descend the ramp')
    await moveAxis(page, 'z', -2.55, 'line up the gallery exit')
    await moveAxis(page, 'x', 8.35, 'cross the neutralized corridor', 1_800)
    await pressKey(page, 'e')
    const complete = await waitForState(page, (current) => current.mode === 'chapter-complete', 90, 'Chapter 4 did not complete')
    expect(complete.objectives.required).toEqual(['watcher-trapped'])
  })

  test('Chapter 5 completes with one recording, one Core, one platform, Guardian attention, and live seals', async ({ page }, testInfo) => {
    test.setTimeout(600_000)
    await startChapter(page, 5)
    await attachSuccessScreenshot(page, testInfo, 'chapter-5-desktop-start-overview')
    await rotateCameraCardinal(page)

    // One tape performs both past duties: transfer the Core, then hold lower seal.
    await pressKey(page, 'r')
    await moveAxis(page, 'z', 2.55, 'reach the Paradox Core lane')
    await moveAxis(page, 'x', -6.2, 'reach the Paradox Core')
    await pressKey(page, 'e')
    await expect.poll(async () => (await readState(page)).cores['paradox-core']?.carriedBy).toBe('player')
    await moveAxis(page, 'x', 0.0, 'carry the Core to the north transfer ledge')
    await page.keyboard.down('d')
    await pressKey(page, 'k')
    await page.keyboard.up('d')
    await moveAxis(page, 'x', -1.75, 'return west after the transfer throw')
    await moveAxis(page, 'z', -2.55, 'finish the same recording on the lower seal')
    await pressKey(page, 'r')

    // Present time uses the flat player-only south passage to open the shutter.
    await moveAxis(page, 'x', 3.2, 'cross the south passage and open the Core shutter')
    await waitForState(
      page,
      (current) => current.barriers?.['well-transfer-shutter']?.open === true,
      120,
      'the present Player did not open the Chapter 5 transfer shutter',
    )
    const landed = await waitForState(
      page,
      (current) => current.echo.mode === 'holding'
        && current.pressurePlates?.['lower-seal']?.actor === 'echo'
        && current.cores['paradox-core']?.carriedBy === undefined
        && (current.cores['paradox-core']?.position.x ?? 0) > 2.7,
      720,
      'the one Echo did not transfer the Core and continue to the lower seal',
    )
    expect(Object.keys(landed.cores)).toEqual(['paradox-core'])
    expect(landed.objectives.facts).toContain('lower-seal-echo')
    await attachSuccessScreenshot(page, testInfo, 'chapter-5-desktop-transfer-and-lower-seal')

    const core = landed.cores['paradox-core']!
    await moveAxis(page, 'x', core.position.x, 'line up with the east Core basin')
    await moveAxis(page, 'z', core.position.z, 'pick up the same Core')
    await pressKey(page, 'e')
    await expect.poll(async () => (await readState(page)).cores['paradox-core']?.carriedBy).toBe('player')
    await moveAxis(page, 'z', 0.2, 'carry the Core toward the receiver')
    await moveAxis(page, 'x', 6.4, 'place the Core beside the east receiver')
    await pressKey(page, 'e')
    const received = await waitForState(
      page,
      (current) => current.cores['paradox-core']?.receiver === true,
      180,
      'the same Core did not power the receiver',
    )
    expect(received.objectives.facts).toContain('core-receiver')
    expect(received.objectives.facts).not.toContain('core-thrown-down')
    await attachSuccessScreenshot(page, testInfo, 'chapter-5-desktop-receiver-powered')

    await moveAxis(page, 'z', -2.65, 'reach the powered platform lane')
    await moveAxis(page, 'x', 4.15, 'wait at the single moving platform')
    await waitForState(page, (current) => (current.elevators?.['well-platform']?.y ?? 99) < 0.9, 720, 'the platform did not return low')
    await moveAxis(page, 'x', 4.0, 'step beside the low platform')
    await moveAxis(page, 'x', 4.15, 'board the low platform')
    await waitForState(
      page,
      (current) => (current.elevators?.['well-platform']?.y ?? 0) > 3.0
        && (current.player?.position.y ?? 0) > 3.8,
      1_200,
      'the single powered platform did not carry the Player upstairs',
    )
    await moveAxis(page, 'x', 5.3, 'step directly onto the upper floor')
    await moveAxis(page, 'x', 4.5, 'enter the high Guardian flank')
    await moveAxis(page, 'z', 2.2, 'take the exposed rear side of the Guardian')
    await moveAxis(page, 'x', 2.2, 'enter the Guardian rear strike range')

    const distracted = await waitForState(
      page,
      (current) => current.enemies?.guardian?.target === 'echo'
        && current.enemies.guardian.targetVisible === true,
      600,
      'the Guardian never committed to the lower Echo',
    )
    const guardian = distracted.enemies?.guardian
    const upperPlayer = distracted.player
    if (!guardian || !upperPlayer) throw new Error(`Guardian actors unavailable: ${JSON.stringify(distracted)}`)
    await attachSuccessScreenshot(page, testInfo, 'chapter-5-desktop-upper-flank')
    await faceHorizontalTarget(page, upperPlayer.position, guardian.position)
    await pressKey(page, 'j')
    await waitForState(
      page,
      (current) => current.enemies?.guardian?.defeated === true
        && current.objectives.facts.includes('guardian-defeated'),
      120,
      'the high rear Guardian strike did not break the seal',
    )

    await moveAxis(page, 'x', 6.8, 'walk to the upper seal')
    await moveAxis(page, 'z', -1.25, 'align with the upper seal')
    await holdKey(page, 'e', 30)
    const released = await waitForState(
      page,
      (current) => current.doors?.['final-door']?.open === true
        && current.objectives.facts.includes('final-door-opened'),
      120,
      'the simultaneous live seals did not release the final door',
    )
    expect(released.escapeSeconds).toBeGreaterThan(0)
    await attachSuccessScreenshot(page, testInfo, 'chapter-5-desktop-final-door')

    await moveAxis(page, 'z', 2.65, 'cross the final upper bridge')
    await moveAxis(page, 'x', 8.25, 'reach the final exit')
    await pressKey(page, 'e')
    const complete = await waitForState(page, (current) => current.mode === 'chapter-complete', 90, 'Chapter 5 did not complete')
    expect(complete.objectives.required).toEqual(['core-receiver', 'guardian-defeated', 'final-door-opened'])
  })
})
