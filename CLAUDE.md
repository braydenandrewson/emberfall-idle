# Emberfall Idle — Project Guide

A browser-based **idle/incremental RPG** ("Emberfall Idle Adventures"), inspired by
Melvor Idle. Train gathering/crafting skills, forge a full equipment progression, and
fight through escalating combat zones and bosses — with offline progression. Runs as an
installable PWA (web app manifest), 100% client-side.

> This file is the persistent project memory. There is no separate `AGENTS.md`/README;
> the source code and git history are the source of truth. Keep this file updated when
> architecture or current state changes.

## Tech stack

- **Vanilla JS, no framework, no build step.** Single `game.js` (~3,250 lines) holds all
  game data and logic. `index.html` is the static shell; `styles.css` the styling.
- No bundler, no npm dependencies for the app itself. (`package.json` was removed — see
  Current State.) The only tooling dependency is Playwright for tests.
- Cache-busted asset refs in `index.html` use `?v=N` query strings (e.g.
  `styles.css?v=12`, `game.js?v=12`). **Bump these when changing those files** so the
  browser/PWA picks up the new version.

## How to run

The game must be served over HTTP (not opened as a `file://`), because it uses
localStorage keyed per-origin and fetches local assets.

- **Easiest:** double-click `Start Emberfall.bat` (Windows). It runs `Start-Emberfall.ps1`,
  which starts `python -m http.server 8000` bound to `0.0.0.0` and opens the browser.
  It serves on `http://localhost:8000`, and also prints a stable LAN URL
  (`http://<COMPUTERNAME>:8000`) so a phone on the same network can play/install it.
- **Manual:** `python -m http.server 8000` from the repo root, then open
  `http://localhost:8000`.
- `.tunnel-url.txt` holds a localtunnel URL from a past sharing session (not auto-managed).

## Running tests

Playwright end-to-end tests live in `tests/emberfall.spec.js`. They assume the game is
served at `http://localhost:8000` (start the server first, then run Playwright). Tests
cover: core progression surfaces render, view navigation, production queue persistence,
threat selection + mobile nav, and achievement/bestiary tracks. They assert
`pageerror` is empty, so **runtime JS errors fail the suite**.

## Architecture / code map (`game.js`)

Roughly top-to-bottom:

1. **Constants** (lines ~1–14): `SAVE_KEY`, `SAVE_BACKUP_KEY`, `AUTH_KEY`,
   `MAX_LEVEL` (100), `MAX_THREAT` (5), `MAX_OFFLINE_HOURS` (12), production skill list,
   potion config.
2. **Game data tables** (objects/arrays, ~15–630): the content of the game.
   - `combatStyles`, `combatEventData`, `enemyTraits`
   - `rarityData`, `affixData` (gear rarity + affixes/enchanting)
   - `townProjectData`, `townBranchData`, `relicPowerData`, `blueprintData`
   - `rotatingMerchantData`, `crossSkillData`
   - `generalAchievementTracks` (+ `zoneAchievementTracks`, `enemyAchievementTracks`
     derived from `zoneData`)
   - `equipmentTierVisuals` drives the hero paper-doll overlay colors by equipped tier.
   - `itemData` (all items), `zoneData` (combat zones + enemies + bosses),
     `masteryMilestones`, `equipmentTierData`, `equipmentData`, `craftingRecipes`,
     `skillData` (mining/woodcutting/fishing/smithing/cooking/alchemy + their actions)
3. **`defaultState()`** (~633): the canonical shape of a save/game state object. The
   single global `state` is the live game state.
4. **Pure helpers / formulas** (~672–930): XP curves (`xpForLevel`, `levelForXp`,
   mastery + action-expertise variants), stat math (`attackPower`, `defencePower`,
   `maxHit`, `maxHp`, `combatLevel`, `hitChance`, `critChance`), zone/threat scaling,
   crafting/gear value. Resonance/synergy and combat abilities were intentionally removed.
5. **Save system** (~1191–1340): `loadState`, `normalizeState` (migrates/repairs older
   saves into current shape — **critical for backwards compatibility**),
   `saveProgressScore`, `saveState`. Plus `migrateAccountSave()` (~3031).
