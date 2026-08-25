import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { advanceTicks, readState, startChapter, waitForState, type Vec3 } from './runtime-helpers'

type TouchAction = 'echo' | 'interact' | 'throw' | 'attack' | 'jump'
type TouchDirection = 'east' | 'west' | 'north' | 'south'

let pointerId = 400

async function attachSuccessScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const outputDir = process.env.ECHO_DEPTHS_SCREENSHOT_DIR
  const body = await page.screenshot(outputDir ? { path: `${outputDir}/${name}.png` } : {})
  await testInfo.attach(name, { body, contentType: 'image/png' })
}

async function releaseTouch(page: Page, id: number): Promise<void> {
  await page.evaluate((pointer) => {
    window.dispatchEvent(new PointerEvent('pointerup', {
      pointerId: pointer,
      pointerType: 'touch',
      bubbles: true,
    }))
  }, id)
}

async function tapAction(page: Page, action: TouchAction): Promise<void> {
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

async function stickPoint(page: Page, direction: TouchDirection) {
  const bounds = await page.locator('#move-zone').boundingBox()
  if (!bounds) throw new Error('move joystick is unavailable')
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const offset = Math.min(bounds.width, bounds.height) * 0.32
  return direction === 'east' ? { x: centerX + offset, y: centerY }
    : direction === 'west' ? { x: centerX - offset, y: centerY }
      : direction === 'north' ? { x: centerX, y: centerY - offset }
        : { x: centerX, y: centerY + offset }
}

async function holdStick(page: Page, direction: TouchDirection, ticks: number): Promise<void> {
  const target = await stickPoint(page, direction)
  const id = pointerId += 1
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

async function jumpWithStick(page: Page, direction: TouchDirection, ticks: number): Promise<void> {
  const target = await stickPoint(page, direction)
  const stickId = pointerId += 1
  await page.locator('#move-zone').dispatchEvent('pointerdown', {
    pointerId: stickId,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: target.x,
    clientY: target.y,
  })
  await tapAction(page, 'jump')
  await advanceTicks(page, Math.max(0, ticks - 2))
  await releaseTouch(page, stickId)
  await advanceTicks(page, 4)
}

async function rotateCameraCardinalByTouch(page: Page): Promise<void> {
  const bounds = await page.locator('#camera-zone').boundingBox()
  if (!bounds) throw new Error('camera touch area is unavailable')
  const id = pointerId += 1
  let x = bounds.x + bounds.width * 0.65
  const y = bounds.y + bounds.height * 0.25
  await page.locator('#camera-zone').dispatchEvent('pointerdown', {
    pointerId: id,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: x,
    clientY: y,
  })
  for (let sample = 0; sample < 5; sample += 1) {
    x -= 27
    await page.locator('#camera-zone').dispatchEvent('pointermove', {
      pointerId: id,
      pointerType: 'touch',
      isPrimary: true,
      buttons: 1,
      clientX: x,
      clientY: y,
    })
    await advanceTicks(page, 1)
  }
  await releaseTouch(page, id)
  await advanceTicks(page, 1)
}

async function moveTouchAxis(
  page: Page,
  axis: 'x' | 'z',
  target: number,
  label: string,
  maximumTicks = 900,
): Promise<void> {
  const positive: TouchDirection = axis === 'x' ? 'east' : 'south'
  const negative: TouchDirection = axis === 'x' ? 'west' : 'north'
  for (let elapsed = 0; elapsed < maximumTicks;) {
    const player = (await readState(page)).player
    if (!player) throw new Error(`${label}: Player unavailable`)
    const delta = target - player.position[axis]
    if (Math.abs(delta) < 0.32) return
    const stepTicks = Math.abs(delta) < 1 ? 4 : 12
    await holdStick(page, delta > 0 ? positive : negative, stepTicks)
    elapsed += stepTicks
  }
  throw new Error(`${label}: Player did not reach ${axis}=${target}; final=${JSON.stringify((await readState(page)).player)}`)
}

async function faceTouchTarget(page: Page, from: Vec3, to: Vec3): Promise<void> {
  const x = to.x - from.x
  const z = to.z - from.z
  // The authored rear strikes are diagonal. Alternate the two real joystick
  // directions for a tick each; the last direction is chosen by the dominant
  // target component and remains the actor's facing for the attack action.
  const xDirection: TouchDirection = x < 0 ? 'west' : 'east'
  const zDirection: TouchDirection = z < 0 ? 'north' : 'south'
  if (Math.abs(x) > Math.abs(z)) {
    await holdStick(page, zDirection, 1)
    await holdStick(page, xDirection, 1)
  } else {
    await holdStick(page, xDirection, 1)
    await holdStick(page, zDirection, 1)
  }
}

test.describe('Chapters 4 and 5 mobile touch walkthroughs', () => {
  test.use({ hasTouch: true, viewport: { width: 932, height: 430 } })

  test('Chapter 4 completes with touch-only attention control and trap strike', async ({ page }, testInfo) => {
    test.setTimeout(360_000)
    await startChapter(page, 4)
    await expect.poll(async () => (await readState(page)).mobileControlsVisible).toBe(true)
    await rotateCameraCardinalByTouch(page)

    await tapAction(page, 'echo')
    await moveTouchAxis(page, 'z', 0.5, 'touch covered gallery approach')
    await moveTouchAxis(page, 'x', -3.45, 'touch west cover approach')
    await moveTouchAxis(page, 'z', 2.5, 'touch north cover edge')
    await moveTouchAxis(page, 'z', 3.1, 'touch bell lane')
    await moveTouchAxis(page, 'x', -0.8, 'touch bell')
    await tapAction(page, 'interact')
    await tapAction(page, 'echo')
    await moveTouchAxis(page, 'x', -3.45, 'touch return to cover')
    await moveTouchAxis(page, 'z', 1.0, 'touch settle behind cover')
    await waitForState(
      page,
      (current) => current.enemies?.watcher?.target === 'echo' && current.enemies.watcher.targetVisible,
      480,
      'touch Echo never drew real Watcher attention',
    )

    await moveTouchAxis(page, 'z', -3.0, 'touch flank stair lane', 1_200)
    await moveTouchAxis(page, 'x', 0.15, 'touch first flank stair', 1_200)
    await jumpWithStick(page, 'east', 22)
    await jumpWithStick(page, 'east', 22)
    await jumpWithStick(page, 'east', 28)
    await waitForState(page, (current) => (current.player?.position.y ?? 0) > 2.8, 240, 'touch Player missed the high flank')
    await moveTouchAxis(page, 'x', 2.9, 'touch high strike x')
    await moveTouchAxis(page, 'z', -1.2, 'touch high strike z')
    const beforeStrike = await readState(page)
    const watcher = beforeStrike.enemies?.watcher
    const player = beforeStrike.player
    if (!watcher || !player) throw new Error(`touch strike actors unavailable: ${JSON.stringify(beforeStrike)}`)
    await faceTouchTarget(page, player.position, watcher.position)
    await tapAction(page, 'attack')
    await waitForState(
      page,
      (current) => current.enemies?.watcher?.defeated === true && current.objectives.facts.includes('watcher-trapped'),
      240,
      'touch strike did not knock the Watcher into the trap',
    )
    await attachSuccessScreenshot(page, testInfo, 'chapter-4-mobile-neutralized')
    await moveTouchAxis(page, 'x', 8.35, 'touch cross gallery', 1_800)
    await moveTouchAxis(page, 'z', -1.8, 'touch gallery exit')
    await tapAction(page, 'interact')
    await waitForState(page, (current) => current.mode === 'chapter-complete', 90, 'touch Chapter 4 did not complete')
  })

  test('Chapter 5 completes the full temporal orchestration with touch only', async ({ page }, testInfo) => {
    test.setTimeout(600_000)
    await startChapter(page, 5)
    await expect.poll(async () => (await readState(page)).mobileControlsVisible).toBe(true)
    await rotateCameraCardinalByTouch(page)

    await tapAction(page, 'echo')
    await moveTouchAxis(page, 'z', 2.0, 'touch Core lane')
    await moveTouchAxis(page, 'x', -5.7, 'touch Paradox Core')
    await tapAction(page, 'interact')
    await expect.poll(async () => (await readState(page)).cores['paradox-core']?.carriedBy).toBe('player')
    await moveTouchAxis(page, 'z', -0.8, 'touch carry to ramp')
    await moveTouchAxis(page, 'x', -1.0, 'touch carry up ramp', 1_500)
    await waitForState(page, (current) => (current.player?.position.y ?? 0) > 3.3, 180, 'touch Player missed the Core ramp')
    await holdStick(page, 'west', 1)
    await tapAction(page, 'throw')
    await tapAction(page, 'echo')
    const received = await waitForState(
      page,
      (current) => current.cores['paradox-core']?.receiver === true,
      720,
      'touch Echo did not deliver the same Core',
    )
    expect(Object.keys(received.cores)).toEqual(['paradox-core'])

    await tapAction(page, 'echo')
    await moveTouchAxis(page, 'x', -5.7, 'touch descend ramp', 1_500)
    await moveTouchAxis(page, 'z', 3.6, 'touch lower seal lane')
    await moveTouchAxis(page, 'x', -3.1, 'touch lower seal')
    await tapAction(page, 'echo')
    await waitForState(
      page,
      (current) => current.pressurePlates?.['lower-seal']?.actor === 'echo'
        && current.pressurePlates['lower-seal']?.active === true,
      900,
      'touch Echo did not occupy the lower seal',
    )

    await moveTouchAxis(page, 'x', -5.7, 'touch west ramp return')
    await moveTouchAxis(page, 'z', -0.8, 'touch powered ramp lane')
    await moveTouchAxis(page, 'x', -0.9, 'touch climb middle floor', 1_500)
    await waitForState(page, (current) => (current.player?.position.y ?? 0) > 3.3, 180, 'touch Player did not regain middle floor')
    await moveTouchAxis(page, 'z', -1.8, 'touch platform lane')
    await moveTouchAxis(page, 'x', 2.55, 'touch platform dock wait')
    await waitForState(page, (current) => (current.elevators?.['well-platform']?.y ?? 99) < 2.9, 600, 'touch platform did not dock')
    await moveTouchAxis(page, 'x', 3.05, 'touch board moving platform', 240)
    await waitForState(
      page,
      (current) => (current.elevators?.['well-platform']?.y ?? 0) > 4.45
        && (current.player?.position.y ?? 0) > 5,
      1_500,
      'touch platform did not lift the Player',
    )
    await jumpWithStick(page, 'east', 20)
    await moveTouchAxis(page, 'x', 5.4, 'touch upper floor')
    await moveTouchAxis(page, 'z', 1.35, 'touch Guardian cover')
    await moveTouchAxis(page, 'x', 3.0, 'touch Guardian flank')
    await moveTouchAxis(page, 'z', 1.8, 'touch Guardian rear edge')
    await moveTouchAxis(page, 'x', 2.25, 'touch Guardian strike range')
    const distracted = await waitForState(
      page,
      (current) => current.enemies?.guardian?.target === 'echo' && current.enemies.guardian.targetVisible,
      600,
      'touch Guardian never switched to Echo',
    )
    const guardian = distracted.enemies?.guardian
    const player = distracted.player
    if (!guardian || !player) throw new Error(`touch Guardian actors unavailable: ${JSON.stringify(distracted)}`)
    await faceTouchTarget(page, player.position, guardian.position)
    await tapAction(page, 'attack')
    await waitForState(page, (current) => current.enemies?.guardian?.defeated === true, 120, 'touch Guardian strike failed')

    await jumpWithStick(page, 'east', 20)
    await moveTouchAxis(page, 'x', 5.2, 'touch leave Guardian flank')
    await moveTouchAxis(page, 'z', -1.7, 'touch upper seal lane')
    await moveTouchAxis(page, 'x', 6.2, 'touch upper seal')
    const holdId = pointerId += 1
    await page.locator('[data-action="interact"]').dispatchEvent('pointerdown', {
      pointerId: holdId,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 1,
    })
    await advanceTicks(page, 30)
    await releaseTouch(page, holdId)
    await advanceTicks(page, 2)
    const released = await waitForState(
      page,
      (current) => current.doors?.['final-door']?.open === true && current.objectives.facts.includes('final-door-opened'),
      120,
      'touch dual seal did not open the final door',
    )
    expect(released.escapeSeconds).toBeGreaterThan(0)
    await attachSuccessScreenshot(page, testInfo, 'chapter-5-mobile-final-door')
    await moveTouchAxis(page, 'z', 0.3, 'touch final passage lane')
    await moveTouchAxis(page, 'x', 8.85, 'touch final exit')
    await tapAction(page, 'interact')
    await waitForState(page, (current) => current.mode === 'chapter-complete', 90, 'touch Chapter 5 did not complete')
  })
})
