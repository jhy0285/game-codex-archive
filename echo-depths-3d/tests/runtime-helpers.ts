import { expect, type Page } from '@playwright/test'

export type Chapter = 1 | 2 | 3 | 4 | 5
export type Vec3 = { x: number; y: number; z: number }
export type RuntimeState = {
  mode: string
  chapter: number
  language?: string
  player: { position: Vec3; velocity?: Vec3; yaw?: number; grounded?: boolean } | null
  echo: { mode: string; tick: number; durationTicks: number; position?: Vec3; yaw?: number }
  facts?: string[]
  objectives: { required: string[]; facts: string[]; complete: boolean }
  pressurePlates?: Record<string, { active: boolean; actor?: string }>
  levers?: Record<string, { active: boolean; actor?: string }>
  doors?: Record<string, { open: boolean }>
  elevators?: Record<string, { y: number; active: boolean }>
  cores: Record<string, { position: Vec3; velocity?: Vec3; carriedBy?: 'player' | 'echo'; receiver: boolean }>
  crates?: Record<string, { position: Vec3; carriedBy?: 'player' | 'echo' }>
  barriers?: Record<string, { position: Vec3; open?: boolean }>
  enemies?: Record<string, {
    position: Vec3
    forward: Vec3
    state: string
    target?: 'player' | 'echo'
    targetVisible: boolean
    defeated: boolean
    detection: number
  }>
  escapeSeconds?: number
  echoesCreated?: number
  mobileControlsVisible?: boolean
  fixedTick?: number
  failureReason?: string
  failures?: number
}

export async function readState(page: Page): Promise<RuntimeState> {
  return page.evaluate(() => {
    const render = window.render_game_to_text
    if (!render) throw new Error('render_game_to_text is unavailable')
    return JSON.parse(render()) as RuntimeState
  })
}

export async function advanceTicks(page: Page, ticks: number): Promise<void> {
  await page.evaluate((count) => {
    const debug = window.echoDepthsDebug
    if (!debug) throw new Error('echoDepthsDebug is unavailable')
    debug.advanceTicks(count)
  }, ticks)
}

export async function pressKey(page: Page, key: string): Promise<void> {
  await page.keyboard.down(key)
  await advanceTicks(page, 1)
  await page.keyboard.up(key)
  await advanceTicks(page, 1)
}

export async function holdKey(page: Page, key: string, ticks: number): Promise<void> {
  await page.keyboard.down(key)
  await advanceTicks(page, ticks)
  await page.keyboard.up(key)
  await advanceTicks(page, 1)
}

export async function startChapter(page: Page, chapter: Chapter): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('/')
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && typeof window.echoDepthsDebug === 'object', undefined, { timeout: 180_000 })
  await page.evaluate(async (selected) => {
    const debug = window.echoDepthsDebug
    if (!debug) throw new Error('echoDepthsDebug is unavailable')
    debug.setManualStepping(true)
    await debug.selectChapter(selected)
  }, chapter)
  await advanceTicks(page, 60)
  await expect.poll(async () => (await readState(page)).mode, { timeout: 30_000 }).toBe('playing')
  await page.locator('#game-canvas').focus()
}

export async function rotateCameraCardinal(page: Page): Promise<void> {
  await holdKey(page, 'q', 25)
}

export async function moveAxis(
  page: Page,
  axis: 'x' | 'z',
  target: number,
  label: string,
  maximumTicks = 720,
  nearStepTicks = 12,
): Promise<void> {
  const positive = axis === 'x' ? 'd' : 's'
  const negative = axis === 'x' ? 'a' : 'w'
  let held: string | undefined
  for (let elapsed = 0; elapsed < maximumTicks;) {
    const state = await readState(page)
    if (state.mode !== 'playing' || state.failureReason) {
      if (held) await page.keyboard.up(held)
      throw new Error(`${label}: run interrupted; state=${JSON.stringify(state)}`)
    }
    const player = state.player
    if (!player) throw new Error(`${label}: Player unavailable`)
    const delta = target - player.position[axis]
    if (Math.abs(delta) < 0.32) {
      if (held) await page.keyboard.up(held)
      return
    }
    const key = delta > 0 ? positive : negative
    if (key !== held) {
      if (held) await page.keyboard.up(held)
      await page.keyboard.down(key)
      held = key
    }
    const stepTicks = Math.abs(delta) < 1 ? nearStepTicks : 12
    await advanceTicks(page, stepTicks)
    elapsed += stepTicks
  }
  if (held) await page.keyboard.up(held)
  throw new Error(`${label}: Player did not reach ${axis}=${target}; final=${JSON.stringify(await readState(page))}`)
}

export async function moveAxisPrecise(
  page: Page,
  axis: 'x' | 'z',
  target: number,
  label: string,
  maximumTicks = 720,
): Promise<void> {
  return moveAxis(page, axis, target, label, maximumTicks, 4)
}

export async function waitForState(page: Page, predicate: (state: RuntimeState) => boolean, maximumTicks: number, label: string): Promise<RuntimeState> {
  const startingFailures = (await readState(page)).failures ?? 0
  for (let elapsed = 0; elapsed <= maximumTicks; elapsed += 12) {
    const current = await readState(page)
    if (predicate(current)) return current
    if (current.failureReason || (current.failures ?? 0) > startingFailures) {
      throw new Error(`${label}; run failed before condition: ${JSON.stringify(current)}`)
    }
    await advanceTicks(page, 12)
  }
  throw new Error(`${label}; final=${JSON.stringify(await readState(page))}`)
}
