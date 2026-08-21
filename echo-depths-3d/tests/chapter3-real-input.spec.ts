import { test as base, expect, type Page } from '@playwright/test'

type Stage = 0 | 1 | 2 | 3 | 4 | 5
type Vector3 = { x: number; y: number; z: number }
type GameState = {
  mode: string
  chapter: Stage
  player: { position: Vector3; velocity: Vector3 } | null
  echo: { mode: string; tick: number; durationTicks: number }
  pressurePlates: Record<string, { active: boolean }>
  levers: Record<string, { active: boolean }>
  doors: Record<string, { open: boolean }>
  dynamics: Record<string, { position: Vector3; carriedBy?: string }>
  objectives: { required: string[]; facts: string[]; complete: boolean }
  facts: string[]
}

async function startEnglish(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('/')
  await page.waitForFunction(() => typeof (window as Window & { render_game_to_text?: () => string }).render_game_to_text === 'function')
  await page.evaluate(async () => {
    const w = window as Window & { echoDepthsDebug?: { finishTutorial: () => Promise<void>; setManualStepping: (v: boolean) => void } }
    if (!w.echoDepthsDebug) throw new Error('no debug')
    await w.echoDepthsDebug.finishTutorial()
    w.echoDepthsDebug.setManualStepping(true)
  })
  await page.locator('#start-button').click()
}

async function selectChapter(page: Page, chapter: number): Promise<void> {
  await page.evaluate(async (value) => {
    const w = window as Window & { echoDepthsDebug?: { selectChapter: (v: number) => Promise<void> } }
    if (!w.echoDepthsDebug) throw new Error('no debug')
    await w.echoDepthsDebug.selectChapter(value as 1 | 2 | 3 | 4 | 5)
  }, chapter)
}

async function settleOnGround(page: Page): Promise<void> {
  for (let i = 0; i < 60; i += 1) await advanceTicks(page, 1)
}

async function state(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const w = window as Window & { render_game_to_text?: () => string }
    return JSON.parse(w.render_game_to_text!())
  })
}

async function advanceTicks(page: Page, ticks: number): Promise<void> {
  await page.evaluate((count) => {
    const w = window as Window & { echoDepthsDebug?: { advanceTicks: (v: number) => void } }
    w.echoDepthsDebug!.advanceTicks(count)
  }, ticks)
}

