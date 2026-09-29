// =====================================================================
// Deal-System: das Gegenüber lesen (Fokus), Druck / Ruhe / Aufstehen / Schweigen, Ungesagtes, Zahltag-Ritual.
// Nichts scheitert endgültig – „es steht geschrieben“ –, aber WIE man gewinnt, prägt Mirza.
// =====================================================================
const zeroPose = () => { const o = { rootX: 0, rootY: 0, rootZ: 0 }; for (const j of JOINTS) o[j] = [0, 0, 0]; return o; };
const sitP = (o) => mkPose(Object.assign({ y: -0.52, z: -0.06, legL: { flex: 88, knee: 90, foot: 0, abd: 3 }, legR: { flex: 88, knee: 90, foot: 0, abd: 3 } }, o));
const SIT = {
  idle: sitP({ lean: 5, nod: 8, L: { arm: [38, 8, 0], fore: 86 }, R: { arm: [40, 8, 0], fore: 86 } }),
  watch: sitP({ lean: 3, nod: 6, L: { arm: [42, 4, 0], fore: 104, hand: 6 }, R: { arm: [38, 8, 0], fore: 86 } }),
  arms: sitP({ lean: -4, nod: 5, L: { arm: [36, 2, 0], fore: 124 }, R: { arm: [36, 2, 0], fore: 124 } }),
  tap: sitP({ lean: 5, nod: 8, L: { arm: [38, 8, 0], fore: 86 }, R: { arm: [36, 6, 0], fore: 92, hand: 14 } }),
  lean: sitP({ lean: 16, nod: 4, L: { arm: [48, 8, 0], fore: 72 }, R: { arm: [48, 8, 0], fore: 72 } }),
  relax: sitP({ lean: -3, nod: 2, L: { arm: [30, 10, 0], fore: 70 }, R: { arm: [30, 10, 0], fore: 70 } }),
  sip: sitP({ lean: 3, nod: 4, L: { arm: [38, 8, 0], fore: 86 }, R: { arm: [42, 6, 0], fore: 108, hand: -20 } }),
  hard: sitP({ lean: -6, nod: 2, L: { arm: [38, 2, 0], fore: 128 }, R: { arm: [38, 2, 0], fore: 128 } }),
  sign: sitP({ lean: 14, nod: 24, L: { arm: [40, 8, 0], fore: 84 }, R: { arm: [46, 6, 0], fore: 78, hand: 12 } }),
};
const ME_SIT = { idle: sitP({ lean: 6, nod: 6, L: { arm: [40, 8, 0], fore: 84 }, R: { arm: [40, 8, 0], fore: 84 } }), lean: sitP({ lean: 12, nod: 4, L: { arm: [46, 8, 0], fore: 74 }, R: { arm: [46, 8, 0], fore: 74 } }), sign: sitP({ lean: 14, nod: 22, L: { arm: [40, 8, 0], fore: 84 }, R: { arm: [46, 6, 0], fore: 78, hand: 12 } }) };
// Beobachtbares Verhalten des Gegenübers (Bewegung obenauf)
const TELL_ANIM = {
  watch: (o, t) => { const p = Math.max(0, Math.sin(t * 1.9)); o.head[0] = p * p * 14; o.armL[0] = -p * 6; },
  arms: (o, t) => { o.spine[0] = -Math.sin(t * 0.8) * 1.2; o.head[2] = Math.sin(t * 0.5) * 2; },
  tap: (o, t) => { o.handR[0] = Math.sin(t * 15) * 12; o.foreR[0] = -Math.max(0, Math.sin(t * 7.5)) * 5; },
  lean: (o, t) => { o.spine[0] = Math.sin(t * 1.1) * 1.5; },
  hard: (o, t) => { o.spine[0] = -Math.sin(t * 0.9) * 1.0; },
};
const TELL_JOINT = { watch: ['handL', 0.5, 0.22], arms: ['chest', 1.15, 0.3], tap: ['handR', 0.55, -0.24], lean: ['head', 0.95, 0.35] };
const Tells = {
  set(ch, kind, k = 5) {
    ch.setPose(SIT[kind] || SIT.idle, k); ch._tell = kind; ch.overlay = zeroPose();
    ch.onUpdate = () => { const ov = ch.overlay, f = TELL_ANIM[ch._tell]; if (!ov) return; if (f) f(ov, G.t); };
  },
  clear(ch) { ch._tell = null; ch.overlay = null; ch.onUpdate = null; },
};

