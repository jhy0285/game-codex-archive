import { expect, test, type Page } from '@playwright/test'

type Vector3 = { x: number; y: number; z: number }
type GameState = {
  mode: string
  player: { position: Vector3; yaw: number } | null
  echo: { mode: string; tick: number; durationTicks: number }
  cores: Record<string, { position: Vector3; carriedBy?: 'player' | 'echo'; receiver: boolean }>
  barriers: Record<string, { open?: boolean }>
  objectives: { facts: string[]; complete: boolean }
  mobileControlsVisible: boolean
}

type DebugApi = {
  selectChapter: (chapter: 1 | 2 | 3 | 4 | 5) => Promise<void>
  setManualStepping: (enabled: boolean) => void
  advanceTicks: (ticks: number) => void
}

let pointerId = 100

const state = (page: Page): Promise<GameState> => page.evaluate(() => {
  const render = window.render_game_to_text
  if (!render) throw new Error('render_game_to_text is unavailable')
  return JSON.parse(render()) as GameState
})

const advanceTicks = (page: Page, ticks: number): Promise<void> => page.evaluate((count) => {
  const debug = window.echoDepthsDebug as DebugApi | undefined
  if (!debug) throw new Error('echoDepthsDebug is unavailable')
  debug.advanceTicks(count)
}, ticks)

const releaseTouch = (page: Page, id: number): Promise<void> => page.evaluate((pointer) => {
  window.dispatchEvent(new PointerEvent('pointerup', {
    pointerId: pointer,
    pointerType: 'touch',
    bubbles: true,
  }))
}, id)

const tapAction = async (page: Page, action: 'echo' | 'interact' | 'throw'): Promise<void> => {
  const id = pointerId += 1
  await page.locator(`[data-action="${action}"]`).dispatchEvent('pointerdown', {
    pointerId: id,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: 1,
  })
  await advanceTicks(page, 1)
  await releaseTouch(page, id)
  await advanceTicks(page, 1)
}

const holdStick = async (page: Page, direction: 'east' | 'west' | 'north' | 'south', ticks: number): Promise<void> => {
  const bounds = await page.locator('#move-zone').boundingBox()
  if (!bounds) throw new Error('move joystick is unavailable')
  const id = pointerId += 1
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const offset = Math.min(bounds.width, bounds.height) * 0.28
  const target = direction === 'east' ? { x: centerX + offset, y: centerY }
    : direction === 'west' ? { x: centerX - offset, y: centerY }
      : direction === 'north' ? { x: centerX, y: centerY - offset }
        : { x: centerX, y: centerY + offset }
  await page.locator('#move-zone').dispatchEvent('pointerdown', {
    pointerId: id,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: target.x,
    clientY: target.y,
  })
  await advanceTicks(page, ticks)
  await releaseTouch(page, id)
  await advanceTicks(page, 1)
}

const rotateCameraToCardinal = async (page: Page): Promise<void> => {
  const bounds = await page.locator('#camera-zone').boundingBox()
  if (!bounds) throw new Error('camera touch area is unavailable')
  const id = pointerId += 1
  let x = bounds.x + bounds.width * 0.65
  const y = bounds.y + bounds.height * 0.25
  await page.locator('#camera-zone').dispatchEvent('pointerdown', {
    pointerId: id, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1, clientX: x, clientY: y,
  })
  // Five real drag samples reproduce the old Q turn without using a keyboard
  // or an input-injection test hook.
  for (let sample = 0; sample < 5; sample += 1) {
    x -= 27
    await page.locator('#camera-zone').dispatchEvent('pointermove', {
      pointerId: id, pointerType: 'touch', isPrimary: true, buttons: 1, clientX: x, clientY: y,
    })
    await advanceTicks(page, 1)
  }
  await releaseTouch(page, id)
  await advanceTicks(page, 1)
}

const moveAxis = async (page: Page, axis: 'x' | 'z', target: number, label: string): Promise<void> => {
  const positive = axis === 'x' ? 'east' : 'south'
  const negative = axis === 'x' ? 'west' : 'north'
  for (let elapsed = 0; elapsed < 420; elapsed += 12) {
    const player = (await state(page)).player
    if (!player) throw new Error(`${label}: player is unavailable`)
    const difference = target - player.position[axis]
    if (Math.abs(difference) < 0.35) return
    await holdStick(page, difference > 0 ? positive : negative, 12)
  }
  throw new Error(`${label}: player did not reach ${axis}=${target}; final=${JSON.stringify((await state(page)).player)}`)
}

