// =====================================================================
// MAKTUB – Kern: Mathe, Easing, Zufall, Farben, Speicher, Scheduler
// Alles läuft in einem gemeinsamen Scope (siehe tools/build.mjs).
// =====================================================================
if (typeof THREE === 'undefined') {
  document.body.insertAdjacentHTML('beforeend',
    '<div style="position:fixed;inset:0;display:grid;place-items:center;background:#000;color:#e9dfc8;font:300 20px Georgia,serif;text-align:center;padding:24px">' +
    'Three.js konnte nicht geladen werden.<br><small style="opacity:.6">Bitte Internetverbindung prüfen und neu laden.</small></div>');
  throw new Error('THREE fehlt');
}

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => (v - a) / (b - a);
const remap = (v, a, b, c, d) => lerp(c, d, clamp(invLerp(a, b, v)));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wrapAngle = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const dampAngle = (a, b, k, dt) => a + wrapAngle(b - a) * (1 - Math.exp(-k * dt));
const sign = (x) => (x < 0 ? -1 : 1);

const ease = {
  lin: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  smooth: (t) => t * t * (3 - 2 * t),
  smoother: (t) => t * t * t * (t * (t * 6 - 15) + 10),
};

// ---------- Zufall (deterministisch, damit Welten immer gleich aussehen) ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class RNG {
  constructor(seed = 1) { this.f = mulberry32(seed >>> 0); }
  next() { return this.f(); }
  range(a, b) { return a + (b - a) * this.f(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
  chance(p) { return this.f() < p; }
  sign() { return this.f() < 0.5 ? -1 : 1; }
  gauss() { return (this.f() + this.f() + this.f() + this.f() - 2) / 2; }
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
}
const hash1 = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const hash3 = (x, y, z) => hash1(x * 12.9898 + y * 78.233 + z * 37.719);
const rnd = new RNG(1337); // gemeinsamer Zufall für nicht-deterministische Feinheiten

// ---------- Farben ----------
// Authoring in sRGB-Hex; gerendert wird linear -> lin() konvertiert.
function hexToRgb(h) {
  if (Array.isArray(h)) return h;
  if (h && h.isColor) return [h.r, h.g, h.b];
  if (typeof h === 'string') h = parseInt(h.replace('#', ''), 16);
  return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
}
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lin = (h, m = 1) => { const c = hexToRgb(h); return [s2l(c[0]) * m, s2l(c[1]) * m, s2l(c[2]) * m]; };
const srgb = (h, m = 1) => { const c = hexToRgb(h); return [c[0] * m, c[1] * m, c[2] * m]; };
const tcol = (h, m = 1) => { const c = lin(h, m); return new THREE.Color(c[0], c[1], c[2]); };
const mixRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const scaleRGB = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const jitterRGB = (c, amt, r) => { const k = 1 + (r - 0.5) * 2 * amt; return [c[0] * k, c[1] * k, c[2] * k]; };

// ---------- DOM ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function h(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// ---------- Formatierung ----------
function fmtEuro(n, sign = false) {
  const neg = n < 0; n = Math.abs(n);
  const [i, d] = n.toFixed(2).split('.');
  const s = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d + ' €';
  return (neg ? '-' : sign ? '+' : '') + s;
}
const pad2 = (n) => (n < 10 ? '0' : '') + n;

// ---------- Speicher (localStorage kann fehlen/blockiert sein) ----------
const Store = {
  mem: {},
  get(key, def) {
    try { const v = localStorage.getItem('maktub.' + key); if (v != null) return JSON.parse(v); } catch (e) { /* ignorieren */ }
    return key in this.mem ? this.mem[key] : def;
  },
  set(key, val) {
    this.mem[key] = val;
    try { localStorage.setItem('maktub.' + key, JSON.stringify(val)); } catch (e) { /* ignorieren */ }
  },
};

// ---------- Scheduler: Warten, Tweens, Bedingungen – alles pausier- und überspringbar ----------
class Sched {
  constructor() { this.items = []; this.skipping = () => false; }
  wait(sec) {
    if (this.skipping() || sec <= 0) return Promise.resolve();
    return new Promise((res, rej) => this.items.push({ kind: 'wait', t: 0, dur: sec, res, rej }));
  }
  until(fn, timeout = Infinity) {
    if (fn()) return Promise.resolve(true);
    if (this.skipping()) return Promise.resolve(false);
    return new Promise((res, rej) => this.items.push({ kind: 'until', fn, t: 0, dur: timeout, res, rej }));
  }
  // to: {prop: value} für Zahlen / Arrays / Vector3 / Color-Komponenten. obj kann auch eine Funktion (t)=>{} sein.
  tween(obj, to, dur, easing = 'inOut', delay = 0) {
    const f = typeof easing === 'function' ? easing : ease[easing] || ease.inOut;
    const track = [];
    if (typeof obj === 'function') {
      track.push({ fn: obj });
    } else {
      for (const k in to) {
        const cur = obj[k], tgt = to[k];
        if (typeof cur === 'number') track.push({ o: obj, k, a: cur, b: tgt });
        else if (Array.isArray(cur)) track.push({ o: obj, k, a: cur.slice(), b: tgt, arr: true });
        else if (cur && cur.isVector3) track.push({ o: cur, v3: true, a: cur.clone(), b: new THREE.Vector3(tgt[0], tgt[1], tgt[2]) });
        else if (cur && cur.isColor) track.push({ o: cur, col: true, a: cur.clone(), b: tgt.isColor ? tgt : new THREE.Color(tgt[0], tgt[1], tgt[2]) });
      }
    }
    const apply = (it, t) => {
      const e = f(t);
      for (const tr of it.track) {
        if (tr.fn) tr.fn(e, t);
        else if (tr.arr) { for (let i = 0; i < tr.a.length; i++) tr.o[tr.k][i] = lerp(tr.a[i], tr.b[i], e); }
        else if (tr.v3) tr.o.lerpVectors(tr.a, tr.b, e);
        else if (tr.col) tr.o.copy(tr.a).lerp(tr.b, e);
        else tr.o[tr.k] = lerp(tr.a, tr.b, e);
      }
    };
    return new Promise((res, rej) => {
      const it = { kind: 'tween', t: -delay, dur: Math.max(dur, 1e-4), track, apply, res, rej };
      if (this.skipping()) { apply(it, 1); res(); return; }
      this.items.push(it);
    });
  }
  update(dt) {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      if (it.kind === 'wait') { if (it.t >= it.dur) { items.splice(i, 1); it.res(); } }
      else if (it.kind === 'until') {
        let ok = false;
        try { ok = it.fn(); } catch (e) { console.error(e); ok = true; }
        if (ok) { items.splice(i, 1); it.res(true); } else if (it.t >= it.dur) { items.splice(i, 1); it.res(false); }
      } else if (it.kind === 'tween') {
        if (it.t < 0) continue;
        const p = clamp(it.t / it.dur);
        it.apply(it, p);
        if (p >= 1) { items.splice(i, 1); it.res(); }
      }
    }
  }
  // Überspringen: alles sofort abschließen.
  flush() {
    const items = this.items.splice(0);
    for (const it of items) {
      if (it.kind === 'tween') it.apply(it, 1);
      it.res(it.kind === 'until' ? false : undefined);
    }
  }
  clear() { this.items.length = 0; }
  // Kapitel abbrechen: alle wartenden Skripte werden mit ABORT beendet (try/finally räumt auf)
  abort() { const items = this.items.splice(0); for (const it of items) it.rej(ABORT); }
}
const ABORT = { aborted: true };

// ---------- Globales Spielobjekt (wird von den Modulen befüllt) ----------
const G = {
  ready: false, paused: false, mode: 'boot', // boot | start | menu | play | cine | title
  t: 0, rt: 0, dt: 0, timeScale: 1, frame: 0,
  focus: 0, focusTarget: 0,
  sched: new Sched(),      // Story-Zeit (läuft nicht bei Pause, ignoriert Fokus-Zeitlupe)
  world: null, player: null,
  state: { money: 23.17, flags: {}, counters: { nourLooks: 0, kerim: 0, cat: 0 } },
  settings: { musicVol: 0.8, sfxVol: 0.9, quality: 'auto', grain: true, subSize: 1 },
  debug: /[?&](dev|test)\b/.test(location.search),
  test: /[?&]test\b/.test(location.search),
  skipping: false,
};
const sleep = (sec) => G.sched.wait(sec);
const until = (fn, timeout) => G.sched.until(fn, timeout);
const tween = (o, to, d, e, delay) => G.sched.tween(o, to, d, e, delay);
G.sched.skipping = () => G.skipping;