// ---------- Fokus-Lesen: kleines Etikett am Gegenüber ----------
const Tell = {
  el: null, pos: null, text: '', on: false, force: false, v: new THREE.Vector3(),
  set(posFn, text) { this.pos = posFn; this.text = text; },
  clear() { this.pos = null; this.force = false; if (this.el) { this.el.classList.remove('on'); this.on = false; } },
  update(camera) {
    if (!this.el) { this.el = $('#tell'); if (!this.el) return; this.sp = this.el.querySelector('span'); }
    const want = !!this.pos && (G.focus > 0.55 || this.force) && G.mode !== 'menu';
    if (!want) { if (this.on) { this.el.classList.remove('on'); this.on = false; } return; }
    const w = this.pos(); this.v.copy(w).project(camera);
    if (this.v.z > 1) { this.el.classList.remove('on'); this.on = false; return; }
    const x = (this.v.x * 0.5 + 0.5) * window.innerWidth, y = (-this.v.y * 0.5 + 0.5) * window.innerHeight;
    if (this.sp.textContent !== this.text) this.sp.textContent = this.text;
    this.el.style.transform = `translate(${Math.round(clamp(x + 30, 10, window.innerWidth - 360))}px, ${Math.round(clamp(y - 30, window.innerHeight * 0.12, window.innerHeight * 0.36))}px)`;
    if (!this.on) { this.el.classList.add('on'); this.on = true; }
  },
};

