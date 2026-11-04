// Headless balance test: runs the simulation for N days and prints daily stores.
// usage: node tools/simtest.js [season] [difficulty] [days] [seed]
const load = require('./load.js');
const TM = load(['core.js', 'names.js', 'people.js', 'world.js', 'sim.js']);
const season = process.argv[2] || 'Spring', diff = process.argv[3] || 'balanced';
const days = +(process.argv[4] || 96), seed = +(process.argv[5] || 42);
const rng = new TM.RNG(seed);
const P = TM.People.generate(rng, 200);
const W = TM.generateWorld({ seed, pop: 200, households: P.households, groups: P.groups });
const sim = new TM.Sim({ world: W, pop: P, settings: { season, difficulty: diff, nationName: 'Test' }, seed });
const log = [];
sim.onEvent = (e) => { if (e.type === 'death' || e.type === 'birth' || e.type === 'warn') log.push(`d${e.day} ${e.text}`); };
const t0 = Date.now();
const step = +(process.env.STEP || 0.5); // real seconds per update at 1x
let lastDay = -1;
const rows = [];
while (sim.day < days) {
  sim.update(step);
  if (sim.day !== lastDay && sim.yesterday) {
    lastDay = sim.day;
    const y = sim.yesterday, c = sim.c;
    rows.push(`day ${String(sim.day).padStart(3)} ${TM.SEASONS[c.season].padEnd(6)} m${c.moon} food ${String(Math.round(sim.foodTotal())).padStart(6)} (+${Math.round(y.food)}/-${Math.round(y.foodEaten)}) wood ${String(Math.round(sim.stores.wood)).padStart(5)} (+${Math.round(y.wood)}/-${Math.round(y.woodBurned)}) hides ${Math.round(sim.stores.hides)} raw ${Math.round(sim.stores.rawHides)} crop ${sim.crop.phase}:${sim.crop.condition.toFixed(2)} harv ${Math.round(sim.crop.harvested)}/${Math.round(sim.crop.potential)} hp ${sim.avgHealth().toFixed(0)} pop ${sim.people.length} sick ${sim.sickCount()} deer ${y.deer} bison ${y.bison} | m${Math.round(y.maize)} meat${Math.round(y.meat)} f${Math.round(y.fish)} w${Math.round(y.wild)}`);
  }
}
const every = +(process.env.EVERY || 4);
rows.forEach((r, i) => { if (i % every === 0 || i === rows.length - 1) console.log(r); });
console.log('elapsed', Date.now() - t0, 'ms');
console.log(log.slice(0, 40).join('\n'));
// activity census at noon
