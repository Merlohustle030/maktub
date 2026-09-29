// =====================================================================
// Post-Processing: HDR-Szene -> Bloom-Kette -> Composite (DOF, Godrays, Flare, Grading, Fokus) -> Final (FXAA, Korn, Letterbox)
// =====================================================================
const GLSL_COMMON = `
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;
const POST_VS = `
varying vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DOWN_FS = GLSL_COMMON + `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uKaris;
varying vec2 vUv;
vec4 S(vec2 o){ return texture2D(tSrc, vUv + o * uTexel); }
void main(){
  vec4 A=S(vec2(-1.,-1.)), B=S(vec2(0.,-1.)), C=S(vec2(1.,-1.)), D=S(vec2(-.5,-.5)), E=S(vec2(.5,-.5));
  vec4 F=S(vec2(-1.,0.)), G=S(vec2(0.,0.)), H=S(vec2(1.,0.)), I=S(vec2(-.5,.5)), J=S(vec2(.5,.5));
  vec4 K=S(vec2(-1.,1.)), L=S(vec2(0.,1.)), M=S(vec2(1.,1.));
  vec4 o;
  if (uKaris > 0.5) {
    vec4 g0=(D+E+I+J)*0.25, g1=(A+B+G+F)*0.25, g2=(B+C+H+G)*0.25, g3=(F+G+L+K)*0.25, g4=(G+H+M+L)*0.25;
    float w0=1./(1.+lum(g0.rgb)), w1=1./(1.+lum(g1.rgb)), w2=1./(1.+lum(g2.rgb)), w3=1./(1.+lum(g3.rgb)), w4=1./(1.+lum(g4.rgb));
    float ws = w0*0.5 + (w1+w2+w3+w4)*0.125;
    vec3 rgb = (g0.rgb*w0*0.5 + (g1.rgb*w1 + g2.rgb*w2 + g3.rgb*w3 + g4.rgb*w4)*0.125) / ws;
    float a = g0.a*0.5 + (g1.a+g2.a+g3.a+g4.a)*0.125;
    o = vec4(rgb, a);
  } else {
    o = (D+E+I+J)*0.125 + (A+B+G+F)*0.03125 + (B+C+H+G)*0.03125 + (F+G+L+K)*0.03125 + (G+H+M+L)*0.03125;
  }
  gl_FragColor = o;
}`;

const UP_FS = `
uniform sampler2D tSrc; uniform sampler2D tBase; uniform vec2 uTexel; uniform float uScatter;
varying vec2 vUv;
void main(){
  vec4 a=texture2D(tSrc, vUv+uTexel*vec2(-1.,1.)), b=texture2D(tSrc, vUv+uTexel*vec2(0.,1.)), c=texture2D(tSrc, vUv+uTexel*vec2(1.,1.));
  vec4 d=texture2D(tSrc, vUv+uTexel*vec2(-1.,0.)), e=texture2D(tSrc, vUv), f=texture2D(tSrc, vUv+uTexel*vec2(1.,0.));
  vec4 g=texture2D(tSrc, vUv+uTexel*vec2(-1.,-1.)), h=texture2D(tSrc, vUv+uTexel*vec2(0.,-1.)), i=texture2D(tSrc, vUv+uTexel*vec2(1.,-1.));
  vec4 up = (a + c + g + i + 2.0*(b + d + f + h) + 4.0*e) / 16.0;
  gl_FragColor = mix(texture2D(tBase, vUv), up, uScatter);
}`;

