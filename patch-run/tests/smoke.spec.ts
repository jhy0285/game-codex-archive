import { expect, test } from '@playwright/test'

interface GameState {
  visualTheme: string
  mode: string
  fullscreen: boolean
  elapsedSeconds: number
  activePatches: string[]
  player: {
    x: number
    y: number
    health: number
    animation: { state: string; frame: number; stateElapsedMs: number }
  }
  presentationClockMs: number
  enemies: Array<{ x: number; y: number; health: number; animation: { state: string; frame: number } | null }>
  recentEnemyDeathAnimation: { active: boolean; frame: number }
  bullets: Array<{ bounced: boolean; damage: number; scale: number }>
  performance: { renderObjects: number; activeBullets: number; activeEnemies: number }
}

async function animationState(page: import('@playwright/test').Page): Promise<GameState> {
  return state(page)
}

test('illustrated actor rigs expose readable motion states and deterministic frames', async ({ page }) => {
  const fatalErrors: string[] = []
  page.on('pageerror', (error) => fatalErrors.push(error.message))
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await page.evaluate(() => window.patchRunDebug?.clearEnemies())
  await page.mouse.move(960, 400)
  await page.evaluate(() => {
    window.patchRunDebug?.setPlayerPosition(480, 324)
    window.patchRunDebug?.setPresentationClock(0)
  })
  await page.waitForTimeout(35)

  const idleA = await animationState(page)
  expect(idleA.player.animation.state).toBe('idle')
  await page.screenshot({ path: 'output/playwright/motion-contact-idle-a.png' })
  await page.evaluate(() => window.patchRunDebug?.setPresentationClock(280))
  await page.waitForTimeout(35)
  const idleB = await animationState(page)
  expect(idleB.player.animation.state).toBe('idle')
  expect(idleB.player.animation.frame).not.toBe(idleA.player.animation.frame)
  await page.evaluate(() => window.patchRunDebug?.setPlayerPosition(480, 324))
  await page.screenshot({ path: 'output/playwright/motion-contact-idle-b.png' })

  await page.evaluate(() => window.patchRunDebug?.setPresentationClock(72))
  await page.keyboard.down('KeyD')
  await expect.poll(async () => (await animationState(page)).player.animation.state).toBe('walk')
  await page.waitForTimeout(35)
  await page.evaluate(() => window.patchRunDebug?.setPlayerPosition(480, 324))
  const walkRight = await animationState(page)
  await page.screenshot({ path: 'output/playwright/motion-walk-right.png' })
  await page.evaluate(() => window.patchRunDebug?.setPresentationClock(216))
  await page.waitForTimeout(35)
  await page.evaluate(() => window.patchRunDebug?.setPlayerPosition(480, 324))
  const walkRightB = await animationState(page)
  expect(walkRightB.player.animation.frame).not.toBe(walkRight.player.animation.frame)
  await page.screenshot({ path: 'output/playwright/motion-contact-walk-b.png' })
  await page.keyboard.up('KeyD')
  const beforeLeft = (await animationState(page)).player.x
  await page.keyboard.down('KeyA')
  await expect.poll(async () => (await animationState(page)).player.animation.state).toBe('walk')
  await page.waitForTimeout(180)
  expect((await animationState(page)).player.x).toBeLessThan(beforeLeft)
  await page.keyboard.up('KeyA')
  const beforeUp = (await animationState(page)).player.y
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(180)
  await page.keyboard.up('KeyW')
  expect((await animationState(page)).player.y).toBeLessThan(beforeUp)
  const beforeDown = (await animationState(page)).player.y
  await page.keyboard.down('KeyS')
  await page.waitForTimeout(180)
  await page.keyboard.up('KeyS')
  expect((await animationState(page)).player.y).toBeGreaterThan(beforeDown)
  await page.evaluate(() => {
    window.patchRunDebug?.setPlayerPosition(480, 324)
    window.patchRunDebug?.setPresentationClock(null)
  })

  const canvasBox = await page.locator('canvas').boundingBox()
  expect(canvasBox).not.toBeNull()
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.82, canvasBox!.y + canvasBox!.height * 0.36)
  await page.mouse.down()
  await expect.poll(async () => (await animationState(page)).player.animation.state).toBe('fire')
  await page.screenshot({ path: 'output/playwright/motion-fire-recoil.png' })
  await page.mouse.up()

  await page.evaluate(() => window.patchRunDebug?.setPlayerPosition(480, 324))
  await page.keyboard.down('Space')
  await page.waitForTimeout(45)
  await expect.poll(async () => ['dash-compress', 'dash-smear', 'dash-recover'])
    .toContain((await animationState(page)).player.animation.state)
  await page.screenshot({ path: 'output/playwright/motion-dash-smear.png' })
  await page.keyboard.up('Space')
  await expect.poll(async () => (await animationState(page)).player.animation.state, { timeout: 1_200 }).toBe('idle')

  await page.evaluate(() => window.patchRunDebug?.hitPlayer())
  await expect.poll(async () => (await animationState(page)).player.animation.state).toBe('hit')
  await page.screenshot({ path: 'output/playwright/motion-player-hit.png' })

  await page.evaluate(() => {
    window.patchRunDebug?.setPlayerPosition(480, 324)
    window.patchRunDebug?.spawnEnemyAt(680, 324)
    window.patchRunDebug?.setPresentationClock(0)
  })
  await expect.poll(async () => (await animationState(page)).enemies[0]?.animation?.state).toBe('emerge')
  await page.screenshot({ path: 'output/playwright/motion-contact-enemy-emerge.png' })
  await page.waitForTimeout(280)
  await page.evaluate(() => {
    window.patchRunDebug?.setNearestEnemyPosition(680, 324)
    window.patchRunDebug?.setPresentationClock(640)
  })
  await expect.poll(async () => (await animationState(page)).enemies[0]?.animation?.state).toBe('skitter')
  const enemyStrideA = (await animationState(page)).enemies[0]!.animation!.frame
  await page.screenshot({ path: 'output/playwright/motion-contact-enemy-skitter-a.png' })
  await page.evaluate(() => {
    window.patchRunDebug?.setNearestEnemyPosition(680, 324)
    window.patchRunDebug?.setPresentationClock(704)
  })
  await page.waitForTimeout(35)
  const enemyStrideB = (await animationState(page)).enemies[0]!.animation!.frame
  expect(enemyStrideB).not.toBe(enemyStrideA)
  await page.screenshot({ path: 'output/playwright/motion-contact-enemy-skitter-b.png' })
  await page.evaluate(() => window.patchRunDebug?.setNearestEnemyPosition(540, 324))
  await expect.poll(async () => (await animationState(page)).enemies[0]?.animation?.state).toBe('anticipate')
  await page.screenshot({ path: 'output/playwright/motion-contact-enemy-anticipate.png' })
  await page.evaluate(() => {
    window.patchRunDebug?.setNearestEnemyPosition(680, 324)
    window.patchRunDebug?.hitNearestEnemy()
  })
  await expect.poll(async () => (await animationState(page)).enemies[0]?.animation?.state).toBe('hit')
  await page.screenshot({ path: 'output/playwright/motion-enemy-hit.png' })
  await page.evaluate(() => window.patchRunDebug?.killNearestEnemy())
  await expect.poll(async () => (await animationState(page)).recentEnemyDeathAnimation.active).toBe(true)
  await page.screenshot({ path: 'output/playwright/motion-enemy-death.png' })

  await page.evaluate(() => window.patchRunDebug?.setPresentationClock(null))
  const finalState = await animationState(page)
  expect(finalState.presentationClockMs).toBeGreaterThan(idleA.presentationClockMs)
  expect(fatalErrors).toEqual([])
})

