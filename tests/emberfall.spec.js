const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BUILD_URL = "http://localhost:8000/?build=progression-v24";
const itemSlug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

test("loads the game and renders core progression surfaces", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto(BUILD_URL);

  await expect(page.getByRole("heading", { name: "Combat Grounds" })).toBeVisible();
  await expect(page.locator("#zone-list .zone-card")).toHaveCount(8);
  await expect(page.locator("#combat-style-list .combat-style")).toHaveCount(6);
  await expect(page.locator("#director-goals button")).toHaveCount(3);
  await expect(page.locator("#director-chapter")).toContainText("Chapter 1");
  await expect(page.locator("#combat-event-card")).toContainText("Start combat");
  await expect(page.locator("#hero-model")).toHaveAttribute("data-loadout", "Starter kit");
  await expect(page.locator("#hero-model")).toHaveAttribute("data-weapon-tier", "Starter");
  await expect(page.locator("#director-goals")).toContainText("Starter:");
  expect(errors).toEqual([]);
});

test("renders matching equipment as a full visual set", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const save = {
      characterName: "Bronze Tester",
      equipment: { weapon: "Bronze Sword", shield: "Bronze Shield", body: "Bronze Platebody", head: "Bronze Helm" },
      inventory: {},
      skills: {},
      lastSeen: Date.now()
    };
    localStorage.setItem("emberfall-idle-save-v1", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-save-v1-backup", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-recovery-20260613", "1");
  });
  await page.goto(BUILD_URL);

  const hero = page.locator("#hero-model");
  await expect(hero).toHaveAttribute("data-loadout", "Bronze full set");
  await expect(hero).toHaveAttribute("data-full-set", "Bronze");
  await expect(hero).toHaveAttribute("data-weapon-tier", "Bronze");
  await expect(hero).toHaveClass(/full-set/);
  await expect(page.locator("#hero-model .hero-set-sigil")).toBeVisible();
  const combatGeometry = await page.evaluate(() => {
    const root = document.querySelector("#hero-model").getBoundingClientRect();
    const shield = document.querySelector("#hero-model .hero-shield").getBoundingClientRect();
    const weapon = document.querySelector("#hero-model .hero-weapon").getBoundingClientRect();
    return {
      shieldCenter: shield.left + shield.width / 2 - root.left,
      weaponCenter: weapon.left + weapon.width / 2 - root.left,
      modelCenter: root.width / 2
    };
  });
  expect(combatGeometry.shieldCenter).toBeGreaterThan(combatGeometry.modelCenter + 35);
  expect(combatGeometry.weaponCenter).toBeLessThan(combatGeometry.modelCenter - 20);

  await page.locator('[data-view="inventory"]').click();
  const inventoryGeometry = await page.evaluate(() => {
    const stage = document.querySelector(".equipment-hero").getBoundingClientRect();
    const image = document.querySelector("#inventory-hero-model img").getBoundingClientRect();
    return {
      topGap: image.top - stage.top,
      bottomGap: stage.bottom - image.bottom,
      imageHeight: image.height,
      stageHeight: stage.height
    };
  });
  expect(inventoryGeometry.topGap).toBeGreaterThanOrEqual(0);
  expect(inventoryGeometry.bottomGap).toBeGreaterThanOrEqual(0);
  expect(inventoryGeometry.imageHeight).toBeLessThanOrEqual(inventoryGeometry.stageHeight);
  expect(errors).toEqual([]);
});

test("all displayable items have project icon art", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(BUILD_URL);

  const names = await page.evaluate(() => {
    const values = new Set();
    Object.keys(itemData).forEach(name => values.add(name));
    Object.keys(equipmentData).filter(name => name !== "None").forEach(name => values.add(name));
    craftingRecipes.forEach(recipe => {
      values.add(recipe.name);
      Object.keys(recipe.costs || {}).forEach(name => values.add(name));
    });
    productionSkills.forEach(id => skillData[id].actions.forEach(action => {
      values.add(action.item);
      Object.keys(action.costs || {}).forEach(name => values.add(name));
    }));
    zoneData.forEach(zone => {
      zone.enemies.forEach(enemy => {
        values.add(enemy.item);
        if (enemy.bonusItem) values.add(enemy.bonusItem);
      });
      values.add(zone.boss.item);
      (zone.gearTiers || []).forEach(tier => (equipmentTierData[tier]?.gear || []).forEach(name => values.add(name)));
    });
    rotatingMerchantData.forEach(offer => {
      if (offer.item) values.add(offer.item);
      Object.keys(offer.items || {}).forEach(name => values.add(name));
    });
    return [...values].sort();
  });
  const existing = new Set(fs.readdirSync(path.join(__dirname, "..", "assets", "items-clean"))
    .filter(file => file.endsWith(".png"))
    .map(file => file.replace(/\.png$/, "")));
  const missing = names.filter(name => !existing.has(itemSlug(name)));
  expect(missing).toEqual([]);
  expect(errors).toEqual([]);
});

