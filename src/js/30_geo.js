// =====================================================================
// Mesh-Builder: alles Low-Poly wird prozedural aus Primitiven gebaut.
// Flache Normalen, Vertex-Farben (Farbe: Zahl/String = sRGB-Hex, Array = bereits linear/HDR),
// leichte Farb-Varianz pro Fläche und Fake-Ambient-Occlusion nahe dem Boden.
// =====================================================================
const _m4 = new THREE.Matrix4(), _m4b = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler();
const _pv = new THREE.Vector3(), _sv = new THREE.Vector3();
const _A = new THREE.Vector3(), _B = new THREE.Vector3(), _C = new THREE.Vector3(), _N = new THREE.Vector3();
const toLin = (c) => (Array.isArray(c) ? c : lin(c));

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
  cyl: {}, ico: {}, cone: {},
  cylinder(rt, rb, seg) { const k = rt.toFixed(3) + '/' + rb.toFixed(3) + '/' + seg; return this.cyl[k] || (this.cyl[k] = new THREE.CylinderGeometry(rt, rb, 1, seg, 1, false)); },
  icosa(d) { return this.ico[d] || (this.ico[d] = new THREE.IcosahedronGeometry(1, d)); },
};

GEO.box.userData.shared = true; GEO.plane.userData.shared = true;

class MB {
  constructor(seed = 1) {
    this.p = []; this.n = []; this.c = [];
    this.aoH = 0; this.aoK = 0; this.aoY = 0;
    this.jit = 0.035;
    this.seed = seed;
  }
  ao(h, k, y0 = 0) { this.aoH = h; this.aoK = k; this.aoY = y0; return this; }
  get tris() { return this.p.length / 9; }

