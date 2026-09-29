// =====================================================================
// Canvas-Texturen (Tapete, Parkett, Visionboard, Mahnungen, Foto …), Regenglas, Bokeh-Stadt, Staub, Regen
// =====================================================================
const TEX = {};
function texCached(key, mk) { return TEX[key] || (TEX[key] = mk()); }
function noiseSpeckle(c, w, h, n, alpha, r, light = false) {
  for (let i = 0; i < n; i++) { const v = light ? 255 : 0; c.fillStyle = `rgba(${v},${v},${v},${r.range(0.02, alpha)})`; c.fillRect(r.range(0, w), r.range(0, h), r.range(1, 3), r.range(1, 3)); }
}

function texWallpaper(base = '#3b4655', stripe = '#343e4c', damp = true) {
  return canvasTex(256, 256, (c, w, h) => {
    const r = new RNG(5);
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { c.fillStyle = stripe; c.fillRect(x, 0, 16, h); c.fillStyle = 'rgba(255,255,255,.035)'; c.fillRect(x + 16, 0, 2, h); }
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(0,0,0,${r.range(0.02, 0.07)})`; c.fillRect(r.range(0, w), 0, 1, h); }
    noiseSpeckle(c, w, h, 1500, 0.09, r);
    if (damp) { for (let i = 0; i < 5; i++) { const gx = r.range(0, w), gy = r.range(h * 0.55, h), g = c.createRadialGradient(gx, gy, 2, gx, gy, r.range(30, 80)); g.addColorStop(0, 'rgba(10,14,20,.22)'); g.addColorStop(1, 'rgba(10,14,20,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); } }
  });
}
function texParquet() {
  const t = canvasTex(512, 512, (c, w, h) => {
    const r = new RNG(9);
    c.fillStyle = '#1a1310'; c.fillRect(0, 0, w, h);
    const pw = 64;
    for (let y = 0; y < h; y += pw) {
      let x = -r.range(0, 200);
      while (x < w) {
        const len = r.range(160, 320), tone = r.range(0.75, 1.15);
        c.fillStyle = `rgb(${Math.floor(112 * tone)},${Math.floor(78 * tone)},${Math.floor(54 * tone)})`; c.fillRect(x + 1, y + 1, len - 2, pw - 2);
        for (let k = 0; k < 7; k++) { c.strokeStyle = `rgba(20,10,4,${r.range(0.05, 0.18)})`; c.lineWidth = r.range(0.6, 1.6); c.beginPath(); const yy = y + r.range(4, pw - 4); c.moveTo(x, yy); c.bezierCurveTo(x + len * 0.3, yy + r.range(-3, 3), x + len * 0.6, yy + r.range(-3, 3), x + len, yy + r.range(-2, 2)); c.stroke(); }
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x, y, 1.5, pw); x += len;
      }
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, y, w, 1.5);
    }
    noiseSpeckle(c, w, h, 2500, 0.12, r); noiseSpeckle(c, w, h, 800, 0.06, r, true);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function texRug() {
  return canvasTex(256, 384, (c, w, h) => {
    const r = new RNG(14);
    c.fillStyle = '#5a2a2c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3d1c20'; c.fillRect(14, 14, w - 28, h - 28);
    c.strokeStyle = '#b0873f'; c.lineWidth = 3; c.strokeRect(24, 24, w - 48, h - 48);
    c.strokeStyle = '#8a6a34'; c.lineWidth = 1.5; c.strokeRect(32, 32, w - 64, h - 64);
    c.fillStyle = '#6c2f33'; c.beginPath(); c.moveTo(w / 2, 70); c.lineTo(w - 60, h / 2); c.lineTo(w / 2, h - 70); c.lineTo(60, h / 2); c.closePath(); c.fill();
    c.strokeStyle = '#c29a4c'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#c29a4c'; c.beginPath(); c.arc(w / 2, h / 2, 14, 0, TAU); c.fill(); c.fillStyle = '#3d1c20'; c.beginPath(); c.arc(w / 2, h / 2, 7, 0, TAU); c.fill();
    for (let i = 0; i < 20; i++) { c.fillStyle = '#b0873f'; c.fillRect(20 + i * 11, 6, 5, 6); c.fillRect(20 + i * 11, h - 12, 5, 6); }
    noiseSpeckle(c, w, h, 4000, 0.22, r); noiseSpeckle(c, w, h, 1200, 0.1, r, true);
    // abgetreten
    const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, 170); g.addColorStop(0, 'rgba(30,20,15,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}
function polaroid(c, x, y, w, h, rot, draw, tape = true) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
  c.fillStyle = '#e8e0cc'; c.fillRect(-w / 2, -h / 2, w, h);
  c.shadowColor = 'transparent';
  c.save(); c.beginPath(); c.rect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 42); c.clip(); c.translate(-w / 2 + 8, -h / 2 + 8); draw(c, w - 16, h - 42); c.restore();
  if (tape) { c.fillStyle = 'rgba(220,205,150,.6)'; c.fillRect(-22, -h / 2 - 8, 44, 16); }
  c.restore();
}
function texVisionboard() {
  return canvasTex(1024, 768, (c, w, h) => {
    const r = new RNG(21);
    // Kork / dunkle Pinnwand
    c.fillStyle = '#4a3626'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { c.fillStyle = `rgba(${r.pick([20, 0, 90, 120])},${r.pick([10, 0, 60, 80])},0,${r.range(0.05, 0.25)})`; c.fillRect(r.range(0, w), r.range(0, h), r.range(1, 5), r.range(1, 4)); }
    c.strokeStyle = '#1b130e'; c.lineWidth = 14; c.strokeRect(0, 0, w, h);
    // Stadt bei Dämmerung
    polaroid(c, 180, 190, 240, 290, -0.06, (c2, pw, ph) => {
      const g = c2.createLinearGradient(0, 0, 0, ph); g.addColorStop(0, '#2a3a6a'); g.addColorStop(0.7, '#e98a4a'); g.addColorStop(1, '#f7c67a'); c2.fillStyle = g; c2.fillRect(0, 0, pw, ph);
      const rr = new RNG(3); for (let i = 0; i < 12; i++) { const bw = rr.range(16, 34), bh = rr.range(50, 150); c2.fillStyle = `rgba(20,20,34,${rr.range(0.7, 1)})`; c2.fillRect(i * 19, ph - bh, bw, bh); c2.fillStyle = 'rgba(255,210,120,.8)'; for (let k = 0; k < 6; k++) c2.fillRect(i * 19 + 4 + (k % 2) * 9, ph - bh + 8 + Math.floor(k / 2) * 18, 4, 5); }
    });
    // Limousine (Maybach – ohne Logo)
    polaroid(c, 470, 165, 300, 230, 0.05, (c2, pw, ph) => {
      const g = c2.createLinearGradient(0, 0, 0, ph); g.addColorStop(0, '#0d1420'); g.addColorStop(1, '#233149'); c2.fillStyle = g; c2.fillRect(0, 0, pw, ph);
      c2.fillStyle = '#05060a'; c2.beginPath(); c2.moveTo(20, ph - 42); c2.lineTo(30, ph - 66); c2.lineTo(90, ph - 72); c2.lineTo(120, ph - 100); c2.lineTo(210, ph - 100); c2.lineTo(240, ph - 70); c2.lineTo(pw - 22, ph - 62); c2.lineTo(pw - 14, ph - 40); c2.closePath(); c2.fill();
      c2.fillStyle = 'rgba(120,150,200,.35)'; c2.beginPath(); c2.moveTo(96, ph - 72); c2.lineTo(124, ph - 94); c2.lineTo(206, ph - 94); c2.lineTo(230, ph - 72); c2.closePath(); c2.fill();
      c2.fillStyle = '#e6c780'; c2.fillRect(pw - 30, ph - 58, 16, 5); c2.fillStyle = '#0a0a0a'; for (const x of [70, pw - 70]) { c2.beginPath(); c2.arc(x, ph - 38, 17, 0, TAU); c2.fill(); c2.strokeStyle = '#7d6a3a'; c2.lineWidth = 2; c2.stroke(); }
      c2.fillStyle = 'rgba(255,190,120,.25)'; c2.fillRect(0, ph - 24, pw, 24);
    });
    // Handschlag / Zahlen
    polaroid(c, 780, 190, 250, 290, 0.07, (c2, pw, ph) => {
      c2.fillStyle = '#e6dcc4'; c2.fillRect(0, 0, pw, ph);
      c2.fillStyle = '#1a1712'; c2.font = '600 78px Caveat, cursive'; c2.textAlign = 'center'; c2.fillText('10k', pw / 2, 100); c2.font = '600 92px Caveat, cursive'; c2.fillText('100k', pw / 2, 190); c2.font = '600 120px Caveat, cursive'; c2.fillStyle = '#a9761e'; c2.fillText('1M', pw / 2, 300 - 36);
    });
    // Skyline oben / Anzug
    polaroid(c, 230, 520, 270, 260, -0.03, (c2, pw, ph) => {
      c2.fillStyle = '#c8b58c'; c2.fillRect(0, 0, pw, ph);
      c2.fillStyle = '#121216'; c2.beginPath(); c2.moveTo(pw / 2 - 70, 30); c2.lineTo(pw / 2 + 70, 30); c2.lineTo(pw / 2 + 96, 90); c2.lineTo(pw / 2 + 80, ph); c2.lineTo(pw / 2 - 80, ph); c2.lineTo(pw / 2 - 96, 90); c2.closePath(); c2.fill();
      c2.fillStyle = '#e9e4d8'; c2.beginPath(); c2.moveTo(pw / 2 - 20, 30); c2.lineTo(pw / 2 + 20, 30); c2.lineTo(pw / 2, 110); c2.closePath(); c2.fill();
      c2.strokeStyle = '#3a3a3a'; c2.lineWidth = 3; c2.beginPath(); c2.moveTo(pw / 2, 30); c2.lineTo(pw / 2, 8); c2.arc(pw / 2, 2, 6, Math.PI / 2, -Math.PI); c2.stroke();
    });
    // Horizont / Sonnenaufgang
    polaroid(c, 560, 540, 290, 240, 0.04, (c2, pw, ph) => {
      const g = c2.createLinearGradient(0, 0, 0, ph); g.addColorStop(0, '#1e2a55'); g.addColorStop(0.55, '#f0a35a'); g.addColorStop(0.6, '#f7d38a'); g.addColorStop(0.61, '#1a2a44'); g.addColorStop(1, '#0a1220'); c2.fillStyle = g; c2.fillRect(0, 0, pw, ph);
      c2.fillStyle = '#ffe6a0'; c2.beginPath(); c2.arc(pw / 2, ph * 0.6, 28, Math.PI, TAU); c2.fill();
      for (let i = 0; i < 9; i++) { c2.fillStyle = `rgba(247,211,138,${0.5 - i * 0.045})`; c2.fillRect(pw / 2 - 40 + i * 4, ph * 0.63 + i * 12, 80 - i * 8, 3); }
    });
    // Zettel: Ziele
    c.save(); c.translate(860, 560); c.rotate(-0.05); c.fillStyle = '#efe6cf'; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 8; c.fillRect(-100, -130, 200, 260); c.shadowColor = 'transparent';
    c.fillStyle = '#1a1712'; c.font = '600 38px Caveat, cursive'; c.textAlign = 'left'; c.fillText('Mama', -80, -70); c.fillText('frei.', -80, -30);
    c.strokeStyle = '#b32d24'; c.lineWidth = 3; c.beginPath(); c.arc(-58, 4, 18, 0, TAU); c.stroke(); c.font = '600 32px Caveat, cursive'; c.fillStyle = '#b32d24'; c.fillText('♥', -70, 12);
    c.fillStyle = '#1a1712'; c.font = '600 44px Caveat, cursive'; c.fillText('ALLES.', -78, 78);
    c.restore();
    // rote Fäden
    c.strokeStyle = 'rgba(190,40,30,.75)'; c.lineWidth = 2.2;
    const pts = [[180, 190], [470, 165], [780, 190], [560, 540], [230, 520]];
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
    c.fillStyle = '#b32d24'; pts.forEach((p) => { c.beginPath(); c.arc(p[0], p[1] - 16, 6, 0, TAU); c.fill(); });
  }, { aniso: 8 });
}
function texMahnung(seed = 1, amount = '96,40') {
  return canvasTex(256, 340, (c, w, h) => {
    const r = new RNG(seed * 13);
    c.fillStyle = '#eeeae0'; c.fillRect(0, 0, w, h);
    noiseSpeckle(c, w, h, 500, 0.06, r);
    c.fillStyle = '#b3261e'; c.fillRect(0, 0, w, 44);
    c.fillStyle = '#fff'; c.font = '600 22px "Hanken Grotesk", sans-serif'; c.textAlign = 'left'; c.fillText('MAHNUNG', 16, 30);
    c.fillStyle = '#2a2a2a'; for (let i = 0; i < 9; i++) c.fillRect(16, 66 + i * 16, r.range(120, 220), 5);
    c.font = '600 20px "Hanken Grotesk", sans-serif'; c.fillStyle = '#b3261e'; c.fillText(amount + ' €', 16, 250);
    c.strokeStyle = '#b3261e'; c.lineWidth = 3; c.save(); c.translate(150, 300); c.rotate(-0.16); c.strokeRect(-60, -18, 120, 36); c.font = '600 18px "Hanken Grotesk", sans-serif'; c.fillText('2. MAHNUNG', -54, 6); c.restore();
  });
}
function texPhotoNena() { // Foto mit Nena im Abendlicht
  return canvasTex(256, 320, (c, w, h) => {
    c.fillStyle = '#efe6d2'; c.fillRect(0, 0, w, h);
    c.save(); c.beginPath(); c.rect(14, 14, w - 28, h - 64); c.clip();
    const g = c.createLinearGradient(0, 14, 0, h - 50); g.addColorStop(0, '#f0b070'); g.addColorStop(0.55, '#f6c98c'); g.addColorStop(1, '#8c5a3a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff2c8'; c.beginPath(); c.arc(w * 0.72, 92, 26, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,220,150,.35)'; c.beginPath(); c.arc(w * 0.72, 92, 52, 0, TAU); c.fill();
    c.fillStyle = '#4a3a3a'; c.fillRect(14, 168, w - 28, 8); // Balkongeländer
    for (let i = 0; i < 10; i++) c.fillRect(24 + i * 22, 168, 3, 90);
    // Nena (groß) + Kind
    c.fillStyle = '#3d3a44'; c.beginPath(); c.moveTo(78, 260); c.lineTo(86, 178); c.quadraticCurveTo(102, 150, 122, 178); c.lineTo(132, 260); c.closePath(); c.fill();
    c.fillStyle = '#c9a184'; c.beginPath(); c.arc(104, 158, 15, 0, TAU); c.fill(); c.fillStyle = '#d9d5cf'; c.beginPath(); c.arc(104, 148, 15, Math.PI, TAU); c.fill(); c.beginPath(); c.arc(104, 138, 8, 0, TAU); c.fill();
    c.fillStyle = '#e2a53e'; c.fillRect(146, 210, 26, 40); c.fillStyle = '#3a4a6a'; c.fillRect(148, 250, 10, 26); c.fillRect(160, 250, 10, 26);
    c.fillStyle = '#c59470'; c.beginPath(); c.arc(159, 200, 12, 0, TAU); c.fill(); c.fillStyle = '#120e0c'; c.beginPath(); c.arc(159, 194, 12, Math.PI, TAU); c.fill();
    c.strokeStyle = '#c9a184'; c.lineWidth = 6; c.beginPath(); c.moveTo(126, 200); c.lineTo(148, 218); c.stroke();
    c.restore();
    const r = new RNG(2); noiseSpeckle(c, w, h, 1500, 0.1, r); noiseSpeckle(c, w, h, 500, 0.06, r, true);
    c.fillStyle = 'rgba(255,240,200,.08)'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#5a4a3a'; c.font = '500 22px Caveat, cursive'; c.fillText('Nena & ich', 22, h - 20);
  });
}
function texClock(h = 3, m = 47) {
  return canvasTex(256, 256, (c, w) => {
    c.fillStyle = '#1b1712'; c.beginPath(); c.arc(128, 128, 126, 0, TAU); c.fill();
    c.fillStyle = '#dcd3bd'; c.beginPath(); c.arc(128, 128, 112, 0, TAU); c.fill();
    c.strokeStyle = '#2a2620'; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.lineWidth = i % 3 === 0 ? 5 : 2.5; c.beginPath(); c.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); c.lineTo(128 + Math.sin(a) * 104, 128 - Math.cos(a) * 104); c.stroke(); }
    const hand = (a, len, wd) => { c.lineWidth = wd; c.lineCap = 'round'; c.beginPath(); c.moveTo(128 - Math.sin(a) * 12, 128 + Math.cos(a) * 12); c.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); c.stroke(); };
    hand(((h % 12) + m / 60) / 12 * TAU, 58, 8); hand((m / 60) * TAU, 86, 5);
    c.fillStyle = '#2a2620'; c.beginPath(); c.arc(128, 128, 8, 0, TAU); c.fill();
  });
}

// ---------- Bokeh-Stadt hinter dem Regenfenster ----------
function texBokeh(sharp = false, seed = 4) {
  return canvasTex(512, 512, (c, w, h) => {
    const r = new RNG(seed);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#04070d'); g.addColorStop(0.55, '#08101c'); g.addColorStop(1, '#101828'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    // ferne Häuser
    for (let i = 0; i < 18; i++) { const bw = r.range(30, 80), bh = r.range(120, 300), x = i * 32 + r.range(-10, 10); c.fillStyle = `rgba(5,8,14,${r.range(0.8, 1)})`; c.fillRect(x, h - bh - 60, bw, bh + 60); }
    c.globalCompositeOperation = 'lighter';
    const cols = [[255, 170, 80], [255, 170, 80], [255, 190, 110], [255, 200, 130], [255, 214, 150], [110, 200, 225], [90, 170, 255], [255, 90, 70], [235, 240, 255], [255, 120, 170]];
    for (let i = 0; i < 80; i++) {
      const col = r.pick(cols), x = r.range(0, w), y = r.range(h * 0.42, h * 0.97), rad = sharp ? r.range(1.5, 5) : r.range(5, 15), a = sharp ? r.range(0.35, 0.9) : r.range(0.1, 0.34);
      const gr = c.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`); gr.addColorStop(sharp ? 0.6 : 0.8, `rgba(${col[0]},${col[1]},${col[2]},${a * 0.7})`); gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
    }
    // Fenster ferner Häuser als kleine Punkte
    for (let i = 0; i < 200; i++) { c.fillStyle = `rgba(255,${r.int(170, 220)},${r.int(90, 140)},${r.range(0.1, 0.45)})`; c.fillRect(r.range(0, w), r.range(h * 0.35, h * 0.92), 2, 3); }
    c.globalCompositeOperation = 'source-over';
  }, { nomip: false });
}