test("opens queue, crafting, market, and adventure interfaces", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(BUILD_URL);

  await page.locator('[data-view="mining"]').click();
  await expect(page.getByRole("heading", { name: "Production Queue" })).toBeVisible();

  await page.getByRole("button", { name: "Crafting" }).click();
  await expect(page.locator("#crafting-filter")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gear Collection Log" })).toBeVisible();
  await expect(page.locator("#gear-collection .collection-card")).toHaveCount(10);

  await page.locator('.sidebar > .nav-item[data-view="marketplace"]').click();
  await expect(page.getByRole("heading", { name: "Traveling Quartermaster" })).toBeVisible();

  await page.getByRole("button", { name: "Adventure Board" }).click();
  await expect(page.getByRole("heading", { name: "First Emberfall Steps" })).toBeVisible();
  await expect(page.locator("#starter-quest-list .starter-card")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "Chapter Questlines" })).toBeVisible();
  await expect(page.locator("#chapter-list .chapter-card")).toHaveCount(8);
  await expect(page.getByRole("heading", { name: "Zone Bounty Boards" })).toBeVisible();
  await expect(page.locator("#bounty-list .bounty-card")).toHaveCount(3);
  await expect(page.locator("#contract-list")).toContainText("Starter:");
  await expect(page.locator("#town-projects")).toContainText("Contribute Available");
  await expect(page.getByRole("heading", { name: "Bestiary & Relics" })).toBeVisible();

  await page.locator('.sidebar > .nav-item[data-view="settings"]').click();
  await expect(page.locator(".view.active")).toContainText("ritual drums");
  expect(errors).toEqual([]);
});

test("runs and persists a cross-skill production queue", async ({ page }) => {
  await page.goto(BUILD_URL);
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

test("offline progress awards combat and active production together", async ({ page }) => {
  await page.addInitScript(() => {
    const save = {
      characterName: "Dual Idle Tester",
      activeSkill: "woodcutting",
      selectedActions: { woodcutting: "normal" },
      combat: true,
      currentZone: 0,
      selectedEnemies: [0],
      combatAutomation: { offline: true, stopHp: 15, stopAfter: 0, killsRun: 0 },
      lastSeen: Date.now() - 120000
    };
    localStorage.setItem("emberfall-idle-save-v1", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-save-v1-backup", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-recovery-20260613", "1");
  });
  await page.goto(BUILD_URL);

  await expect(page.locator("#offline-modal")).toBeVisible();
  await expect(page.locator("#offline-loot")).toContainText("Combat");
  await expect(page.locator("#offline-loot")).toContainText("Production");
  await expect(page.locator("#offline-loot")).toContainText("Enemies defeated");
  await expect(page.locator("#offline-loot")).toContainText("Logs");

  const totals = await page.evaluate(() => ({
    kills: state.kills,
    logs: state.inventory.Logs || 0
  }));
  expect(totals.kills).toBeGreaterThan(0);
  expect(totals.logs).toBeGreaterThan(0);
});

test("supports selectable threat and compact mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
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
    localStorage.setItem("emberfall-idle-recovery-20260613", "1");
  });
  await page.goto(BUILD_URL);

  await page.locator("#zone-threat").selectOption("3");
  await expect(page.locator("#zone-threat")).toHaveValue("3");
  await expect(page.locator("#enemy-hp-text")).toContainText("30 / 30");

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
      stats: { actions: 1000, crafts: 25, contracts: 10, rareGear: 1, salvaged: 10 },
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
  await page.goto(BUILD_URL);
  await page.getByRole("button", { name: "Adventure Board" }).click();

  await expect(page.getByRole("heading", { name: "Achievement Tracks" })).toBeVisible();
  await expect(page.locator("#achievement-grid .achievement-card")).toHaveCount(12);
  await expect(page.locator("#achievement-grid")).toContainText("Battle Record");
  await expect(page.locator("#achievement-grid")).toContainText("Forge Reclaimer");
  await expect(page.locator("#achievement-grid")).toContainText("Tier 2 / 6");
  await expect(page.locator("#bestiary-grid")).toContainText("Hunt Mastery 2/4");

  const bonuses = await page.evaluate(() => ({
    combatCoins: achievementBonus("combatCoins", { zone: 0, enemy: "Greenveil Goblin" }),
    craftLuck: achievementBonus("craftLuck"),
    smallTextSize: Number.parseFloat(getComputedStyle(document.querySelector(".bestiary-entry small")).fontSize)
  }));
  expect(bonuses.combatCoins).toBeCloseTo(0.1, 5);
  expect(bonuses.craftLuck).toBe(3);
  expect(bonuses.smallTextSize).toBeGreaterThanOrEqual(9);

  await expect(page.locator('.sidebar > .nav-item[data-view="marketplace"] img')).toHaveAttribute("src", "assets/navigation/marketplace-v2.png");
  await expect(page.locator('.sidebar > .nav-item[data-view="adventure"] img')).toHaveAttribute("src", "assets/navigation/adventure-v2.png");
});
