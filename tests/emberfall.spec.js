const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BUILD_URL = "http://localhost:8000/?build=progression-v29";
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
  await expect(page.locator("#zone-spoils-name")).toContainText("Greenveil Forager's Cache");
  await expect(page.locator("#enemy-loot")).toContainText("Greenveil Forager's Cache");
  await expect(page.locator("#enemy-list .enemy-option").first()).toContainText("Copper support");
  await expect(page.locator("#hero-model > img")).toHaveAttribute("src", "assets/hero.png");
  await expect(page.locator("#hero-model .hero-gear")).toHaveCount(0);
  await expect(page.locator("#director-goals")).toContainText("Starter:");
  expect(errors).toEqual([]);
});

test("equipped gear keeps base hero portrait", async ({ page }) => {
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
  await expect(hero.locator("> img")).toHaveAttribute("src", "assets/hero.png");
  await expect(hero.locator(".hero-gear,.hero-set-aura")).toHaveCount(0);
  expect(await hero.getAttribute("data-loadout")).toBeNull();

  await page.locator('[data-view="inventory"]').click();
  await expect(page.locator("#equipment-slots")).toContainText("Bronze Sword");
  await expect(page.locator("#equipment-slots")).toContainText("Active Set Bonuses");
  await expect(page.locator("#inventory-hero-model > img")).toHaveAttribute("src", "assets/hero.png");
  await expect(page.locator("#inventory-hero-model .hero-gear,.hero-set-aura")).toHaveCount(0);
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

test("inventory explains item purpose and supports gear cleanup", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const save = {
      characterName: "Inventory Tester",
      inventory: {
        "Goblin Scrap": 24,
        "Forge Essence": 5,
        "Reforge Token": 2,
        "Health Potion": 3,
        "Trailbreaker Crest": 1
      },
      gearMigrated: true,
      nextGearId: 5,
      equipment: { weapon: "gear-1", shield: "Wooden Shield", body: "Leather Jerkin", head: "None" },
      gearVault: [
        { id: "gear-1", baseName: "Bronze Sword", rarity: "common", upgrade: 0, affixes: [] },
        { id: "gear-2", baseName: "Iron Sword", rarity: "rare", upgrade: 1, affixes: [{ id: "attack", stat: "attack", value: 3 }] },
        { id: "gear-3", baseName: "Bronze Shield", rarity: "common", upgrade: 0, affixes: [] },
        { id: "gear-4", baseName: "Bronze Dagger", rarity: "common", upgrade: 0, affixes: [] }
      ],
      lastSeen: Date.now()
    };
    localStorage.setItem("emberfall-idle-save-v1", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-save-v1-backup", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-recovery-20260613", "1");
  });
  await page.goto(BUILD_URL);
  await page.locator('[data-view="inventory"]').click();

  await expect(page.locator("#inventory-summary")).toContainText("Spare Gear");
  await expect(page.locator("#inventory-grid")).toContainText("Used in:");
  await expect(page.locator("#inventory-grid")).toContainText("Best source:");
  await expect(page.locator("#inventory-grid")).toContainText("Compared to Bronze Sword");
  await expect(page.locator("#inventory-grid")).toContainText("Power");

  await page.locator("#inventory-category").selectOption("crafting");
  await expect(page.locator("#inventory-grid")).toContainText("Goblin Scrap");
  await page.locator("#inventory-category").selectOption("upgrade");
  await expect(page.locator("#inventory-grid")).toContainText("Forge Essence");
  await expect(page.locator("#inventory-grid")).toContainText("Reforge Token");
  await page.locator("#inventory-category").selectOption("relic");
  await expect(page.locator("#inventory-grid")).toContainText("Trailbreaker Crest");
  await page.locator("#inventory-category").selectOption("equipment");
  await expect(page.locator("#inventory-grid")).toContainText("Iron Sword");

  await page.getByRole("button", { name: "Protect Best Gear" }).click();
  let stateSnapshot = await page.evaluate(() => ({
    locked: state.lockedGear,
    gearIds: state.gearVault.map(gear => gear.id)
  }));
  expect(stateSnapshot.locked).toEqual(expect.arrayContaining(["gear-1", "gear-2", "gear-3"]));

  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Salvage Common Gear" }).click();
  stateSnapshot = await page.evaluate(() => ({
    forgeEssence: state.inventory["Forge Essence"] || 0,
    gearIds: state.gearVault.map(gear => gear.id)
  }));
  expect(stateSnapshot.gearIds).not.toContain("gear-4");
  expect(stateSnapshot.forgeEssence).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test("boss first clears and repeat chests give distinct progression rewards", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const save = {
      characterName: "Boss Tester",
      zoneKills: [10],
      unlockedZones: 1,
      bossDefeated: [false],
      bestiary: { kills: {}, drops: {}, bosses: {} },
      inventory: {},
      gearVault: [],
      nextGearId: 1,
      lastSeen: Date.now()
    };
    localStorage.setItem("emberfall-idle-save-v1", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-save-v1-backup", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-recovery-20260613", "1");
  });
  await page.goto(BUILD_URL);

  const firstClear = await page.evaluate(() => {
    const originalRandom = Math.random;
    Math.random = () => 0.99;
    try {
      state.currentZone = 0;
      state.zoneKills[0] = 10;
      state.fightingBoss = true;
      state.bossDefeated[0] = false;
      state.enemyHp = 1;
      defeatEnemy();
      return {
        unlockedZones: state.unlockedZones,
        bossDefeated: state.bossDefeated[0],
        bossKills: state.bestiary.bosses["Grak the Trailbreaker"] || 0,
        crest: state.inventory["Trailbreaker Crest"] || 0,
        essence: state.inventory["Forge Essence"] || 0,
        battleTonic: state.inventory["Battle Tonic"] || 0,
        bestRarity: state.gearVault.map(gear => gear.rarity)
      };
    } finally {
      Math.random = originalRandom;
    }
  });

  await expect(page.locator("#reward-subtitle")).toContainText("First-clear boss chest");
  expect(firstClear.unlockedZones).toBe(2);
  expect(firstClear.bossDefeated).toBe(true);
  expect(firstClear.bossKills).toBe(1);
  expect(firstClear.crest).toBeGreaterThanOrEqual(1);
  expect(firstClear.essence).toBeGreaterThanOrEqual(2);
  expect(firstClear.battleTonic).toBeGreaterThanOrEqual(1);
  expect(firstClear.bestRarity).toContain("rare");

  const repeat = await page.evaluate(() => {
    const originalRandom = Math.random;
    Math.random = () => 0.99;
    try {
      state.currentZone = 0;
      state.zoneKills[0] = 50;
      state.zoneThreats[0] = 3;
      state.fightingBoss = true;
      state.enemyHp = 1;
      const beforeEssence = state.inventory["Forge Essence"] || 0;
      defeatEnemy();
      return {
        bossKills: state.bestiary.bosses["Grak the Trailbreaker"] || 0,
        essenceGain: (state.inventory["Forge Essence"] || 0) - beforeEssence,
        tokens: state.inventory["Reforge Token"] || 0,
        preview: bossChestPreviewText(0)
      };
    } finally {
      Math.random = originalRandom;
    }
  });

  await expect(page.locator("#reward-subtitle")).toContainText("Repeat boss chest");
  expect(repeat.bossKills).toBe(2);
  expect(repeat.essenceGain).toBeGreaterThanOrEqual(2);
  expect(repeat.tokens).toBeGreaterThanOrEqual(2);
  expect(repeat.preview).toContain("Repeat chest");
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
      (zone.cache?.items || []).forEach(drop => values.add(drop.item));
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