const distance = (a: Vector3, b: Vector3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

const press = async (page: Page, key: string, ticks = 1): Promise<void> => {
  await page.keyboard.down(key)
  await advanceTicks(page, ticks)
  await page.keyboard.up(key)
}

const hold = async (page: Page, key: string, ticks: number): Promise<void> => {
  await page.keyboard.down(key)
  await advanceTicks(page, ticks)
  await page.keyboard.up(key)
}

const approachUntil = async (
  page: Page,
  key: string,
  target: Vector3,
  predicate: (s: GameState) => boolean,
  maxTicks = 240,
): Promise<void> => {
  await page.keyboard.down(key)
  for (let i = 0; i < maxTicks; i += 1) {
    await advanceTicks(page, 1)
    const s = await state(page)
    if (predicate(s)) {
      await page.keyboard.up(key)
      return
    }
    const p = s.player
    if (p) {
      const dx = target.x - p.position.x
      const dz = target.z - p.position.z
      if (Math.hypot(dx, dz) < 0.4) {
        await page.keyboard.up(key)
        return
      }
    }
  }
  await page.keyboard.up(key)
}

base('Chapter 3 — real-input OBJECT TRANSFER walkthrough', async ({ page }) => {
  test.setTimeout(300_000)
  await startEnglish(page)
  await selectChapter(page, 3)
  await settleOnGround(page)
  await page.locator('#game-canvas').focus()

  // Initial state should show the at-rest objective.
  await expect.poll(async () => (await state(page)).mode).toBe('playing')
  const playerSpawn = (await state(page)).player?.position ?? { x: -6, y: 4, z: 3 }

  // --- 1) R: begin recording.
  await press(page, 'r')

  // --- 2) Walk east toward the memory core (-3, 3.75, 1.6). Player spawn is at x=-6.
  // We press 'd' for many manual ticks until the core is within pickup range.
  await page.keyboard.down('d')
  for (let i = 0; i < 120; i += 1) {
    await advanceTicks(page, 1)
    const s2 = await state(page)
    const prompt = await page.locator('#interact-prompt').textContent().catch(() => '')
    if (prompt && /Lift object/i.test(prompt)) break
    const p = s2.player
    if (p && p.position.x > -2.5) break
  }
  await page.keyboard.up('d')

  // --- 3) E pickup the core.
  await page.keyboard.down('e')
  await advanceTicks(page, 2)
  await page.keyboard.up('e')
  await expect.poll(async () => (await state(page)).dynamics['memory-core']?.carriedBy).toBe('player')

  // --- 4) Walk to the throw ledge (-2, 1.4, 1.6) — toward the transfer lane.
  await approachUntil(
    page,
    'd',
    { x: -1, y: 1.4, z: 1.6 },
    () => false,
  )

  // --- 5) K throw (preview then release).
  await page.keyboard.down('k')
  await advanceTicks(page, 8)
  await page.keyboard.up('k')
  // Core should no longer be carried.
  await expect.poll(async () => (await state(page)).dynamics['memory-core']?.carriedBy).toBeUndefined()

  // --- 6) Walk down stairs, through the gate, into atrium-east.
  await hold(page, 's', 60) // walk south to stairs
  await hold(page, 'd', 60) // walk east past gate into atrium-east

  // --- 7) R end recording (toggle off).
  await press(page, 'r')
  // Player should still be on the east side of the gate.
  await expect.poll(async () => (await state(page)).player?.position.x ?? 0).toBeGreaterThan(2)

  // --- 8) Wait for Echo replay to finish.
  await expect.poll(async () => (await state(page)).echo?.replay?.complete ?? false).toBe(true, { timeout: 30_000 })

  // Core should have landed somewhere in the transfer lane / east area (carried by echo? or landed?).
  const stateAfterReplay = await state(page)
  const coreAfterReplay = stateAfterReplay.dynamics['memory-core']
  expect(coreAfterReplay).toBeDefined()
  // Player should be on east side of openAtX so the shutter is open for next throw.
  expect(stateAfterReplay.player?.position.x ?? 0).toBeGreaterThan(4)

  // --- 9) Walk to the landed core and pick up.
  await approachUntil(
    page,
    'a',
    { x: coreAfterReplay!.position.x, y: coreAfterReplay!.position.y, z: coreAfterReplay!.position.z },
    (s) => s.dynamics['memory-core']?.carriedBy === 'player',
    300,
  )
  await page.keyboard.down('e')
  await advanceTicks(page, 2)
  await page.keyboard.up('e')

  // --- 10) Walk to receiver at (6.6, 0.88, 1.6) and K throw.
  await approachUntil(
    page,
    'd',
    { x: 6.6, y: 0.88, z: 1.6 },
    () => false,
  )
  await page.keyboard.down('k')
  await advanceTicks(page, 10)
  await page.keyboard.up('k')
  await expect.poll(async () => (await state(page)).facts.includes('receiver-filled')).toBe(true, { timeout: 15_000 })

  // --- 11) Walk to exit and E to enter.
  await approachUntil(
    page,
    'd',
    { x: 10.2, y: 1.08, z: -0.4 },
    () => false,
  )
  await page.keyboard.down('e')
  await advanceTicks(page, 4)
  await page.keyboard.up('e')

  // Chapter should complete.
  await expect.poll(async () => (await state(page)).mode).toBe('chapter-complete', { timeout: 15_000 })
})

export const test = base
