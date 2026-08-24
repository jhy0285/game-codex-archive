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

async function jumpWithKeys(page: Page, keys: readonly string[], ticks = 22): Promise<void> {
  for (const key of keys) await page.keyboard.down(key)
  await page.keyboard.down('Space')
  await advanceTicks(page, ticks)
  await page.keyboard.up('Space')
  for (const key of keys) await page.keyboard.up(key)
  await advanceTicks(page, 4)
}

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
  test('Chapter 4 completes through real Echo attention, rear height strike, trap, door, and exit', async ({ page }, testInfo) => {
    test.setTimeout(300_000)
    await startChapter(page, 4)
    await rotateCameraCardinal(page)

    // The tape contains only ordinary movement and E/R actions. The Echo rings
    // the physical bell, then finishes where the Watcher can really see it.
    await pressKey(page, 'r')
    await moveAxis(page, 'z', 0.5, 'take the covered gallery approach')
    await moveAxis(page, 'x', -3.45, 'reach the west side of gallery cover')
    await moveAxis(page, 'z', 2.5, 'round the north edge of gallery cover')
    await moveAxis(page, 'z', 3.1, 'reach the gallery bell lane')
    await moveAxis(page, 'x', -0.8, 'reach the gallery bell')
    await pressKey(page, 'e')
    await pressKey(page, 'r')

    // The present Player breaks sight behind authored cover while the replay
    // becomes the Watcher's visible target.
    await moveAxis(page, 'x', -3.45, 'reach gallery cover')
    await moveAxis(page, 'z', 1.0, 'settle behind gallery cover')
    const distracted = await waitForState(
      page,
      (current) => current.enemies?.watcher?.target === 'echo'
        && current.enemies.watcher.targetVisible === true,
      480,
      'Watcher never acquired the real Echo',
    )
    expect(distracted.objectives.facts).toContain('lured-by-echo')

    // Take the real stair/ledge route to the rear high flank.
    await moveAxis(page, 'z', -3.0, 'reach the gallery flank stairs', 900)
    await moveAxis(page, 'x', 0.15, 'step onto the first flank stair', 900)
    await jumpWithKeys(page, ['d'], 22)
    await jumpWithKeys(page, ['d'], 22)
    await jumpWithKeys(page, ['d'], 28)
    await waitForState(
      page,
      (current) => (current.player?.position.y ?? 0) > 2.8,
      240,
      'Player did not reach the upper flank',
    )
    await moveAxis(page, 'x', 2.9, 'align the high rear strike')
    await moveAxis(page, 'z', -1.2, 'approach the high rear strike')

    const beforeStrike = await readState(page)
    const watcher = beforeStrike.enemies?.watcher
    const player = beforeStrike.player
    if (!watcher || !player) throw new Error(`strike actors unavailable: ${JSON.stringify(beforeStrike)}`)
    expect(watcher.target).toBe('echo')
    expect(watcher.targetVisible).toBe(true)
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
    await moveAxis(page, 'x', 8.35, 'cross the neutralized gallery', 1_800)
    await moveAxis(page, 'z', -1.8, 'line up the gallery exit')
    await pressKey(page, 'e')
    const complete = await waitForState(page, (current) => current.mode === 'chapter-complete', 90, 'Chapter 4 did not complete')
    expect(complete.objectives.required).toEqual(['watcher-trapped'])
    expect(complete.objectives.complete).toBe(true)
  })

  test('Chapter 5 completes with one real Core, Guardian attention switch, live seals, and exit', async ({ page }, testInfo) => {
    test.setTimeout(360_000)
    await startChapter(page, 5)
    await rotateCameraCardinal(page)

    // Tape one uses the same physical Core: pickup, carry up the real ramp,
    // then a westward throw into the lower receiver.
    await pressKey(page, 'r')
    await moveAxis(page, 'z', 2.0, 'reach the Paradox Core lane')
    await moveAxis(page, 'x', -5.7, 'reach the Paradox Core')
    await pressKey(page, 'e')
    await expect.poll(async () => (await readState(page)).cores['paradox-core']?.carriedBy).toBe('player')
    await moveAxis(page, 'z', -0.8, 'carry the Core to the ramp')
    await moveAxis(page, 'x', -1.0, 'carry the Core up the real ramp', 1_200)
    await waitForState(page, (current) => (current.player?.position.y ?? 0) > 3.3, 180, 'Player did not crest the Core ramp')
    await holdKey(page, 'a', 1)
    await pressKey(page, 'k')
    await pressKey(page, 'r')

    const received = await waitForState(
      page,
      (current) => current.cores['paradox-core']?.receiver === true,
      600,
      'Echo did not deliver the same real Core to the receiver',
    )
    expect(received.cores['paradox-core']?.carriedBy).toBeUndefined()
    expect(received.objectives.facts).toEqual(expect.arrayContaining(['core-thrown-down', 'core-receiver']))
    expect(Object.keys(received.cores)).toEqual(['paradox-core'])

    // Tape two walks the present Player down the same traversable ramp and
    // finishes on the lower physical seal. Its Echo will hold that occupancy.
    await pressKey(page, 'r')
    await moveAxis(page, 'x', -5.7, 'descend the well ramp', 1_200)
    await moveAxis(page, 'z', 3.6, 'reach the lower seal lane')
    await moveAxis(page, 'x', -3.1, 'finish the lower seal route')
    await pressKey(page, 'r')

    const lowerHeld = await waitForState(
      page,
      (current) => current.pressurePlates?.['lower-seal']?.active === true
        && current.pressurePlates['lower-seal']?.actor === 'echo',
      720,
      'Echo did not occupy the live lower seal',
    )
    expect(lowerHeld.objectives.facts).toContain('lower-seal-echo')

    // Present time climbs back to the powered moving platform and reaches the
    // authored high flank while the Guardian must truly see the Echo.
    await moveAxis(page, 'x', -5.7, 'return to the west ramp approach')
    await moveAxis(page, 'z', -0.8, 'return to the powered ramp')
    await moveAxis(page, 'x', -0.9, 'climb back to the middle floor', 1_200)
    await waitForState(page, (current) => (current.player?.position.y ?? 0) > 3.3, 180, 'Player did not return to the middle floor')
    await moveAxis(page, 'z', -1.8, 'line up the moving platform')
    await moveAxis(page, 'x', 2.55, 'wait beside the moving platform dock')
    await waitForState(
      page,
      (current) => (current.elevators?.['well-platform']?.y ?? 99) < 2.9,
      480,
      'moving platform did not return to its dock',
    )
    await moveAxis(page, 'x', 3.05, 'board the docked moving platform', 180)
    await waitForState(
      page,
      (current) => (current.elevators?.['well-platform']?.y ?? 0) > 4.45
        && (current.player?.position.y ?? 0) > 5.0,
      1_200,
      'powered platform did not carry the Player to the upper floor',
    )
    await jumpWithKeys(page, ['d'], 20)
    await moveAxis(page, 'x', 5.4, 'step onto the upper floor')
    await moveAxis(page, 'z', 1.35, 'approach the Guardian flank from cover')
    await moveAxis(page, 'x', 3.0, 'take the authored high Guardian flank')
    await moveAxis(page, 'z', 1.8, 'close on the rear edge of the Guardian flank')
    await moveAxis(page, 'x', 2.25, 'enter the Guardian strike range')

    const distractedGuardian = await waitForState(
      page,
      (current) => current.enemies?.guardian?.target === 'echo'
        && current.enemies.guardian.targetVisible === true,
      480,
      'Guardian never switched to the visible Echo',
    )
    const guardian = distractedGuardian.enemies?.guardian
    const upperPlayer = distractedGuardian.player
    if (!guardian || !upperPlayer) throw new Error(`Guardian strike actors unavailable: ${JSON.stringify(distractedGuardian)}`)
    await faceHorizontalTarget(page, upperPlayer.position, guardian.position)
    await pressKey(page, 'j')
    await waitForState(
      page,
      (current) => current.enemies?.guardian?.defeated === true
        && current.objectives.facts.includes('guardian-defeated'),
      90,
      'high rear Guardian strike did not break the seal',
    )

    // Only simultaneous live lower occupancy and upper E-hold release the door.
    await jumpWithKeys(page, ['d'], 20)
    await moveAxis(page, 'x', 5.2, 'leave the Guardian flank')
    await moveAxis(page, 'z', -1.7, 'reach the upper seal lane')
    await moveAxis(page, 'x', 6.2, 'reach the upper seal')
    await holdKey(page, 'e', 30)
    const released = await waitForState(
      page,
      (current) => current.doors?.['final-door']?.open === true
        && current.objectives.facts.includes('final-door-opened'),
      120,
      'live dual seal did not release the final door',
    )
    expect(released.escapeSeconds).toBeGreaterThan(0)
    await attachSuccessScreenshot(page, testInfo, 'chapter-5-desktop-final-door')
    await moveAxis(page, 'z', 0.3, 'line up the final passage')
    await moveAxis(page, 'x', 8.85, 'cross the final passage')
    await pressKey(page, 'e')
    const complete = await waitForState(page, (current) => current.mode === 'chapter-complete', 90, 'Chapter 5 did not complete')
    expect(complete.objectives.required).toEqual(['core-receiver', 'guardian-defeated', 'final-door-opened'])
    expect(complete.objectives.complete).toBe(true)
  })
})
