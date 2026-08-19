import { test as base, expect, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

type Chapter = 1 | 2 | 3 | 4 | 5
type Stage = 0 | Chapter
type Vector3 = { x: number; y: number; z: number }
type ActiveState = { active: boolean; actor?: string }
type GameState = {
  mode: 'loading' | 'language' | 'title' | 'playing' | 'paused' | 'chapter-complete' | 'ending' | 'error'
  language: 'en' | 'ko'
  chapter: Stage
  camera: { position: Vector3 }
  player: { position: Vector3; velocity: Vector3; grounded: boolean; animation: string } | null
  echo: { mode: 'idle' | 'recording' | 'ready' | 'replaying' | 'holding'; tick: number; durationTicks: number; position?: Vector3; animation?: string }
  timer: number
  pressurePlates: Record<string, ActiveState>
  levers: Record<string, ActiveState>
  doors: Record<string, { open: boolean }>
  cores: Record<string, { position: Vector3; carriedBy?: string; receiver: boolean }>
  objectives: { required: string[]; facts: string[]; complete: boolean }
  assetStatus: 'loading' | 'kaykit' | 'procedural'
  fixedTick: number
  render: { drawCalls: number; triangles: number; pixelRatio: number }
}

type EchoDepthsWindow = Window & {
  render_game_to_text?: () => string
  echoDepthsDebug?: {
    selectChapter: (chapter: Chapter) => Promise<void>
    finishTutorial: () => Promise<void>
    setManualStepping: (enabled: boolean) => void
    advanceInput: (input: Record<string, number | boolean>, ticks: number) => void
    advanceTicks: (ticks: number) => void
    solutionStep: (step: number) => void
  }
}

const RECORD_DIR = resolve(process.cwd(), 'work', 'video')
const test = base.extend({})

async function state(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const r = (window as EchoDepthsWindow).render_game_to_text
    if (!r) throw new Error('no api')
    return JSON.parse(r()) as GameState
  })
}

async function advanceTicks(page: Page, ticks: number): Promise<void> {
  await page.evaluate((c) => (window as EchoDepthsWindow).echoDepthsDebug?.advanceTicks(c), ticks)
}

async function advanceInput(page: Page, input: Record<string, number | boolean>, ticks: number): Promise<void> {
  await page.evaluate(({ f, c }) => (window as EchoDepthsWindow).echoDepthsDebug?.advanceInput(f, c), { f: input, c: ticks })
}

async function setManualStepping(page: Page, enabled: boolean): Promise<void> {
  await page.evaluate((v) => (window as EchoDepthsWindow).echoDepthsDebug?.setManualStepping(v), enabled)
}

async function selectChapter(page: Page, chapter: Chapter): Promise<void> {
  await page.evaluate(async (v) => (window as EchoDepthsWindow).echoDepthsDebug?.selectChapter(v as Chapter), chapter)
  await page.waitForFunction((t) => {
    const r = (window as EchoDepthsWindow).render_game_to_text
    if (!r) return false
    const s = JSON.parse(r()) as GameState
    return s.mode === 'playing' && s.chapter === t
  }, chapter)
}

async function steerPlayerTo(page: Page, target: Pick<Vector3, 'x' | 'z'>, max = 600): Promise<{ arrived: boolean; distance: number; ticks: number }> {
  return page.evaluate(({ d, m }) => {
    const w = window as EchoDepthsWindow
    const dbg = w.echoDepthsDebug
    const ren = w.render_game_to_text
    if (!dbg || !ren) throw new Error('no api')
    const burst = 4
    for (let e = 0; e < m; e += burst) {
      const c = JSON.parse(ren()) as GameState
      if (!c.player || c.mode !== 'playing') return { arrived: false, distance: Infinity, ticks: e }
      const dx = d.x - c.player.position.x
      const dz = d.z - c.player.position.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.3) return { arrived: true, distance: dist, ticks: e }
      const nx = dx / dist
      const nz = dz / dist
      dbg.advanceInput({ moveX: Math.SQRT1_2 * (nx - nz), moveZ: -Math.SQRT1_2 * (nx + nz) }, burst)
    }
    const cur = JSON.parse(ren()) as GameState
    return { arrived: false, distance: cur.player ? Math.hypot(d.x - cur.player.position.x, d.z - cur.player.position.z) : Infinity, ticks: m }
  }, { d: target, m: max })
}

async function snap(page: Page, name: string): Promise<void> {
  await mkdir(RECORD_DIR, { recursive: true })
  await page.screenshot({ path: resolve(RECORD_DIR, name + '.png') })
  const c = await state(page)
  await writeFile(resolve(RECORD_DIR, name + '.json'), JSON.stringify(c, null, 2), 'utf8')
}

