// =====================================================================
// Materialien, Himmel, Atmosphäre
//  - Alle Materialien sind gepatcht: Höhen-/Sonnennebel, Masken-Alpha (Fokus: Nour bleibt Farbe), Rim-Licht.
//  - Atmo besitzt Sonne/Hemi/Fill/Himmel/Nebel/Grading einer Welt und kann sie weich überblenden.
// =====================================================================

// Gemeinsam genutzte Uniform-Objekte: wer .value ändert, ändert es für alle Materialien.
const SU = {
  fogA: { value: new THREE.Vector4(0, 0.1, 0, 0.98) },       // x: Dichte-Faktor, y: Höhenabfall, z: Basis-Y, w: max Nebel
  fogSunDir: { value: new THREE.Vector3(0, 1, 0) },
  fogSunCol: { value: new THREE.Vector3(0, 0, 0) },
  rimDir: { value: new THREE.Vector3(0, 0.3, -1) },
  rimCol: { value: new THREE.Vector3(1, 0.7, 0.4) },
  time: { value: 0 },
};

const FOG_PARS = `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float fogDepth;
  varying vec3 vFogWorld;
  uniform float fogDensity;
  uniform vec4 uFogA;
  uniform vec3 uFogSunDir;
  uniform vec3 uFogSunCol;
#endif`;
const FOG_FRAG = `
#ifdef USE_FOG
{
  vec3 fv = vFogWorld - cameraPosition;
  float fdist = length(fv);
  vec3 fdir = fv / max(fdist, 0.0001);
  float hAvg = max(0.5 * (cameraPosition.y + vFogWorld.y) - uFogA.z, 0.0);
  float dens = fogDensity * uFogA.x * exp(-uFogA.y * hAvg);
  float fogFactor = min(1.0 - exp(-dens * dens * fdist * fdist), uFogA.w);
  float sd = max(dot(fdir, uFogSunDir), 0.0);
  vec3 fc = fogColor + uFogSunCol * (pow(sd, 10.0) * 0.7 + pow(sd, 3.0) * 0.18);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fc, fogFactor);
}
#endif`;
const RIM_PARS = `
uniform float uRim;
uniform vec3 uRimDirW;
uniform vec3 uRimCol;`;
const RIM_FRAG = `
{
  vec3 vdR = normalize(vViewPosition);
  vec3 LvR = normalize((viewMatrix * vec4(uRimDirW, 0.0)).xyz);
  float nvR = clamp(dot(normal, vdR), 0.0, 1.0);
  float rimR = pow(1.0 - nvR, 3.2);
  float facingR = clamp(dot(normal, LvR) * 0.6 + 0.4, 0.0, 1.0);
  float backR = smoothstep(0.35, -0.55, dot(vdR, LvR));
  outgoingLight += uRimCol * (rimR * facingR * backR * uRim * mix(0.3, 1.0, clamp(dot(diffuseColor.rgb, vec3(1.3)), 0.0, 1.0)));
}`;

function patchShader(shader, o) {
  shader.uniforms.uFogA = SU.fogA;
  shader.uniforms.uFogSunDir = SU.fogSunDir;
  shader.uniforms.uFogSunCol = SU.fogSunCol;
  let vs = shader.vertexShader, fs = shader.fragmentShader;
  vs = vs.replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\n#ifdef USE_FOG\nvarying vec3 vFogWorld;\n#endif');
  vs = vs.replace('#include <fog_vertex>',
    '#include <fog_vertex>\n#ifdef USE_FOG\n vec4 fwp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n fwp = instanceMatrix * fwp;\n#endif\n vFogWorld = (modelMatrix * fwp).xyz;\n#endif');
  fs = fs.replace('#include <fog_pars_fragment>', FOG_PARS);
  fs = fs.replace('#include <fog_fragment>', FOG_FRAG);
  if (o.mask) {
    shader.uniforms.uMask = o.mask;
    fs = fs.replace('void main() {', 'uniform float uMask;\nvoid main() {');
    fs = fs.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  gl_FragColor.a = uMask;');
  }
  if (o.rim) {
    shader.uniforms.uRim = o.rim;
    shader.uniforms.uRimDirW = SU.rimDir;
    shader.uniforms.uRimCol = SU.rimCol;
    fs = fs.replace('void main() {', RIM_PARS + '\nvoid main() {');
    fs = fs.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', RIM_FRAG + '\n  gl_FragColor = vec4( outgoingLight, diffuseColor.a );');
  }
  shader.vertexShader = vs;
  shader.fragmentShader = fs;
}

