// =====================================================================
// Figuren: prozedurales Low-Poly-Rig (Gelenk-Hierarchie), Pose-System, Gehzyklus, Blick, Blinzeln.
// Konvention: Figur blickt nach +Z, links = +X. Winkel in Grad.
//   arm  [beugen vor, abspreizen, drehen]   fore = Ellbogen   leg {flex, abd, knee, foot}
//   spine.lean > 0 = Oberkörper nach vorn.   head.nod > 0 = Kopf nickt nach unten, turn > 0 = nach links, tilt > 0 = zur rechten Schulter
// =====================================================================
const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'legL', 'shinL', 'footL', 'legR', 'shinR', 'footR'];

function mkPose(o = {}) {
  const P = { rootY: o.y || 0, rootZ: o.z || 0, rootX: o.x || 0 };
  P.hips = [o.hipTilt || 0, o.hipTwist || 0, o.hipSide || 0];
  P.spine = [o.lean || 0, o.twist || 0, o.side || 0];
  P.chest = [o.chestLean || 0, o.chestTwist || 0, o.chestSide || 0];
  P.neck = [o.neckNod || 0, o.neckTurn || 0, o.neckTilt || 0];
  P.head = [o.nod || 0, o.turn || 0, o.tilt || 0];
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1, a = o[s] || {}, arm = a.arm || [3, 6, 0], l = o['leg' + s] || o.leg || {};
    P['arm' + s] = [-arm[0], sg * (arm[2] || 0), sg * arm[1]];
    P['fore' + s] = [-(a.fore != null ? a.fore : 12), sg * (a.foreTwist || 0), 0];
    P['hand' + s] = [-(a.hand || 0), 0, sg * (a.handSide || 0)];
    P['leg' + s] = [-(l.flex || 0), sg * (l.twist || 0), sg * (l.abd != null ? l.abd : 2)];
    P['shin' + s] = [l.knee || 0, 0, 0];
    P['foot' + s] = [l.foot || 0, 0, 0];
  }
  return P;
}
const POSES = {
  stand: mkPose({ lean: 1.5 }),
  // Mirza: aufrecht, Schultern zurück, Kinn leicht oben – ruhig, gewichtig
  mirza: mkPose({ lean: 1, nod: -2, L: { arm: [2, 5, 0], fore: 10 }, R: { arm: [2, 5, 0], fore: 10 } }),
  hands_front: mkPose({ lean: 1, L: { arm: [22, 6, 0], fore: 62 }, R: { arm: [22, 6, 0], fore: 62 } }),
  phone: mkPose({ lean: 3, nod: 22, L: { arm: [4, 5, 0], fore: 12 }, R: { arm: [32, 4, 0], fore: 98, hand: 10 } }),
  notebook: mkPose({ lean: 3, nod: 18, L: { arm: [26, 8, 0], fore: 88 }, R: { arm: [30, 4, 0], fore: 78, hand: 6 } }),
  write: mkPose({ lean: 8, nod: 26, L: { arm: [30, 4, 0], fore: 92 }, R: { arm: [34, 2, 0], fore: 84, hand: 14 } }),
  // Boden, Rücken am Bett: Knie angezogen, Handy in den Händen
  sitFloor: mkPose({ y: -0.84, z: -0.02, lean: -4, nod: 30, hipTilt: 0, L: { arm: [50, 12, 0], fore: 92 }, R: { arm: [50, 12, 0], fore: 92 }, legL: { flex: 138, knee: 160, foot: 10, abd: 6 }, legR: { flex: 138, knee: 160, foot: 10, abd: 6 } }),
  sitFloorRest: mkPose({ y: -0.84, z: -0.02, lean: -6, nod: 14, L: { arm: [62, 10, 0], fore: 60 }, R: { arm: [62, 10, 0], fore: 60 }, legL: { flex: 138, knee: 160, foot: 10, abd: 6 }, legR: { flex: 138, knee: 160, foot: 10, abd: 6 } }),
  sitChair: mkPose({ y: -0.52, z: -0.06, lean: 6, nod: 10, L: { arm: [38, 8, 0], fore: 86 }, R: { arm: [40, 8, 0], fore: 86 }, legL: { flex: 88, knee: 90, foot: 0, abd: 3 }, legR: { flex: 88, knee: 90, foot: 0, abd: 3 } }),
  draw: mkPose({ y: -0.52, z: -0.06, lean: 12, nod: 24, twist: 4, L: { arm: [50, 8, 0], fore: 100 }, R: { arm: [48, 6, 0], fore: 96, hand: 12 }, legL: { flex: 88, knee: 90, abd: 3 }, legR: { flex: 88, knee: 90, abd: 3 } }),
  crouch: mkPose({ y: -0.42, z: 0.02, lean: 10, L: { arm: [50, 12, 0], fore: 82 }, R: { arm: [50, 12, 0], fore: 82 }, legL: { flex: 108, knee: 120, foot: 26, abd: 4 }, legR: { flex: 108, knee: 120, foot: 26, abd: 4 } }),
  cupFace: mkPose({ y: -0.42, z: 0.02, lean: 12, nod: 10, L: { arm: [62, 14, 0], fore: 72, hand: 20 }, R: { arm: [62, 14, 0], fore: 72, hand: 20 }, legL: { flex: 108, knee: 120, foot: 26, abd: 4 }, legR: { flex: 108, knee: 120, foot: 26, abd: 4 } }),
  handshake: mkPose({ lean: 3, R: { arm: [58, 8, 0], fore: 34, hand: -4 }, L: { arm: [2, 5, 0], fore: 12 } }),
  lookUp: mkPose({ lean: -2, nod: -16, L: { arm: [2, 5, 0], fore: 10 }, R: { arm: [2, 5, 0], fore: 10 } }),
  slump: mkPose({ lean: 9, nod: 16, L: { arm: [-4, 5, 0], fore: 8 }, R: { arm: [-4, 5, 0], fore: 8 } }),
  arms_crossed: mkPose({ lean: -1, L: { arm: [34, 2, 0], fore: 122, hand: 0 }, R: { arm: [34, 2, 0], fore: 122 } }),
  holdDoor: mkPose({ lean: 2, R: { arm: [70, 24, 0], fore: 14 }, L: { arm: [2, 5, 0], fore: 10 } }),
  point: mkPose({ R: { arm: [86, 8, 0], fore: 6 } }),
  drink: mkPose({ lean: 2, R: { arm: [42, 6, 0], fore: 108, hand: -20 } }),
  watch: mkPose({ lean: 2, nod: 8, L: { arm: [40, 4, 0], fore: 100 } }),
  tap: mkPose({ lean: 3, nod: 4, R: { arm: [30, 6, 0], fore: 96, hand: 18 } }),
  sketch: mkPose({ lean: 2, nod: 4, L: { arm: [32, 4, 0], fore: 92 }, R: { arm: [34, 4, 0], fore: 90, hand: 10 } }),
  stoop: mkPose({ lean: 7, nod: 6, L: { arm: [6, 6, 0], fore: 22 }, R: { arm: [6, 6, 0], fore: 22 } }),
};

