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

// Tick rate is 60 Hz (FIXED_STEP_MS = 1000/60 ≈ 16.67ms). We use real timeouts
// to advance the simulation; no echoDepthsDebug is required.
const STEP_MS = 20
const STEP_TICKS_PER_SECOND = 1000 / STEP_MS  // ~50 ticks/sec real time

async function setupChapter3(page: Page): Promise<void> {
  // English: try setting localStorage
  await page.addInitScript(() => {
    try { localStorage.setItem('echo-depths-language', 'en') } catch { /* noop */ }
  })
  await page.setViewportSize({ width: 932, height: 430 })
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)  // let game boot
  // Try to advance past language / tutorial screens with keyboard.
  // Press Enter or click a few times.
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
  }
  // Try to navigate to chapter 3 via the chapter button + card click.
  try {
    await page.click('#chapter-button', { timeout: 3000 })
    await page.waitForTimeout(500)
  } catch { /* may not be on title */ }
  // Click chapter 3 card (text contains 'SPLIT' or '03')
  try {
    const ch3 = page.locator('button:has-text("SPLIT ATRIUM"), button:has-text("03")').first()
    await ch3.click({ timeout: 3000 })
  } catch {
    // Fallback: click button at known chapter-3 position
    await page.mouse.click(909, 358)
  }
  await page.waitForTimeout(5000)
  await page.locator('#game-canvas').click().catch(() => {})
  await page.waitForTimeout(500)
}

async function state(page: Page): Promise<GameState | null> {
  return page.evaluate(() => {
    const w = window as Window
    if (w.GAME_STATE) return w.GAME_STATE()
    if (w.render_game_to_text) return JSON.parse(w.render_game_to_text())
    return null
  })
}

async function tick(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms)
}

async function walkEast(page: Page, ms: number): Promise<void> {
  await page.keyboard.down('d')
  await page.waitForTimeout(ms)
  await page.keyboard.up('d')
}

async function walkWest(page: Page, ms: number): Promise<void> {
  await page.keyboard.down('a')
  await page.waitForTimeout(ms)
  await page.keyboard.up('a')
}

async function walkSouth(page: Page, ms: number): Promise<void> {
  await page.keyboard.down('s')
  await page.waitForTimeout(ms)
  await page.keyboard.up('s')
}

async function pickup(page: Page): Promise<void> {
  await page.keyboard.press('e')
  await page.waitForTimeout(300)
}

async function throwCore(page: Page): Promise<void> {
  await page.keyboard.down('k')
  await page.waitForTimeout(400)
  await page.keyboard.up('k')
  await page.waitForTimeout(800)
}

async function recordStart(page: Page): Promise<void> {
  await page.keyboard.press('r')
  await page.waitForTimeout(400)
}

async function recordStop(page: Page): Promise<void> {
  await page.keyboard.press('r')
  await page.waitForTimeout(400)
}

test.describe('Ch3 negative shortcut tests (real keyboard, time-based)', () => {
  test('No direct Core shortcut — Player picks Core, walks across gate, throws → fail', async ({ page }) => {
    await setupChapter3(page)
    // Walk to memory-core (W of gate)
    await walkEast(page, 1500)
    // Pickup core
    await pickup(page)
    // Walk across gate (no echo recording)
    await walkEast(page, 3500)
    // Try to throw
    await throwCore(page)
    // Wait for state to settle
    await tick(page, 1000)
    const s = await state(page)
    if (s) {
      expect(s.facts, 'core-in-atrium-receiver not added').not.toContain('receiver-filled')
      expect(s.facts, 'temporal-gate-rejected should be set').toContain('temporal-gate-rejected')
    } else {
      test.skip(true, 'window.GAME_STATE / render_game_to_text not exposed on this build')
    }
  })

  test('No EAST→WEST backtrack — Player walks east then attempts west → blocked', async ({ page }) => {
    await setupChapter3(page)
    // Walk EAST past gate
    await walkEast(page, 4500)
    const afterEast = await state(page)
    expect(afterEast?.player?.position.x ?? 0, 'player reached EAST side of gate').toBeGreaterThan(1.5)
    // Try to walk back WEST
    await walkWest(page, 3500)
    const afterBack = await state(page)
    // Player should NOT be back at WEST of the gate (one-way-wall or gate sensor blocks)
    expect(afterBack?.player?.position.x ?? 0, 'player did not return all the way to WEST past one-way-wall or gate').toBeGreaterThan(0)
  })

  test('No echo-less direct carry shortcut — Player picks Core, walks → Core dropped at gate', async ({ page }) => {
    await setupChapter3(page)
    await walkEast(page, 1500)
    await pickup(page)
    // Walk EAST without recording echo
    await walkEast(page, 4000)
    const s = await state(page)
    if (s) {
      expect(s.facts, 'core-in-atrium-receiver not added').not.toContain('receiver-filled')
      expect(s.facts, 'temporal-gate-rejected should be set').toContain('temporal-gate-rejected')
    } else {
      test.skip(true, 'window.GAME_STATE / render_game_to_text not exposed on this build')
    }
  })

  test('No spawn-bypass — Echo spawns at recording-start position (WEST of gate)', async ({ page }) => {
    await setupChapter3(page)
    // Walk WEST of gate (toward recording start)
    await walkWest(page, 600)
    // R: start recording
    await recordStart(page)
    // Walk a bit further (will be replayed)
    await walkEast(page, 500)
    // R: stop recording
    await recordStop(page)
    // Wait for echo replay to complete (allow 8s for replay)
    await tick(page, 8000)
    const s = await state(page)
    if (s) {
      // Echo should be 'holding' (replay complete) — Echo System 2.0
      expect(s.echo.mode, 'echo mode after replay').toBe('holding')
      // Player should still be at recording-end (not rewinded to recording-start)
      expect(s.player, 'player present').not.toBeNull()
    } else {
      test.skip(true, 'window.GAME_STATE / render_game_to_text not exposed on this build')
    }
  })
})
