// =====================================================================
// UI: Eingabe, Untertitel, Objectives, Kontostand, Prompts, Auswahl/Ungesagt, Titelkarten, Handy, Notizbuch, Einstellungen
// =====================================================================
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'focus', ShiftRight: 'focus', KeyE: 'use', Space: 'confirm', Enter: 'confirm', Escape: 'pause', Tab: 'objective', Digit1: 'n1', Digit2: 'n2', Digit3: 'n3', Digit4: 'n4', Numpad1: 'n1', Numpad2: 'n2', Numpad3: 'n3', Numpad4: 'n4' };

const Input = {
  down: {}, edge: {}, mx: 0, my: 0, dx: 0, dy: 0, stick: { x: 0, y: 0 }, locked: false, drag: false, virt: {}, canLock: false, holdConfirm: 0,
  init() {
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (['confirm', 'up', 'down', 'left', 'right', 'objective', 'focus'].includes(a) && !(e.target && e.target.tagName === 'INPUT')) e.preventDefault();
      if (!this.down[a]) this.edge[a] = true;
      this.down[a] = true;
    });
    window.addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (a) this.down[a] = false; });
    window.addEventListener('blur', () => { this.down = {}; this.virt = {}; });
    const cv = $('#gl');
    cv.addEventListener('mousedown', (e) => {
      this.edge.click = true; this.drag = true;
      if (this.canLock && !this.locked && cv.requestPointerLock && G.mode === 'play' && !G.paused) { try { cv.requestPointerLock(); } catch (err) { /* egal */ } }
    });
    window.addEventListener('mouseup', () => { this.drag = false; });
    window.addEventListener('mousemove', (e) => {
      if (this.locked) { this.dx += e.movementX; this.dy += e.movementY; this.mx = clamp(this.mx + e.movementX / (window.innerWidth * 0.5), -1, 1); this.my = clamp(this.my + e.movementY / (window.innerHeight * 0.5), -1, 1); }
      else { this.mx = (e.clientX / window.innerWidth) * 2 - 1; this.my = (e.clientY / window.innerHeight) * 2 - 1; if (this.drag) { this.dx += e.movementX; this.dy += e.movementY; } }
    });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === cv;
      if (was && !this.locked && (G.mode === 'play' || G.mode === 'cine') && !G.paused && !G.noPauseOnUnlock) Notebook.open();
    });
  },
  key(a) { return !!(this.down[a] || this.virt[a]); },
  pressed(a) { return !!this.edge[a]; },
  confirm() { return !!(this.edge.confirm || this.edge.click || this.edge.vconfirm); },
  axis() {
    let x = (this.key('right') ? 1 : 0) - (this.key('left') ? 1 : 0), y = (this.key('up') ? 1 : 0) - (this.key('down') ? 1 : 0);
    x += this.stick.x; y += this.stick.y;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  },
  endFrame() { this.edge = {}; this.dx = 0; this.dy = 0; },
  releaseLock() { if (document.pointerLockElement && document.exitPointerLock) { G.noPauseOnUnlock = true; document.exitPointerLock(); setTimeout(() => { G.noPauseOnUnlock = false; }, 100); } },
};

// ---------- Untertitel ----------
const Sub = {
  el: null, cur: null,
  init() { this.el = $('#subs'); },
  async show(text, o = {}) {
    if (G.skipping) return;
    this.clear(true);
    const div = h('div', 'sub ' + (o.style || o.who || 'inner'));
    div.innerHTML = (o.name ? `<span class="who">${o.name}</span>` : '') + text;
    this.el.appendChild(div);
    void div.offsetWidth; div.classList.add('on');
    this.cur = div; $('#hud').classList.add('subs-on');
    const plain = text.replace(/<[^>]+>/g, '');
    const dur = o.dur != null ? o.dur : clamp(1.0 + plain.length * 0.052, 1.8, 9);
    if (o.who === 'say' && o.name && G.world) { const ch = G.world.chars.find((c) => c.name && c.name.startsWith(o.name)); if (ch) ch.talk = Math.max(0.4, dur - 0.5); }   // Lippen bewegen
    await sleep(dur);
    if (o.confirm) { await sleep(0.3); await until(() => Input.confirm()); }
    if (!o.keep) this.fade(div);
  },
  fade(div) { if (!div) return; div.classList.remove('on'); setTimeout(() => div.remove(), 900); if (this.cur === div) { this.cur = null; setTimeout(() => { if (!this.cur) $('#hud').classList.remove('subs-on'); }, 250); } },
  clear(soft) { if (this.cur) { if (soft) this.fade(this.cur); else { this.cur.remove(); this.cur = null; } } if (!soft) { this.el.innerHTML = ''; $('#hud').classList.remove('subs-on'); } },
  inner(t, o) { return this.show(t, Object.assign({ who: 'inner' }, o)); },
  say(name, t, o) { return this.show(t, Object.assign({ who: 'say', name }, o)); },
  nour(t, o) { return this.show(t, Object.assign({ who: 'nour' }, o)); },
  sys(t, o) { return this.show(t, Object.assign({ who: 'sys' }, o)); },
};

