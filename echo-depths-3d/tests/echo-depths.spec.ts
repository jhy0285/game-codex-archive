import { expect, test as base, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

type Chapter = 1 | 2 | 3 | 4 | 5
type Stage = 0 | Chapter

type Vector3 = {
  x: number
  y: number
  z: number
}

type ActiveState = {
  active: boolean
  actor?: string
}

type GameState = {
  mode: 'loading' | 'language' | 'title' | 'playing' | 'paused' | 'chapter-complete' | 'ending' | 'error'
  language: 'en' | 'ko'
  chapter: Stage
  camera: { position: Vector3 }
  player: {
    position: Vector3
    velocity: Vector3
    grounded: boolean
    animation: string
  } | null
  echo: {
    mode: 'idle' | 'recording' | 'ready' | 'replaying' | 'holding'
    tick: number
    durationTicks: number
    position?: Vector3
    animation?: string
  }
  timer: number
  pressurePlates: Record<string, ActiveState>
  levers: Record<string, ActiveState>
  doors: Record<string, { open: boolean }>
  elevators: Record<string, { y: number; active: boolean }>
  cores: Record<string, { position: Vector3; carriedBy?: string; receiver: boolean }>
  enemies: Record<string, { position: Vector3; state: string; target?: string; defeated: boolean }>
  objectives: {
    required: string[]
    facts: string[]
    complete: boolean
  }
  score: number
  resetCount: number
  failures: number
  echoesCreated: number
  mobileControlsVisible: boolean
  fullscreen: boolean
  assetStatus: 'loading' | 'kaykit' | 'procedural'
  fixedTick: number
  escapeSeconds: number
  tutorial: { completed: string[]; ready: boolean } | null
  render: { drawCalls: number; triangles: number; pixelRatio: number }
}

type EchoDepthsWindow = Window & {
  render_game_to_text?: () => string
  advanceTime?: (milliseconds: number) => void
  echoDepthsDebug?: {
    selectChapter: (chapter: Chapter) => Promise<void>
    finishTutorial: () => Promise<void>
    setManualStepping: (enabled: boolean) => void
    setInput: (input: Record<string, number | boolean>) => void
    advanceInput: (input: Record<string, number | boolean>, ticks: number) => void
    releaseAllInputs: () => void
    advanceTicks: (ticks: number) => void
    restartChapter: () => Promise<void>
    solutionStep: (step: number) => void
    assetStatus: () => string
  }
}

type RuntimeFailures = {
  consoleErrors: string[]
  pageErrors: string[]
  requestFailures: string[]
}

const REVIEW_DIR = resolve(process.cwd(), 'output', 'browser-review-e2e')
const CHAPTER_NAMES = [
  'THE FIRST DESCENT',
  'COUNTERWEIGHT HALL',
  'THE SPLIT ATRIUM',
  "THE WATCHER'S GALLERY",
  'THE PARADOX WELL',
] as const

const test = base.extend<{ runtimeFailures: RuntimeFailures }>({
  runtimeFailures: [
    async ({ page }, use) => {
      const failures: RuntimeFailures = {
        consoleErrors: [],
        pageErrors: [],
        requestFailures: [],
      }
      page.on('console', (message) => {
        if (message.type() === 'error') failures.consoleErrors.push(message.text())
      })
      page.on('pageerror', (error) => failures.pageErrors.push(error.message))
      page.on('requestfailed', (request) => {
        failures.requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText ?? 'unknown error'}`)
      })

      await use(failures)

      expect(failures.consoleErrors, `console.error calls:\n${failures.consoleErrors.join('\n')}`).toEqual([])
      expect(failures.pageErrors, `page errors:\n${failures.pageErrors.join('\n')}`).toEqual([])
      expect(failures.requestFailures, `failed requests:\n${failures.requestFailures.join('\n')}`).toEqual([])
    },
    { auto: true },
  ],
})

test.beforeAll(async () => {
  await mkdir(REVIEW_DIR, { recursive: true })
})

async function waitForGame(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const gameWindow = window as EchoDepthsWindow
    return typeof gameWindow.render_game_to_text === 'function' && Boolean(gameWindow.echoDepthsDebug)
  })
  await expect.poll(() => state(page).then((value) => value.assetStatus)).toBe('kaykit')
}

async function state(page: Page): Promise<GameState> {
  await page.waitForFunction(() => typeof (window as EchoDepthsWindow).render_game_to_text === 'function')
  return page.evaluate(() => {
    const render = (window as EchoDepthsWindow).render_game_to_text
    if (!render) throw new Error('render_game_to_text is unavailable')
    return JSON.parse(render()) as GameState
  })
}

async function gotoLanguageScreen(page: Page): Promise<void> {
  await page.goto('/')
  await waitForGame(page)
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('language')
  await expect(page.locator('#language-screen')).toBeVisible()
}

async function startEnglish(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('/')
  await waitForGame(page)
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('title')
  await expect(page.locator('#title-screen')).toBeVisible()
  await page.locator('#start-button').click()
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.chapter}`)).toBe('playing:0')
  await expect(page.locator('#tutorial-panel')).toBeVisible()
  await page.evaluate(() => {
    const debug = (window as EchoDepthsWindow).echoDepthsDebug
    if (!debug) throw new Error('echoDepthsDebug is unavailable')
    void debug.finishTutorial()
  })
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.chapter}`)).toBe('playing:1')
  await expect(page.locator('#hud')).toBeVisible()
}

async function setManualStepping(page: Page, enabled: boolean): Promise<void> {
  await page.evaluate((manual) => {
    const debug = (window as EchoDepthsWindow).echoDepthsDebug
    if (!debug) throw new Error('echoDepthsDebug is unavailable')
    debug.setManualStepping(manual)
  }, enabled)
}

async function advanceTicks(page: Page, ticks: number): Promise<void> {
  await page.evaluate((count) => {
    const debug = (window as EchoDepthsWindow).echoDepthsDebug
    if (!debug) throw new Error('echoDepthsDebug is unavailable')
    debug.advanceTicks(count)
  }, ticks)
}

async function holdKeysForTicks(page: Page, keys: readonly string[], ticks: number): Promise<void> {
  for (const key of keys) await page.keyboard.down(key)
  try {
    await advanceTicks(page, ticks)
  } finally {
    for (const key of [...keys].reverse()) await page.keyboard.up(key)
  }
}

async function advanceDebugInput(page: Page, input: Record<string, number | boolean>, ticks = 1): Promise<void> {
  await page.evaluate(({ frame, count }) => {
    const debug = (window as EchoDepthsWindow).echoDepthsDebug
    if (!debug) throw new Error('echoDepthsDebug is unavailable')
    debug.advanceInput(frame, count)
  }, { frame: input, count: ticks })
}

async function jumpPlayerTowards(page: Page, target: Pick<Vector3, 'x' | 'z'>, ticks: number): Promise<void> {
  const current = await state(page)
  const player = current.player
  if (!player) throw new Error('Player is unavailable')
  const deltaX = target.x - player.position.x
  const deltaZ = target.z - player.position.z
  const distanceToTarget = Math.hypot(deltaX, deltaZ)
  if (distanceToTarget < 0.001) return
  const desiredX = deltaX / distanceToTarget
  const desiredZ = deltaZ / distanceToTarget
  await advanceDebugInput(page, {
    moveX: Math.SQRT1_2 * (desiredX - desiredZ),
    moveZ: -Math.SQRT1_2 * (desiredX + desiredZ),
    jump: true,
  }, ticks)
}

async function steerPlayerTo(page: Page, target: Pick<Vector3, 'x' | 'z'>, maximumTicks = 420): Promise<void> {
  const result = await page.evaluate(({ destination, maximum }) => {
    const gameWindow = window as EchoDepthsWindow
    const debug = gameWindow.echoDepthsDebug
    const render = gameWindow.render_game_to_text
    if (!debug || !render) throw new Error('Echo Depths test APIs are unavailable')
    const burstTicks = 4
    for (let elapsed = 0; elapsed < maximum; elapsed += burstTicks) {
      const current = JSON.parse(render()) as GameState
      if (!current.player || current.mode !== 'playing') return { arrived: false, distance: Number.POSITIVE_INFINITY }
      const deltaX = destination.x - current.player.position.x
      const deltaZ = destination.z - current.player.position.z
      const distanceToTarget = Math.hypot(deltaX, deltaZ)
      if (distanceToTarget < 0.24) return { arrived: true, distance: distanceToTarget }
      const desiredX = deltaX / distanceToTarget
      const desiredZ = deltaZ / distanceToTarget
      debug.advanceInput({
        moveX: Math.SQRT1_2 * (desiredX - desiredZ),
        moveZ: -Math.SQRT1_2 * (desiredX + desiredZ),
      }, burstTicks)
    }
    const current = JSON.parse(render()) as GameState
    const player = current.player
    return { arrived: false, distance: player ? Math.hypot(destination.x - player.position.x, destination.z - player.position.z) : Number.POSITIVE_INFINITY }
  }, { destination: target, maximum: maximumTicks })
  expect(result.arrived, `Player did not reach ${target.x}, ${target.z}; final distance ${result.distance}`).toBe(true)
}

async function settleOnGround(page: Page): Promise<GameState> {
  for (let tick = 0; tick < 120; tick += 1) {
    const current = await state(page)
    if (current.player?.grounded) return current
    await advanceTicks(page, 1)
  }
  const current = await state(page)
  expect(current.player?.grounded, `Player did not become grounded in chapter ${current.chapter}`).toBe(true)
  return current
}

async function selectChapter(page: Page, chapter: Chapter): Promise<void> {
  await page.evaluate(async (value) => {
    const debug = (window as EchoDepthsWindow).echoDepthsDebug
    if (!debug) throw new Error('echoDepthsDebug is unavailable')
    await debug.selectChapter(value as Chapter)
  }, chapter)
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.chapter}`)).toBe(`playing:${chapter}`)
}

