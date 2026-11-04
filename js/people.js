/* Traditions Matter — generating the people: households, ages, clans,
   occupations, leaders and appearance. Pre-contact material culture only:
   tanned deer and bison hide, quill and dyed accents, no glass beads, cloth or metal. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U } = TM;

  const SKIN = ['#8a5636', '#96603c', '#7c4b2f', '#a46d47', '#6f4329', '#8f5a3a', '#9c6744', '#80502f'];
  const HAIR = ['#141010', '#1b1511', '#231a14', '#120e0c', '#1e1712'];
  const GRAY = ['#8f8a86', '#a7a29c', '#bdb7b0', '#77726d'];
  const BUCK = ['#c79e74', '#b98d62', '#d3b089', '#a77c55', '#bf946a', '#cfa57a'];
  const SMOKED = ['#8a6544', '#7d5a3c', '#946f4c', '#6f5036'];
  // quillwork and paint colours available from plants and minerals
  const ACCENT = ['#a3372a', '#b04a2a', '#2b2420', '#c99a2e', '#e8dcc4', '#d0702e'];
  const ROBE = ['#4b3324', '#5a3e2a', '#3e2b20', '#6b4a33', '#55402e'];

  // occupation -> primary work activity and description
  TM.OCCUPATIONS = {
    Farmer: { act: 'farm', desc: 'Prepares the hills, plants and tends maize, beans and squash, and brings in the harvest.' },
    Gatherer: { act: 'gather', desc: 'Collects greens, roots, berries, nuts and medicines from prairie, marsh and forest.' },
    'Hide-worker': { act: 'hides', desc: 'Scrapes, softens and smokes hides into buckskin and robes.' },
    Potter: { act: 'craft', craft: 'pottery', desc: 'Shapes and fires shell-tempered clay pots for cooking and storage.' },
    'Mat-weaver': { act: 'craft', craft: 'mats', desc: 'Weaves cattail and rush mats for lodge covers, floors and bedding.' },
    Hunter: { act: 'hunt', desc: 'Hunts deer, elk and bison with bow and arrow, and brings back meat and hides.' },
    Fisher: { act: 'fish', desc: 'Fishes with spears, nets and the weir, and dries the catch on racks.' },
    Toolmaker: { act: 'craft', craft: 'tools', desc: 'Knaps flint and chert into points and blades, and makes bows, hoes and scrapers.' },
    'Lodge-builder': { act: 'build', desc: 'Cuts poles, peels elm bark and keeps the lodges in repair.' },
    Storyteller: { act: 'craft', craft: 'mats', desc: 'Keeps the histories and teachings, and shares them with the young.' },
    Healer: { act: 'heal', desc: 'Knows the healing plants and tends to the sick.' },
    'Young hunter': { act: 'hunt', young: true, desc: 'Learning to track and hunt alongside experienced hunters.' },
    'Young fisher': { act: 'fish', young: true, desc: 'Learning to fish and to tend the weir.' },
    'Young farmer': { act: 'farm', young: true, desc: 'Learning to work the fields alongside the women of the family.' },
    'Young gatherer': { act: 'gather', young: true, desc: 'Learning which plants to gather, and where and when.' },
    'Young hide-worker': { act: 'hides', young: true, desc: 'Learning to scrape and tan hides.' },
    Child: { act: 'play', desc: 'Plays, helps with small chores and learns by watching.' },
    Infant: { act: null, desc: 'Carried on a cradleboard wherever the family goes.' },
  };

  const SKILL_OF_ACT = { farm: 'farm', gather: 'gather', hides: 'hides', craft: 'craft', hunt: 'hunt', fish: 'fish', build: 'craft', heal: 'gather', play: null };

  function roleOf(age) {
    return age < 3 ? 'infant' : age < 12 ? 'child' : age < 17 ? 'youth' : age < 55 ? 'adult' : 'elder';
  }
  TM.roleOf = roleOf;

  function heightOf(age, sex) {
    if (age < 3) return 0.32;
    if (age < 12) return 0.45 + (age - 3) * 0.045;
    if (age < 17) return 0.86 + (age - 12) * 0.025;
    return sex === 'F' ? 0.95 : 1.0;
  }
  TM.heightOf = heightOf;

  function makeLook(rng, sex, age) {
    const elder = age >= 55;
    let hairStyle;
    if (sex === 'M') hairStyle = age < 12 ? rng.pick(['loose', 'crest', 'braids']) : rng.weighted([['crest', 0.4], ['braids', 0.35], ['loose', 0.25]]);
    else hairStyle = rng.weighted([['braids', 0.5], ['bun', 0.25], ['loose', 0.25]]);
    return {
      skin: rng.pick(SKIN),
      hair: elder ? rng.pick(GRAY) : rng.pick(HAIR),
      hairStyle,
      cloth: rng.chance(0.25) ? rng.pick(SMOKED) : rng.pick(BUCK),
      accent: rng.pick(ACCENT),
      accent2: rng.pick(ACCENT),
      robe: rng.pick(ROBE),
      h: heightOf(age, sex),
      paint: sex === 'M' && age >= 17 && rng.chance(0.25),
      feather: sex === 'M' && age >= 17 && rng.chance(0.12),
      gait: rng.range(0.9, 1.12),
    };
  }

  function assignOccupation(rng, p, band) {
    const r = roleOf(p.age);
    if (r === 'infant') return 'Infant';
    if (r === 'child') return 'Child';
    if (r === 'youth') {
      if (p.sex === 'M') return band === 'camp' ? 'Young hunter' : rng.weighted([['Young hunter', 0.6], ['Young fisher', 0.4]]);
      return band === 'camp' ? rng.weighted([['Young hide-worker', 0.5], ['Young gatherer', 0.5]]) : rng.weighted([['Young farmer', 0.65], ['Young gatherer', 0.35]]);
    }
    if (r === 'adult') {
      if (p.sex === 'F') {
        if (band === 'camp') return rng.weighted([['Hide-worker', 0.45], ['Gatherer', 0.3], ['Farmer', 0.25]]);
        // a few women hunt, as some did
        return rng.weighted([['Farmer', 0.52], ['Gatherer', 0.14], ['Hide-worker', 0.1], ['Potter', 0.1], ['Mat-weaver', 0.12], ['Hunter', 0.02]]);
      }
      if (band === 'camp') return rng.weighted([['Hunter', 0.82], ['Toolmaker', 0.18]]);
      return rng.weighted([['Hunter', 0.48], ['Fisher', 0.26], ['Toolmaker', 0.14], ['Lodge-builder', 0.12]]);
    }
    if (p.sex === 'F') return rng.weighted([['Potter', 0.3], ['Mat-weaver', 0.3], ['Storyteller', 0.2], ['Gatherer', 0.2]]);
    return rng.weighted([['Toolmaker', 0.35], ['Storyteller', 0.35], ['Fisher', 0.3]]);
  }
  TM.assignOccupation = assignOccupation;

  function makeSkills(rng, p) {
    const s = {};
    for (const k of ['farm', 'hunt', 'fish', 'gather', 'craft', 'hides']) s[k] = U.clamp(rng.gauss(0.55, 0.12), 0.25, 0.85);
    const occ = TM.OCCUPATIONS[p.occupation];
    const prim = occ && SKILL_OF_ACT[occ.act];
    if (prim) s[prim] = U.clamp(rng.gauss(1.0, 0.15), 0.7, 1.4);
    const r = roleOf(p.age);
    const mul = r === 'youth' ? 0.65 : r === 'elder' ? 0.8 : r === 'child' ? 0.35 : 1;
    for (const k in s) s[k] *= mul;
    if (r === 'elder') s.craft = Math.max(s.craft, 1.0);
    return s;
  }
  TM.makeSkills = makeSkills;

  let PID = 1;
  function newPerson(rng, used, sex, age, hh) {
    const nm = TM.Names.person(rng, used);
    const p = {
      id: PID++,
      name: nm.name,
      meaning: nm.meaning,
      sex,
      age,
      role: roleOf(age),
      hh: hh.id,
      clan: hh.clan,
      health: U.clamp(Math.round(rng.gauss(93, 5)), 70, 100),
      sick: 0,
      spouse: null,
      mother: null,
      father: null,
      carrier: null,
      title: null,
      look: makeLook(rng, sex, age),
      // simulation state
      x: 0, y: 0, dir: 1, wp: 0, anim: 'stand', inside: false,
      plan: [], planKind: '', step: null, path: null, pi: 0, carry: null, tool: null, act: 'idle', actLabel: 'Resting',
    };
    hh.members.push(p.id);
    return p;
  }
  TM.newPerson = newPerson;

  TM.People = {
    resetIds(n) { PID = n || 1; },
    generate(rng, pop) {
      PID = 1;
      const used = new Set();
      const people = [];
      const households = [];
      let hid = 1;
      const mk = (sex, age, hh) => {
        const p = newPerson(rng, used, sex, age, hh);
        people.push(p);
        return p;
      };
      while (people.length < pop) {
        const remaining = pop - people.length;
        const hh = { id: hid++, members: [], clan: rng.pick(TM.CLANS).id, band: 'village', dwelling: null, fields: [] };
        households.push(hh);
        if (remaining <= 2) {
          const a = mk('F', rng.int(56, 72), hh);
          if (remaining === 2) {
            const b = mk('M', rng.int(58, 76), hh);
            a.spouse = b.id; b.spouse = a.id;
          }
          continue;
        }
        const mAge = U.clamp(Math.round(rng.gauss(31, 8)), 18, 52);
        const mother = mk('F', mAge, hh);
        let father = null;
        if (rng.chance(0.92)) {
          father = mk('M', U.clamp(mAge + rng.int(-2, 6), 18, 64), hh);
          mother.spouse = father.id;
          father.spouse = mother.id;
        }
        let age = Math.min(mAge - 18 - rng.int(0, 3), rng.int(13, 21));
        const maxKids = rng.int(1, 6);
        let kids = 0;
        while (age >= 0 && kids < maxKids && people.length < pop) {
          if (rng.chance(0.85)) {
            const c = mk(rng.chance(0.5) ? 'F' : 'M', age, hh);
            c.mother = mother.id;
            if (father) c.father = father.id;
            if (age < 3) c.carrier = mother.id;
            kids++;
          }
          age -= rng.int(2, 4);
        }
        if (people.length < pop && rng.chance(0.3)) mk(rng.chance(0.6) ? 'F' : 'M', rng.int(55, 78), hh);
      }

      // --- bands: a hunting band of about one in six lives in the tipi camp
      const byId = new Map(people.map((p) => [p.id, p]));
      const campTarget = Math.round(pop * 0.17);
      let campCount = 0;
      const order = rng.shuffle(households.slice());
      for (const hh of order) {
        if (campCount >= campTarget) break;
        const mem = hh.members.map((id) => byId.get(id));
        const hasHunter = mem.some((p) => p.sex === 'M' && p.age >= 17 && p.age < 50);
        if (!hasHunter || mem.length > 8 || mem.length < 3) continue;
        hh.band = 'camp';
        hh.dwellingType = 'tipi';
        campCount += mem.length;
      }
      // --- village: several related households share each bark longhouse
      const villageHH = households.filter((h) => h.band === 'village');
      const villagePop = villageHH.reduce((s, h) => s + h.members.length, 0);
      const nLong = Math.max(1, Math.round((villagePop * 0.4) / 24));
      const groups = [];
      const pool = rng.shuffle(villageHH.slice());
      for (let i = 0; i < nLong; i++) groups.push({ members: 0, hhs: [] });
      // fill longhouses, preferring households of the same clan
      for (const g of groups) {
        const seed = pool.shift();
        if (!seed) break;
        g.hhs.push(seed); g.members += seed.members.length; g.clan = seed.clan;
        seed.dwellingType = 'longhouse';
        while (g.members < 20 && pool.length) {
          let k = pool.findIndex((h) => h.clan === g.clan);
          if (k < 0) k = 0;
          const h = pool.splice(k, 1)[0];
          g.hhs.push(h); g.members += h.members.length;
          h.dwellingType = 'longhouse';
        }
      }
      for (const h of pool) h.dwellingType = 'wigwam';

      // --- occupations and skills
      for (const p of people) {
        const hh = households.find((h) => h.id === p.hh);
        p.band = hh.band;
        p.occupation = assignOccupation(rng, p, hh.band);
        p.skills = makeSkills(rng, p);
      }

      // --- leaders and the council
      const village = people.filter((p) => p.band === 'village');
      const pickBest = (list, n) => list.sort((a, b) => b.age - a.age + rng.range(-12, 12)).slice(0, n);
      const chiefPool = village.filter((p) => p.age >= 42 && p.age <= 68);
      const chief = pickBest(chiefPool.length ? chiefPool : village.filter((p) => p.age >= 25), 1)[0];
      if (chief) chief.title = 'Peace Chief';
      const huntPool = people.filter((p) => p.band === 'camp' && p.sex === 'M' && p.age >= 28 && p.age <= 50);
      const huntLeader = huntPool.length ? rng.pick(huntPool) : null;
      if (huntLeader) huntLeader.title = 'Hunt Leader';
      const elders = village.filter((p) => p.role === 'elder' && !p.title);
      const ew = pickBest(elders.filter((p) => p.sex === 'F'), 2);
      const em = pickBest(elders.filter((p) => p.sex === 'M'), 2);
      for (const p of ew.concat(em)) p.title = 'Council Elder';
      // two healers
      const healPool = people.filter((p) => (p.role === 'elder' || p.age >= 35) && p.age < 75 && !p.title);
      for (let i = 0; i < 2 && healPool.length; i++) {
        const h = healPool.splice(rng.int(0, healPool.length - 1), 1)[0];
        h.occupation = 'Healer';
        h.skills = makeSkills(rng, h);
      }
      const council = people.filter((p) => p.title);
      return { people, households, groups, council };
    },
  };
})();