// ---------- Missionsziel wie ein Filmuntertitel ----------
const Obj = {
  text: '', t: null,
  set(text, o = {}) {
    this.text = text;
    const el = $('#objective');
    if (!text) { el.classList.remove('on'); return; }
    if (o.quiet) return;
    this.show(o.dur || 7);
  },
  show(sec = 6) {
    const el = $('#objective');
    if (!this.text) return;
    el.textContent = this.text; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(this.t); this.t = setTimeout(() => el.classList.remove('on'), sec * 1000);
  },
};

// ---------- Kontostand: erscheint nur, wenn sich etwas ändert ----------
const Bal = {
  shown: 23.17, t: null,
  render(v) { $('#balance .amt').textContent = fmtEuro(v); },
  async show(newVal, { delta = null, hold = 3.6, ritual = false } = {}) {
    const el = $('#balance');
    const from = this.shown, to = newVal;
    clearTimeout(this.t);
    if (delta != null) $('#balance .delta').textContent = fmtEuro(delta, true);
    this.render(from);
    el.classList.add('on'); el.classList.toggle('pop', delta != null);
    if (to !== from && !G.skipping) {
      let last = -1;
      await tween((e) => { this.shown = lerp(from, to, e); this.render(this.shown); const k = Math.floor(e * 12); if (k !== last) { last = k; Snd.countTick(k); } }, null, ritual ? 2.6 : 1.6, 'outCubic');
    }
    this.shown = to; this.render(to); G.state.money = to;
    this.t = setTimeout(() => { el.classList.remove('on', 'pop'); }, hold * 1000);
  },
  peek(sec = 3) { const el = $('#balance'); this.render(this.shown); el.classList.add('on'); el.classList.remove('pop'); clearTimeout(this.t); this.t = setTimeout(() => el.classList.remove('on'), sec * 1000); },
};

// ---------- Interaktions-Prompt (an Weltposition geheftet) ----------
const _pv3 = new THREE.Vector3();
const Prompt = {
  el: null, lbl: null, on: false,
  init() { this.el = $('#prompt'); this.lbl = this.el.querySelector('.lbl'); },
  set(worldPos, label, camera) {
    if (!worldPos) { if (this.on) { this.el.classList.remove('on'); this.on = false; } return; }
    _pv3.copy(worldPos).project(camera);
    const x = (_pv3.x * 0.5 + 0.5) * window.innerWidth, y = (-_pv3.y * 0.5 + 0.5) * window.innerHeight;
    if (_pv3.z > 1 || x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) { this.set(null); return; }
    if (this.lbl.textContent !== label) this.lbl.textContent = label;
    this.el.style.transform = `translate(${Math.round(x + 22)}px, ${Math.round(y - 15)}px)`;
    if (!this.on) { this.el.classList.add('on'); this.on = true; }
  },
};

// ---------- Texte über dem Bild, Hinweise, Zeitstempel ----------
const Ov = {
  async show(html, { gold = false, dur = 3.5 } = {}) {
    if (G.skipping) return;
    const e = $('#overlay-text .ov'); e.className = 'ov' + (gold ? ' gold' : ''); e.innerHTML = html;
    void e.offsetWidth; e.classList.add('on');
    await sleep(dur); e.classList.remove('on'); await sleep(0.8);
  },
};
const Hint = {
  t: null,
  show(html, sec = 7) { const e = $('#hint'); e.innerHTML = html; e.classList.add('on'); clearTimeout(this.t); this.t = setTimeout(() => e.classList.remove('on'), sec * 1000); },
  hide() { $('#hint').classList.remove('on'); },
};
const Stamp = {
  async show(text, { x = '5vw', y = '6vh', sec = 4 } = {}) {
    if (G.skipping) return;
    const e = h('div', 'stamp', text); e.style.left = x; e.style.top = `calc(var(--bar) + ${y})`; $('#hud').appendChild(e);
    void e.offsetWidth; e.classList.add('on');
    setTimeout(() => { e.classList.remove('on'); setTimeout(() => e.remove(), 1100); }, sec * 1000);
  },
};