async function applySolutionFact(page: Page, step: number): Promise<void> {
  await page.evaluate((value) => {
    const debug = (window as EchoDepthsWindow).echoDepthsDebug
    if (!debug) throw new Error('echoDepthsDebug is unavailable')
    debug.solutionStep(value)
  }, step)
}

async function solveCurrentChapter(page: Page): Promise<string[]> {
  const before = await state(page)
  const required = [...before.objectives.required]
  expect(required.length).toBeGreaterThan(0)

  const snapshots = await page.evaluate((factCount) => {
    const gameWindow = window as EchoDepthsWindow
    const debug = gameWindow.echoDepthsDebug
    const render = gameWindow.render_game_to_text
    if (!debug || !render) throw new Error('Echo Depths test APIs are unavailable')
    const results: GameState[] = []
    for (let step = 0; step <= factCount; step += 1) {
      debug.solutionStep(step)
      results.push(JSON.parse(render()) as GameState)
    }
    return results
  }, required.length)

  for (let step = 0; step < required.length; step += 1) {
    const fact = required[step]
    if (!fact) throw new Error(`Chapter ${before.chapter} has an empty required fact at step ${step}`)
    expect(snapshots[step]?.objectives.facts).toContain(fact)
  }

  expect(snapshots.at(-1)?.objectives.complete).toBe(true)
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('chapter-complete')
  await expect(page.locator('#chapter-complete')).toBeVisible()
  await expect(page.locator('#complete-title')).toHaveText(CHAPTER_NAMES[before.chapter - 1])
  return required
}

