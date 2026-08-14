import { expect, test, type Page } from '@playwright/test'

const VISUAL_OUTPUT_DIR = 'output/playwright-visual-overhaul'
const GAME_ORIGIN = 'http://127.0.0.1:4173'
const ASSET_WARNING_PATTERN =
  /\b(?:texture|frame|asset|webgl|404)\b|context(?:\s|-)?lost|not(?:\s|-)?found/i
const BENIGN_READBACK_WARNING_PATTERN =
  /GL Driver Message .*GPU stall due to ReadPixels/i

type GameState = {
  mode: 'tutorial' | 'playing' | 'sector-clear' | 'victory'
  sector: { index: number; count: number; id: string }
  loop: number
  totalLocks: number
  remainingMs: number
  recording: boolean
  recordingSamples: number
  tutorial: {
    visible: boolean
    dismissControls: Array<'e' | 'enter' | 'pointer'>
  }
  restartCount: number
  fullscreen: boolean
  player: {
    x: number
    y: number
    inGoal: boolean
    facing: 'up' | 'down' | 'left' | 'right'
    moving: boolean
    animationState: 'idle' | 'walk' | 'turn'
    animationFrame: number
  }
  ghost: {
    visible: boolean
    samples: number
    replayDurationMs?: number
    holdingFinalPosition: boolean
    facing: 'up' | 'down' | 'left' | 'right'
    moving: boolean
    animationState:
      | 'idle'
      | 'turn'
      | 'echo-replay'
      | 'echo-hold'
      | 'hidden'
    animationFrame: number
  }
  switches: Array<{
    id: string
    active: boolean
    occupiedBy: 'player' | 'ghost' | null
  }>
  relay: { requiredMs: number; chargeMs: number; latched: boolean }
  door: { open: boolean }
}

const readState = async (page: Page) => {
  await page.waitForFunction(
    () => typeof window.render_game_to_text === 'function',
  )
  return page.evaluate<GameState>(() => {
    window.advanceTime(0)
    return JSON.parse(window.render_game_to_text())
  })
}

const advance = async (
  page: Page,
  milliseconds: number,
) => page.evaluate((ms) => window.advanceTime(ms), milliseconds)

const openPlayingGame = async (page: Page) => {
  await page.goto('/')
  const tutorial = await readState(page)
  expect(tutorial).toMatchObject({
    mode: 'tutorial',
    recording: false,
    recordingSamples: 1,
    tutorial: {
      visible: true,
      dismissControls: ['e', 'enter', 'pointer'],
    },
  })
  await page.keyboard.press('Enter')
  const playing = await readState(page)
  expect(playing).toMatchObject({
    mode: 'playing',
    loop: 1,
    totalLocks: 0,
    remainingMs: 20_000,
    recording: true,
    recordingSamples: 1,
    tutorial: { visible: false },
  })
  return playing
}

const collectRuntimeFailures = (page: Page) => {
  const failures: string[] = []

  page.on('pageerror', (error) => {
    failures.push(`[pageerror] ${error.message}`)
  })
  page.on('console', (message) => {
    const messageText = message.text()
    if (message.type() === 'error') {
      failures.push(`[console.error] ${messageText}`)
    } else if (
      message.type() === 'warning' &&
      ASSET_WARNING_PATTERN.test(messageText) &&
      !BENIGN_READBACK_WARNING_PATTERN.test(messageText)
    ) {
      failures.push(`[console.warning] ${messageText}`)
    }
  })
  page.on('requestfailed', (request) => {
    failures.push(
      `[requestfailed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown failure'}`,
    )
  })
  page.on('response', (response) => {
    const responseUrl = new URL(response.url())
    if (responseUrl.origin === GAME_ORIGIN && response.status() >= 400) {
      failures.push(
        `[http ${response.status()}] ${response.request().method()} ${response.url()}`,
      )
    }
  })

  return failures
}

const expectNoRuntimeFailures = (failures: string[]) => {
  expect(
    failures,
    failures.length > 0
      ? `Unexpected browser/runtime failures:\n${failures.join('\n')}`
      : 'No browser/runtime failures expected',
  ).toEqual([])
}

const captureCanvas = (page: Page, name: string) =>
  page.locator('canvas').screenshot({
    path: `${VISUAL_OUTPUT_DIR}/${name}.png`,
  })

