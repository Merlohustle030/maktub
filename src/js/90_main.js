// =====================================================================
// Start: Boot, Hauptschleife, Test-Hooks
// =====================================================================
let curScene = null;
const updaters = [];
function scene_update(dt) { for (const u of updaters) u(dt); }

function tick(rawDt) {
  const dt = Math.min(0.05, rawDt);
  G.rt += dt; G.frame++;
  if (Input.pressed('pause')) {
    if (Panels.cur) { Panels.closeAll(); Snd.uiBack(); }
    else if (Notebook.shown) Notebook.close();
    else if (G.mode === 'play' || G.mode === 'cine') Notebook.open();
  }
  if (Input.pressed('objective') && G.mode === 'play' && !G.paused) Obj.show(5);
  if (!G.paused) {
    G.t += dt;
    G.sched.update(dt);
    Player.update(dt);
    if (G.world) G.world.update(dt * G.timeScale);
    Interact.update();
    Cine.update(dt);
    Focus.update(dt);
  }
  Cam.update(dt);
  Cam.apply(GFX.camera, dt);
  if (G.world) Atmo.update(GFX.camera, Player.ch ? Player.ch.root.position : null);
  UI.syncBar();
  if (G.debug) devHud(dt);
  Input.endFrame();
}
function draw() { GFX.render(curScene, GFX.camera); }
function frame(rawDt) { tick(rawDt); draw(); }
let _fpsT = 0, _fpsN = 0;
function devHud(dt) {
  _fpsT += dt; _fpsN++;
  if (_fpsT > 0.5) {
    const e = $('#dev'); e.classList.remove('hidden');
    const i = GFX.renderer.info;
    e.textContent = `${(_fpsN / _fpsT).toFixed(0)} fps · ${GFX.w}×${GFX.h} · ${GFX.quality} ×${GFX.dyn.toFixed(2)}\ncalls ${i.render.calls} · tris ${(i.render.triangles / 1000).toFixed(0)}k · mode ${G.mode}`;
    _fpsT = 0; _fpsN = 0;
  }
}
const Loop = {
  last: 0,
  frame(now) {
    requestAnimationFrame((t) => Loop.frame(t));
    const raw = (now - Loop.last) / 1000 || 0.016;
    GFX.adapt((now - Loop.last) || 16);
    Loop.last = now;
    frame(raw);
  },
};

async function onStart() {
  if (G.audioStarted) return;
  G.audioStarted = true;
  const AC = window.AudioContext || window.webkitAudioContext;
  try {
    const ctx = new AC({ latencyHint: 'interactive' });
    if (ctx.state === 'suspended') await ctx.resume();
    AUD = new AudioEngine(ctx); AUD.setVolumes(G.settings.musicVol, G.settings.sfxVol); MUS = new Music(AUD);
    document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else ctx.resume(); });
  } catch (e) { console.warn('Audio nicht verfügbar:', e); }
  Mus.play(CUES.menu, { mood: 'main', delay: 0.3 });
  Snd.ambSet('wind', 0.55, 5); Snd.ambSet('birds', 0.35, 6); Snd.ambSet('city', 0.22, 5);
  $('#start').classList.add('out');
  G.mode = 'menu';
  FX.bars = 0;
  tween(FX, { bars: 1 }, 3, 'inOutSine');
  await sleep(1.0);
  $('#menu').classList.remove('hidden');
  await Game.fade(0, 3.4);
}

async function boot() {
  Object.assign(G.settings, Store.get('settings', {}));
  UI.build(); Input.init();
  if (!GFX.init($('#gl'))) {
    document.body.insertAdjacentHTML('beforeend', '<div style="position:fixed;inset:0;display:grid;place-items:center;background:#000;color:#e9dfc8;font:300 20px Georgia,serif;text-align:center;padding:24px;z-index:99">Dein Browser unterstützt WebGL2 nicht.<br><small style="opacity:.6">Bitte einen aktuellen Browser verwenden.</small></div>');
    return;
  }
  applySettings();
  Input.canLock = true;
  FX.fade = 1; G.mode = 'boot';
  Player.init();
  await Fonts.ready();
  await Game.loadWorld('menu');
  G.mode = 'start';
  $('#start').addEventListener('click', onStart, { once: true });
  if (G.test) {
    window.__eval = (s) => eval(s);
    window.__step = async (sec, n = 1, render = true) => { for (let i = 0; i < n; i++) { tick(sec / n); await new Promise((r) => setTimeout(r, 0)); } if (render) draw(); return G.t; };
    frame(0.016);
  } else requestAnimationFrame((t) => { Loop.last = t; Loop.frame(t); });
  G.ready = true;
}
boot();
