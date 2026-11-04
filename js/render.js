/* Traditions Matter — isometric renderer: terrain texture, depth-sorted
   objects, smoke, weather, day and night lighting with firelight, picking
   and the minimap. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U, T } = TM;
  const S = TM.Sprites, F = TM.Figures;
  // the land fades into a seasonal haze at the edge of the map
  const HAZE = ['#33402a', '#3b4029', '#41311f', '#8d98a3'];

  // ground palettes by season: spring, summer, autumn, winter
  const PAL = [
    { pA: '#7f9a4c', pB: '#95ac58', fA: '#58783a', fB: '#4a6832', field: '#5e432c', vill: '#8b7154', camp: '#879453', path: '#957a5b', bank: '#a59472', marsh: '#5b7646', sh: '#6e9690', dp: '#2c5a68', ford: '#8d8f7a' },
    { pA: '#a0a55a', pB: '#8b9b4b', fA: '#4a6a32', fB: '#3e5d2a', field: '#634a30', vill: '#927657', camp: '#9a9858', path: '#9b7f5f', bank: '#a99770', marsh: '#567642', sh: '#5f8f8a', dp: '#285664', ford: '#8f8f78' },
    { pA: '#a97a46', pB: '#b98f56', fA: '#7a5a34', fB: '#8b6a3b', field: '#6f5236', vill: '#91765a', camp: '#a5835a', path: '#9b7f61', bank: '#a48e6c', marsh: '#87784a', sh: '#628a88', dp: '#2a5360', ford: '#8d8b76' },
    { pA: '#e7edf2', pB: '#dce4eb', fA: '#d6dee6', fB: '#ccd5df', field: '#e2e7ec', vill: '#cbc4b9', camp: '#d6d8d6', path: '#bdb2a3', bank: '#dde3e8', marsh: '#d2dad6', sh: '#9db9c4', dp: '#3a5e6c', ford: '#b8c4c8' },
  ].map((p) => {
    const o = {};
    for (const k in p) o[k] = U.hex(p[k]);
    return o;
  });

  const DOORKEY = (b) => (!b.door ? 'E' : b.door.dx === 1 ? 'E' : b.door.dy === 1 ? 'S' : b.door.dx === -1 ? 'W' : 'N');

  class Renderer {
    constructor(canvas, world, sim, gfx) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.W = world;
      this.sim = sim;
      this.cam = { x: 0, y: 0, z: 1.15 };
      this.season = -1;
      this.particles = [];
      this.precip = [];
      this.flash = 0;
      this.hover = null;
      this.selected = null;
      this.drawn = [];
      this.time = 0;
      this.k = 0;
      this.tex = document.createElement('canvas');
      this.lightCv = document.createElement('canvas');
      this.setGraphics(gfx);
      this.buildStatics();
      this.resize();
      this.centerOn(world.PCX, world.PCY);
    }

    setGraphics(g) {
      this.gfx = Object.assign({}, g);
      S.setQuality(g.quality);
      const k = g.quality === 'low' ? 4 : g.quality === 'high' ? 8 : 6;
      this.dprCap = g.quality === 'low' ? 1 : 2;
      this.pmax = g.quality === 'low' ? 60 : g.quality === 'high' ? 520 : 280;
      if (k !== this.k) {
        this.k = k;
        this.buildTerrainData();
        this.season = -1;
      }
      this.resize();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap || 2);
      const r = this.cv.getBoundingClientRect();
      this.vw = Math.max(1, r.width);
      this.vh = Math.max(1, r.height);
      this.dpr = dpr;
      this.cv.width = Math.round(this.vw * dpr);
      this.cv.height = Math.round(this.vh * dpr);
      this.lightCv.width = Math.ceil(this.vw / 2);
      this.lightCv.height = Math.ceil(this.vh / 2);
    }

    // ---------------------------------------------------------------- camera
    centerOn(x, y) {
      this.cam.x = (x - y) * 32;
      this.cam.y = (x + y) * 16;
      this.clampCam();
    }
    clampCam() {
      const N = this.W.N;
      this.cam.x = U.clamp(this.cam.x, -N * 32 + 200, N * 32 - 200);
      this.cam.y = U.clamp(this.cam.y, 150, N * 32 - 150);
      this.cam.z = U.clamp(this.cam.z, 0.35, 2.8);
    }
    toScreen(x, y, out) {
      const z = this.cam.z;
      const sx = ((x - y) * 32 - this.cam.x) * z + this.vw / 2;
      const sy = ((x + y) * 16 - this.cam.y) * z + this.vh / 2;
      if (out) { out[0] = sx; out[1] = sy; return out; }
      return [sx, sy];
    }
    toTile(sx, sy) {
      const z = this.cam.z;
      const ix = (sx - this.vw / 2) / z + this.cam.x, iy = (sy - this.vh / 2) / z + this.cam.y;
      return [(ix / 32 + iy / 16) / 2, (iy / 16 - ix / 32) / 2];
    }
    zoomAt(sx, sy, f) {
      const before = this.toTile(sx, sy);
      this.cam.z = U.clamp(this.cam.z * f, 0.35, 2.8);
      const after = this.toTile(sx, sy);
      this.cam.x += ((before[0] - before[1]) - (after[0] - after[1])) * 32;
      this.cam.y += ((before[0] + before[1]) - (after[0] + after[1])) * 16;
      this.clampCam();
    }

    // ---------------------------------------------------------------- terrain
    buildTerrainData() {
      const W = this.W, N = W.N, k = this.k, M = N * k, n = N * N;
      const fieldM = new Float32Array(n), villM = new Float32Array(n), campM = new Float32Array(n), pathM = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = W.type[i];
        const b = W.occ[i] >= 0 ? W.buildings[W.occ[i]] : null;
        const x = (i % N) + 0.5, y = ((i / N) | 0) + 0.5;
        fieldM[i] = t === T.FIELD || (b && b.type === 'platform') ? 1 : 0;
        // trampled earth: bare at the plaza and around lodges, grassy in between
        const dp = Math.hypot(x - W.PCX, y - W.PCY), dc = Math.hypot(x - W.CCX, y - W.CCY);
        villM[i] = t === T.VILLAGE ? 0.28 : 0;
        if (t === T.VILLAGE || t === T.PRAIRIE || t === T.FOREST) villM[i] = Math.max(villM[i], 1 - U.smooth(4.2, 6.2, dp));
        campM[i] = t === T.CAMP ? 0.3 : 0;
        if (t !== T.WATER && t !== T.SHALLOW) campM[i] = Math.max(campM[i], 0.75 * (1 - U.smooth(W.campR - 1.5, W.campR + 0.5, dc)));
        pathM[i] = W.path[i] ? 1 : 0;
      }
      for (const b of W.buildings) {
        if (b.type === 'platform') continue;
        const tgt = b.band === 'camp' ? campM : villM;
        for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
          if (x < 0 || y < 0 || x >= N || y >= N) continue;
          const i = y * N + x, t = W.type[i];
          if (t === T.WATER || t === T.SHALLOW || t === T.FIELD) continue;
          tgt[i] = Math.max(tgt[i], 0.8);
        }
      }
      for (const f of W.fires) {
        const tgt = Math.hypot(f.x - W.CCX, f.y - W.CCY) < 12 ? campM : villM;
        const i = Math.floor(f.y) * N + Math.floor(f.x);
        tgt[i] = 1;
      }
      const blur = (g, keep) => {
        const o = new Float32Array(n);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          let s = 0, c = 0;
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const xx = x + ox, yy = y + oy;
            if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
            s += g[yy * N + xx]; c++;
          }
          o[y * N + x] = g[y * N + x] * keep + (s / c) * (1 - keep);
        }
        return o;
      };
      const vB = blur(blur(villM, 0.3), 0.3), cB = blur(blur(campM, 0.3), 0.3), pB = blur(pathM, 0.55), fB = blur(fieldM, 0.7);
      const bil = (g, x, y) => {
        const u = U.clamp(x - 0.5, 0, N - 1.001), v = U.clamp(y - 0.5, 0, N - 1.001);
        const i0 = Math.floor(u), j0 = Math.floor(v), fu = u - i0, fv = v - j0;
        const a = g[j0 * N + i0], b = g[j0 * N + i0 + 1], c = g[(j0 + 1) * N + i0], d = g[(j0 + 1) * N + i0 + 1];
        return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
      };
      const nz = TM.makeNoise(W.seed + 555);
      const len = M * M;
      const td = {
        M, dd: new Float32Array(len), wf: new Uint8Array(len), field: new Uint8Array(len), vill: new Uint8Array(len),
        camp: new Uint8Array(len), path: new Uint8Array(len), marsh: new Uint8Array(len), n1: new Uint8Array(len),
        n2: new Uint8Array(len), shade: new Int8Array(len), edge: new Uint8Array(len), ford: new Uint8Array(len),
        fx: new Uint8Array(len),
      };
      for (let v = 0; v < M; v++) {
        const ty = (v + 0.5) / k;
        const r = W.rx(ty), w = W.rw(ty);
        const ford = Math.abs(ty - W.FY) < 1.6 ? 1 : 0;
        for (let u = 0; u < M; u++) {
          const tx = (u + 0.5) / k, i = v * M + u;
          td.dd[i] = w / 2 - Math.abs(tx - r);
          td.wf[i] = bil(W.wf, tx, ty) * 255;
          td.field[i] = bil(fB, tx, ty) * 255;
          td.vill[i] = bil(vB, tx, ty) * 255;
          td.camp[i] = bil(cB, tx, ty) * 255;
          td.path[i] = bil(pB, tx, ty) * 255;
          td.marsh[i] = bil(W.marsh, tx, ty) * 255;
          td.n1[i] = nz.fbm(tx * 0.35, ty * 0.35, 3) * 255;
          td.n2[i] = TM.hash2(u, v, 7) * 255;
          const ad1 = Math.abs(tx + 0.5 - r), ad0 = Math.abs(tx - 0.5 - r);
          const h1 = U.smooth(0, 14, ad1) * 0.8 + nz.fbm((tx + 0.5) * 0.08, ty * 0.08, 2) * 0.9;
          const h0 = U.smooth(0, 14, ad0) * 0.8 + nz.fbm((tx - 0.5) * 0.08, ty * 0.08, 2) * 0.9;
          td.shade[i] = U.clamp((h1 - h0) * 900, -127, 127);
          td.edge[i] = Math.min(255, Math.min(tx, ty, N - tx, N - ty) * 42);
          td.ford[i] = ford;
          const fu = tx - Math.floor(tx), fv = ty - Math.floor(ty);
          td.fx[i] = ((-Math.cos(4 * Math.PI * fu)) * (-Math.cos(4 * Math.PI * fv)) * 0.5 + 0.5) * 255;
        }
      }
      this.td = td;
      this.tex.width = M;
      this.tex.height = M;
      // water tiles for shimmer
      this.waterTiles = [];
      for (let i = 0; i < n; i++) if (W.type[i] === T.WATER) this.waterTiles.push([(i % N) + 0.5, ((i / N) | 0) + 0.5, TM.hash2(i, 3, 9)]);
    }

    paintTerrain(s) {
      const td = this.td, M = td.M, len = M * M;
      const ctx = this.tex.getContext('2d');
      const img = ctx.createImageData(M, M);
      const d = img.data;
      const P = PAL[s];
      const BGc = U.hex(HAZE[s]);
      const sm = (e0, e1, x) => { const t = x <= e0 ? 0 : x >= e1 ? 1 : (x - e0) / (e1 - e0); return t * t * (3 - 2 * t); };
      for (let i = 0; i < len; i++) {
        const n1 = td.n1[i] / 255, n2 = td.n2[i] / 255;
        let r, g, b, t;
        // prairie base
        t = sm(0.3, 0.7, n1);
        r = P.pA[0] + (P.pB[0] - P.pA[0]) * t; g = P.pA[1] + (P.pB[1] - P.pA[1]) * t; b = P.pA[2] + (P.pB[2] - P.pA[2]) * t;
        // forest floor
        t = sm(0.22, 0.75, td.wf[i] / 255);
        if (t > 0) {
          const q = n1;
          const fr = P.fA[0] + (P.fB[0] - P.fA[0]) * q, fg = P.fA[1] + (P.fB[1] - P.fA[1]) * q, fb = P.fA[2] + (P.fB[2] - P.fA[2]) * q;
          r += (fr - r) * t; g += (fg - g) * t; b += (fb - b) * t;
        }
        t = sm(0.25, 0.65, td.marsh[i] / 255);
        if (t > 0) { r += (P.marsh[0] - r) * t; g += (P.marsh[1] - g) * t; b += (P.marsh[2] - b) * t; }
        t = sm(0.12, 0.7, td.camp[i] / 255 + (n2 - 0.5) * 0.18 + (n1 - 0.5) * 0.25) * 0.9;
        if (t > 0) { r += (P.camp[0] - r) * t; g += (P.camp[1] - g) * t; b += (P.camp[2] - b) * t; }
        t = sm(0.15, 0.7, td.vill[i] / 255 + (n2 - 0.5) * 0.16 + (n1 - 0.5) * 0.3);
        if (t > 0) { r += (P.vill[0] - r) * t; g += (P.vill[1] - g) * t; b += (P.vill[2] - b) * t; }
        t = sm(0.4, 0.6, td.field[i] / 255 + (n2 - 0.5) * 0.08);
        if (t > 0) {
          let fr = P.field[0], fg = P.field[1], fb = P.field[2];
          if (s !== 3) { const m = (td.fx[i] / 255 - 0.5) * 22; fr += m; fg += m * 0.8; fb += m * 0.6; }
          r += (fr - r) * t; g += (fg - g) * t; b += (fb - b) * t;
        }
        t = sm(0.33, 0.6, td.path[i] / 255 + (n2 - 0.5) * 0.18);
        if (t > 0) { r += (P.path[0] - r) * t; g += (P.path[1] - g) * t; b += (P.path[2] - b) * t; }
        const dd = td.dd[i];
        if (dd > -1.2) {
          t = sm(-1.15, -0.15, dd + (n1 - 0.5) * 0.5);
          r += (P.bank[0] - r) * t; g += (P.bank[1] - g) * t; b += (P.bank[2] - b) * t;
        }
        if (dd > 0) {
          t = sm(0, 1.5, dd);
          r = P.sh[0] + (P.dp[0] - P.sh[0]) * t; g = P.sh[1] + (P.dp[1] - P.sh[1]) * t; b = P.sh[2] + (P.dp[2] - P.sh[2]) * t;
          if (td.ford[i]) {
            const f = 0.55 * (1 - t * 0.4);
            r += (P.ford[0] - r) * f; g += (P.ford[1] - g) * f; b += (P.ford[2] - b) * f;
          }
          if (s === 3) {
            const ice = sm(0.9, 0.15, dd);
            r += (232 - r) * ice; g += (240 - g) * ice; b += (245 - b) * ice;
          } else if (dd < 0.14) {
            const f = 0.3 * (1 - dd / 0.14);
            r += (225 - r) * f; g += (232 - g) * f; b += (222 - b) * f;
          }
          const f = 1 + (n1 - 0.5) * 0.08;
          r *= f; g *= f; b *= f;
        } else {
          const f = 1 + td.shade[i] / 127 * 0.11 + (n2 - 0.5) * (s === 3 ? 0.03 : 0.07);
          r *= f; g *= f; b *= f;
        }
        // fade into the background at the map edge
        t = sm(0, 1, td.edge[i] / 255);
        r = BGc[0] + (r - BGc[0]) * t; g = BGc[1] + (g - BGc[1]) * t; b = BGc[2] + (b - BGc[2]) * t;
        const o = i * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      this.minimapDirty = true;
    }

    // ---------------------------------------------------------------- static objects
    buildStatics() {
      const W = this.W, out = [];
      const add = (o) => {
        o.ix = (o.x - o.y) * 32;
        o.iy = (o.x + o.y) * 16;
        o.depth = o.depth !== undefined ? o.depth : o.x + o.y;
        out.push(o);
      };
      for (const t of W.trees) add({ k: 'tree', x: t.x, y: t.y, o: t, up: 130 * t.s, side: 50 * t.s });
      for (const p of W.props) {
        if (p.kind === 'weir') { add({ k: 'weir', x: p.x, y: p.y, o: p, up: 20, side: 80, depth: p.x + p.y - 1 }); continue; }
        const big = p.kind === 'canoe' || p.kind === 'travois';
        add({ k: 'prop', x: p.x, y: p.y, o: p, up: big ? 30 : 40, side: big ? 60 : 24, small: p.kind === 'grass' || p.kind === 'flowers' });
      }
      for (const f of W.fields) add({ k: 'field', x: f.x + 0.5, y: f.y + 0.5, o: f, up: 50, side: 40 });
      for (const b of W.buildings) {
        if (b.type === 'bigfire' || b.type === 'campfire') continue;
        const up = { longhouse: 120, council: 125, wigwam: 60, tipi: 90, platform: 90, crib: 65 }[b.type] || 60;
        const side = { longhouse: 150, council: 150 }[b.type] || 60;
        add({ k: 'bld', x: b.cx, y: b.cy, o: b, up, side });
      }
      for (const f of W.fires) add({ k: 'fire', x: f.x, y: f.y, o: f, up: 40, side: 40 });
      out.sort((a, b) => a.depth - b.depth);
      this.statics = out;
      // smoke emitters
      const em = [];
      for (const b of W.buildings) {
        if (b.type === 'wigwam') em.push({ x: b.cx, y: b.cy, z: 33, lodge: true, b });
        else if (b.type === 'tipi') em.push({ x: b.cx, y: b.cy, z: 62, lodge: true, b });
        else if (b.type === 'longhouse' || b.type === 'council') {
          const offs = b.type === 'council' ? [-1, 1] : [-1.7, 0, 1.7];
          const zz = b.type === 'council' ? 44 : 33;
          for (const o of offs) em.push({ x: b.cx + (b.orient === 'x' ? o : 0), y: b.cy + (b.orient === 'y' ? o : 0), z: zz, lodge: true, b });
        }
      }
      for (const f of W.fires) em.push({ x: f.x, y: f.y, z: 6, fire: f });
      this.emitters = em;
    }

    spriteFor(o, s) {
      const sim = this.sim;
      switch (o.k) {
        case 'tree': return S.tree(o.o.kind, s, o.o.v);
        case 'field': return S.field(sim.fieldStage(o.o.rank), o.o.v);
        case 'prop': {
          const p = o.o;
          switch (p.kind) {
            case 'woodpile': return S.woodpile(s);
            case 'pots': return S.pots(s);
            case 'canoe': return S.canoe(!!p.flip);
            case 'travois': return S.travois(s);
            case 'peggedhide': return S.peggedhide(s);
            default: return S[p.kind] ? S[p.kind](s, p.v || 0) : null;
          }
        }
        case 'bld': {
          const b = o.o;
          switch (b.type) {
            case 'wigwam': return S.wigwam(s, b.variant || 0, DOORKEY(b));
            case 'longhouse': return S.longhouse(s, b.variant || 0, b.orient === 'y');
            case 'council': return S.council(s, b.orient === 'y');
            case 'tipi': return S.tipi(s, b.variant || 0);
            case 'sweat': return S.sweat(s, DOORKEY(b));
            case 'crib': return S.crib(s, b.variant || 0);
            case 'pit': return S.pit(s);
            case 'rack': return S.rack(s, b.load || 'meat', b.orient === 'y');
            case 'fishrack': return S.rack(s, 'fish', b.orient === 'y');
            case 'hideframe': return S.hideframe(s, b.orient === 'y');
            case 'platform': return S.platform(s);
            default: return null;
          }
        }
        default: return null;
      }
    }

    // ---------------------------------------------------------------- frame
    draw(dt) {
      this.time += dt;
      const ctx = this.ctx, sim = this.sim, cam = this.cam, z = cam.z, s = sim.c.season;
      const vw = this.vw, vh = this.vh, dpr = this.dpr;
      if (s !== this.season) { this.season = s; this.paintTerrain(s); }
      if (this.follow && this.selected && this.selected.kind === 'person') {
        const p = this.selected.obj;
        if (!p.dead) {
          const tx = (p.x - p.y) * 32, ty = (p.x + p.y) * 16;
          cam.x += (tx - cam.x) * Math.min(1, dt * 4);
          cam.y += (ty - cam.y) * Math.min(1, dt * 4);
          this.clampCam();
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = HAZE[s];
      ctx.fillRect(0, 0, vw, vh);
      // terrain
      const k = this.k;
      ctx.setTransform((dpr * 32 * z) / k, (dpr * 16 * z) / k, (-dpr * 32 * z) / k, (dpr * 16 * z) / k, dpr * (vw / 2 - cam.x * z), dpr * (vh / 2 - cam.y * z));
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.tex, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawWater(ctx, s);

      // visible static objects
      const L = cam.x - vw / 2 / z, R = cam.x + vw / 2 / z, Tp = cam.y - vh / 2 / z, B = cam.y + vh / 2 / z;
      const vis = [];
      const skipSmall = z < 0.55 || (this.gfx.quality === 'low' && z < 1.4);
      for (const o of this.statics) {
        if (o.ix + o.side < L || o.ix - o.side > R || o.iy + 30 < Tp || o.iy - o.up > B) continue;
        if (skipSmall && o.small) continue;
        vis.push(o);
      }
      // dynamic objects
      const dyn = [];
      const infants = new Set();
      for (const p of sim.people) if (p.role === 'infant' && p.carrier) infants.add(p.carrier);
      this.infantCarriers = infants;
      const inView = (x, y, m) => {
        const ix = (x - y) * 32, iy = (x + y) * 16;
        return !(ix + m < L || ix - m > R || iy + 20 < Tp || iy - 60 > B);
      };
      for (const p of sim.people) {
        if (p.inside || p.role === 'infant' || !inView(p.x, p.y, 30)) continue;
        dyn.push({ k: 'person', o: p, depth: this.agentDepth(p.x, p.y) });
      }
      for (const d of sim.dogs) if (inView(d.x, d.y, 20)) dyn.push({ k: 'dog', o: d, depth: this.agentDepth(d.x, d.y) });
      for (const g of sim.deerGroups) for (const a of g.members) if (inView(a.x, a.y, 30)) dyn.push({ k: 'deer', o: a, depth: a.x + a.y });
      for (const a of sim.bison) if (inView(a.x, a.y, 40)) dyn.push({ k: 'bison', o: a, depth: a.x + a.y });
      dyn.sort((a, b) => a.depth - b.depth);

      // merge and draw
      this.drawn.length = 0;
      let i = 0, j = 0;
      const sp = [0, 0];
      while (i < vis.length || j < dyn.length) {
        let o;
        if (j >= dyn.length || (i < vis.length && vis[i].depth <= dyn[j].depth)) o = vis[i++];
        else o = dyn[j++];
        this.drawObj(ctx, o, s, z, sp);
      }
      this.updateParticles(dt, s);
      this.drawParticles(ctx, z);
      this.drawSelectionMarker(ctx, z);
      this.drawLighting(ctx, s);
      if (this.gfx.weather) this.drawWeather(ctx, dt, s);
      this.drawLabels(ctx, z);
    }

    // agents next to a building sort in front of or behind it correctly
    agentDepth(x, y) {
      const W = this.W, N = W.N;
      let d = x + y;
      if (!Number.isFinite(d)) return 0;
      const tx = Math.floor(x), ty = Math.floor(y);
      let seen = -1, seen2 = -1;
      for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
        const xx = tx + ox, yy = ty + oy;
        if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
        const id = W.occ[yy * N + xx];
        if (id < 0 || id === seen || id === seen2) continue;
        seen2 = seen; seen = id;
        const b = W.buildings[id];
        if (b.w * b.h < 2 && b.type !== 'crib' && b.type !== 'platform') continue;
        const bd = b.cx + b.cy;
        const fx = x - (b.x + b.w), fy = y - (b.y + b.h);
        const bx = b.x - x, by = b.y - y;
        let front = fx >= 0 || fy >= 0;
        if (front && (bx >= 0 || by >= 0)) front = fx + fy > bx + by;
        if (front) d = Math.max(d, bd + 0.02);
        else d = Math.min(d, bd - 0.02);
      }
      return d;
    }

    blit(ctx, spr, sx, sy, sc) {
      const k = this.cam.z * (sc || 1);
      const x = sx - spr.ax * k, y = sy - spr.ay * k, w = spr.w * k, h = spr.h * k;
      ctx.drawImage(spr.c, x, y, w, h);
      return [x, y, x + w, y + h];
    }

    drawObj(ctx, o, s, z, sp) {
      const sim = this.sim;
      switch (o.k) {
        case 'person': {
          const p = o.o;
          this.toScreen(p.x, p.y, sp);
          const sel = this.selected && this.selected.obj === p;
          const hov = this.hover && this.hover.obj === p;
          if (sel || hov) {
            ctx.strokeStyle = sel ? 'rgba(255,214,140,0.95)' : 'rgba(255,240,210,0.6)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(sp[0], sp[1], 9 * z, 4.5 * z, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          F.drawPerson(ctx, p, sp[0], sp[1], z, { season: s, infant: this.infantCarriers.has(p.id) });
          const h = 25 * p.look.h * z;
          this.drawn.push({ kind: 'person', obj: p, bb: [sp[0] - 6 * z, sp[1] - h - 2, sp[0] + 6 * z, sp[1] + 3] });
          return;
        }
        case 'dog':
          this.toScreen(o.o.x, o.o.y, sp);
          F.drawDog(ctx, o.o, sp[0], sp[1], z, this.time);
          return;
        case 'deer':
          this.toScreen(o.o.x, o.o.y, sp);
          F.drawDeer(ctx, o.o, sp[0], sp[1], z, s);
          return;
        case 'bison':
          this.toScreen(o.o.x, o.o.y, sp);
          F.drawBison(ctx, o.o, sp[0], sp[1], z, s);
          return;
        case 'fire': {
          const f = o.o;
          this.toScreen(f.x, f.y, sp);
          const size = f.size;
          const ring = S.firering(Math.min(2.2, size), f.kind === 'stones' ? 'stones' : 'fire', s);
          this.blit(ctx, ring, sp[0], sp[1]);
          const hour = sim.hour;
          const evening = hour > 17 || hour < 7;
          const strength = f.kind === 'big' ? (evening ? 1 : 0.55) : f.kind === 'stones' ? 0.5 : (Math.abs(hour - 12) < 1.3 || Math.abs(hour - 18) < 1.3 ? 0.9 : 0.4);
          if (f.kind === 'pot') this.blit(ctx, S.pot(), sp[0] + 3 * z, sp[1] - 1.5 * z, 0.5);
          else if (f.kind === 'tripod') this.blit(ctx, S.tripod(), sp[0], sp[1] - 1 * z, 0.85);
          F.drawFlames(ctx, sp[0] - (f.kind === 'pot' ? 1.5 * z : 0), sp[1] - 0.5 * z, z, Math.min(2.2, size) * 0.8, this.time, f.x * 3.1 + f.y, strength);
          if (f.bld !== undefined) {
            const b = this.W.buildings[f.bld];
            if (b && (b.type === 'bigfire' || b.type === 'campfire')) this.drawn.push({ kind: 'bld', obj: b, bb: [sp[0] - 18 * z, sp[1] - 16 * z, sp[0] + 18 * z, sp[1] + 8 * z] });
          }
          return;
        }
        case 'weir':
          this.drawWeir(ctx, o.o, z);
          return;
        default: {
          const spr = this.spriteFor(o, s);
          if (!spr) return;
          this.toScreen(o.x, o.y, sp);
          if (o.k === 'bld') {
            const b = o.o;
            const sel = this.selected && this.selected.obj === b, hov = this.hover && this.hover.obj === b;
            if (sel || hov) this.drawFootprint(ctx, b, sel);
            const bb = this.blit(ctx, spr, sp[0], sp[1]);
            this.drawn.push({ kind: 'bld', obj: b, bb });
          } else {
            this.blit(ctx, spr, sp[0], sp[1], o.k === 'tree' ? o.o.s : 1);
          }
        }
      }
    }

    drawFootprint(ctx, b, sel) {
      const pts = [this.toScreen(b.x, b.y), this.toScreen(b.x + b.w, b.y), this.toScreen(b.x + b.w, b.y + b.h), this.toScreen(b.x, b.y + b.h)];
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = sel ? 'rgba(255,214,140,0.22)' : 'rgba(255,240,210,0.12)';
      ctx.fill();
      ctx.strokeStyle = sel ? 'rgba(255,214,140,0.95)' : 'rgba(255,240,210,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    drawWeir(ctx, p, z) {
      const W = this.W;
      const half = p.w / 2;
      const pts = [];
      const a = [W.rx(p.y - 1.4) - half * 0.95, p.y - 1.4], apex = [p.x, p.y + 0.4], b = [W.rx(p.y - 1.4) + half * 0.95, p.y - 1.4];
      for (const [s, e] of [[a, apex], [apex, b]]) {
        for (let t = 0; t <= 1.0001; t += 0.12) pts.push([s[0] + (e[0] - s[0]) * t, s[1] + (e[1] - s[1]) * t]);
      }
      const sc = pts.map((q) => this.toScreen(q[0], q[1]));
      ctx.strokeStyle = 'rgba(120,96,64,0.85)';
      ctx.lineWidth = 2.2 * z;
      ctx.beginPath();
      sc.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1] - 3 * z) : ctx.moveTo(q[0], q[1] - 3 * z)));
      ctx.stroke();
      ctx.strokeStyle = '#4e3a26';
      ctx.lineWidth = 1.3 * z;
      for (const q of sc) {
        ctx.beginPath();
        ctx.moveTo(q[0], q[1] + 1 * z);
        ctx.lineTo(q[0], q[1] - 7 * z);
        ctx.stroke();
      }
    }

    drawWater(ctx, s) {
      if (s === 3) return;
      const z = this.cam.z, t = this.time;
      const sp = [0, 0];
      ctx.lineWidth = Math.max(0.8, 1.2 * z);
      const vw = this.vw, vh = this.vh;
      for (const w of this.waterTiles) {
        this.toScreen(w[0], w[1], sp);
        if (sp[0] < -40 || sp[0] > vw + 40 || sp[1] < -20 || sp[1] > vh + 20) continue;
        const ph = t * 0.9 + w[2] * 20;
        const a = 0.1 + 0.12 * (Math.sin(ph) * 0.5 + 0.5);
        const off = ((t * 0.35 + w[2]) % 1) - 0.5;
        const x = sp[0] + (-32 * off + (w[2] - 0.5) * 30) * z, y = sp[1] + (16 * off + (w[2] * 7 % 1 - 0.5) * 10) * z;
        ctx.strokeStyle = `rgba(225,238,236,${a})`;
        ctx.beginPath();
        ctx.moveTo(x - 6 * z, y - 1.5 * z);
        ctx.quadraticCurveTo(x, y - 3 * z, x + 6 * z, y - 1.5 * z);
        ctx.stroke();
      }
    }

    // ---------------------------------------------------------------- smoke
    updateParticles(dt, s) {
      const ps = this.particles, sim = this.sim;
      const wind = sim.weather ? sim.weather.wind : 0.3;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;
        if (p.life >= p.max) { ps.splice(i, 1); continue; }
        p.x += (wind * 0.22 + p.vx) * dt;
        p.y += (-wind * 0.12 + p.vy) * dt;
        p.z += p.vz * dt;
        p.vz *= 0.995;
      }
      if (this.gfx.quality === 'low' && ps.length > this.pmax) return;
      const hour = sim.hour;
      const night = hour > 20 || hour < 6.5;
      const lodgeRate = [0.22, 0.06, 0.28, 0.6][s] * (night ? 1.5 : 1) * (this.gfx.quality === 'high' ? 1.4 : this.gfx.quality === 'low' ? 0 : 1);
      const L = this.cam.x - this.vw / 2 / this.cam.z - 100, R = this.cam.x + this.vw / 2 / this.cam.z + 100;
      const Tp = this.cam.y - this.vh / 2 / this.cam.z - 100, B = this.cam.y + this.vh / 2 / this.cam.z + 200;
      for (const e of this.emitters) {
        if (ps.length >= this.pmax) break;
        const ix = (e.x - e.y) * 32, iy = (e.x + e.y) * 16;
        if (ix < L || ix > R || iy < Tp || iy > B) continue;
        const rate = e.lodge ? lodgeRate : 0.9 * Math.min(2, e.fire.size) * (this.gfx.quality === 'low' ? 0.4 : 1);
        if (Math.random() < rate * dt) {
          ps.push({ x: e.x + (Math.random() - 0.5) * 0.15, y: e.y + (Math.random() - 0.5) * 0.15, z: e.z, vx: (Math.random() - 0.5) * 0.05, vy: (Math.random() - 0.5) * 0.05, vz: 9 + Math.random() * 6, life: 0, max: 4 + Math.random() * 3, r: e.lodge ? 2.5 : 1.8 });
        }
      }
    }
    puff(night) {
      const key = night ? 'n' : 'd';
      this.puffs = this.puffs || {};
      if (this.puffs[key]) return this.puffs[key];
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const col = night ? '96,96,108' : '214,208,200';
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${col},1)`);
      gr.addColorStop(0.45, `rgba(${col},0.55)`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      this.puffs[key] = c;
      return c;
    }
    drawParticles(ctx, z) {
      const sp = [0, 0];
      const img = this.puff(this.sim.hour > 20 || this.sim.hour < 6);
      for (const p of this.particles) {
        this.toScreen(p.x, p.y, sp);
        const t = p.life / p.max;
        const a = (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85) * 0.34;
        const r = (p.r + p.life * 2.4) * z * 1.6;
        ctx.globalAlpha = a;
        ctx.drawImage(img, sp[0] - r, sp[1] - p.z * z - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }

    drawSelectionMarker(ctx, z) {
      const sel = this.selected;
      if (!sel || sel.kind !== 'person') return;
      const p = sel.obj;
      if (!p.inside || p.dead) return;
      const sp = this.toScreen(p.x, p.y);
      const a = 0.5 + 0.4 * Math.sin(this.time * 4);
      ctx.strokeStyle = `rgba(255,214,140,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sp[0], sp[1], 12 * z, 6 * z, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ---------------------------------------------------------------- light
    ambient(h, s) {
      const rise = [6.0, 5.4, 6.4, 7.0][s], set = [19.3, 20.1, 18.8, 17.8][s];
      let dark;
      if (h < rise - 1.1 || h > set + 1.3) dark = 1;
      else if (h < rise + 0.8) dark = 1 - U.smooth(rise - 1.1, rise + 0.8, h);
      else if (h > set - 0.6) dark = U.smooth(set - 0.6, set + 1.3, h);
      else dark = 0;
      const warm = Math.min(1, Math.max(0, 1 - Math.abs(h - rise) / 1.4) + Math.max(0, 1 - Math.abs(h - set + 0.2) / 1.5));
      return { dark, warm };
    }

    drawLighting(ctx, s) {
      const sim = this.sim, z = this.cam.z, vw = this.vw, vh = this.vh;
      const amb = this.ambient(sim.hour, s);
      const wk = sim.weather.kind;
      if (wk === 'cloudy' || wk === 'rain' || wk === 'storm' || wk === 'snow') {
        ctx.fillStyle = `rgba(70,78,90,${wk === 'storm' ? 0.24 : wk === 'cloudy' ? 0.08 : 0.15})`;
        ctx.fillRect(0, 0, vw, vh);
      }
      if (amb.warm > 0.02) {
        ctx.globalCompositeOperation = 'multiply';
        const w = amb.warm * (1 - amb.dark * 0.6);
        ctx.fillStyle = U.rgb([255, 255 - 62 * w, 255 - 118 * w]);
        ctx.fillRect(0, 0, vw, vh);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (amb.dark < 0.02) return;
      if (!this.gfx.lighting) {
        ctx.fillStyle = `rgba(14,18,40,${0.5 * amb.dark})`;
        ctx.fillRect(0, 0, vw, vh);
        return;
      }
      const lc = this.lightCv, l = lc.getContext('2d');
      const lw = lc.width, lh = lc.height;
      l.globalCompositeOperation = 'source-over';
      l.clearRect(0, 0, lw, lh);
      l.fillStyle = `rgba(10,14,36,${0.74 * amb.dark})`;
      l.fillRect(0, 0, lw, lh);
      l.globalCompositeOperation = 'destination-out';
      const sp = [0, 0];
      const lights = [];
      const t = this.time;
      for (const f of this.W.fires) {
        this.toScreen(f.x, f.y, sp);
        const big = f.kind === 'big';
        const strength = big ? 1 : f.kind === 'stones' ? 0.45 : 0.7;
        const fl = 0.92 + 0.08 * Math.sin(t * 11 + f.x) * Math.sin(t * 7.3 + f.y);
        const r = (big ? 4.2 : 2.4) * Math.min(2, f.size) * 26 * z * fl;
        if (sp[0] < -r || sp[0] > vw + r || sp[1] < -r || sp[1] > vh + r) continue;
        lights.push([sp[0], sp[1] - 4 * z, r, strength]);
      }
      // warm doorways of occupied lodges at night
      const occupied = new Set();
      for (const p of sim.people) if (p.inside && p.role !== 'infant') { const b = sim.homeOf(p); if (b) occupied.add(b); }
      for (const b of occupied) {
        if (!b.mouth) continue;
        this.toScreen(b.mouth.x, b.mouth.y, sp);
        const r = 1.6 * 26 * z;
        if (sp[0] < -r || sp[0] > vw + r || sp[1] < -r || sp[1] > vh + r) continue;
        lights.push([sp[0], sp[1] - 6 * z, r, 0.45]);
      }
      for (const [x, y, r, a] of lights) {
        const g = l.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, r / 2);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(0.5, `rgba(0,0,0,${a * 0.55})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        l.fillStyle = g;
        l.fillRect(x / 2 - r / 2, y / 2 - r / 2, r, r);
      }
      ctx.drawImage(lc, 0, 0, vw, vh);
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y, r, a] of lights) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8);
        g.addColorStop(0, `rgba(255,150,60,${0.24 * a * amb.dark})`);
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // ---------------------------------------------------------------- weather
    drawWeather(ctx, dt, s) {
      const sim = this.sim, k = sim.weather.kind, vw = this.vw, vh = this.vh;
      const wind = sim.weather.wind;
      const want = k === 'rain' || k === 'storm' ? Math.min(420, (vw * vh) / 5000) * (k === 'storm' ? 1.4 : 1) : k === 'snow' ? Math.min(320, (vw * vh) / 6000) : 0;
      const pr = this.precip;
      while (pr.length < want) pr.push({ x: Math.random() * vw, y: Math.random() * vh, s: Math.random() * 0.6 + 0.7, p: Math.random() * 6 });
      if (pr.length > want) pr.length = Math.floor(want);
      if (k === 'rain' || k === 'storm') {
        ctx.strokeStyle = 'rgba(200,212,230,0.32)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of pr) {
          d.y += 900 * d.s * dt;
          d.x += wind * 160 * dt;
          if (d.y > vh) { d.y -= vh + 20; d.x = Math.random() * vw; }
          if (d.x > vw) d.x -= vw; else if (d.x < 0) d.x += vw;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - wind * 4, d.y - 14 * d.s);
        }
        ctx.stroke();
        if (k === 'storm') {
          if (Math.random() < dt * 0.12) this.flash = 1;
          if (this.flash > 0) {
            ctx.fillStyle = `rgba(235,240,255,${this.flash * 0.45})`;
            ctx.fillRect(0, 0, vw, vh);
            this.flash -= dt * 3;
          }
        }
      } else if (k === 'snow') {
        ctx.fillStyle = 'rgba(250,252,255,0.85)';
        for (const d of pr) {
          d.p += dt;
          d.y += 42 * d.s * dt;
          d.x += (Math.sin(d.p * 1.3) * 18 + wind * 40) * dt;
          if (d.y > vh) { d.y -= vh + 10; d.x = Math.random() * vw; }
          if (d.x > vw) d.x -= vw; else if (d.x < 0) d.x += vw;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 1.2 * d.s + 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (k === 'fog' && sim.hour > 4 && sim.hour < 11.5) {
        const a = 0.32 * (1 - U.smooth(8, 11.5, sim.hour));
        const g = ctx.createLinearGradient(0, 0, 0, vh);
        g.addColorStop(0, `rgba(220,224,226,${a * 0.6})`);
        g.addColorStop(1, `rgba(220,224,226,${a})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, vw, vh);
      }
    }

    // ---------------------------------------------------------------- labels
    drawLabels(ctx, z) {
      const mode = this.gfx.labels;
      const list = [];
      if (this.hover && this.hover.kind === 'person' && mode !== 'off') list.push(this.hover.obj);
      if (this.selected && this.selected.kind === 'person' && !this.selected.obj.inside) list.push(this.selected.obj);
      if (mode === 'always' && z > 0.8) {
        for (const d of this.drawn) if (d.kind === 'person' && list.length < 80) list.push(d.obj);
      }
      if (!list.length) return;
      ctx.font = `600 ${Math.round(11 + (z > 1.6 ? 1 : 0))}px "Alegreya Sans", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const done = new Set();
      for (const p of list) {
        if (done.has(p) || p.inside) continue;
        done.add(p);
        const sp = this.toScreen(p.x, p.y);
        const y = sp[1] - 25 * p.look.h * z - 10;
        const w = ctx.measureText(p.name).width + 10;
        ctx.fillStyle = 'rgba(20,14,10,0.72)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(sp[0] - w / 2, y - 8, w, 16, 8);
        else ctx.rect(sp[0] - w / 2, y - 8, w, 16);
        ctx.fill();
        ctx.fillStyle = '#f2e6cf';
        ctx.fillText(p.name, sp[0], y + 0.5);
      }
    }

    // ---------------------------------------------------------------- picking
    pick(mx, my) {
      for (let i = this.drawn.length - 1; i >= 0; i--) {
        const d = this.drawn[i];
        const b = d.bb;
        const pad = d.kind === 'person' ? 3 : 0;
        if (mx >= b[0] - pad && mx <= b[2] + pad && my >= b[1] - pad && my <= b[3] + pad) {
          if (d.kind === 'bld') {
            // ignore the transparent corners of large sprites
            const ob = d.obj;
            const t = this.toTile(mx, my);
            const nearFoot = t[0] > ob.x - 1.2 && t[0] < ob.x + ob.w + 1.2 && t[1] > ob.y - 1.2 && t[1] < ob.y + ob.h + 1.2;
            const cy = (b[1] + b[3]) / 2;
            if (!nearFoot && my > cy) continue;
          }
          return { kind: d.kind, obj: d.obj };
        }
      }
      return null;
    }

    // ---------------------------------------------------------------- minimap
    drawMinimap(cv) {
      const W = this.W, N = W.N, sim = this.sim;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      const w = Math.max(1, r.width), h = Math.max(1, r.height);
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const ctx = cv.getContext('2d');
      const sc = Math.min(w / (N * 64), h / (N * 32)) * 0.98;
      const ox = w / 2, oy = (h - N * 32 * sc) / 2;
      this.mm = { sc, ox, oy };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const k = this.k;
      ctx.setTransform((dpr * 32 * sc) / k, (dpr * 16 * sc) / k, (-dpr * 32 * sc) / k, (dpr * 16 * sc) / k, dpr * ox, dpr * oy);
      ctx.drawImage(this.tex, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pt = (x, y) => [ox + (x - y) * 32 * sc, oy + (x + y) * 16 * sc];
      ctx.fillStyle = '#5a3f2a';
      for (const b of W.buildings) {
        if (b.type !== 'wigwam' && b.type !== 'longhouse' && b.type !== 'tipi' && b.type !== 'council') continue;
        const q = pt(b.cx, b.cy);
        ctx.fillRect(q[0] - 1.5, q[1] - 1, 3, 2);
      }
      ctx.fillStyle = '#f4e3c0';
      for (const p of sim.people) {
        if (p.inside || p.role === 'infant') continue;
        const q = pt(p.x, p.y);
        ctx.fillRect(q[0] - 0.6, q[1] - 0.6, 1.3, 1.3);
      }
      ctx.fillStyle = '#2a1d14';
      for (const a of sim.bison) { const q = pt(a.x, a.y); ctx.fillRect(q[0] - 0.7, q[1] - 0.7, 1.5, 1.5); }
      // viewport
      const c = [this.toTile(0, 0), this.toTile(this.vw, 0), this.toTile(this.vw, this.vh), this.toTile(0, this.vh)].map((t) => pt(t[0], t[1]));
      ctx.strokeStyle = 'rgba(255,236,200,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c[0][0], c[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(c[i][0], c[i][1]);
      ctx.closePath();
      ctx.stroke();
    }
    minimapToTile(mx, my) {
      const m = this.mm;
      if (!m) return null;
      const ix = (mx - m.ox) / m.sc, iy = (my - m.oy) / m.sc;
      return [(ix / 32 + iy / 16) / 2, (iy / 16 - ix / 32) / 2];
    }
  }

  TM.Renderer = Renderer;
})();
