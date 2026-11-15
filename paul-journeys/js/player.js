// Input handling, third-person camera, and the movement modes: on foot, swimming, on a ship's deck, at the helm, on horseback.
import * as THREE from 'three';
import { Person, PAUL } from './characters.js';
import { lerp } from './world.js';

export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.edges = new Set(); this.mdx = 0; this.mdy = 0; this.wheel = 0; this.locked = false; this.enabled = false;
    this.touchMove = { x: 0, y: 0, id: null, ox: 0, oy: 0 }; this.touchLook = { id: null, x: 0, y: 0 }; this.isTouch = false; this.canvas = canvas;
    addEventListener('keydown', (e) => { if (e.repeat) return; this.keys.add(e.code); this.edges.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (e) => { if (this.enabled && !this.locked && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* sandboxed frame: fall back to drag-look */ } } this.edges.add('Mouse' + e.button); });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    addEventListener('mousemove', (e) => { if (this.locked || (e.buttons & 1)) { this.mdx += e.movementX || 0; this.mdy += e.movementY || 0; } });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    const tm = this.touchMove, tl = this.touchLook;
    canvas.addEventListener('touchstart', (e) => { this.isTouch = true; document.body.classList.add('touch'); for (const t of e.changedTouches) { if (t.clientX < innerWidth * 0.45 && tm.id === null) { tm.id = t.identifier; tm.ox = t.clientX; tm.oy = t.clientY; } else if (tl.id === null) { tl.id = t.identifier; tl.x = t.clientX; tl.y = t.clientY; } } e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) { if (t.identifier === tm.id) { tm.x = Math.max(-1, Math.min(1, (t.clientX - tm.ox) / 60)); tm.y = Math.max(-1, Math.min(1, -(t.clientY - tm.oy) / 60)); } else if (t.identifier === tl.id) { this.mdx += (t.clientX - tl.x) * 2.2; this.mdy += (t.clientY - tl.y) * 2.2; tl.x = t.clientX; tl.y = t.clientY; } } e.preventDefault(); }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === tm.id) { tm.id = null; tm.x = tm.y = 0; } if (t.identifier === tl.id) tl.id = null; } };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
  }
  down(c) { return this.keys.has(c); }
  hit(c) { if (this.edges.has(c)) { this.edges.delete(c); return true; } return false; }
  press(c) { this.edges.add(c); }
  move() {
    let x = (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0) - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0) + this.touchMove.x;
    let y = (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0) - (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0) + this.touchMove.y;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return [x, y, l];
  }
  run() { return this.down('ShiftLeft') || this.down('ShiftRight') || Math.hypot(this.touchMove.x, this.touchMove.y) > 0.92; }
  endFrame() { this.edges.clear(); this.mdx = this.mdy = 0; this.wheel = 0; }
}

export class Player {
  constructor(engine, input) {
    this.engine = engine; this.input = input; this.world = null;
    this.person = new Person(PAUL, null); this.person.auto = false;
    this.pos = new THREE.Vector3(); this.yaw = 0; this.vy = 0; this.onGround = true;
    this.mode = 'foot'; this.locked = false; this.speedMul = 1; this.canRun = true;
    this.camYaw = 0; this.camPitch = 0.28; this.camDist = 5.2; this.camCur = 5.2; this.camMax = 9; this.camTarget = new THREE.Vector3(); this.ceil = null;
    this.ship = null; this.horse = null; this.throttle = 0; this.swimming = false; this.stepT = 0; this.onStep = null;
    this.local = new THREE.Vector3(); // deck-local position
  }
  setWorld(world) { this.world = world; this.person.world = world; this.mode = 'foot'; this.locked = false; this.speedMul = 1; this.ship = this.horse = null; this.ceil = null; this.camMax = 9; this.camDist = 5.2; this.swimming = false; this.person.auto = false; this.person.fixedY = false; this.person.setPose('idle'); world.group.add(this.person.group); }
  teleport(x, z, yaw = 0) { this.pos.set(x, this.world.ground(x, z), z); this.yaw = yaw; this.vy = 0; this.person.pos.copy(this.pos); this.person.yaw = yaw; this.person.group.rotation.y = yaw; this.camYaw = yaw + Math.PI; this.snapCam = true; }
  // hand control of Paul's body to a script (NPC-style walking) or back to the player
  scripted(on) { this.person.auto = on; if (!on) { this.pos.copy(this.person.pos); this.yaw = this.person.yaw; this.person.stop(); } this.isScripted = on; }
  board(ship, lx = 0, lz = -3) { this.mode = 'deck'; this.ship = ship; ship.group.add(this.person.group); this.local.set(lx, ship.deckY, lz); this.person.pos.copy(this.local); this.yaw = 0; }
  helm(ship) { this.board(ship, 0, -4.2); this.mode = 'ship'; this.camDist = 30; this.camMax = 48; this.camPitch = 0.3; this.camYaw = ship.heading + Math.PI; this.snapCam = true; this.person.group.rotation.y = 0; this.person.setPose('hold'); }
  disembark(x, z, yaw) { this.world.group.add(this.person.group); this.mode = 'foot'; this.ship = null; this.camDist = 5.2; this.camMax = 9; this.person.setPose('idle'); this.person.group.rotation.set(0, 0, 0); this.teleport(x, z, yaw); }
  mount(horse) { this.mode = 'horse'; this.horse = horse; horse.group.add(this.person.group); this.person.pos.set(0, horse.seatY - 0.9, -0.05); this.person.group.rotation.set(0, 0, 0); this.person.setPose('ride'); this.pos.copy(horse.pos); this.yaw = horse.yaw; this.camDist = 7.5; this.camMax = 12; this.camYaw = this.yaw + Math.PI; }

