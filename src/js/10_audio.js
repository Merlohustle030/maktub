// =====================================================================
// Audio-Engine: alles wird live per Web Audio synthetisiert.
//  Oud/Kanun: Karplus-Strong (Allpass-Fraktionalverzögerung -> exakte Maqam-Stimmung), Korpus-Resonanzen
//  Ney: Periodic-Wave + gefiltertes Rauschen + Vibrato/Scoop   Streicher/Chor: verstimmte Sägezähne + Formanten
//  808: Sinus mit Pitch-Hüllkurve + Sättigung   Hall: generierte Impulsantworten
// Die Engine läuft auf jedem BaseAudioContext (auch OfflineAudioContext -> Analyse-Tests).
// =====================================================================

// --- kleine DSP-Helfer (auf Float32Array) ---
function biqCoef(type, f0, Q, gainDb, sr) {
  const A = Math.pow(10, gainDb / 40), w0 = (TAU * f0) / sr, cw = Math.cos(w0), sw = Math.sin(w0), al = sw / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
  else if (type === 'lowpass') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (type === 'highpass') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (type === 'lowshelf') { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) - (A - 1) * cw + s); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s); a0 = (A + 1) + (A - 1) * cw + s; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s; }
  else { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cw + s); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s); a0 = (A + 1) - (A - 1) * cw + s; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s; } // highshelf
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function biqRun(d, c) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const [b0, b1, b2, a1, a2] = c;
  for (let i = 0; i < d.length; i++) {
    const x0 = d[i], y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0; d[i] = y0;
  }
}

// Karplus-Strong mit Allpass-Fraktionalverzögerung. Gibt Mono-Samples zurück.
function ksRender(sr, f, o) {
  const N = Math.floor(sr * o.dur);
  const out = new Float32Array(N);
  const rng = new RNG(((o.seed || 1) * 7919 + Math.floor(f * 100)) >>> 0);
  for (const st of o.strings) {
    const fs = f * Math.pow(2, st.det / 1200);
    const s = o.loop;
    const Lf = sr / fs - s;
    let Ni = Math.floor(Lf), d = Lf - Ni;
    if (d < 0.5) { Ni -= 1; d += 1; }
    const C = (1 - d) / (1 + d);
    const buf = new Float32Array(Ni);
    let lp = 0;
    for (let i = 0; i < Ni; i++) { lp += ((rng.next() * 2 - 1) - lp) * o.excite; buf[i] = lp; }
    const pp = Math.max(1, Math.floor(Ni * o.pos));
    const tmp = buf.slice();
    let mean = 0;
    for (let i = 0; i < Ni; i++) { buf[i] = tmp[i] - tmp[(i + pp) % Ni]; mean += buf[i]; }
    mean /= Ni;
    let pk = 1e-9;
    for (let i = 0; i < Ni; i++) { buf[i] -= mean; pk = Math.max(pk, Math.abs(buf[i])); }
    for (let i = 0; i < Ni; i++) buf[i] /= pk;
    const T60 = o.t60 * Math.pow(220 / fs, o.t60k);
    const rho = Math.pow(10, -3 / (fs * T60));
    let idx = 0, xPrev = 0, apX = 0, apY = 0;
    for (let n = 0; n < N; n++) {
      const x = buf[idx];
      const lpo = ((1 - s) * x + s * xPrev) * rho; xPrev = x;
      const y = C * lpo + apX - C * apY; apX = lpo; apY = y;
      buf[idx] = y; if (++idx >= Ni) idx = 0;
      out[n] += y * st.amp;
    }
  }
  // Anzupf-Klick
  const nClick = Math.floor(sr * 0.006);
  let cp = 0;
  for (let i = 0; i < nClick; i++) { const v = rng.next() * 2 - 1; const hp = v - cp; cp = v; out[i] += hp * o.click * (1 - i / nClick); }
  for (const b of o.body) biqRun(out, biqCoef(b[0], b[1], b[2], b[3], sr));
  // Peak normalisieren, weich ausblenden
  let peak = 1e-9;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
  const nf = Math.floor(sr * 0.08);
  for (let i = 0; i < N; i++) { let g = 0.9 / peak; if (i > N - nf) g *= (N - i) / nf; out[i] *= g; }
  return out;
}

