// =====================================================================
// Kino-System (Cutscenes, überspringbar), Weltwechsel, Kapitel-Manager, Fonts
// =====================================================================
const WORLDS = {};
const Story = { chapters: [] };

const Fonts = {
  async ready() {
    const list = ['italic 300 24px "Cormorant Garamond"', '400 24px "Cormorant Garamond"', '500 24px "Cormorant Garamond"', '400 20px "Hanken Grotesk"', '500 20px "Caveat"', '600 20px "Caveat"', '700 24px "Aref Ruqaa"'];
    try {
      await Promise.race([Promise.all(list.map((f) => document.fonts.load(f, 'AaÄäÖöÜü€0123456789 مكتوب'))), new Promise((r) => setTimeout(r, 4000))]);
    } catch (e) { /* Fallback-Schriften greifen */ }
  },
};

const Cine = {
  active: false, skipping: false, holdT: 0, skippable: true, t: 0,
  update(dt) {
    const ring = $('#skip');
    if (!this.active || !this.skippable || this.skipping) { if (ring && this._ringOn) { ring.classList.remove('on'); this._ringOn = false; } return; }
    if (Input.key('confirm')) this.holdT += dt; else this.holdT = Math.max(0, this.holdT - dt * 2);
    const p = clamp(this.holdT / 0.9);
    ring.querySelector('.fg').style.strokeDashoffset = String(69.1 * (1 - p));
    const show = this.holdT > 0.12 || this.hintT > 0;
    if (this.hintT > 0) this.hintT -= dt;
    if (show !== this._ringOn) { ring.classList.toggle('on', show); this._ringOn = show; }
    if (this.holdT >= 0.9) this.skip();
  },
  skip() {
    if (this.skipping) return;
    this.skipping = true; G.skipping = true;
    Sub.clear(); $('#choices').innerHTML = '';
    if (G.world) for (const c of G.world.chars) if (c.finishMove) c.finishMove();
    G.sched.flush();
  },
  // fn(c) beschreibt die Szene. Nach dem Ende geht es (standardmäßig) zurück ins freie Spiel.
  async run(fn, o = {}) {
    this.active = true; this.skipping = false; G.skipping = false; this.skippable = o.skippable !== false; this.t = 0; this.holdT = 0; this.hintT = o.hint === false ? 0 : 3.2;
    G.mode = 'cine'; Player.lock(); Prompt.set(null); Focus.allowed = false; Hint.hide();
    if (o.bars !== false) tween(FX, { bars: 1 }, 0.9, 'inOutSine');
    let aborted = false;
    try { await fn(this); }
    catch (e) { if (e !== ABORT) console.error(e); else aborted = true; }
    this.active = false; this.skipping = false; G.skipping = false; this.holdT = 0;
    $('#skip').classList.remove('on'); this._ringOn = false;
    if (aborted) throw ABORT;
    if (o.bars !== false && !o.keepBars) tween(FX, { bars: 0 }, 0.9, 'inOutSine');
    if (!o.stay) { G.mode = 'play'; Player.unlock(); Cam.gameplay(); }
  },
  // Skript-Helfer
  cut(spec) { Cam.set(spec); },
  move(spec, dur, e) { return Cam.move(spec, dur, e); },
  wait(sec) { return sleep(sec); },
};

const Game = {
  chapterIdx: -1, running: 0, started: false,
  async fade(to, dur = 0.8, col) { if (col) FX.fadeCol = col; await tween(FX, { fade: to }, dur, 'inOutSine'); },
  async loadWorld(name, o = {}) {
    if (G.world) G.world.onLeave();
    const old = G.world;
    const W = new WORLDS[name](o);
    await W.build(o);
    G.world = W; curScene = W.scene;
    Cam.zone = null;
    if (old) {
      if (Player.ch.root.parent === old.scene) old.scene.remove(Player.ch.root);   // gemeinsame Spielerfigur nicht mit entsorgen
      old.dispose();
    }
    if (W.noPlayer) { if (Player.ch.root.parent) Player.ch.root.parent.remove(Player.ch.root); }
    else Player.enter(W, W.spawn.x, W.spawn.z, W.spawn.yaw);
    Cam.gameplay();
    if (W.camDefault && W.camMode === 'zones') { Cam.pos.set(...W.camDefault.pos); Cam.look.set(...W.camDefault.look); Cam.fov = W.camDefault.fov || 40; Cam.zone = W.camDefault; }
    W.onEnter(o);
    Atmo.applyShadowQuality(GFX.q.shadow);
    GFX.renderer.compile(W.scene, GFX.camera);
    return W;
  },
  // Sicheres, sauberes Verlassen einer laufenden Story (Hauptmenü)
  async toMenu() {
    this.running++;
    G.sched.abort(); if (G.world) for (const c of G.world.chars) if (c.abortMove) c.abortMove();
    Cine.active = false; Cine.skipping = false; G.skipping = false; Notebook.close(true);
    Sub.clear(); $('#choices').innerHTML = ''; Phone.hide(); Title.black(false); Ov.show && $('#overlay-text .ov').classList.remove('on');
    Focus.allowed = false; G.focus = 0; FX.focus = 0; FX.water = 0; FX.flash = 0; Snd.heartStop(); Snd.worldFilter(20000, 0.2); Snd.ambClear(1.5);
    Input.releaseLock(); UI.hud(false); $('#touch').classList.add('hidden');
    await this.fade(1, 0.7, [0, 0, 0]);
    G.mode = 'menu'; G.paused = false;
    Mus.play(CUES.menu, { mood: 'main', fadeOut: 1.5 });
    await this.loadWorld('menu');
    Atmo.set(WORLDS.menu.atmo);
    $('#menu').classList.remove('hidden');
    FX.bars = 0;
    await this.fade(0, 1.6);
  },
  async newGame() {
    Panels.closeAll();
    this.startChapter(0);
  },
  async startChapter(i) {
    const my = ++this.running;
    G.sched.abort(); G.mode = 'title';
    if (G.world) for (const c of G.world.chars) if (c.abortMove) c.abortMove();
    Notebook.close(true);
    Sub.clear(); $('#choices').innerHTML = ''; Phone.hide();
    $('#menu').classList.add('hidden'); Panels.closeAll();
    Focus.allowed = false; G.focus = 0; FX.water = 0; FX.flash = 0;
    await Promise.resolve(); // Abbruch der alten Skripte durchlaufen lassen
    Store.set('progress', { chapter: i });
    for (let k = i; k < Story.chapters.length; k++) {
      if (my !== this.running) return;
      const c = Story.chapters[k];
      if (!c.ready) break;
      this.chapterIdx = k;
      G.chapterLabel = c.num ? `Kapitel ${c.num}` : c.title;
      Store.set('progress', { chapter: k });
      UI.hud(false);
      try { await c.run(); }
      catch (e) { if (e !== ABORT) console.error(e); return; }
      if (my !== this.running) return;
    }
    if (my === this.running) { await this.endOfPreview(); }
  },
  async endOfPreview() {
    UI.hud(false); Snd.ambClear(3); Mus.stop(4);
    await Title.card({ num: '', title: 'Fortsetzung folgt', line: 'Weiter im nächsten Kapitel.', big: false, note: false }, 5);
    await this.toMenu();
  },
  showHud() { UI.hud(true); },
};