// Mischt Alpha so, dass der Masken-Kanal (RT-Alpha) unberührt bleibt – für alles Transparente/Additive.
function keepMask(m, additive) {
  m.transparent = true;
  m.blending = THREE.CustomBlending;
  m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.SrcAlphaFactor;
  m.blendDst = additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor;
  m.blendEquationAlpha = THREE.AddEquation;
  m.blendSrcAlpha = THREE.ZeroFactor;
  m.blendDstAlpha = THREE.OneFactor;
  m.depthWrite = false;
  return m;
}

const Mat = {
  cache: new Map(),
  // Standard-Material für Geometrie mit Vertex-Farben. Pro-Pixel-Licht, Schatten, Nebel.
  lit(o = {}) {
    const m = new THREE.MeshPhongMaterial({
      vertexColors: true,
      specular: tcol(o.spec != null ? o.spec : 0x000000),
      shininess: o.shin != null ? o.shin : 12,
      side: o.side != null ? o.side : THREE.FrontSide,
      emissive: tcol(o.emissive != null ? o.emissive : 0x000000),
      fog: o.fog !== false,
    });
    if (o.map) m.map = o.map;
    if (o.transparent) { m.opacity = o.opacity != null ? o.opacity : 1; keepMask(m, false); m.depthWrite = o.depthWrite !== false; }
    const mask = { value: o.mask || 0 };
    const rim = { value: o.rim || 0 };
    m.userData.mask = mask; m.userData.rim = rim;
    const key = 'lit' + (o.transparent ? 't' : '') + (o.rim ? 'r' : '');
    m.customProgramCacheKey = () => key;
    m.onBeforeCompile = (sh) => patchShader(sh, { mask: o.transparent ? null : mask, rim: o.rim ? rim : null });
    return m;
  },
  // Unbeleuchtet (Leuchtflächen, Himmelsobjekte). Vertex-Farben dürfen > 1 sein (HDR).
  glow(o = {}) {
    const m = new THREE.MeshBasicMaterial({
      vertexColors: o.vertexColors !== false, color: o.color != null ? tcol(o.color) : 0xffffff,
      side: o.side != null ? o.side : THREE.FrontSide, fog: o.fog !== false, map: o.map || null,
    });
    if (o.transparent) { m.opacity = o.opacity != null ? o.opacity : 1; keepMask(m, !!o.additive); }
    const mask = { value: o.mask || 0 };
    m.userData.mask = mask;
    const key = 'glow' + (o.transparent ? 't' : '');
    m.customProgramCacheKey = () => key;
    m.onBeforeCompile = (sh) => patchShader(sh, { mask: o.transparent ? null : mask });
    return m;
  },
  // Farbige Fläche ohne Vertex-Farben (z.B. Canvas-Textur), beleuchtet
  tex(map, o = {}) {
    const m = new THREE.MeshPhongMaterial({
      map, color: 0xffffff, specular: tcol(o.spec != null ? o.spec : 0x000000), shininess: o.shin || 8,
      emissive: tcol(o.emissive != null ? o.emissive : 0x000000), emissiveMap: o.emissiveMap || null,
      side: o.side != null ? o.side : THREE.FrontSide, fog: o.fog !== false,
    });
    if (o.transparent) { m.opacity = o.opacity != null ? o.opacity : 1; keepMask(m, false); }
    const mask = { value: o.mask || 0 };
    m.userData.mask = mask;
    const key = 'tex' + (o.transparent ? 't' : '') + (o.emissiveMap ? 'e' : '');
    m.customProgramCacheKey = () => key;
    m.onBeforeCompile = (sh) => patchShader(sh, { mask: o.transparent ? null : mask });
    return m;
  },
  // Unbeleuchtete Textur (Bildschirme, Schilder, Leuchtreklame)
  screen(map, o = {}) {
    const m = new THREE.MeshBasicMaterial({ map, color: tcol(0xffffff, o.gain || 1), side: o.side != null ? o.side : THREE.FrontSide, fog: o.fog !== false });
    if (o.transparent) { m.opacity = o.opacity != null ? o.opacity : 1; keepMask(m, !!o.additive); }
    const mask = { value: o.mask || 0 };
    m.userData.mask = mask;
    const key = 'screen' + (o.transparent ? 't' : '');
    m.customProgramCacheKey = () => key;
    m.onBeforeCompile = (sh) => patchShader(sh, { mask: o.transparent ? null : mask });
    return m;
  },
};

