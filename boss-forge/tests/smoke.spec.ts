import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

type TextState = {
  phase: string
  selectionCount: number
  selectedModules: string[]
  canStartFight: boolean
  player: null | {
    x: number
    y: number
    health: number
    dodgeReady: boolean
    dodging: boolean
    animationState: 'idle' | 'run' | 'fire' | 'dodge'
    animationFrame: number
    facingOctant: number
  }
  boss: null | {
    x: number
    y: number
    health: number
    animationState: string
    animationFrame: number
  }
  currentBossAttack: null | { module: string; stage: string }
  attackHistory: string[]
  projectiles: { player: number; boss: number }
  visibleProjectiles: {
    player: Array<{ x: number; y: number; kind: string }>
    boss: Array<{ x: number; y: number; kind: string }>
  }
  presentationClockMs: number
  fullscreen: boolean
  combatFeedback: { particles: number; shockwaves: number; dodgeEchoes: number; impactFlash: boolean }
}

async function gameState(page: Page): Promise<TextState> {
  return page.evaluate(() => {
    const gameWindow = window as typeof window & { render_game_to_text: () => string }
    return JSON.parse(gameWindow.render_game_to_text()) as TextState
  })
}

async function clickCanvasPoint(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Game canvas has no bounding box')
  await page.mouse.click(box.x + (x / 960) * box.width, box.y + (y / 640) * box.height)
}

async function moveMouseToCanvasPoint(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator('canvas').boundingBox()
  if (!box) throw new Error('Game canvas has no bounding box')
  await page.mouse.move(box.x + (x / 960) * box.width, box.y + (y / 640) * box.height)
}

async function advance(page: Page, milliseconds: number): Promise<void> {
  await page.evaluate((ms) => {
    const gameWindow = window as typeof window & { advanceTime: (duration: number) => void }
    gameWindow.advanceTime(ms)
  }, milliseconds)
}

async function startFight(page: Page, firstCard: number, secondCard: number): Promise<void> {
  await expect.poll(async () => (await gameState(page)).phase).toBe('config')
  const cardX = [180, 480, 780]
  await clickCanvasPoint(page, cardX[firstCard]!, 348)
  await expect.poll(async () => (await gameState(page)).selectionCount).toBe(1)
  await clickCanvasPoint(page, cardX[secondCard]!, 348)
  await expect.poll(async () => (await gameState(page)).selectionCount).toBe(2)
  await clickCanvasPoint(page, 480, 551)
  await expect.poll(async () => (await gameState(page)).phase).toBe('fight')
}

async function advanceUntil(
  page: Page,
  predicate: (state: TextState) => boolean,
  attempts = 80,
): Promise<TextState> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const state = await gameState(page)
    if (predicate(state)) return state
    await advance(page, 100)
  }
  throw new Error(`State was not reached. Latest state: ${JSON.stringify(await gameState(page))}`)
}

async function advanceUntilAttack(
  page: Page,
  module: string,
  stage: string,
): Promise<TextState> {
  return advanceUntil(
    page,
    (state) => state.currentBossAttack?.module === module && state.currentBossAttack.stage === stage,
  )
}

async function captureLiveMotion(page: Page, name: string): Promise<TextState> {
  // An empty audit object freezes only the simulation clock; it does not force a
  // player or boss state, so the PNG/JSON pair records the real live attack pose.
  await page.evaluate(() => window.set_animation_audit_scenario({}))
  const snapshot = await gameState(page)
  mkdirSync('output/playwright/live-motion', { recursive: true })
  await page.locator('canvas').screenshot({ path: `output/playwright/live-motion/${name}.png` })
  writeFileSync(`output/playwright/live-motion/${name}.json`, JSON.stringify(snapshot, null, 2))
  await page.evaluate(() => window.set_animation_audit_scenario(null))
  return snapshot
}

