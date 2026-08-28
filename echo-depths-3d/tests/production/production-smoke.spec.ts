import { expect, test as base, type APIRequestContext, type Page, type Request } from '@playwright/test'

type Vector3 = {
  x: number
  y: number
  z: number
}

type ProductionGameState = {
  mode: 'loading' | 'language' | 'title' | 'playing' | 'paused' | 'chapter-complete' | 'ending' | 'error'
  language: 'en' | 'ko'
  chapter: 0 | 1 | 2 | 3 | 4 | 5
  player: {
    position: Vector3
    velocity: Vector3
    grounded: boolean
    animation: string
  } | null
  echo: {
    mode: string
  }
  pressurePlates: Record<string, { active: boolean; actor?: string }>
  levers: Record<string, { active: boolean; actor?: string }>
  doors: Record<string, { open: boolean }>
  objectives: {
    facts: string[]
  }
  mobileControlsVisible: boolean
  fullscreen: boolean
  assetStatus: 'loading' | 'kaykit' | 'procedural'
  fixedTick: number
  echoesCreated: number
}

type ProductionWindow = Window & {
  render_game_to_text?: () => string
  advanceTime?: (milliseconds: number) => void
  echoDepthsDebug?: unknown
}

type RuntimeFailures = {
  consoleErrors: string[]
  pageErrors: string[]
  requestFailures: string[]
}

type KayKitManifest = {
  character: string
  animations: string[]
  environment: string[]
  resources: string[]
}

type GltfDocument = {
  buffers?: Array<{ uri?: string }>
  images?: Array<{ uri?: string }>
}

const SCREENSHOT_DIR = 'output/production-smoke'

const isCanceledVercelPlatformProbe = (request: Request): boolean => {
  const failureText = request.failure()?.errorText
  if (failureText !== 'net::ERR_ABORTED') return false
  const url = new URL(request.url())
  if (!url.hostname.endsWith('.vercel.app')) return false
  return url.pathname === '/.well-known/vercel/jwe' || (request.method() === 'HEAD' && url.pathname === '/')
}

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
        if (isCanceledVercelPlatformProbe(request)) return
        failures.requestFailures.push(
          `${request.method()} ${request.url()} · ${request.failure()?.errorText ?? 'unknown error'}`,
        )
      })

      await use(failures)

      expect(failures.consoleErrors, `console.error calls:\n${failures.consoleErrors.join('\n')}`).toEqual([])
      expect(failures.pageErrors, `page errors:\n${failures.pageErrors.join('\n')}`).toEqual([])
      expect(failures.requestFailures, `failed requests:\n${failures.requestFailures.join('\n')}`).toEqual([])
    },
    { auto: true },
  ],
})

async function gameState(page: Page): Promise<ProductionGameState> {
  return page.evaluate(() => {
    const render = (window as ProductionWindow).render_game_to_text
    if (!render) throw new Error('render_game_to_text is unavailable')
    return JSON.parse(render()) as ProductionGameState
  })
}

async function openProductionGame(page: Page): Promise<ProductionGameState> {
  const documentResponse = await page.goto('/', { waitUntil: 'domcontentloaded' })
  expect(documentResponse, 'Production navigation should return a document response').not.toBeNull()
  expect(documentResponse?.status(), 'Production document should return HTTP 200').toBe(200)
  await page.waitForFunction(() => typeof (window as ProductionWindow).render_game_to_text === 'function')
  const state = await gameState(page)
  expect(state.assetStatus).toBe('kaykit')
  expect(state.mode).not.toBe('error')
  expect(await page.evaluate(() => 'echoDepthsDebug' in window)).toBe(false)
  return state
}

async function advanceProductionTime(page: Page, milliseconds: number): Promise<void> {
  await page.evaluate((elapsed) => {
    const advance = (window as ProductionWindow).advanceTime
    if (!advance) throw new Error('advanceTime is unavailable')
    advance(elapsed)
  }, milliseconds)
}

async function startProductionChapterOne(page: Page): Promise<void> {
  await page.locator('#start-button').click()
  await expect.poll(() => gameState(page).then((state) => `${state.mode}:${state.chapter}`)).toBe('playing:0')
  await expect(page.locator('#tutorial-panel')).toBeVisible()
  await page.locator('#tutorial-skip').click()
  await expect.poll(() => gameState(page).then((state) => `${state.mode}:${state.chapter}`)).toBe('playing:1')
}

async function holdProductionKeys(page: Page, keys: readonly string[], ticks: number): Promise<void> {
  for (const key of keys) await page.keyboard.down(key)
  try {
    await advanceProductionTime(page, ticks * (1000 / 60))
  } finally {
    for (const key of [...keys].reverse()) await page.keyboard.up(key)
  }
}

async function assertNoDocumentOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
      documentHeight: Math.max(root.scrollHeight, body.scrollHeight),
    }
  })

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1)
  expect(dimensions.documentHeight).toBeLessThanOrEqual(dimensions.viewportHeight + 1)
}

function planarDistance(first: Vector3, second: Vector3): number {
  return Math.hypot(second.x - first.x, second.z - first.z)
}

