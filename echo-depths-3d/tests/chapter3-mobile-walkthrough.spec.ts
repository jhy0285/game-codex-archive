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
    test.setTimeout(150_000)
    await startChapter3(page)

    await tapAction(page, 'echo')
    await holdStick(page, 'east', 54)
    await tapAction(page, 'interact')
    await expect.poll(async () => (await state(page)).cores['memory-core']?.carriedBy).toBe('player')

    await rotateCameraToCardinal(page)
    await moveAxis(page, 'z', 1.6, 'enter the transfer lane')
    await moveAxis(page, 'x', -0.8, 'walk to the west throw point')
    await holdStick(page, 'east', 1)
    await tapAction(page, 'throw')
    expect((await state(page)).barriers['transfer-shutter']?.open).toBe(false)

    await moveAxis(page, 'x', -1.5, 'line up the descent')
    await moveAxis(page, 'z', -2.3, 'walk down the stairs')
    await moveAxis(page, 'x', 4.4, 'cross the player-only route')
    await tapAction(page, 'echo')

    const rewound = await state(page)
    expect(rewound.player?.position.x).toBeGreaterThan(4)
    expect(rewound.cores['memory-core']?.position.x).toBeLessThan(-2)
    expect(rewound.barriers['transfer-shutter']?.open).toBe(true)

    const echoCarrying = await advanceUntil(page, (current) => current.echo.tick >= 62, 90, 'Echo did not replay pickup')
    expect(echoCarrying.cores['memory-core']?.carriedBy).toBe('echo')
    const released = await advanceUntil(page, (current) => current.echo.mode === 'holding', 440, 'Echo did not finish replay')
    const core = released.cores['memory-core']
    expect(core?.carriedBy).toBeUndefined()
    expect(core?.position.x).toBeGreaterThan(4)
    expect(released.objectives.facts).not.toContain('receiver-filled')

    await moveAxis(page, 'z', core!.position.z, 'walk to the caught Core')
    await moveAxis(page, 'x', core!.position.x, 'walk to the caught Core')
    await tapAction(page, 'interact')
    await expect.poll(async () => (await state(page)).cores['memory-core']?.carriedBy).toBe('player')
    await moveAxis(page, 'z', -0.1, 'walk around the catch rail')
    await moveAxis(page, 'x', 5.8, 'walk east of the catch rail')
    await moveAxis(page, 'z', 1.6, 'line up the receiver')
    await holdStick(page, 'east', 1)
    await tapAction(page, 'throw')
    await advanceUntil(page, (current) => current.objectives.facts.includes('receiver-filled'), 140, 'touch throw missed the receiver')
    await moveAxis(page, 'x', 9.2, 'walk to the exit')
    await moveAxis(page, 'z', -0.4, 'line up the exit')
    await tapAction(page, 'interact')
    await advanceUntil(page, (current) => current.mode === 'chapter-complete', 30, 'mobile exit did not complete Chapter 3')
  })
})
