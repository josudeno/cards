// People and animals: built from simple solids, animated procedurally.
import * as THREE from 'three';
import { Solid, SKIN, lerp } from './world.js';
import { windify, windU } from './engine.js';

const SKINS = [0xc68e68, 0xb97f5a, 0xd29c76, 0xa87050, 0x9a6444, 0xcf9a78];
const HAIRS = [0x1c1612, 0x2a1e14, 0x3a2a1c, 0x14100c, 0x6a6660, 0xb8b4ac];
const ROBES = [0xd8ccb0, 0xb89a70, 0x8a6a4a, 0x9a4a34, 0x5a6a84, 0x6a7a54, 0xc8b490, 0x7a5a6a, 0xe6dcc8, 0xa8845a, 0x4a5a6a, 0x8a7a5a];

// joint targets: hips (lL,lR), knees (kL,kR), shoulders (aL,aR + aLz,aRz), elbows (eL,eR), body height y, pitch, head nod (hx)
const POSES = {
  idle: {}, walk: {},
  sit: { y: -0.6, lL: -1.2, lR: -1.1, kL: 1.9, kR: 1.75, aL: -0.75, aR: -0.7, eL: -0.6, eR: -0.7, pitch: 0.14 },
  stocks: { y: -0.84, lL: -1.5, lR: -1.5, aL: 0.25, aR: 0.25, eL: -0.2, eR: -0.2, pitch: -0.1 },
  stocksPray: { y: -0.84, lL: -1.5, lR: -1.5, aL: -1.5, aR: -1.5, aLz: 0.5, aRz: -0.5, eL: -1.0, eR: -1.0, hx: -0.3 },
  kneel: { y: -0.43, kL: 1.57, kR: 1.57, pitch: 0.08, eL: -0.3, eR: -0.3 },
  pray: { y: -0.43, kL: 1.57, kR: 1.57, pitch: 0.2, aL: -0.75, aR: -0.75, aLz: -0.28, aRz: 0.28, eL: -1.75, eR: -1.75, hx: 0.35 },
  standPray: { aL: -1.5, aR: -1.5, aLz: 0.55, aRz: -0.55, eL: -1.0, eR: -1.0, pitch: -0.05, hx: -0.3 },
  bow: { y: -0.62, lL: -1.9, lR: -1.9, kL: 2.5, kR: 2.5, pitch: 1.1, aL: -2.3, aR: -2.3, eL: -0.3, eR: -0.3, hx: 0.3 },
  fallen: { y: 0.16, pitch: 1.5, aL: -2.6, aR: -2.2, aLz: 0.5, aRz: -0.6, eL: -0.8, eR: -0.5, kL: 0.3 },
  lie: { y: 0.16, pitch: -1.5, aLz: 0.3, aRz: -0.3, kR: 0.25 },
  raise: { aL: -2.75, aR: -2.75, aLz: 0.3, aRz: -0.3, eL: -0.25, eR: -0.25, hx: -0.15 },
  preach: { aR: -1.25, aRz: -0.3, eR: -0.9, aL: -0.35, eL: -0.7 },
  grope: { aL: -1.25, aR: -1.35, eL: -0.3, eR: -0.25, pitch: 0.1, hx: -0.1 },
  hold: { aR: -1.0, aRz: -0.15, eR: -0.5 },
  lay: { aL: -1.35, aR: -1.35, aLz: -0.12, aRz: 0.12, eL: -0.25, eR: -0.25, hx: 0.25 },
  ride: { lL: -1.0, lR: -1.0, lLz: 0.5, lRz: -0.5, kL: 1.15, kR: 1.15, aL: -0.55, aR: -0.55, eL: -0.9, eR: -0.9 },
  sword: { aR: -1.3, aRz: -0.2, eR: -1.2 },
  shake: { aR: -1.3, aRz: -0.5, eR: -0.6 },
  swim: { pitch: 1.25, y: 0.05, aL: -2.7, aR: -2.7, lL: 0.2, lR: -0.2 },
  carry: { aL: -0.7, aR: -0.7, aLz: -0.15, aRz: 0.15, eL: -1.3, eR: -1.3 },
  work: { aL: -0.9, aR: -0.9, eL: -1.1, eR: -1.1, pitch: 0.18, hx: 0.3 },
};
const J0 = { y: 0, pitch: 0, hx: 0, aL: 0, aR: 0, aLz: 0.07, aRz: -0.07, eL: -0.22, eR: -0.22, lL: 0, lR: 0, lLz: 0, lRz: 0, kL: 0, kR: 0 };