function distance(a: Vector3, b: Vector3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

async function assertNoDocumentOverflow(page: Page): Promise<void> {
  const layout = await page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    const width = Math.max(root.scrollWidth, body.scrollWidth)
    const height = Math.max(root.scrollHeight, body.scrollHeight)
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentWidth: width,
      documentHeight: height,
      canvasWidth: canvas?.getBoundingClientRect().width ?? 0,
      canvasHeight: canvas?.getBoundingClientRect().height ?? 0,
    }
  })
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1)
  expect(layout.documentHeight).toBeLessThanOrEqual(layout.viewportHeight + 1)
  expect(layout.canvasWidth).toBeCloseTo(layout.viewportWidth, 0)
  expect(layout.canvasHeight).toBeCloseTo(layout.viewportHeight, 0)
}

for (const selection of [
  { language: 'en' as const, label: 'English', start: 'Begin descent', controls: 'Controls and echo rule', settings: 'Settings', oppositeLanguage: 'ko' as const, oppositeSettings: '설정' },
  { language: 'ko' as const, label: '한국어', start: '하강 시작', controls: '조작법과 에코 규칙', settings: '설정', oppositeLanguage: 'en' as const, oppositeSettings: 'Settings' },
]) {
  test(`${selection.label} language selection localizes the title and starts the game`, async ({ page }) => {
    test.setTimeout(120_000)
    await gotoLanguageScreen(page)

    await page.getByRole('button', { name: selection.label }).click()
    await expect.poll(() => state(page).then((value) => `${value.mode}:${value.language}`)).toBe(`title:${selection.language}`)
    await expect(page.locator('html')).toHaveAttribute('lang', selection.language)
    await expect(page.locator('#start-button')).toHaveText(selection.start)
    await expect(page.locator('.controls-card summary')).toHaveText(selection.controls)

    await page.locator('#title-settings').click()
    await expect(page.locator('#settings-screen')).toBeVisible()
    await expect(page.locator('#settings-heading')).toHaveText(selection.settings)
    await expect(page.locator('.settings-group--controls')).toBeVisible()
    await expect(page.locator('.control-grid > div')).toHaveCount(9)
    await expect(page.locator(`[data-settings-language="${selection.language}"]`)).toHaveAttribute('aria-pressed', 'true')
    const settingsTargets = await page.locator('#settings-screen button').evaluateAll((buttons) => buttons.map((button) => {
      const bounds = button.getBoundingClientRect()
      return { width: bounds.width, height: bounds.height }
    }))
    expect(settingsTargets.every((target) => target.width >= 48 && target.height >= 48)).toBe(true)
    await page.locator('#settings-sound').click()
    await expect(page.locator('#settings-sound')).toHaveAttribute('aria-pressed', 'false')
    await page.locator('#settings-sound').click()
    await expect(page.locator('#settings-sound')).toHaveAttribute('aria-pressed', 'true')
    await page.locator(`[data-settings-language="${selection.oppositeLanguage}"]`).click()
    await expect(page.locator('html')).toHaveAttribute('lang', selection.oppositeLanguage)
    await expect(page.locator('#settings-heading')).toHaveText(selection.oppositeSettings)
    await page.locator(`[data-settings-language="${selection.language}"]`).click()
    await expect.poll(() => state(page).then((value) => `${value.mode}:${value.language}`)).toBe(`title:${selection.language}`)
    const settingsScreenshot = await page.screenshot({
      path: resolve(REVIEW_DIR, `settings-${selection.language}-title.png`),
      fullPage: true,
    })
    expect(settingsScreenshot.byteLength).toBeGreaterThan(20_000)
    await page.locator('#settings-close').click()
    await expect(page.locator('#title-screen')).toBeVisible()

    await page.locator('.controls-card summary').click()
    await expect(page.locator('.controls-card')).toHaveAttribute('open', '')

    await page.locator('#start-button').click()
    await expect.poll(() => state(page).then((value) => value.mode)).toBe('playing')
    await expect(page.locator('#hud')).toBeVisible()
    await expect(page.locator('#objective-text')).not.toBeEmpty()
    await page.keyboard.press('Escape')
    await expect.poll(() => state(page).then((value) => value.mode)).toBe('paused')
    await page.locator('#pause-settings').click()
    await expect(page.locator('#settings-screen')).toBeVisible()
    await expect(page.locator('#settings-heading')).toHaveText(selection.settings)
    await page.locator('#settings-close').click()
    await expect(page.locator('#pause-screen')).toBeVisible()
    await page.locator('#resume-button').click()
    await expect.poll(() => state(page).then((value) => value.mode)).toBe('playing')
  })
}