function manifestPaths(manifest: KayKitManifest): string[] {
  return [
    manifest.character,
    ...manifest.animations,
    ...manifest.environment,
    ...manifest.resources,
  ]
}

function referencedAssetPath(gltfPath: string, reference: string): string | null {
  if (reference.startsWith('data:')) return null
  const resolved = new URL(reference, new URL(gltfPath, 'https://echo-depths.invalid'))
  return `${resolved.pathname}${resolved.search}`
}

async function expectHttp200(request: APIRequestContext, path: string): Promise<Uint8Array> {
  const response = await request.get(path)
  expect(response.status(), `${path} should return HTTP 200`).toBe(200)
  const body = await response.body()
  expect(body.byteLength, `${path} should not be empty`).toBeGreaterThan(0)
  return body
}

test('English language gate, title, start, and real keyboard movement work in production', async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 })
  const initial = await openProductionGame(page)

  expect(initial.mode).toBe('language')
  await expect(page.locator('#language-screen')).toBeVisible()
  await expect(page.locator('.language-prompt')).toHaveText('Choose your language · 언어를 선택하세요')
  await page.locator('[data-language="en"]').click()

  await expect.poll(() => gameState(page).then((state) => `${state.mode}:${state.language}`)).toBe('title:en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('#title-screen')).toBeVisible()
  await expect(page.locator('[data-i18n="titleHook"]')).toHaveText(
    'Outwit the vault with the only partner who moves exactly as you did.',
  )
  await expect(page.locator('#start-button')).toHaveText('Begin descent')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/english-title.png`, fullPage: true })

  await startProductionChapterOne(page)
  await expect(page.locator('#hud')).toBeVisible()

  const before = await gameState(page)
  expect(before.player).not.toBeNull()
  await page.keyboard.down('d')
  try {
    await advanceProductionTime(page, 400)
  } finally {
    await page.keyboard.up('d')
  }
  const after = await gameState(page)
  expect(after.player).not.toBeNull()
  expect(after.fixedTick).toBeGreaterThan(before.fixedTick)
  expect(planarDistance(before.player!.position, after.player!.position)).toBeGreaterThan(0.2)
  await expect(page.locator('#objective-text')).toHaveText('Open the approach lever.')
  await expect(page.locator('#interact-prompt')).toHaveText('E · Activate lever')
  await page.keyboard.down('e')
  try {
    await advanceProductionTime(page, 1000 / 60)
  } finally {
    await page.keyboard.up('e')
  }
  const interacted = await gameState(page)
  expect(interacted.objectives.facts).toContain('tutorial-lever')
  expect(interacted.levers['tutorial-lever']?.active).toBe(true)
  await expect(page.locator('#feedback')).toHaveText(
    'Entry lever latched. Press R, walk to the cyan pressure seal, then press R again so the echo remains there.',
  )
  await expect(page.locator('#feedback')).toHaveClass(/feedback--visible/)
  await expect(page.locator('#objective-text')).toHaveText('Leave the echo on the lower pressure seal.')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/english-playing.png`, fullPage: true })
})

