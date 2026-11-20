// Game loop, chapter flow and the scripting API used by the chapters.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { World } from './world.js';
import { Person, Beast } from './characters.js';
import { Input, Player } from './player.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { CHAPTERS } from './chapters.js';
import { q } from './common.js';
import { SIDE, GREETINGS, RANKS, MANTLES, XP, rankOf } from './tasks.js';
import { PAUL } from './characters.js';
import { preloadHero } from './hero.js';
import { preloadFauna, faunaReady, Animal } from './fauna.js';
import { I, t, sc, tNote, refLabel, version, versionName, cityName, setLang, initialLang, applyStatic, isEs } from './i18n.js';

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
    this.prog = store.get('prog', { xp: 0, ch: {}, mantle: 'brown', texts: {} }); this.spots = []; this.applyMantle();
    const q = new URLSearchParams(location.search); setLang(q.get('lang') === 'es' || q.get('lang') === 'en' ? q.get('lang') : initialLang()); applyStatic(); this.autoplay = q.has('auto'); this.timeScale = +(q.get('speed') || 1); this.stopAt = q.get('stop'); // ?auto&speed=N&stop=text are test hooks
    this.makeBeacon(); this.bindUI();
    addEventListener('resize', () => this.engine.resize());
    this.autoQ = store.get('quality', null) === null; this.fpsT = 0; this.fpsN = 0;
    this.engine.setQuality(store.get('quality', 'high')); document.getElementById('quality').value = this.engine.quality;
    this.titleScene();
    if (q.has('ch')) this.startChapter(+q.get('ch') - 1, true);
    requestAnimationFrame((t) => this.loop(t));
  }

  bindUI() {
    const $ = (id) => document.getElementById(id), ui = this.ui;
    const go = (fn) => () => { this.sound.start(); fn(); };
    $('btnBegin').textContent = t(this.unlocked > 0 ? 'Continue the journey' : 'Begin the journey');
    $('btnBegin').onclick = go(() => this.startChapter(Math.min(this.unlocked, CHAPTERS.length - 1)));
    $('btnChapters').onclick = () => { this.fillChapters(); ui.show('title', false); ui.show('chapters'); };
    $('btnBack').onclick = () => { ui.show('chapters', false); ui.show('title'); };
    $('quality').onchange = (e) => { this.engine.setQuality(e.target.value); store.set('quality', e.target.value); this.autoQ = false; };
    $('sound').onchange = (e) => this.sound.setMuted(!e.target.checked);
    $('pauseBtn').onclick = () => this.pause(true);
    document.querySelectorAll('[data-lang]').forEach((b) => { b.onclick = () => this.setLanguage(b.dataset.lang); });
    for (const id of ['btnJournal', 'journalBtn', 'btnPJournal']) $(id).onclick = () => this.journal(true);
    $('jClose').onclick = () => this.journal(false);
    addEventListener('keydown', (e) => { if (e.code === 'KeyJ' && (this.state === 'play' || this.jOpen)) this.journal(!this.jOpen); });
    $('btnResume').onclick = () => this.pause(false);
    $('btnRestart').onclick = () => { this.pause(false); this.startChapter(this.chIndex, true); };
    $('btnSkip').onclick = () => { this.pause(false); this.finishChapter(true); };
    $('btnQuit').onclick = () => { this.pause(false); this.abort(); this.ui.show('hud', false); this.state = 'title'; this.titleScene(); this.ui.show('title'); $('btnBegin').textContent = t(this.unlocked > 0 ? 'Continue the journey' : 'Begin the journey'); };
    $('btnE').addEventListener('touchstart', (e) => { this.input.press('KeyE'); if (this.ui.dlg) this.ui.advance(); e.preventDefault(); });
    $('btnJump').addEventListener('touchstart', (e) => { this.input.press('Space'); e.preventDefault(); });
    addEventListener('keydown', (e) => { if (e.code === 'Escape' && (this.state === 'play' || this.state === 'pause')) this.pause(this.state === 'play'); });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.state === 'play' && this.input.wasLocked && !this.ui.cardRes) this.pause(true); this.input.wasLocked = !!document.pointerLockElement; });
  }
  fillChapters() {
    const list = document.getElementById('chapterList'); list.innerHTML = '';
    CHAPTERS.forEach((c, i) => { const b = document.createElement('button'); b.innerHTML = `<small>${t(c.journey)} · ${refLabel(c.ref)}</small>${ROMAN[i]}. ${t(c.title)}`; b.disabled = i > this.unlocked && !this.autoplay; b.onclick = () => { this.sound.start(); this.ui.show('chapters', false); this.startChapter(i); }; list.appendChild(b); });
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
  // every chapter starts with Paul able to see (Chapter I blinds him at Acts 9:8 and may be left before he is healed)
  resetWorld(i) {
    const ch = CHAPTERS[i]; this.engine.clearWorld(); this.npcs = []; this.beasts = []; this.letters = []; this.amb = {}; this.blindV = 0; this.blindTo = 0; this.ui.setBlind(0); this.spots = []; this.side = SIDE[i] || {}; this.chGreet = 0; this.chMarks = new Set(); this.chDeeds = new Set(); this.chRefs = []; this.greetI = i;
    const world = this.world = new World(this.engine, ch.seed || i + 1); this.engine.setEnv(ch.env()); this.player.rebuild(); this.player.setWorld(world); this.engine.waters.length = 0;
    this.api = this.makeApi(this.token); this.scene = ch.build(this.api, world) || {}; if (this.side.setup) this.side.setup(this.api, world); world.finish(); this.ui.buildMinimap(world); this.ch = ch; this.chIndex = i; return ch;
  }
  titleScene() { this.token = {}; this.resetWorld(0); this.player.teleport(0, 60, Math.PI); this.input.enabled = false; this.fadeTo = 0; this.fadeRate = 0.5; this.ui.show('loading', false); }
  async startChapter(i, skipIntro = false) {
    this.abort(); const tok = this.token = {}; const ui = this.ui;
    for (const s of ['title', 'chapters', 'pause', 'card', 'mapscreen']) ui.show(s, false);
    this.state = 'loading'; this.input.enabled = false; this.fadeV = this.fadeTo = 1; ui.setFade(1); this.whiteV = this.whiteTo = 0; ui.setWhite(0);
    await new Promise(r => setTimeout(r, 30)); if (this.token !== tok) return;
    const ch = this.resetWorld(i); const api = this.api;
    ui.show('hud'); ui.setChapter(ROMAN[i], ch.title); ui.setObjective(''); ui.setLetters(this.found.size, this.totalLetters); this.award(0); this.drawTasks();
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
    if (!skipped && !this.autoplay) { const c = this.chp(i); if (!c.done) { c.done = true; this.award(XP.story); } this.checkCrowns(); }
    const crowns = this.crownList(i), cc = this.chp(i), summary = `\n\n<b style="color:var(--gold);font-weight:400;letter-spacing:.14em">${crowns.map(x => (cc.crowns.includes(x[0]) ? '♛ ' : '♕ ') + t(x[1]) + (x[3] > 1 ? ` ${x[2]}/${x[3]}` : '')).join('   ')}</b>`;
    this.unlocked = Math.max(this.unlocked, Math.min(i + 1, CHAPTERS.length - 1)); store.set('unlocked', this.unlocked);
    this.input.enabled = false; this.fadeTo = 1; this.fadeRate = 1; this.sound.chime();
    if (!skipped && !this.autoplay) { await new Promise(r => setTimeout(r, 900)); if (this.token !== tok) return; ui.show('hud', false); await ui.card({ kicker: 'Chapter complete', title: ch.title, body: ch.outro, extra: summary, ref: ch.outroRef || '' }); if (this.token !== tok) return; }
    if (i + 1 < CHAPTERS.length) return this.startChapter(i + 1);
    ui.show('hud', false);
    if (!this.autoplay) await ui.card({ kicker: 'The end of the journey', title: 'I have kept the faith', body: q('For I am already being offered, and the time of my departure has come. I have fought the good fight. I have finished the course. I have kept the faith. From now on, the crown of righteousness is stored up for me, which the Lord, the righteous judge, will give to me on that day; and not to me only, but also to all those who have loved his appearing.', '2 Timothy 4:6-8'), extra: '\n\n' + t('Letters found: {n} of {m}. Rank: {r}. Replay any chapter to earn the crowns you missed.').replace('{n}', this.found.size).replace('{m}', this.totalLetters).replace('{r}', t(RANKS[rankOf(this.prog.xp)][1])) + '\n\n' + t('Scripture quotations are from the {v} (public domain).').replace('{v}', versionName()), ref: '2 Timothy 4:6-8', button: 'Return to title' });
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
      spawn(look, x, z, yaw = 0, name = '') { chk(); const p = new Person(look, G.world); p.name = name; p.place(x, z, yaw); p.lookAt = G.player.person; G.world.group.add(p.group); G.npcs.push(p); return p; },
      faunaReady,
      animal(kind, x, z, yaw = 0, load = 'none', seed = 1) { chk(); if (!faunaReady()) return null; const a = new Animal(kind, G.world, load, seed); a.place(x, z, yaw); G.world.group.add(a.group); G.beasts.push(a); return a; },
      beast(kind, color, x, z, yaw = 0) { chk(); const b = new Beast(kind, color, G.world); b.pos.set(x, G.world.ground(x, z), z); b.yaw = yaw; b.group.rotation.y = yaw; G.world.group.add(b.group); G.beasts.push(b); return b; },
      say: A(async (lines, opt = {}) => { if (!opt.free) G.player.locked = true; if (G.autoplay) { G.ui.probe(lines); await wait(0.05); } else await G.ui.say(lines); if (!opt.free) G.player.locked = false; }),
      bark(who, text, ref, sec) { chk(); G.ui.bark(who, text, ref, sec); },
      objective(text, target = null) { chk(); stop(text); G.ui.setObjective(text); G.marker = target ? { target } : null; },
      reach: A(async (target, radius = 3, text = null) => { stop(text); if (text) G.ui.setObjective(text); G.marker = { target }; if (G.autoplay) { await wait(0.3); G.warp(target); await wait(0.1); } else await until(() => { const p = posOf(target), q = G.player.pos; return Math.hypot(p.x - q.x, p.z - q.z) < radius; }); G.marker = null; G.sound.chime(); }),
      interact: A(async (target, label, radius = 2.8, text = null) => { stop(text || label); if (text) G.ui.setObjective(text); G.marker = target ? { target } : null; if (G.autoplay) await wait(0.3); else await new Promise((res) => { G.interaction = { target, label, radius, res }; }); G.interaction = null; G.marker = null; G.ui.setPrompt(null); }),
      fade: A(async (v, sec = 1) => { G.fadeTo = v; G.fadeRate = 1 / Math.max(0.01, sec); await until(() => Math.abs(G.fadeV - v) < 0.01); }),
      white: A(async (v, sec = 1) => { G.whiteTo = v; G.whiteRate = 1 / Math.max(0.01, sec); await until(() => Math.abs(G.whiteV - v) < 0.01); }),
      card: A(async (o) => { if (G.autoplay) { G.ui.probeCard(o); return; } G.player.locked = true; G.input.enabled = false; if (document.exitPointerLock) document.exitPointerLock(); await G.ui.card(o); G.input.enabled = true; G.player.locked = false; }),
      walk: A((npc, pts, speed) => G.autoplay ? (npc.place(...(typeof pts[0] === 'number' ? pts : pts[pts.length - 1])), Promise.resolve()) : npc.walk(pts, speed)),
      blind(v) { chk(); G.blindTo = v; }, compass(t) { chk(); G.compassTarget = t; },
      letter(x, z, data) { chk(); G.addLetter(x, z, data); },
      env(target, sec = 2) { chk(); G.engine.transitionEnv(target, sec); },
      toast(t) { chk(); G.ui.toast(t); },
      deed(id) { chk(); G.doDeed(id); }, spot(o) { chk(); G.spots.push(o); },
    };
    return api;
  }
  warp(target) { const p = posOf(target), P = this.player; if (P.mode === 'ship') { P.ship.x = p.x; P.ship.z = p.z; P.pos.set(p.x, 0, p.z); } else if (P.mode === 'foot' || P.mode === 'horse') { P.pos.set(p.x, this.world.ground(p.x, p.z) + 0.1, p.z + 0.5); if (P.isScripted) P.person.pos.copy(P.pos); } }
  addLetter(x, z, data) {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.1), fog: false });
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10), m); roll.rotation.z = Math.PI / 2; g.add(roll);
    for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8a3a2a })); k.position.x = s * 0.28; g.add(k); }
    const y = (data.y ?? this.world.ground(x, z)) + 1.2; g.position.set(x, y, z); this.world.group.add(g);
    this.chRefs.push(data.ref); const taken = this.found.has(data.ref); g.visible = !taken; this.letters.push({ g, x, z, y, data, taken });
  }

  setLanguage(l) { if (l === I.lang) return; setLang(l); this.ui.relang(); const qs = document.getElementById('quality'); if (qs) applyStatic(); this.drawTasks && this.state !== 'title' && this.drawTasks(); this.award(0); if (this.jOpen) { this.jOpen = false; this.journal(true); } if (!document.getElementById('chapters').classList.contains('hidden')) this.fillChapters(); document.getElementById('btnBegin').textContent = t(this.unlocked > 0 ? 'Continue the journey' : 'Begin the journey'); }
  // ---------------------------------------------------------- tasks and rewards
  chp(i = this.chIndex) { return (this.prog.ch[i] ||= { done: false, greet: 0, marks: [], deeds: [], crowns: [] }); }
  save() { store.set('prog', this.prog); }
  applyMantle() { const m = MANTLES.find(x => x.id === this.prog.mantle) || MANTLES[0]; PAUL.cloak = m.color; if (this.state === 'title' && this.world) this.titleScene(); }
  award(xp) { const before = rankOf(this.prog.xp); this.prog.xp += xp; this.save(); const r = rankOf(this.prog.xp); this.ui.el.rank.textContent = `${t(RANKS[r][1])} · ${this.prog.xp}`;
    if (r > before && xp) { const m = MANTLES.filter(x => x.xp <= this.prog.xp).pop(); setTimeout(() => { this.ui.reward('New rank', RANKS[r][1], m && m.xp > 0 ? t('Mantle unlocked: {m} — choose it in the journal (J)').replace('{m}', t(m.name)) : '', true); this.sound.collect(); }, 1800); } }
  greet(n) { n.greeted = true; if (n.auto && !n.path && !n.follow) n.faceTo(this.player.pos.x, this.player.pos.z); const g = GREETINGS[(this.greetI++ * 3 + this.chGreet) % GREETINGS.length]; this.ui.bark('Paul', g[0], g[1], 6); this.sound.chime();
    this.chGreet++; const c = this.chp(); if (this.chGreet > c.greet) { c.greet = this.chGreet; this.award(XP.greet); } this.checkCrowns(); }
  doDeed(id) { if (this.chDeeds.has(id)) return; this.chDeeds.add(id); const d = (this.side.deeds || []).find(x => x[0] === id), c = this.chp(); if (!c.deeds.includes(id)) { c.deeds.push(id); this.award(XP.deed); } this.ui.reward('Deed done', d ? d[1] : id); this.sound.collect(); this.checkCrowns(); }
  // crowns: story, letters, fellowship (greetings), and discovery (landmarks + deeds)
  crownList(i = this.chIndex) { const sd = SIDE[i] || {}, c = this.chp(i), refs = i === this.chIndex ? this.chRefs : null, out = [['story', 'Finish the chapter', c.done ? 1 : 0, 1]];
    if (CHAPTERS[i].letters) out.push(['letters', 'Find Paul’s letters', refs ? refs.filter(r => this.found.has(r)).length : (c.letters || 0), CHAPTERS[i].letters]);
    if (sd.greet) out.push(['fellowship', 'Greet the people you meet', Math.min(c.greet, sd.greet), sd.greet]);
    const nd = (sd.landmarks || []).length + (sd.deeds || []).length; if (nd) out.push(['discovery', 'Landmarks and deeds', c.marks.length + c.deeds.length, nd]);
    return out; }
  checkCrowns() { const c = this.chp(); for (const [id, name, n, max] of this.crownList()) { if (id === 'letters') c.letters = Math.max(c.letters || 0, n); if (n >= max && !c.crowns.includes(id)) { c.crowns.push(id); this.award(XP.crown); setTimeout(() => this.ui.reward('Crown earned', name, 'Now they do it to receive a corruptible crown, but we an incorruptible. — 1 Corinthians 9:25'), id === 'story' ? 0 : 4300); } } this.save(); }
  drawTasks() { const sd = this.side, c = this.chp(); let h = `<h4>${t('Along the way')}</h4>`; const row = (done, text) => { h += `<div class="${done ? 'done' : ''}">${text}</div>`; };
    for (const [id, name, n, max] of this.crownList()) { if (id === 'story') continue; if (id === 'discovery') { for (const m of sd.landmarks || []) row(c.marks.includes(m[0]), c.marks.includes(m[0]) ? t(m[0]) : t('Discover a landmark')); for (const d of sd.deeds || []) row(c.deeds.includes(d[0]), t(d[1])); } else row(n >= max, `${t(name)} (${n}/${max})`); }
    this.ui.setTasks(h); }
  journal(on) { const ui = this.ui; if (on === !!this.jOpen) return; this.jOpen = on;
    if (!on) { ui.show('journal', false); if (this.jPrev) { this.state = this.jPrev; if (this.jPrev === 'pause') ui.show('pause'); if (this.jPrev === 'title') ui.show('title'); } return; }
    this.jPrev = this.state === 'play' ? 'play' : this.state; if (this.state === 'play') { this.state = 'pause'; if (document.exitPointerLock) document.exitPointerLock(); } ui.show('pause', false); ui.show('title', false);
    const xp = this.prog.xp, r = rankOf(xp), next = RANKS[r + 1]; ui.el.jRank.textContent = `${t(RANKS[r][1])} — ${xp} ${t('points')}`; ui.el.jBar.style.width = (next ? (xp - RANKS[r][0]) / (next[0] - RANKS[r][0]) * 100 : 100) + '%'; ui.el.jNext.textContent = next ? t('{n} points to “{r}”').replace('{n}', next[0] - xp).replace('{r}', t(next[1])) : tNote('I have fought the good fight. I have finished the course. I have kept the faith. — 2 Timothy 4:7');
    let h = `<h4>${t('Mantles')}${this.jPrev === 'title' ? '' : ' <small style="letter-spacing:0;text-transform:none;color:var(--dim)">— ' + t('worn from the next chapter or restart') + '</small>'}</h4><div class="mantles">`; for (const m of MANTLES) h += `<button data-m="${m.id}" class="${this.prog.mantle === m.id ? 'sel' : ''}" ${xp >= m.xp ? '' : 'disabled'}><i style="background:#${m.color.toString(16).padStart(6, '0')}"></i>${t(m.name)}${xp >= m.xp ? '' : ' · ' + m.xp}</button>`; h += `</div><h4>${t('Crowns')}</h4>`;
    let total = 0, max = 0; CHAPTERS.forEach((ch, i) => { const cl = this.crownList(i), c = this.chp(i); total += c.crowns.length; max += cl.length; h += `<div class="ch"><span>${ROMAN[i]}. ${t(ch.title)} <small style="color:var(--dim)">— ${cl.map(x => `${t(x[1]).replace(/^./, (c) => c.toLowerCase())} ${x[2]}/${x[3]}`).join(' · ')}</small></span><span>${'♛'.repeat(c.crowns.length)}${'♕'.repeat(cl.length - c.crowns.length)}</span></div>`; });
    h += `<div class="ch"><span><b>${t('All crowns')}</b></span><span>${total} / ${max}</span></div><h4>${t('Letters found')} (${this.found.size}/${this.totalLetters})</h4>`;
    for (const ref of this.found) { const tx = this.prog.texts[ref]; if (tx) h += `<div class="lt"><b>${refLabel(ref)}</b> · ${t(tx.from)}<br><i>“${sc(tx.text, ref)}”</i></div>`; } if (!this.found.size) h += `<div class="lt">${t('Glowing scrolls are hidden in every chapter. Each one is a passage from a letter Paul wrote.')}</div>`;
    ui.el.jBody.innerHTML = h; ui.el.jBody.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => { this.prog.mantle = b.dataset.m; this.save(); this.applyMantle(); this.jOpen = false; this.journal(true); }; });
    ui.show('journal'); }

  // ---------------------------------------------------------- frame
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const real = (now - this.last) / 1000, raw = Math.min(0.05, real); this.last = now;
    // if the device struggles and the player has not chosen a quality, step it down
    if (this.autoQ && this.state === 'play' && !this.autoplay && real < 0.5) { this.fpsT += real; this.fpsN++; if (this.fpsT > 4) { const fps = this.fpsN / this.fpsT; this.fpsT = this.fpsN = 0; const q = this.engine.quality; if (fps < 27 && q !== 'low') { const nq = q === 'high' ? 'medium' : 'low'; this.engine.setQuality(nq); document.getElementById('quality').value = nq; this.ui.toast(t('Graphics set to {q} for a smoother journey').replace('{q}', t(nq === 'medium' ? 'Medium' : 'Low'))); } else if (fps > 40) this.autoQ = false; } }
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
      // interaction prompt: the story's own interaction first, then side tasks and greetings
      const it = this.interaction; let prompt = null, promptRaw = false;
      if (it && !ui.dlg) { const p = it.target ? posOf(it.target) : null, near = !p || Math.hypot(p.x - P.pos.x, p.z - P.pos.z) < it.radius; if (near) { prompt = it.label; if (inp.hit('KeyE')) { this.interaction = null; prompt = null; it.res(); } } }
      if (!prompt && this.state === 'play' && !ui.dlg && !ui.cardRes && !P.locked && P.mode === 'foot' && !P.swimming && !this.blindV && inp.enabled) {
        for (const sp of this.spots) if (!sp.busy && sp.active() && Math.hypot(sp.x - P.pos.x, sp.z - P.pos.z) < sp.r) { prompt = sp.label(); promptRaw = true; if (inp.hit('KeyE')) { sp.busy = true; prompt = null; sp.use().catch(() => {}).then(() => { sp.busy = false; }); } break; }
        if (!prompt && this.side.greet) { let best = null, bd = 2.3; for (const n of this.npcs) { if (n.greeted || n.greetable === false || !n.group.visible || n.group.parent !== this.world.group || n.speed > 3) continue; const d = Math.hypot(n.pos.x - P.pos.x, n.pos.z - P.pos.z); if (d < bd) { bd = d; best = n; } }
          if (best) { prompt = t('Greet') + (best.name ? ' ' + t(best.name) : ''); promptRaw = true; if (inp.hit('KeyE')) { prompt = null; this.greet(best); } } }
      }
      ui.setPrompt(prompt, promptRaw);
      // landmarks
      if (this.state === 'play' && this.side.landmarks) for (const m of this.side.landmarks) if (!this.chMarks.has(m[0]) && Math.hypot(m[1] - P.pos.x, m[2] - P.pos.z) < m[3] && !this.blindV) { this.chMarks.add(m[0]); const first = !this.chp().marks.includes(m[0]); if (first) { this.chp().marks.push(m[0]); this.award(XP.landmark); } ui.reward('Landmark discovered', m[0], m[4]); this.sound.chime(); this.checkCrowns(); }
      if (this.state === 'play') this.drawTasks();
      // objective beacon
      const mk = this.marker; this.beacon.visible = !!mk && !this.blindV;
      if (mk) { const p = posOf(mk.target), W = this.world; let y = (typeof p.y === 'number') ? p.y : W.ground(p.x, p.z); if (W.waterLevel !== null) y = Math.max(y, W.waterLevel);
        this.beacon.position.set(p.x, y, p.z); this.beacon.material.uniforms.uT.value = this.time; this.beaconRing.scale.setScalar(1 + 0.15 * Math.sin(this.time * 3)); }
      // letters
      for (const L of this.letters) { if (L.taken) continue; L.g.rotation.y += dt * 1.5; L.g.position.y = L.y + Math.sin(this.time * 2 + L.x) * 0.12;
        if (this.state === 'play' && !ui.dlg && !ui.cardRes && Math.hypot(L.x - P.pos.x, L.z - P.pos.z) < 1.7 && Math.abs(P.pos.y - L.y + 1.2) < 3) { L.taken = true; L.g.visible = false; this.found.add(L.data.ref); store.set('letters', [...this.found]); ui.setLetters(this.found.size, this.totalLetters); this.sound.collect(); this.prog.texts[L.data.ref] = { text: L.data.text, from: L.data.from }; this.award(XP.letter);
          if (!this.autoplay) { P.locked = true; ui.card({ kicker: 'A letter of Paul · ' + L.data.from, title: L.data.ref, body: q(L.data.text, L.data.ref), ref: 'World English Bible', button: 'Keep' }).then(() => { P.locked = false; }); } } }
      // compass for the blind walk
      if (this.compassTarget) { const p = posOf(this.compassTarget), dx = p.x - P.pos.x, dz = p.z - P.pos.z, c = Math.cos(P.camYaw), s = Math.sin(P.camYaw); ui.setCompass(Math.atan2(dx * c - dz * s, -(dx * s + dz * c))); } else if (!ui.el.compass.classList.contains('hidden')) ui.setCompass(null);
      if (P.mode === 'ship') ui.setHelm(P.throttle, `${t('Sail')} · ${P.ship.speed.toFixed(1)} ${t('kn')}`); else if (!ui.el.helm.classList.contains('hidden')) ui.setHelm(null);
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
Promise.all([preloadHero(), preloadFauna()]).then(() => { try { window.__game = new Game(); } catch (e) {
  console.error(e); const l = document.getElementById('loading'); l.classList.remove('hidden');
  const msg = '<h3>This journey needs WebGL</h3><p class="help">Your browser or device could not start 3D graphics. Try a recent version of Chrome, Edge, Firefox or Safari, and make sure hardware acceleration is turned on.</p>'; l.querySelector('.panel').innerHTML = t(msg);
} });