export function personLook(r, kind = 'man') {
  const o = { skin: r.pick(SKINS), hair: r.pick(HAIRS), robe: r.pick(ROBES), sash: r.pick([0x6a4a2a, 0x8a3a2a, 0x3a4a6a, 0xc8a050, 0x4a3a2a]), beard: r() < 0.75, head: r() < 0.45 ? 'cloth' : 'bare', long: r() < 0.4, cloak: r() < 0.35 ? r.pick(ROBES) : null, height: r.range(0.94, 1.06), build: r.range(0.92, 1.1) };
  if (kind === 'woman') Object.assign(o, { beard: false, head: 'veil', long: true, cloak: null, height: r.range(0.9, 0.98), build: r.range(0.85, 0.95), woman: true });
  if (kind === 'greek') Object.assign(o, { head: 'bare', robe: r.pick([0xece4d2, 0xe0d4bc, 0xd8c8a8, 0xc8d0d8, 0xd8b890]), long: r() < 0.7, cloak: r() < 0.5 ? r.pick([0xb8a888, 0x8a5a4a, 0x5a6a84, 0xd8ccb0]) : null });
  if (kind === 'soldier') Object.assign(o, { beard: false, head: 'helmet', long: false, robe: 0x8a2c22, armor: true, cloak: null, sash: 0x4a3420, height: 1.03, build: 1.08 });
  if (kind === 'centurion') Object.assign(o, { beard: false, head: 'crest', long: false, robe: 0x8a2c22, armor: true, cloak: 0x8a2222, sash: 0x4a3420, height: 1.05, build: 1.1 });
  return o;
}
export const PAUL = { skin: 0xbd8862, hair: 0x3d2c1e, robe: 0xd2c19a, sash: 0x5a3c24, beard: true, head: 'bare', bald: true, long: false, cloak: 0x7c4630, height: 0.98, build: 1, bag: true };

const shade = (hex, k) => { const c = new THREE.Color(hex); return c.multiplyScalar(k).getHex(); };
// a draped garment: lathe profile [y, radius], flattened front-to-back, with folds that deepen toward the hem
function robeGeo(profile, color, sx, sz, foldAmp, foldN = 9) {
  const seg = 22, pos = [], col = [], idx = [], c = new THREE.Color(color), y0 = profile[0][0], y1 = profile[profile.length - 1][0];
  profile.forEach(([y, r], j) => { const t = 1 - (y - y0) / (y1 - y0), fa = foldAmp * Math.pow(Math.max(0, t), 1.4);
    for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, f = Math.sin(a * foldN + y * 2.2 + Math.sin(a * 3) * 1.3), rr = r * (1 + fa * f);
      pos.push(Math.cos(a) * rr * sx, y, Math.sin(a) * rr * sz); const k = (0.86 + 0.14 * (1 - t)) * (1 - fa * 1.6 * (0.5 - 0.5 * f)); col.push(c.r * k, c.g * k, c.b * k); } });
  for (let j = 0; j < profile.length - 1; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + seg + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function headGeo(r, jaw = 0.3) { // skull with a tapering jaw and chin
  const g = new THREE.SphereGeometry(r, 22, 18), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i) / r, y = p.getY(i) / r, z = p.getZ(i) / r; x *= 0.84; if (y < 0) { x *= 1 - jaw * Math.pow(-y, 1.3); if (z > 0) z *= 1 - 0.12 * -y; else z *= 1 - 0.3 * -y; } if (z > 0 && y > -0.2 && y < 0.35) z *= 0.96; y *= 1.16; p.setXYZ(i, x * r, y * r, z * r); }
  g.computeVertexNormals(); return g;
}
// tapered limb segment hanging from the origin down to -len, rounded at both joints
function limb(S, len, r0, r1, color, color2 = color, split = 1) {
  S.sphere(0, 0, 0, r0, color, 1, 1, 1, 10); S.cyl(0, -len * split, 0, lerp(r0, r1, split), r0, len * split, color, 10);
  if (split < 1) S.cyl(0, -len, 0, r1, lerp(r0, r1, split), len * (1 - split), color2, 10);
  S.sphere(0, -len, 0, r1, color2, 1, 1, 1, 8);
}