const DEAL_TAG = { push: 'Druck', calm: 'Ruhe', stand: 'Aufstehen', silence: 'Schweigen' };
const Deal = {
  score: 0, fails: 0, D: null,
  // D: { name, partner, me, shots:{them,me,wide}, tellPos(): Vector3, mood: ['calm','tense','push'], cue }
  begin(D) {
    this.D = D; this.score = 0; this.fails = 0;
    Mus.play(D.cue || CUES.deal, { mood: D.start || (D.mood ? D.mood[0] : 'calm'), fadeOut: 2.2, delay: 0.15 });
  },
  // Beide schauen sich an (folgt den Köpfen); gibt die Funktion zum Lösen zurück
  eyeLock(a, b) {
    const W = G.world, va = new THREE.Vector3(), vb = new THREE.Vector3();
    const fn = () => { a.j.head.getWorldPosition(va); b.j.head.getWorldPosition(vb); };
    fn(); W.onUpdate(fn); a.lookAt(vb, 0.9); b.lookAt(va, 0.9);
    return () => { const i = W.updaters.indexOf(fn); if (i >= 0) W.updaters.splice(i, 1); a.lookAt(null); b.lookAt(null); };
  },
  end() { const D = this.D; Tell.clear(); Focus.allowed = false; if (D) { Tells.clear(D.partner); D.partner.lookAt(null); } G.slow = 1; },
  shot(spec, dur = 0) { if (!spec) return Promise.resolve(); if (dur > 0) return Cam.move(spec, dur, 'inOutSine'); Cam.set(spec); return Promise.resolve(); },
  // Kurzer Schnitt auf das, was das Gegenüber verrät
  async insert(kind, dur = 1.5) {
    const D = this.D, ch = D.partner, spec = TELL_JOINT[kind]; if (!spec || G.skipping) return;
    const p = new THREE.Vector3(); ch.j[spec[0]].getWorldPosition(p);
    const fw = new THREE.Vector3(Math.sin(ch.yaw), 0, Math.cos(ch.yaw)), rt = new THREE.Vector3(fw.z, 0, -fw.x);
    const pos = p.clone().addScaledVector(fw, spec[1]).addScaledVector(rt, spec[2]); pos.y += 0.06;
    const from = [pos.x + fw.x * 0.14, pos.y, pos.z + fw.z * 0.14];
    Cam.set({ pos: from, look: [p.x, p.y, p.z], fov: kind === 'arms' ? 34 : 26, dof: 0.9 });
    Cam.move({ pos: [pos.x, pos.y, pos.z], look: [p.x, p.y, p.z] }, dur, 'inOutSine');
    if (kind === 'watch') { Snd.countTick(2); setTimeout(() => Snd.countTick(2), 480); setTimeout(() => Snd.countTick(2), 960); }
    else if (kind === 'tap') for (let i = 0; i < 6; i++) setTimeout(() => Snd.step('wood', { vel: 0.22 }), i * 170);
    else if (kind === 'arms') Snd.whoosh(0.35, { gain: 0.1, from: 260, to: 160 });
    else Snd.door('creak');
    await sleep(dur);
    FX.dof = 0;
  },
  async rewind() {
    Snd.whoosh(0.95, { gain: 0.5, from: 2600, to: 160 });
    FX.water = 0.9; FX.ca = 0.012; tween(FX, { water: 0, ca: 0 }, 1.1, 'out'); FX.flash = 0.25; tween(FX, { flash: 0 }, 0.9, 'out');
    await sleep(0.9);
  },
  silenceFx(on) {
    if (on) { Mus.mood('silence', 1.0); tween(G, { slow: 0.5 }, 0.6, 'out'); Snd.worldFilter(1400, 0.6); Snd.heartStart(56, 0.32); }
    else { const D = this.D; Mus.mood(D && D.mood ? D.mood[Math.min(D.mood.length - 1, this.step || 0)] : 'calm', 0.9); tween(G, { slow: 1 }, 0.5, 'out'); Snd.worldFilter(20000, 0.6); Snd.heartStop(); }
  },
  // Auswahlleiste. Schweigen: Leertaste (oder 4) HALTEN.
  async pick(R, force) {
    const box = $('#choices'), sil = $('#silence'), fill = $('i', sil); box.innerHTML = '';
    const opts = R.opts, n = opts.length;
    let sel = 0, result = -1, held = 0, mouseHeld = false, fx = false;
    const items = opts.map((o, i) => {
      const d = h('div', 'choice dopt' + (o.key === 'silence' ? ' hold' : ''));
      d.innerHTML = `<span class="k">${i + 1}</span><span class="tag">${DEAL_TAG[o.key]}</span><span class="ln">${o.key === 'silence' ? 'Nichts sagen. <small>Leertaste halten</small>' : o.text}</span>`;
      d.style.animationDelay = i * 0.14 + 's'; box.appendChild(d);
      d.addEventListener('mouseenter', () => { sel = i; mark(); Snd.uiHover(); });
      d.addEventListener('pointerdown', () => { sel = i; mark(); if (o.key === 'silence') mouseHeld = true; else { result = i; Snd.uiClick(); } });
      return d;
    });
    const up = () => { mouseHeld = false; }; window.addEventListener('pointerup', up);
    const mark = () => items.forEach((d, i) => d.classList.toggle('sel', i === sel));
    mark();
    Tell.force = !!force; Cine.skippable = false; Focus.allowed = true; $('#hud').classList.add('subs-on', 'deal-on');
    const HOLD = 2.4;
    try {
    await sleep(0.55);
    await until(() => {
      if (Input.pressed('up') && sel > 0) { sel--; mark(); Snd.uiHover(); }
      if (Input.pressed('down') && sel < n - 1) { sel++; mark(); Snd.uiHover(); }
      for (let i = 0; i < 4; i++) if (Input.pressed('n' + (i + 1)) && i < n) { sel = i; mark(); if (opts[i].key !== 'silence') { result = i; Snd.uiClick(); } }
      if (Input.pressed('confirm') && opts[sel].key !== 'silence') { result = sel; Snd.uiClick(); }
      const isSil = opts[sel].key === 'silence', down = isSil && (Input.key('confirm') || Input.key('n' + (sel + 1)) || mouseHeld);
      const dt = G.dt || 0.016;
      if (down) { held += dt; if (!fx) { fx = true; this.silenceFx(true); } } else if (held > 0) { held = Math.max(0, held - dt * 3); if (held === 0 && fx) { fx = false; this.silenceFx(false); } }
      sil.classList.toggle('on', held > 0.05); fill.style.width = (Math.min(1, held / HOLD) * 100).toFixed(1) + '%';
      items.forEach((d, i) => d.classList.toggle('held', down && i === sel));
      if (held >= HOLD) result = sel;
      return result >= 0;
    });
    } finally { window.removeEventListener('pointerup', up); sil.classList.remove('on'); fill.style.width = '0%'; }
    Focus.allowed = false; Tell.clear();
    items.forEach((d, i) => { if (i !== result) d.style.opacity = 0; d.style.transition = 'opacity .5s'; });
    await sleep(0.4);
    box.innerHTML = ''; $('#hud').classList.remove('subs-on', 'deal-on');
    return { key: opts[result].key, opt: opts[result], fx };
  },
  // Eine Runde. R: {tell, hint, say:[..], best, opts:[{key,text}], good:[..], bad:{key:[..]|default}, inner:{good, bad:{…}}, soft}
  async round(R, idx) {
    const D = this.D, P = D.partner, me = D.me, name = D.name;
    this.step = idx;
    let attempt = 0;
    for (;;) {
      Tells.set(P, R.tell);
      Tell.set(() => D.tellPos(), R.hint);
      Mus.mood(D.mood ? D.mood[Math.min(D.mood.length - 1, idx)] : 'calm', 1.2);
      await this.shot(D.shots.them);
      FX.dof = 0.35; Cam.dofAuto = true;
      if (attempt === 0) { for (const l of R.say) await Sub.say(name, l, { dur: l.length > 46 ? 4.2 : 3 }); } else await Sub.inner('Noch einmal.', { dur: 1.5 });
      await this.insert(R.tell, 1.5);
      await this.shot(D.shots.them);
      if (idx === 0 && attempt === 0 && !D.hinted) { D.hinted = true; Hint.show('<b>Umschalt</b> halten: Gegenüber lesen &nbsp;·&nbsp; <b>1–4</b> oder <b>Pfeile + Leertaste</b>: antworten', 10); }
      const res = await this.pick(R, attempt > 0 && !G.skipping);
      Hint.hide();
      const good = res.key === R.best;
      // Mirza spricht (oder schweigt)
      if (res.key === 'stand') { me.setPose(POSES.mirza, 4); Snd.door('creak'); await sleep(0.3); }
      if (res.key !== 'silence') { await this.shot(D.shots.me); FX.dof = 0.35; await Sub.say('Mirza', res.opt.text, { dur: clamp(1.2 + res.opt.text.length * 0.05, 2.4, 5.6) }); }
      else { await sleep(0.6); }
      // Reaktion
      await this.shot(D.shots.them);
      if (good) { Tells.set(P, R.after || 'relax', 4); Snd.shimmer(AUD ? AUD.ctx.currentTime + 0.05 : 0, [880, 1320], 0.5); }
      else { Tells.set(P, R.tell === 'arms' ? 'hard' : R.tell, 6); Snd.deny(); }
      const lines = good ? R.good : (R.bad[res.key] || R.bad.default);
      for (const l of lines) await Sub.say(name, l, { dur: l.length > 52 ? 4.4 : 3.1 });
      if (res.fx) this.silenceFx(false);
      if (res.key === 'stand') { me.setPose(ME_SIT.idle, 4); Snd.door('creak'); await sleep(0.4); }
      const inn = good ? R.inner.good : (R.inner.bad[res.key] || R.inner.bad.default);
      if (inn) await Sub.inner(inn, { dur: clamp(1.4 + inn.length * 0.05, 2.4, 5.4) });
      if (good) { if (attempt === 0) this.score++; return true; }
      if (attempt >= 1) { this.fails++; if (R.soft) await Sub.say(name, R.soft, { dur: 2.6 }); return false; }
      attempt++;
      await this.rewind();
    }
  },
  // Zahltag: Handy summt, Zeitlupe, das Konto füllt sich – der Klang ist Wucht, kein Kassengeräusch
  async payday(add, o = {}) {
    const me = Player.ch, size = o.size || 2, from = G.state.money, to = Math.round((from + add) * 100) / 100;
    Mus.mood('silence', 0.5);
    me.hold('phone', true); me.setPose('phone', 3);
    const p = new THREE.Vector3(); me.j.head.getWorldPosition(p);
    const fw = new THREE.Vector3(Math.sin(me.yaw), 0, Math.cos(me.yaw)), rt = new THREE.Vector3(fw.z, 0, -fw.x);
    const cp = p.clone().addScaledVector(fw, 1.9).addScaledVector(rt, 0.55); cp.y = p.y + 0.1;
    Cam.set({ pos: [cp.x, cp.y, cp.z], look: [p.x, p.y + 0.05, p.z], fov: 30, dof: 0.9 });
    Cam.move({ pos: [cp.x - fw.x * 0.45, cp.y, cp.z - fw.z * 0.45], look: [p.x, p.y + 0.04, p.z], fov: 26 }, 9, 'inOutSine');
    Snd.phoneBuzz(undefined, 3);
    await sleep(0.9);
    Phone.toast('Überweisung', '+ ' + fmtEuro(add) + ' eingegangen', 6);
    tween(G, { slow: 0.2 }, 0.5, 'out'); Snd.heartStart(72, 0.7); Snd.worldFilter(700, 0.5);
    await sleep(1.5);
    await Bal.show(to, { delta: add, ritual: true, hold: 5 });
    Snd.impact(size); FX.flash = 0.7; tween(FX, { flash: 0 }, 1.6, 'out'); Cam.punch(1.6); Cam.shake = 0.02; tween(Cam, { shake: 0 }, 1.2, 'out');
    tween(G, { slow: 1 }, 1.5, 'inOut'); Snd.heartStop(); Snd.worldFilter(20000, 1.5);
    Mus.mood(o.mood || 'lift', 1.5);
    await sleep(1.4);
    if (o.lines) for (const l of o.lines) await Sub.inner(l);
    if (o.strike != null) {
      me.hold('phone', false); me.hold('notebook', true); me.setPose('notebook', 4); Snd.page();
      await sleep(0.7);
      await NoteCard.show(GOAL_DEFS.map((g) => g.text), { speed: 0.12 });
      await sleep(0.4); NoteCard.strike(o.strike); Snd.pen(0.9);
      await sleep(1.8);
      await NoteCard.hide();
      me.hold('notebook', false); Snd.page();
    }
    me.hold('phone', false); me.setPose('mirza', 4); FX.dof = 0;
  },
};