test('freezes the first-load tutorial and begins with E', async ({ page }) => {
  test.setTimeout(60_000)
  const runtimeFailures = collectRuntimeFailures(page)
  await page.goto('/')
  await expect(page).toHaveTitle('ECHO HEIST')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.locator('canvas')).toBeVisible()

  const initial = await readState(page)
  expect(initial).toMatchObject({
    mode: 'tutorial',
    loop: 1,
    totalLocks: 0,
    remainingMs: 20_000,
    recording: false,
    recordingSamples: 1,
    restartCount: 0,
    player: { x: 145, y: 360 },
    ghost: { visible: false },
    tutorial: {
      visible: true,
      dismissControls: ['e', 'enter', 'pointer'],
    },
  })
  await captureCanvas(page, '00-tutorial-initial')

  await page.keyboard.down('d')
  await advance(page, 3_000)
  await page.keyboard.up('d')
  await page.keyboard.press('Space')
  await page.keyboard.press('r')
  const frozen = await readState(page)
  expect(frozen).toMatchObject({
    mode: 'tutorial',
    loop: 1,
    totalLocks: 0,
    remainingMs: 20_000,
    recording: false,
    recordingSamples: 1,
    restartCount: 0,
    player: { x: 145, y: 360 },
    ghost: { visible: false },
  })

  await page.keyboard.press('e')
  expect(await readState(page)).toMatchObject({
    mode: 'playing',
    remainingMs: 20_000,
    recordingSamples: 1,
  })
  expectNoRuntimeFailures(runtimeFailures)
})

for (const beginInput of ['Enter', 'pointer'] as const) {
  test(`begins the first-load tutorial with ${beginInput}`, async ({ page }) => {
    const runtimeFailures = collectRuntimeFailures(page)
    await page.goto('/')
    expect(await readState(page)).toMatchObject({
      mode: 'tutorial',
      remainingMs: 20_000,
      recordingSamples: 1,
    })

    if (beginInput === 'Enter') {
      await page.keyboard.press('Enter')
    } else {
      await page.locator('canvas').click({ position: { x: 32, y: 32 } })
    }

    expect(await readState(page)).toMatchObject({
      mode: 'playing',
      loop: 1,
      totalLocks: 0,
      remainingMs: 20_000,
      recordingSamples: 1,
      ghost: { visible: false },
    })
    expectNoRuntimeFailures(runtimeFailures)
  })
}

test('loads, manually locks an echo, and fully restarts', async ({ page }) => {
  const runtimeFailures = collectRuntimeFailures(page)

  const initial = await openPlayingGame(page)
  await expect(page).toHaveTitle('ECHO HEIST')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.locator('canvas')).toBeVisible()
  expect(initial).toMatchObject({ mode: 'playing', loop: 1 })
  expect(initial.sector).toMatchObject({ index: 1, count: 2 })

  await page.keyboard.press('f')
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement !== null))
    .toBe(true)
  expect((await readState(page)).fullscreen).toBe(true)
  await page.keyboard.press('Escape')
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true)
  expect((await readState(page)).fullscreen).toBe(false)

  await page.keyboard.down('d')
  await advance(page, 450)
  await page.keyboard.up('d')
  const moved = await readState(page)
  expect(moved.player.x).toBeGreaterThan(initial.player.x + 80)

  await page.keyboard.press('Space')
  const locked = await readState(page)
  expect(locked.loop).toBe(2)
  expect(locked.totalLocks).toBe(1)
  expect(locked.remainingMs).toBeGreaterThan(19_900)
  expect(locked.ghost.visible).toBe(true)
  expect(locked.ghost.samples).toBeGreaterThan(1)
  expect(locked.ghost.replayDurationMs).toBeLessThan(2_000)

  await advance(page, 1_000)
  expect((await readState(page)).ghost.holdingFinalPosition).toBe(true)

  await page.keyboard.press('r')
  const restarted = await readState(page)
  expect(restarted.loop).toBe(1)
  expect(restarted.ghost.visible).toBe(false)
  expect(restarted.restartCount).toBe(initial.restartCount + 1)
  expect(restarted.remainingMs).toBeGreaterThan(19_900)
  expect(restarted.player).toMatchObject({ x: 145, y: 360 })
  expectNoRuntimeFailures(runtimeFailures)
})

