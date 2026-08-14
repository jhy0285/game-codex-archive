import { expect, test } from "@playwright/test";

test("production deployment loads and exposes a playable canvas", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("https://404-not-found-phi-seven.vercel.app/", { waitUntil: "networkidle" });
  await expect(page.locator("#game-canvas")).toBeVisible();
  await expect(page.locator("#start-btn")).toBeVisible();
  await page.locator("#start-btn").click();
  await expect.poll(async () => JSON.parse(await page.evaluate(() => window.render_game_to_text())).mode).toBe("play");
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  expect(state.act).toMatchObject({ current: 1, total: 3 });
  expect(state.signals.total).toBe(3);
  expect(state.player.hp).toBe(3);
  await page.evaluate(() => window.__gameTest.loadAct(2));
  const actTwo = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  expect(actTwo.wave).toMatchObject({ current: 1, total: 3 });
  expect(actTwo.enemies[0]).toMatchObject({ type: "husk", hp: 3 });
  await page.evaluate(() => window.__gameTest.loadAct(3));
  const actThree = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  expect(actThree.boss).toMatchObject({ name: "BLIND ARCHIVIST", hp: 12, maxHp: 12, vulnerable: false });
  await page.screenshot({ path: "output/e2e/production-act-3.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("production custom 404 returns through the interactive route", async ({ page }) => {
  const response = await page.goto("https://404-not-found-phi-seven.vercel.app/a-route-that-never-existed");
  expect(response?.status()).toBe(404);
  await page.waitForURL("https://404-not-found-phi-seven.vercel.app/?from=404");
  await expect(page.locator("#error-title")).toHaveText("404");
  expect(await page.evaluate(() => sessionStorage.getItem("void-route-entry"))).toBe("404");
});
