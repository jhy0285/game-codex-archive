import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

type PlayerState = 'idle' | 'run' | 'fire' | 'dodge'
type BossState =
  | 'idle'
  | 'radial_telegraph'
  | 'radial_release'
  | 'radial_recover'
  | 'aimed_telegraph'
  | 'aimed_release'
  | 'aimed_recover'
  | 'beam_telegraph'
  | 'beam_active'
  | 'beam_recover'

async function state(page: Page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()))
}

async function clickCanvas(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox()
  if (!box) throw new Error('missing canvas')
  await page.mouse.click(box.x + (x / 960) * box.width, box.y + (y / 640) * box.height)
}

async function startFight(page: Page) {
  await page.goto('/')
  await expect.poll(async () => (await state(page)).phase).toBe('config')
  await clickCanvas(page, 180, 348)
  await clickCanvas(page, 480, 348)
  await clickCanvas(page, 480, 551)
  await expect.poll(async () => (await state(page)).phase).toBe('fight')
}

async function audit(
  page: Page,
  name: string,
  playerState: PlayerState,
  bossState: BossState,
  elapsedMs: number,
) {
  await page.evaluate(({ playerState, bossState, elapsedMs }) => {
    window.set_animation_audit_scenario({ playerState, bossState, elapsedMs })
  }, { playerState, bossState, elapsedMs })
  const snapshot = await state(page)
  expect(snapshot.player.animationState).toBe(playerState)
  expect(snapshot.boss.animationState).toBe(bossState)
  mkdirSync('output/animation-audit/fixed', { recursive: true })
  await page.locator('canvas').screenshot({ path: `output/animation-audit/fixed/${name}.png` })
  writeFileSync(`output/animation-audit/fixed/${name}.json`, JSON.stringify(snapshot, null, 2))
}

test('captures deterministic animation pose matrix', async ({ page }) => {
  await startFight(page)
  await page.evaluate(() => {
    window.advanceTime(620)
    window.set_animation_audit_scenario({ playerState: 'idle', bossState: 'idle', elapsedMs: 160 })
  })
  await audit(page, '01-player-idle-boss-idle', 'idle', 'idle', 160)
  await audit(page, '02-player-run-boss-radial-telegraph', 'run', 'radial_telegraph', 90)
  await audit(page, '03-player-fire-boss-radial-release', 'fire', 'radial_release', 75)
  await audit(page, '04-player-dodge-boss-radial-recover', 'dodge', 'radial_recover', 130)
  await audit(page, '05-player-run-boss-aimed-telegraph', 'run', 'aimed_telegraph', 90)
  await audit(page, '06-player-fire-boss-aimed-release', 'fire', 'aimed_release', 75)
  await audit(page, '07-player-idle-boss-aimed-recover', 'idle', 'aimed_recover', 130)
  await audit(page, '08-player-dodge-boss-beam-telegraph', 'dodge', 'beam_telegraph', 90)
  await audit(page, '09-player-run-boss-beam-active', 'run', 'beam_active', 75)
  await audit(page, '10-player-idle-boss-beam-recover', 'idle', 'beam_recover', 130)
  await page.evaluate(() => window.set_animation_audit_scenario(null))
})