test('Chapter 1 PC keyboard route opens the live echo gate and completes in production', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1_440, height: 900 })
  const initial = await openProductionGame(page)
  expect(initial.mode).toBe('language')
  await page.locator('[data-language="en"]').click()
  await startProductionChapterOne(page)
  await page.locator('#game-canvas').focus()

  await advanceProductionTime(page, 12 * (1000 / 60))
  await holdProductionKeys(page, ['d'], 24)
  await expect(page.locator('#interact-prompt')).toHaveText('E · Activate lever')
  await page.keyboard.press('e')
  await advanceProductionTime(page, 2 * (1000 / 60))
  await expect.poll(() => gameState(page).then((state) => state.objectives.facts)).toContain('tutorial-lever')

  await page.keyboard.press('r')
  await advanceProductionTime(page, 1000 / 60)
  await holdProductionKeys(page, ['s'], 26)
  await holdProductionKeys(page, ['d'], 10)
  await expect.poll(() => gameState(page).then((state) => state.pressurePlates['echo-plate']?.active)).toBe(true)
  await page.keyboard.press('r')
  await expect.poll(() => gameState(page).then((state) => state.echoesCreated)).toBe(1)
  await advanceProductionTime(page, 130 * (1000 / 60))

  const openedGate = await gameState(page)
  expect(openedGate.echo.mode).toBe('holding')
  expect(openedGate.pressurePlates['echo-plate']?.active).toBe(true)
  expect(openedGate.pressurePlates['echo-plate']?.actor).toBe('echo')
  expect(openedGate.doors['first-door']?.open).toBe(true)
  expect(openedGate.objectives.facts).toContain('echo-plate')
  await expect(page.locator('#objective-text')).toHaveText('Reach the open passage.')

  await holdProductionKeys(page, ['d'], 36)
  await holdProductionKeys(page, ['s'], 16)
  await holdProductionKeys(page, ['d', 's'], 42)
  await holdProductionKeys(page, ['d', 's', 'Space'], 28)
  await advanceProductionTime(page, 30 * (1000 / 60))
  for (let attempt = 0; attempt < 6 && await page.locator('#interact-prompt').textContent() !== 'E · Enter passage'; attempt += 1) {
    await holdProductionKeys(page, ['d'], 4)
  }
  await expect(page.locator('#interact-prompt')).toHaveText('E · Enter passage')
  await page.keyboard.press('e')
  await advanceProductionTime(page, 2 * (1000 / 60))
  await expect.poll(() => gameState(page).then((state) => state.mode)).toBe('chapter-complete')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/chapter-one-complete.png`, fullPage: true })
})

test('Korean language gate, title, and start remain localized in production', async ({ page }) => {
  await page.setViewportSize({ width: 1_024, height: 768 })
  const initial = await openProductionGame(page)

  expect(initial.mode).toBe('language')
  await page.locator('[data-language="ko"]').click()
  await expect.poll(() => gameState(page).then((state) => `${state.mode}:${state.language}`)).toBe('title:ko')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
  await expect(page.locator('#title-screen')).toBeVisible()
  await expect(page.locator('[data-i18n="titleHook"]')).toHaveText(
    '과거의 나와 정확히 협력해 시간 금고를 돌파하세요.',
  )
  await expect(page.locator('#start-button')).toHaveText('하강 시작')
  await page.screenshot({ path: `${SCREENSHOT_DIR}/korean-title.png`, fullPage: true })

  await startProductionChapterOne(page)
  await expect.poll(() => gameState(page).then((state) => `${state.mode}:${state.language}:${state.chapter}`)).toBe('playing:ko:1')
  await expect(page.locator('#hud')).toBeVisible()
  await expect(page.locator('#chapter-name')).toHaveText('첫 번째 하강')
})

test('390x844 portrait gate and 844x390 landscape controls are visible without overflow', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'ko'))
  await page.setViewportSize({ width: 390, height: 844 })
  const portraitState = await openProductionGame(page)

  expect(portraitState.mode).toBe('title')
  await expect(page.locator('#rotation-screen')).toBeVisible()
  await expect(page.locator('#rotation-screen h2')).toHaveText('화면을 가로로 돌려주세요')
  await expect(page.locator('#rotation-screen h2')).toBeInViewport()
  await expect(page.locator('#mobile-controls')).toBeHidden()
  await assertNoDocumentOverflow(page)
  await page.screenshot({ path: `${SCREENSHOT_DIR}/portrait-390x844.png`, fullPage: true })

  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('#rotation-screen')).toBeHidden()
  await expect(page.locator('#title-screen')).toBeVisible()
  await expect(page.locator('#start-button')).toBeInViewport()
  await assertNoDocumentOverflow(page)

  await startProductionChapterOne(page)
  await expect.poll(() => gameState(page).then((state) => state.mobileControlsVisible)).toBe(true)
  await expect(page.locator('#mobile-controls')).toBeVisible()
  await expect(page.locator('#hud')).toBeVisible()
  await assertNoDocumentOverflow(page)
  await page.screenshot({ path: `${SCREENSHOT_DIR}/landscape-844x390.png`, fullPage: true })
})

test('fullscreen rejection is nonfatal on the title and in-game HUD', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('echo-depths-language', 'en'))
  const initial = await openProductionGame(page)
  expect(initial.mode).toBe('title')

  await page.evaluate(() => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: () => Promise.reject(new DOMException('Denied by browser policy', 'NotAllowedError')),
    })
  })
  await page.locator('#title-fullscreen').click()
  await expect.poll(() => gameState(page).then((state) => `${state.mode}:${state.fullscreen}`)).toBe('title:false')
  await expect(page.locator('#title-screen')).toBeVisible()

  await startProductionChapterOne(page)
  await page.locator('#hud-fullscreen').click()
  await expect.poll(() => gameState(page).then((state) => `${state.mode}:${state.fullscreen}`)).toBe('playing:false')
  await expect(page.locator('#hud')).toBeVisible()
})

test('KayKit manifest and every listed runtime dependency return HTTP 200', async ({ request }) => {
  test.setTimeout(120_000)
  const manifestBody = await expectHttp200(request, '/assets/kaykit/manifest.json')
  const manifest = JSON.parse(new TextDecoder().decode(manifestBody)) as KayKitManifest
  const directPaths = manifestPaths(manifest)

  expect(directPaths.length).toBeGreaterThan(0)
  expect(new Set(directPaths).size).toBe(directPaths.length)

  const referencedPaths = new Set<string>()
  for (const path of directPaths) {
    const body = await expectHttp200(request, path)
    if (!path.endsWith('.gltf')) continue

    const gltf = JSON.parse(new TextDecoder().decode(body)) as GltfDocument
    for (const entry of [...(gltf.buffers ?? []), ...(gltf.images ?? [])]) {
      if (!entry.uri) continue
      const referenced = referencedAssetPath(path, entry.uri)
      if (referenced) referencedPaths.add(referenced)
    }
  }

  expect(referencedPaths.size).toBeGreaterThan(0)
  for (const path of referencedPaths) await expectHttp200(request, path)
})
