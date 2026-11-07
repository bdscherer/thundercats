# ThunderCats: Third Earth

A single-player arcade fan game with twenty missions: twelve side-scrolling beat-’em-up chapters, six top-down vehicle routes, and two side-scrolling Space Board chases starring WilyKat and WilyKit. Switch between Lion-O, Cheetara, Panthro and Tygra on foot or in the tank and aircraft. HD inked cartoon artwork follows the original 1980s ThunderCats designs, with music and effects synthesized in real time.

## Play

For Google Sites, the [googlesite export](googlesite/README.md) includes ready-to-paste iframe code, a compact standalone game directory, and a single-file HTML alternative. The exported iframe and all six vehicle missions have been tested in restricted browser frames. Run `npm run build:googlesite` after game changes, then `npm run test:googlesite` to recheck the export.

Double-click **Launch Game.cmd**, or run:

```sh
npm run dev
```

Open **http://localhost:4173**. Node.js 20 or newer is required. No runtime dependency installation, account or internet connection is needed; optional Google Fonts have local fallbacks.

Choose one hero, a difficulty, and a starting mission. Start at mission 01 for the full campaign, or choose a vehicle mission to play it immediately. Adventure has fewer reinforcement waves and gentler damage; Arcade is the standard challenge; Thunder increases the opposition.

For another device on the same network, use the **Network** address printed in the terminal, such as `http://192.168.1.163:4173`. The server listens on all IPv4 interfaces by default. If Windows prompts, allow Node.js on the Private network. `localhost` on another device points to that device. Set `HOST=127.0.0.1` for computer-only access. Every device runs its own single-player game.

## Twenty missions

| Mission | Boss | Signature threat |
| --- | --- | --- |
| 01 · Cat’s Lair | Jackalman | Rushes and bombardment across the terraces. |
| 02 · Thundertank: Canyon Run | Monkian · Fistpounder | Cannon spreads and mine drops. |
| 03 · Whispering Forest | Slithe | Venom pools, cleaves and charges. |
| 04 · ThunderClaw: Sky Chase | Vultureman · Skycutter | Crossfire from both wings. |
| 05 · Space Boards: Tuskania Spillway | Giant Technopede | Floodgate gaps and star shells that split in flight. |
| 06 · Lost City | Grune the Destroyer | Mace strikes send fault lines across the plaza. |
| 07 · Burning Sands | Safari Joe | Rifle spreads and snares that slow the hero. |
| 08 · Feliner: Orbital Assault | Ratar-O · Ratstar | Wide orbital volleys and fighter escorts. |
| 09 · Treetop Heights | Red-Eye | Thrown discs double back across canopy bridges. |
| 10 · Snowman’s Pass | Chilla | Frost bursts slow movement on the ice. |
| 11 · Thundertank: Glacier Run | Tug-Mug · Luna Tacker | Slow volleys and marked gravity blasts. |
| 12 · Fire Rock Mountain | The Demolisher | Lunging uppercuts and shockwaves. |
| 13 · River of Despair | The Mad Bubbler | Drifting bubble volleys and poison zones. |
| 14 · ThunderClaw: Tempest Strike | Alluro · Skytomb | Psychic bursts overlap the storm’s lightning. |
| 15 · Castle Plun-Darr | Luna and Amok | Luna commands Amok, who pounces across the arena. |
| 16 · Mutant Foundry | Driller | Tunnels under the hero and leaves delayed eruptions. |
| 17 · Feliner: Deep Space | Captain Shiner · Vertus | Charged lasers sweep an entire marked column. |
| 18 · Astral Gate | Shadowmaster and Zaxx | Crossing shadow rifts and medallion volleys. |
| 19 · Space Boards: Berserker Coast | Hammerhand | Cannon lanes and a mechanical fist after a side-scrolling chase through sea stacks. |
| 20 · Black Pyramid | Mumm-Ra the Ever-Living | Spirit patterns, reinforcements and teleportation. |

