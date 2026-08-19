import { test, expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
type GameState = {
  mode: string
  chapter: number
  objectives: { facts: string[]; complete: boolean }
  pressurePlates: Record<string, { active: boolean }>
  levers: Record<string, { active: boolean; actor?: string }>
}
type EchoDepthsWindow = Window & {
  render_game_to_text?: () => string
  echoDepthsDebug?: {
    selectChapter: (chapter: number) => Promise<void>
    finishTutorial: () => Promise<void>
    setManualStepping: (enabled: boolean) => void
    advanceInput: (input: Record<string, number | boolean>, ticks: number) => void
    advanceTicks: (ticks: number) => void
    solutionStep: (step: number) => void
    restartChapter: () => Promise<void>
  }
}
const V_DIR = resolve('work/plate-visual')
async function state(page: Page): Promise<GameState> {
  return page.evaluate(() => JSON.parse((window as EchoDepthsWindow).render_game_to_text!()))
}
test('Chapter 1 plate visual feedback', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('http://127.0.0.1:4541/')
  await page.waitForFunction(() => typeof (window as EchoDepthsWindow).render_game_to_text === 'function', { timeout: 30000 })
  await expect.poll(async () => (await state(page)).mode).not.toBe('loading')
  await page.evaluate(() => (window as EchoDepthsWindow).echoDepthsDebug!.finishTutorial())
  await page.evaluate(() => (window as EchoDepthsWindow).echoDepthsDebug!.setManualStepping(true))
  await page.evaluate(() => (window as EchoDepthsWindow).echoDepthsDebug!.selectChapter(1))
  await page.waitForFunction(() => {
    const s = (window as EchoDepthsWindow).render_game_to_text!()
    return JSON.parse(s).chapter === 1 && JSON.parse(s).mode === 'playing'
  })
  await page.waitForTimeout(2000)
  // Step 0: tutorial-lever
  await page.evaluate(() => (window as EchoDepthsWindow).echoDepthsDebug!.solutionStep(0))
  await page.waitForTimeout(800)
  // Snap INACTIVE state
  await mkdir(V_DIR, { recursive: true })
  await page.screenshot({ path: resolve(V_DIR, 'c1-plate-INACTIVE.png') })
  // Move player near the plate to be in view
  await page.evaluate(() => {
    const w = window as any
    const debug = w.echoDepthsDebug
    if (debug) {
      debug.setInput({ moveX: 0, moveZ: 1 })
    }
  })
  await page.waitForTimeout(2000)
  // Snap ACTIVE state with focus on plate area
  await page.screenshot({ path: resolve(V_DIR, 'c1-plate-ACTIVE.png'), clip: { x: 600, y: 300, width: 680, height: 420 } })
  const final = await state(page)
  console.log('final state:', JSON.stringify({ facts: final.objectives.facts, complete: final.objectives.complete }))
})
