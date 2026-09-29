// =====================================================================
// Mirzas Zimmer – 3:47 Uhr, Regen. Kaltes Blau, eine warme Lampe, Regenschlieren am Fenster.
// Raum: x ∈ [-1.7, 1.7], z ∈ [-2.1, 2.1], Höhe 2.55. Fenster in der Rückwand (z = -2.1).
// =====================================================================
const ROOM = { x0: -1.7, x1: 1.7, z0: -2.1, z1: 2.1, H: 2.55, win: { x0: -0.2, x1: 0.9, y0: 0.95, y1: 2.05 }, door: { z0: 0.9, z1: 1.8, h: 2.05 } };

const ROOM_NIGHT = {
  sunDir: [0.1, 0.52, -0.85], sunCol: lin(0x6f9ee0, 1), sunDisc: 0,
  keyCol: lin(0x6a9ee8), keyInt: 3.0,
  hemiSky: lin(0x2a4772, 0.8), hemiGround: lin(0x141822), hemiInt: 1.15,
  fillCol: lin(0x4a68a8), fillInt: 0.4, fillDir: [-0.5, 0.45, 0.85],
  fogCol: lin(0x070b14), fogDen: 0.012, fogHK: 0.05, fogBase: 0, fogMax: 0.6, fogSun: [0, 0, 0],
  rimDir: [0.1, 0.35, -1], rimCol: lin(0x5a90e0, 0.7),
  exposure: 1.4, contrast: 1.12, sat: 0.94, lift: [0.0, 0.004, 0.012], gain: [0.97, 1.0, 1.06], shadowTint: [0.0, 0.012, 0.03], highTint: [0.03, 0.012, 0.0],
  bloom: 0.2, bloomTint: [1, 0.95, 1], vig: 0.5, grain: 0.065, ca: 0.0018, dof: 0, dofRange: 3.2, rays: 0, flare: 0,
};

function wallShape(w, h, holes) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, h); s.lineTo(0, h); s.closePath();
  for (const q of holes || []) { const p = new THREE.Path(); p.moveTo(q[0], q[1]); p.lineTo(q[0], q[3]); p.lineTo(q[2], q[3]); p.lineTo(q[2], q[1]); p.closePath(); s.holes.push(p); }
  return new THREE.ShapeGeometry(s);
}

class RoomWorld extends World {
  constructor(o) { super('room', o); this.surface = 'wood'; this.speed = 0.92; this.camMode = 'zones'; this.spawn = Object.assign({ x: -0.25, z: 0.35, yaw: 0.6 }, (o && o.spawn) || {}); this.bounds = { x0: -1.62, x1: 1.62, z0: -2.02, z1: 2.02 }; }
  async build(o = {}) {
    const sc = this.scene, R = ROOM;
    Atmo.attach(sc, { shadows: true, sky: false, shadowR: 3.6, sunDist: 8 });
    Atmo.sun.shadow.camera.near = 0.5; Atmo.sun.shadow.camera.far = 20; Atmo.sun.shadow.bias = -0.0008; Atmo.sun.shadow.normalBias = 0.035;
    Atmo.set(ROOM_NIGHT);
    Atmo.focusPoint.set(0, 0, -0.5);
    this.tex = { wall: texWallpaper('#38424f', '#323b48'), parq: texParquet(), rug: texRug() };
    this.tex.wall.wrapS = this.tex.wall.wrapT = THREE.RepeatWrapping; this.tex.wall.repeat.set(1 / 0.8, 1 / 0.8);
    this.tex.parq.repeat.set(3.4 / 1.8, 4.2 / 1.8);
    const wallMat = Mat.tex(this.tex.wall, { spec: 0x0a0a0a, shin: 4, side: THREE.DoubleSide });
    wallMat.shadowSide = THREE.DoubleSide;
    // --- Wände (Rückwand mit Fensterloch, linke Wand mit Türloch) ---
    const W = R.x1 - R.x0, D = R.z1 - R.z0;
    const back = new THREE.Mesh(wallShape(W, R.H, [[R.win.x0 - R.x0, R.win.y0, R.win.x1 - R.x0, R.win.y1]]), wallMat); back.position.set(R.x0, 0, R.z0); back.receiveShadow = true; back.castShadow = true; this.add(back);
    const front = new THREE.Mesh(wallShape(W, R.H), wallMat); front.position.set(R.x1, 0, R.z1); front.rotation.y = Math.PI; front.receiveShadow = true; front.castShadow = true; this.add(front);
    const left = new THREE.Mesh(wallShape(D, R.H, [[R.z1 - R.door.z1, 0, R.z1 - R.door.z0, R.door.h]]), wallMat); left.position.set(R.x0, 0, R.z1); left.rotation.y = Math.PI / 2; left.receiveShadow = true; left.castShadow = true; this.add(left);
    const right = new THREE.Mesh(wallShape(D, R.H), wallMat); right.position.set(R.x1, 0, R.z0); right.rotation.y = -Math.PI / 2; right.receiveShadow = true; right.castShadow = true; this.add(right);
    const ceilMB = new MB(3); ceilMB.plane(W, D, 0, R.H, 0, 0x2a2f38, { rx: Math.PI / 2 });
    this.ceil = ceilMB.mesh(Mat.lit(), { cast: true, receive: true }); this.add(this.ceil);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), Mat.tex(this.tex.parq, { spec: 0x1a1410, shin: 14 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; this.add(floor);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.25), Mat.tex(this.tex.rug, { spec: 0x000000 })); rug.rotation.x = -Math.PI / 2; rug.rotation.z = 0.04; rug.position.set(0.05, 0.006, 0.35); rug.receiveShadow = true; this.add(rug);

