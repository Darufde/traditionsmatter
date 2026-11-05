# Traditions Matter

A browser game of survival, tradition and influence in a fictional North America. An Indigenous nation of the prairie–woodland borderlands lives through the seasons and the generations. Then strangers arrive from across the sea. Will the people trade with them, resist them, or try to do both, and will their language, gatherings, crafts and land survive?

You do not command the people. You are a voice they listen to. You spend **Respect** to speak in the **council**, whose members vote by their own convictions, and to shift the people's **leanings** over time. The game is deliberately weighted toward keeping the old ways. Tradition brings lasting strength, while the newcomers' goods bring quick comfort at a slow, real cost.

## Playing

No installation or build step. Either:

- open `index.html` in a modern browser, or
- serve the folder and visit it, for example:

```bash
python3 -m http.server 8000
```

then open <http://localhost:8000>.

### Controls

| Input | Action |
| --- | --- |
| Drag, or `W` `A` `S` `D` / arrow keys | Look around |
| Mouse wheel, pinch, or `Q` / `E` | Zoom |
| Click | Learn about a person, lodge, animal, plant, settler or field |
| `Space` | Pause and resume |
| `1` `2` `3` `4` | Normal, fast, faster and fastest speed |
| `K` | The council |
| `L` | Leanings |
| `T` | Traditions |
| `G` | Land and life (animals and plants) |
| `J` | The newcomers |
| `N` | Nation overview |
| `H` / `C` / `O` | Jump to the village / the hunting camp / the east |
| `F` | Follow the selected person |
| `Esc` | Close a panel, or open the pause menu |

## What is in this version

Version 0.2, "The newcomers".

**Main menu and settings.** An animated dusk scene. Before a new game you set up the nation (names with meanings, starting season, difficulty, population of 100–300 with a default of 200, and the world seed) and the graphics (quality, lighting, weather, name labels, interface size and frame rate).

**Your influence, not your orders.**
- **Respect** grows each day, faster when traditions are strong. Spending 3 lets you speak in council (up to three times on one matter), and spending 6 shifts a leaning.
- **The council** has eight members: the Peace Chief, the Hunt Leader, the Council Elders, the War Leader and the Voice of the Young. Each is a Keeper of the old ways, Peacemaker, War leader, Trader, Pragmatist or Voice of the young, with their own convictions. On the first day of each moon, and at once for urgent matters, they debate an issue. You see how each one leans and can speak to sway them. They may still outvote you. When a member dies, the times shape who replaces them.
- **Leanings** describe how the people live and choose:
  - our ways: hold to the old ways, take what is useful, or take up new tools;
  - toward the newcomers: keep our distance, be cautious, or welcome them;
  - the hunt: for our needs, or furs for trade;
  - our defense: seek peace, stay watchful, or prepare for war.

  People come round to a new leaning gradually.
- **Tradition** is made of four parts:
  - language, kept alive when elders teach the young;
  - gatherings: the Spring Renewal, the great ball game, the Harvest Gathering and the Midwinter Stories, all shown in the village;
  - crafts and knowledge;
  - the land itself.

  Unity rises and falls with them. The newcomers' ways are tracked separately: trade goods, dependence on trade, and their words and beliefs.

**The newcomers.**
- **Arrival:** in year 2, rumors and strange goods come from the east, and traders follow. In year 3 a colony with a log fort is founded in the eastern woods.
- **Growth:** the colony clears forest for wheat and pasture, builds log houses, a trading post and a meeting house, and lets its cattle and hogs roam. Its traders and teachers walk to the village.
- **Trade:** it brings kettles, knives, wool blankets, calico, beads and guns. These show up in the village: people wear calico and wool, and kettles replace clay pots. It also brings dependence, brandy, epidemics and an appetite for land.
- **Council decisions:** about twenty debates cover trade, furs, guns, land sales, boundaries, a missionary school, hogs in the corn, sickness, marriage, palisades, alliances and war.
- **Conflict is shown but never in gory detail.** War parties gather and set out, and settlements and lodges can burn. Soldiers march on the village: the people take refuge while warriors defend. Losses are reported respectfully, burned lodges are rebuilt, and treaties can end the fighting.
- **Endings** come in the thirteenth year, or earlier if the land is taken, the people are scattered, or the colony gives up: The People Endure, Keepers of the Fire, The Newcomers Withdrew, A Shared Land, The Fading, The Land Is Taken, and Scattered.

