// People and animals: built from simple solids, animated procedurally.
import * as THREE from 'three';
import { Solid, SKIN, lerp } from './world.js';
import { windify, windU } from './engine.js';

const SKINS = [0xc68e68, 0xb97f5a, 0xd29c76, 0xa87050, 0x9a6444, 0xcf9a78];
const HAIRS = [0x1c1612, 0x2a1e14, 0x3a2a1c, 0x14100c, 0x6a6660, 0xb8b4ac];
const ROBES = [0xd8ccb0, 0xb89a70, 0x8a6a4a, 0x9a4a34, 0x5a6a84, 0x6a7a54, 0xc8b490, 0x7a5a6a, 0xe6dcc8, 0xa8845a, 0x4a5a6a, 0x8a7a5a];

const POSES = {
  idle: {}, walk: {},
  sit: { y: -0.56, lL: -1.5, lR: -1.42, aL: -0.85, aR: -0.9, pitch: 0.16 },
  stocks: { y: -0.56, lL: -1.5, lR: -1.5, aL: -0.2, aR: -0.2, pitch: -0.12 },
  kneel: { y: -0.72, lL: 1.5, lR: 1.5, pitch: 0.1 },
  pray: { y: -0.72, lL: 1.5, lR: 1.5, pitch: 0.22, aL: -1.25, aR: -1.25, aLz: -0.5, aRz: 0.5 },
  standPray: { aL: -2.3, aR: -2.3, aLz: 0.5, aRz: -0.5, pitch: -0.06 },
  bow: { y: -0.72, lL: 1.5, lR: 1.5, pitch: 0.95, aL: -2.1, aR: -2.1 },
  fallen: { y: 0.14, pitch: 1.52, aL: -2.6, aR: -2.2, aLz: 0.5, aRz: -0.6 },
  lie: { y: 0.14, pitch: -1.52, aLz: 0.3, aRz: -0.3 },
  raise: { aL: -2.85, aR: -2.85, aLz: 0.3, aRz: -0.3 },
  preach: { aR: -1.9, aRz: -0.35, aL: -0.45 },
  grope: { aL: -1.35, aR: -1.45, pitch: 0.1 },
  hold: { aR: -1.15, aRz: -0.2 },
  lay: { aL: -1.5, aR: -1.5, aLz: -0.15, aRz: 0.15 },
  ride: { lL: -0.75, lR: -0.75, lLz: 0.55, lRz: -0.55, aL: -0.8, aR: -0.8 },
  sword: { aR: -1.7, aRz: -0.2 },
  shake: { aR: -1.5, aRz: -0.5 },
  swim: { pitch: 1.25, y: 0.05, aL: -2.7, aR: -2.7, lL: 0.2, lR: -0.2 },
  carry: { aL: -1.2, aR: -1.2, aLz: -0.2, aRz: 0.2 },
};

export function personLook(r, kind = 'man') {
  const o = { skin: r.pick(SKINS), hair: r.pick(HAIRS), robe: r.pick(ROBES), sash: r.pick([0x6a4a2a, 0x8a3a2a, 0x3a4a6a, 0xc8a050, 0x4a3a2a]), beard: r() < 0.75, head: r() < 0.45 ? 'cloth' : 'bare', long: r() < 0.4, cloak: r() < 0.3 ? r.pick(ROBES) : null, height: r.range(0.94, 1.06) };
  if (kind === 'woman') Object.assign(o, { beard: false, head: 'veil', long: true, cloak: null, height: r.range(0.9, 0.98) });
  if (kind === 'greek') Object.assign(o, { head: 'bare', robe: r.pick([0xece4d2, 0xe0d4bc, 0xd8c8a8, 0xc8d0d8, 0xd8b890]), long: r() < 0.7, cloak: null });
  if (kind === 'soldier') Object.assign(o, { beard: false, head: 'helmet', long: false, robe: 0x8a2c22, armor: true, cloak: null, sash: 0x4a3420, height: 1.03 });
  if (kind === 'centurion') Object.assign(o, { beard: false, head: 'crest', long: false, robe: 0x8a2c22, armor: true, cloak: 0x8a2222, sash: 0x4a3420, height: 1.05 });
  return o;
}
export const PAUL = { skin: 0xc08a62, hair: 0x241a12, robe: 0xcbb68c, sash: 0x5a3c24, beard: true, head: 'bare', bald: true, long: false, cloak: 0x7a4a34, height: 0.98 };

