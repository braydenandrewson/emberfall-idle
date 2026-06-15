# Missing Item Art — Generation Kit

These 22 items currently fall back to a generic CSS icon because no painted PNG exists
in `assets/items-clean/`. Generate art with an image model, save each as the exact
filename below into **`assets/items-clean/`**, and the game picks it up automatically
(no code change, no cache bump needed for new files).

## Style (match the existing set, e.g. health-potion.png, copper-ore.png, cinder-scale.png)
> Painted fantasy RPG inventory icon. A single centered object, 3/4 view, semi-realistic
> game-art style. Soft warm radial glow behind the object, dark/transparent background.
> Light source upper-left, subtle drop shadow. Square, ~128×128 (or 256 then downscale),
> transparent PNG. No text, no border, no UI frame.

Append the style block above to each prompt below.

## Combat materials (dropped by enemies)
| filename | prompt subject |
|---|---|
| `mire-resin.png` | a glob of glowing amber-green swamp resin, sticky and translucent |
| `rotbloom.png` | a sickly luminescent fungal bloom with purple-green glowing spores |
| `sunscar-hide.png` | a tan desert-beast hide with glassy, scorched scar marks |
| `sunstone-shard.png` | a glowing amber-gold crystalline shard radiating warm light |
| `stormglass.png` | a jagged shard of translucent blue glass with lightning trapped inside |
| `charged-cog.png` | an ancient brass-and-iron clockwork cog crackling with blue storm energy |
| `void-shard.png` | a fractured obsidian-black crystal shard leaking violet void light |
| `worldstone-fragment.png` | a chunk of pale celestial stone glowing with tiny constellations |

## Boss relics (rare trophies; also craft ingredients)
| filename | prompt subject |
|---|---|
| `mireheart-pearl.png` | a large iridescent green-black pearl with a faint inner heartbeat glow |
| `solar-core.png` | a blazing golden-orange molten core orb radiating sun rays |
| `tempest-heart.png` | a crackling violet-blue storm-crystal heart wreathed in lightning arcs |
| `worldscar-fragment.png` | a fragment of fractured cosmos — a starfield set within black stone |

## Tonics / consumables (glass bottle/vial silhouette like battle-tonic.png)
| filename | prompt subject |
|---|---|
| `ironbark-elixir.png` | an earthy brown elixir bottle wrapped in bark and a green leaf |
| `swiftwater-serum.png` | a bright cyan serum vial with fast-swirling liquid |
| `venom-oil.png` | a dark-green vial of toxic oil with a faint sickly glow |
| `ward-draught.png` | a blue draught bottle etched with a glowing protective ward rune |
| `fortune-philter.png` | an ornate teal potion bottle with gold filigree and sparkling lucky mist |

## Guild service items
| filename | prompt subject |
|---|---|
| `forge-essence.png` | a swirling mote of molten-orange forge essence inside a small glass shard |
| `reforge-token.png` | a stamped bronze guild token coin embossed with an anvil sigil |
| `guild-armory-blueprint.png` | a rolled parchment blueprint with a glowing rune seal and wax stamp |

## Guildmaster equipment (Steel tier, ornate)
| filename | prompt subject |
|---|---|
| `guildmaster-blade.png` | an ornate steel longsword with a gold guild-crest pommel |
| `guildmaster-ward.png` | a polished steel kite shield bearing a gold guild emblem |
