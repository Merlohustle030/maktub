// =====================================================================
// Ambience-Loops (einmal in Puffer gerendert), Effekte, Herzschlag, Fassade "Snd"/"Mus"
// =====================================================================
function pinkFill(d, r, amp = 1) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < d.length; i++) {
    const x = r.next() * 2 - 1;
    b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
    b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11 * amp; b6 = x * 0.115926;
  }
}
function brownFill(d, r, amp = 1) { let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (r.next() * 2 - 1)) / 1.02; d[i] = last * 3.5 * amp; } }
function whiteFill(d, r, amp = 1) { for (let i = 0; i < d.length; i++) d[i] = (r.next() * 2 - 1) * amp; }
function addTo(d, s, k = 1) { for (let i = 0; i < d.length; i++) d[i] += s[i] * k; }
function seamless(d, N, xf) { // die letzten xf Samples in den Anfang überblenden -> nahtlose Schleife
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = d[i];
  for (let i = 0; i < xf; i++) { const a = i / xf; out[i] = d[i] * a + d[N + i] * (1 - a); }
  return out;
}
function normalize(d, peak) { let m = 1e-9; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); const g = peak / m; for (let i = 0; i < d.length; i++) d[i] *= g; }
function slowNoise(n, sr, hz, r) { // langsame zufällige Kurve 0..1
  const out = new Float32Array(n), step = Math.max(1, Math.floor(sr / hz));
  let a = r.next(), b = r.next();
  for (let i = 0; i < n; i++) {
    const k = (i % step) / step;
    if (i % step === 0 && i > 0) { a = b; b = r.next(); }
    const s = k * k * (3 - 2 * k);
    out[i] = a + (b - a) * s;
  }
  return out;
}
function dropTicks(chan, sr, r, rate, f0, f1, a0, a1, decayMs) {
  const M = chan.length;
  let t = 0;
  for (;;) {
    t += (-Math.log(1 - r.next()) / rate) * sr;
    const i = Math.floor(t);
    if (i >= M - 2000) break;
    const f = r.range(f0, f1), a = r.range(a0, a1), dec = sr * (decayMs / 1000) * r.range(0.6, 1.4);
    const len = Math.floor(dec * 5);
    for (let k = 0; k < len; k++) chan[i + k] += a * Math.sin((TAU * f * k) / sr) * Math.exp(-k / dec);
  }
}

