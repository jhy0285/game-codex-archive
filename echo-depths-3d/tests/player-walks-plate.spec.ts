import { expect, test } from '@playwright/test'
import { moveAxis, pressKey, readState, rotateCameraCardinal, startChapter, waitForState } from './runtime-helpers'

test('Player keyboard path reaches the real Chapter 1 lever and Echo pressure plate', async ({ page }) => {
  test.setTimeout(180_000)
  await startChapter(page, 1)
  await rotateCameraCardinal(page)
  await pressKey(page, 'r')
  await moveAxis(page, 'z', 0.4, 'reach the lever')
  await moveAxis(page, 'x', -3.9, 'align with the lever')
  await pressKey(page, 'e')
  await moveAxis(page, 'z', 3.2, 'walk to the plate')
  await moveAxis(page, 'x', -0.9, 'stand on the plate')
  await pressKey(page, 'r')
  const plate = await waitForState(page, (current) => current.pressurePlates?.['echo-plate']?.active === true, 600, 'Echo did not reach the plate')
  expect(plate.objectives.facts).toContain('echo-plate')
  expect((await readState(page)).echo.mode).toMatch(/replaying|holding|idle/)
})
