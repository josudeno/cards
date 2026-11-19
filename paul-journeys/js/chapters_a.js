// Chapters I–IV: Damascus, Cyprus, Lystra, Philippi.
import * as THREE from 'three';
import { ENV, makeEnv } from './engine.js';
import { fbm, smooth, pathDist, pathPoint, makeShip, lerp } from './world.js';
import { makeCart } from './fauna.js';
import { dist, look, q, lead, townsfolk, follow } from './common.js';

// ============================================================ I. DAMASCUS
const damascus = {
  title: 'The Road to Damascus', journey: 'The Calling', ref: 'Acts 9:1-25', place: 'Near Damascus, about noon', route: ['Jerusalem', 'Damascus'], letters: 2, seed: 11,
  env: ENV.levantNoon,
  intro: `${q('But Saul, still breathing threats and slaughter against the disciples of the Lord, went to the high priest and asked for letters from him to the synagogues of Damascus, that if he found any who were of the Way, whether men or women, he might bring them bound to Jerusalem.', 'Acts 9:1-2')}\n\nYou are Saul of Tarsus. The road north is nearly behind you, and the walls of Damascus are in sight.`,
  outro: `Saul stayed with the disciples at Damascus, and grew in strength.\n\n${q('When many days were fulfilled, the Jews conspired together to kill him, but their plot became known to Saul. They watched the gates both day and night that they might kill him, but his disciples took him by night and let him down through the wall, lowering him in a basket.', 'Acts 9:23-25')}\n\nThe persecutor had become the persecuted.`,
  build(G, W) {
    // Limestone hill country gives way to the irrigated Ghouta oasis around Damascus; the Anti-Lebanon range stands to the
    // west and north-west and snow-capped Mount Hermon to the south-west (north is -z, east is +x).
    const road = [[4, 215], [9, 150], [-5, 95], [4, 40], [0, -20], [0, -78]];
    const cityD = (x, z) => Math.max(Math.abs(x) - 74, Math.abs(z + 140) - 64);
    W.bounds = 235; W.road(road, 6);
    W.road([[0, -76], [0, -198]], 9, null, { paved: true }); // Straight Street and the cross streets are paved
    for (const st of [[[-66, -160], [-8, -160]], [[8, -118], [66, -118]], [[10, -172], [66, -172]], [[-66, -104], [-10, -104]]]) W.road(st, 6, null, { paved: true });
    const oasis = (x, z) => smooth(115, 70, cityD(x, z)) * smooth(75, 35, z);                 // 1 inside the irrigated land
    const CH_X = [-42, 46], CH_Z = -40;                                                        // irrigation channels
    const chDist = (x, z) => { let d = 1e9; for (const cx of CH_X) if (z < 52 && z > -76) d = Math.min(d, Math.abs(x - cx)); if (Math.abs(x) > 9 && Math.abs(x) < 150) d = Math.min(d, Math.abs(z - CH_Z)); return d; };
    const plot = (x, z) => { const i = Math.floor((x + 7) / 22), j = Math.floor((z + 3) / 16); const h = Math.abs(Math.sin(i * 127.1 + j * 311.7) * 43758.5) % 1; return { i, j, kind: h < 0.3 ? 'wheat' : h < 0.48 ? 'barley' : h < 0.66 ? 'veg' : h < 0.86 ? 'orchard' : 'fallow', fx: (x + 7) / 22 - i, fz: (z + 3) / 16 - j }; };
    const H = (x, z) => {
      const rd = pathDist(road, x, z)[0], cd = cityD(x, z), o = oasis(x, z), m = smooth(5, 30, rd) * smooth(0, 28, cd);
      let hills = (fbm(x * 0.013 + 3, z * 0.013) * 26 - 8) + (fbm(x * 0.05, z * 0.05) - 0.5) * 4;      // rolling limestone country
      const step = 2.2, k = hills / step, fr = k - Math.floor(k); hills = (Math.floor(k) + smooth(0.55, 0.9, fr)) * step * 0.7 + hills * 0.3; // stepped limestone beds
      let h = (fbm(x * 0.008, z * 0.008) * 3 - 1.5) * smooth(0, 28, cd) + hills * m * (1 - o) + 0.3 * o * (fbm(x * 0.02, z * 0.02) - 0.5);
      if (o > 0.5) h -= 0.95 * smooth(1.7, 0.7, chDist(x, z));                                    // channel trench
      return h;
    };
    const C = (h) => new THREE.Color(h);
    W.terrain({ size: 560, seg: 200, height: H, color: (x, z, h, sl) => {
      const rd = pathDist(road, x, z)[0], cd = cityD(x, z), o = oasis(x, z);
      if (cd < 0) return 0xbfb49c;
      if (rd < 3.1 + fbm(x * 0.3, z * 0.3) * 0.8) return 0xb2a284;                                   // beaten earth and gravel
      if (sl > 0.42) return new THREE.Color(0xb0a690).lerp(C(0x988e7c), fbm(x * 0.1, z * 0.1)).getHex(); // bare limestone ledges
      const dry = C(0xb4a483).lerp(C(0x8e8c64), smooth(0.42, 0.68, fbm(x * 0.035, z * 0.035)) * 0.75).lerp(C(0xb7a888), smooth(0.5, 0.8, fbm(x * 0.11, z * 0.11)) * 0.5);  // chalky soil, scrub, stony patches
      if (o < 0.05) return dry.getHex();
      const p = plot(x, z), edge = Math.min(p.fx, 1 - p.fx, p.fz, 1 - p.fz);
      let f;
      if (edge < 0.05 || chDist(x, z) < 2.2) f = C(0x9a8a68);                                         // field banks and channel edges
      else if (p.kind === 'wheat') f = C(0x86a04c).lerp(C(0x9cae58), fbm(x * 0.2, z * 0.2));
      else if (p.kind === 'barley') f = C(0xccb468).lerp(C(0xb9a35a), fbm(x * 0.2, z * 0.2));
      else if (p.kind === 'veg') f = C(0x5f8a3c).lerp(C(0x7a5c40), 0.5 + 0.5 * Math.sin(p.fx * 60));     // rows of greens on dark soil
      else if (p.kind === 'orchard') f = C(0x8f9c58);
      else f = C(0x8c7254).multiplyScalar(0.9 + 0.12 * Math.sin(p.fz * 90));                          // ploughed furrows
      return dry.lerp(f, smooth(0.2, 0.8, o)).getHex();
    } });
    W.horizon({ color: 0xa69a7a, rock: 0x8a8478, height: 28, seed: 21, snow: 205,
      peaks: [[Math.PI * 0.74, 0.42, 300], [Math.PI * 1.0, 0.5, 210], [Math.PI * 1.24, 0.45, 240], [Math.PI * 1.48, 0.3, 110], [Math.PI * 0.55, 0.3, 90]] });
    // irrigation: stone-lined channels, a turning water-wheel, date palms along the banks
    for (const cx of CH_X) W.channel(cx, 50, cx, -74, 1.3, -0.42);
    W.channel(-148, CH_Z, -10, CH_Z, 1.3, -0.42); W.channel(10, CH_Z, 148, CH_Z, 1.3, -0.42);
    W.waterwheel(-42, 10, Math.PI / 2, 3.0, -0.6);
    // the oasis: fields of grain and greens, orchards in rows, field walls
    const r = W.rand;
    for (let i = -8; i <= 7; i++) for (let j = -8; j <= 4; j++) {
      const x0 = i * 22 - 7, z0 = j * 16 - 3, cx = x0 + 11, cz = z0 + 8, p = plot(cx, cz);
      if (oasis(cx, cz) < 0.6 || cityD(cx, cz) < 6 || pathDist(road, cx, cz)[0] < 14 || chDist(cx, cz) < 6) continue;
      if (p.kind === 'wheat') W.grass(170, x0 + 1.5, z0 + 1.5, x0 + 20.5, z0 + 14.5, (x, z) => chDist(x, z) > 2, [0x8aa64e, 0x9ab25a, 0x7c9a46]);
      if (p.kind === 'barley') W.grass(170, x0 + 1.5, z0 + 1.5, x0 + 20.5, z0 + 14.5, (x, z) => chDist(x, z) > 2, [0xd2bc70, 0xc8ae60, 0xdcc87e]);
      if (p.kind === 'veg') for (let k = 0; k < 26; k++) W._inst('bush', x0 + 2 + (k % 9) * 2.2, H(x0 + 2 + (k % 9) * 2.2, z0 + 3 + Math.floor(k / 9) * 4.5), z0 + 3 + Math.floor(k / 9) * 4.5, r.range(0.35, 0.55), r() * 6, r.range(0.4, 0.6));
      if (p.kind === 'orchard') for (let a = 3; a < 21; a += 6) for (let b = 3; b < 15; b += 6) W.tree(r() < 0.75 ? 'olive' : 'oak', x0 + a + r.range(-0.6, 0.6), z0 + b + r.range(-0.6, 0.6), r() < 0.75 ? 0.75 : 0.5);
      if (r() < 0.35) W.drywall(x0, z0, x0 + 22, z0, 0.7, 8);
    }
    for (const cx of CH_X) for (let z = 46; z > -70; z -= r.range(9, 16)) W.tree('palm', cx + (r() < 0.5 ? -3 : 3), z, 0.95);
    // dry-stone walls line the road through the farmland, with gaps for field tracks
    for (const sd of [-1, 1]) { W.drywall(sd * 6.5, 60, sd * 5.5, 30, 0.85, 12); W.drywall(sd * 5.5, 30, sd * 5.5, -66, 0.85, 14); }
    // limestone hill country: outcrops, scrub, a few olive terraces
    W.scatter('rock', 320, -230, 40, 230, 230, (x, z) => pathDist(road, x, z)[0] > 8, 1.5);
    W.scatter('rock', 260, -230, 40, 230, 230, (x, z) => pathDist(road, x, z)[0] > 5, 0.5);
    W.scatter('rock', 60, -230, -60, 230, 60, (x, z) => pathDist(road, x, z)[0] > 8 && oasis(x, z) < 0.3, 1.2);
    W.scatter('bush', 420, -230, -60, 230, 230, (x, z) => pathDist(road, x, z)[0] > 6 && cityD(x, z) > 4 && oasis(x, z) < 0.4);
    W.scatter('olive', 40, -200, 40, 200, 200, (x, z, h) => pathDist(road, x, z)[0] > 10 && h < 14);
    W.scatter('cypress', 18, -160, -60, 160, 40, (x, z) => cityD(x, z) > 6 && pathDist(road, x, z)[0] > 9 && oasis(x, z) > 0.3 && chDist(x, z) > 4);
    W.grass(7000, -200, 40, 200, 220, (x, z) => pathDist(road, x, z)[0] > 4.5 && fbm(x * 0.06, z * 0.06) > 0.5, [0xb8ad7a, 0xa8a06e, 0xc4b888]);
    // Damascus: limestone walls and gates, a planned street grid, houses of stone and plastered brick
    W.cityWalls(-72, -202, 72, -78, 9, [{ side: 's', at: 0.5, width: 6 }], 0xd6cab0);
    { const y = W.terrainFn(0, -78); W.S.add(new THREE.TorusGeometry(3.05, 0.42, 6, 18, Math.PI), 0xcfc3a8, 0, y + 6.4, -78, 0, 0, 0, 1, 1, 2.2); } // arched gateway
    const court = (x, z) => x < -4 && x > -26 && Math.abs(z + 135) < 11;
    W.street(0, -84, 0, -196, 9, 'mud', { skip: court }); W.street(-66, -160, -8, -160, 6, 'stone', { skip: court }); W.street(8, -118, 66, -118, 6, 'stone'); W.street(10, -172, 66, -172, 6, 'mud', { sides: [1] }); W.street(-66, -104, -10, -104, 6, 'mud', { sides: [-1] });
    for (let z = -92; z > -190; z -= 9) for (const sx of [-4.2, 4.2]) if (!(sx < 0 && Math.abs(z + 135) < 6)) W.column(sx, 0, z, 4.6, 0.3, 0xddd2ba);
    for (const sx of [-4.2, 4.2]) W.box(sx, W.terrainFn(sx, -140) + 4.6, -140, 0.9, 0.45, 100, 0xddd2ba); // colonnade entablature
    // the house of Judah on Straight Street: an open courtyard
    W.wall(-24, -144, -24, -126, 3.4, 0.6, 0xd6c29a, false); W.wall(-24, -144, -5, -144, 3.4, 0.6, 0xd6c29a, false); W.wall(-24, -126, -5, -126, 3.4, 0.6, 0xd6c29a, false); W.wall(-5, -144, -5, -138, 3.4, 0.6, 0xd6c29a, false); W.wall(-5, -132, -5, -126, 3.4, 0.6, 0xd6c29a, false);
    W.house(-19.5, -139.5, 7, 7, 3.6, Math.PI / 2, 'mud', { awning: true, doorX: 0 }); W.box(-12, 0, -131, 3, 0.06, 2, 0x8a4a3a); W.pot(-8, -129, 1.2); W.pot(-9.2, -128.6, 0.9); W.tree('olive', -9, -141, 0.6); W.tree('bush', -22, -129);
    { const y = W.terrainFn(-14, -131); W.box(-14.2, y, -128.2, 1.2, 0.7, 1.2, 0x9a9282); W.S.cyl(-14.2, y + 0.7, -128.2, 0.45, 0.45, 0.18, 0x8a8272, 12); } // hand-mill
    // the synagogue: a plain stone hall with a porch, facing the street
    const synY = W.terrainFn(38, -146); W.house(38, -146, 14, 12, 6, -Math.PI / 2, 'stone', { doorX: 0, color: 0xcfc4ac });
    for (const dz of [-4.5, -1.5, 1.5, 4.5]) W.column(29.6, synY, -146 + dz, 4.4, 0.3, 0xe0d6c0); W.box(29.6, synY + 4.4, -146, 1.4, 0.4, 11, 0xe0d6c0);
    // the temple of Jupiter-Hadad rises above the roofs
    W.temple(-40, -188, 0, { w: 15, d: 22, h: 9, nf: 6, ns: 9, color: 0xe4dac6, roof: 0xa86a48 });
    // markets along Straight Street
    for (const [x, z, ry] of [[6.5, -100, -Math.PI / 2], [-6.5, -112, Math.PI / 2], [6.5, -150, -Math.PI / 2], [6.5, -125, -Math.PI / 2], [-6.5, -165, Math.PI / 2], [6.5, -180, -Math.PI / 2], [-6.5, -98, Math.PI / 2]]) W.stall(x, z, ry);
    for (const [x, z] of [[8.2, -108], [8.6, -109.2], [-8.4, -120], [8.1, -158], [-8.3, -150], [8.4, -172]]) W.pot(x, z, r.range(0.8, 1.3), r.pick([0xb06a3c, 0xa8603a, 0xc08a5a]));
    for (const [x, z] of [[-8.2, -94], [8.5, -134], [-8.2, -176]]) W.crate(x, z, 0.7);
    // the people of the road and the city
    const men = [0, 1, 2].map(i => G.spawn(look(40 + i, 'man', { head: 'cloth', long: false, cloak: [0x6a4a2a, 0x5a3a28, 0x7a5a3a][i], stripes: i + 1 }), 2 + i * 1.5, 205, Math.PI));
    const folk = townsfolk(G, [[3, -95, [3, -125]], [-3, -150, [-3, -110]], [8, -100], [-8, -113], [20, -118, [50, -118]], [2, -170, [2, -185]], [-30, -160, [-12, -160]], [8, -151], [-2, -188], [3, -140, [3, -165]]], 5);
    const watch = [-3.6, 3.6].map((x, i) => { const n = G.spawn(look(70 + i, 'man', { head: 'cloth', cloth: 0x4a3a2a, robe: 0x5a4a3a, long: false, cloak: 0x3a2e24, spear: true }), x, -74, 0); n.name = i ? '' : 'Gate watchmen'; n.greetable = false; return n; });
    const farmers = [[-60, -20, 'work'], [-75, 8, 'work'], [70, -22, 'work'], [88, 4, 'work'], [-24, -58, 'carry'], [30, 22, 'work']].map(([x, z, pose], i) => { const n = G.spawn(look(80 + i, i === 4 ? 'woman' : 'man', { head: 'cloth', long: false, robe: [0x9a8a6a, 0x8a7a5a, 0xa89a78][i % 3] }), x, z, i); n.setPose(pose); return n; });
    // caravans along the road: camels and donkeys with their drivers, and a cart leaving the city
    const total = pathPoint(road, 1)[3], gateT = 1 - 3 / total, life = [];
    const along = (t, lat) => { const [x, z, a] = pathPoint(road, Math.max(0, Math.min(1, t))); return [x + Math.cos(a) * lat, z - Math.sin(a) * lat, a]; };
    const team = (members, t0, speed, dir) => {
      const L = { members: members.map(([obj, back, lat]) => ({ obj, back, lat })), t: t0, speed, dir, wait: 0 };
      L.place = () => { for (const m of L.members) { const [x, z, a] = along(L.t - dir * m.back / total, m.lat); const o = m.obj; o.pos.set(x, W.ground(x, z), z); o.yaw = dir > 0 ? a : a + Math.PI; o.group.rotation.y = o.yaw; } };
      life.push(L); L.place(); return L;
    };
    const A = (kind, load, seed) => G.animal(kind, 0, 0, 0, load, seed);
    const driver = (seed, opts = {}) => { const n = G.spawn(look(seed, 'man', { head: 'cloth', long: false, cloak: 0x5a3a28, stripes: seed % 4 + 1, ...opts }), 0, 0, 0); n.auto = false; return n; };
    if (G.faunaReady()) {
      team([[driver(90), 0, -1.2], [A('camel', 'bales', 1), 1.2, 0.4], [A('camel', 'bales', 2), 5.0, 0.4], [A('camel', 'bales', 3), 8.8, 0.4], [driver(91), 11, -1.1]], 0.08, 1.05, 1);
      team([[driver(92), 0, 1.0], [A('donkey', 'baskets', 4), 1.5, 0.2], [A('donkey', 'sacks', 5), 4.2, 0.2]], 0.45, 1.15, 1);
      const cart = makeCartOnRoad(G, W); team([[driver(93, { cloak: null }), 0, -1.0], [cart.donkey, 0.6, 0.1], [cart, 3.0, 0.1]], 0.72, 0.9, -1);
      team([[A('donkey', 'sacks', 6), 0, 1.2], [driver(94), 1.6, 1.6]], 0.3, 1.1, -1);
    }
    W.updaters.push((dt) => {
      const P = G.player.pos;
      for (const L of life) {
        if (L.wait > 0) { L.wait -= dt; continue; }
        L.t += L.dir * L.speed * dt / total; L.place();
        for (const m of L.members) { m.obj.speed = L.speed; if (m.obj.roll) m.obj.roll(L.speed * dt); }
        const done = L.dir > 0 ? L.t > gateT : L.t < 0.02;
        if (done) { // arrived: start the journey again out of sight
          const start = L.dir > 0 ? 0.02 : gateT - 0.01, [sx, sz] = along(start, 0);
          if (Math.hypot(sx - P.x, sz - P.z) > 70) { L.t = start; L.place(); } else { L.wait = 4; for (const m of L.members) m.obj.speed = 0; }
        }
      }
    });
    return { men, folk, syn: [38, -146], synFront: [27, -146] };
  },
  async run(G, S) {
    const P = G.player, paul = G.paul, [guide, m2, m3] = S.men;
    P.teleport(4, 190, Math.PI);
    follow(guide, paul, 2.2, 1.3); follow(m2, paul, 3.2, -1.2); follow(m3, paul, 4.6, 0.4);
    G.letter(-6, 96, { ref: '1 Timothy 1:15', from: 'to Timothy', text: 'The saying is faithful and worthy of all acceptance, that Christ Jesus came into the world to save sinners, of whom I am chief.' });
    G.letter(20, -146, { ref: 'Galatians 1:15-16', from: 'to the Galatians', text: 'But when it was the good pleasure of God, who separated me from my mother’s womb and called me through his grace to reveal his Son in me, that I might preach him among the Gentiles' });
    G.bark('', 'Saul carries letters from the high priest to the synagogues of Damascus.', null, 7);
    await G.reach([0, -18], 7, 'Follow the road to Damascus');
    // ---- the light from heaven
    P.locked = true; G.sound.glory(); G.env({ glory: 1 }, 1.0); G.engine.shake(0.08, 1.5);
    await G.white(0.9, 1.2); paul.setPose('fallen'); for (const m of S.men) { m.follow = null; m.speed = 0; m.faceTo(paul.pos.x, paul.pos.z); }
    await G.white(0.3, 1.6);
    await G.say([
      ['', 'As he traveled, he got close to Damascus, and suddenly a light from the sky shone around him.', 'Acts 9:3'],
      ['A voice', 'Saul, Saul, why do you persecute me?', 'Acts 9:4'],
      ['Saul', 'Who are you, Lord?', 'Acts 9:5'],
      ['The Lord', 'I am Jesus, whom you are persecuting. But rise up and enter into the city, then you will be told what you must do.', 'Acts 9:5-6'],
      ['', 'The men who traveled with him stood speechless, hearing the sound, but seeing no one.', 'Acts 9:7'],
    ]);
    G.env({ glory: 0 }, 3); G.blind(1); await G.white(0, 2.5);
    paul.setPose('grope'); P.poseLock = true;
    await G.say([['', 'Saul arose from the ground, and when his eyes were opened, he saw no one. They led him by the hand, and brought him into Damascus.', 'Acts 9:8']]);
    P.speedMul = 0.72; P.canRun = false; G.compass(guide); guide.setPose('hold');
    follow(m2, paul, 2.5, -1.4, 3); follow(m3, paul, 3.6, 0.8, 3);
    G.objective('You cannot see. Follow the hand that leads you (the light above shows the way)');
    await lead(G, guide, [[0, -60], [0, -84], [0, -120], [-1.5, -135], [-10, -135]], 2.5, 6.5);
    // ---- three days, then Ananias
    G.compass(null); await G.fade(1, 1.2);
    P.poseLock = false; P.speedMul = 1; P.canRun = true; P.teleport(-13, -134, Math.PI / 2); paul.setPose('pray'); P.locked = true; P.camYaw = -0.9; P.camPitch = 0.25;
    guide.setPose('idle'); guide.place(-20, -130, 2); m2.group.visible = m3.group.visible = false; m2.follow = m3.follow = null;
    await G.say([['', 'He was without sight for three days, and neither ate nor drank.', 'Acts 9:9']]);
    const ananias = G.spawn(look(77, 'man', { robe: 0xe2d8c0, head: 'cloth', beard: true, hair: 0x6a6660, long: true }), 2, -135, -Math.PI / 2, 'Ananias');
    G.blind(0.8); await G.fade(0, 1.5);
    await G.say([
      ['The Lord, to Ananias', 'Arise, and go to the street which is called Straight, and inquire in the house of Judah for one named Saul, a man of Tarsus. For behold, he is praying', 'Acts 9:11'],
      ['The Lord, to Ananias', 'Go your way, for he is my chosen vessel to bear my name before the nations and kings, and the children of Israel.', 'Acts 9:15'],
    ]);
    P.locked = true; await G.walk(ananias, [[-4, -135], [-11.9, -134]], 1.7); ananias.faceTo(paul.pos.x, paul.pos.z); ananias.setPose('lay');
    await G.say([['Ananias', 'Brother Saul, the Lord, who appeared to you on the road by which you came, has sent me that you may receive your sight and be filled with the Holy Spirit.', 'Acts 9:17']]);
    G.sound.collect(); await G.white(0.7, 0.35); G.blind(0); G.game.blindV = 0; G.ui.setBlind(0); paul.setPose('idle'); ananias.setPose('idle'); await G.white(0, 1.6);
    await G.say([['', 'Immediately something like scales fell from his eyes, and he received his sight. He arose and was baptized.', 'Acts 9:18']]);
    P.locked = false; follow(ananias, paul, 2.4, 1);
    await G.reach(S.synFront, 4, 'Go to the synagogue of Damascus');
    P.locked = true; paul.setPose('preach'); P.poseLock = true;
    await G.say([['', 'Immediately in the synagogues he proclaimed the Christ, that he is the Son of God.', 'Acts 9:20']]);
    P.poseLock = false; paul.setPose('idle'); P.locked = false;
  },
};

