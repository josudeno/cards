// Procedural world building: terrain, vegetation, architecture of the first-century Mediterranean, ships.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { windify, matteU } from './engine.js';

// ---------------------------------------------------------------- random + noise
export function Rand(seed = 1) {
  let s = seed >>> 0;
  const f = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (a, b) => a + (b - a) * f();
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.int = (a, b) => Math.floor(f.range(a, b + 1));
  return f;
}
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm(x, y, oct = 4) { let a = 0.5, s = 0; for (let i = 0; i < oct; i++) { s += a * noise2(x, y); x = x * 2.03 + 11.7; y = y * 2.03 + 5.3; a *= 0.5; } return s; }
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
// distance from point to polyline; returns [dist, t along path 0..1, nearest x, nearest z]
export function pathDist(pts, x, z) {
  let best = 1e9, bt = 0, bx = 0, bz = 0, acc = 0, total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], dx = pts[i + 1][0] - ax, dz = pts[i + 1][1] - az, L = Math.hypot(dx, dz);
    let t = ((x - ax) * dx + (z - az) * dz) / (L * L); t = Math.min(1, Math.max(0, t));
    const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bt = (acc + L * t) / total; bx = px; bz = pz; }
    acc += L;
  }
  return [best, bt, bx, bz];
}
export function pathPoint(pts, t) {
  let total = 0; const Ls = [];
  for (let i = 0; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); Ls.push(L); total += L; }
  let d = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < Ls.length; i++) { if (d <= Ls[i] || i === Ls.length - 1) { const k = Ls[i] ? d / Ls[i] : 0; const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1]; return [pts[i][0] + dx * k, pts[i][1] + dz * k, Math.atan2(dx, dz), total]; } d -= Ls[i]; }
}

// ---------------------------------------------------------------- shared materials
function grainTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const img = g.createImageData(256, 256); const r = Rand(7);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const n = 0.55 * fbmWrap(x, y, 32) + 0.25 * fbmWrap(x + 91, y + 17, 8) + 0.2 * r();
    const v = Math.max(0, Math.min(255, 255 * n)); const i = (y * 256 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.userData.shared = true; return t;
}
function fbmWrap(x, y, cell) { // tileable value noise on a 256 canvas
  const n = 256 / cell, fx = x / cell, fy = y / cell, xi = Math.floor(fx), yi = Math.floor(fy);
  let tx = fx - xi, ty = fy - yi; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
  const H = (a, b) => h2(((a % n) + n) % n + cell, ((b % n) + n) % n);
  return lerp(lerp(H(xi, yi), H(xi + 1, yi), tx), lerp(H(xi, yi + 1), H(xi + 1, yi + 1), tx), ty);
}
let _matte = null, _matte2 = null, _skin = null;
function makeMatte(side) {
  if (!matteU.uGrain.value) matteU.uGrain.value = grainTexture();
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0, side });
  m.userData.shared = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGrain = matteU.uGrain; sh.uniforms.uWet = matteU.uWet;
    sh.vertexShader = 'varying vec3 vWPos; varying vec3 vWNrm;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = 'uniform sampler2D uGrain; uniform float uWet; varying vec3 vWPos; varying vec3 vWNrm;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 bw = abs(vWNrm); bw /= (bw.x + bw.y + bw.z);
        float gr = texture2D(uGrain, vWPos.zy * 0.31).r * bw.x + texture2D(uGrain, vWPos.xz * 0.31).r * bw.y + texture2D(uGrain, vWPos.xy * 0.31).r * bw.z;
        float gb = texture2D(uGrain, vWPos.xz * 0.023 + vWPos.y * 0.02).r;
        diffuseColor.rgb *= (0.66 + 0.5 * gr) * (0.8 + 0.4 * gb) * (1.0 - 0.3 * uWet);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.22 + 0.3 * gr, uWet * smoothstep(0.5, 0.95, vWNrm.y));`);
  };
  m.customProgramCacheKey = () => 'matte' + side;
  return m;
}
export const MATTE = () => (_matte ||= makeMatte(THREE.FrontSide));
// Ground: the vertex colours give each region its soil (sand, dust, grass, road); the shader adds what a camera would see
// up close — patchy colour, fine grit and pebbles, rock strata on steep ground, compacted wheel ruts on roads, darker damp
// soil at the water's edge and after rain — and turns it into surface relief so low sun rakes across it.
export const terrainU = { uWaterLevel: { value: -1e4 } };
let _terrain = null;
export const TERRAIN = () => {
  if (_terrain) return _terrain;
  const m = _terrain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }); m.userData.shared = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWet = matteU.uWet; sh.uniforms.uWaterLevel = terrainU.uWaterLevel;
    sh.vertexShader = 'attribute vec2 soil;\nvarying vec3 vWPos; varying vec3 vWNrm; varying vec2 vSoil;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * objectNormal); vSoil = soil;');
    sh.fragmentShader = `uniform float uWet, uWaterLevel; varying vec3 vWPos; varying vec3 vWNrm; varying vec2 vSoil;
      float th21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
      float tn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(th21(i), th21(i + vec2(1, 0)), f.x), mix(th21(i + vec2(0, 1)), th21(i + vec2(1, 1)), f.x), f.y); }
      float tfbm(vec2 p){ return tn(p) * 0.5 + tn(p * 2.07 + 3.1) * 0.25 + tn(p * 4.13 + 7.7) * 0.125 + tn(p * 8.21 + 1.3) * 0.0625; }
      // pebbles: one stone per cell at a random spot and size
      float pebble(vec2 p){ vec2 i = floor(p), f = fract(p); float r = th21(i); vec2 c = vec2(th21(i + 17.0), th21(i + 41.0)) * 0.6 + 0.2;
        float s = 0.07 + 0.13 * th21(i + 5.0), d = length(f - c) / s; return step(0.8, r) * sqrt(max(0.0, 1.0 - d * d)); } // a rounded stone
      // height of the fine relief at a point, used both for shading and colour
      // dressed limestone flagstones in courses, for city streets
      vec3 flags(vec2 p){ vec2 q = p / vec2(0.95, 0.62); float row = floor(q.y); q.x += th21(vec2(row, 3.0)) * 0.9 + row * 0.5;
        vec2 f = fract(q), id = floor(q); float edge = min(min(f.x, 1.0 - f.x) * 0.95, min(f.y, 1.0 - f.y) * 0.62);
        return vec3(smoothstep(0.015, 0.05, edge), th21(id), th21(id + 7.0)); } // (inside stone 0..1, random, random)
      float relief(vec2 p, float road, float rock){
        float h = tn(p * 1.3) * 0.5 + tn(p * 3.7) * 0.3 + tn(p * 9.1) * 0.2;
        h += pebble(p * 2.2) * 0.9 + pebble(p * 5.3 + 9.0) * 0.5;
        h += rock * (sin(vWPos.y * 3.1 + tfbm(p * 0.35) * 5.0) * 0.6 + tn(p * 2.0) * 0.8);
        float pv = clamp(vSoil.x - 1.0, 0.0, 1.0); if (pv > 0.0) { vec3 fl = flags(p); h = mix(h, fl.x * 0.8 + fl.y * 0.15 + tn(p * 7.0) * 0.1, pv); }
        return h * (1.0 - road * 0.65 * (1.0 - pv));
      }
      ` + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 gp = vWPos.xz; float camD = length(vWPos - cameraPosition);
        float nearF = 1.0 - smoothstep(18.0, 120.0, camD), mid = 1.0 - smoothstep(80.0, 420.0, camD);
        float paved = clamp(vSoil.x - 1.0, 0.0, 1.0), road = min(vSoil.x, 1.0), rock = smoothstep(0.3, 0.75, vSoil.y + (tfbm(gp * 0.08) - 0.5) * 0.35);
        vec3 c = diffuseColor.rgb;
        float macro = tfbm(gp * 0.011), ptch = tfbm(gp * 0.07 + 4.0), grit = tn(gp * 3.7) * 0.6 + tn(gp * 11.0) * 0.4;
        c *= 0.84 + 0.32 * macro;
        c = mix(c, c * vec3(1.07, 0.97, 0.85), smoothstep(0.52, 0.72, ptch) * mid);     // sun-bleached / iron-rich patches
        c = mix(c, c * vec3(0.9, 0.92, 0.95), smoothstep(0.45, 0.25, ptch) * mid * 0.6);
        c *= mix(1.0, 0.8 + 0.4 * grit, nearF);
        float green = clamp((diffuseColor.g - max(diffuseColor.r, diffuseColor.b)) * 6.0, 0.0, 1.0); // fewer stones in grass
        float pb = (pebble(gp * 2.2) + pebble(gp * 5.3 + 9.0) * 0.6) * (1.0 - road * 0.7) * (1.0 - green * 0.85) * nearF;
        vec3 cg = vec3(dot(c, vec3(0.3, 0.45, 0.25)));
        vec3 stone = mix(cg * vec3(0.92, 0.86, 0.78), cg * vec3(1.02, 1.0, 0.96), 0.5) * mix(0.62, 1.08, th21(floor(gp * 2.2) + 3.0));
        c = mix(c, stone, smoothstep(0.05, 0.4, pb) * 0.75);
        vec3 rockC = vec3(0.56, 0.51, 0.44) * (0.7 + 0.45 * tfbm(vec2(gp.x + gp.y, vWPos.y * 2.0) * 0.6)) * (0.88 + 0.18 * nearF * sin(vWPos.y * 3.1 + tfbm(gp * 0.35) * 5.0)); // strata, faded with distance to avoid shimmer
        c = mix(c, rockC, rock);
        // roads: two compacted wheel ruts along the way and a lighter, dusty crown
        float rut = road * nearF * 0.5 * (smoothstep(0.35, 0.5, tn(gp * 0.9)) * 0.3 + 0.2);
        c *= 1.0 - rut * 0.25 * (1.0 - paved);
        if (paved > 0.0) { vec3 fl = flags(gp); vec3 stoneC = vec3(0.6, 0.56, 0.49) * (0.72 + 0.4 * fl.y) * (0.85 + 0.2 * tn(gp * 3.0)) * (0.9 + 0.15 * tfbm(gp * 0.2)); stoneC = mix(stoneC * 0.55, stoneC, fl.x);
          c = mix(c, stoneC, paved); }
        // damp ground at the water's edge, and after rain
        float wet = max(1.0 - smoothstep(0.0, 0.9, vWPos.y - uWaterLevel), uWet * (0.6 + 0.4 * tn(gp * 0.25)));
        c *= 1.0 - 0.38 * wet;
        diffuseColor.rgb = c;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.97, 0.88, rock);
        roughnessFactor = mix(roughnessFactor, 0.3, wet * 0.8);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float e = 0.035, amp = (0.025 + 0.06 * rock) * nearF;
          if (amp > 0.0005) {
            amp *= 1.0 + paved * 0.6;
            float h0 = relief(gp, road, rock), hx = relief(gp + vec2(e, 0.0), road, rock), hz = relief(gp + vec2(0.0, e), road, rock);
            vec3 nW = normalize(vWNrm - vec3((hx - h0) / e, 0.0, (hz - h0) / e) * amp);
            normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
          }
        }`);
  };
  m.customProgramCacheKey = () => 'terrain-v2';
  return m;
};
export const MATTE2 = () => (_matte2 ||= makeMatte(THREE.DoubleSide));
export const SKIN = () => { if (!_skin) { _skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }); _skin.userData.shared = true; } return _skin; };