// ---------- Regenglas ----------
const RAIN_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const RAIN_FS = `
uniform sampler2D tSharp; uniform float uTime; uniform float uAmount; uniform vec3 uTint; uniform float uAspect;
varying vec2 vUv;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// eine Ebene aus gleitenden Tropfen mit Spur; gibt (Normale xy, Maske, Spur) zurück
vec4 dropLayer(vec2 uv, float t, float scale, float seed){
  vec2 g = uv * vec2(scale * uAspect, scale);
  vec2 id = floor(g); vec2 f = fract(g) - 0.5;
  float h = h21(id + seed), h2 = h21(id * 1.7 + seed + 9.1), h3 = h21(id + seed * 3.3 + 4.4);
  float liveD = step(0.55 - uAmount * 0.35, h3);
  float sp = 0.03 + h2 * 0.09;
  float cyc = fract(t * sp + h);
  float slide = cyc * cyc * (3.0 - 2.0 * cyc);
  slide += 0.03 * sin(t * (2.0 + h * 3.0) + h * 40.0) * (1.0 - cyc);
  float y = mix(0.62, -0.62, slide);
  vec2 p = vec2((h - 0.5) * 0.5, y);
  vec2 d = f - p; d.y *= 1.15;
  float r = 0.13 + 0.07 * h2;
  float dist = length(d);
  float body = smoothstep(r, r * 0.55, dist) * liveD;
  float tw = abs(f.x - p.x + 0.02 * sin(f.y * 40.0 + h * 9.0));
  float above = smoothstep(-0.02, 0.05, f.y - p.y) * smoothstep(0.65, 0.05, f.y - p.y);
  float trail = smoothstep(0.045, 0.0, tw) * above * liveD * 0.55;
  vec2 n = (d / r) * body;
  return vec4(n, body, trail);
}
vec4 beads(vec2 uv, float scale, float seed){
  vec2 g = uv * vec2(scale * uAspect, scale); vec2 id = floor(g); vec2 f = fract(g) - 0.5;
  float h = h21(id + seed), h2 = h21(id + seed + 5.5);
  if (h < 0.42) return vec4(0.0);
  vec2 p = vec2(h2 - 0.5, fract(h * 7.3) - 0.5) * 0.6;
  vec2 d = f - p; float r = 0.06 + 0.1 * h2 * h2;
  float m = smoothstep(r, r * 0.6, length(d));
  return vec4((d / r) * m, m, 0.0);
}
void main(){
  vec2 uv = vUv;
  vec4 a = dropLayer(uv, uTime, 5.0, 1.0), b = dropLayer(uv + 0.37, uTime * 1.2, 9.0, 7.0), c = beads(uv, 22.0, 3.0), d = beads(uv + 0.5, 40.0, 11.0);
  vec2 n = a.xy + b.xy * 0.8 + c.xy * 0.7 + d.xy * 0.5;
  float mask = clamp(a.z + b.z * 0.8 + c.z * 0.75 + d.z * 0.5, 0.0, 1.0);
  float trail = clamp(a.w + b.w, 0.0, 1.0);
  // Tropfen als Linsen: umgekehrtes, scharfes Bild der fernen Lichter
  vec2 luv = vec2(0.5) + (uv - 0.5) * 0.6 - n * 0.09;
  vec3 lens = texture2D(tSharp, vec2(luv.x, 1.0 - luv.y * 0.0 - luv.y)).rgb;
  float rim = smoothstep(0.55, 1.0, length(n));
  vec3 col = lens * (0.7 + 0.6 * mask) * uTint * mask * 0.8;
  col += vec3(0.6, 0.75, 1.0) * rim * mask * 0.06;                 // heller Rand
  col += uTint * trail * 0.035;                                     // feine Spur
  float alpha = clamp(mask * 0.85 + trail * 0.25, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}`;
