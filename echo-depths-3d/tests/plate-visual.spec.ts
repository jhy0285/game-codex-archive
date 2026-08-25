import { expect, test } from '@playwright/test'

test('language, title, controls, and chapter HUD remain visible without debug hooks', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => localStorage.removeItem('echo-depths-language'))
  await page.goto('/')
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function', undefined, { timeout: 180_000 })
  await expect(page.locator('#language-screen')).toBeVisible()
  await expect(page.locator('[data-language="en"]')).toBeVisible()
  await page.locator('[data-language="en"]').click()
  await expect(page.locator('#title-screen')).toBeVisible()
  await expect(page.locator('#start-button')).toBeVisible()
  await page.locator('#start-button').click()
  await expect(page.locator('#tutorial-panel')).toBeVisible()
  await expect(page.locator('#pause-button')).toBeVisible()
  await expect(page.locator('#mobile-controls')).toBeHidden()
})
