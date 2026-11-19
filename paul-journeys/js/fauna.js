// Realistic pack animals: Microsoft Rocketbox dromedary and donkey (MIT licence, see assets/CREDITS.md).
// The models are rigged but carry no animation, so their gait is generated here on the real skeleton:
// the camel paces (both legs on one side move together), the donkey walks in a four-beat lateral sequence.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Solid, MATTE, MATTE2, lerp } from './world.js';
import { stripeTexture } from './characters.js';

let ASSET = null;
export async function preloadFauna() {
  const L = new GLTFLoader();
  try { ASSET = await L.loadAsync('./assets/animals.glb'); return true; } catch (e) { /* try the packed copy */ }
  try { const { default: b64 } = await import('../assets/animals-glb.js'); const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); ASSET = await L.parseAsync(bin.buffer, './assets/'); return true; }
  catch (e) { console.warn('Animal models unavailable', e); ASSET = null; return false; }
}
export const faunaReady = () => !!ASSET;

const SPEC = {
  camel: { pre: 'dromedar_', stride: 2.3, swing: 0.32, knee: 0.55, phase: { LH: 0, LF: 0.08, RH: 0.5, RF: 0.58 }, back: 1.83, scale: 1 },
  donkey: { pre: 'donkey_', stride: 1.15, swing: 0.36, knee: 0.6, phase: { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 }, back: 1.12, scale: 0.92 },
};
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _a = new THREE.Vector3(), _root = new THREE.Quaternion();

export class Animal {
  constructor(kind, world, load = 'none', seed = 1) {
    this.kind = kind; this.world = world; const sp = this.spec = SPEC[kind];
    const g = this.group = new THREE.Group(), body = this.body = new THREE.Group(); g.add(body);
    const model = this.model = SkeletonUtils.clone(ASSET.scene.getObjectByName(kind)); model.scale.multiplyScalar(sp.scale); body.add(model);
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    const B = (n) => model.getObjectByName(sp.pre + n);
    this.b = { LH: [B('L_Thigh'), B('L_Calf')], RH: [B('R_Thigh'), B('R_Calf')], LF: [B('L_UpperArm'), B('L_Forearm')], RF: [B('R_UpperArm'), B('R_Forearm')], neck: B('Neck'), head: B('Head'), tail: B('Tail') };
    this.pos = g.position; this.yaw = 0; this.speed = 0; this.phase = seed * 1.7; this.t0 = seed * 3.1;
    if (load !== 'none') body.add(packLoad(kind, load, seed, sp.back * sp.scale));
  }
  place(x, z, yaw = this.yaw) { this.pos.set(x, this.world ? this.world.ground(x, z) : 0, z); this.yaw = yaw; this.group.rotation.y = yaw; return this; }
  update(dt, t) {
    const sp = this.spec, moving = this.speed > 0.05;
    this.phase += dt * (moving ? this.speed / sp.stride : 0);
    this.model.updateMatrixWorld(true); this.model.getWorldQuaternion(_root).invert();
    const rot = (bone, axis, ang) => { if (!bone || Math.abs(ang) < 1e-4) return; bone.parent.getWorldQuaternion(_p).premultiply(_root); _a.copy(axis).applyQuaternion(_p.invert()); bone.quaternion.premultiply(_q.setFromAxisAngle(_a, ang)); bone.updateMatrixWorld(true); };
    // reset to the bind pose each frame, then add the gait
    if (!this.rest) { this.rest = new Map(); this.model.traverse((o) => { if (o.isBone) this.rest.set(o, o.quaternion.clone()); }); }
    for (const [o, q] of this.rest) o.quaternion.copy(q);
    const amp = moving ? Math.min(1, this.speed / 1.2) : 0;
    for (const leg of ['LH', 'RH', 'LF', 'RF']) {
      const ph = (this.phase + sp.phase[leg]) * Math.PI * 2, front = leg[1] === 'F';
      const swing = -Math.sin(ph) * sp.swing * amp, lift = Math.max(0, Math.cos(ph)) * sp.knee * amp;
      rot(this.b[leg][0], X, swing + (front ? 0 : -0.04)); rot(this.b[leg][1], X, front ? lift * 1.1 : lift);
    }
    const idle = Math.sin(t * 0.7 + this.t0);
    rot(this.b.neck, X, (moving ? Math.sin(this.phase * Math.PI * 4) * 0.05 : 0.04 * idle) + (this.kind === 'camel' ? 0 : 0.05));
    rot(this.b.head, Y, moving ? 0 : Math.sin(t * 0.31 + this.t0) * 0.25);
    rot(this.b.tail, Y, Math.sin(t * (moving ? 3.2 : 1.3) + this.t0) * 0.35);
    this.body.position.y = moving ? Math.abs(Math.sin(this.phase * Math.PI * 2)) * 0.03 : Math.sin(t * 1.4 + this.t0) * 0.004;
    this.body.rotation.z = moving && this.kind === 'camel' ? Math.sin(this.phase * Math.PI * 2) * 0.025 : 0; // the pacing camel's side-to-side roll
  }
}

