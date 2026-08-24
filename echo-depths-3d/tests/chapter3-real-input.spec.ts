import { expect, test, type Page } from '@playwright/test'

type Vector3 = { x: number; y: number; z: number }
type GameState = {
  mode: string
  chapter: number
  player: { position: Vector3; velocity: Vector3; yaw: number } | null
  echo: { mode: string; tick: number; durationTicks: number; position?: Vector3; yaw?: number }
  cores: Record<string, { position: Vector3; carriedBy?: 'player' | 'echo'; receiver: boolean }>
  barriers: Record<string, { position: Vector3; open?: boolean }>
  objectives: { required: string[]; facts: string[]; complete: boolean }
}

type DebugApi = {
  selectChapter: (chapter: 1 | 2 | 3 | 4 | 5) => Promise<void>
  setManualStepping: (enabled: boolean) => void
  advanceTicks: (ticks: number) => void
}

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

const press = async (page: Page, key: string): Promise<void> => {
  await page.keyboard.down(key)
  await advanceTicks(page, 1)
  await page.keyboard.up(key)
  await advanceTicks(page, 1)
}

const hold = async (page: Page, key: string, ticks: number): Promise<void> => {
  await page.keyboard.down(key)
  await advanceTicks(page, ticks)
  await page.keyboard.up(key)
  await advanceTicks(page, 1)
}

const moveAxis = async (page: Page, axis: 'x' | 'z', target: number, label: string): Promise<void> => {
  const positiveKey = axis === 'x' ? 'd' : 's'
  const negativeKey = axis === 'x' ? 'a' : 'w'
  let heldKey: string | undefined
  for (let elapsed = 0; elapsed < 360; elapsed += 12) {
    const player = (await state(page)).player
    if (!player) throw new Error(`${label}: player is unavailable`)
    const difference = target - player.position[axis]
    if (Math.abs(difference) < 0.35) {
      if (heldKey) await page.keyboard.up(heldKey)
      return
    }
    const nextKey = difference > 0 ? positiveKey : negativeKey
    if (heldKey !== nextKey) {
      if (heldKey) await page.keyboard.up(heldKey)
      await page.keyboard.down(nextKey)
      heldKey = nextKey
    }
    await advanceTicks(page, 12)
  }
  if (heldKey) await page.keyboard.up(heldKey)
  throw new Error(`${label}: player did not reach ${axis}=${target}; final=${JSON.stringify((await state(page)).player)}`)
}

const advanceUntil = async (
  page: Page,
  predicate: (current: GameState) => boolean,
  maximumTicks: number,
  label: string,
): Promise<GameState> => {
  for (let elapsed = 0; elapsed <= maximumTicks; elapsed += 12) {
    const current = await state(page)
    if (predicate(current)) return current
    await advanceTicks(page, 12)
  }
  const current = await state(page)
  throw new Error(`${label}; final state: ${JSON.stringify(current)}`)
}

const startChapter3 = async (page: Page): Promise<void> => {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  await page.goto('/')
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function')
  await page.evaluate(async () => {
    const debug = window.echoDepthsDebug as DebugApi | undefined
    if (!debug) throw new Error('echoDepthsDebug is unavailable')
    debug.setManualStepping(true)
    await debug.selectChapter(3)
  })
  await advanceTicks(page, 60)
  await expect.poll(async () => (await state(page)).mode).toBe('playing')
  await page.locator('#game-canvas').focus()
}

