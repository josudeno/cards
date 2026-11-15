// Game loop, chapter flow and the scripting API used by the chapters.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { World } from './world.js';
import { Person, Beast } from './characters.js';
import { Input, Player } from './player.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { CHAPTERS } from './chapters.js';

const CANCEL = Symbol('cancel');
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const store = { get(k, d) { try { const v = localStorage.getItem('paul.' + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem('paul.' + k, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } } };
const posOf = (t) => t.isVector3 ? t : Array.isArray(t) ? { x: t[0], y: t[2] ?? null, z: t[1] } : (t.pos || t.position || t);

class Game {
  constructor() {
    const canvas = document.getElementById('game');
    this.ui = new UI(); this.engine = new Engine(canvas); this.input = new Input(canvas); this.player = new Player(this.engine, this.input); this.sound = new Sound();
    this.engine.onThunder = (p) => this.sound.thunder(p);
    this.player.onStep = (hoof) => this.sound.step(hoof);
    this.state = 'title'; this.token = null; this.npcs = []; this.beasts = []; this.letters = []; this.waiters = []; this.amb = {};
    this.fadeV = 1; this.fadeTo = 1; this.fadeRate = 1; this.whiteV = 0; this.whiteTo = 0; this.whiteRate = 1;
    this.marker = null; this.interaction = null; this.compassTarget = null; this.time = 0; this.last = performance.now();
    this.unlocked = store.get('unlocked', 0); this.found = new Set(store.get('letters', []));
    this.totalLetters = CHAPTERS.reduce((n, c) => n + (c.letters || 0), 0);
    const q = new URLSearchParams(location.search); this.autoplay = q.has('auto'); this.timeScale = +(q.get('speed') || 1); this.stopAt = q.get('stop'); // ?auto&speed=N&stop=text are test hooks
    this.makeBeacon(); this.bindUI();
    addEventListener('resize', () => this.engine.resize());
    this.engine.setQuality(store.get('quality', 'high')); document.getElementById('quality').value = this.engine.quality;
    this.titleScene();
    if (q.has('ch')) this.startChapter(+q.get('ch') - 1, true);
    requestAnimationFrame((t) => this.loop(t));
  }

  bindUI() {
    const $ = (id) => document.getElementById(id), ui = this.ui;
    const go = (fn) => () => { this.sound.start(); fn(); };
    $('btnBegin').textContent = this.unlocked > 0 ? 'Continue the journey' : 'Begin the journey';
    $('btnBegin').onclick = go(() => this.startChapter(Math.min(this.unlocked, CHAPTERS.length - 1)));
    $('btnChapters').onclick = () => { this.fillChapters(); ui.show('title', false); ui.show('chapters'); };
    $('btnBack').onclick = () => { ui.show('chapters', false); ui.show('title'); };
    $('quality').onchange = (e) => { this.engine.setQuality(e.target.value); store.set('quality', e.target.value); };
    $('sound').onchange = (e) => this.sound.setMuted(!e.target.checked);
    $('pauseBtn').onclick = () => this.pause(true);
    $('btnResume').onclick = () => this.pause(false);
    $('btnRestart').onclick = () => { this.pause(false); this.startChapter(this.chIndex, true); };
    $('btnSkip').onclick = () => { this.pause(false); this.finishChapter(true); };
    $('btnQuit').onclick = () => { this.pause(false); this.abort(); this.ui.show('hud', false); this.state = 'title'; this.titleScene(); this.ui.show('title'); $('btnBegin').textContent = this.unlocked > 0 ? 'Continue the journey' : 'Begin the journey'; };
    $('btnE').addEventListener('touchstart', (e) => { this.input.press('KeyE'); if (this.ui.dlg) this.ui.advance(); e.preventDefault(); });
    $('btnJump').addEventListener('touchstart', (e) => { this.input.press('Space'); e.preventDefault(); });
    addEventListener('keydown', (e) => { if (e.code === 'Escape' && (this.state === 'play' || this.state === 'pause')) this.pause(this.state === 'play'); });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.state === 'play' && this.input.wasLocked && !this.ui.cardRes) this.pause(true); this.input.wasLocked = !!document.pointerLockElement; });
  }
  fillChapters() {
    const list = document.getElementById('chapterList'); list.innerHTML = '';
    CHAPTERS.forEach((c, i) => { const b = document.createElement('button'); b.innerHTML = `<small>${c.journey} · ${c.ref}</small>${ROMAN[i]}. ${c.title}`; b.disabled = i > this.unlocked && !this.autoplay; b.onclick = () => { this.sound.start(); this.ui.show('chapters', false); this.startChapter(i); }; list.appendChild(b); });
  }
  pause(on) { if (on && this.state === 'play') { this.state = 'pause'; this.ui.show('pause'); if (document.exitPointerLock) document.exitPointerLock(); } else if (!on && this.state === 'pause') { this.state = 'play'; this.ui.show('pause', false); } }

  makeBeacon() {
    const g = new THREE.CylinderGeometry(0.45, 0.45, 60, 20, 1, true); g.translate(0, 30, 0);
    this.beacon = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, uniforms: { uT: { value: 0 } },
      vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uT; varying float vY; void main(){ float a = exp(-vY * 0.06) * (0.55 + 0.2 * sin(uT * 3.0 - vY * 0.6)); gl_FragColor = vec4(vec3(1.6, 1.25, 0.55) * a, a); }' }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.7), transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
    ring.position.y = 0.12; this.beacon.add(ring); this.beaconRing = ring; this.beacon.visible = false; this.beacon.renderOrder = 6; this.engine.scene.add(this.beacon);
  }

  // ---------------------------------------------------------- chapter flow
  abort() { this.token = null; for (const w of this.waiters) w.rej(CANCEL); this.waiters = []; this.ui.cancelDialog(); this.interaction = null; this.marker = null; this.compassTarget = null; this.ui.setBlind(0); this.ui.setCompass(null); this.ui.setHelm(null); if (this.ui.cardRes) this.ui.show('card', false); this.ui.cardRes = null; if (this.ui.mapRes) this.ui.mapRes(); }
  resetWorld(i) {
    const ch = CHAPTERS[i]; this.engine.clearWorld(); this.npcs = []; this.beasts = []; this.letters = []; this.amb = {}; this.blindV = 0;
    const world = this.world = new World(this.engine, ch.seed || i + 1); this.engine.setEnv(ch.env()); this.player.setWorld(world); this.engine.waters.length = 0;
    this.api = this.makeApi(this.token); this.scene = ch.build(this.api, world) || {}; world.finish(); this.ui.buildMinimap(world); this.ch = ch; this.chIndex = i; return ch;
  }
  titleScene() { this.token = {}; this.resetWorld(0); this.player.teleport(0, 60, Math.PI); this.input.enabled = false; this.fadeTo = 0; this.fadeRate = 0.5; this.ui.show('loading', false); }
  async startChapter(i, skipIntro = false) {
    this.abort(); const tok = this.token = {}; const ui = this.ui;
    for (const s of ['title', 'chapters', 'pause', 'card', 'mapscreen']) ui.show(s, false);
    this.state = 'loading'; this.input.enabled = false; this.fadeV = this.fadeTo = 1; ui.setFade(1); this.whiteV = this.whiteTo = 0; ui.setWhite(0);
    await new Promise(r => setTimeout(r, 30)); if (this.token !== tok) return;
    const ch = this.resetWorld(i); const api = this.api;
    ui.show('hud'); ui.setChapter(`Chapter ${ROMAN[i]} · ${ch.title}`); ui.setObjective(''); ui.setLetters(this.found.size, this.totalLetters);
    try {
      if (!skipIntro && !this.autoplay) {
        ui.show('hud', false);
        await ui.journey({ kicker: ch.journey, title: ch.title, ref: ch.place + ' · ' + ch.ref, route: ch.route, past: CHAPTERS.slice(0, i).map(c => c.route) }); if (this.token !== tok) return;
        await ui.card({ kicker: `Chapter ${ROMAN[i]} · ${ch.journey}`, title: ch.title, body: ch.intro, ref: ch.ref, button: 'Begin' }); if (this.token !== tok) return;
        ui.show('hud');
      }
      this.state = 'play'; this.input.enabled = true; this.fadeTo = 0; this.fadeRate = 0.7; ui.toast(ch.place);
      await ch.run(api, this.scene);
      if (this.token !== tok) return;
      await this.finishChapter(false);
    } catch (e) { if (e !== CANCEL) { console.error(e); ui.toast('Script error — see console'); window.__err = String(e && e.stack || e); } }
  }
  async finishChapter(skipped) {
    const i = this.chIndex, ch = this.ch, ui = this.ui; this.abort(); const tok = this.token = {};
    this.unlocked = Math.max(this.unlocked, Math.min(i + 1, CHAPTERS.length - 1)); store.set('unlocked', this.unlocked);
    this.input.enabled = false; this.fadeTo = 1; this.fadeRate = 1; this.sound.chime();
    if (!skipped && !this.autoplay) { await new Promise(r => setTimeout(r, 900)); if (this.token !== tok) return; ui.show('hud', false); await ui.card({ kicker: 'Chapter complete', title: ch.title, body: ch.outro, ref: ch.outroRef || '' }); if (this.token !== tok) return; }
    if (i + 1 < CHAPTERS.length) return this.startChapter(i + 1);
    ui.show('hud', false);
    if (!this.autoplay) await ui.card({ kicker: 'The end of the journey', title: 'I have kept the faith', body: `<q>For I am already being offered, and the time of my departure has come. I have fought the good fight. I have finished the course. I have kept the faith. From now on, the crown of righteousness is stored up for me, which the Lord, the righteous judge, will give to me on that day; and not to me only, but also to all those who have loved his appearing.</q>\n\nLetters found: ${this.found.size} of ${this.totalLetters}.\n\nScripture quotations are from the World English Bible (public domain).`, ref: '2 Timothy 4:6-8', button: 'Return to title' });
    window.__done = true; this.state = 'title'; this.titleScene(); ui.show('title');
  }

  // ---------------------------------------------------------- scripting API
  makeApi(tok) {
    const G = this, chk = () => { if (G.token !== tok) throw CANCEL; };
    const A = (fn) => async (...a) => { chk(); const r = await fn(...a); chk(); return r; };
    const until = (fn) => new Promise((res, rej) => G.waiters.push({ fn, res, rej }));
    const wait = (s) => { const t = G.time + s; return until(() => G.time >= t); };
    const stop = (text) => { if (G.stopAt && text && text.includes(G.stopAt)) { G.autoplay = false; G.timeScale = 1; G.fadeV = G.fadeTo = 0; } };
    const api = {
      get player() { return G.player; }, get paul() { return G.player.person; }, get world() { return G.world; }, engine: G.engine, ui: G.ui, sound: G.sound, get auto() { return G.autoplay; }, warp: (t) => G.warp(t), game: G, amb: (o) => Object.assign(G.amb, o),
      until: A(until), wait: A(wait),
      spawn(look, x, z, yaw = 0, name = '') { chk(); const p = new Person(look, G.world); p.name = name; p.place(x, z, yaw); G.world.group.add(p.group); G.npcs.push(p); return p; },
      beast(kind, color, x, z, yaw = 0) { chk(); const b = new Beast(kind, color, G.world); b.pos.set(x, G.world.ground(x, z), z); b.yaw = yaw; b.group.rotation.y = yaw; G.world.group.add(b.group); G.beasts.push(b); return b; },
      say: A(async (lines, opt = {}) => { if (!opt.free) G.player.locked = true; if (G.autoplay) { await wait(0.05); } else await G.ui.say(lines); if (!opt.free) G.player.locked = false; }),
      bark(who, text, ref, sec) { chk(); G.ui.bark(who, text, ref, sec); },
      objective(text, target = null) { chk(); stop(text); G.ui.setObjective(text); G.marker = target ? { target } : null; },
      reach: A(async (target, radius = 3, text = null) => { stop(text); if (text) G.ui.setObjective(text); G.marker = { target }; if (G.autoplay) { await wait(0.3); G.warp(target); await wait(0.1); } else await until(() => { const p = posOf(target), q = G.player.pos; return Math.hypot(p.x - q.x, p.z - q.z) < radius; }); G.marker = null; G.sound.chime(); }),
      interact: A(async (target, label, radius = 2.8, text = null) => { stop(text || label); if (text) G.ui.setObjective(text); G.marker = target ? { target } : null; if (G.autoplay) await wait(0.3); else await new Promise((res) => { G.interaction = { target, label, radius, res }; }); G.interaction = null; G.marker = null; G.ui.setPrompt(null); }),
      fade: A(async (v, sec = 1) => { G.fadeTo = v; G.fadeRate = 1 / Math.max(0.01, sec); await until(() => Math.abs(G.fadeV - v) < 0.01); }),
      white: A(async (v, sec = 1) => { G.whiteTo = v; G.whiteRate = 1 / Math.max(0.01, sec); await until(() => Math.abs(G.whiteV - v) < 0.01); }),
      card: A(async (o) => { if (G.autoplay) return; G.player.locked = true; G.input.enabled = false; if (document.exitPointerLock) document.exitPointerLock(); await G.ui.card(o); G.input.enabled = true; G.player.locked = false; }),
      walk: A((npc, pts, speed) => G.autoplay ? (npc.place(...(typeof pts[0] === 'number' ? pts : pts[pts.length - 1])), Promise.resolve()) : npc.walk(pts, speed)),
      blind(v) { chk(); G.blindTo = v; }, compass(t) { chk(); G.compassTarget = t; },
      letter(x, z, data) { chk(); G.addLetter(x, z, data); },
      env(target, sec = 2) { chk(); G.engine.transitionEnv(target, sec); },
      toast(t) { chk(); G.ui.toast(t); },
    };
    return api;
  }
  warp(target) { const p = posOf(target), P = this.player; if (P.mode === 'ship') { P.ship.x = p.x; P.ship.z = p.z; P.pos.set(p.x, 0, p.z); } else if (P.mode === 'foot' || P.mode === 'horse') { P.pos.set(p.x, this.world.ground(p.x, p.z) + 0.1, p.z + 0.5); if (P.isScripted) P.person.pos.copy(P.pos); } }
  addLetter(x, z, data) {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.1), fog: false });
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10), m); roll.rotation.z = Math.PI / 2; g.add(roll);
    for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8a3a2a })); k.position.x = s * 0.28; g.add(k); }
    const y = (data.y ?? this.world.ground(x, z)) + 1.2; g.position.set(x, y, z); this.world.group.add(g);
    const taken = this.found.has(data.ref); g.visible = !taken; this.letters.push({ g, x, z, y, data, taken });
  }

  // ---------------------------------------------------------- frame
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const raw = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    const steps = this.autoplay ? Math.max(1, this.timeScale) : 1;
    for (let s = 0; s < steps; s++) this.step(raw, s === steps - 1);
  }
  step(dt, render) {
    const ui = this.ui, inp = this.input, P = this.player, E = this.engine;
    if (this.state !== 'pause') {
      this.time += dt;
      // fades
      const tw = (v, to, rate) => v + Math.sign(to - v) * Math.min(Math.abs(to - v), rate * dt);
      this.fadeV = tw(this.fadeV, this.fadeTo, this.fadeRate); ui.setFade(this.fadeV); this.whiteV = tw(this.whiteV, this.whiteTo, this.whiteRate); ui.setWhite(this.whiteV);
      if (this.blindTo !== undefined && this.blindTo !== this.blindV) { this.blindV = tw(this.blindV || 0, this.blindTo, 0.7); ui.setBlind(this.blindV); }
      // input for dialogue and cards
      if (ui.dlg) { if (inp.hit('Space') || inp.hit('Enter') || inp.hit('KeyE') || (inp.locked && inp.hit('Mouse0'))) ui.advance(); }
      else if (ui.cardRes) { if (inp.hit('Enter')) ui.cardRes(); } else if (ui.mapRes) { if (inp.hit('Enter') || inp.hit('Space')) ui.mapRes(); }
      ui.update(dt);
      if (this.state === 'title') { P.camYaw += dt * 0.03; P.camPitch = 0.12; P.camDist = 9; }
      for (const n of this.npcs) n.update(dt, this.time);
      for (const b of this.beasts) if (b !== P.horse) b.update(dt, this.time);
      P.update(dt, this.time);
      if (this.world) this.world.update(dt, this.time);
      // waiters (script conditions)
      for (let i = this.waiters.length - 1; i >= 0; i--) { const w = this.waiters[i]; let ok = false; try { ok = w.fn(); } catch (e) { console.error(e); } if (ok) { this.waiters.splice(i, 1); w.res(); } }
      // interaction prompt
      const it = this.interaction;
      if (it && !ui.dlg) { const p = it.target ? posOf(it.target) : null, near = !p || Math.hypot(p.x - P.pos.x, p.z - P.pos.z) < it.radius; ui.setPrompt(near ? it.label : null); if (near && inp.hit('KeyE')) { this.interaction = null; ui.setPrompt(null); it.res(); } } else if (!it) ui.setPrompt(null);
      // objective beacon
      const mk = this.marker; this.beacon.visible = !!mk && !this.blindV;
      if (mk) { const p = posOf(mk.target), W = this.world; let y = (typeof p.y === 'number') ? p.y : W.ground(p.x, p.z); if (W.waterLevel !== null) y = Math.max(y, W.waterLevel);
        this.beacon.position.set(p.x, y, p.z); this.beacon.material.uniforms.uT.value = this.time; this.beaconRing.scale.setScalar(1 + 0.15 * Math.sin(this.time * 3)); }
      // letters
      for (const L of this.letters) { if (L.taken) continue; L.g.rotation.y += dt * 1.5; L.g.position.y = L.y + Math.sin(this.time * 2 + L.x) * 0.12;
        if (this.state === 'play' && !ui.dlg && !ui.cardRes && Math.hypot(L.x - P.pos.x, L.z - P.pos.z) < 1.7 && Math.abs(P.pos.y - L.y + 1.2) < 3) { L.taken = true; L.g.visible = false; this.found.add(L.data.ref); store.set('letters', [...this.found]); ui.setLetters(this.found.size, this.totalLetters); this.sound.collect();
          if (!this.autoplay) { P.locked = true; ui.card({ kicker: 'A letter of Paul · ' + L.data.from, title: L.data.ref, body: `<q>${L.data.text}</q>`, ref: 'World English Bible', button: 'Keep' }).then(() => { P.locked = false; }); } } }
      // compass for the blind walk
      if (this.compassTarget) { const p = posOf(this.compassTarget), dx = p.x - P.pos.x, dz = p.z - P.pos.z, c = Math.cos(P.camYaw), s = Math.sin(P.camYaw); ui.setCompass(Math.atan2(dx * c - dz * s, -(dx * s + dz * c))); } else if (!ui.el.compass.classList.contains('hidden')) ui.setCompass(null);
      if (P.mode === 'ship') ui.setHelm(P.throttle, `Sail · ${P.ship.speed.toFixed(1)} kn`); else if (!ui.el.helm.classList.contains('hidden')) ui.setHelm(null);
      E.update(dt, P.pos);
      const e = E.env; this.sound.set({ wind: 0.05 + e.wind * 0.11, rain: e.rain * 0.3, sea: this.amb.sea || 0, crowd: this.amb.crowd || 0, fire: this.amb.fire || 0, music: this.amb.music ?? 1 }); this.sound.update(dt);
    }
    if (render) {
      if (this.state === 'play' || this.state === 'pause') { const mk = this.marker; ui.drawMinimap(P.pos.x, P.pos.z, P.camYaw, P.mode === 'ship' ? P.ship.heading : P.yaw, mk ? posOf(mk.target) : null, this.npcs.filter(n => n.name && n.group.visible).map(n => ({ x: n.pos.x, z: n.pos.z, c: '#e8dcc0' }))); }
      E.render(dt);
    }
    inp.endFrame();
  }
}
window.__game = new Game();