test('real keyboard input moves, jumps, interacts, and creates a deterministic echo', async ({ page }) => {
  test.setTimeout(90_000)
  await startEnglish(page)
  await settleOnGround(page)
  await page.locator('#game-canvas').focus()

  const start = await state(page)
  expect(start.player).not.toBeNull()
  await page.keyboard.down('w')
  await advanceTicks(page, 30)
  await page.keyboard.up('w')
  const moved = await settleOnGround(page)
  expect(moved.player).not.toBeNull()
  expect(distance(moved.player!.position, start.player!.position)).toBeGreaterThan(0.55)

  const groundY = moved.player!.position.y
  await page.keyboard.down('Space')
  const jumped = await page.evaluate(() => {
    const gameWindow = window as EchoDepthsWindow
    const debug = gameWindow.echoDepthsDebug
    const render = gameWindow.render_game_to_text
    if (!debug || !render) throw new Error('Echo Depths test APIs are unavailable')
    debug.advanceTicks(1)
    return JSON.parse(render()) as GameState
  })
  await page.keyboard.up('Space')
  expect(jumped.player).not.toBeNull()
  expect(jumped.player!.velocity.y).toBeGreaterThan(0)
  expect(jumped.player!.position.y).toBeGreaterThan(groundY)
  expect(jumped.player!.animation).toBe('Jump')

  await selectChapter(page, 1)
  await settleOnGround(page)
  await page.locator('#game-canvas').focus()
  await expect(page.locator('#objective-text')).toHaveText('Open the approach lever.')
  await page.keyboard.down('d')
  await advanceTicks(page, 24)
  await page.keyboard.up('d')
  await expect(page.locator('#interact-prompt')).toHaveText('E · Activate lever')
  await page.keyboard.down('e')
  await advanceTicks(page, 1)
  await page.keyboard.up('e')
  await expect.poll(() => state(page).then((value) => value.objectives.facts)).toContain('tutorial-lever')
  await expect(page.locator('#feedback')).toHaveText(
    'Entry lever latched. Press R, walk to the cyan pressure seal, then press R again so the echo remains there.',
  )
  await expect(page.locator('#feedback')).toHaveClass(/feedback--visible/)
  await expect(page.locator('#objective-text')).toHaveText('Leave the echo on the lower pressure seal.')

  await selectChapter(page, 3)
  await advanceTicks(page, 4)
  await page.locator('#game-canvas').focus()
  await page.keyboard.down('d')
  await advanceTicks(page, 24)
  await page.keyboard.up('d')
  const nearCore = await state(page)
  expect(nearCore.player).not.toBeNull()
  expect(nearCore.cores['memory-core']).toBeDefined()
  expect(distance(nearCore.player!.position, nearCore.cores['memory-core']!.position)).toBeLessThan(1.85)

  await page.keyboard.down('e')
  await advanceTicks(page, 1)
  await page.keyboard.up('e')
  await expect.poll(() => state(page).then((value) => value.cores['memory-core']?.carriedBy)).toBe('player')

  await page.keyboard.press('r')
  await expect.poll(() => state(page).then((value) => value.echo.mode)).toBe('recording')
  await page.keyboard.down('a')
  await advanceTicks(page, 12)
  await page.keyboard.up('a')
  await page.keyboard.press('r')
  await expect.poll(() => state(page).then((value) => value.echoesCreated)).toBe(1)
  await expect.poll(() => state(page).then((value) => value.echo.mode)).toMatch(/replaying|holding/)

  const echoed = await state(page)
  expect(echoed.chapter).toBe(3)
  expect(echoed.echo.durationTicks).toBeGreaterThan(0)
  expect(echoed.echo.position).toBeDefined()
})

