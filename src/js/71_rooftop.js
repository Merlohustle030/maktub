// =====================================================================
// Skyline-Generator + Hauptmenü-Dach im Sonnenuntergang (auch für Party & Finale nutzbar)
// =====================================================================
const CITY_COLORS = [0xc8a98a, 0xb98f78, 0xa9927e, 0x9a8a80, 0xb0a08e, 0x8a5a48, 0xc9b48f, 0x9d8f9a, 0xb69a86];
const CITY_MODERN = [0x6a7a8a, 0x5a6878, 0x7a8896, 0x4a5868];

// Baut Häuserringe. o: {rMin,rMax,count,angA,angB (Winkelbereich um +Z gemessen, rad), hMin,hMax, litP, seed, modernP}
function buildSkyline(o) {
  const rng = new RNG(o.seed || 5);
  const body = new MB((o.seed || 5) + 1), glow = new MB(9), win = new MB(10);
  body.jit = 0.025; win.jit = 0.03;
  const litP = o.litP != null ? o.litP : 0.3;
  for (let i = 0; i < o.count; i++) {
    const a = rng.range(o.angA, o.angB), r = rng.range(o.rMin, o.rMax);
    const cx = Math.sin(a) * r + (o.cx || 0), cz = -Math.cos(a) * r + (o.cz || 0);
    const modern = rng.chance(o.modernP != null ? o.modernP : 0.15);
    const w = rng.range(8, 20), d = rng.range(8, 16);
    let h = modern ? rng.range(o.hMax * 0.7, o.hMax * 1.3) : rng.range(o.hMin, o.hMax);
    if (o.gapA != null && Math.abs(a - o.gapA) < o.gapW) h = Math.min(h, o.gapH);
    const col = modern ? rng.pick(CITY_MODERN) : rng.pick(CITY_COLORS);
    const ry = a + rng.range(-0.25, 0.25);
    const y0 = o.y0 != null ? o.y0 : -1;
    body.box(w, h - y0, d, cx, y0, cz, col, { ry, grad: [0.62, 1.04] });
    // Dach: Giebel/Mansarde oder Flachdach mit Kanten und Aufbauten
    if (!modern && rng.chance(0.6)) { body.gable(w * 0.98, d * 0.98, rng.range(3, 6), cx, h, cz, rng.pick([0x7a4a3e, 0x5a4a52, 0x8a5a44]), { ry: ry + (rng.chance(0.5) ? Math.PI / 2 : 0) }); }
    else { body.box(w + 0.4, 0.5, d + 0.4, cx, h, cz, mixHex(col, 0x000000, 0.25), { ry }); if (rng.chance(0.5)) body.box(rng.range(1.5, 3), rng.range(1.2, 3), rng.range(1.5, 3), cx + rng.range(-w / 3, w / 3), h + 0.5, cz + rng.range(-d / 3, d / 3), 0x5a5a60, { ry }); }
    if (rng.chance(0.5)) body.box(0.9, rng.range(2.5, 5), 0.9, cx + rng.range(-w / 3, w / 3), h + 1, cz + rng.range(-d / 3, d / 3), 0x6a4a40, { ry });   // Schornstein
    if (modern && rng.chance(0.5)) body.box(0.3, rng.range(6, 14), 0.3, cx, h + 0.5, cz, 0x333338);                                        // Antenne
    // Fenster nur auf den zur Mitte zeigenden Flächen
    const toC = [-Math.sin(a), Math.cos(a)];
    const faces = [{ n: [Math.cos(ry), -Math.sin(ry)], half: d / 2, span: w, r: 0 }, { n: [Math.sin(ry), Math.cos(ry)], half: w / 2, span: d, r: Math.PI / 2 }];
    for (const f of faces) for (const sgn of [1, -1]) {
      const nx = f.n[0] * sgn, nz = f.n[1] * sgn;
      if (nx * toC[0] + nz * toC[1] < 0.25) continue;
      const cols = Math.max(2, Math.floor(f.span / (modern ? 1.6 : 2.6))), floors = Math.floor((h - 2.5) / (modern ? 3.2 : 3.4));
      const tx = -nz, tz = nx; // Tangente
      for (let fl = 0; fl < floors; fl++) for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols - 0.5;
        const px = cx + nx * (f.half + 0.03) + tx * u * (f.span - 1.6), pz = cz + nz * (f.half + 0.03) + tz * u * (f.span - 1.6), py = 2 + fl * (modern ? 3.2 : 3.4);
        const lit = rng.chance(litP);
        const wy = Math.atan2(nx, nz);
        if (lit) glow.plane(modern ? 1.1 : 1.0, modern ? 1.5 : 1.5, px, py + 0.8, pz, rng.chance(0.15) ? [0.8, 1.3, 1.9] : [2.0 + rng.range(-0.3, 0.5), 1.25 + rng.range(-0.2, 0.3), 0.5], { ry: wy });
        else win.plane(modern ? 1.1 : 1.0, 1.5, px, py + 0.8, pz, mixHex(col, 0x0a1020, 0.75), { ry: wy });
      }
    }
  }
  return { body: body.mesh(Mat.lit({ spec: 0x0a0a0a, shin: 6 }), { cast: !!o.cast, receive: true }), win: win.mesh(Mat.lit({ shin: 40, spec: 0x334455 }), { cast: false, receive: false }), glow: glow.mesh(Mat.glow(), { cast: false, receive: false }) };
}