// what an animal carries: a striped saddle blanket plus sacks, baskets or bundles
function packLoad(kind, load, seed, back) {
  const g = new THREE.Group(), S = new Solid(), rnd = (i) => { const v = Math.sin(seed * 91.7 + i * 13.3) * 43758.5; return v - Math.floor(v); };
  const cloth = new THREE.MeshStandardMaterial({ map: stripeTexture(seed), roughness: 1, side: THREE.DoubleSide });
  if (kind === 'camel') {
    const blanket = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 16, 1, true, -Math.PI * 0.42, Math.PI * 0.84), cloth); blanket.rotation.x = Math.PI / 2; blanket.position.set(0, back - 0.32, -0.1); blanket.castShadow = true; g.add(blanket);
    for (const sd of [-1, 1]) { S.sphere(sd * 0.55, back - 0.62, -0.1 + (rnd(sd) - 0.5) * 0.2, 0.32, [0xb8a27a, 0x8a6a48, 0xc8b08a][Math.floor(rnd(sd + 3) * 3)], 0.75, 1.15, 1.35, 10); S.cyl(sd * 0.5, back - 0.38, -0.1, 0.03, 0.03, 0.5, 0x4a3420, 6, 0, sd * 0.4); }
    S.cyl(0, back - 0.1, -0.1, 0.18, 0.18, 0.9, 0x9a7a52, 10, Math.PI / 2); for (const dz of [-0.4, 0.2]) S.cyl(0, back - 0.1 - 0.005, dz, 0.19, 0.19, 0.04, 0x4a3420, 10, Math.PI / 2); // rolled tent-cloth, roped
  } else {
    const blanket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.75, 14, 1, true, -Math.PI * 0.45, Math.PI * 0.9), cloth); blanket.rotation.x = Math.PI / 2; blanket.position.set(0, back - 0.2, -0.05); blanket.castShadow = true; g.add(blanket);
    if (load === 'baskets') for (const sd of [-1, 1]) { const pts = [[0.001, 0], [0.2, 0.02], [0.24, 0.38], [0.26, 0.4]].map((p) => new THREE.Vector2(p[0], p[1])); S.add(new THREE.LatheGeometry(pts, 12), 0xa8844e, sd * 0.4, back - 0.75, -0.05); S.sphere(sd * 0.4, back - 0.36, -0.05, 0.18, [0xb83a2c, 0x6a8a3c, 0xd8a83c][Math.floor(rnd(sd) * 3)], 1, 0.5, 1, 8); }
    else for (const sd of [-1, 1]) S.sphere(sd * 0.36, back - 0.45, -0.05, 0.24, [0xb8a27a, 0x8a6a48, 0xd0c4a4][Math.floor(rnd(sd + 5) * 3)], 0.7, 1.2, 1.25, 10);
  }
  const m = S.mesh(MATTE()); m.castShadow = true; g.add(m); return g;
}

// a light two-wheeled cart, its draught donkey and the driver's seat
export function makeCart(world, seed = 1) {
  const g = new THREE.Group(), S = new Solid(), wood = 0x7a5c3c;
  S.box(0, 0.75, 0, 1.4, 0.1, 2.2, wood); for (const sd of [-1, 1]) { S.box(sd * 0.68, 0.85, 0, 0.06, 0.4, 2.2, 0x6a4e34); S.box(sd * 0.35, 0.72, 2.0, 0.08, 0.08, 2.0, wood, 0, 0.12); }
  S.box(0, 0.85, 1.05, 1.4, 0.4, 0.06, 0x6a4e34); S.box(0, 0.85, -1.08, 1.4, 0.4, 0.06, 0x6a4e34);
  for (let i = 0; i < 4; i++) { const pts = [[0.001, 0], [0.13, 0.02], [0.2, 0.3], [0.18, 0.55], [0.08, 0.72], [0.1, 0.82]].map((p) => new THREE.Vector2(p[0], p[1])); S.add(new THREE.LatheGeometry(pts, 9), 0xb06a3c, -0.35 + (i % 2) * 0.7, 0.8, -0.5 + Math.floor(i / 2) * 0.7, 0.35, i, 0); }
  S.box(-0.3, 0.85, 0.55, 0.5, 0.45, 0.4, 0xb8a27a);
  const body = S.mesh(MATTE()); body.castShadow = true; g.add(body);
  const wheels = [-1, 1].map((sd) => { const W = new Solid(); W.add(new THREE.TorusGeometry(0.58, 0.05, 6, 24), 0x4e3a28, 0, 0, 0, 0, Math.PI / 2, 0); for (let i = 0; i < 8; i++) W.add(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), 0x6a4e34, 0, 0, 0, i * Math.PI / 8, 0, 0); W.cyl(-0.08, 0, 0, 0.09, 0.09, 0.16, 0x3a2a1c, 8, 0, Math.PI / 2); const m = W.mesh(MATTE2()); m.position.set(sd * 0.8, 0.6, 0); m.castShadow = true; g.add(m); return m; });
  return { group: g, wheels, roll(d) { for (const w of wheels) w.rotation.x += d / 0.6; } };
}
