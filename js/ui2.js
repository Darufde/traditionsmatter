/* Traditions Matter — the interface for your influence: the council debate,
   leanings, traditions, the land and its life, the colony, nature cards and
   the endings. Extends TM.UI. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U } = TM;
  const I = TM.ICONS;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (v) => Math.round(v * 100) + '%';
  const barCls = (f) => (f < 0.35 ? 'low' : f < 0.65 ? 'mid' : '');
  const bar = (f, neutral) => `<div class="bar ${neutral ? 'neutral' : barCls(f)}"><span style="width:${Math.round(U.clamp(f, 0, 1) * 100)}%"></span></div>`;
  const LETTER = ['A', 'B', 'C', 'D'];

  Object.assign(I, {
    tradition: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c3 4 4.5 8.5 4 13-.3 2.6-1.6 4.6-4 7-2.4-2.4-3.7-4.4-4-7-.5-4.5 1-9 4-13z"/><path d="M12 6v15" stroke="#1e1610" stroke-width="1.1" opacity=".6"/></svg>',
    respect: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="11" y="3" width="2.4" height="18" rx="1"/><path d="M13.4 5c3 .4 5 1.6 6 3.6-2.4-.6-4.4-.6-6 .2zM13.4 10c2.6.4 4.4 1.4 5.4 3.2-2.1-.5-3.9-.5-5.4.2z" opacity=".8"/><circle cx="12.2" cy="3.2" r="1.6"/></svg>',
    colony: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l9-6 9 6v9H3z" opacity=".85"/><rect x="10" y="14" width="4" height="6" fill="#1e1610" opacity=".7"/><rect x="16" y="4" width="2.4" height="5"/></svg>',
    council: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="2.4"/><circle cx="5.5" cy="10" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M7.5 21c0-3.6 2-6.2 4.5-6.2s4.5 2.6 4.5 6.2zM2 21c0-3 1.4-5.2 3.5-5.2 1 0 1.9.5 2.5 1.3-.9 1.1-1.5 2.4-1.7 3.9zM22 21c0-3-1.4-5.2-3.5-5.2-1 0-1.9.5-2.5 1.3.9 1.1 1.5 2.4 1.7 3.9z" opacity=".85"/></svg>',
    leanings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="7" cy="17" r="2" fill="currentColor"/></svg>',
    nature: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l5 8h-3l4 6h-4v6h-4v-6H6l4-6H7z"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/></svg>',
    fastest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 7l6 5-6 5zM6 7l6 5-6 5zM12 7l6 5-6 5zM18 7l6 5-6 5z"/></svg>',
  });

  function relLabel(col) {
    if (col.war) return 'At war';
    const r = col.relations;
    return r > 45 ? 'Friendly' : r > 15 ? 'At ease' : r > -15 ? 'Wary' : r > -45 ? 'Tense' : 'Hostile';
  }
  TM.relLabel = relLabel;

  // a small portrait drawn with the same figure code, cached per person
  const portraits = new Map();
  function portrait(p, season, goods) {
    const key = p.id + '|' + season + '|' + (goods > (p.look.adopt || 2) * 0.9 ? 1 : 0);
    if (portraits.has(key)) return portraits.get(key);
    const c = document.createElement('canvas');
    const S = 2;
    c.width = 64 * S; c.height = 64 * S;
    const ctx = c.getContext('2d');
    ctx.scale(S, S);
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, '#3a2c20'); g.addColorStop(1, '#1e1610');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const fake = Object.assign({}, p, { anim: 'stand', dir: 1, wp: 0, animT: 0, carry: null, tool: null, look: Object.assign({}, p.look, { h: 1 }) });
    TM.Figures.drawPerson(ctx, fake, 30, 128, 4.6, { season, goods, infant: false });
    const url = c.toDataURL();
    portraits.set(key, url);
    if (portraits.size > 300) portraits.delete(portraits.keys().next().value);
    return url;
  }
  TM.portrait = portrait;

  const P = TM.UI.prototype;

  // ---------------------------------------------------------------- council debate
  P.openDebate = function (is, onDone) {
    const sim = this.sim, cul = sim.culture;
    const db = cul.openDebate(is);
    const s = sim.c.season, goods = cul.integ.goods;
    const render = (result) => {
      if (result) {
        const won = result.winner;
        return `<div class="band"></div><p class="eyebrow">The council has spoken</p><h2>${esc(result.title)}</h2>
          <div class="verdict"><span class="letter">${LETTER[won]}</span><div><b>${esc(result.label)}</b><p>${esc(result.desc)}</p>
          <div class="chips">${result.hints.map((h) => `<span class="chip ${/^\+/.test(h) ? 'good' : /^−/.test(h) ? 'bad' : ''}">${esc(h)}</span>`).join('')}</div></div></div>
          <p class="note">${result.pick === won && cul.debate === null && result.spoke ? 'Your words carried the council.' : result.pick >= 0 && result.pick !== won && result.spoke ? 'You spoke, but the council chose otherwise.' : 'You let the council decide.'}</p>
          <div class="modal-actions"><button class="btn primary" data-m="close">Continue</button></div>`;
      }
      const opts = is.options.map((o, i) => {
        const votes = db.tally[i];
        const voters = db.members.filter((d) => d.vote === i).length;
        return `<button class="option ${db.pick === i ? 'picked' : ''} ${db.winner === i ? 'leading' : ''}" data-m="pick" data-i="${i}">
          <span class="letter">${LETTER[i]}</span>
          <span class="opt-body"><b>${esc(o.label)}</b><span class="opt-desc">${esc(o.desc)}</span>
          <span class="chips">${o.hints.map((h) => `<span class="chip ${/^\+/.test(h) ? 'good' : /^−/.test(h) ? 'bad' : ''}">${esc(h)}</span>`).join('')}</span></span>
          <span class="votes"><b>${voters}</b><span>${voters === 1 ? 'voice' : 'voices'}</span><span class="vbar"><i style="width:${Math.round((votes / Math.max(1, db.tally.reduce((a, b) => a + b, 0))) * 100)}%"></i></span></span>
        </button>`;
      }).join('');
      const members = db.members.map((d) => {
        const arch = TM.ARCHETYPES[d.m.arch];
        const moved = d.vote !== d.initial;
        return `<div class="member ${moved ? 'moved' : ''}"><img src="${portrait(d.p, s, goods)}" alt=""><div><b>${esc(d.p.name)}</b><span>${esc(d.p.title || '')}</span><em>${esc(arch.label)}</em></div><span class="mvote" title="Leaning toward option ${LETTER[d.vote]}">${LETTER[d.vote]}</span></div>`;
      }).join('');
      const maxS = Math.min(3, Math.floor(cul.respect / TM.SPEAK_COST));
      const steps = [[0, 'Stay silent'], [1, 'Speak'], [2, 'Speak firmly'], [3, 'Speak with all your weight']];
      const voice = steps.map(([v, l]) => `<button class="${db.strength === v ? 'on' : ''}" data-m="strength" data-v="${v}" ${v > maxS || (v > 0 && db.pick < 0) ? 'disabled' : ''}>${l}${v ? ` <small>${v * TM.SPEAK_COST}</small>` : ''}</button>`).join('');
      return `<div class="band"></div>
        <p class="eyebrow">The council meets · ${TM.MOONS[sim.c.season][sim.c.moon]}, year ${sim.c.year}</p>
        <h2>${esc(is.title)}</h2><p>${esc(db.text)}</p>
        <div class="members">${members}</div>
        <h4 class="mh">Choose what you will speak for</h4>
        <div class="options">${opts}</div>
        <div class="voice"><span class="label">${I.respect} Respect ${Math.floor(cul.respect)}</span><div class="seg">${voice}</div></div>
        <p class="note">${db.pick < 0 ? 'Pick an option to speak for, or let the council decide on its own.' : `If the vote were held now, the council would choose <b>${LETTER[db.winner]}</b>.`}</p>
        <div class="modal-actions"><button class="btn" data-m="decide">Let the council decide</button><button class="btn primary" data-m="speak" ${db.pick < 0 ? 'disabled' : ''}>Speak and call the vote</button></div>`;
    };
    let result = null;
    const m = TM.Modal.open(render(), {
      wide: true, dismiss: false,
      onClose: () => {
        // a debate never stays open: if the dialog goes away, the council decides by itself
        if (!result && cul.debate) { result = cul.resolveDebate(); result.spoke = false; }
        if (onDone) onDone(result);
      },
      actions: {
        pick: (close, el) => { const i = +el.dataset.i; cul.setVoice(i === db.pick ? -1 : i, i === db.pick ? 0 : Math.max(db.strength, Math.min(1, Math.floor(cul.respect / TM.SPEAK_COST)))); refresh(); },
        strength: (close, el) => { cul.setVoice(db.pick, +el.dataset.v); refresh(); },
        decide: () => { cul.setVoice(-1, 0); result = cul.resolveDebate(); result.spoke = false; refresh(result); },
        speak: () => { const spoke = db.strength > 0; result = cul.resolveDebate(); result.spoke = spoke; refresh(result); },
        close: (close) => close(),
      },
    });
    const refresh = (r) => { m.el.querySelector('.modal').innerHTML = render(r); };
  };

  // ---------------------------------------------------------------- panels
  P.councilHTML = function () {
    const sim = this.sim, cul = sim.culture, s = sim.c.season, goods = cul.integ.goods;
    const daysToCouncil = (TM.C.DAYS_PER_MOON - sim.c.dom + 1) % TM.C.DAYS_PER_MOON || TM.C.DAYS_PER_MOON;
    const members = cul.council.map((m) => {
      const p = sim.byId.get(m.id);
      if (!p) return '';
      const arch = TM.ARCHETYPES[m.arch];
      const tilt = m.t.trad > 0.75 ? 'Holds hard to the old ways' : m.t.open > 0.75 ? 'Welcomes the newcomers' : m.t.war > 0.8 ? 'Ready to fight' : m.t.caution > 0.7 ? 'Careful and patient' : 'Weighs each matter';
      return `<button class="link member-row" data-act="person" data-id="${p.id}"><img src="${portrait(p, s, goods)}" alt=""><span><b>${esc(p.name)}</b><br><span class="sub">${esc(p.title)} · ${esc(arch.label)}</span><br><span class="sub">${tilt}${m.agree ? ` · ${m.agree > 0 ? 'agreed with the council ' + m.agree : 'outvoted ' + -m.agree} times` : ''}</span></span></button>`;
    }).join('');
    const dec = cul.decisions.slice(-8).reverse().map((d) => `<div class="decision"><span class="when">Year ${d.cal.year}, ${TM.MOONS[d.cal.season][d.cal.moon]}</span><b>${esc(d.title)}</b>: ${esc(d.choice)}${d.yours ? ' <span class="chip good">your voice</span>' : ''}</div>`).join('');
    return `<h3>The Council</h3><p class="meaning">You hold ${Math.floor(cul.respect)} Respect</p>
      <p>The council meets on the first day of every moon${daysToCouncil === TM.C.DAYS_PER_MOON ? ', today' : `, next in ${daysToCouncil} ${daysToCouncil === 1 ? 'day' : 'days'}`}. Urgent matters are taken up at once. Each member votes by their own convictions. Your Respect lets you sway them.</p>
      <h4>Members</h4><div class="list">${members}</div>
      ${dec ? `<h4>Recent decisions</h4>${dec}` : ''}`;
  };

  P.leaningsHTML = function () {
    const sim = this.sim, cul = sim.culture, col = sim.colony;
    const rows = TM.LEANINGS.map((L) => {
      const st = cul.lean[L.key];
      const locked = L.needs === 'rumors' && col.stage === 'none';
      const btns = L.opts.map(([v, label, desc]) => `<button class="lean-opt ${st.t === v ? 'on' : ''}" data-act="lean" data-k="${L.key}" data-v="${v}" ${locked || (st.t !== v && cul.respect < TM.LEAN_COST) ? 'disabled' : ''} title="${esc(desc)}"><b>${esc(label)}</b><span>${esc(desc)}</span></button>`).join('');
      const min = L.opts[0][0], max = L.opts[L.opts.length - 1][0];
      const pos = ((st.v - min) / (max - min)) * 100;
      return `<div class="lean"><div class="lean-head"><b>${esc(L.name)}</b>${Math.abs(st.v - st.t) > 0.05 ? '<span class="chip">the people are coming round</span>' : ''}</div>
        <div class="lean-track"><i style="left:${pos}%"></i></div>
        ${locked ? '<p class="note">No one has seen the newcomers yet.</p>' : `<div class="lean-opts">${btns}</div>`}</div>`;
    }).join('');
    return `<h3>Leanings</h3><p class="meaning">How the people tend to live and choose</p>
      <p>You cannot order the people, but you can speak to them about what matters. Changing a leaning costs <b>${TM.LEAN_COST} Respect</b>, and the people come round over several days. Unity makes them come round faster.</p>
      <p class="note">You have ${Math.floor(cul.respect)} Respect.</p>${rows}`;
  };

  P.cultureHTML = function () {
    const sim = this.sim, cul = sim.culture, t = cul.trad, i = cul.integ;
    const T = cul.T(), Ig = cul.I();
    const word = T > 0.8 ? 'Strong' : T > 0.6 ? 'Holding' : T > 0.4 ? 'Weakening' : 'Fading';
    const hist = cul.history.slice(-48);
    const spark = (vals, col) => {
      if (vals.length < 2) return '';
      const w = 280, h = 34, mx = 1, mn = 0;
      const pts = vals.map((v, k) => `${((k / (vals.length - 1)) * w).toFixed(1)},${(h - ((v - mn) / (mx - mn)) * (h - 2) - 1).toFixed(1)}`).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`;
    };
    const next = cul.nextGathering(48);
    const sparkSVG = hist.length > 1 ? `<svg width="100%" viewBox="0 0 280 34" style="display:block;margin:.4rem 0">${spark(hist.map((h) => h.T), '#d69c48')}${spark(hist.map((h) => h.I), '#86a8b8')}</svg><p class="note">Gold: tradition. Blue: the newcomers’ ways. Last ${hist.length} days.</p>` : '';
    return `<h3>Traditions</h3><p class="meaning">${word} · ${pct(T)}</p>
      <div class="kv"><span class="k">Language</span>${bar(t.language)}<span class="v">${pct(t.language)}</span>
      <span class="k">Gatherings</span>${bar(t.gatherings)}<span class="v">${pct(t.gatherings)}</span>
      <span class="k">Crafts and knowledge</span>${bar(t.crafts)}<span class="v">${pct(t.crafts)}</span>
      <span class="k">Our land</span>${bar(t.land)}<span class="v">${pct(t.land)}</span>
      <span class="k">Unity</span>${bar(cul.unity)}<span class="v">${pct(cul.unity)}</span></div>
      ${sparkSVG}
      <h4>The newcomers’ ways · ${pct(Ig)}</h4>
      <div class="kv"><span class="k">Trade goods in use</span>${bar(i.goods, true)}<span class="v">${pct(i.goods)}</span>
      <span class="k">Dependence on trade</span>${bar(i.trade, true)}<span class="v">${pct(i.trade)}</span>
      <span class="k">Their words and beliefs</span>${bar(i.ways, true)}<span class="v">${pct(i.ways)}</span></div>
      <h4>What keeps the old ways strong</h4>
      <p>Elders telling stories to the young keeps the <b>language</b> alive. Seasonal <b>gatherings</b> bind the people together. Making our own pots, mats, tools and buckskin keeps <b>crafts and knowledge</b> in our hands. The <b>land</b> feeds us and holds our history.</p>
      <p>Iron kettles and guns make work easier while trade flows. But each one replaces a skill, and when trade stops, the people who have forgotten are left with nothing.</p>
      ${next ? `<p class="note">Next gathering: ${esc(next.name)}.</p>` : ''}`;
  };

  P.natureHTML = function () {
    const sim = this.sim, nat = sim.nature, s = sim.c.season;
    const arrow = (sp) => { const t = nat.trend(sp); return t > 0 ? '<span class="up">▲</span>' : t < 0 ? '<span class="down">▼</span>' : ''; };
    const animals = Object.keys(TM.SPECIES).map((sp) => {
      const S = TM.SPECIES[sp];
      const away = (S.seasons && !S.seasons.includes(s)) ? ' · away this season' : S.sleeps && s === 3 ? ' · sleeping in its den' : '';
      return `<button class="link" data-act="species" data-sp="${sp}"><span>${esc(S.name)}${away}</span><span class="abund">${bar(nat.pop[sp] / 1.1)}${arrow(sp)}</span></button>`;
    }).join('') + `<button class="link" data-act="species" data-sp="fish"><span>${esc(TM.FISH.name)}</span><span class="abund">${bar(nat.pop.fish / 1.1)}${arrow('fish')}</span></button>`;
    const inSeason = Object.keys(TM.BLOOM).filter((k) => TM.BLOOM[k].includes(s) && TM.PLANTS[k]);
    const extra = [['strawberry', 1], ['raspberry', 1], ['chokecherry', 1], ['elderberry', 1], ['wildrice', 2], ['maple', 0], ['hickory', 2], ['walnut', 2], ['oak', 2], ['plum', 0], ['sunflower', 2], ['cattail', 0]].filter(([, q]) => q === s).map(([k]) => k);
    const plants = [...new Set(inSeason.concat(extra))].map((k) => `<button class="link" data-act="plant" data-sp="${k}"><span>${esc(TM.PLANTS[k].name)}</span><span class="sub">${TM.BLOOM[k] && TM.BLOOM[k].includes(s) ? 'in flower' : 'ready to gather'}</span></button>`).join('');
    return `<h3>Land and Life</h3><p class="meaning">${TM.SEASONS[s]} · the animals and plants we live among</p>
      <p>Hunting, trapping for furs and the clearing of the forest all thin the animals. Left in peace, they return. Click any animal or plant in the world to learn about it.</p>
      <h4>Animals</h4><div class="list">${animals}</div>
      <h4>In season now</h4><div class="list">${plants || '<p class="note">Little grows in the cold moons.</p>'}</div>`;
  };

  P.speciesHTML = function (sp) {
    const nat = this.sim.nature;
    if (sp === 'fish') return `<h3>${esc(TM.FISH.name)}</h3><p>${esc(TM.FISH.text)}</p><h4>Uses</h4><p>${esc(TM.FISH.uses)}</p><div class="kv"><span class="k">Abundance</span>${bar(nat.pop.fish / 1.1)}<span class="v">${pct(nat.pop.fish)}</span></div>`;
    const S = TM.SPECIES[sp];
    if (!S) return '';
    const b = nat.pop[sp] || 0;
    const word = b > 0.8 ? 'Plentiful' : b > 0.5 ? 'Thinning' : b > 0.2 ? 'Scarce' : 'Nearly gone';
    return `<h3>${esc(S.name)}</h3><p class="meaning">${word}</p><p>${esc(S.text)}</p><h4>What it gives the people</h4><p>${esc(S.uses)}</p>
      <div class="kv"><span class="k">Abundance</span>${bar(b / 1.1)}<span class="v">${pct(b)}</span></div>
      ${S.pelt ? '<p class="note">The traders want its fur. Trapping for trade thins it quickly.</p>' : ''}`;
  };
  P.plantHTML = function (k) {
    const Pl = TM.PLANTS[k];
    if (!Pl) return '';
    const bloom = TM.BLOOM[k];
    return `<h3>${esc(Pl.name)}</h3><p class="meaning">${bloom ? 'Flowers in ' + bloom.map((s) => TM.SEASONS[s].toLowerCase()).join(' and ') : 'Plant'}</p><p>${esc(Pl.text)}</p><h4>What it gives the people</h4><p>${esc(Pl.uses)}</p>`;
  };
  P.animalHTML = function (a) {
    if (a.sp === 'cattle' || a.sp === 'pig' || a.sp === 'horse') {
      const name = { cattle: 'Cattle', pig: 'Hogs', horse: 'Horse' }[a.sp];
      const text = {
        cattle: 'The newcomers’ cattle graze the cleared land around their colony and need fences and fodder through the winter.',
        pig: 'The newcomers let their hogs run loose in the woods. They root up acorns and nuts, and sometimes break into our fields.',
        horse: 'A large animal the newcomers ride and load with packs. No one here had ever seen one before they came.',
      }[a.sp];
      return `<h3>${name}</h3><p class="meaning">Brought by the newcomers</p><p>${text}</p>`;
    }
    return this.speciesHTML(a.sp);
  };
  P.settlerHTML = function (a) {
    const col = this.sim.colony;
    const role = { colonist: 'Settler', guard: 'Soldier on guard', soldier: 'Soldier', trader: 'Trader', teacher: 'Teacher' }[a.kind] || 'Newcomer';
    return `<h3>${esc(a.name)}</h3><p class="meaning">${role} of ${esc(col.name)}</p><div class="doing">${esc(a.label || 'Going about their work')}</div>
      <p>${{ trader: 'Carries kettles, knives, blankets, cloth and beads to trade for furs and hides.', soldier: 'Serves in the colony’s militia.', guard: 'Keeps watch at the gate of the fort.', teacher: 'Teaches letters, the newcomers’ tongue and their beliefs.' }[a.kind] || 'Came across the sea to farm the land.'}</p>`;
  };
  P.colonyHTML = function () {
    const col = this.sim.colony, cul = this.sim.culture;
    if (col.stage === 'none') return '<h3>The Newcomers</h3><p>No one has seen them yet. But the nations to the east tell strange stories.</p>';
    const stage = { rumors: 'Only rumors so far', traders: 'Traders come by river and trail', founded: 'A growing colony in the eastern woods', abandoned: 'Abandoned' }[col.stage];
    return `<h3>${col.founded ? esc(col.name) : 'The Newcomers'}</h3><p class="meaning">${stage}</p>
      <div class="kv"><span class="k">Relations</span><span></span><span class="v">${relLabel(col)}</span>
      ${col.founded ? `<span class="k">Settlers</span><span></span><span class="v">${Math.round(col.pop)}</span><span class="k">Land they have cleared</span>${bar(1 - cul.trad.land, true)}<span class="v">${col.claimed} plots</span>` : ''}
      <span class="k">Trade</span><span></span><span class="v">${col.closed() ? 'Closed' : ['None', 'Careful', 'Free'][col.tradeLevel]}</span>
      <span class="k">Visits so far</span><span></span><span class="v">${col.visits}</span>
      ${col.boundary !== Infinity ? `<span class="k">Agreed boundary</span><span></span><span class="v">${col.claimed >= col.boundary ? 'reached' : col.boundary - col.claimed + ' plots away'}</span>` : ''}</div>
      ${col.epidemicActive ? '<p class="note">A sickness from across the sea is among us.</p>' : ''}
      ${col.war ? '<p>There is war. Their soldiers may come at any time. Their farms burn when our warriors strike.</p>' : ''}
      <p class="note">The newcomers want land, furs and souls. They bring iron, cloth, guns, horses and sickness.</p>`;
  };

  // ---------------------------------------------------------------- the end of the story
  P.showEnding = function (e, onChoice) {
    const sim = this.sim, end = TM.ENDINGS[e.id];
    const html = `<div class="band"></div><p class="eyebrow">Year ${e.year}</p><h2 class="ending ${end.tone}">${esc(end.title)}</h2><p>${esc(end.text)}</p>
      <div class="kv ending-kv"><span class="k">Traditions</span>${bar(e.T)}<span class="v">${pct(e.T)}</span>
      <span class="k">Our land</span>${bar(e.land)}<span class="v">${pct(e.land)}</span>
      <span class="k">The newcomers’ ways</span>${bar(e.I, true)}<span class="v">${pct(e.I)}</span>
      <span class="k">People</span><span></span><span class="v">${e.pop}</span></div>
      <p class="note">The story of the ${esc(this.g.settings.nationName)} closes here. You may keep watching the seasons turn.</p>
      <div class="modal-actions"><button class="btn" data-m="menu">Return to the main menu</button><button class="btn primary" data-m="stay">Keep watching</button></div>`;
    void sim;
    TM.Modal.open(html, { wide: true, dismiss: false, actions: { menu: (c) => { c(); onChoice('menu'); }, stay: (c) => { c(); onChoice('stay'); } } });
  };
})();