async function state(page: import('@playwright/test').Page): Promise<GameState> {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? '{}') as GameState)
}

test('loads the arena, applies all patches, and restarts cleanly', async ({ page }) => {
  const fatalErrors: string[] = []
  page.on('pageerror', (error) => fatalErrors.push(error.message))

  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await expect.poll(async () => (await state(page)).mode).toBe('running')
  expect((await state(page)).visualTheme).toBe('overdrive')

  const before = await state(page)
  await page.keyboard.down('KeyD')
  await page.waitForTimeout(180)
  await page.keyboard.up('KeyD')
  await expect.poll(async () => (await state(page)).player.x).toBeGreaterThan(before.player.x)

  await page.keyboard.press('KeyF')
  await expect.poll(async () => (await state(page)).fullscreen).toBe(true)
  await page.keyboard.press('Escape')
  await expect.poll(async () => (await state(page)).fullscreen).toBe(false)

  await page.evaluate(() => window.patchRunDebug?.clearEnemies())
  await page.keyboard.down('Space')
  await page.waitForTimeout(30)
  await page.evaluate(() => window.patchRunDebug?.spawnEnemyNear())
  await page.waitForTimeout(50)
  expect((await state(page)).player.health).toBe(100)
  await page.evaluate(() => window.patchRunDebug?.clearEnemies())
  await page.screenshot({ path: 'output/playwright/dash-feedback.png' })
  await page.keyboard.up('Space')
  await expect.poll(async () => (await state(page)).player.health).toBe(100)
  await page.waitForTimeout(260)

  await page.evaluate(() => window.patchRunDebug?.hitPlayer())
  await page.waitForTimeout(35)
  await expect.poll(async () => (await state(page)).player.health).toBe(84)
  await page.screenshot({ path: 'output/playwright/hit-feedback.png' })

  await page.evaluate(() => window.patchRunDebug?.advanceTo(20_000))
  await page.waitForTimeout(220)
  await page.screenshot({ path: 'output/playwright/patch-notice.png' })

  await page.evaluate(() => window.patchRunDebug?.advanceTo(41_000))
  await expect.poll(async () => (await state(page)).activePatches).toEqual(['RICOCHET', 'GROWTH'])
  await page.waitForTimeout(2_050)
  await page.evaluate(() => window.patchRunDebug?.fireRight())
  await expect.poll(async () => (await state(page)).bullets.some((bullet) => bullet.bounced && bullet.scale > 2), {
    timeout: 3_000,
  }).toBe(true)
  await page.screenshot({ path: 'output/playwright/patch-growth.png' })

  await page.evaluate(() => window.patchRunDebug?.advanceTo(61_000))
  await expect.poll(async () => (await state(page)).activePatches).toEqual([
    'RICOCHET', 'GROWTH', 'FRIENDLY FIRE',
  ])

  await page.waitForTimeout(2_000)
  const idleObjects = (await state(page)).performance.renderObjects
  const canvasBox = await page.locator('canvas').boundingBox()
  expect(canvasBox).not.toBeNull()
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.9, canvasBox!.y + canvasBox!.height * 0.5)
  await page.mouse.down()
  await page.waitForTimeout(1_800)
  const firingState = await state(page)
  await page.mouse.up()
  expect(firingState.performance.activeBullets).toBeGreaterThan(5)
  expect(firingState.performance.renderObjects).toBeLessThanOrEqual(
    idleObjects + firingState.performance.activeBullets + 14,
  )

  await page.evaluate(() => window.patchRunDebug?.forceDeath())
  await expect.poll(async () => (await state(page)).mode).toBe('dead')
  await page.waitForTimeout(250)
  await page.screenshot({ path: 'output/playwright/death.png' })
  await page.keyboard.press('KeyR')
  await expect.poll(async () => (await state(page)).mode).toBe('running')
  const restarted = await state(page)
  expect(restarted.activePatches).toEqual([])
  expect(restarted.player.health).toBe(100)
  expect(restarted.elapsedSeconds).toBeLessThan(2)
  expect(fatalErrors).toEqual([])
})

test('build selector preserves BITSHIFT and returns to the premium build', async ({ page }) => {
  const fatalErrors: string[] = []
  page.on('pageerror', (error) => fatalErrors.push(error.message))

  await page.goto('/pixel')
  await expect(page.locator('canvas')).toBeVisible()
  await expect.poll(async () => (await state(page)).visualTheme).toBe('pixel')
  await expect(page.locator('.theme-switch a.is-active')).toHaveText('BITSHIFT')
  await page.locator('.theme-switch a[href="/overdrive"]').click()
  await expect.poll(async () => (await state(page)).visualTheme).toBe('overdrive')
  await page.keyboard.down('KeyD')
  await page.waitForTimeout(160)
  await page.keyboard.up('KeyD')
  await page.mouse.move(1060, 400)
  await page.mouse.down()
  await page.waitForTimeout(220)
  await expect.poll(async () => (await state(page)).performance.activeBullets).toBeGreaterThan(0)
  const current = await state(page)
  await page.screenshot({ path: 'output/playwright/overdrive-gameplay.png' })
  await page.mouse.up()

  expect(current.mode).toBe('running')
  expect(current.performance.activeBullets).toBeGreaterThan(0)
  expect(fatalErrors).toEqual([])
})
