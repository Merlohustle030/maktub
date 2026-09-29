// =====================================================================
// Musik-Sequencer: Maqam-Skalen, Layer-System (adaptiv), Cues, Stinger.
// Ereignisse (pro Layer, 16 Schritte = 1 Takt):
//   Note:      [schritt, grad, länge, velocity, {opts}]     grad 0 = Tonika (D), 7 = Oktave …, negativ = darunter
//   Akkord:    [schritt, [grade…], länge, velocity, {opts}]
//   Perkussion:[schritt, 'dum'|'tek'|…, velocity, {opts}]
// Schritte dürfen Nachkommastellen haben (32stel-Rolls).
// =====================================================================
const TONIC = 293.6648; // D4
const MAQAM = {
  kurd: [0, 1, 3, 5, 7, 8, 10],      // D Eb F G A Bb C   – Trauer, Sehnsucht
  hijaz: [0, 1, 4, 5, 7, 8, 10],     // D Eb F# G A Bb C  – Ehrgeiz, Gold (erweiterte Sekunde)
  nahawand: [0, 2, 3, 5, 7, 8, 11],  // D E F G A Bb C#   – Wärme, Verlangen
  ajam: [0, 2, 4, 5, 7, 9, 11],      // D E F# G A B C#   – Erinnerung, Süße (Dur-nah)
  bayati: [0, 1.5, 3, 5, 7, 8, 10],  // D E½b F G A Bb C  – Viertelton
};
const semiOf = (scale, deg) => scale[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);

class Music {
  constructor(A) {
    this.A = A; this.cue = null; this.layers = {}; this.retired = [];
    this.scale = MAQAM.kurd; this.tonic = TONIC; this.bpm = 66;
    this.step = 0; this.stepT = 0; this.timer = null; this.rng = new RNG(31);
    this.moodName = null; this.startedAt = 0;
  }
  freq(deg, oct = 0, scale) { return this.tonic * Math.pow(2, (semiOf(scale || this.scale, deg) + 12 * oct) / 12); }
  get stepDur() { return 60 / this.bpm / 4; }