// ---------- Auswahl / Ungesagt ----------
const Choice = {
  // options: [{text, unsaid?:bool, unlocked?:bool, key?}]  -> index der gewählten (nur wählbare)
  async pick(options, o = {}) {
    if (G.skipping) { const i = options.findIndex((x) => !x.unsaid); return Math.max(0, i); }
    const box = $('#choices'); box.innerHTML = '';
    const items = options.map((opt, i) => {
      const d = h('div', 'choice' + (opt.unsaid ? ' unsaid' : '') + (opt.unlocked ? ' unlocked' : ''));
      d.innerHTML = (o.numbers ? `<span class="k">${i + 1}</span>` : '') + opt.text;
      d.style.animationDelay = (o.stagger === false ? 0 : i * 0.18) + 's';
      box.appendChild(d); return d;
    });
    let sel = Math.max(0, options.findIndex((x) => !x.unsaid));
    const mark = () => items.forEach((d, i) => d.classList.toggle('sel', i === sel));
    mark();
    let result = -1;
    const tryPick = (i) => {
      if (options[i].unsaid) { items[i].classList.remove('shake'); void items[i].offsetWidth; items[i].classList.add('shake'); Snd.deny(); Snd.heartSet(null, 0.7); return; }
      result = i; Snd.uiClick();
    };
    items.forEach((d, i) => { d.addEventListener('mouseenter', () => { sel = i; mark(); Snd.uiHover(); }); d.addEventListener('click', () => tryPick(i)); });
    await sleep(o.delay != null ? o.delay : 0.5);
    await until(() => {
      if (Input.pressed('up') && sel > 0) { sel--; mark(); Snd.uiHover(); }
      if (Input.pressed('down') && sel < options.length - 1) { sel++; mark(); Snd.uiHover(); }
      for (let i = 0; i < 4; i++) if (Input.pressed('n' + (i + 1)) && i < options.length) { sel = i; mark(); tryPick(i); }
      if (Input.pressed('confirm') && result < 0) tryPick(sel);
      return result >= 0;
    });
    items.forEach((d, i) => { if (i !== result) d.style.opacity = 0; d.style.transition = 'opacity .5s'; });
    await sleep(0.45);
    box.innerHTML = '';
    return result;
  },
  // Das Ungesagte: sagbar ist nur eine Zeile, die anderen sind verblasst und durchgestrichen (im Finale wählbar)
  async unsaid(say, unsaid, o = {}) {
    const opts = [...unsaid.map((t) => ({ text: t, unsaid: !o.unlock, unlocked: !!o.unlock })), { text: say }];
    // gesagte Zeile zuerst (unten), Ungesagtes darüber
    const idx = await this.pick(opts, { stagger: true, delay: 0.9 });
    return idx === opts.length - 1 ? -1 : idx;
  },
};

// ---------- Titelkarte ----------
const Title = {
  async show({ num = '', title = '', line = '', big = false, note = true }) {
    const el = $('#titlecard');
    el.className = big ? 'big' : '';
    el.innerHTML = `<div class="in">${num ? `<div class="num">${num}</div>` : ''}<div class="ttl">${title}</div><div class="ln"></div><div class="snt">${line}</div></div>`;
    void el.offsetWidth; el.classList.add('on');
    if (note) Snd.titleNote(146.83);
    await sleep(1.0);
  },
  async hide() { $('#titlecard').classList.remove('on'); await sleep(1.1); },
  async card(o, hold = 5) { await this.show(o); await sleep(hold); await this.hide(); },
  set(html) { $('#titlecard').innerHTML = html; },
  black(on) { const el = $('#titlecard'); el.className = ''; el.innerHTML = ''; el.classList.toggle('on', on); },
};

