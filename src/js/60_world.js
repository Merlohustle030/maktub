// =====================================================================
// Welt-Basisklasse, Kamera-Rig (Zonen / Orbit / Kino), Spielerbewegung, Interaktionen, Fokus
// =====================================================================
class World {
  constructor(name, o = {}) {
    this.name = name; this.opt = o;
    this.scene = new THREE.Scene();
    this.colliders = []; this.interacts = []; this.updaters = []; this.chars = []; this.important = []; this.reflectors = [];
    this.camZones = []; this.camDefault = null; this.camMode = 'zones'; this.follow = { dist: 4.6, height: 1.55, minPitch: 0.05, maxPitch: 0.75, yaw: 0, pitch: 0.28 };
    this.bounds = null; this.surface = 'wood'; this.spawn = { x: 0, z: 0, yaw: 0 }; this.speed = 1; this.groundY = 0;
    this.grade = null;
  }
  add(o) { this.scene.add(o); return o; }
  addChar(ch) { if (!this.chars.includes(ch)) this.chars.push(ch); this.scene.add(ch.root); return ch; }
  collide(x0, z0, x1, z1) { this.colliders.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) }); }
  ring(cx, cz, r) { this.colliders.push({ cx, cz, r }); }
  onUpdate(fn) { this.updaters.push(fn); }
  update(dt) { for (const u of this.updaters) u(dt, this); for (const c of this.chars) c.update(dt); }
  interact(spec) {
    const it = Object.assign({ r: 1.2, label: 'Ansehen', pos: [spec.at[0], 1.1, spec.at[1]], done: false, disabled: false }, spec);
    it.posV = new THREE.Vector3(it.pos[0], it.pos[1], it.pos[2]);
    this.interacts.push(it); return it;
  }
  // Dinge, die im Fokus golden leuchten: Materialien werden geklont, damit sie einzeln leuchten können
  markImportant(obj, o = {}) {
    const mats = [];
    obj.traverse((m) => {
      if (!m.isMesh) return;
      if (Array.isArray(m.material)) return;
      const src = m.material, c = src.clone();
      c.userData = { mask: { value: 0 } };                                   // clone() verliert die Shader-Patches → neu anhängen
      c.customProgramCacheKey = src.customProgramCacheKey;
      c.onBeforeCompile = (sh) => patchShader(sh, { mask: c.userData.mask });
      m.material = c;
      if (c.emissive) mats.push(c);
    });
    const it = { obj, mats, gain: o.gain != null ? o.gain : 1, when: o.when || null };
    this.important.push(it); return it;
  }
  resolve(p, r) {
    for (let k = 0; k < 3; k++) {
      for (const c of this.colliders) {
        if (c.r != null) {
          const dx = p.x - c.cx, dz = p.z - c.cz, d = Math.hypot(dx, dz), m = c.r + r;
          if (d < m && d > 1e-5) { p.x = c.cx + (dx / d) * m; p.z = c.cz + (dz / d) * m; }
        } else {
          const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
          if (d2 < r * r) {
            if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; }
            else {
              const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, rr, t, b);
              if (m === l) p.x = c.x0 - r; else if (m === rr) p.x = c.x1 + r; else if (m === t) p.z = c.z0 - r; else p.z = c.z1 + r;
            }
          }
        }
      }
    }
    const b = this.bounds;
    if (b) { p.x = clamp(p.x, b.x0 + r, b.x1 - r); p.z = clamp(p.z, b.z0 + r, b.z1 - r); }
    if (this.blocked && this.blocked(p.x, p.z)) { p.x = this._lx; p.z = this._lz; } else { this._lx = p.x; this._lz = p.z; }
  }
  dispose() { disposeTree(this.scene); }
  onEnter() {}
  onLeave() {}
}