const AMB_GEN = {
  rain(sr) {
    const sec = 12, N = Math.floor(sr * sec), xf = Math.floor(sr * 0.6), M = N + xf, r = new RNG(21);
    const chans = [];
    for (let c = 0; c < 2; c++) {
      const d = new Float32Array(M); pinkFill(d, r, 1.0);
      biqRun(d, biqCoef('highpass', 420, 0.7, 0, sr)); biqRun(d, biqCoef('lowpass', 7000, 0.7, 0, sr));
      const gust = slowNoise(M, sr, 0.35, r);
      for (let i = 0; i < M; i++) d[i] *= 0.7 + gust[i] * 0.5;
      const rum = new Float32Array(M); brownFill(rum, r, 1); biqRun(rum, biqCoef('lowpass', 240, 0.7, 0, sr)); addTo(d, rum, 0.75);
      dropTicks(d, sr, r, 70, 1600, 5200, 0.03, 0.16, 3.5);
      dropTicks(d, sr, r, 4.5, 900, 2600, 0.05, 0.13, 22);
      chans.push(seamless(d, N, xf));
    }
    normalize(chans[0], 0.55); normalize(chans[1], 0.55);
    return chans;
  },
  fridge(sr) {
    const sec = 40, N = Math.floor(sr * sec), r = new RNG(8);
    const d = new Float32Array(N);
    const rum = new Float32Array(N); brownFill(rum, r, 1); biqRun(rum, biqCoef('lowpass', 160, 0.7, 0, sr));
    for (let i = 0; i < N; i++) {
      const t = i / sr;
      let on = 1;
      if (t > 26.4 && t < 27.0) on = 1 - (t - 26.4) / 0.6 * 0.85; else if (t >= 27.0 && t < 39.6) on = 0.15; else if (t >= 39.6) on = 0.15 + (t - 39.6) / 0.4 * 0.85;
      const wob = 1 + 0.06 * Math.sin(TAU * 0.27 * t);
      const h = Math.sin(TAU * 50 * t) * 0.5 + Math.sin(TAU * 100 * t) * 0.38 + Math.sin(TAU * 150 * t) * 0.16 + Math.sin(TAU * 200 * t + 1) * 0.06 + Math.sin(TAU * 300 * t) * 0.03;
      d[i] = h * on * wob * 0.7 + rum[i] * 0.9 * (0.4 + on * 0.6);
    }
    // Kompressor-Klicks beim Ein-/Ausschalten
    for (const t0 of [0.02, 26.4]) { const i0 = Math.floor(t0 * sr); for (let k = 0; k < sr * 0.05; k++) d[i0 + k] += Math.sin(TAU * 90 * k / sr) * Math.exp(-k / (sr * 0.012)) * 0.9 + (r.next() - 0.5) * Math.exp(-k / (sr * 0.004)) * 0.5; }
    biqRun(d, biqCoef('lowpass', 900, 0.7, 0, sr));
    normalize(d, 0.6);
    return [d];
  },
  clock(sr) {
    const N = Math.floor(sr * 2), d = new Float32Array(N), r = new RNG(3);
    const tick = (t0, f, amp) => {
      const i0 = Math.floor(t0 * sr);
      for (let k = 0; k < sr * 0.06; k++) {
        const t = k / sr;
        d[i0 + k] += amp * (Math.sin(TAU * f * t) * Math.exp(-t / 0.0055) + Math.sin(TAU * f * 0.31 * t) * Math.exp(-t / 0.014) * 0.7 + (r.next() - 0.5) * Math.exp(-t / 0.0012) * 1.2);
      }
    };
    tick(0.0, 1900, 0.6); tick(1.0, 1500, 0.5);
    biqRun(d, biqCoef('lowpass', 6000, 0.7, 0, sr));
    return [d];
  },
  wind(sr) {
    const sec = 22, N = Math.floor(sr * sec), xf = Math.floor(sr * 1), M = N + xf, r = new RNG(44);
    const chans = [];
    for (let c = 0; c < 2; c++) {
      const d = new Float32Array(M); pinkFill(d, r, 1);
      biqRun(d, biqCoef('bandpass', 520, 0.6, 0, sr)); biqRun(d, biqCoef('lowpass', 1800, 0.7, 0, sr));
      const g = slowNoise(M, sr, 0.12, r), g2 = slowNoise(M, sr, 0.5, r);
      for (let i = 0; i < M; i++) d[i] *= 0.15 + g[i] * g[i] * 1.1 + g2[i] * 0.15;
      const w = new Float32Array(M); whiteFill(w, r, 1); biqRun(w, biqCoef('bandpass', 1150 + c * 90, 14, 0, sr));
      const wg = slowNoise(M, sr, 0.18, r);
      for (let i = 0; i < M; i++) d[i] += w[i] * wg[i] * wg[i] * g[i] * 5.5;
      chans.push(seamless(d, N, xf));
    }
    normalize(chans[0], 0.5); normalize(chans[1], 0.5);
    return chans;
  },
  city(sr) {
    const sec = 24, N = Math.floor(sr * sec), xf = Math.floor(sr * 1), M = N + xf, r = new RNG(66);
    const chans = [];
    for (let c = 0; c < 2; c++) {
      const d = new Float32Array(M); brownFill(d, r, 1); biqRun(d, biqCoef('lowpass', 340, 0.7, 0, sr));
      const hiss = new Float32Array(M); pinkFill(hiss, r, 1); biqRun(hiss, biqCoef('bandpass', 1400, 0.5, 0, sr));
      const slow = slowNoise(M, sr, 0.2, r);
      for (let i = 0; i < M; i++) d[i] = d[i] * (0.7 + slow[i] * 0.5) + hiss[i] * 0.16 * (0.5 + slow[i]);
      // Autos ziehen vorbei
      for (let k = 0; k < 6; k++) {
        const t0 = r.range(1, sec - 5) * sr, len = r.range(2.2, 4.0) * sr, sgn = k % 2 ? 1 : -1;
        const w = new Float32Array(Math.floor(len)); pinkFill(w, r, 1);
        biqRun(w, biqCoef('bandpass', 700, 0.9, 0, sr));
        for (let i = 0; i < w.length; i++) {
          const p = i / w.length, env = Math.sin(Math.PI * p) ** 2.2;
          const pan = c === 0 ? (sgn > 0 ? 1 - p : p) : (sgn > 0 ? p : 1 - p);
          d[Math.floor(t0) + i] += w[i] * env * (0.25 + 0.75 * pan) * 0.55;
        }
      }
      chans.push(seamless(d, N, xf));
    }
    normalize(chans[0], 0.5); normalize(chans[1], 0.5);
    return chans;
  },
  crowd(sr) {
    const sec = 20, N = Math.floor(sr * sec), xf = Math.floor(sr * 1), M = N + xf, r = new RNG(77);
    const L = new Float32Array(M), R = new Float32Array(M);
    for (let v = 0; v < 9; v++) {
      const d = new Float32Array(M); pinkFill(d, r, 1);
      const f0 = r.range(380, 900);
      biqRun(d, biqCoef('bandpass', f0, 2.6, 0, sr)); biqRun(d, biqCoef('peak', f0 * 2.6, 3, 6, sr));
      const syl = slowNoise(M, sr, r.range(3, 5.5), r), phrase = slowNoise(M, sr, r.range(0.25, 0.6), r);
      const pan = r.range(0.15, 0.85);
      for (let i = 0; i < M; i++) { const e = Math.pow(syl[i], 2.2) * Math.pow(phrase[i], 1.6); L[i] += d[i] * e * (1 - pan); R[i] += d[i] * e * pan; }
    }
    const a = seamless(L, N, xf), b = seamless(R, N, xf);
    normalize(a, 0.5); normalize(b, 0.5);
    return [a, b];
  },
  birds(sr) {
    const sec = 30, N = Math.floor(sr * sec), r = new RNG(90), L = new Float32Array(N + sr * 2), R = new Float32Array(N + sr * 2);
    const chirp = (t0, f, glide, len, amp, pan) => {
      const i0 = Math.floor(t0 * sr), n = Math.floor(len * sr);
      let ph = 0;
      for (let k = 0; k < n; k++) {
        const p = k / n, ff = f * (1 + glide * (p - 0.5) + 0.03 * Math.sin(p * 40)), env = Math.sin(Math.PI * p) ** 1.5;
        ph += (TAU * ff) / sr; const s = Math.sin(ph) * env * amp;
        L[i0 + k] += s * (1 - pan); R[i0 + k] += s * pan;
      }
    };
    for (let k = 0; k < 26; k++) {
      const t0 = r.range(0.2, sec - 0.5), pan = r.range(0.1, 0.9), f = r.range(2600, 4600), amp = r.range(0.05, 0.13);
      if (r.chance(0.5)) chirp(t0, f, r.range(0.2, 0.7), r.range(0.05, 0.11), amp, pan);
      else for (let j = 0; j < r.int(3, 7); j++) chirp(t0 + j * 0.085, f * (1 + j * 0.02), -0.3, 0.05, amp * 0.8, pan);
    }
    const a = seamless(L, N, Math.floor(sr * 1)), b = seamless(R, N, Math.floor(sr * 1));
    return [a, b];
  },
  room(sr) { // sehr leise Raumfüllung: nachts, Plattenbau
    const sec = 16, N = Math.floor(sr * sec), xf = Math.floor(sr * 1), M = N + xf, r = new RNG(12);
    const chans = [];
    for (let c = 0; c < 2; c++) {
      const d = new Float32Array(M); brownFill(d, r, 1); biqRun(d, biqCoef('lowpass', 120, 0.7, 0, sr));
      const p = new Float32Array(M); pinkFill(p, r, 1); biqRun(p, biqCoef('bandpass', 600, 0.4, 0, sr));
      addTo(d, p, 0.05);
      chans.push(seamless(d, N, xf));
    }
    normalize(chans[0], 0.4); normalize(chans[1], 0.4);
    return chans;
  },
};