// ---------- Canvas-Texturen ----------
function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (draw) draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.encoding = o.linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
  t.anisotropy = o.aniso || 4;
  if (o.nomip) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  t.userData = { canvas: c, ctx };
  return t;
}

// ---------- Himmel ----------
const SKY_VS = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const SKY_FS = `
varying vec3 vDir;
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom;
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunDisc; uniform float uSunGlow;
uniform float uStars; uniform float uCloud; uniform vec3 uCloudLit; uniform vec3 uCloudDark;
uniform float uTime;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float hgt = d.y;
  float t = pow(clamp(hgt, 0.0, 1.0), 0.55);
  vec3 col = mix(uHorizon, uTop, t);
  col = mix(col, uBottom, smoothstep(0.0, -0.3, hgt));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  // Horizontband auf der Sonnenseite
  float sideGlow = pow(sd, 3.0) * exp(-abs(hgt) * 4.0);
  col += uSunCol * (sideGlow * 0.35 + pow(sd, 24.0) * 0.5 * uSunGlow + pow(sd, 6.0) * 0.12 * uSunGlow);
  // Sonnenscheibe (HDR)
  float disc = smoothstep(0.99955, 0.99985, sd);
  col += uSunCol * disc * 14.0 * uSunDisc;
  // Wolken: gestreckte Bänder
  if (uCloud > 0.001 && hgt > -0.02) {
    vec2 cp = d.xz / (max(hgt, 0.0) + 0.16);
    float n = fbm(cp * vec2(0.9, 2.3) + vec2(uTime * 0.004, 0.0));
    float band = smoothstep(0.48, 0.72, n) * smoothstep(-0.02, 0.10, hgt) * (1.0 - smoothstep(0.35, 0.8, hgt));
    float lit = pow(sd, 2.0) * 0.8 + 0.2;
    vec3 cc = mix(uCloudDark, uCloudLit, lit);
    col = mix(col, cc, band * uCloud);
  }
  // Sterne
  if (uStars > 0.001 && hgt > 0.0) {
    vec2 sp = d.xz / (hgt + 0.25) * 90.0;
    vec2 id = floor(sp);
    float r = h21(id);
    vec2 f = fract(sp) - 0.5;
    float star = step(0.985, r) * smoothstep(0.22, 0.0, length(f + (vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5) * 0.5));
    star *= 0.6 + 0.4 * sin(uTime * (1.0 + r * 3.0) + r * 40.0);
    col += vec3(0.85, 0.9, 1.0) * star * uStars * smoothstep(0.0, 0.2, hgt);
  }
  gl_FragColor = vec4(col, 0.0);
}`;

