/* Traditions Matter — procedural sprites. Everything is drawn in code
   (no image files) and cached per season and variant. Light comes from
   the upper left; shadows fall to the lower right. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U, RNG } = TM;
  const sh = U.shade;

  const RX = 45.25, RY = 22.63; // screen radii of a 1-tile ground circle
  const P = (x, y, z) => [(x - y) * 32, (x + y) * 16 - (z || 0)];
  const SNOW = '#eef3f7', SNOW2 = '#cdd9e4';

  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function ell(ctx, x, y, rx, ry, a0 = 0, a1 = Math.PI * 2) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, a0, a1);
  }
  function shadow(ctx, x, y, rx, ry, a = 0.26) {
    ctx.fillStyle = `rgba(28,20,10,${a})`;
    ell(ctx, x, y, rx, ry);
    ctx.fill();
  }
  function line(ctx, a, b, col, w) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }

  const Sprites = (TM.Sprites = {
    scale: 1.75,
    cache: new Map(),
    setQuality(q) {
      const s = q === 'low' ? 1.1 : q === 'high' ? 2.4 : 1.8;
      if (s !== this.scale) this.cache.clear();
      this.scale = s;
    },
    make(key, w, h, ax, ay, draw) {
      let s = this.cache.get(key);
      if (s) return s;
      const S = this.scale;
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * S);
      c.height = Math.ceil(h * S);
      const ctx = c.getContext('2d');
      ctx.scale(S, S);
      ctx.translate(ax, ay);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      draw(ctx);
      s = { c, ax, ay, w, h };
      this.cache.set(key, s);
      return s;
    },
  });

  // ------------------------------------------------------------------ wigwam
  // dome surface point at contour angle phi and height z
  function domePt(rx, ry, H, phi, z) {
    const f = Math.sqrt(Math.max(0, 1 - (z / H) * (z / H)));
    return [rx * f * Math.cos(phi), -z + ry * f * Math.sin(phi)];
  }
  function domeBody(ctx, rx, ry, Ht) {
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, Ht, 0, Math.PI, Math.PI * 2);
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.closePath();
  }
  const DOOR_PHI = { E: Math.PI / 4, S: (3 * Math.PI) / 4, W: (5 * Math.PI) / 4, N: -Math.PI / 4 };

  function drawDome(ctx, o) {
    const { rx, ry, H, s, v, door, kind } = o;
    const Ht = Math.hypot(H, ry);
    const rng = new RNG(9100 + v * 31 + s * 7 + (kind === 'sweat' ? 500 : 0));
    shadow(ctx, rx * 0.18, ry * 0.25, rx * 1.08, ry * 1.08, 0.3);
    if (s === 3) { ctx.fillStyle = SNOW2; ell(ctx, 1, 2, rx * 1.16, ry * 1.22); ctx.fill(); ctx.fillStyle = SNOW; ell(ctx, 0, 1, rx * 1.1, ry * 1.12); ctx.fill(); }
    let base, coverTop, coverBottom;
    if (kind === 'sweat') { base = '#5a3f2b'; coverTop = 'robe'; coverBottom = 'robe'; }
    else {
      const matCol = ['#a99766', '#b39f68', '#a48e60', '#9c8a62'][s];
      const barkCol = ['#6f5b48', '#6b5744', '#735e49', '#6b5845'][v % 4];
      base = s === 1 ? matCol : barkCol;
      coverTop = s === 1 ? 'mat' : 'bark';
      coverBottom = s === 3 ? 'bark' : 'mat';
      o.matCol = matCol; o.barkCol = barkCol;
    }
    const g = ctx.createLinearGradient(-rx, -Ht, rx * 0.9, ry);
    g.addColorStop(0, sh(base, 1.2));
    g.addColorStop(0.5, base);
    g.addColorStop(1, sh(base, 0.6));
    domeBody(ctx, rx, ry, Ht);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    domeBody(ctx, rx, ry, Ht);
    ctx.clip();
    const rows = kind === 'sweat' ? 4 : 7;
    for (let k = 0; k < rows; k++) {
      const z0 = (H * k) / rows, z1 = (H * (k + 1)) / rows;
      const top = z0 / H > 0.45;
      const cover = top ? coverTop : coverBottom;
      // band between two contours (front half; full ring near the top)
      const a0 = top ? -Math.PI : 0, a1 = Math.PI;
      const pts = [];
      for (let a = a0; a <= a1 + 1e-6; a += Math.PI / 24) pts.push(domePt(rx, ry, H, a, z0));
      for (let a = a1; a >= a0 - 1e-6; a -= Math.PI / 24) pts.push(domePt(rx, ry, H, a, z1));
      let col;
      if (cover === 'mat') col = sh(o.matCol, 0.9 + rng.next() * 0.22);
      else if (cover === 'bark') col = sh(o.barkCol, 0.85 + rng.next() * 0.3);
      else col = rng.pick(['#4b3324', '#5a3e2a', '#6b4a33', '#3e2b20']);
      ctx.globalAlpha = cover === 'mat' ? 0.42 : 0.5;
      poly(ctx, pts);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.globalAlpha = 1;
      // seam along the contour
      ctx.strokeStyle = cover === 'mat' ? 'rgba(70,52,30,0.45)' : 'rgba(35,25,18,0.55)';
      ctx.lineWidth = cover === 'mat' ? 0.8 : 1.1;
      ctx.beginPath();
      for (let a = a0, f = true; a <= a1 + 1e-6; a += Math.PI / 24, f = false) {
        const q = domePt(rx, ry, H, a, z0);
        if (f) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
      if (cover === 'mat') {
        // woven texture: short vertical ticks
        ctx.strokeStyle = 'rgba(80,62,36,0.28)';
        ctx.lineWidth = 0.6;
        for (let a = a0 + 0.05; a < a1; a += 0.13) {
          if (!top && Math.sin(a) < 0) continue;
          const q0 = domePt(rx, ry, H, a, z0 + 0.5), q1 = domePt(rx, ry, H, a, z1 - 0.5);
          ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
        }
      } else if (cover === 'bark') {
        // bark sheets: vertical seams with staggered offsets
        ctx.strokeStyle = 'rgba(30,22,15,0.5)';
        ctx.lineWidth = 0.9;
        const off = (k % 2) * 0.22;
        for (let a = a0 + off; a < a1; a += 0.44) {
          if (!top && Math.sin(a) < -0.1) continue;
          const q0 = domePt(rx, ry, H, a, z0), q1 = domePt(rx, ry, H, a, z1);
          ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
        }
      }
    }
    // lashing poles that hold the covering down
    if (kind !== 'sweat') {
      ctx.strokeStyle = sh('#8a7152', 1.1);
      ctx.lineWidth = 1.3;
      for (const zf of [0.3, 0.62]) {
        ctx.beginPath();
        const full = zf > 0.45;
        for (let a = full ? -Math.PI : 0, f = true; a <= Math.PI + 1e-6; a += Math.PI / 24, f = false) {
          const q = domePt(rx, ry, H, a, H * zf);
          if (f) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
        }
        ctx.stroke();
      }
    }
    // snow cap
    if (s === 3) {
      const sg = ctx.createLinearGradient(0, -Ht, 0, -H * 0.35);
      sg.addColorStop(0, SNOW);
      sg.addColorStop(1, 'rgba(238,243,247,0.85)');
      ctx.fillStyle = sg;
      ell(ctx, -2, -H - 3, rx * 0.86, Ht * 0.52);
      ctx.fill();
    }
    ctx.restore();
    // door
    const phi = DOOR_PHI[door] || DOOR_PHI.E;
    if (Math.sin(phi) > 0.1) {
      const dh = H * (kind === 'sweat' ? 0.55 : 0.5), wd = kind === 'sweat' ? 0.38 : 0.3;
      const pts = [];
      for (let z = 0; z <= dh; z += dh / 6) pts.push(domePt(rx, ry, H, phi - wd * (1 - 0.5 * (z / dh) ** 2), z));
      for (let z = dh; z >= 0; z -= dh / 6) pts.push(domePt(rx, ry, H, phi + wd * (1 - 0.5 * (z / dh) ** 2), z));
      poly(ctx, pts);
      ctx.fillStyle = '#21150d';
      ctx.fill();
      // hide door flap, partly drawn aside
      const fp = [];
      for (let z = 0; z <= dh; z += dh / 6) fp.push(domePt(rx, ry, H, phi - wd * 0.05 + 0.04 * (z / dh), z));
      for (let z = dh; z >= 0; z -= dh / 6) fp.push(domePt(rx, ry, H, phi + wd * (1 - 0.5 * (z / dh) ** 2), z));
      poly(ctx, fp);
      ctx.fillStyle = kind === 'sweat' ? '#6d4b31' : '#9b7550';
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,25,15,0.5)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    // smoke hole
    if (kind !== 'sweat') {
      ctx.fillStyle = '#2a1e15';
      ell(ctx, 0, -H + 0.5, rx * 0.15, ry * 0.15);
      ctx.fill();
      ctx.fillStyle = sh(s === 3 ? '#9a8a78' : o.matCol, 0.95);
      poly(ctx, [[-rx * 0.05, -H - 2], [rx * 0.22, -H - 6], [rx * 0.28, -H - 1], [rx * 0.06, -H + 2]]);
      ctx.fill();
    }
    domeBody(ctx, rx, ry, Ht);
    ctx.strokeStyle = 'rgba(28,18,10,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  Sprites.wigwam = (s, v, door) =>
    Sprites.make(`wig|${s}|${v}|${door}`, 108, 88, 54, 56, (ctx) => drawDome(ctx, { rx: 39, ry: 19.5, H: 33, s, v, door, kind: 'wigwam' }));
  Sprites.sweat = (s, door) =>
    Sprites.make(`sweat|${s}|${door}`, 64, 48, 32, 30, (ctx) => drawDome(ctx, { rx: 22, ry: 11, H: 15, s, v: 0, door, kind: 'sweat' }));

  // ------------------------------------------------------------------ longhouse
  function drawLonghouse(ctx, o) {
    const { L, Wd, wallH, rise, s, v, flip, council } = o;
    const rng = new RNG(7700 + v * 13 + s + (council ? 99 : 0));
    if (flip) ctx.scale(-1, 1);
    const m = 0.16, x0 = -L / 2 + m, x1 = L / 2 - m, y0 = -Wd / 2 + m, y1 = Wd / 2 - m, hw = (y1 - y0) / 2;
    const endF = flip ? 0.86 : 0.62, sideF = flip ? 0.64 : 0.86;
    const bark = ['#7a6450', '#76604b', '#6f5a46', '#6c5845'][v % 4];
    const snowy = s === 3;
    // shadow
    ctx.fillStyle = 'rgba(28,20,10,0.28)';
    poly(ctx, [P(x0, y0 + 0.2), P(x1 + 0.45, y0 + 0.2), P(x1 + 0.45, y1 + 0.35), P(x0, y1 + 0.35)].map((q) => [q[0] + 6, q[1] + 3]));
    ctx.fill();
    if (snowy) {
      ctx.fillStyle = SNOW;
      poly(ctx, [P(x0 - 0.2, y0 - 0.2), P(x1 + 0.25, y0 - 0.2), P(x1 + 0.25, y1 + 0.25), P(x0 - 0.2, y1 + 0.25)]);
      ctx.fill();
    }
    const arch = (x, th, dz = 0) => P(x, hw * Math.cos(th), wallH + rise * Math.sin(th) + dz);
    // roof strips, back to front
    const NS = 14;
    for (let k = 0; k < NS; k++) {
      const t0 = Math.PI * (1 - k / NS), t1 = Math.PI * (1 - (k + 1) / NS), tm = (t0 + t1) / 2;
      const f = 0.68 + 0.4 * Math.sin(tm) + (flip ? 0.05 : -0.05) * Math.cos(tm);
      let col = sh(bark, f * (0.94 + rng.next() * 0.1));
      if (snowy && Math.sin(tm) > 0.35) col = sh(SNOW, 0.9 + 0.1 * Math.sin(tm));
      poly(ctx, [arch(x0, t0), arch(x1, t0), arch(x1, t1), arch(x0, t1)]);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    // roof bark sheet seams and lashing arcs
    if (!snowy) {
      ctx.strokeStyle = 'rgba(35,25,16,0.45)';
      ctx.lineWidth = 0.9;
      for (const th of [0.28, 0.52, 0.76].map((t) => t * Math.PI)) {
        ctx.beginPath();
        const a = arch(x0, th), b = arch(x1, th);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      for (let x = x0 + 0.5; x < x1; x += 0.85 + rng.next() * 0.3) {
        for (const [ta, tb] of [[0, 0.28], [0.28, 0.52], [0.52, 0.76]]) {
          const xx = x + rng.range(-0.15, 0.15);
          const a = arch(xx, ta * Math.PI), b = arch(xx, tb * Math.PI);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
    }
    ctx.strokeStyle = snowy ? 'rgba(140,120,100,0.6)' : sh('#9b8366', 1.05);
    ctx.lineWidth = 1.3;
    for (let x = x0 + 0.35; x < x1; x += 1.1) {
      ctx.beginPath();
      for (let th = 0, f = true; th <= Math.PI + 1e-6; th += Math.PI / 16, f = false) {
        const q = arch(x, th, 0.6);
        if (f) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
    }
    // smoke holes along the ridge
    const holes = council ? [-1.0, 1.0] : L >= 6 ? [-1.7, 0, 1.7] : [-1, 1];
    for (const hx of holes) {
      const c = arch(hx, Math.PI / 2, 0.5);
      ctx.fillStyle = '#2a1e15';
      ell(ctx, c[0], c[1], 7, 3.5);
      ctx.fill();
      ctx.fillStyle = sh(bark, 0.9);
      poly(ctx, [[c[0] - 7, c[1] - 1], [c[0] - 1, c[1] - 7], [c[0] + 4, c[1] - 6], [c[0] - 2, c[1] + 1]]);
      ctx.fill();
    }
    // front long wall
    const wall = [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, wallH), P(x0, y1, wallH)];
    poly(ctx, wall);
    ctx.fillStyle = sh(bark, sideF);
    ctx.fill();
    ctx.save();
    poly(ctx, wall);
    ctx.clip();
    for (let x = x0; x < x1; x += 0.7 + rng.next() * 0.25) {
      for (let r = 0; r < 2; r++) {
        const za = (wallH * r) / 2 - 1, zb = (wallH * (r + 1)) / 2 + 1;
        const xa = x + (r ? 0.3 : 0), xb = xa + 0.8;
        poly(ctx, [P(xa, y1, za), P(xb, y1, za), P(xb, y1, zb), P(xa, y1, zb)]);
        ctx.fillStyle = sh(bark, sideF * (0.88 + rng.next() * 0.22));
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,22,14,0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
    ctx.restore();
    // poles and posts
    ctx.strokeStyle = sh('#9b8366', 0.95);
    ctx.lineWidth = 1.5;
    for (const zf of [0.34, 0.74]) {
      const a = P(x0, y1, wallH * zf), b = P(x1, y1, wallH * zf);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.strokeStyle = sh('#5e4a36', 0.9);
    ctx.lineWidth = 1.2;
    for (let x = x0 + 0.05; x <= x1; x += (x1 - x0) / Math.round((x1 - x0) / 1.3)) {
      const a = P(x, y1, 0), b = P(x, y1, wallH);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    if (council) {
      // a band of red-ochre and black painted triangles along the wall top
      for (let x = x0 + 0.1, k = 0; x < x1 - 0.2; x += 0.28, k++) {
        poly(ctx, [P(x, y1, wallH - 1), P(x + 0.28, y1, wallH - 1), P(x + 0.14, y1, wallH - 6)]);
        ctx.fillStyle = k % 2 ? '#2b2420' : '#a3372a';
        ctx.fill();
      }
    }
    if (snowy) {
      ctx.fillStyle = SNOW;
      poly(ctx, [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, 3), P(x0 + 1, y1, 2.2), P(x0, y1, 3.5)]);
      ctx.fill();
    }
    // end wall with door
    const endPts = [P(x1, y0, 0), P(x1, y1, 0)];
    for (let th = 0; th <= Math.PI + 1e-6; th += Math.PI / 16) endPts.push(arch(x1, th));
    poly(ctx, endPts);
    ctx.fillStyle = sh(bark, endF);
    ctx.fill();
    ctx.save();
    poly(ctx, endPts);
    ctx.clip();
    ctx.strokeStyle = 'rgba(30,22,14,0.45)';
    ctx.lineWidth = 0.8;
    for (let y = y0 + 0.3; y < y1; y += 0.32) {
      const a = P(x1, y, 0), b = P(x1, y, wallH + rise + 4);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(28,18,10,0.55)';
    ctx.lineWidth = 1;
    poly(ctx, endPts);
    ctx.stroke();
    const dw = council ? 0.32 : 0.24, dh = council ? 21 : 17;
    const dpts = [P(x1 + 0.01, -dw, 0), P(x1 + 0.01, dw, 0), P(x1 + 0.01, dw, dh - 4), P(x1 + 0.01, 0, dh), P(x1 + 0.01, -dw, dh - 4)];
    poly(ctx, dpts);
    ctx.fillStyle = '#20140c';
    ctx.fill();
    poly(ctx, [P(x1 + 0.02, -dw * 0.1, 0), P(x1 + 0.02, dw, 0), P(x1 + 0.02, dw, dh - 4), P(x1 + 0.02, 0.05, dh - 0.5)]);
    ctx.fillStyle = '#93704c';
    ctx.fill();
    if (snowy) {
      ctx.fillStyle = SNOW;
      poly(ctx, [P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, 2.5), P(x1, y0, 3.5)]);
      ctx.fill();
    }
    // outline of whole form
    ctx.strokeStyle = 'rgba(28,18,10,0.5)';
    ctx.lineWidth = 1;
    poly(ctx, wall);
    ctx.stroke();
  }

  Sprites.longhouse = (s, v, flip) =>
    Sprites.make(`lh|${s}|${v}|${flip}`, 300, 190, 150, 116, (ctx) => drawLonghouse(ctx, { L: 6, Wd: 2, wallH: 18, rise: 15, s, v, flip }));
  Sprites.council = (s, flip) =>
    Sprites.make(`council|${s}|${flip}`, 300, 200, 150, 120, (ctx) => drawLonghouse(ctx, { L: 5, Wd: 3, wallH: 22, rise: 22, s, v: 1, flip, council: true }));

  // ------------------------------------------------------------------ tipi
  function drawTipi(ctx, s, v) {
    const rx = 31, ry = 15.5, Hap = 60;
    const rng = new RNG(5300 + v * 17);
    shadow(ctx, 7, 4, rx * 1.12, ry * 1.12, 0.3);
    if (s === 3) { ctx.fillStyle = SNOW; ell(ctx, 0, 1.5, rx * 1.18, ry * 1.22); ctx.fill(); }
    // poles behind
    ctx.strokeStyle = '#5a4128';
    ctx.lineWidth = 1.6;
    const tops = [-13, -8, -4, 3, 7, 12, 0, -10];
    for (const t of tops) line(ctx, [t * 0.12, -Hap + 3], [t, -Hap - 15 - rng.next() * 5], '#5a4128', 1.5);
    const hide = ['#ddc9a0', '#e2cfa6', '#d3bc93', '#c9b18a'][v % 4];
    const cover = () => {
      ctx.beginPath();
      ctx.moveTo(0, -Hap);
      ctx.lineTo(rx, -1);
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
      ctx.lineTo(0, -Hap);
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(-rx, 0, rx, 0);
    g.addColorStop(0, sh(hide, 1.12));
    g.addColorStop(0.45, hide);
    g.addColorStop(1, sh(hide, 0.66));
    cover();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    cover();
    ctx.clip();
    // smoke-darkened top
    const sg = ctx.createLinearGradient(0, -Hap, 0, -Hap * 0.45);
    sg.addColorStop(0, 'rgba(55,38,24,0.75)');
    sg.addColorStop(1, 'rgba(55,38,24,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-rx, -Hap, rx * 2, Hap * 0.6);
    const conePt = (phi, z) => {
      const k = 1 - z / Hap;
      return [rx * k * Math.cos(phi), -z + ry * k * Math.sin(phi)];
    };
    const band = (z0, z1, col) => {
      const pts = [];
      for (let a = 0; a <= Math.PI + 1e-6; a += Math.PI / 20) pts.push(conePt(a, z0));
      for (let a = Math.PI; a >= -1e-6; a -= Math.PI / 20) pts.push(conePt(a, z1));
      poly(ctx, pts);
      ctx.fillStyle = col;
      ctx.fill();
    };
    if (v === 1) { band(3, 8, 'rgba(163,55,42,0.85)'); band(Hap * 0.8, Hap, 'rgba(40,30,24,0.7)'); }
    if (v === 2) {
      band(3, 6, 'rgba(43,36,32,0.8)');
      for (let a = 0.35; a < Math.PI - 0.2; a += 0.42) {
        const q = conePt(a, 30);
        ctx.fillStyle = 'rgba(201,154,46,0.9)';
        ell(ctx, q[0], q[1], 2.4, 2.4);
        ctx.fill();
      }
    }
    if (v === 3) {
      for (let k = 0; k < 3; k++) {
        const q = conePt(rng.range(0.4, 2.6), rng.range(10, 35));
        ctx.fillStyle = sh(hide, rng.range(0.8, 0.95));
        ctx.fillRect(q[0] - 4, q[1] - 3, 8, 6);
      }
    }
    // hide panel seams
    ctx.strokeStyle = 'rgba(80,60,40,0.22)';
    ctx.lineWidth = 0.8;
    for (let a = 0.18; a < Math.PI; a += 0.32) {
      const q = conePt(a, 0);
      ctx.beginPath(); ctx.moveTo(0, -Hap); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
    if (s === 3) {
      ctx.fillStyle = 'rgba(238,243,247,0.9)';
      band(0, 4, 'rgba(238,243,247,0.9)');
    }
    ctx.restore();
    // door facing the sunrise
    const phi = Math.PI / 4;
    const k = 1 - 9 / Hap;
    const dc = [rx * k * Math.cos(phi), -9 + ry * k * Math.sin(phi)];
    ctx.fillStyle = '#22160e';
    ell(ctx, dc[0], dc[1], 5.5, 8);
    ctx.fill();
    ctx.fillStyle = sh(hide, 0.85);
    ell(ctx, dc[0] + 1.5, dc[1] + 0.5, 4.2, 7.2);
    ctx.fill();
    // lacing pins above the door
    ctx.strokeStyle = '#4a3420';
    ctx.lineWidth = 1;
    for (let z = 20; z < Hap * 0.75; z += 4.5) {
      const kz = 1 - z / Hap;
      const q = [rx * kz * Math.cos(phi), -z + ry * kz * Math.sin(phi)];
      ctx.beginPath(); ctx.moveTo(q[0] - 2, q[1] + 0.5); ctx.lineTo(q[0] + 2, q[1] - 0.5); ctx.stroke();
    }
    // smoke flaps
    const fl = (side) => {
      const za = Hap * 0.66, zb = Hap * 0.93, pa = phi + side * 0.42;
      const ka = 1 - za / Hap, kb = 1 - zb / Hap;
      const A = [rx * ka * Math.cos(pa), -za + ry * ka * Math.sin(pa)];
      const B = [rx * kb * Math.cos(phi), -zb + ry * kb * Math.sin(phi)];
      const out = side > 0 ? [-7, -2] : [7, -1];
      poly(ctx, [A, B, [B[0] + out[0], B[1] + out[1] - 3], [A[0] + out[0] * 0.8, A[1] + out[1]]]);
      ctx.fillStyle = sh(hide, side > 0 ? 0.8 : 0.62);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,28,18,0.5)';
      ctx.stroke();
      line(ctx, [B[0] + out[0], B[1] + out[1] - 3], [B[0] + out[0] * 1.6, B[1] - 12], '#5a4128', 1.2);
    };
    fl(1); fl(-1);
    // front poles
    for (const t of [-5, 2, 8]) line(ctx, [t * 0.1, -Hap + 1], [t, -Hap - 13], '#6a4c2f', 1.6);
    // pegs
    ctx.fillStyle = '#3e2c1c';
    for (let a = 0.15; a < Math.PI; a += 0.38) {
      const q = [rx * Math.cos(a), ry * Math.sin(a)];
      ctx.fillRect(q[0] - 0.6, q[1] - 1, 1.2, 3);
    }
    cover();
    ctx.strokeStyle = 'rgba(40,28,18,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  Sprites.tipi = (s, v) => Sprites.make(`tipi|${s}|${v}`, 96, 116, 48, 86, (ctx) => drawTipi(ctx, s, v));

  // ------------------------------------------------------------------ storage platform
  Sprites.crib = (s, v) =>
    Sprites.make(`crib|${s}|${v}`, 84, 92, 42, 62, (ctx) => {
      const r = 0.36, z = 22;
      ctx.fillStyle = 'rgba(28,20,10,0.25)';
      poly(ctx, [P(-r, -r), P(r, -r), P(r, r), P(-r, r)].map((q) => [q[0] + 8, q[1] + 4]));
      ctx.fill();
      if (s === 3) { ctx.fillStyle = SNOW; ell(ctx, 0, 0, 30, 15); ctx.fill(); }
      const post = (x, y) => line(ctx, P(x, y, 0), P(x, y, z + 2), '#5b4430', 2.2);
      post(-r, -r); post(r, -r); post(-r, r);
      // platform
      poly(ctx, [P(-r - 0.06, -r - 0.06, z), P(r + 0.06, -r - 0.06, z), P(r + 0.06, r + 0.06, z), P(-r - 0.06, r + 0.06, z)]);
      ctx.fillStyle = '#7b5c3d';
      ctx.fill();
      ctx.strokeStyle = '#4a3624';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // bark-wrapped bundles and baskets of dried food stacked on the platform
      const rng = new RNG(40 + v);
      const items = [[-0.18, -0.2], [0.14, -0.22], [-0.22, 0.12], [0.12, 0.1], [-0.02, -0.04]];
      for (const [bx, by] of items) {
        const q = P(bx, by, z);
        const w = rng.range(6.5, 8.5), h = rng.range(6, 9);
        const col = rng.pick(['#7a6450', '#8c7558', '#6a5644', '#a08660']);
        const g = ctx.createLinearGradient(q[0] - w, q[1] - h, q[0] + w, q[1]);
        g.addColorStop(0, sh(col, 1.2));
        g.addColorStop(1, sh(col, 0.7));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(q[0] - w, q[1]);
        ctx.quadraticCurveTo(q[0] - w * 1.05, q[1] - h * 1.1, q[0], q[1] - h * 1.15);
        ctx.quadraticCurveTo(q[0] + w * 1.05, q[1] - h * 1.1, q[0] + w, q[1]);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,28,18,0.55)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
        line(ctx, [q[0] - w * 0.9, q[1] - h * 0.5], [q[0] + w * 0.9, q[1] - h * 0.5], '#4a3624', 0.7);
      }
      // a sheet of bark laid over part of the load
      poly(ctx, [P(-0.36, -0.36, z + 9), P(0.3, -0.36, z + 13), P(0.3, 0.05, z + 11), P(-0.36, 0.05, z + 7)]);
      ctx.fillStyle = s === 3 ? SNOW : '#6b5744';
      ctx.fill();
      ctx.strokeStyle = 'rgba(35,25,16,0.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      post(r, r);
      // hanging braids of maize under the platform
      if (s === 2 || s === 3 || v === 1) {
        for (let k = 0; k < 5; k++) {
          const q = P(-r + 0.1 + k * 0.16, r + 0.06, z);
          for (let e = 0; e < 3; e++) {
            ctx.fillStyle = ['#d8a63a', '#b8402a', '#e2c060', '#7a3b6a'][(k + e) % 4];
            ell(ctx, q[0] + (e % 2) * 1.2, q[1] + 3 + e * 3.2, 1.4, 2);
            ctx.fill();
          }
        }
      }
      // notched-log ladder
      line(ctx, P(0.75, 0.15, 0), P(0.32, 0.12, z + 2), '#6b5038', 2.4);
      ctx.strokeStyle = '#3e2c1c';
      ctx.lineWidth = 0.7;
      for (let t = 0.15; t < 1; t += 0.2) {
        const a = P(0.75 - 0.43 * t, 0.15 - 0.03 * t, (z + 2) * t);
        ctx.beginPath(); ctx.moveTo(a[0] - 1.5, a[1]); ctx.lineTo(a[0] + 1.5, a[1]); ctx.stroke();
      }
    });

  Sprites.pit = (s) =>
    Sprites.make(`pit|${s}`, 52, 32, 26, 17, (ctx) => {
      shadow(ctx, 3, 2, 18, 8.5, 0.2);
      ctx.fillStyle = s === 3 ? SNOW2 : '#6e5236';
      ell(ctx, 0, 0, 17, 8.5);
      ctx.fill();
      ctx.fillStyle = s === 3 ? SNOW : '#7a5d40';
      ell(ctx, -1, -1.5, 14, 6.5);
      ctx.fill();
      if (s !== 3) {
        const slab = (x, y, a, c) => {
          ctx.save(); ctx.translate(x, y); ctx.rotate(a);
          ctx.fillStyle = c; ctx.fillRect(-7, -2.2, 14, 4.4);
          ctx.strokeStyle = 'rgba(30,20,12,0.5)'; ctx.lineWidth = 0.6; ctx.strokeRect(-7, -2.2, 14, 4.4);
          ctx.restore();
        };
        slab(-3, -2, 0.25, '#6a5846');
        slab(3, -1, -0.2, '#5e4e40');
      }
      for (const [x, y] of [[-12, 2], [10, 3], [13, -2]]) {
        ctx.fillStyle = '#8c8680';
        ell(ctx, x, y, 2.6, 1.8);
        ctx.fill();
      }
    });

  // ------------------------------------------------------------------ drying rack
  Sprites.rack = (s, load, flip) =>
    Sprites.make(`rack|${s}|${load}|${flip}`, 140, 84, 70, 58, (ctx) => {
      if (flip) ctx.scale(-1, 1);
      const xa = -0.82, xb = 0.82;
      ctx.fillStyle = 'rgba(28,20,10,0.22)';
      poly(ctx, [P(xa, -0.2), P(xb, -0.2), P(xb, 0.25), P(xa, 0.25)].map((q) => [q[0] + 6, q[1] + 3]));
      ctx.fill();
      if (s === 3) { ctx.fillStyle = SNOW; poly(ctx, [P(xa - 0.2, -0.3), P(xb + 0.2, -0.3), P(xb + 0.2, 0.3), P(xa - 0.2, 0.3)]); ctx.fill(); }
      const post = (x) => {
        line(ctx, P(x, -0.1, 0), P(x, -0.02, 27), '#5b4430', 2);
        line(ctx, P(x, 0.1, 0), P(x, 0.02, 27), '#5b4430', 2);
      };
      post(xa);
      for (const z of [24, 15]) line(ctx, P(xa, 0, z), P(xb, 0, z), '#7a5b3d', 1.6);
      // hanging strips
      const rng = new RNG(load === 'fish' ? 11 : 13);
      for (const z of [24, 15]) {
        for (let x = xa + 0.1; x < xb - 0.05; x += 0.11) {
          const q = P(x, 0, z);
          if (load === 'fish') {
            ctx.fillStyle = rng.pick(['#8f8a7a', '#a39a86', '#7d7564', '#b8a990']);
            ell(ctx, q[0], q[1] + 5, 1.6, 4.6);
            ctx.fill();
            ctx.fillStyle = '#6a604f';
            poly(ctx, [[q[0], q[1] + 9], [q[0] - 1.8, q[1] + 11.5], [q[0] + 1.8, q[1] + 11.5]]);
            ctx.fill();
          } else {
            const len = rng.range(6, 9);
            line(ctx, [q[0], q[1]], [q[0] + rng.range(-0.6, 0.6), q[1] + len], rng.pick(['#7a2e22', '#8e3a28', '#6a2a1e', '#9a4a32']), 1.8);
          }
        }
      }
      post(xb);
      if (s === 3) { line(ctx, P(xa, 0, 24.8), P(xb, 0, 24.8), SNOW, 1.2); }
    });

  // ------------------------------------------------------------------ hide frame
  Sprites.hideframe = (s, flip) =>
    Sprites.make(`hf|${s}|${flip}`, 84, 76, 42, 56, (ctx) => {
      if (flip) ctx.scale(-1, 1);
      shadow(ctx, 6, 3, 22, 8, 0.2);
      if (s === 3) { ctx.fillStyle = SNOW; ell(ctx, 0, 1, 26, 11); ctx.fill(); }
      const xa = -0.48, xb = 0.48;
      line(ctx, P(xa, 0, 0), P(xa + 0.02, 0, 38), '#5b4430', 2.2);
      line(ctx, P(xb, 0, 0), P(xb - 0.02, 0, 38), '#5b4430', 2.2);
      line(ctx, P(xa - 0.06, 0, 35), P(xb + 0.06, 0, 35), '#6b5038', 1.8);
      line(ctx, P(xa - 0.06, 0, 5), P(xb + 0.06, 0, 5), '#6b5038', 1.8);
      // the hide
      const rng = new RNG(77);
      const cen = P(0, 0, 20);
      const pts = [];
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        const rr = 1 + rng.range(-0.12, 0.12);
        pts.push([cen[0] + Math.cos(a) * 14 * rr, cen[1] + Math.sin(a) * 11 * rr + Math.cos(a) * 7 * 0.5]);
      }
      // lacing
      ctx.strokeStyle = '#4a3624';
      ctx.lineWidth = 0.6;
      for (const q of pts) {
        const tx = q[0] < cen[0] ? P(xa, 0, 0)[0] : P(xb, 0, 0)[0];
        ctx.beginPath(); ctx.moveTo(q[0], q[1]);
        if (Math.abs(q[0] - cen[0]) > 6) ctx.lineTo(tx, q[1] + (tx - q[0]) * 0.5);
        else ctx.lineTo(q[0], q[1] < cen[1] ? P(0, 0, 35)[1] : P(0, 0, 5)[1]);
        ctx.stroke();
      }
      poly(ctx, pts);
      const g = ctx.createRadialGradient(cen[0] - 3, cen[1] - 3, 2, cen[0], cen[1], 15);
      g.addColorStop(0, '#efe2c4');
      g.addColorStop(1, '#c9ab82');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,58,36,0.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

  Sprites.peggedhide = (s) =>
    Sprites.make(`ph|${s}`, 56, 34, 28, 17, (ctx) => {
      const rng = new RNG(31);
      const pts = [];
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2, rr = 1 + rng.range(-0.15, 0.15);
        pts.push([Math.cos(a) * 18 * rr, Math.sin(a) * 9 * rr]);
      }
      poly(ctx, pts);
      ctx.fillStyle = s === 3 ? '#d9cdb5' : '#dcc9a3';
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,58,36,0.55)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,235,0.35)';
      ell(ctx, -2, -1, 9, 4);
      ctx.fill();
      ctx.fillStyle = '#4a3420';
      for (const q of pts) ctx.fillRect(q[0] * 1.08 - 0.6, q[1] * 1.1 - 2, 1.2, 3);
    });

  // ------------------------------------------------------------------ watch platform
  Sprites.platform = (s) =>
    Sprites.make(`plat|${s}`, 84, 116, 42, 88, (ctx) => {
      const r = 0.3, z = 30;
      ctx.fillStyle = 'rgba(28,20,10,0.22)';
      poly(ctx, [P(-r, -r), P(r, -r), P(r, r), P(-r, r)].map((q) => [q[0] + 14, q[1] + 6]));
      ctx.fill();
      const post = (x, y, h) => line(ctx, P(x, y, 0), P(x, y, h), '#5b4430', 2);
      post(-r, -r, 52); post(r, -r, 50); post(-r, r, 36);
      poly(ctx, [P(-r - 0.08, -r - 0.08, z), P(r + 0.08, -r - 0.08, z), P(r + 0.08, r + 0.08, z), P(-r - 0.08, r + 0.08, z)]);
      ctx.fillStyle = '#7b5c3d';
      ctx.fill();
      ctx.strokeStyle = '#4a3624';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // sunshade of bark and boughs
      poly(ctx, [P(-r - 0.15, -r - 0.15, 52), P(r + 0.15, -r - 0.15, 50), P(r + 0.15, r * 0.2, 46), P(-r - 0.15, r * 0.2, 48)]);
      ctx.fillStyle = s === 3 ? SNOW : '#6c5a44';
      ctx.fill();
      ctx.strokeStyle = 'rgba(35,25,16,0.6)';
      ctx.stroke();
      post(r, r, 36);
      line(ctx, P(-r, r, 36), P(r, r, 36), '#6b5038', 1.4);
      line(ctx, P(r, -r, 36), P(r, r, 36), '#6b5038', 1.4);
      line(ctx, P(0.62, 0.3, 0), P(0.28, 0.25, z + 1), '#6b5038', 2.2);
    });

  // ------------------------------------------------------------------ fires and hearths
  Sprites.firering = (size, kind, s) =>
    Sprites.make(`ring|${size}|${kind}|${s}`, 80, 46, 40, 24, (ctx) => {
      const rx = 9 * size, ry = 4.5 * size;
      if (s === 3) { ctx.fillStyle = '#d8d6d0'; ell(ctx, 0, 0, rx * 1.9, ry * 1.9); ctx.fill(); }
      ctx.fillStyle = 'rgba(45,35,28,0.55)';
      ell(ctx, 0, 0, rx * 1.35, ry * 1.35);
      ctx.fill();
      ctx.fillStyle = '#2b221c';
      ell(ctx, 0, 0, rx, ry);
      ctx.fill();
      const rng = new RNG(Math.round(size * 100));
      const n = Math.round(9 + size * 4);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const x = Math.cos(a) * rx * 1.1, y = Math.sin(a) * ry * 1.1;
        ctx.fillStyle = rng.pick(['#8c8680', '#7a746e', '#9a948c', '#6e6964']);
        ell(ctx, x, y, 2.4 + size * 0.5, 1.7 + size * 0.3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ell(ctx, x - 0.6, y - 0.6, 1.2, 0.7);
        ctx.fill();
      }
      // log ends radiating into the fire
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        line(ctx, [Math.cos(a) * rx * 0.25, Math.sin(a) * ry * 0.25], [Math.cos(a) * rx * 1.05, Math.sin(a) * ry * 1.05], '#3a2a1c', 2 + size * 0.4);
      }
      if (kind === 'stones') {
        for (let k = 0; k < 8; k++) {
          ctx.fillStyle = rng.pick(['#7a746e', '#6e6964', '#8c8680']);
          ell(ctx, rng.range(-rx * 0.5, rx * 0.5), rng.range(-ry * 0.5, ry * 0.3) - 2, 2.6, 2);
          ctx.fill();
        }
      }
    });
  Sprites.pot = () =>
    Sprites.make('pot', 30, 30, 15, 22, (ctx) => {
      line(ctx, [-7, 0], [-5, -6], '#6e6964', 2.5);
      line(ctx, [7, 0], [5, -6], '#6e6964', 2.5);
      const g = ctx.createRadialGradient(-3, -11, 1, 0, -9, 9);
      g.addColorStop(0, '#7a6656');
      g.addColorStop(1, '#3e3029');
      ctx.fillStyle = g;
      ell(ctx, 0, -9, 7.5, 7);
      ctx.fill();
      ctx.fillStyle = '#4a3a30';
      ctx.fillRect(-5, -17.5, 10, 3);
      ctx.fillStyle = '#2a201b';
      ell(ctx, 0, -17.5, 5, 1.5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,22,18,0.35)';
      ctx.lineWidth = 0.5;
      for (let k = -6; k < 7; k += 1.6) { ctx.beginPath(); ctx.moveTo(k, -14); ctx.lineTo(k + 1.5, -4); ctx.stroke(); }
    });
  Sprites.tripod = () =>
    Sprites.make('tripod', 34, 44, 17, 32, (ctx) => {
      line(ctx, [-9, 4], [0, -27], '#5b4430', 1.6);
      line(ctx, [9, 3], [0, -27], '#5b4430', 1.6);
      line(ctx, [1, 7], [0, -27], '#6b5038', 1.6);
      line(ctx, [0, -26], [0, -16], '#3e2c1c', 0.8);
      ctx.fillStyle = '#8a6a48';
      ell(ctx, 0, -11, 5.5, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,28,18,0.5)';
      ctx.stroke();
    });

  Sprites.woodpile = (s) =>
    Sprites.make(`wood|${s}`, 52, 38, 26, 25, (ctx) => {
      shadow(ctx, 3, 2, 18, 7, 0.22);
      const logs = [[-9, 0], [-1, 1], [7, 2], [-5, -5], [3, -4.5], [-1, -9.5]];
      for (const [x, y] of logs) {
        ctx.fillStyle = '#5e4632';
        poly(ctx, [[x - 10, y - 4], [x + 1, y - 2], [x + 1, y + 2.6], [x - 10, y + 0.6]]);
        ctx.fill();
        ctx.fillStyle = '#b08b62';
        ell(ctx, x + 1, y + 0.3, 2.3, 2.6);
        ctx.fill();
        ctx.strokeStyle = '#6e5238';
        ctx.lineWidth = 0.5;
        ell(ctx, x + 1, y + 0.3, 1.1, 1.3);
        ctx.stroke();
      }
      if (s === 3) { ctx.fillStyle = SNOW; ell(ctx, -3, -12, 9, 2.5); ctx.fill(); }
    });

  Sprites.pots = (s) =>
    Sprites.make(`pots|${s}`, 46, 34, 23, 22, (ctx) => {
      ctx.fillStyle = s === 3 ? '#c8c2b6' : '#8e7650';
      poly(ctx, [[-16, 2], [0, -6], [16, 2], [0, 10]]);
      ctx.fill();
      const pot = (x, y, r) => {
        const g = ctx.createRadialGradient(x - r * 0.4, y - r * 1.2, 0.5, x, y - r, r * 1.2);
        g.addColorStop(0, '#8a7262');
        g.addColorStop(1, '#4a3a30');
        ctx.fillStyle = g;
        ell(ctx, x, y - r, r, r * 0.95);
        ctx.fill();
        ctx.fillStyle = '#3a2d26';
        ell(ctx, x, y - r * 1.9, r * 0.6, r * 0.22);
        ctx.fill();
      };
      pot(-6, 0, 5); pot(5, 2, 4); pot(-1, 5, 3.2);
    });

  // ------------------------------------------------------------------ river craft
  Sprites.canoe = (flip) =>
    Sprites.make(`canoe|${flip}`, 110, 60, 55, 30, (ctx) => {
      if (flip) ctx.scale(-1, 1);
      const pts = [], inner = [];
      for (let k = 0; k <= 20; k++) {
        const t = -1 + (2 * k) / 20;
        const w = 0.17 * Math.pow(Math.max(0, 1 - t * t * t * t), 0.6);
        pts.push(P(w, t * 1.05, 0));
        inner.push(P(w * 0.7, t * 0.95, 3.5));
      }
      for (let k = 20; k >= 0; k--) {
        const t = -1 + (2 * k) / 20;
        const w = 0.17 * Math.pow(Math.max(0, 1 - t * t * t * t), 0.6);
        pts.push(P(-w, t * 1.05, 4.5));
        inner.push(P(-w * 0.7, t * 0.95, 3.5));
      }
      ctx.fillStyle = 'rgba(28,20,10,0.25)';
      poly(ctx, pts.map((q) => [q[0] + 4, q[1] + 3]));
      ctx.fill();
      poly(ctx, pts);
      const g = ctx.createLinearGradient(-30, -20, 30, 20);
      g.addColorStop(0, '#6a4a30');
      g.addColorStop(1, '#3e2a1a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#2a1c10';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      poly(ctx, inner);
      ctx.fillStyle = '#2a1b10';
      ctx.fill();
      line(ctx, P(0.32, -0.5, 0), P(0.28, 0.4, 0), '#7a5b3d', 1.5);
      ctx.fillStyle = '#7a5b3d';
      const q = P(0.28, 0.45, 0);
      ell(ctx, q[0], q[1], 3, 1.6);
      ctx.fill();
    });

  Sprites.travois = (s) =>
    Sprites.make(`trav|${s}`, 74, 42, 36, 26, (ctx) => {
      const A = P(-0.75, -0.3, 0), B = P(-0.75, 0.3, 0), C = P(0.55, 0.06, 11), D = P(0.55, -0.06, 11);
      line(ctx, A, C, '#6b5038', 1.6);
      line(ctx, B, D, '#6b5038', 1.6);
      for (const t of [0.22, 0.42]) {
        const a = [A[0] + (C[0] - A[0]) * t, A[1] + (C[1] - A[1]) * t];
        const b = [B[0] + (D[0] - B[0]) * t, B[1] + (D[1] - B[1]) * t];
        line(ctx, a, b, '#5b4430', 1.2);
      }
      const a = [A[0] + (C[0] - A[0]) * 0.22, A[1] + (C[1] - A[1]) * 0.22], b = [B[0] + (D[0] - B[0]) * 0.42, B[1] + (D[1] - B[1]) * 0.42];
      ctx.fillStyle = s === 3 ? 'rgba(238,243,247,0.9)' : 'rgba(150,120,80,0.7)';
      ell(ctx, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 7, 3.5);
      ctx.fill();
    });

  // ------------------------------------------------------------------ trees
  const LEAF = {
    oak: [['#86ac55', '#6f9a45'], ['#4c6e33', '#3f5f2b'], ['#8e4a2a', '#a35d2e', '#7a4a2a'], null],
    maple: [['#8cb85a', '#79a84c'], ['#4f7a36', '#41692d'], ['#c8442a', '#e0782c', '#d9a03a'], null],
    hickory: [['#8ab352', '#77a248'], ['#56783a', '#476a30'], ['#c9a23a', '#d4b04a', '#b8902e'], null],
    elm: [['#90b85c', '#7aa64c'], ['#4b7034', '#3e612b'], ['#c8b048', '#b9a040', '#d0bc5a'], null],
    cottonwood: [['#98bf62', '#83ad52'], ['#5a7f3c', '#4a7032'], ['#d8c050', '#c9b040', '#e0cc6a'], null],
    birch: [['#a2c66a', '#8db658'], ['#6a8b45', '#5a7b3a'], ['#e0c84a', '#d4b83c'], null],
    willow: [['#a6c66a', '#93b85a'], ['#7a9a4c', '#6a8a40'], ['#b7b453', '#a8a648'], null],
    walnut: [['#8fb45a', '#7aa04a'], ['#587a38', '#4a6c30'], ['#c8b048', '#b89a3a', '#a88a30'], null],
    sycamore: [['#9cc06a', '#88b058'], ['#5f8540', '#527636'], ['#b89048', '#a07a3a', '#c8a050'], null],
    basswood: [['#94bc60', '#80aa50'], ['#507a34', '#456c2c'], ['#d4c050', '#c8b040'], null],
    plum: [['#f4ece4', '#f8f2ee', '#ead8d8'], ['#5a843a', '#4e7632'], ['#c8642a', '#b8502a', '#d88a3a'], null],
  };
  const TREE_DIM = {
    oak: { th: 22, r: 29, ry: 0.82, bark: '#4e3d30' },
    maple: { th: 26, r: 24, ry: 1.05, bark: '#55463a' },
    hickory: { th: 30, r: 19, ry: 1.3, bark: '#5e5246' },
    elm: { th: 34, r: 26, ry: 0.92, bark: '#544538' },
    cottonwood: { th: 34, r: 27, ry: 1.12, bark: '#6a6258' },
    birch: { th: 30, r: 15, ry: 1.35, bark: '#e8e2d6' },
    willow: { th: 16, r: 25, ry: 0.85, bark: '#5a4a3a' },
    walnut: { th: 30, r: 23, ry: 0.88, bark: '#3e342c' },
    sycamore: { th: 34, r: 27, ry: 1.0, bark: '#d8d0c0' },
    basswood: { th: 30, r: 23, ry: 1.18, bark: '#5a4a3c' },
    plum: { th: 12, r: 15, ry: 0.85, bark: '#4a3a30' },
  };

  function drawBranches(ctx, x, y, a, len, w, depth, rng, col, snow) {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (snow && depth >= 2 && Math.abs(Math.cos(a)) > 0.3) {
      ctx.strokeStyle = 'rgba(240,245,250,0.85)';
      ctx.lineWidth = Math.max(0.6, w * 0.6);
      ctx.beginPath();
      ctx.moveTo(x, y - w * 0.5);
      ctx.lineTo(x2, y2 - w * 0.5);
      ctx.stroke();
    }
    if (depth <= 0) return;
    const n = depth > 2 ? 2 : rng.int(2, 3);
    for (let k = 0; k < n; k++) {
      const na = a + rng.range(-0.65, 0.65);
      drawBranches(ctx, x2, y2, na, len * rng.range(0.62, 0.8), w * 0.68, depth - 1, rng, col, snow);
    }
  }

  function drawDeciduous(ctx, kind, s, v) {
    const d = TREE_DIM[kind];
    const rng = new RNG(TM.hashStr(kind) + v * 101 + 3);
    const r = d.r * (0.92 + v * 0.06), ry = r * d.ry, th = d.th;
    const cy = -(th + ry * 0.7);
    shadow(ctx, r * 0.45, 2, r * 0.95, r * 0.42, s === 3 ? 0.16 : 0.24);
    // trunk
    const tw = kind === 'willow' ? 4.2 : 3.2;
    const lean = kind === 'willow' ? 4 : rng.range(-1.5, 1.5);
    poly(ctx, [[-tw, 0], [tw, 0], [tw * 0.45 + lean, -th - 4], [-tw * 0.45 + lean, -th - 4]]);
    const tg = ctx.createLinearGradient(-tw, 0, tw, 0);
    tg.addColorStop(0, sh(d.bark, 1.15));
    tg.addColorStop(1, sh(d.bark, 0.7));
    ctx.fillStyle = tg;
    ctx.fill();
    if (kind === 'sycamore') {
      for (let k = 0; k < 7; k++) { ctx.fillStyle = rng.pick(['#8a8270', '#a89c86', '#6e6656']); ell(ctx, rng.range(-2.5, 2.5), -rng.range(4, th), rng.range(1, 2.2), rng.range(1.2, 2.6)); ctx.fill(); }
    }
    if (kind === 'birch') {
      ctx.fillStyle = '#2b2622';
      for (let k = 0; k < 6; k++) ctx.fillRect(rng.range(-2.5, 1.5), -rng.range(3, th), rng.range(1.5, 3), 0.9);
    }
    const leaves = LEAF[kind][s];
    if (!leaves) {
      // bare winter branches
      const rng2 = new RNG(TM.hashStr(kind) + v * 7);
      const col = kind === 'birch' ? '#cfc8bc' : sh(d.bark, 0.9);
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + rng2.range(-0.9, 0.9);
        drawBranches(ctx, lean, -th - 2, a, r * 0.42, 2.2, 3, rng2, col, true);
      }
      if (kind === 'oak') {
        for (let k = 0; k < 26; k++) {
          ctx.fillStyle = rng2.pick(['#8a6440', '#7a5434', '#9a7048']);
          ell(ctx, rng2.range(-r * 0.7, r * 0.7), cy + rng2.range(-ry * 0.6, ry * 0.5), 1.6, 1.2);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(240,245,250,0.9)';
      ell(ctx, 0, 1, 10, 3);
      ctx.fill();
      return;
    }
    // a few visible limbs
    ctx.strokeStyle = sh(d.bark, 0.85);
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(lean, -th);
      ctx.lineTo(lean + rng.range(-r * 0.5, r * 0.5), cy + rng.range(-ry * 0.2, ry * 0.4));
      ctx.stroke();
    }
    if (kind === 'willow') {
      // drooping curtain
      const n = 34;
      for (let k = 0; k < n; k++) {
        const x = rng.range(-r, r), y0 = cy - ry * 0.7 + Math.abs(x) * 0.25 + rng.range(-3, 3);
        const len = rng.range(18, 30);
        ctx.strokeStyle = sh(rng.pick(leaves), rng.range(0.85, 1.15));
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x * 0.6, y0);
        ctx.quadraticCurveTo(x * 1.05, y0 + len * 0.3, x * 1.05 + rng.range(-2, 2), y0 + len);
        ctx.stroke();
      }
      return;
    }
    const n = Math.round(14 + r * 0.5);
    const cl = [];
    for (let k = 0; k < n; k++) {
      const a = rng.range(0, Math.PI * 2), rr = Math.sqrt(rng.next());
      cl.push({ x: Math.cos(a) * r * 0.72 * rr + lean * 0.5, y: cy + Math.sin(a) * ry * 0.7 * rr, s: rng.range(r * 0.32, r * 0.48), c: rng.pick(leaves) });
    }
    cl.sort((a, b) => a.y - b.y);
    for (const c of cl) {
      const lit = 0.88 + 0.3 * ((-(c.x - lean) / r) * 0.5 + (-(c.y - cy) / ry) * 0.5);
      const g = ctx.createRadialGradient(c.x - c.s * 0.35, c.y - c.s * 0.4, c.s * 0.1, c.x, c.y, c.s);
      g.addColorStop(0, sh(c.c, Math.max(0.5, lit * 1.12)));
      g.addColorStop(1, sh(c.c, Math.max(0.4, lit * 0.72)));
      ctx.fillStyle = g;
      ell(ctx, c.x, c.y, c.s, c.s * 0.9);
      ctx.fill();
    }
    // leaf speckle
    for (let k = 0; k < 40; k++) {
      const a = rng.range(0, Math.PI * 2), rr = Math.sqrt(rng.next());
      const x = Math.cos(a) * r * 0.85 * rr + lean * 0.5, y = cy + Math.sin(a) * ry * 0.8 * rr;
      const left = x < 0 && y < cy;
      ctx.fillStyle = left ? sh(rng.pick(leaves), 1.25, 0.8) : sh(rng.pick(leaves), 0.7, 0.6);
      ell(ctx, x, y, 1.6, 1.3);
      ctx.fill();
    }
    if (kind === 'plum' && s === 1) {
      for (let k = 0; k < 14; k++) { ctx.fillStyle = rng.pick(['#a8283a', '#c83a2a', '#7a2a4a']); ell(ctx, rng.range(-r * 0.7, r * 0.7), cy + rng.range(-ry * 0.5, ry * 0.5), 1.4, 1.4); ctx.fill(); }
    }
    if (s === 0 && v === 1 && (kind === 'oak' || kind === 'maple' || kind === 'cottonwood')) {
      for (let k = 0; k < 18; k++) {
        ctx.fillStyle = 'rgba(250,245,235,0.85)';
        ell(ctx, rng.range(-r * 0.7, r * 0.7), cy + rng.range(-ry * 0.6, ry * 0.5), 1.1, 1.1);
        ctx.fill();
      }
    }
  }

  function drawConifer(ctx, kind, s, v) {
    const rng = new RNG(TM.hashStr(kind) + v * 37);
    const snow = s === 3;
    const base = kind === 'cedar' ? (snow ? '#3d4a30' : s === 2 ? '#3a4e30' : '#2f4a2c') : '#2c4a33';
    if (kind === 'cedar') {
      const H = 62 + v * 6, W = 15 + v * 2;
      shadow(ctx, 8, 2, W * 0.95, W * 0.4, 0.24);
      line(ctx, [0, 0], [0, -8], '#4a3628', 3);
      for (let k = 0; k < 9; k++) {
        const t = k / 9, y = -6 - t * (H - 8), w = W * (1 - t * 0.85) * (0.9 + rng.next() * 0.2);
        const g = ctx.createLinearGradient(-w, y, w, y);
        g.addColorStop(0, sh(base, 1.25));
        g.addColorStop(1, sh(base, 0.7));
        ctx.fillStyle = g;
        ell(ctx, rng.range(-1, 1), y, w, (H / 9) * 0.95);
        ctx.fill();
        if (snow && k % 2 === 0) { ctx.fillStyle = 'rgba(240,245,250,0.85)'; ell(ctx, -w * 0.25, y - H / 30, w * 0.55, 1.6); ctx.fill(); }
      }
      return;
    }
    // white pine: tall, with tiers of soft horizontal boughs
    const H = 86 + v * 8;
    shadow(ctx, 12, 2, 22, 8, 0.24);
    poly(ctx, [[-2.8, 0], [2.8, 0], [1, -H], [-1, -H]]);
    ctx.fillStyle = '#4a3a2c';
    ctx.fill();
    const tiers = 6;
    for (let k = 0; k < tiers; k++) {
      const t = k / tiers, y = -H * (0.3 + t * 0.66), w = 24 * (1 - t * 0.7) * (0.8 + rng.next() * 0.4);
      const side = rng.chance(0.5) ? 1 : -1;
      for (const sd of [-1, 1]) {
        const ww = w * (sd === side ? 1 : 0.65);
        const g = ctx.createLinearGradient(-ww, y, ww, y);
        g.addColorStop(0, sh(base, 1.3));
        g.addColorStop(1, sh(base, 0.7));
        ctx.fillStyle = g;
        ell(ctx, (sd * ww) / 2, y, ww / 1.6, 5.5);
        ctx.fill();
        if (snow) { ctx.fillStyle = 'rgba(240,245,250,0.85)'; ell(ctx, (sd * ww) / 2, y - 3.5, ww / 2.2, 1.6); ctx.fill(); }
      }
    }
  }

  Sprites.tree = (kind, s, v) =>
    Sprites.make(`tree|${kind}|${s}|${v}`, 96, 136, 48, 124, (ctx) => {
      if (kind === 'cedar' || kind === 'pine') drawConifer(ctx, kind, s, v);
      else drawDeciduous(ctx, kind, s, v);
    });

  // ------------------------------------------------------------------ small plants and props
  const GRASS = [
    ['#88a84e', '#7a9c46', '#96b45a'],
    ['#9aa752', '#8a9a48', '#a8b25e'],
    ['#b06a3a', '#c49a4a', '#9c5a34'],
    ['#b9a07a', '#a89070', '#c8b08a'],
  ];
  Sprites.grass = (s, v) =>
    Sprites.make(`grass|${s}|${v}`, 34, 36, 17, 30, (ctx) => {
      const rng = new RNG(400 + v * 13);
      const H = [10, 20, 24, 16][s] * (v === 2 ? 0.6 : 1);
      const n = 12 + v * 2;
      for (let k = 0; k < n; k++) {
        const x0 = rng.range(-4, 4), h = H * rng.range(0.6, 1.1), bend = rng.range(-6, 6);
        let col = rng.pick(GRASS[s]);
        if (s === 2 && v === 1) col = rng.pick(['#c49a4a', '#d0a850', '#b88c40']);
        ctx.strokeStyle = sh(col, rng.range(0.82, 1.12));
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.quadraticCurveTo(x0 + bend * 0.2, -h * 0.6, x0 + bend, -h);
        ctx.stroke();
        if ((s === 1 || s === 2) && k % 4 === 0 && v !== 2) {
          // seed heads ("turkey foot" of big bluestem)
          ctx.strokeStyle = s === 2 ? '#7a4a2a' : '#8a6a4a';
          ctx.lineWidth = 0.7;
          for (const t of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(x0 + bend, -h); ctx.lineTo(x0 + bend + t * 2.5, -h - 3.5); ctx.stroke(); }
        }
      }
      if (s === 3) { ctx.fillStyle = 'rgba(240,245,250,0.9)'; ell(ctx, 0, 0, 7, 2.2); ctx.fill(); }
    });

  Sprites.flowers = (s, v) =>
    Sprites.make(`fl|${s}|${v}`, 24, 26, 12, 20, (ctx) => {
      const rng = new RNG(900 + v * 5 + s);
      const cols = [['#b9a0d8', '#f2efe6'], ['#c06aa0', '#e8c040'], ['#e0c040', '#8a6ac0'], ['#8a7660', '#6e5c4a']][s];
      for (let k = 0; k < 6; k++) {
        const x = rng.range(-6, 6), h = rng.range(5, s === 1 ? 14 : 10);
        line(ctx, [x, 0], [x + rng.range(-1, 1), -h], s === 3 ? '#8a7660' : '#5f7a3a', 0.8);
        const c = rng.pick(cols);
        if (s === 2 && c === '#e0c040') {
          ctx.strokeStyle = c; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x + 2, -h - 4); ctx.stroke();
        } else {
          ctx.fillStyle = c;
          ell(ctx, x, -h, s === 1 ? 2.2 : 1.6, s === 1 ? 1.5 : 1.2);
          ctx.fill();
          if (s === 1) { ctx.fillStyle = '#4a2a1a'; ell(ctx, x, -h - 0.3, 0.8, 0.8); ctx.fill(); }
        }
      }
    });

  Sprites.cattail = (s, v) =>
    Sprites.make(`ct|${s}|${v}`, 28, 42, 14, 36, (ctx) => {
      const rng = new RNG(700 + v * 11);
      const n = 7 + v;
      for (let k = 0; k < n; k++) {
        const x = rng.range(-6, 6), h = rng.range(16, 28) * (s === 0 ? 0.6 : 1), b = rng.range(-3, 3);
        const leaf = s === 3 ? '#b8a27a' : s === 2 ? '#9a9a52' : '#6f8f42';
        ctx.strokeStyle = sh(leaf, rng.range(0.85, 1.1));
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x, -h * 0.6, x + b, -h);
        ctx.stroke();
        if (k % 2 === 0 && s !== 0) {
          ctx.fillStyle = s === 3 ? '#cbbba0' : '#5a3a22';
          ell(ctx, x + b * 0.8, -h * 0.85, 1.7, 3.6);
          ctx.fill();
        }
      }
      if (s === 3) { ctx.fillStyle = 'rgba(240,245,250,0.9)'; ell(ctx, 0, 0, 8, 2.4); ctx.fill(); }
    });

  function bush(ctx, rng, r, cols, s, berries) {
    shadow(ctx, 4, 1, r * 1.1, r * 0.45, 0.2);
    if (!cols) {
      ctx.strokeStyle = '#5a4838';
      for (let k = 0; k < 9; k++) {
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(rng.range(-2, 2), 0);
        ctx.lineTo(rng.range(-r, r), -rng.range(r * 0.6, r * 1.5));
        ctx.stroke();
      }
      if (berries) {
        for (let k = 0; k < 6; k++) { ctx.fillStyle = '#9a2a20'; ell(ctx, rng.range(-r * 0.6, r * 0.6), -rng.range(r * 0.7, r * 1.3), 1.3, 1.8); ctx.fill(); }
      }
      ctx.fillStyle = 'rgba(240,245,250,0.9)';
      ell(ctx, 0, 0, r * 0.8, 2.4);
      ctx.fill();
      return;
    }
    for (let k = 0; k < 8; k++) {
      const x = rng.range(-r * 0.6, r * 0.6), y = -r * 0.6 + rng.range(-r * 0.35, r * 0.25), rr = rng.range(r * 0.4, r * 0.62);
      const c = rng.pick(cols);
      const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.4, 0.5, x, y, rr);
      g.addColorStop(0, sh(c, 1.18));
      g.addColorStop(1, sh(c, 0.72));
      ctx.fillStyle = g;
      ell(ctx, x, y, rr, rr * 0.85);
      ctx.fill();
    }
    if (berries) {
      for (let k = 0; k < 9; k++) {
        ctx.fillStyle = berries;
        ell(ctx, rng.range(-r * 0.6, r * 0.6), -r * 0.6 + rng.range(-r * 0.3, r * 0.3), 1.1, 1.1);
        ctx.fill();
      }
    }
  }
  Sprites.shrub = (s, v) =>
    Sprites.make(`sh|${s}|${v}`, 34, 30, 17, 24, (ctx) => {
      const cols = [['#7fa850', '#6c9846'], ['#4e7334', '#5c7f3a'], ['#a8783a', '#8a6a30', '#b8902e'], null][s];
      bush(ctx, new RNG(300 + v), 9 + v, cols, s);
    });
  Sprites.sumac = (s, v) =>
    Sprites.make(`su|${s}|${v}`, 34, 32, 17, 26, (ctx) => {
      const cols = [['#8ab052', '#7aa048'], ['#4f7a36', '#5c8a3e'], ['#c8302a', '#e04a2a', '#b8282a'], null][s];
      bush(ctx, new RNG(600 + v), 10, cols, s, s >= 2 ? '#8a1e1a' : null);
    });
  Sprites.berry = (s, v) =>
    Sprites.make(`be|${s}|${v}`, 34, 30, 17, 24, (ctx) => {
      const cols = [['#7fa850', '#6c9846'], ['#4e7334', '#5c7f3a'], ['#8a6a3a', '#7a5a34'], null][s];
      const ber = s === 0 ? '#f4f0e8' : s === 1 ? (v ? '#3a2a5a' : '#b0242a') : null;
      bush(ctx, new RNG(800 + v), 9, cols, s, ber);
    });
  Sprites.rock = (s, v) =>
    Sprites.make(`rk|${s}|${v}`, 32, 22, 16, 15, (ctx) => {
      const rng = new RNG(50 + v);
      shadow(ctx, 3, 1, 10, 3.6, 0.22);
      const n = 1 + (v % 3);
      for (let k = 0; k < n; k++) {
        const x = rng.range(-5, 5), r = rng.range(3.5, 7);
        const g = ctx.createRadialGradient(x - r * 0.4, -r * 0.6, 0.5, x, -r * 0.3, r);
        g.addColorStop(0, '#a8a29a');
        g.addColorStop(1, '#5e5852');
        ctx.fillStyle = g;
        ell(ctx, x, -r * 0.35, r, r * 0.7);
        ctx.fill();
        if (s === 3) { ctx.fillStyle = SNOW; ell(ctx, x - 0.5, -r * 0.75, r * 0.75, r * 0.3); ctx.fill(); }
      }
    });
  Sprites.stump = (s, v) =>
    Sprites.make(`st|${s}|${v}`, 22, 20, 11, 13, (ctx) => {
      const r = 3.6 + v * 0.6;
      shadow(ctx, 2, 1, r * 1.3, r * 0.5, 0.2);
      ctx.fillStyle = '#5a4434';
      ctx.fillRect(-r, -5, r * 2, 5);
      ell(ctx, 0, 0, r, r * 0.5);
      ctx.fill();
      ctx.fillStyle = s === 3 ? SNOW : '#a88a66';
      ell(ctx, 0, -5, r, r * 0.5);
      ctx.fill();
      if (s !== 3) {
        ctx.strokeStyle = '#7a6048';
        ctx.lineWidth = 0.5;
        ell(ctx, 0, -5, r * 0.5, r * 0.25);
        ctx.stroke();
      }
    });

  // ------------------------------------------------------------------ field tile (hills of maize, beans and squash)
  function cornPlant(ctx, x, y, h, stage, rng, s) {
    const green = stage >= 6 ? rng.pick(['#b8a45a', '#a8944e', '#c4b068', '#8f9a4a']) : rng.pick(['#4f7a32', '#5a8638', '#46702c']);
    const lean = rng.range(-1.5, 1.5);
    line(ctx, [x, y], [x + lean, y - h], sh(green, 0.9), stage >= 4 ? 1.4 : 1);
    const nl = stage >= 4 ? 5 : 3;
    for (let k = 0; k < nl; k++) {
      const t = 0.2 + (k / nl) * 0.7;
      const px = x + lean * t, py = y - h * t;
      const side = k % 2 ? 1 : -1;
      const len = h * (stage >= 4 ? 0.45 : 0.5) * (1 - t * 0.4);
      ctx.strokeStyle = sh(green, rng.range(0.9, 1.15));
      ctx.lineWidth = stage >= 4 ? 1.4 : 1.1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + side * len * 0.6, py - len * 0.35, px + side * len, py + len * 0.15 + (stage >= 6 ? len * 0.3 : 0));
      ctx.stroke();
    }
    if (stage >= 5) {
      ctx.strokeStyle = stage >= 6 ? '#8a6a3a' : '#c8b070';
      ctx.lineWidth = 0.7;
      for (const t of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(x + lean, y - h); ctx.lineTo(x + lean + t * 2.5, y - h - 4); ctx.stroke(); }
      ctx.fillStyle = stage >= 6 ? '#d6c08a' : '#8aa850';
      ctx.save();
      ctx.translate(x + lean * 0.5 + 1.5, y - h * 0.52);
      ctx.rotate(0.5);
      ell(ctx, 0, 0, 1.4, 3.6);
      ctx.fill();
      ctx.restore();
    }
    if (stage === 4 || stage === 5) {
      // bean vines climbing the stalk
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = rng.pick(['#3a6a2a', '#42742e']);
        ell(ctx, x + lean * (k / 4) + rng.range(-1.6, 1.6), y - h * (0.15 + k * 0.17), 1.4, 1.1);
        ctx.fill();
      }
    }
  }
  function squash(ctx, x, y, stage, rng) {
    const n = stage >= 4 ? 4 : 2;
    for (let k = 0; k < n; k++) {
      const a = rng.range(0, Math.PI * 2), r = stage >= 4 ? rng.range(4, 9) : rng.range(2, 4);
      const lx = x + Math.cos(a) * r, ly = y + Math.sin(a) * r * 0.5;
      ctx.fillStyle = stage >= 6 ? rng.pick(['#8a8a4a', '#7a7a42']) : rng.pick(['#4e7a35', '#5a8a3c', '#467030']);
      ell(ctx, lx, ly - 1, stage >= 4 ? 3.6 : 2.2, stage >= 4 ? 2.4 : 1.5);
      ctx.fill();
    }
    if (stage === 5) { ctx.fillStyle = '#e8c030'; ell(ctx, x + rng.range(-5, 5), y + 1, 1.4, 1); ctx.fill(); }
    if (stage === 6) {
      ctx.fillStyle = rng.pick(['#d07a28', '#e09a30', '#c8a040']);
      ell(ctx, x + rng.range(-6, 6), y + rng.range(0, 3), 3.4, 2.6);
      ctx.fill();
    }
  }
  Sprites.field = (stage, v) =>
    Sprites.make(`field|${stage}|${v}`, 76, 74, 38, 50, (ctx) => {
      const rng = new RNG(2000 + stage * 31 + v * 7);
      const hills = [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]];
      const snowy = stage === 8;
      if (stage === 0) {
        for (let k = 0; k < 7; k++) {
          const q = P(rng.range(-0.45, 0.45), rng.range(-0.45, 0.45));
          line(ctx, q, [q[0] + rng.range(-5, 5), q[1] + rng.range(-1.5, 1.5)], '#a08a62', 0.9);
        }
        return;
      }
      for (const [hx, hy] of hills) {
        const q = P(hx + rng.range(-0.04, 0.04), hy + rng.range(-0.04, 0.04));
        // the hill of earth
        ctx.fillStyle = snowy ? SNOW2 : '#4a3220';
        ell(ctx, q[0], q[1] + 1, 9.5, 4.8);
        ctx.fill();
        ctx.fillStyle = snowy ? SNOW : '#6a4a30';
        ell(ctx, q[0] - 1, q[1] - 0.5, 7.5, 3.6);
        ctx.fill();
        if (stage === 1) continue;
        if (stage === 2) {
          for (let k = 0; k < 3; k++) line(ctx, [q[0] + k * 2.5 - 2.5, q[1] - 1], [q[0] + k * 2.5 - 2.3, q[1] - 4.5], '#6aa040', 1);
          continue;
        }
        if (stage >= 3 && stage <= 6) squash(ctx, q[0], q[1] + 2, stage, rng);
        const H = { 3: 11, 4: 26, 5: 32, 6: 30, 7: 7, 8: 6 }[stage];
        for (let k = 0; k < 3; k++) {
          const ox = (k - 1) * 3 + rng.range(-0.8, 0.8);
          if (stage >= 7) {
            line(ctx, [q[0] + ox, q[1] - 1], [q[0] + ox + rng.range(-2, 2), q[1] - H * rng.range(0.6, 1.1)], snowy ? '#a89470' : '#b49a6a', 1.2);
          } else cornPlant(ctx, q[0] + ox, q[1] - 1, H * rng.range(0.85, 1.1), stage, rng);
        }
      }
    });

  Sprites.SNOW = SNOW;
  Sprites.P = P;
  Sprites.RX = RX;
  Sprites.RY = RY;
})();
