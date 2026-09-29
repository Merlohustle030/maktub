// =====================================================================
// Hotel Belvedere – die Lobby. Marmor, Kronleuchter, hohe Fenster nach Westen: die tiefe Sonne wirft
// Fenstergitter auf den Boden. Eingang (Drehtür) im Süden (+Z), Freitreppe im Norden, Lounge am Fenster.
// x ∈ [−11, 11], z ∈ [−9.2, 9.2], Höhe 7,5
// =====================================================================
const LOBBY_ATMO = {
  skyTop: lin(0x4a5fa8), skyHorizon: lin(0xffb070), skyBottom: lin(0x6a5048),
  sunDir: [-0.95, 0.27, 0.16], sunCol: lin(0xffa858, 2.2), sunDisc: 1, sunGlow: 1.3, stars: 0, cloud: 0.5, cloudLit: lin(0xffa070, 1.4), cloudDark: lin(0x6a5a80),
  hemiSky: lin(0xd8c8a8, 1.0), hemiGround: lin(0x8a6a48), hemiInt: 0.44,
  keyCol: lin(0xffb060), keyInt: 3.3, fillCol: lin(0xffd8b0), fillInt: 0.3, fillDir: [0.7, 0.4, -0.3],
  fogCol: lin(0xf0b080, 0.6), fogDen: 0.004, fogHK: 0.05, fogBase: -1, fogMax: 0.6, fogSun: lin(0xff9850, 0.5),
  rimDir: [-0.95, 0.3, 0.16], rimCol: lin(0xffb060, 1.5),
  exposure: 0.84, contrast: 1.1, sat: 1.04, lift: [0.012, 0.006, 0.0], gain: [1.03, 1.0, 0.96], shadowTint: [0.02, 0.0, 0.02], highTint: [0.03, 0.012, -0.01],
  bloom: 0.42, bloomTint: [1, 0.9, 0.78], vig: 0.36, grain: 0.06, ca: 0.0018, dof: 0, dofFocus: 5, dofRange: 3, rays: 0.6, flare: 1.2,
};

