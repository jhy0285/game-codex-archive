import { expect, test } from '@playwright/test'
import { advanceTicks, moveAxisPrecise as moveAxis, readState, rotateCameraCardinal, startChapter } from './runtime-helpers'

test('Chapter 4 Watcher rounds the center-cover corner during a real Player chase', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`)
  })

  await startChapter(page, 4)
  await rotateCameraCardinal(page)
  await moveAxis(page, 'z', -2.3, 'reach the covered south corner')
  await moveAxis(page, 'x', -5.8, 'stand beyond the center-cover corner')

  const trace: Array<{ tick: number; x: number; z: number; state: string; visible: boolean }> = []
  for (let tick = 0; tick <= 360; tick += 12) {
    const state = await readState(page)
    const watcher = state.enemies?.watcher
    if (!watcher) throw new Error(`Watcher unavailable: ${JSON.stringify(state)}`)
    trace.push({
      tick,
      x: watcher.position.x,
      z: watcher.position.z,
      state: watcher.state,
      visible: watcher.targetVisible,
    })
    if (watcher.position.x < -0.9 && watcher.position.z < -1.05) break
    await advanceTicks(page, 12)
  }

  const final = await readState(page)
  const watcher = final.enemies?.watcher
  expect(watcher, JSON.stringify(trace)).toBeDefined()
  expect(watcher?.target, JSON.stringify(trace)).toBe('player')
  expect(watcher?.position.x, JSON.stringify(trace)).toBeLessThan(-0.9)
  expect(watcher?.position.z, JSON.stringify(trace)).toBeLessThan(-1.05)
  expect(browserErrors).toEqual([])
  const screenshotDirectory = process.env.ECHO_DEPTHS_SCREENSHOT_DIR
  const screenshot = await page.screenshot(screenshotDirectory
    ? { path: `${screenshotDirectory}/chapter-4-watcher-rounded-cover.png` }
    : {})
  await testInfo.attach('chapter-4-watcher-rounded-cover', {
    body: screenshot,
    contentType: 'image/png',
  })
})