test('campaign chapter select keeps every stage available before any clear', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('/')
  await waitForGame(page)
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('title')
  await page.locator('#chapter-button').click()

  for (const chapter of [1, 2, 3, 4, 5] as const) {
    await expect(page.locator(`[data-chapter="${chapter}"]`)).toBeEnabled()
  }
})

test('PC mouse drag eases camera height without interrupting keyboard movement', async ({ page }) => {
  await startEnglish(page)
  const heightBeforeDrag = (await state(page)).camera.position.y
  const canvas = page.locator('#game-canvas')
  const bounds = await canvas.boundingBox()
  if (!bounds) throw new Error('game canvas has no layout bounds')
  const dragX = bounds.x + bounds.width * 0.58
  const dragY = bounds.y + bounds.height * 0.56

  await page.mouse.move(dragX, dragY)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(dragX, dragY + 150, { steps: 6 })
  await page.mouse.up({ button: 'middle' })

  await expect.poll(() => state(page).then((value) => value.camera.position.y)).toBeGreaterThan(heightBeforeDrag + 1)
  const playerBeforeMove = (await state(page)).player?.position
  if (!playerBeforeMove) throw new Error('player state is unavailable')
  await page.keyboard.down('w')
  try {
    await expect.poll(async () => {
      const player = (await state(page)).player
      if (!player) throw new Error('player state is unavailable')
      return Math.hypot(player.position.x - playerBeforeMove.x, player.position.z - playerBeforeMove.z)
    }).toBeGreaterThan(0.4)
  } finally {
    await page.keyboard.up('w')
  }
})

test('the playable orientation stage teaches PC controls before Chapter 1', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('/')
  await waitForGame(page)
  await page.locator('#start-button').click()
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.chapter}`)).toBe('playing:0')
  await expect(page.locator('#tutorial-panel')).toBeVisible()
  const tutorialScreenshot = await page.screenshot({
    path: resolve(REVIEW_DIR, 'tutorial-pc.png'),
    fullPage: true,
  })
  expect(tutorialScreenshot.byteLength).toBeGreaterThan(20_000)
  await setManualStepping(page, true)
  await settleOnGround(page)
  await page.locator('#game-canvas').focus()

  await holdKeysForTicks(page, ['d'], 12)
  await holdKeysForTicks(page, ['q'], 1)
  await holdKeysForTicks(page, ['Space'], 2)
  await steerPlayerTo(page, { x: -2.4, z: 0.2 })
  await holdKeysForTicks(page, ['e'], 1)
  await steerPlayerTo(page, { x: 1.1, z: 0.8 })
  await holdKeysForTicks(page, ['e'], 1)
  const carriedScreenshot = await page.screenshot({
    path: resolve(REVIEW_DIR, 'tutorial-carried-crate-pc.png'),
    fullPage: true,
  })
  expect(carriedScreenshot.byteLength).toBeGreaterThan(20_000)
  await page.keyboard.press('r')
  await advanceTicks(page, 8)
  await page.keyboard.press('r')
  await advanceTicks(page, 1)

  await expect.poll(() => state(page).then((value) => value.tutorial?.ready)).toBe(true)
  await expect(page.locator('#tutorial-steps li.is-complete')).toHaveCount(6)
  await expect(page.locator('#tutorial-continue')).toBeVisible()
  await page.locator('#tutorial-continue').click()
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.chapter}`)).toBe('playing:1')
})

test('PC rendering caps pixel cost while retaining a bounded scene budget', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await startEnglish(page)
  await advanceTicks(page, 4)
  const performance = (await state(page)).render

  expect(performance.pixelRatio).toBeLessThanOrEqual(1.5)
  expect(performance.drawCalls).toBeGreaterThan(0)
  expect(performance.drawCalls).toBeLessThan(300)
  expect(performance.triangles).toBeGreaterThan(0)
  expect(performance.triangles).toBeLessThan(300_000)
})

test('Chapter 1 route latches the lever, holds the echo plate, and clears the exit', async ({ page }) => {
  test.setTimeout(90_000)
  await startEnglish(page)
  await setManualStepping(page, true)
  await settleOnGround(page)

  await steerPlayerTo(page, { x: -3.9, z: 0.4 })
  await expect(page.locator('#interact-prompt')).toHaveText('E · Activate lever')
  await advanceDebugInput(page, { interact: true })
  await expect.poll(() => state(page).then((value) => value.objectives.facts)).toContain('tutorial-lever')

  await advanceDebugInput(page, { echo: true })
  await steerPlayerTo(page, { x: -0.9, z: 3.2 })
  await advanceDebugInput(page, {}, 8)
  await expect.poll(() => state(page).then((value) => value.pressurePlates['echo-plate']?.active)).toBe(true)
  await advanceDebugInput(page, { echo: true })
  await expect.poll(() => state(page).then((value) => value.echoesCreated)).toBe(1)
  await advanceDebugInput(page, {}, 180)

  const openedGate = await state(page)
  expect(openedGate.echo.mode).toBe('holding')
  expect(openedGate.pressurePlates['echo-plate']?.active).toBe(true)
  expect(openedGate.pressurePlates['echo-plate']?.actor).toBe('echo')
  expect(openedGate.doors['first-door']?.open).toBe(true)
  expect(openedGate.objectives.facts).toContain('echo-plate')
  await expect(page.locator('#objective-text')).toHaveText('Reach the open passage.')

  await steerPlayerTo(page, { x: 2.8, z: 0.4 })
  await jumpPlayerTowards(page, { x: 5.1, z: -0.2 }, 30)
  await advanceDebugInput(page, {}, 30)
  await steerPlayerTo(page, { x: 5.4, z: -0.2 })
  await steerPlayerTo(page, { x: 8.55, z: -1.2 })
  await expect(page.locator('#interact-prompt')).toHaveText('E · Enter passage')
  await advanceDebugInput(page, { interact: true })
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('chapter-complete')
})