test('loads the game and reaches a clean restart flow', async ({ page }) => {
  const fatalErrors: string[] = []
  page.on('pageerror', (error) => fatalErrors.push(error.message))

  await page.goto('/')
  await expect(page).toHaveTitle('BOSS FORGE')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect.poll(async () => (await gameState(page)).phase).toBe('config')

  await page.keyboard.press('f')
  await expect.poll(async () => (await gameState(page)).fullscreen).toBe(true)
  await page.keyboard.press('Escape')
  await expect.poll(async () => (await gameState(page)).fullscreen).toBe(false)

  await clickCanvasPoint(page, 180, 348)
  await expect.poll(async () => (await gameState(page)).selectionCount).toBe(1)
  await clickCanvasPoint(page, 480, 348)
  await expect.poll(async () => (await gameState(page)).selectionCount).toBe(2)
  expect((await gameState(page)).selectedModules).toEqual(['RADIAL BURST', 'AIMED SHOT'])
  expect((await gameState(page)).canStartFight).toBe(true)

  await clickCanvasPoint(page, 480, 551)
  await expect.poll(async () => (await gameState(page)).phase).toBe('fight')

  await page.keyboard.press('r')
  await expect.poll(async () => (await gameState(page)).phase).toBe('config')
  expect((await gameState(page)).selectionCount).toBe(0)
  expect(fatalErrors).toEqual([])
})

test('movement, dodge, player attack, and victory work end to end', async ({ page }) => {
  const fatalErrors: string[] = []
  page.on('pageerror', (error) => fatalErrors.push(error.message))
  await page.goto('/')
  await startFight(page, 0, 1)

  const startX = (await gameState(page)).player!.x
  const clockStart = (await gameState(page)).presentationClockMs
  await page.keyboard.down('d')
  await advance(page, 240)
  const runState = await gameState(page)
  await page.keyboard.up('d')
  expect(runState.player!.x).toBeGreaterThan(startX + 30)
  expect(runState.player!.animationState).toBe('run')
  expect(runState.player!.facingOctant).toBeGreaterThanOrEqual(0)
  expect(runState.player!.facingOctant).toBeLessThan(8)
  // The explicit step contributes exactly 240 ms; the live browser loop may add
  // a few presentation frames while Playwright crosses the page boundary.
  expect(runState.presentationClockMs - clockStart).toBeGreaterThanOrEqual(240)
  expect(runState.presentationClockMs - clockStart).toBeLessThan(440)

  await page.keyboard.down('Space')
  await advance(page, 32)
  const dodgeState = await gameState(page)
  await page.keyboard.up('Space')
  expect(dodgeState.player!.dodging).toBe(true)
  expect(dodgeState.player!.dodgeReady).toBe(false)
  expect(dodgeState.player!.animationState).toBe('dodge')
  expect(dodgeState.combatFeedback.dodgeEchoes).toBeGreaterThan(0)

  await moveMouseToCanvasPoint(page, 735, 350)
  await page.mouse.down()
  await advanceUntil(page, (state) => state.phase === 'win', 100)
  await page.mouse.up()
  await page.locator('canvas').screenshot({ path: 'output/playwright/win-screen.png' })
  expect((await gameState(page)).boss!.health).toBe(0)
  await clickCanvasPoint(page, 480, 425)
  await expect.poll(async () => (await gameState(page)).phase).toBe('config')
  expect(fatalErrors).toEqual([])
})

