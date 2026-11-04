/* Traditions Matter — interface: icons, HUD, tooltips, information panels,
   the chronicle, modals and the settings forms. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U } = TM;

  const I = (TM.ICONS = {
    pop: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8.5" cy="6.5" r="2.7"/><circle cx="16.5" cy="7.6" r="2.2"/><path d="M3.6 20.5c0-4.6 2.1-8 4.9-8s4.9 3.4 4.9 8z"/><path d="M13.2 20.5c.2-3.7 1.6-6.4 3.4-6.4s3.6 2.7 3.8 6.4z" opacity=".7"/></svg>',
    food: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c2.6 2.2 3.6 5.8 3.2 9.6-.3 3.4-1.6 6.2-3.2 8.4-1.6-2.2-2.9-5-3.2-8.4C8.4 7.8 9.4 4.2 12 2z"/><path d="M5 9c2.8.6 5 3.4 6 7.8.3 1.4.5 3 .5 4.7C8 20.4 5.6 18 4.8 14.6 4.4 12.8 4.5 10.8 5 9z" opacity=".55"/><path d="M19 9c.5 1.8.6 3.8.2 5.6-.8 3.4-3.2 5.8-6.7 6.9 0-1.7.2-3.3.5-4.7 1-4.4 3.2-7.2 6-7.8z" opacity=".55"/></svg>',
    wood: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2.5" y="13.5" width="15.5" height="5.2" rx="2.6"/><rect x="6" y="6.8" width="15.5" height="5.2" rx="2.6" opacity=".72"/><circle cx="15.4" cy="16.1" r="1.6" fill="#000" opacity=".25"/><circle cx="18.9" cy="9.4" r="1.6" fill="#000" opacity=".25"/></svg>',
    hides: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3c1.5 1 4 1.5 6 1.5S16.5 4 18 3c.3 2 1.4 3 2.8 3.4-1.2 2-1.6 4-.6 6.4-1.4.6-2 2.4-1.6 4.6-1.6-.4-3 .3-3.6 2.6-1-.8-2-1-3-1s-2 .2-3 1c-.6-2.3-2-3-3.6-2.6.4-2.2-.2-4-1.6-4.6 1-2.4.6-4.4-.6-6.4C4.6 6 5.7 5 6 3z"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.7 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.3 0 5.4 3.2 4.2 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>',
    fast: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6l9 6-9 6zM12 6l9 6-9 6z"/></svg>',
    faster: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 6.5l7 5.5-7 5.5zM8.5 6.5l7 5.5-7 5.5zM16 6.5l7 5.5-7 5.5z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/></svg>',
    spring: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21v-8"/><path d="M12 13c0-4 2.6-7 7-7 0 4.4-3 7-7 7zM12 15c0-3.4-2.2-6-6-6 0 3.8 2.6 6 6 6z"/><rect x="11.2" y="12" width="1.6" height="9" rx=".8"/></svg>',
    summer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
    autumn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 4 4-1-1 4 4 2-4 2 1 4-4-1-2 4-2-4-4 1 1-4-4-2 4-2-1-4 4 1z"/></svg>',
    winter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/></svg>',
    feather: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3C11 4 5 10 4.5 19.5L3 21l1 .2 1.5-1.6C15 19 20.5 12.5 20 3zM7 17c2-4 5-7.5 9-10-3 3.2-5.6 6.5-7.6 10.4z"/></svg>',
    circle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
    mountain: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 20l7-12 4 6 2.5-3.5L22 20z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  });

  const WEATHER = { clear: 'Clear skies', cloudy: 'Overcast', rain: 'Rain', storm: 'Thunderstorm', hot: 'Hot and dry', fog: 'Morning fog', snow: 'Snowfall', cold: 'Bitter cold' };
  TM.WEATHER = WEATHER;
  function timeName(h) {
    if (h < 4.5) return 'Deep night';
    if (h < 6.5) return 'Dawn';
    if (h < 9) return 'Morning';
    if (h < 11.5) return 'Late morning';
    if (h < 13.5) return 'Midday';
    if (h < 16.5) return 'Afternoon';
    if (h < 18.5) return 'Late afternoon';
    if (h < 20.5) return 'Dusk';
    return 'Night';
  }
  TM.timeName = timeName;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (v) => Math.round(v * 100) + '%';
  const barCls = (f) => (f < 0.35 ? 'low' : f < 0.65 ? 'mid' : '');
  const bar = (f, neutral) => `<div class="bar ${neutral ? 'neutral' : barCls(f)}"><span style="width:${Math.round(U.clamp(f, 0, 1) * 100)}%"></span></div>`;
  const clanOf = (id) => TM.CLANS.find((c) => c.id === id) || { name: '', color: '#888' };

  function sparkline(vals, w = 120, h = 26, col = '#d69c48') {
    if (vals.length < 2) return '';
    const mx = Math.max(...vals, 1), mn = Math.min(...vals, 0);
    const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - ((v - mn) / (mx - mn || 1)) * (h - 2) - 1).toFixed(1)}`).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }

  // ------------------------------------------------------------------ modals
  TM.Modal = {
    open(html, opts = {}) {
      const root = document.getElementById('modal-root');
      const bd = document.createElement('div');
      bd.className = 'modal-backdrop';
      bd.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
      root.appendChild(bd);
      const close = () => { bd.remove(); if (opts.onClose) opts.onClose(); };
      bd.addEventListener('click', (e) => {
        if (e.target === bd && opts.dismiss !== false) close();
        const a = e.target.closest('[data-m]');
        if (a && opts.actions && opts.actions[a.dataset.m]) opts.actions[a.dataset.m](close, a);
      });
      const first = bd.querySelector('button.primary') || bd.querySelector('button');
      if (first) setTimeout(() => first.focus(), 30);
      bd._close = close;
      return { el: bd, close };
    },
    closeTop() {
      const root = document.getElementById('modal-root');
      const last = root.lastElementChild;
      if (last && last._close) { last._close(); return true; }
      return false;
    },
    isOpen() { return !!document.getElementById('modal-root').lastElementChild; },
  };

  // ------------------------------------------------------------------ graphics settings form
  TM.buildGraphicsForm = function (el, gfx, onChange) {
    const rows = [
      { key: 'quality', name: 'Graphics quality', desc: 'Detail of lodges, people, terrain and smoke. Choose Low if the game runs slowly.', seg: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']] },
      { key: 'lighting', name: 'Day and night lighting', desc: 'Darkness at night, with firelight from hearths and lodge doorways.', sw: true },
      { key: 'weather', name: 'Weather effects', desc: 'Rain, thunderstorms, snowfall and morning fog.', sw: true },
      { key: 'labels', name: 'Name labels', desc: 'Show people’s names above their heads.', seg: [['off', 'Off'], ['hover', 'On hover'], ['always', 'Always']] },
      { key: 'uiScale', name: 'Interface size', desc: 'Size of text, panels and buttons.', seg: [[0.9, '90%'], [1, '100%'], [1.15, '115%'], [1.3, '130%']] },
      { key: 'fps', name: 'Show frame rate', desc: 'A small counter in the corner of the game view.', sw: true },
    ];
    const render = () => {
      el.innerHTML = rows.map((r) => {
        const ctl = r.sw
          ? `<button type="button" class="switch ${gfx[r.key] ? 'on' : ''}" role="switch" aria-checked="${!!gfx[r.key]}" aria-label="${esc(r.name)}" data-k="${r.key}"></button>`
          : `<div class="seg" role="radiogroup" aria-label="${esc(r.name)}">${r.seg.map(([v, l]) => `<button type="button" class="${gfx[r.key] === v ? 'on' : ''}" role="radio" aria-checked="${gfx[r.key] === v}" data-k="${r.key}" data-v="${v}">${l}</button>`).join('')}</div>`;
        return `<div class="opt-row"><div class="opt-text"><div class="opt-name">${r.name}</div><div class="opt-desc">${r.desc}</div></div>${ctl}</div>`;
      }).join('');
    };
    render();
    el.onclick = (e) => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      const k = b.dataset.k;
      if (b.classList.contains('switch')) gfx[k] = !gfx[k];
      else {
        const v = b.dataset.v;
        gfx[k] = k === 'uiScale' ? parseFloat(v) : v;
      }
      render();
      onChange(gfx, k);
    };
  };

  // ------------------------------------------------------------------ HUD and panels
  class UI {
    constructor(game) {
      this.g = game;
      this.sim = game.sim;
      this.r = game.renderer;
      this.panel = document.getElementById('panel');
      this.logEl = document.getElementById('log');
      this.tip = document.getElementById('tooltip');
      this.sel = null;
      this.buildHUD();
      this.bindTooltips();
      this.panel.onclick = (e) => this.onPanelClick(e);
      this.logEl.innerHTML = '';
      for (const e of this.sim.events.slice(-4)) this.addLog(e, true);
    }

    buildHUD() {
      const s = this.g.settings;
      document.getElementById('hud-nation-name').textContent = `The ${s.nationName}`;
      document.getElementById('hud-nation-sub').textContent = s.nationMeaning ? `“${s.nationMeaning}”` : `Village of ${s.villageName}`;
      const res = [
        ['pop', 'People'], ['food', 'Food'], ['wood', 'Firewood'], ['hides', 'Hides'], ['health', 'Health'],
      ];
      document.getElementById('hud-res').innerHTML = res.map(([k, l]) => `<div class="res" data-res="${k}" data-tip="${k}" tabindex="0">${I[k]}<span class="v" id="r-${k}">–</span><span class="l">${l}</span></div>`).join('');
      const sp = document.getElementById('hud-speed');
      sp.innerHTML = [[0, 'pause', 'Pause (Space)'], [1, 'play', 'Normal speed (1)'], [3, 'fast', 'Fast (2)'], [8, 'faster', 'Fastest (3)']]
        .map(([v, ic, t]) => `<button class="icon-btn" data-speed="${v}" title="${t}" aria-label="${t}">${I[ic]}</button>`).join('');
      sp.onclick = (e) => { const b = e.target.closest('[data-speed]'); if (b) this.g.setSpeed(+b.dataset.speed); };
      document.getElementById('btn-menu').innerHTML = I.menu;
    }

    update() {
      const sim = this.sim, c = sim.c;
      const need = sim.needPerDay();
      const food = sim.foodTotal();
      const days = food / Math.max(1, need);
      const set = (k, v, warn) => {
        const el = document.getElementById('r-' + k);
        if (el.textContent !== v) el.textContent = v;
        el.parentElement.classList.toggle('warn', !!warn);
      };
      set('pop', String(sim.people.length));
      set('food', `${U.fmt(food)} · ${Math.floor(days)}d`, days < 6);
      const burn = sim.woodBurnPerDay();
      set('wood', U.fmt(sim.stores.wood), sim.stores.wood < burn * 2.5);
      set('hides', U.fmt(sim.stores.hides));
      const hp = sim.avgHealth();
      set('health', Math.round(hp) + '%', hp < 60);
      document.getElementById('hud-date').textContent = `Day ${c.dom} of the ${TM.MOONS[c.season][c.moon]}`;
      document.getElementById('hud-season').textContent = `${TM.SEASONS[c.season]}, year ${c.year} · ${timeName(sim.hour)}`;
      this.drawClock();
      const sp = document.querySelectorAll('#hud-speed [data-speed]');
      sp.forEach((b) => b.classList.toggle('on', +b.dataset.speed === this.g.speed));
      if (this.sel) this.refreshPanel();
      if (this.tipKey) this.showTip(this.tipKey, this.tipEl);
    }

    drawClock() {
      const h = this.sim.hour, w = this.sim.weather.kind;
      const key = `${Math.round(h * 4)}|${w}`;
      if (key === this.clockKey) return;
      this.clockKey = key;
      // the sun crosses the dial by day and the moon by night, rising on the left
      const day = h >= 6 && h < 19;
      const t = day ? (h - 6) / 13 : ((h + 24 - 19) % 24) / 11;
      const ang = Math.PI + t * Math.PI;
      const x = (20 + Math.cos(ang) * 12).toFixed(1), y = (22 + Math.sin(ang) * 12).toFixed(1);
      const sky = !day ? '#161a2c' : w === 'rain' || w === 'storm' ? '#4a5260' : w === 'snow' ? '#7a8592' : w === 'cloudy' || w === 'fog' ? '#5a6068' : '#3d6584';
      const icon = day
        ? `<circle cx="${x}" cy="${y}" r="4.4" fill="#f2c04a"/>`
        : `<circle cx="${x}" cy="${y}" r="4" fill="#e8e2d0"/><circle cx="${+x + 1.8}" cy="${+y - 1.3}" r="3.4" fill="${sky}"/>`;
      let wx = '';
      if (w === 'rain' || w === 'storm') wx = '<path d="M14 25l-2 5M20 25l-2 5M26 25l-2 5" stroke="#a8c0d6" stroke-width="1.4" stroke-linecap="round"/>';
      if (w === 'snow') wx = '<circle cx="14" cy="28" r="1.3" fill="#fff"/><circle cx="20" cy="31" r="1.3" fill="#fff"/><circle cx="26" cy="27.5" r="1.3" fill="#fff"/>';
      if (w === 'cloudy' || w === 'fog') wx = '<ellipse cx="22" cy="14" rx="7" ry="3" fill="rgba(220,220,225,.55)"/>';
      document.getElementById('hud-clock').innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="${sky}" stroke="rgba(214,180,128,.5)"/>${icon}<path d="M2.1 22 A18 18 0 0 0 37.9 22 Z" fill="#2c2117"/>${wx}</svg>`;
    }

    // ---------------------------------------------------------------- tooltips
    bindTooltips() {
      const root = document.getElementById('screen-game');
      const show = (e) => {
        const el = e.target.closest('[data-tip]');
        if (!el) return;
        this.tipKey = el.dataset.tip;
        this.tipEl = el;
        this.showTip(this.tipKey, el);
      };
      const hide = (e) => {
        const el = e.target.closest('[data-tip]');
        if (el && el.contains(e.relatedTarget)) return;
        this.tipKey = null;
        this.tip.classList.remove('show');
      };
      if (TM._tipCleanup) TM._tipCleanup();
      root.addEventListener('pointerover', show);
      root.addEventListener('pointerout', hide);
      root.addEventListener('focusin', show);
      root.addEventListener('focusout', hide);
      TM._tipCleanup = () => {
        root.removeEventListener('pointerover', show);
        root.removeEventListener('pointerout', hide);
        root.removeEventListener('focusin', show);
        root.removeEventListener('focusout', hide);
      };
    }
    tipHTML(k) {
      const sim = this.sim, y = sim.yesterday;
      const row = (a, b, cls = '') => `<div class="tt-row"><span>${a}</span><span class="${cls}">${b}</span></div>`;
      if (k === 'pop') {
        const g = { infant: 0, child: 0, youth: 0, adult: 0, elder: 0 };
        let camp = 0;
        for (const p of sim.people) { g[p.role]++; if (p.band === 'camp') camp++; }
        return `<div class="tt-title">${sim.people.length} people</div>` + row('Infants', g.infant) + row('Children', g.child) + row('Young people', g.youth) + row('Adults', g.adult) + row('Elders', g.elder) +
          `<div style="margin-top:.4rem">${sim.people.length - camp} live in the village and ${camp} in the hunting camp.</div>`;
      }
      if (k === 'food') {
        const need = sim.needPerDay();
        let h = `<div class="tt-title">Food stores</div>` + row('Days of food', Math.floor(sim.foodTotal() / need));
        for (const f of ['maize', 'meat', 'fish', 'wild']) h += row(TM.FOOD_LABEL[f], U.fmt(sim.food[f]));
        h += row('Eaten each day', U.fmt(need));
        if (y) h += `<div style="margin-top:.4rem">Yesterday: <span class="pos">+${U.fmt(y.food)}</span> gathered, <span class="neg">−${U.fmt(y.foodEaten)}</span> eaten.</div>`;
        return h;
      }
      if (k === 'wood') {
        const burn = sim.woodBurnPerDay();
        let h = `<div class="tt-title">Firewood</div>` + row('Burned each day', U.fmt(burn)) + row('Days left', Math.floor(sim.stores.wood / Math.max(1, burn)));
        if (y) h += `<div style="margin-top:.4rem">Yesterday: <span class="pos">+${U.fmt(y.wood)}</span> gathered, <span class="neg">−${U.fmt(y.woodBurned)}</span> burned.</div>`;
        return h + '<div style="margin-top:.4rem">Fires burn hotter and longer in winter.</div>';
      }
      if (k === 'hides') {
        return `<div class="tt-title">Hides</div>` + row('Tanned buckskin and robes', U.fmt(sim.stores.hides)) + row('Raw hides to be scraped', U.fmt(sim.stores.rawHides)) + row('Crafted goods', U.fmt(sim.stores.goods)) +
          '<div style="margin-top:.4rem">Hides become clothing, moccasins, robes and tipi covers.</div>';
      }
      if (k === 'health') {
        const sick = sim.sickCount();
        return `<div class="tt-title">Health</div>` + row('Average health', Math.round(sim.avgHealth()) + '%') + row('Unwell right now', sick) +
          '<div style="margin-top:.4rem">Hunger and cold wear people down. Healers tend the sick.</div>';
      }
      if (k === 'time') {
        return `<div class="tt-title">${timeName(sim.hour)}</div>${WEATHER[sim.weather.kind] || ''}`;
      }
      return '';
    }
    showTip(k, el) {
      const html = this.tipHTML(k);
      if (!html) return;
      if (this.tip.innerHTML !== html) this.tip.innerHTML = html;
      const r = el.getBoundingClientRect();
      const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
      let x = r.left + r.width / 2 - tw / 2, y = r.bottom + 10;
      x = U.clamp(x, 8, window.innerWidth - tw - 8);
      if (y + th > window.innerHeight - 8) y = r.top - th - 10;
      this.tip.style.left = x + 'px';
      this.tip.style.top = y + 'px';
      this.tip.classList.add('show');
    }

    // ---------------------------------------------------------------- log
    addLog(e, quiet) {
      const el = document.createElement('div');
      el.className = `log-entry t-${e.type}`;
      el.innerHTML = `<span class="when">Day ${e.cal ? e.cal.dom : ''}</span>${esc(e.text)}`;
      this.logEl.appendChild(el);
      while (this.logEl.children.length > 4) this.logEl.firstElementChild.remove();
      const life = quiet ? 9000 : e.type === 'warn' || e.type === 'season' ? 18000 : 11000;
      setTimeout(() => el.classList.add('fade'), life);
      setTimeout(() => el.remove(), life + 1300);
      if (e.type === 'season' && !quiet && /has come/.test(e.text)) this.banner(TM.SEASONS[e.cal.season], TM.MOONS[e.cal.season][e.cal.moon]);
    }
    banner(big, small) {
      const b = document.getElementById('banner');
      b.innerHTML = `<div class="big">${esc(big)}</div><div class="small">${esc(small)}</div>`;
      b.classList.remove('show');
      void b.offsetWidth;
      b.classList.add('show');
    }
    openChronicle() {
      const ev = this.sim.events.slice().reverse();
      const html = `<div class="band thin"></div><h2>Chronicle</h2><p>What has happened among your people, most recent first.</p>
        <div class="chronicle">${ev.map((e) => `<div class="log-entry t-${e.type}"><span class="when">Day ${e.cal.dom}, ${TM.MOONS[e.cal.season][e.cal.moon]}, year ${e.cal.year}</span>${esc(e.text)}</div>`).join('')}</div>
        <div class="modal-actions"><button class="btn primary" data-m="close">Close</button></div>`;
      TM.Modal.open(html, { wide: true, actions: { close: (c) => c() } });
    }

    // ---------------------------------------------------------------- selection panels
    select(sel) {
      this.sel = sel;
      this.r.selected = sel ? { kind: sel.kind === 'building' ? 'bld' : sel.kind, obj: sel.obj } : null;
      if (!sel) {
        this.panel.classList.add('hidden');
        this.g.setFollow(false);
        return;
      }
      if (sel.kind !== 'person') this.g.setFollow(false);
      this.panel.classList.remove('hidden');
      this.panel.scrollTop = 0;
      this.refreshPanel(true);
    }
    refreshPanel() {
      const s = this.sel;
      if (!s) return;
      let html = '';
      if (s.kind === 'person') {
        if (s.obj.dead) { html = this.deadHTML(s.obj); }
        else html = this.personHTML(s.obj);
      } else if (s.kind === 'building') html = this.buildingHTML(s.obj);
      else if (s.kind === 'field') html = this.fieldHTML();
      else if (s.kind === 'overview') html = this.overviewHTML();
      html = `<button class="icon-btn close" data-act="close" title="Close (Esc)" aria-label="Close">${I.close}</button>` + html;
      if (html !== this.lastPanel) {
        const st = this.panel.scrollTop;
        this.panel.innerHTML = html;
        this.panel.scrollTop = st;
        this.lastPanel = html;
      }
    }
    onPanelClick(e) {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const act = a.dataset.act, sim = this.sim;
      if (act === 'close') this.select(null);
      else if (act === 'person') {
        const p = sim.byId.get(+a.dataset.id);
        if (p) { this.select({ kind: 'person', obj: p }); this.g.lookAt(p.x, p.y); }
      } else if (act === 'building') {
        const b = this.sim.W.buildings[+a.dataset.id];
        if (b) { this.select({ kind: 'building', obj: b }); this.g.lookAt(b.cx, b.cy); }
      } else if (act === 'follow') this.g.setFollow(!this.g.follow);
      else if (act === 'look' && this.sel && this.sel.kind === 'person') this.g.lookAt(this.sel.obj.x, this.sel.obj.y);
    }

    relation(p, q) {
      if (p.spouse === q.id) return q.sex === 'F' ? 'Wife' : 'Husband';
      if (p.mother === q.id) return 'Mother';
      if (p.father === q.id) return 'Father';
      if (q.mother === p.id || q.father === p.id) return q.sex === 'F' ? 'Daughter' : 'Son';
      if ((p.mother && p.mother === q.mother) || (p.father && p.father === q.father)) return q.sex === 'F' ? 'Sister' : 'Brother';
      if (q.role === 'elder' && (p.role === 'child' || p.role === 'youth' || p.role === 'infant')) return q.sex === 'F' ? 'Grandmother' : 'Grandfather';
      if (p.role === 'elder' && (q.role === 'child' || q.role === 'youth' || q.role === 'infant')) return q.sex === 'F' ? 'Granddaughter' : 'Grandson';
      return 'Relative';
    }
    who(p) {
      if (p.role === 'infant') return 'Infant';
      if (p.role === 'child') return p.sex === 'F' ? 'Girl' : 'Boy';
      if (p.role === 'youth') return p.sex === 'F' ? 'Young woman' : 'Young man';
      if (p.role === 'elder') return p.sex === 'F' ? 'Elder woman' : 'Elder man';
      return p.sex === 'F' ? 'Woman' : 'Man';
    }
    personLink(q, sub) {
      return `<button class="link" data-act="person" data-id="${q.id}"><span>${esc(q.name)}</span><span class="sub">${esc(sub)}</span></button>`;
    }
    personHTML(p) {
      const sim = this.sim;
      const clan = clanOf(p.clan);
      const occ = TM.OCCUPATIONS[p.occupation] || {};
      const home = sim.homeOf(p);
      let doing;
      if (p.role === 'infant') {
        const c = sim.byId.get(p.carrier);
        doing = c ? `Carried on a cradleboard by ${esc(c.name)}` : 'Being cared for';
      } else if (p.inside) {
        doing = p.planKind === 'sleep' ? 'Asleep in the lodge' : p.planKind === 'council' ? 'Meeting in the council lodge' : esc(p.actLabel || 'Inside the lodge');
      } else doing = esc(p.actLabel || 'Resting');
      const hh = sim.hhOf(p);
      const fam = hh ? hh.members.filter((id) => id !== p.id).map((id) => sim.byId.get(id)).filter(Boolean) : [];
      const famHTML = fam.map((q) => this.personLink(q, `${this.relation(p, q)}, ${q.age}`)).join('');
      const skills = [['farm', 'Farming'], ['hunt', 'Hunting'], ['fish', 'Fishing'], ['gather', 'Gathering'], ['craft', 'Crafts'], ['hides', 'Hide work']];
      const skillHTML = p.role === 'infant' || p.role === 'child' ? '' : `<h4>Skills</h4><div class="kv">${skills.map(([k, l]) => `<span class="k">${l}</span>${bar((p.skills[k] || 0) / 1.4, true)}<span class="v"></span>`).join('')}</div>`;
      const sick = p.sick > 0 ? ' · unwell' : '';
      const homeName = home ? (TM.BUILD_INFO[home.type] || {}).name : '';
      return `<h3>${esc(p.name)}</h3><p class="meaning">“${esc(p.meaning)}”</p>
        <div class="chips">${p.title ? `<span class="chip title">${esc(p.title)}</span>` : ''}<span class="chip">${this.who(p)}, ${p.age === 0 ? 'under a year' : p.age}</span><span class="chip"><span class="dot" style="background:${clan.color}"></span>${clan.name} Clan</span></div>
        <div class="doing">${doing}</div>
        <div class="kv"><span class="k">Health</span>${bar(p.health / 100)}<span class="v">${Math.round(p.health)}%${sick}</span></div>
        <h4>Work</h4><p><b>${esc(p.occupation)}</b>. ${esc(occ.desc || '')}</p>
        ${skillHTML}
        <h4>Family</h4><div class="list">${famHTML || '<p class="note">No close family living with them.</p>'}</div>
        ${home ? `<h4>Home</h4><div class="list"><button class="link" data-act="building" data-id="${home.id}"><span>${esc(homeName)}</span><span class="sub">${p.band === 'camp' ? esc(this.g.settings.campName) : esc(this.g.settings.villageName)}</span></button></div>` : ''}
        ${p.role !== 'infant' ? `<div class="panel-actions"><button class="btn small ${this.g.follow ? 'primary' : ''}" data-act="follow">${this.g.follow ? 'Following' : 'Follow'}</button><button class="btn small" data-act="look">Look</button></div>` : ''}`;
    }
    deadHTML(p) {
      return `<h3>${esc(p.name)}</h3><p class="meaning">“${esc(p.meaning)}”</p><p>${esc(p.name)} has passed on, at ${p.age} ${p.age === 1 ? 'year' : 'years'}. They are remembered by their family and the ${clanOf(p.clan).name} Clan.</p>`;
    }
    buildingHTML(b) {
      const sim = this.sim;
      const info = TM.BUILD_INFO[b.type] || { name: b.type, desc: '' };
      const place = b.band === 'camp' ? this.g.settings.campName : this.g.settings.villageName;
      let extra = '';
      if (b.hh && b.hh.length) {
        const groups = b.hh.map((id) => sim.hhById.get(id)).filter((h) => h && h.members.length);
        const n = groups.reduce((s, h) => s + h.members.length, 0);
        extra += `<h4>Who lives here</h4><p class="note">${n} ${n === 1 ? 'person' : 'people'}${groups.length > 1 ? ` in ${groups.length} families` : ''}</p>`;
        for (const h of groups) {
          const mem = h.members.map((id) => sim.byId.get(id)).filter(Boolean).sort((a, c) => c.age - a.age);
          const head = mem.find((q) => q.sex === 'F' && q.role === 'adult') || mem[0];
          if (groups.length > 1) extra += `<p class="note" style="margin-top:.6rem">Family of ${esc(head.name)}, ${clanOf(h.clan).name} Clan</p>`;
          extra += `<div class="list">${mem.map((q) => this.personLink(q, `${this.who(q)}, ${q.age}`)).join('')}</div>`;
        }
      }
      if (b.type === 'council') {
        const c = sim.people.filter((p) => p.title);
        extra += `<h4>The council</h4><div class="list">${c.map((q) => this.personLink(q, q.title)).join('')}</div>`;
        extra += `<p class="note">The council meets on the first day of every moon.</p>`;
      }
      if (b.type === 'crib' || b.type === 'pit') {
        extra += `<h4>Stores of the ${b.band === 'camp' ? 'camp' : 'village'}</h4><div class="kv">${['maize', 'meat', 'fish', 'wild'].map((f) => `<span class="k">${TM.FOOD_LABEL[f]}</span><span></span><span class="v">${U.fmt(sim.food[f])}</span>`).join('')}</div>`;
      }
      if (b.type === 'rack' || b.type === 'fishrack') {
        extra += `<h4>Drying now</h4><div class="kv"><span class="k">Dried meat</span><span></span><span class="v">${U.fmt(sim.food.meat)}</span><span class="k">Dried fish</span><span></span><span class="v">${U.fmt(sim.food.fish)}</span></div>`;
      }
      if (b.type === 'hideframe') {
        extra += `<h4>Hides</h4><div class="kv"><span class="k">Waiting to be scraped</span><span></span><span class="v">${U.fmt(sim.stores.rawHides)}</span><span class="k">Tanned</span><span></span><span class="v">${U.fmt(sim.stores.hides)}</span></div>`;
      }
      if (b.type === 'platform') extra += this.cropHTML();
      if (b.type === 'bigfire' || b.type === 'campfire') {
        const near = sim.people.filter((p) => !p.inside && p.role !== 'infant' && Math.hypot(p.x - b.cx, p.y - b.cy) < 4);
        extra += `<h4>Gathered here now</h4>${near.length ? `<div class="list">${near.slice(0, 14).map((q) => this.personLink(q, q.actLabel || '')).join('')}</div>` : '<p class="note">No one is at the fire right now. People gather here in the evening.</p>'}`;
      }
      return `<h3>${esc(info.name)}</h3><p class="meaning">${esc(place)}</p><p>${esc(info.desc)}</p>${extra}`;
    }
    cropHTML() {
      const sim = this.sim, cr = sim.crop;
      const phase = { prep: 'Preparing the fields', growing: 'Growing', green: 'Green corn ripening', harvest: 'Harvest under way', frost: 'Last of the harvest', fallow: 'Resting under snow' }[cr.phase];
      let h = `<h4>The crop</h4><div class="kv"><span class="k">Stage</span><span></span><span class="v">${phase}</span><span class="k">Condition</span>${bar(cr.condition)}<span class="v">${pct(cr.condition)}</span>`;
      if (cr.potential > 0) h += `<span class="k">Harvested</span>${bar(cr.harvested / cr.potential)}<span class="v">${U.fmt(cr.harvested)} of ${U.fmt(cr.potential)}</span>`;
      h += '</div>';
      return h;
    }
    fieldHTML() {
      const c = this.sim.c;
      const stage = ['Cleared, ready for planting', 'Earth hilled up for planting', 'Young sprouts', 'Knee-high corn, squash spreading', 'Tall corn with climbing beans', 'Corn in tassel', 'Ripe ears, pumpkins and squash', 'Harvested stalks', 'Stubble under snow'][this.sim.fieldStage(1e9)];
      return `<h3>Fields</h3><p class="meaning">${esc(this.g.settings.villageName)} · ${TM.SEASONS[c.season]}</p>
        <p>Maize, beans and squash grow together in low hills of earth. The beans climb the cornstalks, and the broad squash leaves shade the soil and keep in moisture. The fields belong to the women of each family, who plant, tend and harvest them.</p>
        <p><b>Now:</b> ${esc(stage)}.</p>${this.cropHTML()}<p class="note">Fields: ${this.sim.W.fields.length} plots on the floodplain.</p>`;
    }
    overviewHTML() {
      const sim = this.sim, s = this.g.settings;
      const g = { infant: 0, child: 0, youth: 0, adult: 0, elder: 0 };
      const occ = {};
      let camp = 0;
      for (const p of sim.people) {
        g[p.role]++;
        if (p.band === 'camp') camp++;
        if (p.role === 'adult' || p.role === 'youth' || p.role === 'elder') occ[p.occupation] = (occ[p.occupation] || 0) + 1;
      }
      const n = sim.people.length;
      const need = sim.needPerDay(), tot = sim.foodTotal();
      const dw = {};
      for (const b of sim.W.buildings) if (b.type === 'wigwam' || b.type === 'longhouse' || b.type === 'tipi') dw[b.type] = (dw[b.type] || 0) + 1;
      const hist = sim.history.slice(-30);
      const council = sim.people.filter((p) => p.title);
      return `<h3>The ${esc(s.nationName)}</h3><p class="meaning">${esc(s.nationMeaning || '')}</p>
        <h4>People</h4><div class="kv">
          ${[['infant', 'Infants'], ['child', 'Children'], ['youth', 'Young people'], ['adult', 'Adults'], ['elder', 'Elders']].map(([k, l]) => `<span class="k">${l}</span>${bar(g[k] / Math.max(1, n) * 2.5, true)}<span class="v">${g[k]}</span>`).join('')}
        </div>
        <p class="note">${n - camp} in ${esc(s.villageName)} and ${camp} in ${esc(s.campName)}, in ${sim.households.filter((h) => h.members.length).length} families. ${dw.longhouse || 0} longhouses, ${dw.wigwam || 0} wigwams and ${dw.tipi || 0} tipis.</p>
        <h4>Food</h4><div class="kv">
          ${['maize', 'meat', 'fish', 'wild'].map((f) => `<span class="k">${TM.FOOD_LABEL[f]}</span>${bar(sim.food[f] / Math.max(1, tot), true)}<span class="v">${U.fmt(sim.food[f])}</span>`).join('')}
          <span class="k">Days of food</span><span></span><span class="v">${Math.floor(tot / need)}</span>
        </div>
        ${hist.length > 1 ? `<p class="note" style="margin-top:.5rem">Food stores over the last ${hist.length} days</p>${sparkline(hist.map((h) => h.food), 280, 30)}` : ''}
        ${this.cropHTML()}
        <h4>Work</h4><div class="kv">${Object.entries(occ).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="k">${esc(k)}</span><span></span><span class="v">${v}</span>`).join('')}</div>
        <h4>Council and leaders</h4><div class="list">${council.map((q) => this.personLink(q, q.title)).join('')}</div>`;
    }
  }

  TM.UI = UI;
})();
