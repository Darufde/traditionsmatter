/* Traditions Matter — the newcomers, the wider cast of animals, livestock
   and birds in flight, drawn each frame. Units as in figures.js: an adult
   person is 25 units tall and one unit is one pixel at zoom 1. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U } = TM;
  const F = TM.Figures;
  const sh = U.shade;
  const { pose, seg, ell } = F;

  // ------------------------------------------------------------------ settlers
  function drawSettler(ctx, a, x, y, z, season) {
    const L = a.look;
    const u = z * L.h;
    if (u * 25 < 7) {
      ctx.fillStyle = a.sex === 'F' ? L.dress : L.coat;
      ctx.fillRect(x - 1.2 * u, y - 18 * u, 2.4 * u, 16 * u);
      ctx.fillStyle = L.hat;
      ctx.fillRect(x - 1.4 * u, y - 24 * u, 2.8 * u, 2 * u);
      return;
    }
    const P = pose(a, a.animT || 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(a.dir < 0 ? -u : u, u);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(25,18,10,0.28)';
    ell(ctx, 0.5, 0.2, 4.5, 1.6);
    ctx.fill();
    ctx.translate(0, P.bob);
    const hipY = P.hipY, sl = Math.sin(P.lean), cl = Math.cos(P.lean);
    const Sx = sl * 8, Sy = hipY - cl * 8, Hx = Sx + sl * 3, Hy = Sy - cl * 3;
    const [bl, fl] = P.legs, [ba, fa] = P.arms;
    const F2 = a.sex === 'F';
    // pack on the back
    if (a.tool === 'pack') {
      ctx.fillStyle = '#7a6040';
      ell(ctx, Sx - 3.4, Sy + 2.5, 2.8, 4.2);
      ctx.fill();
      seg(ctx, Sx - 5.5, Sy + 1, Sx - 1.5, Sy + 1, undefined, undefined, '#4a3424', 0.6);
    }
    const coat = L.coat;
    // legs: stockings and breeches, or the hem of a long dress
    if (!F2) {
      seg(ctx, -0.6, hipY, bl[0], bl[1], bl[2], bl[3], '#cfc8b8', 1.7);
      seg(ctx, -0.6, hipY, bl[0], bl[1], undefined, undefined, L.breeches, 2);
      ctx.fillStyle = '#1e1a18'; ell(ctx, bl[2] + 0.6, bl[3] - 0.3, 1.3, 0.7); ctx.fill();
    }
    if (!F2) seg(ctx, Sx - 0.5, Sy + 0.6, Sx + ba[0], Sy + ba[1], Sx + ba[2], Sy + ba[3], sh(coat, 0.8), 1.5);
    if (F2) {
      ctx.fillStyle = L.dress;
      ctx.beginPath();
      ctx.moveTo(-2.2 + sl, hipY - 1); ctx.lineTo(2.2 + sl, hipY - 1); ctx.lineTo(3.4, -1); ctx.lineTo(-3.4, -1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ece6d8';
      ctx.fillRect(0.2 + sl * 0.5, hipY - 0.5, 2.6, 9);
      ctx.fillStyle = '#1e1a18'; ell(ctx, 1, -0.6, 1.2, 0.6); ctx.fill();
    } else {
      seg(ctx, 0.6, hipY, fl[0], fl[1], fl[2], fl[3], '#d8d2c2', 1.7);
      seg(ctx, 0.6, hipY, fl[0], fl[1], undefined, undefined, sh(L.breeches, 1.1), 2);
      ctx.fillStyle = '#1e1a18'; ell(ctx, fl[2] + 0.6, fl[3] - 0.3, 1.35, 0.75); ctx.fill();
    }
    // torso: a coat with skirts, or a bodice and kerchief
    ctx.fillStyle = F2 ? L.dress : coat;
    ctx.beginPath();
    ctx.moveTo(-2.1, F2 ? hipY : hipY + 3.5);
    ctx.lineTo(2.3, F2 ? hipY : hipY + 3.5);
    ctx.lineTo(Sx + 2.2, Sy + 0.6);
    ctx.lineTo(Sx - 2.2, Sy + 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ece6d8';
    if (F2) { ctx.beginPath(); ctx.moveTo(Sx - 2.2, Sy + 0.6); ctx.lineTo(Sx + 2.2, Sy + 0.6); ctx.lineTo(Sx + 0.4, Sy + 3.6); ctx.closePath(); ctx.fill(); }
    else { ctx.fillRect(Sx + 0.3, Sy + 0.5, 1.1, 3); seg(ctx, Sx + 0.4, Sy + 3.5, 0.6 + sl * 2, hipY + 2.5, undefined, undefined, sh(coat, 0.7), 0.4); }
    // tools in front
    const fax = Sx + fa[2], fay = Sy + fa[3];
    if (a.tool === 'musket') {
      const aim = a.anim === 'aim';
      ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 1.1;
      ctx.beginPath();
      if (aim) { ctx.moveTo(fax - 3.5, fay + 0.8); ctx.lineTo(fax + 8, fay - 0.6); } else { ctx.moveTo(fax - 0.5, fay + 2); ctx.lineTo(fax + 2.2, fay - 13); }
      ctx.stroke();
    } else if (a.tool === 'axe' || a.tool === 'hoe') {
      seg(ctx, fax, fay - 4, fax + 1.5, fay + 6, undefined, undefined, '#6b5038', 0.8);
      ctx.fillStyle = a.tool === 'axe' ? '#7a7a7a' : '#5a5a5a';
      ctx.fillRect(fax + 0.8, fay + 5, 2.4, 1.2);
    }
    seg(ctx, Sx + 0.6, Sy + 0.6, Sx + fa[0], Sy + fa[1], fax, fay, F2 ? sh(L.dress, 0.9) : coat, 1.5);
    ctx.fillStyle = L.skin; ell(ctx, fax, fay, 0.7, 0.7); ctx.fill();
    // head, hair and hat or cap
    seg(ctx, Sx, Sy, Hx - sl * 1.6, Hy + cl * 1.6, undefined, undefined, L.skin, 1.4);
    ctx.fillStyle = L.skin;
    ell(ctx, Hx, Hy, 2.4, 2.6);
    ctx.fill();
    ctx.fillStyle = '#1a1210'; ell(ctx, Hx + 1.3, Hy - 0.2, 0.33, 0.33); ctx.fill();
    if (F2) {
      ctx.fillStyle = '#efe9dc';
      ctx.beginPath(); ctx.arc(Hx - 0.2, Hy - 0.2, 2.7, Math.PI * 0.85, Math.PI * 2.1); ctx.lineTo(Hx - 2.4, Hy + 1.4); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = L.hair;
      ctx.beginPath(); ctx.arc(Hx - 0.4, Hy + 0.3, 2.4, Math.PI * 0.6, Math.PI * 1.3); ctx.fill();
      ctx.fillStyle = L.hat;
      ell(ctx, Hx, Hy - 2.2, a.kind === 'soldier' ? 3.2 : 3.8, 0.9);
      ctx.fill();
      ctx.fillRect(Hx - 1.9, Hy - 4.8, 3.8, 2.6);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ a general four-legged animal
  const QUAD = {
    elk: { len: 7, leg: 8.5, body: '#8a6a48', belly: '#c8b48a', neck: '#4e3a2a', head: 1.9, rump: '#d8c8a0', ears: true, antler: 'elk' },
    bear: { len: 6, leg: 4, body: '#1e1a18', belly: '#2a2420', neck: '#1e1a18', head: 2.3, ears: 'round', muzzle: '#8a6a4a', bulk: 1.5 },
    wolf: { len: 5.2, leg: 5, body: '#8a8680', belly: '#c8c4bc', neck: '#7a7670', head: 1.7, ears: true, tail: 'down', muzzle: '#aaa69e' },
    fox: { len: 3.6, leg: 2.8, body: '#c8642a', belly: '#f0e6d6', neck: '#c8642a', head: 1.3, ears: true, tail: 'brush', muzzle: '#f0e6d6' },
    cattle: { len: 6.5, leg: 5.5, body: '#7a4a2a', belly: '#e8e0d0', neck: '#7a4a2a', head: 2, horns: true, bulk: 1.3, patch: true },
    pig: { len: 4.2, leg: 2.2, body: '#c89888', belly: '#d8a898', neck: '#c89888', head: 1.8, ears: 'flop', snout: true, bulk: 1.3 },
    horse: { len: 6.5, leg: 8, body: '#6a4228', belly: '#6a4228', neck: '#5a3820', head: 1.9, mane: '#2a1a12', tail: 'hair' },
  };
  function drawQuad(ctx, a, x, y, z, season, kind) {
    const Q = QUAD[kind];
    const u = z * a.size;
    if (u < 0.3) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(a.dir < 0 ? -u : u, u);
    ctx.lineCap = 'round';
    const len = Q.len, leg = Q.leg, bulk = Q.bulk || 1;
    let body = Q.body;
    if (kind === 'cattle' && a.v) body = a.v === 1 ? '#2a2420' : '#a8724a';
    if (kind === 'pig' && a.v) body = '#3a3030';
    ctx.fillStyle = 'rgba(25,18,10,0.24)';
    ell(ctx, 0, 0.3, len * 1.05, 1.6 * bulk);
    ctx.fill();
    const mv = a.moving ? Math.sin(a.wp * 1.8) : 0;
    const by = -leg - 2.2 * bulk;
    const legC = sh(body, 0.75);
    seg(ctx, -len * 0.62, by + 1.5, -len * 0.62 - mv * 1.4, 0, undefined, undefined, legC, 1 * bulk);
    seg(ctx, len * 0.55, by + 1.5, len * 0.55 + mv * 1.4, 0, undefined, undefined, legC, 1 * bulk);
    seg(ctx, -len * 0.52, by + 1.5, -len * 0.52 + mv * 1.4, 0, undefined, undefined, body, 1.1 * bulk);
    seg(ctx, len * 0.66, by + 1.5, len * 0.66 - mv * 1.4, 0, undefined, undefined, body, 1.1 * bulk);
    // tail
    if (Q.tail === 'brush') { ctx.strokeStyle = body; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-len, by); ctx.quadraticCurveTo(-len - 3, by + 2, -len - 4.5, by + 1); ctx.stroke(); ctx.fillStyle = '#f0e6d6'; ell(ctx, -len - 4.6, by + 1, 1, 0.8); ctx.fill(); }
    else if (Q.tail === 'down') seg(ctx, -len, by, -len - 2, by + 4, undefined, undefined, body, 1.3);
    else if (Q.tail === 'hair') seg(ctx, -len, by - 0.5, -len - 1.2, by + 5, undefined, undefined, Q.mane, 1.4);
    // body
    const g = ctx.createLinearGradient(0, by - 2.5 * bulk, 0, by + 2.5 * bulk);
    g.addColorStop(0, sh(body, 1.15));
    g.addColorStop(1, sh(body, 0.8));
    ctx.fillStyle = g;
    ell(ctx, 0, by, len, 2.4 * bulk);
    ctx.fill();
    if (Q.patch && !a.v) { ctx.fillStyle = '#efe8dc'; ell(ctx, -len * 0.3, by - 0.5, 2, 1.6); ctx.fill(); }
    if (Q.rump) { ctx.fillStyle = Q.rump; ell(ctx, -len * 0.85, by - 0.3, 1.6, 1.8); ctx.fill(); }
    if (a.pack) { ctx.fillStyle = '#c8b48a'; ell(ctx, -0.5, by - 2.6, 3.4, 2.2); ctx.fill(); ctx.fillStyle = '#8a6a48'; ell(ctx, 1.6, by - 2, 2.2, 2.4); ctx.fill(); }
    if (season === 3 && kind !== 'pig' && kind !== 'horse') { ctx.fillStyle = 'rgba(240,245,250,0.8)'; ell(ctx, 0, by - 2.2 * bulk, len * 0.6, 0.8); ctx.fill(); }
    // neck and head
    const graze = !a.moving && Math.sin((a.t || 0) * 0.6 + a.x) > 0.3 && kind !== 'pig';
    const hx = len + 1.4, hy = graze ? -2.5 : by - 3.2 * (kind === 'bear' || kind === 'pig' ? 0.3 : 1);
    seg(ctx, len * 0.7, by - 0.5, hx - 0.5, hy + 0.6, undefined, undefined, Q.neck, 2.2 * bulk * (kind === 'horse' || kind === 'elk' ? 1 : 0.9));
    if (Q.mane) seg(ctx, len * 0.6, by - 2, hx - 1, hy - 1, undefined, undefined, Q.mane, 0.9);
    ctx.fillStyle = Q.neck;
    ell(ctx, hx, hy, Q.head, Q.head * 0.8);
    ctx.fill();
    ctx.fillStyle = Q.muzzle || sh(Q.neck, 0.9);
    ell(ctx, hx + Q.head * 0.9, hy + 0.5, Q.head * 0.6, Q.head * 0.45);
    ctx.fill();
    if (Q.snout) { ctx.fillStyle = '#b07878'; ell(ctx, hx + Q.head * 1.25, hy + 0.5, 0.6, 0.7); ctx.fill(); }
    if (Q.ears === true) { ctx.fillStyle = sh(Q.neck, 0.85); ctx.beginPath(); ctx.moveTo(hx - 0.6, hy - 0.8); ctx.lineTo(hx - 0.2, hy - 2.6); ctx.lineTo(hx + 0.5, hy - 1); ctx.fill(); }
    if (Q.ears === 'round') { ctx.fillStyle = Q.neck; ell(ctx, hx - 0.6, hy - 1.8, 0.8, 0.8); ctx.fill(); }
    if (Q.ears === 'flop') { ctx.fillStyle = sh(body, 0.85); ell(ctx, hx - 0.2, hy - 0.6, 0.9, 1.2); ctx.fill(); }
    if (Q.horns) { ctx.strokeStyle = '#e8dcc4'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(hx - 0.5, hy - 1); ctx.quadraticCurveTo(hx - 1.5, hy - 3, hx + 0.6, hy - 3.2); ctx.stroke(); }
    if (Q.antler && a.male && (season === 2 || season === 3)) {
      ctx.strokeStyle = '#d8c8a8'; ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(hx - 0.4, hy - 1.2); ctx.quadraticCurveTo(hx - 4, hy - 6, hx - 2.5, hy - 9);
      ctx.moveTo(hx - 2.2, hy - 4.4); ctx.lineTo(hx - 0.2, hy - 6);
      ctx.moveTo(hx - 3.2, hy - 6.8); ctx.lineTo(hx - 1.2, hy - 8.6);
      ctx.stroke();
    }
    ctx.fillStyle = '#100c0a';
    ell(ctx, hx + 0.6, hy - 0.4, 0.3, 0.3);
    ctx.fill();
    ctx.restore();
  }

  function drawRabbit(ctx, a, x, y, z, season) {
    const u = z * a.size;
    if (u < 0.35) return;
    const hop = a.moving ? Math.abs(Math.sin(a.wp * 2.5)) * 2 : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(a.dir < 0 ? -u : u, u);
    ctx.fillStyle = 'rgba(25,18,10,0.22)'; ell(ctx, 0, 0.2, 2.2, 0.8); ctx.fill();
    ctx.translate(0, -hop);
    const col = season === 3 ? '#a89a88' : '#8a6e52';
    ctx.fillStyle = col; ell(ctx, 0, -1.6, 2, 1.5); ctx.fill();
    ell(ctx, 1.6, -2.6, 1, 0.9); ctx.fill();
    ctx.fillStyle = sh(col, 0.85);
    ell(ctx, 1.2, -4.2, 0.35, 1.2); ctx.fill();
    ctx.fillStyle = '#f4f0e8'; ell(ctx, -2, -1.8, 0.7, 0.7); ctx.fill();
    ctx.restore();
  }

  function drawBird(ctx, a, x, y, z, season, kind) {
    const u = z * a.size;
    if (u < 0.3) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(a.dir < 0 ? -u : u, u);
    ctx.lineCap = 'round';
    if (kind === 'turkey') {
      ctx.fillStyle = 'rgba(25,18,10,0.22)'; ell(ctx, 0, 0.2, 3, 1); ctx.fill();
      seg(ctx, -0.4, -2, -0.6 + (a.moving ? Math.sin(a.wp * 2) : 0), 0, undefined, undefined, '#a87a4a', 0.5);
      seg(ctx, 0.6, -2, 0.6 - (a.moving ? Math.sin(a.wp * 2) : 0), 0, undefined, undefined, '#a87a4a', 0.5);
      ctx.fillStyle = '#4a3828'; ell(ctx, 0, -3.6, 3, 2); ctx.fill();
      ctx.fillStyle = '#6a4e30'; ctx.beginPath(); ctx.moveTo(-2.4, -3.6); ctx.lineTo(-4.6, -6.4); ctx.lineTo(-3.4, -2.6); ctx.fill();
      seg(ctx, 2, -4.2, 2.8, -7, undefined, undefined, '#7a8aa0', 0.7);
      ctx.fillStyle = '#c8302a'; ell(ctx, 3, -6.6, 0.6, 0.8); ctx.fill();
    } else if (kind === 'crow') {
      const hop = a.moving ? Math.abs(Math.sin(a.wp * 3)) * 1.5 : 0;
      ctx.translate(0, -hop);
      ctx.fillStyle = '#121216'; ell(ctx, 0, -1.4, 1.8, 1); ctx.fill();
      ell(ctx, 1.6, -2, 0.8, 0.7); ctx.fill();
      seg(ctx, -1.5, -1.4, -2.8, -1.8, undefined, undefined, '#121216', 0.8);
    } else if (kind === 'heron') {
      ctx.fillStyle = 'rgba(25,18,10,0.2)'; ell(ctx, 0, 0.2, 2.4, 0.8); ctx.fill();
      seg(ctx, -0.3, -6, -0.3, 0, undefined, undefined, '#5a5a4a', 0.4);
      seg(ctx, 0.4, -6, 0.6, 0, undefined, undefined, '#5a5a4a', 0.4);
      ctx.fillStyle = '#7a8a9a'; ell(ctx, 0, -7.4, 2.4, 1.6); ctx.fill();
      ctx.strokeStyle = '#8a9aaa'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(1.4, -8); ctx.quadraticCurveTo(3.4, -10, 1.8, -12.6); ctx.stroke();
      ctx.fillStyle = '#e8e8e0'; ell(ctx, 2.1, -13, 0.7, 0.6); ctx.fill();
      seg(ctx, 2.6, -13, 4.4, -12.6, undefined, undefined, '#d8b040', 0.4);
    } else {
      // ducks and geese on the water, with a small wake
      const goose = kind === 'goose';
      ctx.strokeStyle = 'rgba(220,235,235,0.5)'; ctx.lineWidth = 0.5;
      ell(ctx, 0, 0, goose ? 3.6 : 2.6, goose ? 1.1 : 0.8); ctx.stroke();
      ctx.fillStyle = goose ? '#8a7a68' : '#7a6248'; ell(ctx, 0, -0.8, goose ? 3 : 2.2, goose ? 1.3 : 1); ctx.fill();
      const neck = goose ? '#1a1816' : a.male ? '#2a5a3a' : '#6a5440';
      seg(ctx, goose ? 2 : 1.4, -1.2, goose ? 2.6 : 1.8, goose ? -4.4 : -2.4, undefined, undefined, neck, goose ? 0.9 : 1.1);
      ctx.fillStyle = neck; ell(ctx, goose ? 2.8 : 2, goose ? -4.6 : -2.6, goose ? 0.9 : 0.8, 0.6); ctx.fill();
      if (goose) { ctx.fillStyle = '#f0ece4'; ell(ctx, 2.6, -4.2, 0.4, 0.3); ctx.fill(); }
      else { ctx.fillStyle = '#d8a040'; ell(ctx, 2.7, -2.5, 0.5, 0.25); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawBeaver(ctx, a, x, y, z, t) {
    const u = z * a.size;
    if (u < 0.3) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(a.dir < 0 ? -u : u, u);
    const swim = a.moving;
    ctx.strokeStyle = 'rgba(220,235,235,0.55)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(1.5, -0.4); ctx.lineTo(-4, -1.8); ctx.moveTo(1.5, 0.2); ctx.lineTo(-4, 1.2); ctx.stroke();
    ctx.fillStyle = '#4a3222';
    ell(ctx, 0.2, -0.4, swim ? 1.8 : 2.6, swim ? 0.8 : 1.2);
    ctx.fill();
    ell(ctx, 1.8, -0.8, 0.9, 0.7);
    ctx.fill();
    void t;
    ctx.restore();
  }

  // ------------------------------------------------------------------ birds in flight
  function drawFlyer(ctx, f, x, y, z, shadowX, shadowY) {
    const kind = f.kind;
    const size = kind === 'eagle' ? 7 : kind === 'goose' ? 4.2 : kind === 'pigeon' ? 1.8 : 1.6;
    // shadow on the ground
    ctx.fillStyle = 'rgba(20,16,12,0.13)';
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, size * z * 0.9, size * z * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    const flap = kind === 'eagle' ? Math.sin(f.flap) * 0.15 : Math.sin(f.flap);
    const w = size * z, hgt = flap * size * 0.6 * z;
    ctx.strokeStyle = kind === 'eagle' ? '#2a1e16' : kind === 'goose' ? '#4a4038' : kind === 'pigeon' ? '#5a6070' : '#3a3028';
    ctx.lineWidth = Math.max(0.8, (kind === 'eagle' ? 1.6 : kind === 'goose' ? 1.2 : 0.8) * z);
    ctx.beginPath();
    ctx.moveTo(x - w, y - hgt);
    ctx.quadraticCurveTo(x - w * 0.4, y - Math.abs(hgt) * 0.2 - 1 * z, x, y);
    ctx.quadraticCurveTo(x + w * 0.4, y - Math.abs(hgt) * 0.2 - 1 * z, x + w, y - hgt);
    ctx.stroke();
    if (kind === 'eagle') { ctx.fillStyle = '#f0ece4'; ctx.beginPath(); ctx.arc(x + 1.2 * z * f.dir, y - 0.6 * z, 1 * z, 0, Math.PI * 2); ctx.fill(); }
  }

  TM.Figures2 = { drawSettler, drawQuad, drawRabbit, drawBird, drawBeaver, drawFlyer, QUAD };
})();
