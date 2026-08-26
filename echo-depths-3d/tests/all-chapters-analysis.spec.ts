import { expect, test } from '@playwright/test'
import { readState, startChapter } from './runtime-helpers'

test('chapter selection and progress state stay synchronized across all authored chapters', async ({ page }) => {
  test.setTimeout(180_000)
  const expectedEchoTicks = new Map([[1, 12 * 60], [2, 15 * 60], [3, 18 * 60], [4, 18 * 60], [5, 20 * 60]])
  for (const chapter of [1, 2, 3, 4, 5] as const) {
    await startChapter(page, chapter)
    const current = await readState(page)
    expect(current.chapter).toBe(chapter)
    expect(current.mode).toBe('playing')
    expect(current.objectives.required.length).toBeGreaterThan(0)
    expect(current.fixedTick).toBeGreaterThan(0)
    expect(current.echo.maxTicks).toBe(expectedEchoTicks.get(chapter))
  }
})
