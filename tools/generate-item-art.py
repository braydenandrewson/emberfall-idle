#!/usr/bin/env python3
"""
Generate the missing Emberfall item icons with OpenAI gpt-image-1.

Usage:
  1. Put your key in a .env file at the repo root:  OPENAI_API_KEY=sk-...
     (.env is gitignored — it will never be committed.)
  2. Run from the repo root:   python tools/generate-item-art.py
     - Skips items that already have a PNG (safe to re-run; no wasted cost).
     - Force one/all:  python tools/generate-item-art.py --force [name-slug ...]

Outputs transparent 256x256 PNGs into assets/items-clean/.
Cost: ~$0.02-0.06 per image at medium quality (22 items ~ $1-2).
"""
import base64, io, json, os, sys, time, urllib.request, urllib.error
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "assets" / "items-clean"
API_URL = "https://api.openai.com/v1/images/generations"

STYLE = (
    " Painted fantasy RPG inventory icon, a single centered object, 3/4 view, "
    "semi-realistic game-art style, soft warm magical glow around the object, "
    "light source upper-left, subtle drop shadow, transparent background, "
    "no text, no border, no UI frame, centered with padding."
)

# slug (filename without .png) -> prompt subject
ITEMS = {
    # combat materials
    "mire-resin": "a glob of glowing amber-green swamp resin, sticky and translucent",
    "rotbloom": "a sickly luminescent fungal bloom with purple-green glowing spores",
    "sunscar-hide": "a tan desert-beast hide with glassy scorched scar marks",
    "sunstone-shard": "a glowing amber-gold crystalline shard radiating warm light",
    "stormglass": "a jagged shard of translucent blue glass with lightning trapped inside",
    "charged-cog": "an ancient brass and iron clockwork cog crackling with blue storm energy",
    "void-shard": "a fractured obsidian-black crystal shard leaking violet void light",
    "worldstone-fragment": "a chunk of pale celestial stone glowing with tiny constellations",
    # boss relics
    "mireheart-pearl": "a large iridescent green-black pearl with a faint inner heartbeat glow",
    "solar-core": "a blazing golden-orange molten core orb radiating sun rays",
    "tempest-heart": "a crackling violet-blue storm crystal heart wreathed in lightning arcs",
    "worldscar-fragment": "a fragment of fractured cosmos, a starfield set within black stone",
    # tonics / consumables (glass bottle/vial silhouette)
    "ironbark-elixir": "an earthy brown elixir bottle wrapped in bark and a green leaf",
    "swiftwater-serum": "a bright cyan serum vial with fast-swirling liquid",
    "venom-oil": "a dark green vial of toxic oil with a faint sickly glow",
    "ward-draught": "a blue draught bottle etched with a glowing protective ward rune",
    "fortune-philter": "an ornate teal potion bottle with gold filigree and sparkling lucky mist",
    # guild service items
    "forge-essence": "a swirling mote of molten orange forge essence inside a small glass shard",
    "reforge-token": "a stamped bronze guild token coin embossed with an anvil sigil",
    "guild-armory-blueprint": "a rolled parchment blueprint with a glowing rune seal and wax stamp",
    # guildmaster equipment (Steel tier, ornate)
    "guildmaster-blade": "an ornate steel longsword with a gold guild-crest pommel",
    "guildmaster-ward": "a polished steel kite shield bearing a gold guild emblem",
}


def load_key():
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        env = REPO / ".env"
        if env.exists():
            for line in env.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("OPENAI_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        sys.exit("ERROR: OPENAI_API_KEY not found. Add it to a .env file at the repo root.")
    return key


def generate(slug, subject, key):
    body = json.dumps({
        "model": "gpt-image-1",
        "prompt": subject + "." + STYLE,
        "size": "1024x1024",
        "quality": "medium",
        "background": "transparent",
        "output_format": "png",
        "n": 1,
    }).encode()
    req = urllib.request.Request(API_URL, data=body, method="POST", headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read())
    raw = base64.b64decode(data["data"][0]["b64_json"])
    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    img.thumbnail((256, 256), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{slug}.png")


def main():
    args = [a for a in sys.argv[1:]]
    force = "--force" in args
    only = [a for a in args if a != "--force"]
    key = load_key()
    todo = {s: p for s, p in ITEMS.items() if (not only or s in only)}
    made, skipped, failed = 0, 0, 0
    for slug, subject in todo.items():
        dest = OUT / f"{slug}.png"
        if dest.exists() and not force:
            print(f"  skip (exists): {slug}")
            skipped += 1
            continue
        try:
            print(f"  generating:    {slug} ...", flush=True)
            generate(slug, subject, key)
            made += 1
            time.sleep(1)
        except urllib.error.HTTPError as e:
            print(f"  FAILED {slug}: HTTP {e.code} {e.read().decode(errors='replace')[:300]}")
            failed += 1
        except Exception as e:
            print(f"  FAILED {slug}: {e}")
            failed += 1
    print(f"\nDone. created={made} skipped={skipped} failed={failed} -> {OUT}")


if __name__ == "__main__":
    main()
