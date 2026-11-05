/* Traditions Matter — more procedural sprites: wildflowers by species,
   forest-floor and wetland plants, berry bushes, beaver lodges, and the
   newcomers' buildings, fields, fences and ruins. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U, RNG } = TM;
  const S = TM.Sprites;
  const sh = U.shade;
  const P = S.P;
  const SNOW = S.SNOW;

  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); }
  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  function line(ctx, a, b, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  function shadow(ctx, x, y, rx, ry, a = 0.24) { ctx.fillStyle = `rgba(28,20,10,${a})`; ell(ctx, x, y, rx, ry); ctx.fill(); }
  const stem = (ctx, x, h, bend, col, w = 0.8) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + bend * 0.3, -h * 0.6, x + bend, -h); ctx.stroke(); return [x + bend, -h]; };

  // ------------------------------------------------------------------ wildflowers, each blooming in its own season
  Sprites2Flower();
  function Sprites2Flower() {
    const BLOOM = TM.BLOOM;
    S.flower = (sp, s, v) => S.make(`fw|${sp}|${s}|${v}`, 28, 34, 14, 28, (ctx) => {
      const rng = new RNG(TM.hashStr(sp) + v * 13);
      const on = (BLOOM[sp] || [1]).includes(s);
      const green = s === 3 ? '#8a7660' : s === 2 ? '#7a7a42' : '#5f7a3a';
      const n = 3 + v;
      for (let k = 0; k < n; k++) {
        const x = rng.range(-6, 6);
        let h = rng.range(7, 14);
        if (sp === 'blazingstar' || sp === 'goldenrod') h = rng.range(11, 18);
        if (sp === 'pasque') h = rng.range(3, 6);
        const tip = stem(ctx, x, h, rng.range(-1.5, 1.5), green, 0.8);
        if (!on) {
          if (s !== 0) { ctx.fillStyle = s === 3 ? '#6e5c4a' : '#8a7a50'; ell(ctx, tip[0], tip[1], 1, 1.2); ctx.fill(); }
          continue;
        }
        switch (sp) {
          case 'coneflower':
            ctx.strokeStyle = '#c06aa0'; ctx.lineWidth = 0.9;
            for (const a of [-2.4, -1.8, -1.3, -0.8]) { ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] + Math.cos(a) * 3, tip[1] - Math.sin(a) * 2.6 + 1.2); ctx.stroke(); }
            ctx.fillStyle = '#6a3a1a'; ell(ctx, tip[0], tip[1] - 0.5, 1.2, 1.3); ctx.fill();
            break;
          case 'blackeyed':
            ctx.fillStyle = '#e8b830'; ell(ctx, tip[0], tip[1], 2.6, 1.6); ctx.fill();
            ctx.fillStyle = '#3a2416'; ell(ctx, tip[0], tip[1] - 0.2, 0.9, 0.9); ctx.fill();
            break;
          case 'blazingstar':
            ctx.strokeStyle = '#9a4aaa'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0], tip[1] + 6); ctx.stroke();
            break;
          case 'goldenrod':
            ctx.strokeStyle = '#e0b830'; ctx.lineWidth = 1.6;
            for (const d of [-2, 0, 2]) { ctx.beginPath(); ctx.moveTo(tip[0], tip[1] + 3); ctx.quadraticCurveTo(tip[0] + d, tip[1] - 1, tip[0] + d * 1.6, tip[1] + 1.5); ctx.stroke(); }
            break;
          case 'aster':
            ctx.fillStyle = rng.pick(['#8a6ac0', '#7a7ad0', '#a888d8']); ell(ctx, tip[0], tip[1], 1.6, 1.2); ctx.fill();
            ctx.fillStyle = '#e8c040'; ell(ctx, tip[0], tip[1], 0.5, 0.5); ctx.fill();
            break;
          case 'milkweed':
            ctx.fillStyle = '#d88aa8'; ell(ctx, tip[0], tip[1], 2, 1.8); ctx.fill();
            ctx.fillStyle = '#5a7a3a'; ell(ctx, tip[0] + 1.5, tip[1] + 4, 2, 1); ctx.fill();
            break;
          case 'turnip':
            ctx.fillStyle = '#7a7ad0'; for (let j = 0; j < 4; j++) { ell(ctx, tip[0], tip[1] + j * 1.3, 1.3 - j * 0.15, 0.7); ctx.fill(); }
            break;
          case 'rose':
            ctx.fillStyle = s >= 2 ? '#c0302a' : '#e888a8'; ell(ctx, tip[0], tip[1], s >= 2 ? 1 : 1.8, s >= 2 ? 1 : 1.3); ctx.fill();
            break;
          case 'bergamot':
            ctx.fillStyle = '#b898d8'; ell(ctx, tip[0], tip[1], 1.9, 1.6); ctx.fill();
            break;
          case 'pasque':
            ctx.fillStyle = '#b9a0d8'; ell(ctx, tip[0], tip[1], 1.8, 1.4); ctx.fill();
            ctx.fillStyle = '#e8c040'; ell(ctx, tip[0], tip[1] - 0.3, 0.5, 0.4); ctx.fill();
            break;
          default:
            ctx.fillStyle = '#e8e0d0'; ell(ctx, tip[0], tip[1], 1.4, 1.1); ctx.fill();
        }
      }
      if (s === 3) { ctx.fillStyle = 'rgba(240,245,250,0.9)'; ell(ctx, 0, 0, 6, 1.8); ctx.fill(); }
    });
  }

  // ------------------------------------------------------------------ forest floor
  S.floor = (sp, s, v) => S.make(`fl2|${sp}|${s}|${v}`, 30, 26, 15, 20, (ctx) => {
    const rng = new RNG(TM.hashStr(sp) + v * 7);
    if (s === 3) { if (sp === 'fern') { ctx.fillStyle = '#8a6a48'; ell(ctx, 0, -1, 6, 2); ctx.fill(); } return; }
    if (sp === 'fern') {
      const col = s === 2 ? '#b8862e' : s === 0 ? '#7aaa48' : '#4f7a34';
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.38 + rng.range(-0.1, 0.1), len = rng.range(7, 11);
        const ex = Math.cos(a) * len, ey = Math.sin(a) * len * 0.8;
        ctx.strokeStyle = col; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(ex * 0.5, ey * 0.7 - 2, ex, ey); ctx.stroke();
        ctx.strokeStyle = sh(col, 1.15); ctx.lineWidth = 0.6;
        for (let j = 1; j < 4; j++) { const t = j / 4; ctx.beginPath(); ctx.moveTo(ex * t, ey * t); ctx.lineTo(ex * t + 1.6, ey * t - 1); ctx.moveTo(ex * t, ey * t); ctx.lineTo(ex * t - 1.6, ey * t - 0.6); ctx.stroke(); }
      }
    } else if (sp === 'trillium' || sp === 'mayapple') {
      if (s !== 0 && sp === 'trillium') return;
      for (let k = 0; k < 3; k++) {
        const x = rng.range(-6, 6), h = rng.range(4, 7);
        const tip = stem(ctx, x, h, 0, '#5f7a3a', 0.8);
        ctx.fillStyle = sp === 'mayapple' ? (s === 2 ? '#a89a4a' : '#5f8a3a') : '#6f9a48';
        ell(ctx, tip[0], tip[1], sp === 'mayapple' ? 4 : 3, sp === 'mayapple' ? 1.6 : 1.4); ctx.fill();
        if (sp === 'trillium') { ctx.fillStyle = '#f4f0e8'; ell(ctx, tip[0], tip[1] - 1.4, 1.6, 1.2); ctx.fill(); }
        if (sp === 'mayapple' && s === 1) { ctx.fillStyle = '#d8c858'; ell(ctx, tip[0] + 1, tip[1] + 2, 1, 1); ctx.fill(); }
      }
    } else if (sp === 'mushroom') {
      if (s !== 0 && s !== 2) return;
      for (let k = 0; k < 3; k++) {
        const x = rng.range(-5, 5);
        ctx.fillStyle = '#d8ccb0'; ctx.fillRect(x - 0.5, -2.5, 1, 2.5);
        ctx.fillStyle = s === 0 ? '#9a7a52' : '#b8643a'; ell(ctx, x, -3.5, 1.4, 2); ctx.fill();
      }
    }
  });

  // ------------------------------------------------------------------ berry bushes by species
  S.berry2 = (sp, s, v) => S.make(`br|${sp}|${s}|${v}`, 36, 32, 18, 25, (ctx) => {
    const rng = new RNG(TM.hashStr(sp) + v * 3);
    const leaves = [['#7fa850', '#6c9846'], ['#4e7334', '#5c7f3a'], ['#a8783a', '#8a6a30', '#9a4a2a'], null][s];
    shadow(ctx, 4, 1, 11, 4, 0.2);
    if (sp === 'strawberry') {
      if (s === 3) return;
      for (let k = 0; k < 9; k++) { ctx.fillStyle = rng.pick(leaves || ['#7a6a4a']); ell(ctx, rng.range(-8, 8), rng.range(-3, 1), 2.4, 1.4); ctx.fill(); }
      if (s === 0) for (let k = 0; k < 5; k++) { ctx.fillStyle = '#f4f0e8'; ell(ctx, rng.range(-7, 7), rng.range(-4, 0), 0.9, 0.9); ctx.fill(); }
      if (s === 1) for (let k = 0; k < 7; k++) { ctx.fillStyle = '#d0242a'; ell(ctx, rng.range(-7, 7), rng.range(-3, 0.5), 0.9, 1.1); ctx.fill(); }
      return;
    }
    if (sp === 'raspberry') {
      const col = s === 3 ? '#7a4a3a' : s === 2 ? '#8a3a2a' : '#6a5a3a';
      for (let k = 0; k < 10; k++) {
        const x0 = rng.range(-5, 5), h = rng.range(9, 15), bend = rng.range(-9, 9);
        ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.quadraticCurveTo(x0 + bend * 0.4, -h, x0 + bend, -h * 0.45); ctx.stroke();
        if (leaves) { ctx.fillStyle = rng.pick(leaves); ell(ctx, x0 + bend * 0.5, -h * 0.75, 2.6, 1.8); ctx.fill(); }
      }
      if (s === 1) for (let k = 0; k < 10; k++) { ctx.fillStyle = rng.pick(['#b0243a', '#5a1a3a']); ell(ctx, rng.range(-8, 8), rng.range(-12, -4), 1, 1); ctx.fill(); }
      if (s === 3) { ctx.fillStyle = 'rgba(240,245,250,0.9)'; ell(ctx, 0, 0, 8, 2.4); ctx.fill(); }
      return;
    }
    // chokecherry and elderberry: a taller shrub with hanging or flat clusters
    const r = sp === 'elderberry' ? 11 : 10;
    ctx.strokeStyle = '#5a4838';
    for (let k = 0; k < 5; k++) { ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(rng.range(-2, 2), 0); ctx.lineTo(rng.range(-r, r), -rng.range(r * 0.8, r * 1.6)); ctx.stroke(); }
    if (leaves) {
      for (let k = 0; k < 9; k++) {
        const x = rng.range(-r * 0.7, r * 0.7), y = -r * 0.9 + rng.range(-r * 0.4, r * 0.3), rr = rng.range(r * 0.35, r * 0.55);
        const c = rng.pick(leaves);
        const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.4, 0.5, x, y, rr);
        g.addColorStop(0, sh(c, 1.18)); g.addColorStop(1, sh(c, 0.72));
        ctx.fillStyle = g; ell(ctx, x, y, rr, rr * 0.85); ctx.fill();
      }
    } else { ctx.fillStyle = 'rgba(240,245,250,0.9)'; ell(ctx, 0, 0, r * 0.8, 2.4); ctx.fill(); }
    if (s === 0) for (let k = 0; k < 6; k++) { ctx.fillStyle = '#f4f0e8'; ell(ctx, rng.range(-r * 0.6, r * 0.6), -r * 0.9 + rng.range(-r * 0.4, r * 0.2), sp === 'elderberry' ? 2.4 : 1.2, sp === 'elderberry' ? 1 : 2); ctx.fill(); }
    if (s === 1 || (s === 2 && sp === 'chokecherry')) for (let k = 0; k < 7; k++) {
      const x = rng.range(-r * 0.6, r * 0.6), y = -r * 0.8 + rng.range(-r * 0.3, r * 0.3);
      ctx.fillStyle = sp === 'elderberry' ? '#3a1a4a' : '#5a1020';
      for (let j = 0; j < 4; j++) { ell(ctx, x + (j % 2) * 1.2, y + j * 1.1, 0.8, 0.8); ctx.fill(); }
    }
  });

  // ------------------------------------------------------------------ wetland
  S.wildrice = (s, v) => S.make(`wr|${s}|${v}`, 28, 34, 14, 26, (ctx) => {
    if (s === 3) return;
    const rng = new RNG(60 + v);
    for (let k = 0; k < 10; k++) {
      const x = rng.range(-7, 7), h = s === 0 ? rng.range(3, 6) : rng.range(12, 20);
      const tip = stem(ctx, x, h, rng.range(-2, 2), s === 2 ? '#b8a45a' : '#7a9a4a', 0.8);
      if (s >= 1 && k % 2 === 0) { ctx.strokeStyle = s === 2 ? '#8a6a3a' : '#a8a070'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] + 1, tip[1] + 4); ctx.stroke(); }
    }
    ctx.strokeStyle = 'rgba(220,235,235,0.35)'; ctx.lineWidth = 0.6; ell(ctx, 0, 0.5, 8, 2); ctx.stroke();
  });
  S.lily = (s, v) => S.make(`ly|${s}|${v}`, 30, 18, 15, 10, (ctx) => {
    if (s === 3) return;
    const rng = new RNG(80 + v);
    for (let k = 0; k < 5; k++) {
      const x = rng.range(-8, 8), y = rng.range(-3, 3), r = rng.range(2.2, 3.4);
      ctx.fillStyle = rng.pick(['#4e7a3a', '#5a8a42', '#46703a']);
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0.35, Math.PI * 2 - 0.1); ctx.lineTo(x, y); ctx.fill();
    }
    if (s === 1) for (let k = 0; k < 2; k++) { ctx.fillStyle = '#f6f2ea'; ell(ctx, rng.range(-5, 5), rng.range(-3, 1) - 1, 1.6, 1); ctx.fill(); ctx.fillStyle = '#e8c040'; ell(ctx, 0, 0, 0, 0); }
  });
  S.beaverlodge = (s, v) => S.make(`bl|${s}|${v}`, 60, 36, 30, 22, (ctx) => {
    const rng = new RNG(90 + v);
    ctx.fillStyle = 'rgba(220,235,235,0.25)'; ell(ctx, 0, 1, 24, 8); ctx.fill();
    const g = ctx.createRadialGradient(-6, -10, 2, 0, -4, 22);
    g.addColorStop(0, '#7a6048'); g.addColorStop(1, '#3e2e22');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 14, 0, Math.PI, 0); ctx.ellipse(0, 0, 20, 6, 0, 0, Math.PI); ctx.fill();
    ctx.lineWidth = 1;
    for (let k = 0; k < 40; k++) {
      const a = rng.range(Math.PI, Math.PI * 2), rr = rng.range(0.3, 1);
      const x = Math.cos(a) * 19 * rr, y = Math.sin(a) * 13 * rr;
      ctx.strokeStyle = rng.pick(['#5a4430', '#8a6a48', '#3e2e22', '#a08060']);
      const t = rng.range(-1.2, 1.2);
      ctx.beginPath(); ctx.moveTo(x - Math.cos(t) * 4, y - Math.sin(t) * 2); ctx.lineTo(x + Math.cos(t) * 4, y + Math.sin(t) * 2); ctx.stroke();
    }
    if (s === 3) { ctx.fillStyle = SNOW; ctx.beginPath(); ctx.ellipse(0, -6, 14, 7, 0, Math.PI, 0); ctx.fill(); }
  });
  S.sunflower = (s, v) => S.make(`sf|${s}|${v}`, 30, 60, 15, 54, (ctx) => {
    if (s === 0) return;
    const rng = new RNG(70 + v);
    for (let k = 0; k < 2 + v % 2; k++) {
      const x = rng.range(-5, 5), h = s === 1 ? rng.range(30, 42) : rng.range(34, 46);
      const col = s === 3 ? '#8a7660' : s === 2 ? '#8a8a3a' : '#5a7a32';
      const tip = stem(ctx, x, h, rng.range(-2, 2), col, 1.4);
      for (let j = 1; j < 4; j++) { ctx.fillStyle = col; ell(ctx, x + (j % 2 ? 2.4 : -2.4), -h * j / 4, 2.6, 1.4); ctx.fill(); }
      if (s === 3) { ctx.fillStyle = '#5a4430'; ell(ctx, tip[0], tip[1] + 1, 2.4, 2); ctx.fill(); continue; }
      ctx.fillStyle = s === 2 ? '#c89a2a' : '#f0c030';
      for (let j = 0; j < 10; j++) { const a = (j / 10) * Math.PI * 2; ell(ctx, tip[0] + Math.cos(a) * 3, tip[1] + Math.sin(a) * 2.6, 1.4, 0.9); ctx.fill(); }
      ctx.fillStyle = '#4a2e18'; ell(ctx, tip[0], tip[1], 2.2, 2); ctx.fill();
    }
  });

  // ------------------------------------------------------------------ hearth kettle, palisade post
  S.kettle = () => S.make('kettle', 30, 34, 15, 24, (ctx) => {
    line(ctx, [-7, 0], [-5, -6], '#6e6964', 2.5);
    line(ctx, [7, 0], [5, -6], '#6e6964', 2.5);
    const g = ctx.createLinearGradient(-8, -16, 8, -4);
    g.addColorStop(0, '#e8a860'); g.addColorStop(0.5, '#b86a30'); g.addColorStop(1, '#6a3a1a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-7.5, -15); ctx.lineTo(7.5, -15); ctx.quadraticCurveTo(8, -4, 0, -3); ctx.quadraticCurveTo(-8, -4, -7.5, -15); ctx.fill();
    ctx.fillStyle = '#3a2216'; ell(ctx, 0, -15, 7.5, 1.8); ctx.fill();
    ctx.strokeStyle = '#4a4440'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(0, -15, 7.5, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  });
  S.stake = (bucket, s) => S.make(`stk|${bucket}|${s}`, 40, 46, 20, 36, (ctx) => {
    const t = (bucket / 8) * Math.PI + Math.PI / 2;
    const dx = Math.cos(t), dy = Math.sin(t);
    const pts = [-0.36, -0.12, 0.12, 0.36].map((d) => [dx * d, dy * d]);
    pts.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
    for (const [x, y] of pts) {
      const b = P(x, y, 0), top = P(x, y, 26);
      ctx.fillStyle = 'rgba(28,20,10,0.25)'; ell(ctx, b[0] + 3, b[1] + 1, 3, 1.2); ctx.fill();
      const g = ctx.createLinearGradient(b[0] - 2.4, 0, b[0] + 2.4, 0);
      g.addColorStop(0, '#9a7a56'); g.addColorStop(1, '#5a4230');
      ctx.fillStyle = g;
      poly(ctx, [[b[0] - 2.4, b[1]], [b[0] + 2.4, b[1]], [top[0] + 2.4, top[1]], [top[0], top[1] - 5], [top[0] - 2.4, top[1]]]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,28,18,0.6)'; ctx.lineWidth = 0.6; ctx.stroke();
      if (s === 3) { ctx.fillStyle = SNOW; ell(ctx, top[0], top[1] - 1.5, 1.6, 1.2); ctx.fill(); }
    }
  });

  // ------------------------------------------------------------------ the newcomers' fields
  S.wheat = (s, m, v) => S.make(`wh|${s}|${m}|${v}`, 72, 56, 36, 34, (ctx) => {
    const rng = new RNG(300 + v * 11 + s * 3 + m);
    if (s === 3) {
      for (let k = 0; k < 14; k++) { const q = P(rng.range(-0.45, 0.45), rng.range(-0.45, 0.45)); line(ctx, q, [q[0] + rng.range(-1, 1), q[1] - 3], '#b8a070', 0.8); }
      return;
    }
    let h, col, head;
    if (s === 0) { h = m === 0 ? 0 : 3 + m * 2; col = '#7aa848'; head = null; }
    else if (s === 1) { h = 10 + m * 4; col = m === 2 ? '#c8a848' : '#8aaa48'; head = m >= 1 ? (m === 2 ? '#d8b850' : '#a8b860') : null; }
    else { h = m === 0 ? 20 : 3; col = m === 0 ? '#d4b450' : '#b89a5a'; head = m === 0 ? '#e0c060' : null; }
    if (h <= 0) {
      for (let r = -0.4; r <= 0.4; r += 0.2) line(ctx, P(-0.45, r), P(0.45, r), 'rgba(70,50,30,0.35)', 1);
      return;
    }
    for (let r = -0.38; r <= 0.4; r += 0.19) {
      for (let c = -0.42; c <= 0.42; c += 0.07) {
        const q = P(c + rng.range(-0.02, 0.02), r + rng.range(-0.03, 0.03));
        const hh = h * rng.range(0.8, 1.15), b = rng.range(-1.5, 1.5);
        line(ctx, q, [q[0] + b, q[1] - hh], sh(col, rng.range(0.85, 1.1)), 0.9);
        if (head) { ctx.fillStyle = head; ell(ctx, q[0] + b, q[1] - hh - 1, 0.8, 2); ctx.fill(); }
      }
    }
    if (s === 2 && m === 1 && v === 0) {
      // sheaves stooked to dry
      for (const [x, y] of [[-0.2, -0.1], [0.2, 0.15]]) {
        const q = P(x, y);
        ctx.fillStyle = '#d4b45a';
        poly(ctx, [[q[0] - 4, q[1]], [q[0] + 4, q[1]], [q[0] + 1, q[1] - 12], [q[0] - 1, q[1] - 12]]); ctx.fill();
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(q[0] - 3, q[1] - 6); ctx.lineTo(q[0] + 3, q[1] - 6); ctx.stroke();
      }
    }
  });
  S.pasture = (s, v) => S.make(`pa|${s}|${v}`, 64, 44, 32, 26, (ctx) => {
    const rng = new RNG(400 + v);
    if (v === 0) {
      // a stretch of split-rail fence
      const a = P(-0.5, 0.42), b = P(0.5, 0.42);
      for (const z of [3, 7]) line(ctx, [a[0], a[1] - z], [b[0], b[1] - z], s === 3 ? '#8a7258' : '#7a5e40', 1.3);
      for (const t of [0, 0.5, 1]) { const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; line(ctx, q, [q[0], q[1] - 9], '#5e4630', 1.4); }
    }
    for (let k = 0; k < (v === 2 ? 2 : 1); k++) {
      const q = P(rng.range(-0.3, 0.3), rng.range(-0.3, 0.3));
      ctx.fillStyle = '#5a4434'; ctx.fillRect(q[0] - 3, q[1] - 4, 6, 4);
      ctx.fillStyle = s === 3 ? SNOW : '#a88a66'; ell(ctx, q[0], q[1] - 4, 3, 1.5); ctx.fill();
    }
  });

  // ------------------------------------------------------------------ the newcomers' buildings
  // log walls along an edge, from back to front
  function logWall(ctx, a, b, h, col, lit) {
    poly(ctx, [P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], h), P(a[0], a[1], h)]);
    ctx.fillStyle = sh(col, lit);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,12,0.45)';
    ctx.lineWidth = 0.7;
    for (let z = 2.6; z < h; z += 2.8) { const p = P(a[0], a[1], z), q = P(b[0], b[1], z); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(30,20,12,0.6)';
    poly(ctx, [P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], h), P(a[0], a[1], h)]);
    ctx.stroke();
  }
  function gableHouse(ctx, o) {
    // a box along x with a gable roof whose ridge runs along x; o: {x0,x1,y0,y1,h,rise,wall,roof,s,door,chimney,frame,ruin}
    const { x0, x1, y0, y1, h, rise, wall, roof, s } = o;
    const ym = (y0 + y1) / 2;
    ctx.fillStyle = 'rgba(28,20,10,0.26)';
    poly(ctx, [P(x0, y0), P(x1 + 0.35, y0), P(x1 + 0.35, y1 + 0.3), P(x0, y1 + 0.3)].map((q) => [q[0] + 5, q[1] + 3]));
    ctx.fill();
    if (s === 3) { ctx.fillStyle = SNOW; poly(ctx, [P(x0 - 0.2, y0 - 0.2), P(x1 + 0.25, y0 - 0.2), P(x1 + 0.25, y1 + 0.25), P(x0 - 0.2, y1 + 0.25)]); ctx.fill(); }
    const hh = o.ruin ? h * 0.45 : o.frame ? h * 0.55 : h;
    // back roof slope (visible above the ridge from behind) is skipped; draw walls then roof
    logWall(ctx, [x0, y1], [x1, y1], hh, o.ruin ? '#3a2e26' : wall, 0.86);
    // gable end facing +x
    const endPts = [P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, hh)];
    if (!o.frame && !o.ruin) endPts.push(P(x1, ym, h + rise));
    endPts.push(P(x1, y0, hh));
    poly(ctx, endPts);
    ctx.fillStyle = sh(o.ruin ? '#3a2e26' : wall, 0.64);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,12,0.45)';
    ctx.lineWidth = 0.7;
    for (let z = 2.6; z < hh; z += 2.8) { const p = P(x1, y0, z), q = P(x1, y1, z); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
    // log ends at the corner
    if (!o.ruin) { ctx.fillStyle = sh(wall, 1.25); for (let z = 1.4; z < hh; z += 2.8) { const q = P(x1 + 0.04, y1 + 0.04, z); ell(ctx, q[0], q[1], 1.2, 1.2); ctx.fill(); } }
    if (o.door && !o.frame) {
      const d0 = P((x0 + x1) / 2 - 0.12, y1 + 0.01, 0), d1 = P((x0 + x1) / 2 + 0.12, y1 + 0.01, 0);
      poly(ctx, [d0, d1, [d1[0], d1[1] - 11], [d0[0], d0[1] - 11]]);
      ctx.fillStyle = o.ruin ? '#1a1410' : '#4a3424';
      ctx.fill();
      if (!o.ruin) {
        const w0 = P(x0 + (x1 - x0) * 0.22, y1 + 0.01, 7), w1 = P(x0 + (x1 - x0) * 0.22 + 0.16, y1 + 0.01, 7);
        poly(ctx, [w0, w1, [w1[0], w1[1] - 4], [w0[0], w0[1] - 4]]);
        ctx.fillStyle = '#2a2018'; ctx.fill();
      }
    }
    if (o.frame) {
      // rafters and a pile of logs
      ctx.strokeStyle = '#8a6a48'; ctx.lineWidth = 1.2;
      for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 3) { const a = P(x, y0, h), b = P(x, ym, h + rise), c = P(x, y1, h); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
      for (let k = 0; k < 3; k++) { const q = P(x1 + 0.4, y1 - 0.2 + k * 0.12, 1.5 + k * 1.6); line(ctx, [q[0] - 10, q[1] - 5], [q[0] + 4, q[1] + 2], '#7a5a3a', 2.2); }
      return;
    }
    if (o.ruin) {
      ctx.fillStyle = 'rgba(30,26,24,0.5)'; ell(ctx, P((x0 + x1) / 2, ym)[0], P((x0 + x1) / 2, ym)[1], 20, 9); ctx.fill();
      if (o.chimney) { const c = P(x0 + 0.1, ym, 0); ctx.fillStyle = '#6e665e'; ctx.fillRect(c[0] - 3, c[1] - h - rise - 4, 6, h + rise + 4); }
      return;
    }
    // roof: front slope (toward +y) and its eaves
    const roofCol = s === 3 ? SNOW : roof;
    poly(ctx, [P(x0 - 0.12, y1 + 0.12, h - 1), P(x1 + 0.12, y1 + 0.12, h - 1), P(x1 + 0.12, ym, h + rise), P(x0 - 0.12, ym, h + rise)]);
    const g = ctx.createLinearGradient(0, P(0, ym, h + rise)[1], 0, P(0, y1, h)[1]);
    g.addColorStop(0, sh(roofCol, 1.1)); g.addColorStop(1, sh(roofCol, 0.82));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,12,0.5)'; ctx.lineWidth = 0.7; ctx.stroke();
    if (s !== 3) {
      ctx.strokeStyle = 'rgba(30,20,12,0.25)';
      for (let t = 0.25; t < 1; t += 0.25) { const a = P(x0 - 0.12, ym + (y1 + 0.12 - ym) * t, h + rise - (rise + 1) * t), b = P(x1 + 0.12, ym + (y1 + 0.12 - ym) * t, h + rise - (rise + 1) * t); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    }
    // the far roof slope shows as a sliver above the ridge
    poly(ctx, [P(x0 - 0.12, ym, h + rise), P(x1 + 0.12, ym, h + rise), P(x1 + 0.12, y0 - 0.12, h - 1 + 0.01), P(x0 - 0.12, y0 - 0.12, h - 1)]);
    ctx.fillStyle = sh(roofCol, 1.18);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (o.chimney) {
      const c0 = P(x0 + 0.12, ym, h + rise - 2);
      ctx.fillStyle = '#7a6a5a'; ctx.fillRect(c0[0] - 3, c0[1] - 10, 6, 12);
      ctx.fillStyle = '#5a4a3e'; ctx.fillRect(c0[0] - 3.5, c0[1] - 11, 7, 2);
    }
  }
  S.cabin = (s, v, state) => S.make(`cab|${s}|${v}|${state}`, 120, 96, 60, 62, (ctx) => {
    if (v % 2) ctx.scale(-1, 1);
    gableHouse(ctx, { x0: -0.72, x1: 0.72, y0: -0.6, y1: 0.6, h: 15, rise: 12, wall: ['#8a6a48', '#7a5e40', '#94744e'][v % 3], roof: '#5e5448', s, door: true, chimney: true, frame: state === 'frame', ruin: state === 'ruin' });
  });
  S.tradepost = (s, state) => S.make(`tp|${s}|${state}`, 190, 140, 95, 88, (ctx) => {
    gableHouse(ctx, { x0: -1.2, x1: 1.2, y0: -1, y1: 0.85, h: 18, rise: 14, wall: '#86684a', roof: '#4e4a44', s, door: true, chimney: true, ruin: state === 'ruin' });
    if (state === 'ruin') return;
    // barrels and bales of goods by the door
    for (const [x, y, k] of [[0.55, 1.15, 0], [0.8, 1.05, 1], [-0.5, 1.15, 2], [-0.2, 1.2, 0]]) {
      const q = P(x, y, 0);
      if (k === 2) { ctx.fillStyle = '#d8ccb0'; ctx.fillRect(q[0] - 5, q[1] - 6, 10, 6); ctx.strokeStyle = '#8a7a5a'; ctx.strokeRect(q[0] - 5, q[1] - 6, 10, 6); continue; }
      const g = ctx.createLinearGradient(q[0] - 3.5, 0, q[0] + 3.5, 0);
      g.addColorStop(0, '#9a7048'); g.addColorStop(1, '#5a3e28');
      ctx.fillStyle = g; ctx.fillRect(q[0] - 3.5, q[1] - 8, 7, 8);
      ctx.fillStyle = '#7a5a3a'; ell(ctx, q[0], q[1] - 8, 3.5, 1.4); ctx.fill();
      line(ctx, [q[0] - 3.5, q[1] - 3], [q[0] + 3.5, q[1] - 3], '#3a3030', 0.7);
    }
  });
  S.meeting = (s, state) => S.make(`mh|${s}|${state}`, 200, 170, 100, 110, (ctx) => {
    gableHouse(ctx, { x0: -1.5, x1: 1.5, y0: -1.15, y1: 1.15, h: 22, rise: 20, wall: '#b8b0a0', roof: '#4a4846', s, door: true, chimney: false, ruin: state === 'ruin' });
    if (state === 'ruin') return;
    // small bell cupola on the ridge
    const c = P(1.1, 0, 44);
    ctx.fillStyle = '#d8d0c0'; ctx.fillRect(c[0] - 4, c[1] - 10, 8, 10);
    ctx.fillStyle = '#2a2420'; ctx.fillRect(c[0] - 2, c[1] - 8, 4, 5);
    ctx.fillStyle = s === 3 ? SNOW : '#4a4846';
    poly(ctx, [[c[0] - 5.5, c[1] - 10], [c[0] + 5.5, c[1] - 10], [c[0], c[1] - 18]]); ctx.fill();
  });
  S.fort = (s, state) => S.make(`fort|${s}|${state}`, 520, 400, 260, 240, (ctx) => {
    const H = state === 'ruin' ? 12 : 26;
    const a0 = -3.3, a1 = 3.3;
    const ruin = state === 'ruin';
    const stockade = (from, to, gate) => {
      const n = Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.2);
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const x = from[0] + (to[0] - from[0]) * t, y = from[1] + (to[1] - from[1]) * t;
        if (gate && Math.abs(t - 0.5) < 0.09) continue;
        const hh = ruin ? H * (0.3 + ((k * 37) % 10) / 14) : H + ((k * 7) % 3);
        const b = P(x, y, 0), top = P(x, y, hh);
        ctx.fillStyle = ruin ? ((k % 3) ? '#2e2620' : '#4a3a2c') : (k % 2 ? '#8a6a48' : '#7a5c3e');
        poly(ctx, [[b[0] - 2.3, b[1]], [b[0] + 2.3, b[1]], [top[0] + 2.3, top[1]], [top[0], top[1] - (ruin ? 0 : 4)], [top[0] - 2.3, top[1]]]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,20,12,0.5)'; ctx.lineWidth = 0.5; ctx.stroke();
        if (s === 3 && !ruin) { ctx.fillStyle = SNOW; ell(ctx, top[0], top[1] - 1.5, 1.6, 1); ctx.fill(); }
      }
    };
    ctx.fillStyle = 'rgba(28,20,10,0.25)';
    poly(ctx, [P(a0, a0), P(a1 + 0.6, a0), P(a1 + 0.6, a1 + 0.5), P(a0, a1 + 0.5)].map((q) => [q[0] + 8, q[1] + 4]));
    ctx.fill();
    ctx.fillStyle = s === 3 ? '#dad6d0' : '#8a7458';
    poly(ctx, [P(a0, a0), P(a1, a0), P(a1, a1), P(a0, a1)]);
    ctx.fill();
    stockade([a0, a0], [a1, a0], false);
    stockade([a0, a0], [a0, a1], true);
    if (!ruin) {
      gableHouse(ctx, { x0: -2.2, x1: 0.6, y0: -2.4, y1: -1.2, h: 16, rise: 11, wall: '#7e6246', roof: '#55504a', s, door: true, chimney: true });
      gableHouse(ctx, { x0: 0.8, x1: 2.6, y0: -1, y1: 0.9, h: 15, rise: 10, wall: '#86684a', roof: '#5e5850', s, door: true });
      // blockhouse at the back corner, its upper storey jutting out
      ctx.save();
      ctx.translate(...P(-2.4, -2.4, 0));
      gableHouse(ctx, { x0: -0.7, x1: 0.7, y0: -0.7, y1: 0.7, h: 30, rise: 10, wall: '#6e5640', roof: '#4a4440', s, door: false });
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(30,26,24,0.55)'; ell(ctx, 0, P(0, 0)[1], 90, 40); ctx.fill();
    }
    stockade([a0, a1], [a1, a1], false);
    stockade([a1, a0], [a1, a1], false);
  });

  // ------------------------------------------------------------------ burned lodges
  S.ruin = (type, s) => S.make(`ruin|${type}|${s}`, type === 'longhouse' ? 300 : 110, type === 'longhouse' ? 160 : 80, type === 'longhouse' ? 150 : 55, type === 'longhouse' ? 100 : 52, (ctx) => {
    const rng = new RNG(TM.hashStr(type));
    const big = type === 'longhouse';
    ctx.fillStyle = s === 3 ? 'rgba(90,86,82,0.6)' : 'rgba(30,24,20,0.62)';
    ell(ctx, 0, 2, big ? 120 : 38, big ? 30 : 18);
    ctx.fill();
    for (let k = 0; k < (big ? 14 : 7); k++) {
      const x = rng.range(big ? -110 : -32, big ? 110 : 32), y = rng.range(-10, 12);
      ctx.strokeStyle = rng.pick(['#1e1814', '#2e241c', '#3a2e24']);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + rng.range(-6, 6), y - rng.range(10, 24), x + rng.range(-14, 14), y - rng.range(14, 30)); ctx.stroke();
    }
    for (let k = 0; k < 8; k++) { ctx.fillStyle = 'rgba(70,64,60,0.6)'; ell(ctx, rng.range(-30, 30) * (big ? 3 : 1), rng.range(-4, 10), 4, 2); ctx.fill(); }
  });
  // a ball and the curved sticks of the ball game
  S.ball = () => S.make('ball', 10, 10, 5, 5, (ctx) => { ctx.fillStyle = '#e8dcc4'; ell(ctx, 0, 0, 2.2, 2.2); ctx.fill(); ctx.strokeStyle = '#6a4a30'; ctx.lineWidth = 0.5; ctx.stroke(); });
})();
