# Emberfall Idle

A browser-based dark-fantasy **idle/incremental RPG**. Train your skills, forge a full
armory, and fight through escalating zones and bosses — even while you're away.

Its twist on the genre: you **gather and fight at the same time**, and aligning the two
(Expedition Synergy) builds momentum that powers up both.

> **Play in your browser:** https://braydenandrewson.github.io/emberfall-idle/
> *(Update this link after enabling GitHub Pages — see below.)*

## Features

- **Dual-track idle** — run a gathering/crafting skill and combat simultaneously
- **Expedition Synergy & Momentum** — fight a zone while gathering its native resource for a ramping bonus
- **6 skills** — Mining, Woodcutting, Fishing, Smithing, Cooking, Alchemy, each feeding the others
- **8 combat zones** with bosses, selectable Threat ranks, enemy traits, and combat abilities
- **10 equipment tiers** with rarity, affixes, upgrading, enchanting, reforging, and set bonuses
- **Mastery & Action Expertise**, a cross-skill **production queue**, and **Ember Resonance / Overcharge**
- **Adventure Board** — guild contracts, township projects, achievement tracks, and a bestiary
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