const _tmpV = new THREE.Vector3();
const BODY = { hipY: 0.97, thigh: 0.43, shin: 0.42, spineH: 0.22, chestH: 0.29, neckH: 0.07, head: 0.11 };

class Character {
  constructor(name, opt = {}) {
    this.name = name; this.opt = opt;
    this.root = new THREE.Group(); this.root.name = 'char_' + name;
    this.j = {}; this.mats = [];
    this.cur = mkPose({ lean: 1.5 });
    this.pose = POSES.stand; this.overlay = null;
    this.walkAmt = 0; this.phase = 0; this.speed = 0; this.yaw = 0;
    this.gait = Object.assign({ stride: 0.78, leg: 30, arm: 0.34, knee: 42, bob: 0.02, lean: 3, sway: 2.2 }, opt.gait || {});
    this.look = { target: null, w: 0, yaw: 0, pitch: 0 };
    this.blinkT = 2 + Math.random() * 3; this.blink = 0;
    this.breath = Math.random() * 6;
    this.holds = {};
    this.moveT = null; this.moveRes = null; this.moveSpeed = 1.4;
    this.gaze = { x: 0, y: 0 };
    this.k = 9; this.poseK = 7;
    this.dyn = {};
  }
  joint(name, parent, x, y, z) {
    const g = new THREE.Group(); g.name = name; g.position.set(x, y, z);
    (parent || this.root).add(g); this.j[name] = g; return g;
  }
  addMesh(jn, mb, mat) {
    const m = mb.mesh(mat, { cast: true, receive: true }); this.j[jn].add(m); return m;
  }
  setPose(p, k) {
    this.pose = typeof p === 'string' ? (POSES[p] || POSES.stand) : p;
    if (k != null) this.poseK = k;
    return this;
  }
  // Pose sofort übernehmen (ohne Übergang) – für Schnitte
  snapPose() {
    const b = this.pose;
    for (const jn of JOINTS) this.cur[jn] = b[jn].slice();
    this.cur.rootX = b.rootX; this.cur.rootY = b.rootY; this.cur.rootZ = b.rootZ;
    for (const jn of JOINTS) { const o = this.j[jn], c = this.cur[jn]; if (o) o.rotation.set(c[0] * DEG, c[1] * DEG, c[2] * DEG); }
    this.j.hips.position.set(b.rootX, (BODY.hipY + b.rootY) * (this.opt.s || 1), b.rootZ);
    return this;
  }
  lookAt(v, w = 1) { this.look.target = v; this.look.w = v ? w : 0; return this; }
  faceYaw(y) { this.yaw = y; this.root.rotation.y = y; }
  faceTo(x, z) { this.yaw = Math.atan2(x - this.root.position.x, z - this.root.position.z); this.root.rotation.y = this.yaw; }
  place(x, y, z, yaw) { this.root.position.set(x, y, z); if (yaw != null) this.faceYaw(yaw); return this; }
  hold(name, on = true) {
    const m = this.holds[name]; if (m) m.visible = on;
    const side = { notebook: 'L', sketch: 'L', phone: 'R', pencil: 'R' }[name];
    if (side) this['hold' + side] = on;
    return this;
  }
  // Skript-Bewegung: gerade Linie zum Ziel (ohne Kollision), gibt Promise zurück
  walkTo(x, z, { speed = 1.35, face = null } = {}) {
    return new Promise((res, rej) => {
      if (G.skipping) { this.root.position.x = x; this.root.position.z = z; if (face != null) this.faceYaw(face); res(); return; }
      this.moveT = { x, z, face }; this.moveSpeed = speed; this.moveRes = res; this.moveRej = rej;
    });
  }
  finishMove() {
    if (!this.moveT) return;
    const m = this.moveT; this.root.position.x = m.x; this.root.position.z = m.z; if (m.face != null) this.yaw = m.face;
    this.moveT = null; if (this.moveRes) { const f = this.moveRes; this.moveRes = null; f(); }
  }
  abortMove() { if (this.moveT) { this.moveT = null; this.moveRes = null; if (this.moveRej) { const r = this.moveRej; this.moveRej = null; r(ABORT); } } }
  update(dt) {
    const c = this.cur, r = this.root;
    // --- scriptete Bewegung ---
    let speed = 0;
    if (this.moveT) {
      const dx = this.moveT.x - r.position.x, dz = this.moveT.z - r.position.z, d = Math.hypot(dx, dz);
      if (d < 0.05) {
        const m = this.moveT; this.moveT = null; if (m.face != null) this.yaw = m.face;
        if (this.moveRes) { const f = this.moveRes; this.moveRes = null; f(); }
      } else {
        const step = Math.min(d, this.moveSpeed * dt);
        r.position.x += (dx / d) * step; r.position.z += (dz / d) * step; speed = this.moveSpeed;
        this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 9, dt);
      }
    } else if (this.ext != null) speed = this.ext;
    r.rotation.y = this.yaw;
    this.speed = damp(this.speed, speed, 8, dt);
    const wk = clamp(this.speed / 1.4, 0, 1.5);
    this.walkAmt = damp(this.walkAmt, this.speed > 0.15 ? 1 : 0, 7, dt);
    this.phase += (this.speed / this.gait.stride) * Math.PI * dt;
    const g = this.gait, ph = this.phase, wa = this.walkAmt * Math.min(1, wk + 0.2);
    // --- Ziel-Pose: Basis + Gehzyklus + Atmen + Blick ---
    const T = {}; const base = this.pose, ov = this.overlay;
    for (const jn of JOINTS) { const b = base[jn], o = ov && ov[jn]; T[jn] = [b[0] + (o ? o[0] : 0), b[1] + (o ? o[1] : 0), b[2] + (o ? o[2] : 0)]; }
    let rootY = base.rootY + (ov ? ov.rootY || 0 : 0), rootZ = base.rootZ + (ov ? ov.rootZ || 0 : 0), rootX = base.rootX;
    this.breath += dt * 1.25;
    const br = Math.sin(this.breath) * (1 - wa * 0.6);
    T.chest[0] += br * 0.9; T.spine[0] += br * 0.4; T.neck[0] -= br * 0.5; T.armL[2] += br * 0.8; T.armR[2] -= br * 0.8;
    if (wa > 0.01) {
      const s = Math.sin(ph), s2 = Math.sin(ph + Math.PI), cs = Math.cos(ph), cs2 = Math.cos(ph + Math.PI);
      const A = g.leg * wa;
      T.legL[0] += -A * s; T.legR[0] += -A * s2;
      T.shinL[0] += g.knee * wa * Math.max(0, cs); T.shinR[0] += g.knee * wa * Math.max(0, cs2);
      T.footL[0] += -8 * wa * s + 6 * wa * Math.max(0, cs); T.footR[0] += -8 * wa * s2 + 6 * wa * Math.max(0, cs2);
      const ar = g.arm * A;
      T.armL[0] += ar * s * (this.holdL ? 0 : 1); T.armR[0] += ar * s2 * (this.holdR ? 0 : 1);
      T.spine[1] += g.sway * s * wa; T.chest[1] -= g.sway * 1.2 * s * wa; T.hips[1] -= g.sway * s * wa * 0.8;
      T.spine[0] += g.lean * wa; T.hips[2] += g.sway * 0.6 * cs * wa;
      rootY += -g.bob * (0.5 - 0.5 * Math.cos(2 * ph)) * wa;
    }
    // Blick: Kopf + Nacken + Augen
    const L = this.look; let gx = 0, gy = 0;
    if (L.target && L.w > 0.01) {
      this.j.head.getWorldPosition(_tmpV);
      const dx = L.target.x - _tmpV.x, dy = L.target.y - _tmpV.y, dz = L.target.z - _tmpV.z;
      let yawT = wrapAngle(Math.atan2(dx, dz) - this.yaw), pitT = Math.atan2(-dy, Math.hypot(dx, dz));
      const yc = clamp(yawT, -1.25, 1.25), pc = clamp(pitT, -0.6, 0.5);
      L.yaw = damp(L.yaw, yc * L.w, 7, dt); L.pitch = damp(L.pitch, pc * L.w, 7, dt);
      gx = clamp((yawT - yc) * 0.4 + (yc - L.yaw) * 0.6, -0.5, 0.5); gy = clamp(-(pitT - pc) * 0.4, -0.4, 0.4);
    } else { L.yaw = damp(L.yaw, 0, 5, dt); L.pitch = damp(L.pitch, 0, 5, dt); }
    T.head[1] += L.yaw / DEG * 0.65; T.neck[1] += L.yaw / DEG * 0.35; T.head[0] += L.pitch / DEG * 0.7; T.neck[0] += L.pitch / DEG * 0.3;
    this.gaze.x = damp(this.gaze.x, gx, 10, dt); this.gaze.y = damp(this.gaze.y, gy, 10, dt);
    // Blinzeln
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blink = 1; this.blinkT = 2.4 + Math.random() * 4.2; }
    if (this.blink > 0) this.blink = Math.max(0, this.blink - dt * 7);
    // --- glätten und anwenden ---
    const kk = this.poseK;
    for (const jn of JOINTS) {
      const cc = c[jn] || (c[jn] = [0, 0, 0]), t = T[jn], f = 1 - Math.exp(-(jn.startsWith('hand') || jn === 'head' ? kk * 1.6 : kk) * dt);
      cc[0] += (t[0] - cc[0]) * f; cc[1] += (t[1] - cc[1]) * f; cc[2] += (t[2] - cc[2]) * f;
      const o = this.j[jn]; if (o) o.rotation.set(cc[0] * DEG, cc[1] * DEG, cc[2] * DEG);
    }
    c.rootY = (c.rootY || 0) + (rootY - (c.rootY || 0)) * (1 - Math.exp(-kk * dt));
    c.rootZ = (c.rootZ || 0) + (rootZ - (c.rootZ || 0)) * (1 - Math.exp(-kk * dt));
    c.rootX = (c.rootX || 0) + (rootX - (c.rootX || 0)) * (1 - Math.exp(-kk * dt));
    this.j.hips.position.set(c.rootX, (BODY.hipY + c.rootY) * (this.opt.s || 1), c.rootZ);
    if (this.eyes) {
      const bl = this.blink > 0 ? 1 - Math.abs(this.blink * 2 - 1) : 0;
      for (const e of this.eyes) { e.scale.y = e.userData.sy * (1 - bl * 0.92); e.position.x = e.userData.x + this.gaze.x * 0.014; e.position.y = e.userData.y + this.gaze.y * 0.01; }
    }
    if (this.onUpdate) this.onUpdate(dt);
  }
  // Farbwerte der Figur-Materialien (Maske: bleibt im Fokus in Farbe)
  setMask(v) { for (const m of this.mats) if (m.userData.mask) m.userData.mask.value = v; }
  setRim(v) { for (const m of this.mats) if (m.userData.rim) m.userData.rim.value = v; }
}