**The land and its life.**
- **Animals:** 13 species of wildlife live in herds, flocks and families: white-tailed deer, elk, bison, black bear, gray wolves following the herd, red fox, cottontails, wild turkeys, beaver at their lodges, great blue herons, ducks, Canada geese and crows. Each has an abundance that regrows when left alone and falls with hunting, fur trapping and lost forest. Shy animals flee from people.
- **Birds and the river:** eagles soar over the river, geese pass in Vs, passenger pigeon flocks darken the sky, and fish jump.
- **Plants:** 13 kinds of tree; 10 prairie flowers that bloom in their own seasons; ferns, trillium, mayapple and morels; raspberry, chokecherry, strawberry and elderberry; wild rice, water lilies and cattails; sunflowers along the fields.
- **Learning about them:** click any animal or plant for its description and its traditional uses.

**The daily round of the people** continues from version 0.1: families, clans, occupations, meals, evening fires, farming through the seasons, food, firewood, hides and health, illness, births and deaths. Hunters now hunt particular species, trappers take pelts, elders teach the children, young men train or build the palisade, and lodge-builders rebuild what burns.

**Graphics.**
- Drifting cloud shadows and trees and grass swaying in the wind.
- Falling leaves in autumn, butterflies in summer and fireflies on summer nights.
- Dappled shade under the forest canopy, a soft vignette, and burning buildings that light the night.
- Many new procedural sprites and figures.

## Historical approach

The setting is before contact, so there are no horses, metal tools, guns, woven cloth or glass beads.

- Dogs pull the travois, so tipis are small.
- Tools are made of stone, bone, antler and wood. Hoes are made from bison shoulder blades.
- Pots are shell-tempered fired clay. Clothing is tanned deer and bison hide, decorated with quillwork and paint.

The nation, its people and its language are invented. They draw on the many peoples of the prairie–woodland borderlands without portraying any one of them, and sacred ceremonies are deliberately left out.

## Project layout

```
index.html        screens and interface markup
css/style.css     interface styles
js/core.js        constants, random numbers, noise, pathfinding, storage
js/names.js       the invented language used for names
js/people.js      households, ages, clans, occupations, leaders, appearance
js/world.js       terrain, river, fields, village and camp layout, trails, plants, colony plan
js/nature.js      animals and plants: abundance, wildlife groups, birds, knowledge
js/culture.js     tradition, leanings, Respect, the council, debates, gatherings, endings
js/colony.js      the newcomers: timeline, growth, land, settlers, trade, conflict, sickness
js/sim.js         calendar, weather, economy, crops, health, daily routines
js/sprites.js     procedural, cached art for lodges, tipis, trees, crops, props
js/sprites2.js    flowers, wetland plants, berry bushes, colony buildings, fields, ruins
js/figures.js     people, dogs, deer, bison and fire, drawn each frame
js/figures2.js    settlers, other animals, livestock and birds in flight
js/render.js      isometric renderer, lighting, weather, picking, minimap
js/menu.js        animated main-menu backdrop
js/ui.js          HUD, tooltips, panels, chronicle, modals, settings form
js/ui2.js         council debate, leanings, traditions, land and life, colony, endings
js/main.js        screens, new-game setup, main loop and input
tools/            headless test helpers (Node)
```

Everything is plain JavaScript with no dependencies. All graphics are drawn in code.

### Balance testing

`tools/simtest.js` runs the simulation without a browser and prints daily stores:

```bash
node tools/simtest.js Spring balanced 96 42
```

The arguments are starting season, difficulty, number of days and seed. Council debates are settled by the members' votes. Set `POLICY=open`, `POLICY=trad` or `POLICY=war` to force the most open, most traditional or most warlike option instead, which shows how each path plays out over the years.

## Where it goes next

- More villages, and relocating the nation
- Diplomacy with neighboring nations
- Several generations of leaders
- Saving and loading games
