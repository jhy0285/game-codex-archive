import { expect, test, type Page } from '@playwright/test'

const VISUAL_OUTPUT_DIR = 'output/playwright-complete-game'
const GAME_ORIGIN = 'http://127.0.0.1:4173'

type GameState = {
  mode: 'language-select' | 'title' | 'playing' | 'paused' | 'stage-clear' | 'escape' | 'ending' | 'chapter-select'
  language: 'en' | 'ko'
  stage: { index: number; count: number; id: string; title: string }
  loop: number
  totalBinds: number
  remainingMs: number
  recordingSamples: number
  restartCount: number
  deaths: number
  touchControlsVisible: boolean
  orientationPaused: boolean
  player: {
    x: number
    y: number
    facing: string
    moving: boolean
    dashing: boolean
    carryingId: string | null
    inExit: boolean
  }
  echo: {
    visible: boolean
    x: number
    y: number
    samples: number
    carryingId: string | null
    holdingFinalPosition: boolean
  }
  plates: Array<{ id: string; occupiedBy: string | null; latched: boolean }>
  crates: Array<{
    id: string
    kind: string
    x: number
    y: number
    carriedBy: string | null
    airborne: boolean
    active: boolean
  }>
  guardian: null | {
    defeated: boolean
    feedback: string
    firstStrikeBy: string | null
  }
  lasers: Array<{ id: string; phase: string }>
  latches: string[]
  door: { open: boolean }
  objectives: Array<{ id: string; complete: boolean }>
  stats: { elapsedMs: number; stageElapsedMs: number; stageTimesMs: number[] }
}

const collectRuntimeFailures = (page: Page) => {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(`[pageerror] ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`[console.error] ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    failures.push(`[requestfailed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText}`)
  })
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (url.origin === GAME_ORIGIN && response.status() >= 400) {
      failures.push(`[http ${response.status()}] ${response.url()}`)
    }
  })
  return failures
}

const expectNoRuntimeFailures = (failures: string[]) => {
  expect(failures, failures.join('\n')).toEqual([])
}

const readState = async (page: Page) => {
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function')
  return page.evaluate<GameState>(() => JSON.parse(window.render_game_to_text?.() ?? '{}'))
}

const run = async (page: Page, source: string) => {
  await page.waitForFunction(
    () =>
      typeof window.render_game_to_text === 'function' &&
      typeof window.advanceTime === 'function' &&
      typeof window.echoHeistDebug === 'object',
  )
  await page.evaluate((script) => Function(script)(), source)
  return readState(page)
}

const captureCanvas = (page: Page, name: string) =>
  page.locator('canvas').screenshot({ path: `${VISUAL_OUTPUT_DIR}/${name}.png` })

const canvasPoint = async (page: Page, x: number, y: number) => {
  const bounds = await page.locator('canvas').boundingBox()
  if (!bounds) throw new Error('Canvas bounds unavailable')
  return {
    x: bounds.x + (x / 960) * bounds.width,
    y: bounds.y + (y / 600) * bounds.height,
  }
}

const holdKeyForSimulation = async (page: Page, key: string, milliseconds: number) => {
  await page.keyboard.down(key)
  await page.evaluate((duration) => window.advanceTime?.(duration), milliseconds)
  await page.keyboard.up(key)
  await page.evaluate(() => window.advanceTime?.(100))
}

test('loads the complete title screen and starts by keyboard without runtime failures', async ({ page }) => {
  const failures = collectRuntimeFailures(page)
  await page.goto('/')
  await expect(page).toHaveTitle('ECHO HEIST')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.locator('canvas')).toBeVisible()
  expect(await readState(page)).toMatchObject({
    mode: 'language-select',
    language: 'en',
    stage: { index: 1, count: 6, id: 'first-cut' },
    loop: 1,
    totalBinds: 0,
    remainingMs: 24_000,
    recordingSamples: 1,
  })
  await captureCanvas(page, '00-language-select')

  await page.keyboard.press('2')
  await expect.poll(async () => (await readState(page)).mode).toBe('title')
  expect((await readState(page)).language).toBe('ko')

  await page.goto('/')
  await readState(page)
  await page.keyboard.press('1')
  await expect.poll(async () => (await readState(page)).mode).toBe('title')
  expect((await readState(page)).language).toBe('en')
  await captureCanvas(page, '00-title')

  await page.keyboard.down('Enter')
  await page.waitForTimeout(40)
  await page.keyboard.up('Enter')
  await expect.poll(async () => (await readState(page)).mode).toBe('playing')
  expect((await readState(page)).stage.count).toBe(6)
  expectNoRuntimeFailures(failures)
})