// ---------------------------------------------------------------- solid builder (merges coloured primitives into one mesh)
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
export class Solid {
  constructor() { this.geos = []; }
  add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (geo.index) geo.dispose();
    _m4.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz)); g.applyMatrix4(_m4);
    const n = g.attributes.position.count;
    if (!g.attributes.color) {
      _c.set(color); const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    this.geos.push(g); return this;
  }
  box(x, y, z, w, h, d, color, ry = 0, rx = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z, rx, ry, rz); }
  cyl(x, y, z, rt, rb, h, color, seg = 10, rx = 0, rz = 0, ry = 0) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y + h / 2, z, rx, ry, rz); }
  sphere(x, y, z, r, color, sx = 1, sy = 1, sz = 1, seg = 10) { return this.add(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), color, x, y, z, 0, 0, 0, sx, sy, sz); }
  blob(x, y, z, r, color, sx = 1, sy = 1, sz = 1, ry = 0) { return this.add(new THREE.IcosahedronGeometry(r, 1), color, x, y, z, 0, ry, 0, sx, sy, sz); }
  merge(other, x = 0, y = 0, z = 0, ry = 0) {
    _m4.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(1, 1, 1));
    for (const g of other.geos) this.geos.push(g.clone().applyMatrix4(_m4)); return this;
  }
  geometry() { if (!this.geos.length) return new THREE.BufferGeometry(); const g = mergeGeometries(this.geos, false); for (const x of this.geos) x.dispose(); this.geos = []; return g; }
  mesh(mat = MATTE(), cast = true, receive = true) { const m = new THREE.Mesh(this.geometry(), mat); m.castShadow = cast; m.receiveShadow = receive; return m; }
}
export function prismGeo(w, h, d) { // triangular prism, base centred on origin, ridge along z
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
}
const jit = (hex, r, amt = 0.05) => { _c.set(hex); _c.offsetHSL((r() - 0.5) * amt * 0.4, (r() - 0.5) * amt, (r() - 0.5) * amt * 1.6); return _c.getHex(); };

// ---------------------------------------------------------------- vegetation geometry
function vegGeos() {
  const S = () => new Solid();
  const palm = S(); {
    for (let i = 0; i < 7; i++) palm.cyl(Math.sin(i * 0.5) * 0.12 * i * 0.3, i * 1.0, 0, 0.19 - i * 0.008, 0.22 - i * 0.008, 1.05, i % 2 ? 0x7a5f42 : 0x6b5238, 7);
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2, droop = 0.25 + (i % 3) * 0.2;
      const g = new THREE.PlaneGeometry(0.75, 3.6, 2, 5); g.translate(0, 1.8, 0);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const y = p.getY(k), x = p.getX(k); const t = y / 3.6; p.setXYZ(k, x * (1 - t * 0.85), y * Math.cos(droop + t * 1.1) + 0, -y * Math.sin(droop + t * 1.1) * 0.9 - Math.abs(x) * 0.35); }
      g.computeVertexNormals();
      palm.add(g, i % 2 ? 0x4c7a34 : 0x3f6a2e, 0.25, 6.9, 0, 0, a, 0);
    }
  }
  const cypress = S(); cypress.cyl(0, 0, 0, 0.14, 0.18, 1.2, 0x4b3a2a, 6);
  cypress.add(new THREE.ConeGeometry(1.0, 8.5, 8, 4), 0x24482c, 0, 5.2, 0); cypress.add(new THREE.ConeGeometry(0.75, 5, 7, 2), 0x2c5434, 0.1, 4.2, 0.1);
  const olive = S(); olive.cyl(0, 0, 0, 0.16, 0.3, 2.0, 0x5a4a3a, 6, 0.08, 0.1); olive.cyl(0.3, 1.5, 0, 0.1, 0.14, 1.4, 0x5a4a3a, 5, 0, -0.6); olive.cyl(-0.3, 1.5, 0.1, 0.1, 0.14, 1.3, 0x5a4a3a, 5, 0.3, 0.6);
  olive.blob(0, 3.2, 0, 1.5, 0x6f8558, 1.2, 0.8, 1.1).blob(1.2, 2.8, 0.3, 1.1, 0x7b8f62, 1, 0.8, 1, 1).blob(-1.1, 2.9, -0.2, 1.2, 0x64794e, 1, 0.8, 1, 2).blob(0.1, 2.7, 1.0, 1.0, 0x76895c, 1, 0.75, 1, 3);
  const oak = S(); oak.cyl(0, 0, 0, 0.25, 0.42, 3.4, 0x4d3c2c, 7);
  oak.blob(0, 5.4, 0, 2.3, 0x3f6a32, 1.15, 0.9, 1.1).blob(1.7, 4.6, 0.5, 1.6, 0x4a7638, 1, 0.85, 1, 1).blob(-1.6, 4.7, -0.4, 1.7, 0x38602e, 1, 0.85, 1, 2).blob(0.2, 4.5, -1.6, 1.5, 0x44703a, 1, 0.8, 1, 3);
  const bush = S(); bush.blob(0, 0.45, 0, 0.7, 0x5c7446, 1.2, 0.75, 1.1).blob(0.5, 0.35, 0.2, 0.45, 0x6a8050, 1, 0.8, 1, 1);
  // weathered boulder: a subdivided sphere pushed about by noise, flattened, with darker cracks in the vertex colour
  const boulder = (r0, seed) => { const g = new THREE.IcosahedronGeometry(r0, 2), p = g.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = fbm(v.x * 2.1 + seed, v.y * 2.1 + v.z * 1.7, 3), k = 0.72 + 0.55 * n; v.multiplyScalar(k); v.y *= 0.62; if (v.y < -0.1) v.y *= 0.4; p.setXYZ(i, v.x, v.y, v.z);
      const c = 0.78 + 0.32 * fbm(v.x * 6 + seed, v.z * 6, 2), cc = new THREE.Color().setRGB(0.62 * c, 0.58 * c, 0.5 * c, THREE.SRGBColorSpace); col.set([cc.r, cc.g, cc.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; };
  const rock = S(); rock.add(boulder(0.8, 3), 0xffffff, 0, 0.32, 0, 0.3, 0.5, 0.2, 1.25, 0.75, 1);
  const pebble = S(); pebble.add(boulder(1, 7), 0xffffff, 0, 0.25, 0, 0.2, 0.4, 0.1, 1.3, 0.55, 1);
  const tuft = new THREE.BufferGeometry(); {
    const pos = [], uv = [], nrm = [], col = [];
    for (let b = 0; b < 5; b++) {
      const a = b * 1.7 + 0.3, ca = Math.cos(a), sa = Math.sin(a), w = 0.035, h = 0.3 + (b % 3) * 0.14, ox = Math.cos(b * 2.4) * 0.14, oz = Math.sin(b * 2.4) * 0.14, lean = 0.1;
      const A = [ox - ca * w, 0, oz - sa * w], B = [ox + ca * w, 0, oz + sa * w], T = [ox + sa * lean, h, oz - ca * lean];
      for (const tri of [[A, B, T], [B, A, T]]) { for (const v of tri) pos.push(...v); uv.push(0, 0, 1, 0, 0.5, 1); nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0); col.push(0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 1.0, 1.0, 1.0); }
    }
    tuft.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tuft.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    tuft.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); tuft.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }
  return { pebble: pebble.geometry(), palm: palm.geometry(), cypress: cypress.geometry(), olive: olive.geometry(), oak: oak.geometry(), bush: bush.geometry(), rock: rock.geometry(), tuft };
}