test('selected attacks telegraph clearly, stay selected-only, and can kill the player', async ({ page }) => {
  const fatalErrors: string[] = []
  page.on('pageerror', (error) => fatalErrors.push(error.message))
  await page.goto('/')
  await startFight(page, 1, 2)

  const aimedTelegraphState = await advanceUntil(
    page,
    (state) => state.currentBossAttack?.module === 'AIMED SHOT' && state.currentBossAttack.stage === 'telegraph',
  )
  expect(aimedTelegraphState.boss!.animationState).toBe('aimed_telegraph')
  await page.locator('canvas').screenshot({ path: 'output/playwright/aimed-telegraph.png' })
  const beamTelegraphState = await advanceUntil(
    page,
    (state) => state.currentBossAttack?.module === 'ROTATING BEAM' && state.currentBossAttack.stage === 'telegraph',
  )
  expect(beamTelegraphState.boss!.animationState).toBe('beam_telegraph')
  await page.locator('canvas').screenshot({ path: 'output/playwright/beam-telegraph.png' })
  const beamState = await advanceUntil(
    page,
    (state) => state.currentBossAttack?.module === 'ROTATING BEAM' && state.currentBossAttack.stage === 'active',
  )
  expect(beamState.boss!.animationState).toBe('beam_active')
  await page.locator('canvas').screenshot({ path: 'output/playwright/beam-active.png' })
  expect(beamState.attackHistory.length).toBeGreaterThanOrEqual(2)
  expect(beamState.attackHistory.every((attack) => ['AIMED SHOT', 'ROTATING BEAM'].includes(attack))).toBe(true)

  await page.keyboard.press('r')
  await expect.poll(async () => (await gameState(page)).phase).toBe('config')
  await startFight(page, 0, 2)
  const radialBeamState = await advanceUntil(
    page,
    (state) =>
      state.attackHistory.includes('RADIAL BURST') && state.attackHistory.includes('ROTATING BEAM'),
  )
  expect(radialBeamState.attackHistory.every((attack) => ['RADIAL BURST', 'ROTATING BEAM'].includes(attack))).toBe(true)

  await page.keyboard.press('r')
  await expect.poll(async () => (await gameState(page)).phase).toBe('config')
  await startFight(page, 0, 1)
  const loseState = await advanceUntil(page, (state) => state.phase === 'lose', 500)
  expect(loseState.player!.health).toBe(0)
  expect(loseState.attackHistory.every((attack) => ['RADIAL BURST', 'AIMED SHOT'].includes(attack))).toBe(true)
  await page.waitForTimeout(80)
  await page.locator('canvas').screenshot({ path: 'output/playwright/lose-screen.png' })
  expect(fatalErrors).toEqual([])
})

test('live projectile releases latch into choreography before recovery', async ({ page }) => {
  await page.goto('/')
  await startFight(page, 0, 1)

  await advanceUntilAttack(page, 'RADIAL BURST', 'telegraph')
  const radialTell = await captureLiveMotion(page, '01-radial-telegraph-live')
  expect(radialTell.boss!.animationState).toBe('radial_telegraph')
  await advance(page, 760 - (radialTell.currentBossAttack?.elapsedMs ?? 0))
  const radialRelease = await captureLiveMotion(page, '02-radial-release-live')
  expect(radialRelease.currentBossAttack).toBeNull()
  expect(radialRelease.boss!.animationState).toBe('radial_release')
  expect(radialRelease.visibleProjectiles.boss.filter((projectile) => projectile.kind === 'radial')).toHaveLength(8)
  await advance(page, 150)
  expect((await captureLiveMotion(page, '03-radial-recover-live')).boss!.animationState).toBe('radial_recover')

  await advanceUntilAttack(page, 'AIMED SHOT', 'telegraph')
  const aimedTell = await captureLiveMotion(page, '04-aimed-telegraph-live')
  expect(aimedTell.boss!.animationState).toBe('aimed_telegraph')
  await advance(page, 680 - (aimedTell.currentBossAttack?.elapsedMs ?? 0))
  const aimedRelease = await captureLiveMotion(page, '05-aimed-release-live')
  expect(aimedRelease.currentBossAttack).toBeNull()
  expect(aimedRelease.boss!.animationState).toBe('aimed_release')
  expect(aimedRelease.visibleProjectiles.boss.some((projectile) => projectile.kind === 'aimed')).toBe(true)
  await advance(page, 150)
  expect((await captureLiveMotion(page, '06-aimed-recover-live')).boss!.animationState).toBe('aimed_recover')

  await page.keyboard.press('r')
  await expect.poll(async () => (await gameState(page)).phase).toBe('config')
  await startFight(page, 1, 2)
  await advanceUntilAttack(page, 'ROTATING BEAM', 'telegraph')
  const beamTell = await captureLiveMotion(page, '07-beam-telegraph-live')
  expect(beamTell.boss!.animationState).toBe('beam_telegraph')
  await advance(page, 900 - (beamTell.currentBossAttack?.elapsedMs ?? 0))
  const beamRelease = await captureLiveMotion(page, '08-beam-active-live')
  expect(beamRelease.currentBossAttack?.stage).toBe('active')
  expect(beamRelease.boss!.animationState).toBe('beam_active')
})