export class Person {
  constructor(look, world) {
    this.look = look; this.world = world;
    const g = this.group = new THREE.Group(), body = this.body = new THREE.Group(); g.add(body);
    const L = look, S = new Solid(), mat = SKIN();
    // torso + head
    if (L.long) S.cyl(0, 0.1, 0, 0.26, 0.31, 0.48, L.robe, 10);
    S.cyl(0, 0.52, 0, 0.2, 0.27, 0.45, L.robe, 10); S.cyl(0, 0.95, 0, 0.21, 0.19, 0.45, L.armor ? 0x9a9c9e : L.robe, 10);
    S.sphere(0, 1.37, 0, 0.2, L.armor ? 0x8c8e90 : L.robe, 1.3, 0.5, 0.82); S.cyl(0, 0.93, 0, 0.215, 0.215, 0.07, L.sash, 10);
    if (L.armor) for (let i = 0; i < 6; i++) S.box(Math.sin(i * 1.05) * 0.2, 0.6, Math.cos(i * 1.05) * 0.2, 0.09, 0.3, 0.03, 0x6a3a22, i * 1.05);
    S.cyl(0, 1.4, 0, 0.05, 0.06, 0.1, L.skin, 7); S.sphere(0, 1.6, 0, 0.125, L.skin, 0.95, 1.08, 1);
    S.box(0, 1.575, 0.118, 0.03, 0.05, 0.035, L.skin); S.sphere(0.045, 1.625, 0.108, 0.017, 0x1a1410, 1, 1, 0.6, 5); S.sphere(-0.045, 1.625, 0.108, 0.017, 0x1a1410, 1, 1, 0.6, 5);
    if (L.beard) S.sphere(0, 1.53, 0.055, 0.088, L.hair, 1, 1.15, 0.8, 8);
    if (L.head === 'bare') { if (L.bald) S.sphere(0, 1.575, -0.04, 0.118, L.hair, 1.02, 0.8, 0.9, 8); else S.sphere(0, 1.635, -0.022, 0.13, L.hair, 1, 0.95, 1, 8); }
    if (L.head === 'cloth') { const c = L.cloth || 0xd8ccb0; S.sphere(0, 1.645, -0.02, 0.143, c, 1, 0.95, 1.02, 8); S.box(0, 1.33, -0.115, 0.27, 0.3, 0.05, c); S.cyl(0, 1.67, -0.01, 0.146, 0.146, 0.035, L.sash, 10); }
    if (L.head === 'veil') { const c = L.cloth || L.robe; S.sphere(0, 1.635, -0.025, 0.148, c, 1.02, 1, 1.05, 8); S.box(0, 1.2, -0.12, 0.34, 0.46, 0.06, c); }
    if (L.head === 'helmet' || L.head === 'crest') { S.sphere(0, 1.655, 0, 0.142, 0x9a9c9e, 1, 0.9, 1.05, 8); S.box(0, 1.53, -0.11, 0.2, 0.12, 0.04, 0x9a9c9e); if (L.head === 'crest') S.box(0, 1.76, 0, 0.3, 0.12, 0.05, 0xa82a22); else S.box(0, 1.77, 0, 0.04, 0.05, 0.16, 0x9a9c9e); }
    if (L.head === 'wreath') { S.sphere(0, 1.635, -0.022, 0.13, L.hair, 1, 0.95, 1, 8); S.add(new THREE.TorusGeometry(0.128, 0.018, 5, 12), 0x5a7a3a, 0, 1.68, 0, Math.PI / 2); }
    if (L.spear) { S.cyl(-0.36, 0, 0.12, 0.018, 0.018, 2.3, 0x5a4028, 5); S.add(new THREE.ConeGeometry(0.04, 0.22, 5), 0xb0b4b8, -0.36, 2.4, 0.12); }
    const torso = S.mesh(mat); body.add(torso);
    // limbs
    const sleeve = L.armor ? L.robe : L.robe;
    this.arms = [1, -1].map((sd) => { const A = new Solid(); A.cyl(0, -0.3, 0, 0.075, 0.066, 0.3, sleeve, 7); A.cyl(0, -0.56, 0, 0.042, 0.048, 0.27, L.skin, 6); A.sphere(0, -0.6, 0, 0.05, L.skin, 1, 1.1, 1, 6); const p = new THREE.Group(); p.position.set(sd * 0.27, 1.38, 0); p.add(A.mesh(mat)); body.add(p); return p; });
    this.legs = [1, -1].map((sd) => { const A = new Solid(); A.cyl(0, -0.84, 0, 0.058, 0.078, 0.84, L.skin, 7); A.box(0, -0.92, 0.05, 0.1, 0.07, 0.25, 0x5a3c24); const p = new THREE.Group(); p.position.set(sd * 0.1, 0.92, 0); p.add(A.mesh(mat)); body.add(p); return p; });
    if (L.cloak) { const cg = new THREE.PlaneGeometry(0.56, 1.0, 4, 6); cg.translate(0, -0.5, 0); const cm = new THREE.Mesh(cg, windify(new THREE.MeshStandardMaterial({ color: L.cloak, side: THREE.DoubleSide, roughness: 1 }), 'cloth', 0.22)); cm.position.set(0, 1.44, -0.2); cm.rotation.x = 0.1; cm.rotation.y = Math.PI; cm.castShadow = true; body.add(cm); const C2 = new Solid(); C2.sphere(0, 1.39, -0.02, 0.21, L.cloak, 1.32, 0.42, 0.9); body.add(C2.mesh(mat)); }
    g.scale.setScalar(L.height || 1);
    this.pose = 'idle'; this.phase = Math.random() * 6; this.speed = 0; this.j = { y: 0, pitch: 0, aL: 0, aR: 0, aLz: 0.08, aRz: -0.08, lL: 0, lR: 0, lLz: 0, lRz: 0 };
    this.path = null; this.follow = null; this.yaw = 0; this.name = look.name || ''; this.auto = true; this.tremble = 0; this.rad = 0.35;
    this.pos = g.position;
  }
  place(x, z, yaw = this.yaw) { this.pos.set(x, this.world ? this.world.ground(x, z) : 0, z); this.yaw = yaw; this.group.rotation.y = yaw; return this; }
  setPose(p) { this.pose = p; return this; }
  faceTo(x, z) { this.yaw = Math.atan2(x - this.pos.x, z - this.pos.z); return this; }
  // walk along waypoints [[x,z],...]; resolves on arrival
  walk(points, speed = 1.6) { if (typeof points[0] === 'number') points = [points]; return new Promise((res) => { this.path = { pts: points.map(p => [p[0], p[1]]), speed, res }; this.follow = null; }); }
  stop() { if (this.path) { const r = this.path.res; this.path = null; r(); } this.follow = null; this.speed = 0; }
  update(dt, t) {
    const j = this.j, g = this.group;
    if (this.auto) {
      let tx = null, tz = null, spd = 0;
      if (this.path) { const p = this.path.pts[0]; tx = p[0]; tz = p[1]; spd = this.path.speed; if (Math.hypot(tx - this.pos.x, tz - this.pos.z) < 0.25) { this.path.pts.shift(); if (!this.path.pts.length) { const r = this.path.res; this.path = null; r(); } tx = null; } }
      else if (this.follow) {
        const f = this.follow, tp = f.target.pos || f.target.position, a = (f.target.yaw ?? 0) + (f.angle ?? Math.PI);
        const gx = tp.x + Math.sin(a) * f.dist + (f.side || 0) * Math.cos(a), gz = tp.z + Math.cos(a) * f.dist - (f.side || 0) * Math.sin(a), d = Math.hypot(gx - this.pos.x, gz - this.pos.z);
        if (d > (f.slack ?? 0.9)) { tx = gx; tz = gz; spd = Math.min(f.max ?? 7, 1.2 + d * 1.3); } else if (f.faceTarget) this.faceTo(tp.x, tp.z);
      }
      if (tx !== null) {
        const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz) || 1, step = Math.min(d, spd * dt);
        this.pos.x += dx / d * step; this.pos.z += dz / d * step; this.yaw = Math.atan2(dx, dz); this.speed = spd;
        if (this.world && !this.fixedY) this.pos.y = lerp(this.pos.y, this.world.ground(this.pos.x, this.pos.z, this.pos.y + 0.5), Math.min(1, dt * 12));
      } else this.speed = 0;
      let dy = this.yaw - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, dt * 8);
    }
    const P = POSES[this.pose] || POSES.idle, k = Math.min(1, dt * 7);
    let T = { y: 0, pitch: 0, aL: 0, aR: 0, aLz: 0.08, aRz: -0.08, lL: 0, lR: 0, lLz: 0, lRz: 0 }; Object.assign(T, P);
    if (this.speed > 0.05 && (this.pose === 'idle' || this.pose === 'walk' || this.pose === 'grope' || this.pose === 'hold' || this.pose === 'carry')) {
      this.phase += dt * (2.2 + this.speed * 1.35); const sw = Math.sin(this.phase) * Math.min(0.75, 0.3 + this.speed * 0.075);
      T.lL = sw; T.lR = -sw; if (this.pose === 'idle' || this.pose === 'walk') { T.aL = -sw * 0.8; T.aR = sw * 0.8; }
      T.y = Math.abs(Math.cos(this.phase)) * 0.04; T.pitch += this.speed > 4.6 ? 0.16 : 0.03;
    } else if (this.pose === 'idle') { T.pitch = Math.sin(t * 1.3 + this.phase) * 0.012; T.aL = Math.sin(t * 1.1 + this.phase) * 0.03; }
    if (this.pose === 'preach') { T.aR += Math.sin(t * 2.1) * 0.35; T.aL += Math.sin(t * 1.3) * 0.2; }
    if (this.pose === 'raise') { T.aL += Math.sin(t * 5 + this.phase) * 0.18; T.aR += Math.cos(t * 5.4 + this.phase) * 0.18; T.y = Math.abs(Math.sin(t * 4 + this.phase)) * 0.05; }
    if (this.pose === 'grope') { T.aL += Math.sin(t * 1.7) * 0.25; T.aR += Math.cos(t * 1.4) * 0.25; }
    if (this.pose === 'swim') { T.aL += Math.sin(t * 4) * 0.7; T.aR -= Math.sin(t * 4) * 0.7; T.lL += Math.sin(t * 6) * 0.35; T.lR -= Math.sin(t * 6) * 0.35; }
    if (this.pose === 'shake') { T.aR += Math.sin(t * 22) * 0.5; }
    for (const key in T) j[key] += (T[key] - j[key]) * k;
    const tr = this.tremble ? Math.sin(t * 38) * 0.012 * this.tremble : 0;
    this.body.position.y = j.y; this.body.position.x = tr; this.body.rotation.x = j.pitch;
    this.arms[0].rotation.set(j.aL, 0, j.aLz); this.arms[1].rotation.set(j.aR, 0, j.aRz);
    this.legs[0].rotation.set(j.lL, 0, j.lLz); this.legs[1].rotation.set(j.lR, 0, j.lRz);
  }
}