  update(dt, t) {
    const inp = this.input, W = this.world, P = this.person; if (!W) return;
    if (inp.enabled) { this.camYaw -= inp.mdx * 0.0026; this.camPitch = Math.max(-0.35, Math.min(1.35, this.camPitch + inp.mdy * 0.0022)); this.camDist = Math.max(this.mode === 'ship' ? 14 : 2.2, Math.min(this.camMax, this.camDist + inp.wheel * (this.mode === 'ship' ? 2 : 0.6))); }
    const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
    let [mx, my, ml] = (this.locked || !inp.enabled) ? [0, 0, 0] : inp.move();
    let dx = fx * my + Math.cos(this.camYaw) * mx, dz = fz * my - Math.sin(this.camYaw) * mx;

    if (this.isScripted) { this.pos.copy(P.pos); this.yaw = P.yaw; }
    else if (this.mode === 'foot') {
      const g0 = W.ground(this.pos.x, this.pos.z, this.pos.y), wl = W.waterLevel;
      this.swimming = wl !== null && g0 < wl - 1.2;
      let spd = 0;
      if (ml > 0.05) {
        spd = (this.swimming ? 2.4 : (inp.run() && this.canRun ? 6.8 : 3.8)) * this.speedMul * Math.min(1, ml);
        this.pos.x += dx * spd * dt; this.pos.z += dz * spd * dt;
        let dy = Math.atan2(dx, dz) - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * Math.min(1, dt * 11);
      }
      W.collide(this.pos, 0.36);
      const g = W.ground(this.pos.x, this.pos.z, this.pos.y);
      if (this.swimming) { this.pos.y = lerp(this.pos.y, this.engine.waterHeight(this.pos.x, this.pos.z) - 1.28, Math.min(1, dt * 6)); this.vy = 0; if (!this.poseLock) P.setPose('swim'); }
      else {
        if (!this.poseLock && P.pose === 'swim') P.setPose('idle');
        if (this.onGround && !this.locked && inp.enabled && inp.hit('Space') && this.canRun) { this.vy = 6.0; this.onGround = false; }
        if (!this.onGround || this.pos.y > g + 0.3) { this.vy -= 20 * dt; this.pos.y += this.vy * dt; this.onGround = false; if (this.pos.y <= g) { this.pos.y = g; this.vy = 0; this.onGround = true; } }
        else { this.pos.y = lerp(this.pos.y, g, Math.min(1, dt * 16)); this.vy = 0; }
      }
      P.speed = spd; P.pos.copy(this.pos); P.group.rotation.y = this.yaw; P.yaw = this.yaw;
      if (spd > 0.1 && this.onGround && !this.swimming) { this.stepT -= dt * spd; if (this.stepT < 0) { this.stepT = 2.3; if (this.onStep) this.onStep(); } }
    } else if (this.mode === 'deck') {
      const S = this.ship, h = S.heading, c = Math.cos(h), s = Math.sin(h);
      const lx = dx * c - dz * s, lz = dx * s + dz * c; let spd = 0;
      if (ml > 0.05) { spd = 3.0 * this.speedMul; this.local.x += lx * spd * dt; this.local.z += lz * spd * dt; let dy = Math.atan2(lx, lz) - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * Math.min(1, dt * 11); }
      S.clampDeck(this.local); this.local.y = S.deckY; P.pos.copy(this.local); P.group.rotation.y = this.yaw; P.speed = spd;
      S.group.updateWorldMatrix(true, false); this.pos.copy(this.local).applyMatrix4(S.group.matrixWorld);
    } else if (this.mode === 'ship') {
      const S = this.ship, e = this.engine.env;
      if (!this.locked && inp.enabled) { this.throttle = Math.max(0, Math.min(1, this.throttle + my * dt * 0.7)); }
      const wf = 0.5 + 0.5 * Math.max(0, Math.sin(S.heading) * Math.cos(e.windAngle) + Math.cos(S.heading) * Math.sin(e.windAngle));
      const target = this.throttle * (this.shipMax || 11) * wf * Math.min(1.4, 0.6 + e.wind * 0.4);
      S.speed = lerp(S.speed, target, Math.min(1, dt * 0.6));
      if (!this.locked && inp.enabled) S.heading -= mx * dt * 0.42 * (0.35 + Math.min(1, S.speed / 6));
      const nx = S.x + Math.sin(S.heading) * S.speed * dt, nz = S.z + Math.cos(S.heading) * S.speed * dt;
      const bx = nx + Math.sin(S.heading) * 9, bz = nz + Math.cos(S.heading) * 9;
      if (W.terrainFn(bx, bz) > W.waterLevel - 1.5 || Math.hypot(nx - (W.cx || 0), nz - (W.cz || 0)) > W.bounds) { S.speed *= 0.9; if (this.onAground) this.onAground(); } else { S.x = nx; S.z = nz; }
      this.pos.set(S.x, S.bob.y + 3, S.z); P.speed = 0;
    } else if (this.mode === 'horse') {
      const H = this.horse; let spd = H.speed;
      const want = this.locked || !inp.enabled ? 0 : Math.max(0, my) * (inp.run() ? 11.5 : 7) * this.speedMul;
      spd = lerp(spd, want, Math.min(1, dt * (want > spd ? 1.4 : 2.5)));
      if (!this.locked && inp.enabled) this.yaw -= mx * dt * 1.7 * (0.4 + Math.min(1, spd / 5) * 0.6);
      this.pos.x += Math.sin(this.yaw) * spd * dt; this.pos.z += Math.cos(this.yaw) * spd * dt; W.collide(this.pos, 0.8);
      this.pos.y = lerp(this.pos.y, W.ground(this.pos.x, this.pos.z, this.pos.y + 1), Math.min(1, dt * 10));
      H.speed = spd; H.pos.copy(this.pos); H.group.rotation.y = this.yaw; H.yaw = this.yaw;
      if (spd > 0.5) { this.stepT -= dt * spd; if (this.stepT < 0) { this.stepT = 1.5; if (this.onStep) this.onStep(true); } }
    }
    P.update(dt, t); if (this.horse) this.horse.update(dt, t);
    this.updateCamera(dt);
  }