class Sky {
  constructor() {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      uniforms: {
        uTop: { value: new THREE.Vector3() }, uHorizon: { value: new THREE.Vector3() }, uBottom: { value: new THREE.Vector3() },
        uSunDir: { value: new THREE.Vector3(0, 0.2, -1) }, uSunCol: { value: new THREE.Vector3(1, 0.7, 0.4) },
        uSunDisc: { value: 1 }, uSunGlow: { value: 1 }, uStars: { value: 0 }, uCloud: { value: 0 },
        uCloudLit: { value: new THREE.Vector3(1, 0.6, 0.4) }, uCloudDark: { value: new THREE.Vector3(0.2, 0.15, 0.25) },
        uTime: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.mesh.scale.setScalar(200);
  }
}

// ---------- Atmosphäre ----------
// Alle Werte sind Zahlen oder Zahlen-Arrays -> generisch überblendbar.
const ATMO_BASE = {
  skyTop: lin(0x101830), skyHorizon: lin(0x30405a), skyBottom: lin(0x080a12),
  sunDir: [0.3, 0.4, -0.85], sunCol: lin(0xffb070, 1.2), sunDisc: 0, sunGlow: 1,
  stars: 0, cloud: 0, cloudLit: lin(0xffa070), cloudDark: lin(0x302a48),
  hemiSky: lin(0x405070), hemiGround: lin(0x141018), hemiInt: 0.6,
  keyCol: lin(0xffc890), keyInt: 0, fillCol: lin(0x6080c0), fillInt: 0, fillDir: [-0.5, 0.4, 0.7],
  fogCol: lin(0x1a2436), fogDen: 0.02, fogHK: 0.1, fogBase: 0, fogMax: 0.97, fogSun: [0, 0, 0],
  rimDir: [0, 0.2, -1], rimCol: lin(0xffa860, 0.8),
  exposure: 1.0, contrast: 1.06, sat: 1.0, lift: [0, 0, 0], gain: [1, 1, 1], shadowTint: [0, 0, 0], highTint: [0, 0, 0],
  bloom: 0.12, bloomTint: [1, 1, 1], vig: 0.4, grain: 0.05, ca: 0.0012,
  dof: 0, dofFocus: 5, dofRange: 3, rays: 0, flare: 0,
};

const _sd = new THREE.Vector3();
const Atmo = {
  cur: JSON.parse(JSON.stringify(ATMO_BASE)),
  scene: null, hemi: null, sun: null, fill: null, sky: null, shadowR: 14, sunDist: 60,
  set(spec) { Object.assign(this.cur, JSON.parse(JSON.stringify(spec))); },
  // Weich überblenden (nutzt den Story-Scheduler -> pausierbar, überspringbar)
  to(spec, dur = 2, e = 'inOutSine') {
    const from = {};
    for (const k in spec) from[k] = Array.isArray(this.cur[k]) ? this.cur[k].slice() : this.cur[k];
    const cur = this.cur;
    return tween((t) => {
      for (const k in spec) {
        const a = from[k], b = spec[k];
        if (Array.isArray(b)) { for (let i = 0; i < b.length; i++) cur[k][i] = lerp(a[i], b[i], t); }
        else cur[k] = lerp(a, b, t);
      }
    }, null, dur, e);
  },
  // Baut Sonne/Hemi/Fill/Himmel in eine Szene ein und verbindet sie mit den geteilten Uniforms.
  attach(scene, { shadows = true, sky = true, shadowR = 14, sunDist = 60 } = {}) {
    this.scene = scene; this.shadowR = shadowR; this.sunDist = sunDist;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = shadows;
    const sc = this.sun.shadow.camera;
    sc.left = -shadowR; sc.right = shadowR; sc.top = shadowR; sc.bottom = -shadowR; sc.near = 1; sc.far = sunDist * 2 + 10;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun); scene.add(this.sun.target);
    this.fill = new THREE.DirectionalLight(0xffffff, 0);
    scene.add(this.fill);
    scene.fog = new THREE.FogExp2(0x000000, 0.01);
    if (sky) { this.sky = new Sky(); scene.add(this.sky.mesh); } else this.sky = null;
    this.focusPoint = new THREE.Vector3();
  },
  applyShadowQuality(size) {
    if (!this.sun) return;
    const on = size > 0;
    this.sun.castShadow = on && this.sun.userData.wantShadow !== false;
    if (on && this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
  },
  // pro Frame: Werte in Lichter/Uniforms schreiben
  update(camera, followPos) {
    const c = this.cur;
    if (!this.scene) return;
    const sd = _sd.set(c.sunDir[0], c.sunDir[1], c.sunDir[2]).normalize();
    this.hemi.color.setRGB(c.hemiSky[0], c.hemiSky[1], c.hemiSky[2]);
    this.hemi.groundColor.setRGB(c.hemiGround[0], c.hemiGround[1], c.hemiGround[2]);
    this.hemi.intensity = c.hemiInt;
    this.sun.color.setRGB(c.keyCol[0], c.keyCol[1], c.keyCol[2]);
    this.sun.intensity = c.keyInt;
    const fp = followPos || this.focusPoint;
    // Schatten-Kamera am Spieler ausrichten und auf Texelraster einrasten (kein Flimmern)
    const texel = (this.shadowR * 2) / (this.sun.shadow.mapSize.x || 2048);
    const sx = Math.round(fp.x / texel) * texel, sz = Math.round(fp.z / texel) * texel;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + sd.x * this.sunDist, sd.y * this.sunDist, sz + sd.z * this.sunDist);
    this.sun.target.updateMatrixWorld();
    this.fill.color.setRGB(c.fillCol[0], c.fillCol[1], c.fillCol[2]);
    this.fill.intensity = c.fillInt;
    this.fill.position.set(c.fillDir[0], c.fillDir[1], c.fillDir[2]);
    const f = this.scene.fog;
    f.color.setRGB(c.fogCol[0], c.fogCol[1], c.fogCol[2]);
    f.density = c.fogDen;
    SU.fogA.value.set(1, c.fogHK, c.fogBase, c.fogMax);
    SU.fogSunDir.value.copy(sd);
    SU.fogSunCol.value.set(c.fogSun[0], c.fogSun[1], c.fogSun[2]);
    SU.rimDir.value.set(c.rimDir[0], c.rimDir[1], c.rimDir[2]).normalize();
    SU.rimCol.value.set(c.rimCol[0], c.rimCol[1], c.rimCol[2]);
    if (this.sky) {
      const u = this.sky.mat.uniforms;
      u.uTop.value.set(c.skyTop[0], c.skyTop[1], c.skyTop[2]);
      u.uHorizon.value.set(c.skyHorizon[0], c.skyHorizon[1], c.skyHorizon[2]);
      u.uBottom.value.set(c.skyBottom[0], c.skyBottom[1], c.skyBottom[2]);
      u.uSunDir.value.copy(sd);
      u.uSunCol.value.set(c.sunCol[0], c.sunCol[1], c.sunCol[2]);
      u.uSunDisc.value = c.sunDisc; u.uSunGlow.value = c.sunGlow;
      u.uStars.value = c.stars; u.uCloud.value = c.cloud;
      u.uCloudLit.value.set(c.cloudLit[0], c.cloudLit[1], c.cloudLit[2]);
      u.uCloudDark.value.set(c.cloudDark[0], c.cloudDark[1], c.cloudDark[2]);
      u.uTime.value = G.t;
      this.sky.mesh.position.copy(camera.position);
      this.sky.mesh.scale.setScalar(Math.min(camera.far * 0.9, 400));
    }
    SU.time.value = G.t;
  },
  sunDirVec(out) { return out.set(this.cur.sunDir[0], this.cur.sunDir[1], this.cur.sunDir[2]).normalize(); },
};