test('walks, binds, and solves FIRST CUT with real keyboard controls', async ({ page }) => {
  const failures = collectRuntimeFailures(page)
  await page.goto('/')
  await run(page, `window.echoHeistDebug.setStage(0);`)
  await holdKeyForSimulation(page, 'd', 800)
  await holdKeyForSimulation(page, 's', 300)
  expect((await readState(page)).plates[0]).toMatchObject({
    id: 'alpha',
    occupiedBy: 'player',
  })
  await page.keyboard.down('Space')
  await page.waitForTimeout(50)
  await page.keyboard.up('Space')
  await expect.poll(async () => (await readState(page)).loop).toBe(2)
  await holdKeyForSimulation(page, 'd', 3_100)
  const atExit = await readState(page)
  expect(atExit.player.inExit).toBe(true)
  await page.keyboard.down('e')
  await page.waitForTimeout(50)
  await page.keyboard.up('e')
  await expect.poll(async () => (await readState(page)).mode).toBe('stage-clear')
  const state = await readState(page)
  expect(state).toMatchObject({
    mode: 'stage-clear',
    stage: { index: 1, id: 'first-cut' },
    loop: 2,
    door: { open: true },
    player: { inExit: true },
    echo: { visible: true, holdingFinalPosition: true },
    plates: [{ id: 'alpha', occupiedBy: 'echo' }],
  })
  await captureCanvas(page, '01-first-cut-clear')
  expectNoRuntimeFailures(failures)
})

test('carries cargo with the current self while the echo holds DEAD WEIGHT', async ({ page }) => {
  const failures = collectRuntimeFailures(page)
  await page.goto('/')
  const solved = await run(
    page,
    `
      window.echoHeistDebug.setStage(1);
      window.echoHeistDebug.teleportEcho(270, 210, 'down');
      window.echoHeistDebug.teleportPlayer(210, 430, 'right');
      window.echoHeistDebug.action('interact');
      window.advanceTime(34);
      window.echoHeistDebug.teleportPlayer(432, 430, 'right');
      window.advanceTime(34);
      window.echoHeistDebug.action('interact');
      window.advanceTime(34);
    `,
  )
  expect(solved.door.open).toBe(true)
  expect(solved.plates).toMatchObject([
    { id: 'alpha', occupiedBy: 'echo' },
    { id: 'cargo', occupiedBy: 'cargo' },
  ])
  expect(solved.crates[0]).toMatchObject({
    id: 'cargo-a',
    x: 470,
    y: 430,
    carriedBy: null,
    airborne: false,
  })
  await captureCanvas(page, '02-dead-weight-solved')

  const reset = await run(page, `window.echoHeistDebug.action('restart');`)
  expect(reset).toMatchObject({
    loop: 1,
    restartCount: 1,
    latches: [],
    door: { open: false },
    echo: { visible: false, samples: 0 },
    crates: [{ id: 'cargo-a', x: 245, y: 430, carriedBy: null, airborne: false, active: true }],
  })
  expectNoRuntimeFailures(failures)
})

test('replays pickup and throw, then redirects the echo core into CROSS SIGNAL', async ({ page }) => {
  const failures = collectRuntimeFailures(page)
  await page.goto('/')
  const state = await run(
    page,
    `
      window.echoHeistDebug.setStage(2);
      window.echoHeistDebug.teleportPlayer(210, 430, 'right');
      window.echoHeistDebug.action('interact');
      window.advanceTime(34);
      window.echoHeistDebug.teleportPlayer(315, 405, 'up');
      window.advanceTime(34);
      window.echoHeistDebug.action('pulse');
      window.advanceTime(34);
      window.echoHeistDebug.action('bind');
      window.echoHeistDebug.teleportPlayer(250, 225, 'right');
      window.advanceTime(600);
      window.echoHeistDebug.action('pulse');
      window.advanceTime(680);
    `,
  )
  expect(state).toMatchObject({
    stage: { index: 3, id: 'cross-signal' },
    loop: 2,
    echo: { visible: true, x: 315, y: 405 },
    latches: ['receiver'],
    door: { open: true },
    objectives: [{ id: 'receiver', complete: true }],
  })
  expect(state.crates[0]).toMatchObject({ kind: 'core', active: false })
  await captureCanvas(page, '03-cross-signal-latched')
  expectNoRuntimeFailures(failures)
})

test('breaches SENTINEL SHIFT only with opposite current and echo pulses', async ({ page }) => {
  const failures = collectRuntimeFailures(page)
  await page.goto('/')
  const state = await run(
    page,
    `
      window.echoHeistDebug.setStage(3);
      window.echoHeistDebug.teleportPlayer(400, 330, 'right');
      window.echoHeistDebug.action('pulse');
      window.advanceTime(34);
      window.echoHeistDebug.action('bind');
      window.echoHeistDebug.teleportPlayer(610, 330, 'left');
      window.advanceTime(34);
      window.echoHeistDebug.action('pulse');
      window.advanceTime(34);
    `,
  )
  expect(state).toMatchObject({
    stage: { index: 4, id: 'sentinel-shift' },
    echo: { visible: true, x: 400, y: 330 },
    guardian: { defeated: true, feedback: 'breached', firstStrikeBy: null },
    latches: ['guardian'],
    door: { open: true },
  })
  await captureCanvas(page, '04-sentinel-breached')
  expectNoRuntimeFailures(failures)
})