6. **Production queue + offline progression** (~1340–1607): cross-skill job queue,
   `applyOfflineProduction`, `applyOfflineCombat`, `applyOfflineProgress`.
7. **Main loop** (~1607): `tick(now)` → `updateSkill` / `updateCombat` /
   `updateBossPhase`. Combat is timer-based (player + enemy attack timers, combat styles,
   automatic combat events, enemy traits, auto-eat).
8. **Rendering** (~1961+): one big set of `render*` functions, one per view/panel
   (`renderCombatSetup`, `renderSkill`, `renderInventory`, `renderCrafting`,
   `renderMarketplace`, `renderMastery`, `renderAdventure`, `renderDirector`, etc.).
   DOM is queried by id/class; no virtual DOM — render functions rebuild innerHTML.
9. **Actions/handlers** (interleaved): `select*`, `craftGear`, `equipGear`,
   `salvageGear`, `enchantGear`, contract/town/market handlers,
   `exportSave`/`importSave`/`resetProgress`.

### Views
The UI is a single page with a sidebar nav switching `.view` sections (see `index.html`):
Combat, Skills (mining/woodcutting/fishing/smithing/cooking/alchemy share one skill
view), Crafting, Inventory, Marketplace, Adventure Board, All Skills (mastery), Settings.
Mobile uses a compact nav with a "+ More" menu.

### Save system details
- Saved to **localStorage** under `emberfall-idle-save-v1`, with a second backup key
  `…-v1-backup`. Fully local/offline — **no server, no network calls** (verified).
- `recovery-save.js` was removed from the public build. Do not re-add hardcoded personal
  saves; use Settings export/import for manual backups and recovery.
- Export/Import backup is JSON via the Settings view.
- When changing `state` shape, update both `defaultState()` and `normalizeState()` so old
  saves keep loading.

## Conventions / gotchas

- **Match the existing terse style:** compact object literals, short helper functions,
  multipliers as decimals (`.95`), data-driven design (add content by editing the data
  tables, not by writing new code paths).
- New content (items, enemies, recipes, zones, skills) = add entries to the relevant data
  table; rendering and logic are generic and pick them up.
- Asset images live in `assets/` (`assets/skills/*-v2.png`, `assets/navigation/*-v2.png`,
  `assets/enemies/*.png`, `assets/items/*.png`, plus `assets/items-clean/*` variants).
  Names referenced from data tables (`image:` fields, `skillIconPath`, `itemIcon`).
- Bump `?v=N` in `index.html` after editing `game.js`/`styles.css`.
- `index.html` installs a `window.onerror` handler that stashes the message in
  `document.documentElement.dataset.emberfallError` — useful for debugging/tests.
- After meaningful changes, run the Playwright suite (server must be up on :8000).
- Current long-term loops include chapter questlines, starter quests, repeatable bounties,
  township contributions, reward reveal modals, combat event windows, and the gear
  collection log. Keep these data-driven and do not reintroduce manual combat abilities.
- The hero model is a CSS/JS paper doll: `renderHeroModels()` layers weapon, shield,
  helm, and armor overlays on top of `assets/hero.png` using equipped item tiers.

## Current state (as of 2026-06-15)

- Built by Codex over 8 commits, then a large batch of work was committed as a snapshot
  (`32580b8`) when Claude took over.
- **Cloud saves / player accounts were rolled back.** Earlier commits added a Netlify
  function backend (`netlify/functions/save.js`, `netlify.toml`, `package.json`) for
  accounts + cloud saves; the latest (uncommitted-then-snapshotted) work **deleted** all
  of that. `migrateAccountSave()` now just migrates any old per-account localStorage save
  back to the local key and clears `AUTH_KEY`. The game is now **local-only**. The
  `AUTH_KEY` constant and migration remain only for backward compatibility.
- Recent additions present in the snapshot: expanded zone/enemy/boss roster, full
  gear/crafting tiers with rarity/affixes/enchanting, production queue, mastery + action
  expertise, achievement/bestiary tracks, town projects, marketplace, Playwright tests,
  and refreshed `-v2` art assets.
