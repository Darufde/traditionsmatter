/* Traditions Matter — the newcomers. Word of them comes in the second
   year, traders the same summer, and in the third spring a colony is founded
   in the eastern woods. It grows, clears land, trades, sends teachers and
   soldiers, and carries sickness. Conflict is shown, never in gory detail. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U, RNG, T } = TM;
  const LAND_REF = 1500; // tiles of land whose loss would leave the nation without its woods

  const FIRST = ['Thomas', 'John', 'William', 'Mary', 'Anne', 'Elizabeth', 'Samuel', 'Hannah', 'Josiah', 'Abigail', 'Nathaniel', 'Sarah', 'Edward', 'Margaret', 'Robert', 'Martha', 'Henry', 'Ruth', 'Jacob', 'Esther'];
  const FEM = new Set(['Mary', 'Anne', 'Elizabeth', 'Hannah', 'Abigail', 'Sarah', 'Margaret', 'Martha', 'Ruth', 'Esther']);
  const LAST = ['Ashby', 'Cole', 'Hollins', 'Pryor', 'Webb', 'Turner', 'Marsh', 'Fletcher', 'Hale', 'Gage', 'Barlow', 'Nash', 'Reed', 'Sutton', 'Ward', 'Pike', 'Thorne', 'Ellery'];
  const TOWN = ['Ashby', 'Wexham', 'Aldbury', 'Harrow', 'Marlow', 'Thornbury', 'Elmsford', 'Brayford', 'Whitcombe', 'Carlow', 'Penhallow'];

  TM.BUILD_INFO.fort = { name: 'Fort', desc: 'A square stockade of upright logs with a blockhouse at the corner. Inside are the storehouse, the powder magazine and the colony’s leaders.' };
  TM.BUILD_INFO.cabin = { name: 'Log house', desc: 'A settler family’s house of notched logs with a chimney of sticks and clay.' };
  TM.BUILD_INFO.tradepost = { name: 'Trading post', desc: 'Here the newcomers trade kettles, knives, cloth, blankets, beads, guns and powder for furs and hides.' };
  TM.BUILD_INFO.meeting = { name: 'Meeting house', desc: 'Where the settlers gather to worship and to hold their own councils.' };

  class Colony {
    constructor(sim, seed) {
      this.sim = sim;
      this.W = sim.W;
      this.rng = new RNG((seed ^ 0xc010) >>> 0);
      const W = this.W, N = W.N;
      this.name = (this.rng.chance(0.5) ? 'New ' : this.rng.chance(0.5) ? 'Fort ' : 'Port ') + this.rng.pick(TOWN);
      this.stage = 'none';
      this.founded = false;
      this.pop = 0;
      this.relations = 20;
      this.fear = 0;
      this.tradeLevel = 1;
      this.visits = 0;
      this.firstVisitDone = false;
      this.lastTrade = -999;
      this.nextVisit = 1e9;
      this.contact = 0;
      this.closedUntil = -1;
      this.claimed = 0;
      this.claimIdx = 0;
      this.claimedList = [];
      this.boundary = Infinity;
      this.blockedDays = 0;
      this.crossed = false;
      this.sold = 0;
      this.war = false;
      this.warSince = 0;
      this.recentLoss = 0;
      this.pressure = 0;
      this.agents = [];
      this.livestock = [];
      this.buildings = [];
      this.parties = [];
      this.militia = null;
      this.alarm = false;
      this.lastMilitia = -99;
      this.epidemicActive = false;
      this.epidemicUntil = -1;
      this.lastEpidemic = -999;
      this.attackedUs = false;
      this.warPartyActive = false;
      this.dirty = [];
      this.added = [];
      this.foundedDay = 0;
      this.lastBuild = 0;
      W.claimed = new Uint8Array(N * N);
      W.forestTotal = W.hab.forest.length + W.hab.edge.length;
      W.forestClaimed = 0;
      this.used = new Set();
    }

    get trading() { return this.agents.some((a) => a.kind === 'trader' && a.atPlaza); }
    closed() { return this.sim.day < this.closedUntil; }
    tradeAccess() {
      if (this.stage === 'none' || this.stage === 'rumors') return 0;
      const since = this.sim.day - this.lastTrade;
      return U.clamp(1 - (since - 20) / 40, 0, 1);
    }
    landShare() { return U.clamp(1 - this.claimed / LAND_REF, 0, 1); }
    setBoundary(n) { this.boundary = Math.max(this.claimed, n); this.crossed = false; this.blockedDays = 0; }
    sellLand(n) { this.sold += n; if (this.boundary !== Infinity) this.boundary += n; }

    // ---------------------------------------------------------------- each day
    daily() {
      const sim = this.sim, c = sim.c, cul = sim.culture, rng = this.rng;
      if (this.stage === 'none' && c.year >= 2) {
        this.stage = 'rumors';
        sim.emit('Word travels from the east of pale strangers who came across the great water.', 'colony');
      }
      if (this.stage === 'rumors' && c.year >= 2 && c.season >= 1) {
        this.stage = 'traders';
        this.nextVisit = sim.day + 1;
      }
      if (this.stage === 'traders' && c.year >= 3) this.found();
      if (this.stage === 'abandoned') return;
      this.contact *= 0.96;
      this.fear = Math.max(0, this.fear - 0.012);
      // ships keep bringing settlers and soldiers to a struggling colony
      if (this.founded && this.stage !== 'abandoned' && this.pop < 50) this.pop += 1.5;
      this.recentLoss = Math.max(0, this.recentLoss - 0.01);
      // trade visits
      if ((this.stage === 'traders' || this.founded) && sim.day >= this.nextVisit) {
        const can = (this.tradeLevel > 0 || !this.firstVisitDone) && !this.closed() && !this.war && this.relations > -25;
        if (can) this.tradeParty();
        let gap = this.tradeLevel === 2 ? rng.range(6, 8) : rng.range(10, 14);
        gap *= cul.lean.newcomers.v < -0.5 ? 1.8 : cul.lean.newcomers.v > 0.5 ? 0.75 : 1;
        this.nextVisit = sim.day + Math.round(gap);
      }
      // epidemics follow contact
      if (this.epidemicActive && sim.day > this.epidemicUntil) { this.epidemicActive = false; sim.emit('The sickness has passed. The people mourn those it took.', 'health'); }
      if (!this.epidemicActive && sim.day - this.lastEpidemic > 70 && this.stage !== 'none' && this.stage !== 'rumors') {
        const risk = (0.0022 * this.contact * (1 + 0.3 * cul.lean.newcomers.v) + (this.founded ? 0.0006 : 0)) * (this.closed() ? 0.1 : 1);
        if (rng.next() < risk) this.startEpidemic();
      }
      if (this.epidemicActive) {
        for (const p of sim.people) if (!p.sick && rng.next() < (this.closed() ? 0.015 : 0.04)) { p.sick = rng.int(3, 6); p.severe = true; }
        sim.invalidate();
      }
      if (cul.flags.school) this.contact += 0.015;
      if (!this.founded) return;
      // growth
      const g = 0.34 + (this.relations > 20 ? 0.08 : 0) - this.fear * 0.6 - (this.war ? 0.12 : 0);
      this.pop = Math.max(5, this.pop * (1 + g / TM.C.DAYS_PER_YEAR));
      // relations drift with our leanings and their hunger for land
      this.relations += 0.1 * cul.lean.newcomers.v - 0.1 * cul.lean.defense.v + (this.tradeAccess() > 0.5 ? 0.06 : -0.03) - this.pressure * 0.15;
      this.relations = U.clamp(this.relations, -100, 100);
      if (!this.war && this.relations < -55) this.startWar();
      const warDays = this.war ? sim.day - this.warSince : 0;
      const beaten = (this.fear > 0.9 && this.pop < 48) || (warDays > 150 && this.pop < 70 && this.fear > 0.45);
      if (beaten && this.war && sim.day - this.foundedDay > 60 && rng.next() < 0.04) { this.abandon(); return; }
      this.growLand();
      this.growBuildings();
      this.syncAgents();
      // the colony strikes when at war
      if (this.war && !this.militia && sim.day - this.lastMilitia > 9 && rng.next() < (0.04 + 0.04 * (this.pop / 60)) * (1 - this.fear)) this.militiaRaid();
      if (this.retaliateOn && sim.day >= this.retaliateOn && !this.militia) { this.retaliateOn = null; this.militiaRaid(); }
    }

    found() {
      const sim = this.sim, W = this.W, P = W.plan;
      this.stage = 'founded';
      this.founded = true;
      this.foundedDay = sim.day;
      this.pop = 42;
      this.build(P.fort, true);
      for (let k = 0; k < 4; k++) this.build(P.cabins[k], true);
      for (let k = 0; k < 40; k++) this.claimNext();
      this.syncAgents();
      this.lastTrade = Math.max(this.lastTrade, sim.day - 5);
      sim.emit(`The newcomers have built a fort in the eastern woods and call it ${this.name}.`, 'colony');
    }

    // ---------------------------------------------------------------- land
    clearTile(i) {
      const W = this.W;
      const trees = W.treesAt.get(i);
      if (trees) for (const t of trees) t.dead = true;
      const props = W.propsAt.get(i);
      if (props) for (const p of props) if (p.kind !== 'beaverlodge') p.dead = true;
      if (W.treeTile[i]) { W.treeTile[i] = 0; if (W.wf[i] > 0.2) W.forestClaimed++; }
      W.path[i] = 0;
    }
    claimNext() {
      const W = this.W, order = W.plan.claimOrder;
      while (this.claimIdx < order.length) {
        const i = order[this.claimIdx++];
        if (W.occ[i] >= 0 || W.claimed[i] || W.type[i] === T.FIELD || W.type[i] === T.VILLAGE) continue;
        this.clearTile(i);
        W.claimed[i] = 1;
        W.type[i] = this.rng.chance(0.62) ? T.COLFIELD : T.PASTURE;
        W.wf[i] = 0;
        this.claimedList.push({ i, idx: this.claimIdx - 1 });
        this.claimed++;
        this.dirty.push(i);
        return true;
      }
      return false;
    }
    unclaim(n) {
      const W = this.W;
      let k = 0;
      while (k < n && this.claimedList.length) {
        const c = this.claimedList.pop();
        W.claimed[c.i] = 0;
        W.type[c.i] = T.PRAIRIE;
        this.claimIdx = Math.min(this.claimIdx, c.idx);
        this.claimed--;
        this.dirty.push(c.i);
        k++;
      }
      this.sold = Math.max(0, this.sold - n);
      W.refreshCost();
    }
    growLand() {
      const sim = this.sim, rng = this.rng, W = this.W;
      const target = 60 + this.pop * 1.3 + this.sold;
      const limit = this.boundary;
      let per = 2 + Math.floor(this.pop / 40);
      let changed = false;
      while (this.claimed < Math.min(target, limit) && per-- > 0) { if (!this.claimNext()) break; changed = true; }
      if (this.claimed >= limit && target > limit) {
        this.blockedDays++;
        if (this.blockedDays > 12 && rng.next() < 0.07 && this.relations < 45) {
          this.crossed = true;
          this.boundary = limit + 30;
          this.blockedDays = 0;
        }
      } else this.blockedDays = Math.max(0, this.blockedDays - 1);
      if (changed) W.refreshCost();
      // how close their fields come to our lodges
      let near = 0;
      const N = W.N;
      for (const c of this.claimedList) if (Math.hypot((c.i % N) - W.PCX, ((c.i / N) | 0) - W.PCY) < 26) near++;
      this.pressure = U.clamp(near / 120, 0, 1);
      void sim;
    }

    // ---------------------------------------------------------------- buildings
    build(slot, done) {
      if (!slot || this.used.has(slot)) return null;
      const W = this.W, N = W.N;
      for (let y = slot.y; y < slot.y + slot.h; y++) for (let x = slot.x; x < slot.x + slot.w; x++) if (W.occ[y * N + x] >= 0) return null;
      for (let y = slot.y - 1; y < slot.y + slot.h + 1; y++) for (let x = slot.x - 1; x < slot.x + slot.w + 1; x++) {
        if (x < 0 || y < 0 || x >= N || y >= N) continue;
        const i = y * N + x;
        this.clearTile(i);
        if (!W.claimed[i] && W.type[i] !== T.WATER) { W.type[i] = T.CLEARED; W.wf[i] = 0; }
        this.dirty.push(i);
      }
      this.used.add(slot);
      const b = W.put({ type: slot.type, x: slot.x, y: slot.y, w: slot.w, h: slot.h, band: 'colony', variant: this.rng.int(0, 2), state: done ? 'built' : 'frame', builtOn: this.sim.day + (done ? 0 : 2) });
      W.setDoor(b, W.dirsToward(b, W.PCX, W.PCY));
      if (!b.door) W.setDoor(b, [[1, 0], [0, 1], [-1, 0], [0, -1]]);
      W.refreshCost();
      this.buildings.push(b);
      this.added.push(b);
      return b;
    }
    growBuildings() {
      const sim = this.sim, P = this.W.plan;
      for (const b of this.buildings) {
        if (b.state === 'frame' && sim.day >= b.builtOn) b.state = 'built';
        if (b.state === 'burning' && sim.day >= b.burnUntil) { b.state = 'ruin'; b.ruinUntil = sim.day + 14; }
        if (b.state === 'ruin' && sim.day >= b.ruinUntil && this.stage !== 'abandoned') b.state = 'built';
      }
      if (sim.day - this.lastBuild < 2) return;
      const cabins = this.buildings.filter((b) => b.type === 'cabin').length;
      const want = Math.min(P.cabins.length, 4 + Math.floor((this.pop - 40) / 8));
      if (this.pop >= 50 && !this.buildings.some((b) => b.type === 'tradepost')) { if (this.build(P.post)) this.lastBuild = sim.day; return; }
      if (this.pop >= 85 && !this.buildings.some((b) => b.type === 'meeting')) { if (this.build(P.meeting)) this.lastBuild = sim.day; return; }
      if (cabins < want) {
        const slot = P.cabins.find((s) => !this.used.has(s));
        if (this.build(slot)) this.lastBuild = sim.day;
        else if (slot) this.used.add(slot);
      }
    }
    homeFor(k) {
      const homes = this.buildings.filter((b) => b.type === 'cabin' && b.state === 'built');
      return homes.length ? homes[k % homes.length] : this.buildings.find((b) => b.type === 'fort');
    }

    // ---------------------------------------------------------------- people of the colony
    newAgent(kind, x, y) {
      const rng = this.rng;
      const first = rng.pick(FIRST);
      const sex = kind === 'colonist' ? (FEM.has(first) ? 'F' : 'M') : 'M';
      const name = sex === 'M' && FEM.has(first) ? rng.pick(['Thomas', 'John', 'William', 'Samuel']) : first;
      const a = {
        id: 1e6 + rng.int(0, 8999999), kind, settler: true, name: `${name} ${rng.pick(LAST)}`, sex, age: rng.int(16, 55),
        x, y, dir: 1, wp: rng.range(0, 6), anim: 'stand', animT: rng.range(0, 9), speed: rng.range(0.9, 1.1), jx: rng.range(-0.2, 0.2), jy: rng.range(-0.2, 0.2),
        inside: false, plan: [], step: null, role: 'adult',
        look: {
          h: sex === 'F' ? 0.95 : 1, skin: rng.pick(['#e8c4a8', '#dcb08e', '#f0cfb4', '#d9a78a', '#e3b998']),
          hair: rng.pick(['#5a3a22', '#3a2a1e', '#8a6038', '#b88a4a', '#2a201a', '#9a4a2a']),
          coat: kind === 'soldier' ? '#3c4a66' : rng.pick(['#5a4a3a', '#6a5a46', '#4a4a4a', '#3e4a3a', '#6a3a2a', '#4a3a2e']),
          shirt: rng.pick(['#e8e2d2', '#d8d0bc']), breeches: rng.pick(['#4a3a2a', '#3a3a3a', '#5a4a36']),
          dress: rng.pick(['#5a5a6a', '#6a4a3a', '#4a5a6a', '#7a6a52', '#5a3a3a']), hat: kind === 'soldier' ? '#1e1e24' : rng.pick(['#2a2420', '#3a3028', '#1e1c1a']),
        },
        tool: kind === 'soldier' ? 'musket' : kind === 'trader' ? 'pack' : null,
      };
      return a;
    }
    syncAgents() {
      const want = Math.min(34, Math.round(this.pop / 4));
      const fort = this.buildings.find((b) => b.type === 'fort');
      if (!fort || !fort.door) return;
      let col = this.agents.filter((a) => a.kind === 'colonist' || a.kind === 'guard');
      while (col.length < want) {
        const kind = col.filter((a) => a.kind === 'guard').length < 2 ? 'guard' : 'colonist';
        const a = this.newAgent(kind === 'guard' ? 'soldier' : 'colonist', fort.door.x + 0.5, fort.door.y + 0.5);
        a.kind = kind;
        a.home = kind === 'guard' ? fort : this.homeFor(this.agents.length);
        this.agents.push(a);
        col.push(a);
      }
      // livestock
      const wantCattle = Math.min(14, Math.round(this.pop / 12)), wantPigs = Math.min(16, Math.round(this.pop / 10)), wantHorses = Math.min(5, Math.round(this.pop / 25));
      const spawn = (sp, n) => {
        let have = this.livestock.filter((a) => a.sp === sp).length;
        while (have++ < n) this.livestock.push({ sp, x: fort.cx + this.rng.range(-6, 6), y: fort.cy + this.rng.range(4, 9), tx: 0, ty: 0, t: this.rng.range(0, 4), dir: 1, wp: 0, moving: false, size: this.rng.range(0.85, 1.1), male: false });
      };
      spawn('cattle', wantCattle);
      spawn('pig', wantPigs);
      spawn('horse', wantHorses);
    }

    // ---------------------------------------------------------------- trade
    tradeParty() {
      const sim = this.sim, W = this.W, N = W.N, rng = this.rng;
      const post = this.buildings.find((b) => b.type === 'tradepost' && b.state === 'built') || this.buildings.find((b) => b.type === 'fort');
      const sx = post && post.door ? post.door.x + 0.5 : N - 2.5, sy = post && post.door ? post.door.y + 0.5 : U.clamp(W.plan.KY, 3, N - 3);
      const n = this.founded ? 3 : 2;
      const party = { kind: 'trade', agents: [] };
      for (let k = 0; k < n; k++) {
        const a = this.newAgent('trader', sx + rng.range(-0.5, 0.5), sy + rng.range(-0.5, 0.5));
        const spot = sim.ringSpot(W.PCX + 3, W.PCY + 1, 1, 2.2) || { x: W.PCX + 3, y: W.PCY + 1 };
        a.plan = [
          { k: 'go', x: spot.x, y: spot.y, label: 'Walking to the village to trade' },
          { k: 'work', dur: 3, anim: 'talk', label: 'Trading at the plaza', atPlaza: true },
          { k: 'call', fn: () => this.finishTrade(party) },
          { k: 'go', x: sx, y: sy, label: 'Returning to the colony' },
          { k: 'leave' },
        ];
        if (k === 0 && this.founded) a.horse = { x: a.x, y: a.y, dir: 1, wp: 0, sp: 'horse', size: 1, pack: true };
        party.agents.push(a);
        this.agents.push(a);
      }
      party.done = false;
      this.parties.push(party);
      if (this.visits === 0) sim.emit(this.founded ? `Traders from ${this.name} are coming to the village.` : 'Strangers are coming through the woods toward the village, carrying packs.', 'colony');
    }
    finishTrade(party) {
      if (party.done) return;
      party.done = true;
      const sim = this.sim, cul = sim.culture;
      const firstTime = !this.firstVisitDone;
      this.firstVisitDone = true;
      if (this.tradeLevel === 0 && !firstTime) return;
      const level = Math.max(1, this.tradeLevel);
      const pelts = Math.min(sim.stores.pelts, 18 * level);
      const hides = Math.min(Math.max(0, sim.stores.hides - 10), 14 * level);
      sim.stores.pelts -= pelts;
      sim.stores.hides -= hides;
      const units = pelts * 1.6 + hides + 4;
      const gain = units * 0.0022 * (1 + 0.6 * cul.lean.ways.v);
      cul.integ.goods = U.clamp(cul.integ.goods + gain, 0, 1);
      this.relations += 2;
      this.contact += 0.25;
      this.lastTrade = sim.day;
      this.visits++;
      if (cul.flags.spirits) { cul.unity -= 0.02; for (const p of sim.people) if (p.role === 'adult' && this.rng.chance(0.08)) p.health = Math.max(5, p.health - 6); }
      const need = sim.needPerDay();
      if (sim.foodTotal() < need * 6 && this.relations > 10) {
        const flour = need * (1.5 + 1.5 * level);
        sim.addFood('maize', flour);
        cul.integ.trade = U.clamp(cul.integ.trade + 0.02, 0, 1);
        sim.emit(`The traders took ${Math.round(pelts)} pelts and ${Math.round(hides)} hides, and left sacks of flour and corn as well as kettles and cloth.`, 'trade');
      } else sim.emit(`The traders took ${Math.round(pelts)} pelts and ${Math.round(hides)} hides, leaving kettles, knives, cloth and beads.`, 'trade');
    }

    // ---------------------------------------------------------------- war and peace
    startWar() {
      if (this.war) return;
      this.war = true;
      this.warSince = this.sim.day;
      this.sim.emit(`There is war between our people and ${this.name}.`, 'warn');
    }
    makePeace() {
      this.war = false;
      this.relations = Math.max(this.relations, -20) + 20;
      this.setBoundary(this.claimed + 10);
      this.retaliateOn = null;
      this.sim.emit(`Peace is made with ${this.name}. A boundary is agreed where their farms end.`, 'colony');
    }
    seekPeace() {
      const ok = this.rng.next() < 0.35 + this.relations / 250 + this.fear * 0.6;
      if (ok) this.makePeace();
      else { this.relations += 5; this.sim.emit(`${this.name} turned away our messenger.`, 'colony'); }
    }
    abandon() {
      this.stage = 'abandoned';
      for (const b of this.buildings) b.state = 'ruin', b.ruinUntil = 1e9;
      for (const a of this.agents) { a.plan = [{ k: 'go', x: this.W.N - 2, y: a.y }, { k: 'leave' }]; a.step = null; }
      this.livestock.length = 0;
      this.sim.emit(`The settlers of ${this.name} have packed their carts and gone back to the east. Their fort stands empty.`, 'colony');
    }

    warriors(band) {
      return this.sim.people.filter((p) => p.sex === 'M' && p.age >= 17 && p.age <= 48 && p.health > 55 && !p.sick && !p.warParty && (!band || p.band === band));
    }
    warParty(reason) {
      const sim = this.sim, W = this.W, rng = this.rng;
      if (!this.founded || this.warPartyActive) return false;
      const men = this.warriors().sort(() => rng.next() - 0.5);
      const n = U.clamp(Math.round(men.length * 0.45), 5, 16);
      const party = { kind: 'raid', reason, members: men.slice(0, n), resolved: false, started: sim.day };
      if (party.members.length < 3) { sim.emit('Too few men are fit to fight.', 'warn'); return false; }
      const targets = this.buildings.filter((b) => b.state === 'built' || b.state === 'frame');
      if (!targets.length) return false;
      targets.sort((a, b) => Math.hypot(a.cx - W.PCX, a.cy - W.PCY) - Math.hypot(b.cx - W.PCX, b.cy - W.PCY));
      const target = reason.startsWith('Driving out') ? targets.find((b) => b.type === 'fort') || targets[0] : targets[0];
      party.target = target;
      const gx = W.PCX + 2.5, gy = W.PCY - 2.5;
      for (const p of party.members) {
        p.warParty = party;
        p.plan = [];
        p.step = null;
        p.planKind = 'war';
        p.tool = sim.culture.flags.guns > (p.look.adopt || 0.5) ? 'musket' : 'bow';
        const g = sim.ringSpot(gx, gy, 0.5, 1.8) || { x: gx, y: gy };
        const t = sim.snapWalk(target.cx + rng.range(-2.5, 2.5) - target.w, target.cy + rng.range(-2.5, 2.5)) || { x: target.cx - target.w, y: target.cy };
        p.plan.push(
          { k: 'go', x: g.x, y: g.y, label: 'Gathering for the war party' },
          { k: 'work', act: 'muster', anim: 'stand', dur: 1, label: `Gathering for the war party: ${reason.toLowerCase()}` },
          { k: 'go', x: t.x, y: t.y, label: `With the war party: ${reason.toLowerCase()}`, run: false },
          { k: 'work', act: 'raid', anim: 'aim', dur: 0.6, label: 'Attacking the settlement', onStart: () => this.resolveRaid(party) },
        );
        sim.goHome(p, p.plan, 'Returning from the war party');
        p.plan.push({ k: 'deposit' }, { k: 'call', fn: () => { p.warParty = null; } });
      }
      this.parties.push(party);
      this.warPartyActive = true;
      this.relations -= 10;
      sim.emit(`A war party of ${party.members.length} sets out: ${reason.toLowerCase()}.`, 'war');
      return true;
    }
    resolveRaid(party) {
      if (party.resolved) return;
      party.resolved = true;
      const sim = this.sim, cul = sim.culture, rng = this.rng, b = party.target;
      const guns = cul.flags.guns * this.tradeAccess();
      const ours = party.members.length * (1 + 0.35 * guns + (cul.flags.alliance ? 0.4 : 0)) * rng.range(0.7, 1.3) * (0.8 + 0.4 * cul.unity);
      const theirs = 6 + this.pop * 0.12 + (b.type === 'fort' ? 14 : 0) + (this.war ? 4 : 0);
      const win = ours > theirs;
      if (win) {
        b.state = 'burning';
        b.burnUntil = sim.day + 0.6;
        const lost = b.type === 'fort' ? rng.int(10, 18) : rng.int(3, 8);
        this.pop = Math.max(5, this.pop - lost);
        this.fear = U.clamp(this.fear + (b.type === 'fort' ? 0.3 : 0.12), 0, 1);
        this.unclaim(rng.int(20, 50));
        cul.integ.goods = U.clamp(cul.integ.goods + 0.02, 0, 1);
        sim.emit(b.type === 'fort' ? `The war party set the fort of ${this.name} ablaze. The settlers fled into the woods.` : `The war party burned a settler farm. The families fled to the fort, and their fields lie empty.`, 'war');
      } else sim.emit(`The settlers were ready. The war party was driven back from ${this.name}.`, 'war');
      this.casualties(party.members, win ? 0.07 : 0.18, win ? 0.02 : 0.07, 'fell in the fighting at ' + this.name);
      this.relations = U.clamp(this.relations - 25, -100, 100);
      this.startWar();
      if (rng.chance(0.75)) this.retaliateOn = sim.day + rng.int(3, 6);
      this.partyEndDay = sim.day + 2;
    }
    casualties(list, woundP, deathP, cause) {
      const sim = this.sim, rng = this.rng;
      let dead = 0, hurt = 0;
      for (const p of list) {
        if (p.dead) continue;
        const r = rng.next();
        if (r < deathP) { dead++; sim.die(p, cause); }
        else if (r < woundP) { hurt++; p.health = Math.max(10, p.health - 45); p.sick = Math.max(p.sick, 3); }
      }
      if (hurt) sim.emit(`${hurt} ${hurt === 1 ? 'man was' : 'men were'} wounded.`, 'health');
      this.recentLoss += dead * 0.03;
      sim.invalidate();
    }
    militiaRaid() {
      const sim = this.sim, W = this.W, rng = this.rng;
      const fort = this.buildings.find((b) => b.type === 'fort');
      if (!fort || !fort.door) return;
      const warDays = this.war ? sim.day - this.warSince : 0;
      const n = U.clamp(Math.round(6 + this.pop * 0.08 + warDays * 0.08), 6, 34);
      const ang = Math.atan2(fort.cy - W.PCY, fort.cx - W.PCX);
      const tx = W.PCX + Math.cos(ang) * (W.palR - 3), ty = W.PCY + Math.sin(ang) * (W.palR - 3);
      const m = { agents: [], resolved: false, n, target: { x: tx, y: ty } };
      for (let k = 0; k < n; k++) {
        const a = this.newAgent('soldier', fort.door.x + 0.5 + rng.range(-1, 1), fort.door.y + 0.5 + rng.range(-1, 1));
        const s = sim.snapWalk(tx + rng.range(-2, 2), ty + rng.range(-2, 2)) || { x: tx, y: ty };
        a.plan = [
          { k: 'go', x: s.x, y: s.y, label: 'Marching on the village' },
          { k: 'work', dur: 0.7, anim: 'aim', label: 'Attacking the village', onStart: () => this.resolveMilitia(m) },
          { k: 'go', x: fort.door.x + 0.5, y: fort.door.y + 0.5, label: 'Marching back to the fort' },
          { k: 'leave' },
        ];
        m.agents.push(a);
        this.agents.push(a);
      }
      this.militia = m;
      this.alarm = true;
      this.lastMilitia = sim.day;
      sim.emit(`Soldiers are marching from ${this.name} toward the village!`, 'warn');
      for (const p of sim.people) if (!p.warParty && p.planKind !== 'flee') { p.plan.length = 0; p.step = null; p.planKind = ''; }
    }
    resolveMilitia(m) {
      if (m.resolved) return;
      m.resolved = true;
      const sim = this.sim, cul = sim.culture, rng = this.rng, W = this.W;
      const defenders = this.warriors('village').filter((p) => Math.hypot(p.x - W.PCX, p.y - W.PCY) < 30);
      const guns = cul.flags.guns * this.tradeAccess();
      const def = defenders.length * (1 + cul.flags.palisade * 0.8 + 0.35 * guns + 0.15 * cul.lean.defense.v + (cul.flags.alliance ? 0.3 : 0)) * rng.range(0.7, 1.3);
      const att = m.n * 2 * rng.range(0.8, 1.2);
      if (def > att) {
        this.fear = U.clamp(this.fear + 0.15, 0, 1);
        sim.emit('Our warriors drove the soldiers back from the village.', 'war');
        this.casualties(defenders, 0.08, 0.02, 'fell defending the village');
      } else {
        const lodges = W.buildings.filter((b) => b.band === 'village' && (b.type === 'wigwam' || b.type === 'longhouse') && b.state !== 'ruin' && b.state !== 'burning');
        lodges.sort((a, b) => Math.hypot(a.cx - m.target.x, a.cy - m.target.y) - Math.hypot(b.cx - m.target.x, b.cy - m.target.y));
        const k = rng.int(1, 3);
        for (const b of lodges.slice(0, k)) { b.state = 'burning'; b.burnUntil = sim.day + 0.5; b.repair = 0; }
        if (sim.crop.phase === 'growing' || sim.crop.phase === 'prep') sim.crop.condition = Math.max(0.05, sim.crop.condition - 0.1);
        else for (const f of ['maize', 'meat', 'fish', 'wild']) sim.food[f] *= 0.92;
        sim.emit(`The soldiers broke into the village and burned ${k === 1 ? 'a lodge' : k + ' lodges'}.`, 'war');
        this.casualties(defenders, 0.16, 0.05, 'fell defending the village');
        this.attackedUs = true;
      }
      this.relations = U.clamp(this.relations - 8, -100, 100);
    }

    // ---------------------------------------------------------------- sickness and marriage
    startEpidemic() {
      const sim = this.sim, rng = this.rng;
      this.epidemicActive = true;
      this.epidemicUntil = sim.day + 10;
      this.lastEpidemic = sim.day;
      for (const p of sim.people) if (rng.next() < 0.28) { p.sick = rng.int(3, 7); p.severe = true; }
      sim.invalidate();
      sim.emit('A sickness from across the sea has reached the village: fever, then spots. The healers have never seen anything like it.', 'warn');
    }
    adoptSettler() {
      const sim = this.sim, rng = this.rng;
      const women = sim.people.filter((p) => p.sex === 'F' && p.age >= 18 && p.age <= 32 && !p.spouse && p.band === 'village');
      const wife = women.length ? rng.pick(women) : null;
      const hh = wife ? sim.hhOf(wife) : sim.households.find((h) => h.members.length && h.dwelling !== null);
      if (!hh) return;
      const p = TM.newPerson(rng, sim.usedNames, 'M', rng.int(20, 30), hh);
      p.band = 'village';
      p.occupation = 'Hunter';
      p.skills = TM.makeSkills(rng, p);
      p.newcomer = true;
      p.look.skin = rng.pick(['#d9a78a', '#e3b998', '#cf9c7c']);
      p.look.hair = rng.pick(['#5a3a22', '#8a6038', '#3a2a1e']);
      p.look.hairStyle = 'loose';
      if (wife) { p.spouse = wife.id; wife.spouse = p.id; }
      sim.initPerson(p);
      const b = sim.homeOf(p);
      if (b && b.door) { p.x = b.door.x + 0.5; p.y = b.door.y + 0.5; }
      sim.people.push(p);
      sim.byId.set(p.id, p);
      sim.invalidate();
      sim.emit(`A man from the colony has joined the ${TM.CLANS.find((c) => c.id === hh.clan).name} Clan${wife ? ' as husband to ' + wife.name : ''}. He is given the name ${p.name}, “${p.meaning}”.`, 'colony', p.id);
    }

    // ---------------------------------------------------------------- per frame
    update(dt, dH) {
      const sim = this.sim;
      if (this.partyEndDay !== undefined && sim.day >= this.partyEndDay) { this.warPartyActive = false; this.partyEndDay = undefined; }
      for (let i = this.agents.length - 1; i >= 0; i--) {
        const a = this.agents[i];
        this.updateAgent(a, dt, dH);
        if (a.gone) this.agents.splice(i, 1);
      }
      for (const a of this.livestock) this.updateBeast(a, dt);
      if (sim.culture.flags.school && this.founded && this.stage !== 'abandoned' && sim.hour >= 7.4 && sim.hour < 8 && this.teacherDay !== sim.day) {
        this.teacherDay = sim.day;
        const fort = this.buildings.find((b) => b.type === 'meeting' && b.state === 'built') || this.buildings.find((b) => b.type === 'fort');
        if (fort && fort.door) {
          const a = this.newAgent('teacher', fort.door.x + 0.5, fort.door.y + 0.5);
          a.look.coat = '#1e1e22';
          a.plan = [{ k: 'go', x: this.W.PCX + 3, y: this.W.PCY - 3.5, label: 'Walking to the village' }, { k: 'work', dur: 3.5, anim: 'tell', label: 'Teaching the children letters', face: { x: this.W.PCX, y: this.W.PCY } }, { k: 'go', x: fort.door.x + 0.5, y: fort.door.y + 0.5, label: 'Returning to the colony' }, { k: 'leave' }];
          this.agents.push(a);
        }
      }
      if (this.militia && this.militia.agents.every((a) => a.gone)) { this.militia = null; this.alarm = false; }
      this.parties = this.parties.filter((p) => (p.kind === 'trade' ? p.agents.some((a) => !a.gone) : !p.resolved || sim.day < (this.partyEndDay || 0)));
    }
    updateAgent(a, dt, dH) {
      const sim = this.sim;
      a.animT += dt;
      if (!a.step) {
        if (!a.plan.length) this.planAgent(a);
        a.step = a.plan.shift() || null;
        if (!a.step) return;
        const st = a.step;
        if (st.label) a.label = st.label;
        if (st.k === 'work') { st.t = st.dur; if (st.onStart) st.onStart(); a.atPlaza = !!st.atPlaza; }
        if (st.k === 'stay') st.t = st.dur || 0;
        if (st.k === 'go') st.path = null;
      }
      const st = a.step;
      switch (st.k) {
        case 'go':
          a.inside = false;
          a.atPlaza = false;
          if (!st.path && !sim.computePath(a, st)) { a.x = st.x; a.y = st.y; a.step = null; break; }
          a.anim = 'walk';
          if (sim.moveAlong(a, st, dt)) a.step = null;
          if (a.horse) { const h = a.horse; const dx = a.x - 0.8 * a.dir - h.x, dy = a.y + 0.5 - h.y; h.x += dx * Math.min(1, dt * 3); h.y += dy * Math.min(1, dt * 3); h.dir = a.dir; h.wp += Math.hypot(dx, dy) * dt * 10; h.moving = Math.hypot(dx, dy) > 0.1; }
          break;
        case 'work':
          a.inside = false;
          a.anim = st.anim;
          st.t -= dH;
          if (st.face) { const sdx = (st.face.x - a.x) - (st.face.y - a.y); if (Math.abs(sdx) > 0.05) a.dir = sdx > 0 ? 1 : -1; }
          if (st.t <= 0) { a.step = null; a.atPlaza = false; }
          if (a.horse) a.horse.moving = false;
          break;
        case 'enter': a.inside = true; a.step = null; break;
        case 'stay':
          if (st.until === 'wake') { if (sim.hour >= 6 && sim.hour < 19) a.step = null; }
          else { st.t -= dH; if (st.t <= 0) a.step = null; }
          break;
        case 'call': st.fn(); a.step = null; break;
        case 'leave': a.gone = true; a.step = null; break;
        default: a.step = null;
      }
    }
    planAgent(a) {
      const sim = this.sim, rng = this.rng, W = this.W, N = W.N, h = sim.hour;
      const home = a.home && a.home.door ? a.home : this.buildings.find((b) => b.type === 'fort');
      if (!home || !home.door) { a.plan.push({ k: 'leave' }); return; }
      if (this.stage === 'abandoned') { a.plan.push({ k: 'go', x: N - 2, y: a.y }, { k: 'leave' }); return; }
      if (h >= 20 || h < 6) {
        a.plan.push({ k: 'go', x: home.door.x + 0.5, y: home.door.y + 0.5, label: 'Going home' }, { k: 'enter' }, { k: 'stay', until: 'wake', label: 'Asleep' });
        return;
      }
      if (a.kind === 'guard') {
        const s = sim.ringSpot(home.door.x + 0.5, home.door.y + 0.5, 0.3, 1.2) || { x: home.door.x + 0.5, y: home.door.y + 0.5 };
        a.plan.push({ k: 'go', x: s.x, y: s.y, label: 'On guard' }, { k: 'work', dur: rng.range(2, 4), anim: 'stand', label: 'Standing guard at the gate' });
        a.tool = 'musket';
        return;
      }
      const fields = this.claimedList.filter((c) => W.type[c.i] === T.COLFIELD);
      const r = rng.next();
      if (r < 0.45 && fields.length) {
        const c = fields[rng.int(Math.max(0, fields.length - 120), fields.length - 1)];
        const s = { x: (c.i % N) + 0.5, y: ((c.i / N) | 0) + 0.5 };
        a.tool = 'hoe';
        a.plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to the fields' }, { k: 'work', dur: rng.range(1.5, 3), anim: a.sex === 'F' ? 'gather' : 'hoe', label: 'Working the wheat field' });
      } else if (r < 0.75 && a.sex === 'M') {
        const order = W.plan.claimOrder;
        const i = order[Math.min(order.length - 1, this.claimIdx + rng.int(0, 25))];
        const s = sim.snapWalk((i % N) + 0.5, ((i / N) | 0) + 0.5);
        if (s) {
          a.tool = 'axe';
          a.plan.push({ k: 'go', x: s.x, y: s.y, label: 'Going to fell trees' }, { k: 'work', dur: rng.range(1.5, 3), anim: 'chop', label: 'Felling trees to clear new fields' });
        }
      } else {
        const s = sim.ringSpot(home.door.x + 0.5, home.door.y + 0.5, 0.6, 2.5);
        if (s) { a.tool = null; a.plan.push({ k: 'go', x: s.x, y: s.y, label: 'Working near the house' }, { k: 'work', dur: rng.range(1, 2), anim: a.sex === 'F' ? 'stir' : 'chop', label: a.sex === 'F' ? 'Washing and cooking' : 'Splitting rails for fences' }); }
      }
      if (!a.plan.length) a.plan.push({ k: 'work', dur: 0.5, anim: 'stand', label: 'Resting' });
    }
    updateBeast(a, dt) {
      const W = this.W, N = W.N, rng = this.rng;
      a.t -= dt;
      if (a.moving) {
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        const st = (a.sp === 'horse' ? 0.6 : 0.35) * dt;
        const sdx = dx - dy;
        if (Math.abs(sdx) > 0.02) a.dir = sdx > 0 ? 1 : -1;
        if (d <= st) { a.x = a.tx; a.y = a.ty; a.moving = false; a.t = rng.range(3, 12); }
        else { a.x += (dx / d) * st; a.y += (dy / d) * st; a.wp += st * 4; }
        return;
      }
      if (a.t > 0) return;
      let tx, ty;
      if (a.sp === 'cattle') {
        const past = this.claimedList.filter((c) => W.type[c.i] === T.PASTURE);
        if (!past.length) { a.t = 3; return; }
        const c = past[rng.int(0, past.length - 1)];
        if (Math.hypot((c.i % N) - a.x, ((c.i / N) | 0) - a.y) > 8) { tx = a.x + rng.range(-2, 2); ty = a.y + rng.range(-2, 2); }
        else { tx = (c.i % N) + rng.range(0.2, 0.8); ty = ((c.i / N) | 0) + rng.range(0.2, 0.8); }
      } else {
        const fort = this.buildings.find((b) => b.type === 'fort');
        const r = a.sp === 'pig' ? 14 : 6;
        tx = (fort ? fort.cx : W.plan.KX) + rng.range(-r, r); ty = (fort ? fort.cy : W.plan.KY) + rng.range(-r, r);
      }
      const ix = Math.floor(tx), iy = Math.floor(ty);
      if (ix < 1 || iy < 1 || ix >= N - 1 || iy >= N - 1 || W.cost[iy * N + ix] === Infinity) { a.t = 1; return; }
      a.tx = tx; a.ty = ty; a.moving = true;
    }

    drainChanges() {
      const d = this.dirty, a = this.added;
      this.dirty = [];
      this.added = [];
      return { tiles: d, buildings: a };
    }
  }

  TM.Colony = Colony;
  TM.LAND_REF = LAND_REF;
})();
