// =====================================================================
// Kapitel I – die Innenstadt: ein Platz am Fluss. Café Aurora im Norden, Hotel Belvedere im Osten,
// im Westen Brücke, Wasser und die tiefe Sonne. Norden = −Z, Osten = +X.
// Platz: x ∈ [−34, 34], z ∈ [−36, 36]. Die Straßenbahn fährt auf x = 16 von Nord nach Süd.
// =====================================================================
const CITY_GOLD = {
  skyTop: lin(0x5878b8), skyHorizon: lin(0xffc078), skyBottom: lin(0x8a6a58),
  sunDir: [-0.86, 0.19, 0.48], sunCol: lin(0xffb264, 2.0), sunDisc: 1, sunGlow: 1.2, stars: 0, cloud: 0.75, cloudLit: lin(0xffae70, 1.6), cloudDark: lin(0x7a6488),
  hemiSky: lin(0x9db4dc, 0.9), hemiGround: lin(0xa07c5c), hemiInt: 0.9,
  keyCol: lin(0xffb466), keyInt: 3.2, fillCol: lin(0xffd0a0), fillInt: 0.32, fillDir: [0.6, 0.3, -0.7],
  fogCol: lin(0xf0b488, 0.9), fogDen: 0.0055, fogHK: 0.05, fogBase: -1, fogMax: 0.93, fogSun: lin(0xffa050, 0.8),
  rimDir: [-0.86, 0.22, 0.48], rimCol: lin(0xffb466, 1.5),
  exposure: 0.92, contrast: 1.08, sat: 1.0, lift: [0.012, 0.006, 0.0], gain: [1.03, 1.0, 0.95], shadowTint: [0.02, 0.0, 0.03], highTint: [0.03, 0.012, -0.01],
  bloom: 0.32, bloomTint: [1, 0.9, 0.78], vig: 0.32, grain: 0.06, ca: 0.0018, dof: 0, dofFocus: 6, dofRange: 4, rays: 0.5, flare: 1.0,
};
const CITY_LATE = Object.assign({}, CITY_GOLD, {
  skyTop: lin(0x34448a), skyHorizon: lin(0xff8a5c), skyBottom: lin(0x4a3a48),
  sunDir: [-0.88, 0.08, 0.47], sunCol: lin(0xff7a44, 2.2), cloudLit: lin(0xff7a5a, 1.7), cloudDark: lin(0x5a4a7a),
  hemiSky: lin(0x8a90d0, 0.8), hemiGround: lin(0x80584a), hemiInt: 0.78, keyCol: lin(0xff8a4c), keyInt: 2.7, fillCol: lin(0xa0a0e8), fillInt: 0.45,
  fogCol: lin(0xe08a70, 0.85), fogSun: lin(0xff7a40, 0.8), rimDir: [-0.88, 0.1, 0.47], rimCol: lin(0xff8a50, 1.6),
  exposure: 0.95, sat: 1.04, bloom: 0.4, highTint: [0.03, 0.006, 0.01], stars: 0.05,
});
const CITY_DUSK = Object.assign({}, CITY_GOLD, {
  skyTop: lin(0x121a3e), skyHorizon: lin(0x8a4a6c), skyBottom: lin(0x0c0e18),
  sunDir: [-0.88, -0.03, 0.47], sunCol: lin(0xff5a3a, 1.4), sunDisc: 0, sunGlow: 0.8, stars: 0.35, cloud: 0.5, cloudLit: lin(0xb0508a, 1.0), cloudDark: lin(0x2a2450),
  hemiSky: lin(0x6a78c4, 0.9), hemiGround: lin(0x3a2c48), hemiInt: 0.95, keyCol: lin(0xff7a5a), keyInt: 0.0, fillCol: lin(0x7c94e4), fillInt: 1.15, fillDir: [-0.3, 0.6, 0.6],
  fogCol: lin(0x3a3060, 0.8), fogDen: 0.006, fogSun: lin(0xff5a4a, 0.4), rimDir: [-0.88, 0.1, 0.47], rimCol: lin(0x8aa0ff, 0.9),
  exposure: 1.32, contrast: 1.1, sat: 1.0, shadowTint: [0.0, 0.01, 0.04], highTint: [0.02, 0.0, 0.03], bloom: 0.62, vig: 0.4, rays: 0.0, flare: 0.3,
});

// ---------- Fluss: Himmelsspiegelung + Sonnenglitzern (kein Licht, nur Farbe) ----------
const WATER_VS = 'varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }';
const WATER_FS = `
varying vec3 vW;
uniform float uTime; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uSkyH; uniform vec3 uSkyT; uniform vec3 uDeep; uniform vec3 uFogCol; uniform float uFogDen;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float wave(vec2 p){ float t = uTime; return vn(p*0.22 + vec2(t*0.07, t*0.04))*0.55 + vn(p*0.7 + vec2(-t*0.15, t*0.10))*0.3 + vn(p*2.1 + vec2(t*0.28, -t*0.2))*0.15; }
void main(){
  vec3 V = normalize(cameraPosition - vW);
  vec2 p = vW.xz; float e = 0.1;
  float h0 = wave(p), hx = wave(p + vec2(e, 0.0)), hz = wave(p + vec2(0.0, e));
  vec3 N = normalize(vec3((h0 - hx) * 2.4, 1.0, (h0 - hz) * 2.4));
  vec3 R = reflect(-V, N);
  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 sky = mix(uSkyH, uSkyT, pow(clamp(R.y, 0.0, 1.0), 0.5));
  vec3 col = mix(uDeep, sky, clamp(fres * 0.95 + 0.06, 0.0, 1.0));
  float sd = max(dot(R, normalize(uSunDir)), 0.0);
  col += uSunCol * (pow(sd, 700.0) * 26.0 + pow(sd, 60.0) * 0.9 + pow(sd, 9.0) * 0.16);
  float d = length(cameraPosition - vW);
  float ff = 1.0 - exp(-pow(d * uFogDen, 2.0));
  col = mix(col, uFogCol, min(ff, 0.96));
  gl_FragColor = vec4(col, 0.0);
}`;
function makeRiver() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: WATER_VS, fragmentShader: WATER_FS, fog: false,
    uniforms: { uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(-1, 0.2, 0.5) }, uSunCol: { value: new THREE.Vector3(1, 0.7, 0.4) }, uSkyH: { value: new THREE.Vector3() }, uSkyT: { value: new THREE.Vector3() }, uDeep: { value: new THREE.Vector3(0.02, 0.03, 0.04) }, uFogCol: { value: new THREE.Vector3() }, uFogDen: { value: 0.005 } },
  });
  const g = new THREE.PlaneGeometry(1, 1, 1, 1); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.userData.update = () => {
    const c = Atmo.cur, u = mat.uniforms;
    u.uTime.value = G.t; u.uSunDir.value.set(c.sunDir[0], c.sunDir[1], c.sunDir[2]).normalize(); u.uSunCol.value.set(c.sunCol[0], c.sunCol[1], c.sunCol[2]);
    u.uSkyH.value.set(c.skyHorizon[0], c.skyHorizon[1], c.skyHorizon[2]); u.uSkyT.value.set(c.skyTop[0], c.skyTop[1], c.skyTop[2]);
    u.uFogCol.value.set(c.fogCol[0], c.fogCol[1], c.fogCol[2]); u.uFogDen.value = c.fogDen;
    u.uDeep.value.set(c.skyTop[0] * 0.12, c.skyTop[1] * 0.14, c.skyTop[2] * 0.14);
  };
  return m;
}

