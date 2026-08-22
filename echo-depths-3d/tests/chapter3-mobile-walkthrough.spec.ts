import { test as base, expect, type Page } from '@playwright/test'

type Vector3 = { x: number; y: number; z: number }
type GameState = {
  mode: string
  player: { position: Vector3; velocity: Vector3 } | null
  echo: { mode: string; tick: number; durationTicks: number; replay?: { complete?: boolean } }
  pressurePlates: Record<string, { active: boolean }>
  levers: Record<string, { active: boolean }>
  doors: Record<string, { open: boolean }>
  devices: Record<string, { position: Vector3; active: boolean }>
  facts: string[]
}
declare global {
  interface Window {
    GAME_STATE?: () => GameState | undefined
    echoDepthsDebug?: {
      finishTutorial: () => Promise<void>
      setManualStepping: (v: boolean) => void
      selectChapter: (v: number) => Promise<void>
      advanceTicks: (v: number) => void
    }
    render_game_to_text?: () => string
  }
}

const test = base.extend({})

async function startEnglish(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('/')
  await page.waitForFunction(() => typeof (window as Window).render_game_to_text === 'function')
  await page.evaluate(async () => {
    const w = window as Window
    if (!w.echoDepthsDebug) throw new Error('no debug')
    await w.echoDepthsDebug.finishTutorial()
    w.echoDepthsDebug.setManualStepping(true)
  })
  for (let i = 0; i < 60; i += 1) await advanceTicks(page, 1)
}

async function selectChapter(page: Page, chapter: number): Promise<void> {
  await page.evaluate(async (value) => {
    const w = window as Window
    if (!w.echoDepthsDebug) throw new Error('no debug')
    await w.echoDepthsDebug.selectChapter(value as 1 | 2 | 3 | 4 | 5)
  }, chapter)
  for (let i = 0; i < 10; i += 1) await advanceTicks(page, 1)
  await page.locator('#game-canvas').focus()
}

async function state(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const w = window as Window
    return JSON.parse(w.render_game_to_text!())
  })
}

async function advanceTicks(page: Page, ticks: number): Promise<void> {
  await page.evaluate((count) => {
    const w = window as Window
    w.echoDepthsDebug!.advanceTicks(count)
  }, ticks)
}

async function pressKey(page: Page, key: string, ticks = 1): Promise<void> {
  await page.keyboard.down(key)
  await advanceTicks(page, ticks)
  await page.keyboard.up(key)
}

async function holdKey(page: Page, key: string, ticks: number): Promise<void> {
  await page.keyboard.down(key)
  await advanceTicks(page, ticks)
  await page.keyboard.up(key)
}

async function walkTo(page: Page, key: string, target: Vector3, maxTicks = 200, tolerance = 0.4): Promise<void> {
  await page.keyboard.down(key)
  for (let i = 0; i < maxTicks; i += 1) {
    await advanceTicks(page, 1)
    const s = await state(page)
    const p = s.player
    if (p) {
      const dx = target.x - p.position.x
      const dz = target.z - p.position.z
      if (Math.hypot(dx, dz) < tolerance) {
        await page.keyboard.up(key)
        return
      }
    }
  }
  await page.keyboard.up(key)
}

test.describe('Ch3 mobile walkthrough (iPhone 14 Pro Max landscape 932x430)', () => {
  test('Full OBJECT TRANSFER walkthrough with real keyboard input', async ({ page }) => {
    await page.setViewportSize({ width: 932, height: 430 })
    await startEnglish(page)
    await selectChapter(page, 3)
    // Settle
    for (let i = 0; i < 30; i += 1) await advanceTicks(page, 1)
    let s = await state(page)
    expect(s.mode, 'game mode').toBe('playing')

    // === 1) R: begin recording
    await pressKey(page, 'r', 1)

    // === 2) Walk EAST to memory-core
    await walkTo(page, 'd', { x: -3, y: 3.75, z: 1.6 })

    // === 3) E pickup
    await pressKey(page, 'e', 2)
    s = await state(page)
    expect(s.cores['memory-core']?.carriedBy, 'core picked up').toBe('player')

    // === 4) Walk to throw ledge (slightly east of core for throw)
    await walkTo(page, 'd', { x: -1, y: 3.5, z: 1.6 }, 100)

    // === 5) K throw (toward EAST — large opening)
    await page.keyboard.down('k')
    await advanceTicks(page, 8)
    await page.screenshot({ path: 'output/c3-mobile-04-throw.png' })
    await page.keyboard.up('k')
    await advanceTicks(page, 2)
    s = await state(page)
    expect(s.cores['memory-core']?.carriedBy, 'core released from carry after throw').toBeUndefined()

    // === 6) Walk south to stairs
    await holdKey(page, 's', 60)
    // === 7) Walk east through gate
    await holdKey(page, 'd', 100)
    await page.screenshot({ path: 'output/c3-mobile-06-east.png' })
    s = await state(page)
    const playerX = s.player?.position.x ?? 0
    expect(playerX, 'player crossed to EAST side').toBeGreaterThan(1.5)

    // === 8) R: stop recording. Echo System 2.0 fires: player stays EAST, core rewinds WEST, echo spawns WEST.
    await pressKey(page, 'r', 1)

    // === 9) Wait for echo replay
    for (let i = 0; i < 200; i += 1) await advanceTicks(page, 1)
    s = await state(page)
    expect(s.echo.mode, 'echo replay complete').toBe('holding')
    // Player should still be on EAST (not rewinded)
    expect(s.player?.position.x ?? 0, 'player persisted at recording-end (EAST)').toBeGreaterThan(1.5)

    // === 10) E: player pickup the thrown core
    await pressKey(page, 'e', 2)
    s = await state(page)
    expect(s.cores['memory-core']?.carriedBy, 'player picked up core after echo throw').toBe('player')

    // === 11) Face east + K throw to receiver
    await holdKey(page, 'd', 3)  // turn east
    await pressKey(page, 'k', 8)
    await advanceTicks(page, 100)  // let core travel to receiver
    s = await state(page)
    expect(s.facts, 'core-in-atrium-receiver set').toContain('receiver-filled')

    // === 12) Walk to exit
    await holdKey(page, 'd', 100)
    s = await state(page)
    // === 13) E at exit
    await pressKey(page, 'e', 2)
    await page.screenshot({ path: 'output/c3-mobile-13-exit.png' })
    s = await state(page)
    // Player should be at or near exit
    expect(s.player?.position.x ?? 0, 'player near exit').toBeGreaterThan(8)
  })
})