export class Person {
  constructor(look, world) {
    this.look = look; this.world = world;
    const g = this.group = new THREE.Group(), body = this.body = new THREE.Group(); g.add(body);
    const L = look, mat = SKIN(), B = L.build || 1, W = L.woman, skin = L.skin, skinD = shade(skin, 0.86), robe = L.robe, sh = 0.2 * B * (W ? 0.9 : 1);
    // ---- torso and garment
    const T = new Solid();
    const hem = L.long ? [[0.07, 0.3], [0.2, 0.275], [0.38, 0.25]] : L.armor ? [[0.56, 0.25]] : [[0.47, 0.262]];
    const prof = [...hem, [0.62, 0.228], [0.8, 0.196], [0.93, W ? 0.158 : 0.172], [1.05, 0.182], [1.2, W ? 0.196 : 0.205], [1.32, 0.212], [1.4, 0.19], [1.455, 0.075]].map(([y, r]) => [y, r * B]);
    T.add(robeGeo(prof, robe, 1.0, 0.7, L.long ? 0.075 : 0.06), robe);
    T.add(new THREE.TorusGeometry(0.168 * B, 0.022, 6, 18), L.sash, 0, 0.945, 0, Math.PI / 2, 0, 0, 1.02, 1, 0.72);
    if (L.armor) { for (let i = 0; i < 5; i++) T.add(new THREE.CylinderGeometry(0.2 * B, 0.205 * B, 0.085, 16), i % 2 ? 0x8f9296 : 0xa4a8ac, 0, 1.0 + i * 0.082, 0, 0, 0, 0, 1, 1, 0.74);
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) T.sphere(sd * (0.2 + k * 0.012) * B, 1.4 - k * 0.035, 0, 0.085, k % 2 ? 0x8f9296 : 0xa4a8ac, 1, 0.45, 1, 10);
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; T.box(Math.cos(a) * 0.2 * B, 0.66, Math.sin(a) * 0.2 * B * 0.74, 0.085, 0.27, 0.02, i % 2 ? 0x6a3a22 : 0x7a4a2a, -a + Math.PI / 2); } T.box(0, 0.91, 0.15 * B, 0.07, 0.07, 0.02, 0xc8a050); }
    if (L.cloak && !L.armor) { // mantle draped from the left shoulder across the chest
      T.add(new THREE.TorusGeometry(0.2 * B, 0.052, 8, 20), L.cloak, -0.01, 1.17, 0, 0, 0, 0.82, 1.05, 1.32, 0.78); T.sphere(sh * 0.95, 1.41, 0, 0.1, L.cloak, 1.15, 0.6, 1.1, 10); T.add(robeGeo([[0.62, 0.11], [0.9, 0.1], [1.2, 0.085], [1.42, 0.05]], shade(L.cloak, 0.95), 1, 0.5, 0.12, 5), L.cloak, sh * 0.72, 0, -0.1 * B); }
    if (L.cloak && L.armor) T.sphere(0, 1.42, -0.05, 0.2 * B, L.cloak, 1.1, 0.35, 0.8, 10);
    if (L.bag) { T.box(0.02, 0.95, 0.0, 0.035, 0.62, 0.012, 0x4a3420, 0, 0, 0.72); T.box(0.02, 0.95, 0, 0.012, 0.62, 0.3 * B, 0x4a3420, 0, 0, 0.72); T.box(-0.215 * B, 0.74, 0.02, 0.07, 0.2, 0.22, 0x6a4a2a); T.box(-0.225 * B, 0.86, 0.02, 0.075, 0.09, 0.23, 0x5a3c24); }
    if (L.spear) { T.cyl(-0.4, 0, 0.14, 0.017, 0.017, 2.25, 0x5a4028, 6); T.add(new THREE.ConeGeometry(0.035, 0.24, 6), 0xb8bcc0, -0.4, 2.36, 0.14); }
    T.cyl(0, 1.43, 0.005, 0.047, 0.056, 0.12, skinD, 10);
    body.add(T.mesh(mat));
    // ---- head
    const hd = this.head = new THREE.Group(); hd.position.set(0, 1.535, 0.008); body.add(hd);
    const H = new Solid(), hr = 0.108, hair = L.hair;
    H.add(headGeo(hr, W ? 0.36 : 0.3), skin, 0, 0.085, 0);
    for (const sd of [-1, 1]) { H.sphere(sd * 0.036, 0.097, 0.083, 0.017, 0xf2ece0, 1.15, 0.72, 0.6, 8); H.sphere(sd * 0.036, 0.097, 0.092, 0.0095, 0x2a1c12, 1, 1, 0.5, 6); H.box(sd * 0.037, 0.119, 0.092, 0.042, 0.009, 0.014, shade(hair, 0.9), 0, 0, -sd * 0.12); H.sphere(sd * 0.094, 0.085, -0.004, 0.024, skinD, 0.45, 1, 0.7, 8); H.sphere(sd * 0.036, 0.106, 0.084, 0.019, skinD, 1.2, 0.5, 0.55, 8); }
    H.sphere(0, 0.082, 0.1, 0.014, skinD, 0.85, 1.9, 1, 8); H.sphere(0, 0.062, 0.111, 0.0155, skin, 1.1, 0.85, 0.9, 8); H.box(0, 0.027, 0.094, 0.042, 0.007, 0.012, shade(skin, 0.62));
    if (L.beard) { H.sphere(0, -0.002, 0.02, 0.074, hair, 1.0, 0.9, 1.05, 12); H.sphere(0, -0.048, 0.046, 0.038, hair, 0.95, 1.1, 0.9, 10); H.box(0, 0.04, 0.097, 0.058, 0.015, 0.02, hair); for (const sd of [-1, 1]) H.sphere(sd * 0.078, 0.06, 0.018, 0.03, hair, 0.5, 1.5, 1, 8); }
    const cap = (r, th, col, sx = 0.9, sy = 1.18, tilt = -0.42, y = 0.092) => H.add(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, th), col, 0, y, -0.004, tilt, 0, 0, sx, sy, 1.02);
    if (L.head === 'bare' || L.head === 'wreath') { if (L.bald) H.add(new THREE.SphereGeometry(hr + 0.007, 18, 8, Math.PI / 2 + 1.05, Math.PI * 2 - 2.1, 0.95, 1.05), hair, 0, 0.088, -0.006, 0, 0, 0, 0.9, 1.1, 1.02); else { cap(hr + 0.007, 1.32, hair, 0.9, 1.18, -0.6); if (!L.beard || W) H.sphere(0, 0.06, -0.05, 0.085, hair, 0.95, 1.2, 0.8, 10); } }
    if (L.head === 'wreath') H.add(new THREE.TorusGeometry(0.1, 0.014, 5, 16), 0x5f7f3a, 0, 0.15, -0.01, Math.PI / 2 - 0.3, 0, 0, 0.92, 1, 1);
    if (L.head === 'cloth') { const c = L.cloth || 0xd8ccb0; cap(hr + 0.013, 1.62, c, 0.93, 1.2, -0.5); H.add(robeGeo([[-0.12, 0.13], [-0.02, 0.118], [0.1, 0.105]], c, 1, 0.75, 0.1, 6), c, 0, 0, -0.035); H.add(new THREE.TorusGeometry(0.108, 0.011, 5, 16), L.sash, 0, 0.165, -0.012, Math.PI / 2 - 0.32, 0, 0, 0.92, 1, 1.05); }
    if (L.head === 'veil') { const c = L.cloth || shade(robe, 1.08); cap(hr + 0.015, 1.7, c, 0.95, 1.2, -0.42); H.add(robeGeo([[-0.36, 0.2], [-0.2, 0.17], [-0.04, 0.13], [0.1, 0.105]], c, 1, 0.72, 0.1, 6), c, 0, 0, -0.045); }
    if (L.head === 'helmet' || L.head === 'crest') { const st = 0xa2a6aa; cap(hr + 0.014, 1.5, st, 0.94, 1.18, -0.2); H.box(0, 0.0, -0.105, 0.19, 0.03, 0.09, st, 0, 0.5); for (const sd of [-1, 1]) H.box(sd * 0.086, 0.045, 0.04, 0.012, 0.11, 0.075, st); H.box(0, 0.135, 0.105, 0.17, 0.02, 0.03, 0xc8a050);
      if (L.head === 'crest') { H.box(0, 0.24, 0, 0.3, 0.085, 0.035, 0xa82a22); H.box(0, 0.215, 0, 0.26, 0.03, 0.04, st); } else H.sphere(0, 0.225, -0.01, 0.018, st); }
    hd.add(H.mesh(mat));
    // ---- arms: shoulder pivot -> upper arm, elbow pivot -> forearm and hand
    const slv = L.armor ? robe : robe, ua = 0.285, fa = 0.25;
    this.arms = []; this.hands = [];
    for (const sd of [1, -1]) { const U = new Solid(); limb(U, ua, 0.056 * B, 0.048 * B, slv, L.armor ? skin : slv, L.armor ? 0.45 : 1); const p = new THREE.Group(); p.position.set(sd * sh * 0.97, 1.375, 0); p.add(U.mesh(mat));
      const F = new Solid(); limb(F, fa, 0.047 * B, 0.036, L.long || L.cloak ? slv : skin, skin, L.long ? 0.55 : 0.0001); F.sphere(0, -fa - 0.055, 0.005, 0.04, skin, 0.5, 1.3, 0.95, 8); F.sphere(sd * -0.02, -fa - 0.03, 0.025, 0.016, skin, 1, 1.6, 1, 6); if (L.armor) F.cyl(0, -fa + 0.02, 0, 0.042, 0.05, 0.12, 0x5a3c24, 8);
      const e = new THREE.Group(); e.position.y = -ua; e.add(F.mesh(mat)); p.add(e); body.add(p); this.arms.push(p); this.hands.push(e); }
    // ---- legs: hip pivot -> thigh, knee pivot -> shin and sandalled foot
    const th = 0.46, sn = 0.42, legC = L.long ? shade(robe, 0.9) : skin; this.legs = []; this.knees = [];
    for (const sd of [1, -1]) { const U = new Solid(); limb(U, th, 0.085 * B, 0.058 * B, L.long ? legC : shade(robe, 0.92), legC, L.long ? 1 : 0.35); const p = new THREE.Group(); p.position.set(sd * 0.092 * B, 0.93, 0); p.add(U.mesh(mat));
      const F = new Solid(); limb(F, sn, 0.056 * B, 0.036, legC, skin, L.long ? 0.8 : 0.0001); F.sphere(0, -sn - 0.03, 0.055, 0.05, skin, 0.8, 0.5, 1.9, 8); F.box(0, -sn - 0.065, 0.055, 0.092, 0.018, 0.25, 0x4a3420); F.box(0, -sn - 0.03, 0.09, 0.094, 0.012, 0.02, 0x4a3420); F.box(0, -sn - 0.012, 0.0, 0.085, 0.012, 0.085, 0x4a3420); if (L.armor) F.cyl(0, -sn + 0.04, 0.012, 0.04, 0.052, 0.3, 0x9a9ea2, 8);
      const k = new THREE.Group(); k.position.y = -th; k.add(F.mesh(mat)); p.add(k); body.add(p); this.legs.push(p); this.knees.push(k); }
    if (L.cloak) { const w = L.armor ? 0.5 : 0.36, cg = new THREE.PlaneGeometry(w, L.armor ? 1.05 : 0.9, 5, 8); cg.translate(0, L.armor ? -0.52 : -0.45, 0); const cm = new THREE.Mesh(cg, windify(new THREE.MeshStandardMaterial({ color: L.cloak, side: THREE.DoubleSide, roughness: 1 }), 'cloth', 0.2)); cm.position.set(L.armor ? 0 : sh * 0.55, 1.43, -0.155 * B); cm.rotation.x = 0.08; cm.rotation.y = Math.PI; cm.castShadow = true; body.add(cm); }
    g.scale.setScalar(L.height || 1);
    this.pose = 'idle'; this.phase = Math.random() * 6; this.speed = 0; this.j = { ...J0 };
    this.path = null; this.follow = null; this.yaw = 0; this.name = look.name || ''; this.auto = true; this.tremble = 0; this.rad = 0.35; this.lookAt = null; this.headYaw = 0;
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
    const P = POSES[this.pose] || POSES.idle, k = Math.min(1, dt * 7), T = { ...J0, ...P }, upright = this.pose === 'idle' || this.pose === 'walk' || this.pose === 'grope' || this.pose === 'hold' || this.pose === 'carry';
    if (this.speed > 0.05 && upright) {
      const run = this.speed > 4.6, amp = Math.min(this.look.long ? 0.5 : 0.85, 0.32 + this.speed * 0.085);
      this.phase += dt * (2.4 + this.speed * 1.25); const s = Math.sin(this.phase), c = Math.cos(this.phase);
      T.lL = s * amp - (run ? 0.15 : 0.04); T.lR = -s * amp - (run ? 0.15 : 0.04);
      T.kL = Math.max(0, -c) * (run ? 1.5 : 0.95) + 0.08; T.kR = Math.max(0, c) * (run ? 1.5 : 0.95) + 0.08; // the knee folds as the leg swings forward
      if (this.pose === 'idle' || this.pose === 'walk') { T.aL = -s * amp * 0.75; T.aR = s * amp * 0.75; T.eL = run ? -1.25 : -0.3 - Math.max(0, -s) * 0.35; T.eR = run ? -1.25 : -0.3 - Math.max(0, s) * 0.35; }
      T.y = Math.abs(c) * (run ? 0.06 : 0.035) - 0.02; T.pitch += run ? 0.2 : 0.045;
    } else if (this.pose === 'idle') { const b = Math.sin(t * 1.25 + this.phase); T.pitch = b * 0.012; T.aLz = 0.07 + b * 0.012; T.aRz = -0.07 - b * 0.012; T.y = b * 0.004; T.hx = Math.sin(t * 0.37 + this.phase * 2) * 0.05; }
    if (this.pose === 'preach') { T.aR += Math.sin(t * 2.1) * 0.3; T.eR += Math.sin(t * 2.9 + 1) * 0.35; T.aL += Math.sin(t * 1.3) * 0.15; T.eL += Math.sin(t * 1.7) * 0.25; }
    if (this.pose === 'raise') { T.aL += Math.sin(t * 5 + this.phase) * 0.18; T.aR += Math.cos(t * 5.4 + this.phase) * 0.18; T.y = Math.abs(Math.sin(t * 4 + this.phase)) * 0.05; }
    if (this.pose === 'grope') { T.aL += Math.sin(t * 1.7) * 0.25; T.aR += Math.cos(t * 1.4) * 0.25; }
    if (this.pose === 'swim') { T.aL += Math.sin(t * 4) * 0.7; T.aR -= Math.sin(t * 4) * 0.7; T.lL += Math.sin(t * 6) * 0.35; T.lR -= Math.sin(t * 6) * 0.35; T.kL = 0.3 + Math.sin(t * 6) * 0.3; T.kR = 0.3 - Math.sin(t * 6) * 0.3; }
    if (this.pose === 'shake') { T.aR += Math.sin(t * 22) * 0.4; T.eR += Math.sin(t * 26) * 0.5; }
    if (this.pose === 'work') { T.aR += Math.sin(t * 5) * 0.2; T.eR += Math.sin(t * 5) * 0.4; T.eL += Math.cos(t * 2.5) * 0.15; }
    for (const key in T) j[key] += (T[key] - j[key]) * k;
    const tr = this.tremble ? Math.sin(t * 38) * 0.012 * this.tremble : 0;
    this.body.position.y = j.y; this.body.position.x = tr; this.body.rotation.x = j.pitch;
    this.arms[0].rotation.set(j.aL, 0, j.aLz); this.arms[1].rotation.set(j.aR, 0, j.aRz); this.hands[0].rotation.x = j.eL; this.hands[1].rotation.x = j.eR;
    this.legs[0].rotation.set(j.lL, 0, j.lLz); this.legs[1].rotation.set(j.lR, 0, j.lRz); this.knees[0].rotation.x = j.kL; this.knees[1].rotation.x = j.kR;
    // the head turns toward whoever this person is attending to
    let hy = 0; const la = this.lookAt; if (la && upright) { const p = la.pos || la; const a = Math.atan2(p.x - this.pos.x, p.z - this.pos.z) - g.rotation.y, d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z); if (d < 5) hy = Math.max(-1.1, Math.min(1.1, Math.atan2(Math.sin(a), Math.cos(a)))); }
    this.headYaw += (hy - this.headYaw) * Math.min(1, dt * 4); this.head.rotation.set(j.hx - j.pitch * 0.35, this.headYaw, 0);
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