// ---------- Handy ----------
const PHONE_ICON = { acc: '<svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>', dec: '<svg viewBox="0 0 24 24" style="transform:rotate(135deg)"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>' };
const Phone = {
  el: null,
  init() { this.el = $('#phone'); },
  clock() { return G.state.clock || '03:47'; },
  open(html, { mid = false } = {}) {
    this.el.innerHTML = `<div class="ph-in"><div class="ph-st"><span>${this.clock()}</span><span class="isl"></span><span>▂▄▆ 41%</span></div>${html}</div>`;
    this.el.classList.toggle('mid', mid); void this.el.offsetWidth; this.el.classList.add('on');
  },
  hide() { this.el.classList.remove('on'); },
  bank(balance, { mid = false, items = null } = {}) {
    const rows = (items || [{ t: 'Miete · Offen', v: '−480,00 €', warn: 1 }, { t: '2. Mahnung · Strom', v: '−96,40 €', warn: 1 }, { t: 'Rundfunk', v: '−55,08 €', warn: 1 }]).map((r) => `<div class="ph-item${r.warn ? ' warn' : ''}"><span>${r.t}</span><b>${r.v}</b></div>`).join('');
    this.open(`<div class="ph-h">Kontostand</div><div class="ph-big">${fmtEuro(balance)}</div><div class="ph-sm">Verfügbar</div><div class="ph-list">${rows}</div>`, { mid });
  },
  msgs(who, list, { mid = false } = {}) {
    this.open(`<div class="ph-who">${who}</div><div class="ph-msgs">${list.map((m, i) => `<div class="ph-bub${m.me ? ' me' : ''}" style="animation-delay:${i * 0.35}s">${m.t}</div>`).join('')}</div>`, { mid });
  },
  // Anruf: der Spieler WILL annehmen (E) – Mirzas Daumen drückt trotzdem weg. Der Weg ist vorbestimmt.
  async incoming({ name = 'Mama ❤️', initial = 'M', status = 'Anruf', decline = 'Nicht jetzt.', wait = 9, buzz = true } = {}) {
    if (G.skipping) return 'declined';
    this.open(`<div class="ph-call" style="flex:1;display:flex;flex-direction:column"><div class="ph-av">${initial}</div><div class="nm">${name}</div><div class="st">${status}</div><div style="flex:1"></div><div class="ph-btns"><div class="ph-btn dec">${PHONE_ICON.dec}</div><div class="ph-btn acc">${PHONE_ICON.acc}</div></div><div class="ph-sm" style="margin-top:14px;text-align:center;opacity:.6">E — Annehmen</div></div>`);
    if (buzz) Snd.phoneBuzz(undefined, 3);
    let t = 0;
    const done = await until(() => { t += G.dt; if (buzz && Math.floor(t / 1.6) !== Math.floor((t - G.dt) / 1.6) && t < wait) Snd.phoneBuzz(undefined, 2); return Input.pressed('use') || Input.pressed('confirm'); }, wait);
    if (done) {
      const acc = this.el.querySelector('.ph-btn.acc'); if (acc) acc.classList.add('nudge');
      Snd.heartSet(null, 0.9);
      await sleep(0.55);
      this.el.querySelector('.st').textContent = 'Abgelehnt';
      Snd.deny();
      if (decline) Sub.inner(decline);
    }
    await sleep(1.1); this.hide(); await sleep(0.5);
    return 'declined';
  },
  toast(who, msg, sec = 4) {
    if (G.skipping) return;
    const t = $('#toast'); t.innerHTML = `<div class="w">${who}</div><div class="m">${msg}</div>`;
    t.classList.add('on'); Snd.notify(); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('on'), sec * 1000);
  },
};

// ---------- Notizbuch-Seite im Bild (handgeschriebene Zeilen, Stift-Geräusch) ----------
const NoteCard = {
  el: null,
  init() { this.el = $('#notecard'); },
  // lines: Strings; opts.speed = Sekunden pro Zeile
  async show(lines, o = {}) {
    if (G.skipping) return;
    const box = this.el;
    box.innerHTML = `<div class="paper">${lines.map((l, i) => `<div class="ln" data-i="${i}"><span>${l}</span></div>`).join('')}</div>`;
    void box.offsetWidth; box.classList.add('on');
    await sleep(0.9);
    const lns = $$('.ln', box);
    for (let i = 0; i < lns.length; i++) {
      const d = o.speed || Math.max(0.8, lns[i].textContent.length * 0.055);
      lns[i].style.setProperty('--d', d + 's'); lns[i].classList.add('w');
      Snd.pen(d + 0.2);
      await sleep(d + 0.25);
    }
  },
  strike(i) { const l = $('.ln[data-i="' + i + '"]', this.el); if (l) l.classList.add('x'); },
  async hide() { this.el.classList.remove('on'); await sleep(0.8); },
};