test('renders deterministic four-way motion, wall rest, and echo states', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const runtimeFailures = collectRuntimeFailures(page)
  await openPlayingGame(page)

  const initial = await readState(page)
  expect(initial.player).toMatchObject({
    facing: 'down',
    moving: false,
    animationState: 'idle',
  })
  expect(initial.player.animationFrame).toBeGreaterThanOrEqual(6)
  expect(initial.player.animationFrame).toBeLessThanOrEqual(8)

  await page.keyboard.down('w')
  await advance(page, 20)
  const turning = await readState(page)
  expect(turning.player).toMatchObject({
    facing: 'up',
    animationState: 'turn',
  })
  expect(turning.player.animationFrame).toBeGreaterThanOrEqual(21)
  expect(turning.player.animationFrame).toBeLessThanOrEqual(22)
  await page.keyboard.up('w')
  await captureCanvas(page, '09-turn-up')

  const directions = [
    { key: 'w', facing: 'up', minFrame: 12, maxFrame: 17, shot: '09b-walk-up' },
    { key: 'a', facing: 'left', minFrame: 24, maxFrame: 29, shot: '10-walk-left' },
    { key: 'd', facing: 'right', minFrame: 36, maxFrame: 41, shot: '11-walk-right' },
    { key: 's', facing: 'down', minFrame: 0, maxFrame: 5, shot: '12-walk-down' },
  ] as const

  for (const direction of directions) {
    await openPlayingGame(page)
    await page.keyboard.down(direction.key)
    await advance(page, 220)
    const state = await readState(page)
    expect(state.player).toMatchObject({
      facing: direction.facing,
      moving: true,
      animationState: 'walk',
    })
    expect(state.player.animationFrame).toBeGreaterThanOrEqual(
      direction.minFrame,
    )
    expect(state.player.animationFrame).toBeLessThanOrEqual(direction.maxFrame)
    await page.keyboard.up(direction.key)
    await captureCanvas(page, direction.shot)
  }

  // Holding movement into the room boundary must resolve to an idle pose.
  await openPlayingGame(page)
  await page.keyboard.down('a')
  await advance(page, 700)
  const blocked = await readState(page)
  expect(blocked.player).toMatchObject({
    x: 51,
    facing: 'left',
    moving: false,
    animationState: 'idle',
  })
  expect(blocked.player.animationFrame).toBeGreaterThanOrEqual(30)
  expect(blocked.player.animationFrame).toBeLessThanOrEqual(32)
  await page.keyboard.up('a')
  await captureCanvas(page, '13-wall-rest-left')

  // Record a rightward path, then inspect the moving echo and its final hold.
  await openPlayingGame(page)
  await page.keyboard.down('d')
  await advance(page, 460)
  await page.keyboard.up('d')
  await page.keyboard.press('Space')
  await advance(page, 220)
  const replaying = await readState(page)
  expect(replaying.ghost).toMatchObject({
    visible: true,
    facing: 'right',
    moving: true,
    animationState: 'echo-replay',
    holdingFinalPosition: false,
  })
  expect(replaying.ghost.animationFrame).toBeGreaterThanOrEqual(36)
  expect(replaying.ghost.animationFrame).toBeLessThanOrEqual(41)
  await captureCanvas(page, '14-echo-replay-right')

  await advance(page, 400)
  const holding = await readState(page)
  expect(holding.ghost).toMatchObject({
    visible: true,
    facing: 'right',
    animationState: 'echo-hold',
    holdingFinalPosition: true,
  })
  expect(holding.ghost.animationFrame).toBe(47)
  await captureCanvas(page, '15-echo-hold-right')

  expectNoRuntimeFailures(runtimeFailures)
})

