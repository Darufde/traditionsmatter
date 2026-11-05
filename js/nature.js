/* Traditions Matter — the living land: animals and plants, how plentiful
   they are, how they move, and what the people know about them.
   Abundance (1 = a healthy population) regrows each day toward what the
   remaining habitat can carry, and falls with hunting, trapping and the
   clearing of the forest. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U, RNG } = TM;

  const SPECIES = (TM.SPECIES = {
    deer: {
      name: 'White-tailed deer', habitat: 'forest', groups: 6, size: [3, 5], spread: 2.4, speed: 0.75, r: 0.02, kw: 1 / 1500, meat: [7, 13], hide: 1, game: true, shy: true,
      text: 'The deer of the woodland edges. In autumn the bucks carry antlers and the herds grow fat on acorns.',
      uses: 'Meat; hides for buckskin clothing and moccasins; antler and bone for tools; sinew for bowstrings and sewing.',
    },
    elk: {
      name: 'Elk', habitat: 'edge', groups: 2, size: [4, 7], spread: 3, speed: 0.6, r: 0.012, kw: 1 / 450, meat: [24, 36], hide: 1, game: true, shy: true,
      text: 'Large deer of the oak openings and the prairie edge. In autumn the bulls call across the valley.',
      uses: 'Meat; heavy hides for robes and lodge covers; antler for tools; the eye teeth are prized ornaments.',
    },
    bison: {
      name: 'Bison', habitat: 'prairie', groups: 1, size: [18, 26], spread: 5, speed: 0.45, r: 0.01, kw: 1 / 700, meat: [18, 30], hide: 1, game: true,
      text: 'Herds graze the tallgrass prairie west of the river. Hunters on foot approach downwind or drive them toward waiting bowmen.',
      uses: 'Meat dried into strips and pounded with fat and berries; hides for robes and tipi covers; horns for spoons and cups; bone for hoes and scrapers.',
    },
    bear: {
      name: 'Black bear', habitat: 'forest', groups: 2, size: [1, 1], spread: 2, speed: 0.5, r: 0.006, kw: 1 / 60, meat: [18, 26], hide: 1, game: true, sleeps: true,
      text: 'Feeds on berries, nuts and roots, and sleeps through the coldest moons in a den. Treated with great respect.',
      uses: 'Meat and fat rendered into oil for food and for the hair and skin; heavy fur robes; claws and teeth.',
    },
    wolf: {
      name: 'Gray wolf', habitat: 'prairie', groups: 1, size: [3, 5], spread: 2, speed: 0.8, r: 0.008, kw: 1 / 80, follows: 'bison',
      text: 'Wolves follow the bison herd, taking the old and the weak. People watch them to learn where the herd is going.',
      uses: 'Admired as hunters and rarely hunted.',
    },
    fox: {
      name: 'Red fox', habitat: 'edge', groups: 3, size: [1, 1], spread: 3, speed: 0.8, r: 0.02, kw: 1 / 150, pelt: 1, shy: true,
      text: 'A clever hunter of mice and rabbits along the woodland edge.',
      uses: 'Soft fur for trim and hats. Traders pay well for it.',
    },
    rabbit: {
      name: 'Cottontail rabbit', habitat: 'prairie', groups: 9, size: [1, 2], spread: 2.5, speed: 1.0, hop: true, r: 0.05, kw: 1 / 1500, meat: [1, 2], game: true, shy: true,
      text: 'Plentiful in the grass and brush. Children learn to set snares for them.',
      uses: 'Meat for the stew pot; soft fur twisted into warm blankets and infant wrappings.',
    },
    turkey: {
      name: 'Wild turkey', habitat: 'edge', groups: 2, size: [5, 8], spread: 2, speed: 0.55, r: 0.03, kw: 1 / 600, meat: [4, 6], game: true, shy: true,
      text: 'Flocks scratch for acorns and seeds at the forest edge and roost in tall trees at night.',
      uses: 'Meat; feathers to fletch arrows and make fans and cloaks; leg bones for awls.',
    },
    beaver: {
      name: 'Beaver', habitat: 'water', groups: 3, size: [1, 2], spread: 1.4, speed: 0.35, swim: true, r: 0.015, kw: 1 / 110, meat: [3, 5], pelt: 1,
      text: 'Builds lodges of sticks and mud along the banks. Its thick fur is what the traders want most.',
      uses: 'Meat and rich tail; fur robes; the strong front teeth make fine carving tools.',
    },
    heron: {
      name: 'Great blue heron', habitat: 'bank', groups: 2, size: [1, 1], spread: 1.5, speed: 0.3, wader: true, r: 0.02,
      text: 'Stands still as a post in the shallows, waiting for fish and frogs.',
      uses: 'Its patience is a lesson told to young fishers.',
    },
    duck: {
      name: 'Mallard and wood duck', habitat: 'water', groups: 3, size: [3, 6], spread: 1.6, speed: 0.4, swim: true, r: 0.04, kw: 1 / 1500, meat: [1, 2], game: true,
      text: 'Dabbling ducks feed among the wild rice and cattails.',
      uses: 'Meat and eggs; feathers and down.',
    },
    goose: {
      name: 'Canada goose', habitat: 'water', groups: 2, size: [6, 10], spread: 2, speed: 0.4, swim: true, seasons: [0, 2], r: 0.03, kw: 1 / 1200, meat: [2, 4], game: true,
      text: 'Great flocks pass through in spring and autumn, resting on the river on their way.',
      uses: 'Meat and fat; feathers for arrows; their arrival marks the turning of the seasons.',
    },
    crow: {
      name: 'American crow', habitat: 'fields', groups: 2, size: [4, 7], spread: 2, speed: 0.9, bird: true, seasons: [0, 1, 2], r: 0.04,
      text: 'Clever birds that raid the sprouting corn. Children on the watch platforms chase them away.',
      uses: 'Watched closely; they are said to remember faces.',
    },
  });
  // abundance-only species
  TM.FISH = { name: 'River fish', text: 'Sturgeon, catfish, pike and suckers run in the river, most of all in spring.', uses: 'Fresh and dried fish; sturgeon oil; bones and scales for tools and decoration.' };
  TM.FLYERS = {
    eagle: { name: 'Bald eagle', text: 'Soars above the river and nests in the tall cottonwoods.', uses: 'Its feathers are honored and given only for great deeds.' },
    pigeon: { name: 'Passenger pigeon', text: 'In spring and autumn their flocks are so vast they darken the sky for hours.', uses: 'Netted in great numbers when the flocks roost; meat and fat.' },
    goose: { name: 'Canada goose', text: 'Long Vs of geese call overhead as they pass north in spring and south in autumn.', uses: 'Their passage tells the time of year.' },
  };

  const PLANTS = (TM.PLANTS = {
    oak: { name: 'Bur oak', text: 'A broad, thick-barked oak that survives prairie fires. It stands alone in the oak openings.', uses: 'Acorns, leached of their bitterness and ground into meal; hard wood for tools, bows and poles; bark for dye.' },
    maple: { name: 'Sugar maple', text: 'Glows orange and red in autumn. In the Sap Moon its sap runs.', uses: 'Sap boiled down to sugar in bark containers; hard wood for bowls and ladles.' },
    hickory: { name: 'Shagbark hickory', text: 'Its bark peels in long strips. The nuts fall in autumn.', uses: 'Rich nuts pounded and boiled for nut milk and oil; strong, springy wood for bows.' },
    elm: { name: 'American elm', text: 'A tall, vase-shaped tree of the bottomlands.', uses: 'Its bark is peeled in spring in great sheets to cover the longhouses.' },
    cottonwood: { name: 'Eastern cottonwood', text: 'Fast-growing giant of the riverbanks. In early summer it fills the air with fluff.', uses: 'Soft wood for carving and dugout canoes; inner bark as food in hard times.' },
    birch: { name: 'Paper birch', text: 'White bark that peels in thin, waterproof sheets.', uses: 'Bark for containers, roofing and trays; wood for tool handles.' },
    willow: { name: 'Black willow', text: 'Bends over the water along every bank.', uses: 'Supple shoots for lodge frames and baskets; the bark is used in medicine.' },
    cedar: { name: 'Eastern red cedar', text: 'An evergreen with fragrant red wood that resists rot.', uses: 'Fragrant boughs and wood; long-lasting posts.' },
    pine: { name: 'White pine', text: 'The tallest tree of the northern woods, with soft long needles.', uses: 'Pitch to seal and mend; inner bark as winter food; tall poles.' },
    walnut: { name: 'Black walnut', text: 'Its round green-husked nuts fall in autumn.', uses: 'Oily nuts; the husks make a dark brown dye.' },
    sycamore: { name: 'Sycamore', text: 'Mottled white and brown bark, huge leaves, and hollow trunks along the river.', uses: 'Large trunks hollowed for canoes and storage.' },
    basswood: { name: 'Basswood', text: 'A shade tree with heart-shaped leaves and fragrant summer flowers loved by bees.', uses: 'Inner bark fiber twisted into cord and rope. It ties the wigwam frames together.' },
    plum: { name: 'Wild plum', text: 'A small tree that blooms white in spring and bears red fruit in late summer.', uses: 'Fruit eaten fresh or dried for winter.' },
    raspberry: { name: 'Raspberry and blackberry', text: 'Thorny brambles at the forest edge that fruit in midsummer.', uses: 'Berries eaten fresh or dried into cakes; leaves for tea.' },
    chokecherry: { name: 'Chokecherry', text: 'A shrub with hanging clusters of dark cherries in late summer.', uses: 'Cherries pounded, pits and all, and dried into cakes or mixed with dried meat and fat.' },
    strawberry: { name: 'Wild strawberry', text: 'The first fruit of the year, ripening in the Berry Moon.', uses: 'Eaten fresh with great joy as the first gift of summer.' },
    elderberry: { name: 'Elderberry', text: 'Flat clusters of white flowers become dark purple berries along the streams.', uses: 'Cooked berries; hollow stems for flutes and spouts.' },
    pasque: { name: 'Pasque flower', text: 'Fuzzy lavender cups that open on the prairie while snow still lies in the hollows.', uses: 'A sign that spring has truly come.' },
    coneflower: { name: 'Purple coneflower', text: 'Drooping purple petals around a spiny copper cone, blooming in summer.', uses: 'An important medicine plant; the root is chewed for sore throats and toothache.' },
    blackeyed: { name: 'Black-eyed Susan', text: 'Bright yellow petals around a dark center, all summer long.', uses: 'Used in medicine and as a yellow dye.' },
    blazingstar: { name: 'Blazing star', text: 'Tall purple spikes that bloom from the top down in late summer.', uses: 'The corm is a medicine; the flowers draw butterflies.' },
    goldenrod: { name: 'Goldenrod', text: 'Golden plumes that light up the late-summer and autumn prairie.', uses: 'A yellow dye for quills and hides; used in medicine.' },
    aster: { name: 'Aster', text: 'Purple and blue daisies, the last flowers before frost.', uses: 'Used in medicine.' },
    milkweed: { name: 'Common milkweed', text: 'Fragrant pink flower balls in summer. Monarch butterflies lay their eggs on it.', uses: 'Young shoots and buds are cooked; the stem fibers make strong cord; the silky floss stuffs pillows.' },
    turnip: { name: 'Prairie turnip', text: 'Blue flower spikes over a starchy root that is dug in early summer.', uses: 'A staple food: the roots are peeled, braided by their tails and dried for winter.' },
    rose: { name: 'Prairie wild rose', text: 'Pink flowers in early summer and red hips through the winter.', uses: 'Rose hips eaten in winter; petals and roots in medicine.' },
    bergamot: { name: 'Wild bergamot', text: 'Lavender pompoms with a strong minty smell.', uses: 'Leaves for a tea and in medicine.' },
    fern: { name: 'Ferns', text: 'Lacy fronds carpet the shady forest floor.', uses: 'Young fiddleheads are eaten in spring; fronds line storage pits and baskets.' },
    trillium: { name: 'Trillium', text: 'White three-petaled flowers bloom under the bare trees in early spring.', uses: 'The root is used in medicine.' },
    mayapple: { name: 'Mayapple', text: 'Umbrella leaves cover the spring forest floor, each with one hidden flower.', uses: 'Only the ripe fruit is eaten; the rest of the plant is poisonous and is used with care as medicine.' },
    mushroom: { name: 'Morel mushrooms', text: 'Honeycombed mushrooms that appear in spring under elms and in burned ground.', uses: 'Gathered and eaten fresh or dried.' },
    grass: { name: 'Big bluestem and indiangrass', text: 'The tall grasses of the prairie, higher than a person by late summer and copper-red in autumn.', uses: 'Grass for bedding, insulation and thatch; the prairie is renewed by fire.' },
    cattail: { name: 'Cattail', text: 'Tall reeds with brown seed heads in the marsh and along the banks.', uses: 'Leaves woven into the mats that cover the wigwams; roots and shoots eaten; fluff used as diaper padding and tinder.' },
    wildrice: { name: 'Wild rice', text: 'A tall water grass whose grain ripens in late summer.', uses: 'Harvested from canoes by bending the stalks and knocking the grain loose with sticks; parched and stored for winter.' },
    lily: { name: 'Water lily', text: 'Floating round leaves and white flowers in the quiet water.', uses: 'The roots are boiled and eaten.' },
    sumac: { name: 'Smooth sumac', text: 'A shrub that turns scarlet in autumn, with upright clusters of red berries.', uses: 'The sour berries make a refreshing drink; leaves mixed into smoking blends.' },
    shrub: { name: 'American hazelnut', text: 'Thickets at the forest edge, bearing nuts in leafy husks in late summer.', uses: 'Sweet nuts eaten fresh or stored; straight shoots for arrows and baskets.' },
    sunflower: { name: 'Sunflower', text: 'Grown along the edges of the fields, taller than the corn.', uses: 'Seeds eaten and pressed for oil; petals for a yellow dye.' },
    beaverlodge: { name: 'Beaver lodge', text: 'A dome of sticks and mud built out from the bank, with underwater entrances.', uses: 'A sign of a healthy river. Too much trapping leaves the lodges empty.' },
  });

  // which plant props bloom or show fruit in which season
  TM.BLOOM = {
    pasque: [0], coneflower: [1], blackeyed: [1], blazingstar: [1, 2], goldenrod: [2], aster: [2], milkweed: [1], turnip: [0, 1], rose: [1, 2, 3], bergamot: [1],
    trillium: [0], mayapple: [0], mushroom: [0, 2], fern: [0, 1, 2],
  };

  class Nature {
    constructor(sim, seed) {
      this.sim = sim;
      this.W = sim.W;
      this.rng = new RNG((seed ^ 0x1f2e3d) >>> 0);
      this.pop = {};
      for (const k in SPECIES) this.pop[k] = U.clamp(0.88 + this.rng.range(-0.05, 0.08), 0, 1.1);
      this.pop.fish = 0.95;
      this.prev = Object.assign({}, this.pop);
      this.groups = [];
      this.flyers = [];
      this.splashes = [];
      this.fleeT = 0;
      this.flockT = 3;
      this.init();
    }

    claimed(i) { return this.W.claimed && this.W.claimed[i]; }

    pickTile(hab, nx, ny, radius) {
      const list = this.W.hab[hab];
      if (!list || !list.length) return null;
      const N = this.W.N;
      for (let t = 0; t < 24; t++) {
        const i = list[this.rng.int(0, list.length - 1)];
        if (this.claimed(i)) continue;
        if (nx !== undefined && Math.hypot((i % N) - nx, ((i / N) | 0) - ny) > radius) continue;
        return { x: (i % N) + 0.5, y: ((i / N) | 0) + 0.5 };
      }
      return null;
    }

    init() {
      const W = this.W, rng = this.rng;
      const lodges = W.props.filter((p) => p.kind === 'beaverlodge');
      let bisonG = null;
      for (const sp of Object.keys(SPECIES)) {
        const S = SPECIES[sp];
        for (let g = 0; g < S.groups; g++) {
          let c;
          if (sp === 'beaver' && lodges[g]) c = { x: lodges[g].x, y: lodges[g].y };
          else if (sp === 'wolf' && bisonG) c = { x: bisonG.cx + 7, y: bisonG.cy + 3 };
          else c = this.pickTile(S.habitat);
          if (!c) continue;
          const grp = { sp, cx: c.x, cy: c.y, tx: c.x, ty: c.y, moveT: rng.range(0, 6), members: [], home: sp === 'beaver' ? c : null, hidden: false };
          const n = rng.int(S.size[0], S.size[1]);
          for (let m = 0; m < n; m++) grp.members.push(this.newAnimal(sp, c.x, c.y, S.spread * 0.6, m === 0 && rng.chance(0.6)));
          this.groups.push(grp);
          if (sp === 'bison') bisonG = grp;
        }
      }
    }

    newAnimal(sp, cx, cy, spread, male) {
      const rng = this.rng;
      const a = { sp, x: cx + rng.range(-spread, spread), y: cy + rng.range(-spread, spread), t: rng.range(0, 3), dir: rng.chance(0.5) ? 1 : -1, wp: rng.range(0, 6), moving: false, male, size: rng.range(0.85, 1.15), run: 0 };
      a.tx = a.x; a.ty = a.y;
      if (!this.okFor(sp, Math.floor(a.x), Math.floor(a.y))) { a.x = cx; a.y = cy; a.tx = cx; a.ty = cy; }
      return a;
    }

    okFor(sp, ix, iy) {
      const W = this.W, N = W.N;
      if (ix < 1 || iy < 1 || ix >= N - 1 || iy >= N - 1) return false;
      const i = iy * N + ix, t = W.type[i];
      const S = SPECIES[sp];
      if (S.swim) return t === TM.T.WATER || (sp === 'beaver' && t === TM.T.BANK);
      if (S.wader) return t === TM.T.BANK || t === TM.T.SHALLOW || t === TM.T.MARSH || (t === TM.T.WATER && W.dd[i] < 0.5);
      if (t === TM.T.WATER || t === TM.T.SHALLOW || W.occ[i] >= 0) return false;
      if (sp !== 'crow' && W.claimed && W.claimed[i]) return false;
      return true;
    }

    // how much of the population is visible right now
    shown(g) {
      const S = SPECIES[g.sp], c = this.sim.c;
      if (S.seasons && !S.seasons.includes(c.season)) return 0;
      if (S.sleeps && c.season === 3) return 0;
      const f = U.clamp(this.pop[g.sp], 0, 1.15);
      if (f < 0.06) return 0;
      return Math.max(1, Math.round(g.members.length * Math.min(1, f + 0.08)));
    }

    yieldMul(sp) { return U.clamp(0.08 + 0.97 * (sp === 'fish' ? this.pop.fish : this.pop[sp] || 0), 0.04, 1.15); }

    kill(sp, n = 1) {
      const S = SPECIES[sp];
      if (!S || !S.kw) return;
      this.pop[sp] = Math.max(0.02, this.pop[sp] - S.kw * n);
    }

    // a group of the given species, for hunters to seek out
    findGroup(sp) {
      const list = this.groups.filter((g) => g.sp === sp && this.shown(g) > 0);
      return list.length ? this.rng.pick(list) : null;
    }

    pickHunt(band) {
      const s = this.sim.c.season, P = this.pop, rng = this.rng;
      const W = [];
      if (band === 'camp') W.push(['bison', 0.6 * P.bison], ['elk', 0.22 * P.elk], ['deer', 0.1 * P.deer], ['rabbit', 0.06]);
      else {
        W.push(['deer', 0.55 * P.deer], ['elk', 0.14 * P.elk], ['turkey', 0.14 * P.turkey], ['rabbit', 0.08 * P.rabbit]);
        if (s !== 3) W.push(['bear', (s === 2 ? 0.08 : 0.03) * P.bear]);
        if (s === 0 || s === 2) W.push(['goose', 0.08 * P.goose], ['duck', 0.06 * P.duck]);
        else W.push(['duck', 0.05 * P.duck]);
      }
      return rng.weighted(W);
    }

    // ---------------------------------------------------------------- per frame
    update(dt, dH) {
      const sim = this.sim, rng = this.rng;
      this.fleeT -= dt;
      const checkFlee = this.fleeT <= 0;
      if (checkFlee) this.fleeT = 0.5;
      const bisonG = this.groups.find((g) => g.sp === 'bison');
      for (const g of this.groups) {
        const S = SPECIES[g.sp];
        g.vis = this.shown(g);
        if (!g.vis) continue;
        g.moveT -= dH;
        if (S.follows && bisonG) {
          g.tx = bisonG.cx + 8 * Math.cos(sim.day * 0.7); g.ty = bisonG.cy + 6 * Math.sin(sim.day * 0.7);
        } else if (g.moveT <= 0) {
          g.moveT = rng.range(4, 10);
          let c;
          if (g.home) c = { x: g.home.x + rng.range(-3, 3), y: g.home.y + rng.range(-5, 5) };
          else c = this.pickTile(S.habitat, g.cx, g.cy, 14);
          if (c && this.okFor(g.sp, Math.floor(c.x), Math.floor(c.y))) { g.tx = c.x; g.ty = c.y; }
        }
        const dx = g.tx - g.cx, dy = g.ty - g.cy, d = Math.hypot(dx, dy);
        if (d > 0.05) { const st = Math.min(d, dt * 0.08); g.cx += (dx / d) * st; g.cy += (dy / d) * st; }
        for (let k = 0; k < g.members.length; k++) {
          const a = g.members[k];
          a.hidden = k >= g.vis;
          if (a.hidden) continue;
          if (checkFlee && S.shy) this.checkFlee(a);
          this.updateAnimal(a, g, S, dt);
        }
      }
      this.updateFlyers(dt);
      // fish jumping in the river
      if (sim.c.season !== 3 && rng.next() < dt * 0.6 * this.pop.fish) {
        const list = this.W.hab.water;
        if (list.length) {
          const i = rng.pick(list);
          this.splashes.push({ x: (i % this.W.N) + rng.range(0.2, 0.8), y: ((i / this.W.N) | 0) + rng.range(0.2, 0.8), t: 0 });
        }
      }
      for (let i = this.splashes.length - 1; i >= 0; i--) {
        this.splashes[i].t += dt;
        if (this.splashes[i].t > 1.6) this.splashes.splice(i, 1);
      }
    }

    checkFlee(a) {
      for (const p of this.sim.people) {
        if (p.inside || p.role === 'infant') continue;
        const d = Math.hypot(p.x - a.x, p.y - a.y);
        if (d < 2.6 && p.act !== 'hunt') {
          const ux = (a.x - p.x) / (d || 1), uy = (a.y - p.y) / (d || 1);
          const tx = a.x + ux * 4, ty = a.y + uy * 4;
          if (this.okFor(a.sp, Math.floor(tx), Math.floor(ty))) { a.tx = tx; a.ty = ty; a.moving = true; a.run = 1.6; }
          return;
        }
      }
    }

    updateAnimal(a, g, S, dt) {
      const rng = this.rng;
      a.t -= dt;
      if (a.moving) {
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        const sp = S.speed * (a.run > 0 ? 3 : 1);
        const st = sp * dt;
        const sdx = dx - dy;
        if (Math.abs(sdx) > 0.02) a.dir = sdx > 0 ? 1 : -1;
        if (d <= st) { a.x = a.tx; a.y = a.ty; a.moving = false; a.run = 0; a.t = rng.range(2, S.hop ? 5 : 12); }
        else { a.x += (dx / d) * st; a.y += (dy / d) * st; a.wp += st * 4; }
        return;
      }
      if (a.t > 0) return;
      const tx = g.cx + rng.range(-S.spread, S.spread), ty = g.cy + rng.range(-S.spread, S.spread);
      if (!this.okFor(a.sp, Math.floor(tx), Math.floor(ty))) { a.t = 0.7; return; }
      if (S.swim && !this.okFor(a.sp, Math.floor((tx + a.x) / 2), Math.floor((ty + a.y) / 2))) { a.t = 0.7; return; }
      a.tx = tx; a.ty = ty; a.moving = true;
    }

    // ---------------------------------------------------------------- birds in the sky
    updateFlyers(dt) {
      const sim = this.sim, rng = this.rng, N = this.W.N, c = sim.c, h = sim.hour;
      // eagles soar over the river by day
      const eagles = this.flyers.filter((f) => f.kind === 'eagle');
      if (eagles.length < 2 && h > 7 && h < 18 && rng.next() < dt * 0.02) {
        const y = rng.range(15, N - 15);
        this.flyers.push({ kind: 'eagle', cx: this.W.rx(y), cy: y, a: rng.range(0, 6), r: rng.range(3, 6), alt: rng.range(110, 160), life: rng.range(40, 90), x: 0, y: 0, dir: 1 });
      }
      // geese pass in long Vs in spring and autumn
      this.flockT -= dt;
      if (this.flockT <= 0) {
        this.flockT = rng.range(25, 60);
        const migr = (c.season === 0 && c.moon <= 1) || (c.season === 2 && c.moon >= 1);
        if (migr && h > 6 && h < 19 && this.pop.goose > 0.1) this.spawnV('goose', c.season === 0 ? -1 : 1);
        else if (migr && rng.chance(0.25) && this.pop.pigeon !== 0) this.spawnPigeons(c.season === 0 ? -1 : 1);
        else if (c.season !== 3 && rng.chance(0.4)) this.spawnV('songbirds', rng.chance(0.5) ? 1 : -1);
      }
      for (let i = this.flyers.length - 1; i >= 0; i--) {
        const f = this.flyers[i];
        f.life -= dt;
        if (f.kind === 'eagle') {
          f.a += dt * 0.25;
          f.cy += dt * 0.15;
          f.x = f.cx + Math.cos(f.a) * f.r; f.y = f.cy + Math.sin(f.a) * f.r;
          f.dir = Math.cos(f.a + Math.PI / 2) - Math.sin(f.a + Math.PI / 2) > 0 ? 1 : -1;
        } else {
          f.x += f.vx * dt; f.y += f.vy * dt;
        }
        f.flap = (f.flap || 0) + dt * (f.kind === 'eagle' ? 1.5 : f.kind === 'pigeon' ? 14 : 8);
        if (f.life <= 0 || f.x < -30 || f.y < -30 || f.x > N + 30 || f.y > N + 30) this.flyers.splice(i, 1);
      }
    }
    spawnV(kind, dirY) {
      const rng = this.rng, N = this.W.N;
      const n = kind === 'goose' ? rng.int(9, 15) : rng.int(5, 9);
      const x0 = rng.range(10, N - 10), y0 = dirY < 0 ? N + 15 : -15;
      const vx = rng.range(-0.6, 0.6), vy = dirY * (kind === 'goose' ? 2.2 : 3);
      for (let k = 0; k < n; k++) {
        const side = k % 2 ? 1 : -1, rank = Math.ceil(k / 2);
        this.flyers.push({ kind, x: x0 + side * rank * 0.9, y: y0 - dirY * rank * 1.1, vx, vy, alt: (kind === 'goose' ? 150 : 90) + rng.range(-6, 6), life: 120, flap: rng.range(0, 6), dir: vx - vy > 0 ? 1 : -1 });
      }
    }
    spawnPigeons(dirY) {
      const rng = this.rng, N = this.W.N;
      const x0 = rng.range(20, N - 20), y0 = dirY < 0 ? N + 20 : -20;
      const vx = rng.range(-1, 1), vy = dirY * 4.5;
      for (let k = 0; k < 140; k++) {
        this.flyers.push({ kind: 'pigeon', x: x0 + rng.gauss(0, 6), y: y0 - dirY * rng.range(0, 60), vx: vx + rng.range(-0.3, 0.3), vy: vy * rng.range(0.9, 1.1), alt: rng.range(110, 190), life: 120, flap: rng.range(0, 6), dir: vx - vy > 0 ? 1 : -1 });
      }
      if (!this.pigeonNoted || this.sim.day - this.pigeonNoted > 20) {
        this.pigeonNoted = this.sim.day;
        this.sim.emit('A great flock of passenger pigeons darkens the sky.', 'nature');
      }
    }

    // ---------------------------------------------------------------- each day
    daily() {
      const sim = this.sim, W = this.W;
      this.prev = Object.assign({}, this.pop);
      // remaining habitat limits how many animals the land can carry
      const forestLeft = W.forestTotal ? 1 - (W.forestClaimed || 0) / W.forestTotal : 1;
      const colony = sim.colony;
      const settlers = colony && colony.founded ? colony.pop : 0;
      for (const sp of Object.keys(SPECIES)) {
        const S = SPECIES[sp];
        let K = 1;
        if (S.habitat === 'forest' || S.habitat === 'edge') K = U.clamp(forestLeft * 1.05, 0.05, 1);
        const p = this.pop[sp];
        this.pop[sp] = U.clamp(p + S.r * p * (1 - p / K) + (p < 0.03 ? 0.002 : 0), 0.01, 1.2);
      }
      this.pop.fish = U.clamp(this.pop.fish + 0.03 * this.pop.fish * (1 - this.pop.fish), 0.05, 1.2);
      // settlers hunt too, and their pigs root out the acorns
      if (settlers) {
        this.pop.deer -= settlers * 0.000025;
        this.pop.turkey -= settlers * 0.00003;
        this.pop.bear -= settlers * 0.00001;
        this.pop.elk -= settlers * 0.00002;
        for (const k of ['deer', 'turkey', 'bear', 'elk']) this.pop[k] = Math.max(0.01, this.pop[k]);
      }
    }

    trend(sp) {
      const d = (this.pop[sp] || 0) - (this.prev[sp] || 0);
      return d > 0.002 ? 1 : d < -0.002 ? -1 : 0;
    }
  }

  TM.Nature = Nature;
})();
