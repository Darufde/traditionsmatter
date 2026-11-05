/* Traditions Matter — core: namespace, constants, random numbers, noise,
   pathfinding and settings storage. Plain script (no modules) so the game
   runs straight from the file system as well as from a web server. */
(function () {
  'use strict';
  const TM = (window.TM = window.TM || {});

  // ---------------------------------------------------------------- constants
  TM.C = {
    TW: 64,              // iso tile width in px (zoom 1)
    TH: 32,              // iso tile height in px
    MAP: 120,             // map is MAP x MAP tiles
    DAY_SECONDS: 240,    // real seconds per in-game day at 1x speed
    DAYS_PER_MOON: 4,
    MOONS_PER_SEASON: 3,
    WALK: 1.35,          // walking speed, tiles per real second at 1x
  };
  TM.C.DAYS_PER_SEASON = TM.C.DAYS_PER_MOON * TM.C.MOONS_PER_SEASON;
  TM.C.DAYS_PER_YEAR = TM.C.DAYS_PER_SEASON * 4;
  TM.C.TILES_PER_HOUR = TM.C.WALK * TM.C.DAY_SECONDS / 24;

  TM.SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
  TM.MOONS = [
    ['Sap Moon', 'Sprouting Moon', 'Planting Moon'],
    ['Berry Moon', 'Thunder Moon', 'Tall Corn Moon'],
    ['Harvest Moon', 'Falling Leaf Moon', 'Frost Moon'],
    ['Long Night Moon', 'Hard Cold Moon', 'Hunger Moon'],
  ];

  TM.DIFFICULTY = {
    gentle:   { label: 'Gentle',   prod: 1.2,  cons: 0.9,  illness: 0.6, stores: 1.3,  wood: 0.85 },
    balanced: { label: 'Balanced', prod: 1.0,  cons: 1.0,  illness: 1.0, stores: 1.0,  wood: 1.0 },
    harsh:    { label: 'Harsh',    prod: 0.9,  cons: 1.05, illness: 1.5, stores: 0.75, wood: 1.15 },
  };

  // ---------------------------------------------------------------- math utils
  const U = (TM.U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    smooth(e0, e1, x) {
      const t = U.clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    },
    dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
    hex(h) {
      const n = parseInt(h.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },
    mix(a, b, t) {
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    },
    rgb(c, a) {
      const r = Math.round(U.clamp(c[0], 0, 255)), g = Math.round(U.clamp(c[1], 0, 255)), b = Math.round(U.clamp(c[2], 0, 255));
      return a === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
    },
    // lighten (f>1) or darken (f<1) a hex colour, returns css string
    shade(h, f, a) {
      const c = U.hex(h);
      if (f >= 1) {
        const t = f - 1;
        return U.rgb([c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t], a);
      }
      return U.rgb([c[0] * f, c[1] * f, c[2] * f], a);
    },
    fmt(n) {
      return Math.round(n).toLocaleString('en-US');
    },
  });

  // ---------------------------------------------------------------- random
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  class RNG {
    constructor(seed) {
      this.f = mulberry32(seed >>> 0);
    }
    next() { return this.f(); }
    range(a, b) { return a + (b - a) * this.f(); }
    int(a, b) { return Math.floor(a + (b - a + 1) * this.f()); } // inclusive
    pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
    chance(p) { return this.f() < p; }
    gauss(m = 0, s = 1) {
      let u = 0;
      while (!u) u = this.f();
      return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.f());
    }
    weighted(entries) { // [[item, weight], ...]
      let tot = 0;
      for (const e of entries) tot += Math.max(0, e[1]);
      if (tot <= 0) return entries[0][0];
      let r = this.f() * tot;
      for (const e of entries) {
        r -= Math.max(0, e[1]);
        if (r <= 0) return e[0];
      }
      return entries[entries.length - 1][0];
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.f() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
  }
  TM.RNG = RNG;
  TM.hashStr = function (s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  // cheap deterministic hash -> [0,1)
  TM.hash2 = function (x, y, s) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------------------------------------------------------------- value noise
  TM.makeNoise = function (seed) {
    const rng = new RNG(seed);
    const perm = new Uint8Array(512);
    const p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    rng.shuffle(p);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const vals = new Float32Array(256);
    for (let i = 0; i < 256; i++) vals[i] = rng.next();
    function n2(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const x0 = ix & 255, y0 = iy & 255, x1 = (ix + 1) & 255, y1 = (iy + 1) & 255;
      const a = vals[perm[perm[x0] + y0]], b = vals[perm[perm[x1] + y0]];
      const c = vals[perm[perm[x0] + y1]], d = vals[perm[perm[x1] + y1]];
      const top = a + (b - a) * ux, bot = c + (d - c) * ux;
      return top + (bot - top) * uy;
    }
    function fbm(x, y, oct = 4) {
      let s = 0, a = 0.5, f = 1, n = 0;
      for (let i = 0; i < oct; i++) {
        s += a * n2(x * f + i * 17.3, y * f + i * 9.1);
        n += a;
        a *= 0.5;
        f *= 2.03;
      }
      return s / n;
    }
    return { n2, fbm };
  };

  // ---------------------------------------------------------------- A* pathfinding
  // Grid of N*N cells, cost[i] = movement cost multiplier (Infinity = blocked).
  TM.Path = (function () {
    let size = 0, g, parent, seen, closed, gen = 0;
    const hi = [], hf = []; // binary heap (indices, priorities)
    function ensure(n) {
      if (size === n) return;
      size = n;
      g = new Float32Array(n);
      parent = new Int32Array(n);
      seen = new Uint32Array(n);
      closed = new Uint32Array(n);
    }
    function push(i, f) {
      let k = hi.length;
      hi.push(i); hf.push(f);
      while (k > 0) {
        const pk = (k - 1) >> 1;
        if (hf[pk] <= f) break;
        hi[k] = hi[pk]; hf[k] = hf[pk];
        k = pk;
      }
      hi[k] = i; hf[k] = f;
    }
    function pop() {
      const top = hi[0];
      const li = hi.pop(), lf = hf.pop();
      const n = hi.length;
      if (n > 0) {
        let k = 0;
        for (;;) {
          let c = 2 * k + 1;
          if (c >= n) break;
          if (c + 1 < n && hf[c + 1] < hf[c]) c++;
          if (hf[c] >= lf) break;
          hi[k] = hi[c]; hf[k] = hf[c];
          k = c;
        }
        hi[k] = li; hf[k] = lf;
      }
      return top;
    }
    const DX = [1, -1, 0, 0, 1, 1, -1, -1];
    const DY = [0, 0, 1, -1, 1, -1, 1, -1];
    function find(N, cost, sx, sy, tx, ty, maxIter = 30000) {
      const n = N * N;
      ensure(n);
      gen++;
      hi.length = 0; hf.length = 0;
      const start = sy * N + sx, goal = ty * N + tx;
      if (sx < 0 || sy < 0 || tx < 0 || ty < 0 || sx >= N || sy >= N || tx >= N || ty >= N) return null;
      if (cost[goal] === Infinity) return null;
      if (start === goal) return [];
      g[start] = 0; seen[start] = gen; parent[start] = -1;
      // slightly greedy octile heuristic: near-optimal paths, far fewer expansions
      const hw = 1.15;
      push(start, 0);
      let iter = 0, found = false;
      while (hi.length) {
        const cur = pop();
        if (closed[cur] === gen) continue;
        closed[cur] = gen;
        if (cur === goal) { found = true; break; }
        if (++iter > maxIter) break;
        const cx = cur % N, cy = (cur / N) | 0;
        const cc = cost[cur] === Infinity ? 1 : cost[cur];
        for (let k = 0; k < 8; k++) {
          const nx = cx + DX[k], ny = cy + DY[k];
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const ni = ny * N + nx;
          if (closed[ni] === gen) continue;
          const c = cost[ni];
          if (c === Infinity) continue;
          const diag = k >= 4;
          if (diag && (cost[cy * N + nx] === Infinity || cost[ny * N + cx] === Infinity)) continue;
          const ng = g[cur] + (diag ? 1.4142 : 1) * (c + cc) * 0.5;
          if (seen[ni] !== gen || ng < g[ni]) {
            seen[ni] = gen;
            g[ni] = ng;
            parent[ni] = cur;
            const hx = nx > tx ? nx - tx : tx - nx, hy = ny > ty ? ny - ty : ty - ny;
            push(ni, ng + hw * (hx + hy - 0.5858 * (hx < hy ? hx : hy)));
          }
        }
      }
      if (!found) return null;
      const out = [];
      for (let i = goal; i !== start && i !== -1; i = parent[i]) out.push(i);
      out.reverse();
      return out;
    }
    return { find };
  })();

  // ---------------------------------------------------------------- settings storage
  TM.Store = {
    load(key, def) {
      try {
        const s = localStorage.getItem('tm.' + key);
        if (s) return Object.assign({}, def, JSON.parse(s));
      } catch (e) { /* storage unavailable */ }
      return Object.assign({}, def);
    },
    save(key, val) {
      try { localStorage.setItem('tm.' + key, JSON.stringify(val)); } catch (e) { /* ignore */ }
    },
  };

  TM.DEFAULT_GRAPHICS = {
    quality: 'medium',   // low | medium | high
    lighting: true,
    weather: true,
    labels: 'hover',     // off | hover | always
    uiScale: 1,
    fps: false,
  };
})();
