import { expect, test, type TestInfo } from '@playwright/test'
import {
  advanceTicks,
  moveAxisPrecise as moveAxis,
  pressKey,
  readState,
  rotateCameraCardinal,
  startChapter,
  waitForState,
} from './runtime-helpers'

async function attachSuccessScreenshot(
  page: Parameters<typeof startChapter>[0],
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  const outputDir = process.env.ECHO_DEPTHS_SCREENSHOT_DIR
  const body = await page.screenshot(outputDir ? { path: `${outputDir}/${name}.png` } : {})
  await testInfo.attach(name, { body, contentType: 'image/png' })
}

test('Chapter 3 completes through the flat two-route Core transfer', async ({ page }, testInfo) => {
  test.setTimeout(300_000)
  await startChapter(page, 3)
  await attachSuccessScreenshot(page, testInfo, 'chapter-3-desktop-start-overview')
  await rotateCameraCardinal(page)

  // Record the north Core lane, then finish the same tape after crossing south.
  await pressKey(page, 'r')
  await moveAxis(page, 'z', 2.45, 'reach the Memory Core lane')
  await moveAxis(page, 'x', -6.2, 'reach the Memory Core')
  await pressKey(page, 'e')
  await expect.poll(async () => (await readState(page)).cores['memory-core']?.carriedBy).toBe('player')
  await moveAxis(page, 'x', 0.0, 'carry the Core to the north transfer ledge')
  await page.keyboard.down('d')
  await pressKey(page, 'k')
  await page.keyboard.up('d')
  await moveAxis(page, 'x', -1.7, 'return to the west room')
  await moveAxis(page, 'z', -2.45, 'take the flat south player route')
  await advanceTicks(page, 30)
  await moveAxis(page, 'x', 3.2, 'cross the player-only one-way passage')
  await pressKey(page, 'r')

  const open = await waitForState(
    page,
    (current) => current.barriers?.['transfer-shutter']?.open === true,
    120,
    'the east Player did not open the north Core shutter',
  )
  expect(open.player?.position.x).toBeGreaterThan(2.7)
  expect(open.objectives.facts).not.toContain('receiver-filled')
  await attachSuccessScreenshot(page, testInfo, 'chapter-3-desktop-shutter-open')

  const echoPickup = await waitForState(
    page,
    (current) => current.cores['memory-core']?.carriedBy === 'echo',
    240,
    'the Echo did not pick up the same rewound Core',
  )
  expect(Object.keys(echoPickup.cores)).toEqual(['memory-core'])

  const landed = await waitForState(
    page,
    (current) => current.echo.mode === 'holding'
      && current.cores['memory-core']?.carriedBy === undefined
      && (current.cores['memory-core']?.position.x ?? 0) > 2.7,
    900,
    'the Echo throw did not land in the east basin',
  )
  expect(landed.cores['memory-core']?.receiver).toBe(false)
  await attachSuccessScreenshot(page, testInfo, 'chapter-3-desktop-transfer')

  const core = landed.cores['memory-core']!
  await moveAxis(page, 'x', core.position.x, 'line up with the catch-basin entrance')
  await moveAxis(page, 'z', core.position.z, 'reach the same landed Core')
  await pressKey(page, 'e')
  await expect.poll(async () => (await readState(page)).cores['memory-core']?.carriedBy).toBe('player')
  await moveAxis(page, 'z', 0.25, 'carry the Core to the receiver lane')
  await moveAxis(page, 'x', 7.1, 'carry the Core beside the east receiver')
  await pressKey(page, 'e')

  const powered = await waitForState(
    page,
    (current) => current.objectives.facts.includes('receiver-filled'),
    180,
    'the physical receiver did not accept the same Core',
  )
  expect(powered.objectives.required).toEqual(['receiver-filled'])
  expect(Object.keys(powered.cores)).toEqual(['memory-core'])
  await attachSuccessScreenshot(page, testInfo, 'chapter-3-desktop-receiver-powered')

  await moveAxis(page, 'z', -2.2, 'line up the open exit')
  await moveAxis(page, 'x', 9.4, 'reach the east exit')
  await pressKey(page, 'e')
  const complete = await waitForState(
    page,
    (current) => current.mode === 'chapter-complete',
    90,
    'Chapter 3 did not complete',
  )
  expect(complete.objectives.complete).toBe(true)
})