// ---------- Ein schwarzer Wagen (Limousine), Front = +Z ----------
function mkCar(col = 0x0b0b10) {
  const body = new MB(61), glass = new MB(62), glow = new MB(63), chrome = new MB(64); glow.jit = 0; glass.jit = 0.01; body.jit = 0.012; chrome.jit = 0;
  body.box(1.94, 0.56, 5.3, 0, 0.36, 0, col, { grad: [0.8, 1.0] });                  // Unterbau
  body.box(1.86, 0.2, 1.75, 0, 0.9, 1.7, col, { rx: 0.05 });                          // Motorhaube
  body.box(1.86, 0.22, 1.2, 0, 0.9, -2.0, col, { rx: -0.04 });                        // Kofferraum
  const P = [[-0.92, 0, -1.55], [0.92, 0, -1.55], [0.92, 0, 1.15], [-0.92, 0, 1.15], [-0.76, 0.58, -1.2], [0.76, 0.58, -1.2], [0.76, 0.58, 0.3], [-0.76, 0.58, 0.3]];
  body._poly(P, [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [3, 2, 6, 7], [0, 3, 7, 4], [1, 5, 6, 2]], [0, 0.92, 0], col, { grad: [0.9, 1.0] });
  // Scheiben (dunkel, spiegelnd)
  glass.quad([-0.9, 0.94, 1.16], [0.9, 0.94, 1.16], [0.74, 1.5, 0.315], [-0.74, 1.5, 0.315], 0x10141c);
  glass.quad([0.9, 0.94, -1.56], [-0.9, 0.94, -1.56], [-0.74, 1.5, -1.21], [0.74, 1.5, -1.21], 0x10141c);
  for (const s of [1, -1]) glass.quad([s * 0.925, 1.0, -1.35], [s * 0.925, 1.0, 0.95], [s * 0.765, 1.44, 0.22], [s * 0.765, 1.44, -1.12], 0x10141c);
  // Räder (Drehpunkt = Radmitte)
  for (const [x, z] of [[0.9, 1.75], [-0.9, 1.75], [0.9, -1.7], [-0.9, -1.7]]) { body.cyl(0.36, 0.36, 0.24, 10, 0, -0.12, 0, 0x141416, { rz: Math.PI / 2, org: [x, 0.36, z] }); chrome.cyl(0.2, 0.2, 0.26, 8, 0, -0.13, 0, 0x9a9aa2, { rz: Math.PI / 2, org: [x + 0.012 * Math.sign(x), 0.36, z] }); }
  // Grill, Lichter, Zierleisten
  chrome.box(0.8, 0.34, 0.06, 0, 0.42, 2.66, 0x8a8a92); chrome.box(1.92, 0.03, 5.2, 0, 0.66, 0, 0x8a8a92); chrome.box(0.16, 0.16, 0.04, 0, 0.76, 2.7, 0xd9b56a);
  for (const s of [1, -1]) { glow.plane(0.36, 0.1, s * 0.7, 0.66, 2.66, [5, 4.6, 3.6]); glow.plane(0.4, 0.09, s * 0.72, 0.78, -2.66, [3.4, 0.2, 0.15], { ry: Math.PI }); }
  const g = new THREE.Group();
  g.add(body.mesh(Mat.lit({ spec: 0x8a8a96, shin: 70, side: THREE.DoubleSide }), { cast: true, receive: true }));
  g.add(glass.mesh(Mat.lit({ spec: 0xffddaa, shin: 90, side: THREE.DoubleSide }), { cast: false, receive: false }));
  g.add(chrome.mesh(Mat.lit({ spec: 0xffffff, shin: 60 }), { cast: false, receive: false }));
  g.add(glow.mesh(Mat.glow(), { cast: false, receive: false }));
  return g;
}

// ---------- Uhr-Säule ----------
function mkClockPost(h, m) {
  const g = new THREE.Group();
  const mb = new MB(71); mb.cyl(0.13, 0.19, 0.4, 8, 0, 0, 0, 0x22262a); mb.cyl(0.07, 0.09, 3.5, 8, 0, 0.4, 0, 0x2a3034); mb.cyl(0.42, 0.42, 0.22, 10, 0, 3.7, 0, 0x22262a); mb.cone(0.32, 0.5, 10, 0, 4.72, 0, 0x22262a);
  g.add(mb.mesh(Mat.lit({ spec: 0x555555, shin: 30 })));
  const mat = Mat.tex(texClock(h, m), { emissive: 0x000000, spec: 0x222222, shin: 20 });
  const disc = new THREE.CircleGeometry(0.47, 24);
  for (const s of [1, -1]) { const p = new THREE.Mesh(disc, mat); p.position.set(0, 4.17, s * 0.125); p.rotation.y = s > 0 ? 0 : Math.PI; g.add(p); }
  const ring = new MB(72); ring.cyl(0.5, 0.5, 0.24, 12, 0, -0.12, 0, 0x2a3034, { rx: Math.PI / 2, org: [0, 4.17, 0] }); g.add(ring.mesh(Mat.lit({ spec: 0x555555, shin: 30 })));
  return g;
}

