const { test, expect } = require("@playwright/test");

test("loads the game and renders core progression surfaces", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("http://localhost:8000/?build=progression-v12");

  await expect(page.getByRole("heading", { name: "Combat Grounds" })).toBeVisible();
  await expect(page.locator("#zone-list .zone-card")).toHaveCount(8);
  await expect(page.locator("#combat-style-list .combat-style")).toHaveCount(6);
  await expect(page.locator("#ability-list .ability-card")).toHaveCount(6);
  await expect(page.locator("#director-goals button")).toHaveCount(3);
  expect(errors).toEqual([]);
});

test("opens queue, crafting, market, and adventure interfaces", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://localhost:8000/?build=progression-v12");

  await page.locator('[data-view="mining"]').click();
  await expect(page.getByRole("heading", { name: "Production Queue" })).toBeVisible();

  await page.getByRole("button", { name: "Crafting" }).click();
  await expect(page.locator("#crafting-filter")).toBeVisible();

  await page.locator('.sidebar > .nav-item[data-view="marketplace"]').click();
  await expect(page.getByRole("heading", { name: "Traveling Quartermaster" })).toBeVisible();

  await page.getByRole("button", { name: "Adventure Board" }).click();
  await expect(page.getByRole("heading", { name: "Bestiary & Relics" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("runs and persists a cross-skill production queue", async ({ page }) => {
  await page.goto("http://localhost:8000/?build=progression-v12");
  await page.locator('[data-view="mining"]').click();
  await page.getByRole("button", { name: "Add Current Action" }).click();
  await expect(page.locator("#production-queue .queue-job")).toHaveCount(1);
  await page.getByRole("button", { name: "Run Queue" }).click();
  await expect(page.locator("#queue-status")).toContainText("Running");

  await page.reload();
  await page.locator('[data-view="mining"]').click();
  await expect(page.locator("#production-queue .queue-job")).toHaveCount(1);
  await page.locator("#queue-clear").click();
});

test("supports selectable threat and compact mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:8000/?build=progression-v12");
  await page.evaluate(() => {
    const save = {
      characterName: "Threat Tester",
      skills: {},
      inventory: {},
      bossDefeated: [true],
      zoneKills: [50],
      unlockedZones: 2,
      lastSeen: Date.now()
    };
    localStorage.setItem("emberfall-idle-save-v1", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-save-v1-backup", JSON.stringify(save));
  });
  await page.reload();

  await page.locator("#zone-threat").selectOption("3");
  await expect(page.locator("#zone-threat")).toHaveValue("3");
  await expect(page.locator("#enemy-hp-text")).toContainText("44 / 44");

  await page.getByRole("button", { name: "+ More" }).click();
  await expect(page.locator("#mobile-more-menu")).toBeVisible();
  await page.locator('#mobile-more-menu [data-view="smithing"]').click();
  await expect(page.getByRole("heading", { name: "Smithing", exact: true })).toBeVisible();
});

test("expands achievements into escalating tracks with permanent hunt bonuses", async ({ page }) => {
  await page.addInitScript(() => {
    const save = {
      characterName: "Milestone Tester",
      skills: {},
      inventory: {},
      kills: 1000,
      zoneKills: [500],
      unlockedZones: 1,
      bossDefeated: [true],
      stats: { actions: 1000, crafts: 25, contracts: 10, rareGear: 1, overcharges: 10 },
      town: { forge: 3, storehouse: 3, hall: 2, shrine: 2 },
      bestiary: {
        kills: { "Greenveil Goblin": 100 },
        drops: {},
        bosses: { "Grak the Trailbreaker": 1 }
      },
      achievements: [],
      lastSeen: Date.now()
    };
    localStorage.setItem("emberfall-idle-save-v1", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-save-v1-backup", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-recovery-20260613", "1");
  });
  await page.goto("http://localhost:8000/?build=progression-v12");
  await page.getByRole("button", { name: "Adventure Board" }).click();

  await expect(page.getByRole("heading", { name: "Achievement Tracks" })).toBeVisible();
  await expect(page.locator("#achievement-grid .achievement-card")).toHaveCount(12);
  await expect(page.locator("#achievement-grid")).toContainText("Battle Record");
  await expect(page.locator("#achievement-grid")).toContainText("Tier 2 / 6");
  await expect(page.locator("#bestiary-grid")).toContainText("Hunt Mastery 2/4");

  const bonuses = await page.evaluate(() => ({
    combatCoins: achievementBonus("combatCoins", { zone: 0, enemy: "Greenveil Goblin" }),
    overchargeSeconds: achievementBonus("overchargeSeconds"),
    smallTextSize: Number.parseFloat(getComputedStyle(document.querySelector(".bestiary-entry small")).fontSize)
  }));
  expect(bonuses.combatCoins).toBeCloseTo(0.1, 5);
  expect(bonuses.overchargeSeconds).toBe(6);
  expect(bonuses.smallTextSize).toBeGreaterThanOrEqual(9);

  await expect(page.locator('.sidebar > .nav-item[data-view="marketplace"] img')).toHaveAttribute("src", "assets/navigation/marketplace-v2.png");
  await expect(page.locator('.sidebar > .nav-item[data-view="adventure"] img')).toHaveAttribute("src", "assets/navigation/adventure-v2.png");
});
