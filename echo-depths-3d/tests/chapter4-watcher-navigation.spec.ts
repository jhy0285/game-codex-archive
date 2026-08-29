import { expect, test } from '@playwright/test'
import { advanceTicks, readState, startChapter } from './runtime-helpers'

test('Chapter 4 Watcher traverses its authored patrol while the Player remains occluded', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`)
  })

  await startChapter(page, 4)

  const trace: Array<{ tick: number; x: number; z: number; state: string; visible: boolean }> = []
  for (let tick = 0; tick <= 180; tick += 12) {
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
    // The patrol reverses within 0.18 units of its x=-1.1 endpoint. Sampling
    // every 12 ticks intentionally accepts the nearest observed fixed-tick pose.
    if (watcher.position.x < -0.82) break
    await advanceTicks(page, 12)
  }

  const final = await readState(page)
  const watcher = final.enemies?.watcher
  expect(watcher, JSON.stringify(trace)).toBeDefined()
  expect(watcher?.target, JSON.stringify(trace)).toBeUndefined()
  expect(watcher?.position.x, JSON.stringify(trace)).toBeLessThan(-0.82)
  expect(watcher?.position.z, JSON.stringify(trace)).toBeCloseTo(-0.4, 2)
  expect(watcher?.state, JSON.stringify(trace)).toBe('patrol')
  expect(browserErrors).toEqual([])
  const screenshotDirectory = process.env.ECHO_DEPTHS_SCREENSHOT_DIR
  const screenshot = await page.screenshot(screenshotDirectory
    ? { path: `${screenshotDirectory}/chapter-4-watcher-patrol.png` }
    : {})
  await testInfo.attach('chapter-4-watcher-patrol', {
    body: screenshot,
    contentType: 'image/png',
  })
})
