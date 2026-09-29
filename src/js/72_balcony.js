// =====================================================================
// Rückblende: Nenas Balkon im Abendlicht. Warm, verträumt, Bloom, Staub im Licht, Gitterschatten.
// Balkon: x ∈ [-1.5, 1.5], z ∈ [-0.66, 0.72], Stadt liegt in -Z.
// =====================================================================
const BALCONY_ATMO = {
  skyTop: lin(0x4a4e8c), skyHorizon: lin(0xffa860), skyBottom: lin(0x6a4a44),
  sunDir: [-0.5, 0.15, -0.85], sunCol: lin(0xffb060, 1.7), sunDisc: 1, sunGlow: 1.3, stars: 0, cloud: 0.8, cloudLit: lin(0xffa878, 1.4), cloudDark: lin(0x8a6a8a),
  hemiSky: lin(0x9aa0d0, 0.9), hemiGround: lin(0x8a5a40), hemiInt: 0.8, keyCol: lin(0xffb468), keyInt: 2.7, fillCol: lin(0xffc890), fillInt: 0.4, fillDir: [0.4, 0.3, 0.9],
  fogCol: lin(0xf0b088, 0.85), fogDen: 0.0075, fogHK: 0.05, fogBase: -2, fogMax: 0.93, fogSun: lin(0xffa860, 0.7),
  rimDir: [-0.5, 0.2, -0.85], rimCol: lin(0xffb060, 1.6),
  exposure: 0.88, contrast: 1.08, sat: 0.98, lift: [0.014, 0.006, 0.0], gain: [1.03, 1.0, 0.95], shadowTint: [0.02, 0.0, 0.0], highTint: [0.03, 0.01, -0.01],
  bloom: 0.3, bloomTint: [1, 0.88, 0.75], vig: 0.34, grain: 0.06, ca: 0.0022, dof: 0.55, dofFocus: 1.1, dofRange: 1.4, rays: 0.42, flare: 1.1,
};