class RainGlass {
  // w,h in Metern. Ergebnis: group mit Backdrop (Bokeh-Stadt) + Glas (Tropfen) + Schatten-Maske für die Sonne
  constructor(w, h, o = {}) {
    this.group = new THREE.Group();
    const soft = texCached('bokehSoft', () => texBokeh(false, 4)), sharp = texCached('bokehSharp', () => texBokeh(true, 4));
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(w * 6, h * 6), new THREE.MeshBasicMaterial({ map: soft, fog: false, color: tcol(0xffffff, o.gain || 0.9) }));
    this.backdrop.position.set(0, h * 0.2, -(o.depth || 9)); this.group.add(this.backdrop);
    this.mat = keepMask(new THREE.ShaderMaterial({
      vertexShader: RAIN_VS, fragmentShader: RAIN_FS, transparent: true, depthWrite: false,
      uniforms: { tSharp: { value: sharp }, uTime: { value: 0 }, uAmount: { value: o.amount != null ? o.amount : 0.7 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uAspect: { value: w / h } },
    }), false);
    this.mat.blending = THREE.CustomBlending; this.mat.blendSrc = THREE.OneFactor; this.mat.blendDst = THREE.OneMinusSrcAlphaFactor;
    this.glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
    this.glass.renderOrder = 5; this.group.add(this.glass);
    // Sonnen-/Mondlicht wirft die Tropfen als wandernde Schatten
    this.maskCv = document.createElement('canvas'); this.maskCv.width = 128; this.maskCv.height = Math.max(64, Math.round(128 * h / w));
    this.maskTex = new THREE.CanvasTexture(this.maskCv); this.maskTex.encoding = THREE.LinearEncoding;
    this.drops = []; const r = new RNG(77);
    for (let i = 0; i < 34; i++) this.drops.push({ x: r.next(), y: r.next(), v: r.range(0.02, 0.09), r: r.range(0.008, 0.02), t: r.range(0, 5), pause: 0 });
    this.shadowMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: this.maskTex, alphaTest: 0.5 });
    this.glass.customDepthMaterial = this.shadowMat; this.glass.castShadow = true;
    this._acc = 0; this.rng = r;
  }
  update(dt) {
    this.mat.uniforms.uTime.value += dt;
    this._acc += dt;
    if (this._acc < 0.05) return;
    const step = this._acc; this._acc = 0;
    const c = this.maskCv.getContext('2d'), w = this.maskCv.width, h = this.maskCv.height;
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.strokeStyle = '#fff';
    for (const d of this.drops) {
      d.t += step;
      if (d.pause > 0) d.pause -= step; else { d.y += d.v * step * (0.5 + 0.5 * Math.sin(d.t * 1.7)); if (Math.random() < step * 0.6) d.pause = this.rng.range(0.2, 0.9); }
      if (d.y > 1.1) { d.y = -0.05; d.x = Math.random(); d.v = this.rng.range(0.02, 0.09); }
      c.beginPath(); c.arc(d.x * w, d.y * h, d.r * w * 1.6, 0, TAU); c.fill();
      c.lineWidth = 1.3; c.globalAlpha = 0.8; c.beginPath(); c.moveTo(d.x * w, d.y * h); c.lineTo(d.x * w, Math.max(0, (d.y - 0.14) * h)); c.stroke(); c.globalAlpha = 1;
    }
    this.maskTex.needsUpdate = true;
  }
}

