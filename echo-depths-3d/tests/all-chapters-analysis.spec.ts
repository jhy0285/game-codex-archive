import { test as base, expect, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

type Chapter = 1 | 2 | 3 | 4 | 5
type GameState = {
  mode: 'loading' | 'language' | 'title' | 'playing' | 'paused' | 'chapter-complete' | 'ending' | 'error'
  chapter: number
  language: string
  objectives: { required: string[]; facts: string[]; complete: boolean }
  assetStatus: string
  fixedTick: number
  timer: number
  player: { position: { x: number; y: number; z: number } } | null
  echo: { mode: string; tick: number; durationTicks: number; position?: { x: number; y: number; z: number } }
  cores: Record<string, { position: { x: number; y: number; z: number }; carriedBy?: string; receiver: boolean }>
  doors: Record<string, { open: boolean }>
  levers: Record<string, { active: boolean; actor?: string }>
  enemies: Record<string, { state: string; defeated: boolean; target?: string }>
  escapeSeconds: number
}

type EchoDepthsWindow = Window & {
  render_game_to_text?: () => string
  echoDepthsDebug?: {
    selectChapter: (chapter: Chapter) => Promise<void>
    finishTutorial: () => Promise<void>
    setManualStepping: (enabled: boolean) => void
    advanceInput: (input: Record<string, number | boolean>, ticks: number) => void
    advanceTicks: (ticks: number) => void
    restartChapter: () => Promise<void>
    solutionStep: (step: number) => void
    setInput: (input: Record<string, number | boolean>) => void
    releaseAllInputs: () => void
  }
}

const RECORD_DIR = resolve(process.cwd(), 'work', 'analysis')
const test = base.extend({})

async function state(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const r = (window as EchoDepthsWindow).render_game_to_text
    if (!r) throw new Error('no render_game_to_text')
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
  await page.evaluate(async (v) => {
    const d = (window as EchoDepthsWindow).echoDepthsDebug
    if (!d) throw new Error('no debug')
    await d.selectChapter(v as Chapter)
  }, chapter)
  await page.waitForFunction((t) => {
    const r = (window as EchoDepthsWindow).render_game_to_text
    if (!r) return false
    const s = JSON.parse(r()) as GameState
    return s.mode === 'playing' && s.chapter === t
  }, chapter)
}

async function snap(page: Page, name: string): Promise<{ name: string; json: GameState | null; ok: boolean; error?: string }> {
  try {
    await mkdir(RECORD_DIR, { recursive: true })
    await page.screenshot({ path: resolve(RECORD_DIR, name + '.png') })
    const c = await state(page)
    await writeFile(resolve(RECORD_DIR, name + '.json'), JSON.stringify(c, null, 2), 'utf8')
    return { name, json: c, ok: true }
  } catch (e) {
    return { name, json: null, ok: false, error: (e as Error).message }
  }
}

async function runChapter(page: Page, chapter: Chapter, log: string[]): Promise<{
  chapter: Chapter
  required: string[]
  steps: number
  facts: string[]
  complete: boolean
  screenshots: string[]
}> {
  log.push(`[C${chapter}] select chapter ${chapter}`)
  await selectChapter(page, chapter)
  await setManualStepping(page, true)
  await advanceTicks(page, 4)
  const s1 = await snap(page, 'c' + chapter + '-01-spawn')
  const required = s1.json?.objectives.required ?? []
  log.push(`[C${chapter}] required facts: ${required.length}`)

  // Capture initial state - press a screenshot showing the chapter
  const screenshots: string[] = [s1.name]

  // Apply solutionStep to set all facts
  for (let step = 0; step <= required.length; step += 1) {
    await page.evaluate((s) => (window as EchoDepthsWindow).echoDepthsDebug?.solutionStep(s), step)
    await advanceTicks(page, 6)
  }
  await page.waitForTimeout(800)
  const s2 = await snap(page, 'c' + chapter + '-02-after-steps')
  screenshots.push(s2.name)
  const facts = s2.json?.objectives.facts ?? []

  // Now request exit to actually complete
  await page.evaluate(() => (window as EchoDepthsWindow).echoDepthsDebug?.solutionStep(99))
  await advanceTicks(page, 30)
  await page.waitForTimeout(800)
  const s3 = await snap(page, 'c' + chapter + '-03-complete')
  screenshots.push(s3.name)

  return {
    chapter,
    required,
    steps: required.length,
    facts,
    complete: s3.json?.objectives.complete ?? false,
    screenshots,
  }
}

test('Chapters 1, 2, 4, 5 analysis', async ({ page }) => {
  const failures: string[] = []
  const events: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') failures.push('C: ' + m.text()) })
  page.on('pageerror', (e) => failures.push('P: ' + e.message))

  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('http://127.0.0.1:4541/')
  await page.waitForFunction(() => typeof (window as EchoDepthsWindow).render_game_to_text === 'function')
  await page.waitForFunction(() => (window as EchoDepthsWindow).echoDepthsDebug !== undefined)
  await expect.poll(async () => (await state(page)).assetStatus).toBe('kaykit')
  // Finish tutorial
  await page.evaluate(() => (window as EchoDepthsWindow).echoDepthsDebug!.finishTutorial())
  await page.waitForTimeout(500)

  const results = []
  for (const ch of [1, 2, 4, 5] as Chapter[]) {
    const r = await runChapter(page, ch, events)
    results.push(r)
    console.log('C' + ch + ' complete:', r.complete, 'facts:', r.facts.length + '/' + r.required.length)
  }

  // Write summary
  const summary = {
    runDate: new Date().toISOString(),
    chapters: results,
    failures,
  }
  await writeFile(resolve(RECORD_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8')
  console.log('SUMMARY:', JSON.stringify(results.map(r => ({ c: r.chapter, ok: r.complete, facts: r.facts.length + '/' + r.required.length })), null, 2))
  expect(failures, failures.join('\n')).toEqual([])
})