const KS_KINDS = {
  oud: {
    dur: 3.0, loop: 0.44, t60: 3.4, t60k: 0.45, pos: 0.13, click: 0.10,
    strings: [{ det: -3, amp: 0.55 }, { det: 4.5, amp: 0.55 }],
    body: [['lowshelf', 130, 0.8, 4], ['peak', 235, 1.4, 3], ['peak', 480, 2.0, 2.5], ['lowpass', 5200, 0.7, 0]],
    excite: [0.42, 0.6, 0.85],
  },
  kanun: {
    dur: 3.6, loop: 0.30, t60: 4.6, t60k: 0.35, pos: 0.09, click: 0.14,
    strings: [{ det: -2.5, amp: 0.4 }, { det: 0, amp: 0.4 }, { det: 3, amp: 0.4 }],
    body: [['peak', 900, 1.2, 2.5], ['peak', 2300, 1.5, 2], ['highshelf', 5000, 0.7, 1.5], ['lowpass', 9500, 0.7, 0]],
    excite: [0.55, 0.75, 0.95],
  },
  saz: {
    dur: 2.4, loop: 0.40, t60: 2.0, t60k: 0.5, pos: 0.10, click: 0.16,
    strings: [{ det: -2, amp: 0.5 }, { det: 3, amp: 0.5 }],
    body: [['peak', 300, 1.5, 3], ['peak', 1200, 1.8, 3.5], ['lowpass', 6500, 0.7, 0]],
    excite: [0.5, 0.7, 0.9],
  },
  // weich, dumpf, mit langem Ausklang: Zupf-Bass (Drohnen)
  bass: {
    dur: 4.2, loop: 0.48, t60: 5.5, t60k: 0.3, pos: 0.18, click: 0.05,
    strings: [{ det: -2, amp: 0.6 }, { det: 2, amp: 0.6 }],
    body: [['lowshelf', 120, 0.8, 5], ['peak', 200, 1.2, 3], ['lowpass', 1800, 0.7, 0]],
    excite: [0.3, 0.4, 0.55],
  },
};

const VOWELS = { ah: [[800, 1], [1150, 0.5], [2900, 0.25]], oh: [[450, 1], [800, 0.45], [2830, 0.12]], oo: [[325, 1], [700, 0.35], [2530, 0.1]] };