const COMP_FS = GLSL_COMMON + `
uniform sampler2D tScene; uniform sampler2D tDepth; uniform sampler2D tBloom; uniform sampler2D tBlurA; uniform sampler2D tBlurB;
uniform vec2 uRes; uniform float uTime, uNear, uFar, uAspect;
uniform float uExposure, uContrast, uSat, uBloom, uBloomThresh;
uniform vec3 uBloomTint, uLift, uGain, uShadowTint, uHighTint;
uniform float uVig, uCA, uWater, uFocus, uWarm, uFlash;
uniform float uDof, uFocusDist, uFocusRange;
uniform vec2 uSun; uniform vec3 uSunCol; uniform float uRays, uFlare, uSunEdge;
varying vec2 vUv;

float linZ(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
vec3 aces(vec3 x){ const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }

float sunVisibility(){
  float v = 0.0;
  vec2 o0 = vec2(0.0), o1 = vec2(1.0, 0.0), o2 = vec2(-1.0, 0.0), o3 = vec2(0.0, 1.0), o4 = vec2(0.0, -1.0);
  v += step(0.99995, texture2D(tDepth, clamp(uSun + o0 * 0.006, 0.001, 0.999)).x);
  v += step(0.99995, texture2D(tDepth, clamp(uSun + o1 * 0.006, 0.001, 0.999)).x);
  v += step(0.99995, texture2D(tDepth, clamp(uSun + o2 * 0.006, 0.001, 0.999)).x);
  v += step(0.99995, texture2D(tDepth, clamp(uSun + o3 * 0.006, 0.001, 0.999)).x);
  v += step(0.99995, texture2D(tDepth, clamp(uSun + o4 * 0.006, 0.001, 0.999)).x);
  return v / 5.0 * uSunEdge;
}

vec3 godrays(vec2 uv, float vis, float selfSky){
  vec2 dv = uSun - uv;
  float dist = length(dv * vec2(uAspect, 1.0));
  vec2 stepv = dv / 16.0 * 0.92;
  vec2 p = uv + stepv * h12(uv * uRes + fract(uTime) * 91.0);
  float acc = 0.0, w = 1.0, ws = 0.0;
  for (int i = 0; i < 16; i++) {
    p += stepv;
    float sky = step(0.99995, texture2D(tDepth, p).x);
    acc += sky * w; ws += w; w *= 0.90;
  }
  acc /= ws;
  float fall = pow(clamp(1.0 - dist * 0.7, 0.0, 1.0), 1.6);
  return uSunCol * acc * fall * uRays * vis * (1.0 - selfSky);
}

vec3 lensflare(vec2 uv, float vis){
  vec2 ax = vec2(uAspect, 1.0);
  vec2 sp = uSun;
  vec3 f = vec3(0.0);
  float sx = abs(uv.x - sp.x) * uAspect, sy = abs(uv.y - sp.y);
  f += vec3(0.22, 0.45, 1.0) * exp(-sy * 140.0) * exp(-sx * 1.05) * 0.5;
  f += vec3(1.0, 0.78, 0.5) * exp(-sy * 300.0) * exp(-sx * 0.6) * 0.32;
  vec2 axis = vec2(0.5) - sp;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 gp = sp + axis * (0.45 + fi * 0.55);
    float gd = length((uv - gp) * ax);
    float rad = 0.03 + fi * 0.02;
    float disc = smoothstep(rad, rad * 0.55, gd);
    float ring = smoothstep(rad, rad * 0.92, gd) * (1.0 - smoothstep(rad * 0.62, rad * 0.9, gd));
    vec3 tint = (i == 0) ? vec3(1.0, 0.62, 0.30) : (i == 1) ? vec3(0.35, 0.75, 1.0) : (i == 2) ? vec3(0.95, 0.5, 1.0) : vec3(0.5, 1.0, 0.7);
    f += tint * (disc * 0.035 + ring * 0.09);
  }
  float r = length((uv - sp) * ax);
  f += vec3(1.0, 0.82, 0.55) * smoothstep(0.2, 0.17, r) * smoothstep(0.12, 0.17, r) * 0.05;
  float cen = 1.0 - clamp(length((sp - 0.5) * ax) * 0.9, 0.0, 0.8);
  return f * uSunCol * uFlare * vis * cen;
}

void main(){
  vec2 uv = vUv;
  if (uWater > 0.0) uv += vec2(sin(uv.y * 24.0 + uTime * 2.1), cos(uv.x * 19.0 + uTime * 1.7)) * 0.0038 * uWater;
  vec2 dir = uv - 0.5;
  vec4 s0 = texture2D(tScene, uv);
  vec3 col = s0.rgb;
  if (uCA > 0.0001) {
    float ca = uCA * (0.25 + dot(dir, dir) * 3.2);
    col = vec3(texture2D(tScene, uv - dir * ca).r, s0.g, texture2D(tScene, uv + dir * ca).b);
  }
  float mask = s0.a;
  float dRaw = texture2D(tDepth, uv).x;

  if (uDof > 0.001) {
    float z = linZ(dRaw);
    float coc = clamp(abs(z - uFocusDist) / max(uFocusRange, 0.01), 0.0, 1.0) * uDof;
    vec3 b1 = texture2D(tBlurA, uv).rgb, b2 = texture2D(tBlurB, uv).rgb;
    vec3 bl = mix(b1, b2, smoothstep(0.45, 1.0, coc));
    col = mix(col, bl, smoothstep(0.02, 0.65, coc));
  }

  float vis = 0.0;
  if (uRays > 0.001 || uFlare > 0.001) vis = sunVisibility();
  if (uRays > 0.001) col += godrays(uv, max(vis, 0.25 * uSunEdge), step(0.99995, dRaw));

  vec3 bloom = max(texture2D(tBloom, uv).rgb - uBloomThresh, 0.0);
  col += bloom * uBloomTint * uBloom;
  if (uFlare > 0.001) col += lensflare(uv, vis);
  col += vec3(1.0, 0.9, 0.72) * uFlash;

  col *= mix(vec3(1.0), vec3(1.10, 1.03, 0.86), uWarm);
  vec2 q = vUv - 0.5; q.x *= mix(1.0, uAspect, 0.4);
  col *= 1.0 - uVig * smoothstep(0.22, 0.92, length(q) * 1.25);
  col *= uExposure;
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));

  float l = lum(col);
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uContrast + 0.5;
  col = col * uGain + uLift;
  col += uShadowTint * (1.0 - smoothstep(0.0, 0.55, l)) + uHighTint * smoothstep(0.35, 1.0, l);

  if (uFocus > 0.001) {
    float m = clamp(mask + texture2D(tBlurA, uv).a * 0.5, 0.0, 1.0);
    float l2 = lum(col);
    vec3 ds = mix(vec3(l2), col, 0.10);
    ds = (ds - 0.5) * 1.14 + 0.5;
    ds *= vec3(0.92, 0.98, 1.06);
    col = mix(col, ds, uFocus * (1.0 - m));
    col = mix(col, col * vec3(1.07, 1.02, 0.93) + vec3(0.02, 0.012, 0.0), uFocus * m * 0.6);
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const FINAL_FS = GLSL_COMMON + `
uniform sampler2D tLdr; uniform vec2 uRes; uniform float uTime, uGrain, uAspect, uBars, uFade, uFxaa;
uniform vec3 uFadeCol;
varying vec2 vUv;
vec3 fxaa(vec2 uv){
  vec2 px = 1.0 / uRes;
  vec3 rgbNW = texture2D(tLdr, uv + vec2(-1., -1.) * px).xyz;
  vec3 rgbNE = texture2D(tLdr, uv + vec2( 1., -1.) * px).xyz;
  vec3 rgbSW = texture2D(tLdr, uv + vec2(-1.,  1.) * px).xyz;
  vec3 rgbSE = texture2D(tLdr, uv + vec2( 1.,  1.) * px).xyz;
  vec3 rgbM  = texture2D(tLdr, uv).xyz;
  vec3 lm = vec3(0.299, 0.587, 0.114);
  float lNW = dot(rgbNW, lm), lNE = dot(rgbNE, lm), lSW = dot(rgbSW, lm), lSE = dot(rgbSE, lm), lM = dot(rgbM, lm);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 d;
  d.x = -((lNW + lNE) - (lSW + lSE));
  d.y =  ((lNW + lSW) - (lNE + lSE));
  float dirReduce = max((lNW + lNE + lSW + lSE) * (0.25 * (1.0 / 8.0)), 1.0 / 128.0);
  float rcpDirMin = 1.0 / (min(abs(d.x), abs(d.y)) + dirReduce);
  d = min(vec2(8.0), max(vec2(-8.0), d * rcpDirMin)) * px;
  vec3 rgbA = 0.5 * (texture2D(tLdr, uv + d * (1.0 / 3.0 - 0.5)).xyz + texture2D(tLdr, uv + d * (2.0 / 3.0 - 0.5)).xyz);
  vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tLdr, uv + d * -0.5).xyz + texture2D(tLdr, uv + d * 0.5).xyz);
  float lB = dot(rgbB, lm);
  return (lB < lMin || lB > lMax) ? rgbA : rgbB;
}
void main(){
  vec3 col = uFxaa > 0.5 ? fxaa(vUv) : texture2D(tLdr, vUv).rgb;
  float t = fract(uTime * 0.37) * 100.0;
  float g = h12(vUv * uRes + t) + h12(vUv * uRes * 0.71 + t * 1.7) - 1.0;
  float l = lum(col);
  col += vec3(g * 0.9, g, g * 1.1) * uGrain * (0.35 + 0.9 * (1.0 - l) * (0.4 + l * 1.4));
  col += (h12(vUv * uRes + 17.0) - 0.5) / 255.0;
  float visH = mix(1.0, min(1.0, uAspect / 2.39), uBars);
  float m = (1.0 - visH) * 0.5;
  float px = 1.0 / uRes.y;
  float bar = smoothstep(m + px, m - px, vUv.y) + smoothstep(1.0 - m - px, 1.0 - m + px, vUv.y);
  col *= 1.0 - clamp(bar, 0.0, 1.0);
  col = mix(col, uFadeCol, uFade);
  gl_FragColor = vec4(col, 1.0);
}`;

const QUALITY = {
  high: { maxPR: 1.5, scale: 1.0, shadow: 2048, levels: 6, fxaa: true, dof: true, rays: true, flare: true, ca: true },
  mid: { maxPR: 1.0, scale: 1.0, shadow: 1024, levels: 5, fxaa: true, dof: false, rays: true, flare: true, ca: true },
  low: { maxPR: 1.0, scale: 0.7, shadow: 0, levels: 4, fxaa: false, dof: false, rays: false, flare: false, ca: false },
};

class Post {
  constructor(renderer) {
    this.r = renderer;
    const gl2 = renderer.capabilities.isWebGL2;
    this.hdr = gl2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new THREE.Mesh(geo, null);
    this.quad.frustumCulled = false;
    this.pscene = new THREE.Scene();
    this.pscene.add(this.quad);
    this.pcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const sm = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: POST_VS, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    const V2 = () => ({ value: new THREE.Vector2() }), V3 = () => ({ value: new THREE.Vector3() });
    this.mDown = sm(DOWN_FS, { tSrc: { value: null }, uTexel: V2(), uKaris: { value: 0 } });
    this.mUp = sm(UP_FS, { tSrc: { value: null }, tBase: { value: null }, uTexel: V2(), uScatter: { value: 0.7 } });
    this.mComp = sm(COMP_FS, {
      tScene: { value: null }, tDepth: { value: null }, tBloom: { value: null }, tBlurA: { value: null }, tBlurB: { value: null },
      uRes: V2(), uTime: { value: 0 }, uNear: { value: 0.1 }, uFar: { value: 500 }, uAspect: { value: 1.78 },
      uExposure: { value: 1 }, uContrast: { value: 1 }, uSat: { value: 1 }, uBloom: { value: 0.1 }, uBloomThresh: { value: 0.06 },
      uBloomTint: V3(), uLift: V3(), uGain: V3(), uShadowTint: V3(), uHighTint: V3(),
      uVig: { value: 0.3 }, uCA: { value: 0.001 }, uWater: { value: 0 }, uFocus: { value: 0 }, uWarm: { value: 0 }, uFlash: { value: 0 },
      uDof: { value: 0 }, uFocusDist: { value: 5 }, uFocusRange: { value: 3 },
      uSun: V2(), uSunCol: V3(), uRays: { value: 0 }, uFlare: { value: 0 }, uSunEdge: { value: 0 },
    });
    this.mFinal = sm(FINAL_FS, {
      tLdr: { value: null }, uRes: V2(), uTime: { value: 0 }, uGrain: { value: 0.05 }, uAspect: { value: 1.78 },
      uBars: { value: 0 }, uFade: { value: 1 }, uFxaa: { value: 1 }, uFadeCol: V3(),
    });
    this.rts = null;
    this.q = QUALITY.high;
    this.levels = 6;
    this.w = 2; this.h = 2;
    this.sunUv = new THREE.Vector2(0.5, 0.5);
    this._v = new THREE.Vector3();
    this._sd = new THREE.Vector3();
  }
  setQuality(q) { this.q = q; this.levels = q.levels; if (this.w > 2) this.resize(this.w, this.h); }
  dispose() {
    if (!this.rts) return;
    const { scene, ldr, down, up } = this.rts;
    scene.dispose(); if (scene.depthTexture) scene.depthTexture.dispose(); ldr.dispose();
    down.forEach((t) => t.dispose()); up.forEach((t) => t && t.dispose());
    this.rts = null;
  }
  resize(w, h) {
    this.dispose();
    this.w = w; this.h = h;
    const type = this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const opt = { type, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false };
    const scene = new THREE.WebGLRenderTarget(w, h, Object.assign({}, opt, { depthBuffer: true }));
    scene.depthTexture = new THREE.DepthTexture(w, h);
    scene.depthTexture.type = THREE.UnsignedIntType;
    scene.depthTexture.minFilter = THREE.NearestFilter; scene.depthTexture.magFilter = THREE.NearestFilter;
    const ldr = new THREE.WebGLRenderTarget(w, h, Object.assign({}, opt, { type: THREE.UnsignedByteType }));
    const down = [], up = [];
    let cw = w, ch = h;
    for (let i = 0; i < this.levels; i++) {
      cw = Math.max(2, cw >> 1); ch = Math.max(2, ch >> 1);
      down.push(new THREE.WebGLRenderTarget(cw, ch, opt));
      up.push(i < this.levels - 1 ? new THREE.WebGLRenderTarget(cw, ch, opt) : null);
    }
    this.rts = { scene, ldr, down, up };
  }
  pass(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.pscene, this.pcam);
  }
  // fx: Atmo.cur + dynamische Effekte (G.fx)
  render(scene, camera, fx, dyn, time) {
    const r = this.r, rts = this.rts;
    // 1) Szene (HDR + Masken-Alpha + Tiefe)
    r.setRenderTarget(rts.scene);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(scene, camera);

    // 2) Bloom-Kette
    const n = this.levels;
    this.mDown.uniforms.tSrc.value = rts.scene.texture;
    this.mDown.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
    this.mDown.uniforms.uKaris.value = 1;
    this.pass(this.mDown, rts.down[0]);
    this.mDown.uniforms.uKaris.value = 0;
    for (let i = 1; i < n; i++) {
      const src = rts.down[i - 1];
      this.mDown.uniforms.tSrc.value = src.texture;
      this.mDown.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      this.pass(this.mDown, rts.down[i]);
    }
    let prev = rts.down[n - 1];
    for (let i = n - 2; i >= 0; i--) {
      this.mUp.uniforms.tSrc.value = prev.texture;
      this.mUp.uniforms.tBase.value = rts.down[i].texture;
      this.mUp.uniforms.uTexel.value.set(1 / prev.width, 1 / prev.height);
      this.mUp.uniforms.uScatter.value = 0.68;
      this.pass(this.mUp, rts.up[i]);
      prev = rts.up[i];
    }

    // 3) Sonne im Bild
    const sd = this._sd.set(fx.sunDir[0], fx.sunDir[1], fx.sunDir[2]).normalize();
    const cf = this._v.set(0, 0, -1).applyQuaternion(camera.quaternion);
    let sunFront = sd.dot(cf);
    const sp = this._v.copy(camera.position).addScaledVector(sd, 100).project(camera);
    this.sunUv.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
    const off = Math.max(Math.abs(this.sunUv.x - 0.5) - 0.5, Math.abs(this.sunUv.y - 0.5) - 0.5);
    const sunEdge = sunFront > 0.02 ? 1 - sstep(0.0, 0.45, off) : 0;

    // 4) Composite
    const u = this.mComp.uniforms;
    u.tScene.value = rts.scene.texture; u.tDepth.value = rts.scene.depthTexture;
    u.tBloom.value = rts.up[0].texture; u.tBlurA.value = rts.down[Math.min(1, n - 1)].texture; u.tBlurB.value = rts.down[Math.min(2, n - 1)].texture;
    u.uRes.value.set(this.w, this.h); u.uTime.value = time; u.uNear.value = camera.near; u.uFar.value = camera.far;
    u.uAspect.value = this.w / this.h;
    u.uExposure.value = fx.exposure; u.uContrast.value = fx.contrast; u.uSat.value = fx.sat;
    u.uBloom.value = fx.bloom; u.uBloomThresh.value = 0.06;
    u.uBloomTint.value.fromArray(fx.bloomTint); u.uLift.value.fromArray(fx.lift); u.uGain.value.fromArray(fx.gain);
    u.uShadowTint.value.fromArray(fx.shadowTint); u.uHighTint.value.fromArray(fx.highTint);
    u.uVig.value = fx.vig + dyn.vig; u.uCA.value = this.q.ca ? fx.ca + dyn.ca : 0;
    u.uWater.value = dyn.water; u.uFocus.value = dyn.focus; u.uWarm.value = dyn.warm; u.uFlash.value = dyn.flash;
    u.uDof.value = this.q.dof ? Math.max(fx.dof, dyn.dof) : 0; u.uFocusDist.value = dyn.dofFocus != null ? dyn.dofFocus : fx.dofFocus;
    u.uFocusRange.value = fx.dofRange;
    u.uSun.value.copy(this.sunUv); u.uSunCol.value.fromArray(fx.sunCol);
    u.uRays.value = this.q.rays ? fx.rays : 0; u.uFlare.value = this.q.flare ? fx.flare : 0; u.uSunEdge.value = sunEdge;
    this.pass(this.mComp, rts.ldr);

    // 5) Final auf den Bildschirm
    const f = this.mFinal.uniforms;
    f.tLdr.value = rts.ldr.texture; f.uRes.value.set(this.w, this.h); f.uTime.value = time;
    f.uGrain.value = G.settings.grain ? fx.grain : 0; f.uAspect.value = this.w / this.h;
    f.uBars.value = dyn.bars; f.uFade.value = dyn.fade; f.uFadeCol.value.fromArray(dyn.fadeCol); f.uFxaa.value = this.q.fxaa ? 1 : 0;
    this.pass(this.mFinal, null);
  }
}

// Dynamische Effekte, die Systeme (Fokus, Cutscene, Titel) setzen
const FX = { focus: 0, water: 0, bars: 0, fade: 1, fadeCol: [0, 0, 0], warm: 0, flash: 0, vig: 0, ca: 0, dof: 0, dofFocus: null };

const GFX = {
  renderer: null, canvas: null, post: null, camera: null, quality: 'high', dyn: 1, w: 0, h: 0, q: QUALITY.high,
  ft: 16.7, slow: 0, fast: 0, lastT: 0,
  init(canvas) {
    this.canvas = canvas;
    let r;
    try {
      r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: G.test });
    } catch (e) { return false; }
    if (!r.capabilities.isWebGL2) return false;
    this.renderer = r;
    r.autoClear = true;
    r.setClearColor(0x000000, 1);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputEncoding = THREE.LinearEncoding;
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.08, 600);
    this.post = new Post(r);
    this.setQuality(G.settings.quality);
    window.addEventListener('resize', () => this.resize());
    return true;
  },
  setQuality(name) {
    G.settings.quality = name;
    this.quality = name === 'auto' ? 'high' : name;
    this.q = QUALITY[this.quality] || QUALITY.high;
    this.dyn = 1;
    this.post.setQuality(this.q);
    if (Atmo.scene) Atmo.applyShadowQuality(this.q.shadow);
    this.resize();
  },
  pixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    return Math.max(0.5, Math.min(dpr, this.q.maxPR) * this.q.scale * this.dyn);
  },
  resize() {
    const cw = window.innerWidth, ch = window.innerHeight;
    const pr = this.pixelRatio();
    const w = Math.max(64, Math.floor(cw * pr)), h = Math.max(64, Math.floor(ch * pr));
    this.w = w; this.h = h;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.post.resize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    document.documentElement.style.setProperty('--vh', ch + 'px');
  },
  // Höhe eines Letterbox-Balkens in CSS-Pixeln (für Untertitel-Position)
  barPx() {
    const aspect = window.innerWidth / window.innerHeight;
    const visH = lerp(1, Math.min(1, aspect / 2.39), FX.bars);
    return ((1 - visH) / 2) * window.innerHeight;
  },
  // Adaptive Auflösung: hält 60 fps, ohne dass man Einstellungen suchen muss.
  adapt(dtMs) {
    if (G.settings.quality !== 'auto' || G.test) return;
    this.ft = lerp(this.ft, dtMs, 0.05);
    if (this.ft > 21) { this.slow++; this.fast = 0; } else if (this.ft < 13.5) { this.fast++; this.slow = 0; } else { this.slow = 0; this.fast = Math.max(0, this.fast - 1); }
    if (this.slow > 90 && this.dyn > 0.58) { this.dyn = Math.max(0.58, this.dyn - 0.09); this.slow = 0; this.resize(); if (this.dyn < 0.8 && this.quality === 'high') { this.quality = 'mid'; this.q = QUALITY.mid; this.post.setQuality(this.q); Atmo.applyShadowQuality(this.q.shadow); this.resize(); } }
    else if (this.fast > 420 && this.dyn < 1) { this.dyn = Math.min(1, this.dyn + 0.06); this.fast = 0; this.resize(); }
  },
  render(scene, camera) {
    this.post.render(scene, camera, Atmo.cur, FX, G.rt);
  },
};