test('Chapter 1 locked gate cannot be jumped onto the upper passage', async ({ page }) => {
  test.setTimeout(90_000)
  await startEnglish(page)
  await setManualStepping(page, true)
  await settleOnGround(page)

  await advanceDebugInput(page, { moveX: 1 }, 60)
  await advanceDebugInput(page, { moveZ: -1 }, 16)
  await advanceDebugInput(page, { moveX: 1, moveZ: -1 }, 42)
  await advanceDebugInput(page, { moveX: 1, moveZ: -1, jump: true }, 28)
  await advanceDebugInput(page, {}, 30)

  const blocked = await state(page)
  expect(blocked.doors['first-door']?.open).toBe(false)
  expect(blocked.player?.position.y).toBeLessThan(2.4)
  await expect(page.locator('#interact-prompt')).not.toHaveText('E · Enter passage')
})

test('Chapter 2 route holds the lift, drops cargo, and clears the exit', async ({ page }) => {
  test.setTimeout(180_000)
  await startEnglish(page)
  await setManualStepping(page, true)
  await selectChapter(page, 2)
  await settleOnGround(page)
  await expect(page.locator('#objective-text')).toHaveText('Let the echo hold the lower lift lever.')

  await advanceDebugInput(page, { echo: true })
  await steerPlayerTo(page, { x: -3.6, z: -1.2 })
  await expect(page.locator('#interact-prompt')).toHaveText('E · Activate lever')
  await advanceDebugInput(page, { interact: true }, 2)
  await advanceDebugInput(page, { echo: true })
  await expect.poll(() => state(page).then((value) => value.echoesCreated)).toBe(1)

  await steerPlayerTo(page, { x: 0.2, z: -0.7 })
  await advanceDebugInput(page, {}, 180)
  const elevated = await state(page)
  expect(elevated.levers['lift-lever']?.actor).toBe('echo')
  expect(elevated.elevators['counter-elevator']?.y ?? 0).toBeGreaterThan(3.8)
  expect(elevated.objectives.facts).toEqual(expect.arrayContaining(['lift-lever-echo', 'elevator-ridden']))
  await expect(page.locator('#objective-text')).toHaveText('Carry the counterweight to the edge and set it down onto the lower plate.')

  await steerPlayerTo(page, { x: 5.05, z: 1.55 })
  await expect(page.locator('#interact-prompt')).toHaveText('E · Lift object')
  await advanceDebugInput(page, { interact: true })
  await expect(page.locator('#interact-prompt')).toHaveText('E · Set down')
  await steerPlayerTo(page, { x: 1.8, z: 2.9 })
  await advanceDebugInput(page, { cameraTurn: 1 }, 48)
  await advanceDebugInput(page, { interact: true })
  await advanceDebugInput(page, {}, 180)

  await expect.poll(() => state(page).then((value) => value.pressurePlates['weight-plate']?.active)).toBe(true)
  const openedGate = await state(page)
  expect(openedGate.doors['counter-door']?.open).toBe(true)
  expect(openedGate.objectives.facts).toContain('cargo-plate')
  await expect(page.locator('#objective-text')).toHaveText('Reach the open passage.')

  await advanceDebugInput(page, { cameraTurn: -1 }, 48)
  await steerPlayerTo(page, { x: 8.05, z: -0.5 })
  await expect(page.locator('#interact-prompt')).toHaveText('E · Enter passage')
  await advanceDebugInput(page, { interact: true })
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('chapter-complete')
})