// ---------- Staub in Lichtstrahlen ----------
const DUST_VS = `
attribute float aSeed; uniform float uTime; uniform float uSize; uniform vec3 uBox; uniform vec3 uCenter; uniform float uPx;
varying float vA;
void main(){
  vec3 p = position;
  float t = uTime * 0.05;
  p.x += sin(t * 3.0 + aSeed * 40.0) * 0.4 + t * (aSeed - 0.5) * 2.0;
  p.y += sin(t * 2.3 + aSeed * 21.0) * 0.3 - t * 0.5;
  p.z += cos(t * 2.7 + aSeed * 33.0) * 0.4;
  p = uCenter + mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.8) + aSeed * 50.0);
  vA = tw;
  gl_PointSize = uSize * uPx * (3.0 / -mv.z) * (0.6 + aSeed * 0.8);
}`;
const DUST_FS = `
uniform vec3 uColor; uniform float uAlpha; varying float vA;
void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; float a = smoothstep(1.0, 0.0, r); a *= a; gl_FragColor = vec4(uColor * vA, a * uAlpha * vA); }`;
function makeDust(center, box, count, color = [1.4, 0.9, 0.5], alpha = 0.7, size = 6) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(count * 3), seed = new Float32Array(count), r = new RNG(31);
  for (let i = 0; i < count; i++) { pos[i * 3] = center[0] + r.range(-0.5, 0.5) * box[0]; pos[i * 3 + 1] = center[1] + r.range(-0.5, 0.5) * box[1]; pos[i * 3 + 2] = center[2] + r.range(-0.5, 0.5) * box[2]; seed[i] = r.next(); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = keepMask(new THREE.ShaderMaterial({ vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, uniforms: { uTime: { value: 0 }, uSize: { value: size }, uBox: { value: new THREE.Vector3(...box) }, uCenter: { value: new THREE.Vector3(...center) }, uColor: { value: new THREE.Vector3(...color) }, uAlpha: { value: alpha }, uPx: { value: 1 } } }), true);
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 8;
  pts.userData.update = (dt) => { m.uniforms.uTime.value = G.t; m.uniforms.uPx.value = GFX.h / 720; };
  return pts;
}