// ---------- Baukasten für Menschen ----------
const SKIN = { mirza: 0xb98a67, nour: 0xc99a74, nena: 0xd0a887, child: 0xc59470, pale: 0xe2b99a, tan: 0xa87850, dark: 0x7a5238, olive: 0xbf9470 };

function humanoid(name, o) {
  const S = o.s || 1;
  const ch = new Character(name, { s: S, gait: o.gait });
  const skin = o.skin || SKIN.mirza, skinD = mixHex(skin, 0x000000, 0.18);
  const sh = (o.shoulder || 0.225) , hip = o.hipW || 0.085;
  const armLen = 0.29, foreLen = 0.27;
  const mat = Mat.lit({ rim: 1, spec: o.spec != null ? o.spec : 0x1a1a1a, shin: o.shin || 16, mask: o.mask || 0 });
  ch.mats.push(mat);
  const hipsJ = ch.joint('hips', null, 0, BODY.hipY * S, 0);
  const spineJ = ch.joint('spine', hipsJ, 0, 0, 0);
  const chestJ = ch.joint('chest', spineJ, 0, BODY.spineH * S, 0);
  const neckJ = ch.joint('neck', chestJ, 0, BODY.chestH * S, 0);
  const headJ = ch.joint('head', neckJ, 0, BODY.neckH * S, 0);
  const armL = ch.joint('armL', chestJ, sh * S, (BODY.chestH - 0.03) * S, 0), armR = ch.joint('armR', chestJ, -sh * S, (BODY.chestH - 0.03) * S, 0);
  const foreL = ch.joint('foreL', armL, 0, -armLen * S, 0), foreR = ch.joint('foreR', armR, 0, -armLen * S, 0);
  const handL = ch.joint('handL', foreL, 0, -foreLen * S, 0), handR = ch.joint('handR', foreR, 0, -foreLen * S, 0);
  const legL = ch.joint('legL', hipsJ, hip * S, -0.05 * S, 0), legR = ch.joint('legR', hipsJ, -hip * S, -0.05 * S, 0);
  const shinL = ch.joint('shinL', legL, 0, -BODY.thigh * S, 0), shinR = ch.joint('shinR', legR, 0, -BODY.thigh * S, 0);
  const footL = ch.joint('footL', shinL, 0, -BODY.shin * S, 0), footR = ch.joint('footR', shinR, 0, -BODY.shin * S, 0);

  const top = o.top || 0x15161b, bottom = o.bottom || 0x15161b, shoe = o.shoe || 0x0a0a0c, under = o.under || 0xe8e4da;
  const tw = o.torsoW || 1;
  const wide = o.wideLegs ? 1.35 : 1;
  // --- Becken + Beine ---
  { const mb = new MB(3); mb.jit = 0.02;
    mb.box(0.33 * S * tw, 0.2 * S, 0.21 * S, 0, -0.1 * S, 0, bottom);
    ch.addMesh('hips', mb, mat); }
  for (const [lj, sj, fj] of [['legL', 'shinL', 'footL'], ['legR', 'shinR', 'footR']]) {
    const th = new MB(4); th.jit = 0.02; th.cyl(0.062 * S * wide, 0.078 * S * wide, BODY.thigh * S, 6, 0, -BODY.thigh * S, 0, bottom, { grad: [0.85, 1] });
    ch.addMesh(lj, th, mat);
    const sn = new MB(5); sn.jit = 0.02; sn.cyl(0.05 * S * (o.wideLegs ? 1.5 : 1), 0.06 * S * wide, BODY.shin * S, 6, 0, -BODY.shin * S, 0, bottom, { grad: [0.8, 1] });
    ch.addMesh(sj, sn, mat);
    const ft = new MB(6); ft.jit = 0.02;
    ft.box(0.085 * S, 0.07 * S, 0.25 * S, 0, -0.07 * S, 0.06 * S, shoe, { grad: [0.7, 1] });
    ft.box(0.085 * S, 0.02 * S, 0.055 * S, 0, -0.07 * S, -0.055 * S, mixHex(shoe, 0x000000, 0.4));
    ch.addMesh(fj, ft, mat);
  }
  // --- Rumpf ---
  const torso = o.torso || 'suit';
  { const mb = new MB(7); mb.jit = 0.018;
    if (torso === 'suit' || torso === 'blazer') {
      mb.cyl(0.2 * S * tw, 0.185 * S * tw, 0.38 * S, 6, 0, -0.14 * S, 0, top, { sz: 0.74, grad: [0.9, 1.04] });
    } else if (torso === 'sweater' || torso === 'cardigan') {
      mb.cyl(0.235 * S * tw, 0.215 * S * tw, 0.42 * S, 7, 0, -0.16 * S, 0, top, { sz: 0.78, grad: [0.9, 1.03] });
      mb.box(0.47 * S * tw, 0.045 * S, 0.27 * S, 0, -0.17 * S, 0, mixHex(top, 0x000000, 0.1));
    } else { mb.cyl(0.2 * S * tw, 0.19 * S * tw, 0.36 * S, 6, 0, -0.14 * S, 0, top, { sz: 0.75 }); }
    ch.addMesh('spine', mb, mat); }
  { const mb = new MB(8); mb.jit = 0.018;
    const cw = (torso === 'sweater' || torso === 'cardigan') ? 0.27 : 0.25;
    mb.cyl(cw * S * tw, 0.2 * S * tw, BODY.chestH * S, 6, 0, 0, 0, top, { grad: [0.94, 1.05], sz: 0.66 });
    // Schulterpolster
    mb.box(0.5 * S * tw, 0.05 * S, 0.21 * S, 0, (BODY.chestH - 0.055) * S, 0, top, { grad: [1, 1.06] });
    if (torso === 'suit' || torso === 'blazer') {
      // Hemd-V und Kragen
      mb.tri([-0.06 * S, (BODY.chestH - 0.02) * S, 0.105 * S], [0.06 * S, (BODY.chestH - 0.02) * S, 0.105 * S], [0, 0.03 * S, 0.108 * S], under);
      mb.box(0.13 * S, 0.035 * S, 0.11 * S, 0, (BODY.chestH - 0.03) * S, 0.005 * S, under);
      // Revers (Drehpunkt = Brustmitte, Position relativ dazu)
      mb.box(0.042 * S, 0.22 * S, 0.02 * S, 0, -0.11 * S, 0, mixHex(top, 0xffffff, 0.07), { rz: -0.3, org: [0.075 * S, 0.17 * S, 0.108 * S] });
      mb.box(0.042 * S, 0.22 * S, 0.02 * S, 0, -0.11 * S, 0, mixHex(top, 0xffffff, 0.07), { rz: 0.3, org: [-0.075 * S, 0.17 * S, 0.108 * S] });
      if (o.tie) mb.box(0.03 * S, 0.22 * S, 0.012 * S, 0, 0.03 * S, 0.112 * S, o.tie);
    }
    ch.addMesh('chest', mb, mat); }
  // --- Hals + Kopf ---
  { const mb = new MB(9); mb.jit = 0.01; mb.cyl(0.045 * S, 0.05 * S, 0.1 * S, 6, 0, -0.035 * S, 0, skin); ch.addMesh('neck', mb, mat); }
  const hr = (o.headR || 0.12) * S;
  { const mb = new MB(10); mb.jit = 0.015;
    const cy = hr * 1.02;
    mb.sph(hr, 0, cy, 0, skin, { sx: 0.88, sy: 1.08, sz: 0.96, d: 1 });
    mb.box(0.03 * S, 0.045 * S, 0.035 * S, 0, cy - 0.015 * S, hr * 0.96, skinD, { rx: -0.25 }); // Nase
    mb.box(0.02 * S, 0.055 * S, 0.03 * S, hr * 0.85, cy + 0.0, 0, skinD); mb.box(0.02 * S, 0.055 * S, 0.03 * S, -hr * 0.85, cy + 0.0, 0, skinD); // Ohren
    const hair = o.hair || 0x0c0c10, style = o.hairStyle || 'quiff';
    const cap = (k = 1.06, t1 = 0.5, dy = 0.4) => mb.dome(hr * k, 0, cy + hr * dy, -hr * 0.1, hair, { sx: 0.93, sy: 1.0, sz: 1.0, t1, seg: 8 });
    const sides = (dy = 0.02, h = 0.55) => { for (const sx of [1, -1]) mb.box(0.022 * S, hr * h * 0.8, hr * 1.0, sx * hr * 0.86, cy + hr * (dy + 0.1), -hr * 0.4, hair); };
    const back = (h = 0.9, w = 0.2) => mb.box(w * S, hr * h, 0.06 * S, 0, cy - hr * 0.45, -hr * 0.86, hair);
    if (style === 'quiff' || style === 'short') {
      cap(1.06, 0.5, 0.4); sides(0.06, 0.5); back(0.9, 0.2);
      if (style === 'quiff') mb.sph(hr * 0.55, 0, cy + hr * 0.98, hr * 0.3, hair, { sx: 1.15, sy: 0.62, sz: 1.0, d: 1 });
    } else if (style === 'long') {
      cap(1.1, 0.5, 0.4); sides(0.02, 0.6);
      mb.box(0.25 * S, 0.36 * S, 0.1 * S, 0, cy - 0.3 * S, -hr * 0.78, hair, { rx: 0.06, grad: [0.85, 1.02] });
      for (const sx of [1, -1]) mb.box(0.05 * S, 0.27 * S, 0.12 * S, sx * hr * 0.9, cy - 0.17 * S, -hr * 0.12, hair);
      for (const sx of [1, -1]) mb.box(0.1 * S, 0.035 * S, 0.06 * S, sx * hr * 0.42, cy + hr * 0.6, hr * 0.8, hair, { rz: sx * -0.3 });
    } else if (style === 'bun') {
      cap(1.06, 0.5, 0.38); sides(0.04, 0.5); back(0.7, 0.18);
      mb.sph(hr * 0.5, 0, cy + hr * 0.62, -hr * 0.9, hair, { d: 1 });
    } else if (style === 'bob') {
      cap(1.12, 0.5, 0.36); sides(-0.1, 0.9);
      mb.box(0.24 * S, 0.14 * S, 0.13 * S, 0, cy - hr * 0.6, -hr * 0.5, hair);
    } else if (style === 'grey') {
      cap(1.04, 0.5, 0.34); sides(0.06, 0.4);
    }
    // Brauen – leicht nach innen geneigt: ernst, konzentriert
    const bc = mixHex(hair, 0x000000, 0.2);
    mb.box(0.05 * S, 0.011 * S, 0.012 * S, hr * 0.38, cy + hr * 0.36, hr * 0.94, bc, { rz: o.brow != null ? o.brow : 0.18 }); mb.box(0.05 * S, 0.011 * S, 0.012 * S, -hr * 0.38, cy + hr * 0.36, hr * 0.94, bc, { rz: -(o.brow != null ? o.brow : 0.18) });
    ch.addMesh('head', mb, mat);
    // Augen: eigene Meshes, damit sie blinzeln / schauen können
    const emat = new THREE.MeshBasicMaterial({ color: tcol(0x0a0806), fog: false });
    ch.eyes = [];
    for (const sx of [1, -1]) {
      const e = new THREE.Mesh(GEO.box, emat); e.scale.set(0.024 * S, 0.02 * S, 0.012 * S);
      e.position.set(sx * hr * 0.36, cy + hr * 0.16, hr * 0.93); e.userData = { x: e.position.x, y: e.position.y, sy: e.scale.y };
      headJ.add(e); ch.eyes.push(e);
    }
    ch.headTop = cy + hr; }
  // --- Arme ---
  const sleeve = torso === 'sweater' ? top : torso === 'cardigan' ? top : top;
  const sw = torso === 'sweater' || torso === 'cardigan' ? 1.3 : 1;
  for (const [aj, fj, hj] of [['armL', 'foreL', 'handL'], ['armR', 'foreR', 'handR']]) {
    const mb = new MB(11); mb.jit = 0.018;
    mb.cyl(0.05 * S * sw, 0.043 * S * sw, armLen * S, 6, 0, -armLen * S, 0, sleeve, { grad: [0.92, 1.02] });
    mb.sph(0.055 * S * sw, 0, -0.005 * S, 0, sleeve, { d: 0 });
    ch.addMesh(aj, mb, mat);
    const fb = new MB(12); fb.jit = 0.018;
    fb.cyl(0.043 * S * sw, 0.036 * S * (sw > 1 ? 1.25 : 1), foreLen * S, 6, 0, -foreLen * S, 0, sleeve, { grad: [0.92, 1.0] });
    if (torso === 'suit' || torso === 'blazer') fb.box(0.062 * S, 0.02 * S, 0.062 * S, 0, -foreLen * S - 0.004, 0, under);
    if (torso === 'sweater' || torso === 'cardigan') fb.box(0.075 * S, 0.03 * S, 0.075 * S, 0, -foreLen * S, 0, mixHex(top, 0x000000, 0.12));
    ch.addMesh(fj, fb, mat);
    const hb = new MB(13); hb.jit = 0.01;
    hb.box(0.062 * S, 0.085 * S, 0.03 * S, 0, -0.09 * S, 0, skin); hb.box(0.02 * S, 0.05 * S, 0.028 * S, aj === 'armL' ? -0.036 * S : 0.036 * S, -0.06 * S, 0.008 * S, skin, { rz: aj === 'armL' ? 0.35 : -0.35 });
    ch.addMesh(hj, hb, mat);
  }
  // Kontakt-Schatten
  const blob = new THREE.Mesh(GEO.plane, blobMat());
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; blob.scale.set(0.9 * S, 0.9 * S, 1); blob.renderOrder = 1;
  ch.root.add(blob); ch.blob = blob;
  ch.root.traverse((m) => { if (m.isMesh && m !== blob) { m.castShadow = true; m.receiveShadow = true; } });
  return ch;
}
function mixHex(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); const r = [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]; return (Math.round(r[0] * 255) << 16) | (Math.round(r[1] * 255) << 8) | Math.round(r[2] * 255); }
let _blobMat = null;
function blobMat() {
  if (_blobMat) return _blobMat;
  const t = canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }, { linear: true, nomip: true });
  t.userData.shared = true;
  _blobMat = keepMask(new THREE.MeshBasicMaterial({ map: t, fog: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), false);
  return _blobMat;
}