// Segment p0→p1 gegen eine Box [x0,y0,z0,x1,y1,z1] (Slab-Methode): erster Eintritt t ∈ [0,1] oder null
function segBox(p0, p1, b) {
  let t0 = 0, t1 = 1;
  const d = [p1.x - p0.x, p1.y - p0.y, p1.z - p0.z], o = [p0.x, p0.y, p0.z];
  for (let i = 0; i < 3; i++) {
    const lo = b[i], hi = b[i + 3];
    if (Math.abs(d[i]) < 1e-6) { if (o[i] < lo || o[i] > hi) return null; continue; }
    let a = (lo - o[i]) / d[i], c = (hi - o[i]) / d[i];
    if (a > c) { const t = a; a = c; c = t; }
    t0 = Math.max(t0, a); t1 = Math.min(t1, c);
    if (t0 > t1) return null;
  }
  return t0;
}
// ---------- Kamera ----------
const _cv = new THREE.Vector3(), _cv2 = new THREE.Vector3();
const Cam = {
  pos: new THREE.Vector3(0, 2, 6), look: new THREE.Vector3(0, 1, 0), fov: 40, roll: 0, shake: 0, punchV: 0,
  mode: 'cine', yaw: 0, pitch: 0.28, tok: 0, zone: null, dofAuto: true, par: 1,
  _tp: new THREE.Vector3(), _tl: new THREE.Vector3(), _zf: 40, _lastFov: 0, _lastRoll: 0,
  forward2D(out) {
    out.x = this.look.x - this.pos.x; out.z = this.look.z - this.pos.z;
    const l = Math.hypot(out.x, out.z) || 1; out.x /= l; out.z /= l; return out;
  },
  set(s) {
    this.tok++;
    if (s.pos) this.pos.set(s.pos[0], s.pos[1], s.pos[2]);
    if (s.look) this.look.set(s.look[0], s.look[1], s.look[2]);
    if (s.fov != null) this.fov = s.fov;
    this.roll = s.roll != null ? s.roll : 0;
    this.shake = s.shake != null ? s.shake : 0;
    if (s.dof != null) FX.dof = s.dof;
    if (s.dofFocus != null) { FX.dofFocus = s.dofFocus; this.dofAuto = false; } else if (s.dof != null) { this.dofAuto = true; }
    this.mode = 'cine';
  },
  move(s, dur = 4, e = 'inOutSine') {
    const tok = ++this.tok; this.mode = 'cine';
    const p0 = this.pos.clone(), l0 = this.look.clone(), f0 = this.fov, r0 = this.roll, s0 = this.shake;
    const p1 = s.pos ? new THREE.Vector3(s.pos[0], s.pos[1], s.pos[2]) : p0, l1 = s.look ? new THREE.Vector3(s.look[0], s.look[1], s.look[2]) : l0;
    const f1 = s.fov != null ? s.fov : f0, r1 = s.roll != null ? s.roll : r0, sh1 = s.shake != null ? s.shake : s0;
    const d0 = FX.dof;
    return tween((k) => {
      if (this.tok !== tok) return;
      this.pos.lerpVectors(p0, p1, k); this.look.lerpVectors(l0, l1, k); this.fov = lerp(f0, f1, k); this.roll = lerp(r0, r1, k); this.shake = lerp(s0, sh1, k);
      if (s.dof != null) FX.dof = lerp(d0, s.dof, k);
    }, null, dur, e);
  },
  // Kreisfahrt um einen Punkt: {center:[x,y,z], r, a0, a1, y0, y1, look:[...]}
  arc(s, dur, e = 'inOutSine') {
    const tok = ++this.tok; this.mode = 'cine';
    const c = s.center, f0 = this.fov;
    return tween((k) => {
      if (this.tok !== tok) return;
      const a = lerp(s.a0, s.a1, k), r = lerp(s.r0 != null ? s.r0 : s.r, s.r1 != null ? s.r1 : s.r, k);
      this.pos.set(c[0] + Math.sin(a) * r, lerp(s.y0, s.y1 != null ? s.y1 : s.y0, k), c[2] + Math.cos(a) * r);
      const lk = s.look || c; this.look.set(lk[0], lk[1], lk[2]);
      if (s.fov != null) this.fov = lerp(f0, s.fov, k);
    }, null, dur, e);
  },
  punch(v = 1) { this.punchV = Math.max(this.punchV, v); },
  gameplay() {
    const W = G.world; if (!W) return;
    this.tok++; this.mode = W.camMode;
    this.roll = 0; this.shake = 0;
    if (this.mode === 'follow') { this.yaw = W.follow.yaw; this.pitch = W.follow.pitch; }
  },
  update(dt) {
    const W = G.world, P = Player.ch;
    if (W && P && this.mode !== 'cine') {
      const pp = P.root.position;
      if (this.mode === 'zones') {
        let z = null;
        for (const q of W.camZones) if (q.test ? q.test(pp) : (pp.x >= q.box[0] && pp.x <= q.box[2] && pp.z >= q.box[1] && pp.z <= q.box[3])) { z = q; break; }
        if (!z) z = W.camDefault;
        if (z) {
          if (z !== this.zone) { this.zone = z; if (z.cut) { this._tp.set(...z.pos); this.pos.copy(this._tp); } }
          const f = z.follow != null ? z.follow : 0.3;
          this._tp.set(z.pos[0], z.pos[1], z.pos[2]);
          this._tl.set(z.look[0], z.look[1], z.look[2]).lerp(_cv.set(pp.x, z.look[1] + (z.lookY || 0), pp.z), f);
          const mx = Input.mx * 0.16 * this.par, my = Input.my * 0.08 * this.par;
          this._tp.x += mx; this._tp.y -= my; this._tl.x += mx * 0.4;
          const k = z.lag != null ? z.lag : 2.4;
          this.pos.x = damp(this.pos.x, this._tp.x, k, dt); this.pos.y = damp(this.pos.y, this._tp.y, k, dt); this.pos.z = damp(this.pos.z, this._tp.z, k, dt);
          this.look.x = damp(this.look.x, this._tl.x, k * 1.5, dt); this.look.y = damp(this.look.y, this._tl.y, k * 1.5, dt); this.look.z = damp(this.look.z, this._tl.z, k * 1.5, dt);
          this.fov = damp(this.fov, z.fov || 40, 2.2, dt);
        }
      } else if (this.mode === 'follow') {
        const F = W.follow;
        if (G.mode === 'play' && !G.paused) { this.yaw -= Input.dx * 0.0032; this.pitch = clamp(this.pitch + Input.dy * 0.0028, F.minPitch, F.maxPitch); }
        // sanft hinter die Figur drehen, wenn sie läuft und die Maus ruht
        if (Player.speed > 0.4 && Math.abs(Input.dx) < 1 && G.mode === 'play') this.yaw = dampAngle(this.yaw, P.yaw + Math.PI, 0.35, dt);
        const tgt = _cv.set(pp.x, pp.y + F.height, pp.z);
        const cp = Math.cos(this.pitch), d = F.dist;
        this._tp.set(tgt.x + Math.sin(this.yaw) * cp * d, tgt.y + Math.sin(this.pitch) * d, tgt.z + Math.cos(this.yaw) * cp * d);
        if (W.camBox) { const cb = W.camBox; this._tp.x = clamp(this._tp.x, cb[0], cb[2]); this._tp.z = clamp(this._tp.z, cb[1], cb[3]); }
        if (W.camBlockers) for (const b of W.camBlockers) { const t = segBox(tgt, this._tp, b); if (t !== null) this._tp.lerpVectors(tgt, this._tp, Math.max(0.12, t - 0.05)); }   // Kamera schiebt sich vor massive Objekte
        const k = 6;
        this.pos.x = damp(this.pos.x, this._tp.x, k, dt); this.pos.y = damp(this.pos.y, this._tp.y, k, dt); this.pos.z = damp(this.pos.z, this._tp.z, k, dt);
        this.look.x = damp(this.look.x, tgt.x, 9, dt); this.look.y = damp(this.look.y, tgt.y - 0.08, 9, dt); this.look.z = damp(this.look.z, tgt.z, 9, dt);
        this.fov = damp(this.fov, F.fov || 42, 2, dt);
      }
    }
  },
  apply(camera, dt) {
    const t = G.t;
    let sx = 0, sy = 0, sr = 0;
    if (this.shake > 0.0001) {
      const a = this.shake;
      sx = (Math.sin(t * 7.3) + Math.sin(t * 12.1 + 1) * 0.5) * a; sy = (Math.sin(t * 8.7 + 2) + Math.sin(t * 13.3) * 0.5) * a * 0.8; sr = Math.sin(t * 5.9) * a * 0.12;
    }
    // ganz leichtes Atmen der Kamera (nie komplett tot)
    sx += Math.sin(t * 0.37) * 0.004; sy += Math.sin(t * 0.29 + 1) * 0.004;
    if (this.punchV > 0.001) { sy -= this.punchV * 0.05; this.punchV = damp(this.punchV, 0, 9, dt); }
    camera.position.set(this.pos.x + sx, this.pos.y + sy, this.pos.z);
    const rr = this.roll + sr;
    camera.up.set(Math.sin(rr), Math.cos(rr), 0);
    camera.lookAt(this.look.x, this.look.y, this.look.z);
    const f = this.fov * (1 - 0.09 * G.focus);
    if (Math.abs(f - this._lastFov) > 0.001) { camera.fov = f; camera.updateProjectionMatrix(); this._lastFov = f; }
    if (this.dofAuto && FX.dof > 0.001) FX.dofFocus = camera.position.distanceTo(_cv2.set(this.look.x, this.look.y, this.look.z));
  },
};