test('clears the manual-lock tutorial and dual-signal vault', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const runtimeFailures = collectRuntimeFailures(page)

  const sectorOneInitial = await openPlayingGame(page)
  expect(sectorOneInitial).toMatchObject({ mode: 'playing', loop: 1 })
  expect(sectorOneInitial.sector).toMatchObject({
    index: 1,
    id: 'first-cut',
  })
  await captureCanvas(page, '01-sector-one-initial')

  // Sector 1: lock the echo on ALPHA.
  await page.keyboard.down('d')
  await advance(page, 705)
  await page.keyboard.up('d')
  await page.keyboard.down('s')
  await advance(page, 275)
  await page.keyboard.up('s')
  expect((await readState(page)).switches[0]).toMatchObject({
    active: true,
    occupiedBy: 'player',
  })
  await page.keyboard.press('Space')
  const sectorOneLocked = await readState(page)
  expect(sectorOneLocked).toMatchObject({ mode: 'playing', loop: 2 })
  expect(sectorOneLocked.ghost.visible).toBe(true)
  await captureCanvas(page, '02-sector-one-manual-lock')

  // The current player runs right while the echo settles on ALPHA.
  await page.keyboard.down('d')
  await advance(page, 3_050)
  await page.keyboard.up('d')
  const sectorOneExit = await readState(page)
  expect(sectorOneExit.ghost.holdingFinalPosition).toBe(true)
  expect(sectorOneExit.switches[0]).toMatchObject({
    active: true,
    occupiedBy: 'ghost',
  })
  expect(sectorOneExit.door.open).toBe(true)
  expect(sectorOneExit.player.inGoal).toBe(true)
  await captureCanvas(page, '03-sector-one-echo-open')

  await page.keyboard.press('e')
  await advance(page, 20)
  expect((await readState(page)).mode).toBe('sector-clear')
  await captureCanvas(page, '04-sector-one-clear')
  await page.keyboard.press('e')
  const sectorTwoStart = await readState(page)
  expect(sectorTwoStart).toMatchObject({ mode: 'playing', loop: 1 })
  expect(sectorTwoStart.sector).toMatchObject({ index: 2, id: 'dual-signal' })
  await captureCanvas(page, '05-sector-two-initial')

  // Sector 2: lock the echo on ALPHA.
  await page.keyboard.down('d')
  await advance(page, 685)
  await page.keyboard.up('d')
  await page.keyboard.down('w')
  await advance(page, 200)
  await page.keyboard.up('w')
  expect((await readState(page)).switches[0]).toMatchObject({
    active: true,
    occupiedBy: 'player',
  })
  await page.keyboard.press('Space')

  // Current player takes BETA while the echo holds ALPHA.
  await page.keyboard.down('d')
  await advance(page, 1_350)
  await page.keyboard.up('d')
  await page.keyboard.down('s')
  await advance(page, 300)
  await page.keyboard.up('s')
  const synchronized = await readState(page)
  expect(synchronized.switches).toMatchObject([
    { id: 'alpha', active: true, occupiedBy: 'ghost' },
    { id: 'beta', active: true, occupiedBy: 'player' },
  ])
  expect(synchronized.relay.chargeMs).toBeGreaterThan(0)
  expect(synchronized.relay.chargeMs).toBeLessThan(
    synchronized.relay.requiredMs,
  )
  await captureCanvas(page, '06-sector-two-partial-charge')

  await advance(page, 1_250)
  const latched = await readState(page)
  expect(latched.relay.latched).toBe(true)
  expect(latched.door.open).toBe(true)
  await captureCanvas(page, '07-sector-two-latched')

  // Leave BETA, cross the permanently latched gate, and enter the vault.
  await page.keyboard.down('w')
  await advance(page, 350)
  await page.keyboard.up('w')
  await page.keyboard.down('d')
  await advance(page, 1_780)
  await page.keyboard.up('d')
  const atVault = await readState(page)
  expect(atVault.player.inGoal).toBe(true)
  expect(atVault.relay.latched).toBe(true)

  await page.keyboard.press('e')
  await advance(page, 20)
  expect((await readState(page)).mode).toBe('victory')
  await captureCanvas(page, '08-victory')

  await page.keyboard.press('e')
  const replayed = await readState(page)
  expect(replayed).toMatchObject({ mode: 'playing', loop: 1, totalLocks: 0 })
  expect(replayed.sector).toMatchObject({ index: 1, id: 'first-cut' })
  expect(replayed.ghost.visible).toBe(false)
  expectNoRuntimeFailures(runtimeFailures)
})

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
]) {
  test(`keeps the initial canvas readable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    const runtimeFailures = collectRuntimeFailures(page)
    await page.setViewportSize(viewport)
    await page.goto('/')

    const canvas = page.locator('canvas')
    await expect(canvas).toHaveCount(1)
    await expect(canvas).toBeVisible()
    expect(await readState(page)).toMatchObject({
      mode: 'tutorial',
      sector: { index: 1, count: 2 },
      recording: false,
      tutorial: { visible: true },
    })

    const layout = await canvas.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const documentElement = document.documentElement
      const body = document.body
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        right: bounds.right,
        bottom: bounds.bottom,
        documentScrollWidth: documentElement.scrollWidth,
        documentClientWidth: documentElement.clientWidth,
        documentScrollHeight: documentElement.scrollHeight,
        documentClientHeight: documentElement.clientHeight,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        bodyScrollHeight: body.scrollHeight,
        bodyClientHeight: body.clientHeight,
      }
    })

    expect(layout.width).toBeGreaterThan(0)
    expect(layout.height).toBeGreaterThan(0)
    expect(layout.x).toBeGreaterThanOrEqual(0)
    expect(layout.y).toBeGreaterThanOrEqual(0)
    expect(layout.right).toBeLessThanOrEqual(viewport.width)
    expect(layout.bottom).toBeLessThanOrEqual(viewport.height)
    expect(Math.abs(layout.width / layout.height - 1.6)).toBeLessThan(0.02)
    expect(layout.documentScrollWidth).toBeLessThanOrEqual(
      layout.documentClientWidth,
    )
    expect(layout.documentScrollHeight).toBeLessThanOrEqual(
      layout.documentClientHeight,
    )
    expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.bodyClientWidth)
    expect(layout.bodyScrollHeight).toBeLessThanOrEqual(
      layout.bodyClientHeight,
    )

    await page.screenshot({
      path: `${VISUAL_OUTPUT_DIR}/tutorial-viewport-${viewport.width}x${viewport.height}.png`,
    })
    await page.keyboard.press('Enter')
    expect(await readState(page)).toMatchObject({
      mode: 'playing',
      remainingMs: 20_000,
      recordingSamples: 1,
    })
    expectNoRuntimeFailures(runtimeFailures)
  })
}