    // --- Möbel & Details (ein gemeinsames Mesh) ---
    const mb = new MB(11).ao(0.9, 0.35);
    const glow = new MB(12); glow.jit = 0;
    this.buildFurniture(mb, glow);
    this.add(mb.mesh(Mat.lit({ spec: 0x1c1c1c, shin: 18 }), { cast: true, receive: true }));
    this.add(glow.mesh(Mat.glow(), { cast: false, receive: false }));
    this.lampShade = this.shadeMB.mesh(Mat.lit({ spec: 0x221100 }), { cast: true }); this.add(this.lampShade);
    this.bulbMat = Mat.glow(); this.bulb = this.bulbMB.mesh(this.bulbMat, { cast: false, receive: false }); this.add(this.bulb);

    // --- Fenster: Rahmen, Sims, Vorhänge, Regenglas ---
    this.buildWindow();
    // --- Bilder & Papiere (Texturen) ---
    this.buildDecor();
    // --- Lichter ---
    this.buildLights();
    this.lampOn = 0;
    // --- Katze (kommt später ans Fenster) ---
    this.cat = makeCat(); this.cat.root.position.set(0.32, R.win.y0 + 0.02, R.z0 - 0.22); this.cat.root.rotation.y = Math.PI; this.cat.root.scale.setScalar(1.0); this.cat.root.visible = false; this.cat.setMode('sit'); this.add(this.cat.root);
    this.cat.look = new THREE.Vector3(0, 0.9, 0);
    // --- Kollision ---
    this.collide(-1.7, -2.1, -0.72, -0.05);      // Bett
    this.collide(-0.3, -2.1, 1.3, -1.5);         // Schreibtisch
    this.collide(1.22, -0.25, 1.7, 1.05);        // Schrank
    this.collide(0.05, -1.25, 0.55, -0.85);      // Stuhl (Schreibtischstuhl steht davor)
    this.buildInteractions();
    this.buildZones();
    this.onUpdate((dt) => this.tick(dt));
  }

  buildFurniture(mb, glow) {
    const wood = 0x5a4130, woodD = 0x3a2b21, woodL = 0x7d5b41;
    // Bett: Kopf an der Rückwand, links
    mb.box(0.98, 0.26, 2.02, -1.21, 0, -1.09, woodD);                    // Rahmen
    mb.box(0.92, 0.17, 1.94, -1.21, 0.26, -1.09, 0xb9b3a4);              // Matratze/Laken
    mb.box(0.94, 0.07, 1.25, -1.21, 0.42, -0.72, 0x263250, { jit: 0.06 });   // Decke (Navy)
    mb.box(0.94, 0.1, 0.16, -1.21, 0.4, -0.08, 0x2f3d60, { jit: 0.05 });     // umgeschlagene Kante
    mb.box(0.55, 0.1, 0.34, -1.21, 0.43, -1.85, 0xd8d2c4, { rx: -0.08 });    // Kissen
    mb.box(0.98, 0.5, 0.06, -1.21, 0.0, -2.08, woodD);                       // Kopfteil
    // Schreibtisch
    mb.box(1.6, 0.045, 0.62, 0.5, 0.73, -1.79, woodL);                       // Platte
    for (const [x, z] of [[-0.26, -2.05], [-0.26, -1.55], [1.26, -2.05], [1.26, -1.55]]) mb.box(0.06, 0.73, 0.06, x, 0, z, woodD);
    mb.box(0.42, 0.5, 0.5, 1.0, 0.23, -1.79, wood, { grad: [0.85, 1] }); mb.box(0.36, 0.13, 0.02, 1.0, 0.5, -1.53, woodD); mb.box(0.36, 0.13, 0.02, 1.0, 0.33, -1.53, woodD);
    mb.box(0.06, 0.012, 0.02, 1.0, 0.56, -1.51, 0xb09a68); mb.box(0.06, 0.012, 0.02, 1.0, 0.38, -1.51, 0xb09a68);
    // Stuhl
    mb.box(0.44, 0.05, 0.44, 0.3, 0.45, -1.02, woodL, { ry: 0.2 });
    mb.box(0.44, 0.44, 0.05, 0.28, 0.5, -0.8, wood, { ry: 0.2 });
    for (const [x, z] of [[0.12, -1.2], [0.5, -1.16], [0.1, -0.86], [0.47, -0.82]]) mb.box(0.04, 0.45, 0.04, x, 0, z, woodD);
    // Lampe (Schwenkarm)
    mb.cyl(0.11, 0.13, 0.03, 10, 1.05, 0.775, -1.95, 0x1a1a1a);
    mb.cyl(0.012, 0.012, 0.42, 5, 1.05, 0.79, -1.95, 0x222222, { rz: 0.16 });
    mb.cyl(0.012, 0.012, 0.36, 5, 1.0, 1.15, -1.9, 0x222222, { rz: -0.9, rx: 0.15 });
    this.shadeMB = new MB(14); this.shadeMB.cone(0.13, 0.15, 10, 0.86, 1.28, -1.86, 0xcaa066, { rz: 0.3 }); // Schirm (eigenes Mesh: leuchtet mit)
    this.bulbMB = new MB(13); this.bulbMB.jit = 0; this.bulbMB.sph(0.035, 0.85, 1.25, -1.87, [3.4, 2.1, 0.9], { d: 1 });
    // Laptop (zu) + Becher + Glas
    mb.box(0.34, 0.02, 0.24, 0.55, 0.775, -1.86, 0x1d1e22, { ry: 0.15 }); mb.box(0.05, 0.004, 0.04, 0.55, 0.795, -1.86, 0x8a8a92, { ry: 0.15 });
    mb.cyl(0.04, 0.035, 0.09, 8, 0.05, 0.775, -1.63, 0xcdd6dc);
    mb.cyl(0.03, 0.03, 0.06, 8, 0.05, 0.8, -1.63, 0xc07a2a);   // Tee im Glas
    glow.cyl(0.028, 0.028, 0.005, 8, 0.05, 0.86, -1.63, [0.9, 0.45, 0.1]);
    mb.box(0.24, 0.02, 0.34, 0.5, 0.775, -1.5, 0x101010);      // Mauspad-ähnlich (Block für Zettel)
    // Schrank rechts + Anzug an der Tür
    mb.box(0.5, 2.0, 1.32, 1.45, 0, 0.4, 0x54402f, { grad: [0.8, 1] });
    mb.box(0.02, 1.9, 0.02, 1.19, 0.05, 0.4, woodD);
    mb.box(0.02, 0.16, 0.02, 1.185, 1.0, 0.33, 0xb09a68); mb.box(0.02, 0.16, 0.02, 1.185, 1.0, 0.47, 0xb09a68);
    // Anzug auf Bügel an der Schranktür (Silhouette)
    mb.box(0.012, 0.12, 0.012, 1.17, 1.86, 0.4, 0x777777);
    mb.box(0.04, 0.03, 0.42, 1.16, 1.84, 0.4, 0x8a6a44, { rz: 0.0 });
    mb.box(0.045, 0.62, 0.36, 1.15, 1.2, 0.4, 0x121218, { grad: [0.9, 1.05] });
    mb.box(0.05, 0.4, 0.09, 1.145, 1.28, 0.24, 0x141419); mb.box(0.05, 0.4, 0.09, 1.145, 1.28, 0.56, 0x141419);
    mb.box(0.03, 0.34, 0.09, 1.14, 1.5, 0.4, 0xdcd8cc);   // Hemd im Ausschnitt
    // Schuhe
    mb.box(0.11, 0.07, 0.28, 0.98, 0, 1.28, 0x0a0a0c, { ry: 0.3 }); mb.box(0.11, 0.07, 0.28, 0.84, 0, 1.31, 0x0a0a0c, { ry: 0.35 });
    // Regal + Oud (Nenas) an der linken Wand über dem Bett
    mb.box(0.2, 0.03, 0.9, -1.6, 1.62, -0.9, woodL);
    for (let i = 0; i < 7; i++) mb.box(0.12, 0.2 + (i % 3) * 0.02, 0.035, -1.6, 1.65, -1.2 + i * 0.075, [0x6a3a30, 0x2e3a4c, 0x6a5a30, 0x3a4a3a, 0x5a3a4a, 0x2a2a2a, 0x7a6a4a][i]);
    // Oud an der Wand
    mb.sph(0.5, -1.665, 1.62, 0.55, 0x8a5b33, { sx: 0.03, sy: 0.32, sz: 0.25, d: 1 });
    mb.box(0.03, 0.055, 0.5, -1.66, 1.9, 0.55, 0x5a3c22, { rz: 0 });
    mb.box(0.045, 0.16, 0.07, -1.655, 2.13, 0.55, 0x3a2416);
    mb.cyl(0.055, 0.055, 0.004, 10, -1.645, 1.62, 0.55, 0x1f150c, { rz: Math.PI / 2 });
    // Fensterbank (innen) + Vorhang-Stange
    mb.box(1.5, 0.045, 0.2, 0.35, 0.93, -2.0, 0xa89880);
    // Boden-Details: Socken, Kabel, Handyladekabel
    mb.box(0.16, 0.02, 0.07, -0.4, 0.006, 0.9, 0x3a3a44, { ry: 0.8 }); mb.box(0.15, 0.02, 0.07, -0.25, 0.006, 1.02, 0x3a3a44, { ry: -0.3 });
    // Sockelleisten
    mb.box(3.4, 0.09, 0.02, 0, 0, -2.08, 0x2a2622); mb.box(0.02, 0.09, 4.2, 1.69, 0, 0, 0x2a2622); mb.box(0.02, 0.09, 4.2, -1.69, 0, 0, 0x2a2622);
    // Tür (links, mit Rahmen)
    mb.box(0.05, 2.1, 0.06, -1.69, 0, 0.87, 0x3a3028); mb.box(0.05, 2.1, 0.06, -1.69, 0, 1.83, 0x3a3028); mb.box(0.05, 0.06, 1.0, -1.69, 2.07, 1.35, 0x3a3028);
    mb.box(0.04, 2.02, 0.86, -1.72, 0.0, 1.35, 0x4c3e32, { grad: [0.85, 1] });
    mb.box(0.03, 0.03, 0.12, -1.69, 1.02, 0.98, 0xb09a68);
    // Lichtspalt unter der Tür (Flur, Mama ist nicht da – Nachtlicht)
    glow.box(0.02, 0.012, 0.8, -1.7, 0.004, 1.35, [1.6, 1.1, 0.6]);
  }

  buildWindow() {
    const R = ROOM, w = R.win, cx = (w.x0 + w.x1) / 2, cy = (w.y0 + w.y1) / 2, ww = w.x1 - w.x0, wh = w.y1 - w.y0;
    const mb = new MB(15).ao(0.5, 0.2);
    // Rahmen
    mb.box(ww + 0.12, 0.07, 0.16, cx, w.y0 - 0.05, R.z0, 0x2b2622); mb.box(ww + 0.12, 0.07, 0.16, cx, w.y1 - 0.02, R.z0, 0x2b2622);
    mb.box(0.07, wh + 0.1, 0.16, w.x0 - 0.03, w.y0 - 0.05, R.z0, 0x2b2622); mb.box(0.07, wh + 0.1, 0.16, w.x1 - 0.04, w.y0 - 0.05, R.z0, 0x2b2622);
    mb.box(0.045, wh, 0.05, cx, w.y0, R.z0, 0x2b2622);       // Sprosse (wirft Schattenlinie)
    mb.box(ww, 0.04, 0.05, cx, cy + 0.1, R.z0, 0x2b2622);
    // äußere Fensterbank (Katze sitzt darauf)
    mb.box(1.3, 0.06, 0.34, cx, w.y0 - 0.05, R.z0 - 0.2, 0x4a4a52);
    // Vorhänge
    mb.box(0.28, 1.35, 0.06, w.x0 - 0.2, 0.85, R.z0 + 0.12, 0x6a5f57, { jit: 0.08 }); mb.box(0.22, 1.35, 0.06, w.x1 + 0.16, 0.85, R.z0 + 0.12, 0x6a5f57, { jit: 0.08 });
    mb.cyl(0.012, 0.012, 1.7, 5, cx, 2.28, R.z0 + 0.12, 0x2a2622, { rz: Math.PI / 2 });
    this.add(mb.mesh(Mat.lit({ spec: 0x080808 }), { cast: true, receive: true }));
    this.rain = new RainGlass(ww, wh, { amount: 0.75, depth: 10 });
    this.rain.group.position.set(cx, cy, R.z0 + 0.005);
    this.rain.backdrop.position.z = -10; this.rain.backdrop.position.y = 1.0;
    this.add(this.rain.group);
    this.rainLines = makeRainLines([cx, 1.3, R.z0 - 3.2], [8, 5, 7], 460, 0.18); this.add(this.rainLines);
    // Sims und Fensterrahmen: Regen schlägt aufs Blech (Ton in Ambience)
  }

  buildDecor() {
    const R = ROOM;
    // Visionboard an der rechten Wand
    this.boardMat = Mat.tex(texVisionboard(), { spec: 0x000000, emissive: 0x000000 });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.09), this.boardMat); board.position.set(R.x1 - 0.012, 1.42, -1.05); board.rotation.y = -Math.PI / 2; board.receiveShadow = true; this.add(board); this.board = board;
    this.markImportant(board, { gain: 0.9 });
    // Mahnungen auf dem Schreibtisch + Zettel
    this.bills = new THREE.Group();
    const mat = Mat.tex(texMahnung(1), { spec: 0x000000 }); const mat2 = Mat.tex(texMahnung(2, '480,00'), { spec: 0x000000 }); const mat3 = Mat.tex(texMahnung(3, '55,08'), { spec: 0x000000 });
    [[mat, 0.4, -1.7, 0.4], [mat2, 0.27, -1.62, -0.5], [mat3, 0.52, -1.58, 0.9], [mat, 0.34, -1.5, -1.2]].forEach(([m, x, z, r], i) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), m); p.rotation.set(-Math.PI / 2, 0, r); p.position.set(x + 0.05, 0.756 + i * 0.002, z); p.receiveShadow = true; this.bills.add(p);
    });
    this.add(this.bills); this.markImportant(this.bills, { gain: 0.9 });
    // Foto (gerahmt, an die Lampe gelehnt)
    const fr = new THREE.Group();
    const frame = new MB(16); frame.box(0.19, 0.24, 0.015, 0, 0, 0, 0x2a2018); frame.box(0.04, 0.2, 0.05, 0, 0, -0.03, 0x2a2018, { rx: 0.0 });
    fr.add(frame.mesh(Mat.lit({ mask: 0 }), { cast: true }));
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.165, 0.205), Mat.tex(texPhotoNena(), { spec: 0, emissive: 0x000000 })); ph.position.set(0, 0.12, 0.009); fr.add(ph);
    fr.position.set(-0.08, 0.775, -1.86); fr.rotation.set(-0.16, 0.3, 0); this.add(fr); this.photo = fr; this.markImportant(fr, { gain: 1.1, when: () => this.seen3 && this.seen3() });
    // Notizbuch auf dem Bett
    const nb = notebookMB(1.15); this.nbObj = nb.mesh(Mat.lit({ mask: 0, spec: 0x111111 }), { cast: true }); this.nbObj.position.set(-1.0, 0.505, -0.62); this.nbObj.rotation.y = 0.5; this.add(this.nbObj); this.markImportant(this.nbObj, { gain: 1.2, when: () => !(G.state.flags && G.state.flags.room_notebook) });
    // Brot für die Katze (erscheint erst, wenn sie gefüttert wird)
    const br = new MB(60); br.box(0.09, 0.03, 0.06, 0, 0, 0, 0xd8b878); this.bread = br.mesh(Mat.lit({ mask: 0 }), { cast: false }); this.bread.position.set(0.15, 0.94, ROOM.z0 - 0.2); this.bread.visible = false; this.add(this.bread);
    // Wanduhr 3:47
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), Mat.tex(texClock(3, 47), { spec: 0x101010, shin: 30 })); clock.position.set(-0.95, 1.95, R.z0 + 0.01); this.add(clock);
    const sec = new MB(17); sec.box(0.008, 0.11, 0.004, 0, 0, 0, 0xb02a20); this.secHand = sec.mesh(Mat.glow({ vertexColors: true }), { cast: false }); this.secHand.geometry.translate(0, 0, 0); this.secHand.position.set(-0.95, 1.95, R.z0 + 0.016); this.add(this.secHand);
    // Handy + Nachtlicht-Punkt am Boden (in Mirzas Hand später)
  }

  buildLights() {
    // Schreibtischlampe: warmer Lichtkegel
    this.lamp = new THREE.SpotLight(0xffa04a, 5.2, 6, 0.95, 0.85, 1.6);
    this.lamp.position.set(0.86, 1.24, -1.86); this.lamp.target.position.set(0.25, 0.5, -1.3); this.add(this.lamp); this.add(this.lamp.target);
    this.lampFill = new THREE.PointLight(0xff9a48, 0.9, 4.2, 1.8); this.lampFill.position.set(0.7, 1.1, -1.6); this.add(this.lampFill);
    this.phoneLight = new THREE.PointLight(0x8fbaff, 0.0, 2.6, 1.8); this.phoneLight.position.set(-0.3, 0.6, 0.3); this.add(this.phoneLight);
    // Staub im Mondlichtstrahl und im Lampenlicht
    this.dust = makeDust([0.2, 1.2, -0.6], [2.4, 1.8, 3.2], 90, [0.55, 0.75, 1.2], 0.3, 3.2); this.add(this.dust);
    this.dust2 = makeDust([0.7, 1.15, -1.5], [1.2, 1.0, 1.2], 45, [1.5, 0.95, 0.5], 0.45, 3.4); this.add(this.dust2);
  }

  buildInteractions() {
    const flags = () => G.state.flags;
    const seen = () => ['board', 'bills', 'notebook'].every((k) => flags()['room_' + k]);
    this.seen3 = seen;
    this.iBoard = this.interact({ id: 'board', name: 'Visionboard', label: 'Ansehen', at: [1.05, -1.02], r: 1.05, pos: [1.6, 1.4, -1.05], run: () => Story.roomBoard() });
    this.iBills = this.interact({ id: 'bills', name: 'Mahnungen', label: 'Ansehen', at: [0.45, -1.15], r: 0.85, pos: [0.4, 0.85, -1.7], run: () => Story.roomBills() });
    this.iBook = this.interact({ id: 'notebook', name: 'Notizbuch', label: 'Nehmen', at: [-0.5, -0.45], r: 0.95, pos: [-1.2, 0.6, -0.55], run: () => Story.roomNotebook() });
    this.iPhoto = this.interact({ id: 'photo', name: 'Foto', label: 'Ansehen', at: [-0.05, -1.15], r: 0.85, pos: [-0.08, 0.95, -1.86], when: () => seen(), run: () => Story.roomPhoto() });
    this.iWindow = this.interact({ id: 'window', name: 'Fenster', label: 'Ansehen', at: [0.4, -1.28], r: 0.75, pos: [0.35, 1.5, -2.05], run: () => Story.roomWindow() });
    this.iDoor = this.interact({ id: 'door', name: 'Tür', label: 'Ansehen', at: [-1.15, 1.35], r: 0.85, pos: [-1.7, 1.2, 1.35], run: () => Story.roomDoor() });
    this.iSuit = this.interact({ id: 'suit', name: 'Anzug', label: 'Ansehen', at: [0.95, 0.2], r: 0.9, pos: [1.15, 1.4, 0.4], run: () => Story.roomSuit() });
    this.iOud = this.interact({ id: 'oud', name: 'Nenas Oud', label: 'Ansehen', at: [-1.1, 0.55], r: 0.85, pos: [-1.65, 1.6, 0.55], run: () => Story.roomOud() });
    this.iLamp = this.interact({ id: 'lamp', name: 'Lampe', label: 'Licht machen', at: [0.75, -1.22], r: 0.9, pos: [0.95, 1.25, -1.85], when: () => this.lampOn < 0.5 && !this.lampBusy, run: () => Story.roomLamp() });
    this.iClock = this.interact({ id: 'clock', name: 'Uhr', label: 'Ansehen', at: [-0.8, -1.3], r: 0.7, pos: [-0.95, 1.95, -2.0], run: () => Story.roomClock() });
  }

  buildZones() {
    // feste, komponierte Einstellungen – wie im Film (Master von der Tür-Ecke, Übergänge weich)
    this.camDefault = { pos: [-1.4, 2.05, 1.9], look: [0.3, 0.95, -1.0], fov: 60, follow: 0.12, lag: 1.8 };
    this.camZones = [
      { box: [0.05, -2.1, 1.7, -0.75], pos: [0.85, 1.75, 1.55], look: [0.4, 1.05, -1.8], fov: 48, follow: 0.2 },      // Schreibtisch / Fenster
      { box: [-1.7, -2.1, -0.25, 0.5], pos: [0.55, 1.8, 1.45], look: [-1.15, 0.65, -0.7], fov: 54, follow: 0.2 },      // Bett
    ];
  }

  tick(dt) {
    if (this.rain) this.rain.update(dt);
    if (this.dust) this.dust.userData.update(dt);
    if (this.dust2) this.dust2.userData.update(dt);
    if (this.rainLines) this.rainLines.userData.update(dt);
    if (this.lamp) { const f = 1 + Math.sin(G.t * 7.1) * 0.012 + Math.sin(G.t * 13.7 + 1) * 0.008, k = this.lampOn; this.lamp.intensity = 5.2 * f * k; this.lampFill.intensity = 0.9 * f * k; this.dust2.visible = k > 0.05; this.bulbMat.color.setRGB(k, k, k); this.lampShade.material.emissive.setRGB(0.4 * k, 0.22 * k, 0.05 * k); }
    if (this.secHand) this.secHand.rotation.z = -Math.floor(G.t) * (TAU / 60);
    if (this.cat && this.cat.root.visible) this.cat.update(dt);
    // Handylicht folgt der Figur, wenn das Handy in der Hand ist
    const ch = Player.ch;
    if (ch && ch.holds.phone && ch.holds.phone.visible) { this.phoneLight.position.set(ch.root.position.x, 0.75, ch.root.position.z + 0.2); this.phoneLight.intensity = this.phoneOn != null ? this.phoneOn : 0.5; }
    else this.phoneLight.intensity = damp(this.phoneLight.intensity, 0, 6, dt);
  }
  setLamp(on, dur = 1.6) { this.lampBusy = true; const from = this.lampOn; return tween((k) => { this.lampOn = lerp(from, on ? 1 : 0, k); }, null, dur, 'inOutSine').then(() => { this.lampBusy = false; }); }
  onEnter() {
    const f = G.state.flags || {};
    if (f.lampOn) this.lampOn = 1;
    if (f.catShown) this.cat.root.visible = true;
    if (f.catFed) this.bread.visible = true;
    if (f.room_notebook) this.nbObj.visible = false;
    Snd.ambSet('rain', 0.6, 3, { lp: 2400, room: 0.1 });
    Snd.ambSet('room', 0.5, 3);
    Snd.ambSet('fridge', 0.3, 4, { lp: 380, room: 0.15 });
    Snd.ambSet('clock', 0.32, 3, { room: 0.25 });
  }
  onLeave() { Snd.ambSet('rain', 0, 2); Snd.ambSet('room', 0, 2); Snd.ambSet('fridge', 0, 2); Snd.ambSet('clock', 0, 2); }
}
WORLDS.room = RoomWorld;
