# Emberfall Idle

A browser-based dark-fantasy **idle/incremental RPG**. Train your skills, forge a full
armory, and fight through escalating zones and bosses — even while you're away.

Its twist on the genre: you **gather, craft, and fight in parallel**, using each system to feed the next without needing a separate prestige-resource layer.

> **Play in your browser:** https://braydenandrewson.github.io/emberfall-idle/
> *(Update this link after enabling GitHub Pages — see below.)*

For iPhone home-screen installs, open the GitHub Pages game URL above before using
**Share -> Add to Home Screen**. Installing from the `github.com/.../emberfall-idle`
repository page will launch GitHub, not the playable web app.

## Features

- **Dual-track idle** — run a gathering/crafting skill and combat simultaneously
- **6 skills** — Mining, Woodcutting, Fishing, Smithing, Cooking, Alchemy, each feeding the others
- **8 combat zones** with bosses, selectable Threat ranks, enemy traits, and combat stances
- **10 equipment tiers** with rarity, affixes, upgrading, enchanting, reforging, and set bonuses
- **Deep equipment progression** — forged gear changes combat stats, rarity, affixes, upgrades, enchants, reforges, and set bonuses
- **Mastery & Action Expertise**, a cross-skill **production queue**, and practical achievement rewards
- **Adventure Board** — starter quests, chapter questlines, guild contracts, repeatable zone bounties, township contributions, achievement tracks, and a bestiary
- **Reward reveal moments** for contracts, chapters, bounties, bosses, rare drops, and collection completions
- **Gear collection log** with tier completion rewards for building out full equipment sets
- **Combat events** that create temporary weak points, ambushes, guard windows, and rally rewards
- **Progressive township funding** — contribute materials over time instead of needing every project cost upfront
- **Smithing components** — forged gear now uses bars, matching wood, and component prep such as grips, shield frames, and armor lining
- **Offline progression** (up to 12 hours), a satisfying welcome-back recap
- **Procedural ambient soundtrack** synthesized live in-browser (no audio files)
- Installable **PWA**, 100% client-side — saves live in your browser via `localStorage`

## Play locally

The game must be served over HTTP (not opened as a `file://`).

- **Windows:** double-click **`Start Emberfall.bat`** — it starts a local server and opens your browser.
- **Any OS:** from the project folder run `python -m http.server 8000`, then open `http://localhost:8000`.

Click once in the page to start the soundtrack (browser autoplay rule), and adjust it in **Settings → Soundtrack**.

## Host it free on GitHub Pages

Because the game is fully static, GitHub can host it:

1. Repo **Settings → Pages**
2. **Source:** Deploy from a branch → **main** / **/ (root)** → **Save**
3. After ~1 minute it's live at `https://braydenandrewson.github.io/emberfall-idle/`

## Tech

Vanilla JavaScript, HTML, and CSS — **no framework, no build step**. All game logic lives
in `game.js`; styling in `styles.css`. Saves are stored in `localStorage` with an automatic
backup key. The `.bat`/`.ps1` launcher and `emberfall.ico` are only for running on Windows.

## License

Personal project — all rights reserved unless a license file is added.