  // Kern: Geometrie (beliebig) mit Matrix in den Builder schreiben
  _add(geo, m, col, o = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox;
    const y0 = bb.min.y, yr = Math.max(1e-6, bb.max.y - bb.min.y);
    const base = toLin(col);
    const gr = o.grad || null;
    const jit = o.jit != null ? o.jit : this.jit;
    const pos = g.attributes.position.array;
    for (let i = 0; i < pos.length; i += 9) {
      _A.set(pos[i], pos[i + 1], pos[i + 2]); _B.set(pos[i + 3], pos[i + 4], pos[i + 5]); _C.set(pos[i + 6], pos[i + 7], pos[i + 8]);
      const ty = [(_A.y - y0) / yr, (_B.y - y0) / yr, (_C.y - y0) / yr];
      _A.applyMatrix4(m); _B.applyMatrix4(m); _C.applyMatrix4(m);
      _N.crossVectors(_pv.subVectors(_B, _A), _sv.subVectors(_C, _A));
      const len = _N.length();
      if (len < 1e-9) continue;
      _N.divideScalar(len);
      const j = 1 + (hash3((_A.x + _B.x + _C.x) * 3.1 + this.seed, (_A.y + _B.y + _C.y) * 2.7, (_A.z + _B.z + _C.z) * 3.9) - 0.5) * 2 * jit;
      const V = [_A, _B, _C];
      for (let k = 0; k < 3; k++) {
        const v = V[k];
        this.p.push(v.x, v.y, v.z);
        this.n.push(_N.x, _N.y, _N.z);
        let mul = j;
        if (gr) mul *= lerp(gr[0], gr[1], ty[k]);
        if (this.aoK > 0) mul *= 1 - this.aoK * (1 - sstep(this.aoY, this.aoY + this.aoH, v.y));
        this.c.push(base[0] * mul, base[1] * mul, base[2] * mul);
      }
    }
    return this;
  }
  _mat(pos, scale, o) {
    _eu.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_eu);
    if (o.s) scale = [scale[0] * o.s, scale[1] * o.s, scale[2] * o.s];
    _sv.set(scale[0], scale[1], scale[2]);
    if (o.org) {
      _m4.compose(_pv.set(pos[0], pos[1], pos[2]), new THREE.Quaternion(), _sv);
      _m4b.compose(_pv.set(o.org[0], o.org[1], o.org[2]), _q, new THREE.Vector3(1, 1, 1));
      _m4.premultiply(_m4b);
    } else {
      _m4.compose(_pv.set(pos[0], pos[1], pos[2]), _q, _sv);
    }
    return _m4;
  }
  // Quader: (x,y,z) = Mitte der Unterseite
  box(w, h, d, x = 0, y = 0, z = 0, col = 0x808080, o = {}) {
    return this._add(GEO.box, this._mat([x, y + h / 2, z], [w, h, d], o), col, o);
  }
  // Zylinder/Kegelstumpf: (x,y,z) = Mitte der Unterseite
  cyl(rt, rb, h, seg, x = 0, y = 0, z = 0, col = 0x808080, o = {}) {
    return this._add(GEO.cylinder(rt, rb, seg), this._mat([x, y + h / 2, z], [o.sx || 1, h, o.sz || 1], o), col, o);
  }
  cone(r, h, seg, x = 0, y = 0, z = 0, col = 0x808080, o = {}) { return this.cyl(0.0001, r, h, seg, x, y, z, col, o); }
  // Kugel (Icosaeder): (x,y,z) = Mittelpunkt, optional o.sx/sy/sz
  sph(r, x = 0, y = 0, z = 0, col = 0x808080, o = {}) {
    const d = o.d != null ? o.d : 1;
    return this._add(GEO.icosa(d), this._mat([x, y, z], [r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1)], o), col, o);
  }
  // Kuppel (obere Kugelhälfte, o.t1 = Öffnungswinkel in Bruchteilen von π): für Haare, Dächer, Schirme
  dome(r, x = 0, y = 0, z = 0, col = 0x808080, o = {}) {
    const key = 'dome' + (o.t1 || 0.5) + '/' + (o.seg || 8);
    const g = GEO[key] || (GEO[key] = new THREE.SphereGeometry(1, o.seg || 8, 4, 0, TAU, 0, Math.PI * (o.t1 || 0.5)));
    g.userData.shared = true;
    return this._add(g, this._mat([x, y, z], [r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1)], o), col, o);
  }
  // Fläche zeigt nach +Z (mit o.ry drehen); (x,y,z) = Mitte
  plane(w, h, x = 0, y = 0, z = 0, col = 0x808080, o = {}) {
    return this._add(GEO.plane, this._mat([x, y, z], [w, h, 1], o), col, o);
  }
  // Boden-Fläche (zeigt nach oben), in n×m Zellen unterteilt (für weiches Punktlicht per Pixel egal, für Farbvariation nützlich)
  floor(w, d, x = 0, y = 0, z = 0, col = 0x808080, o = {}) {
    const nx = o.nx || 1, nz = o.nz || 1;
    const cw = w / nx, cd = d / nz;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      let c = col;
      if (o.checker) c = (i + k) % 2 ? col : o.checker;
      this._add(GEO.plane, this._mat([x - w / 2 + cw * (i + 0.5), y, z - d / 2 + cd * (k + 0.5)], [cw, cd, 1], { rx: -Math.PI / 2 }), c, o);
    }
    return this;
  }
  // Prisma-Dach (Giebel): Breite w (x), Tiefe d (z), Höhe h; Firstlinie entlang z
  gable(w, d, h, x, y, z, col, o = {}) {
    const hw = w / 2, hd = d / 2;
    const P = [[-hw, 0, -hd], [hw, 0, -hd], [0, h, -hd], [-hw, 0, hd], [hw, 0, hd], [0, h, hd]];
    const idx = [[0, 2, 1], [3, 4, 5], [0, 3, 5, 2], [1, 2, 5, 4], [0, 1, 4, 3]];
    return this._poly(P, idx, [x, y, z], col, o);
  }
  // Keil (Rampe/Dach-Schräge): Grundfläche w×d, hinten Höhe h, vorne 0
  wedge(w, h, d, x, y, z, col, o = {}) {
    const hw = w / 2, hd = d / 2;
    const P = [[-hw, 0, -hd], [hw, 0, -hd], [hw, h, -hd], [-hw, h, -hd], [-hw, 0, hd], [hw, 0, hd]];
    const idx = [[0, 3, 2, 1], [0, 4, 5, 1].reverse(), [3, 0, 4], [2, 1, 5].reverse(), [3, 2, 5, 4].reverse()];
    return this._poly(P, idx, [x, y, z], col, o);
  }
  // Freie Polyeder: P = Punkte, faces = Index-Listen (Dreiecke/Vierecke, gegen den Uhrzeigersinn von außen gesehen)
  _poly(P, faces, pos, col, o = {}) {
    const m = this._mat(pos, [1, 1, 1], o).clone();
    const g = new THREE.BufferGeometry();
    const arr = [];
    for (const f of faces) {
      for (let i = 1; i < f.length - 1; i++) {
        for (const k of [0, i, i + 1]) arr.push(P[f[k]][0], P[f[k]][1], P[f[k]][2]);
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return this._add(g, m, col, o);
  }
  // Vieleck-Grundriss [[x,z],...] entlang Y ausgedehnt. (x,y,z) = Unterseite
  ext(pts, h, x = 0, y = 0, z = 0, col = 0x808080, o = {}) {
    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], -p[1])));
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, steps: 1 });
    g.rotateX(-Math.PI / 2);
    return this._add(g, this._mat([x, y, z], [1, 1, 1], o), col, o);
  }
  lathe(profile, seg, x = 0, y = 0, z = 0, col = 0x808080, o = {}) {
    const g = new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg);
    return this._add(g, this._mat([x, y, z], [1, 1, 1], o), col, o);
  }
  tube(pts, r, seg, rad, col = 0x808080, o = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    return this._add(new THREE.TubeGeometry(curve, seg, r, rad || 5, false), _m4b.identity(), col, o);
  }
  // Explizites Dreieck / Viereck in Weltkoordinaten (Farbe je Ecke optional über o.cols)
  tri(a, b, c, col, o = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
    return this._add(g, _m4b.identity(), col, o);
  }
  quad(a, b, c, d, col, o = {}) { this.tri(a, b, c, col, o); return this.tri(a, c, d, col, o); }
  // Anderen Builder mit Transform einfügen
  merge(mb, x = 0, y = 0, z = 0, ry = 0, s = 1) {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (let i = 0; i < mb.p.length; i += 3) {
      const px = mb.p[i] * s, py = mb.p[i + 1] * s, pz = mb.p[i + 2] * s;
      this.p.push(px * cs + pz * sn + x, py + y, -px * sn + pz * cs + z);
      const nx = mb.n[i], nz = mb.n[i + 2];
      this.n.push(nx * cs + nz * sn, mb.n[i + 1], -nx * sn + nz * cs);
      this.c.push(mb.c[i], mb.c[i + 1], mb.c[i + 2]);
    }
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  mesh(mat, o = {}) {
    const m = new THREE.Mesh(this.build(), mat);
    m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
    if (o.static) { m.matrixAutoUpdate = false; m.updateMatrix(); }
    if (o.name) m.name = o.name;
    return m;
  }
}

// Instanziertes Mesh aus einer Geometrie + Liste {x,y,z,ry,s,sx,sy,sz,col}
function instanced(geo, mat, items, o = {}) {
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const c = new THREE.Color();
  items.forEach((it, i) => {
    e.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ'); q.setFromEuler(e);
    s.set(it.sx || it.s || 1, it.sy || it.s || 1, it.sz || it.s || 1);
    m.compose(p.set(it.x || 0, it.y || 0, it.z || 0), q, s);
    im.setMatrixAt(i, m);
    if (it.col) { const l = toLin(it.col); c.setRGB(l[0], l[1], l[2]); im.setColorAt(i, c); }
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = o.cast !== false; im.receiveShadow = o.receive !== false;
  im.frustumCulled = o.cull !== false;
  return im;
}

// Alles, was zu einer Welt gehört, wird hier registriert und später sauber entsorgt.
function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      for (const k in m) { const v = m[k]; if (v && v.isTexture && !(v.userData && v.userData.shared)) v.dispose(); }
      if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k].value; if (v && v.isTexture && !(v.userData && v.userData.shared)) v.dispose(); }
      m.dispose();
    }
  });
}
