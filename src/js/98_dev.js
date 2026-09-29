// =====================================================================
// Dev-/Test-Hooks (nur aktiv mit ?test oder ?dev): Offline-Audio-Render + Analyse für automatische Prüfungen.
// =====================================================================
function fftMag(re, im) { // iterative Radix-2 FFT (in place) -> Amplituden
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -TAU / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  const out = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) out[i] = Math.hypot(re[i], im[i]) / n;
  return out;
}
function spectrogramPNG(data, sr, opts = {}) {
  const N = 2048, hop = opts.hop || 1024, fmax = opts.fmax || 4000, W = Math.min(1400, Math.floor((data.length - N) / hop)), H = 360;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H + 24;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H + 24);
  const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((TAU * i) / (N - 1));
  const re = new Float32Array(N), im = new Float32Array(N);
  const img = ctx.createImageData(W, H);
  const binHz = sr / N, fmin = 50;
  for (let x = 0; x < W; x++) {
    const o = Math.floor(x * ((data.length - N) / W));
    for (let i = 0; i < N; i++) { re[i] = data[o + i] * win[i]; im[i] = 0; }
    const mag = fftMag(re, im);
    for (let y = 0; y < H; y++) {
      const f = fmin * Math.pow(fmax / fmin, 1 - y / (H - 1)); // logarithmische Frequenzachse
      const b = Math.min(N / 2 - 1, Math.round(f / binHz));
      const db = 20 * Math.log10(mag[b] + 1e-7), v = clamp((db + 90) / 70);
      const i4 = (y * W + x) * 4;
      img.data[i4] = clamp(v * 2.2 - 0.6) * 255; img.data[i4 + 1] = clamp(v * 1.6 - 0.15) * 255; img.data[i4 + 2] = clamp(0.35 + v * 1.1 - v * v * 1.2) * 255 * (v > 0.05 ? 1 : 0.4); img.data[i4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = '#fff'; ctx.font = '11px monospace';
  for (const f of [110, 220, 440, 880, 1760, 3520]) { const y = (1 - Math.log(f / fmin) / Math.log(fmax / fmin)) * (H - 1); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, y, 10, 1); ctx.fillText(f + '', 12, y + 4); }
  const secs = data.length / sr;
  for (let s = 0; s < secs; s += 2) { const x = (s / secs) * W; ctx.fillStyle = '#fff'; ctx.fillText(s + 's', x + 2, H + 16); ctx.fillRect(x, H, 1, 6); }
  return cv.toDataURL('image/png');
}
function analyse(bufs, sr) {
  const d = bufs[0], n = d.length;
  let peak = 0, nan = 0, dc = 0;
  const rms = [];
  for (let s = 0; s < Math.floor(n / sr); s++) {
    let e = 0;
    for (let i = s * sr; i < (s + 1) * sr; i++) { const v = d[i]; if (!isFinite(v)) { nan++; continue; } peak = Math.max(peak, Math.abs(v)); e += v * v; dc += v; }
    rms.push(+(20 * Math.log10(Math.sqrt(e / sr) + 1e-9)).toFixed(1));
  }
  return { peak: +peak.toFixed(3), nan, dc: +(dc / n).toFixed(5), rmsDb: rms };
}
function measurePitch(data, sr, f0) { // Grundton per zero-gepaddeter FFT + parabolische Interpolation
  const N = 32768, re = new Float32Array(N), im = new Float32Array(N), start = Math.floor(sr * 0.25), len = Math.min(Math.floor(sr * 1.0), data.length - start);
  for (let i = 0; i < len; i++) re[i] = data[start + i] * (0.5 - 0.5 * Math.cos((TAU * i) / (len - 1)));
  const mag = fftMag(re, im), bh = sr / N;
  const lo = Math.floor((f0 * 0.9) / bh), hi = Math.ceil((f0 * 1.1) / bh);
  let bi = lo;
  for (let i = lo; i <= hi; i++) if (mag[i] > mag[bi]) bi = i;
  const a = Math.log(mag[bi - 1] + 1e-12), b = Math.log(mag[bi] + 1e-12), c = Math.log(mag[bi + 1] + 1e-12);
  const p = (0.5 * (a - c)) / (a - 2 * b + c);
  return (bi + p) * bh;
}
if (G.debug) {
  window.__aud = {
    async pitches(kind, freqs) {
      const sr = 32000, out = [];
      for (const f of freqs) {
        const off = new OfflineAudioContext(1, sr * 1.6, sr);
        const A = new AudioEngine(off, { offline: true });
        if (kind === 'ney') A.ney(f, 0.05, 1.4, { vel: 0.8, scoop: 0 }); else A.pluck(kind, f, 0.05, { vel: 0.8, hall: 0, room: 0 });
        const buf = await off.startRendering();
        const m = measurePitch(buf.getChannelData(0), sr, f);
        out.push({ f: +f.toFixed(2), got: +m.toFixed(2), cents: +(1200 * Math.log2(m / f)).toFixed(1) });
      }
      return out;
    },
    // Rendert eine Cue mit Stimmungs-Abfolge: seq = [[zeit, 'mood'], ...]
    async cue(name, seq, sec, o = {}) {
      const sr = o.sr || 32000;
      const off = new OfflineAudioContext(2, Math.floor(sr * sec), sr);
      const A = new AudioEngine(off, { offline: true }); A.setVolumes(0.9, 0.9);
      const M = new Music(A);
      M.play(CUES[name], { delay: 0, mood: seq[0][1], moodFade: 0.01, fadeOut: 0 });
      for (let i = 0; i < seq.length; i++) {
        const [t0, m] = seq[i], t1 = i + 1 < seq.length ? seq[i + 1][0] : sec;
        M.mood(m, 0.5, t0); M.scheduleUntil(t1);
      }
      if (o.amb) for (const k of o.amb) A.ambSet(k, 1, 0.1);
      const buf = await off.startRendering();
      const ch = [buf.getChannelData(0), buf.getChannelData(1)];
      return { ...analyse(ch, sr), png: spectrogramPNG(ch[0], sr, o) };
    },
    // Rendert beliebigen Code mit Zugriff auf A (AudioEngine) und M (Music): fn als String
    async run(code, sec, o = {}) {
      const sr = o.sr || 32000;
      const off = new OfflineAudioContext(2, Math.floor(sr * sec), sr);
      const A = new AudioEngine(off, { offline: true }); A.setVolumes(0.9, 0.9);
      const M = new Music(A);
      new Function('A', 'M', 'CUES', 'MAQAM', 'TONIC', code)(A, M, CUES, MAQAM, TONIC);
      const buf = await off.startRendering();
      const ch = [buf.getChannelData(0), buf.getChannelData(1)];
      return { ...analyse(ch, sr), png: spectrogramPNG(ch[0], sr, o) };
    },
  };
}

// ---------- Dev-Studio: Figuren/Props einzeln beurteilen ----------
if (G.debug) {
  window.__studio = {
    scene: null,
    setup(atmo) {
      const scene = new THREE.Scene();
      Atmo.attach(scene, { shadows: true, shadowR: 6 });
      Atmo.set(Object.assign({
        skyTop: lin(0x3a4a70), skyHorizon: lin(0xb0a090), sunDir: [-0.4, 0.55, 0.7], sunCol: lin(0xffe0b0, 1.2), sunDisc: 0,
        hemiSky: lin(0x8896b8, 0.9), hemiGround: lin(0x50483e), hemiInt: 0.9, keyCol: lin(0xffe2b8), keyInt: 2.4, fillCol: lin(0x6f88b8), fillInt: 0.5, fillDir: [0.6, 0.2, 0.7],
        fogCol: lin(0x9a9aa8), fogDen: 0.004, exposure: 1.0, bloom: 0.06, vig: 0.25, grain: 0.02, ca: 0, flare: 0, rays: 0,
      }, atmo || {}));
      const mb = new MB(2); mb.floor(24, 24, 0, 0, 0, 0x777068, { nx: 12, nz: 12, checker: 0x6e6860 });
      scene.add(mb.mesh(Mat.lit()));
      this.scene = scene; curScene = scene; return scene;
    },
    cam(pos, look, fov = 32) { const c = GFX.camera; c.position.set(...pos); c.lookAt(...look); c.fov = fov; c.updateProjectionMatrix(); },
    shoot(sec = 0.5) { FX.fade = 0; for (let i = 0; i < 10; i++) { const dt = sec / 10; G.dt = dt; G.t += dt; G.rt += dt; scene_update(dt); } Atmo.update(GFX.camera, null); GFX.render(curScene, GFX.camera); },
  };
}