// ---------- Vogelschwarm ----------
class Birds {
  constructor(n = 14, o = {}) {
    this.n = n; this.group = new THREE.Group();
    const wing = new MB(3); wing.tri([0, 0, 0], [0.7, 0.05, -0.12], [0.5, 0.0, 0.16], 0x0c0a10); wing.tri([0, 0, 0], [0.5, 0.0, 0.16], [0.0, 0.0, 0.12], 0x0c0a10);
    const geo = wing.build();
    const m = new THREE.MeshBasicMaterial({ color: tcol(0x0e0b12), side: THREE.DoubleSide, fog: true });
    this.L = new THREE.InstancedMesh(geo, m, n); this.R = new THREE.InstancedMesh(geo, m, n);
    this.L.frustumCulled = this.R.frustumCulled = false;
    this.group.add(this.L, this.R);
    this.rng = new RNG(o.seed || 6); this.b = [];
    const c = o.center || [0, 12, -40], sp = o.spread || [30, 8, 30];
    for (let i = 0; i < n; i++) this.b.push({ x: c[0] + this.rng.range(-sp[0], sp[0]), y: c[1] + this.rng.range(-sp[1], sp[1]), z: c[2] + this.rng.range(-sp[2], sp[2]), ph: this.rng.range(0, 6), sp: this.rng.range(5, 8), s: this.rng.range(0.8, 1.3), turn: this.rng.range(0.05, 0.2), a: this.rng.range(0, 6) });
    this.c = c; this.sp = sp;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      const b = this.b[i];
      b.a += b.turn * dt * 0.6; b.x += Math.sin(b.a) * b.sp * dt; b.z += Math.cos(b.a) * b.sp * dt; b.y += Math.sin(b.ph + G.t * 0.4) * 0.6 * dt;
      if (Math.abs(b.x - this.c[0]) > this.sp[0] * 1.4 || Math.abs(b.z - this.c[2]) > this.sp[2] * 1.4) b.a += Math.PI;
      const fl = Math.sin(G.t * 7.5 + b.ph * 3) * 0.7;
      this._e.set(0, b.a + Math.PI / 2 * 0, 0, 'YXZ'); 
      for (const side of [1, -1]) {
        this._e.set(0, b.a - Math.PI / 2, side * fl, 'YXZ'); this._q.setFromEuler(this._e);
        this._s.set(b.s, b.s, side * b.s); this._m.compose(this._p.set(b.x, b.y, b.z), this._q, this._s);
        (side === 1 ? this.L : this.R).setMatrixAt(i, this._m);
      }
    }
    this.L.instanceMatrix.needsUpdate = true; this.R.instanceMatrix.needsUpdate = true;
  }
}