class BalconyWorld extends World {
  constructor(o) { super('balcony', o); this.camMode = 'cine'; this.noPlayer = true; }
  async build() {
    const sc = this.scene;
    Atmo.attach(sc, { shadows: true, sky: true, shadowR: 5, sunDist: 30 });
    Atmo.set(BALCONY_ATMO);
    Atmo.sun.shadow.bias = -0.0004; Atmo.sun.shadow.normalBias = 0.02;
    Atmo.focusPoint.set(0.4, 0, -0.2);
    const mb = new MB(31).ao(0.6, 0.28);
    // Bodenplatte mit Fliesen
    mb.box(3.1, 0.18, 1.5, 0, -0.18, 0.03, 0xb9a48a, { grad: [0.7, 1] });
    mb.floor(3.0, 1.4, 0, 0.002, 0.03, 0xb9633c, { nx: 12, nz: 6, checker: 0xa85a38 });
    // Hauswand mit Türöffnung (Kamera darf in der Wand sitzen: Einzelflächen)
    const wall = 0xe6d3b0, wz = 0.82, wt = 0.2;
    mb.box(2.6, 4.2, wt, -1.75, -0.18, wz, wall, { grad: [0.82, 1] }); mb.box(4.0, 4.2, wt, 2.5, -0.18, wz, wall, { grad: [0.82, 1] });
    mb.box(0.9, 2.1, wt, 0, 2.1, wz, wall);
    // Türrahmen + warmes Innenleben
    mb.box(0.06, 2.12, 0.26, -0.47, 0, wz, 0x6a4a34); mb.box(0.06, 2.12, 0.26, 0.47, 0, wz, 0x6a4a34); mb.box(1.0, 0.06, 0.26, 0, 2.08, wz, 0x6a4a34);
    mb.box(0.9, 0.04, 0.9, 0, -0.02, 1.4, 0x9a6a48);          // Schwelle/Flur
    mb.box(3.4, 3.0, 0.1, 0, 0, 2.3, 0xd8bd94);               // Rückwand des Flurs
    mb.box(0.9, 0.06, 0.06, 0.35, 1.95, 1.4, 0x6a4a34);
    // Fenster rechts der Tür
    mb.box(1.0, 1.0, 0.06, 1.35, 1.0, wz - 0.1, 0x6a4a34);
    // Seitenwände (Nachbargebäude schließen den Hof)
    mb.box(0.3, 9, 8, -3.4, -6, -2.2, 0xd2b58e, { grad: [0.6, 1] });
    mb.box(0.3, 9, 8, 3.7, -6, -2.2, 0xc7a884, { grad: [0.6, 1] });
    // Geländer: Eisenstäbe + Handlauf
    for (let i = 0; i <= 27; i++) mb.box(0.022, 0.92, 0.022, -1.45 + i * (2.9 / 27), 0.1, -0.66, 0x1b191c);
    mb.box(3.0, 0.05, 0.06, 0, 1.0, -0.66, 0x4a3020); mb.box(3.0, 0.03, 0.03, 0, 0.1, -0.66, 0x1b191c); mb.box(3.0, 0.03, 0.03, 0, 0.55, -0.66, 0x1b191c);
    // Seitenbrüstungen
    mb.box(0.1, 1.0, 1.4, -1.5, 0, 0.03, 0xdfc9a2); mb.box(0.1, 1.0, 1.4, 1.5, 0, 0.03, 0xdfc9a2);
    // Tisch + Stühle + Tee (Tulpenglas) + Simit
    mb.cyl(0.34, 0.34, 0.03, 12, -0.95, 0.62, 0.05, 0x8a7a68); mb.cyl(0.03, 0.05, 0.62, 6, -0.95, 0, 0.05, 0x2a2622); mb.cyl(0.18, 0.18, 0.02, 10, -0.95, 0, 0.05, 0x2a2622);
    for (const [x, z, r] of [[-1.08, -0.4, 0.3], [-0.55, 0.45, 2.6]]) { mb.box(0.36, 0.03, 0.36, x, 0.42, z, 0x8a6a48, { ry: r }); mb.box(0.36, 0.34, 0.03, x + Math.sin(r) * 0.17 * 0, 0.45, z - Math.cos(r) * 0.18, 0x7a5a3c, { ry: r }); for (const [dx, dz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) mb.box(0.03, 0.42, 0.03, x + dx, 0, z + dz, 0x2a2622); }
    for (const [x, z] of [[-0.85, 0.02], [-1.05, 0.14]]) { mb.lathe([[0.012, 0], [0.026, 0.01], [0.032, 0.05], [0.036, 0.085], [0.03, 0.1]], 8, x, 0.645, z, 0xd8e8ea, { jit: 0 }); mb.cyl(0.029, 0.026, 0.06, 8, x, 0.652, z, 0xb8601a, { jit: 0 }); mb.cyl(0.05, 0.05, 0.006, 10, x, 0.646, z, 0xf0e8d8); }
    mb.lathe([[0.0, 0], [0.09, 0.005], [0.14, 0.02], [0.13, 0.026]], 10, -0.95, 0.645, 0.28, 0xe8dcc4); mb.cyl(0.07, 0.07, 0.03, 8, -0.95, 0.66, 0.28, 0xc99a5a, { jit: 0.06 });
    // Pflanzen: Geranien, Basilikum
    for (const [x, z, k] of [[1.2, -0.5, 0], [0.95, -0.5, 1], [1.2, 0.5, 2], [-1.3, -0.5, 1]]) {
      mb.cyl(0.11, 0.08, 0.17, 8, x, 0, z, 0xb35a36); mb.cyl(0.115, 0.115, 0.03, 8, x, 0.16, z, 0xa04c2c);
      for (let i = 0; i < 6; i++) mb.sph(0.09, x + Math.sin(i * 1.2) * 0.07, 0.3 + (i % 2) * 0.06, z + Math.cos(i * 1.2) * 0.07, k === 1 ? 0x4f7a3a : 0x3f6a34, { d: 0 });
      if (k !== 1) for (let i = 0; i < 4; i++) mb.sph(0.04, x + Math.sin(i * 1.7) * 0.08, 0.4 + (i % 2) * 0.05, z + Math.cos(i * 1.7) * 0.08, k === 0 ? 0xd23a3a : 0xe8809a, { d: 0 });
    }
    // Hocker für den kleinen Mirza
    mb.box(0.32, 0.22, 0.28, 0.3, 0, -0.44, 0x8a6a48, { grad: [0.8, 1] });
    // Satellitenschüssel + Wäscheleine
    mb.dome(0.22, 2.2, 2.2, wz - 0.18, 0xd8d4cc, { t1: 0.4, rx: -Math.PI / 2 }); mb.box(0.03, 0.03, 0.2, 2.2, 2.2, wz - 0.1, 0x555555);
    this.add(mb.mesh(Mat.lit({ spec: 0x1a1a1a, shin: 10 }), { cast: true, receive: true }));
    // Leuchtflächen: Flur-Lampe (warm), Fensterlicht
    const gl = new MB(32); gl.jit = 0;
    gl.plane(0.84, 2.0, 0, 1.05, 1.3, [0.95, 0.55, 0.22], { ry: Math.PI }); gl.plane(0.8, 0.9, 1.35, 1.45, wz - 0.07, [0.9, 0.55, 0.25], { ry: Math.PI }); gl.sph(0.06, 0.35, 1.9, 1.35, [4, 2.6, 1.2], { d: 1 });
    this.add(gl.mesh(Mat.glow(), { cast: false, receive: false }));
    // Wäsche
    this.cloth = [];
    const cmat = Mat.lit({ side: THREE.DoubleSide });
    for (const [c, x] of [[0xe8e0d0, -1.2], [0x5a86a8, -0.95], [0xc9503a, -0.7], [0xe8c060, -0.45]]) { const b = new MB(40 + x * 7); b.box(0.22, 0.3, 0.01, 0, -0.3, 0, c); const m = b.mesh(cmat, { cast: true }); m.position.set(x, 1.95, 0.55); this.add(m); this.cloth.push(m); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.4, 1.95, 0.55), new THREE.Vector3(-0.3, 1.9, 0.55)]), new THREE.LineBasicMaterial({ color: tcol(0x222222) })); this.add(line);
    // Stadt: Dächer, Türme
    const near = buildSkyline({ rMin: 22, rMax: 60, count: 30, angA: -1.3, angB: 1.3, hMin: -14, hMax: -2, litP: 0.35, seed: 15, y0: -40, modernP: 0.02 });
    const far = buildSkyline({ rMin: 80, rMax: 180, count: 46, angA: -1.4, angB: 1.4, hMin: -6, hMax: 12, litP: 0.4, seed: 18, y0: -60, modernP: 0.1, gapA: -0.53, gapW: 0.25, gapH: 3 });
    [near, far].forEach((s) => { this.add(s.body); this.add(s.win); this.add(s.glow); });
    const tw = new MB(36); // Minarett und Fernsehturm im Dunst
    const mx = Math.sin(0.55) * 95, mz = -Math.cos(0.55) * 95;
    tw.cyl(1.6, 1.9, 22, 8, mx, -30, mz, 0xd8c4a4); tw.cyl(1.0, 1.0, 20, 8, mx, -8, mz, 0xe0ccae); tw.cyl(1.9, 1.9, 0.8, 8, mx, 7, mz, 0xc8b490); tw.cyl(0.9, 0.9, 9, 8, mx, 7.8, mz, 0xe4d2b4); tw.cone(1.1, 5, 8, mx, 16.8, mz, 0x8a9a8a); tw.cyl(0.05, 0.05, 2.5, 4, mx, 21.5, mz, 0xd8c060);
    const tx = Math.sin(-0.95) * 130, tz = -Math.cos(-0.95) * 130;
    tw.cyl(0.6, 1.4, 50, 6, tx, -20, tz, 0x9a9aa0); tw.cyl(3, 3, 3, 8, tx, 22, tz, 0x8a8a92); tw.cyl(0.15, 0.15, 14, 4, tx, 25, tz, 0x9a9aa0);
    this.add(tw.mesh(Mat.lit({ spec: 0x111111 }), { cast: false, receive: false }));
    this.dust = makeDust([0.4, 1.0, 0.0], [3.6, 2.2, 2.6], 70, [1.7, 1.15, 0.6], 0.6, 5); this.add(this.dust);
    this.birds = new Birds(9, { center: [-5, 16, -60], spread: [34, 6, 20], seed: 3 }); this.add(this.birds.group);
    // Innenlicht (warm) und Füllung
    this.doorLight = new THREE.PointLight(0xffa860, 1.6, 4.5, 1.6); this.doorLight.position.set(0.1, 1.5, 1.5); this.add(this.doorLight);
    // Figuren: der kleine Mirza und Nena
    this.kid = makeKid(); this.nena = makeNena();
    this.kid.place(0.3, 0.22, -0.44, Math.PI); this.kid.setPose(mkPose({ lean: 4, nod: -4, L: { arm: [42, 12, 0], fore: 20 }, R: { arm: [42, 12, 0], fore: 20 } })); this.kid.j.hips.position.y = 0;
    this.nena.place(0.0, 0, 1.55, Math.PI); this.nena.setPose('stoop');
    for (const c of [this.kid, this.nena]) { this.addChar(c); c.setRim(1.4); }
    this.tea = null;
    this.onUpdate((dt) => {
      this.dust.userData.update(dt); this.birds.update(dt);
      this.cloth.forEach((c, i) => { c.rotation.z = Math.sin(G.t * 1.3 + i * 1.3) * 0.12; c.rotation.x = Math.sin(G.t * 0.9 + i) * 0.08; });
      this.doorLight.intensity = 1.6 + Math.sin(G.t * 2.1) * 0.05;
    });
  }
  onEnter() { Snd.ambSet('city', 0.3, 3); Snd.ambSet('birds', 0.4, 3); Snd.ambSet('wind', 0.16, 3); }
  onLeave() { Snd.ambSet('city', 0, 2); Snd.ambSet('birds', 0, 2); Snd.ambSet('wind', 0, 2); }
}
WORLDS.balcony = BalconyWorld;