  play(cue, o = {}) {
    const A = this.A, now = A.ctx.currentTime;
    this._retire(o.fadeOut != null ? o.fadeOut : 2.0);
    this.cue = cue;
    this.scale = MAQAM[cue.maqam || 'kurd']; this.tonic = cue.tonic || TONIC; this.bpm = cue.bpm || 66;
    this.layers = {};
    for (const name in cue.layers) {
      const L = cue.layers[name];
      const node = A.ctx.createGain(); node.gain.value = 0;
      node.connect(A.bus[L.bus || 'music']);
      const len = L.len || cue.len || 64;
      const pat = new Array(len).fill(null);
      for (const ev of L.ev || []) { const i = Math.floor(ev[0]) % len; (pat[i] || (pat[i] = [])).push(ev); }
      this.layers[name] = { name, inst: L.inst, len, pat, node, tgt: 0, oct: L.oct || 0, opts: L.opts || {}, vel: L.vel != null ? L.vel : 1, trim: L.gain != null ? L.gain : 1, mode: L.mode ? MAQAM[L.mode] : null, hum: L.hum != null ? L.hum : 0.008, pan: L.pan || 0 };
    }
    this.step = o.keepStep ? this.step : 0;
    this.stepT = now + (o.delay != null ? o.delay : 0.15);
    this.startedAt = this.stepT;
    this.mood(o.mood || cue.mood || 'silence', o.moodFade != null ? o.moodFade : 0.05);
    if (!this.timer && !A.offline) this.timer = setInterval(() => this.pump(), 35);
    return this;
  }
  _retire(fade) {
    const A = this.A, now = A.ctx.currentTime;
    for (const k in this.layers) {
      const L = this.layers[k];
      L.node.gain.cancelScheduledValues(now);
      L.node.gain.setTargetAtTime(0, now, Math.max(0.03, fade / 3));
      this.retired.push(L.node);
      L.tgt = 0;
    }
    this.layers = {};
    if (!A.offline && this.retired.length > 40) { this.retired.splice(0, this.retired.length - 40).forEach((n) => { try { n.disconnect(); } catch (e) { /* egal */ } }); }
  }
  stop(fade = 2) {
    this._retire(fade); this.cue = null; this.moodName = null;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  setLayers(map, dur = 1.5, at) {
    const now = at != null ? at : this.A.ctx.currentTime;
    for (const k in map) {
      const L = this.layers[k]; if (!L) continue;
      L.tgt = map[k];
      L.node.gain.cancelScheduledValues(now);
      L.node.gain.setTargetAtTime(map[k] * L.trim, now, Math.max(0.02, dur / 3));
    }
  }
  mood(name, dur = 1.5, at) {
    const c = this.cue; if (!c) return;
    const m = (c.moods && c.moods[name]) || {};
    const map = {};
    for (const k in this.layers) map[k] = m[k] != null ? m[k] : 0;
    this.moodName = name;
    this.setLayers(map, dur, at);
  }
  pump() {
    if (!this.cue) return;
    const now = this.A.ctx.currentTime;
    const ahead = document.hidden ? 1.2 : 0.3;
    let guard = 0;
    while (this.stepT < now + ahead && guard++ < 64) this._scheduleStep();
  }
  scheduleUntil(sec) { while (this.cue && this.stepT < sec) this._scheduleStep(); } // Offline-Render
  _scheduleStep() {
    const c = this.cue, sd = this.stepDur;
    const sw = this.step % 2 === 1 ? (c.swing || 0) * sd : 0;
    const T = this.stepT + sw;
    if (c.loop !== false || this.step < (c.len || 64)) {
      for (const k in this.layers) {
        const L = this.layers[k];
        if (L.tgt < 0.01) continue;
        const evs = L.pat[this.step % L.len];
        if (evs) for (const ev of evs) this._fire(L, ev, T, sd);
      }
    }
    this.step++; this.stepT += sd;
  }
  _fire(L, ev, T, sd) {
    const A = this.A;
    const t = Math.max(A.ctx.currentTime, T + (ev[0] - Math.floor(ev[0])) * sd + (L.hum ? (this.rng.next() - 0.5) * L.hum : 0));
    const what = ev[1];
    const scale = L.mode || this.scale;
    if (typeof what === 'string') { // Perkussion
      const o = Object.assign({}, L.opts, ev[3] || {});
      A.perc(what, t, (ev[2] != null ? ev[2] : 0.8) * L.vel, { dest: L.node, pan: o.pan != null ? o.pan : L.pan, hall: o.hall, room: o.room });
      return;
    }
    const len = ev[2] != null ? ev[2] : 4, vel = (ev[3] != null ? ev[3] : 0.7) * L.vel;
    const o = Object.assign({}, L.opts, ev[4] || {});
    const dur = len * sd;
    const fr = (d) => this.freq(d, L.oct + (o.oct || 0), scale);
    switch (L.inst) {
      case 'oud': case 'kanun': case 'saz': case 'bass':
        A.pluck(L.inst, fr(what), t, { vel, dest: L.node, pan: o.pan != null ? o.pan : L.pan, hall: o.hall, room: o.room, dur: o.cut ? dur : undefined });
        break;
      case 'ney':
        A.ney(fr(what), t, dur, { vel, dest: L.node, vib: o.vib, scoop: o.scoop, to: ev[4] && ev[4].to != null ? fr(ev[4].to) : undefined, glideLen: o.glideLen, hall: o.hall, breath: o.breath, pan: o.pan != null ? o.pan : L.pan, attack: o.attack, release: o.release });
        break;
      case 'strings':
        A.strings((Array.isArray(what) ? what : [what]).map(fr), t, dur, { vel, dest: L.node, attack: o.attack, release: o.release, bright: o.bright, hall: o.hall, pan: L.pan });
        break;
      case 'choir':
        A.choir((Array.isArray(what) ? what : [what]).map(fr), t, dur, { vel, dest: L.node, vowel: o.vowel, attack: o.attack, release: o.release, hall: o.hall });
        break;
      case 'sub':
        A.sub(fr(what), t, dur, { vel, dest: L.node, to: ev[4] && ev[4].to != null ? fr(ev[4].to) : undefined });
        break;
      default: break;
    }
  }
  // Im Fokus: nur Ney + Drohne (wenn die Cue eine 'focus'-Stimmung kennt), danach zurück
  focus(on) {
    if (on) { if (this.cue && this.cue.moods && this.cue.moods.focus && this.moodName !== 'focus') { this._m0 = this.moodName; this.mood('focus', 0.5); } }
    else if (this._m0 && this.cue) { this.mood(this._m0, 0.9); this._m0 = null; }
  }
  // Sekunden bis zum nächsten Schlag (für Schnitt-auf-Beat)
  nextBeatIn() {
    if (!this.cue) return 0;
    const sd = this.stepDur * 4, now = this.A.ctx.currentTime;
    const el = Math.max(0, now - this.startedAt);
    return sd - (el % sd);
  }
}