function mkArmchair(col, seed) {
  const mb = new MB(seed); mb.jit = 0.02;
  mb.box(0.72, 0.16, 0.7, 0, 0.3, 0, col, { grad: [0.85, 1] }); mb.box(0.72, 0.5, 0.14, 0, 0.44, -0.33, col, { rx: -0.1 });
  mb.box(0.14, 0.26, 0.62, -0.36, 0.3, 0.02, col); mb.box(0.14, 0.26, 0.62, 0.36, 0.3, 0.02, col);
  for (const [x, z] of [[-0.3, -0.28], [0.3, -0.28], [-0.3, 0.28], [0.3, 0.28]]) mb.box(0.05, 0.3, 0.05, x, 0, z, 0x3a2a1a);
  mb.box(0.6, 0.06, 0.55, 0, 0.46, 0.04, mixHex(col, 0xffffff, 0.08));
  return mb;
}
function mkSofa(col, seed) {
  const mb = new MB(seed); mb.jit = 0.02;
  mb.box(2.0, 0.18, 0.86, 0, 0.28, 0, col); mb.box(2.0, 0.56, 0.16, 0, 0.42, -0.4, col, { rx: -0.08 });
  mb.box(0.16, 0.3, 0.8, -0.92, 0.28, 0, col); mb.box(0.16, 0.3, 0.8, 0.92, 0.28, 0, col);
  for (const x of [-0.9, 0.9]) for (const z of [-0.36, 0.36]) mb.box(0.05, 0.28, 0.05, x, 0, z, 0x3a2a1a);
  for (const x of [-0.45, 0.45]) mb.box(0.8, 0.08, 0.7, x, 0.46, 0.04, mixHex(col, 0xffffff, 0.06));
  return mb;
}
function mkPalm(seed) {
  const mb = new MB(seed); mb.jit = 0.04; const r = new RNG(seed);
  mb.cyl(0.36, 0.3, 0.5, 10, 0, 0, 0, 0x8a5a3a); mb.cyl(0.4, 0.4, 0.06, 10, 0, 0.5, 0, 0x6a4a30); mb.cyl(0.06, 0.09, 1.5, 6, 0, 0.5, 0, 0x6a5238);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + r.range(-0.15, 0.15), t1 = 0.55 + r.range(-0.15, 0.25), t2 = -0.5 - r.range(0, 0.3), L1 = 0.8, L2 = 0.75, c = i % 2 ? 0x3f6a34 : 0x4a7a3a;
    const dx = Math.sin(a), dz = Math.cos(a), x1 = dx * L1 * Math.cos(t1), y1 = 2.0 + L1 * Math.sin(t1), z1 = dz * L1 * Math.cos(t1);
    mb.box(0.3, 0.03, L1, dx * L1 * 0.5 * Math.cos(t1), 2.0 + L1 * 0.5 * Math.sin(t1), dz * L1 * 0.5 * Math.cos(t1), c, { rx: -t1, ry: a });
    mb.box(0.26, 0.03, L2, x1 + dx * L2 * 0.5 * Math.cos(t2), y1 + L2 * 0.5 * Math.sin(t2), z1 + dz * L2 * 0.5 * Math.cos(t2), c, { rx: -t2, ry: a });
  }
  return mb;
}
// Kronleuchter: Ring aus Kerzenlichtern + Kristalle. Gibt {body, glow} zurück
function mkChandelier(r, seed) {
  const body = new MB(seed), glow = new MB(seed + 1); glow.jit = 0; body.jit = 0.01;
  body.cyl(0.02, 0.02, 1.6, 4, 0, 0, 0, 0xc9a24a); body.cyl(0.14, 0.1, 0.36, 8, 0, -0.35, 0, 0xc9a24a);
  for (let ring = 0; ring < 2; ring++) {
    const rr = r * (ring ? 0.55 : 1), y = -0.7 - ring * 0.32, n = ring ? 8 : 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, x = Math.sin(a) * rr, z = Math.cos(a) * rr, x2 = Math.sin(a + TAU / n) * rr, z2 = Math.cos(a + TAU / n) * rr;
      body.box(0.035, 0.035, Math.hypot(x2 - x, z2 - z) * 1.02, (x + x2) / 2, y, (z + z2) / 2, 0xc9a24a, { ry: Math.atan2(x2 - x, z2 - z) });
      body.cyl(0.03, 0.03, 0.16, 5, x, y + 0.02, z, 0xf2ead6); glow.sph(0.06, x, y + 0.24, z, [4.4, 3.2, 1.6], { d: 1 });
      glow.sph(0.035, x * 0.94, y - 0.2, z * 0.94, [2.4, 2.2, 2.0], { d: 0 }); glow.sph(0.03, x * 0.7, y - 0.34, z * 0.7, [2.0, 1.9, 1.8], { d: 0 });
    }
    if (ring === 0) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; body.cyl(0.012, 0.012, 0.8, 3, Math.sin(a) * rr * 0.5, y - 0.8 + 0.4, Math.cos(a) * rr * 0.5, 0xc9a24a, { rz: Math.sin(a) * 0.5, rx: Math.cos(a) * 0.5 }); }
  }
  glow.sph(0.11, 0, -1.55, 0, [2.6, 2.4, 2.1], { d: 1 });
  return { body, glow };
}