test('explains laser failure, cleanly retries, and permits a phase dash', async ({ page }) => {
  const failures = collectRuntimeFailures(page)
  await page.goto('/')
  await readState(page)
  const result = await page.evaluate(() => {
    window.echoHeistDebug?.setStage(4)
    window.echoHeistDebug?.teleportPlayer(385, 300, 'down')
    window.advanceTime?.(950)
    const hit = JSON.parse(window.render_game_to_text?.() ?? '{}') as GameState
    window.echoHeistDebug?.setStage(4)
    window.echoHeistDebug?.teleportPlayer(610, 300, 'right')
    window.echoHeistDebug?.action('dash')
    window.advanceTime?.(100)
    const dash = JSON.parse(window.render_game_to_text?.() ?? '{}') as GameState
    return { hit, dash }
  })
  expect(result.hit.deaths).toBe(1)
  expect(result.hit.player).toMatchObject({ x: 115, y: 430, dashing: false })
  expect(result.dash.player.x).toBeGreaterThan(650)
  expect(result.dash.player.dashing).toBe(true)
  expect(result.dash.lasers.find((laser) => laser.id === 'laser-b')?.phase).toBe('active')
  expect(result.dash.deaths).toBe(1)
  await captureCanvas(page, '05-fracture-dash')
  expectNoRuntimeFailures(failures)
})

test('opens ZERO HOUR, reaches the authored ending, and fully replays', async ({ page }) => {
  const failures = collectRuntimeFailures(page)
  await page.goto('/')
  const ending = await run(
    page,
    `
      window.echoHeistDebug.setStage(5);
      window.echoHeistDebug.addLatch('cargo');
      window.echoHeistDebug.addLatch('receiver');
      window.echoHeistDebug.addLatch('guardian');
      window.echoHeistDebug.teleportEcho(205, 185, 'down');
      window.advanceTime(34);
      window.echoHeistDebug.teleportPlayer(875, 320, 'right');
      window.echoHeistDebug.action('interact');
      window.advanceTime(34);
      window.advanceTime(1400);
    `,
  )
  expect(ending).toMatchObject({
    mode: 'ending',
    stage: { index: 6, id: 'zero-hour' },
    door: { open: true },
    objectives: [
      { id: 'cargo', complete: true },
      { id: 'receiver', complete: true },
      { id: 'guardian', complete: true },
      { id: 'alpha', complete: true },
    ],
  })
  await captureCanvas(page, '06-ending')

  const replayPoint = await canvasPoint(page, 350, 465)
  await page.mouse.click(replayPoint.x, replayPoint.y)
  await expect.poll(async () => (await readState(page)).mode).toBe('title')
  expect(await readState(page)).toMatchObject({
    stage: { index: 1, id: 'first-cut' },
    loop: 1,
    totalBinds: 0,
    restartCount: 0,
    deaths: 0,
    latches: [],
    echo: { visible: false, samples: 0 },
  })
  expectNoRuntimeFailures(failures)
})

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
]) {
  test(`keeps the complete canvas visible without document overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const failures = collectRuntimeFailures(page)
    await page.setViewportSize(viewport)
    await page.goto('/')
    const layout = await page.locator('canvas').evaluate((canvas) => {
      const bounds = canvas.getBoundingClientRect()
      return {
        x: bounds.x,
        y: bounds.y,
        right: bounds.right,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      }
    })
    expect(layout.x).toBeGreaterThanOrEqual(0)
    expect(layout.y).toBeGreaterThanOrEqual(0)
    expect(layout.right).toBeLessThanOrEqual(viewport.width)
    expect(layout.bottom).toBeLessThanOrEqual(viewport.height)
    expect(layout.width / layout.height).toBeCloseTo(1.6, 2)
    expect(Math.abs(layout.x - (viewport.width - layout.right))).toBeLessThanOrEqual(1)
    expect(Math.abs(layout.y - (viewport.height - layout.bottom))).toBeLessThanOrEqual(1)
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight)
    expectNoRuntimeFailures(failures)
  })
}

test('auto-pauses portrait mobile and exposes full touch play in landscape', async ({ page }) => {
  const failures = collectRuntimeFailures(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('#rotate-device')).toBeVisible()
  const portrait = await readState(page)
  expect(portrait.orientationPaused).toBe(true)
  expect(portrait.touchControlsVisible).toBe(false)
  await page.waitForTimeout(120)
  expect((await readState(page)).remainingMs).toBe(24_000)

  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('#rotate-device')).toBeHidden()
  await page.keyboard.press('1')
  await page.evaluate(() => window.echoHeistDebug?.start())
  await expect.poll(async () => (await readState(page)).touchControlsVisible).toBe(true)
  const before = await readState(page)
  const right = await canvasPoint(page, 137, 480)
  await page.mouse.move(right.x, right.y)
  await page.mouse.down()
  await page.evaluate(() => window.advanceTime?.(350))
  await page.mouse.up()
  const moved = await readState(page)
  expect(moved.player.x).toBeGreaterThan(before.player.x + 30)
  await captureCanvas(page, '07-mobile-landscape-touch')
  expectNoRuntimeFailures(failures)
})