class MenuWorld extends World {
  constructor(o) { super('menu', o); this.camMode = 'cine'; this.spawn = { x: 1.35, z: -5.45, yaw: Math.PI + 0.08 }; }
  async build() {
    const sc = this.scene;
    Atmo.attach(sc, { shadows: true, sky: true, shadowR: 9 });
    Atmo.set(MenuWorld.atmo);
    Atmo.focusPoint.set(0, 0, -1);
    // Dachfläche mit Brüstung
    const mb = new MB(4).ao(1.0, 0.3);
    mb.box(12, 1.6, 12, 0, -1.6, -1, 0x7a7068, { grad: [0.6, 1] });
    mb.floor(11.6, 11.6, 0, 0.01, -1, 0x8a8078, { nx: 6, nz: 6, checker: 0x857b73 });
    mb.box(11.6, 0.9, 0.3, 0, 0, -6.5, 0xa89a8a); mb.box(11.6, 0.14, 0.44, 0, 0.9, -6.5, 0xb8a996);
    mb.box(0.3, 0.9, 12, -5.8, 0, -1, 0xa89a8a); mb.box(0.3, 0.9, 12, 5.8, 0, -1, 0xa89a8a);
    mb.box(0.14, 0.14, 12, -5.8, 0.9, -1, 0xb8a996); mb.box(0.14, 0.14, 12, 5.8, 0.9, -1, 0xb8a996);
    // Aufbauten: Lüftung, Wassertank, Antenne, Wäscheleine
    mb.box(2.2, 1.4, 1.6, -4.0, 0, 2.4, 0x6a6a70, { grad: [0.7, 1] }); mb.cyl(0.5, 0.5, 0.15, 10, -4.0, 1.4, 2.4, 0x55555b);
    mb.cyl(0.9, 0.9, 1.9, 10, 3.9, 0, 2.6, 0x8a6a4e, { grad: [0.7, 1] }); mb.cone(0.95, 0.5, 10, 3.9, 1.9, 2.6, 0x5a4a44);
    for (const [x, z] of [[3.3, 2.0], [4.5, 2.0], [3.3, 3.2], [4.5, 3.2]]) mb.box(0.06, 0.6, 0.06, x, -0.6, z, 0x444444);
    mb.cyl(0.03, 0.05, 6.5, 5, 4.9, 0, -5.0, 0x3a3a3e); for (let i = 0; i < 4; i++) mb.box(1.1 - i * 0.2, 0.03, 0.03, 4.9, 3.2 + i * 0.9, -5.0, 0x3a3a3e);
    mb.box(0.05, 1.7, 0.05, -5.2, 0, -1.0, 0x3a3a3e); mb.box(0.05, 1.7, 0.05, -5.2, 0, -5.2, 0x3a3a3e);
    mb.box(0.6, 0.09, 0.4, 0.9, 0, -2.2, 0x6a5a48); mb.box(0.6, 0.02, 0.4, 0.9, 0.09, -2.2, 0xaa9a86); // Klappkiste
    this.add(mb.mesh(Mat.lit({ spec: 0x181818, shin: 10 }), { cast: true, receive: true }));
    // Wäscheleine mit Tüchern
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5.2, 1.7, -1), new THREE.Vector3(-5.2, 1.6, -3), new THREE.Vector3(-5.2, 1.7, -5.2)]), new THREE.LineBasicMaterial({ color: tcol(0x202024) })); this.add(line);
    this.cloth = [];
    const cm = Mat.lit({ side: THREE.DoubleSide });
    [[0xe9d9b8, -1.6], [0xb85a3a, -2.5], [0x8a9ab0, -3.7], [0xe9e4da, -4.5]].forEach(([c, z], i) => { const b = new MB(70 + i); b.box(0.02, 0.5, 0.6, 0, -0.5, 0, c); const m = b.mesh(cm, { cast: true }); m.position.set(-5.2, 1.66, z); this.add(m); this.cloth.push(m); });
    // Skyline in mehreren Schichten (Sonne im Hintergrund = -Z)
    const near = buildSkyline({ rMin: 30, rMax: 70, count: 30, angA: -1.6, angB: 1.6, hMin: -22, hMax: -6, litP: 0.32, seed: 5, y0: -60, modernP: 0.05 });
    const far = buildSkyline({ rMin: 90, rMax: 190, count: 50, angA: -1.7, angB: 1.7, hMin: -10, hMax: 14, litP: 0.35, seed: 8, y0: -80, modernP: 0.3, gapA: 0.02, gapW: 0.3, gapH: 4 });
    [near, far].forEach((s) => { this.add(s.body); this.add(s.win); this.add(s.glow); });
    this.dust = makeDust([0, 2.5, -3], [14, 6, 14], 90, [1.6, 1.1, 0.6], 0.6, 6); this.add(this.dust);
    this.birds = new Birds(16, { center: [0, 14, -55], spread: [40, 8, 30] }); this.add(this.birds.group);
    this.birds2 = new Birds(6, { center: [6, 9, -48], spread: [16, 3, 10], seed: 22 }); this.add(this.birds2.group);
    // Mirza am Rand, blickt auf die Stadt
    const ch = Player.ch; this.addChar(ch); ch.setPose('mirza'); ch.hold('notebook', false);
    ch.onUpdate = () => { const t = G.t; ch.j.spine.rotation.z += Math.sin(t * 1.3) * 0.006; ch.j.head.rotation.y += Math.sin(t * 0.21) * 0.02; };
    this.onUpdate((dt) => {
      this.dust.userData.update(dt); this.birds.update(dt); this.birds2.update(dt);
      this.cloth.forEach((c, i) => { c.rotation.y = Math.sin(G.t * 1.4 + i * 1.7) * 0.3 + 0.2; c.rotation.z = Math.sin(G.t * 2.1 + i) * 0.05; });
      // Kamera driftet langsam
      const t = G.t * 0.04;
      Cam.set({ pos: [0.9 + Math.sin(t) * 1.3, 1.25 + Math.sin(t * 0.7) * 0.1, 1.9 + Math.cos(t * 0.8) * 0.4], look: [-0.2 + Math.sin(t * 0.6) * 0.25, 2.7, -9], fov: 32 });
      Cam.mode = 'cine';
    });
  }
  onEnter() { Snd.ambSet('wind', 0.55, 3); Snd.ambSet('birds', 0.35, 4); Snd.ambSet('city', 0.22, 4); }
  onLeave() { Snd.ambSet('wind', 0, 2); Snd.ambSet('birds', 0, 2); Snd.ambSet('city', 0, 2); }
}
MenuWorld.atmo = {
  skyTop: lin(0x18205a), skyHorizon: lin(0xf0682e), skyBottom: lin(0x2a1a26),
  sunDir: [0.02, 0.146, -0.989], sunCol: lin(0xff9a4a, 1.5), sunDisc: 0.9, sunGlow: 0.9, stars: 0, cloud: 1, cloudLit: lin(0xff7a48, 1.2), cloudDark: lin(0x3a2a58),
  hemiSky: lin(0x5a66a8, 0.85), hemiGround: lin(0x6a4a3c), hemiInt: 0.75, keyCol: lin(0xffa050), keyInt: 3.4, fillCol: lin(0x6a86c8), fillInt: 0.3, fillDir: [0.6, 0.3, 0.6],
  fogCol: lin(0xd8845e, 0.8), fogDen: 0.0048, fogHK: 0.06, fogBase: -2, fogMax: 0.92, fogSun: lin(0xff9a4a, 0.5),
  rimDir: [0.02, 0.2, -0.98], rimCol: lin(0xffa050, 1.5),
  exposure: 1.0, contrast: 1.14, sat: 1.06, lift: [0, 0, 0.004], gain: [1.02, 0.99, 0.96], shadowTint: [0, 0.012, 0.03], highTint: [0.03, 0.008, -0.014],
  bloom: 0.17, bloomTint: [1, 0.85, 0.75], vig: 0.42, grain: 0.042, ca: 0.0016, dof: 0, flare: 0.9, rays: 0.35,
};
WORLDS.menu = MenuWorld;