// a donkey-drawn cart that follows the road as one team member (the cart trails its donkey)
function makeCartOnRoad(G, W) {
  const c = makeCart(W, 3), donkey = G.animal('donkey', 0, 0, 0, 'none', 7);
  W.group.add(c.group); c.pos = c.group.position; c.yaw = 0; c.speed = 0;
  c.donkey = donkey; return c;
}

// ============================================================ II. CYPRUS
const cyprus = {
  title: 'Sent Out to Cyprus', journey: 'First Journey', ref: 'Acts 13:1-12', place: 'Seleucia, the port of Antioch', route: ['Antioch', 'Seleucia', 'Salamis', 'Paphos'], letters: 2, seed: 23,
  env: ENV.seaDay,
  intro: `${q('Now in the assembly that was at Antioch there were some prophets and teachers: Barnabas, Simeon who was called Niger, Lucius of Cyrene, Manaen the foster brother of Herod the tetrarch, and Saul.', 'Acts 13:1')}\n\nYears have passed since Damascus. Now the church at Antioch sends out its first missionaries — and the wind is fair for Cyprus.`,
  outro: `From Paphos they sailed north to Perga in Pamphylia, where John left them and returned to Jerusalem. Paul and Barnabas pressed on into the highlands — to Antioch of Pisidia, to Iconium, and then to a town called Lystra.`,
  outroRef: 'Acts 13:13 – 14:7',
  build(G, W) {
    const road = [[66, -22], [20, -44], [-50, -30], [-120, -48], [-200, -30], [-262, -22]];
    const isle = (x, z) => 1 - Math.hypot((x + 100) / 185, (z + 25) / 92) - (fbm(x * 0.012 + 9, z * 0.012) - 0.5) * 0.5;
    const flat = (x, z, cx, cz, r) => smooth(r, r * 0.45, Math.hypot(x - cx, z - cz));
    const H = (x, z) => {
      let h = -7; const v = isle(x, z);
      if (v > -0.15) { const rd = pathDist(road, x, z)[0]; const town = Math.max(flat(x, z, 62, -22, 46), flat(x, z, -262, -22, 60)); const m = smooth(5, 34, rd) * (1 - town); h = -7 + smooth(-0.12, 0.07, v) * 8.6 + Math.max(0, v - 0.05) * (fbm(x * 0.016, z * 0.016) * 70 + 12) * m + (fbm(x * 0.06, z * 0.06) - 0.5) * 1.6 * m * smooth(0, 0.1, v); }
      const main = smooth(440, 480, x + (fbm(z * 0.01, 3) - 0.5) * 50); if (main > 0) h = Math.max(h, -7 + main * (9 + fbm(x * 0.02, z * 0.02) * 14));
      return h;
    };
    W.bounds = 540; W.mapR = 520; W.road(road, 5);
    W.terrain({ size: 1160, seg: 250, height: H, color: (x, z, h, sl) => { if (h < 0.5) return 0xd6c9a0; if (pathDist(road, x, z)[0] < 2.8) return 0xc9b68e; if (sl > 0.5) return 0x9a8e74; if (h > 26) return 0x8a8a6a; return new THREE.Color(0xa9a866).lerp(new THREE.Color(0x7d9450), fbm(x * 0.03, z * 0.03)).getHex(); } });
    W.water(0);
    // Seleucia quay (mainland, east) and Salamis quay (island, east end)
    const pier = (x0, x1, z) => { W.box((x0 + x1) / 2, 0.75, z, Math.abs(x1 - x0), 0.3, 4.4, 0x7a5c3c); W.addPlatform((x0 + x1) / 2, z, Math.abs(x1 - x0) / 2, 2.2, 0, 1.05); for (let x = Math.min(x0, x1) + 1; x < Math.max(x0, x1); x += 5) for (const s of [-1.9, 1.9]) W.S.cyl(x, -7, z + s, 0.22, 0.22, 8.6, 0x4a3828, 6); };
    pier(420, 468, 30); pier(86, 118, -22);
    for (const [x, z, ry] of [[478, 14, 0.2], [492, 34, -0.3], [476, 50, 0.1], [500, 6, 0], [506, 48, 0.4]]) W.house(x, z, 9, 7, 4, ry + Math.PI / 2, 'greek');
    W.street(52, -44, 52, 0, 7, 'greek'); W.temple(30, -22, Math.PI / 2, { w: 10, d: 15, h: 5, nf: 4, ns: 6, color: 0xdccfb0 }); W.stall(60, -8, 0); W.stall(60, -34, Math.PI);
    // Paphos: houses and the proconsul's court
    W.street(-232, -40, -232, -4, 7, 'greek'); W.street(-250, -52, -290, -52, 7, 'greek', { sides: [-1] });
    const cx = -272, cz = -22; W.box(cx, 1.3, cz, 30, 0.5, 26, 0xd9d2c0); W.addPlatform(cx, cz, 15, 13, 0, 2.05); W.box(cx + 16.5, 1.2, cz, 3, 0.4, 8, 0xd9d2c0); W.addPlatform(cx + 16.5, cz, 1.5, 4, 0, 1.75); W.box(cx + 19, 1.0, cz, 3, 0.35, 8, 0xd9d2c0); W.addPlatform(cx + 19, cz, 1.5, 4, 0, 1.45);
    for (let i = 0; i < 8; i++) { W.column(cx - 13 + i * 3.7, 2.05, cz - 11.5, 5.4, 0.36); W.column(cx - 13 + i * 3.7, 2.05, cz + 11.5, 5.4, 0.36); } for (let i = 1; i < 6; i++) W.column(cx - 13, 2.05, cz - 11.5 + i * 3.83, 5.4, 0.36);
    W.box(cx - 2, 7.45, cz - 11.5, 28, 0.6, 1.6, 0xe6dfcf); W.box(cx - 2, 7.45, cz + 11.5, 28, 0.6, 1.6, 0xe6dfcf); W.box(cx - 13, 7.45, cz, 1.6, 0.6, 24.6, 0xe6dfcf);
    W.box(cx - 9.5, 2.05, cz, 4, 0.5, 5, 0xcfc6b0); W.box(cx - 10, 2.55, cz, 1.3, 0.55, 1.3, 0x6a4a2a); W.box(cx - 10.6, 3.1, cz, 0.2, 1.1, 1.3, 0x6a4a2a); W.addPlatform(cx - 9.5, cz, 2, 2.5, 0, 2.55);
    W.torch(cx - 6, cz - 6, 2.2, true, 2.05); W.torch(cx - 6, cz + 6, 2.2, true, 2.05);
    const land = (x, z, h) => h > 1.2 && h < 22 && pathDist(road, x, z)[0] > 6 && !W.blocked(x, 2, z) && Math.hypot(x + 272, z + 22) > 26;
    W.scatter('olive', 150, -290, -110, 80, 60, land); W.scatter('cypress', 110, -290, -110, 80, 60, land); W.scatter('oak', 50, -290, -110, 80, 60, (x, z, h) => land(x, z, h) && h > 5); W.scatter('palm', 30, 30, -60, 90, 20, (x, z, h) => h > 0.8 && h < 4 && !W.blocked(x, 2, z) && pathDist(road, x, z)[0] > 5 && Math.hypot(x - 52, z + 22) > 8);
    W.scatter('bush', 160, -290, -110, 80, 60, land); W.scatter('rock', 90, -290, -110, 80, 60, (x, z, h) => h > 0.3 && pathDist(road, x, z)[0] > 6, 1.3); W.scatter('palm', 16, 470, -20, 520, 70, (x, z, h) => h > 1 && !W.blocked(x, 2, z));
    W.grass(22000, -280, -100, 80, 50, (x, z, h) => h > 1 && h < 24 && pathDist(road, x, z)[0] > 3.2 && pathDist(road, x, z)[0] < 60 && !W.blocked(x, 1, z));
    const ship = makeShip({}); ship.x = 412; ship.z = 23.5; ship.heading = -Math.PI / 2; W.group.add(ship.group); W.updaters.push((dt) => ship.float(G.engine, dt));
    const barnabas = G.spawn(look(3, 'man', { robe: 0x7a8a6a, cloak: 0x5a4a3a, beard: true, head: 'bare', hair: 0x3a2a1c, long: false, height: 1.06 }), 432, 31, -1.5, 'Barnabas');
    const mark = G.spawn(look(8, 'man', { robe: 0xd0c4a4, beard: false, head: 'bare', hair: 0x2a1e14, long: false, cloak: null, height: 0.95 }), 434, 29, -1.5, 'John Mark');
    townsfolk(G, [[470, 30], [482, 28, [490, 20]], [56, -14, [56, -36]], [50, -30], [94, -22], [-232, -20, [-232, -34]], [-240, -14]], 9, 'greek');
    const proconsul = G.spawn(look(21, 'greek', { robe: 0xf0ece0, sash: 0x7a2a6a, beard: false, head: 'wreath', hair: 0x6a6660, long: true }), cx - 10, cz, Math.PI / 2, 'Sergius Paulus'); proconsul.pos.y = 2.55 + 0.56; proconsul.fixedY = true; proconsul.setPose('sit');
    const elymas = G.spawn(look(22, 'man', { robe: 0x3a2a4a, cloak: 0x1c1424, sash: 0xc8a050, beard: true, head: 'cloth', cloth: 0x2a1e34, hair: 0x14100c, long: true }), cx - 6.5, cz + 2.5, Math.PI / 2, 'Elymas');
    const guards = [[-3.5], [3.5]].map(([dz], i) => G.spawn(look(60 + i, 'soldier'), cx - 11.5, cz + dz, Math.PI / 2));
    return { ship, barnabas, mark, proconsul, elymas, court: [cx, cz] };
  },
  async run(G, S) {
    const P = G.player, paul = G.paul, { ship, barnabas, mark, proconsul, elymas } = S;
    P.teleport(436, 30, -Math.PI / 2); G.amb({ sea: 0.16 });
    G.letter(-50, -30, { ref: 'Romans 1:16', from: 'to the Romans', text: 'For I am not ashamed of the Good News of Christ, because it is the power of God for salvation for everyone who believes, for the Jew first, and also for the Greek.' });
    G.letter(-200, -30, { ref: '1 Corinthians 9:22', from: 'to the Corinthians', text: 'To the weak I became as weak, that I might gain the weak. I have become all things to all men, that I may by all means save some.' });
    await G.say([
      ['The Holy Spirit', 'Separate Barnabas and Saul for me, for the work to which I have called them.', 'Acts 13:2'],
      ['', 'Then, when they had fasted and prayed and laid their hands on them, they sent them away.', 'Acts 13:3'],
    ]);
    follow(barnabas, paul, 2, 1.2); follow(mark, paul, 3, -1);
    await G.interact([424, 30], 'Board the ship', 4.5, 'Go down the quay and board the ship for Cyprus');
    await G.fade(1, 0.6);
    for (const [n, lx, lz] of [[barnabas, 1.2, 3], [mark, -1.3, 4.5]]) { n.follow = null; n.auto = false; n.speed = 0; ship.group.add(n.group); n.pos.set(lx, ship.deckY, lz); n.group.rotation.y = 0; }
    P.helm(ship); P.throttle = 0.5; await G.fade(0, 0.8); const tSail = G.game.time;
    G.bark('', 'So, being sent out by the Holy Spirit, they went down to Seleucia. From there they sailed to Cyprus.', 'Acts 13:4', 9);
    G.toast('W / S  set sail  ·  A / D  steer');
    await G.reach([128, -22], 20, 'Sail west to Salamis on Cyprus');
    if (!G.auto && G.game.time - tSail < 60) G.deed('fairwind');
    await G.fade(1, 0.8); P.throttle = 0; ship.speed = 0; ship.x = 124; ship.z = -27.5; ship.heading = -Math.PI / 2;
    for (const n of [barnabas, mark]) { G.world.group.add(n.group); n.auto = true; }
    P.disembark(112, -22, -Math.PI / 2); barnabas.place(114, -21); mark.place(115, -23); follow(barnabas, paul, 2, 1.2); follow(mark, paul, 3, -1);
    await G.fade(0, 0.8);
    await G.say([['', 'When they were at Salamis, they proclaimed God’s word in the Jewish synagogues. They also had John as their attendant.', 'Acts 13:5']]);
    G.env(ENV.golden(), 70);
    await G.reach([-120, -48], 8, 'Go through the island to Paphos — follow the road west');
    G.bark('', 'When they had gone through the island to Paphos, they found a certain sorcerer, a false prophet, a Jew, whose name was Bar Jesus', 'Acts 13:6', 9);
    await G.reach([-252, -22], 5, 'Enter the proconsul’s court at Paphos');
    await G.say([
      ['', 'who was with the proconsul, Sergius Paulus, a man of understanding. This man summoned Barnabas and Saul, and sought to hear the word of God.', 'Acts 13:7'],
      ['', 'But Elymas the sorcerer (for so is his name by interpretation) withstood them, seeking to turn the proconsul away from the faith.', 'Acts 13:8'],
    ]);
    elymas.setPose('preach');
    await G.interact(elymas, 'Fasten your eyes on Elymas', 5, 'Face the sorcerer');
    P.locked = true; paul.setPose('preach'); P.poseLock = true; P.yaw = Math.atan2(elymas.pos.x - P.pos.x, elymas.pos.z - P.pos.z);
    await G.say([
      ['', 'But Saul, who is also called Paul, filled with the Holy Spirit, fastened his eyes on him', 'Acts 13:9'],
      ['Paul', 'You son of the devil, full of all deceit and all cunning, you enemy of all righteousness, will you not cease to pervert the right ways of the Lord?', 'Acts 13:10'],
      ['Paul', 'Now, behold, the hand of the Lord is on you, and you will be blind, not seeing the sun for a season!', 'Acts 13:11'],
    ]);
    const mist = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0x08060a, transparent: true, opacity: 0, depthWrite: false })); mist.position.y = 1.3; elymas.group.add(mist);
    const t0 = G.game.time; G.world.updaters.push(() => { mist.material.opacity = Math.min(0.78, (G.game.time - t0) * 0.5); mist.scale.setScalar(1 + 0.08 * Math.sin(G.game.time * 3)); });
    elymas.setPose('grope'); const [cx, cz] = S.court; const wander = () => elymas.walk([[cx - 4 + Math.random() * 8, cz - 6 + Math.random() * 12]], 0.9).then(wander); wander();
    paul.setPose('idle'); P.poseLock = false;
    await G.say([['', 'Immediately a mist and darkness fell on him. He went around seeking someone to lead him by the hand.', 'Acts 13:11']]);
    proconsul.setPose('idle'); proconsul.pos.y = 2.55;
    await G.say([['', 'Then the proconsul, when he saw what was done, believed, being astonished at the teaching of the Lord.', 'Acts 13:12']]);
    P.locked = false;
  },
};