Seven new illustrated environments are packed into two background atlases and loaded when first needed. They retain the soft scenery joins and gradual section lighting. Each new ground mission has four areas with its own floor material, weather or movement mechanic, encounter formations, and a final boss arena.

The campaign features 22 distinct original-series villains in 20 encounters. Bosses have three health phases, marked windups and recovery windows. Duo bosses stagger their windups and have separate phase bars. The [art and research notes](assets/ART.md#distinct-villain-roster) document the cartoon references and game-specific adaptations.

Switch with **1–4**, **Q/E**, **Tab**, **RB/R1**, or the on-screen roster. Health percentage, special charge, score and continues carry across heroes; changing pilots leaves vehicle hull and weapons intact. Switching has a 0.75-second cooldown and a 1.2-second input buffer for attack recovery. It does not cancel hurt, jumps, falls or active summon sequences. Saves preserve the selected hero and stable mission identity; older final-pyramid checkpoints still load the final pyramid.

The original cartoon’s Thundertank, ThunderClaw and Feliner have their own overhead artwork and handling. Vehicle routes last roughly 85–120 seconds in automated Arcade runs and include three themed sections, enemy formations, marked attack warnings, mines/rocks/asteroids, hull repairs, and a route boss. The background continues scrolling during boss encounters.

Vehicle hull health is separate from the hero’s on-foot health. A destroyed vehicle spends one of the hero’s continues and returns with full hull and brief protection; no continues remaining ends the run. Defeat the boss to continue on foot with the same hero, score, special charge and remaining continues.

In Tuskania Spillway and Berserker Coast, steer WilyKat and WilyKit together with WASD, arrow keys, or the gamepad. Hold **J / Space** to throw trick pellets from both boards. Press **K / I** to boost through danger or **L** for their charged pellet burst. The twins share armor and continues. After each chase, your selected hero resumes the campaign.

Ground chapters are 9,400–13,800 world units long, with 7–10 encounters, three or four themed sections, reinforcement waves, supplies, environmental hazards and a boss. Eight troop roles include soldiers, brutes, archers, shield guards, spear fighters, scouts, bomb throwers and spirit casters. Break shields with finishers, aerial attacks or attacks from behind. Move out of marked blasts and prioritize summoning casters.

Bosses have dedicated 12-pose sheets based on original cartoon references. Nearby scenery moves with the floor, distant scenery moves more slowly, and foreground landmarks pass faster. Heroes use eight-frame movement cycles, six combo poses and separate jump, air attack, landing, dodge, guard, hurt and down poses. Quick taps are buffered through hit-stop and recovery.

## Controls

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Move / steer | WASD or arrows | Left stick / D-pad |
| Attack / vehicle fire | J or Space | X / Square |
| Jump / vehicle boost | K | A / Cross |
| Charged special | L | Y / Triangle |
| Dodge / vehicle evasive burst | I | B / Circle |
| Hold block on foot | U | LB / L1 |
| Switch hero / pilot | 1–4, Q/E or Tab | RB / R1 |
| Pause | Escape / P | Start |
| Start / resume | Enter | Start |
| Fullscreen / mute | F / M | Toolbar buttons |

Any connected standard gamepad can control the single hero, including one assigned a nonzero browser index. Keyboard, touch and gamepad inputs can be mixed. Touch buttons change to FIRE and BOOST in vehicle missions. Vehicle boost has a 2.4-second cooldown and brief collision protection. Hold fire and keep moving.

On foot, chain three-hit attacks, jump over ground hazards, block toward attackers and use directional dodges. Regular hits give 3% special charge, finishers 4%, and power crystals 12%. There is no passive charging. Specials consume the full meter.

| Hero | Weapons | Special |
| --- | --- | --- |
| Lion-O | Sword of Omens and Claw Shield | Eye of Thundera calls all non-player ThunderCats, clears visible minor enemies and deals 28% maximum boss health damage. |
| Cheetara | Telescoping staff | Super-speed rush. |
| Panthro | Red-and-blue nunchaku | Thundertank drives in, fires three volleys at visible enemies, then drives away. |
| Tygra | Three-tailed bolo whip | Invisibility and a whip burst. |

The Thundertank special remains grounded using the actual tread contact point. Lion-O’s signal uses the classic red-and-black emblem and calls the other three heroes plus WilyKit, WilyKat, Jaga, Bengali, Pumyra, Lynx-O and Snarf.

Vehicle hits charge a separate vehicle meter. At 100%, L unleashes the cannon barrage, claw shockwave or laser nova, damaging visible enemies and removing incoming bullets. Special damage does not recharge the meter.

## Saves

Continue restarts the saved mission with its selected hero, score, on-foot stats and remaining continues. Completing a mission saves the next mission. Old multiplayer saves migrate to their original ground chapter with the first selected hero. Browser local storage also holds settings and high scores. Focus loss pauses play.

## Development

```sh
npm test
npm run check
npm run test:campaign
npm run test:vehicles
```

The 109 unit tests cover combat, input, checkpoint migration, hero switching, phase transitions, the distinct boss roster and signature attacks, environment hazards, vehicle handling, transitions, and hole falls. Retained multiplayer engine fixtures exercise backward compatibility; the playable campaign always creates one active hero.

Holes have cracked, perspective rims with matching foot collision. Walking or landing inside plays a fall animation, removes 22% of maximum health (rounded up), and returns the hero to nearby safe ground. The hero blinks and has damage protection for one second after returning, with movement immediately available. Jump over openings or walk around them; guard, dodge and invisibility cannot prevent a fall. Lion-O uses a separate corrected eight-frame run sheet with one sword and one claw shield.

`npm run test:pits` starts its own local preview server and checks all eight Lion-O run frames, left/right controls, the fall and return sequence, visible blinking, and all five ground-stage hole styles in Chromium. It saves screenshots and a report in `test-results/`.

Scenery tiles overlap with soft edges, including the Cat’s Lair-to-forest transition and vertical vehicle terrain. Ground-section colors and lighting blend over 640 world pixels, with paving and cracks staying aligned. Vehicle section shading also changes gradually. `npm run test:backgrounds` starts its own server and checks section transitions, scenery coverage, the lair edge, and vehicle terrain wraps in Chromium; screenshots and measurements are saved in `test-results/`.

The campaign simulation exercises the full Arcade progression without extra health or invulnerability. Run it with `0` for Lion-O, `2` for Panthro, or `0 --switch` to switch heroes during play. The vehicle simulation separately exercises all six Arcade routes.

After starting the server, browser verification uses the optional development dependencies:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

`CHROME_PATH` can select an existing Chromium executable. Browser checks cover exclusive hero selection, mission selection, on-foot controls and Panthro’s special, all six vehicle missions, steering, firing, boosts, scrolling, boss battles, checkpoints, old saves and mobile menus. Screenshots are saved in `test-results/`.

Additional checks: `npm run test:motion`, `npm run test:world`, `npm run test:tank`, `npm run test:boss-art`, and `npm run test:server`.

`src/campaign.js` manages the eight-mission single-player adventure. `src/game.js` handles ground combat; `src/vehicle.js` handles vehicle simulation; `src/vehicle-art.js` draws the overhead stages. `src/art.js`, `src/input.js`, `src/audio.js` and `src/main.js` handle the shared renderer, controls, sound and menus. `server.mjs` is a dependency-free local server.

Artwork, references and generation prompts are documented in [assets/ART.md](assets/ART.md).

`npm run test:expansion` starts its own server and checks the ten expedition missions, the 20-entry mission selector, keyboard/controller/on-screen hero switching, shared health and charge, duo boss bars, checkpoint resume, and mobile layout. The iframe check also tests Space Board steering, both riders’ pellets, boost, and charged burst. Both checks can use installed Chrome on Windows or `CHROME_PATH`.