// ---------- Ziele / Notizbuch ----------
const GOAL_DEFS = [
  { id: 'mama', text: 'Mama nie wieder nachts putzen lassen.' },
  { id: 'ten', text: 'Die ersten 10k.' },
  { id: 'maybach', text: 'Maybach.' },
  { id: 'school', text: 'Berufsschule durchziehen. (Versprochen.)' },
  { id: 'hurt', text: 'Niemandem zeigen, dass es wehtut.' },
];
const Goals = {
  st: { mama: 'long', ten: 'todo', maybach: 'todo', school: 'todo', hurt: 'todo' },
  set(map) { Object.assign(this.st, map); G.state.goals = this.st; },
};

const Notebook = {
  shown: false, view: 'main',
  init() {
    const el = $('#notebook');
    el.innerHTML = `<div class="nb"><div class="pg l"><h3>Ziele <small id="nb-sub"></small></h3><ul class="goals"></ul></div><div class="pg r"></div></div>`;
    el.addEventListener('click', (e) => { if (e.target === el) this.close(); });
  },
  render() {
    const ul = $('#notebook .goals');
    ul.innerHTML = GOAL_DEFS.map((g) => { const s = Goals.st[g.id]; return `<li class="${s === 'done' ? 'done' : s === 'cur' ? 'cur' : s === 'long' ? 'warn' : ''}"><span class="ink">${g.text}</span></li>`; }).join('');
    $('#nb-sub').textContent = G.chapterLabel || '';
    this.right('main');
  },
  right(view) {
    this.view = view;
    const r = $('#notebook .pg.r');
    if (view === 'main') {
      const cur = Obj.text ? `<div class="note">Jetzt: ${Obj.text}</div>` : '';
      r.innerHTML = `<h3>Weiter?</h3><div class="menu-r"><button data-a="resume">Weiter</button><button data-a="settings">Einstellungen</button><button data-a="chapters">Kapitel</button><button data-a="menu">Hauptmenü</button></div>${cur}<div class="stampT">${G.state.clock || '03:47'}</div>`;
    } else if (view === 'settings') {
      r.innerHTML = `<h3>Einstellungen</h3><div class="set"></div><div class="menu-r"><button data-a="back">← zurück</button></div>`;
      buildSettings($('.set', r));
    } else if (view === 'confirm') {
      r.innerHTML = `<h3>Wirklich?</h3><div class="note">Der Fortschritt dieses Kapitels geht verloren.</div><div class="menu-r"><button data-a="menu-yes">Ja, ins Hauptmenü</button><button data-a="back">Nein</button></div>`;
    }
    $$('button[data-a]', r).forEach((b) => b.addEventListener('click', () => { Snd.uiClick(); this.act(b.dataset.a); }));
    $$('button', r).forEach((b) => b.addEventListener('mouseenter', () => Snd.uiHover()));
  },
  act(a) {
    if (a === 'resume') this.close();
    else if (a === 'settings') this.right('settings');
    else if (a === 'back') this.right('main');
    else if (a === 'chapters') { this.close(true); Panels.open('chapters'); }
    else if (a === 'menu') this.right('confirm');
    else if (a === 'menu-yes') { this.close(true); Game.toMenu(); }
  },
  open() {
    if (this.shown || G.mode === 'menu' || G.mode === 'start' || G.mode === 'boot') return;
    this.shown = true; G.paused = true; Input.releaseLock();
    this.render();
    const el = $('#notebook'); el.classList.remove('hidden'); void el.offsetWidth; el.classList.add('on');
    Snd.page(); Snd.worldFilter(1200, 0.4);
  },
  close(silent) {
    if (!this.shown) return;
    this.shown = false; G.paused = false;
    const el = $('#notebook'); el.classList.remove('on');
    setTimeout(() => { if (!this.shown) el.classList.add('hidden'); }, 600);
    if (!silent) Snd.page();
    Snd.worldFilter(G.focus > 0.3 ? 900 : 20000, 0.5);
  },
  toggle() { if (this.shown) this.close(); else this.open(); },
};