// ============================================================ III. LYSTRA
const lystra = {
  title: 'The Gods of Lystra', journey: 'First Journey', ref: 'Acts 14:8-20', place: 'Lystra, in Lycaonia', route: ['Paphos', 'Perga', 'Pisidian Antioch', 'Iconium', 'Lystra'], letters: 2, seed: 37,
  env: ENV.windyPlateau,
  intro: `At Iconium both Gentiles and Jews, with their rulers, made a violent attempt to mistreat and stone them.\n\n${q('they became aware of it and fled to the cities of Lycaonia, Lystra, Derbe, and the surrounding region. There they preached the Good News.', 'Acts 14:6-7')}\n\nA wind is blowing across the high plateau as Paul and Barnabas come up the road to Lystra.`,
  outro: `${q('On the next day he went out with Barnabas to Derbe. When they had preached the Good News to that city, and had made many disciples, they returned to Lystra, Iconium, and Antioch, strengthening the souls of the disciples, exhorting them to continue in the faith, and that through many afflictions we must enter into God’s Kingdom.', 'Acts 14:20-22')}\n\nA young disciple of Lystra named Timothy would one day travel with him.`,
  build(G, W) {
    const road = [[2, 160], [-4, 80], [3, 20], [0, -40], [0, -92]];
    const cityD = (x, z) => Math.max(Math.abs(x) - 60, Math.abs(z + 96) - 60);
    W.bounds = 215; W.road(road, 7);
    const H = (x, z) => { const rd = pathDist(road, x, z)[0], cd = cityD(x, z), tf = smooth(34, 16, Math.hypot(x - 36, z + 4)); const m = smooth(5, 30, rd) * smooth(0, 26, cd) * (1 - tf); return (fbm(x * 0.01, z * 0.01) * 5 - 2.5) * smooth(0, 26, cd) * (1 - tf) + (fbm(x * 0.022 + 7, z * 0.022) * 18 - 6) * m + smooth(150, 260, Math.hypot(x, z + 20)) * 46 * (0.5 + fbm(x * 0.01, z * 0.01)); };
    W.terrain({ size: 600, seg: 200, height: H, color: (x, z, h, sl) => { const rd = pathDist(road, x, z)[0], cd = cityD(x, z); if (rd < 3.3 + fbm(x * 0.3, z * 0.3)) return 0xa8946c; if (cd < 0) return 0xb8a682; if (sl > 0.5) return 0x8f866e; if (h > 30) return 0x9a947e; return new THREE.Color(0xb8a865).lerp(new THREE.Color(0x8f9455), fbm(x * 0.03, z * 0.03)).getHex(); } });
    W.horizon({ color: 0x9a9070, height: 95, seed: 7 });
    W.cityWalls(-58, -154, 58, -38, 6, [{ side: 's', at: 0.5, width: 6 }], 0xb8a688);
    W.street(0, -44, 0, -74, 8, 'mud'); W.street(-52, -112, 52, -112, 6, 'stone', { sides: [1] }); W.street(-22, -76, -22, -108, 6, 'mud', { sides: [1] }); W.street(22, -76, 22, -108, 6, 'mud', { sides: [-1] }); W.street(-50, -136, 50, -136, 6, 'mud', { sides: [1] });
    W.stall(-12, -80, 0); W.stall(13, -102, Math.PI); W.stall(-14, -100, Math.PI / 2); W.pot(8, -86); W.pot(9, -87.2, 0.8);
    W.box(4.4, 0, -89.2, 1.6, 0.05, 1.2, 0x8a5a3a); // the lame man's mat
    const tp = W.temple(36, -4, Math.PI / 2, { w: 11, d: 20, h: 6.5, nf: 4, ns: 8 }); const ay = W.altar(20, -4, Math.PI / 2); W.flame(20, ay + 0.1, -4, 1.6, true);
    W.statue(22, -14, -Math.PI / 2, { kind: 'figure', h: 1.8 });
    const open = (x, z, h) => cityD(x, z) > 5 && pathDist(road, x, z)[0] > 7 && Math.hypot(x - 36, z + 4) > 22 && h < 26;
    W.scatter('oak', 60, -200, -200, 200, 200, open); W.scatter('cypress', 26, -200, -200, 200, 200, open); W.scatter('rock', 150, -210, -210, 210, 210, (x, z, h) => open(x, z, 0), 1.4); W.scatter('bush', 120, -200, -200, 200, 200, open);
    W.grass(34000, -130, -60, 130, 170, (x, z, h) => cityD(x, z) > 2 && pathDist(road, x, z)[0] > 4, [0xb5a55a, 0xa89a50, 0xc2b266, 0x98964e]);
    const barnabas = G.spawn(look(3, 'man', { robe: 0x7a8a6a, cloak: 0x5a4a3a, beard: true, head: 'bare', hair: 0x3a2a1c, long: false, height: 1.06 }), 4, 150, Math.PI, 'Barnabas');
    const lame = G.spawn(look(91, 'man', { robe: 0x8a7a5a, long: false, cloak: null, head: 'bare' }), 4.4, -89, 0.4, 'A man lame from birth'); lame.setPose('sit');
    const crowd = [[-8, -84], [10, -96], [-12, -96], [14, -84], [-4, -102], [6, -104], [-16, -90], [16, -92], [0, -78], [-9, -108], [11, -78], [-18, -102]].map((p, i) => G.spawn(look(100 + i, i % 3 === 2 ? 'woman' : 'man'), p[0], p[1], Math.random() * 6));
    const priest = G.spawn(look(130, 'greek', { robe: 0xf0ece0, sash: 0xc8a050, head: 'wreath', long: true, beard: true, hair: 0x6a6660 }), 26, -4, -Math.PI / 2, 'Priest of Jupiter');
    const oxen = [G.beast('ox', 0xd8d0c0, 27, -1, -Math.PI / 2), G.beast('ox', 0xcfc4b0, 27, -7, -Math.PI / 2)];
    return { barnabas, lame, crowd, priest, oxen };
  },
  async run(G, S) {
    const P = G.player, paul = G.paul, { barnabas, lame, crowd, priest, oxen } = S;
    P.teleport(2, 146, Math.PI); follow(barnabas, paul, 2, 1.3);
    G.letter(30, 8, { ref: 'Galatians 6:17', from: 'to the Galatians', text: 'From now on, let no one cause me any trouble, for I bear the marks of the Lord Jesus branded on my body.' });
    G.letter(-14, -122, { ref: '2 Timothy 3:10-11', from: 'to Timothy', text: 'But you followed my teaching, conduct, purpose, faith, patience, love, steadfastness, persecutions, and sufferings: those things that happened to me at Antioch, Iconium, and Lystra. I endured those persecutions. The Lord delivered me out of them all.' });
    await G.reach([0, -84], 5, 'Enter Lystra and preach the Good News in the marketplace');
    paul.setPose('preach'); P.poseLock = true;
    await G.say([['', 'At Lystra a certain man sat, impotent in his feet, a cripple from his mother’s womb, who never had walked.', 'Acts 14:8'], ['', 'He was listening to Paul speaking', 'Acts 14:9']]);
    paul.setPose('idle'); P.poseLock = false;
    await G.interact(lame, 'Fasten your eyes on him and speak', 3.2, 'Speak to the man who sits listening');
    P.locked = true; P.yaw = Math.atan2(lame.pos.x - P.pos.x, lame.pos.z - P.pos.z); paul.setPose('preach'); P.poseLock = true;
    await G.say([['Paul', 'Stand upright on your feet!', 'Acts 14:10']]);
    lame.setPose('raise'); lame.name = 'The man who was healed'; G.sound.collect();
    const t0 = G.game.time; G.world.updaters.push(() => { const t = G.game.time - t0; if (t < 1.6) lame.pos.y = G.world.ground(lame.pos.x, lame.pos.z) + Math.abs(Math.sin(t * 6)) * 0.5; });
    await G.say([['', 'He leaped up and walked.', 'Acts 14:10']]);
    lame.setPose('idle'); const stroll = () => lame.walk([[4 + Math.random() * 8 - 4, -90 + Math.random() * 8 - 4]], 2.2).then(stroll); stroll();
    paul.setPose('idle'); P.poseLock = false;
    crowd.forEach((c, i) => { const a = i / crowd.length * 6.28; c.walk([[P.pos.x + Math.sin(a) * 4.5, P.pos.z + Math.cos(a) * 4.5]], 2.6).then(() => { c.faceTo(P.pos.x, P.pos.z); c.setPose('raise'); }); });
    G.amb({ crowd: 0.25 }); await G.wait(2.5);
    await G.say([
      ['The multitude', 'The gods have come down to us in the likeness of men!', 'Acts 14:11'],
      ['', 'They called Barnabas “Jupiter”, and Paul “Mercury”, because he was the chief speaker.', 'Acts 14:12'],
      ['', 'The priest of Jupiter, whose temple was in front of their city, brought oxen and garlands to the gates, and would have made a sacrifice along with the multitudes.', 'Acts 14:13'],
    ]);
    P.locked = false;
    priest.walk([[6, -8], [2.5, -30]], 1.5); oxen.forEach((o, i) => { o.speed = 1.4; }); const oxT = G.game.time;
    G.world.updaters.push((dt) => { oxen.forEach((o, i) => { const tx = priest.pos.x + 2.2, tz = priest.pos.z + (i ? 2.6 : -2.2), dx = tx - o.pos.x, dz = tz - o.pos.z, d = Math.hypot(dx, dz); if (d > 0.4) { const st = Math.min(d, 1.5 * dt); o.pos.x += dx / d * st; o.pos.z += dz / d * st; o.pos.y = G.world.ground(o.pos.x, o.pos.z); o.group.rotation.y = Math.atan2(dx, dz); o.speed = 1.5; } else o.speed = 0; }); });
    crowd.forEach((c, i) => { c.setPose('idle'); c.walk([[0, -60], [-6 + (i % 5) * 3, -30 + Math.floor(i / 5) * 2.2]], 3.2).then(() => { c.faceTo(3, -24); c.setPose('raise'); }); });
    await G.reach([0, -33], 4.5, 'Run to the gates — stop the sacrifice!');
    P.locked = true; paul.setPose('raise'); P.poseLock = true; barnabas.setPose('raise');
    await G.say([
      ['', 'But when the apostles, Barnabas and Paul, heard of it, they tore their clothes, and sprang into the multitude, crying out', 'Acts 14:14'],
      ['Paul and Barnabas', 'Men, why are you doing these things? We also are men of like passions with you, and bring you good news, that you should turn from these vain things to the living God, who made the sky, the earth, the sea, and all that is in them', 'Acts 14:15'],
      ['Paul and Barnabas', 'Yet he didn’t leave himself without witness, in that he did good and gave you rains from the sky and fruitful seasons, filling our hearts with food and gladness.', 'Acts 14:17'],
      ['', 'Even saying these things, they hardly stopped the multitudes from making a sacrifice to them.', 'Acts 14:18'],
    ]);
    paul.setPose('idle'); P.poseLock = false; barnabas.setPose('idle'); crowd.forEach(c => c.setPose('idle')); priest.walk([[10, -8], [26, -4]], 1.3);
    // ---- the crowd is turned
    G.env({ cloud: 0.95, sunInt: 1.3, wind: 2.4, fogDensity: 0.005, hemiInt: 0.7 }, 6);
    const agit = [0, 1, 2].map(i => G.spawn(look(150 + i, 'man', { robe: 0x4a4a5a, head: 'cloth', cloth: 0x2a2a34 }), -2 + i * 2, 4, Math.PI)); agit.forEach((a, i) => a.walk([[-3 + i * 3, -24]], 2.4));
    await G.wait(3.5); crowd.forEach(c => c.faceTo(P.pos.x, P.pos.z)); G.amb({ crowd: 0.5 });
    await G.say([['', 'But some Jews from Antioch and Iconium came there, and having persuaded the multitudes, they stoned Paul, and dragged him out of the city, supposing that he was dead.', 'Acts 14:19']]);
    P.locked = true; G.engine.shake(0.25, 1.2); G.sound.crash(); await G.fade(1, 0.9); G.sound.step(true); await G.wait(0.5); G.sound.step(true); G.amb({ crowd: 0 });
    crowd.forEach((c, i) => c.place(-30 + (i % 6) * 12, -90 - Math.floor(i / 6) * 14)); agit.forEach(a => { a.group.visible = false; });
    G.engine.setEnv(ENV.dusk()); G.env({ wind: 1.2 }, 1);
    P.teleport(-34, -22, 0); paul.setPose('lie'); P.poseLock = true; P.camYaw = 0.6; P.camPitch = 0.5;
    barnabas.follow = null; barnabas.place(-32.4, -21, -1.6); barnabas.setPose('kneel');
    const disc = [[-35.5, -20], [-34.5, -24], [-32, -24], [-36, -22.5]].map((p, i) => G.spawn(look(170 + i, i === 1 ? 'woman' : 'man'), p[0], p[1], 0)); disc.forEach(d => d.faceTo(-34, -22));
    await G.wait(1.5); await G.fade(0, 2.5);
    await G.say([['', 'But as the disciples stood around him, he rose up, and entered into the city.', 'Acts 14:20']]);
    await G.interact(null, 'Rise up'); paul.setPose('idle'); P.poseLock = false; P.locked = false; barnabas.setPose('idle'); follow(barnabas, paul, 2, 1.3); disc.forEach((d, i) => follow(d, paul, 3.5 + i * 0.8, i - 1.5, 4));
    await G.reach([0, -52], 4, 'Go back into the city');
  },
};