class CityWorld extends World {
  constructor(o) {
    super('city', o);
    this.camMode = 'follow';
    this.follow = { dist: 4.5, height: 1.5, minPitch: 0.05, maxPitch: 0.72, yaw: -Math.PI / 2, pitch: 0.24, fov: 42 };
    this.bounds = { x0: -32.4, x1: 30.8, z0: -34.6, z1: 33.4 };
    this.camBox = [-42, -35.3, 31.5, 46];
    this.camBlockers = [[-28.7, 0, 6.3, -26.1, 2.8, 9.7], [22.3, 0, -6.9, 24.5, 1.7, -1.5]];   // Kiosk, Wagen
    this.spawn = { x: -27, z: 26, yaw: Math.PI / 2 };
    this.surface = 'cobble'; this.speed = 1.45;
    this.lampK = -1; this.glowMats = []; this.pl = [];
    this.tramState = 'wait'; this.tramT = 6; this.tramZ = -150; this.tramBell = false;
    this.clockH = 17; this.clockM = 24;
  }
  async build(o = {}) {
    const sc = this.scene;
    Atmo.attach(sc, { shadows: true, sky: true, shadowR: 24, sunDist: 80 });
    Atmo.set(o.atmo || CITY_GOLD);
    Atmo.sun.shadow.bias = -0.0005; Atmo.sun.shadow.normalBias = 0.05;
    Atmo.focusPoint.set(-10, 0, 0);
    const matLit = Mat.lit({ spec: 0x2a2620, shin: 8 });
    const matGlass = Mat.lit({ spec: 0xffddaa, shin: 70 });
    const matGlow = Mat.glow(); this.glowMats.push(matGlow);
    const B = new MB(11), GL = new MB(12), LG = new MB(13), FO = new MB(14), ST = new MB(15); LG.jit = 0; ST.jit = 0;
    B.ao(1.2, 0.2);
    const place = (b, x, z, ry) => { B.merge(b.body, x, 0, z, ry); GL.merge(b.glass, x, 0, z, ry); LG.merge(b.glow, x, 0, z, ry); };

    // ---------- Boden ----------
    const cob = texCobble(); cob.repeat.set(24, 25);
    const plaza = new THREE.Mesh(GEO.plane, Mat.tex(cob, { spec: 0x1a1410, shin: 6 }));
    plaza.rotation.x = -Math.PI / 2; plaza.scale.set(68, 72, 1); plaza.position.set(0, 0, 0); plaza.receiveShadow = true; this.add(plaza);
    const far = new MB(3); far.jit = 0.02;
    far.floor(484, 900, 208, -0.05, 0, 0x4c463f, { nx: 4, nz: 6 });                                   // Land östlich des Kais
    far.floor(300, 900, -365, -0.05, 0, 0x3d4536, { nx: 2, nz: 6 });                                  // Gegenufer
    far.floor(8, 460, 16, 0.02, 0, 0x36363b, { nz: 8 });                                               // Straßenbahntrasse
    far.box(0.3, 0.14, 460, 12.15, 0, 0, 0x8a8478); far.box(0.3, 0.14, 460, 19.85, 0, 0, 0x8a8478);   // Bordsteine
    far.box(0.07, 0.05, 460, 15.3, 0.02, 0, 0x6a6a72); far.box(0.07, 0.05, 460, 16.7, 0.02, 0, 0x6a6a72);   // Schienen
    // Südrand: niedrige Hecke mit Lücke für die Bahn
    for (const [a, b] of [[-33.5, 10.5], [21.5, 33]]) far.box(b - a, 0.9, 0.9, (a + b) / 2, 0, 34.6, 0x3f5a2e);
    this.add(far.mesh(Mat.lit({ spec: 0x555555, shin: 30 }), { cast: false, receive: true }));

    // ---------- Fluss, Kaimauer, Brücke ----------
    const river = makeRiver(); river.position.set(-124.8, -3.3, 0); river.scale.set(180.5, 1, 700); this.add(river); this.river = river;
    const wall = new MB(5);
    wall.box(1.0, 3.4, 460, -34.5, -3.4, 0, 0x6a6258, { grad: [0.6, 1] });                                                                    // Kaimauer
    wall.box(0.5, 1.05, 69.4, -34.2, 0, -12.3, 0x9a9080); wall.box(0.5, 1.05, 200, -34.2, 0, 132, 0x9a9080); wall.box(0.5, 1.05, 200, -34.2, 0, -147, 0x9a9080);   // Brüstung mit Lücke für die Brücke
    for (let z = -46; z <= 21; z += 4.2) wall.box(0.42, 1.3, 0.42, -34.2, 0, z, 0xa09686);                                                      // Pfosten
    for (let z = 34; z <= 60; z += 4.2) wall.box(0.42, 1.3, 0.42, -34.2, 0, z, 0xa09686);
    // Brücke: Fahrbahn, Brüstung, Pfeiler (z ∈ [22.3, 31.7])
    const BZ = 27, BL = 181;
    wall.box(BL, 0.9, 9.4, -34 - BL / 2, -0.9, BZ, 0x8c8272, { grad: [0.7, 1] });
    wall.box(BL, 0.02, 8.6, -34 - BL / 2, 0.0, BZ, 0x3a3a3e);
    for (const s of [-1, 1]) wall.box(BL, 0.95, 0.42, -34 - BL / 2, 0.0, BZ + s * 4.5, 0x9a9080);
    for (let i = 0; i < 13; i++) { const x = -34 - 8 - i * 13.6; wall.box(2.4, 3.6, 8.6, x, -4.4, BZ, 0x7a7264); }
    for (let i = 0; i < 13; i++) { const x = -34 - 4 - i * 13.6; mkLampInto(B, LG, x, BZ - 4.3, -Math.PI / 2, 0.6); mkLampInto(B, LG, x - 6.8, BZ + 4.3, Math.PI / 2, 0.6); }
    this.add(wall.mesh(Mat.lit({ spec: 0x1a1a1a, shin: 10 }), { cast: true, receive: true }));
    // Gegenufer: graue Plattenbauten im Dunst (Mirzas Seite der Stadt), Bäume
    const opp = new MB(8); opp.jit = 0.02; const oppW = new MB(9); oppW.jit = 0; const oppG = new MB(10);
    const oppR = new RNG(42);
    for (let i = 0; i < 6; i++) {
      const bx = -236 - oppR.range(0, 22), bz = -66 + i * 26 + oppR.range(-4, 4), w = oppR.range(10, 14), d = oppR.range(34, 50), h = oppR.range(28, 42), c = oppR.pick([0x8a8a8c, 0x7e8088, 0x9a968e, 0x84888e]);
      opp.box(w, h, d, bx, -3, bz, c, { grad: [0.6, 1] });
      const fl = Math.floor(h / 3), cols = Math.floor(d / 3.2);
      for (let f = 0; f < fl; f++) for (let k = 0; k < cols; k++) { const lit = oppR.chance(0.22); (lit ? oppG : oppW).plane(1.3, 1.5, bx + w / 2 + 0.05, 0.2 + f * 3, bz - d / 2 + 1.6 + k * 3.2, lit ? [1.9, 1.1, 0.4] : mixHex(c, 0x101418, 0.7), { ry: Math.PI / 2 }); }
    }
    this.add(opp.mesh(Mat.lit({}), { cast: false, receive: false })); this.add(oppW.mesh(Mat.lit({}), { cast: false, receive: false })); this.add(oppG.mesh(matGlow, { cast: false, receive: false }));
    // Ferne Skylines (die Sonne bleibt frei: Lücke bei a = −2,08)
    const skyW = buildSkyline({ rMin: 260, rMax: 380, count: 44, angA: -2.95, angB: -0.95, hMin: 6, hMax: 36, litP: 0.35, seed: 21, y0: -14, modernP: 0.3, gapA: -2.08, gapW: 0.3, gapH: 3 });
    const skyN = buildSkyline({ rMin: 130, rMax: 280, count: 40, angA: -0.95, angB: 1.3, hMin: 14, hMax: 52, litP: 0.32, seed: 23, y0: -2, modernP: 0.35, gapA: 0.13, gapW: 0.07, gapH: 3 });
    const skyE = buildSkyline({ rMin: 90, rMax: 260, count: 26, angA: 1.3, angB: 2.3, hMin: 10, hMax: 42, litP: 0.3, seed: 25, y0: -2, modernP: 0.3 });
    const skyS = buildSkyline({ rMin: 140, rMax: 300, count: 30, angA: 2.3, angB: 3.9, hMin: 6, hMax: 26, litP: 0.3, seed: 27, y0: -2, modernP: 0.2 });
    [skyW, skyN, skyE, skyS].forEach((s) => { this.add(s.body); this.add(s.win); const gm = s.glow; gm.material = matGlow; this.add(gm); });

    // ---------- Häuser: Nordreihe (Front nach +Z) ----------
    const N = [
      { x: -29.5, w: 11, h: 17, col: 0xd9c4a0, roof: 'gable', seed: 1, balc: true },
      { x: -18.5, w: 12, h: 13.5, col: 0xe2b880, roof: 'mansard', seed: 2, shop: true, awning: [0xb5372f, 0xefe2c4], litP: 0.3 },
      { x: -6.5, w: 12, h: 19, col: 0xc9a58a, roof: 'mansard', seed: 3, balc: true },
      { x: 4.6, w: 11, h: 16.5, col: 0xd8c09a, roof: 'gable', seed: 4, shutters: 0x4a5a48 },
      { x: 27, w: 11, h: 18, col: 0xd4b596, roof: 'mansard', seed: 5, balc: true },
      { x: 38, w: 11, h: 16, col: 0xc8a888, roof: 'gable', seed: 6 },
    ];
    for (const n of N) place(mkBuilding({ w: n.w, d: 14, h: n.h, col: n.col, roof: n.roof, seed: n.seed, balc: n.balc, shop: n.shop, awning: n.awning, shutters: n.shutters, litP: n.litP != null ? n.litP : 0.25 }), n.x, -43, 0);
    // Westecke (Nord) und Ostseite: Häuser vor der Straße nach Norden
    place(mkBuilding({ w: 12, d: 14, h: 15, col: 0xc8ae8e, roof: 'gable', seed: 7, balc: true }), -47, -43, 0);
    for (let i = 0; i < 4; i++) {                                                                                                   // die Straße nach Norden: Häuserfluchten
      const z = -60 - i * 20, cw = [0xd0b894, 0xc8a888, 0xd8c4a0, 0xc09a80];
      place(mkBuilding({ w: 20, d: 14, h: 15 + ((i * 5) % 9), col: cw[i], roof: i % 2 ? 'gable' : 'mansard', seed: 40 + i, balc: true }), 3.5, z, Math.PI / 2);
      place(mkBuilding({ w: 20, d: 14, h: 16 + ((i * 7) % 8), col: cw[(i + 2) % 4], roof: i % 2 ? 'mansard' : 'gable', seed: 50 + i, balc: true }), 28.5, z, -Math.PI / 2);
    }
    // ---------- Hotel Belvedere (Front nach −X bei x = 32) ----------
    const hotel = mkBuilding({ w: 36, d: 18, h: 26, floors: 7, col: 0xe8d6b0, roof: 'mansard', seed: 31, shop: true, balc: true, litP: 0.42, roofCol: 0x4a5a54 });
    place(hotel, 41, 4, -Math.PI / 2);
    place(mkBuilding({ w: 14, d: 16, h: 17, col: 0xd6bd98, roof: 'gable', seed: 32, balc: true }), 41, -24, -Math.PI / 2);
    place(mkBuilding({ w: 14, d: 16, h: 18, col: 0xd0b894, roof: 'mansard', seed: 33, balc: true }), 41, 31, -Math.PI / 2);
    // Eingang: Freitreppe, Säulen, Vordach, Schild, Fahnen
    const E = new MB(17); E.jit = 0.02;
    for (let i = 0; i < 4; i++) { E.box(3.4, (4 - i) * 0.14, 8.4, 31.8 - i * 0.55, 0, 4, 0xd8ccb4, { grad: [0.85, 1] }); E.box(3.0, 0.02, 2.6, 31.8 - i * 0.55, (4 - i) * 0.14, 4, 0x9a2a2e); }   // 4 Stufen mit rotem Läufer
    E.box(4.4, 0.34, 8.6, 29.6, 3.5, 4, 0x2a2a30); E.box(4.5, 0.08, 8.7, 29.6, 3.84, 4, 0xd9b56a); E.box(0.3, 0.3, 8.7, 27.5, 3.5, 4, 0xd9b56a);   // Vordach
    for (const z of [0.2, 3.0, 5.0, 7.8]) { E.box(0.7, 0.2, 0.7, 27.9, 0, z, 0xcfc3aa); E.cyl(0.24, 0.26, 3.1, 10, 27.9, 0.2, z, 0xe6dcc6, { grad: [0.85, 1] }); E.box(0.6, 0.2, 0.6, 27.9, 3.3, z, 0xcfc3aa); this.ring(27.9, z, 0.3); }
    E.box(0.4, 3.1, 3.0, 31.8, 0.56, 4, 0x1e1c18);                                                                                      // Türnische
    for (const z of [-4.4, 12.4]) E.cyl(0.05, 0.06, 7.4, 6, 27.6, 0, z, 0x8a8a92);
    for (const z of [-4.4, 12.4]) E.box(0.05, 0.9, 1.5, 27.6, 6.2, z + 0.75, z > 8 ? 0xd9b56a : 0x8a2a30);
    for (const z of [-1.4, 9.6]) { E.box(1.0, 0.9, 1.0, 26.2, 0, z, 0x8a8478); E.sph(0.7, 26.2, 1.5, z, 0x3f6a34, { d: 1 }); this.ring(26.2, z, 0.6); }        // Kübelpflanzen
    this.add(E.mesh(Mat.lit({ spec: 0x666666, shin: 26 }), { cast: true, receive: true }));
    const signTex = texSign('BELVEDERE', { bg: '#1c1a14', fg: '#e6c266', size: 82 });
    const sign = new THREE.Mesh(GEO.plane, Mat.tex(signTex, { emissive: 0x000000 })); sign.scale.set(5.8, 1.45, 1); sign.position.set(31.62, 4.95, 4); sign.rotation.y = -Math.PI / 2; this.add(sign); this.hotelSign = sign;
    // Drehtür
    const dg = new THREE.Group(); dg.position.set(31.3, 0.56, 4);
    const dm = new MB(18); dm.cyl(1.35, 1.35, 0.12, 14, 0, 2.6, 0, 0x2a2a30); dm.cyl(1.35, 1.35, 0.1, 14, 0, 0, 0, 0x2a2a30); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6; dm.box(0.07, 2.6, 0.07, Math.sin(a) * 1.3, 0, Math.cos(a) * 1.3, 0xc9a24a); }
    dg.add(dm.mesh(Mat.lit({ spec: 0xffddaa, shin: 50 })));
    const wings = new THREE.Group(); const wm = new MB(19); wm.plane(1.25, 2.5, 0.62, 1.3, 0, 0xcfe0e6, { ry: Math.PI / 2 }); wm.plane(1.25, 2.5, -0.62, 1.3, 0, 0xcfe0e6, { ry: Math.PI / 2 }); wm.plane(1.25, 2.5, 0, 1.3, 0.62, 0xcfe0e6); wm.plane(1.25, 2.5, 0, 1.3, -0.62, 0xcfe0e6);
    wings.add(wm.mesh(Mat.lit({ transparent: true, opacity: 0.22, side: THREE.DoubleSide, spec: 0xffffff, shin: 80 }), { cast: false, receive: false }));
    const hub = new MB(20); hub.cyl(0.05, 0.05, 2.6, 6, 0, 0, 0, 0xc9a24a); wings.add(hub.mesh(Mat.lit({ spec: 0xffddaa, shin: 50 }))); dg.add(wings); this.add(dg); this.doorWings = wings; this.doorSpin = 0.35;
    // Warmes Licht im Foyer (Leuchtfläche hinter dem Glas)
    LG.plane(2.6, 2.6, 31.7, 1.9, 4, [2.4, 1.6, 0.7], { ry: -Math.PI / 2 });
    // Der Wagen wartet
    this.car = mkCar(); this.car.position.set(23.4, 0, -4.2); this.car.rotation.y = 0.0; this.add(this.car);
    this.ring(23.4, -4.2 - 1.9, 1.3); this.ring(23.4, -4.2, 1.3); this.ring(23.4, -4.2 + 1.9, 1.3);

