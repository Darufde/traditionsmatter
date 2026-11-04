/* Traditions Matter — people and animals, drawn procedurally each frame so
   they stay crisp at any zoom. Units: an adult is 25 units tall; one unit is
   one pixel at zoom 1. Facing right = +x; the figure is mirrored to face left. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U } = TM;
  const sh = U.shade;

  function seg(ctx, ax, ay, bx, by, cx, cy, col, w) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    if (cx !== undefined) ctx.lineTo(cx, cy);
    ctx.stroke();
  }
  function ell(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.05, rx), Math.max(0.05, ry), 0, 0, Math.PI * 2);
  }

  // ------------------------------------------------------------------ pose
  // legs: [kneeX, kneeY, footX, footY] in body space (feet at y=0);
  // arms: [elbowDx, elbowDy, handDx, handDy] relative to the shoulder.
  function pose(p, t) {
    const a = p.anim;
    const P = { hipY: -11.5, lean: 0, legs: null, arms: null, bob: 0, sit: false };
    const ph = p.wp || 0;
    switch (a) {
      case 'walk':
      case 'run': {
        const A = a === 'run' ? 3.6 : 2.5;
        const s = Math.sin(ph);
        P.bob = -Math.abs(Math.cos(ph)) * (a === 'run' ? 1.2 : 0.5);
        P.lean = a === 'run' ? 0.18 : 0.05;
        P.legs = [[-s * A * 0.5, -6, -s * A, -Math.max(0, -Math.cos(ph)) * 1.2], [s * A * 0.5, -6, s * A, -Math.max(0, Math.cos(ph)) * 1.2]];
        P.arms = [[s * 1.2, 4, s * 2.4, 8], [-s * 1.2, 4, -s * 2.4, 8]];
        break;
      }
      case 'stalk': {
        const s = Math.sin(ph);
        P.hipY = -9.5; P.lean = 0.35;
        P.legs = [[1.5 - s, -5, -1.5 - s * 1.6, 0], [3 + s, -5.5, 2.5 + s * 1.6, 0]];
        P.arms = [[2.2, 3.5, 4.5, 3.2], [3, 3.6, 6, 2.8]];
        break;
      }
      case 'sit':
      case 'craft':
      case 'tell': {
        P.hipY = -4.2; P.sit = true;
        P.legs = [[3.6, -4.4, 5, -0.3], [3.2, -3.4, 4.6, 0]];
        const k = a === 'craft' ? Math.sin(t * 5) * 0.6 : 0;
        P.arms = [[1.6, 3.3, 3.6 + k, 5.3], [2.2, 3.6, 4.4 - k, 5.5]];
        if (a === 'tell') {
          const g = (Math.sin(t * 1.3) + 1) / 2;
          P.arms[1] = [2.6, 1.8 - g * 2, 4.5 + g, 0.8 - g * 4];
        }
        break;
      }
      case 'stir':
      case 'scrape': {
        P.hipY = -6.5; P.lean = a === 'stir' ? 0.3 : 0.15;
        P.legs = [[0.8, -0.6, -3, -0.2], [3.4, -6, 3, 0]];
        if (a === 'stir') {
          const c = Math.cos(t * 3), s = Math.sin(t * 3);
          P.arms = [[0.6, 3, 1.6, 5.4], [1, 3, 3.6 + c * 0.9, 5.6 + s * 0.4]];
        } else {
          const s = Math.sin(t * 4.5) * 2.2;
          P.arms = [[1.6, 1.8, 4.3, 1.4 + s], [2, 2, 4.8, 1.9 + s]];
        }
        break;
      }
      case 'hoe': {
        const c = (Math.sin(t * 3.4) + 1) / 2; // 1 = raised
        P.lean = 0.28;
        P.legs = [[0.8, -6, 2.2, 0], [-0.8, -6, -1.8, 0]];
        P.arms = [[0.6, 4, 2.3, 4.2 - c * 4], [1.2, 4.2, 3, 4.7 - c * 4]];
        P.hoe = c;
        break;
      }
      case 'harvest': {
        const c = (Math.sin(t * 2) + 1) / 2;
        P.lean = 0.35;
        P.legs = [[0.9, -6, 2, 0], [-0.9, -6, -1.6, 0]];
        P.arms = [[0.4, 4, 1.5, 6], [1.4, 2.6, 3.5, 2 + c * 3]];
        break;
      }
      case 'gather': {
        const cyc = (t * 0.6 + (p.id % 7) * 0.13) % 1;
        const up = cyc > 0.8;
        P.hipY = up ? -11.5 : -9.5;
        P.lean = up ? 0.15 : 1.0;
        P.legs = up ? [[1.2, -6, 1.8, 0], [-0.8, -6, -1.6, 0]] : [[2.4, -5, 1.8, 0], [0.6, -5, -1.4, 0]];
        P.arms = up ? [[0.4, 4, 0.6, 8], [0.6, 4, 1.2, 7.8]] : [[0.3, 4, 0.5, 8], [0.8, 4, 1.4, 8.2 + Math.sin(t * 4) * 0.4]];
        break;
      }
      case 'chop': {
        const cyc = (t * 1.8 + (p.id % 5) * 0.2) % 1;
        const raised = cyc < 0.6 ? cyc / 0.6 : 1 - (cyc - 0.6) / 0.4;
        P.lean = 0.12 + (1 - raised) * 0.25;
        P.legs = [[1.2, -6, 2.4, 0], [-1, -6, -2, 0]];
        const hx = U.lerp(6, -0.5, raised), hy = U.lerp(9.4, -5.6, raised);
        P.arms = [[hx * 0.5 - 0.6, hy * 0.5 - 0.4, hx - 0.8, hy + 0.6], [hx * 0.5 + 0.4, hy * 0.5 - 0.6, hx, hy]];
        P.axe = raised;
        break;
      }
      case 'fish': {
        const cyc = (t * 0.5 + (p.id % 9) * 0.11) % 1;
        const th = cyc > 0.88 ? Math.sin(((cyc - 0.88) / 0.12) * Math.PI) : 0;
        P.lean = 0.1 + th * 0.2;
        P.legs = [[1.5, -6, 2.6, 0], [-1, -6, -1.6, 0]];
        P.arms = [[0.4, 3, 1.5 + th * 2, 0.5 + th * 3], [1, 3, 3 + th * 2, 3.5 + th * 3]];
        P.spear = th;
        break;
      }
      case 'guard': {
        const w = Math.sin(t * 5);
        const waving = Math.sin(t * 0.7 + p.id) > 0.3;
        P.legs = [[0.6, -6, 1, 0], [-0.6, -6, -1, 0]];
        P.arms = [[-0.3, 4, -0.5, 8], waving ? [1.4, -2.5, 2.4 + w * 1.5, -6] : [0.4, 4, 0.6, 8]];
        break;
      }
      case 'play': {
        const j = Math.abs(Math.sin(t * 6 + p.id));
        P.bob = -j * 3;
        P.legs = [[0.8, -6, 1.2 + j, -j], [-0.8, -6, -1.2 - j, -j]];
        P.arms = [[-1.2, -1.5, -2, -5], [1.6, -1.5, 2.5, -5]];
        break;
      }
      default:
        P.legs = [[0.5, -6, 0.9, 0], [-0.5, -6, -0.9, 0]];
        P.arms = [[0.6, 4, 0.8, 8], [-0.4, 4, -0.2, 8]];
    }
    return P;
  }

  // ------------------------------------------------------------------ clothing rules
  function outfit(p, season) {
    const role = p.role, F = p.sex === 'F';
    const cold = season === 3;
    const mild = season === 0 || season === 2;
    return {
      robe: cold && role !== 'child' ? true : cold && role === 'child' && p.age >= 6,
      leggings: cold || mild ? role !== 'child' || p.age > 7 : false,
      shirt: F ? true : (mild && (p.id % 3 !== 0)) || cold,
      skirt: F,
      breech: !F,
      bareKid: role === 'child' && !F && season === 1,
    };
  }

  function drawPerson(ctx, p, x, y, z, env) {
    const L = p.look;
    const u = z * L.h;
    const t = p.animT || 0;
    const season = env.season;
    const skin = L.skin, cloth = L.cloth, hair = L.hair;
    if (u * 25 < 7) {
      // tiny figure for far zoom
      ctx.fillStyle = season === 3 ? L.robe : cloth;
      ctx.fillRect(x - 1.2 * u, y - 18 * u, 2.4 * u, 16 * u);
      ctx.fillStyle = skin;
      ctx.fillRect(x - 1 * u, y - 23 * u, 2 * u, 3 * u);
      return;
    }
    const P = pose(p, t);
    const O = outfit(p, season);
    const detail = u * 25 > 34; // fine details only when figures are large on screen
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(p.dir < 0 ? -u : u, u);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // ground shadow
    ctx.fillStyle = 'rgba(25,18,10,0.28)';
    ell(ctx, 0.5, 0.2, P.sit ? 6 : 4.5, 1.6);
    ctx.fill();
    ctx.translate(0, P.bob);
    const hipY = P.hipY;
    const sl = Math.sin(P.lean), cl = Math.cos(P.lean);
    const torso = P.sit ? 7.6 : 8;
    const Sx = sl * torso, Sy = hipY - cl * torso;          // shoulder
    const Hx = Sx + sl * 3, Hy = Sy - cl * 3;               // head center
    const legCol = O.leggings ? sh(cloth, 0.82) : skin;
    const armCol = O.shirt && season !== 1 ? sh(cloth, 0.9) : skin;
    const darkSkin = sh(skin, 0.78);

    // carried objects on the back (behind the body)
    const back = p.carry ? p.carry.kind : null;
    const infant = env.infant;
    if (infant) drawCradleboard(ctx, Sx, Sy, P.lean);
    if (back === 'wood') {
      for (let k = 0; k < 5; k++) seg(ctx, Sx - 3.4 + k * 0.35, Sy - 2.5 + k * 0.2, Sx - 1.6 + k * 0.3, Sy + 9, undefined, undefined, k % 2 ? '#6b5038' : '#7d6044', 1.1);
      seg(ctx, Sx - 2.6, Sy - 2.2, Hx + 0.5, Hy - 1.2, undefined, undefined, '#5a4430', 0.5);
    } else if (back === 'meat') {
      ctx.fillStyle = '#7a3a2a';
      ell(ctx, Sx - 3.1, Sy + 3, 2.7, 4.2);
      ctx.fill();
      ctx.fillStyle = '#b89470';
      ell(ctx, Sx - 3.3, Sy + 3.2, 2.3, 2);
      ctx.fill();
    } else if (back === 'wild' || back === 'maize' || p.tool === 'basket') {
      const fill = back === 'maize' ? '#e0b040' : back === 'wild' ? (season === 1 ? '#7a2a4a' : season === 2 ? '#8a6038' : '#7a9a4a') : null;
      ctx.fillStyle = '#b8945e';
      ctx.beginPath();
      ctx.moveTo(Sx - 5.4, Sy - 1.2);
      ctx.lineTo(Sx - 1.4, Sy - 1.2);
      ctx.lineTo(Sx - 2, Sy + 7);
      ctx.lineTo(Sx - 4.2, Sy + 7);
      ctx.closePath();
      ctx.fill();
      seg(ctx, Sx - 5.2, Sy + 1.5, Sx - 1.5, Sy + 1.5, undefined, undefined, '#7a5a34', 0.6);
      seg(ctx, Sx - 4.8, Sy + 4.2, Sx - 1.8, Sy + 4.2, undefined, undefined, '#7a5a34', 0.6);
      if (fill) { ctx.fillStyle = fill; ell(ctx, Sx - 3.4, Sy - 1.4, 2, 0.9); ctx.fill(); }
    }
    if (p.tool === 'bow' && back !== 'meat') {
      ctx.fillStyle = '#6b4a30';
      ctx.fillRect(Sx - 3.4, Sy - 1, 1.6, 7);
      seg(ctx, Sx - 2.9, Sy - 1, Sx - 3.4, Sy - 3.5, undefined, undefined, '#d8c8a8', 0.5);
      seg(ctx, Sx - 2.3, Sy - 1, Sx - 2.2, Sy - 3.6, undefined, undefined, '#d8c8a8', 0.5);
    }

    // back arm and back leg
    const [bl, fl] = P.legs;
    const [ba, fa] = P.arms;
    seg(ctx, -0.6, hipY, bl[0], bl[1], bl[2], bl[3], sh(legCol, 0.82), 1.9);
    if (detail) {
      ctx.fillStyle = '#5e4630';
      ell(ctx, bl[2] + 0.5, bl[3] - 0.3, 1.3, 0.7);
      ctx.fill();
    }
    if (!O.robe) seg(ctx, Sx - 0.5, Sy + 0.6, Sx + ba[0], Sy + ba[1], Sx + ba[2], Sy + ba[3], sh(armCol, 0.82), 1.4);

    // lower garment
    if (O.skirt) {
      ctx.fillStyle = cloth;
      ctx.beginPath();
      if (P.sit) {
        ctx.moveTo(-2.4, hipY - 1); ctx.lineTo(2.4 + sl * 2, hipY - 1.5); ctx.lineTo(5.4, hipY + 3.4); ctx.lineTo(-2.6, hipY + 3.6);
      } else {
        ctx.moveTo(-2.3 + sl, hipY - 1); ctx.lineTo(2.3 + sl, hipY - 1); ctx.lineTo(3 + sl * 0.5, hipY + 6.5); ctx.lineTo(-3, hipY + 6.5);
      }
      ctx.closePath();
      ctx.fill();
      if (detail) {
        ctx.strokeStyle = L.accent;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        if (P.sit) { ctx.moveTo(-2.6, hipY + 3.1); ctx.lineTo(5.2, hipY + 2.9); }
        else { ctx.moveTo(-2.9, hipY + 5.6); ctx.lineTo(2.9 + sl * 0.5, hipY + 5.6); }
        ctx.stroke();
      }
    } else if (O.breech) {
      ctx.fillStyle = cloth;
      ctx.fillRect(-1.6 + sl, hipY - 0.8, 3.2, 1.3);
      ctx.beginPath();
      ctx.moveTo(0.4 + sl, hipY); ctx.lineTo(2 + sl, hipY); ctx.lineTo(1.7 + sl, hipY + 4.2); ctx.lineTo(0.6 + sl, hipY + 4.2);
      ctx.closePath();
      ctx.fill();
    }

    // torso
    const tw = p.sex === 'F' ? 1.9 : 2.1;
    const torsoCol = O.robe ? L.robe : O.shirt && !O.bareKid ? cloth : skin;
    ctx.fillStyle = torsoCol;
    ctx.beginPath();
    ctx.moveTo(-tw * 0.85, hipY);
    ctx.lineTo(tw * 0.85, hipY);
    ctx.lineTo(Sx + tw * 1.05, Sy + 0.6);
    ctx.lineTo(Sx - tw * 1.05, Sy + 0.6);
    ctx.closePath();
    ctx.fill();
    if (detail && !O.robe && torsoCol === skin) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.moveTo(-tw * 0.85, hipY); ctx.lineTo(-tw * 0.2, hipY); ctx.lineTo(Sx - tw * 0.4, Sy + 0.6); ctx.lineTo(Sx - tw * 1.05, Sy + 0.6);
      ctx.closePath();
      ctx.fill();
    }
    if (!O.robe && torsoCol !== skin) {
      // quillwork band across the chest or yoke
      seg(ctx, Sx - tw, Sy + 2.2, Sx + tw, Sy + 2.2, undefined, undefined, L.accent, 0.8);
      if (detail && p.sex === 'F') seg(ctx, Sx - tw, Sy + 3.2, Sx + tw, Sy + 3.2, undefined, undefined, L.accent2, 0.5);
    }

    // front leg
    seg(ctx, 0.6, hipY, fl[0], fl[1], fl[2], fl[3], legCol, 1.9);
    if (detail) {
      ctx.fillStyle = '#6e5238';
      ell(ctx, fl[2] + 0.6, fl[3] - 0.3, 1.35, 0.75);
      ctx.fill();
    }
    if (detail && O.leggings && !P.sit) {
      seg(ctx, fl[0] + 0.7, fl[1], fl[2] + 0.5, fl[3] - 1, undefined, undefined, sh(cloth, 1.08), 0.45);
    }

    // robe drapes over the shoulders
    if (O.robe) {
      const g = ctx.createLinearGradient(Sx - 4, Sy, Sx + 4, Sy);
      g.addColorStop(0, sh(L.robe, 1.15));
      g.addColorStop(1, sh(L.robe, 0.75));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(Sx - 2.8, Sy - 0.8);
      ctx.quadraticCurveTo(Sx, Sy - 2, Sx + 2.9, Sy - 0.6);
      ctx.lineTo(P.sit ? 5 : 3.8 + sl * 3, P.sit ? hipY + 3 : hipY + 5.5);
      ctx.lineTo(P.sit ? -3.6 : -3.6, P.sit ? hipY + 3.4 : hipY + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = sh(L.robe, 1.45);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-3.6, P.sit ? hipY + 3.4 : hipY + 6);
      ctx.lineTo(P.sit ? 5 : 3.8 + sl * 3, P.sit ? hipY + 3 : hipY + 5.5);
      ctx.stroke();
      if (detail) {
        ctx.strokeStyle = 'rgba(232,220,196,0.55)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(Sx + 2.6, Sy);
        ctx.lineTo(Sx + 1.2, hipY + 2);
        ctx.stroke();
      }
    }

    // front arm with tools
    const fax = Sx + fa[2], fay = Sy + fa[3];
    const fex = Sx + fa[0], fey = Sy + fa[1];
    drawTool(ctx, p, P, fax, fay, env);
    seg(ctx, Sx + 0.6, Sy + 0.6, fex, fey, fax, fay, O.robe ? sh(L.robe, 0.95) : armCol, 1.45);
    if (detail) {
      ctx.fillStyle = skin;
      ell(ctx, fax, fay, 0.7, 0.7);
      ctx.fill();
    }
    if (back === 'fish') {
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k % 2 ? '#a39a86' : '#8f8a7a';
        ell(ctx, fax - 0.6 + k * 0.9, fay + 2.6 + k * 0.4, 0.7, 2);
        ctx.fill();
      }
    } else if (back === 'water' || p.tool === 'pot') {
      ctx.fillStyle = '#4a3a30';
      ell(ctx, fax + 0.4, fay + 1.6, 1.9, 1.8);
      ctx.fill();
    }

    // neck and head
    seg(ctx, Sx, Sy, Hx - sl * 1.6, Hy + cl * 1.6, undefined, undefined, skin, 1.4);
    ctx.fillStyle = skin;
    ell(ctx, Hx, Hy, 2.45, 2.6);
    ctx.fill();
    if (detail) {
      ctx.fillStyle = darkSkin;
      ell(ctx, Hx - 1, Hy + 0.4, 1.2, 1.9);
      ctx.fill();
      // eye and face paint
      ctx.fillStyle = '#1a1210';
      ell(ctx, Hx + 1.3, Hy - 0.25, 0.35, 0.35);
      ctx.fill();
      if (L.paint) seg(ctx, Hx + 0.4, Hy + 0.8, Hx + 2.2, Hy + 0.6, undefined, undefined, '#b02a1a', 0.6);
    }
    drawHair(ctx, p, Hx, Hy, P.lean);
    ctx.restore();
  }

  function drawHair(ctx, p, Hx, Hy, lean) {
    const L = p.look, col = L.hair;
    ctx.fillStyle = col;
    if (L.hairStyle === 'crest') {
      ctx.beginPath();
      ctx.ellipse(Hx - 0.3, Hy - 2.2, 2.1, 0.9, -0.2, 0, Math.PI * 2);
      ctx.fill();
      seg(ctx, Hx - 1.8, Hy - 1.6, Hx - 3.2, Hy + 1.8, undefined, undefined, col, 0.9);
    } else {
      ctx.beginPath();
      ctx.arc(Hx, Hy, 2.6, Math.PI * 0.95, Math.PI * 2.08);
      ctx.lineTo(Hx + 1.4, Hy - 1.4);
      ctx.quadraticCurveTo(Hx - 0.5, Hy - 1.2, Hx - 1.6, Hy + 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(Hx - 1.4, Hy + 0.2, 1.3, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (L.hairStyle === 'braids') {
        seg(ctx, Hx - 0.4, Hy + 1.2, Hx - 0.2 + lean * 2, Hy + 7.5, undefined, undefined, col, 1.05);
        seg(ctx, Hx - 2, Hy + 1.2, Hx - 2.3 + lean * 2, Hy + 7, undefined, undefined, sh(col, 0.85), 1.05);
        ctx.fillStyle = L.accent;
        ctx.fillRect(Hx - 0.7 + lean * 2, Hy + 6.6, 1, 0.9);
      } else if (L.hairStyle === 'loose') {
        ctx.beginPath();
        ctx.moveTo(Hx - 2.6, Hy - 0.5);
        ctx.lineTo(Hx - 3.2, Hy + 5.5);
        ctx.lineTo(Hx - 0.8, Hy + 5);
        ctx.lineTo(Hx - 0.4, Hy + 1);
        ctx.closePath();
        ctx.fill();
      } else if (L.hairStyle === 'bun') {
        ell(ctx, Hx - 2.6, Hy + 0.4, 1.3, 1.3);
        ctx.fill();
      }
    }
    if (L.feather) {
      seg(ctx, Hx - 1.6, Hy - 1.8, Hx - 3.6, Hy - 5.2, undefined, undefined, '#efe6d6', 1);
      seg(ctx, Hx - 3.3, Hy - 4.8, Hx - 3.7, Hy - 5.4, undefined, undefined, '#2a2420', 1);
    }
  }

  function drawCradleboard(ctx, Sx, Sy, lean) {
    const bx = Sx - 3.9, by = Sy - 1.5;
    ctx.fillStyle = '#7a5838';
    ctx.fillRect(bx, by, 2.3, 7.5);
    ctx.fillStyle = '#c9a77a';
    ctx.fillRect(bx + 0.3, by + 1.8, 1.7, 4.6);
    ctx.strokeStyle = '#6a4a30';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(bx + 1.15, by + 0.6, 1.6, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.fillStyle = '#8f5a3a';
    ell(ctx, bx + 1.15, by + 1.2, 0.85, 0.85);
    ctx.fill();
  }

  function drawTool(ctx, p, P, hx, hy, env) {
    const tool = p.tool;
    if (!tool || p.carry && (p.carry.kind === 'water' || p.carry.kind === 'fish')) return;
    if (p.anim === 'sit' || p.anim === 'tell') return;
    if (tool === 'bow') {
      ctx.strokeStyle = '#5a3a22';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hx + 0.3, hy - 5);
      ctx.quadraticCurveTo(hx + 2.4, hy, hx + 0.3, hy + 5);
      ctx.stroke();
      seg(ctx, hx + 0.3, hy - 5, hx + 0.3, hy + 5, undefined, undefined, 'rgba(230,220,200,0.7)', 0.3);
    } else if (tool === 'spear') {
      const th = P.spear || 0;
      const ex = hx + 6 + th * 2, ey = hy + 9 + th * 3;
      seg(ctx, hx - 4, hy - 6, ex, ey, undefined, undefined, '#6b5038', 0.8);
      seg(ctx, ex, ey, ex + 0.9, ey + 1.6, undefined, undefined, '#8a8a8a', 1);
    } else if (tool === 'hoe' && p.anim === 'hoe') {
      const c = P.hoe || 0;
      const ex = hx + 3 - c * 1.5, ey = hy + 11 - c * 6;
      seg(ctx, hx - 1.5, hy - 2, ex, ey, undefined, undefined, '#6b5038', 0.8);
      ctx.fillStyle = '#e2d6bc';
      ctx.beginPath();
      ctx.moveTo(ex - 0.5, ey - 0.5); ctx.lineTo(ex + 2.6, ey + 0.4); ctx.lineTo(ex + 0.6, ey + 2.4);
      ctx.closePath();
      ctx.fill();
    } else if (tool === 'hoe') {
      seg(ctx, hx, hy - 6, hx + 0.3, hy + 5, undefined, undefined, '#6b5038', 0.8);
      ctx.fillStyle = '#e2d6bc';
      ctx.fillRect(hx - 0.6, hy + 4.5, 2.2, 2);
    } else if (tool === 'axe') {
      const r = P.axe;
      const ex = r !== undefined ? hx + 2.2 - r * 1.5 : hx + 1, ey = r !== undefined ? hy - 1.5 - r * 0.5 : hy + 3;
      seg(ctx, hx, hy, ex, ey, undefined, undefined, '#6b5038', 0.9);
      ctx.fillStyle = '#5e5a56';
      ell(ctx, ex, ey, 1.1, 1.5);
      ctx.fill();
    } else if (tool === 'scraper' && p.anim === 'scrape') {
      seg(ctx, hx, hy, hx + 1.6, hy + 0.6, undefined, undefined, '#d8ccb4', 0.9);
    } else if (tool === 'pot' && !p.carry) {
      ctx.fillStyle = '#4a3a30';
      ell(ctx, hx + 0.4, hy + 1.6, 1.8, 1.7);
      ctx.fill();
    }
    if (p.anim === 'craft' || p.act === 'craft') {
      if (tool === 'pottery') { ctx.fillStyle = '#8a6a50'; ell(ctx, 4.6, -5, 1.8, 1.6); ctx.fill(); }
      else if (tool === 'mats' || tool === 'baskets') { ctx.fillStyle = '#b8a070'; ctx.fillRect(1.5, -4.6, 6, 1.2); }
      else if (tool === 'tools') { ctx.fillStyle = '#5a5654'; ell(ctx, 4.5, -5.4, 1, 0.7); ctx.fill(); }
    }
  }

  // ------------------------------------------------------------------ dogs
  function drawDog(ctx, d, x, y, z, t) {
    const u = z * d.size;
    if (u < 0.35) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(d.dir < 0 ? -u : u, u);
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(25,18,10,0.25)';
    ell(ctx, 0, 0.2, 4.6, 1.3);
    ctx.fill();
    const col = d.col;
    if (d.state === 'lie') {
      ctx.fillStyle = col;
      ell(ctx, 0, -1.6, 4.4, 1.7);
      ctx.fill();
      ell(ctx, 3.6, -2, 1.5, 1.3);
      ctx.fill();
      ctx.fillStyle = sh(col, 0.75);
      ctx.beginPath(); ctx.moveTo(3.4, -3); ctx.lineTo(3.9, -4.3); ctx.lineTo(4.3, -2.9); ctx.fill();
      ctx.restore();
      return;
    }
    const walking = d.state === 'walk' || (d.follow && d.state !== 'sit');
    const s = walking ? Math.sin(d.wp * 1.4) : 0;
    const sit = d.state === 'sit';
    const legc = sh(col, 0.8);
    // legs
    if (!sit) {
      seg(ctx, -2.6, -3.5, -2.6 - s * 1.2, 0, undefined, undefined, legc, 0.95);
      seg(ctx, 2.4, -3.5, 2.4 + s * 1.2, 0, undefined, undefined, legc, 0.95);
    }
    seg(ctx, -2.1, -3.5, sit ? -1.4 : -2.1 + s * 1.2, sit ? -0.4 : 0, undefined, undefined, col, 1);
    seg(ctx, 2.9, -3.5, 2.9 - s * 1.2, 0, undefined, undefined, col, 1);
    // body
    ctx.fillStyle = col;
    ctx.save();
    if (sit) { ctx.translate(-1, -3); ctx.rotate(-0.45); ctx.translate(1, 3); }
    ell(ctx, 0, -4.2, 3.9, 1.75);
    ctx.fill();
    ctx.fillStyle = d.col2;
    ell(ctx, 1.2, -3.4, 1.6, 0.8);
    ctx.fill();
    ctx.restore();
    // tail curled up
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-3.6, sit ? -2 : -4.6);
    ctx.quadraticCurveTo(-5.4, sit ? -3 : -6.5 + Math.sin(t * 8) * 0.4, -4.2, sit ? -4.2 : -7.2);
    ctx.stroke();
    // head
    const sniff = d.state === 'sniff';
    const hx = sit ? 3 : 4.2, hy = sit ? -7.4 : sniff ? -2.6 : -5.6;
    ctx.fillStyle = col;
    ell(ctx, hx, hy, 1.5, 1.35);
    ctx.fill();
    ell(ctx, hx + 1.4, hy + 0.4, 0.9, 0.6);
    ctx.fill();
    ctx.fillStyle = sh(col, 0.7);
    ctx.beginPath(); ctx.moveTo(hx - 0.8, hy - 0.8); ctx.lineTo(hx - 0.4, hy - 2.6); ctx.lineTo(hx + 0.4, hy - 1); ctx.fill();
    ctx.fillStyle = '#1a1210';
    ell(ctx, hx + 2.2, hy + 0.3, 0.35, 0.3);
    ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------------ deer and bison
  function drawDeer(ctx, a, x, y, z, season) {
    const u = z * a.size;
    if (u < 0.3) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(a.dir < 0 ? -u : u, u);
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(25,18,10,0.22)';
    ell(ctx, 0, 0.2, 6, 1.6);
    ctx.fill();
    const col = season === 3 ? '#6e5a48' : '#9a6a42';
    const s = a.moving ? Math.sin(a.wp * 2) : 0;
    seg(ctx, -3.6, -7, -3.6 - s * 1.5, 0, undefined, undefined, sh(col, 0.8), 0.9);
    seg(ctx, 3.4, -7, 3.4 + s * 1.5, 0, undefined, undefined, sh(col, 0.8), 0.9);
    seg(ctx, -3, -7, -3 + s * 1.5, 0, undefined, undefined, col, 0.95);
    seg(ctx, 4, -7, 4 - s * 1.5, 0, undefined, undefined, col, 0.95);
    ctx.fillStyle = col;
    ell(ctx, 0, -8.2, 5.4, 2.4);
    ctx.fill();
    ctx.fillStyle = '#efe6d6';
    ell(ctx, -0.5, -6.8, 3.4, 0.8);
    ctx.fill();
    ell(ctx, -5.3, -9, 0.9, 1.4);
    ctx.fill();
    const graze = !a.moving && Math.sin(a.t * 0.7 + a.x) > 0.2;
    const hx = graze ? 6.6 : 6.4, hy = graze ? -3.5 : -13.5;
    seg(ctx, 4.2, -9, hx - 0.6, hy + 1, undefined, undefined, col, 2);
    ctx.fillStyle = col;
    ell(ctx, hx, hy, 1.6, 1.15);
    ctx.fill();
    ell(ctx, hx + 1.4, hy + 0.5, 0.9, 0.6);
    ctx.fill();
    ctx.fillStyle = sh(col, 0.8);
    ell(ctx, hx - 0.6, hy - 1.5, 0.5, 1.1);
    ctx.fill();
    if (a.male && (season === 2 || season === 3)) {
      ctx.strokeStyle = '#d8c8a8';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(hx - 0.3, hy - 1); ctx.quadraticCurveTo(hx - 2, hy - 4, hx + 0.8, hy - 5);
      ctx.moveTo(hx - 1.2, hy - 3); ctx.lineTo(hx - 0.2, hy - 4.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBison(ctx, a, x, y, z, season) {
    const u = z * a.size;
    if (u < 0.3) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(a.dir < 0 ? -u : u, u);
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(25,18,10,0.25)';
    ell(ctx, 0, 0.3, 9.5, 2.4);
    ctx.fill();
    const col = '#4a3426', cape = season === 3 ? '#7a6048' : '#6a4a32';
    const s = a.moving ? Math.sin(a.wp * 1.5) : 0;
    seg(ctx, -5.5, -6, -5.5 - s, 0, undefined, undefined, sh(col, 0.8), 1.8);
    seg(ctx, 4, -6, 4 + s, 0, undefined, undefined, sh(col, 0.8), 1.9);
    seg(ctx, -4.6, -6, -4.6 + s, 0, undefined, undefined, col, 1.9);
    seg(ctx, 5.2, -6, 5.2 - s, 0, undefined, undefined, col, 2);
    ctx.fillStyle = col;
    ell(ctx, -1.5, -8.5, 7, 4);
    ctx.fill();
    ctx.fillStyle = cape;
    ell(ctx, 3.6, -10.3, 4.8, 5.4);
    ctx.fill();
    if (season === 3) { ctx.fillStyle = 'rgba(240,245,250,0.85)'; ell(ctx, 2.5, -15, 3.6, 1.2); ctx.fill(); }
    const graze = !a.moving && Math.sin(a.t * 0.5 + a.y) > -0.2;
    const hx = 8.4, hy = graze ? -3.6 : -7;
    ctx.fillStyle = '#3a281c';
    ell(ctx, hx, hy, 2.4, 2.6);
    ctx.fill();
    ell(ctx, hx - 0.5, hy + 2.2, 1.3, 1.6);
    ctx.fill();
    ctx.strokeStyle = '#1e1610';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(hx - 1, hy - 2); ctx.quadraticCurveTo(hx - 2.2, hy - 3.6, hx - 0.6, hy - 4);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-8.4, -9); ctx.quadraticCurveTo(-9.6, -6, -9, -4.5);
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ flames
  function drawFlames(ctx, x, y, z, size, t, seed, strength) {
    const n = Math.max(2, Math.round(2 + size * 1.6));
    const base = 2.2 * size * z;
    const g = ctx.createRadialGradient(x, y - 2 * z, 0, x, y - 2 * z, 10 * size * z);
    g.addColorStop(0, `rgba(255,170,70,${0.35 * strength})`);
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y - 1 * z, 10 * size * z, 6 * size * z, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * 2.1 * size * z;
        const fl = 0.65 + 0.35 * Math.sin(t * 9 + k * 1.9 + seed) * Math.sin(t * 5.3 + k * 0.7 + seed * 2);
        const h = (5 + size * 4.5) * z * fl * strength * (1 - Math.abs(off) / (base * n * 0.9 + 1)) * (pass ? 0.6 : 1);
        const sway = Math.sin(t * 6 + k + seed) * 1.2 * z;
        const w = base * (pass ? 0.5 : 0.85);
        ctx.fillStyle = pass ? 'rgba(255,230,140,0.95)' : 'rgba(245,120,40,0.88)';
        ctx.beginPath();
        ctx.moveTo(x + off - w, y);
        ctx.quadraticCurveTo(x + off - w * 0.6, y - h * 0.55, x + off + sway, y - h);
        ctx.quadraticCurveTo(x + off + w * 0.6, y - h * 0.55, x + off + w, y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  TM.Figures = { drawPerson, drawDog, drawDeer, drawBison, drawFlames };
})();