// ============================================================ IV. PHILIPPI
const philippi = {
  title: 'Midnight in Philippi', journey: 'Second Journey', ref: 'Acts 16:9-34', place: 'Philippi, a Roman colony of Macedonia', route: ['Antioch', 'Derbe', 'Lystra', 'Pisidian Antioch', 'Troas', 'Neapolis', 'Philippi'], letters: 3, seed: 41,
  env: () => makeEnv({ sunElev: 22, sunAzim: 110, sunColor: 0xffdcb0, sunInt: 2.8, skyTop: 0x4a78c0, skyHorizon: 0xdcd8d0, fog: 0xd0d0cc, fogDensity: 0.0042, cloud: 0.5, wind: 0.5, motes: 0.5, waveAmp: 0.4 }),
  intro: `With Silas — and joined at Lystra by Timothy — Paul crossed Asia until the road ended at the sea, in Troas.\n\n${q('A vision appeared to Paul in the night. There was a man of Macedonia standing, begging him, and saying, “Come over into Macedonia and help us.” When he had seen the vision, immediately we sought to go out to Macedonia, concluding that the Lord had called us to preach the Good News to them.', 'Acts 16:9-10')}\n\nThe Good News is about to enter Europe.`,
  outro: `${q('But when it was day, the magistrates sent the sergeants, saying, “Let those men go.”', 'Acts 16:35')}\n\nPaul would not go quietly: they had beaten Roman citizens without a trial. The magistrates came themselves and begged them to depart.\n\n${q('They went out of the prison, and entered into Lydia’s house. When they had seen the brothers, they encouraged them, then departed.', 'Acts 16:40')}\n\nThrough Thessalonica and Beroea the road led south — to Athens.`,
  build(G, W) {
    const road = [[-6, 58], [0, 20], [0, -34], [0, -92]];
    const rc = (x) => 80 + Math.sin(x * 0.02) * 9, cityD = (x, z) => Math.max(Math.abs(x) - 73, Math.abs(z + 98) - 68);
    W.bounds = 225; W.road(road, 6);
    const H = (x, z) => { const rd = pathDist(road, x, z)[0], cd = cityD(x, z), rv = Math.abs(z - rc(x)); const m = smooth(5, 30, rd) * smooth(0, 26, cd) * smooth(10, 40, rv); return 0.4 + (fbm(x * 0.01, z * 0.01) * 3 - 1.5) * smooth(0, 22, cd) * smooth(4, 20, rd) * smooth(12, 30, rv) + (fbm(x * 0.022 + 5, z * 0.022) * 22 - 7) * m - smooth(17, 5, rv) * 3.7 + smooth(160, 250, Math.hypot(x, z)) * 30; };
    W.terrain({ size: 600, seg: 200, height: H, color: (x, z, h, sl) => { const rd = pathDist(road, x, z)[0], cd = cityD(x, z); if (h < -0.4) return 0x8a8468; if (rd < 2.8 + fbm(x * 0.3, z * 0.3)) return 0xa89a7a; if (cd < 0) return 0xb4aa94; if (sl > 0.55) return 0x8a846e; return new THREE.Color(0x7f9a4e).lerp(new THREE.Color(0x9aa558), fbm(x * 0.03, z * 0.03)).getHex(); } });
    W.horizon({ color: 0x7d8a5a, height: 85, seed: 11 });
    W.water(-0.7, { size: [640, 64], pos: [0, 80], ampScale: 0.12 });
    W.cityWalls(-71, -164, 71, -32, 6.5, [{ side: 's', at: 0.5, width: 6 }], 0xc4bca8);
    W.street(0, -38, 0, -72, 8, 'greek'); W.street(-24, -76, -24, -110, 6, 'greek', { sides: [1] }); W.street(-64, -132, 64, -132, 6, 'greek'); W.street(-62, -56, -12, -56, 6, 'greek', { sides: [1] }); W.street(12, -56, 62, -56, 6, 'greek', { sides: [1] });
    W.stoa(0, -114, 34, 0); W.box(0, 0.4, -106, 5, 0.9, 3, 0xd6cfbe); W.addPlatform(0, -106, 2.5, 1.5, 0, 1.3); W.stall(-14, -84, Math.PI / 2); W.stall(-14, -96, Math.PI / 2); W.statue(14, -80, 0, { h: 1.6 });
    // the prison: outer room and inner cell
    const sc = 0x8f8878, wl = (a, b, c, d) => W.wall(a, b, c, d, 3.6, 0.7, sc, false);
    wl(34, -100, 52, -100); wl(34, -86, 52, -86); wl(52, -100, 52, -86); wl(34, -100, 34, -94.1); wl(34, -91.9, 34, -86); wl(43, -100, 43, -94.1); wl(43, -91.9, 43, -86);
    W.box(43, 4.0, -93, 19.4, 0.5, 15.4, 0x857e6e); W.box(43, 0.36, -93, 18, 0.06, 14, 0x6e675a);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9 });
    const doors = [[34, -94.1], [43, -94.1]].map(([x, z]) => { const piv = new THREE.Group(); piv.position.set(x, 0.4, z); const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.9, 2.2), doorMat); m.position.set(0, 1.45, 1.1); m.castShadow = true; piv.add(m); W.group.add(piv); W.addBox(x, z + 1.1, 0.4, 1.1, 0, 5); return { piv, col: W.colliders[W.colliders.length - 1] }; });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 3.4), doorMat); beam.position.set(48.4, 0.86, -93.1); beam.castShadow = true; W.group.add(beam); W.box(48.4, 0.36, -93.1, 0.3, 0.3, 3.4, 0x4a3420);
    const tIn = W.torch(43.8, -98.6, 2.2, true), tOut = W.torch(35, -87.2, 2.2, true), tA = W.torch(44, -87.4, 2.2, true), tB = W.torch(51.2, -98.8, 2.2, true); tA.on = tB.on = false;
    const open = (x, z, h) => cityD(x, z) > 5 && pathDist(road, x, z)[0] > 6 && h > 0.2 && h < 24;
    W.scatter('oak', 70, -210, -210, 210, 210, open); W.scatter('cypress', 40, -210, -210, 210, 210, open); W.scatter('olive', 40, -150, 0, 150, 150, open); W.scatter('bush', 120, -200, -30, 200, 200, open); W.scatter('rock', 70, -210, 50, 210, 110, (x, z, h) => Math.abs(z - rc(x)) < 16 && Math.abs(z - rc(x)) > 6, 1.1);
    W.grass(36000, -150, -30, 150, 130, (x, z, h) => h > 0.1 && cityD(x, z) > 2 && pathDist(road, x, z)[0] > 3.4, [0x6f9244, 0x7f9e4c, 0x88a655, 0x5f8840]);
    for (const [x, z] of [[-9, 62], [-12, 64], [-6, 65]]) W.box(x, H(x, z) - 0.02, z, 1.6, 0.06, 1.2, 0x8a5a4a, x);
    const silas = G.spawn(look(201, 'man', { robe: 0x9a8a6a, cloak: 0x4a5a4a, beard: true, head: 'bare', hair: 0x2a1e14, long: false }), 2, -26, Math.PI, 'Silas');
    const timothy = G.spawn(look(202, 'man', { robe: 0xd0c8b0, beard: false, head: 'bare', hair: 0x3a2a1c, long: false, cloak: null, height: 0.96 }), -2, -26, Math.PI, 'Timothy');
    const lydia = G.spawn(look(210, 'woman', { robe: 0x6a2a7a, cloth: 0x7a3a8a, sash: 0xc8a050 }), -9, 62.3, 2.4, 'Lydia'); lydia.setPose('sit');
    const women = [[-12, 64.2, 2.0], [-6, 65.2, 3.4], [-10.5, 66.5, 2.6]].map((p, i) => G.spawn(look(211 + i, 'woman'), p[0], p[1], p[2]).setPose('sit'));
    townsfolk(G, [[4, -60, [4, -44]], [-4, -48, [-4, -70]], [-12, -84], [10, -90, [-8, -100]], [-14.5, -96.5], [6, -108, [-10, -108]], [20, -78]], 13, 'greek');
    const girl = G.spawn(look(220, 'woman', { robe: 0xb89a70, height: 0.88 }), 14, -70, 0, 'A slave girl'); girl.group.visible = false;
    const masters = [0, 1].map(i => G.spawn(look(222 + i, 'greek', { robe: 0x8a5a3a, beard: true }), 20 + i * 2, -72, 0)); masters.forEach(m => { m.group.visible = false; });
    const jailer = G.spawn(look(230, 'soldier', { head: 'bare', hair: 0x2a1e14, beard: true }), 37, -97.5, 1.2, 'The jailer'); jailer.group.visible = false;
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.07), new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.35, metalness: 0.6 })); sword.position.set(0, -0.3, 0.36); sword.rotation.x = Math.PI / 2; sword.visible = false; jailer.hands[1].add(sword);
    const prisoners = [[51, -98.5, -2.2], [46, -98.8, 0.3], [50.5, -87.6, 3.6]].map((p, i) => { const n = G.spawn(look(240 + i, 'man', { robe: 0x7a705e, long: false, cloak: null, head: 'bare' }), p[0], p[1], p[2]); n.setPose('sit'); n.group.visible = false; return n; });
    return { silas, timothy, lydia, women, girl, masters, jailer, sword, prisoners, doors, beam, tA, tB };
  },
  async run(G, S) {
    const P = G.player, paul = G.paul, { silas, timothy, lydia, girl, masters, jailer, sword, prisoners, doors, beam, tA, tB } = S;
    P.teleport(0, -27, 0); follow(silas, paul, 2, 1.3); follow(timothy, paul, 3.2, -1.2);
    G.letter(-18, 58, { ref: 'Philippians 4:4-7', from: 'to the Philippians', text: 'Rejoice in the Lord always! Again I will say, “Rejoice!” Let your gentleness be known to all men. The Lord is at hand. In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.' });
    G.letter(8, -100, { ref: 'Philippians 1:21', from: 'to the Philippians', text: 'For to me to live is Christ, and to die is gain.' });
    G.letter(28, -90, { ref: 'Philippians 4:13', from: 'to the Philippians', text: 'I can do all things through Christ, who strengthens me.' });
    G.amb({ sea: 0.04 });
    await G.reach([-8, 59], 4, 'On the Sabbath, go outside the gate to the riverside');
    await G.say([['', 'On the Sabbath day we went outside of the city by a riverside, where we supposed there was a place of prayer, and we sat down and spoke to the women who had come together.', 'Acts 16:13']]);
    await G.interact(lydia, 'Sit down and speak with the women', 4);
    P.locked = true; P.yaw = Math.atan2(lydia.pos.x - P.pos.x, lydia.pos.z - P.pos.z); paul.setPose('sit'); P.poseLock = true;
    await G.say([
      ['', 'A certain woman named Lydia, a seller of purple, of the city of Thyatira, one who worshiped God, heard us. The Lord opened her heart to listen to the things which were spoken by Paul.', 'Acts 16:14'],
      ['', 'When she and her household were baptized, she begged us, saying', 'Acts 16:15'],
      ['Lydia', 'If you have judged me to be faithful to the Lord, come into my house and stay.', 'Acts 16:15'],
    ]);
    paul.setPose('idle'); P.poseLock = false; P.locked = false; lydia.setPose('idle');
    // ---- the slave girl
    await G.reach([0, -10], 5, 'Return toward the city, to the place of prayer');
    girl.group.visible = true; girl.place(6, -30); girl.follow = { target: paul, dist: 3, side: 0.5, max: 6, slack: 0.6 }; girl.setPose('idle');
    await G.say([['', 'As we were going to prayer, a certain girl having a spirit of divination met us, who brought her masters much gain by fortune telling.', 'Acts 16:16']]);
    let crying = true; (async () => { while (crying) { G.bark('The girl, following', 'These men are servants of the Most High God, who proclaim to us a way of salvation!', 'Acts 16:17', 4.5); girl.setPose('raise'); try { await G.wait(7); } catch (e) { return; } } })();
    await G.reach([0, -90], 5, 'Go on into the marketplace');
    await G.say([['', 'She was doing this for many days.', 'Acts 16:18']]);
    await G.interact(girl, 'Turn and speak to the spirit', 6, 'Turn to the girl who follows you');
    crying = false; P.locked = true; P.yaw = Math.atan2(girl.pos.x - P.pos.x, girl.pos.z - P.pos.z); paul.setPose('preach'); P.poseLock = true; girl.follow = null;
    await G.say([['Paul', 'I command you in the name of Jesus Christ to come out of her!', 'Acts 16:18']]);
    girl.setPose('kneel'); paul.setPose('idle'); P.poseLock = false; G.sound.chime();
    await G.say([['', 'It came out that very hour.', 'Acts 16:18']]);
    masters.forEach((m, i) => { m.group.visible = true; m.place(16 + i * 2, -74); m.walk([[P.pos.x + 1.2 - i * 2.4, P.pos.z + 0.9]], 3).then(() => { m.faceTo(P.pos.x, P.pos.z); m.setPose('hold'); }); });
    G.amb({ crowd: 0.35 }); await G.wait(2.5);
    await G.say([
      ['', 'But when her masters saw that the hope of their gain was gone, they seized Paul and Silas, and dragged them into the marketplace before the rulers.', 'Acts 16:19'],
      ['Her masters', 'These men, being Jews, are agitating our city and advocate customs which it is not lawful for us to accept or to observe, being Romans.', 'Acts 16:20-21'],
    ]);
    P.locked = true; await G.fade(1, 1.2); G.sound.step(true);
    await G.say([
      ['', 'The multitude rose up together against them and the magistrates tore their clothes from them, then commanded them to be beaten with rods.', 'Acts 16:22'],
      ['', 'When they had laid many stripes on them, they threw them into prison, charging the jailer to keep them safely, who, having received such a command, threw them into the inner prison, and secured their feet in the stocks.', 'Acts 16:23-24'],
    ]);
    // ---- midnight
    G.engine.setEnv(ENV.night()); G.amb({ crowd: 0, sea: 0, music: 0.4 });
    masters.forEach(m => { m.group.visible = false; }); girl.group.visible = false; timothy.group.visible = false; timothy.follow = null;
    P.teleport(49.3, -92.3, -Math.PI / 2); paul.setPose('stocks'); P.poseLock = true; P.locked = true; P.camMax = 3.6; P.camDist = 3.2; P.ceil = 3.85; P.camYaw = 1.2; P.camPitch = 0.3;
    silas.follow = null; silas.place(49.3, -93.9, -Math.PI / 2); silas.setPose('stocks'); prisoners.forEach(p => { p.group.visible = true; }); jailer.group.visible = true; jailer.setPose('lie');
    await G.fade(0, 2);
    for (let i = 0; i < 3; i++) { await G.interact(null, i === 0 ? 'Pray' : 'Sing a hymn to God'); G.sound.hymn(); paul.setPose('stocksPray'); silas.setPose('stocksPray'); await G.wait(G.auto ? 0.2 : 4.2); paul.setPose('stocks'); silas.setPose('stocks'); }
    await G.say([['', 'But about midnight Paul and Silas were praying and singing hymns to God, and the prisoners were listening to them.', 'Acts 16:25']]);
    // ---- the earthquake
    G.sound.rumble(6); G.engine.shake(0.4, 6); G.env({ motes: 1, moteColor: 0xb0a898 }, 0.5);
    const tq = G.game.time; G.world.updaters.push(() => { const t = Math.min(1, (G.game.time - tq - 1.2) / 1.6); if (t > 0) { const e = 1 - Math.pow(1 - t, 3); doors[0].piv.rotation.y = -e * 1.9; doors[1].piv.rotation.y = e * 1.8; beam.position.y = 0.86 - e * 0.35; beam.position.x = 48.4 - e * 0.9; beam.rotation.y = e * 0.5; beam.rotation.z = e * 0.4; } });
    await G.wait(2.2); doors.forEach(d => { d.col.off = true; });
    await G.say([['', 'Suddenly there was a great earthquake, so that the foundations of the prison were shaken; and immediately all the doors were opened, and everyone’s bonds were loosened.', 'Acts 16:26']]);
    paul.setPose('idle'); silas.setPose('idle'); P.poseLock = false; prisoners.forEach(p => p.setPose('idle'));
    jailer.setPose('idle'); await G.wait(1.2); await G.walk(jailer, [[40, -93]], 2.4); jailer.faceTo(48, -93); sword.visible = true; jailer.setPose('sword');
    await G.say([['', 'The jailer, being roused out of sleep and seeing the prison doors open, drew his sword and was about to kill himself, supposing that the prisoners had escaped.', 'Acts 16:27']]);
    await G.interact(null, 'Cry out with a loud voice');
    P.locked = true; paul.setPose('raise'); P.poseLock = true;
    await G.say([['Paul', 'Don’t harm yourself, for we are all here!', 'Acts 16:28']]);
    paul.setPose('idle'); P.poseLock = false; sword.visible = false; tA.on = tB.on = true; G.sound.chime();
    await G.walk(jailer, [[47, -93.2]], 3.4); jailer.faceTo(49.3, -93); jailer.setPose('bow'); jailer.tremble = 1;
    await G.say([
      ['', 'He called for lights, sprang in, fell down trembling before Paul and Silas, brought them out, and said', 'Acts 16:29-30'],
      ['The jailer', 'Sirs, what must I do to be saved?', 'Acts 16:30'],
      ['Paul and Silas', 'Believe in the Lord Jesus Christ, and you will be saved, you and your household.', 'Acts 16:31'],
    ]);
    jailer.tremble = 0; jailer.setPose('idle'); P.locked = false; follow(silas, paul, 1.8, 1.1);
    G.objective('Follow the jailer out of the prison'); G.env({ motes: 0.1 }, 3);
    await lead(G, jailer, [[40, -93], [31, -93], [24, -88]], 2, 6);
    P.camMax = 9; P.camDist = 5.2; P.ceil = null;
    await G.say([
      ['', 'They spoke the word of the Lord to him, and to all who were in his house. He took them the same hour of the night and washed their stripes, and was immediately baptized, he and all his household.', 'Acts 16:32-33'],
      ['', 'He brought them up into his house, and set food before them, and rejoiced greatly, with all his household, having believed in God.', 'Acts 16:34'],
    ]);
  },
};

export const CHAPTERS_A = [damascus, cyprus, lystra, philippi];