Object.assign(AudioEngine.prototype, {
  // ---------- Ambience ----------
  ambBuffer(name) {
    this.ambBuf = this.ambBuf || {};
    if (this.ambBuf[name]) return this.ambBuf[name];
    const ch = AMB_GEN[name](this.sr);
    const b = this.ctx.createBuffer(ch.length, ch[0].length, this.sr);
    ch.forEach((d, i) => b.getChannelData(i).set(d));
    return (this.ambBuf[name] = b);
  },
  // Schicht sanft ein-/ausblenden. o: {lp: Tiefpass-Hz, hp: Hochpass-Hz, rate}
  ambSet(name, level, fade = 2, o = {}) {
    const c = this.ctx, now = c.currentTime;
    this.ambL = this.ambL || {};
    let L = this.ambL[name];
    if (!L && level <= 0) return;
    if (!L) {
      const src = c.createBufferSource(); src.buffer = this.ambBuffer(name); src.loop = true;
      src.playbackRate.value = o.rate || 1;
      const g = c.createGain(); g.gain.value = 0;
      let n = src;
      if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.5; n.connect(f); n = f; L = { lp: f }; }
      if (o.hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; n.connect(f); n = f; }
      n.connect(g); g.connect(this.bus.amb);
      if (o.room) { const s = c.createGain(); s.gain.value = o.room; g.connect(s); s.connect(this.room.input); }
      src.start(now, this.rng.next() * 5);
      L = Object.assign(L || {}, { src, g, name });
      this.ambL[name] = L;
    }
    if (o.lp && L.lp) L.lp.frequency.setTargetAtTime(o.lp, now, 0.3);
    L.g.gain.cancelScheduledValues(now);
    L.g.gain.setTargetAtTime(level, now, Math.max(0.02, fade / 3));
    if (level <= 0) {
      const src = L.src, g = L.g; delete this.ambL[name];
      if (this.offline) return;
      setTimeout(() => { try { src.stop(); g.disconnect(); } catch (e) { /* egal */ } }, fade * 1000 + 800);
    }
  },
  ambClear(fade = 2) { if (this.ambL) for (const k of Object.keys(this.ambL)) this.ambSet(k, 0, fade); },

  // ---------- Herzschlag ----------
  heartStart(bpm = 62, level = 0.6) {
    this.heart = this.heart || { on: false, bpm: 62, level: 0.6, timer: null };
    const h = this.heart; h.bpm = bpm; h.level = level;
    if (h.on) return;
    h.on = true;
    const beat = () => {
      if (!h.on) return;
      const t = this.ctx.currentTime + 0.03;
      this.thump(t, h.level, 58, 0.14); this.thump(t + 0.27 * (62 / h.bpm) ** 0.5, h.level * 0.62, 50, 0.16);
      h.timer = setTimeout(beat, (60 / h.bpm) * 1000);
    };
    beat();
  },
  heartSet(bpm, level) { if (this.heart) { this.heart.bpm = bpm != null ? bpm : this.heart.bpm; this.heart.level = level != null ? level : this.heart.level; } },
  heartStop() { if (this.heart) { this.heart.on = false; clearTimeout(this.heart.timer); } },
  thump(t, vel, f, dec) {
    const g = this.toneHit(t, f * 1.6, f, dec, 0.9 * vel);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; g.connect(lp);
    this.out(lp, { bus: 'clean', room: 0.08, hall: 0.05 });
  },

  // ---------- Schritte ----------
  step(surface = 'wood', o = {}) {
    const t = (o.t != null ? o.t : this.ctx.currentTime) + 0.005, v = (o.vel != null ? o.vel : 0.6) * (0.85 + Math.random() * 0.3);
    const mix = this.ctx.createGain();
    const to = (n) => n.connect(mix);
    let room = 0.1, hall = 0;
    const jit = 0.85 + Math.random() * 0.3;
    switch (surface) {
      case 'wood': to(this.toneHit(t, 110 * jit, 68, 0.07, 0.5 * v)); to(this.noiseHit(t, { type: 'bandpass', freq: 650 * jit, q: 0.9, amp: 0.32 * v, dec: 0.045 })); to(this.noiseHit(t + 0.004, { type: 'highpass', freq: 3000, amp: 0.05 * v, dec: 0.02 })); room = 0.16; break;
      case 'lino': to(this.noiseHit(t, { type: 'bandpass', freq: 2100 * jit, q: 0.8, amp: 0.4 * v, dec: 0.03 })); to(this.toneHit(t, 140, 90, 0.05, 0.25 * v)); room = 0.28; hall = 0.05; break;
      case 'cobble': to(this.noiseHit(t, { type: 'bandpass', freq: 1500 * jit, q: 0.8, amp: 0.4 * v, dec: 0.05 })); to(this.noiseHit(t + 0.006, { type: 'highpass', freq: 4200, amp: 0.13 * v, dec: 0.05 })); to(this.toneHit(t, 130, 80, 0.05, 0.25 * v)); room = 0.06; hall = 0.05; break;
      case 'marble': to(this.noiseHit(t, { type: 'bandpass', freq: 2600 * jit, q: 1.2, amp: 0.36 * v, dec: 0.025 })); to(this.toneHit(t, 200, 140, 0.05, 0.2 * v)); room = 0.3; hall = 0.22; break;
      case 'wet': to(this.noiseHit(t, { type: 'bandpass', freq: 1300 * jit, q: 0.7, amp: 0.36 * v, dec: 0.06 })); to(this.noiseHit(t + 0.01, { type: 'highpass', freq: 3500, amp: 0.16 * v, dec: 0.08 })); room = 0.05; hall = 0.06; break;
      case 'carpet': to(this.noiseHit(t, { type: 'lowpass', freq: 500, amp: 0.3 * v, dec: 0.06 })); to(this.toneHit(t, 90, 60, 0.06, 0.2 * v)); room = 0.03; break;
      case 'concrete': to(this.noiseHit(t, { type: 'bandpass', freq: 900 * jit, q: 0.9, amp: 0.38 * v, dec: 0.05 })); to(this.toneHit(t, 120, 75, 0.06, 0.3 * v)); room = 0.16; hall = 0.1; break;
      default: to(this.noiseHit(t, { type: 'lowpass', freq: 400, amp: 0.2 * v, dec: 0.05 })); break;
    }
    this.out(mix, { bus: 'sfx', pan: (o.pan || 0) + (Math.random() - 0.5) * 0.15, room, hall, gain: o.gain != null ? o.gain : 1 });
  },

  // ---------- Handy / Alltag ----------
  phoneBuzz(t = this.ctx.currentTime + 0.01, n = 2, o = {}) {
    const c = this.ctx;
    for (let i = 0; i < n; i++) {
      const t0 = t + i * 0.42;
      const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 168;
      const am = c.createOscillator(); am.frequency.value = 46; const ag = c.createGain(); ag.gain.value = 0.5; am.connect(ag);
      const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.35, t0 + 0.012); g.gain.setValueAtTime(0.35, t0 + 0.24); g.gain.linearRampToValueAtTime(0, t0 + 0.27);
      ag.connect(g.gain);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 280; bp.Q.value = 1.6;
      const wood = c.createBiquadFilter(); wood.type = 'peaking'; wood.frequency.value = 330; wood.gain.value = 6; wood.Q.value = 2;
      osc.connect(g); g.connect(bp); bp.connect(wood);
      const nz = this.noiseHit(t0, { type: 'bandpass', freq: 520, q: 0.9, amp: 0.1, dec: 0.25, atk: 0.02 }); nz.connect(wood);
      this.out(wood, { bus: 'sfx', pan: o.pan || 0, room: 0.22, gain: o.gain != null ? o.gain : 1 });
      osc.start(t0); am.start(t0); osc.stop(t0 + 0.3); am.stop(t0 + 0.3);
    }
  },
  notify(o = {}) { // dezenter Handy-Ton
    const t = this.ctx.currentTime + 0.01;
    [[880, 0], [1318.5, 0.11]].forEach(([f, dt]) => {
      const g = this.toneHit(t + dt, f, f, 0.9, 0.16, 'sine');
      const g2 = this.toneHit(t + dt, f * 2.76, f * 2.76, 0.25, 0.04, 'sine');
      this.out(g, { bus: 'ui', hall: 0.25, room: 0.12, gain: o.gain != null ? o.gain : 1 });
      this.out(g2, { bus: 'ui', hall: 0.25, room: 0.1 });
    });
  },
  ring(o = {}) { // weicher Klingelton (dreifaches Motiv)
    const t = this.ctx.currentTime + 0.01;
    [[659.3, 0], [880, 0.16], [784, 0.32]].forEach(([f, dt]) => {
      const g = this.toneHit(t + dt, f, f, 0.5, 0.15, 'triangle');
      this.out(g, { bus: 'ui', hall: 0.3, room: 0.15, gain: o.gain != null ? o.gain : 1 });
    });
  },
  pen(dur = 3, o = {}) { // Stift kratzt über Papier
    const c = this.ctx, t = (o.t != null ? o.t : c.currentTime) + 0.02, r = this.rng;
    const src = this.noiseSrc('white', t);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4300; bp.Q.value = 0.9;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const g = c.createGain(); g.gain.setValueAtTime(0, t);
    let x = 0;
    while (x < dur) {
      const len = 0.05 + r.next() * 0.11, amp = 0.05 + r.next() * 0.07;
      g.gain.setTargetAtTime(amp, t + x, 0.012); g.gain.setTargetAtTime(0, t + x + len, 0.012);
      x += len + 0.02 + r.next() * 0.06;
    }
    src.connect(hp); hp.connect(bp); bp.connect(g); src.stop(t + dur + 0.3);
    this.out(g, { bus: 'sfx', room: 0.1, gain: o.gain != null ? o.gain : 1 });
  },
  page(o = {}) { // Papier / Notizbuch
    const t = (o.t != null ? o.t : this.ctx.currentTime) + 0.01;
    const a = this.noiseHit(t, { type: 'bandpass', freq: 2400, q: 0.5, amp: 0.22, dec: 0.2, atk: 0.03 });
    const b = this.noiseHit(t + 0.09, { type: 'highpass', freq: 3500, amp: 0.12, dec: 0.1, atk: 0.01 });
    const m = this.ctx.createGain(); a.connect(m); b.connect(m);
    this.out(m, { bus: 'sfx', room: 0.15, gain: o.gain != null ? o.gain : 1 });
  },
  door(kind = 'close', o = {}) {
    const t = (o.t != null ? o.t : this.ctx.currentTime) + 0.01, m = this.ctx.createGain();
    if (kind === 'close') { this.toneHit(t, 90, 50, 0.25, 0.7).connect(m); this.noiseHit(t, { type: 'lowpass', freq: 900, amp: 0.4, dec: 0.08 }).connect(m); this.noiseHit(t + 0.06, { type: 'bandpass', freq: 2400, q: 2, amp: 0.15, dec: 0.02 }).connect(m); }
    else if (kind === 'creak') { const os = this.ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(190, t); os.frequency.linearRampToValueAtTime(260, t + 0.6); os.frequency.linearRampToValueAtTime(210, t + 0.9); const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 5; const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.2); g.gain.linearRampToValueAtTime(0, t + 0.95); os.connect(bp); bp.connect(g); g.connect(m); os.start(t); os.stop(t + 1); }
    else if (kind === 'lock') { this.noiseHit(t, { type: 'bandpass', freq: 3000, q: 3, amp: 0.25, dec: 0.02 }).connect(m); this.noiseHit(t + 0.12, { type: 'bandpass', freq: 2200, q: 3, amp: 0.2, dec: 0.02 }).connect(m); this.toneHit(t + 0.12, 300, 200, 0.04, 0.15).connect(m); }
    this.out(m, { bus: 'sfx', room: 0.25, hall: 0.05, gain: o.gain != null ? o.gain : 1 });
  },
  whoosh(dur = 0.8, o = {}) {
    const c = this.ctx, t = (o.t != null ? o.t : c.currentTime) + 0.01;
    const src = this.noiseSrc('pink', t), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(o.from || 300, t); bp.frequency.exponentialRampToValueAtTime(o.to || 3000, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35 * (o.gain || 1), t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp); bp.connect(g); src.stop(t + dur + 0.1);
    this.out(g, { bus: 'sfx', room: 0.15, hall: 0.2, pan: o.pan || 0 });
  },

  // ---------- Tiere / Stadt ----------
  meow(o = {}) {
    const c = this.ctx, t = (o.t != null ? o.t : c.currentTime) + 0.01, len = o.len || 0.6, f = o.f || 520;
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f * 0.86, t); osc.frequency.linearRampToValueAtTime(f * 1.32, t + len * 0.35); osc.frequency.linearRampToValueAtTime(f * 0.9, t + len);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.07); g.gain.setTargetAtTime(0.32, t + 0.1, 0.1); g.gain.setTargetAtTime(0, t + len * 0.85, 0.06);
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.setValueAtTime(900, t); f1.frequency.linearRampToValueAtTime(1500, t + len * 0.4); f1.Q.value = 4;
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2600; f2.Q.value = 5;
    const mix = c.createGain(); const g2 = c.createGain(); g2.gain.value = 0.4;
    osc.connect(g); g.connect(f1); g.connect(f2); f1.connect(mix); f2.connect(g2); g2.connect(mix);
    const vib = c.createOscillator(); vib.frequency.value = 6; const vg = c.createGain(); vg.gain.value = 9; vib.connect(vg); vg.connect(osc.detune);
    this.out(mix, { bus: 'sfx', pan: o.pan || 0, room: 0.2, hall: 0.12, gain: 0.55 * (o.gain != null ? o.gain : 1) });
    osc.start(t); vib.start(t); osc.stop(t + len + 0.3); vib.stop(t + len + 0.3);
  },
  purr(dur = 4, o = {}) {
    const c = this.ctx, t = (o.t != null ? o.t : c.currentTime) + 0.01;
    const src = this.noiseSrc('brown', t), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 130; bp.Q.value = 1.2;
    const am = c.createOscillator(); am.frequency.value = 24; const ag = c.createGain(); ag.gain.value = 0.5; am.connect(ag);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35 * (o.gain || 1), t + 0.8); g.gain.setValueAtTime(0.35 * (o.gain || 1), t + dur - 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    ag.connect(g.gain);
    src.connect(bp); bp.connect(g); this.out(g, { bus: 'sfx', room: 0.1 });
    am.start(t); am.stop(t + dur); src.stop(t + dur + 0.1);
  },
  bell(t, o = {}) { // FM-Glocke (Straßenbahn, Schulgong)
    const c = this.ctx, f = o.f || 1320, dec = o.dec || 1.2;
    const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * (o.ratio || 3.5);
    mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dec * 0.6); mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((o.amp || 0.3), t + 0.003); g.gain.exponentialRampToValueAtTime(0.0005, t + dec);
    car.connect(g); this.out(g, { bus: 'sfx', pan: o.pan || 0, hall: o.hall != null ? o.hall : 0.3, room: 0.1 });
    car.start(t); mod.start(t); car.stop(t + dec + 0.1); mod.stop(t + dec + 0.1);
  },
  tramBell(o = {}) { const t = this.ctx.currentTime + 0.02; this.bell(t, { pan: o.pan || 0, amp: 0.28 }); this.bell(t + 0.3, { pan: o.pan || 0, amp: 0.26 }); },
  tram(dur = 9, pan0 = -0.9, pan1 = 0.9, o = {}) {
    const c = this.ctx, t = this.ctx.currentTime + 0.02;
    const src = this.noiseSrc('brown', t), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const sq = this.noiseSrc('pink', t), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 6;
    const g = c.createGain(), sg = c.createGain(); g.gain.setValueAtTime(0, t);
    const peak = 0.5 * (o.gain || 1);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.5); g.gain.linearRampToValueAtTime(0, t + dur);
    sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(0.06 * (o.gain || 1), t + dur * 0.5); sg.gain.linearRampToValueAtTime(0, t + dur);
    const pn = c.createStereoPanner(); pn.pan.setValueAtTime(pan0, t); pn.pan.linearRampToValueAtTime(pan1, t + dur);
    src.connect(lp); lp.connect(g); sq.connect(bp); bp.connect(sg); g.connect(pn); sg.connect(pn);
    pn.connect(this.bus.sfx); const rs = c.createGain(); rs.gain.value = 0.15; pn.connect(rs); rs.connect(this.hall.input);
    src.stop(t + dur + 0.1); sq.stop(t + dur + 0.1);
  },
  pigeonWings(o = {}) {
    const c = this.ctx, t = (o.t != null ? o.t : c.currentTime) + 0.01;
    const src = this.noiseSrc('pink', t), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.8;
    const am = c.createOscillator(); am.frequency.value = 15; const ag = c.createGain(); ag.gain.value = 0.5; am.connect(ag);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4 * (o.gain || 1), t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    ag.connect(g.gain); src.connect(bp); bp.connect(g); this.out(g, { bus: 'sfx', pan: o.pan || 0, room: 0.12, hall: 0.06 });
    am.start(t); am.stop(t + 0.6); src.stop(t + 0.6);
  },
  coo(o = {}) {
    const c = this.ctx, t = (o.t != null ? o.t : c.currentTime) + 0.01;
    const osc = c.createOscillator(); osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t); osc.frequency.linearRampToValueAtTime(400, t + 0.12); osc.frequency.linearRampToValueAtTime(330, t + 0.4);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 2;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.05); g.gain.linearRampToValueAtTime(0.05, t + 0.16); g.gain.linearRampToValueAtTime(0.22, t + 0.24); g.gain.linearRampToValueAtTime(0, t + 0.5);
    osc.connect(f); f.connect(g); this.out(g, { bus: 'sfx', pan: o.pan || 0, room: 0.12, hall: 0.06, gain: o.gain != null ? o.gain : 1 });
    osc.start(t); osc.stop(t + 0.55);
  },
  clink(o = {}) { // Tasse/Glas
    const t = (o.t != null ? o.t : this.ctx.currentTime) + 0.01, m = this.ctx.createGain();
    const f = (o.f || 3200) * (0.9 + Math.random() * 0.2);
    this.toneHit(t, f, f, 0.5, 0.12).connect(m); this.toneHit(t, f * 1.51, f * 1.51, 0.3, 0.06).connect(m); this.noiseHit(t, { type: 'highpass', freq: 5000, amp: 0.08, dec: 0.01 }).connect(m);
    this.out(m, { bus: 'sfx', pan: o.pan || 0, room: 0.2, hall: 0.12, gain: o.gain != null ? o.gain : 1 });
  },

  // ---------- Filmische Momente ----------
  shimmer(t, freqs, vel = 0.5, o = {}) { // Glasschimmer
    const c = this.ctx;
    freqs.forEach((f, i) => {
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
      const g = c.createGain(); const st = t + i * 0.045;
      g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.06 * vel, st + 0.25); g.gain.exponentialRampToValueAtTime(0.0004, st + (o.dec || 3.2));
      osc.connect(g); this.out(g, { bus: 'music', dest: o.dest, pan: (i % 2 ? 1 : -1) * (0.2 + i * 0.08), hall: 0.95, room: 0.05 });
      osc.start(st); osc.stop(st + (o.dec || 3.2) + 0.1);
    });
  },
  // tiefer Sub-Impact mit Schimmer – der "Geldsound": kein Kassen-Ka-Ching
  impact(size = 1, o = {}) {
    const t = (o.t != null ? o.t : this.ctx.currentTime) + 0.02, sc = o.scale || MAQAM.hijaz, ton = o.tonic || TONIC;
    const f = (deg) => ton * Math.pow(2, semiOf(sc, deg) / 12);
    this.sub(f(-14) * 0.5 + 8, t, 1.8 + size * 0.5, { vel: 0.9 });
    this.toneHit(t, 90, 30, 0.9, 0.5 * (0.6 + size * 0.2));
    this.noiseHit(t, { type: 'lowpass', freq: 1100, amp: 0.35, dec: 0.06 });
    this.perc('taiko', t, 0.6 + size * 0.12, { bus: 'music' });
    this.shimmer(t + 0.03, [f(14), f(18), f(21), f(25)].slice(0, 2 + size), 0.55 + size * 0.15);
    this.strings([f(-7), f(-3), f(0), f(4)].slice(0, 2 + size), t + 0.05, 1.4 + size * 0.5, { vel: 0.5 + size * 0.1, attack: 0.5, release: 2.2, hall: 0.7 });
  },
  countTick(i = 0) { // leises Hochzählen
    const t = this.ctx.currentTime + 0.005, f = 1500 * Math.pow(2, i / 14);
    const g = this.toneHit(t, f, f, 0.05, 0.05, 'sine'); this.out(g, { bus: 'ui', room: 0.05 });
  },
  riser(dur = 3, o = {}) {
    const c = this.ctx, t = (o.t != null ? o.t : c.currentTime) + 0.01;
    const src = this.noiseSrc('pink', t), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.exponentialRampToValueAtTime(0.4 * (o.gain || 1), t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    src.connect(bp); bp.connect(g); this.out(g, { bus: 'music', hall: 0.3 }); src.stop(t + dur + 0.2);
  },
  titleNote(f = 146.83, o = {}) { // ein Oud-Ton mit langem Hall (Titelkarten)
    this.pluck('oud', f, this.ctx.currentTime + 0.05, { vel: 0.9, hall: 1.0, room: 0.05, gain: o.gain != null ? o.gain : 1.2, bus: 'music' });
    this.shimmer(this.ctx.currentTime + 0.1, [f * 4, f * 6], 0.35, { dec: 4 });
  },
  uiHover() { const f = [146.83, 220, 293.66, 329.63][Math.floor(Math.random() * 4)]; this.pluck('oud', f, this.ctx.currentTime + 0.01, { vel: 0.32, hall: 0.4, room: 0.1, bus: 'ui', gain: 0.9 }); },
  uiClick() { this.pluck('oud', 110, this.ctx.currentTime + 0.01, { vel: 0.75, hall: 0.5, room: 0.1, bus: 'ui' }); this.pluck('oud', 220, this.ctx.currentTime + 0.05, { vel: 0.45, hall: 0.5, bus: 'ui' }); },
  uiBack() { this.pluck('oud', 98, this.ctx.currentTime + 0.01, { vel: 0.5, hall: 0.4, bus: 'ui' }); },
  deny() { this.thump(this.ctx.currentTime + 0.01, 0.55, 64, 0.2); this.noiseHit(this.ctx.currentTime, { type: 'lowpass', freq: 500, amp: 0.1, dec: 0.1 }).connect(this.bus.ui); },
});

// ---------- Fassaden: sicher aufrufbar, egal ob Audio schon läuft ----------
let AUD = null, MUS = null;
const SND_KEEP = /^(amb|heart|world|set|clock)/;
const Snd = new Proxy({}, {
  get: (_, k) => (...a) => {
    if (!AUD || !AUD.ready || (G.skipping && !SND_KEEP.test(k))) return undefined;
    const fn = AUD[k];
    return typeof fn === 'function' ? fn.apply(AUD, a) : undefined;
  },
});
const Mus = new Proxy({}, {
  get: (_, k) => (...a) => {
    if (!MUS || !AUD || !AUD.ready) return undefined;
    const fn = MUS[k];
    return typeof fn === 'function' ? fn.apply(MUS, a) : undefined;
  },
});