// ---------------------------------------------------------------- world
export class World {
  constructor(engine, seed = 1) {
    this.engine = engine; this.rand = Rand(seed);
    this.group = engine.world;
    this.S = new Solid();           // static matte geometry, baked on finish()
    this.colliders = []; this.platforms = []; this.heightFns = [];
    this.updaters = []; this.terrainFn = () => 0; this.waterLevel = null; this.bounds = 240;
    this.inst = {}; this.flames = []; this.lights = [];
    this.roads = [];
    terrainU.uWaterLevel.value = -1e4;
  }
  terrainH(x, z) { return this.terrainFn(x, z); }
  // ground height under a walker currently at height y (platforms only count if within stepping reach)
  ground(x, z, y = 1e9) {
    let h = this.terrainFn(x, z);
    for (const p of this.platforms) {
      const dx = x - p.x, dz = z - p.z, c = Math.cos(p.rot), s = Math.sin(p.rot);
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) <= p.hw && Math.abs(lz) <= p.hd) {
        const py = p.y1 === undefined ? p.y : lerp(p.y, p.y1, lz / p.hd * 0.5 + 0.5);
        if (py > h && py <= y + 0.75) h = py;
      }
    }
    for (const f of this.heightFns) { const v = f(x, z); if (v > h && v <= y + 0.75) h = v; }
    return h;
  }
  addBox(x, z, hw, hd, rot = 0, h = 50) { this.colliders.push({ x, z, hw, hd, rot, h }); }
  addCircle(x, z, r, h = 50) { this.colliders.push({ x, z, r, h }); }
  addPlatform(x, z, hw, hd, rot, y, y1) { this.platforms.push({ x, z, hw, hd, rot, y, y1 }); }
  collide(pos, rad) {
    for (const c of this.colliders) {
      if (c.off || pos.y > c.h - 0.3) continue;
      const dx = pos.x - c.x, dz = pos.z - c.z;
      if (c.r !== undefined) {
        const d = Math.hypot(dx, dz), m = c.r + rad;
        if (d < m && d > 1e-4) { pos.x = c.x + dx / d * m; pos.z = c.z + dz / d * m; }
      } else {
        if (Math.abs(dx) > c.hw + c.hd + rad || Math.abs(dz) > c.hw + c.hd + rad) continue;
        const co = Math.cos(c.rot), si = Math.sin(c.rot);
        let lx = dx * co - dz * si, lz = dx * si + dz * co;
        const px = c.hw + rad - Math.abs(lx), pz = c.hd + rad - Math.abs(lz);
        if (px > 0 && pz > 0) {
          if (px < pz) lx = Math.sign(lx) * (c.hw + rad); else lz = Math.sign(lz) * (c.hd + rad);
          pos.x = c.x + lx * co + lz * si; pos.z = c.z - lx * si + lz * co;
        }
      }
    }
    const d = Math.hypot(pos.x - (this.cx || 0), pos.z - (this.cz || 0));
    if (d > this.bounds) { pos.x = (this.cx || 0) + (pos.x - (this.cx || 0)) / d * this.bounds; pos.z = (this.cz || 0) + (pos.z - (this.cz || 0)) / d * this.bounds; }
  }
  // true if the point is inside a solid collider (used by the camera)
  blocked(x, y, z) {
    for (const c of this.colliders) {
      if (c.off || c.nocam || y > c.h) continue;
      const dx = x - c.x, dz = z - c.z;
      if (c.r !== undefined) { if (c.r > 1.2 && dx * dx + dz * dz < c.r * c.r) return true; continue; }
      const co = Math.cos(c.rot), si = Math.sin(c.rot);
      if (Math.abs(dx * co - dz * si) < c.hw && Math.abs(dx * si + dz * co) < c.hd) return true;
    }
    return false;
  }

  // ---- terrain
  terrain({ size = 600, seg = 220, height, color, cx = 0, cz = 0 }) {
    this.terrainFn = height; this.cx = cx; this.cz = cz; this.terrainSize = size;
    seg = Math.min(360, Math.round(seg * 1.45)); // finer ground: about 2 m between vertices in most chapters
    const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), soil = new Float32Array(p.count * 2), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = height(x, z); p.setY(i, h);
      const e = 1.5, slope = Math.hypot(height(x + e, z) - h, height(x, z + e) - h) / e;
      c.set(color(x, z, h, slope)); const n = 0.92 + 0.16 * noise2(x * 0.7, z * 0.7);
      col[i * 3] = c.r * n; col[i * 3 + 1] = c.g * n; col[i * 3 + 2] = c.b * n;
      soil[i * 2] = this.roadSoil(x, z); soil[i * 2 + 1] = Math.min(1, slope / 1.4);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('soil', new THREE.BufferAttribute(soil, 2)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, TERRAIN()); m.receiveShadow = true; this.group.add(m); this.terrainMesh = m;
    // From here on, everything stands on the ground exactly as drawn: sample the mesh's own triangles instead of the
    // formula (between vertices the two can differ by tens of centimetres on rough ground, which left people floating).
    const n = seg + 1, x0 = cx - size / 2, z0 = cz - size / 2, step = size / seg, hs = new Float32Array(n * n);
    for (let i = 0; i < p.count; i++) { const ix = Math.round((p.getX(i) - x0) / step), iz = Math.round((p.getZ(i) - z0) / step); hs[iz * n + ix] = p.getY(i); }
    const formula = height;
    this.terrainFn = (x, z) => {
      const fx = (x - x0) / step, fz = (z - z0) / step, ix = Math.floor(fx), iz = Math.floor(fz);
      if (ix < 0 || iz < 0 || ix >= seg || iz >= seg) return formula(x, z);
      const u = fx - ix, v = fz - iz, ha = hs[iz * n + ix], hd = hs[iz * n + ix + 1], hb = hs[(iz + 1) * n + ix], hc = hs[(iz + 1) * n + ix + 1];
      return u + v <= 1 ? ha + (hd - ha) * u + (hb - ha) * v : hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v); // the plane's two triangles per cell
    };
    return m;
  }

  // sea or river whose shallows and surf follow the terrain
  water(level, opts = {}) {
    const N = 256, size = this.terrainSize, data = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const h = this.terrainFn(this.cx + (i / (N - 1) - 0.5) * size, this.cz + (j / (N - 1) - 0.5) * size); data[(j * N + i) * 4] = Math.max(0, Math.min(255, (h + 12) / 16 * 255)); data[(j * N + i) * 4 + 3] = 255; }
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    this.waterLevel = level; if (!opts.size) terrainU.uWaterLevel.value = level; return this.engine.addWater(level, { ...opts, hmap: tex, hrect: [this.cx, this.cz, size] });
  }
  // ---- instanced props
  _inst(kind, x, y, z, s = 1, ry = 0, sy = s, color = null) {
    (this.inst[kind] ||= []).push({ x, y, z, s, sy, ry, color });
  }
  tree(kind, x, z, s = 1) { const r = this.rand; const y = this.terrainFn(x, z) - 0.1; this._inst(kind, x, y, z, s * r.range(0.8, 1.25), r() * 6.28, s * r.range(0.8, 1.3)); if (kind !== 'bush') this.addCircle(x, z, kind === 'oak' ? 0.5 : 0.3); }
  rock(x, z, s = 1) { const r = this.rand; this._inst('rock', x, this.terrainFn(x, z) - 0.1, z, s * r.range(0.6, 1.6), r() * 6.28, s * r.range(0.5, 1.4)); if (s > 1.1) this.addCircle(x, z, s * 0.8, s * 1.2); }
  scatter(kind, n, x0, z0, x1, z1, ok, s = 1) { const r = this.rand; for (let i = 0, t = 0; i < n && t < n * 30; t++) { const x = r.range(x0, x1), z = r.range(z0, z1); if (ok && !ok(x, z, this.terrainFn(x, z))) continue; i++; kind === 'rock' ? this.rock(x, z, s) : this.tree(kind, x, z, s); } }
  grass(n, x0, z0, x1, z1, ok, colors = [0x7f8c48, 0x8c9850, 0x748442]) {
    const r = this.rand; for (let i = 0, t = 0; i < n && t < n * 20; t++) { const x = r.range(x0, x1), z = r.range(z0, z1), h = this.terrainFn(x, z); if ((ok && !ok(x, z, h)) || this.ground(x, z) > h + 0.02) continue; i++; this._inst('tuft', x, h, z, r.range(0.7, 1.25), r() * 6.28, r.range(0.5, 1.25), jit(r.pick(colors), r, 0.12)); }
  }

  // ---- architecture primitives (all go into the baked static solid)
  box(x, y, z, w, h, d, color, ry = 0) { this.S.box(x, y, z, w, h, d, color, ry); return this; }
  column(x, y, z, h, r, color = 0xe8e2d2) {
    const S = this.S; S.cyl(x, y, z, r * 1.25, r * 1.3, 0.22, color, 12); S.cyl(x, y + 0.22, z, r * 0.84, r, h - 0.6, color, 12);
    S.cyl(x, y + h - 0.38, z, r * 1.25, r * 0.86, 0.2, color, 12); S.box(x, y + h - 0.18, z, r * 2.7, 0.18, r * 2.7, color); this.addCircle(x, z, r * 1.1, y + h);
  }
  wall(x1, z1, x2, z2, h, t = 1.4, color = 0xc9b48e, crenel = true) {
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), ry = Math.atan2(dx, dz), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const y = Math.min(this.terrainFn(x1, z1), this.terrainFn(x2, z2), this.terrainFn(mx, mz)) - 1;
    const top = Math.max(this.terrainFn(x1, z1), this.terrainFn(x2, z2)) + h;
    this.S.box(mx, y, mz, t, top - y, L, color, ry);
    if (crenel) for (let d = 0.8; d < L - 0.4; d += 1.7) this.S.box(x1 + dx / L * d, top, z1 + dz / L * d, t, 0.6, 0.85, color, ry);
    this.addBox(mx, mz, t / 2, L / 2, ry, top + 1);
  }
  tower(x, z, w, h, color = 0xc4ae88) {
    const y = this.terrainFn(x, z) - 1; this.S.box(x, y, z, w, h + 1, w, color); this.S.box(x, y + h + 1, z, w + 0.5, 0.5, w + 0.5, color);
    for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) this.S.box(x + ax * (w / 2 + 0.05), y + h + 1.5, z + az * (w / 2 + 0.05), 0.8, 0.7, 0.8, color);
    this.addBox(x, z, w / 2, w / 2, 0, y + h + 3);
  }
  gate(x, z, ry, width = 5, h = 7, color = 0xc4ae88) { // opening along local x, passage along local z
    const c = Math.cos(ry), s = Math.sin(ry), tw = 4.5;
    for (const sd of [-1, 1]) this.tower(x + c * sd * (width / 2 + tw / 2), z - s * sd * (width / 2 + tw / 2), tw, h + 2.5, color);
    const y = this.terrainFn(x, z);
    this.S.box(x, y + h - 2.2, z, width + 0.2, 3.2, 2.2, color, ry);
    this.S.box(x, y + h + 1, z, width + 0.2, 0.5, 2.6, color, ry);
    for (const sd of [-1, 1]) this.S.box(x + c * sd * (width / 2 - 0.2), y, z - s * sd * (width / 2 - 0.2), 0.5, h - 2.2, 2.4, 0xa89474, ry);
  }
  // rectangular walled enclosure; gates: [{side:'n|s|e|w', at:0..1, width}]
  cityWalls(x0, z0, x1, z1, h = 7, gates = [], color = 0xc9b48e) {
    const sides = { n: [x0, z0, x1, z0], s: [x0, z1, x1, z1], w: [x0, z0, x0, z1], e: [x1, z0, x1, z1] };
    for (const k in sides) {
      const [ax, az, bx, bz] = sides[k]; const gs = gates.filter(g => g.side === k).sort((a, b) => a.at - b.at);
      let t0 = 0; const L = Math.hypot(bx - ax, bz - az);
      for (const g of gs) {
        const w = (g.width || 5) + 9, ta = g.at - w / 2 / L, tb = g.at + w / 2 / L;
        this.wall(lerp(ax, bx, t0), lerp(az, bz, t0), lerp(ax, bx, ta), lerp(az, bz, ta), h, 1.6, color);
        this.gate(lerp(ax, bx, g.at), lerp(az, bz, g.at), (k === 'n' || k === 's') ? 0 : Math.PI / 2, g.width || 5, h, color); t0 = tb;
      }
      this.wall(lerp(ax, bx, t0), lerp(az, bz, t0), bx, bz, h, 1.6, color);
      for (let i = 1; i < Math.floor(L / 34); i++) { const t = i / Math.floor(L / 34); if (!gs.some(g => Math.abs(g.at - t) < 14 / L)) this.tower(lerp(ax, bx, t), lerp(az, bz, t), 3.6, h + 1.5, color); }
    }
    for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) this.tower(cx, cz, 4.4, h + 2.5, color);
  }
  // A dwelling. style: 'mud' (flat-roofed Levantine), 'greek' (plaster + terracotta), 'stone'
  house(x, z, w, d, h, ry = 0, style = 'mud', opts = {}) {
    const r = this.rand, S = this.S, c = Math.cos(ry), s = Math.sin(ry);
    const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const y = this.terrainFn(x, z) - 0.6, H = h + 0.6;
    const wallC = opts.color ?? jit(style === 'mud' ? r.pick([0xd9c39a, 0xcdb68c, 0xe0cba6, 0xc7ae84]) : style === 'greek' ? r.pick([0xece4d2, 0xe6dcc6, 0xf0e8d8, 0xe2d2b8]) : r.pick([0xb8ac98, 0xa89c88]), r, 0.06);
    S.box(x, y, z, w, H, d, wallC, ry);
    const wood = 0x5a4028, dark = 0x2a2018;
    if (style === 'greek') {
      const roofC = jit(0xb5613c, r, 0.08);
      S.add(prismGeo(w + 0.9, w * 0.26, d + 0.9), roofC, x, y + H, z, 0, ry, 0);
      S.box(x, y + H - 0.12, z, w + 0.5, 0.2, d + 0.5, 0xd8cdb8, ry);
    } else {
      S.box(x, y + H, z, w + 0.25, 0.22, d + 0.25, jit(wallC, r, 0.04), ry);
      for (const [lx, lz, bw, bd] of [[0, d / 2, w, 0.3], [0, -d / 2, w, 0.3], [w / 2, 0, 0.3, d], [-w / 2, 0, 0.3, d]]) { const [px, pz] = at(lx, lz); S.box(px, y + H + 0.2, pz, bw + 0.3, 0.45, bd + 0.3, wallC, ry); }
      for (let bx = -w / 2 + 0.7; bx < w / 2 - 0.3; bx += 1.1) { const [px, pz] = at(bx, d / 2 + 0.15); S.cyl(px, y + H - 0.55, pz, 0.08, 0.08, 0.5, wood, 5, Math.PI / 2, 0, ry); }
      if (r() < 0.4 && w > 6) { const [px, pz] = at(-w / 4, -d / 4); S.box(px, y + H + 0.2, pz, w * 0.42, 2.3, d * 0.42, jit(wallC, r, 0.05), ry); S.box(px, y + H + 2.5, pz, w * 0.42 + 0.3, 0.2, d * 0.42 + 0.3, wallC, ry); }
      if (r() < 0.35) { for (let i = 0; i < 7; i++) { const [px, pz] = at(w / 2 + 0.55, -d / 2 + 0.6 + i * 0.75); S.box(px, y, pz, 1.1, 0.6 + (i + 1) * (h / 7.5), 0.75, wallC, ry); } }
    }
    const doorX = opts.doorX ?? r.range(-w / 4, w / 4);
    { const [px, pz] = at(doorX, d / 2 + 0.03); S.box(px, y + 0.6, pz, 1.15, 2.05, 0.14, opts.open ? dark : jit(wood, r, 0.08), ry); S.box(px, y + 2.65, pz, 1.6, 0.22, 0.22, style === 'mud' ? wood : 0xd8cdb8, ry); S.box(px, y + 0.5, pz, 1.7, 0.14, 0.5, 0xa89878, ry); }
    for (const [face, span] of [[d / 2, w], [-d / 2, w]]) for (let wx = -span / 2 + 1.2; wx < span / 2 - 0.8; wx += r.range(2, 3.4)) {
      if (face > 0 && Math.abs(wx - doorX) < 1.5) continue;
      const [px, pz] = at(wx, face + Math.sign(face) * 0.03); S.box(px, y + 0.6 + h * 0.52, pz, 0.6, 0.8, 0.12, dark, ry);
      if (style === 'greek') { const [sx, sz] = at(wx + 0.48, face + Math.sign(face) * 0.06); S.box(sx, y + 0.6 + h * 0.52, sz, 0.3, 0.8, 0.06, 0x4a6a7a, ry); }
    }
    for (const lx of [w / 2 + 0.03, -w / 2 - 0.03]) if (r() < 0.6) { const [px, pz] = at(lx, r.range(-d / 4, d / 4)); S.box(px, y + 0.6 + h * 0.55, pz, 0.12, 0.7, 0.55, dark, ry); }
    if (opts.awning ?? r() < 0.3) this.awning(...at(doorX + r.range(-0.5, 0.5), d / 2 + 1.25), 3.2, 2.4, ry, y + 2.9);
    if (r() < 0.5) { const [px, pz] = at(doorX + (r() < 0.5 ? 1.5 : -1.5), d / 2 + 0.6); this.pot(px, pz, r.range(0.7, 1.2)); }
    this.addBox(x, z, w / 2, d / 2, ry, y + H + 0.5);
    return { x, z, w, d, h, ry, door: at(doorX, d / 2 + 1.2), roofY: y + H + 0.22 };
  }
  pot(x, z, s = 1, color = 0xb06a3c) {
    const y = this.terrainFn(x, z); const pts = [[0.001, 0], [0.16, 0.02], [0.3, 0.3], [0.27, 0.55], [0.14, 0.72], [0.17, 0.82]].map(p => new THREE.Vector2(p[0] * s, p[1] * s));
    this.S.add(new THREE.LatheGeometry(pts, 9), jit(color, this.rand, 0.1), x, y, z);
  }
  crate(x, z, s = 0.8, y = null) { const r = this.rand; this.S.box(x, y ?? this.terrainFn(x, z), z, s, s, s, jit(0x8a6a44, r, 0.08), r() * 3); this.addCircle(x, z, s * 0.6, (y ?? this.terrainFn(x, z)) + s); }
  awning(x, z, w, d, ry, y, color = null) {
    const r = this.rand; const g = new THREE.PlaneGeometry(w, d, 8, 6); g.rotateX(-Math.PI / 2 + 0.22);
    const m = new THREE.Mesh(g, windify(new THREE.MeshStandardMaterial({ color: color ?? r.pick([0xa83c2c, 0xd8c8a0, 0x3c5c8a, 0xc88a3c, 0x7a3c5c]), side: THREE.DoubleSide, roughness: 1 }), 'awning', 0.5));
    m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; this.group.add(m);
    const c = Math.cos(ry), s = Math.sin(ry), yb = this.terrainFn(x, z);
    for (const sd of [-1, 1]) { const px = x + sd * (w / 2 - 0.1) * c + (d / 2 - 0.1) * s, pz = z - sd * (w / 2 - 0.1) * s + (d / 2 - 0.1) * c; this.S.cyl(px, yb, pz, 0.05, 0.05, y - yb - 0.2, 0x5a4028, 5); }
    return m;
  }
  stall(x, z, ry = 0) {
    const r = this.rand, y = this.terrainFn(x, z), c = Math.cos(ry), s = Math.sin(ry);
    this.S.box(x, y, z, 2.6, 0.85, 1.1, 0x7a5c3c, ry); this.addBox(x, z, 1.3, 0.55, ry, y + 1);
    for (let i = 0; i < 5; i++) { const lx = r.range(-1, 1), lz = r.range(-0.3, 0.3); this.S.sphere(x + lx * c + lz * s, y + 0.97, z - lx * s + lz * c, r.range(0.1, 0.17), r.pick([0xb8442c, 0xd8a83c, 0x6a8a3c, 0x8a4a6a, 0xd8c8a0]), 1, 0.8, 1, 7); }
    this.awning(x - s * 0.1, z - c * 0.1, 3, 2.2, ry, y + 2.5);
    const bx = x - s * 0.9, bz = z - c * 0.9; for (const sd of [-1, 1]) this.S.cyl(bx + sd * 1.4 * c, y, bz - sd * 1.4 * s, 0.05, 0.05, 2.75, 0x5a4028, 5);
  }
  // houses along both sides of a street segment
  street(x1, z1, x2, z2, width, style = 'mud', opts = {}) {
    const r = this.rand, dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = uz, nz = -ux, ry0 = Math.atan2(dx, dz);
    const out = [];
    for (const sd of (opts.sides || [-1, 1])) {
      let t = r.range(0, 2);
      while (t < L - 5) {
        const w = Math.min(r.range(6, 10.5), L - t), d = r.range(6, 9), h = r.range(3.2, opts.tall ? 6.5 : 4.6), mid = t + w / 2;
        const cx = x1 + ux * mid + nx * sd * (width / 2 + d / 2), cz = z1 + uz * mid + nz * sd * (width / 2 + d / 2);
        if (!opts.skip || !opts.skip(cx, cz)) out.push(this.house(cx, cz, w, d, h, ry0 + (sd > 0 ? -Math.PI / 2 : Math.PI / 2), style));
        t += w + r.range(0.3, opts.gap ?? 2.2);
      }
    }
    return out;
  }
  temple(x, z, ry, { w = 14, d = 26, h = 8, nf = 6, ns = 11, color = 0xe9e3d3, roof = 0xb5613c, cella = true } = {}) {
    const S = this.S, y = this.terrainFn(x, z), c = Math.cos(ry), s = Math.sin(ry), at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    for (let i = 0; i < 3; i++) { S.box(x, y - 1 + i * 0.3, z, w + 3.6 - i * 1.2, 1.3, d + 3.6 - i * 1.2, color, ry); this.addPlatform(x, z, (w + 3.6 - i * 1.2) / 2, (d + 3.6 - i * 1.2) / 2, ry, y + 0.3 + i * 0.3); }
    const fy = y + 0.9, r = 0.48;
    for (let i = 0; i < nf; i++) for (const lz of [-d / 2 + 0.7, d / 2 - 0.7]) { const [px, pz] = at(-w / 2 + 0.7 + i * (w - 1.4) / (nf - 1), lz); this.column(px, fy, pz, h, r, color); }
    for (let i = 1; i < ns - 1; i++) for (const lx of [-w / 2 + 0.7, w / 2 - 0.7]) { const [px, pz] = at(lx, -d / 2 + 0.7 + i * (d - 1.4) / (ns - 1)); this.column(px, fy, pz, h, r, color); }
    S.box(x, fy + h, z, w + 0.4, 1.1, d + 0.4, color, ry); S.box(x, fy + h + 0.45, z, w + 0.5, 0.25, d + 0.5, 0xc8a050, ry);
    S.add(prismGeo(w + 1.2, w * 0.2, d + 1.2), roof, x, fy + h + 1.1, z, 0, ry, 0);
    S.add(prismGeo(w - 0.6, w * 0.2 - 0.25, d + 1.3), color, x, fy + h + 1.1, z, 0, ry, 0);
    if (cella) { S.box(x, fy, z, w - 5, h, d - 8, 0xdcd4c0, ry); const [px, pz] = at(0, d / 2 - 4 + 0.05); S.box(px, fy, pz, 2.2, 4.6, 0.2, 0x1c1814, ry); this.addBox(x, z, (w - 5) / 2, (d - 8) / 2, ry, fy + h); }
    return { y: fy, at };
  }
  stoa(x, z, len, ry, { depth = 6, h = 5, color = 0xe6dfcf } = {}) {
    const S = this.S, y = this.terrainFn(x, z), c = Math.cos(ry), s = Math.sin(ry), at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    S.box(x, y - 0.8, z, len + 1, 1.1, depth + 1.4, color, ry); this.addPlatform(x, z, (len + 1) / 2, (depth + 1.4) / 2, ry, y + 0.3);
    { const [px, pz] = at(0, -depth / 2); S.box(px, y + 0.3, pz, len, h, 0.5, 0xdcd2bc, ry); this.addBox(px, pz, len / 2, 0.3, ry, y + h + 1); }
    for (let i = 0; i <= Math.round(len / 3.2); i++) { const [px, pz] = at(-len / 2 + 0.4 + i * (len - 0.8) / Math.round(len / 3.2), depth / 2); this.column(px, y + 0.3, pz, h - 0.2, 0.3, color); }
    const [rx, rz] = at(0, 0); S.box(rx, y + h + 0.25, rz, len + 0.8, 0.25, depth + 1.4, 0xb5613c, ry, 0, 0); S.box(rx, y + h + 0.05, rz, len + 0.5, 0.25, depth + 1, color, ry);
  }
  statue(x, z, ry = 0, { color = 0xe8e4d8, h = 1.5, gold = false, kind = 'figure' } = {}) {
    const S = this.S, y = this.terrainFn(x, z), cc = gold ? 0xd8a838 : color;
    S.box(x, y, z, 1.3, 0.3, 1.3, 0xcfc8b8, ry); S.box(x, y + 0.3, z, 1.0, h, 1.0, 0xdcd6c6, ry); this.addBox(x, z, 0.65, 0.65, ry, y + h + 2.5);
    const b = y + 0.3 + h;
    if (kind === 'figure') {
      S.cyl(x, b, z, 0.2, 0.32, 1.25, cc, 9); S.sphere(x, b + 1.45, z, 0.2, cc, 1, 1.3, 1, 9); S.sphere(x, b + 1.82, z, 0.15, cc);
      S.cyl(x + Math.cos(ry) * 0.33, b + 1.1, z - Math.sin(ry) * 0.33, 0.06, 0.06, 0.8, cc, 6, 0, -0.5, ry); S.cyl(x - Math.cos(ry) * 0.3, b + 0.75, z + Math.sin(ry) * 0.3, 0.06, 0.06, 0.7, cc, 6);
    } else if (kind === 'herm') { S.box(x, b, z, 0.4, 1.2, 0.35, cc, ry); S.sphere(x, b + 1.4, z, 0.2, cc); }
  }
  altar(x, z, ry = 0, color = 0xd6cfbe) {
    const S = this.S, y = this.terrainFn(x, z); S.box(x, y, z, 1.9, 0.25, 1.4, color, ry); S.box(x, y + 0.25, z, 1.5, 0.9, 1.0, color, ry); S.box(x, y + 1.15, z, 1.8, 0.2, 1.3, color, ry);
    this.addBox(x, z, 0.95, 0.7, ry, y + 1.4); return y + 1.35;
  }
  // semicircular theatre cut into a slope; opens toward local +z
  theatre(x, z, ry, { r0 = 12, R = 40, rows = 16, rise = 0.62, color = 0xd9d2c0 } = {}) {
    const y = this.terrainFn(x, z), stepW = (R - r0) / rows, pts = [];
    for (let i = 0; i <= rows; i++) { pts.push(new THREE.Vector2(r0 + i * stepW, i * rise)); if (i < rows) pts.push(new THREE.Vector2(r0 + i * stepW, (i + 1) * rise)); }
    pts.push(new THREE.Vector2(R + 1.5, rows * rise), new THREE.Vector2(R + 1.5, -2));
    const g = new THREE.LatheGeometry(pts, 40, Math.PI / 2, Math.PI); g.computeVertexNormals();
    this.S.add(g, color, x, y, z, 0, ry, 0);
    this.S.cyl(x, y - 0.9, z, r0, r0, 1.0, 0xcbbfa6, 28);
    const c = Math.cos(ry), s = Math.sin(ry);
    this.heightFns.push((px, pz) => {
      const dx = px - x, dz = pz - z, lz = dx * s + dz * c, rr = Math.hypot(dx, dz);
      if (lz > 0.5 || rr < r0 || rr > R + 1.5) return -1e9;
      return y + Math.min(rows, Math.floor((rr - r0) / stepW) + 1) * rise;
    });
    // stage building
    const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    { const [px, pz] = at(0, r0 + 5); this.S.box(px, y - 1, pz, r0 * 2.6, 2.2, 6, color, ry); this.addPlatform(px, pz, r0 * 1.3, 3, ry, y + 1.2); const [bx, bz] = at(0, r0 + 9); this.S.box(bx, y - 1, bz, r0 * 2.6, 11, 2.5, 0xd2c8b2, ry); this.addBox(bx, bz, r0 * 1.3, 1.25, ry, y + 12); for (let i = 0; i < 8; i++) { const [qx, qz] = at(-r0 * 1.1 + i * r0 * 2.2 / 7, r0 + 7.3); this.column(qx, y + 1.2, qz, 6, 0.35); } }
    return { y, r0, R, rows, rise, stepW, seat: (row, ang) => { const rr = r0 + (row + 0.55) * stepW, lx = Math.cos(ang) * rr, lz = -Math.sin(ang) * rr; return [x + lx * c + lz * s, y + (row + 1) * rise, z - lx * s + lz * c]; } };
  }
  torch(x, z, h = 2.3, light = true, y = null) {
    const by = y ?? this.terrainFn(x, z); this.S.cyl(x, by, z, 0.045, 0.06, h, 0x4a3420, 5); this.S.cyl(x, by + h, z, 0.11, 0.06, 0.2, 0x2a2018, 6);
    return this.flame(x, by + h + 0.32, z, 0.9, light);
  }
  flame(x, y, z, size = 1, light = true, parent = null) {
    const f = { x, y, z, size, parent, seed: this.rand() * 100, on: true };
    if (light) { f.light = new THREE.PointLight(0xff9a48, 0, 26, 1.6); f.light.position.set(x, y + 0.2, z); (parent || this.group).add(f.light); f.power = 28 * size; }
    this.flames.push(f); return f;
  }
  campfire(x, z, size = 1) {
    const y = this.terrainFn(x, z); for (let i = 0; i < 5; i++) { const a = i * 1.256; this.S.cyl(x + Math.cos(a) * 0.25, y + 0.12, z + Math.sin(a) * 0.25, 0.07, 0.08, 0.9 * size, 0x3a2a1c, 5, 1.1, 0, a); }
    for (let i = 0; i < 8; i++) { const a = i * 0.785; this.S.blob(x + Math.cos(a) * 0.62 * size, y + 0.05, z + Math.sin(a) * 0.62 * size, 0.16, 0x6a645c, 1, 0.7, 1, a); }
    this.addCircle(x, z, 0.75 * size, y + 1.5);
    return [this.flame(x, y + 0.45, z, 2.2 * size, true), this.flame(x + 0.15, y + 0.3, z + 0.1, 1.5 * size, false), this.flame(x - 0.15, y + 0.3, z - 0.1, 1.4 * size, false)];
  }
  road(pts, width, color, opts = {}) { this.roads.push({ pts, width, color, paved: !!opts.paved }); }
  // 0 = open ground, 1 = beaten earth road, 2 = paved street (smoothly blended at the edges)
  roadSoil(x, z) { let v = 0; for (const r of this.roads) { const k = smooth(1.5, -1.0, pathDist(r.pts, x, z)[0] - r.width / 2); v = Math.max(v, k * (r.paved ? 2 : 1)); } return v; }
  roadDist(x, z) { let d = 1e9; for (const r of this.roads) d = Math.min(d, pathDist(r.pts, x, z)[0] - r.width / 2); return d; }

  // distant hills beyond the playable ground, so the land runs on to the horizon instead of ending at the map's edge.
  // arcs: [[fromAngle, toAngle], …] in radians (0 = +x, π/2 = +z); leave out the seaward side on coasts.
  // peaks: [[angle, half-width (rad), height (m)], …] raise named ranges; snow: height above which the slopes turn white
  horizon({ arcs = [[0, Math.PI * 2]], height = 70, color = 0x9c9070, seed = 3, peaks = [], snow = 1e9, rock = null } = {}) {
    if (rock !== null) rock = new THREE.Color(rock);
    const R0 = this.terrainSize / 2 - 6, R1 = R0 + 1100, nA = 220, nR = 18, pos = [], col = [], idx = [], c0 = new THREE.Color(color);
    for (const [a0, a1] of arcs) {
      const base = pos.length / 3;
      for (let i = 0; i <= nA; i++) {
        const a = a0 + (a1 - a0) * i / nA;
        for (let j = 0; j <= nR; j++) {
          const t = j / nR, r = R0 + (R1 - R0) * Math.pow(t, 1.6), x = this.cx + Math.cos(a) * r, z = this.cz + Math.sin(a) * r;
          const ridge = fbm(Math.cos(a) * 4 + seed, Math.sin(a) * 4 + seed * 2, 5), edge = this.terrainFn(this.cx + Math.cos(a) * R0, this.cz + Math.sin(a) * R0);
          let pk = 0; for (const [pa, pw, ph] of peaks) { let da = Math.atan2(Math.sin(a - pa), Math.cos(a - pa)); pk = Math.max(pk, ph * Math.exp(-(da * da) / (pw * pw)) * smooth(0.3, 0.85, t) * (0.65 + 0.7 * fbm(a * 14 + seed, t * 4, 5))); }
          const hgt = j === 0 ? edge - 2 : lerp(edge, height * (0.35 + 1.1 * ridge) * (0.5 + 0.5 * Math.sin(t * Math.PI * 0.9)) + fbm(x * 0.01, z * 0.01, 3) * 25 + pk, smooth(0, 0.25, t));
          pos.push(x, hgt, z); const k = 0.82 + 0.3 * fbm(x * 0.02, z * 0.02, 3);
          let cr = c0.r * k, cg = c0.g * k, cb = c0.b * k;
          if (rock && hgt > height * 0.9) { const rk = smooth(height * 0.9, height * 2.2, hgt); cr = lerp(cr, rock.r * k, rk); cg = lerp(cg, rock.g * k, rk); cb = lerp(cb, rock.b * k, rk); }
          const sn = smooth(snow - 40, snow + 30, hgt + (fbm(x * 0.03, z * 0.03, 3) - 0.5) * 60); cr = lerp(cr, 0.93, sn); cg = lerp(cg, 0.94, sn); cb = lerp(cb, 0.97, sn);
          col.push(cr, cg, cb);
        }
      }
      for (let i = 0; i < nA; i++) for (let j = 0; j < nR; j++) { const a = base + i * (nR + 1) + j, b = a + nR + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })); m.receiveShadow = false; this.group.add(m); return m;
  }
  // dry-stone field wall: irregular unmortared stones along a line, with a gap every `gapEvery` metres
  drywall(x1, z1, x2, z2, h = 0.8, gapEvery = 0) {
    const r = this.rand, dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), ry = Math.atan2(dx, dz);
    let segStart = 0;
    for (let d = 0; d < L; ) {
      if (gapEvery && d - segStart > gapEvery) { const g0 = d; d += 3.2; segStart = d; const mx = x1 + dx / L * (g0 - 0.2), mz = z1 + dz / L * (g0 - 0.2); continue; }
      const w = r.range(0.45, 0.9), x = x1 + dx / L * (d + w / 2), z = z1 + dz / L * (d + w / 2), y = this.terrainFn(x, z);
      for (let k = 0, hy = 0; hy < h - 0.1; k++) { const sh = r.range(0.2, 0.34); this.S.add(new THREE.DodecahedronGeometry(0.5, 0), jit(r.pick([0xb8aa8c, 0xc4b696, 0xa89c82, 0xcdbf9f]), r, 0.1), x + r.range(-0.08, 0.08), y + hy + sh * 0.45, z + r.range(-0.08, 0.08), r() * 3, ry + r.range(-0.4, 0.4), r() * 3, r.range(0.5, 0.66), sh, w * r.range(0.95, 1.2)); hy += sh * 0.85; }
      d += w * 0.95;
    }
    // colliders for each run between gaps
    const runs = gapEvery ? Math.ceil(L / (gapEvery + 3.2)) : 1;
    for (let i = 0; i < runs; i++) { const a = i * (gapEvery + 3.2), b = Math.min(L, a + (gapEvery || L)), m = (a + b) / 2; this.addBox(x1 + dx / L * m, z1 + dz / L * m, 0.35, (b - a) / 2, ry, this.terrainFn(x1 + dx / L * m, z1 + dz / L * m) + h); }
  }
  // stone-lined irrigation channel (axis-aligned): the terrain function should already dip along it
  channel(x1, z1, x2, z2, width = 1.2, level = null) {
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, along = Math.abs(x2 - x1) > Math.abs(z2 - z1), L = along ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const y = level ?? (Math.min(this.terrainFn(x1, z1), this.terrainFn(x2, z2), this.terrainFn(cx, cz)) - 0.15);
    const w = this.engine.addWater(y, { size: along ? [L, width] : [width, L], pos: [cx, cz], ampScale: 0.03 }); w.u.uFoam.value = 0;
    for (const sd of [-1, 1]) { const ox = along ? 0 : sd * (width / 2 + 0.18), oz = along ? sd * (width / 2 + 0.18) : 0; this.S.box(cx + ox, y - 0.5, cz + oz, along ? L : 0.36, 0.72, along ? 0.36 : L, 0xb3a68c); }
    return y;
  }
  // a wooden water-lifting wheel turning in a channel
  waterwheel(x, z, ry = 0, R = 3.2, y = null) {
    const g = new THREE.Group(), S = new Solid(), wood = 0x6a5038; y = y ?? this.terrainFn(x, z) - 0.6;
    for (const sd of [-0.45, 0.45]) { S.add(new THREE.TorusGeometry(R, 0.08, 6, 36), wood, sd, 0, 0, 0, Math.PI / 2, 0); for (let i = 0; i < 12; i++) S.add(new THREE.CylinderGeometry(0.05, 0.05, R * 2, 5), wood, sd, 0, 0, i * Math.PI / 12, 0, 0); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; S.box(0, Math.sin(a) * R - 0.18, Math.cos(a) * R, 1.0, 0.36, 0.3, 0x8a6a48, 0, a); }
    S.cyl(0, 0, 0, 0.18, 0.18, 1.6, 0x4a3828, 8, 0, Math.PI / 2);
    const wheel = S.mesh(MATTE2()); g.add(wheel); g.position.set(x, y + R * 0.75, z); g.rotation.y = ry; this.group.add(g);
    const P = new Solid(); for (const sd of [-0.95, 0.95]) P.box(sd, -R * 0.75 - 0.4, 0, 0.35, R * 0.75 + 0.6, 0.5, 0x8f846c); const posts = P.mesh(MATTE()); g.add(posts);
    this.updaters.push((dt) => { wheel.rotation.x -= dt * 0.35; });
    this.addBox(x, z, 1.2, 0.6, ry, y + R * 2);
    return g;
  }

  // small stones strewn over open ground (no shadows: too small to matter, too many to afford)
  pebbles(n = 7000) {
    const r = this.rand, R = Math.min(this.bounds, this.terrainSize / 2 - 4);
    for (let i = 0, tries = 0; i < n && tries < n * 4; tries++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R, x = (this.cx || 0) + Math.cos(a) * d, z = (this.cz || 0) + Math.sin(a) * d, h = this.terrainFn(x, z);
      if ((this.waterLevel !== null && h < this.waterLevel + 0.3) || this.roadDist(x, z) < 0.5 || this.ground(x, z) > h + 0.05 || this.blocked(x, 1, z)) continue;
      i++; const s = r.range(0.05, 0.22) * (r() < 0.08 ? 2.2 : 1); this._inst('pebble', x, h - s * 0.15, z, s, r() * 6.28, s * r.range(0.6, 1.1));
    }
  }

  // ---- finish: bake static geometry, build instanced vegetation and flames
  finish() {
    if (this.terrainMesh && !this.noPebbles) this.pebbles(this.terrainSize > 1000 ? 9000 : 7000);
    const stat = this.S.mesh(MATTE()); stat.name = 'static'; this.group.add(stat);
    const V = vegGeos(), dummy = new THREE.Object3D();
    const treeMat = windify(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 'tree', 1);
    const rockMat = MATTE();
    const grassMat = windify(new THREE.MeshLambertMaterial({ vertexColors: true }), 'grass', 1);
    for (const kind in this.inst) {
      const list = this.inst[kind], geo = V[kind];
      const mesh = new THREE.InstancedMesh(geo, kind === 'tuft' ? grassMat : (kind === 'rock' || kind === 'pebble') ? rockMat : treeMat, list.length);
      list.forEach((o, i) => { dummy.position.set(o.x, o.y, o.z); dummy.rotation.set(0, o.ry, 0); dummy.scale.set(o.s, o.sy, o.s); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); if (o.color !== null) mesh.setColorAt(i, _c.set(o.color)); });
      mesh.castShadow = kind !== 'tuft' && kind !== 'pebble'; mesh.receiveShadow = true; mesh.frustumCulled = false; this.group.add(mesh);
    }
    for (const k in V) if (!this.inst[k]) V[k].dispose();
    // flames: instanced emissive teardrops that flicker
    const fg = new THREE.ConeGeometry(0.13, 0.5, 7); fg.translate(0, 0.2, 0);
    this.flameMesh = new THREE.InstancedMesh(fg, new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.35, 0.32), fog: false }), Math.max(1, this.flames.length + 24));
    this.flameMesh.count = this.flames.length; this.flameMesh.frustumCulled = false; this.group.add(this.flameMesh);
    this._dummy = dummy;
  }
  update(dt, t) {
    const d = this._dummy; if (!d) return;
    if (this.flameMesh.count !== this.flames.length) this.flameMesh.count = Math.min(this.flames.length, this.flameMesh.instanceMatrix.count);
    const wind = this.engine.env.wind, dark = Math.max(0.1, Math.min(1, 1.35 - this.engine.env.sunInt / 2.4));
    this.flames.forEach((f, i) => {
      if (i >= this.flameMesh.count) return;
      const fl = 0.75 + 0.25 * Math.sin(t * 13 + f.seed) + 0.18 * Math.sin(t * 31 + f.seed * 3);
      if (f.parent) { f.parent.updateWorldMatrix(true, false); d.position.set(f.x, f.y, f.z).applyMatrix4(f.parent.matrixWorld); } else d.position.set(f.x, f.y, f.z);
      const s = f.on ? f.size * (0.85 + 0.3 * fl) : 0.0001; d.scale.set(s, s * (1 + 0.3 * fl), s);
      d.rotation.set(Math.sin(t * 9 + f.seed) * 0.15 + wind * 0.12, 0, Math.cos(t * 7 + f.seed) * 0.15 - wind * 0.1); d.updateMatrix(); this.flameMesh.setMatrixAt(i, d.matrix);
      if (f.light) f.light.intensity = f.on ? f.power * dark * (0.75 + 0.35 * fl) : 0;
    });
    this.flameMesh.instanceMatrix.needsUpdate = true;
    for (const u of this.updaters) u(dt, t);
  }
}