// ---------- Einstellungen ----------
function applySettings() {
  const s = G.settings;
  if (AUD) AUD.setVolumes(s.musicVol, s.sfxVol);
  document.documentElement.style.setProperty('--sub-scale', [0.85, 1, 1.25][s.subSize] || 1);
  Store.set('settings', s);
}
function buildSettings(box) {
  const s = G.settings;
  const slider = (id, label, val) => `<div class="row"><label>${label}</label><input type="range" min="0" max="1" step="0.01" value="${val}" data-k="${id}"></div>`;
  const seg = (id, label, opts, cur) => `<div class="row"><label>${label}</label><div class="seg" data-k="${id}">${opts.map(([v, t]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
  box.innerHTML = slider('musicVol', 'Musik', s.musicVol) + slider('sfxVol', 'Klang', s.sfxVol)
    + seg('quality', 'Grafik', [['auto', 'Auto'], ['high', 'Hoch'], ['mid', 'Mittel'], ['low', 'Niedrig']], s.quality)
    + seg('grain', 'Filmkorn', [[1, 'An'], [0, 'Aus']], s.grain ? 1 : 0)
    + seg('subSize', 'Untertitel', [[0, 'Klein'], [1, 'Mittel'], [2, 'Groß']], s.subSize);
  $$('input[type=range]', box).forEach((inp) => {
    const upd = () => { inp.style.setProperty('--p', inp.value * 100 + '%'); };
    upd();
    inp.addEventListener('input', () => { s[inp.dataset.k] = +inp.value; upd(); applySettings(); });
    inp.addEventListener('change', () => Snd.uiHover());
  });
  $$('.seg', box).forEach((sg) => {
    $$('button', sg).forEach((b) => b.addEventListener('click', () => {
      const k = sg.dataset.k; let v = b.dataset.v;
      $$('button', sg).forEach((x) => x.classList.toggle('on', x === b)); b.blur();
      Snd.uiClick();
      if (k === 'quality') { s.quality = v; GFX.setQuality(v); }
      else if (k === 'grain') s.grain = v === '1';
      else if (k === 'subSize') s.subSize = +v;
      applySettings();
    }));
  });
}

// ---------- Panels (Kapitel / Einstellungen im Hauptmenü) ----------
const Panels = {
  open(name) {
    this.closeAll();
    const el = $('#' + name); el.classList.remove('hidden'); void el.offsetWidth; el.classList.add('on');
    if (name === 'chapters') this.buildChapters();
    if (name === 'settings') buildSettings($('#settings .set'));
    this.cur = name;
  },
  closeAll() { $$('.panel').forEach((p) => { p.classList.remove('on'); p.classList.add('hidden'); }); this.cur = null; },
  buildChapters() {
    const box = $('#chapters .list');
    box.innerHTML = Story.chapters.map((c, i) => `<button class="chap${c.ready ? '' : ' soon'}" data-i="${i}"><div class="n">${c.num || '·'}</div><div class="t">${c.title}</div><div class="s">${c.ready ? c.line : 'Noch nicht geschrieben.'}</div></button>`).join('');
    $$('.chap', box).forEach((b) => { b.addEventListener('mouseenter', () => Snd.uiHover()); b.addEventListener('click', () => { const c = Story.chapters[+b.dataset.i]; if (!c.ready) { Snd.deny(); return; } Snd.uiClick(); Panels.closeAll(); Game.startChapter(+b.dataset.i); }); });
  },
};

// ---------- Touch ----------
const Touch = {
  on: false,
  init() {
    if (!(window.matchMedia && matchMedia('(pointer: coarse)').matches)) return;
    this.on = true;
    const el = $('#touch'); el.classList.remove('hidden');
    const stick = $('.stick', el), knob = $('i', stick);
    let id = null;
    const move = (e) => {
      const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let x = (e.clientX - cx) / (r.width / 2), y = (e.clientY - cy) / (r.height / 2);
      const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      Input.stick.x = Math.abs(x) < 0.12 ? 0 : x; Input.stick.y = Math.abs(y) < 0.12 ? 0 : -y;
      knob.style.transform = `translate(${x * 40}px, ${y * 40}px)`;
    };
    stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(id); move(e); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    const end = () => { id = null; Input.stick.x = 0; Input.stick.y = 0; knob.style.transform = ''; };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    const btn = (sel, down, up) => { const b = $(sel, el); b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('act'); down(); }); const u = () => { b.classList.remove('act'); if (up) up(); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('pointerleave', u); };
    btn('.tb.e', () => { Input.edge.use = true; }, null);
    btn('.tb.f', () => { Input.virt.focus = true; }, () => { Input.virt.focus = false; });
    btn('.tb.n', () => { Input.edge.confirm = true; Input.virt.confirm = true; }, () => { Input.virt.confirm = false; });
    // Wischen aufs Bild = Kamera
    let last = null;
    const cv = $('#gl');
    cv.addEventListener('touchstart', (e) => { last = e.touches[0]; }, { passive: true });
    cv.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (last) { Input.dx += (t.clientX - last.clientX) * 1.4; Input.dy += (t.clientY - last.clientY) * 1.4; Input.mx = clamp(Input.mx + (t.clientX - last.clientX) / 200, -1, 1); } last = t; }, { passive: true });
    cv.addEventListener('touchend', () => { Input.edge.click = true; last = null; }, { passive: true });
  },
};

// ---------- UI-Aufbau ----------
const UI = {
  build() {
    $('#ui').innerHTML = `
<div id="hud" class="hidden">
  <div id="overlay-text"><div class="ov"></div></div>
  <div id="subs"></div>
  <div id="objective"></div>
  <div id="balance"><div class="delta"></div><div class="amt">23,17 €</div></div>
  <div id="prompt"><span class="key">E</span><span class="lbl"></span></div>
  <div id="hint"></div>
  <div id="choices"></div>
  <div id="silence"><div class="lbl">Schweigen …</div><div class="bar"><i></i></div></div>
  <div id="skip"><svg viewBox="0 0 26 26"><circle class="bg" cx="13" cy="13" r="11"/><circle class="fg" cx="13" cy="13" r="11"/></svg><span>Leertaste halten zum Überspringen</span></div>
  <div id="tell"><i></i><span></span></div>
  <div id="toast"></div>
  <div id="phone"></div>
  <div id="notecard"></div>
</div>
<div id="titlecard"></div>
<div id="menu" class="screen hidden">
  <div class="col">
    <h1>MAKTUB</h1>
    <div class="ar">مكتوب</div>
    <div class="sub">Es steht geschrieben</div>
    <nav><button class="mbtn" data-a="play">Weg beginnen</button><button class="mbtn" data-a="chapters">Kapitel</button><button class="mbtn" data-a="settings">Einstellungen</button></nav>
  </div>
  <div class="foot">Mit Kopfhörern spielen</div>
</div>
<div id="chapters" class="screen panel hidden"><div class="box"><h2>Kapitel</h2><div class="list"></div><button class="mbtn back" style="animation-delay:0s;opacity:1;transform:none" data-a="close">Zurück</button></div></div>
<div id="settings" class="screen panel hidden"><div class="box"><h2>Einstellungen</h2><div class="set"></div><button class="mbtn back" style="animation-delay:0s;opacity:1;transform:none" data-a="close">Zurück</button></div></div>
<div id="notebook" class="screen hidden"></div>
<div id="touch" class="hidden"><div class="stick"><i></i></div><div class="tb f">Fokus</div><div class="tb e">E</div><div class="tb n">Weiter</div></div>
<div id="start" class="screen"><div class="hp">Mit Kopfhörern spielen.</div><div class="hint">Klicken, um zu beginnen</div></div>
<div id="dev" class="hidden"></div>`;
    Sub.init(); Prompt.init(); Phone.init(); Notebook.init(); NoteCard.init(); Touch.init();
    $$('.panel [data-a=close]').forEach((b) => b.addEventListener('click', () => { Snd.uiBack(); Panels.closeAll(); }));
    $$('#menu .mbtn').forEach((b) => {
      b.addEventListener('mouseenter', () => Snd.uiHover());
      b.addEventListener('click', () => { Snd.uiClick(); const a = b.dataset.a; if (a === 'play') Game.newGame(); else Panels.open(a); });
    });
  },
  hud(on) { $('#hud').classList.toggle('hidden', !on); },
  // Letterbox-Höhe in --bar spiegeln (für Untertitel-Positionen)
  syncBar() { document.documentElement.style.setProperty('--bar', GFX.barPx().toFixed(1) + 'px'); },
};
