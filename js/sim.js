/* Traditions Matter — the living simulation: calendar, seasons, weather,
   stores of food, firewood and hides, the agricultural cycle, health,
   births and deaths, and the daily round of every person. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U, RNG, C } = TM;

  const NEED = { infant: 0.3, child: 0.6, youth: 0.9, adult: 1.0, elder: 0.8 };
  const WOOD_BURN = [1.7, 0.9, 2.2, 3.8];         // per household per day, by season
  const HUNT_SEASON = [0.85, 0.8, 1.3, 1.0];
  const FISH_SEASON = [1.3, 1.0, 0.85, 0.35];
  const GATHER_SEASON = [0.9, 1.4, 1.25, 0.12];
  const ILL_SEASON = [1.2, 0.7, 0.9, 1.5];
  const YIELD_PER_TILE = 20;
  const HARVEST_RATE = 3.5;
  const COND_RATE = 0.055;
  const CARRY = { meat: 16, fish: 10, wild: 8, wood: 12 };
  const FOOD_KINDS = ['maize', 'meat', 'fish', 'wild'];
  const FOOD_LABEL = { maize: 'Maize, beans & squash', meat: 'Dried meat', fish: 'Dried fish', wild: 'Wild foods' };
  TM.FOOD_LABEL = FOOD_LABEL;

  const MOON_TEXT = [
    ['The snow is melting along the river and the maples are tapped for sap.',
      'The old fields are cleared and the hills made ready for planting.',
      'Maize, beans and squash are planted together in the hills.'],
    ['Strawberries ripen along the prairie edge.',
      'The fields need weeding. Children watch for crows from the platforms.',
      'The first green corn is ready to eat.'],
    ['Everyone helps to bring in the harvest.',
      'Deer are fat and hunting is good. Hides are scraped and smoked.',
      'The frost is coming. The last of the harvest must be brought in.'],
    ['Families gather by their lodge fires. Stories are told through the long nights.',
      'Firewood and stored food must last through the cold.',
      'Stores run low before spring. Hunters search for game in the snow.'],
  ];

  class Sim {
    constructor(opts) {
      this.W = opts.world;
      this.people = opts.pop.people;
      this.households = opts.pop.households;
      this.council = opts.pop.council;
      this.settings = opts.settings;
      this.rng = new RNG((opts.seed ^ 0x2545f491) >>> 0);
      this.diff = TM.DIFFICULTY[opts.settings.difficulty] || TM.DIFFICULTY.balanced;
      this.startSeason = Math.max(0, TM.SEASONS.indexOf(opts.settings.season));
      this.day = 0;
      this.hour = 7.0;
      this.byId = new Map(this.people.map((p) => [p.id, p]));
      this.hhById = new Map(this.households.map((h) => [h.id, h]));
      this.usedNames = new Set(this.people.map((p) => p.name));
      this.events = [];
      this.onEvent = null;
      this.history = [];
      this.today = this.blankDay();
      this.yesterday = null;
      this.dogs = [];
      this.deerGroups = [];
      this.bison = [];
      this.warned = {};
      this.racks = { village: [], camp: [] };
      this.hideFrames = { village: [], camp: [] };
      this.c = this.calendar();
      this.init();
    }

    blankDay() {
      return { food: 0, foodEaten: 0, wood: 0, woodBurned: 0, hides: 0, deer: 0, bison: 0, fish: 0, harvest: 0, maize: 0, meat: 0, wild: 0 };
    }

    calendar() {
      const d = this.startSeason * C.DAYS_PER_SEASON + this.day;
      const dy = d % C.DAYS_PER_YEAR;
      const season = Math.floor(dy / C.DAYS_PER_SEASON);
      const ds = dy % C.DAYS_PER_SEASON;
      return {
        season, moon: Math.floor(ds / C.DAYS_PER_MOON), dom: (ds % C.DAYS_PER_MOON) + 1,
        dayOfSeason: ds + 1, year: Math.floor(d / C.DAYS_PER_YEAR) + 1, abs: d,
      };
    }

    // ---------------------------------------------------------------- setup
    init() {
      const W = this.W, rng = this.rng, s = this.c.season;
      for (const b of W.buildings) {
        if (b.type === 'rack' || b.type === 'fishrack') this.racks[b.band].push(b);
        if (b.type === 'hideframe') this.hideFrames[b.band].push(b);
      }
      for (const hh of this.households) this.pickCook(hh);
      for (const p of this.people) {
        this.initPerson(p);
        const b = this.homeOf(p);
        if (b && b.door) {
          p.x = b.door.x + 0.5 + rng.range(-0.8, 0.8);
          p.y = b.door.y + 0.5 + rng.range(-0.8, 0.8);
          if (!W.isWalk(Math.floor(p.x), Math.floor(p.y))) { p.x = b.door.x + 0.5; p.y = b.door.y + 0.5; }
        }
      }
      for (const p of this.people) if (p.role === 'infant') this.attachInfant(p);

      // food stores by starting season, measured in days of need
      const need = this.needPerDay();
      const days = [24, 15, 11, 38][s] * this.diff.stores;
      const mix = [
        { maize: 0.55, meat: 0.2, fish: 0.15, wild: 0.1 },
        { maize: 0.35, meat: 0.25, fish: 0.2, wild: 0.2 },
        { maize: 0.25, meat: 0.35, fish: 0.2, wild: 0.2 },
        { maize: 0.6, meat: 0.25, fish: 0.05, wild: 0.1 },
      ][s];
      this.food = {};
      for (const k of FOOD_KINDS) this.food[k] = need * days * mix[k];
      this.stores = {
        wood: this.woodBurnPerDay(s) * [8, 10, 9, 7][s] * this.diff.stores,
        hides: Math.round(this.people.length * 0.18),
        rawHides: 6,
        goods: Math.round(this.people.length * 0.3),
      };
      // the fields
      this.crop = { condition: [0.35, 0.72, 0.85, 0][s], potential: 0, harvested: 0, phase: ['prep', 'growing', 'harvest', 'fallow'][s] };
      if (s === 1) this.crop.phase = 'growing';
      if (s === 2) this.crop.potential = W.fields.length * YIELD_PER_TILE * this.crop.condition * this.diff.prod;

      // animals
      const nDogs = Math.round(this.people.length / 10);
      const homes = W.buildings.filter((b) => (b.type === 'wigwam' || b.type === 'longhouse' || b.type === 'tipi') && b.door);
      const dogCols = ['#3b2f26', '#6b5440', '#8a6f52', '#d8c8b0', '#2a2522', '#9a7a58'];
      for (let k = 0; k < nDogs && homes.length; k++) {
        const b = rng.pick(homes);
        this.dogs.push({ x: b.door.x + 0.5 + rng.range(-1, 1), y: b.door.y + 0.5 + rng.range(-1, 1), home: b, tx: 0, ty: 0, t: 0, state: 'idle', dir: 1, wp: 0, col: rng.pick(dogCols), col2: rng.pick(dogCols), path: null, pi: 0, follow: null, size: rng.range(0.85, 1.1), speed: 0.9 });
      }
      const deerSpots = W.spots.deer;
      for (let g = 0; g < 4 && deerSpots.length; g++) {
        const i = rng.pick(deerSpots);
        const grp = { cx: (i % W.N) + 0.5, cy: ((i / W.N) | 0) + 0.5, tx: 0, ty: 0, moveT: rng.range(0, 6), members: [] };
        grp.tx = grp.cx; grp.ty = grp.cy;
        const k = rng.int(3, 5);
        for (let m = 0; m < k; m++) grp.members.push(this.newAnimal(grp.cx, grp.cy, 2, m === 0));
        this.deerGroups.push(grp);
      }
      const br = W.bisonRange;
      this.herd = { cx: rng.range(br.x0 + 3, br.x1 - 3), cy: rng.range(br.y0 + 15, br.y1 - 15), tx: 0, ty: 0, moveT: 0 };
      this.herd.tx = this.herd.cx; this.herd.ty = this.herd.cy;
      const nb = rng.int(18, 26);
      for (let m = 0; m < nb; m++) this.bison.push(this.newAnimal(this.herd.cx, this.herd.cy, 5, rng.chance(0.4)));

      this.rollWeather();
      this.councilDay = this.c.dom === 1;
      this.lastDawn = this.hour >= 6 ? this.day : -1;
      this.emit(`The ${this.nationName()} begin a new chapter in the ${TM.MOONS[s][this.c.moon]} of ${TM.SEASONS[s].toLowerCase()}.`, 'season');
      this.emit(MOON_TEXT[s][this.c.moon], 'info');
      for (const p of this.people) if (p.role !== 'infant') this.decide(p);
    }

    nationName() { return this.settings.nationName || 'People'; }

    newAnimal(cx, cy, spread, male) {
      const rng = this.rng;
      const x = cx + rng.range(-spread, spread), y = cy + rng.range(-spread, spread);
      return { x, y, tx: x, ty: y, t: rng.range(0, 3), dir: rng.chance(0.5) ? 1 : -1, wp: 0, moving: false, male, size: rng.range(0.85, 1.15) };
    }

    initPerson(p) {
      const rng = this.rng;
      p.wake = 5.3 + rng.next() * 1.3;
      p.bed = p.role === 'child' ? 20.2 + rng.next() * 0.8 : 21 + rng.next() * 1.6;
      p.speed = p.look.gait * (p.role === 'elder' ? 0.8 : p.role === 'child' ? 1.05 : 1);
      p.jx = rng.range(-0.22, 0.22);
      p.jy = rng.range(-0.22, 0.22);
      p.plan = [];
      p.step = null;
      p.carry = null;
      p.lastMeal = -1;
      p.anim = 'stand';
      p.wp = rng.range(0, 6);
      p.animT = rng.range(0, 10);
    }

    pickCook(hh) {
      const mem = hh.members.map((id) => this.byId.get(id)).filter(Boolean);
      const w = mem.filter((p) => p.sex === 'F' && p.age >= 15).sort((a, b) => Math.abs(a.age - 35) - Math.abs(b.age - 35));
      const any = mem.filter((p) => p.age >= 15);
      hh.cook = (w[0] || any[0] || {}).id || null;
    }

    attachInfant(p) {
      const c = this.byId.get(p.carrier);
      if (c && c.role !== 'infant' && c.role !== 'child') return;
      const hh = this.hhById.get(p.hh);
      const mem = hh ? hh.members.map((id) => this.byId.get(id)).filter(Boolean) : [];
      let carrier = mem.find((q) => q.sex === 'F' && q.age >= 14) || mem.find((q) => q.age >= 14);
      if (!carrier) carrier = this.people.find((q) => q.sex === 'F' && q.age >= 18 && q.band === p.band);
      p.carrier = carrier ? carrier.id : null;
    }

    homeOf(p) {
      const hh = this.hhById.get(p.hh);
      return hh && hh.dwelling !== null ? this.W.buildings[hh.dwelling] : null;
    }
    hhOf(p) { return this.hhById.get(p.hh); }

    // ---------------------------------------------------------------- needs
    needPerDay() {
      if (this._need === undefined) {
        let n = 0;
        for (const p of this.people) n += NEED[p.role] || 1;
        this._need = n * this.diff.cons;
      }
      return this._need;
    }
    woodBurnPerDay(season) {
      const s = season === undefined ? this.c.season : season;
      if (season === undefined && this._burn !== undefined) return this._burn;
      let nHH = 0;
      for (const h of this.households) if (h.members.length) nHH++;
      const v = nHH * WOOD_BURN[s] * this.diff.wood * (this.weather && (this.weather.kind === 'snow' || this.weather.kind === 'cold') ? 1.15 : 1);
      if (season === undefined) this._burn = v;
      return v;
    }
    invalidate() { this._need = undefined; this._burn = undefined; this._sick = undefined; }
    foodTotal() { return this.food.maize + this.food.meat + this.food.fish + this.food.wild; }
    addFood(k, a) {
      this.food[k] += a;
      this.today.food += a;
      this.today[k] += a;
    }
    eat(amount) {
      const tot = this.foodTotal();
      if (tot <= 0) return;
      const f = Math.min(1, amount / tot);
      for (const k of FOOD_KINDS) this.food[k] -= this.food[k] * f;
      this.today.foodEaten += Math.min(amount, tot);
    }

    // ---------------------------------------------------------------- crops
    harvestNow() { return this.crop.phase === 'green' || this.crop.phase === 'harvest' || this.crop.phase === 'frost'; }
    harvestLeft() {
      if (this.crop.phase === 'green') return Math.max(0, this.crop.potential * 0.08 - this.crop.harvested);
      if (this.crop.phase === 'harvest' || this.crop.phase === 'frost') return Math.max(0, this.crop.potential - this.crop.harvested);
      return 0;
    }
    farmOpen() {
      const ph = this.crop.phase;
      if (ph === 'prep' || ph === 'growing') return true;
      return this.harvestNow() && this.harvestLeft() > 0.5;
    }
    fieldStage(rank) {
      const { season: s, moon: m } = this.c;
      if (s === 0) return m;               // 0 cleared, 1 hills, 2 sprouts
      if (s === 1) return 3 + m;           // 3 knee-high, 4 tall, 5 tasselled
      if (s === 2) {
        const frac = this.crop.potential > 0 ? this.crop.harvested / this.crop.potential : 1;
        return rank < Math.floor(frac * this.W.fields.length) ? 7 : 6;
      }
      return 8;
    }

    // ---------------------------------------------------------------- events
    emit(text, type = 'info', ref) {
      const e = { day: this.day, hour: this.hour, text, type, ref, cal: this.c };
      this.events.push(e);
      if (this.events.length > 300) this.events.shift();
      if (this.onEvent) this.onEvent(e);
    }

    // ---------------------------------------------------------------- weather
    rollWeather() {
      const s = this.c.season, rng = this.rng;
      const table = [
        [['clear', 0.45], ['cloudy', 0.25], ['rain', 0.24], ['fog', 0.06]],
        [['clear', 0.6], ['cloudy', 0.15], ['rain', 0.12], ['storm', 0.08], ['hot', 0.05]],
        [['clear', 0.45], ['cloudy', 0.25], ['rain', 0.2], ['fog', 0.1]],
        [['clear', 0.35], ['cloudy', 0.27], ['snow', 0.33], ['cold', 0.05]],
      ][s];
      const kind = rng.weighted(table);
      this.weather = { kind, wind: rng.range(-1, 1), intensity: rng.range(0.5, 1) };
      this.invalidate();
    }
    isWet() { const k = this.weather.kind; return k === 'rain' || k === 'storm' || k === 'snow'; }

    // ---------------------------------------------------------------- main update
    update(dt) {
      const dH = (dt * 24) / C.DAY_SECONDS;
      const prevHour = this.hour;
      this.hour += dH;
      this.eat((this.needPerDay() * dH) / 24);
      const burn = (this.woodBurnPerDay() * dH) / 24;
      const burned = Math.min(this.stores.wood, burn);
      this.stores.wood -= burned;
      this.today.woodBurned += burned;
      if (this.hour >= 24) {
        this.hour -= 24;
        this.endDay();
      }
      if (prevHour < 6 && this.hour >= 6 && this.lastDawn !== this.day) { this.lastDawn = this.day; this.dawn(); }
      if (this.councilDay && prevHour < 9 && this.hour >= 9) this.emit('The council gathers in the council lodge.', 'council');
      for (let k = 0; k < this.people.length; k++) this.updatePerson(this.people[k], dt, dH);
      for (const d of this.dogs) this.updateDog(d, dt);
      this.updateWildlife(dt, dH);
    }

    endDay() {
      const t = this.today;
      const bits = [];
      if (t.deer) bits.push(`${t.deer} deer`);
      if (t.bison) bits.push(`${t.bison} bison`);
      if (bits.length) this.emit(`Hunters brought in ${bits.join(' and ')}.`, 'hunt');
      if (this.crop.phase === 'harvest' || this.crop.phase === 'frost') {
        const pct = this.crop.potential > 0 ? Math.round((100 * this.crop.harvested) / this.crop.potential) : 100;
        if (t.harvest > 1) this.emit(`The harvest is ${pct}% gathered in.`, 'farm');
      }
      this.yesterday = t;
      this.today = this.blankDay();
      // spoilage of stored food
      this.food.meat *= 0.995; this.food.fish *= 0.995; this.food.wild *= 0.99; this.food.maize *= 0.9985;
      this.history.push({ day: this.day, food: this.foodTotal(), wood: this.stores.wood, pop: this.people.length, health: this.avgHealth() });
      if (this.history.length > 200) this.history.shift();
      const old = this.c;
      this.day++;
      this.c = this.calendar();
      const c = this.c;
      this.councilDay = c.dom === 1;
      this.rollWeather();
      if (c.season !== old.season || c.moon !== old.moon) this.newMoon(old);
      // weeds, pests and weather work against the crop while it grows
      if (this.crop.phase === 'prep' || this.crop.phase === 'growing') {
        this.crop.condition = Math.max(0.05, this.crop.condition - 0.01);
        if (c.season === 1) {
          const r = this.rng.next();
          if (this.weather.kind === 'hot' || r < 0.04) {
            this.crop.condition = Math.max(0.05, this.crop.condition - 0.06);
            this.emit('Hot, dry winds wilt the corn. The fields need tending.', 'warn');
          } else if (this.weather.kind === 'storm' && r < 0.3) {
            this.crop.condition = Math.max(0.05, this.crop.condition - 0.04);
            this.emit('A hailstorm battered the fields.', 'warn');
          }
        }
      }
    }

    newMoon(old) {
      const c = this.c, s = c.season, m = c.moon, crop = this.crop;
      const label = `${TM.MOONS[s][m]}`;
      if (c.season !== old.season) {
        this.emit(`${TM.SEASONS[s]} has come. ${label} begins.`, 'season');
        if (s === 0) this.newYear();
      } else this.emit(`${label} begins.`, 'moon');
      this.emit(MOON_TEXT[s][m], 'info');
      // the agricultural cycle
      if (s === 0 && m === 0) Object.assign(crop, { condition: 0.35, potential: 0, harvested: 0, phase: 'prep' });
      if (s === 0 && m === 2) crop.phase = 'growing';
      if (s === 1 && m === 2) {
        crop.potential = this.W.fields.length * YIELD_PER_TILE * crop.condition * this.diff.prod;
        crop.phase = 'green';
        this.emit(`The crops look ${crop.condition > 0.8 ? 'strong and healthy' : crop.condition > 0.55 ? 'fair' : 'poor'} this year.`, 'farm');
      }
      if (s === 2 && m === 0) crop.phase = 'harvest';
      if (s === 2 && m === 2) {
        const left = crop.potential - crop.harvested;
        if (left > 1) {
          const lost = left * 0.5;
          crop.potential -= lost;
          this.emit(`Early frost spoiled part of the crop still standing in the fields.`, 'warn');
        }
        crop.phase = 'frost';
      }
      if (s === 3 && m === 0) {
        crop.potential = crop.harvested;
        crop.phase = 'fallow';
      }
    }

    newYear() {
      const rng = this.rng;
      this.emit(`A new year begins for the ${this.nationName()}. Everyone is a year older.`, 'season');
      for (const p of this.people.slice()) {
        const prev = p.role;
        p.age++;
        p.role = TM.roleOf(p.age);
        p.look.h = TM.heightOf(p.age, p.sex);
        this.invalidate();
        if (prev === p.role) continue;
        if (prev === 'infant') {
          const c = this.byId.get(p.carrier);
          p.carrier = null;
          p.occupation = 'Child';
          this.initPerson(p);
          if (c) { p.x = c.x; p.y = c.y; p.inside = c.inside; }
          p.plan = []; p.step = null;
        } else if (prev === 'child') {
          p.occupation = TM.assignOccupation(rng, p, p.band);
          p.skills = TM.makeSkills(rng, p);
        } else if (prev === 'youth') {
          p.occupation = p.occupation.replace('Young h', 'H').replace('Young f', 'F').replace('Young g', 'G');
          if (p.occupation.startsWith('Young')) p.occupation = TM.assignOccupation(rng, p, p.band);
          p.skills = TM.makeSkills(rng, p);
        } else if (prev === 'adult') {
          if (p.occupation !== 'Healer') p.occupation = TM.assignOccupation(rng, p, p.band);
          p.look.hair = '#9d9893';
          p.speed *= 0.85;
        }
      }
    }

    avgHealth() {
      let s = 0;
      for (const p of this.people) s += p.health;
      return this.people.length ? s / this.people.length : 0;
    }
    sickCount() {
      if (this._sick === undefined) {
        let n = 0;
        for (const p of this.people) if (p.sick > 0) n++;
        this._sick = n;
      }
      return this._sick;
    }

    // each morning: health, illness, births and deaths
    dawn() {
      const rng = this.rng, s = this.c.season, diff = this.diff;
      const need = this.needPerDay();
      const foodDays = this.foodTotal() / Math.max(1, need);
      const hungry = this.foodTotal() < need * 0.25;
      const lean = foodDays < 3;
      const cold = (s === 3 || this.weather.kind === 'cold') && this.stores.wood < 1;
      if (foodDays < 6 && !this.warnRecent('food')) this.emit(hungry ? 'The food stores are empty. People are going hungry.' : `Food stores will last only about ${Math.max(1, Math.floor(foodDays))} more days.`, 'warn');
      if (this.stores.wood < this.woodBurnPerDay() * 2 && !this.warnRecent('wood')) this.emit(this.stores.wood < 1 ? 'There is no firewood left. Lodges are cold.' : 'Firewood is running low.', 'warn');

      const infants = new Set();
      for (const p of this.people) if (p.role === 'infant' && p.age < 2) infants.add(p.carrier);
      for (const p of this.people.slice()) {
        let d = hungry ? -9 : lean ? -1.5 : 3;
        if (cold) d -= 7;
        if (p.sick > 0) { d -= 3; p.sick = Math.max(0, p.sick - 1); if (p.sick === 0) p.recovered = true; }
        if ((p.age > 65 || p.age < 3) && d < 0) d *= 1.4;
        p.health = U.clamp(p.health + d, 0, 100);
        // illness
        if (!p.sick) {
          const base = 0.0035 * diff.illness * ILL_SEASON[s] * (p.health < 50 ? 2 : 1) * (p.age < 3 || p.age > 65 ? 1.6 : 1);
          if (rng.next() < base) {
            p.sick = rng.int(2, 5);
            if (p.role !== 'infant') this.emit(`${p.name} has fallen ill.`, 'health', p.id);
          }
        }
        // death
        let risk = 0;
        if (p.age > 60) risk += (p.age - 60) * 0.00022;
        if (p.health < 25) risk += (25 - p.health) * 0.004;
        if (p.sick > 0) risk += 0.0015 * diff.illness;
        if (p.health <= 0 || rng.next() < risk) { this.die(p); continue; }
        // births
        if (p.sex === 'F' && p.age >= 17 && p.age <= 40 && p.spouse && this.byId.has(p.spouse) && !infants.has(p.id)) {
          if (rng.next() < 0.006 * (p.health > 60 && !lean ? 1 : 0.25)) { this.birth(p); infants.add(p.id); }
        }
      }
      // clothing, moccasins and bedding wear out
      this.stores.hides = Math.max(0, this.stores.hides - this.people.length * 0.012);
      this.invalidate();
    }

    // (sick count cache is refreshed after each dawn)
    warnRecent(key) {
      if (this.warned[key] !== undefined && this.day - this.warned[key] < 3) return true;
      this.warned[key] = this.day;
      return false;
    }

    birth(mother) {
      const hh = this.hhOf(mother);
      if (!hh) return;
      const sex = this.rng.chance(0.5) ? 'F' : 'M';
      const p = TM.newPerson(this.rng, this.usedNames, sex, 0, hh);
      p.mother = mother.id;
      p.father = mother.spouse;
      p.carrier = mother.id;
      p.band = mother.band;
      p.occupation = 'Infant';
      p.skills = TM.makeSkills(this.rng, p);
      p.health = 90;
      this.initPerson(p);
      p.x = mother.x; p.y = mother.y; p.inside = mother.inside;
      this.people.push(p);
      this.byId.set(p.id, p);
      this.invalidate();
      const clan = TM.CLANS.find((c) => c.id === hh.clan);
      this.emit(`A ${sex === 'F' ? 'daughter' : 'son'}, ${p.name} (“${p.meaning}”), was born to ${mother.name} of the ${clan ? clan.name : ''} Clan.`, 'birth', p.id);
    }

    die(p) {
      const i = this.people.indexOf(p);
      if (i < 0) return;
      this.people.splice(i, 1);
      this.byId.delete(p.id);
      this.invalidate();
      const hh = this.hhOf(p);
      if (hh) {
        hh.members = hh.members.filter((id) => id !== p.id);
        if (hh.cook === p.id) this.pickCook(hh);
      }
      if (p.spouse) {
        const s = this.byId.get(p.spouse);
        if (s) s.spouse = null;
      }
      for (const q of this.people) if (q.carrier === p.id) { q.carrier = null; this.attachInfant(q); }
      for (const d of this.dogs) if (d.follow === p) d.follow = null;
      const clan = TM.CLANS.find((c) => c.id === p.clan);
      const who = p.role === 'infant' ? `The infant ${p.name}` : p.role === 'elder' ? `${p.name}, an elder of the ${clan ? clan.name : ''} Clan,` : `${p.name} of the ${clan ? clan.name : ''} Clan`;
      this.emit(`${who} has passed on, at ${p.age === 0 ? 'less than a year' : p.age + (p.age === 1 ? ' year' : ' years')}.`, 'death');
      p.dead = true;
      if (this.onDeath) this.onDeath(p);
    }

    // ---------------------------------------------------------------- decisions
    isNight(p, h) { return h >= p.bed || h < p.wake; }

    isCook(p) {
      const hh = this.hhOf(p);
      return hh && hh.cook === p.id;
    }

    snapWalk(x, y) {
      const W = this.W, N = W.N;
      let fx = Math.floor(x), fy = Math.floor(y);
      if (W.isWalk(fx, fy)) return { x, y };
      for (let r = 1; r < 6; r++) {
        for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
          if (W.isWalk(fx + ox, fy + oy)) return { x: fx + ox + 0.5, y: fy + oy + 0.5 };
        }
      }
      return null;
    }
    tileSpot(i, jit = 0.3) {
      const N = this.W.N, r = this.rng;
      return { x: (i % N) + 0.5 + r.range(-jit, jit), y: ((i / N) | 0) + 0.5 + r.range(-jit, jit) };
    }
    ringSpot(cx, cy, r0, r1) {
      for (let t = 0; t < 12; t++) {
        const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(r0, r1);
        const s = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
        const i = Math.floor(s.y) * this.W.N + Math.floor(s.x);
        if (this.W.cost[i] !== Infinity && !this.W.fireTile[i]) return s;
      }
      return this.snapWalk(cx + r1, cy);
    }
    travelHours(p, s) {
      return Math.hypot(s.x - p.x, s.y - p.y) / (C.TILES_PER_HOUR * p.speed) * 1.3;
    }
    workDur(p, spot, a, b, long) {
      const h = this.hour;
      const tr = this.travelHours(p, spot);
      const brk = h < 12 ? 12 : h < 18 ? 18 : p.bed;
      let dur = this.rng.range(a, b);
      if (!long) dur = Math.min(dur, brk - h - tr * 2);
      else dur = Math.min(dur, p.bed - h - tr * 2);
      return Math.max(0.35, dur);
    }

    goHome(p, plan, label) {
      const b = this.homeOf(p);
      if (!b || !b.door) return false;
      plan.push({ k: 'go', x: b.door.x + 0.5 + p.jx * 0.5, y: b.door.y + 0.5 + p.jy * 0.5, label, home: true });
      plan.push({ k: 'walk', x: b.mouth.x, y: b.mouth.y });
      return true;
    }
    doorSpot(b, p) {
      return { x: b.door.x + 0.5 + p.jx, y: b.door.y + 0.5 + p.jy };
    }

    decide(p) {
      const h = this.hour, plan = p.plan;
      plan.length = 0;
      p.step = null;
      if (p.sick > 0) {
        p.planKind = 'rest';
        this.goHome(p, plan, 'Going home to rest');
        plan.push({ k: 'deposit' }, { k: 'enter' }, { k: 'stay', dur: 3, label: 'Resting, unwell' });
        return;
      }
      if (this.isNight(p, h)) {
        p.planKind = 'sleep';
        this.goHome(p, plan, 'Going home for the night');
        plan.push({ k: 'deposit' }, { k: 'enter' }, { k: 'stay', until: 'wake', label: 'Sleeping' });
        return;
      }
      const slot = h >= 12 && h < 13 ? 1 : h >= 18 && h < 19.3 ? 2 : 0;
      if (slot && p.lastMeal !== this.day * 3 + slot) {
        p.lastMeal = this.day * 3 + slot;
        const b = this.homeOf(p);
        if (b && Math.hypot(b.cx - p.x, b.cy - p.y) < 22) return this.planMeal(p, b);
      }
      if (h >= 19.3) return this.planEvening(p);
      if (((h >= 11 && h < 12) || (h >= 17 && h < 18)) && this.isCook(p)) return this.planCook(p);
      if (this.councilDay && p.title && h >= 8.5 && h < 10.5 && this.W.council >= 0 && p.councilDay !== this.day) {
        p.councilDay = this.day;
        const cb = this.W.buildings[this.W.council];
        if (cb && cb.door) {
          p.planKind = 'council';
          plan.push({ k: 'go', x: cb.door.x + 0.5 + p.jx, y: cb.door.y + 0.5 + p.jy, label: 'Going to the council lodge' });
          plan.push({ k: 'walk', x: cb.mouth.x, y: cb.mouth.y }, { k: 'enter', b: cb.id }, { k: 'stay', dur: 2, label: 'Meeting in council' });
          return;
        }
      }
      p.planKind = 'work';
      this.planAct(p, this.pickActivity(p));
      if (!plan.length) {
        const b = this.homeOf(p);
        if (b && b.door) plan.push({ k: 'go', ...this.doorSpot(b, p) }, { k: 'work', act: 'rest', anim: 'sit', dur: 0.6, label: 'Resting' });
        else plan.push({ k: 'work', act: 'rest', anim: 'stand', dur: 0.5, label: 'Resting' });
      }
    }

    planMeal(p, b) {
      const plan = p.plan;
      p.planKind = 'meal';
      if (this.c.season === 3 || this.isWet() || !b.hearth) {
        this.goHome(p, plan, 'Going home to eat');
        plan.push({ k: 'deposit' }, { k: 'enter' }, { k: 'stay', dur: this.rng.range(0.6, 1.0), label: 'Sharing a meal' });
        return;
      }
      const s = this.ringSpot(b.hearth.x, b.hearth.y, 0.75, 1.25);
      plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going home to eat' }, { k: 'deposit' });
      plan.push({ k: 'work', act: 'meal', anim: 'sit', dur: this.rng.range(0.55, 0.9), face: { x: b.hearth.x, y: b.hearth.y }, label: 'Sharing a meal' });
    }

    planCook(p) {
      const plan = p.plan, b = this.homeOf(p);
      p.planKind = 'cook';
      if (!b) return;
      const until = this.hour < 12 ? 12 : 18;
      if (this.c.season === 3 || this.isWet() || !b.hearth) {
        this.goHome(p, plan, 'Going home to cook');
        plan.push({ k: 'deposit' }, { k: 'enter' }, { k: 'stay', dur: Math.max(0.3, until - this.hour), label: 'Cooking at the hearth' });
        return;
      }
      const s = this.ringSpot(b.hearth.x, b.hearth.y, 0.6, 0.9);
      plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to the hearth' }, { k: 'deposit' });
      plan.push({ k: 'work', act: 'cook', anim: 'stir', dur: Math.max(0.3, until - this.hour), face: { x: b.hearth.x, y: b.hearth.y }, label: 'Cooking stew in a clay pot' });
    }

    planEvening(p) {
      const plan = p.plan, rng = this.rng, W = this.W;
      p.planKind = 'evening';
      const dur = Math.max(0.3, p.bed - this.hour);
      if (this.c.season === 3 || this.isWet() || rng.chance(0.3)) {
        this.goHome(p, plan, 'Going home for the evening');
        plan.push({ k: 'deposit' }, { k: 'enter' }, { k: 'stay', dur, label: 'Resting by the lodge fire' });
        return;
      }
      const fx = p.band === 'camp' ? W.CCX : W.PCX, fy = p.band === 'camp' ? W.CCY : W.PCY;
      if (p.role === 'child' && rng.chance(0.45)) {
        const s = this.ringSpot(fx, fy, 1.3, 2.0);
        plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to the fire' }, { k: 'work', act: 'listen', anim: 'sit', dur, face: { x: fx, y: fy }, label: 'Listening to stories' });
        return;
      }
      if (p.role === 'child') return this.planAct(p, 'play');
      const story = p.role === 'elder' && (p.occupation === 'Storyteller' || rng.chance(0.25));
      const s = this.ringSpot(fx, fy, story ? 1.3 : 1.6, story ? 1.7 : 3.0);
      plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to the central fire' }, { k: 'deposit' });
      plan.push({ k: 'work', act: story ? 'story' : 'social', anim: story ? 'tell' : 'sit', dur, face: { x: fx, y: fy }, label: story ? 'Telling stories by the fire' : 'Talking by the fire' });
    }

    pickActivity(p) {
      const rng = this.rng, c = this.c, s = c.season;
      const occ = TM.OCCUPATIONS[p.occupation] || {};
      const prim = occ.act;
      const winter = s === 3;
      const farmOk = this.farmOpen();
      const guardOk = (s === 1 && c.moon >= 1) || (s === 2 && c.moon === 0 && this.harvestLeft() > 0);
      const woodLow = this.stores.wood < this.woodBurnPerDay() * 4 ? 2.2 : 1;
      const harvest = this.harvestNow() && this.harvestLeft() > 0.5;
      const W = [];
      if (p.role === 'child') {
        if (p.age < 7) return rng.weighted([['play', 0.7], ['follow', 0.3]]);
        W.push(['play', 0.45], ['water', 0.12], ['gather', winter ? 0 : 0.12 * GATHER_SEASON[s]], ['guard', guardOk ? 0.3 : 0], ['wood', 0.08 * woodLow], ['farm', harvest ? 0.15 : 0]);
        return rng.weighted(W);
      }
      if (p.role === 'elder') {
        W.push(['craft', 0.4], ['rest', 0.25], ['guard', guardOk ? 0.25 : 0], ['gather', 0.1 * GATHER_SEASON[s]], ['wood', 0.04 * woodLow]);
        if (p.occupation === 'Fisher') W.push(['fish', 0.4 * FISH_SEASON[s]]);
        if (p.occupation === 'Healer') W.push(['heal', this.sickCount() > 0 ? 1.4 : 0], ['gather', 0.25]);
        if (p.occupation === 'Storyteller') W.push(['story', 0.3]);
        if (harvest) W.push(['farm', 0.2]);
        return rng.weighted(W);
      }
      const F = p.sex === 'F';
      const wMul = winter ? 2.4 : 1;
      W.push(['wood', (F ? 0.11 : 0.07) * woodLow * wMul], ['water', F ? 0.06 : 0.01]);
      const P = 0.62;
      switch (prim) {
        case 'farm':
          if (farmOk) W.push(['farm', P * (harvest ? 1.4 : 1)]);
          else W.push(['craft', 0.3], ['gather', 0.25 * GATHER_SEASON[s]], ['hides', 0.15]);
          break;
        case 'hunt': W.push(['hunt', P * HUNT_SEASON[s]]); break;
        case 'fish': W.push(['fish', P * FISH_SEASON[s]], ['hunt', winter ? 0.25 : 0]); break;
        case 'gather': W.push(['gather', P * Math.max(0.25, GATHER_SEASON[s])]); break;
        case 'hides': W.push(['hides', P * (this.stores.rawHides > 0.5 ? 1 : 0.2)], ['gather', 0.1]); break;
        case 'craft': W.push(['craft', P]); break;
        case 'build': W.push(['build', P * 0.6], ['wood', 0.2]); break;
        case 'heal': W.push(['heal', this.sickCount() > 0 ? P : 0], ['gather', 0.3]); break;
        default: W.push(['craft', 0.3]);
      }
      if (F) W.push(['farm', farmOk && p.band === 'village' ? 0.16 : 0], ['gather', 0.08 * GATHER_SEASON[s]], ['hides', this.stores.rawHides > 2 ? 0.1 : 0], ['craft', 0.06]);
      else W.push(['hunt', 0.08 * HUNT_SEASON[s]], ['fish', p.band === 'village' ? 0.06 * FISH_SEASON[s] : 0], ['craft', 0.06], ['build', 0.02]);
      if (harvest) W.push(['farm', p.band === 'village' ? (F ? 0.45 : 0.3) : F ? 0.25 : 0.08]);
      return rng.weighted(W);
    }

    gatherLabel(p) {
      const s = this.c.season;
      if (p.band === 'camp' && s <= 1) return 'Digging prairie turnips';
      return ['Gathering greens and roots', 'Picking berries', 'Gathering nuts and acorns', 'Searching for winter food'][s];
    }
    farmLabel() {
      const { season: s, moon: m } = this.c;
      if (this.harvestNow()) return this.crop.phase === 'green' ? 'Picking green corn' : 'Harvesting maize, beans and squash';
      if (s === 0) return m === 0 ? 'Clearing last year’s stalks' : m === 1 ? 'Hoeing up the hills' : 'Planting maize, beans and squash';
      return 'Weeding and hilling the corn';
    }

    planAct(p, act) {
      const W = this.W, rng = this.rng, plan = p.plan, band = p.band;
      const sp = W.spots;
      const home = this.homeOf(p);
      switch (act) {
        case 'farm': {
          const hh = this.hhOf(p);
          const list = hh && hh.fields.length ? hh.fields : W.fields.map((f) => f.i);
          if (!list.length) return;
          const s = this.tileSpot(rng.pick(list), 0.32);
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Walking to the fields', tool: 'hoe' });
          plan.push({ k: 'work', act: 'farm', anim: this.harvestNow() ? 'harvest' : 'hoe', dur: this.workDur(p, s, 2, 4), label: this.farmLabel(), tool: this.harvestNow() ? 'basket' : 'hoe' });
          if (this.harvestNow()) plan.push({ k: 'go', ...(home && home.door ? this.doorSpot(home, p) : s), label: 'Carrying the harvest home', carry: 'maize' });
          break;
        }
        case 'hunt': {
          let t = null, kind = 'deer';
          if (band === 'camp' && this.bison.length) {
            const b = rng.pick(this.bison);
            t = this.snapWalk(b.x + rng.range(-3, 3), b.y + rng.range(-3, 3));
            kind = 'bison';
          } else if (this.deerGroups.length) {
            const g = rng.pick(this.deerGroups);
            t = this.snapWalk(g.cx + rng.range(-3, 3), g.cy + rng.range(-3, 3));
          }
          if (!t && sp.deer.length) t = this.tileSpot(rng.pick(sp.deer));
          if (!t) return;
          const racks = this.racks[band].length ? this.racks[band] : this.racks.village;
          const rack = racks.length ? racks[rng.int(0, racks.length - 1)] : home;
          plan.push({ k: 'go', x: t.x, y: t.y, label: kind === 'bison' ? 'Setting out after the bison herd' : 'Setting out to hunt deer', tool: 'bow' });
          plan.push({ k: 'work', act: 'hunt', kind, anim: 'stalk', dur: this.workDur(p, t, 2.5, 4.5, true), label: kind === 'bison' ? 'Stalking bison on the prairie' : 'Tracking deer in the forest', tool: 'bow' });
          if (rack && rack.door) plan.push({ k: 'go', ...this.doorSpot(rack, p), label: 'Returning from the hunt', tool: 'bow' }, { k: 'deposit' });
          break;
        }
        case 'fish': {
          const list = sp.fish[band].length ? sp.fish[band] : sp.fish.village;
          if (!list.length) return;
          const s = this.tileSpot(rng.pick(list), 0.15);
          const rack = (this.racks[band].find((b) => b.load === 'fish') || this.racks[band][0] || home);
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Walking to the river', tool: 'spear' });
          plan.push({ k: 'work', act: 'fish', anim: 'fish', dur: this.workDur(p, s, 1.5, 3), label: this.c.season === 3 ? 'Fishing through the ice' : 'Spear-fishing at the river', tool: 'spear', face: { x: W.rx(s.y), y: s.y } });
          if (rack && rack.door) plan.push({ k: 'go', ...this.doorSpot(rack, p), label: 'Bringing the catch to the racks', tool: 'spear' }, { k: 'deposit' });
          break;
        }
        case 'gather': {
          const list = sp.gather[band].length ? sp.gather[band] : sp.gather.village;
          if (!list.length) return;
          const s = this.tileSpot(rng.pick(list), 0.3);
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going out to gather', tool: 'basket' });
          plan.push({ k: 'work', act: 'gather', anim: 'gather', dur: this.workDur(p, s, 1.2, 2.8), label: this.gatherLabel(p), tool: 'basket' });
          if (home && home.door) plan.push({ k: 'go', ...this.doorSpot(home, p), label: 'Carrying food home', tool: 'basket' }, { k: 'deposit' });
          break;
        }
        case 'wood': {
          const list = sp.wood[band].length ? sp.wood[band] : sp.wood.village;
          if (!list.length) return;
          const s = this.tileSpot(rng.pick(list), 0.2);
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going for firewood', tool: 'axe' });
          plan.push({ k: 'work', act: 'wood', anim: 'chop', dur: this.workDur(p, s, 1.2, 2.4), label: 'Gathering firewood', tool: 'axe' });
          if (home && home.door) plan.push({ k: 'go', ...this.doorSpot(home, p), label: 'Hauling firewood home' }, { k: 'deposit' });
          break;
        }
        case 'water': {
          const list = sp.water[band].length ? sp.water[band] : sp.water.village;
          if (!list.length) return;
          const s = this.tileSpot(rng.pick(list), 0.1);
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to fetch water', tool: 'pot' });
          plan.push({ k: 'work', act: 'water', anim: 'gather', dur: 0.15, label: 'Filling a water vessel', tool: 'pot', face: { x: W.rx(s.y), y: s.y } });
          if (home && home.door) plan.push({ k: 'go', ...this.doorSpot(home, p), label: 'Carrying water home', carry: 'water' });
          break;
        }
        case 'hides': {
          const frames = this.hideFrames[band].length ? this.hideFrames[band] : this.hideFrames.village;
          const f = frames.length ? rng.pick(frames) : null;
          if (f && f.door) {
            const s = { x: f.door.x + 0.5 + rng.range(-0.2, 0.2), y: f.door.y + 0.5 + rng.range(-0.2, 0.2) };
            plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to the hide frames' });
            plan.push({ k: 'work', act: 'hides', anim: 'scrape', dur: this.workDur(p, s, 1.5, 3), label: 'Scraping and softening a hide', tool: 'scraper', face: { x: f.cx, y: f.cy } });
          } else if (home && home.door) {
            const s = this.doorSpot(home, p);
            plan.push({ k: 'go', ...s }, { k: 'work', act: 'hides', anim: 'scrape', dur: this.workDur(p, s, 1.5, 3), label: 'Working a hide', tool: 'scraper' });
          }
          break;
        }
        case 'craft': {
          const occ = TM.OCCUPATIONS[p.occupation] || {};
          const craft = occ.craft || (p.sex === 'F' ? rng.pick(['mats', 'pottery', 'baskets']) : 'tools');
          const label = { pottery: 'Shaping clay pots', mats: 'Weaving cattail mats', tools: 'Knapping flint points', baskets: 'Weaving baskets' }[craft];
          if (!home || !home.door) return;
          if (this.c.season === 3 || this.isWet() || rng.chance(0.15)) {
            this.goHome(p, plan);
            plan.push({ k: 'deposit' }, { k: 'enter' }, { k: 'stay', dur: rng.range(1.5, 3), label: label + ' inside the lodge', act: 'craft' });
          } else {
            const s = { x: home.door.x + 0.5 + rng.range(-0.7, 0.7), y: home.door.y + 0.5 + rng.range(-0.7, 0.7) };
            const t = this.snapWalk(s.x, s.y) || s;
            plan.push({ k: 'go', x: t.x, y: t.y, label: 'Settling in to work' }, { k: 'deposit' });
            plan.push({ k: 'work', act: 'craft', craft, anim: 'craft', dur: this.workDur(p, t, 1.5, 3), label, tool: craft });
          }
          break;
        }
        case 'build': {
          const homes = W.buildings.filter((b) => b.band === band && (b.type === 'wigwam' || b.type === 'longhouse' || b.type === 'tipi' || b.type === 'council') && b.door);
          if (!homes.length) return;
          const b = rng.pick(homes);
          const s = this.ringSpot(b.door.x + 0.5, b.door.y + 0.5, 0.2, 0.8) || this.doorSpot(b, p);
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to repair a lodge', tool: 'axe' });
          plan.push({ k: 'work', act: 'build', anim: 'chop', dur: this.workDur(p, s, 1.5, 2.5), label: b.type === 'tipi' ? 'Re-lacing a tipi cover' : 'Lashing new bark onto a lodge', tool: 'axe', face: { x: b.cx, y: b.cy } });
          break;
        }
        case 'play': {
          const list = sp.play[band].length ? sp.play[band] : sp.play.village;
          if (!list.length) return;
          const n = rng.int(2, 4);
          for (let k = 0; k < n; k++) {
            const s = this.tileSpot(rng.pick(list), 0.4);
            plan.push({ k: 'go', x: s.x, y: s.y, run: true, label: 'Playing' });
            plan.push({ k: 'work', act: 'play', anim: rng.chance(0.5) ? 'play' : 'stand', dur: rng.range(0.1, 0.3), label: rng.pick(['Playing a hoop-and-pole game', 'Playing tag', 'Playing with the dogs', 'Playing']) });
          }
          break;
        }
        case 'follow': {
          const m = this.byId.get(p.mother);
          if (m && !m.inside && Math.hypot(m.x - p.x, m.y - p.y) < 25) {
            const s = this.snapWalk(m.x + rng.range(-0.8, 0.8), m.y + rng.range(-0.8, 0.8));
            if (s) {
              plan.push({ k: 'go', x: s.x, y: s.y, label: 'Staying close to mother' });
              plan.push({ k: 'work', act: 'play', anim: 'stand', dur: rng.range(0.2, 0.5), label: 'Watching mother work' });
              break;
            }
          }
          this.planAct(p, 'play');
          break;
        }
        case 'guard': {
          const plats = W.buildings.filter((b) => b.type === 'platform' && b.door);
          let s;
          if (plats.length && rng.chance(0.6)) {
            const b = rng.pick(plats);
            s = { x: b.door.x + 0.5 + rng.range(-0.2, 0.2), y: b.door.y + 0.5 + rng.range(-0.2, 0.2) };
          } else if (W.fields.length) s = this.tileSpot(rng.pick(W.fields).i, 0.3);
          if (!s) return;
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to watch the fields' });
          plan.push({ k: 'work', act: 'guard', anim: 'guard', dur: this.workDur(p, s, 1.5, 3), label: 'Chasing crows from the corn' });
          break;
        }
        case 'rest': {
          if (!home || !home.door) return;
          const s = this.snapWalk(home.door.x + 0.5 + rng.range(-0.8, 0.8), home.door.y + 0.5 + rng.range(-0.8, 0.8));
          if (!s) return;
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Walking home' }, { k: 'deposit' });
          plan.push({ k: 'work', act: 'rest', anim: 'sit', dur: rng.range(0.8, 1.8), label: 'Resting in the sun' });
          break;
        }
        case 'heal': {
          const sick = this.people.filter((q) => q.sick > 0 && q.band === band && q.role !== 'infant');
          const target = sick.length ? rng.pick(sick) : null;
          const b = target ? this.homeOf(target) : null;
          if (!b || !b.door) return this.planAct(p, 'gather');
          plan.push({ k: 'go', ...this.doorSpot(b, p), label: `Going to tend ${target.name}` });
          plan.push({ k: 'work', act: 'heal', anim: 'stir', dur: 1, label: `Preparing medicine for ${target.name}`, target: target.id });
          break;
        }
        case 'story': {
          const fx = band === 'camp' ? W.CCX : W.PCX, fy = band === 'camp' ? W.CCY : W.PCY;
          const s = this.ringSpot(fx, fy, 1.4, 2.0);
          if (!s) return;
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Walking to the plaza' });
          plan.push({ k: 'work', act: 'story', anim: 'tell', dur: this.workDur(p, s, 1, 2), label: 'Teaching the children', face: { x: fx, y: fy } });
          break;
        }
        default:
          break;
      }
    }

    // ---------------------------------------------------------------- per-person update
    updatePerson(p, dt, dH) {
      if (p.role === 'infant') {
        const c = this.byId.get(p.carrier);
        if (c) { p.x = c.x; p.y = c.y; p.inside = c.inside; p.dir = c.dir; }
        else this.attachInfant(p);
        return;
      }
      p.animT += dt;
      if (p.planKind !== 'sleep' && p.planKind !== 'rest' && this.isNight(p, this.hour)) this.decide(p);
      let guard = 0;
      while (!p.step && guard++ < 4) {
        if (!p.plan.length) this.decide(p);
        p.step = p.plan.shift() || null;
        if (p.step) this.beginStep(p, p.step);
      }
      const st = p.step;
      if (!st) return;
      switch (st.k) {
        case 'go': {
          if (p.inside) p.inside = false;
          if (!st.path && !this.computePath(p, st)) { p.step = null; break; }
          p.anim = st.run ? 'run' : 'walk';
          if (this.moveAlong(p, st, dt)) p.step = null;
          break;
        }
        case 'walk': {
          if (p.inside) p.inside = false;
          p.anim = 'walk';
          if (this.moveDirect(p, st.x, st.y, dt)) p.step = null;
          break;
        }
        case 'work': {
          if (p.inside) p.inside = false;
          if (st.face) {
            const sdx = (st.face.x - p.x) - (st.face.y - p.y);
            if (Math.abs(sdx) > 0.05) p.dir = sdx > 0 ? 1 : -1;
          }
          p.anim = st.anim;
          st.t -= dH;
          this.produce(p, st, dH, dt);
          if (st.t <= 0) { this.endWork(p, st); p.step = null; }
          break;
        }
        case 'enter':
          p.inside = true;
          p.anim = 'stand';
          p.step = null;
          break;
        case 'stay':
          if (st.until === 'wake') { if (!this.isNight(p, this.hour)) p.step = null; }
          else { st.t -= dH; if (st.t <= 0) p.step = null; }
          if (st.act === 'craft') this.stores.goods += 0.2 * (p.skills.craft || 0.5) * dH;
          break;
        case 'deposit':
          this.deposit(p);
          p.step = null;
          break;
        default:
          p.step = null;
      }
    }

    beginStep(p, st) {
      if (st.label) p.actLabel = st.label;
      if (st.tool !== undefined) p.tool = st.tool;
      if (st.k === 'work') {
        st.t = st.dur;
        p.act = st.act;
        if (st.act === 'farm' && this.harvestNow()) p.tool = 'basket';
      } else if (st.k === 'stay') {
        st.t = st.dur || 0;
        p.act = st.act || 'inside';
      } else if (st.k === 'go') {
        p.act = 'walk';
        st.path = null;
        if (st.carry) p.carry = p.carry || { kind: st.carry };
      }
      if (st.k === 'go' && p.carry) {
        const c = p.carry;
        const k = c.meat > 0 ? 'meat' : c.wood > 0 ? 'wood' : c.fish > 0 ? 'fish' : c.wild > 0 ? 'wild' : c.kind;
        if (k) c.kind = k;
        if (k === 'meat') p.actLabel = 'Bringing home meat from the hunt';
        else if (k === 'wood') p.actLabel = 'Hauling firewood home';
      }
    }

    computePath(p, st) {
      const W = this.W, N = W.N, rng = this.rng;
      const sx = U.clamp(Math.floor(p.x), 0, N - 1), sy = U.clamp(Math.floor(p.y), 0, N - 1);
      const tx = U.clamp(Math.floor(st.x), 0, N - 1), ty = U.clamp(Math.floor(st.y), 0, N - 1);
      const tiles = TM.Path.find(N, W.cost, sx, sy, tx, ty, 14000);
      if (!tiles) return false;
      const pts = [];
      for (let k = 0; k < tiles.length - 1; k++) {
        const i = tiles[k];
        pts.push({ x: (i % N) + 0.5 + p.jx + rng.range(-0.06, 0.06), y: ((i / N) | 0) + 0.5 + p.jy + rng.range(-0.06, 0.06) });
      }
      pts.push({ x: st.x, y: st.y });
      st.path = pts;
      st.pi = 0;
      return true;
    }

    moveAlong(p, st, dt) {
      const W = this.W, N = W.N;
      let budget = C.WALK * p.speed * dt * (st.run ? 1.75 : 1);
      while (budget > 1e-6 && st.pi < st.path.length) {
        const wp = st.path[st.pi];
        const dx = wp.x - p.x, dy = wp.y - p.y, d = Math.hypot(dx, dy);
        const ti = U.clamp(Math.floor(p.y), 0, N - 1) * N + U.clamp(Math.floor(p.x), 0, N - 1);
        const g = W.ground[ti] || 1;
        const step = budget * g;
        const sdx = dx - dy;
        if (Math.abs(sdx) > 0.02) p.dir = sdx > 0 ? 1 : -1;
        if (d <= step) {
          p.x = wp.x; p.y = wp.y;
          budget -= d / g;
          st.pi++;
          p.wp += d * 5.5;
        } else {
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
          p.wp += step * 5.5;
          budget = 0;
        }
      }
      return st.pi >= st.path.length;
    }

    moveDirect(p, x, y, dt, mul = 1) {
      const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
      const step = C.WALK * p.speed * dt * mul;
      const sdx = dx - dy;
      if (Math.abs(sdx) > 0.02) p.dir = sdx > 0 ? 1 : -1;
      if (d <= step) { p.x = x; p.y = y; p.wp += d * 5.5; return true; }
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
      p.wp += step * 5.5;
      return false;
    }

    produce(p, st, dH, dt) {
      const s = this.c.season, prod = this.diff.prod, sk = p.skills, rng = this.rng;
      const roleMul = p.role === 'adult' ? 1 : p.role === 'youth' ? 0.75 : p.role === 'elder' ? 0.6 : 0.45;
      const carry = () => (p.carry = p.carry && p.carry.kind !== 'water' && p.carry.kind !== 'maize' ? p.carry : { kind: null, meat: 0, fish: 0, wild: 0, wood: 0, hides: 0 });
      switch (st.act) {
        case 'farm': {
          if (this.harvestNow()) {
            const left = this.harvestLeft();
            if (left > 0) {
              const a = Math.min(left, HARVEST_RATE * sk.farm * roleMul * dH * prod);
              this.crop.harvested += a;
              this.addFood('maize', a);
              this.today.harvest += a;
            }
          } else if (s <= 1) {
            this.crop.condition = Math.min(1, this.crop.condition + (COND_RATE * sk.farm * roleMul * dH * prod) / Math.max(1, this.W.fields.length));
          }
          break;
        }
        case 'hunt': {
          const c = carry();
          const pHr = (st.kind === 'bison' ? 0.034 : 0.062) * HUNT_SEASON[s] * sk.hunt * prod;
          if (rng.next() < pHr * dH) {
            const meat = st.kind === 'bison' ? rng.range(18, 30) : rng.range(7, 13);
            c.meat += meat;
            c.hides += 1;
            c.kind = 'meat';
            c.game = st.kind;
            if (st.kind === 'bison') this.today.bison++; else this.today.deer++;
            p.actLabel = st.kind === 'bison' ? 'Butchering a bison' : 'Dressing a deer';
            if (c.meat >= CARRY.meat * 0.6) st.t = Math.min(st.t, 0.35);
          }
          this.wander(p, st, dt, 2.2, 0.35);
          break;
        }
        case 'fish': {
          const c = carry();
          c.fish += 0.62 * FISH_SEASON[s] * sk.fish * roleMul * dH * prod * rng.range(0.6, 1.4);
          if (c.fish >= CARRY.fish) { c.fish = CARRY.fish; st.t = 0; }
          c.kind = 'fish';
          break;
        }
        case 'gather': {
          const c = carry();
          c.wild += 0.55 * GATHER_SEASON[s] * sk.gather * roleMul * dH * prod;
          if (c.wild >= CARRY.wild) { c.wild = CARRY.wild; st.t = 0; }
          c.kind = 'wild';
          this.wander(p, st, dt, 1.2, 0.3);
          break;
        }
        case 'wood': {
          const c = carry();
          c.wood += 2.4 * roleMul * dH;
          if (c.wood >= CARRY.wood) { c.wood = CARRY.wood; st.t = 0; }
          c.kind = 'wood';
          break;
        }
        case 'hides': {
          if (this.stores.rawHides > 0) {
            const a = Math.min(this.stores.rawHides, 0.12 * sk.hides * roleMul * dH);
            this.stores.rawHides -= a;
            this.stores.hides += a;
            this.today.hides += a;
          }
          break;
        }
        case 'craft':
          this.stores.goods += 0.25 * sk.craft * dH;
          break;
        default:
          break;
      }
    }

    // slow wandering while hunting or gathering
    wander(p, st, dt, radius, speed) {
      if (!st.home) st.home = { x: p.x, y: p.y };
      if (!st.sub || st.subT <= 0) {
        if (st.sub && st.sub.wait) {
          const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(0.3, radius);
          const tx = st.home.x + Math.cos(a) * r, ty = st.home.y + Math.sin(a) * r;
          if (this.W.isWalk(Math.floor(tx), Math.floor(ty)) && this.W.isWalk(Math.floor((tx + p.x) / 2), Math.floor((ty + p.y) / 2))) st.sub = { x: tx, y: ty };
          else st.sub = { wait: true };
          st.subT = 0.6;
        } else {
          st.sub = { wait: true };
          st.subT = this.rng.range(0.15, 0.5);
        }
      }
      st.subT -= (dt * 24) / C.DAY_SECONDS;
      if (st.sub && !st.sub.wait) {
        p.anim = st.act === 'hunt' ? 'stalk' : 'walk';
        if (this.moveDirect(p, st.sub.x, st.sub.y, dt, speed)) st.subT = 0;
      }
    }

    endWork(p, st) {
      if (st.act === 'heal' && st.target) {
        const t = this.byId.get(st.target);
        if (t && t.sick > 0) {
          t.health = Math.min(100, t.health + 6 * (p.skills.gather || 1));
          if (this.rng.chance(0.45)) t.sick = Math.max(0, t.sick - 1);
          this.invalidate();
        }
      }
      if (st.act === 'water' && !p.carry) p.carry = { kind: 'water' };
      if (st.act === 'farm' && this.harvestNow()) p.carry = { kind: 'maize' };
    }

    deposit(p) {
      const c = p.carry;
      if (!c) return;
      if (c.meat) this.addFood('meat', c.meat);
      if (c.fish) { this.addFood('fish', c.fish); this.today.fish += c.fish; }
      if (c.wild) this.addFood('wild', c.wild);
      if (c.wood) { this.stores.wood += c.wood; this.today.wood += c.wood; }
      if (c.hides) this.stores.rawHides += c.hides;
      p.carry = null;
    }

    // ---------------------------------------------------------------- dogs and wildlife
    updateDog(d, dt) {
      const rng = this.rng, W = this.W;
      d.t -= dt;
      const night = this.hour >= 21.5 || this.hour < 5.5;
      if (d.follow && (d.follow.inside || d.follow.dead || Math.hypot(d.follow.x - d.x, d.follow.y - d.y) > 30)) d.follow = null;
      if (d.follow) {
        const f = d.follow;
        const tx = f.x - 0.7 * f.dir, ty = f.y + 0.5;
        const dd = Math.hypot(tx - d.x, ty - d.y);
        if (dd > 0.6) {
          d.state = 'walk';
          this.moveDirect(d, tx, ty, dt, dd > 3 ? 1.6 : 1.05);
        } else d.state = 'sit';
        if (d.t < 0) { d.t = rng.range(20, 60); if (rng.chance(0.25)) d.follow = null; }
        return;
      }
      if (d.state === 'walk' && d.path) {
        if (this.moveAlong(d, d, dt)) { d.state = night ? 'lie' : rng.chance(0.5) ? 'sit' : 'sniff'; d.path = null; d.t = rng.range(3, 12); }
        return;
      }
      if (d.t > 0) return;
      d.t = rng.range(3, 12);
      if (night) {
        const b = d.home;
        if (Math.hypot(b.door.x + 0.5 - d.x, b.door.y + 0.5 - d.y) > 1.5) this.dogTo(d, b.door.x + 0.5 + rng.range(-0.6, 0.6), b.door.y + 0.5 + rng.range(-0.6, 0.6));
        else d.state = 'lie';
        return;
      }
      if (rng.chance(0.25)) {
        const hh = this.households.find((h) => h.dwelling === d.home.id);
        const cand = hh ? hh.members.map((id) => this.byId.get(id)).filter((q) => q && !q.inside && q.role !== 'infant') : [];
        if (cand.length) { d.follow = rng.pick(cand); d.t = rng.range(20, 60); return; }
      }
      const a = rng.range(0, Math.PI * 2), r = rng.range(1, 5);
      const s = this.snapWalk(d.home.door.x + 0.5 + Math.cos(a) * r, d.home.door.y + 0.5 + Math.sin(a) * r);
      if (s) this.dogTo(d, s.x, s.y);
      else d.state = 'sit';
    }
    dogTo(d, x, y) {
      const N = this.W.N;
      const tiles = TM.Path.find(N, this.W.cost, Math.floor(d.x), Math.floor(d.y), Math.floor(x), Math.floor(y), 2000);
      if (!tiles) { d.state = 'sit'; return; }
      d.path = tiles.slice(0, -1).map((i) => ({ x: (i % N) + 0.5, y: ((i / N) | 0) + 0.5 }));
      d.path.push({ x, y });
      d.pi = 0;
      d.run = this.rng.chance(0.3);
      d.speed = 0.9;
      d.state = 'walk';
    }

    updateWildlife(dt, dH) {
      const rng = this.rng, W = this.W;
      for (const g of this.deerGroups) {
        g.moveT -= dH;
        if (g.moveT <= 0) {
          g.moveT = rng.range(4, 10);
          if (W.spots.deer.length) {
            const i = rng.pick(W.spots.deer);
            const nx = (i % W.N) + 0.5, ny = ((i / W.N) | 0) + 0.5;
            if (Math.hypot(nx - g.cx, ny - g.cy) < 14) { g.tx = nx; g.ty = ny; }
          }
        }
        const dx = g.tx - g.cx, dy = g.ty - g.cy, d = Math.hypot(dx, dy);
        if (d > 0.05) { const st = Math.min(d, dt * 0.08); g.cx += (dx / d) * st; g.cy += (dy / d) * st; }
        for (const a of g.members) this.updateAnimal(a, g.cx, g.cy, 2.2, dt, 0.7);
      }
      const h = this.herd, br = W.bisonRange;
      h.moveT -= dH;
      if (h.moveT <= 0) {
        h.moveT = rng.range(6, 14);
        h.tx = U.clamp(h.cx + rng.range(-10, 10), br.x0 + 3, br.x1 - 2);
        h.ty = U.clamp(h.cy + rng.range(-14, 14), br.y0 + 6, br.y1 - 6);
      }
      const dx = h.tx - h.cx, dy = h.ty - h.cy, d = Math.hypot(dx, dy);
      if (d > 0.05) { const st = Math.min(d, dt * 0.06); h.cx += (dx / d) * st; h.cy += (dy / d) * st; }
      for (const a of this.bison) this.updateAnimal(a, h.cx, h.cy, 5, dt, 0.45);
    }
    updateAnimal(a, cx, cy, spread, dt, speed) {
      const rng = this.rng, W = this.W;
      a.t -= dt;
      if (a.moving) {
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        const st = speed * dt;
        const sdx = dx - dy;
        if (Math.abs(sdx) > 0.02) a.dir = sdx > 0 ? 1 : -1;
        if (d <= st) { a.x = a.tx; a.y = a.ty; a.moving = false; a.t = rng.range(3, 14); }
        else { a.x += (dx / d) * st; a.y += (dy / d) * st; a.wp += st * 4; }
        return;
      }
      if (a.t > 0) return;
      const tx = cx + rng.range(-spread, spread), ty = cy + rng.range(-spread, spread);
      const ix = Math.floor(tx), iy = Math.floor(ty);
      if (ix < 1 || iy < 1 || ix >= W.N - 1 || iy >= W.N - 1) { a.t = 1; return; }
      const t = W.type[iy * W.N + ix];
      if (t === TM.T.WATER || t === TM.T.SHALLOW || W.occ[iy * W.N + ix] >= 0) { a.t = 1; return; }
      a.tx = tx; a.ty = ty; a.moving = true;
    }
  }

  TM.Sim = Sim;
})();