const advanceUntil = async (
  page: Page,
  predicate: (value: GameState) => boolean,
  maximumTicks: number,
  label: string,
): Promise<GameState> => {
  for (let elapsed = 0; elapsed <= maximumTicks; elapsed += 12) {
    const current = await state(page)
    if (predicate(current)) return current
    await advanceTicks(page, 12)
  }
  throw new Error(`${label}: ${JSON.stringify(await state(page))}`)
}

const startChapter3 = async (page: Page): Promise<void> => {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('/')
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && typeof window.echoDepthsDebug === 'object')
  await page.evaluate(async () => {
    const debug = window.echoDepthsDebug as DebugApi | undefined
    if (!debug) throw new Error('echoDepthsDebug is unavailable')
    debug.setManualStepping(true)
    await debug.selectChapter(3)
  })
  await advanceTicks(page, 60)
  await expect.poll(async () => (await state(page)).mode).toBe('playing')
  await expect.poll(async () => (await state(page)).mobileControlsVisible).toBe(true)
}

test.describe('Chapter 3 mobile OBJECT TRANSFER', () => {
  test.use({ hasTouch: true, viewport: { width: 932, height: 430 } })

  test('completes with touch joystick, touch camera, and touch action controls', async ({ page }) => {
    // Ubuntu-hosted Actions runners are materially slower than the local
    // deterministic browser harness; keep the same real touch path intact
    // while allowing the manual physics ticks to finish under CI load.
    test.setTimeout(300_000)
    await startChapter3(page)

    await rotateCameraToCardinal(page)
    await tapAction(page, 'echo')
    await moveAxis(page, 'z', 2.45, 'reach the touch Core lane')
    await moveAxis(page, 'x', -6.2, 'reach the touch Core')
    await tapAction(page, 'interact')
    await expect.poll(async () => (await state(page)).cores['memory-core']?.carriedBy).toBe('player')

    await moveAxis(page, 'x', 0.0, 'carry to the north transfer ledge')
    await holdStick(page, 'east', 1)
    await tapAction(page, 'throw')
    expect((await state(page)).barriers['transfer-shutter']?.open).toBe(false)

    await moveAxis(page, 'x', -1.7, 'return to the west room')
    await moveAxis(page, 'z', -2.45, 'take the flat south route')
    await advanceTicks(page, 30)
    await moveAxis(page, 'x', 3.2, 'cross the player-only route')
    await tapAction(page, 'echo')

    const rewound = await state(page)
    expect(rewound.player?.position.x).toBeGreaterThan(2.7)
    expect(rewound.cores['memory-core']?.position.x).toBeLessThan(-2)
    expect(rewound.barriers['transfer-shutter']?.open).toBe(true)

    const echoCarrying = await advanceUntil(page, (current) => current.cores['memory-core']?.carriedBy === 'echo', 240, 'Echo did not replay pickup')
    expect(echoCarrying.cores['memory-core']?.carriedBy).toBe('echo')
    const released = await advanceUntil(page, (current) => current.echo.mode === 'holding', 720, 'Echo did not finish replay')
    const core = released.cores['memory-core']
    expect(core?.carriedBy).toBeUndefined()
    expect(core?.position.x).toBeGreaterThan(2.7)
    expect(released.objectives.facts).not.toContain('receiver-filled')

    await moveAxis(page, 'x', core!.position.x, 'line up with the catch-basin entrance')
    await moveAxis(page, 'z', core!.position.z, 'walk to the caught Core')
    await tapAction(page, 'interact')
    await expect.poll(async () => (await state(page)).cores['memory-core']?.carriedBy).toBe('player')
    await moveAxis(page, 'z', 0.25, 'carry to the receiver lane')
    await moveAxis(page, 'x', 7.1, 'place the Core beside the receiver')
    await tapAction(page, 'interact')
    await advanceUntil(page, (current) => current.objectives.facts.includes('receiver-filled'), 180, 'touch placement missed the receiver')
    await moveAxis(page, 'z', -2.2, 'line up the exit')
    await moveAxis(page, 'x', 9.4, 'walk to the exit')
    await tapAction(page, 'interact')
    await advanceUntil(page, (current) => current.mode === 'chapter-complete', 30, 'mobile exit did not complete Chapter 3')
  })
})
