/* Traditions Matter — world generation.
   A stretch of prairie–woodland borderland: tallgrass prairie and oak groves
   to the west, a river with a ford, a cattail marsh, floodplain fields of
   maize, beans and squash, a bark-lodge village in a forest clearing, and a
   hide-tipi hunting camp on the prairie. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U, RNG, C } = TM;

  const T = (TM.T = { PRAIRIE: 0, FOREST: 1, WATER: 2, SHALLOW: 3, BANK: 4, MARSH: 5, FIELD: 6, VILLAGE: 7, CAMP: 8 });

  TM.BUILD_INFO = {
    wigwam: {
      name: 'Wigwam',
      desc: 'A dome lodge of bent saplings tied with basswood fiber. Woven cattail mats cover it in summer and sheets of elm bark in the cold months. Home to a single family.',
    },
    longhouse: {
      name: 'Bark longhouse',
      desc: 'A long lodge of elm-bark sheets lashed over a frame of bent poles. Several related families live here, each with its own hearth along the central aisle. Smoke escapes through holes in the roof.',
    },
    council: {
      name: 'Council lodge',
      desc: 'The largest lodge in the village. The council and the peace chief meet here to talk through matters that concern the whole nation.',
    },
    tipi: {
      name: 'Hide tipi',
      desc: 'A cone of tanned bison hides over a frame of poles, with smoke flaps at the top. Before horses, dogs pulled the poles on travois, so tipis were kept small and light. The door faces the sunrise.',
    },
    sweat: {
      name: 'Sweat lodge',
      desc: 'A small dome of saplings covered with hides. Stones heated in the fire outside are carried in, and water poured over them fills the lodge with steam.',
    },
    crib: {
      name: 'Storage platform',
      desc: 'A raised platform where dried maize, beans and squash are kept, safe from damp and from animals.',
    },
    pit: {
      name: 'Storage pit',
      desc: 'A pit dug into dry ground and lined with bark and grass. It keeps dried food through the winter.',
    },
    rack: {
      name: 'Drying rack',
      desc: 'Strips of meat and split fish are smoked and dried here, so they keep for months.',
    },
    fishrack: {
      name: 'Fish-drying rack',
      desc: 'Split fish hang here in the sun and smoke near the canoe landing.',
    },
    hideframe: {
      name: 'Hide frame',
      desc: 'A hide is laced to this frame, then scraped, softened with brains and smoked to make supple buckskin.',
    },
    platform: {
      name: 'Watch platform',
      desc: 'From this scaffold, children and elders keep crows, deer and raccoons away from the ripening crops.',
    },
    bigfire: {
      name: 'Central fire',
      desc: 'The heart of the village. People gather here in the evening to eat, talk and hear stories.',
    },
    campfire: {
      name: 'Camp fire',
      desc: 'The shared fire at the center of the camp circle.',
    },
  };

  TM.generateWorld = function (opts) {
    const N = C.MAP;
    const seed = opts.seed >>> 0;
    const rng = new RNG(seed ^ 0x5bd1e995);
    const nz = TM.makeNoise(seed), nz2 = TM.makeNoise(seed + 7919), nz3 = TM.makeNoise(seed + 31337);
    const phase = rng.range(0, Math.PI * 2), phase2 = rng.range(0, Math.PI * 2);
    const rx = (y) => 37 + 5 * Math.sin(y * 0.055 + phase) + 2.2 * Math.sin(y * 0.13 + phase2) + (nz.fbm(y * 0.045, 3.7, 3) - 0.5) * 5;
    const VY = 46 + rng.int(-3, 3);
    const VX = Math.round(rx(VY + 0.5) + 19);
    const CY = VY + rng.int(8, 12);
    const CX = Math.round(rx(CY + 0.5) - 15);
    const FY = VY + (CY - VY) * 0.55 + 0.5;
    const rwBase = (y) => 2.5 + 1.1 * nz2.fbm(y * 0.07, 11.3, 2);
    const rw = (y) => rwBase(y) * (1 + 0.45 * (1 - U.smooth(1.2, 3.2, Math.abs(y - FY))));
    const isFord = (y) => Math.abs(y - FY) < 1.6;
    const MY = VY - rng.int(17, 22);
    const MX = rx(MY) + rwBase(MY) / 2 + 4.5;
    const PCX = VX + 0.5, PCY = VY + 0.5;
    const CCX = CX + 0.5, CCY = CY + 0.5;

    const n = N * N;
    const type = new Uint8Array(n);
    const wf = new Float32Array(n);
    const dd = new Float32Array(n);
    const marshM = new Float32Array(n);

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x, cx = x + 0.5, cy = y + 0.5;
        const r = rx(cy), w = rw(cy);
        const d = w / 2 - Math.abs(cx - r);
        dd[i] = d;
        let t = T.PRAIRIE;
        if (d > 0) t = isFord(cy) ? T.SHALLOW : T.WATER;
        else if (d > -0.85 - 0.5 * nz3.n2(cx * 0.6, cy * 0.6)) t = T.BANK;
        else {
          const m = 1 - ((cx - MX) ** 2 / 20 + (cy - MY) ** 2 / 49) + (nz3.fbm(cx * 0.25, cy * 0.25) - 0.5) * 0.9;
          if (m > 0 && d < -0.5) t = T.MARSH;
          marshM[i] = U.clamp(m * 3, 0, 1);
        }
        const ad = Math.abs(cx - r);
        const east = U.smooth(r + 7, r + 26, cx) * (0.75 + 0.6 * (nz.fbm(cx * 0.07, cy * 0.07) - 0.5));
        const ripar = (1 - U.smooth(2, 7, ad)) * 0.8 * U.smooth(0.35, 0.6, nz2.fbm(cx * 0.15 + 5, cy * 0.15));
        const grove = cx < r - 6 ? U.smooth(0.6, 0.72, nz3.fbm(cx * 0.07 + 20, cy * 0.07 + 20)) * 0.75 : 0;
        let wv = Math.max(east, ripar, grove);
        wv *= U.smooth(12, 17, Math.hypot(cx - PCX, cy - PCY));
        wv *= U.smooth(8, 11.5, Math.hypot(cx - CCX, cy - CCY));
        wf[i] = U.clamp(wv, 0, 1);
        type[i] = t;
      }
    }

    // village and camp grounds
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (type[i] !== T.PRAIRIE) continue;
      const cx = x + 0.5, cy = y + 0.5;
      const wob = (nz3.n2(cx * 0.3, cy * 0.3) - 0.5) * 3;
      if (Math.hypot(cx - PCX, cy - PCY) < 11.5 + wob) type[i] = T.VILLAGE;
      else if (Math.hypot(cx - CCX, cy - CCY) < 7.8 + wob * 0.6) type[i] = T.CAMP;
    }

    // floodplain fields between river and village
    const fieldTarget = Math.round(opts.pop * 0.95);
    const cand = [];
    for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) {
      const i = y * N + x;
      if (type[i] !== T.PRAIRIE) continue;
      const cx = x + 0.5, cy = y + 0.5;
      if (cx < rx(cy) + rwBase(cy) / 2 + 2.5) continue;
      const dv = Math.hypot(cx - PCX, cy - PCY);
      if (dv < 11.5 || dv > 32) continue;
      if (cx > VX + 5) continue;
      if (Math.abs(cy - FY) < 2.5) continue; // keep the ford trail clear
      if (nz3.n2(cx * 0.45 + 50, cy * 0.45 + 50) < 0.3) continue;
      const score = dv + nz.n2(cx * 0.2 + 9, cy * 0.2 + 9) * 8 + Math.abs(cy - VY) * 0.15;
      cand.push([i, score]);
    }
    cand.sort((a, b) => a[1] - b[1]);
    for (let k = 0; k < Math.min(fieldTarget, cand.length); k++) {
      const i = cand[k][0];
      type[i] = T.FIELD;
      wf[i] = 0;
    }
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      if (type[y * N + x] !== T.FIELD) continue;
      for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
        const j = (y + oy) * N + (x + ox);
        if (j >= 0 && j < n) wf[j] *= 0.55;
      }
    }
    for (let i = 0; i < n; i++) if (type[i] === T.PRAIRIE && wf[i] > 0.55) type[i] = T.FOREST;

    // ---------------------------------------------------------------- placement helpers
    const occ = new Int32Array(n).fill(-1);
    const reserved = new Uint8Array(n);
    const fireTile = new Uint8Array(n);
    const buildings = [], fires = [], props = [];
    const inMap = (x, y) => x >= 1 && y >= 1 && x < N - 1 && y < N - 1;
    const LAND = new Set([T.PRAIRIE, T.FOREST, T.VILLAGE, T.CAMP]);
    const VILLAGE_OK = new Set([T.PRAIRIE, T.FOREST, T.VILLAGE]);
    const CAMP_OK = new Set([T.PRAIRIE, T.CAMP]);

    function free(x0, y0, w, h, m, allow) {
      for (let y = y0 - m; y < y0 + h + m; y++) for (let x = x0 - m; x < x0 + w + m; x++) {
        if (!inMap(x, y)) return false;
        const i = y * N + x;
        if (occ[i] >= 0) return false;
        const t = type[i];
        const foot = x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
        if (foot) {
          if (!(allow || LAND).has(t) || reserved[i] || fireTile[i]) return false;
        } else if (t === T.WATER || t === T.SHALLOW) return false;
      }
      return true;
    }
    function put(b) {
      b.id = buildings.length;
      buildings.push(b);
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) occ[y * N + x] = b.id;
      b.cx = b.x + b.w / 2;
      b.cy = b.y + b.h / 2;
      b.hh = b.hh || [];
      return b;
    }
    const walkableTile = (x, y) => inMap(x, y) && occ[y * N + x] < 0 && type[y * N + x] !== T.WATER && type[y * N + x] !== T.SHALLOW;
    function doorTile(b, d) {
      if (d[0] === 1) return [b.x + b.w, b.y + Math.floor((b.h - 1) / 2)];
      if (d[0] === -1) return [b.x - 1, b.y + Math.floor((b.h - 1) / 2)];
      if (d[1] === 1) return [b.x + Math.floor((b.w - 1) / 2), b.y + b.h];
      return [b.x + Math.floor((b.w - 1) / 2), b.y - 1];
    }
    function setDoor(b, dirs) {
      for (const d of dirs) {
        const [x, y] = doorTile(b, d);
        if (walkableTile(x, y) && !fireTile[y * N + x]) {
          b.door = { x, y, dx: d[0], dy: d[1] };
          b.mouth = { x: b.cx + d[0] * (b.w / 2 - 0.15), y: b.cy + d[1] * (b.h / 2 - 0.15) };
          if (b.w % 2 === 0 && d[0] === 0) b.mouth.x = x + 0.5;
          if (b.h % 2 === 0 && d[1] === 0) b.mouth.y = y + 0.5;
          reserved[y * N + x] = 1;
          return true;
        }
      }
      return false;
    }
    function dirsToward(b, tx, ty, only) {
      const vx = tx - b.cx, vy = ty - b.cy;
      let ds = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      if (only === 'x') ds = [[1, 0], [-1, 0]];
      if (only === 'y') ds = [[0, 1], [0, -1]];
      return ds.sort((a, c) => c[0] * vx + c[1] * vy - (a[0] * vx + a[1] * vy));
    }
    function tryAround(cx, cy, w, h, rMin, rMax, tries, allow, margin = 1, ang = null, spread = Math.PI) {
      for (let t = 0; t < tries; t++) {
        const grow = t / tries;
        const r = rMin + (rMax - rMin) * Math.min(1, rng.next() * 0.6 + grow * 0.7);
        const a = ang === null ? rng.range(0, Math.PI * 2) : ang + rng.range(-spread, spread) * (0.5 + grow);
        const x0 = Math.round(cx + Math.cos(a) * r - w / 2), y0 = Math.round(cy + Math.sin(a) * r - h / 2);
        if (free(x0, y0, w, h, margin, allow)) return [x0, y0];
      }
      return null;
    }
    function addHearth(b, hh, size = 1) {
      if (!b.door) return null;
      const x = b.door.x + b.door.dx, y = b.door.y + b.door.dy;
      if (!walkableTile(x, y) || reserved[y * N + x] || fireTile[y * N + x]) return null;
      const f = { x: x + 0.5, y: y + 0.5, size, hh, bld: b.id, kind: b.type === 'tipi' ? 'tripod' : 'pot' };
      fires.push(f);
      fireTile[y * N + x] = 1;
      reserved[y * N + x] = 1;
      b.hearth = f;
      return f;
    }
    function addBeside(b, kind, extra) {
      if (!b.door) return null;
      const px = -b.door.dy, py = b.door.dx; // perpendicular
      for (const s of [1, -1]) {
        const x = b.door.x + px * s, y = b.door.y + py * s;
        if (walkableTile(x, y) && !reserved[y * N + x] && !fireTile[y * N + x]) {
          reserved[y * N + x] = 1;
          const pr = Object.assign({ kind, x: x + 0.5, y: y + 0.5, tile: y * N + x }, extra || {});
          props.push(pr);
          return pr;
        }
      }
      return null;
    }

    // ---------------------------------------------------------------- village
    const households = opts.households;
    const hhById = new Map(households.map((h) => [h.id, h]));
    const central = put({ type: 'bigfire', x: VX, y: VY, w: 1, h: 1, band: 'village' });
    fires.push({ x: PCX, y: PCY, size: 2.2, bld: central.id, kind: 'big' });
    for (let y = VY - 4; y <= VY + 4; y++) for (let x = VX - 4; x <= VX + 4; x++) {
      if (Math.hypot(x + 0.5 - PCX, y + 0.5 - PCY) < 3.7 && occ[y * N + x] < 0) reserved[y * N + x] = 1;
    }
    // council lodge on the plaza
    let council = null;
    for (const a of [-Math.PI / 2, -Math.PI / 4, -3 * Math.PI / 4, Math.PI / 2, 0, Math.PI]) {
      const cx = PCX + Math.cos(a) * 7, cy = PCY + Math.sin(a) * 7;
      const alongY = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
      const w = alongY ? 3 : 5, h = alongY ? 5 : 3;
      const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
      if (free(x0, y0, w, h, 1, VILLAGE_OK)) {
        council = put({ type: 'council', x: x0, y: y0, w, h, orient: alongY ? 'y' : 'x', band: 'village' });
        setDoor(council, dirsToward(council, PCX, PCY));
        break;
      }
    }
    // bark longhouses ring the plaza
    const groups = opts.groups || [];
    const baseA = rng.range(0, Math.PI * 2);
    groups.forEach((g, gi) => {
      if (!g.hhs.length) return;
      const a0 = baseA + (gi * Math.PI * 2) / Math.max(groups.length, 1);
      let placed = null;
      for (let t = 0; t < 160 && !placed; t++) {
        const a = a0 + rng.range(-0.5, 0.5) * (1 + t / 60);
        const r = 9 + rng.range(0, 2) + t * 0.04;
        const cx = PCX + Math.cos(a) * r, cy = PCY + Math.sin(a) * r;
        const alongY = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
        const w = alongY ? 2 : 6, h = alongY ? 6 : 2;
        const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
        if (free(x0, y0, w, h, 1, VILLAGE_OK)) placed = { x0, y0, w, h, alongY };
      }
      if (!placed) return;
      const b = put({ type: 'longhouse', x: placed.x0, y: placed.y0, w: placed.w, h: placed.h, orient: placed.alongY ? 'y' : 'x', band: 'village', variant: rng.int(0, 2) });
      setDoor(b, dirsToward(b, PCX, PCY, b.orient));
      for (const hh of g.hhs) { b.hh.push(hh.id); hh.dwelling = b.id; }
      addHearth(b, g.hhs[0].id);
      addBeside(b, 'woodpile');
    });
    // wigwams grouped by clan around the longhouses
    const clanIdx = {};
    TM.CLANS.forEach((c, k) => (clanIdx[c.id] = k));
    const rot = rng.range(0, Math.PI * 2);
    for (const hh of households) {
      if (hh.band !== 'village' || hh.dwelling !== null) continue;
      const a = rot + (clanIdx[hh.clan] * Math.PI * 2) / 6;
      let pos = tryAround(PCX, PCY, 2, 2, 10, 19, 500, VILLAGE_OK, 1, a, 0.55);
      if (!pos) pos = tryAround(PCX, PCY, 2, 2, 12, 24, 800, VILLAGE_OK, 1);
      if (!pos) continue;
      const b = put({ type: 'wigwam', x: pos[0], y: pos[1], w: 2, h: 2, band: 'village', variant: rng.int(0, 2) });
      setDoor(b, dirsToward(b, PCX, PCY));
      b.hh.push(hh.id);
      hh.dwelling = b.id;
      if (rng.chance(0.75)) addHearth(b, hh.id);
      addBeside(b, 'woodpile');
      if (rng.chance(0.4)) addBeside(b, 'pots');
    }
    const villageDwellings = buildings.filter((b) => b.type === 'wigwam' || b.type === 'longhouse');
    // storage platforms, pits and hide frames among the lodges
    const nCrib = groups.length + Math.ceil(villageDwellings.length / 4);
    for (let k = 0; k < nCrib; k++) {
      const d = rng.pick(villageDwellings);
      const pos = d && tryAround(d.cx, d.cy, 1, 1, 2.5, 5, 60, VILLAGE_OK);
      if (pos) put({ type: 'crib', x: pos[0], y: pos[1], w: 1, h: 1, band: 'village', variant: rng.int(0, 1) });
    }
    const nPit = Math.ceil(households.length / 6);
    for (let k = 0; k < nPit; k++) {
      const d = rng.pick(villageDwellings);
      const pos = d && tryAround(d.cx, d.cy, 1, 1, 2.5, 5, 60, VILLAGE_OK);
      if (pos) put({ type: 'pit', x: pos[0], y: pos[1], w: 1, h: 1, band: 'village' });
    }
    for (let k = 0; k < 4; k++) {
      const d = rng.pick(villageDwellings);
      const pos = d && tryAround(d.cx, d.cy, 1, 1, 2.5, 5, 60, VILLAGE_OK);
      if (pos) {
        const b = put({ type: 'hideframe', x: pos[0], y: pos[1], w: 1, h: 1, band: 'village', orient: rng.chance(0.5) ? 'x' : 'y' });
        setDoor(b, dirsToward(b, PCX, PCY));
      }
    }
    // drying racks on the river side of the village
    for (let k = 0; k < 3; k++) {
      const alongY = rng.chance(0.5);
      const pos = tryAround(PCX, PCY, alongY ? 1 : 2, alongY ? 2 : 1, 10, 15, 120, VILLAGE_OK, 1, Math.PI, 0.7);
      if (pos) {
        const b = put({ type: 'rack', x: pos[0], y: pos[1], w: alongY ? 1 : 2, h: alongY ? 2 : 1, orient: alongY ? 'y' : 'x', band: 'village', load: 'meat' });
        setDoor(b, dirsToward(b, PCX, PCY));
      }
    }
    // canoe landing on the near bank
    let landing = null, best = 1e9;
    for (let y = VY - 8; y <= VY + 8; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (type[i] !== T.BANK || x + 0.5 < rx(y + 0.5) || occ[i] >= 0) continue;
      let adjWater = false;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (type[(y + oy) * N + x + ox] === T.WATER) adjWater = true;
      if (!adjWater) continue;
      const d = Math.hypot(x + 0.5 - PCX, y + 0.5 - PCY);
      if (d < best) { best = d; landing = { x, y }; }
    }
    if (!landing) landing = { x: Math.round(rx(VY) + 3), y: VY };
    for (let k = 0; k < 3; k++) {
      const y = landing.y - 2 + k * 2;
      for (let x = landing.x - 1; x <= landing.x + 2; x++) {
        const i = y * N + x;
        if (inMap(x, y) && type[i] === T.BANK && occ[i] < 0 && !reserved[i]) {
          props.push({ kind: 'canoe', x: x + 0.45, y: y + 0.5, flip: k % 2 === 1 });
          break;
        }
      }
    }
    {
      const wy = landing.y + 4.5;
      props.push({ kind: 'weir', x: rx(wy), y: wy, w: rw(wy) });
      const pos = tryAround(landing.x + 0.5, landing.y + 0.5, 2, 1, 2, 5, 120, VILLAGE_OK, 1);
      if (pos) {
        const b = put({ type: 'fishrack', x: pos[0], y: pos[1], w: 2, h: 1, orient: 'x', band: 'village', load: 'fish' });
        setDoor(b, dirsToward(b, PCX, PCY));
      }
    }
    // sweat lodge near the water, upstream of the village
    {
      const ty = VY - 7, tx = rx(ty + 0.5) + rwBase(ty) / 2 + 2.5;
      let spot = null;
      for (let r = 0; r < 8 && !spot; r++) {
        for (let k = 0; k < 24 && !spot; k++) {
          const a = (k / 24) * Math.PI * 2;
          const x = Math.round(tx + Math.cos(a) * r), y = Math.round(ty + Math.sin(a) * r);
          if (free(x, y, 1, 1, 1, VILLAGE_OK)) spot = [x, y];
        }
      }
      if (spot) {
        const b = put({ type: 'sweat', x: spot[0], y: spot[1], w: 1, h: 1, band: 'village' });
        setDoor(b, dirsToward(b, PCX, PCY));
        if (b.door) {
          const fx = b.door.x - b.door.dy, fy = b.door.y + b.door.dx;
          if (walkableTile(fx, fy) && !reserved[fy * N + fx]) {
            fires.push({ x: fx + 0.5, y: fy + 0.5, size: 0.8, kind: 'stones', bld: b.id });
            fireTile[fy * N + fx] = 1;
          }
        }
      }
    }

    // ---------------------------------------------------------------- hunting camp
    const centralCamp = put({ type: 'campfire', x: CX, y: CY, w: 1, h: 1, band: 'camp' });
    fires.push({ x: CCX, y: CCY, size: 1.5, bld: centralCamp.id, kind: 'big' });
    const campHH = households.filter((h) => h.band === 'camp');
    const R = Math.max(4.3, campHH.length * 0.8);
    campHH.forEach((hh, k) => {
      const span = (310 * Math.PI) / 180;
      const a0 = (25 * Math.PI) / 180 + (campHH.length > 1 ? (k * span) / (campHH.length - 1) : Math.PI);
      let pos = null;
      for (let t = 0; t < 40 && !pos; t++) {
        const a = a0 + rng.range(-0.12, 0.12) * (1 + t / 10);
        const r = R + t * 0.12;
        const x0 = Math.round(CCX + Math.cos(a) * r - 1), y0 = Math.round(CCY + Math.sin(a) * r - 1);
        if (free(x0, y0, 2, 2, 1, CAMP_OK)) pos = [x0, y0];
      }
      if (!pos) pos = tryAround(CCX, CCY, 2, 2, R, R + 6, 300, CAMP_OK);
      if (!pos) return;
      const b = put({ type: 'tipi', x: pos[0], y: pos[1], w: 2, h: 2, band: 'camp', variant: rng.int(0, 3) });
      setDoor(b, [[1, 0]].concat(dirsToward(b, CCX, CCY)));
      b.hh.push(hh.id);
      hh.dwelling = b.id;
      if (rng.chance(0.5)) addHearth(b, hh.id, 0.8);
      if (rng.chance(0.7)) addBeside(b, 'travois');
    });
    for (let k = 0; k < 2; k++) {
      const pos = tryAround(CCX, CCY, 2, 1, 2.2, 4, 100, CAMP_OK);
      if (pos) {
        const b = put({ type: 'rack', x: pos[0], y: pos[1], w: 2, h: 1, orient: 'x', band: 'camp', load: 'meat' });
        setDoor(b, dirsToward(b, CCX, CCY));
      }
    }
    for (let k = 0; k < 3; k++) {
      const pos = tryAround(CCX, CCY, 1, 1, R + 2, R + 4, 100, CAMP_OK);
      if (pos) {
        const b = put({ type: 'hideframe', x: pos[0], y: pos[1], w: 1, h: 1, band: 'camp', orient: rng.chance(0.5) ? 'x' : 'y' });
        setDoor(b, dirsToward(b, CCX, CCY));
      }
    }
    for (let k = 0; k < 3; k++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(2.2, R - 1.2);
      const x = Math.floor(CCX + Math.cos(a) * r), y = Math.floor(CCY + Math.sin(a) * r);
      if (walkableTile(x, y) && !reserved[y * N + x] && !fireTile[y * N + x]) props.push({ kind: 'peggedhide', x: x + 0.5, y: y + 0.5, tile: y * N + x });
    }

    // ---------------------------------------------------------------- fields: watch platforms and plots
    let fieldTiles = [];
    for (let i = 0; i < n; i++) if (type[i] === T.FIELD) fieldTiles.push(i);
    const platforms = [];
    for (let k = 0; k < 3 && fieldTiles.length; k++) {
      let bi = fieldTiles[rng.int(0, fieldTiles.length - 1)], bd = -1;
      for (let s = 0; s < 40; s++) {
        const i = fieldTiles[rng.int(0, fieldTiles.length - 1)];
        let md = 1e9;
        for (const p of platforms) md = Math.min(md, Math.hypot((i % N) - p.x, ((i / N) | 0) - p.y));
        if (md > bd) { bd = md; bi = i; }
      }
      const x = bi % N, y = (bi / N) | 0;
      if (occ[bi] < 0) {
        const b = put({ type: 'platform', x, y, w: 1, h: 1, band: 'village' });
        setDoor(b, dirsToward(b, PCX, PCY));
        platforms.push(b);
      }
    }
    fieldTiles = fieldTiles.filter((i) => occ[i] < 0);

    // ---------------------------------------------------------------- trails
    const path = new Uint8Array(n);
    const gcost = new Float32Array(n);
    const refreshGen = () => {
      for (let i = 0; i < n; i++) {
        const t = type[i];
        let c = 1;
        if (t === T.WATER || occ[i] >= 0) c = Infinity;
        else if (t === T.SHALLOW) c = 2;
        else if (t === T.FIELD) c = 3;
        else if (t === T.MARSH) c = 3;
        else if (wf[i] > 0.55) c = 2;
        if (fireTile[i]) c = 6;
        if (path[i]) c = Math.min(c, 0.45);
        gcost[i] = c;
      }
    };
    const plazaEdge = (tx, ty) => {
      const a = Math.atan2(ty - PCY, tx - PCX);
      return [Math.floor(PCX + Math.cos(a) * 2.6), Math.floor(PCY + Math.sin(a) * 2.6)];
    };
    const trail = (sx, sy, tx, ty) => {
      refreshGen();
      tx = U.clamp(Math.floor(tx), 1, N - 2); ty = U.clamp(Math.floor(ty), 1, N - 2);
      if (gcost[ty * N + tx] === Infinity) return;
      const p = TM.Path.find(N, gcost, sx, sy, tx, ty, 40000);
      if (!p) return;
      for (const i of p) if (type[i] !== T.WATER) path[i] = 1;
    };
    const fordE = [Math.floor(rx(FY) + rw(FY) / 2 + 1.5), Math.floor(FY)];
    const fordW = [Math.floor(rx(FY) - rw(FY) / 2 - 1.5), Math.floor(FY)];
    const fe = plazaEdge(fordE[0], fordE[1]);
    trail(fe[0], fe[1], fordE[0], fordE[1]);
    trail(fordE[0], fordE[1], fordW[0], fordW[1]);
    trail(fordW[0], fordW[1], CX + 2, CY);
    const le = plazaEdge(landing.x, landing.y);
    trail(le[0], le[1], landing.x, landing.y);
    const fieldsN = fieldTiles.filter((i) => ((i / N) | 0) < VY), fieldsS = fieldTiles.filter((i) => ((i / N) | 0) >= VY);
    const centroid = (arr) => {
      let sx = 0, sy = 0;
      for (const i of arr) { sx += i % N; sy += (i / N) | 0; }
      return [sx / arr.length, sy / arr.length];
    };
    for (const arr of [fieldsN, fieldsS]) {
      if (!arr.length) continue;
      const c = centroid(arr);
      let bi = arr[0], bd = 1e9;
      for (const i of arr) {
        const d = Math.hypot((i % N) - c[0], ((i / N) | 0) - c[1]);
        if (d < bd) { bd = d; bi = i; }
      }
      const e = plazaEdge(bi % N, (bi / N) | 0);
      type[bi] = T.PRAIRIE; // a small clearing in the plot for the trail end
      trail(e[0], e[1], bi % N, (bi / N) | 0);
      type[bi] = T.FIELD;
    }
    fieldTiles = fieldTiles.filter((i) => !path[i]);
    for (const [tx, ty] of [[VX + 22, VY - 7], [VX + 20, VY + 9], [VX + 4, VY - 22], [VX + 2, VY + 22]]) {
      const e = plazaEdge(tx, ty);
      trail(e[0], e[1], tx, ty);
    }
    const sweat = buildings.find((b) => b.type === 'sweat');
    if (sweat && sweat.door) {
      const e = plazaEdge(sweat.door.x, sweat.door.y);
      trail(e[0], e[1], sweat.door.x, sweat.door.y);
    }
    trail(CX - 2, CY, CX - 16, CY - 3);
    trail(CX, CY - 2, CX - 4, CY - 16);
    // tiles under trails become trail (fields shrink a little where trails cross)
    for (let i = 0; i < n; i++) if (path[i] && type[i] === T.FIELD) type[i] = T.PRAIRIE;

    // ---------------------------------------------------------------- movement cost grid
    const cost = new Float32Array(n);
    const ground = new Float32Array(n); // walking speed factor
    const refreshCost = () => {
      for (let i = 0; i < n; i++) {
        const t = type[i];
        let c = 1, g = 1;
        if (t === T.WATER || occ[i] >= 0) c = Infinity;
        else if (t === T.SHALLOW) { c = 2.6; g = 0.55; }
        else if (t === T.MARSH) { c = 2.0; g = 0.7; }
        else if (t === T.FIELD) { c = 1.25; g = 0.9; }
        else if (t === T.BANK) c = 1.1;
        else if (wf[i] > 0.55) { c = 1.35; g = 0.85; }
        if (t === T.VILLAGE || t === T.CAMP) c = Math.min(c, 0.85);
        if (path[i] && c !== Infinity) { c = Math.min(c, 0.65); g = Math.max(g, 1); }
        if (fireTile[i]) c = 5;
        cost[i] = c;
        ground[i] = g;
      }
    };

    // ---------------------------------------------------------------- trees and plants
    const treeTile = new Uint8Array(n);
    const trees = [];
    const nearBuilding = (x, y, r) => {
      for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
        if (!inMap(x + ox, y + oy)) continue;
        if (occ[(y + oy) * N + x + ox] >= 0) return true;
      }
      return false;
    };
    const nearLanding = (x, y) => Math.hypot(x - landing.x, y - landing.y) < 4 || Math.abs(y + 0.5 - FY) < 3;
    function treeKind(x, y, t) {
      const cx = x + 0.5, cy = y + 0.5, r = rx(cy), ad = Math.abs(cx - r);
      if (t === T.BANK) return rng.weighted([['willow', 0.7], ['cottonwood', 0.3]]);
      if (ad < 7) return rng.weighted([['cottonwood', 0.35], ['elm', 0.3], ['willow', 0.15], ['maple', 0.2]]);
      if (cx < r) return rng.weighted([['oak', 0.85], ['cedar', 0.15]]);
      return rng.weighted([['oak', 0.28], ['maple', 0.24], ['hickory', 0.16], ['elm', 0.14], ['birch', 0.06], ['cedar', 0.06], ['pine', 0.06]]);
    }
    const berrySpots = [];
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x, t = type[i];
      if (t === T.WATER || t === T.SHALLOW || t === T.FIELD || t === T.VILLAGE || t === T.CAMP) continue;
      if (occ[i] >= 0 || reserved[i] || path[i] || fireTile[i]) continue;
      const w = wf[i];
      if (t === T.MARSH) {
        const k = rng.int(1, 3);
        for (let j = 0; j < k; j++) props.push({ kind: 'cattail', x: x + rng.range(0.15, 0.85), y: y + rng.range(0.15, 0.85), v: rng.int(0, 2) });
        continue;
      }
      if (nearBuilding(x, y, 1)) continue;
      let p = Math.pow(w, 1.25) * 0.92;
      if (t === T.BANK) p = nearLanding(x, y) ? 0 : 0.14;
      if (rng.next() < p) {
        trees.push({ kind: treeKind(x, y, t), x: x + 0.5 + rng.range(-0.25, 0.25), y: y + 0.5 + rng.range(-0.25, 0.25), s: rng.range(0.85, 1.2), v: rng.int(0, 2) });
        treeTile[i] = 1;
        if (w > 0.8 && rng.chance(0.3)) {
          trees.push({ kind: treeKind(x, y, t), x: x + rng.range(0.1, 0.9), y: y + rng.range(0.1, 0.9), s: rng.range(0.75, 1.1), v: rng.int(0, 2) });
        }
        continue;
      }
      if (t === T.BANK) {
        if (!nearLanding(x, y) && rng.chance(0.18)) props.push({ kind: 'cattail', x: x + rng.range(0.2, 0.8), y: y + rng.range(0.2, 0.8), v: rng.int(0, 2) });
        else if (rng.chance(0.03)) props.push({ kind: 'rock', x: x + rng.range(0.2, 0.8), y: y + rng.range(0.2, 0.8), v: rng.int(0, 3) });
        continue;
      }
      if (w > 0.25 && w < 0.65 && rng.chance(0.06)) {
        props.push({ kind: 'berry', x: x + 0.5, y: y + 0.5, v: rng.int(0, 1) });
        berrySpots.push(i);
      } else if (w > 0.3 && rng.chance(0.16)) {
        props.push({ kind: 'shrub', x: x + rng.range(0.3, 0.7), y: y + rng.range(0.3, 0.7), v: rng.int(0, 2) });
      } else if (w > 0.15 && w < 0.5 && rng.chance(0.05)) {
        props.push({ kind: 'sumac', x: x + rng.range(0.3, 0.7), y: y + rng.range(0.3, 0.7), v: rng.int(0, 1) });
      } else if (w < 0.3) {
        const k = rng.next() < 0.55 ? rng.int(1, 2) : 0;
        for (let j = 0; j < k; j++) props.push({ kind: 'grass', x: x + rng.range(0.1, 0.9), y: y + rng.range(0.1, 0.9), v: rng.int(0, 3) });
        if (rng.chance(0.09)) props.push({ kind: 'flowers', x: x + rng.range(0.2, 0.8), y: y + rng.range(0.2, 0.8), v: rng.int(0, 2) });
      }
      if (rng.chance(0.005)) props.push({ kind: 'rock', x: x + rng.range(0.2, 0.8), y: y + rng.range(0.2, 0.8), v: rng.int(0, 3) });
    }
    // stumps where the forest was cleared for the village and fields
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      if (occ[i] >= 0 || reserved[i] || path[i] || fireTile[i] || treeTile[i]) continue;
      const t = type[i];
      if (t !== T.VILLAGE && t !== T.PRAIRIE && t !== T.FOREST) continue;
      const dv = Math.hypot(x + 0.5 - PCX, y + 0.5 - PCY);
      if (dv > 9 && dv < 18 && rng.chance(0.04)) props.push({ kind: 'stump', x: x + rng.range(0.25, 0.75), y: y + rng.range(0.25, 0.75), v: rng.int(0, 2) });
    }
    // grass also grows inside the camp circle edge
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      if (type[i] !== T.CAMP || occ[i] >= 0 || reserved[i] || path[i] || fireTile[i]) continue;
      if (Math.hypot(x + 0.5 - CCX, y + 0.5 - CCY) > R + 1.5 && rng.chance(0.35)) props.push({ kind: 'grass', x: x + rng.range(0.1, 0.9), y: y + rng.range(0.1, 0.9), v: rng.int(0, 3) });
    }

    // prop tiles that slow walkers (woodpiles etc.)
    for (const p of props) if (p.tile !== undefined) fireTile[p.tile] = 1;
    refreshCost();

    // ---------------------------------------------------------------- work spots
    const isWalk = (i) => cost[i] !== Infinity;
    const bankSpots = [];
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      if (!isWalk(i) || type[i] === T.SHALLOW) continue;
      let adj = false;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (type[(y + oy) * N + x + ox] === T.WATER) adj = true;
      if (adj) bankSpots.push(i);
    }
    const dist = (i, px, py) => Math.hypot((i % N) + 0.5 - px, ((i / N) | 0) + 0.5 - py);
    const byDist = (arr, px, py) => arr.slice().sort((a, b) => dist(a, px, py) - dist(b, px, py));
    const LX = landing.x + 0.5, LY = landing.y + 0.5;
    const eastBank = bankSpots.filter((i) => (i % N) + 0.5 > rx(((i / N) | 0) + 0.5));
    const westBank = bankSpots.filter((i) => (i % N) + 0.5 < rx(((i / N) | 0) + 0.5));
    const spots = {
      water: { village: byDist(eastBank, LX, LY).slice(0, 8), camp: byDist(westBank, CCX, CCY).slice(0, 6) },
      fish: {
        village: eastBank.filter((i) => dist(i, LX, LY) < 14 && Math.abs(((i / N) | 0) + 0.5 - FY) > 2),
        camp: westBank.filter((i) => dist(i, CCX, CCY) < 20 && Math.abs(((i / N) | 0) + 0.5 - FY) > 2),
      },
      wood: { village: [], camp: [] },
      gather: { village: [], camp: [] },
      deer: [],
      play: { village: [], camp: [] },
    };
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      if (!isWalk(i) || treeTile[i] || type[i] === T.SHALLOW) continue;
      let nearTree = false;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (treeTile[(y + oy) * N + x + ox]) nearTree = true;
      const dv = dist(i, PCX, PCY), dc = dist(i, CCX, CCY);
      if (nearTree) {
        if (dv > 9 && dv < 24) spots.wood.village.push(i);
        if (dc > 5 && dc < 22) spots.wood.camp.push(i);
      }
      const w = wf[i];
      if ((w > 0.22 && w < 0.6 && dv > 10 && dv < 24) || (type[i] === T.MARSH && dv < 30)) spots.gather.village.push(i);
      if (type[i] === T.PRAIRIE && w < 0.15 && dc > 7 && dc < 16) spots.gather.camp.push(i);
      if (w > 0.72 && dv > 14 && dv < 34) spots.deer.push(i);
      if ((type[i] === T.VILLAGE || reserved[i]) && dv < 10 && !fireTile[i]) spots.play.village.push(i);
      if (type[i] === T.CAMP && dc < R - 1 && dc > 1.5 && !fireTile[i]) spots.play.camp.push(i);
    }
    for (const i of berrySpots) {
      const x = i % N, y = (i / N) | 0;
      for (const [ox, oy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const j = (y + oy) * N + x + ox;
        if (isWalk(j)) {
          if (dist(j, PCX, PCY) < 26) spots.gather.village.push(j);
          if (dist(j, CCX, CCY) < 20) spots.gather.camp.push(j);
          break;
        }
      }
    }
    if (!spots.wood.camp.length) spots.wood.camp = spots.wood.village.slice();
    if (!spots.fish.camp.length) spots.fish.camp = spots.water.camp.slice();
    if (!spots.fish.village.length) spots.fish.village = spots.water.village.slice();
    if (!spots.gather.camp.length) spots.gather.camp = spots.gather.village.slice();

    // each household's nearby plots
    const fieldOrder = rng.shuffle(fieldTiles.slice());
    const harvestRank = new Map(fieldOrder.map((i, k) => [i, k]));
    for (const hh of households) {
      const b = buildings[hh.dwelling];
      if (!b) continue;
      hh.fields = byDist(fieldTiles, b.cx, b.cy).slice(0, 14);
    }

    const W = {
      N, seed, type, wf, dd, marsh: marshM, occ, cost, ground, path, treeTile, fireTile, reserved,
      rx, rw, rwBase, FY, VX, VY, PCX, PCY, CX, CY, CCX, CCY, campR: R,
      buildings, fires, props, trees,
      fields: fieldTiles.map((i) => ({ i, x: i % N, y: (i / N) | 0, rank: harvestRank.get(i), v: (i * 7) % 3 })),
      spots, landing, council: council ? council.id : -1,
      households, hhById,
      bisonRange: { x0: 3, x1: Math.max(8, CX - 9), y0: 8, y1: N - 8 },
      refreshCost,
    };
    W.isWalk = (x, y) => x >= 0 && y >= 0 && x < N && y < N && cost[y * N + x] !== Infinity;
    return W;
  };
})();
