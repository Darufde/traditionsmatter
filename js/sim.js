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
  const HUNT_LABEL = {
    deer: ['Setting out to hunt deer', 'Tracking deer in the forest'],
    elk: ['Setting out after elk', 'Stalking elk in the oak openings'],
    bison: ['Setting out after the bison herd', 'Stalking bison on the prairie'],
    bear: ['Setting out after a bear', 'Tracking a black bear'],
    turkey: ['Going to hunt turkeys', 'Calling wild turkeys at the forest edge'],
    rabbit: ['Going to set snares', 'Setting snares for rabbits'],
    duck: ['Going to hunt waterfowl', 'Hunting ducks among the reeds'],
    goose: ['Going to hunt geese', 'Hunting geese on the river'],
  };
  const HUNT_P = { deer: 0.072, elk: 0.03, bison: 0.038, bear: 0.022, turkey: 0.12, rabbit: 0.22, duck: 0.18, goose: 0.13 };
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
      this.ball = null;
      this.warned = {};
      this.racks = { village: [], camp: [] };
      this.hideFrames = { village: [], camp: [] };
      this.c = this.calendar();
      this.seed = opts.seed;
      this.init();
    }

    blankDay() {
      return { food: 0, foodEaten: 0, wood: 0, woodBurned: 0, hides: 0, deer: 0, bison: 0, fish: 0, harvest: 0, maize: 0, meat: 0, wild: 0, kills: {}, pelts: 0 };
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
        pelts: 0,
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
      // the living land, the culture of the people and the newcomers
      this.nature = new TM.Nature(this, this.seed);
      this.culture = new TM.Culture(this, this.seed);
      this.colony = new TM.Colony(this, this.seed);
      this.rollWeather();
      this.councilDay = this.c.dom === 1;
      this.lastDawn = this.hour >= 6 ? this.day : -1;
      this.emit(`The ${this.nationName()} begin a new chapter in the ${TM.MOONS[s][this.c.moon]} of ${TM.SEASONS[s].toLowerCase()}.`, 'season');
      this.emit(MOON_TEXT[s][this.c.moon], 'info');
      for (const p of this.people) if (p.role !== 'infant') this.decide(p);
    }

    nationName() { return this.settings.nationName || 'People'; }

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
      this.eat((this.needPerDay() * dH * (this.day < this.culture.flags.ration ? 0.85 : 1)) / 24);
      const burn = (this.woodBurnPerDay() * dH) / 24;
      const burned = Math.min(this.stores.wood, burn);
      this.stores.wood -= burned;
      this.today.woodBurned += burned;
      if (this.hour >= 24) {
        this.hour -= 24;
        this.endDay();
      }
      if (prevHour < 6 && this.hour >= 6 && this.lastDawn !== this.day) { this.lastDawn = this.day; this.dawn(); }
      if (this.councilDay && prevHour < 9 && this.hour >= 9) {
        this.callCouncil(false);
      }
      // urgent matters are brought to the council at once
      if (Math.floor(prevHour) !== Math.floor(this.hour) && !this.culture.debate) this.callCouncil(true);
      for (let k = 0; k < this.people.length; k++) this.updatePerson(this.people[k], dt, dH);
      for (const d of this.dogs) this.updateDog(d, dt);
      this.nature.update(dt, dH);
      this.colony.update(dt, dH);
      this.updateBall(dt);
    }

    // the council takes up a matter: the interface opens a debate, or it decides by itself
    callCouncil(urgentOnly) {
      const cul = this.culture;
      if (cul.debate || cul.ended) return;
      const is = cul.pickIssue();
      if (!is || (urgentOnly && is.priority < 9)) return;
      if (this.onIssue) this.onIssue(is);
      else { cul.openDebate(is); cul.resolveDebate(); }
    }

    endDay() {
      const t = this.today;
      const bits = [];
      for (const [k, one, many] of [['deer', 'deer', 'deer'], ['elk', 'elk', 'elk'], ['bison', 'bison', 'bison'], ['bear', 'bear', 'bears'], ['turkey', 'turkey', 'turkeys'], ['goose', 'goose', 'geese'], ['duck', 'duck', 'ducks'], ['rabbit', 'rabbit', 'rabbits']]) {
        if (t.kills && t.kills[k]) bits.push(`${t.kills[k]} ${t.kills[k] === 1 ? one : many}`);
      }
      if (bits.length) this.emit(`Hunters brought in ${bits.length > 1 ? bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1] : bits[0]}.`, 'hunt');
      if (t.pelts >= 1) this.emit(`Trappers took ${Math.round(t.pelts)} beaver and fox pelts.`, 'hunt');
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
      this.nature.daily();
      this.colony.daily();
      this.culture.daily();
      this.culture.onNewDay();
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
        let d = hungry ? -6 : lean ? -1.5 : 3;
        if (cold) d -= 7;
        if (this.day < this.culture.flags.ration) d -= 1;
        if (p.sick > 0) { d -= p.severe ? 8 : 3; p.sick = Math.max(0, p.sick - 1); if (p.sick === 0) { p.recovered = true; p.severe = false; } }
        if ((p.age > 65 || p.age < 3) && d < 0) d *= 1.4;
        p.health = U.clamp(p.health + d, 0, 100);
        // illness
        if (!p.sick) {
          const base = 0.0035 * diff.illness * ILL_SEASON[s] * (p.health < 50 ? 2 : 1) * (p.age < 3 || p.age > 65 ? 1.6 : 1) * this.culture.illnessMul();
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
        if (p.severe) risk += (p.age < 3 || p.age > 60 ? 0.03 : 0.007) * diff.illness;
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

    die(p, cause) {
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
      this.emit(cause ? `${who} ${cause}, at ${p.age} years.` : `${who} has passed on, at ${p.age === 0 ? 'less than a year' : p.age + (p.age === 1 ? ' year' : ' years')}.`, 'death');
      p.dead = true;
      if (p.title && this.culture) this.culture.onDeath(p);
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
      if (this.colony.alarm && p.band === 'village') return this.planAlarm(p);
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
      const G = this.culture.gathering;
      if (G && h >= G.start - 0.6 && h < G.end && p.role !== 'infant') return this.planGathering(p, G);
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

    // soldiers are coming: the young men defend, everyone else takes refuge by the river
    planAlarm(p) {
      const W = this.W, rng = this.rng, plan = p.plan, m = this.colony.militia;
      const warrior = p.sex === 'M' && p.age >= 17 && p.age <= 48 && p.health > 55 && !p.sick;
      if (warrior && m) {
        p.planKind = 'defend';
        const t = m.target;
        const ang = Math.atan2(t.y - W.PCY, t.x - W.PCX);
        const s = this.snapWalk(W.PCX + Math.cos(ang) * W.palR * 0.55 + rng.range(-2.5, 2.5), W.PCY + Math.sin(ang) * W.palR * 0.55 + rng.range(-2.5, 2.5));
        const gun = this.culture.flags.guns > (p.look.adopt || 0.5);
        if (s) plan.push({ k: 'go', x: s.x, y: s.y, run: true, label: 'Running to defend the village', tool: gun ? 'musket' : 'bow' });
        plan.push({ k: 'work', act: 'defend', anim: 'aim', dur: 0.8, label: 'Defending the village', face: { x: t.x, y: t.y } });
        return;
      }
      p.planKind = 'flee';
      const L = W.landing;
      const s = this.snapWalk(L.x + rng.range(-3, 3), L.y + rng.range(-6, 6)) || this.snapWalk(W.PCX - 8, W.PCY);
      if (s) plan.push({ k: 'go', x: s.x, y: s.y, run: true, label: 'Fleeing from the soldiers' });
      plan.push({ k: 'work', act: 'hide', anim: 'sit', dur: 0.8, label: 'Sheltering by the river until the soldiers are gone' });
    }

    // a gathering of the whole nation on the village plaza
    planGathering(p, G) {
      const W = this.W, rng = this.rng, plan = p.plan;
      p.planKind = 'gathering';
      const dur = Math.max(0.3, G.end - this.hour);
      const name = G.g.name;
      if (G.kind === 'ball') {
        const f = this.ballField();
        const player = (p.role === 'youth' || (p.role === 'adult' && p.age < 34)) && rng.chance(0.65);
        if (player) {
          const s = this.ringSpot(f.x, f.y, 0.5, f.r) || f;
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to the ball game', tool: 'stick' });
          plan.push({ k: 'work', act: 'ball', anim: 'run', dur, label: 'Playing in the great ball game', tool: 'stick', team: p.id % 2 });
        } else {
          const s = this.ringSpot(f.x, f.y, f.r + 1.2, f.r + 2.8) || f;
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to watch the ball game' });
          plan.push({ k: 'work', act: 'watch', anim: p.role === 'child' ? 'play' : 'guard', dur, label: 'Cheering at the ball game', face: f });
        }
        return;
      }
      const fx = W.PCX, fy = W.PCY;
      if (G.kind === 'dance' && (p.role === 'adult' || p.role === 'youth' || (p.role === 'child' && rng.chance(0.5)))) {
        const r = 2.2 + rng.next() * 1.3, a = rng.range(0, Math.PI * 2);
        plan.push({ k: 'go', x: fx + Math.cos(a) * r, y: fy + Math.sin(a) * r, label: `Going to the ${name}` });
        plan.push({ k: 'work', act: 'dance', anim: 'dance', dur, r, ang: a, label: `Dancing at the ${name}` });
        return;
      }
      const s = this.ringSpot(fx, fy, G.kind === 'dance' ? 3.8 : 1.4, G.kind === 'dance' ? 4.8 : 3.6);
      const tell = p.role === 'elder' && (G.kind === 'stories' ? rng.chance(0.5) : rng.chance(0.3));
      if (s) plan.push({ k: 'go', x: s.x, y: s.y, label: `Going to the ${name}` });
      plan.push({ k: 'work', act: tell ? 'story' : 'listen', anim: tell ? 'tell' : 'sit', dur, face: { x: fx, y: fy }, label: tell ? (G.kind === 'stories' ? 'Telling the old stories' : 'Singing and keeping the drum beat') : G.kind === 'stories' ? 'Listening to the midwinter stories' : 'Watching the dancers' });
    }
    ballField() {
      if (!this._field) {
        const W = this.W;
        const s = this.snapWalk(W.PCX - 7, W.PCY + 2) || { x: W.PCX - 5, y: W.PCY };
        this._field = { x: s.x, y: s.y, r: 3.2 };
      }
      return this._field;
    }
    updateBall(dt) {
      const G = this.culture.gathering;
      const on = G && G.kind === 'ball' && this.hour >= G.start && this.hour < G.end;
      if (!on) { this.ball = null; return; }
      const f = this.ballField();
      if (!this.ball) this.ball = { x: f.x, y: f.y, tx: f.x, ty: f.y, t: 0, z: 0 };
      const b = this.ball, rng = this.rng;
      b.t -= dt;
      if (b.t <= 0) {
        b.t = rng.range(0.6, 1.8);
        const a = rng.range(0, Math.PI * 2), r = rng.range(0, f.r);
        b.tx = f.x + Math.cos(a) * r; b.ty = f.y + Math.sin(a) * r;
        b.flight = 0;
      }
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
      if (d > 0.02) { const st = Math.min(d, dt * 4); b.x += (dx / d) * st; b.y += (dy / d) * st; }
      b.flight = (b.flight || 0) + dt;
      b.z = d > 0.1 ? Math.sin(Math.min(1, b.flight * 1.4) * Math.PI) * 14 : 0;
    }

    pickActivity(p) {
      const rng = this.rng, c = this.c, s = c.season;
      const occ = TM.OCCUPATIONS[p.occupation] || {};
      const prim = occ.act;
      const winter = s === 3;
      const farmOk = this.farmOpen();
      const guardOk = (s === 1 && c.moon >= 1) || (s === 2 && c.moon === 0 && this.harvestLeft() > 0);
      const woodDays = this.stores.wood / Math.max(1, this.woodBurnPerDay());
      const woodLow = woodDays < 4 ? 2.2 : woodDays > 25 ? 0.25 : woodDays > 12 ? 0.6 : 1;
      const harvest = this.harvestNow() && this.harvestLeft() > 0.5;
      const W = [];
      const cul = this.culture, col = this.colony, L = cul.lean;
      const h = this.hour;
      if (p.role === 'child') {
        if (cul.flags.school && col.founded && h >= 8 && h < 12 && p.age >= 6 && p.band === 'village' && rng.chance(0.75)) return 'school';
        if (p.age < 7) return rng.weighted([['play', 0.7], ['follow', 0.3], ['listen', 0.08 * (1 - 0.5 * L.ways.v)]]);
        W.push(['play', 0.45], ['water', 0.12], ['gather', winter ? 0 : 0.12 * GATHER_SEASON[s]], ['guard', guardOk ? 0.3 : 0], ['wood', 0.08 * woodLow], ['farm', harvest ? 0.15 : 0], ['listen', 0.14 * (1 - 0.6 * L.ways.v)]);
        return rng.weighted(W);
      }
      if (p.role === 'elder') {
        W.push(['craft', 0.4], ['rest', 0.25], ['guard', guardOk ? 0.25 : 0], ['gather', 0.1 * GATHER_SEASON[s]], ['wood', 0.04 * woodLow]);
        if (p.occupation === 'Fisher') W.push(['fish', 0.4 * FISH_SEASON[s]]);
        if (p.occupation === 'Healer') W.push(['heal', this.sickCount() > 0 ? 1.4 : 0], ['gather', 0.25]);
        if (p.occupation === 'Storyteller') W.push(['story', 0.3]);
        W.push(['story', 0.12 * (1 - 0.6 * L.ways.v)], ['craft', 0.1 * Math.max(0, -L.ways.v)]);
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
      // the people's leanings and the times shape what they choose to do
      if (L.ways.v < 0) W.push(['craft', 0.07 * -L.ways.v]);
      if (L.hunt.v > 0.3) {
        if (!F) W.push(['trap', 0.32 * L.hunt.v * (prim === 'hunt' ? 1.4 : 1)], ['hunt', 0.12 * L.hunt.v]);
        else W.push(['hides', 0.1 * L.hunt.v]);
      }
      if (L.defense.v > 0.3 && !F && p.age <= 36) W.push(['train', 0.15 * L.defense.v]);
      if (cul.flags.palisadeOrdered && cul.flags.palisade < 1 && p.band === 'village') W.push(['palisade', F ? 0.04 : prim === 'build' ? 0.9 : 0.2]);
      if (this.W.buildings.some((b) => b.band === p.band && b.state === 'ruin' && (b.type === 'wigwam' || b.type === 'longhouse' || b.type === 'tipi'))) W.push(['build', prim === 'build' ? 1 : F ? 0.05 : 0.15]);
      if (col.trading && col.tradeLevel > 0 && p.band === 'village') W.push(['trade', 0.12 * col.tradeLevel * (1 + 0.5 * L.ways.v)]);
      if (this.day < cul.flags.huntPush && !F) W.push(['hunt', 0.45]);
      const fdays = this.foodTotal() / Math.max(1, this.needPerDay());
      if (fdays < 8) {
        const urge = fdays < 3 ? 2.2 : 1.5;
        for (const w of W) {
          if (w[0] === 'hunt' || w[0] === 'fish' || w[0] === 'gather' || w[0] === 'farm' || w[0] === 'trap') w[1] *= urge;
          else if (w[0] === 'craft' || w[0] === 'wood' || w[0] === 'build' || w[0] === 'train' || w[0] === 'trade' || w[0] === 'hides') w[1] *= 0.5;
        }
        W.push(['fish', 0.15 * FISH_SEASON[s]], ['gather', 0.15 * GATHER_SEASON[s]]);
      }
      return rng.weighted(W);
    }

    gatherLabel(p, spot) {
      const { season: s, moon: m } = this.c;
      const W = this.W;
      const nearMarsh = spot && Math.hypot(spot.x - W.MX, spot.y - W.MY) < 9;
      if (p.band === 'camp' && s <= 1) return 'Digging prairie turnips';
      if (s === 0) return m === 0 ? 'Collecting maple sap' : nearMarsh ? 'Gathering cattail shoots' : m === 1 ? 'Gathering morels and fiddleheads' : 'Gathering spring greens';
      if (s === 1) return m === 0 ? 'Picking wild strawberries' : m === 1 ? 'Picking raspberries' : 'Picking chokecherries and plums';
      if (s === 2) return nearMarsh && m === 0 ? 'Harvesting wild rice' : 'Gathering hickory nuts, walnuts and acorns';
      return 'Searching for rose hips and winter food';
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
          const nat = this.nature;
          let kind = nat.pickHunt(band);
          let g = nat.findGroup(kind);
          if (!g) { kind = band === 'camp' ? 'bison' : 'deer'; g = nat.findGroup(kind); }
          let t = g ? this.snapWalk(g.cx + rng.range(-3, 3), g.cy + rng.range(-3, 3)) : null;
          if (!t && sp.deer.length) { t = this.tileSpot(rng.pick(sp.deer)); kind = 'deer'; }
          if (!t) return;
          const racks = this.racks[band].length ? this.racks[band] : this.racks.village;
          const rack = racks.length ? racks[rng.int(0, racks.length - 1)] : home;
          const tool = this.culture.flags.guns > (p.look.adopt || 0.5) ? 'musket' : 'bow';
          const lab = HUNT_LABEL[kind] || HUNT_LABEL.deer;
          plan.push({ k: 'go', x: t.x, y: t.y, label: lab[0], tool });
          plan.push({ k: 'work', act: 'hunt', kind, anim: 'stalk', dur: this.workDur(p, t, 2.5, 4.5, true), label: lab[1], tool });
          if (rack && rack.door) plan.push({ k: 'go', ...this.doorSpot(rack, p), label: 'Returning from the hunt', tool }, { k: 'deposit' });
          break;
        }
        case 'trap': {
          const nat = this.nature;
          const bg = nat.findGroup('beaver');
          let t = null, label = 'Setting traps for beaver';
          if (bg && rng.chance(0.75)) t = this.snapWalk(bg.cx + rng.range(-1.5, 1.5), bg.cy + rng.range(-2, 2));
          if (!t) { const f = nat.findGroup('fox'); if (f) { t = this.snapWalk(f.cx, f.cy); label = 'Trapping fox along the woods'; } }
          if (!t) return;
          plan.push({ k: 'go', x: t.x, y: t.y, label: 'Going to check the traps', tool: 'basket' });
          plan.push({ k: 'work', act: 'trap', kind: label.includes('fox') ? 'fox' : 'beaver', anim: 'gather', dur: this.workDur(p, t, 1.5, 3, true), label });
          if (home && home.door) plan.push({ k: 'go', ...this.doorSpot(home, p), label: 'Carrying pelts home' }, { k: 'deposit' });
          break;
        }
        case 'train': {
          const s = this.ringSpot(W.PCX, W.PCY, 4.6, 6.2);
          if (!s) return;
          const gun = this.culture.flags.guns > (p.look.adopt || 0.5);
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to practice', tool: gun ? 'musket' : 'bow' });
          plan.push({ k: 'work', act: 'train', anim: 'aim', dur: this.workDur(p, s, 1, 2), label: gun ? 'Drilling with the musket' : 'Practicing with the bow', face: { x: W.PCX + 9, y: W.PCY - 3 } });
          break;
        }
        case 'palisade': {
          const segs = W.palisade;
          if (!segs.length) return;
          const k = Math.min(segs.length - 1, Math.floor(this.culture.flags.palisade * segs.length) + rng.int(0, 5));
          const sg = segs[k];
          const s = this.snapWalk(sg.x - Math.cos(sg.a) * 1.2, sg.y - Math.sin(sg.a) * 1.2);
          if (!s) return;
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Carrying posts for the palisade', tool: 'axe' });
          plan.push({ k: 'work', act: 'palisade', anim: 'chop', dur: this.workDur(p, s, 1.2, 2.5), label: 'Setting palisade posts', face: { x: sg.x, y: sg.y } });
          break;
        }
        case 'trade': {
          const s = this.ringSpot(W.PCX + 3, W.PCY + 1, 0.8, 2.6);
          if (!s) return;
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to see the traders' });
          plan.push({ k: 'work', act: 'trade', anim: 'talk', dur: rng.range(0.4, 0.9), label: rng.pick(['Trading hides for an iron kettle', 'Looking over the traders’ cloth and beads', 'Bargaining for a steel knife']), face: { x: W.PCX + 3, y: W.PCY + 1 } });
          break;
        }
        case 'school': {
          const s = this.ringSpot(W.PCX + 2.5, W.PCY - 3, 0.6, 1.8);
          if (!s) return;
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to the colony teacher’s lessons' });
          plan.push({ k: 'work', act: 'school', anim: 'sit', dur: Math.max(0.5, 12 - this.hour), label: 'Learning letters in the newcomers’ tongue', face: { x: W.PCX + 3, y: W.PCY - 3.5 } });
          break;
        }
        case 'listen': {
          const fx = band === 'camp' ? W.CCX : W.PCX, fy = band === 'camp' ? W.CCY : W.PCY;
          const s = this.ringSpot(fx, fy, 1.4, 2.4);
          if (!s) return;
          plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to hear the elders' });
          plan.push({ k: 'work', act: 'listen', anim: 'sit', dur: rng.range(0.6, 1.4), label: rng.pick(['Learning the old stories from the elders', 'Learning the names of plants and animals', 'Learning the words of our language']), face: { x: fx, y: fy } });
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
          plan.push({ k: 'work', act: 'gather', anim: 'gather', dur: this.workDur(p, s, 1.2, 2.8), label: this.gatherLabel(p, s), tool: 'basket' });
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
          const ruins = W.buildings.filter((b) => b.band === band && b.state === 'ruin' && b.door);
          if (ruins.length) {
            const b = rng.pick(ruins);
            const s = this.ringSpot(b.door.x + 0.5, b.door.y + 0.5, 0.2, 1) || this.doorSpot(b, p);
            plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to rebuild a burned lodge', tool: 'axe' });
            plan.push({ k: 'work', act: 'rebuild', target: b.id, anim: 'chop', dur: this.workDur(p, s, 1.5, 3), label: 'Rebuilding a burned lodge', tool: 'axe', face: { x: b.cx, y: b.cy } });
            break;
          }
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
      if (p.planKind !== 'sleep' && p.planKind !== 'rest' && p.planKind !== 'war' && p.planKind !== 'gathering' && p.planKind !== 'flee' && this.isNight(p, this.hour)) this.decide(p);
      if (this.colony.alarm && p.band === 'village' && p.planKind !== 'flee' && p.planKind !== 'war' && p.planKind !== 'defend') { p.plan.length = 0; p.step = null; }
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
          if (st.act === 'craft') { this.stores.goods += 0.2 * (p.skills.craft || 0.5) * dH; this.culture.craftHours += dH; }
          break;
        case 'deposit':
          this.deposit(p);
          p.step = null;
          break;
        case 'call':
          st.fn();
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
        if (st.onStart) st.onStart();
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
      const carry = () => (p.carry = p.carry && p.carry.kind !== 'water' && p.carry.kind !== 'maize' ? p.carry : { kind: null, meat: 0, fish: 0, wild: 0, wood: 0, hides: 0, pelts: 0 });
      const cul = this.culture;
      const mul = cul.workMul(st.act);
      switch (st.act) {
        case 'farm': {
          if (this.harvestNow()) {
            const left = this.harvestLeft();
            if (left > 0) {
              const a = Math.min(left, HARVEST_RATE * sk.farm * roleMul * dH * prod * mul);
              this.crop.harvested += a;
              this.addFood('maize', a);
              this.today.harvest += a;
            }
          } else if (s <= 1) {
            this.crop.condition = Math.min(1, this.crop.condition + (COND_RATE * sk.farm * roleMul * dH * prod * mul) / Math.max(1, this.W.fields.length));
          }
          break;
        }
        case 'hunt': {
          const c = carry();
          const S = TM.SPECIES[st.kind] || TM.SPECIES.deer;
          const pHr = (HUNT_P[st.kind] || 0.06) * HUNT_SEASON[s] * sk.hunt * prod * cul.huntMul() * this.nature.yieldMul(st.kind);
          if (rng.next() < pHr * dH) {
            const meat = rng.range(S.meat[0], S.meat[1]);
            c.meat += meat;
            c.hides += S.hide || 0;
            if (cul.lean.hunt.v > 0.5 && st.kind === 'deer') c.hides += 1;
            c.kind = 'meat';
            c.game = st.kind;
            this.nature.kill(st.kind, cul.lean.hunt.v > 0.5 && st.kind === 'deer' ? 1.6 : 1);
            this.today.kills[st.kind] = (this.today.kills[st.kind] || 0) + 1;
            if (st.kind === 'bison') this.today.bison++; else this.today.deer++;
            p.actLabel = { bison: 'Butchering a bison', elk: 'Butchering an elk', bear: 'Skinning a bear', turkey: 'Carrying a turkey', rabbit: 'Checking the snares', duck: 'Gathering the ducks', goose: 'Gathering the geese' }[st.kind] || 'Dressing a deer';
            if (c.meat >= CARRY.meat * 0.6 || S.meat[1] > 18) st.t = Math.min(st.t, 0.35);
          }
          this.wander(p, st, dt, 2.2, 0.35);
          break;
        }
        case 'fish': {
          const c = carry();
          c.fish += 0.72 * FISH_SEASON[s] * sk.fish * roleMul * dH * prod * rng.range(0.6, 1.4) * mul * this.nature.yieldMul('fish');
          this.nature.pop.fish = Math.max(0.05, this.nature.pop.fish - 0.00002 * dH);
          if (c.fish >= CARRY.fish) { c.fish = CARRY.fish; st.t = 0; }
          c.kind = 'fish';
          break;
        }
        case 'gather': {
          const c = carry();
          c.wild += 0.68 * GATHER_SEASON[s] * sk.gather * roleMul * dH * prod * mul;
          if (c.wild >= CARRY.wild) { c.wild = CARRY.wild; st.t = 0; }
          c.kind = 'wild';
          this.wander(p, st, dt, 1.2, 0.3);
          break;
        }
        case 'wood': {
          const c = carry();
          c.wood += 2.4 * roleMul * dH * mul;
          if (c.wood >= CARRY.wood) { c.wood = CARRY.wood; st.t = 0; }
          c.kind = 'wood';
          break;
        }
        case 'hides': {
          if (this.stores.rawHides > 0) {
            const a = Math.min(this.stores.rawHides, 0.12 * sk.hides * roleMul * dH * mul);
            cul.craftHours += dH;
            this.stores.rawHides -= a;
            this.stores.hides += a;
            this.today.hides += a;
          }
          break;
        }
        case 'craft':
          this.stores.goods += 0.25 * sk.craft * dH * mul;
          cul.craftHours += dH;
          break;
        case 'trap': {
          const c = carry();
          const pHr = 0.16 * sk.hunt * this.nature.yieldMul(st.kind) * (s === 3 ? 1.2 : 1);
          if (rng.next() < pHr * dH) {
            c.pelts = (c.pelts || 0) + 1;
            c.meat += st.kind === 'beaver' ? rng.range(2, 4) : 0;
            c.kind = 'wild';
            this.nature.kill(st.kind, 1);
            p.actLabel = st.kind === 'beaver' ? 'Taking a beaver from the trap' : 'Skinning a fox';
          }
          break;
        }
        case 'story':
          cul.storyHours += dH;
          break;
        case 'listen':
          cul.storyHours += dH * 0.4;
          break;
        case 'build':
          cul.craftHours += dH * 0.5;
          break;
        case 'palisade':
          cul.flags.palisade = Math.min(1, cul.flags.palisade + (dH * mul) / 260);
          if (cul.flags.palisade >= 1 && !cul.flags.palisadeDone) { cul.flags.palisadeDone = true; this.emit('The palisade around the village is finished.', 'info'); }
          break;
        case 'rebuild': {
          const b = this.W.buildings[st.target];
          if (b && b.state === 'ruin') {
            b.repair = (b.repair || 0) + dH * mul;
            if (b.repair >= 9) { b.state = 'built'; b.repair = 0; this.emit(`A burned ${TM.BUILD_INFO[b.type].name.toLowerCase()} has been rebuilt.`, 'info'); }
          }
          cul.craftHours += dH * 0.5;
          break;
        }
        case 'dance': {
          st.ang += dt * 0.22 * (p.id % 2 ? 1 : 1);
          const W = this.W;
          const tx = W.PCX + Math.cos(st.ang) * st.r, ty = W.PCY + Math.sin(st.ang) * st.r;
          const ddx = tx - p.x, ddy = ty - p.y;
          p.x = tx; p.y = ty;
          const sdx = ddx - ddy;
          if (Math.abs(sdx) > 0.0005) p.dir = sdx > 0 ? 1 : -1;
          p.wp += Math.hypot(ddx, ddy) * 5.5;
          break;
        }
        case 'ball': {
          const b = this.ball;
          if (!b) break;
          const off = st.team ? 0.8 : -0.8;
          const tx = b.x + p.jx * 5 + off * 0.5, ty = b.y + p.jy * 5 - off * 0.5;
          if (Math.hypot(tx - p.x, ty - p.y) > 0.25) { this.moveDirect(p, tx, ty, dt, 1.7); p.anim = 'run'; }
          else p.anim = 'stand';
          break;
        }
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
      if (c.pelts) { this.stores.pelts += c.pelts; this.today.pelts += c.pelts; }
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

  }

  TM.Sim = Sim;
})();
