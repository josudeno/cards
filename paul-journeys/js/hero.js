// Paul as a realistic, motion-captured character.
// Model and animations: Microsoft Rocketbox avatar library (MIT licence), avatar Male_Adult_21, re-dressed for the
// first century (undyed tunic, leather footwear, plain wool head-cloth). See assets/CREDITS.md.
// Story poses that have no capture (kneeling in prayer, the stocks, lying stunned, riding, swimming…) are layered on
// top of the captured idle as rotations of the real skeleton, using the same pose table as the other characters.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Person, POSES, J0, PAUL } from './characters.js';
import { lerp } from './world.js';

let ASSET = null;
// Some hosts refuse to serve .glb files; for those, tools/hero/pack-js.mjs writes the same model as a JavaScript module.
export async function preloadHero() {
  const L = new GLTFLoader();
  try { ASSET = await L.loadAsync('./assets/paul.glb'); return true; } catch (e) { /* try the packed copy */ }
  try {
    const { default: b64 } = await import('../assets/paul-glb.js');
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    ASSET = await L.parseAsync(bin.buffer, './assets/'); return true;
  } catch (e) { console.warn('Paul model unavailable, using the built-in figure', e); ASSET = null; return false; }
}
export const makePaul = (world) => (ASSET ? new Hero(PAUL, world) : new Person(PAUL, world));

const CAPTURED = { preach: 'talk' };                          // poses played straight from motion capture
// small corrections where the captured body differs from the built-in figure
const TWEAK = { sit: { aL: -0.3, aR: -0.3, eL: -1.05, eR: -1.05, aLz: -0.02, aRz: 0.02 }, lie: { y: 0.05 }, fallen: { y: 0.06 }, stocks: { aL: 0.1, aR: 0.1, eL: -0.6, eR: -0.6 } };
const LOCO = new Set(['idle', 'walk', 'grope', 'hold', 'carry']); // poses that use the walk / run cycles when moving
const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _a = new THREE.Vector3(), _root = new THREE.Quaternion();

export class Hero extends Person {
  constructor(look, world) {
    super(look, world);
    // replace the built-in figure with the captured character
    this.body.clear();
    const model = this.model = SkeletonUtils.clone(ASSET.scene); model.scale.multiplyScalar(0.95);
    this.body.add(model);
    const B = (n) => model.getObjectByName(n);
    this.bones = {
      aL: B('Bip01_L_UpperArm'), aR: B('Bip01_R_UpperArm'), eL: B('Bip01_L_Forearm'), eR: B('Bip01_R_Forearm'),
      lL: B('Bip01_L_Thigh'), lR: B('Bip01_R_Thigh'), kL: B('Bip01_L_Calf'), kR: B('Bip01_R_Calf'), hx: B('Bip01_Head'), sp: B('Bip01_Spine1'),
    };
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.material.name === 'cloth') { o.material = o.material.clone(); this.cloth = o.material; } } });
    this.setCloak(look.cloak);
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {}; for (const c of ASSET.animations) { const a = this.mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); this.actions[c.name] = a; }
    this.current = null; this.fade('idle', 0);
    // attach points that behave like the old figure's forearms: local -Y runs from the elbow toward the hand, in metres
    this.hands = ['eL', 'eR'].map((k) => { const h = new THREE.Group(); h.rotation.z = Math.PI / 2; h.scale.setScalar(1 / (0.01 * 0.95)); this.bones[k].add(h); return h; });
    this.arms = [this.bones.aL, this.bones.aR]; this.legs = [this.bones.lL, this.bones.lR];
    this.head = new THREE.Object3D(); // unused by the captured character, kept for interface compatibility
    this.d = { ...J0 }; // procedural offsets currently applied (smoothed)
  }
  setCloak(color) { if (this.cloth) this.cloth.color.set(color ?? 0xe8dcc4).lerp(new THREE.Color(0xffffff), 0.5); }
  fade(name, sec = 0.3) {
    if (this.current === name) return; const next = this.actions[name]; if (!next) return;
    const prev = this.current && this.actions[this.current];
    next.reset(); next.setEffectiveWeight(1); next.play();
    if (prev) next.crossFadeFrom(prev, sec, false); else next.fadeIn(sec);
    this.current = name;
  }
  animate(dt, t) {
    const pose = this.pose, moving = this.speed > 0.05 && LOCO.has(pose);
    // 1) choose the captured motion
    let clip = CAPTURED[pose] || 'idle', ts = 1;
    // natural speeds of the captured cycles, measured from foot travel: walk ≈ 1.75 m/s, run ≈ 5.2 m/s
    if (moving) { if (this.speed > 3.6) { clip = 'run'; ts = THREE.MathUtils.clamp(this.speed / 5.2, 0.7, 1.5); } else { clip = 'walk'; ts = THREE.MathUtils.clamp(this.speed / 1.75, 0.5, 1.7); } }
    this.fade(clip, 0.25); this.actions[clip].timeScale = ts;
    this.mixer.update(dt);
    // 2) layer the story pose on top: same joint table as the procedural figures, as offsets from standing
    const P = { ...(POSES[pose] || POSES.idle), ...(TWEAK[pose] || {}) }, k = Math.min(1, dt * 6), d = this.d;
    const T = {}; for (const key in J0) T[key] = CAPTURED[pose] ? 0 : (P[key] ?? J0[key]) - J0[key];
    if (moving) { T.lL = T.lR = T.kL = T.kR = 0; T.y = 0; T.pitch = 0; } // the walk cycle drives the legs
    if (pose === 'swim') { T.aL += Math.sin(t * 4) * 0.7; T.aR -= Math.sin(t * 4) * 0.7; T.lL += Math.sin(t * 6) * 0.35; T.lR -= Math.sin(t * 6) * 0.35; }
    if (pose === 'grope') { T.aL += Math.sin(t * 1.7) * 0.25; T.aR += Math.cos(t * 1.4) * 0.25; }
    if (pose === 'shake') { T.aR += Math.sin(t * 22) * 0.4; T.eR += Math.sin(t * 26) * 0.5; }
    if (pose === 'work') { T.aR += Math.sin(t * 5) * 0.2; T.eR += Math.sin(t * 5) * 0.4; }
    for (const key in T) d[key] += (T[key] - d[key]) * k;
    this.body.position.y = d.y + (this.tremble ? Math.sin(t * 38) * 0.004 * this.tremble : 0); this.body.rotation.x = d.pitch;
    this.model.updateMatrixWorld(true); this.model.getWorldQuaternion(_root).invert();
    const rot = (bone, axis, ang) => { if (!bone || Math.abs(ang) < 1e-4) return; bone.parent.getWorldQuaternion(_p).premultiply(_root); _a.copy(axis).applyQuaternion(_p.invert()); bone.quaternion.premultiply(_q.setFromAxisAngle(_a, ang)); bone.updateMatrixWorld(true); };
    const b = this.bones;
    rot(b.lL, X, d.lL); rot(b.lL, Z, d.lLz); rot(b.lR, X, d.lR); rot(b.lR, Z, d.lRz); rot(b.kL, X, d.kL); rot(b.kR, X, d.kR);
    rot(b.aL, X, d.aL); rot(b.aL, Z, d.aLz); rot(b.aR, X, d.aR); rot(b.aR, Z, d.aRz); rot(b.eL, X, d.eL); rot(b.eR, X, d.eR);
    rot(b.hx, X, d.hx);
  }
}