    // ---------- Café Aurora: Terrasse ----------
    const T = new MB(41), TG = new MB(42); TG.jit = 0;
    const tables = [[-23.6, -33, 0xefe2c4, [0, Math.PI], 0], [-23, -27, 0xc9704a, null, 0.9], [-19, -33.2, 0xefe2c4, null, 2.1], [-14.6, -31, 0xc9704a, null, 3.3], [-14.4, -26, 0xefe2c4, [0, Math.PI], 0]];
    tables.forEach(([x, z, par, ang, ry], i) => { T.merge(mkCafeSet(50 + i, par, ang || [0.4, 2.4, 4.4]), x, 0, z, ry); this.ring(x, z, 0.5); });
    this.ring(-19, -28, 0.5);
    // Zaun + Pflanzkübel um die Terrasse (Öffnung Richtung Süden bei x −20,5 … −17,5)
    const fence = (x0, z0, x1, z1) => { const l = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(l / 1.6)); for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t); T.box(0.07, 0.95, 0.07, x, 0, z, 0x3a2e24); } const a = Math.atan2(x1 - x0, z1 - z0); T.box(0.05, 0.05, l, (x0 + x1) / 2, 0.9, (z0 + z1) / 2, 0x4a3a2c, { ry: a }); T.box(0.04, 0.04, l, (x0 + x1) / 2, 0.55, (z0 + z1) / 2, 0x4a3a2c, { ry: a }); };
    fence(-25.6, -35.4, -25.6, -22.6); fence(-25.6, -22.6, -20.6, -22.6); fence(-17.4, -22.6, -11.6, -22.6); fence(-11.6, -22.6, -11.6, -35.4);
    this.collide(-25.7, -35.6, -25.5, -22.5); this.collide(-25.7, -22.7, -20.6, -22.5); this.collide(-17.4, -22.7, -11.5, -22.5); this.collide(-11.7, -35.6, -11.5, -22.5);
    for (const [x, z] of [[-25.6, -22.6], [-20.6, -22.6], [-17.4, -22.6], [-11.6, -22.6], [-25.6, -29], [-11.6, -29]]) { T.box(0.5, 0.42, 0.5, x, 0, z, 0x8a5a3a); T.sph(0.36, x, 0.72, z, 0x4f7a3a, { d: 1 }); for (let k = 0; k < 4; k++) T.sph(0.09, x + Math.sin(k * 1.7) * 0.2, 0.9 + (k % 2) * 0.08, z + Math.cos(k * 1.7) * 0.2, k % 2 ? 0xe8809a : 0xd23a3a, { d: 0 }); }
    // Lichterketten über der Terrasse
    const string = (a, b, n, sag) => { for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(a[0], b[0], t), z = lerp(a[2], b[2], t), y = lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * sag; LG.sph(0.075, x, y, z, [4.6, 3.1, 1.3], { d: 0 }); if (i < n) { const t2 = (i + 1) / n, x2 = lerp(a[0], b[0], t2), z2 = lerp(a[2], b[2], t2), y2 = lerp(a[1], b[1], t2) - Math.sin(t2 * Math.PI) * sag; ST.box(0.02, 0.02, Math.hypot(x2 - x, z2 - z, y2 - y), (x + x2) / 2, Math.min(y, y2), (z + z2) / 2, 0x111111, { ry: Math.atan2(x2 - x, z2 - z) }); } } };
    for (const z of [-24.5, -29.5, -34.5]) { T.cyl(0.05, 0.05, 3.8, 5, -25.6, 0, z, 0x2a2a30); T.cyl(0.05, 0.05, 3.8, 5, -11.6, 0, z, 0x2a2a30); string([-25.6, 3.7, z], [-11.6, 3.7, z], 14, 0.7); }
    this.add(T.mesh(Mat.lit({ spec: 0x2a2a2a, shin: 12 }), { cast: true, receive: true }));
    // Schild + Deal-Tisch als eigene Objekte (leuchten im Fokus golden)
    const cs = new THREE.Mesh(GEO.plane, Mat.tex(texSign('CAFÉ AURORA', { bg: '#241813', fg: '#e8c98a', size: 66 }), { emissive: 0x000000 })); cs.scale.set(4.6, 1.15, 1); cs.position.set(-18.5, 4.35, -35.88); this.add(cs); this.cafeSign = cs;
    const cm = new MB(80); cm.jit = 0; cm.box(0.33, 0.006, 0.24, 0, 0, 0, 0xf2eee2); for (let i = 0; i < 5; i++) cm.box(0.24, 0.002, 0.008, -0.02, 0.006, -0.08 + i * 0.038, 0x4a4a4a);
    this.contract = cm.mesh(Mat.lit({}), { cast: false, receive: false }); this.contract.position.set(-19.02, 0.766, -28.0); this.contract.rotation.y = 0.12; this.contract.visible = false; this.add(this.contract);
    const fm = new MB(81); fm.box(0.34, 0.022, 0.26, 0, 0, 0, 0x3a2418); fm.box(0.3, 0.004, 0.22, 0, 0.022, 0, 0x4a2e1e);
    this.folder = fm.mesh(Mat.lit({ spec: 0x442a1a, shin: 20 }), { cast: true, receive: false }); this.folder.position.set(-19.16, 0.766, -27.62); this.folder.rotation.y = -0.2; this.add(this.folder);
    const dt = mkCafeSet(60, null, [0, Math.PI]); this.dealTable = dt.mesh(Mat.lit({ spec: 0x2a2a2a, shin: 12 }), { cast: true, receive: true }); this.dealTable.position.set(-19, 0, -28); this.add(this.dealTable);

    // ---------- Platz: Brunnen, Kiosk, Uhr, Bänke, Laternen, Bäume ----------
    const F = new MB(43); F.jit = 0.02;
    F.cyl(3.0, 3.1, 0.62, 16, 0, 0, 0, 0xb8ad98, { grad: [0.85, 1] }); F.cyl(2.7, 2.7, 0.08, 16, 0, 0.6, 0, 0x8a8272);
    F.cyl(0.35, 0.5, 0.9, 8, 0, 0.5, 0, 0xc4baa4); F.cyl(1.2, 0.55, 0.32, 12, 0, 1.3, 0, 0xc4baa4); F.cyl(0.18, 0.28, 0.9, 8, 0, 1.6, 0, 0xc4baa4); F.cyl(0.62, 0.22, 0.2, 10, 0, 2.4, 0, 0xc4baa4); F.sph(0.16, 0, 2.7, 0, 0xd0c6b0, { d: 1 });
    const fg = new THREE.Group(); fg.position.set(-4, 0, -6); fg.add(F.mesh(Mat.lit({ spec: 0x777777, shin: 30 })));
    const waterM = new THREE.Mesh(new THREE.CircleGeometry(2.72, 20), keepMask(new THREE.MeshBasicMaterial({ color: tcol(0x5f8fa0, 0.7), transparent: true, opacity: 0.85, fog: true }), false)); waterM.rotation.x = -Math.PI / 2; waterM.position.y = 0.56; fg.add(waterM);
    this.fountain = { g: fg, water: waterM };
    // Tropfen
    const dropG = new THREE.IcosahedronGeometry(0.035, 0), dropM = Mat.glow({ vertexColors: false, color: 0xffffff }); dropM.color.setRGB(1.5, 1.7, 2.0);
    this.drops = new THREE.InstancedMesh(dropG, dropM, 70); this.drops.frustumCulled = false; fg.add(this.drops);
    this.dropS = Array.from({ length: 70 }, (_, i) => ({ t: (i / 70) * 2.4, a: (i * 2.399) % TAU, v: 1.6 + (i % 5) * 0.16, h: 2.75, r: 0.25 + (i % 7) * 0.05 }));
    this.add(fg); this.ring(-4, -6, 3.15);
    // Kiosk
    const K = new MB(44); K.jit = 0.02; K.box(3.0, 2.5, 2.2, 0, 0, 0, 0x3f5a52, { grad: [0.85, 1] }); K.box(3.3, 0.16, 2.6, 0, 2.5, 0, 0x2a3a34); K.box(2.4, 1.3, 0.1, 0, 0.9, 1.12, 0x1a1a1a);
    for (let i = 0; i < 6; i++) K.box(0.5, 0.05, 1.0, -1.25 + i * 0.5, 2.25, 1.6, i % 2 ? 0xefe2c4 : 0xb5372f, { rx: 0.4 });
    for (let i = 0; i < 5; i++) K.box(0.36, 0.5, 0.04, -1.0 + i * 0.5, 0.95, 1.16, [0xd0c8b4, 0xb8a888, 0xc8b898, 0xa8a090, 0xd8d0c0][i]);
    const kg = new THREE.Group(); kg.position.set(-27.4, 0, 8); kg.rotation.y = Math.PI / 2; kg.add(K.mesh(Mat.lit({ spec: 0x333333, shin: 14 }))); this.add(kg); this.collide(-28.7, 6.3, -26.1, 9.7);
    // Uhr
    this.clock = mkClockPost(this.clockH, this.clockM); this.clock.position.set(-9.4, 0, -22); this.add(this.clock); this.ring(-9.4, -22, 0.3);
    // Bänke Richtung Fluss + am Brunnen
    const BE = new MB(45);
    for (const [x, z, ry] of [[-30.4, -12, -Math.PI / 2], [-30.4, 0, -Math.PI / 2], [-30.4, 12, -Math.PI / 2], [-30.4, 22, -Math.PI / 2], [-8.4, -6, -Math.PI / 2], [0.4, -6, Math.PI / 2], [-4, -10.4, Math.PI], [-4, -1.6, 0]]) { BE.merge(mkBench(), x, 0, z, ry); if (Math.abs(Math.sin(ry)) > 0.5) this.collide(x - 0.4, z - 0.9, x + 0.4, z + 0.9); else this.collide(x - 0.9, z - 0.4, x + 0.9, z + 0.4); }
    this.add(BE.mesh(Mat.lit({ spec: 0x333333, shin: 10 })));
    this.benches = [[-30.4, 0], [-30.4, 12], [-30.4, 22]];
    // Straßenmusiker auf der Bank südlich des Brunnens: er spielt, solange man in der Nähe ist
    const mu = makeNPC('Musiker', { top: 0x6a4a3a, bottom: 0x3a3630, under: 0xd8d0be, shoe: 0x2a2018, hair: 0xd0ccc4, hairStyle: 'grey', skin: SKIN.olive, torso: 'cardigan', s: 0.98, headR: 0.118 });
    mu.place(-4, 0, -1.55, 0); mu.setPose(sitP({ lean: 5, nod: 16, L: { arm: [64, 10, 0], fore: 66 }, R: { arm: [36, 4, 0], fore: 96, hand: 8 } })); mu.snapPose(); this.addChar(mu);
    const oudM = mkOud().mesh(Mat.lit({ spec: 0x664422, shin: 30 }), { cast: true, receive: false }); oudM.scale.setScalar(0.95); oudM.position.set(0.02, 0.06, 0.3); oudM.rotation.set(-0.12, 0.05, -0.85); mu.j.hips.add(oudM);
    mu.overlay = zeroPose(); mu.pluck = 0;
    mu.onUpdate = (dt) => { mu.pluck = Math.max(0, mu.pluck - dt * 6); mu.overlay.foreR[0] = -mu.pluck * 9; mu.overlay.handR[0] = mu.pluck * 14; };
    this.musician = mu; this.muT = 3; this.muDeg = 2; this.muSong = false; this.muI = 0; this.muDone = false;
    const hat = new MB(82); hat.box(0.5, 0.07, 0.3, 0, 0, 0, 0x2a2018); hat.box(0.44, 0.02, 0.24, 0, 0.07, 0, 0x120c08); for (let i = 0; i < 7; i++) hat.box(0.035, 0.008, 0.035, -0.16 + i * 0.05, 0.085, -0.04 + (i % 3) * 0.04, [0xd9b56a, 0xb8b8c0, 0xd9b56a][i % 3], { jit: 0 });
    const hm = hat.mesh(Mat.lit({ spec: 0x555555, shin: 20 }), { cast: false }); hm.position.set(-4.0, 0, -0.5); hm.rotation.y = 0.2; this.add(hm);
    // Eine Zeichnerin auf der Bank am Fluss – sie bleibt im Fokus als Einzige in Farbe
    const nr = makeNour();
    nr.place(-30.3, 0, 0.0, -Math.PI / 2); nr.setPose(sitP({ lean: 5, nod: 20, L: { arm: [30, 8, 0], fore: 66 }, R: { arm: [30, 6, 0], fore: 72, hand: 12 } })); nr.snapPose();
    nr.hold('sketch', true); nr.hold('pencil', true); nr.overlay = zeroPose(); this.addChar(nr); this.nour = nr;
    nr.onUpdate = () => { const t = G.t; nr.overlay.foreR[0] = Math.sin(t * 2.3) * 3; nr.overlay.handR[2] = Math.sin(t * 5.1) * 7; nr.overlay.handR[0] = Math.sin(t * 3.7) * 4; };
    // Laternen (Arm zeigt zum Platz)
    const lamps = [[-33, -30, 0], [-33, -16, 0], [-33, -2, 0], [-33, 12, 0], [-33, 26, 0], [-12, -34, -Math.PI / 2], [4, -34, -Math.PI / 2], [-12, 32, Math.PI / 2], [4, 32, Math.PI / 2], [24, -30, Math.PI], [24, -14, Math.PI], [24, 20, Math.PI], [24, 30, Math.PI], [-9, 4, 0]];
    for (const [x, z, ry] of lamps) { const l = mkLamp(true); B.merge(l.body, x, 0, z, ry); LG.merge(l.glow, x, 0, z, ry); this.ring(x, z, 0.22); }
    // Bäume: Uferpromenade, Südkante, Hotelvorplatz
    const trees = [];
    for (let z = -28; z <= 24; z += 8) trees.push([-31.2, z + ((z * 7) % 3) * 0.3]);
    for (const x of [-26, -14, -2, 8, 24, 30]) trees.push([x, 32.6]);
    for (const z of [-18, -8, 8, 16, 26]) trees.push([21.4, z]);
    trees.push([-14.5, 12], [6, -20], [-12, 22], [10, 8]);
    trees.forEach(([x, z], i) => { FO.merge(mkTree(70 + i, 0.74 + (i % 4) * 0.06), x, 0, z, i * 1.3); this.ring(x, z, 0.32); });
    this.add(FO.mesh(Mat.lit({ spec: 0x111111, shin: 4 }), { cast: true, receive: true }));

    // ---------- Gebäudemeshes ----------
    this.add(B.mesh(matLit, { cast: true, receive: true })); this.add(GL.mesh(matGlass, { cast: false, receive: false })); this.add(LG.mesh(matGlow, { cast: false, receive: false })); this.add(ST.mesh(Mat.lit({ spec: 0x000000 }), { cast: false, receive: false }));

    // ---------- Straßenbahn ----------
    this.tram = makeTram(); this.tram.position.set(16, 0.05, -150); this.tram.visible = false; this.add(this.tram);
    this.tramCol = { x0: 14.7, x1: 17.3, z0: 1e4, z1: 1e4 }; this.colliders.push(this.tramCol);

    // ---------- Menschen ----------
    this.crowd = new Crowd(46, [
      { a: [-30, 21], b: [12, 22] }, { a: [-30, 6], b: [11, 10] }, { a: [-30, -12], b: [11, -14] }, { a: [-14, 33], b: [-8, -16] }, { a: [-24, 30], b: [-30, -8] },
      { a: [22.6, 30], b: [27, -22] }, { a: [22, 14], b: [28, 6.8] }, { a: [-8, -20], b: [10, -20] }, { a: [-140, 27], b: [-38, 27] }, { a: [-120, 25.4], b: [-40, 28.6] },
    ], { seed: 8, standP: 0.12 });
    this.add(this.crowd.group);
    this.pigeons = new Pigeons(11, [-14, 6, 2, 22], { seed: 12 }); this.add(this.pigeons.group);
    this.birds = new Birds(12, { center: [-60, 34, 30], spread: [50, 8, 40], seed: 5 }); this.add(this.birds.group);
    // Nebenfiguren: Gäste, Kellner, Portier
    const seat = (ch, x, z, yaw, pose = 'sitChair') => { ch.place(x, 0, z, yaw); ch.setPose(pose); ch.snapPose(); this.addChar(ch); return ch; };
    this.brandt = seat(makeNPC('Brandt', { top: 0x55586a, bottom: 0x3a3a40, under: 0xe8e2d2, shoe: 0x1c1512, hair: 0xb9b5ad, hairStyle: 'grey', skin: SKIN.pale, torso: 'suit', torsoW: 1.1, headR: 0.125, tie: 0x6a2a30, s: 1.02, brow: 0.05 }), -19, -28.72, 0);
    this.guests = [
      seat(makeNPC('Gast A', { top: 0x8a4a4a, bottom: 0x2a2a30, hair: 0x2a1c14, hairStyle: 'bob', skin: SKIN.olive, torso: 'cardigan', s: 0.94 }), -23.6, -33 - 0.72, 0),
      seat(makeNPC('Gast B', { top: 0x5a6a7a, bottom: 0x3a3a44, hair: 0x3a2a1c, hairStyle: 'short', skin: SKIN.tan, torso: 'sweater' }), -23.6, -33 + 0.72, Math.PI),
      seat(makeNPC('Gast C', { top: 0xd8c8a8, bottom: 0x4a3a30, hair: 0xc8c4bc, hairStyle: 'grey', skin: SKIN.pale, torso: 'cardigan', s: 0.95 }), -14.4, -26 + 0.72, Math.PI),
    ];
    this.waiter = makeNPC('Kellner', { top: 0xf2ecdc, bottom: 0x1a1a1e, under: 0xf2ecdc, hair: 0x1a1512, hairStyle: 'quiff', skin: SKIN.olive, torso: 'blazer', tie: 0x1a1a1e }); this.waiter.place(-15.4, 0, -33.6, Math.PI); this.waiter.setPose('stand'); this.addChar(this.waiter);
    this.doorman = makeNPC('Portier', { top: 0x5a1c22, bottom: 0x2a1a1c, under: 0xe8e2d2, shoe: 0x0c0a0a, hair: 0x2a2320, hairStyle: 'short', skin: SKIN.dark, torso: 'suit', tie: 0xd9b56a, s: 1.04 }); this.doorman.place(29.0, 0, 1.6, -Math.PI / 2); this.doorman.setPose('stand'); this.addChar(this.doorman);
    this.waiterT = 4;

    // ---------- Lichter ----------
    const pl1 = new THREE.PointLight(0xffb060, 0, 20, 1.5); pl1.position.set(-18.5, 3.2, -28); this.add(pl1); pl1.userData.base = 2.4; this.pl.push(pl1);
    const pl2 = new THREE.PointLight(0xffb868, 0, 22, 1.5); pl2.position.set(28.5, 3.0, 4); this.add(pl2); pl2.userData.base = 2.6; this.pl.push(pl2);
    // ---------- Fokus: Wichtiges leuchtet golden ----------
    this.markImportant(this.dealTable, { gain: 1.0, when: () => G.state.flags.dealCafe === 'open' });
    this.markImportant(this.cafeSign, { gain: 0.9, when: () => G.state.flags.dealCafe === 'open' });
    this.markImportant(this.hotelSign, { gain: 0.9, when: () => G.state.flags.dealHotel === 'open' });
    this.markImportant(this.car, { gain: 0.9, when: () => !!G.state.flags.carSeen || G.state.flags.dealHotel === 'open' });
    this.markImportant(this.clock, { gain: 0.8, when: () => G.state.flags.dealCafe === 'open' });

    // ---------- Interaktionen ----------
    const I = (spec) => this.interact(spec);
    I({ at: [-19, -25.6], r: 1.9, label: 'Setzen', name: 'Herr Brandt', pos: [-19, 1.5, -27.2], when: () => G.state.flags.dealCafe === 'open', run: () => Story.cityBrandt() });
    I({ at: [26.4, 4], r: 2.3, label: 'Eintreten', name: 'Hotel Belvedere', pos: [31.4, 1.6, 4], when: () => G.state.flags.dealHotel === 'open', run: () => Story.cityHotelDoor() });
    I({ at: [-9.4, -20.4], r: 1.8, label: 'Ansehen', name: 'Uhr', pos: [-9.4, 4.0, -22], run: () => Story.cityClock() });
    I({ at: [-24.6, 8], r: 1.9, label: 'Ansehen', name: 'Zeitungen', pos: [-26.3, 1.4, 8], run: () => Story.cityNews() });
    I({ at: [-4, -2.7], r: 2.0, label: 'Ansehen', name: 'Brunnen', pos: [-4, 1.0, -3], run: () => Story.cityFountain() });
    I({ at: [-29.0, 0.0], r: 1.7, label: 'Ansehen', name: 'Eine Zeichnerin', pos: [-30.3, 1.3, 0], run: () => Story.cityNour() });
    I({ at: [-4, 0.0], r: 1.7, label: 'Zuhören', name: 'Straßenmusiker', pos: [-4, 1.35, -1.55], run: () => Story.cityMusician() });
    I({ at: [22.4, -7.6], r: 2.2, label: 'Ansehen', name: 'Der Wagen', pos: [23.4, 1.2, -4.2], run: () => Story.cityCar() });
    I({ at: [-29.4, 12], r: 1.5, label: 'Setzen', name: 'Bank am Fluss', pos: [-30.4, 0.9, 12], run: () => Story.cityBench() });
    I({ at: [-29.6, 26.4], r: 2.4, label: 'Ansehen', name: 'Die Brücke', pos: [-36, 1.4, 27], run: () => Story.cityBridge() });

    this.onUpdate((dt) => this.tick(dt));
  }
  tick(dt) {
    const pp = Player.ch.root.position, c = Atmo.cur;
    this.river.userData.update();
    // Straßenlaternen, Fenster & Lichterketten gehen an, wenn die Sonne sinkt
    const k = lerp(1, 0.14, clamp(c.keyInt / 3.0));
    if (Math.abs(k - this.lampK) > 0.002) { this.lampK = k; for (const m of this.glowMats) m.color.setRGB(k, k, k); }
    for (const p of this.pl) p.intensity = p.userData.base * clamp((k - 0.18) / 0.8);
    // Brunnen
    this.fountain.water.material.color.setRGB(c.skyHorizon[0] * 0.35 + 0.02, c.skyHorizon[1] * 0.35 + 0.05, c.skyHorizon[2] * 0.35 + 0.08);
    const m4 = _m4b, q = _q, e = _eu; e.set(0, 0, 0); q.setFromEuler(e);
    for (let i = 0; i < this.dropS.length; i++) {
      const d = this.dropS[i]; d.t += dt; const life = 2.2, t = d.t % life, u = t / life;
      const rr = d.r + u * d.v * 0.9, y = 2.7 + t * 2.2 - 3.3 * t * t;
      m4.compose(_pv.set(Math.cos(d.a) * rr, Math.max(0.6, y), Math.sin(d.a) * rr), q, _sv.set(1, 1, 1)); this.drops.setMatrixAt(i, m4);
    }
    this.drops.instanceMatrix.needsUpdate = true;
    // Drehtür + Kellner
    this.doorWings.rotation.y += dt * this.doorSpin;
    this.waiterT -= dt;
    if (this.waiterT <= 0 && !this.waiter.moveT) { this.waiterT = 5 + Math.random() * 4; const spots = [[-23.5, -24.2], [-18.5, -24.2], [-13.6, -24.2], [-16, -35.0]]; const s = spots[Math.floor(Math.random() * spots.length)]; this.waiter.walkTo(s[0], s[1], { speed: 0.9 }).catch(() => {}); }
    // Straßenbahn
    if (this.tramState === 'wait') { this.tramT -= dt; if (this.tramT <= 0) { this.tramState = 'run'; this.tramZ = -150; this.tram.visible = true; this.tramBell = false; } }
    else {
      this.tramZ += 9 * dt; this.tram.position.z = this.tramZ;
      this.tramCol.z0 = this.tramZ - 19.4; this.tramCol.z1 = this.tramZ + 6.6;
      if (!this.tramBell && this.tramZ > -62) { this.tramBell = true; const pan = clamp((16 - Cam.pos.x) / 24, -0.9, 0.9); Snd.tramBell({ pan: -pan }); Snd.tram(15, -pan, -pan, { gain: 0.9 }); }
      if (this.tramZ - 19.4 > 150) { this.tramState = 'wait'; this.tramT = 20 + Math.random() * 14; this.tram.visible = false; this.tramCol.z0 = this.tramCol.z1 = 1e4; }
    }
    this.crowd.update(dt, pp); this.pigeons.update(dt, pp); this.birds.update(dt);
    this.playMusician(dt, pp);
    // Musik reagiert aufs Gehen: ruhig im Stehen, Rhythmus im Schritt – und schweigt neben dem Straßenmusiker
    if (this.adaptive) {
      const mv = Player.speed > 0.5 && G.mode === 'play', mr = this.musician.root.position;
      this._mv = clamp((this._mv || 0) + (mv ? dt : -dt), -3, 3);
      const nearMu = Math.hypot(pp.x - mr.x, pp.z - mr.z) < 6.5;
      const want = nearMu ? 'silence' : this._mv > 1.2 ? 'walk' : this._mv < -1.6 ? 'calm' : (this._want === 'silence' ? 'calm' : this._want);
      if (want && want !== this._want) { this._want = want; Mus.mood(want, want === 'walk' ? 3 : want === 'silence' ? 2 : 4); }
    }
  }
  // Der Musiker spielt eine hijaz-Phrase Ton für Ton – lauter, je näher man kommt; oder das feste Lied (muSong)
  playMusician(dt, pp) {
    const mu = this.musician, mr = mu.root.position;
    this.muT -= dt;
    if (this.muT > 0) return;
    let deg, wait;
    if (this.muSong) {
      const n = MUSICIAN_SONG[this.muI++];
      if (!n) { this.muSong = false; this.muDone = true; this.muT = 5; return; }
      deg = n[0]; wait = n[1];
    } else {
      this.muDeg = clamp(this.muDeg + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)], -1, 6);
      deg = this.muDeg; wait = [0.55, 0.7, 0.9, 1.3, 2.6][Math.floor(Math.random() * 5)];
    }
    this.muT = wait; mu.pluck = 1;
    if (!AUD || !AUD.ready) return;
    const d = Math.hypot(pp.x - mr.x, pp.z - mr.z), gain = clamp(1.8 - d / 11, 0.05, 1.3);
    if (gain < 0.08) return;
    const fx = Cam.look.x - Cam.pos.x, fz = Cam.look.z - Cam.pos.z, fl = Math.hypot(fx, fz) || 1, dx = mr.x - Cam.pos.x, dz = mr.z - Cam.pos.z, dl = Math.hypot(dx, dz) || 1;
    const pan = clamp(((dx * -fz + dz * fx) / fl) / Math.max(4, dl), -0.85, 0.85);
    const f = TONIC * 0.5 * Math.pow(2, semiOf(MAQAM.hijaz, deg) / 12);
    Snd.pluck('oud', f, AUD.ctx.currentTime + 0.03, { vel: 0.5 + Math.random() * 0.25, hall: 0.42, room: 0.2, pan, gain: gain * 0.9, bus: 'sfx' });
  }
  setClockFace(h, m) {
    this.clockH = h; this.clockM = m;
    const tex = texClock(h, m); let old = null;
    this.clock.traverse((o) => { if (o.isMesh && o.material.map) { old = o.material.map; o.material.map = tex; } });
    if (old) old.dispose();
    G.state.clock = `${h}:${String(m).padStart(2, '0')}`;
  }
  onEnter() { Snd.ambSet('city', 0.42, 4); Snd.ambSet('crowd', 0.3, 4); Snd.ambSet('birds', 0.28, 4); Snd.ambSet('wind', 0.12, 4); }
  onLeave() { for (const n of ['city', 'crowd', 'birds', 'wind']) Snd.ambSet(n, 0, 2); }
}
WORLDS.city = CityWorld;
// [Tonstufe (hijaz, D3 = 0), Pause danach in Sekunden] – eine absteigende Klage, die zur Tonika heimkehrt
const MUSICIAN_SONG = [[4, 0.7], [3, 0.55], [2, 0.6], [1, 0.9], [0, 1.6], [1, 0.55], [2, 0.55], [3, 0.6], [4, 0.6], [5, 0.9], [4, 0.6], [3, 0.6], [2, 0.7], [1, 1.0], [0, 2.4]];

// Laterne direkt in Builder schreiben (Brücke)
function mkLampInto(B, LG, x, z, ry, s = 1) { const l = mkLamp(true); B.merge(l.body, x, 0, z, ry, s); LG.merge(l.glow, x, 0, z, ry, s); }