class AudioEngine {
  constructor(ctx, o = {}) {
    this.ctx = ctx; this.sr = ctx.sampleRate; this.ready = true; this.offline = !!o.offline;
    this.rng = new RNG(o.seed || 99);
    const c = ctx;
    // --- Bus-Graph ---
    this.master = c.createGain(); this.master.gain.value = 0.82;
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -9; this.limiter.knee.value = 12; this.limiter.ratio.value = 9;
    this.limiter.attack.value = 0.004; this.limiter.release.value = 0.22;
    // Soft-Clipper hinter dem Limiter: nie hartes Clipping, sondern warme Sättigung
    this.clip = c.createWaveShaper();
    const cv = new Float32Array(2048);
    for (let i = 0; i < cv.length; i++) { const x = (i / (cv.length - 1)) * 2 - 1; cv[i] = Math.tanh(x * 1.25) / Math.tanh(1.25); }
    this.clip.curve = cv; this.clip.oversample = '2x';
    this.master.connect(this.limiter); this.limiter.connect(this.clip); this.clip.connect(c.destination);
    this.dryMix = c.createGain(); this.dryMix.connect(this.master);
    this.worldLP = c.createBiquadFilter(); this.worldLP.type = 'lowpass'; this.worldLP.frequency.value = Math.min(20000, this.sr * 0.45); this.worldLP.Q.value = 0.5;
    this.worldLP.connect(this.dryMix);
    this.bus = {};
    for (const n of ['music', 'sfx', 'amb', 'ui']) { const g = c.createGain(); g.connect(this.worldLP); this.bus[n] = g; }
    this.bus.clean = c.createGain(); this.bus.clean.connect(this.dryMix);
    this.vol = { music: 0.8, sfx: 0.9 };
    this.hall = this._reverb(4.2, 2.6, 7500, 1400, 0.03);
    this.room = this._reverb(1.1, 3.2, 9000, 2500, 0.004);
    this.hall.ret.connect(this.master); this.room.ret.connect(this.master);
    // Hall unterliegt dem Welt-Filter nicht ganz – im Fokus bleibt er, aber dunkler
    this._noise();
    this.cache = new Map();
    this.neyWave = c.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]), new Float32Array([0, 1, 0.38, 0.2, 0.1, 0.06, 0.035, 0.02, 0.01]));
  }

  setVolumes(music, sfx) {
    this.vol.music = music; this.vol.sfx = sfx;
    const t = this.ctx.currentTime;
    this.bus.music.gain.setTargetAtTime(music, t, 0.05);
    this.bus.clean.gain.setTargetAtTime(music, t, 0.05);
    this.bus.sfx.gain.setTargetAtTime(sfx, t, 0.05);
    this.bus.amb.gain.setTargetAtTime(sfx, t, 0.05);
    this.bus.ui.gain.setTargetAtTime(sfx, t, 0.05);
  }
  // Tiefpass über der Welt (Fokus / unter Wasser). Nur Herzschlag & Ney (bus.clean) bleiben klar.
  worldFilter(freq, dur = 0.3) {
    const t = this.ctx.currentTime;
    this.worldLP.frequency.cancelScheduledValues(t);
    this.worldLP.frequency.setValueAtTime(Math.max(60, this.worldLP.frequency.value), t);
    this.worldLP.frequency.exponentialRampToValueAtTime(Math.max(60, freq), t + Math.max(0.02, dur));
  }

  _reverb(sec, decay, lp0, lp1, pre) {
    const c = this.ctx, input = c.createGain(), ret = c.createGain();
    const conv = c.createConvolver(), dly = c.createDelay(0.5);
    dly.delayTime.value = pre;
    const len = Math.floor(this.sr * sec);
    const ir = c.createBuffer(2, len, this.sr);
    const r = new RNG(sec * 1000 + 3);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let y = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const a = lerp(lp0, lp1, Math.pow(t, 0.5));
        const k = 1 - Math.exp(-TAU * a / this.sr);
        y += ((r.next() * 2 - 1) - y) * k;
        const onset = Math.min(1, i / (this.sr * 0.012));
        d[i] = y * Math.pow(1 - t, decay) * onset * 2.4;
      }
      // frühe Reflexionen
      for (let k = 0; k < 9; k++) { const p = Math.floor(this.sr * (0.006 + r.next() * 0.07)); if (p < len) d[p] += (r.next() * 2 - 1) * 0.5; }
    }
    conv.buffer = ir;
    input.connect(dly); dly.connect(conv); conv.connect(ret);
    ret.gain.value = 0.55;
    return { input, ret, conv };
  }

  _noise() {
    const c = this.ctx, sr = this.sr, len = sr * 4;
    const mk = () => c.createBuffer(1, len, sr);
    const white = mk(), pink = mk(), brown = mk();
    const w = white.getChannelData(0), p = pink.getChannelData(0), b = brown.getChannelData(0);
    const r = new RNG(5);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const x = r.next() * 2 - 1;
      w[i] = x;
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
      last = (last + 0.02 * x) / 1.02; b[i] = last * 3.5;
    }
    // Schleifennaht weich überblenden (letzte 0.25 s in den Anfang)
    const xf = Math.floor(sr * 0.25);
    for (const d of [w, p, b]) for (let i = 0; i < xf; i++) { const a = i / xf; d[i] = d[i] * a + d[len - xf + i] * (1 - a); }
    this.noise = { white, pink, brown, len: len - xf };
  }
  noiseSrc(kind, t, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise[kind]; s.loop = true; s.loopEnd = this.noise.len / this.sr; s.playbackRate.value = rate;
    s.start(t, this.rng.next() * 2.5);
    return s;
  }

  // Routing: node -> [Gain] -> [Pan] -> bus (+ Sends)
  out(node, o = {}) {
    const c = this.ctx;
    let n = node;
    if (o.gain != null && o.gain !== 1) { const g = c.createGain(); g.gain.value = o.gain; n.connect(g); n = g; }
    if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); n.connect(p); n = p; }
    n.connect(o.dest || this.bus[o.bus || 'music']);
    if (o.hall > 0) { const s = c.createGain(); s.gain.value = o.hall; n.connect(s); s.connect(this.hall.input); }
    if (o.room > 0) { const s = c.createGain(); s.gain.value = o.room; n.connect(s); s.connect(this.room.input); }
    return n;
  }

  // ---------------- Gezupfte Saiten ----------------
  ksBuffer(kind, f, bucket) {
    const key = kind + ':' + f.toFixed(2) + ':' + bucket;
    let b = this.cache.get(key);
    if (b) return b;
    const k = KS_KINDS[kind];
    const data = ksRender(this.sr, f, Object.assign({}, k, { excite: k.excite[bucket], seed: bucket + 1 }));
    b = this.ctx.createBuffer(1, data.length, this.sr);
    b.getChannelData(0).set(data);
    this.cache.set(key, b);
    return b;
  }
  pluck(kind, f, t, o = {}) {
    const vel = o.vel != null ? o.vel : 0.7;
    const bucket = vel < 0.5 ? 0 : vel < 0.8 ? 1 : 2;
    const src = this.ctx.createBufferSource();
    src.buffer = this.ksBuffer(kind, f, bucket);
    const g = this.ctx.createGain();
    const amp = (o.gain != null ? o.gain : 1) * Math.pow(vel, 1.2) * 0.85;
    g.gain.value = amp;
    if (o.dur) { g.gain.setValueAtTime(amp, t + o.dur); g.gain.setTargetAtTime(0, t + o.dur, o.damp || 0.07); }
    src.connect(g);
    this.out(g, { bus: o.bus || 'music', dest: o.dest, pan: o.pan || 0, hall: o.hall != null ? o.hall : 0.32, room: o.room != null ? o.room : 0.07 });
    src.start(t);
    return src;
  }

  // ---------------- Ney ----------------
  ney(f, t, dur, o = {}) {
    const c = this.ctx, vel = o.vel != null ? o.vel : 0.7;
    const osc = c.createOscillator();
    osc.setPeriodicWave(this.neyWave);
    const scoop = o.scoop != null ? o.scoop : -55;
    osc.frequency.setValueAtTime(f * Math.pow(2, scoop / 1200), t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.075);
    if (o.to) { // Glissando in eine Zielnote (Cent-basiert / Frequenz)
      const gt = t + Math.max(0.1, dur - (o.glideLen || 0.25));
      osc.frequency.setValueAtTime(f, gt);
      osc.frequency.exponentialRampToValueAtTime(o.to, gt + (o.glideLen || 0.25));
    }
    const lfo = c.createOscillator(); lfo.frequency.value = 5.0 + this.rng.next() * 0.7;
    const lg = c.createGain();
    const vib = o.vib != null ? o.vib : 14;
    lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + 0.22); lg.gain.linearRampToValueAtTime(vib, t + 0.22 + Math.min(0.7, dur * 0.6));
    lfo.connect(lg); lg.connect(osc.detune);
    const trem = c.createOscillator(); trem.frequency.value = 4.6 + this.rng.next() * 0.9;
    const tg = c.createGain(); tg.gain.value = 0.05 * vel; trem.connect(tg);
    const g = c.createGain();
    const peak = 0.55 * vel, sus = peak * 0.8, atk = o.attack != null ? o.attack : 0.09;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + atk);
    g.gain.setTargetAtTime(sus, t + atk, 0.22);
    const rel = o.release != null ? o.release : 0.16;
    g.gain.setValueAtTime(sus, Math.max(t + atk + 0.02, t + dur));
    g.gain.setTargetAtTime(0.0001, t + dur, rel * 0.5);
    tg.connect(g.gain);
    // Atem
    const nz = this.noiseSrc('white', t);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(9000, f * 2.15); bp.Q.value = 1.3;
    const ng = c.createGain();
    const br = (o.breath != null ? o.breath : 1) * vel;
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.34 * br, t + 0.035);
    ng.gain.setTargetAtTime(0.12 * br, t + 0.05, 0.1);
    ng.gain.setValueAtTime(0.12 * br, t + dur); ng.gain.setTargetAtTime(0, t + dur, rel * 0.4);
    const air = c.createBiquadFilter(); air.type = 'highpass'; air.frequency.value = 3800;
    const ag = c.createGain(); ag.gain.value = 0.05 * br;
    nz.connect(bp); bp.connect(ng);
    nz.connect(air); air.connect(ag);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2300 + f * 1.4; lp.Q.value = 0.6;
    const wood = c.createBiquadFilter(); wood.type = 'peaking'; wood.frequency.value = 1350; wood.Q.value = 0.9; wood.gain.value = 3;
    osc.connect(g); g.connect(lp); ng.connect(lp); ag.connect(lp); lp.connect(wood);
    this.out(wood, { bus: 'clean', dest: o.dest, pan: o.pan || 0, hall: o.hall != null ? o.hall : 0.5, room: 0.05, gain: o.gain != null ? o.gain : 1 });
    const end = t + dur + rel * 3 + 0.2;
    osc.start(t); lfo.start(t); trem.start(t); osc.stop(end); lfo.stop(end); trem.stop(end); nz.stop(end);
  }

  // ---------------- Streicher (verstimmte Sägezähne) ----------------
  strings(freqs, t, dur, o = {}) {
    const c = this.ctx, vel = o.vel != null ? o.vel : 0.6;
    const atk = o.attack != null ? o.attack : 0.9, rel = o.release != null ? o.release : 1.3;
    const bright = o.bright != null ? o.bright : 1;
    const dets = [-12, -4, 5, 13];
    const master = c.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.linearRampToValueAtTime(0.11 * vel, t + atk);
    master.gain.setValueAtTime(0.11 * vel, t + Math.max(atk, dur));
    master.gain.setTargetAtTime(0.0001, t + Math.max(atk, dur), rel * 0.4);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(600 * bright, t); lp.frequency.linearRampToValueAtTime((1200 + vel * 1700) * bright, t + atk * 1.2);
    const lfo = c.createOscillator(); lfo.frequency.value = 0.11 + this.rng.next() * 0.05;
    const lfoG = c.createGain(); lfoG.gain.value = 260 * bright; lfo.connect(lfoG); lfoG.connect(lp.frequency);
    const vibO = c.createOscillator(); vibO.frequency.value = 5.0; const vibG = c.createGain();
    vibG.gain.setValueAtTime(0, t); vibG.gain.linearRampToValueAtTime(o.vib != null ? o.vib : 6, t + atk + 0.8); vibO.connect(vibG);
    const end = t + Math.max(atk, dur) + rel * 2 + 0.2;
    const oscs = [];
    for (const f of freqs) {
      for (const d of dets) {
        const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.detune.value = d + (this.rng.next() - 0.5) * 3;
        vibG.connect(s.detune);
        const sg = c.createGain(); sg.gain.value = 1 / (dets.length * Math.sqrt(freqs.length));
        s.connect(sg); sg.connect(master); oscs.push(s);
      }
    }
    master.connect(lp);
    this.out(lp, { bus: 'music', dest: o.dest, pan: o.pan || 0, hall: o.hall != null ? o.hall : 0.55, room: 0.1, gain: o.gain != null ? o.gain : 1 });
    oscs.forEach((s) => { s.start(t); s.stop(end); });
    lfo.start(t); lfo.stop(end); vibO.start(t); vibO.stop(end);
  }

  // ---------------- Chor-Flächen (Vokal-Formanten) ----------------
  choir(freqs, t, dur, o = {}) {
    const c = this.ctx, vel = o.vel != null ? o.vel : 0.5;
    const atk = o.attack != null ? o.attack : 1.6, rel = o.release != null ? o.release : 2.0;
    const form = VOWELS[o.vowel || 'ah'];
    const master = c.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.linearRampToValueAtTime(0.16 * vel, t + atk);
    master.gain.setValueAtTime(0.16 * vel, t + Math.max(atk, dur));
    master.gain.setTargetAtTime(0.0001, t + Math.max(atk, dur), rel * 0.4);
    const end = t + Math.max(atk, dur) + rel * 2 + 0.2;
    const vib = c.createOscillator(); vib.frequency.value = 5.2; const vg = c.createGain(); vg.gain.value = 9; vib.connect(vg);
    const src = c.createGain();
    for (const f of freqs) for (const d of [-8, 7]) {
      const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.detune.value = d; vg.connect(s.detune);
      const sg = c.createGain(); sg.gain.value = 0.5 / Math.sqrt(freqs.length); s.connect(sg); sg.connect(src); s.start(t); s.stop(end);
    }
    const nz = this.noiseSrc('pink', t); const ng = c.createGain(); ng.gain.value = 0.12; nz.connect(ng); ng.connect(src); nz.stop(end);
    for (const [ff, amp] of form) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 6;
      const bg = c.createGain(); bg.gain.value = amp * 2.2;
      src.connect(bp); bp.connect(bg); bg.connect(master);
    }
    this.out(master, { bus: 'music', dest: o.dest, pan: o.pan || 0, hall: o.hall != null ? o.hall : 0.8, room: 0.05 });
    vib.start(t); vib.stop(end);
  }

  // ---------------- 808 / Sub ----------------
  sub(f, t, dur, o = {}) {
    const c = this.ctx, vel = o.vel != null ? o.vel : 0.8;
    const osc = c.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(f * 2.4, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur * 0.9);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.75, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const sh = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 2.2); }
    sh.curve = curve;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    osc.connect(g); g.connect(sh); sh.connect(lp);
    this.out(lp, { bus: 'music', dest: o.dest, hall: o.hall || 0.04, gain: o.gain != null ? o.gain : 1 });
    osc.start(t); osc.stop(t + dur + 0.1);
  }

  // ---------------- Perkussion ----------------
  noiseHit(t, o) { // gefilterter Rauschstoß
    const c = this.ctx;
    const src = this.noiseSrc(o.kind || 'white', t);
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.value = o.freq; f.Q.value = o.q || 1;
    const g = c.createGain(); const a = o.amp;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + (o.atk || 0.001));
    g.gain.exponentialRampToValueAtTime(0.0005, t + (o.dec || 0.05));
    src.connect(f); f.connect(g); src.stop(t + (o.dec || 0.05) + 0.05);
    return g;
  }
  toneHit(t, f0, f1, dec, amp, type = 'sine') {
    const c = this.ctx, o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + Math.min(0.06, dec * 0.4));
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0005, t + dec);
    o.connect(g); o.start(t); o.stop(t + dec + 0.05);
    return g;
  }
  perc(name, t, vel = 0.8, o = {}) {
    const c = this.ctx, bus = o.bus || 'music', dest = o.dest;
    const mix = c.createGain(); mix.gain.value = 1;
    const to = (n) => n.connect(mix);
    const pan = o.pan || 0;
    let hall = 0.1, room = 0.12;
    switch (name) {
      case 'dum': to(this.toneHit(t, 175, 98, 0.32, 0.9 * vel)); to(this.noiseHit(t, { type: 'lowpass', freq: 900, amp: 0.25 * vel, dec: 0.03 })); break;
      case 'tek': to(this.noiseHit(t, { type: 'bandpass', freq: 3300, q: 2.6, amp: 0.55 * vel, dec: 0.045 })); to(this.toneHit(t, 1100, 900, 0.03, 0.12 * vel)); hall = 0.16; break;
      case 'ka': to(this.noiseHit(t, { type: 'bandpass', freq: 2300, q: 2.2, amp: 0.36 * vel, dec: 0.035 })); hall = 0.12; break;
      case 'bendir': to(this.toneHit(t, 120, 62, 0.55, 1.0 * vel)); to(this.noiseHit(t, { type: 'lowpass', freq: 600, amp: 0.3 * vel, dec: 0.05 })); to(this.noiseHit(t + 0.01, { type: 'highpass', freq: 5000, amp: 0.05 * vel, dec: 0.2, atk: 0.02 })); hall = 0.28; room = 0.2; break;
      case 'riq': for (let i = 0; i < 3; i++) to(this.noiseHit(t + i * 0.012, { type: 'highpass', freq: 7000, amp: 0.2 * vel, dec: 0.09 })); hall = 0.2; break;
      case 'hat': to(this.noiseHit(t, { type: 'highpass', freq: 7800, q: 0.7, amp: 0.34 * vel, dec: 0.028 })); room = 0.04; hall = 0.02; break;
      case 'ohat': to(this.noiseHit(t, { type: 'highpass', freq: 6800, q: 0.7, amp: 0.3 * vel, dec: 0.16 })); room = 0.06; break;
      case 'clap': for (let i = 0; i < 3; i++) to(this.noiseHit(t + i * 0.011, { type: 'bandpass', freq: 1500, q: 1.1, amp: 0.4 * vel, dec: 0.02 })); to(this.noiseHit(t + 0.033, { type: 'bandpass', freq: 1300, q: 1, amp: 0.4 * vel, dec: 0.16 })); hall = 0.22; room = 0.2; break;
      case 'kick': to(this.toneHit(t, 160, 45, 0.28, 1.0 * vel)); to(this.noiseHit(t, { type: 'lowpass', freq: 1500, amp: 0.2 * vel, dec: 0.012 })); hall = 0.03; break;
      case 'taiko': to(this.toneHit(t, 82, 36, 0.9, 1.0 * vel)); to(this.noiseHit(t, { type: 'lowpass', freq: 700, amp: 0.4 * vel, dec: 0.09 })); hall = 0.5; room = 0.3; break;
      case 'tick': to(this.toneHit(t, 2200, 1800, 0.02, 0.2 * vel, 'triangle')); hall = 0; room = 0.05; break;
      default: break;
    }
    this.out(mix, { bus, dest, pan, hall: o.hall != null ? o.hall : hall, room: o.room != null ? o.room : room, gain: o.gain != null ? o.gain : 1 });
  }
}
