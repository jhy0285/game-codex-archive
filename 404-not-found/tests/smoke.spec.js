import { expect, test } from "@playwright/test";

const readState = (page) => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const loadAct = (page, act) => page.evaluate((value) => window.__gameTest.loadAct(value), act);
const step = (page, payload) => page.evaluate((value) => window.__gameTest.step(value), payload);

test("title and Act I movement, attack animation, and restart remain intact", async ({ page }) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();
  await expect(page.locator("#error-title")).toHaveText("404");
  await page.locator("#start-btn").click();
  await page.evaluate(() => window.__gameTest.step({ frames: 20, held: ["ArrowRight"] }));
  let state = await readState(page);
  expect(state.act.current).toBe(1);
  expect(state.player.x).toBeGreaterThan(142);
  await step(page, { frames: 1, pressed: ["attack"] });
  state = await readState(page);
  expect(state.player.animationState).toBe("attack");
  expect(state.projectiles.some((projectile) => projectile.owner === "player")).toBe(true);
  await page.keyboard.press("KeyR");
  state = await readState(page);
  expect(state.act.current).toBe(1);
  expect(state.player.x).toBe(142);
  expect(runtimeErrors).toEqual([]);
});

test("Act I portal checkpoints into Act II instead of ending the game", async ({ page }) => {
  await page.goto("/");
  await loadAct(page, 1);
  await page.evaluate(() => {
    window.__gameTest.completeActOne();
    window.__gameTest.setPlayer({ x: 1428, y: 670 });
  });
  await step(page, { frames: 1 });
  expect((await readState(page)).act.transitioningTo).toBe(2);
  await step(page, { frames: 31 });
  const state = await readState(page);
  expect(state.mode).toBe("play");
  expect(state.act.current).toBe(2);
  expect(state.act.checkpoint).toBe(2);
  expect(state.wave).toMatchObject({ current: 1, total: 3 });
  expect(state.enemies.map((enemy) => enemy.type)).toEqual(["husk"]);
  await page.screenshot({ path: "output/e2e/act-2-wave-1.png", fullPage: true });
});

test("Act II presents deterministic husk, redactor, and mixed reinforcement waves", async ({ page }) => {
  await page.goto("/");
  await loadAct(page, 2);
  let state = await readState(page);
  expect(state.enemies[0]).toMatchObject({ id: "husk-west", type: "husk", hp: 3 });
  await page.evaluate(() => window.__gameTest.damageEnemy("husk-west", 3));
  await step(page, { frames: 45 });
  state = await readState(page);
  expect(state.wave.current).toBe(2);
  expect(state.enemies[0]).toMatchObject({ id: "redactor", type: "redactor" });
  await step(page, { frames: 70 });
  state = await readState(page);
  expect(["telegraph", "release", "recover", "patrol"]).toContain(state.enemies[0].state);
  await page.evaluate(() => window.__gameTest.damageEnemy("redactor", 3));
  await step(page, { frames: 45 });
  state = await readState(page);
  expect(state.wave.current).toBe(3);
  expect(state.enemies.map((enemy) => enemy.type).sort()).toEqual(["husk", "redactor"]);
  await page.screenshot({ path: "output/e2e/act-2-wave-3.png", fullPage: true });
  await page.evaluate(() => {
    window.__gameTest.damageEnemy("husk-east", 3);
    window.__gameTest.damageEnemy("redactor-final", 3);
  });
  await step(page, { frames: 1 });
  state = await readState(page);
  expect(state.encounterCleared).toBe(true);
  expect(state.portal.active).toBe(true);
});

test("Blind Archivist cycles all patterns and only takes damage during recovery", async ({ page }) => {
  await page.goto("/");
  await loadAct(page, 3);
  await page.evaluate(() => window.__gameTest.setBoss({ stage: "telegraph", pattern: "index_ring", timer: 0.5 }));
  await page.evaluate(() => window.__gameTest.setPlayer({ x: 1120, y: 585, facing: 1 }));
  await page.screenshot({ path: "output/e2e/boss-index-telegraph.png", fullPage: true });
  await step(page, { frames: 1, pressed: ["attack"] });
  await step(page, { frames: 18 });
  let state = await readState(page);
  expect(state.boss.hp).toBe(12);
  await page.evaluate(() => window.__gameTest.setBoss({ stage: "recover", pattern: "index_ring", timer: 0.6 }));
  await page.evaluate(() => window.__gameTest.setPlayer({ x: 1120, y: 585, vy: 0, facing: 1, attackCooldown: 0 }));
  await page.screenshot({ path: "output/e2e/boss-core-recover.png", fullPage: true });
  await step(page, { frames: 20, pressed: ["attack"] });
  state = await readState(page);
  expect(state.boss.hp).toBe(11);

  await loadAct(page, 3);
  state = await step(page, { frames: 420 });
  expect([...new Set(state.boss.patternHistory)].sort()).toEqual(["index_ring", "memory_sweep", "redaction_quill"]);
  await page.screenshot({ path: "output/e2e/act-3-boss.png", fullPage: true });
});

test("boss death is the only route to final completion", async ({ page }) => {
  await page.goto("/");
  await loadAct(page, 3);
  await page.evaluate(() => window.__gameTest.damageBoss(12));
  await step(page, { frames: 80 });
  const state = await readState(page);
  expect(state.boss.hp).toBe(0);
  expect(state.mode).toBe("win");
  await expect(page.locator("#completion")).toBeVisible();
  await page.screenshot({ path: "output/e2e/final-restored-page.png", fullPage: true });
});