// Gehaltene Gegenstände
function addHold(ch, name, joint, mb, mat, pos, rot) {
  const m = mb.mesh(mat, { cast: false, receive: false });
  m.position.set(pos[0], pos[1], pos[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.visible = false; ch.j[joint].add(m); ch.holds[name] = m; return m;
}
function notebookMB(S = 1) {
  const mb = new MB(21); mb.jit = 0.01;
  mb.box(0.105 * S, 0.02 * S, 0.15 * S, 0, 0, 0, 0x0c0b0a);
  mb.box(0.096 * S, 0.014 * S, 0.142 * S, 0.003 * S, 0.003 * S, 0.001 * S, 0xe9dfc4, { rz: 0 });
  mb.box(0.106 * S, 0.006 * S, 0.02 * S, 0, 0.02 * S, 0.04 * S, 0x1a1815);
  mb.box(0.004 * S, 0.022 * S, 0.152 * S, -0.045 * S, 0, 0, 0xc59a45);
  return mb;
}
function phoneMB(S = 1) {
  const mb = new MB(22); mb.jit = 0.005;
  mb.box(0.07 * S, 0.008 * S, 0.146 * S, 0, 0, 0, 0x0a0a0c);
  return mb;
}
function phoneScreenMB(S = 1) { const mb = new MB(23); mb.jit = 0; mb.box(0.062 * S, 0.001 * S, 0.135 * S, 0, 0.0085 * S, 0, [0.55, 0.85, 1.4]); return mb; }

// ---------- Die Hauptfiguren ----------
function makeMirza() {
  const ch = humanoid('Mirza', { s: 1.0, top: 0x131419, bottom: 0x131419, under: 0xe9e5db, shoe: 0x09090b, hair: 0x0b0b0e, skin: SKIN.mirza, hairStyle: 'quiff', shin: 24, spec: 0x2a2a30, torso: 'suit', gait: { stride: 0.82, leg: 26, arm: 0.26, knee: 38, bob: 0.014, lean: 2.4, sway: 1.6 } });
  const noteMat = Mat.lit({ mask: 0, spec: 0x111111 });
  addHold(ch, 'notebook', 'handL', notebookMB(), noteMat, [0.0, -0.09, 0.03], [0.2, 0, 1.5]);
  addHold(ch, 'phone', 'handR', phoneMB(), noteMat, [0.0, -0.085, 0.03], [0.6, 0, 1.55]);
  const scr = new THREE.Mesh(phoneScreenMB().build(), Mat.glow({ fog: false }));
  scr.position.set(0, -0.085, 0.03); scr.rotation.set(0.6, 0, 1.55); scr.visible = false; ch.j.handR.add(scr); ch.holds.phoneScreen = scr;
  const oldHold = ch.hold.bind(ch);
  ch.hold = (n, on = true) => { oldHold(n, on); if (n === 'phone') oldHold('phoneScreen', on); return ch; };
  // Notizbuch schaut immer aus der Brusttasche
  const pk = new MB(24); pk.box(0.03, 0.05, 0.012, 0, 0, 0, 0x0d0c0b); pk.box(0.028, 0.006, 0.013, 0, 0.044, 0, 0xc59a45);
  const pm = pk.mesh(noteMat, { cast: false }); pm.position.set(0.09, 0.14, 0.108); ch.j.chest.add(pm);
  return ch;
}
function makeNour() {
  const ch = humanoid('Nour', { s: 0.94, top: 0xe6d6b8, bottom: 0xb5603f, under: 0xf1e7d2, shoe: 0x4d3022, hair: 0x2b1b15, skin: SKIN.nour, hairStyle: 'long', torso: 'sweater', torsoW: 0.92, headR: 0.108, shoulder: 0.205, hipW: 0.08, wideLegs: true, brow: 0.05, mask: 1, shin: 8, spec: 0x120c08, gait: { stride: 0.72, leg: 24, arm: 0.22, knee: 34, bob: 0.014, lean: 1.4, sway: 2.4 } });
  // Umhängetasche + Skizzenbuch
  const bag = new MB(31); bag.box(0.2, 0.15, 0.06, 0, 0, 0, 0x8a5a3a); bag.box(0.2, 0.05, 0.065, 0, 0.11, 0, 0x74492d); bag.box(0.03, 0.04, 0.066, 0, 0.09, 0.0, 0xc59a45);
  const bm = bag.mesh(ch.mats[0], { cast: true }); bm.position.set(-0.24, -0.02, 0.0); ch.j.hips.add(bm);
  const strap = new MB(32); strap.box(0.03, 0.34, 0.016, 0, -0.17, 0, 0x7a4d30, { rz: 0.62 });
  const sm = strap.mesh(ch.mats[0], { cast: false }); sm.position.set(0.02, 0.2, 0.108); ch.j.chest.add(sm);
  const sk = new MB(33); sk.jit = 0.01; sk.box(0.19, 0.022, 0.25, 0, 0, 0, 0xeadfc8); sk.box(0.192, 0.006, 0.252, 0, 0.022, 0, 0x8b5a3f); sk.box(0.012, 0.03, 0.252, -0.09, 0, 0, 0x6f412b);
  addHold(ch, 'sketch', 'handL', sk, Mat.lit({ mask: 1 }), [0.02, -0.09, 0.04], [0.15, 0, 1.4]);
  const pen = new MB(34); pen.cyl(0.006, 0.006, 0.15, 5, 0, 0, 0, 0x2a2a2a); pen.cone(0.006, 0.02, 5, 0, 0.15, 0, 0xd9b48a);
  addHold(ch, 'pencil', 'handR', pen, Mat.lit({ mask: 1 }), [0.0, -0.1, 0.03], [1.2, 0, 0.2]);
  return ch;
}
function makeNena() {
  return humanoid('Nena', { s: 0.86, top: 0x5b6656, bottom: 0x3f3a44, under: 0xd8cdb8, shoe: 0x2a2320, hair: 0xd9d5cf, skin: SKIN.nena, hairStyle: 'bun', torso: 'cardigan', torsoW: 1.02, headR: 0.108, shoulder: 0.2, brow: 0.0, gait: { stride: 0.55, leg: 20, arm: 0.2, knee: 28, bob: 0.01, lean: 4, sway: 2 }, spec: 0x080808 });
}
function makeKid() {
  const ch = humanoid('Mirza klein', { s: 0.6, headR: 0.15, top: 0xe2a53e, bottom: 0x3a4a6a, under: 0xffffff, shoe: 0x6b4a2f, hair: 0x120e0c, skin: SKIN.child, hairStyle: 'short', torso: 'tshirt', torsoW: 1.0, brow: 0, shoulder: 0.22, gait: { stride: 0.5, leg: 30, arm: 0.5, knee: 40, bob: 0.02, lean: 2, sway: 3 } });
  return ch;
}
// Generische Nebenfigur
function makeNPC(name, o = {}) {
  return humanoid(name, Object.assign({ top: 0x6a6660, bottom: 0x3c3a3c, shoe: 0x1a1816, hair: 0x2a2320, skin: SKIN.pale, hairStyle: 'short', torso: 'suit', shin: 8 }, o));
}

// ---------- Katze ----------
function makeCat() {
  const g = new THREE.Group(); g.name = 'cat';
  const fur = 0x54473c, dark = 0x2c241e, light = 0xb7a58c;
  const mat = Mat.lit({ rim: 1, spec: 0x0a0a0a, shin: 6 });
  const body = new THREE.Group(); g.add(body);
  const mb = new MB(41); mb.jit = 0.03;
  mb.sph(0.5, 0, 0.12, 0, fur, { sx: 0.19, sy: 0.17, sz: 0.42, d: 1 });         // Körper
  mb.sph(0.5, 0, 0.13, 0.13, light, { sx: 0.14, sy: 0.12, sz: 0.22, d: 1 });      // Brust
  for (let i = 0; i < 5; i++) mb.box(0.11, 0.012, 0.03, 0, 0.245 - Math.abs(i - 2) * 0.006, -0.06 + i * 0.065, dark, { rx: 0.0 });  // Streifen
  const bodyM = mb.mesh(mat); body.add(bodyM);
  const head = new THREE.Group(); head.position.set(0, 0.2, 0.2); body.add(head);
  const hb = new MB(42); hb.jit = 0.02;
  hb.sph(0.085, 0, 0, 0, fur, { sx: 1.05, sy: 0.9, sz: 0.95, d: 1 });
  hb.sph(0.04, 0, -0.025, 0.07, light, { sx: 1.0, sy: 0.7, sz: 0.8, d: 0 });
  hb.cone(0.035, 0.06, 4, 0.05, 0.05, -0.005, fur, { rz: -0.15 }); hb.cone(0.035, 0.06, 4, -0.05, 0.05, -0.005, fur, { rz: 0.15 });
  hb.box(0.014, 0.008, 0.01, 0, -0.008, 0.083, 0x3a2a2a);
  head.add(hb.mesh(mat));
  const eyeMat = Mat.glow({ vertexColors: false, color: 0x000000, fog: false });
  eyeMat.color.setRGB(2.6, 1.5, 0.35);
  const eyes = [];
  for (const sx of [1, -1]) { const e = new THREE.Mesh(GEO.box, eyeMat); e.scale.set(0.02, 0.026, 0.008); e.position.set(sx * 0.035, 0.012, 0.075); head.add(e); eyes.push(e); }
  const legs = [];
  const lm = new MB(43); lm.jit = 0.02; lm.cyl(0.026, 0.02, 0.15, 5, 0, -0.15, 0, fur);
  const pawGeo = new MB(44); pawGeo.box(0.04, 0.025, 0.06, 0, -0.025, 0.012, light);
  for (const [x, z, k] of [[0.055, 0.15, 0], [-0.055, 0.15, 1], [0.055, -0.15, 2], [-0.055, -0.15, 3]]) {
    const lg = new THREE.Group(); lg.position.set(x, 0.14, z); body.add(lg);
    lg.add(lm.mesh(mat)); const paw = pawGeo.mesh(mat); paw.position.y = -0.15; lg.add(paw); legs.push(lg);
  }
  const tail = []; let tp = body;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group(); seg.position.set(0, i === 0 ? 0.17 : 0, i === 0 ? -0.18 : -0.06);
    const sb = new MB(50 + i); sb.jit = 0.02; sb.cyl(0.02 - i * 0.002, 0.024 - i * 0.002, 0.07, 5, 0, 0, -0.035, i > 3 ? dark : fur, { rx: Math.PI / 2 });
    seg.add(sb.mesh(mat)); tp.add(seg); tp = seg; tail.push(seg);
  }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  const cat = { root: g, body, head, legs, tail, eyes, mode: 'sit', t: Math.random() * 10, mats: [mat], look: null, blink: 0, blinkT: 3,
    setMode(m) { this.mode = m; },
    update(dt) {
      this.t += dt; const t = this.t;
      const sit = this.mode === 'sit', loaf = this.mode === 'loaf';
      const pitch = sit ? -0.62 : loaf ? 0 : 0;
      body.rotation.x = damp(body.rotation.x, pitch, 4, dt);
      body.position.y = damp(body.position.y, sit ? -0.02 : loaf ? -0.1 : 0, 4, dt);
      legs.forEach((l, i) => { const front = i < 2; l.rotation.x = damp(l.rotation.x, sit ? (front ? 0.62 : -1.2) : loaf ? (front ? -1.4 : 1.2) : 0, 5, dt); l.scale.y = damp(l.scale.y, loaf ? 0.45 : 1, 5, dt); });
      const target = this.look;
      if (target) { const wp = new THREE.Vector3(); head.getWorldPosition(wp); const dx = target.x - wp.x, dz = target.z - wp.z; const yaw = wrapAngle(Math.atan2(dx, dz) - g.rotation.y); head.rotation.y = damp(head.rotation.y, clamp(yaw, -1.1, 1.1), 5, dt); }
      head.rotation.x = this.eat ? 1.0 + Math.sin(t * 7) * 0.1 : sit ? 0.5 + Math.sin(t * 0.7) * 0.03 : 0;
      tail.forEach((s, i) => { s.rotation.x = 0.35 * (sit ? 0.2 : 1) + Math.sin(t * 1.6 - i * 0.5) * 0.12 * (i + 1) * 0.5; s.rotation.y = Math.sin(t * 1.1 - i * 0.6) * 0.2 * (sit ? 1.5 : 1); });
      this.blinkT -= dt; if (this.blinkT < 0) { this.blink = 1; this.blinkT = 3 + Math.random() * 5; }
      if (this.blink > 0) this.blink = Math.max(0, this.blink - dt * 6);
      const bl = this.blink > 0 ? 1 - Math.abs(this.blink * 2 - 1) : 0;
      eyes.forEach((e) => { e.scale.y = 0.026 * (1 - bl * 0.9); });
    },
  };
  return cat;
}