class LobbyWorld extends World {
  constructor(o) {
    super('lobby', o);
    this.camMode = 'follow';
    this.follow = { dist: 3.9, height: 1.5, minPitch: 0.06, maxPitch: 0.62, yaw: 0, pitch: 0.2, fov: 44 };
    this.bounds = { x0: -10.3, x1: 10.3, z0: -8.5, z1: 8.4 };
    this.camBox = [-10.9, -8.9, 10.9, 8.9];
    this.camBlockers = [[8.3, 0, -6.3, 9.9, 3, -0.5], [-3, 0, -9.2, 3, 3.1, -5.5]];   // Rezeption, Freitreppe
    this.spawn = { x: 0, z: 7.4, yaw: Math.PI };
    this.surface = 'marble'; this.speed = 1.0;
    this.glowMats = []; this.pl = [];
  }
  async build() {
    const sc = this.scene;
    Atmo.attach(sc, { shadows: true, sky: true, shadowR: 14, sunDist: 32 });
    Atmo.set(LOBBY_ATMO);
    Atmo.sun.shadow.bias = -0.0004; Atmo.sun.shadow.normalBias = 0.03;
    Atmo.focusPoint.set(0, 0, 0);
    const matGlow = Mat.glow();
    const R = new MB(101), FL = new MB(102), GL = new MB(103), TR = new MB(104); GL.jit = 0; TR.jit = 0.01; R.ao(1.4, 0.16); FL.jit = 0.03;
    const cream = 0xdcc8a2, warm = 0xc4a97c, gold = 0xc9a24a, wood = 0x5a3a24;
    // Boden: Marmorschach + Medaillon
    FL.floor(22.8, 18.6, 0, 0, 0, 0xe4d8c4, { nx: 15, nz: 12, checker: 0x5a4c42 });
    FL.cyl(3.3, 3.3, 0.02, 28, 0, 0, 0, gold); FL.cyl(3.1, 3.1, 0.03, 28, 0, 0, 0, 0x2a2622); FL.cyl(2.5, 2.5, 0.04, 28, 0, 0, 0, 0xeadfc8); FL.cyl(0.9, 0.9, 0.05, 20, 0, 0, 0, gold);
    for (let i = 0; i < 8; i++) FL.box(0.06, 0.045, 2.2, Math.sin(i * Math.PI / 4) * 1.7, 0, Math.cos(i * Math.PI / 4) * 1.7, gold, { ry: i * Math.PI / 4 });
    // Teppichläufer zur Treppe
    FL.box(2.6, 0.03, 9.4, 0, 0, -2.6, 0x7a2a2e, { grad: [0.9, 1] }); FL.box(2.9, 0.025, 9.6, 0, 0, -2.6, gold);
    // Wände
    const H = 7.5;
    R.box(22.8, H, 0.4, 0, 0, -9.4, cream, { grad: [0.86, 1.04] });                                                                  // Nord
    R.box(9.6, H, 0.4, -6.6, 0, 9.4, cream, { grad: [0.86, 1.04] }); R.box(9.6, H, 0.4, 6.6, 0, 9.4, cream, { grad: [0.86, 1.04] }); R.box(3.6, H - 3.4, 0.4, 0, 3.4, 9.4, cream);   // Süd mit Türöffnung
    R.box(0.4, H, 18.8, 11.2, 0, 0, cream, { grad: [0.86, 1.04] });                                                                  // Ost
    const wz = [-6.6, -2.2, 2.2, 6.6], ww = 2.5;                                                                                       // West mit vier hohen Fenstern
    let zPrev = -9.4;
    for (const c of wz) { R.box(0.4, H, (c - ww / 2) - zPrev, -11.2, 0, (zPrev + c - ww / 2) / 2, cream, { grad: [0.86, 1.04] }); zPrev = c + ww / 2; R.box(0.4, 0.6, ww, -11.2, 0, c, warm); R.box(0.4, H - 5.6, ww, -11.2, 5.6, c, cream); }
    R.box(0.4, H, 9.4 - zPrev, -11.2, 0, (zPrev + 9.4) / 2, cream);
    // Fenstersprossen (werfen das Schattengitter)
    for (const c of wz) { for (const dz of [-ww / 2 + 0.03, ww / 2 - 0.03, 0]) R.box(0.1, 5.0, 0.07, -11.15, 0.6, c + dz, gold); R.box(0.1, 0.07, ww, -11.15, 3.6, c, gold); R.box(0.1, 0.07, ww, -11.15, 5.53, c, gold); R.box(0.1, 0.07, ww, -11.15, 2.0, c, gold); }
    // Sockel, Pilaster, Gesims
    R.box(0.16, 1.1, 18.6, 10.95, 0, 0, wood, { grad: [0.8, 1] }); R.box(22.6, 1.1, 0.16, 0, 0, -9.15, wood); R.box(0.2, 0.16, 18.8, 10.95, 1.1, 0, gold);
    R.box(23.4, 0.5, 0.5, 0, H - 0.4, -9.0, warm); R.box(0.5, 0.5, 19.2, 10.8, H - 0.4, 0, warm); R.box(0.5, 0.5, 19.2, -10.8, H - 0.4, 0, warm); R.box(23.4, 0.5, 0.5, 0, H - 0.4, 9.0, warm);
    for (const x of [-9, -6, -3, 3, 6, 9]) { R.box(0.7, 6.1, 0.22, x, 1.1, -9.1, warm); R.box(0.8, 0.24, 0.3, x, 6.6, -9.1, gold); }
    // Decke mit Kassetten
    R.box(22.8, 0.3, 18.8, 0, H, 0, 0xf0e6d0);
    for (let x = -8; x <= 8; x += 4) R.box(0.5, 0.36, 18.6, x, H - 0.36, 0, warm);
    for (let z = -6; z <= 6; z += 4) R.box(22.6, 0.3, 0.5, 0, H - 0.3, z, warm);
    // Säulen
    for (const x of [-5, 5]) for (const z of [-6, -2, 2, 6]) { R.cyl(0.55, 0.6, 0.35, 12, x, 0, z, gold); R.cyl(0.36, 0.4, H - 0.9, 12, x, 0.35, z, 0xf0e6d2, { grad: [0.86, 1.02] }); R.cyl(0.6, 0.5, 0.4, 12, x, H - 0.55, z, gold); this.ring(x, z, 0.55); }
    // Freitreppe (Nord)
    for (let i = 0; i < 10; i++) { R.box(5.4, 0.3 * (i + 1), 0.4, 0, 0, -5.6 - i * 0.36, 0xeee4d2, { grad: [0.9, 1] }); R.box(5.5, 0.03, 0.06, 0, 0.3 * (i + 1), -5.4 - i * 0.36, gold); }
    R.box(6.2, 3.0, 0.6, 0, 0, -9.0, 0xe4d8be);
    for (const sx of [-1, 1]) { for (let i = 0; i <= 10; i++) R.box(0.05, 1.0, 0.05, sx * 2.9, 0.3 * i + 0.02, -5.5 - i * 0.36, 0x22222a); R.box(0.1, 0.06, 3.9, sx * 2.9, 1.2, -7.4, 0x4a3020, { rx: Math.atan2(3.0, 3.6) * 0 }); R.box(0.36, 0.5, 0.36, sx * 2.9, 0, -5.4, gold); this.collide(sx * 2.9 - 0.3, -5.8, sx * 2.9 + 0.3, -5.0); }
    this.collide(-3.0, -9.0, 3.0, -5.5);
    // Großes Gemälde / Spiegel über der Treppe
    R.box(3.4, 2.4, 0.08, 0, 4.0, -9.12, gold); GL.plane(3.1, 2.1, 0, 5.2, -9.05, [0.22, 0.16, 0.1]);
    GL.plane(3.1, 0.9, 0, 4.6, -9.04, [0.42, 0.28, 0.14]); GL.plane(3.1, 0.9, 0, 5.5, -9.04, [0.16, 0.2, 0.3]);
    // Rezeption (Ost)
    R.box(1.5, 1.15, 5.6, 9.1, 0, -3.4, wood, { grad: [0.8, 1] }); R.box(1.7, 0.09, 5.8, 9.1, 1.15, -3.4, 0xefe6d4); R.box(1.72, 0.05, 5.82, 9.1, 1.1, -3.4, gold); this.collide(8.3, -6.3, 9.9, -0.5);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) R.box(0.12, 0.3, 0.32, 10.85, 1.4 + j * 0.5, -5.6 + i * 0.44, j % 2 ? gold : 0x3a2a1a);   // Schlüsselbrett
    GL.plane(0.5, 0.5, 10.98, 4.4, -3.4, [1.0, 0.85, 0.55], { ry: -Math.PI / 2 });
    // Aufzug
    for (const z of [3.4, 5.6]) { R.box(0.12, 2.9, 1.7, 10.9, 0, z, gold); R.box(0.14, 2.6, 0.06, 10.88, 0.1, z, 0x2a2622); GL.plane(0.4, 0.15, 10.8, 3.2, z, [3.0, 1.6, 0.4], { ry: -Math.PI / 2 }); }
    // Lounge am Fenster: Tisch + Sessel (Winter westlich, Mirza östlich)
    R.cyl(0.46, 0.46, 0.05, 12, -8.3, 0.66, -0.5, 0xefe6d4); R.cyl(0.04, 0.06, 0.66, 6, -8.3, 0, -0.5, gold); R.cyl(0.24, 0.26, 0.03, 8, -8.3, 0, -0.5, gold); this.ring(-8.3, -0.5, 0.5);
    TR.merge(mkArmchair(0x2f5a54, 111), -9.5, 0, -0.5, Math.PI / 2); TR.merge(mkArmchair(0x2f5a54, 112), -7.15, 0, -0.5, -Math.PI / 2);
    R.cyl(0.05, 0.05, 0.02, 6, -8.4, 0.71, -0.62, 0xefe6d4); R.cyl(0.03, 0.03, 0.09, 6, -8.4, 0.71, -0.62, 0xdcd8cc); R.cyl(0.03, 0.03, 0.09, 6, -8.22, 0.71, -0.36, 0xdcd8cc);   // Gläser
    // zweite Sitzgruppe (Ost) mit Gästen
    TR.merge(mkSofa(0x8a5a3a, 113), 7.2, 0, 4.4, Math.PI); TR.merge(mkSofa(0x8a5a3a, 114), 7.2, 0, 7.4, 0); R.box(1.2, 0.05, 0.7, 7.2, 0.4, 5.9, 0xefe6d4); R.cyl(0.04, 0.04, 0.4, 5, 7.2, 0, 5.9, gold); this.collide(6.1, 3.7, 8.3, 8.1);
    TR.merge(mkSofa(0x3a4a5a, 115), -6.6, 0, 6.8, 0); this.collide(-7.6, 6.2, -5.6, 7.4);
    // Zentraltisch mit riesigem Blumenstrauß
    R.cyl(0.9, 0.9, 0.06, 16, 0, 0.9, 0, 0xefe6d4); R.cyl(0.14, 0.4, 0.9, 8, 0, 0, 0, gold); R.cyl(0.5, 0.5, 0.05, 10, 0, 0, 0, gold); this.ring(0, 0, 0.9);
    R.lathe([[0.0, 0], [0.16, 0.02], [0.24, 0.24], [0.2, 0.42], [0.26, 0.5]], 10, 0, 0.96, 0, 0xd8d0c0, { jit: 0.01 });
    R.sph(0.46, 0, 1.55, 0, 0x3f6a34, { d: 1, sy: 0.6 });
    const fr = new RNG(9); for (let i = 0; i < 26; i++) { const a = fr.range(0, TAU), el = fr.range(0.25, 1.35), rr = 0.46 * Math.cos(el) + 0.04, y = 1.55 + 0.46 * 0.62 * Math.sin(el); R.sph(fr.range(0.07, 0.11), Math.sin(a) * rr, y, Math.cos(a) * rr, fr.pick([0xf4ede0, 0xe8809a, 0xf4ede0, 0xd9b45a, 0xb84a5a]), { d: 1 }); }
    // Palmen
    for (const [x, z] of [[-10.0, 8.0], [10.0, 8.0], [-10.0, -8.0], [10.0, -8.4], [-2.6, -5.0], [2.6, -5.0]]) { TR.merge(mkPalm(120 + Math.round(x * 3 + z)), x, 0, z, x * 1.7); this.ring(x, z, 0.4); }
    // Wandleuchten
    for (const z of [-6.5, -2.0, 2.0, 6.5]) { R.box(0.12, 0.34, 0.2, 10.9, 2.4, z, gold); GL.sph(0.12, 10.72, 2.7, z, [3.6, 2.4, 1.1], { d: 1 }); }
    for (const x of [-7.5, -4.5, 4.5, 7.5]) { R.box(0.2, 0.34, 0.12, x, 2.4, -9.05, gold); GL.sph(0.12, x, 2.7, -8.9, [3.6, 2.4, 1.1], { d: 1 }); }
    // Drehtür-Wand: Tageslicht draußen als Leuchtfläche
    GL.plane(3.3, 3.3, 0, 1.75, 10.0, [2.2, 1.7, 1.1]); R.box(0.3, 3.4, 0.5, -1.9, 0, 9.4, gold); R.box(0.3, 3.4, 0.5, 1.9, 0, 9.4, gold); R.box(4.1, 0.3, 0.5, 0, 3.3, 9.4, gold);
    // Kronleuchter
    const ch1 = mkChandelier(1.5, 130), ch2 = mkChandelier(0.9, 140), ch3 = mkChandelier(0.9, 150);
    R.merge(ch1.body, 0, 6.6, 0, 0); GL.merge(ch1.glow, 0, 6.6, 0, 0); R.merge(ch2.body, 0, 6.5, -5.5, 0); GL.merge(ch2.glow, 0, 6.5, -5.5, 0); R.merge(ch3.body, 0, 6.5, 5.5, 0); GL.merge(ch3.glow, 0, 6.5, 5.5, 0);
    this.add(R.mesh(Mat.lit({ spec: 0x554433, shin: 22 }), { cast: true, receive: true }));
    this.add(FL.mesh(Mat.lit({ spec: 0x4a4a4a, shin: 70 }), { cast: false, receive: true }));
    this.add(TR.mesh(Mat.lit({ spec: 0x2a2a2a, shin: 12 }), { cast: true, receive: true }));
    this.add(GL.mesh(matGlow, { cast: false, receive: false })); this.glowMats.push(matGlow);
    // Draußen: die Straße im Gegenlicht (Silhouetten) – nur durch die Fenster sichtbar
    const sk = buildSkyline({ rMin: 60, rMax: 160, count: 34, angA: -2.4, angB: -1.1, hMin: 8, hMax: 30, litP: 0.3, seed: 61, y0: -6, modernP: 0.2, gapA: -1.74, gapW: 0.3, gapH: 2 });
    this.add(sk.body); this.add(sk.win); sk.glow.material = matGlow; this.add(sk.glow);
    const wall = new MB(6); wall.box(30, 8, 6, -40, -3, 0, 0x50504c); this.add(wall.mesh(Mat.lit({}), { cast: false, receive: false }));
    // Drehtür
    const dg = new THREE.Group(); dg.position.set(0, 0, 9.0);
    const dm = new MB(18); dm.cyl(1.3, 1.3, 0.12, 14, 0, 3.15, 0, 0x2a2a30); dm.cyl(1.3, 1.3, 0.05, 14, 0, 0, 0, 0x2a2a30);
    dg.add(dm.mesh(Mat.lit({ spec: 0xffddaa, shin: 50 })));
    const wings = new THREE.Group(); const wm = new MB(19); for (const [x, z, r] of [[0.6, 0, Math.PI / 2], [-0.6, 0, Math.PI / 2], [0, 0.6, 0], [0, -0.6, 0]]) wm.plane(1.2, 3.0, x, 1.55, z, 0xcfe0e6, { ry: r });
    wings.add(wm.mesh(Mat.lit({ transparent: true, opacity: 0.2, side: THREE.DoubleSide, spec: 0xffffff, shin: 80 }), { cast: false, receive: false }));
    const hub = new MB(20); hub.cyl(0.05, 0.05, 3.1, 6, 0, 0, 0, gold); wings.add(hub.mesh(Mat.lit({ spec: 0xffddaa, shin: 50 }))); dg.add(wings); this.add(dg); this.doorWings = wings; this.doorSpin = 0.25;
    // Staub im Licht
    this.dust = makeDust([-3, 3, 0], [16, 6, 17], 150, [1.8, 1.15, 0.55], 0.55, 5); this.add(this.dust);
    // Lichter: Kronleuchter, Tischlampe, Rezeption
    const p1 = new THREE.PointLight(0xffc27a, 1.4, 16, 1.6); p1.position.set(0, 5.4, 0); this.add(p1); p1.userData.base = 1.4; this.pl.push(p1);
    const p2 = new THREE.PointLight(0xffb060, 0.9, 9, 1.8); p2.position.set(-8.3, 1.4, -0.5); this.add(p2); p2.userData.base = 0.9; this.pl.push(p2);
    const p3 = new THREE.PointLight(0xffc880, 1.0, 12, 1.6); p3.position.set(8.4, 3.2, -3.4); this.add(p3); p3.userData.base = 1.0; this.pl.push(p3);
    // Menschen
    const seat = (ch, x, z, yaw, pose = 'sitChair') => { ch.place(x, 0, z, yaw); ch.setPose(pose); ch.snapPose(); this.addChar(ch); return ch; };
    this.winter = seat(makeNPC('Winter', { top: 0x1f4a46, bottom: 0x1f4a46, under: 0xf0e8d8, shoe: 0x0c0c0c, hair: 0x140f0e, hairStyle: 'bob', skin: SKIN.pale, torso: 'blazer', s: 0.98, headR: 0.112, torsoW: 0.94, brow: 0.12 }), -9.5, -0.5, Math.PI / 2);
    this.concierge = seat(makeNPC('Concierge', { top: 0x2a2a30, bottom: 0x2a2a30, under: 0xefe8d8, shoe: 0x0c0c0c, hair: 0x1a1512, hairStyle: 'short', skin: SKIN.olive, torso: 'suit', tie: gold }), 10.0, -3.4, -Math.PI / 2, 'stand');
    this.guestA = seat(makeNPC('Gast', { top: 0xd8c8a8, bottom: 0x4a3a30, hair: 0xc8c4bc, hairStyle: 'grey', skin: SKIN.pale, torso: 'cardigan', s: 0.95 }), 7.2 + 0.5, 4.4 + 0.15, 0);
    this.guestB = seat(makeNPC('Gast', { top: 0x3a3a48, bottom: 0x2a2a30, hair: 0x2a1c14, hairStyle: 'long', skin: SKIN.tan, torso: 'blazer', s: 0.92 }), 7.2 - 0.4, 7.4 - 0.1, Math.PI);
    this.porter = makeNPC('Page', { top: 0x5a1c22, bottom: 0x2a1a1c, under: 0xe8e2d2, shoe: 0x0c0a0a, hair: 0x1a1512, hairStyle: 'short', skin: SKIN.dark, torso: 'suit', tie: gold }); this.porter.place(4.0, 0, 6.6, Math.PI); this.porter.setPose('stand'); this.addChar(this.porter); this.porterT = 3;
    // Interaktionen
    const I = (spec) => this.interact(spec);
    I({ at: [-6.4, -0.5], r: 1.7, label: 'Setzen', name: 'Frau Winter', pos: [-8.3, 1.5, -0.5], when: () => G.state.flags.dealHotel === 'open', run: () => Story.lobbyWinter() });
    I({ at: [7.6, -3.4], r: 1.9, label: 'Ansprechen', name: 'Empfang', pos: [9.1, 1.6, -3.4], run: () => Story.lobbyDesk() });
    I({ at: [0, 1.6], r: 1.9, label: 'Ansehen', name: 'Der Kronleuchter', pos: [0, 2.0, 0], run: () => Story.lobbyChandelier() });
    I({ at: [0, -4.6], r: 1.8, label: 'Ansehen', name: 'Die Treppe', pos: [0, 1.6, -6.4], run: () => Story.lobbyStairs() });
    this.onUpdate((dt) => this.tick(dt));
  }
  tick(dt) {
    this.dust.userData.update(dt);
    this.doorWings.rotation.y += dt * this.doorSpin;
    this.porterT -= dt;
    if (this.porterT <= 0 && !this.porter.moveT) { this.porterT = 6 + Math.random() * 4; const s = [[4, 6.6], [-3, 5.6], [3.6, 2.4], [-2, 7.0]][Math.floor(Math.random() * 4)]; this.porter.walkTo(s[0], s[1], { speed: 0.8 }).catch(() => {}); }
  }
  onEnter() { Snd.ambSet('crowd', 0.1, 3); Snd.ambSet('room', 0.16, 3); Snd.ambSet('city', 0.06, 3); }
  onLeave() { for (const n of ['crowd', 'room', 'city']) Snd.ambSet(n, 0, 2); }
}
WORLDS.lobby = LobbyWorld;
