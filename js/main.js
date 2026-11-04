/* Traditions Matter — application: screens, the nation setup and settings
   forms, building a new game, the main loop, camera input and shortcuts. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U } = TM;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const SEASON_INFO = [
    ['Spring', 'spring', 'The snow is leaving. Fields wait to be planted, and stores are modest.'],
    ['Summer', 'summer', 'Crops grow tall and berries ripen. Stores are lean until the harvest.'],
    ['Autumn', 'autumn', 'Harvest time and good hunting. Stores are low but about to fill.'],
    ['Winter', 'winter', 'Cold and dark. You live on what was put away after the harvest.'],
  ];
  const DIFF_INFO = [
    ['gentle', 'Gentle', 'feather', 'Plentiful game and harvests, and little sickness.'],
    ['balanced', 'Balanced', 'circle', 'The land provides, if the work is done.'],
    ['harsh', 'Harsh', 'mountain', 'Leaner years, colder winters and more illness.'],
  ];

  // ================================================================== game
  class Game {
    constructor(app, settings, gfx) {
      this.app = app;
      this.settings = settings;
      this.gfx = gfx;
      this.speed = 0;
      this.prevSpeed = 1;
      this.follow = false;
      this.keys = new Set();
      this.running = false;
    }

    async build(progress) {
      const s = this.settings;
      const seed = s.seed >>> 0;
      const step = (t) => new Promise((res) => { progress(t); setTimeout(res, 30); });
      await step('Counting the families…');
      const rng = new TM.RNG(seed);
      const pop = TM.People.generate(rng, s.population);
      await step('Shaping the river and the prairie…');
      const world = TM.generateWorld({ seed, pop: s.population, households: pop.households, groups: pop.groups });
      await step('Raising the lodges and the tipis…');
      const sim = new TM.Sim({ world, pop, settings: { season: s.season, difficulty: s.difficulty, nationName: s.nationName }, seed });
      await step('Kindling the fires…');
      this.world = world;
      this.sim = sim;
      this.renderer = new TM.Renderer($('view'), world, sim, this.gfx);
      await step('Waking the village…');
    }

    start() {
      this.ui = new TM.UI(this);
      this.sim.onEvent = (e) => this.ui.addLog(e);
      this.bindInput();
      this.running = true;
      this.renderer.resize();
      this.renderer.centerOn(this.world.PCX, this.world.PCY + 1);
      let last = performance.now();
      let uiT = 0, mmT = 0, frames = 0, fpsT = 0;
      const loop = (now) => {
        if (!this.running) return;
        const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
        last = now;
        this.panKeys(dt);
        if (this.speed > 0) {
          const total = dt * this.speed;
          const n = Math.max(1, Math.ceil(total / 0.2));
          for (let i = 0; i < n; i++) this.sim.update(total / n);
        }
        this.renderer.draw(dt);
        uiT += dt; mmT += dt; fpsT += dt; frames++;
        if (uiT > 0.25) { uiT = 0; this.ui.update(); }
        if (mmT > 0.3) { mmT = 0; this.renderer.drawMinimap($('minimap')); }
        if (fpsT > 0.5) {
          $('fps').textContent = this.gfx.fps ? `${Math.round(frames / fpsT)} fps` : '';
          frames = 0; fpsT = 0;
        }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
      this.ui.update();
      this.renderer.drawMinimap($('minimap'));
      this.welcome();
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.unbindInput();
      $('panel').classList.add('hidden');
      $('log').innerHTML = '';
      $('tooltip').classList.remove('show');
    }

    setSpeed(v) {
      if (v > 0) this.prevSpeed = v;
      this.speed = v;
      if (this.ui) this.ui.update();
    }
    togglePause() { this.setSpeed(this.speed > 0 ? 0 : this.prevSpeed || 1); }
    setFollow(on) {
      this.follow = on;
      this.renderer.follow = on;
    }
    lookAt(x, y) { this.renderer.centerOn(x, y); }
    setGraphics(g) {
      this.gfx = g;
      this.renderer.setGraphics(g);
    }

    welcome() {
      const s = this.settings, sim = this.sim, c = sim.c;
      const html = `<div class="band"></div>
        <h2>The ${esc(s.nationName)}</h2>
        <p>${s.nationMeaning ? `<i>${esc(s.nationMeaning)}</i>. ` : ''}${sim.people.length} people live in <b>${esc(s.villageName)}</b>, a village of bark longhouses and wigwams on the edge of the woodland, and in <b>${esc(s.campName)}</b>, a hunting camp of hide tipis out on the prairie across the river.</p>
        <p>It is the ${TM.MOONS[c.season][c.moon]} of ${TM.SEASONS[c.season].toLowerCase()}. For now, watch your people live through the seasons: they farm, hunt, fish, gather, tan hides, keep the fires and gather to talk in the evening. Watch the food, firewood and health of the nation along the top of the screen.</p>
        <div class="controls">
          <kbd>Drag</kbd><span>Look around (or W A S D / arrow keys)</span>
          <kbd>Scroll</kbd><span>Zoom in and out</span>
          <kbd>Click</kbd><span>Learn about a person, a lodge or the fields</span>
          <kbd>Space</kbd><span>Pause · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> change speed</span>
          <kbd>N</kbd><span>Nation overview · <kbd>H</kbd> village · <kbd>C</kbd> camp</span>
        </div>
        <div class="modal-actions"><button class="btn primary" data-m="go">Begin</button></div>`;
      TM.Modal.open(html, { actions: { go: (close) => close() }, onClose: () => this.setSpeed(1) });
    }

    pauseMenu() {
      const was = this.speed;
      this.setSpeed(0);
      const html = `<div class="band"></div><h2>Paused</h2>
        <p>Day ${this.sim.c.dom} of the ${TM.MOONS[this.sim.c.season][this.sim.c.moon]}, year ${this.sim.c.year}.</p>
        <div class="modal-menu">
          <button class="btn primary" data-m="resume">Resume</button>
          <button class="btn" data-m="chronicle">Read the chronicle</button>
          <button class="btn" data-m="settings">Graphics settings</button>
          <button class="btn danger" data-m="quit">Return to the main menu</button>
        </div>`;
      let resumeTo = was || this.prevSpeed || 1;
      TM.Modal.open(html, {
        onClose: () => this.setSpeed(resumeTo),
        actions: {
          resume: (close) => close(),
          chronicle: (close) => { close(); this.setSpeed(0); this.ui.openChronicle(); },
          settings: (close) => { resumeTo = 0; close(); this.graphicsModal(was); },
          quit: (close) => {
            resumeTo = 0;
            close();
            TM.Modal.open(`<div class="band"></div><h2>Leave this game?</h2><p>Saving is not available yet, so this village will be lost. You can always found a new one.</p>
              <div class="modal-actions"><button class="btn" data-m="no">Stay</button><button class="btn primary" data-m="yes">Leave</button></div>`,
            { onClose: () => { if (this.running) this.setSpeed(was); }, actions: { no: (c) => c(), yes: (c) => { this.app.quitToMenu(); c(); } } });
          },
        },
      });
    }

    graphicsModal(resume) {
      const m = TM.Modal.open(`<div class="band"></div><h2>Graphics</h2><div class="form" id="gfx-modal-form"></div><div class="modal-actions"><button class="btn primary" data-m="done">Done</button></div>`,
        { wide: true, onClose: () => this.setSpeed(resume || this.prevSpeed || 1), actions: { done: (c) => c() } });
      TM.buildGraphicsForm(m.el.querySelector('#gfx-modal-form'), this.gfx, (g) => { this.app.saveGraphics(g); this.setGraphics(g); });
    }

    // ---------------------------------------------------------------- input
    bindInput() {
      const cv = $('view');
      const r = this.renderer;
      const ptrs = new Map();
      let drag = null, pinch = null;
      const local = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
      this.h = {
        down: (e) => {
          cv.focus();
          cv.setPointerCapture(e.pointerId);
          ptrs.set(e.pointerId, local(e));
          if (ptrs.size === 1) {
            const [x, y] = local(e);
            drag = { x, y, cx: r.cam.x, cy: r.cam.y, moved: false };
          } else if (ptrs.size === 2) {
            const [a, b] = [...ptrs.values()];
            pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: r.cam.z };
            drag = null;
          }
        },
        move: (e) => {
          const [x, y] = local(e);
          if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [x, y]);
          if (pinch && ptrs.size === 2) {
            const [a, b] = [...ptrs.values()];
            const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
            const f = (pinch.z * d) / pinch.d / r.cam.z;
            r.zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, f);
            return;
          }
          if (drag) {
            const dx = x - drag.x, dy = y - drag.y;
            if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; cv.classList.add('dragging'); this.setFollow(false); }
            if (drag.moved) {
              r.cam.x = drag.cx - dx / r.cam.z;
              r.cam.y = drag.cy - dy / r.cam.z;
              r.clampCam();
            }
            return;
          }
          const hit = r.pick(x, y);
          r.hover = hit;
          cv.classList.toggle('pointing', !!hit);
        },
        up: (e) => {
          ptrs.delete(e.pointerId);
          if (ptrs.size < 2) pinch = null;
          cv.classList.remove('dragging');
          if (drag && !drag.moved && e.type === 'pointerup') {
            const [x, y] = local(e);
            this.clickAt(x, y);
          }
          drag = null;
        },
        wheel: (e) => {
          e.preventDefault();
          const [x, y] = local(e);
          const d = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
          r.zoomAt(x, y, Math.exp(-d * 0.0013));
        },
        leave: () => { r.hover = null; },
        key: (e) => this.onKey(e, true),
        keyup: (e) => this.keys.delete(e.key.toLowerCase()),
        resize: () => r.resize(),
        blur: () => this.keys.clear(),
        mm: (e) => {
          const b = $('minimap').getBoundingClientRect();
          const t = r.minimapToTile(e.clientX - b.left, e.clientY - b.top);
          if (t) { this.setFollow(false); r.centerOn(t[0], t[1]); }
        },
      };
      cv.addEventListener('pointerdown', this.h.down);
      cv.addEventListener('pointermove', this.h.move);
      cv.addEventListener('pointerup', this.h.up);
      cv.addEventListener('pointercancel', this.h.up);
      cv.addEventListener('pointerleave', this.h.leave);
      cv.addEventListener('wheel', this.h.wheel, { passive: false });
      window.addEventListener('keydown', this.h.key);
      window.addEventListener('keyup', this.h.keyup);
      window.addEventListener('resize', this.h.resize);
      window.addEventListener('blur', this.h.blur);
      $('minimap').addEventListener('pointerdown', this.h.mm);
      $('btn-menu').onclick = () => this.pauseMenu();
      $('btn-chronicle').onclick = () => this.ui.openChronicle();
      $('btn-overview').onclick = () => this.toggleOverview();
      $('btn-village').onclick = () => { this.setFollow(false); this.lookAt(this.world.PCX, this.world.PCY); };
      $('btn-camp').onclick = () => { this.setFollow(false); this.lookAt(this.world.CCX, this.world.CCY); };
    }
    unbindInput() {
      const cv = $('view');
      if (!this.h) return;
      cv.removeEventListener('pointerdown', this.h.down);
      cv.removeEventListener('pointermove', this.h.move);
      cv.removeEventListener('pointerup', this.h.up);
      cv.removeEventListener('pointercancel', this.h.up);
      cv.removeEventListener('pointerleave', this.h.leave);
      cv.removeEventListener('wheel', this.h.wheel);
      window.removeEventListener('keydown', this.h.key);
      window.removeEventListener('keyup', this.h.keyup);
      window.removeEventListener('resize', this.h.resize);
      window.removeEventListener('blur', this.h.blur);
      $('minimap').removeEventListener('pointerdown', this.h.mm);
    }
    toggleOverview() {
      if (this.ui.sel && this.ui.sel.kind === 'overview') this.ui.select(null);
      else this.ui.select({ kind: 'overview' });
    }
    clickAt(x, y) {
      const hit = this.renderer.pick(x, y);
      if (hit) {
        if (hit.kind === 'person') this.ui.select({ kind: 'person', obj: hit.obj });
        else this.ui.select({ kind: 'building', obj: hit.obj });
        return;
      }
      const t = this.renderer.toTile(x, y);
      const W = this.world, tx = Math.floor(t[0]), ty = Math.floor(t[1]);
      if (tx >= 0 && ty >= 0 && tx < W.N && ty < W.N && W.type[ty * W.N + tx] === TM.T.FIELD) this.ui.select({ kind: 'field' });
      else this.ui.select(null);
    }
    onKey(e, down) {
      if (TM.Modal.isOpen()) {
        if (e.key === 'Escape') TM.Modal.closeTop();
        return;
      }
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'q', 'e', '+', '=', '-', '_'].includes(k)) {
        if (down) this.keys.add(k);
        if (k.startsWith('arrow')) e.preventDefault();
        return;
      }
      if (!down) return;
      if (k === ' ') { e.preventDefault(); this.togglePause(); }
      else if (k === '1') this.setSpeed(1);
      else if (k === '2') this.setSpeed(3);
      else if (k === '3') this.setSpeed(8);
      else if (k === 'escape') { if (this.ui.sel) this.ui.select(null); else this.pauseMenu(); }
      else if (k === 'n') this.toggleOverview();
      else if (k === 'h') { this.setFollow(false); this.lookAt(this.world.PCX, this.world.PCY); }
      else if (k === 'c') { this.setFollow(false); this.lookAt(this.world.CCX, this.world.CCY); }
      else if (k === 'f' && this.ui.sel && this.ui.sel.kind === 'person') this.setFollow(!this.follow);
    }
    panKeys(dt) {
      if (!this.keys.size) return;
      const r = this.renderer, sp = (700 * dt) / r.cam.z;
      const K = this.keys;
      let moved = false;
      if (K.has('w') || K.has('arrowup')) { r.cam.y -= sp; moved = true; }
      if (K.has('s') || K.has('arrowdown')) { r.cam.y += sp; moved = true; }
      if (K.has('a') || K.has('arrowleft')) { r.cam.x -= sp; moved = true; }
      if (K.has('d') || K.has('arrowright')) { r.cam.x += sp; moved = true; }
      if (K.has('q') || K.has('-') || K.has('_')) r.zoomAt(r.vw / 2, r.vh / 2, Math.exp(-dt * 1.6));
      if (K.has('e') || K.has('+') || K.has('=')) r.zoomAt(r.vw / 2, r.vh / 2, Math.exp(dt * 1.6));
      if (moved) { this.setFollow(false); r.clampCam(); }
    }
  }

  // ================================================================== app
  const App = {
    init() {
      this.gfx = TM.Store.load('graphics', TM.DEFAULT_GRAPHICS);
      this.applyUIScale();
      this.menu = new TM.MenuScene($('menu-canvas'));
      this.menu.start();
      this.rng = new TM.RNG((Date.now() ^ 0x9e3779b9) >>> 0);
      this.newNation();
      document.querySelector('.menu-buttons').addEventListener('click', (e) => {
        const b = e.target.closest('[data-action]');
        if (!b) return;
        if (b.dataset.action === 'new') this.openSetup('new');
        if (b.dataset.action === 'settings') this.openSetup('settings');
        if (b.dataset.action === 'about') this.about();
      });
      document.querySelectorAll('.tab').forEach((t) => (t.onclick = () => this.tab(t.dataset.tab)));
      $('setup-back').onclick = () => this.show('screen-menu');
      $('setup-begin').onclick = () => this.begin();
      this.bindNationForm();
      TM.buildGraphicsForm($('graphics-form'), this.gfx, (g) => this.saveGraphics(g));
      window.addEventListener('keydown', (e) => {
        if (this.game || TM.Modal.isOpen()) return;
        if (e.key === 'Escape' && $('screen-setup').classList.contains('active')) this.show('screen-menu');
      });
    },

    show(id) {
      document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    },
    tab(name) {
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
      document.querySelectorAll('.tab-page').forEach((p) => p.classList.toggle('active', p.dataset.page === name));
    },
    applyUIScale() {
      document.documentElement.style.setProperty('--ui-scale', this.gfx.uiScale || 1);
    },
    saveGraphics(g) {
      this.gfx = g;
      TM.Store.save('graphics', g);
      this.applyUIScale();
      if (this.game && this.game.renderer) this.game.renderer.resize();
    },

    // ---------------------------------------------------------------- nation setup
    newNation() {
      const r = this.rng;
      const saved = TM.Store.load('nation', {});
      const n = TM.Names.nation(r), v = TM.Names.village(r), c = TM.Names.camp(r);
      this.nation = {
        nationName: n.name, nationMeaning: n.meaning,
        villageName: v.name, villageMeaning: v.meaning,
        campName: c.name, campMeaning: c.meaning,
        season: saved.season || 'Spring',
        difficulty: saved.difficulty || 'balanced',
        population: saved.population || 200,
        seed: r.int(1, 999999),
      };
    },
    bindNationForm() {
      const N = () => this.nation;
      $('r-nation').innerHTML = TM.ICONS.dice;
      $('r-village').innerHTML = TM.ICONS.dice;
      $('r-seed').innerHTML = TM.ICONS.dice;
      $('f-season').innerHTML = SEASON_INFO.map(([s, ic, d]) => `<button type="button" class="card" role="radio" data-season="${s}"><span class="card-title">${TM.ICONS[ic]}${s}</span><span class="card-desc">${d}</span></button>`).join('');
      $('f-difficulty').innerHTML = DIFF_INFO.map(([k, l, ic, d]) => `<button type="button" class="card" role="radio" data-diff="${k}"><span class="card-title">${TM.ICONS[ic]}${l}</span><span class="card-desc">${d}</span></button>`).join('');
      $('f-nation').oninput = (e) => { N().nationName = e.target.value.trim() || 'People'; N().nationMeaning = ''; this.refreshSetup(); };
      $('f-village').oninput = (e) => { N().villageName = e.target.value.trim() || 'the village'; N().villageMeaning = ''; this.refreshSetup(); };
      $('r-nation').onclick = () => { const n = TM.Names.nation(this.rng); Object.assign(N(), { nationName: n.name, nationMeaning: n.meaning }); this.refreshSetup(true); };
      $('r-village').onclick = () => { const v = TM.Names.village(this.rng); Object.assign(N(), { villageName: v.name, villageMeaning: v.meaning }); this.refreshSetup(true); };
      $('r-seed').onclick = () => { N().seed = this.rng.int(1, 999999); this.refreshSetup(true); };
      $('f-seed').oninput = (e) => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); N().seed = isNaN(v) ? 1 : v; this.refreshSetup(); };
      $('f-pop').oninput = (e) => { N().population = +e.target.value; this.refreshSetup(); };
      $('f-season').onclick = (e) => { const b = e.target.closest('[data-season]'); if (b) { N().season = b.dataset.season; this.refreshSetup(); } };
      $('f-difficulty').onclick = (e) => { const b = e.target.closest('[data-diff]'); if (b) { N().difficulty = b.dataset.diff; this.refreshSetup(); } };
    },
    refreshSetup(fillInputs) {
      const n = this.nation;
      if (fillInputs) {
        $('f-nation').value = n.nationName;
        $('f-village').value = n.villageName;
        $('f-seed').value = n.seed;
        $('f-pop').value = n.population;
      }
      $('m-nation').textContent = n.nationMeaning ? `“${n.nationMeaning}”` : '';
      $('m-village').textContent = n.villageMeaning ? `“${n.villageMeaning}”` : '';
      $('o-pop').textContent = n.population;
      document.querySelectorAll('#f-season .card').forEach((c) => { const on = c.dataset.season === n.season; c.classList.toggle('selected', on); c.setAttribute('aria-checked', on); });
      document.querySelectorAll('#f-difficulty .card').forEach((c) => { const on = c.dataset.diff === n.difficulty; c.classList.toggle('selected', on); c.setAttribute('aria-checked', on); });
      $('pv-name').textContent = `The ${n.nationName}`;
      $('pv-meaning').textContent = n.nationMeaning || '';
      const si = TM.SEASONS.indexOf(n.season);
      const families = Math.round(n.population / 4.6);
      const diff = DIFF_INFO.find((d) => d[0] === n.difficulty);
      $('pv-list').innerHTML = [
        `${n.population} people in about ${families} families`,
        `<b>${esc(n.villageName)}</b>, a village of bark longhouses and wigwams beside the fields`,
        `<b>${esc(n.campName)}</b>, a hunting camp of hide tipis across the river`,
        'Six clans: Elk, Crane, Turtle, Bear, Hawk and Otter',
        `Begins in the ${TM.MOONS[si][0]} of ${n.season.toLowerCase()}`,
        `${diff[1]}: ${diff[3].charAt(0).toLowerCase() + diff[3].slice(1)}`,
      ].map((t) => `<li><span>${t}</span></li>`).join('');
      this.drawPreview(si);
      TM.Store.save('nation', { season: n.season, difficulty: n.difficulty, population: n.population });
    },
    drawPreview(s) {
      const cv = $('preview-canvas');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = 300, H = 140;
      if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sky = [['#7fa6c4', '#e9d6b0'], ['#6f9ec4', '#f0dcb0'], ['#8a8fb0', '#f0b878'], ['#8e9cb0', '#dfe4ea']][s];
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, sky[0]);
      g.addColorStop(0.55, sky[1]);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      const ground = ['#86a050', '#a0a55a', '#b0844e', '#e7edf2'][s];
      c.fillStyle = ground;
      c.beginPath();
      c.ellipse(W / 2, H * 0.98, W * 0.75, H * 0.36, 0, 0, Math.PI * 2);
      c.fill();
      const prev = TM.Sprites.scale;
      TM.Sprites.setQuality('high');
      const blit = (spr, x, y, k) => c.drawImage(spr.c, x - spr.ax * k, y - spr.ay * k, spr.w * k, spr.h * k);
      blit(TM.Sprites.tree('maple', s, 1), 262, 92, 0.75);
      blit(TM.Sprites.tree('oak', s, 0), 34, 96, 0.7);
      blit(TM.Sprites.longhouse(s, 1, false), 168, 104, 0.42);
      blit(TM.Sprites.tipi(s, 1), 60, 118, 0.62);
      blit(TM.Sprites.wigwam(s, 0, 'S'), 236, 122, 0.6);
      blit(TM.Sprites.wigwam(s, 1, 'E'), 112, 128, 0.52);
      TM.Sprites.setQuality(prev === 2.4 ? 'high' : prev === 1.1 ? 'low' : 'medium');
    },
    openSetup(mode) {
      const isNew = mode === 'new';
      $('setup-eyebrow').textContent = isNew ? 'New game' : 'Settings';
      $('setup-title').textContent = isNew ? 'Prepare your nation' : 'Settings';
      $('tab-nation').hidden = !isNew;
      $('setup-begin').hidden = !isNew;
      $('setup-back').textContent = isNew ? 'Back' : 'Done';
      if (isNew) this.newNation();
      this.tab(isNew ? 'nation' : 'graphics');
      TM.buildGraphicsForm($('graphics-form'), this.gfx, (g) => this.saveGraphics(g));
      this.refreshSetup(true);
      this.show('screen-setup');
    },
    about() {
      TM.Modal.open(`<div class="band"></div><h2>About Traditions Matter</h2>
        <p>A survival and strategy game set in a fictional North America. You lead an Indigenous nation of several villages through seasons and generations, managing food, health, firewood, trade, culture and the voices of your council. In later chapters a foreign colony appears on the coast, and your choices decide what becomes of your land and your people.</p>
        <p><b>This first version</b> brings the nation to life before contact: a village of elm-bark longhouses and mat-and-bark wigwams beside maize, bean and squash fields, and a hunting camp of bison-hide tipis on the prairie. There are no horses, metal tools, guns, cloth or glass beads yet. Dogs pull the travois, tools are stone, bone and wood, pots are fired clay, and decoration is quill and paint.</p>
        <p>The nation, its people and its language are invented. They draw on the many peoples of the prairie–woodland borderlands without portraying any one of them, and the game leaves out sacred ceremonies.</p>
        <div class="modal-actions"><button class="btn primary" data-m="ok">Close</button></div>`, { actions: { ok: (c) => c() } });
    },

    // ---------------------------------------------------------------- starting and leaving a game
    async begin() {
      const n = Object.assign({}, this.nation);
      if (!n.nationName) n.nationName = 'People';
      this.show('screen-loading');
      const game = new Game(this, n, Object.assign({}, this.gfx));
      try {
        $('screen-game').classList.add('active');
        $('screen-game').style.visibility = 'hidden';
        await game.build((t) => ($('loading-text').textContent = t));
      } catch (err) {
        console.error(err);
        $('screen-game').classList.remove('active');
        $('screen-game').style.visibility = '';
        $('loading-text').textContent = 'Something went wrong while building the world. Please try another seed.';
        setTimeout(() => this.show('screen-setup'), 2500);
        return;
      }
      this.menu.stop();
      this.game = game;
      $('screen-game').style.visibility = '';
      this.show('screen-game');
      game.start();
    },
    quitToMenu() {
      document.getElementById('modal-root').innerHTML = '';
      if (this.game) this.game.stop();
      this.game = null;
      this.show('screen-menu');
      this.menu.start();
    },
  };

  TM.App = App;
  window.addEventListener('DOMContentLoaded', () => App.init());
})();