// horses and oxen
export class Beast {
  constructor(kind = 'horse', color = 0x6a4a30, world = null) {
    this.kind = kind; this.world = world; const g = this.group = new THREE.Group(), body = this.body = new THREE.Group(); g.add(body);
    const S = new Solid(), mat = SKIN(), ox = kind === 'ox', dark = new THREE.Color(color).multiplyScalar(0.55).getHex();
    const by = ox ? 1.0 : 1.22, len = ox ? 1.0 : 0.95;
    S.sphere(0, by, 0, 0.5, color, ox ? 0.95 : 0.72, ox ? 0.9 : 0.78, len * 2, 10);
    if (ox) { S.cyl(0, by - 0.1, 0.85, 0.24, 0.3, 0.6, color, 8, 1.2); S.box(0, by - 0.05, 1.25, 0.36, 0.36, 0.5, color); S.box(0, by - 0.12, 1.5, 0.26, 0.22, 0.2, 0x3a2c24);
      for (const sd of [-1, 1]) S.add(new THREE.ConeGeometry(0.045, 0.4, 6), 0xe8e0c8, sd * 0.26, by + 0.3, 1.2, 0, 0, -sd * 0.9);
      S.add(new THREE.TorusGeometry(0.34, 0.07, 6, 14), 0xc84a5a, 0, by + 0.02, 0.8, 0.25); S.add(new THREE.TorusGeometry(0.36, 0.045, 5, 14), 0x6a9a3a, 0, by + 0.02, 0.86, 0.25);
    } else { S.cyl(0, by + 0.1, 0.75, 0.15, 0.26, 0.95, color, 8, 0.75); S.box(0, by + 0.82, 1.32, 0.2, 0.25, 0.6, color, 0, 0.5); S.box(0, by + 0.63, 1.58, 0.16, 0.16, 0.2, dark, 0, 0.5);
      for (const sd of [-1, 1]) S.add(new THREE.ConeGeometry(0.04, 0.14, 4), color, sd * 0.07, by + 1.14, 1.12);
      S.box(0, by + 0.42, 0.72, 0.06, 0.75, 0.28, dark, 0, 0.75); S.box(0, by + 0.34, 0, 0.78, 0.06, 0.8, 0x8a2c22); S.box(0, by + 0.38, 0, 0.5, 0.06, 0.6, 0x5a3c24); }
    S.cyl(0, by - 0.4, -len - 0.08, 0.03, 0.06, 0.85, dark, 5, -0.35);
    body.add(S.mesh(mat));
    const lh = ox ? 0.8 : 1.02;
    this.legs = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => { const A = new Solid(); A.cyl(0, -lh, 0, ox ? 0.07 : 0.05, ox ? 0.1 : 0.085, lh, color, 6); A.cyl(0, -lh - 0.02, 0, 0.07, 0.065, 0.1, 0x1c1612, 6); const p = new THREE.Group(); p.position.set(sx * 0.2, lh + 0.05, sz * len * 0.72); p.add(A.mesh(mat)); body.add(p); return p; });
    this.phase = Math.random() * 6; this.speed = 0; this.pos = g.position; this.yaw = 0; this.seatY = by + 0.42;
  }
  update(dt, t) {
    this.phase += dt * (1.5 + this.speed * 1.1); const amp = this.speed > 0.1 ? Math.min(0.7, 0.25 + this.speed * 0.06) : 0, s = Math.sin(this.phase) * amp, gallop = this.speed > 6;
    this.legs[0].rotation.x = s; this.legs[1].rotation.x = gallop ? s * 0.9 : -s; this.legs[2].rotation.x = gallop ? -s : -s; this.legs[3].rotation.x = gallop ? -s * 0.9 : s;
    this.body.position.y = Math.abs(Math.cos(this.phase)) * amp * 0.09; this.body.rotation.x = gallop ? Math.sin(this.phase) * 0.05 : 0;
  }
}