// ---------- Spieler ----------
const _f2 = { x: 0, z: 1 };
const Player = {
  ch: null, locked: false, speed: 0, dir: new THREE.Vector3(0, 0, 1), faceT: 0, stepAcc: 0, stepSide: 1,
  init() { this.ch = makeMirza(); this.ch.setPose('mirza'); },
  enter(world, x, z, yaw = 0) {
    const ch = this.ch;
    world.scene.add(ch.root); if (!world.chars.includes(ch)) world.chars.push(ch);
    ch.place(x, world.groundY, z, yaw); ch.moveT = null; ch.yaw = yaw; this.faceT = yaw; this.speed = 0;
    ch.setPose('mirza'); ch.lookAt(null); ch.hold('phone', false); ch.hold('notebook', false);
    world._lx = x; world._lz = z;
    this.locked = false;
  },
  lock() { this.locked = true; },
  unlock() { this.locked = false; },
  get pos() { return this.ch.root.position; },
  async turnTo(x, z, speed = 5) {
    const ch = this.ch, target = Math.atan2(x - ch.root.position.x, z - ch.root.position.z);
    this.faceT = target;
    await until(() => Math.abs(wrapAngle(ch.yaw - target)) < 0.05 || G.skipping, 1.2);
    ch.yaw = target;
  },
  update(dt) {
    const W = G.world, ch = this.ch;
    if (!W || !ch) return;
    const can = G.mode === 'play' && !this.locked && !G.paused && !ch.moveT;
    let ax = 0, ay = 0;
    if (can) { const a = Input.axis(); ax = a.x; ay = a.y; }
    const mag = Math.min(1, Math.hypot(ax, ay));
    if (mag > 0.06) {
      Cam.forward2D(_f2);
      const dx = _f2.x * ay - _f2.z * ax, dz = _f2.z * ay + _f2.x * ax, l = Math.hypot(dx, dz) || 1;
      this.dir.set(dx / l, 0, dz / l); this.faceT = Math.atan2(dx, dz);
    }
    const maxSpeed = 1.5 * W.speed * (1 - 0.34 * G.focus);
    const target = mag > 0.06 ? maxSpeed * (0.35 + 0.65 * mag) : 0;
    this.speed = damp(this.speed, target, target > this.speed ? 5.5 : 9, dt);
    if (!ch.moveT) ch.yaw = dampAngle(ch.yaw, this.faceT, mag > 0.06 ? 8 : 6, dt);
    if (this.speed > 0.02 && can) {
      const p = ch.root.position;
      p.x += this.dir.x * this.speed * dt; p.z += this.dir.z * this.speed * dt;
      W.resolve(p, 0.27);
    }
    if (!ch.moveT) ch.ext = this.speed;
    // Schritte
    const moving = this.speed > 0.25 || ch.moveT;
    if (moving) {
      this.stepAcc += (ch.moveT ? ch.moveSpeed : this.speed) * dt;
      if (this.stepAcc > 0.74) { this.stepAcc -= 0.74; this.stepSide *= -1; Snd.step(W.surface, { vel: 0.5 + (this.speed / 1.5) * 0.25, pan: this.stepSide * 0.12 }); }
    } else this.stepAcc = 0.4;
  },
};