  updateCamera(dt) {
    const W = this.world, cam = this.engine.camera, tgt = this.camTarget;
    const hgt = this.mode === 'ship' ? 2.5 : this.mode === 'horse' ? 2.5 : (this.person.pose === 'sit' || this.person.pose === 'stocks' || this.person.pose === 'pray' || this.person.pose === 'kneel') ? 1.0 : (this.person.pose === 'fallen' || this.person.pose === 'lie') ? 0.6 : 1.55;
    const want = new THREE.Vector3(this.pos.x, this.pos.y + hgt, this.pos.z);
    if (this.snapCam) { tgt.copy(want); } else tgt.lerp(want, Math.min(1, dt * 12));
    const cp = Math.cos(this.camPitch), dir = new THREE.Vector3(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp);
    let dist = this.camDist;
    if (this.mode !== 'ship') for (let i = 1; i <= 12; i++) {
      const s = i / 12 * this.camDist, x = tgt.x + dir.x * s, y = tgt.y + dir.y * s, z = tgt.z + dir.z * s;
      if (W.blocked(x, y, z) || y < W.terrainFn(x, z) + 0.25 || (this.ceil !== null && y > this.ceil)) { dist = Math.max(0.6, (i - 1) / 12 * this.camDist - 0.15); break; }
    }
    this.camCur = this.snapCam ? dist : (dist < this.camCur ? dist : lerp(this.camCur, dist, Math.min(1, dt * 4))); this.snapCam = false;
    cam.position.copy(tgt).addScaledVector(dir, this.camCur);
    if (this.mode === 'ship' || this.mode === 'deck' || this.swimming) cam.position.y = Math.max(cam.position.y, this.engine.waterHeight(cam.position.x, cam.position.z) + 0.5);
    else if (W.waterLevel !== null) cam.position.y = Math.max(cam.position.y, W.waterLevel + 0.4);
    cam.lookAt(tgt);
  }
}