// a distant multitude: one instanced mesh, bobbing in the vertex shader
export function makeCrowd(list, excite = 0.4) {
  const S = new Solid(); S.cyl(0, 0, 0, 0.17, 0.3, 1.38, 0xffffff, 7); S.sphere(0, 1.36, 0, 0.19, 0xffffff, 1.3, 0.5, 0.85, 7); S.sphere(0, 1.6, 0, 0.125, 0xd8a078, 1, 1.05, 1, 7); S.sphere(0, 1.64, -0.03, 0.128, 0x40342c, 1, 0.95, 1, 6);
  S.cyl(0.26, 1.32, 0, 0.05, 0.06, 0.55, 0xffffff, 5, 0, -0.25); S.cyl(-0.26, 1.32, 0, 0.05, 0.06, 0.55, 0xffffff, 5, 0, 0.25);
  const u = { uExcite: { value: excite } };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (sh) => { sh.uniforms.uTime = windU.uTime; sh.uniforms.uExcite = u.uExcite;
    sh.vertexShader = 'uniform float uTime; uniform float uExcite;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float cph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
      transformed.y += abs(sin(uTime * (2.5 + fract(cph) * 2.0) + cph)) * 0.16 * uExcite;
      if (abs(position.x) > 0.2 && position.y > 1.2) transformed.y += (0.25 + 0.2 * sin(uTime * 6.0 + cph)) * uExcite * step(0.5, fract(cph * 0.37));`); };
  const mesh = new THREE.InstancedMesh(S.geometry(), mat, list.length), d = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((o, i) => { d.position.set(o.x, o.y, o.z); d.rotation.y = o.ry || 0; d.scale.setScalar(o.s || 1); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); mesh.setColorAt(i, c.set(o.color || ROBES[i % ROBES.length])); });
  mesh.castShadow = list.length < 400; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.userData.u = u; return mesh;
}
