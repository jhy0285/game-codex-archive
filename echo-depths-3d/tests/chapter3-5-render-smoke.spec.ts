import { expect, test, type TestInfo } from '@playwright/test'
import { readState, startChapter, type Chapter } from './runtime-helpers'

async function attachOverview(page: Parameters<typeof startChapter>[0], testInfo: TestInfo, chapter: Chapter): Promise<void> {
  const name = `chapter-${chapter}-desktop-start-overview`
  const outputDir = process.env.ECHO_DEPTHS_SCREENSHOT_DIR
  await page.waitForTimeout(350)
  const body = await page.screenshot(outputDir ? { path: `${outputDir}/${name}.png` } : {})
  await testInfo.attach(name, { body, contentType: 'image/png' })
}

test('Chapters 3–5 render without fatal browser errors', async ({ page }, testInfo) => {
  test.setTimeout(240_000)
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText ?? 'unknown error'}`)
  })

  for (const chapter of [3, 4, 5] satisfies Chapter[]) {
    await startChapter(page, chapter)
    const state = await readState(page)
    expect(state.chapter).toBe(chapter)
    expect(state.mode).toBe('playing')
    expect(state.player).not.toBeNull()
    await expect(page.locator('#game-canvas')).toBeVisible()
    await expect(page.locator('#chapter-number')).toContainText(`0${chapter} / 05`)
    await attachOverview(page, testInfo, chapter)
  }

  expect(consoleErrors, `console.error calls:\n${consoleErrors.join('\n')}`).toEqual([])
  expect(pageErrors, `page errors:\n${pageErrors.join('\n')}`).toEqual([])
  expect(failedRequests, `failed requests:\n${failedRequests.join('\n')}`).toEqual([])
})

test.describe('mobile authored start framing', () => {
  test.use({ hasTouch: true, viewport: { width: 932, height: 430 } })

  test('Chapters 4–5 show their landmarks and controls in landscape', async ({ page }, testInfo) => {
    test.setTimeout(180_000)
    for (const chapter of [4, 5] satisfies Chapter[]) {
      await startChapter(page, chapter)
      expect((await readState(page)).mobileControlsVisible).toBe(true)
      const name = `chapter-${chapter}-mobile-start-overview`
      const outputDir = process.env.ECHO_DEPTHS_SCREENSHOT_DIR
      await page.waitForTimeout(350)
      const body = await page.screenshot(outputDir ? { path: `${outputDir}/${name}.png` } : {})
      await testInfo.attach(name, { body, contentType: 'image/png' })
    }
  })
})
