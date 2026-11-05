// Headless balance test: runs the simulation for N days and prints daily stores.
// usage: node tools/simtest.js [season] [difficulty] [days] [seed]
const load = require('./load.js');
const TM = load(['core.js', 'names.js', 'people.js', 'world.js', 'nature.js', 'culture.js', 'colony.js', 'sim.js']);
const season = process.argv[2] || 'Spring', diff = process.argv[3] || 'balanced';
const days = +(process.argv[4] || 96), seed = +(process.argv[5] || 42);
const rng = new TM.RNG(seed);
const P = TM.People.generate(rng, 200);
const W = TM.generateWorld({ seed, pop: 200, households: P.households, groups: P.groups });
const sim = new TM.Sim({ world: W, pop: P, settings: { season, difficulty: diff, nationName: 'Test' }, seed });
const log = [];
// POLICY: council (default, members vote), open, trad, war — forces the option with the highest score on that axis
const POLICY = process.env.POLICY || 'council';
if (POLICY !== 'council') sim.onIssue = (is) => {
  const cu = sim.culture;
  cu.openDebate(is);
  let best = 0;
  is.options.forEach((o, i) => { if ((o.profile[POLICY] || 0) > (is.options[best].profile[POLICY] || 0)) best = i; });
  cu.resolveDebate(best);
};
const SHOW = (process.env.SHOW || 'warn,council,colony,war,gathering,death').split(',');
sim.onEvent = (e) => { if (SHOW.includes(e.type)) log.push(`y${e.cal.year} d${e.day} [${e.type}] ${e.text}`); };
const t0 = Date.now();
const step = +(process.env.STEP || 0.5); // real seconds per update at 1x
let lastDay = -1;
const rows = [];
while (sim.day < days) {
  sim.update(step);
  if (sim.day !== lastDay && sim.yesterday) {
    lastDay = sim.day;
    const y = sim.yesterday, c = sim.c;
    const cu = sim.culture, co = sim.colony, na = sim.nature;
    rows.push(`   T ${cu.T().toFixed(2)} (lang ${cu.trad.language.toFixed(2)} gath ${cu.trad.gatherings.toFixed(2)} craft ${cu.trad.crafts.toFixed(2)} land ${cu.trad.land.toFixed(2)}) I ${cu.I().toFixed(2)} goods ${cu.integ.goods.toFixed(2)} unity ${cu.unity.toFixed(2)} resp ${cu.respect.toFixed(0)} | colony ${co.stage} pop ${Math.round(co.pop)} rel ${Math.round(co.relations)} claimed ${co.claimed} war ${co.war} fear ${co.fear.toFixed(2)} | deer ${na.pop.deer.toFixed(2)} beaver ${na.pop.beaver.toFixed(2)} bison ${na.pop.bison.toFixed(2)} pelts ${Math.round(sim.stores.pelts)}`);
    rows.push(`day ${String(sim.day).padStart(3)} ${TM.SEASONS[c.season].padEnd(6)} m${c.moon} food ${String(Math.round(sim.foodTotal())).padStart(6)} (+${Math.round(y.food)}/-${Math.round(y.foodEaten)}) wood ${String(Math.round(sim.stores.wood)).padStart(5)} (+${Math.round(y.wood)}/-${Math.round(y.woodBurned)}) hides ${Math.round(sim.stores.hides)} raw ${Math.round(sim.stores.rawHides)} crop ${sim.crop.phase}:${sim.crop.condition.toFixed(2)} harv ${Math.round(sim.crop.harvested)}/${Math.round(sim.crop.potential)} hp ${sim.avgHealth().toFixed(0)} pop ${sim.people.length} sick ${sim.sickCount()} deer ${y.deer} bison ${y.bison} | m${Math.round(y.maize)} meat${Math.round(y.meat)} f${Math.round(y.fish)} w${Math.round(y.wild)}`);
  }
}
const every = +(process.env.EVERY || 4);
rows.forEach((r, i) => { if (Math.floor(i / 2) % every === 0 || i >= rows.length - 2) console.log(r); });
console.log('elapsed', Date.now() - t0, 'ms');
console.log(log.slice(0, +(process.env.LOGN || 80)).join('\n'));
if (sim.culture.ended) console.log('ENDING', JSON.stringify(sim.culture.ended));
// activity census at noon