test("cartography and huntsmanship produce useful combat tools", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const save = {
      characterName: "Pathfinder",
      inventory: {
        "Logs": 20,
        "Goblin Scrap": 20,
        "Trail Map": 1,
        "Boss Lure": 1
      },
      bossDefeated: [true],
      zoneKills: [20],
      unlockedZones: 2,
      bestiary: { kills: {}, drops: {}, bosses: { "Grak the Trailbreaker": 2 } },
      lastSeen: Date.now()
    };
    localStorage.setItem("emberfall-idle-save-v1", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-save-v1-backup", JSON.stringify(save));
    localStorage.setItem("emberfall-idle-recovery-20260613", "1");
  });
  await page.goto(BUILD_URL);

  await page.locator('.sidebar > .nav-item[data-view="cartography"]').click();
  await expect(page.getByRole("heading", { name: "Cartography", exact: true })).toBeVisible();
  await expect(page.locator("#action-list")).toContainText("Trail Survey");
  await expect(page.locator("#nav-cartography")).toHaveText("1");

  const result = await page.evaluate(() => {
    const trailBefore = state.inventory["Trail Map"] || 0;
    completeSkillCycle("cartography", skillData.cartography.actions[0]);
    state.inventory["Trail Map"] = Math.max(state.inventory["Trail Map"] || 0, 2);
    completeSkillCycle("huntsmanship", skillData.huntsmanship.actions[0]);
    const cacheBeforeUse = zoneCacheChance(0, 0);
    useInventoryItem("Tracking Snare");
    const cacheAfterUse = zoneCacheChance(0, 0);
    useInventoryItem("Boss Lure");
    const preview = bossChestPreviewText(0);
    return {
      trailBefore,
      trailAfter: state.inventory["Trail Map"] || 0,
      snareActive: state.buffs.tracking > Date.now(),
      bossLureActive: state.buffs.bosslure > Date.now(),
      cacheBeforeUse,
      cacheAfterUse,
      preview,
      cartographyXp: state.skills.cartography.xp,
      huntsmanshipXp: state.skills.huntsmanship.xp
    };
  });

  expect(result.trailAfter).toBeGreaterThanOrEqual(result.trailBefore);
  expect(result.snareActive).toBe(true);
  expect(result.bossLureActive).toBe(true);
  expect(result.cacheAfterUse).toBeGreaterThan(result.cacheBeforeUse);
  expect(result.preview).toContain("Boss Lure active");
  expect(result.cartographyXp).toBeGreaterThan(0);
  expect(result.huntsmanshipXp).toBeGreaterThan(0);

  await page.locator('.sidebar > .nav-item[data-view="huntsmanship"]').click();
  await expect(page.getByRole("heading", { name: "Huntsmanship", exact: true })).toBeVisible();
  await expect(page.locator("#action-list")).toContainText("Tracking Snare");
  await expect(page.locator("#combat-status-list")).toContainText("Tracking Snare");
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
