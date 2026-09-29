// =====================================================================
// Stadt-Bausteine: Pflaster, Fassaden, Straßenbahn, Bäume, Laternen, Passanten, Tauben
// Gebäude werden lokal gebaut (Front = +Z) und mit Drehung in die Welt gemischt.
// =====================================================================
function texCobble() {
  const t = canvasTex(512, 512, (c, w, h) => {
    const r = new RNG(19);
    c.fillStyle = '#4a4038'; c.fillRect(0, 0, w, h);
    const cell = 42;
    for (let y = -cell; y < h + cell; y += cell * 0.86) {
      const off = ((Math.round(y / (cell * 0.86)) % 2) * cell) / 2;
      for (let x = -cell; x < w + cell; x += cell) {
        const px = x + off + r.range(-4, 4), py = y + r.range(-3, 3), sw = cell * r.range(0.8, 0.92), sh = cell * r.range(0.66, 0.78);
        const v = r.range(0.72, 1.18), tone = r.pick([[150, 138, 122], [138, 128, 116], [160, 142, 120], [126, 120, 116]]);
        c.fillStyle = `rgb(${Math.floor(tone[0] * v)},${Math.floor(tone[1] * v)},${Math.floor(tone[2] * v)})`;
        c.beginPath(); c.moveTo(px + 4, py); c.lineTo(px + sw - 4, py); c.quadraticCurveTo(px + sw, py, px + sw, py + 4); c.lineTo(px + sw, py + sh - 4); c.quadraticCurveTo(px + sw, py + sh, px + sw - 4, py + sh); c.lineTo(px + 4, py + sh); c.quadraticCurveTo(px, py + sh, px, py + sh - 4); c.lineTo(px, py + 4); c.quadraticCurveTo(px, py, px + 4, py); c.fill();
        c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(px + 3, py + 2, sw - 8, 3);
        c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(px + 3, py + sh - 5, sw - 8, 3);
      }
    }
    noiseSpeckle(c, w, h, 3500, 0.12, r); noiseSpeckle(c, w, h, 900, 0.06, r, true);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function texSign(text, o = {}) {
  return canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = o.bg || '#1a2a22'; c.fillRect(0, 0, w, h);
    c.strokeStyle = o.fg || '#e8d6a0'; c.lineWidth = 3; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = o.fg || '#e8d6a0'; c.font = `500 ${o.size || 64}px "Cormorant Garamond", Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 4);
  });
}
function texClockFace(h = 17, m = 31) { return texClock(h, m); }

const lighten = (hex, t) => mixHex(hex, 0xffffff, t);
const darken = (hex, t) => mixHex(hex, 0x000000, t);

// Ein Haus. o: {w,d,h,col,seed,floors,roof:'gable'|'flat'|'mansard',shop:true,litP,awning,balc}
function mkBuilding(o) {
  const rng = new RNG(o.seed || 1);
  const body = new MB((o.seed || 1) + 100).ao(2.4, 0.3), glass = new MB((o.seed || 1) + 200), glow = new MB(7);
  glass.jit = 0.02; glow.jit = 0;
  const w = o.w, d = o.d, h = o.h, fl = o.floors || Math.max(3, Math.round(h / 3.5)), fh = h / fl, wall = o.col, litP = o.litP != null ? o.litP : 0.25;
  body.box(w, h, d, 0, 0, 0, wall, { grad: [0.76, 1.04] });
  body.box(w + 0.2, 0.9, d + 0.2, 0, 0, 0, darken(wall, 0.3));                       // Sockel
  for (let f = 1; f < fl; f++) body.box(w + 0.3, 0.2, d + 0.3, 0, f * fh - 0.1, 0, lighten(wall, 0.12));                 // Gesimse
  body.box(w + 0.9, 0.55, d + 0.9, 0, h - 0.3, 0, lighten(wall, 0.1)); body.box(w + 0.5, 0.2, d + 0.5, 0, h + 0.25, 0, darken(wall, 0.15));  // Traufgesims
  const zf = d / 2;
  const cols = Math.max(2, Math.round(w / 3.3)), cw = w / cols;
  const shopH = o.shop ? 3.5 : 0;
  for (let f = 1; f < fl; f++) {
    for (let c = 0; c < cols; c++) {
      const u = -w / 2 + (c + 0.5) * cw, y = f * fh + 0.55;
      body.box(1.5, 2.15, 0.16, u, y - 0.15, zf, lighten(wall, 0.22));                 // Umrahmung
      glass.plane(1.12, 1.85, u, y + 0.85, zf + 0.09, 0x3c465c);
      if (rng.chance(litP)) glow.plane(1.02, 1.75, u, y + 0.85, zf + 0.1, [1.9 + rng.range(-0.3, 0.6), 1.15 + rng.range(-0.2, 0.3), 0.42], {});
      body.box(0.04, 1.85, 0.06, u, y - 0.0, zf + 0.11, lighten(wall, 0.3));           // Sprosse
      if (o.balc && f % 2 === 0) { body.box(1.7, 0.08, 0.7, u, y - 0.2, zf + 0.35, darken(wall, 0.1)); for (let k = 0; k < 6; k++) body.box(0.025, 0.85, 0.025, u - 0.75 + k * 0.3, y - 0.12, zf + 0.68, 0x1a1a1e); body.box(1.7, 0.04, 0.05, u, y + 0.72, zf + 0.68, 0x1a1a1e); }
      if (o.shutters) { body.box(0.5, 1.9, 0.05, u - 0.85, y - 0.05, zf + 0.06, o.shutters); body.box(0.5, 1.9, 0.05, u + 0.85, y - 0.05, zf + 0.06, o.shutters); }
    }
  }
  if (o.shop) {
    const gc = Math.max(1, Math.round(w / 5));
    for (let c = 0; c < gc; c++) {
      const u = -w / 2 + (c + 0.5) * (w / gc), sw = (w / gc) * 0.78;
      body.box(sw + 0.3, shopH - 0.3, 0.16, u, 0.5, zf + 0.0, darken(wall, 0.45));
      glow.plane(sw, shopH - 0.7, u, 0.55 + (shopH - 0.7) / 2, zf + 0.1, [1.3 + rng.range(-0.2, 0.3), 0.85 + rng.range(-0.1, 0.2), 0.42]);
      for (let k = 1; k < 4; k++) body.box(0.05, shopH - 0.7, 0.05, u - sw / 2 + k * sw / 4, 0.55, zf + 0.12, darken(wall, 0.5));
      if (o.awning) { const ac = o.awning[c % o.awning.length]; body.box(sw + 0.5, 0.12, 1.5, u, shopH + 0.05, zf + 0.75, ac, { rx: 0.35 }); body.box(sw + 0.5, 0.3, 0.05, u, shopH - 0.3, zf + 1.4, darken(ac, 0.15)); }
    }
    body.box(1.6, 2.6, 0.18, -w / 2 + 1.3, 0, zf, darken(wall, 0.55));
  }
  if (o.roof === 'gable') { body.gable(w * 0.985, d * 0.985, o.roofH || 4.5, 0, h + 0.3, 0, o.roofCol || 0x7a4a3e); }
  else if (o.roof === 'mansard') { body.box(w * 0.92, 2.4, d * 0.92, 0, h + 0.3, 0, o.roofCol || 0x4a4a54, { grad: [0.9, 1] }); body.box(w * 0.75, 0.6, d * 0.75, 0, h + 2.7, 0, o.roofCol || 0x4a4a54);
    for (let c = 0; c < Math.floor(cols / 2); c++) { const u = -w / 2 + (c * 2 + 1) * cw; body.box(1.3, 1.5, 0.8, u, h + 0.5, zf - 0.5, o.roofCol || 0x4a4a54); glass.plane(0.8, 1.0, u, h + 1.1, zf - 0.09, 0x3c465c); } }
  else { body.box(w + 0.3, 0.9, d + 0.3, 0, h + 0.4, 0, darken(wall, 0.2)); if (rng.chance(0.6)) body.box(rng.range(2, 4), rng.range(1.5, 2.5), rng.range(2, 3.5), rng.range(-w / 3, w / 3), h + 1.2, rng.range(-d / 3, d / 3), 0x6a6a72); }
  if (rng.chance(0.7)) { const n = rng.int(1, 3); for (let i = 0; i < n; i++) body.box(0.8, rng.range(2, 3.5), 0.8, rng.range(-w / 3, w / 3), h + 1.5, rng.range(-d / 4, d / 4), 0x6a4a40); }
  return { body, glass, glow };
}

// Straßenbahn (2 Wagen). Gibt Group zurück; +Z ist Fahrtrichtung.
function makeTram() {
  const g = new THREE.Group();
  const mb = new MB(91), gl = new MB(92), glassM = new MB(93); gl.jit = 0; glassM.jit = 0.01;
  const body = 0xefe6d2, stripe = 0xc0392b, dark = 0x2a2a30;
  const car = (z0, len) => {
    mb.box(2.35, 2.6, len, 0, 0.55, z0, body, { grad: [0.82, 1.02] });
    mb.box(2.4, 0.5, len + 0.02, 0, 0.4, z0, stripe); mb.box(2.4, 0.16, len + 0.02, 0, 2.3, z0, darken(stripe, 0.1));
    mb.box(2.0, 0.22, len * 0.85, 0, 3.15, z0, 0x8a8a92);
    mb.box(2.34, 0.4, len - 0.6, 0, 0.0, z0, dark);
    for (let i = 0; i < 6; i++) { const z = z0 - len / 2 + 1.2 + i * ((len - 2.4) / 5); glassM.plane(1.5, 1.2, 1.185, 1.85, z, 0x1c2838, { ry: Math.PI / 2 }); glassM.plane(1.5, 1.2, -1.185, 1.85, z, 0x1c2838, { ry: -Math.PI / 2 }); gl.plane(1.4, 1.05, 1.19, 1.85, z, [1.2, 0.95, 0.55], { ry: Math.PI / 2 }); gl.plane(1.4, 1.05, -1.19, 1.85, z, [1.2, 0.95, 0.55], { ry: -Math.PI / 2 }); }
  };
  car(0, 12.4); car(-13, 12.4);
  mb.box(2.0, 2.6, 0.7, 0, 0.55, -6.6, dark);                                                       // Gelenk
  glassM.plane(2.1, 1.3, 0, 1.9, 6.22, 0x1c2838); gl.sph(0.14, 0.85, 0.85, 6.24, [3.5, 3.2, 2.4], { d: 1 }); gl.sph(0.14, -0.85, 0.85, 6.24, [3.5, 3.2, 2.4], { d: 1 });
  gl.plane(0.9, 0.28, 0, 2.95, 6.23, [3.0, 1.6, 0.2]);                                              // Liniennummer
  mb.box(0.06, 0.6, 0.06, 0, 3.2, 1.5, 0x333338); mb.box(1.5, 0.05, 0.5, 0, 3.75, 1.5, 0x333338, { rx: 0.1 });
  g.add(mb.mesh(Mat.lit({ spec: 0x554433, shin: 30 }), { cast: true, receive: false }));
  g.add(glassM.mesh(Mat.lit({ spec: 0xffddaa, shin: 70 }), { cast: false, receive: false }));
  g.add(gl.mesh(Mat.glow(), { cast: false, receive: false }));
  return g;
}

function mkTree(seed, s = 1) {
  const rng = new RNG(seed), mb = new MB(seed + 40);
  mb.cyl(0.16 * s, 0.24 * s, 3.2 * s, 6, 0, 0, 0, 0x4a382c);
  for (let i = 0; i < 4; i++) mb.cyl(0.05 * s, 0.09 * s, 1.3 * s, 5, 0, 2.6 * s, 0, 0x4a382c, { rz: rng.range(-0.7, 0.7), ry: i * 1.6 });
  const greens = [0x5a7a34, 0x6b8a3a, 0x4a6a2c, 0x7a9440];
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + rng.range(0, 1); mb.sph(rng.range(1.3, 1.9) * s, Math.sin(a) * rng.range(0.4, 1.4) * s, (3.9 + rng.range(-0.3, 1.4)) * s, Math.cos(a) * rng.range(0.4, 1.4) * s, rng.pick(greens), { d: 1, sy: 0.85 }); }
  return mb;
}
function mkLamp(warm = true) {
  const mb = new MB(77), gl = new MB(78); gl.jit = 0;
  mb.cyl(0.11, 0.16, 0.5, 6, 0, 0, 0, 0x22222a); mb.cyl(0.05, 0.08, 4.4, 6, 0, 0.5, 0, 0x2a2a32); mb.box(0.9, 0.05, 0.05, 0.45, 4.85, 0, 0x2a2a32);
  mb.box(0.36, 0.08, 0.36, 0.9, 4.86, 0, 0x22222a); gl.sph(0.14, 0.9, 4.7, 0, warm ? [4.4, 3.0, 1.4] : [3, 3.4, 4], { d: 1 });
  return { body: mb, glow: gl };
}
function mkBench() { const mb = new MB(66); mb.box(1.7, 0.06, 0.5, 0, 0.45, 0, 0x6a4a30); mb.box(1.7, 0.5, 0.06, 0, 0.55, -0.22, 0x6a4a30, { rx: -0.15 }); mb.box(0.08, 0.45, 0.46, -0.75, 0, 0, 0x222226); mb.box(0.08, 0.45, 0.46, 0.75, 0, 0, 0x222226); return mb; }
function mkCafeSet(seed, parasol = 0xefe2c4, angles = [0.4, 2.4, 4.4]) {
  const mb = new MB(seed);
  mb.cyl(0.42, 0.42, 0.04, 10, 0, 0.74, 0, 0x8a6a48); mb.cyl(0.04, 0.05, 0.74, 6, 0, 0, 0, 0x222226); mb.cyl(0.24, 0.24, 0.03, 8, 0, 0, 0, 0x222226);
  for (const a of angles) { const x = Math.sin(a) * 0.72, z = Math.cos(a) * 0.72; mb.box(0.4, 0.04, 0.4, x, 0.45, z, 0x7a5a38, { ry: a }); mb.box(0.4, 0.42, 0.04, x + Math.sin(a) * 0.2, 0.47, z + Math.cos(a) * 0.2, 0x7a5a38, { ry: a }); for (const [dx, dz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) mb.box(0.03, 0.45, 0.03, x + dx, 0, z + dz, 0x222226); }
  if (parasol != null) { mb.cyl(0.03, 0.03, 2.4, 5, 0, 0.75, 0, 0x555559); mb.cone(1.4, 0.5, 10, 0, 2.7, 0, parasol); }
  mb.cyl(0.05, 0.05, 0.14, 6, 0.1, 0.78, 0.05, 0xdcd8cc); // Tasse
  return mb;
}

// Gehende Passanten: 6 Kleidungs-Varianten als InstancedMesh, Beinschwung im Vertex-Shader
function crowdMaterial() {
  const m = Mat.lit({ shin: 3 });
  const base = m.onBeforeCompile;
  const uT = { value: 0 };
  m.userData.uT = uT;
  m.customProgramCacheKey = () => 'crowd';
  m.onBeforeCompile = (sh) => {
    base(sh);
    sh.uniforms.uCTime = uT;
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'attribute float aPhase; attribute float aSpeed; uniform float uCTime;\nvoid main() {');
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `
vec3 transformed = vec3(position);
{
  float leg = smoothstep(0.90, 0.80, transformed.y);
  float sd = transformed.x > 0.0 ? 0.0 : 3.14159;
  float ang = sin(uCTime * 6.0 * aSpeed + aPhase + sd) * 0.55 * leg * step(0.01, aSpeed);
  float yy = transformed.y - 0.9;
  float ny = 0.9 + yy * cos(ang) - transformed.z * sin(ang);
  float nz = yy * sin(ang) + transformed.z * cos(ang);
  transformed.y = ny; transformed.z = nz;
  float arm = smoothstep(1.0, 1.06, transformed.y) * (1.0 - smoothstep(1.4, 1.46, transformed.y)) * step(0.19, abs(transformed.x));
  float aang = sin(uCTime * 6.0 * aSpeed + aPhase + (transformed.x > 0.0 ? 3.14159 : 0.0)) * 0.45 * arm * step(0.01, aSpeed);
  float ay = transformed.y - 1.42;
  float ny2 = 1.42 + ay * cos(aang) - transformed.z * sin(aang);
  float nz2 = ay * sin(aang) + transformed.z * cos(aang);
  transformed.y = ny2; transformed.z = nz2;
}`);
  };
  return m;
}
function personGeo(top, bottom, hair, skin, s = 1) {
  const mb = new MB(3); mb.jit = 0.03;
  mb.box(0.13 * s, 0.9 * s, 0.16 * s, 0.1 * s, 0.0, 0, bottom); mb.box(0.13 * s, 0.9 * s, 0.16 * s, -0.1 * s, 0.0, 0, bottom);
  mb.box(0.36 * s, 0.1 * s, 0.22 * s, 0, 0.86 * s, 0, bottom);
  mb.box(0.4 * s, 0.56 * s, 0.24 * s, 0, 0.94 * s, 0, top, { grad: [0.85, 1.05] });
  mb.box(0.1 * s, 0.5 * s, 0.11 * s, 0.26 * s, 0.98 * s, 0, top); mb.box(0.1 * s, 0.5 * s, 0.11 * s, -0.26 * s, 0.98 * s, 0, top);
  mb.box(0.07 * s, 0.09 * s, 0.09 * s, 0.26 * s, 0.9 * s, 0, skin); mb.box(0.07 * s, 0.09 * s, 0.09 * s, -0.26 * s, 0.9 * s, 0, skin);
  mb.cyl(0.05 * s, 0.05 * s, 0.08 * s, 5, 0, 1.49 * s, 0, skin);
  mb.sph(0.115 * s, 0, 1.64 * s, 0, skin, { d: 1, sy: 1.1 }); mb.dome(0.125 * s, 0, 1.68 * s, -0.01, hair, { t1: 0.5, sy: 0.95 });
  return mb.build();
}
class Crowd {
  constructor(n, paths, o = {}) {
    this.n = n; this.group = new THREE.Group(); this.paths = paths; this.rng = new RNG(o.seed || 8);
    const mat = crowdMaterial(); this.mat = mat;
    const tops = [0x8a7a6a, 0x5a6a7a, 0x7a5a5a, 0x6a6a52, 0x8a8a90, 0x4a5a4a, 0x9a8a7a, 0x6a4a5a], bots = [0x2a2a30, 0x3a3a44, 0x4a3a30, 0x2a3040, 0x50504a], hairs = [0x1a1512, 0x3a2a1c, 0x6a5238, 0x2a2a2a, 0x8a8a86], skins = [0xd8a888, 0xb98a67, 0x8a5a3a, 0xe4bea0, 0xa87850];
    const V = 6; this.meshes = [];
    this.people = [];
    const per = Math.ceil(n / V);
    for (let v = 0; v < V; v++) {
      const geo = personGeo(this.rng.pick(tops), this.rng.pick(bots), this.rng.pick(hairs), this.rng.pick(skins), this.rng.range(0.94, 1.08));
      const im = new THREE.InstancedMesh(geo, mat, per);
      const ph = new Float32Array(per), sp = new Float32Array(per);
      im.frustumCulled = false; im.castShadow = true; im.receiveShadow = false;
      for (let i = 0; i < per; i++) {
        const path = paths[this.rng.int(0, paths.length - 1)], stand = this.rng.chance(o.standP != null ? o.standP : 0.18);
        this.people.push({ im, i, path, t: this.rng.next(), dir: this.rng.chance(0.5) ? 1 : -1, sp: stand ? 0 : this.rng.range(0.9, 1.5), off: this.rng.range(-1.2, 1.2), y: 0 });
        ph[i] = this.rng.range(0, 6.28); sp[i] = stand ? 0 : 1;
      }
      geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1)); geo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(sp, 1));
      this.group.add(im); this.meshes.push(im);
    }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
  }
  update(dt, pp) {
    this.mat.userData.uT.value = G.t;
    for (const p of this.people) {
      const path = p.path, a = path.a, b = path.b, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      p.t += (p.dir * p.sp * dt) / len; if (p.t > 1) { p.t = 1; p.dir = -1; } else if (p.t < 0) { p.t = 0; p.dir = 1; }
      const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
      const x = lerp(a[0], b[0], p.t) - dz * p.off, z = lerp(a[1], b[1], p.t) + dx * p.off;
      const yaw = Math.atan2(dx * p.dir, dz * p.dir);
      let px = x, pz = z;
      if (pp) { const ex = x - pp.x, ez = z - pp.z, ed = Math.hypot(ex, ez); if (ed < 1.05 && ed > 1e-4) { px = pp.x + (ex / ed) * 1.05; pz = pp.z + (ez / ed) * 1.05; } }   // weicht dem Spieler aus
      this._e.set(0, p.sp > 0 ? yaw : p.off * 2, 0); this._q.setFromEuler(this._e);
      this._m.compose(this._p.set(px, p.y, pz), this._q, this._s); p.im.setMatrixAt(p.i, this._m);
    }
    for (const m of this.meshes) m.instanceMatrix.needsUpdate = true;
  }
}

// Tauben: picken, laufen, fliehen wenn man nahe kommt
class Pigeons {
  constructor(n, area, o = {}) {
    this.n = n; this.area = area; this.rng = new RNG(o.seed || 12); this.group = new THREE.Group();
    const bmb = new MB(5); bmb.jit = 0.03;
    bmb.sph(0.12, 0, 0.16, 0, 0x7a7a86, { d: 1, sx: 0.8, sy: 0.75, sz: 1.3 }); bmb.sph(0.065, 0, 0.27, 0.13, 0x5a5a6a, { d: 1 }); bmb.box(0.02, 0.02, 0.05, 0, 0.265, 0.2, 0xd8b060); bmb.box(0.05, 0.03, 0.15, 0, 0.14, -0.2, 0x60606c);
    bmb.box(0.015, 0.09, 0.015, 0.03, 0, 0.02, 0xc08080); bmb.box(0.015, 0.09, 0.015, -0.03, 0, 0.02, 0xc08080);
    const wmb = new MB(6); wmb.tri([0, 0, 0], [0.25, 0.02, -0.06], [0.2, 0, 0.12], 0x8a8a96);
    this.body = new THREE.InstancedMesh(bmb.build(), Mat.lit({ side: THREE.DoubleSide }), n); this.wL = new THREE.InstancedMesh(wmb.build(), Mat.lit({ side: THREE.DoubleSide }), n); this.wR = new THREE.InstancedMesh(wmb.build(), Mat.lit({ side: THREE.DoubleSide }), n);
    for (const m of [this.body, this.wL, this.wR]) { m.frustumCulled = false; m.castShadow = true; this.group.add(m); }
    this.b = [];
    for (let i = 0; i < n; i++) this.b.push({ x: area[0] + this.rng.next() * (area[2] - area[0]), z: area[1] + this.rng.next() * (area[3] - area[1]), y: 0, yaw: this.rng.range(0, 6.28), st: 'peck', t: this.rng.range(0, 3), vx: 0, vz: 0, vy: 0, fl: 0, ph: this.rng.range(0, 6) });
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
  }
  update(dt, pp) {
    const r = this.rng;
    for (let i = 0; i < this.n; i++) {
      const b = this.b[i];
      const dx = b.x - pp.x, dz = b.z - pp.z, d = Math.hypot(dx, dz);
      if (b.st !== 'fly' && d < 3.0) { b.st = 'fly'; b.t = r.range(2.2, 3.4); b.vx = (dx / (d || 1)) * r.range(3.5, 5.5) + r.range(-1, 1); b.vz = (dz / (d || 1)) * r.range(3.5, 5.5) + r.range(-1, 1); b.vy = r.range(2.5, 4); b.yaw = Math.atan2(b.vx, b.vz); if (i % 3 === 0) Snd.pigeonWings({ pan: clamp(dx * 0.15, -1, 1), gain: 0.5 }); }
      b.t -= dt;
      if (b.st === 'fly') {
        b.x += b.vx * dt; b.z += b.vz * dt; b.y = Math.max(0, b.y + b.vy * dt); b.vy -= 3.2 * dt; if (b.y > 4) b.vy = Math.min(b.vy, 0);
        b.fl += dt * 22;
        if (b.t <= 0 && b.y <= 0.001) { b.st = 'peck'; b.t = r.range(1, 4); b.y = 0; b.fl = 0; }
        else if (b.y <= 0.001 && b.vy < 0) { b.vy = 0.8; b.vx *= 0.6; b.vz *= 0.6; }
      } else if (b.st === 'peck') { if (b.t <= 0) { if (r.chance(0.5)) { b.st = 'walk'; b.t = r.range(0.6, 1.8); b.yaw += r.range(-1.5, 1.5); } else b.t = r.range(1, 3); } }
      else if (b.st === 'walk') { b.x += Math.sin(b.yaw) * 0.5 * dt; b.z += Math.cos(b.yaw) * 0.5 * dt; if (b.t <= 0) { b.st = 'peck'; b.t = r.range(1, 3.5); } }
      const bob = b.st === 'peck' ? Math.max(0, Math.sin(G.t * 9 + b.ph)) * 0.05 : 0;
      this._e.set(b.st === 'peck' ? 0.3 * bob * 10 : 0, b.yaw, 0); this._q.setFromEuler(this._e);
      this._m.compose(this._p.set(b.x, b.y, b.z), this._q, this._s); this.body.setMatrixAt(i, this._m);
      const fl = b.st === 'fly' ? Math.sin(b.fl) * 0.9 : 0;
      for (const side of [1, -1]) {
        this._e.set(0, b.yaw, side * (fl + (b.st === 'fly' ? 0 : 0.5))); this._q.setFromEuler(this._e);
        this._s.set(side, 1, 1); this._m.compose(this._p.set(b.x, b.y + 0.2, b.z), this._q, this._s); (side === 1 ? this.wL : this.wR).setMatrixAt(i, this._m); this._s.set(1, 1, 1);
      }
    }
    for (const m of [this.body, this.wL, this.wR]) m.instanceMatrix.needsUpdate = true;
  }
}

// Oud (kurzhalsige Laute): lokal – Korpus um den Ursprung, Hals nach +Y, Decke zeigt nach +Z
function mkOud() {
  const mb = new MB(151); mb.jit = 0.02;
  const back = 0x7a4a26, face = 0xc99a5a, dark = 0x2a1a10;
  mb.sph(0.5, 0, -0.02, -0.02, back, { sx: 0.34, sy: 0.46, sz: 0.25, d: 1 });                 // Schalenkorpus
  mb.sph(0.5, 0, 0.15, -0.015, back, { sx: 0.25, sy: 0.3, sz: 0.2, d: 1 });                   // Birnenform zum Hals
  mb.sph(0.5, 0, -0.005, 0.1, face, { sx: 0.32, sy: 0.44, sz: 0.045, d: 1 });                 // Decke
  mb.cyl(0.06, 0.06, 0.008, 10, 0, -0.004, 0, 0x1f150c, { rx: Math.PI / 2, org: [0, 0.03, 0.125] });   // Schallloch
  mb.cyl(0.075, 0.075, 0.005, 10, 0, -0.0025, 0, 0x5a3a20, { rx: Math.PI / 2, org: [0, 0.03, 0.121] });
  mb.box(0.15, 0.014, 0.016, 0, -0.17, 0.125, dark);                                           // Steg
  mb.box(0.075, 0.34, 0.03, 0, 0.28, 0.055, dark);                                             // Hals
  mb.box(0.085, 0.02, 0.035, 0, 0.6, 0.06, 0xe8e0d0);                                          // Sattel
  mb.box(0.085, 0.24, 0.05, 0, 0.6, -0.02, dark, { rx: -0.85 });                                // zurückgebogener Wirbelkasten
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) mb.box(0.04, 0.013, 0.013, s * 0.058, 0.66 + i * 0.05, -0.06 - i * 0.03, 0xc9a24a);
  for (const dx of [-0.028, -0.014, 0, 0.014, 0.028]) mb.box(0.003, 0.76, 0.003, dx, -0.16, 0.135, 0xdcd6c6, { jit: 0 });   // Saiten
  return mb;
}
