# Traditions Matter

A browser-based survival and strategy game set in a fictional North America. You lead an Indigenous nation of the prairie–woodland borderlands through the seasons and the generations. In later chapters a foreign colony appears, and your choices decide what becomes of your land and your people.

This first version (0.1, "The first village") builds the foundation: a main menu, a settings screen, and a living nation of 200 people before European contact.

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
| Click | Learn about a person, a lodge or the fields |
| `Space` | Pause and resume |
| `1` `2` `3` | Normal, fast and fastest speed |
| `N` | Nation overview |
| `H` / `C` | Jump to the village / the hunting camp |
| `F` | Follow the selected person |
| `Esc` | Close a panel, or open the pause menu |

## What is in this version

**Main menu.** An animated dusk scene over the prairie edge, with New Game, Settings and About.

**Settings.**
- *Nation setup* (before a new game): the nation's name and the main village's name (with generated names that carry meanings), starting season, difficulty (Gentle, Balanced, Harsh), starting population (100–300, default 200) and the world seed.
- *Graphics*: quality (Low, Medium, High), day and night lighting, weather effects, name labels, interface size and a frame-rate counter. Graphics settings are saved in the browser.

**The nation.**
- About 200 people in roughly 43 families, each with a name in an invented language and its English meaning, an age, a clan (Elk, Crane, Turtle, Bear, Hawk, Otter), an occupation, skills, health and family ties.
- A peace chief, a hunt leader, council elders and healers. The council meets on the first day of every moon.
- **The village**: elm-bark longhouses shared by related families, dome wigwams covered with cattail mats in summer and bark in winter, a council lodge, storage platforms and pits, drying racks, hide frames, a sweat lodge, hearths with clay pots, woodpiles, dugout canoes and a fish weir.
- **The hunting camp** across the river: small bison-hide tipis in a circle opening to the east, with doors facing the sunrise, dog travois, meat racks and pegged hides.
- Floodplain fields of maize, beans and squash planted together in hills, with watch platforms.

**A living simulation.**
- Every person follows a daily round: waking, work, meals at the family hearth, evenings by the central fire, and sleep. Work includes farming, hunting deer in the forest and bison on the prairie, fishing, gathering, firewood, fetching water, scraping hides, pottery, mat-weaving, flintknapping, lodge repair, tending the sick, guarding the fields and children's games.
- Four seasons of twelve days, each split into three named moons, plus weather: rain, thunderstorms, fog, snow, heat and bitter cold.
- The agricultural cycle: clearing, hilling, planting, weeding, green corn, the harvest, and frost.
- Food (maize, beans and squash; dried meat; dried fish; wild foods), firewood, hides and health, all shown in the top bar with tooltips. They rise and fall with what people actually bring home.
- Illness, healing, births, aging into new roles each new year, and deaths, all recorded in the chronicle.
- Dogs, deer and a bison herd move through the land.

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
js/world.js       terrain, river, fields, village and camp layout, trails, trees
js/sim.js         calendar, weather, economy, crops, health, daily routines
js/sprites.js     procedural, cached art for lodges, tipis, trees, crops, props
js/figures.js     people and animals, drawn each frame
js/render.js      isometric renderer, lighting, weather, picking, minimap
js/menu.js        animated main-menu backdrop
js/ui.js          HUD, tooltips, panels, chronicle, modals, settings form
js/main.js        screens, new-game setup, main loop and input
tools/            headless test helpers (Node)
```

Everything is plain JavaScript with no dependencies. All graphics are drawn in code.

### Balance testing

`tools/simtest.js` runs the simulation without a browser and prints daily stores:

```bash
node tools/simtest.js Spring balanced 96 42
```

The arguments are starting season, difficulty, number of days and seed.

## Where it goes next

- More villages, and relocating them
- Assigning work and setting priorities
- A council whose members disagree
- Trade with neighboring nations
- Long-term change across generations
- The arrival of a foreign colony and the choices it brings: cooperation, controlled trade, adaptation, resistance or relocation
- Saving and loading games