test('all five rendered chapters transition to the ending and replay fully resets campaign state', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startEnglish(page)

  await page.keyboard.press('r')
  await expect.poll(() => state(page).then((value) => value.echo.mode)).toBe('recording')
  await advanceTicks(page, 8)
  await page.keyboard.press('r')
  await expect.poll(() => state(page).then((value) => value.echoesCreated)).toBe(1)
  await expect.poll(() => state(page).then((value) => value.echo.position)).toBeDefined()
  const echoScreenshot = await page.screenshot({ path: resolve(REVIEW_DIR, 'echo-replaying.png'), fullPage: true })
  expect(echoScreenshot.byteLength).toBeGreaterThan(20_000)
  await page.keyboard.press('Escape')
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('paused')
  await page.locator('#restart-button').click()
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.resetCount}`)).toBe('playing:1')

  for (let chapter = 1 as Chapter; chapter <= 5; chapter = (chapter + 1) as Chapter) {
    await expect.poll(() => state(page).then((value) => `${value.mode}:${value.chapter}`)).toBe(`playing:${chapter}`)
    await expect(page.locator('#chapter-name')).toHaveText(CHAPTER_NAMES[chapter - 1])
    await advanceTicks(page, 2)
    const screenshot = await page.screenshot({
      path: resolve(REVIEW_DIR, `chapter-${chapter}.png`),
      fullPage: true,
    })
    expect(screenshot.byteLength).toBeGreaterThan(20_000)

    if (chapter === 5) {
      const required = (await state(page)).objectives.required
      for (let step = 0; step < required.length; step += 1) await applySolutionFact(page, step)
      await expect.poll(() => state(page).then((value) => value.escapeSeconds)).toBeGreaterThan(0)
      await advanceTicks(page, 2_090)
      await page.keyboard.down('w')
      await advanceTicks(page, 110)
      await expect.poll(() => state(page).then((value) => value.failures)).toBe(1)
      await expect.poll(() => state(page).then((value) => `${value.mode}:${value.chapter}`)).toBe('playing:5')
      const rewound = await settleOnGround(page)
      await advanceTicks(page, 12)
      const released = await state(page)
      await page.keyboard.up('w')
      expect(rewound.player).not.toBeNull()
      expect(released.player).not.toBeNull()
      expect(Math.hypot(
        released.player!.position.x - rewound.player!.position.x,
        released.player!.position.z - rewound.player!.position.z,
      )).toBeLessThan(0.08)
    }

    await solveCurrentChapter(page)
    if (chapter < 5) {
      await page.locator('#continue-button').click()
      await expect.poll(() => state(page).then((value) => `${value.mode}:${value.chapter}`)).toBe(`playing:${chapter + 1}`)
    }
  }

  await page.locator('#continue-button').click()
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('ending')
  await expect(page.locator('#ending-screen')).toBeVisible()
  await expect(page.locator('#ending-stats .ending-stat')).toHaveCount(5)
  await expect(page.locator('#final-rank')).toHaveText(/^[SABC]$/)
  const endingScreenshot = await page.screenshot({ path: resolve(REVIEW_DIR, 'ending.png'), fullPage: true })
  expect(endingScreenshot.byteLength).toBeGreaterThan(20_000)

  const completed = await state(page)
  expect(completed.echoesCreated).toBe(1)
  expect(completed.failures).toBe(1)
  expect(completed.resetCount).toBe(1)
  expect(completed.timer).toBeGreaterThan(30_000)

  await page.locator('#replay-button').click()
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.chapter}`)).toBe('playing:0')
  await page.locator('#tutorial-skip').click()
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.chapter}`)).toBe('playing:1')
  const replayed = await state(page)
  expect(replayed.timer).toBeLessThan(3_000)
  expect(replayed.echoesCreated).toBe(0)
  expect(replayed.failures).toBe(0)
  expect(replayed.resetCount).toBe(0)
  expect(replayed.echo).toMatchObject({ mode: 'idle', tick: 0, durationTicks: 0 })
  expect(replayed.objectives.facts).toEqual([])
  expect(replayed.objectives.complete).toBe(false)
  expect(Object.values(replayed.pressurePlates).every((entry) => !entry.active)).toBe(true)
  expect(Object.values(replayed.levers).every((entry) => !entry.active)).toBe(true)
  expect(Object.values(replayed.doors).every((entry) => !entry.open)).toBe(true)
  expect(replayed.elevators).toEqual({})
  expect(replayed.cores).toEqual({})
  expect(replayed.enemies).toEqual({})
  expect(replayed.player?.position.x).toBeCloseTo(-5.4, 1)
  expect(replayed.player?.position.z).toBeCloseTo(3.8, 1)

  await page.keyboard.press('Escape')
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('paused')
  await page.locator('#resume-button').click()
  await page.keyboard.press('r')
  await expect.poll(() => state(page).then((value) => value.echo.mode)).toBe('recording')
})

test('responsive layouts fit four required viewports without document overflow', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await waitForGame(page)

  await assertNoDocumentOverflow(page)
  await expect(page.locator('#rotation-screen')).toBeVisible()

  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('#rotation-screen')).toBeHidden()
  await assertNoDocumentOverflow(page)
  await page.locator('#start-button').click()
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('playing')
  await expect.poll(() => state(page).then((value) => value.mobileControlsVisible)).toBe(true)

  for (const viewport of [
    { width: 844, height: 390 },
    { width: 1_024, height: 768 },
    { width: 1_440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await assertNoDocumentOverflow(page)
    await expect(page.locator('#hud')).toBeVisible()
  }
})

test.describe('touch layouts', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

  test('portrait shows a localized rotation gate and landscape reveals safe multitouch controls', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'ko'))
    await page.goto('/')
    await waitForGame(page)

    await expect(page.locator('#rotation-screen')).toBeVisible()
    await expect(page.locator('#rotation-screen h2')).toHaveText('화면을 가로로 돌려주세요')
    await expect(page.locator('#mobile-controls')).toBeHidden()
    await assertNoDocumentOverflow(page)
    const portrait = await page.screenshot({ path: resolve(REVIEW_DIR, 'mobile-portrait.png'), fullPage: true })
    expect(portrait.byteLength).toBeGreaterThan(10_000)

    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.locator('#rotation-screen')).toBeHidden()
    await page.locator('#start-button').click()
    await expect.poll(() => state(page).then((value) => value.mode)).toBe('playing')
    await expect(page.locator('#mobile-controls')).toBeVisible()

    const actionSizes = await page.locator('.touch-actions button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const bounds = button.getBoundingClientRect()
        return { width: bounds.width, height: bounds.height }
      }),
    )
    expect(actionSizes).toHaveLength(6)
    for (const size of actionSizes) {
      expect(size.width).toBeGreaterThanOrEqual(48)
      expect(size.height).toBeGreaterThanOrEqual(48)
    }

    const before = await settleOnGround(page)
    const moveBounds = await page.locator('#move-zone').boundingBox()
    const jumpBounds = await page.locator('[data-action="jump"]').boundingBox()
    if (!moveBounds || !jumpBounds) throw new Error('Touch control bounds are unavailable')

    await page.locator('#move-zone').dispatchEvent('pointerdown', {
      pointerId: 31,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: moveBounds.x + moveBounds.width * 0.82,
      clientY: moveBounds.y + moveBounds.height * 0.5,
    })
    await page.locator('[data-action="jump"]').tap()
    const airborne = await page.evaluate(() => {
      const gameWindow = window as EchoDepthsWindow
      const debug = gameWindow.echoDepthsDebug
      const render = gameWindow.render_game_to_text
      if (!debug || !render) throw new Error('Echo Depths test APIs are unavailable')
      debug.advanceTicks(1)
      return JSON.parse(render()) as GameState
    })
    expect(airborne.player?.velocity.y).toBeGreaterThan(0)
    expect(airborne.player?.animation).toBe('Jump')
    await advanceTicks(page, 10)
    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 31, pointerType: 'touch', bubbles: true }))
    })

    const after = await state(page)
    expect(before.player).not.toBeNull()
    expect(after.player).not.toBeNull()
    expect(distance(after.player!.position, before.player!.position)).toBeGreaterThan(0.1)
    expect(airborne.player!.position.y).toBeGreaterThan(before.player!.position.y)
    await expect(page.locator('#move-stick')).toHaveCSS('--stick-x', '0.00px')
    await expect(page.locator('#move-stick')).toHaveCSS('--stick-y', '0.00px')
    await assertNoDocumentOverflow(page)
    const landscape = await page.screenshot({ path: resolve(REVIEW_DIR, 'mobile-landscape.png'), fullPage: true })
    expect(landscape.byteLength).toBeGreaterThan(10_000)
  })
})

test('fullscreen buttons remain rejection-safe in settings, on title, and in-game HUD', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('/')
  await waitForGame(page)
  const rejectFullscreen = () => page.evaluate(() => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: () => Promise.reject(new DOMException('Denied by browser policy', 'NotAllowedError')),
    })
  })

  await rejectFullscreen()
  await page.locator('#title-settings').click()
  await page.locator('#settings-fullscreen').click()
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.fullscreen}`)).toBe('title:false')
  await page.locator('#settings-close').click()
  await page.locator('#title-fullscreen').click()
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.fullscreen}`)).toBe('title:false')
  await page.locator('#start-button').click()
  await expect.poll(() => state(page).then((value) => value.mode)).toBe('playing')
  await rejectFullscreen()
  await page.locator('#hud-fullscreen').click()
  await expect.poll(() => state(page).then((value) => `${value.mode}:${value.fullscreen}`)).toBe('playing:false')
})

test('KayKit manifest and every shipped runtime model respond successfully', async ({ request }) => {
  const manifestResponse = await request.get('/assets/kaykit/manifest.json')
  expect(manifestResponse.status()).toBe(200)
  const manifest = await manifestResponse.json() as {
    character: string
    animations: string[]
    environment: string[]
    resources: string[]
  }
  const urls = [
    manifest.character,
    ...manifest.animations,
    ...manifest.environment,
    ...manifest.resources,
    '/assets/kaykit/environment/dungeon_texture.png',
    '/assets/kaykit/environment/floor_tile_large.bin',
    '/assets/kaykit/resources/resource_bits_texture.png',
    '/assets/kaykit/resources/Parts_Cog.bin',
  ]
  expect(new Set(urls).size).toBe(urls.length)

  const results = await Promise.all(urls.map(async (url) => {
    const response = await request.get(url)
    return { url, status: response.status(), bytes: (await response.body()).byteLength }
  }))
  expect(results.filter((result) => result.status !== 200)).toEqual([])
  expect(results.filter((result) => result.bytes === 0)).toEqual([])
})