test('Chapter 3 completes through real keyboard OBJECT TRANSFER', async ({ page }) => {
  test.setTimeout(120_000)
  await startChapter3(page)

  // The default quarter-view makes D travel south-east. It reaches the Core
  // without injecting world-space input through the debug API.
  await press(page, 'r')
  await hold(page, 'd', 54)
  await press(page, 'e')
  await expect.poll(async () => (await state(page)).cores['memory-core']?.carriedBy).toBe('player')

  // Q turns the camera to yaw~=0. From here each remaining command is a single
  // physical key: D is east, W is north, S is south.
  await hold(page, 'q', 25)
  await moveAxis(page, 'z', 1.6, 'enter the physical core-transfer lane')
  await moveAxis(page, 'x', -0.8, 'walk to the Ch3 throw lane')
  await hold(page, 'd', 1) // face the transfer lane before releasing the throw
  await press(page, 'k')
  await advanceTicks(page, 3)
  await expect.poll(async () => (await state(page)).cores['memory-core']?.carriedBy).toBeUndefined()
  expect((await state(page)).barriers['transfer-shutter']?.open, 'shutter is closed for the recorded WEST throw').toBe(false)

  // Descend the actual stairs, then use the only player crossing. The wall is
  // lowered only for this live west-side player; neither Core path is used.
  await moveAxis(page, 'x', -1.5, 'line up the Ch3 descent stairs')
  await moveAxis(page, 'z', -2.3, 'walk down the Ch3 stairs')
  await moveAxis(page, 'x', 4.4, 'cross the player-only Ch3 route')
  const recordingEnd = await state(page)
  expect(recordingEnd.player?.position.x, 'player crossed WEST → EAST').toBeGreaterThan(4)
  const endPosition = recordingEnd.player!.position
  const endYaw = recordingEnd.player!.yaw

  await press(page, 'r')
  await expect.poll(async () => (await state(page)).echo.mode).toBe('replaying')
  const afterRewind = await state(page)
  expect(afterRewind.player?.position.x, 'recording-end player position persists').toBeGreaterThan(4)
  expect(afterRewind.player?.yaw, 'recording-end orientation persists').toBeCloseTo(endYaw, 3)
  expect(Math.hypot(
    afterRewind.player!.position.x - endPosition.x,
    afterRewind.player!.position.z - endPosition.z,
  ), 'recording-end player location persists').toBeLessThan(0.15)
  expect(afterRewind.cores['memory-core']?.position.x, 'same Core rewound WEST').toBeLessThan(-2)
  expect(afterRewind.barriers['transfer-shutter']?.open, 'EAST player opens shutter').toBe(true)
  await expect(page.locator('#feedback')).toHaveText('Transfer shutter opened. The east catch lane is clear.')

  const pickupReplay = await advanceUntil(
    page,
    (current) => current.echo.tick >= 62,
    80,
    'Echo did not reach the recorded pickup tick',
  )
  expect(pickupReplay.cores['memory-core']?.carriedBy, 'the rewound real Core is carried by Echo').toBe('echo')

  const replayComplete = await advanceUntil(
    page,
    (current) => current.echo.mode === 'holding',
    420,
    'Echo replay did not complete while manual stepping',
  )
  const transferred = replayComplete.cores['memory-core']
  expect(transferred, 'exactly one Memory Core remains observable').toBeDefined()
  expect(Object.keys(replayComplete.cores), 'the replay never spawns a clone Core').toEqual(['memory-core'])
  expect(transferred.carriedBy, 'Echo released the real Core into the basin').toBeUndefined()
  expect(transferred.position.x, 'Echo throw reached EAST catch basin').toBeGreaterThan(4)
  expect(replayComplete.objectives.facts).not.toContain('receiver-filled')
  expect(replayComplete.echo.position?.x, 'Echo cannot pass through the player-only crossing').toBeLessThan(3.5)

  // Present player walks to the landed object using real keys, picks up that
  // same object, then throws it into the physical receiver.
  await moveAxis(page, 'z', transferred.position.z, 'walk to the landed Core')
  await moveAxis(page, 'x', transferred.position.x, 'walk to the landed Core')
  await press(page, 'e')
  await expect.poll(async () => (await state(page)).cores['memory-core']?.carriedBy).toBe('player')
  await expect(page.locator('#feedback')).toHaveText('Core received from your past self.')
  await moveAxis(page, 'z', -0.1, 'walk around the east catch rail')
  await moveAxis(page, 'x', 5.8, 'move east of the catch rail')
  await moveAxis(page, 'z', 1.6, 'line up the receiver throw')
  await hold(page, 'd', 1)
  await press(page, 'k')
  const receiverFilled = await advanceUntil(
    page,
    (current) => current.objectives.facts.includes('receiver-filled'),
    140,
    'real player throw did not activate receiver',
  )
  expect(receiverFilled.objectives.required).toEqual(['receiver-filled'])
  await expect(page.locator('#feedback')).toHaveText('Core transferred to the receiver.')

  // The exit sensor sits just beyond the east-floor edge, so approach it from
  // the supported side of the floor rather than walking into the void.
  await moveAxis(page, 'x', 9.2, 'walk to the exit')
  await moveAxis(page, 'z', -0.4, 'line up the exit')
  await press(page, 'e')
  const complete = await advanceUntil(
    page,
    (current) => current.mode === 'chapter-complete',
    20,
    'player could not use the opened exit',
  )
  expect(complete.objectives.facts).toEqual(['receiver-filled'])
})