// ---------------------------------------------------------------- Roman merchant ship
export function makeShip({ sail = true, foresail = true, cargo = true } = {}) {
  const L = 24, B = 3.4, deckY = 1.25;
  const beam = (t) => B * Math.pow(Math.sin(Math.PI * Math.min(0.985, Math.max(0.015, t))), 0.55);
  const sheer = (t) => 2.25 + 2.3 * Math.pow(Math.abs(2 * t - 1), 2.6) + (t < 0.5 ? 0.7 * Math.pow(1 - 2 * t, 3) : 0);
  const N = 28, pos = [], col = [], hullC = new THREE.Color(0x5e4530), stripeC = new THREE.Color(0x8a3a26), deckC = new THREE.Color(0x9a7a52), keelC = new THREE.Color(0x2e2620);
  const sect = (t) => { const b = beam(t), z = (t - 0.5) * L, yt = sheer(t); return [[0, -1.7 + 1.4 * Math.pow(Math.abs(2 * t - 1), 3), z], [b * 0.62, -1.25 + 1.2 * Math.pow(Math.abs(2 * t - 1), 3), z], [b * 0.96, -0.2, z], [b, 0.9, z], [b * 1.03, yt - 0.35, z], [b * 1.03, yt, z]]; };
  const quad = (a, b, c, d, c1) => { for (const v of [a, b, c, a, c, d]) { pos.push(v[0], v[1], v[2]); col.push(c1.r, c1.g, c1.b); } };
  for (let i = 0; i < N; i++) {
    const A = sect(i / N), Bq = sect((i + 1) / N);
    for (let k = 0; k < A.length - 1; k++) {
      const c1 = k === 0 ? keelC : k === 3 ? stripeC : hullC;
      quad(A[k], Bq[k], Bq[k + 1], A[k + 1], c1);
      const m = (v) => [-v[0], v[1], v[2]]; quad(m(Bq[k]), m(A[k]), m(A[k + 1]), m(Bq[k + 1]), c1);
    }
    const ba = beam(i / N) * 0.99, bb = beam((i + 1) / N) * 0.99, za = (i / N - 0.5) * L, zb = ((i + 1) / N - 0.5) * L;
    quad([-ba, deckY, za], [ba, deckY, za], [bb, deckY, zb], [-bb, deckY, zb], deckC);
  }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); hg.computeVertexNormals();
  const S = new Solid(); S.add(hg, 0xffffff);
  const wood = 0x6a4e34, dark = 0x3a2c20;
  // stern post with goose-neck, stem post
  for (let i = 0; i < 6; i++) S.cyl(0, 3.6 + i * 0.55, -L / 2 + 0.3 - Math.sin(i * 0.5) * 0.7 + i * 0.1, 0.16 - i * 0.012, 0.18 - i * 0.012, 0.7, 0x7a2e20, 6, -0.4 + i * 0.25);
  S.sphere(0, 6.9, -L / 2 + 0.75, 0.22, 0xc8a040, 1, 0.8, 1.6);
  S.cyl(0, 3.4, L / 2 - 0.3, 0.14, 0.2, 2.2, 0x7a2e20, 6, 0.5);
  // mast, yard, stays
  S.cyl(0, deckY, 1.2, 0.2, 0.28, 13.5, wood, 8); S.cyl(0, deckY + 6.4, 1.2, 0.11, 0.11, 12, wood, 6, 0, Math.PI / 2);
  S.cyl(0, deckY + 13.5, 1.2, 0.3, 0.3, 0.25, dark, 8);
  S.cyl(0, deckY + 1.9, L / 2 - 4.3, 0.1, 0.14, 5.2, wood, 6, 0.55); // artemon mast
  // stern cabin and rails
  S.box(0, deckY, -L / 2 + 4.6, 3.6, 1.9, 3.4, 0x7a5c3c); S.box(0, deckY + 1.9, -L / 2 + 4.6, 4.0, 0.16, 3.8, 0x8a6a44);
  S.box(0, deckY, -L / 2 + 6.33, 0.9, 1.6, 0.08, 0x241a12);
  for (const sd of [-1, 1]) { S.box(sd * 2.5, 0.6, -L / 2 + 3.2, 0.14, 0.14, 6.5, dark, 0, -0.5, 0); S.box(sd * 2.55, -2.1, -L / 2 + 0.9, 0.1, 1.5, 0.6, dark, 0, -0.5, 0); }
  for (let i = 4; i < N - 3; i++) for (const sd of [-1, 1]) if (i % 2 === 0) S.cyl(sd * beam(i / N) * 1.0, sheer(i / N) - 0.1, (i / N - 0.5) * L, 0.05, 0.05, 0.55, dark, 5);
  if (cargo) { S.box(-1.2, deckY, 4.6, 1, 1, 1, 0x8a6a44, 0.2); S.box(1.3, deckY, 5.2, 0.9, 0.9, 0.9, 0x80603c, 0.5); S.box(1.1, deckY, -2.6, 1.1, 0.8, 1.1, 0x8a6a44, 0.1); S.box(-1.4, deckY, -3.2, 0.8, 0.8, 0.8, 0x7a5c3c, 0.7);
    for (let i = 0; i < 5; i++) { const pts = [[0.001, 0], [0.1, 0.05], [0.22, 0.35], [0.2, 0.6], [0.08, 0.8], [0.1, 0.95]].map(p => new THREE.Vector2(p[0], p[1])); S.add(new THREE.LatheGeometry(pts, 8), 0xb06a3c, -0.4 + (i % 3) * 0.45, deckY, 6.6 + Math.floor(i / 3) * 0.45); } }
  const g = new THREE.Group(); const hull = S.mesh(MATTE2()); g.add(hull);
  const clothMat = (c) => windify(new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.16, side: THREE.DoubleSide, roughness: 1 }), 'sail', 1);
  const sails = [];
  if (sail) { const sg = new THREE.PlaneGeometry(11, 9, 14, 12); const m = new THREE.Mesh(sg, clothMat(0xe6dcc0)); m.position.set(0, deckY + 7.9, 1.45); m.castShadow = true; m.receiveShadow = true; g.add(m); sails.push(m); }
  else { S.cyl(0, 0, 0, 0.3, 0.3, 10.5, 0xd8ceb2, 7, 0, Math.PI / 2); const f = S.mesh(MATTE()); f.position.set(0, deckY + 12.0 - 5.25, 1.2); f.position.y = deckY + 12.1; g.add(f); f.geometry.translate(0, -5.25, 0); }
  if (foresail) { const sg = new THREE.PlaneGeometry(4.4, 3.6, 8, 8); const m = new THREE.Mesh(sg, clothMat(0xd8c8a0)); m.position.set(0, deckY + 4.0, L / 2 - 2.6); m.rotation.x = 0.3; m.castShadow = true; g.add(m); sails.push(m); }
  // rigging
  const rp = []; const top = [0, deckY + 13.3, 1.2];
  for (const e of [[0, sheer(0.97), L / 2 - 0.8], [0, sheer(0.05) + 1, -L / 2 + 1.2], [beam(0.4), sheer(0.4), -2], [-beam(0.4), sheer(0.4), -2], [beam(0.62), sheer(0.62), 3], [-beam(0.62), sheer(0.62), 3]]) rp.push(...top, ...e);
  for (const sd of [-1, 1]) rp.push(sd * 5.6, deckY + 12.4, 1.2, sd * beam(0.3), sheer(0.3), -4.5);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  g.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x2a2018 })));
  return {
    group: g, deckY, L, beam, sails, hull, x: 0, z: 0, heading: 0, speed: 0, bob: { y: 0, pitch: 0, roll: 0 },
    // keep a deck-walker inside the bulwarks and out of the cabin and mast
    clampDeck(p) {
      p.z = Math.min(L / 2 - 3.2, Math.max(-L / 2 + 6.9, p.z));
      const b = beam(p.z / L + 0.5) - 0.55; p.x = Math.min(b, Math.max(-b, p.x));
      const dx = p.x, dz = p.z - 1.2, d = Math.hypot(dx, dz); if (d < 0.6 && d > 1e-3) { p.x = dx / d * 0.6; p.z = 1.2 + dz / d * 0.6; }
    },
    // ride the waves: sample the sea under bow, stern and beams
    float(engine, dt, sink = 0) {
      const c = Math.cos(this.heading), s = Math.sin(this.heading), W = (lx, lz) => engine.waterHeight(this.x + lx * c + lz * s, this.z - lx * s + lz * c);
      const hb = W(0, 8), hs = W(0, -8), hp = W(-3, 0), hsb = W(3, 0), y = (hb + hs + hp + hsb) / 4;
      const k = Math.min(1, dt * 2.5); this.bob.y = lerp(this.bob.y, y, k); this.bob.pitch = lerp(this.bob.pitch, Math.atan2(hs - hb, 16), k); this.bob.roll = lerp(this.bob.roll, Math.atan2(hsb - hp, 6) * 0.8, k);
      g.position.set(this.x, this.bob.y + 0.25 - sink, this.z); g.rotation.set(this.bob.pitch, this.heading, this.bob.roll, 'YXZ');
    },
  };
}