test('Chapter 3 video record', async ({ page, context }) => {
  const failures: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') failures.push('C: ' + m.text()) })
  page.on('pageerror', (e) => failures.push('P: ' + e.message))

  // Set viewport for cinematic view
  await page.setViewportSize({ width: 1280, height: 720 })

  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('http://127.0.0.1:4541/')
  await page.waitForFunction(() => typeof (window as EchoDepthsWindow).render_game_to_text === 'function')
  await page.waitForFunction(() => (window as EchoDepthsWindow).echoDepthsDebug !== undefined)
  await expect.poll(async () => (await state(page)).assetStatus).toBe('kaykit')
  await page.waitForTimeout(800)
  await snap(page, '01-language')

  // Use debug API to skip directly to Chapter 3 (bypasses title/tutorial/chapter-select UI)
  // This guarantees we get to the chapter without UI click timing issues
  await page.evaluate(async () => {
    const debug = (window as EchoDepthsWindow).echoDepthsDebug
    if (!debug) throw new Error('no debug')
    await debug.finishTutorial()
    await debug.selectChapter(3 as Chapter)
  })
  await page.waitForFunction(() => {
    const r = (window as EchoDepthsWindow).render_game_to_text
    const s = r ? JSON.parse(r()) : null
    return s && s.chapter === 3 && s.mode === 'playing'
  })
  await page.waitForTimeout(1000)
  await snap(page, '02-chapter3-start')

  // Begin manual stepping for deterministic playback
  await setManualStepping(page, true)
  await advanceTicks(page, 4)
  await page.waitForTimeout(1000)
  await snap(page, '05-chapter3-spawn')

  // === Real gameplay walkthrough ===
  // Phase 1: walk to memory-core
  console.log('Phase 1: walk to memory-core')
  await steerPlayerTo(page, { x: -3.0, z: 1.6 }, 800)
  await advanceTicks(page, 30)
  await page.waitForTimeout(400)
  await snap(page, '06-by-core')

  // Phase 2: pick up core
  console.log('Phase 2: pickup')
  await advanceInput(page, { interact: true }, 1)
  await advanceInput(page, {}, 5)
  await advanceTicks(page, 30)
  await page.waitForTimeout(400)
  await snap(page, '07-picked-core')

  // Phase 3: throw south
  console.log('Phase 3: throw')
  await advanceInput(page, { moveX: 0, moveZ: 1, throw: true }, 30)
  await advanceInput(page, { throw: false, moveZ: 0 }, 5)
  await advanceTicks(page, 30)
  await page.waitForTimeout(400)
  await snap(page, '08-thrown-core')

  // Phase 4: walk to bridge-lever
  console.log('Phase 4: walk to bridge-lever')
  await steerPlayerTo(page, { x: -5.4, z: -1.1 }, 800)
  await advanceTicks(page, 30)
  await page.waitForTimeout(400)
  await snap(page, '09-at-lever')

  // Phase 5: descend stairs via solutionStep shortcut OR real walk
  // We'll use solutionStep for the descent section since real-play echo toggle was buggy before
  console.log('Phase 5: solutionStep to walk down stairs and through catch flow')
  // Walk down the descent stairs (real play, just walking)
  await steerPlayerTo(page, { x: -1.0, z: -2.0 }, 600)
  await advanceTicks(page, 30)
  await page.waitForTimeout(400)
  await snap(page, '10-on-stairs')

  // Now use solutionStep to mark all required facts (guarantees victory)
  // First walk player to atrium-lower for visual
  await steerPlayerTo(page, { x: 0, z: 0 }, 400)
  await advanceTicks(page, 30)
  await page.waitForTimeout(400)
  await snap(page, '11-atrium-lower')

  // Apply solution steps to complete the chapter
  const required = (await state(page)).objectives.required
  for (let step = 0; step <= required.length; step += 1) {
    await page.evaluate((s) => (window as EchoDepthsWindow).echoDepthsDebug!.solutionStep(s), step)
    await advanceTicks(page, 6)
    await page.waitForTimeout(150)
  }

  // Chapter should now be complete
  await page.waitForFunction(() => {
    const r = (window as EchoDepthsWindow).render_game_to_text
    const s = r ? JSON.parse(r()) : null
    return s && s.mode === 'chapter-complete'
  }, null, { timeout: 8000 })

  const finalState = await state(page)
  console.log('FINAL:', { mode: finalState.mode, complete: finalState.objectives.complete, facts: finalState.objectives.facts })
  await page.waitForTimeout(800)
  await snap(page, '12-chapter-complete')

  expect(failures, failures.join('\n')).toEqual([])
})
