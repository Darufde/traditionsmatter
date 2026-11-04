/* Traditions Matter — animated main-menu backdrop: dusk over the prairie
   edge, a river, bark lodges and hide tipis with smoke, a fire with people
   gathered around it, stars, fireflies and swaying grass. */
(function () {
  'use strict';
  const TM = window.TM;

  class MenuScene {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.layer = document.createElement('canvas');
      this.t = 0;
      this.mx = 0.5; this.my = 0.5;
      this.smoke = [];
      this.sparks = [];
      this.running = false;
      this.rng = new TM.RNG(20240611);
      this.onResize = () => this.resize();
      this.onMove = (e) => { this.mx = e.clientX / window.innerWidth; this.my = e.clientY / window.innerHeight; };
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.cv.style.display = 'block';
      window.addEventListener('resize', this.onResize);
      window.addEventListener('pointermove', this.onMove);
      this.resize();
      let last = performance.now();
      const loop = (now) => {
        if (!this.running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        this.frame(dt);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    stop() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.cv.style.display = 'none';
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('pointermove', this.onMove);
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth, h = window.innerHeight;
      this.w = w; this.h = h; this.dpr = dpr;
      this.cv.width = Math.round(w * dpr);
      this.cv.height = Math.round(h * dpr);
      const pad = 40;
      this.pad = pad;
      this.layer.width = Math.round((w + pad * 2) * dpr);
      this.layer.height = Math.round((h + pad) * dpr);
      this.horizon = h * 0.64;
      this.paintStatic();
      const rng = new TM.RNG(77);
      this.stars = [];
      for (let k = 0; k < 220; k++) this.stars.push({ x: rng.next() * w, y: rng.next() * this.horizon * 0.8, r: rng.range(0.4, 1.4), p: rng.range(0, 6), s: rng.range(0.5, 2) });
      this.flies = [];
      for (let k = 0; k < 26; k++) this.flies.push({ x: rng.next() * w, y: h * rng.range(0.78, 0.97), p: rng.range(0, 6), s: rng.range(0.3, 0.9) });
      this.grass = [];
      for (let x = -10; x < w + 10; x += 5) this.grass.push({ x, h: rng.range(h * 0.05, h * 0.12), b: rng.range(-8, 8), p: rng.range(0, 6), c: rng.chance(0.3) });
    }

    // the scene that does not move
    paintStatic() {
      const c = this.layer.getContext('2d');
      const dpr = this.dpr, pad = this.pad, W = this.w + pad * 2, H = this.h + pad, hz = this.horizon;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      const rng = new TM.RNG(5);
      const nz = TM.makeNoise(9);
      // sky
      const g = c.createLinearGradient(0, 0, 0, hz);
      g.addColorStop(0, '#121733');
      g.addColorStop(0.42, '#3a2d52');
      g.addColorStop(0.76, '#9c5248');
      g.addColorStop(0.93, '#de8f4f');
      g.addColorStop(1, '#f2b866');
      c.fillStyle = g;
      c.fillRect(0, 0, W, hz + 2);
      // sun low on the horizon
      const sx = W * 0.7, sy = hz - 6;
      const sg = c.createRadialGradient(sx, sy, 0, sx, sy, Math.min(W, H) * 0.45);
      sg.addColorStop(0, 'rgba(255,226,160,0.95)');
      sg.addColorStop(0.08, 'rgba(255,196,120,0.75)');
      sg.addColorStop(0.3, 'rgba(240,140,80,0.25)');
      sg.addColorStop(1, 'rgba(240,140,80,0)');
      c.fillStyle = sg;
      c.fillRect(0, 0, W, hz + 2);
      c.fillStyle = 'rgba(255,236,190,0.95)';
      c.beginPath();
      c.arc(sx, sy, Math.min(W, H) * 0.035, Math.PI, 0);
      c.fill();
      // thin clouds
      for (let k = 0; k < 9; k++) {
        const y = hz * rng.range(0.45, 0.88), x = rng.range(0, W), w = rng.range(W * 0.08, W * 0.22), hh = rng.range(4, 10);
        const cg = c.createRadialGradient(x, y, 0, x, y, w);
        cg.addColorStop(0, 'rgba(255,170,120,0.16)');
        cg.addColorStop(1, 'rgba(255,170,120,0)');
        c.save();
        c.translate(x, y);
        c.scale(1, hh / w);
        c.translate(-x, -y);
        c.fillStyle = cg;
        c.beginPath();
        c.arc(x, y, w, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      // distant hills
      const ridge = (base, amp, freq, col, seed) => {
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(0, H);
        for (let x = 0; x <= W; x += 4) c.lineTo(x, base - amp * nz.fbm(x * freq + seed, seed, 4));
        c.lineTo(W, H);
        c.closePath();
        c.fill();
      };
      ridge(hz + 4, H * 0.07, 0.004, '#5a3e52', 3);
      // the far tree line of the woodland
      c.fillStyle = '#2f2230';
      c.beginPath();
      c.moveTo(0, H);
      for (let x = 0; x <= W; x += 3) {
        const forest = 0.5 + 0.5 * Math.sin(x * 0.0035 + 1.2);
        const bump = Math.abs(Math.sin(x * 0.09 + nz.n2(x * 0.05, 1) * 4)) * 9 * forest;
        c.lineTo(x, hz + 10 - bump - forest * 16 - nz.fbm(x * 0.01, 4, 3) * 10);
      }
      c.lineTo(W, H);
      c.closePath();
      c.fill();
      // prairie plain
      const pg = c.createLinearGradient(0, hz, 0, H);
      pg.addColorStop(0, '#4a2f2c');
      pg.addColorStop(0.3, '#2c1d1a');
      pg.addColorStop(1, '#120c0b');
      c.fillStyle = pg;
      c.beginPath();
      c.moveTo(0, H);
      for (let x = 0; x <= W; x += 6) c.lineTo(x, hz + 18 + nz.fbm(x * 0.006, 8, 3) * 10);
      c.lineTo(W, H);
      c.closePath();
      c.fill();
      // river winding toward the viewer, catching the sunset
      const river = [];
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        const y = hz + 22 + t * t * (H - hz - 10);
        const x = W * (0.6 - 0.32 * t) + Math.sin(t * 5.5) * W * 0.06 * t;
        const w = 4 + t * t * W * 0.16;
        river.push([x, y, w]);
      }
      const rg = c.createLinearGradient(0, hz, 0, H);
      rg.addColorStop(0, '#f0b070');
      rg.addColorStop(0.35, '#b46a52');
      rg.addColorStop(1, '#3a2a3a');
      c.fillStyle = rg;
      c.beginPath();
      river.forEach(([x, y, w], i) => (i ? c.lineTo(x - w / 2, y) : c.moveTo(x - w / 2, y)));
      for (let k = river.length - 1; k >= 0; k--) c.lineTo(river[k][0] + river[k][2] / 2, river[k][1]);
      c.closePath();
      c.fill();
      this.river = river;
      // village on the near bank
      const vy = hz + (H - hz) * 0.24;
      this.fire = { x: W * 0.74, y: vy + 26 };
      const sil = '#170f0f';
      const lodge = (x, y, r, hgt) => {
        c.fillStyle = sil;
        c.beginPath();
        c.ellipse(x, y, r, hgt, 0, Math.PI, 0);
        c.fill();
        c.fillStyle = 'rgba(255,170,90,0.85)';
        c.beginPath();
        c.ellipse(x + r * 0.25, y - hgt * 0.18, r * 0.12, hgt * 0.22, 0, 0, Math.PI * 2);
        c.fill();
      };
      const longhouse = (x, y, len, hgt) => {
        c.fillStyle = sil;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y - hgt * 0.6);
        c.quadraticCurveTo(x + len / 2, y - hgt * 1.25, x + len, y - hgt * 0.6);
        c.lineTo(x + len, y);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(255,170,90,0.85)';
        c.fillRect(x + len - 4, y - hgt * 0.45, 3, hgt * 0.45);
      };
      const tipi = (x, y, r, hgt) => {
        c.fillStyle = sil;
        c.beginPath();
        c.moveTo(x - r, y);
        c.lineTo(x, y - hgt);
        c.lineTo(x + r, y);
        c.closePath();
        c.fill();
        c.strokeStyle = sil;
        c.lineWidth = 1.4;
        for (const o of [-6, -2, 3, 7]) { c.beginPath(); c.moveTo(x, y - hgt + 2); c.lineTo(x + o, y - hgt - 12); c.stroke(); }
        c.fillStyle = 'rgba(255,170,90,0.7)';
        c.beginPath();
        c.ellipse(x + r * 0.3, y - 5, 2.5, 5, 0, 0, Math.PI * 2);
        c.fill();
      };
      const S = Math.max(0.7, Math.min(1.4, W / 1400));
      // trees behind the village
      for (let k = 0; k < 9; k++) {
        const x = W * (0.82 + k * 0.03) + rng.range(-10, 10), y = vy + rng.range(-6, 4);
        c.fillStyle = '#1d1418';
        c.fillRect(x - 2, y - 30 * S, 4, 30 * S);
        c.beginPath();
        c.ellipse(x, y - 44 * S, 22 * S, 26 * S, 0, 0, Math.PI * 2);
        c.fill();
      }
      longhouse(W * 0.79, vy + 10, 120 * S, 46 * S);
      lodge(W * 0.66, vy + 18, 30 * S, 34 * S);
      lodge(W * 0.85, vy + 30, 34 * S, 36 * S);
      lodge(W * 0.92, vy + 14, 26 * S, 30 * S);
      lodge(W * 0.7, vy + 34, 26 * S, 28 * S);
      // drying rack
      c.strokeStyle = sil;
      c.lineWidth = 2;
      const rx = W * 0.6, ry = vy + 30;
      c.beginPath();
      c.moveTo(rx, ry); c.lineTo(rx, ry - 30 * S);
      c.moveTo(rx + 60 * S, ry); c.lineTo(rx + 60 * S, ry - 30 * S);
      c.moveTo(rx - 3, ry - 28 * S); c.lineTo(rx + 60 * S + 3, ry - 28 * S);
      c.stroke();
      c.lineWidth = 1.5;
      for (let x = rx + 4; x < rx + 58 * S; x += 5) { c.beginPath(); c.moveTo(x, ry - 28 * S); c.lineTo(x, ry - 18 * S); c.stroke(); }
      // tipi camp further along the prairie, across the river
      tipi(W * 0.44, hz + (H - hz) * 0.12, 15 * S, 40 * S);
      tipi(W * 0.49, hz + (H - hz) * 0.1, 12 * S, 33 * S);
      tipi(W * 0.4, hz + (H - hz) * 0.09, 11 * S, 30 * S);
      // people around the fire
      this.people = [];
      const f = this.fire;
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * (0.05 + (k / 6) * 0.9) + Math.PI;
        this.people.push({ x: f.x + Math.cos(a) * 42 * S, y: f.y + Math.sin(a) * 12 * S + 8 * S, s: S * (k === 3 ? 0.7 : 1), sit: k !== 1 });
      }
      this.S = S;
      this.smokeSrc = [[W * 0.66, vy + 18 - 34 * S], [W * 0.85, vy + 30 - 36 * S], [W * 0.92, vy + 14 - 30 * S], [W * 0.85, vy + 10 - 56 * S], [W * 0.44, hz + (H - hz) * 0.12 - 38 * S]];
    }

    frame(dt) {
      this.t += dt;
      const c = this.ctx, dpr = this.dpr, w = this.w, h = this.h, t = this.t, S = this.S;
      const ox = -this.pad + (0.5 - this.mx) * 18, oy = -this.pad * 0.5 + (0.5 - this.my) * 8;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.drawImage(this.layer, ox, oy, this.layer.width / dpr, this.layer.height / dpr);
      // stars
      for (const s of this.stars) {
        const a = (0.35 + 0.65 * Math.abs(Math.sin(t * s.s + s.p))) * (1 - s.y / (this.horizon * 0.8)) * 0.9;
        c.fillStyle = `rgba(255,248,230,${a})`;
        c.fillRect(s.x + ox * 0.3, s.y, s.r, s.r);
      }
      // river shimmer
      c.strokeStyle = 'rgba(255,220,170,0.35)';
      c.lineWidth = 1;
      for (let k = 2; k < this.river.length; k += 2) {
        const [x, y, rw] = this.river[k];
        const off = Math.sin(t * 1.2 + k) * rw * 0.25;
        c.beginPath();
        c.moveTo(x + ox + off - rw * 0.12, y + oy);
        c.lineTo(x + ox + off + rw * 0.12, y + oy);
        c.stroke();
      }
      // fire and its glow
      const f = { x: this.fire.x + ox, y: this.fire.y + oy };
      const fl = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.1);
      const gg = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, 150 * S * fl);
      gg.addColorStop(0, 'rgba(255,170,80,0.55)');
      gg.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = gg;
      c.fillRect(f.x - 160 * S, f.y - 160 * S, 320 * S, 320 * S);
      // people sitting around the fire, lit on one side
      for (const p of this.people) this.drawSitter(c, p.x + ox, p.y + oy, p.s, p.sit, f);
      TM.Figures.drawFlames(c, f.x, f.y, S * 1.4, 2.2, t, 1.7, 1);
      // sparks
      if (Math.random() < dt * 14) this.sparks.push({ x: f.x - ox + (Math.random() - 0.5) * 10, y: f.y - oy - 10, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 50, life: 0, max: 1 + Math.random() * 1.5 });
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.life += dt;
        if (s.life > s.max) { this.sparks.splice(i, 1); continue; }
        s.x += s.vx * dt + Math.sin(t * 3 + i) * 0.3;
        s.y += s.vy * dt;
        c.fillStyle = `rgba(255,${190 - s.life * 60},90,${1 - s.life / s.max})`;
        c.fillRect(s.x + ox, s.y + oy, 1.6, 1.6);
      }
      // smoke
      for (const [sx, sy] of this.smokeSrc) if (Math.random() < dt * 2.2) this.smoke.push({ x: sx, y: sy, life: 0, max: 7 + Math.random() * 4, r: 3 });
      for (let i = this.smoke.length - 1; i >= 0; i--) {
        const s = this.smoke[i];
        s.life += dt;
        if (s.life > s.max) { this.smoke.splice(i, 1); continue; }
        s.y -= 14 * dt;
        s.x += (6 + s.life * 2) * dt;
        const a = Math.min(1, s.life / 1.2) * (1 - s.life / s.max) * 0.22;
        c.fillStyle = `rgba(190,170,170,${a})`;
        c.beginPath();
        c.arc(s.x + ox, s.y + oy, s.r + s.life * 3.2, 0, Math.PI * 2);
        c.fill();
      }
      // fireflies
      for (const fly of this.flies) {
        const a = Math.max(0, Math.sin(t * 2 * fly.s + fly.p)) * 0.9;
        const x = fly.x + Math.sin(t * 0.4 + fly.p) * 20, y = fly.y + Math.cos(t * 0.5 + fly.p) * 10;
        c.fillStyle = `rgba(220,240,140,${a})`;
        c.beginPath();
        c.arc(x, y, 1.5, 0, Math.PI * 2);
        c.fill();
      }
      // tall grass in the foreground
      c.strokeStyle = '#0c0807';
      c.lineWidth = 1.6;
      c.beginPath();
      for (const g of this.grass) {
        const sway = Math.sin(t * 0.9 + g.x * 0.01 + g.p) * 4;
        c.moveTo(g.x, h + 2);
        c.quadraticCurveTo(g.x + g.b * 0.3, h - g.h * 0.6, g.x + g.b + sway, h - g.h);
        if (g.c) { c.moveTo(g.x + g.b + sway, h - g.h); c.lineTo(g.x + g.b + sway - 3, h - g.h - 6); c.moveTo(g.x + g.b + sway, h - g.h); c.lineTo(g.x + g.b + sway + 3, h - g.h - 6); }
      }
      c.stroke();
      // vignette for legibility of the menu text
      const vg = c.createLinearGradient(0, 0, w * 0.6, 0);
      vg.addColorStop(0, 'rgba(10,7,6,0.55)');
      vg.addColorStop(1, 'rgba(10,7,6,0)');
      c.fillStyle = vg;
      c.fillRect(0, 0, w, h);
    }

    drawSitter(c, x, y, s, sit, f) {
      c.save();
      c.translate(x, y);
      c.scale(s, s);
      const side = f.x > x ? 1 : -1;
      c.fillStyle = '#120b0a';
      c.beginPath();
      if (sit) {
        c.ellipse(0, -2, 9, 4, 0, 0, Math.PI * 2);
        c.moveTo(-4, -2);
        c.lineTo(-3, -16);
        c.lineTo(4, -16);
        c.lineTo(5, -2);
      } else {
        c.moveTo(-3, 0); c.lineTo(-2, -26); c.lineTo(3, -26); c.lineTo(4, 0);
      }
      c.fill();
      const hy = sit ? -20 : -30;
      c.beginPath();
      c.arc(0.5, hy, 3.4, 0, Math.PI * 2);
      c.fill();
      // firelight rim
      c.strokeStyle = 'rgba(255,160,80,0.7)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(0.5, hy, 3.4, side > 0 ? -1.2 : Math.PI - 1.2 + 2.4 - 2.4, side > 0 ? 1.2 : Math.PI + 1.2);
      c.stroke();
      c.restore();
    }
  }

  TM.MenuScene = MenuScene;
})();