// ---------- Regenstriche in der Luft (außerhalb des Fensters, im Freien) ----------
const RAINL_VS = `
attribute float aSeed; uniform float uTime; uniform vec3 uBox; uniform vec3 uCenter; uniform vec3 uWind; attribute float aEnd;
varying float vA;
void main(){
  vec3 p = position;
  float sp = 9.0 + aSeed * 4.0;
  p.y -= mod(uTime * sp + aSeed * 30.0, uBox.y);
  p += uWind * (aEnd) * 0.35 * 0.0;
  p.x += uWind.x * (uTime * 0.0);
  p = uCenter + mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5;
  p += vec3(uWind.x, 0.0, uWind.z) * 0.02 * aEnd; p.y += aEnd * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = (1.0 - aEnd * 0.9) * (0.4 + 0.6 * aSeed);
}`;
const RAINL_FS = 'uniform vec3 uColor; uniform float uAlpha; varying float vA; void main(){ gl_FragColor = vec4(uColor, vA * uAlpha); }';
function makeRainLines(center, box, count, alpha = 0.16, color = [0.55, 0.7, 1.0]) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(count * 6), seed = new Float32Array(count * 2), end = new Float32Array(count * 2), r = new RNG(88);
  for (let i = 0; i < count; i++) {
    const x = center[0] + r.range(-0.5, 0.5) * box[0], y = center[1] + r.range(-0.5, 0.5) * box[1], z = center[2] + r.range(-0.5, 0.5) * box[2], s = r.next();
    pos.set([x, y, z, x, y, z], i * 6); seed[i * 2] = seed[i * 2 + 1] = s; end[i * 2] = 0; end[i * 2 + 1] = 1;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const m = keepMask(new THREE.ShaderMaterial({ vertexShader: RAINL_VS, fragmentShader: RAINL_FS, transparent: true, uniforms: { uTime: { value: 0 }, uBox: { value: new THREE.Vector3(...box) }, uCenter: { value: new THREE.Vector3(...center) }, uWind: { value: new THREE.Vector3(0.6, 0, 0) }, uColor: { value: new THREE.Vector3(...color) }, uAlpha: { value: alpha } } }), true);
  const l = new THREE.LineSegments(g, m); l.frustumCulled = false; l.renderOrder = 7;
  l.userData.update = () => { m.uniforms.uTime.value = G.t; };
  return l;
}