// ---------- Interaktionen ----------
const Interact = {
  cur: null, busy: false,
  update() {
    const W = G.world;
    if (!W || G.mode !== 'play' || Player.locked || G.paused || this.busy) { Prompt.set(null); this.cur = null; return; }
    const p = Player.ch.root.position;
    let best = null, bd = 1e9;
    for (const it of W.interacts) {
      if (it.disabled || (it.when && !it.when())) continue;
      const d = Math.hypot(p.x - it.at[0], p.z - it.at[1]);
      if (d < it.r && d < bd) { best = it; bd = d; }
    }
    this.cur = best;
    if (best) { Prompt.set(best.posV, best.label + (best.name ? ' · ' + best.name : ''), GFX.camera); if (Input.pressed('use') || (Touch.on && Input.pressed('use'))) this.run(best); }
    else Prompt.set(null);
  },
  async run(it) {
    this.busy = true; Player.lock(); Prompt.set(null);
    try { await it.run(it); } catch (e) { if (e !== ABORT) console.error(e); }
    finally { this.busy = false; Player.unlock(); }
  },
};

// ---------- Fokus (Umschalt halten) ----------
const Focus = {
  allowed: false, prev: false, pulse: 0,
  update(dt) {
    const want = this.allowed && Input.key('focus') && !G.paused && !Notebook.shown;
    G.focusTarget = want ? 1 : 0;
    G.focus = damp(G.focus, G.focusTarget, want ? 6.5 : 4, dt);
    if (G.focus < 0.004) G.focus = 0;
    G.timeScale = lerp(1, 0.55, sstep(0, 1, G.focus)) * G.slow;
    FX.focus = sstep(0, 1, G.focus);
    if (want !== this.prev) {
      this.prev = want;
      Snd.worldFilter(want ? 850 : 20000, want ? 0.35 : 0.7);
      if (want) Snd.heartStart(66, 0.5); else Snd.heartStop();
      Mus.focus(want);
    }
    // Wichtiges leuchtet golden; Nour bleibt in Farbe (Maske im Alpha-Kanal der Figur)
    const W = G.world;
    if (W) {
      this.pulse += dt;
      const gl = 0.55 + 0.45 * Math.sin(this.pulse * 3.2);
      for (const im of W.important) {
        const on = im.when ? im.when() : true;
        for (const m of im.mats) {
          const g = on ? G.focus * (0.7 + 0.5 * gl) * im.gain : 0;
          m.emissive.setRGB(0.9 * g, 0.55 * g, 0.12 * g);
          m.userData.mask.value = on && G.focus > 0.05 ? 1 : 0;
        }
      }
    }
  },
};
