// Chapters I–IV: Damascus, Cyprus, Lystra, Philippi.
import * as THREE from 'three';
import { ENV } from './engine.js';
import { fbm, smooth, pathDist, makeShip, lerp } from './world.js';
import { dist, look, q, lead, townsfolk, follow } from './common.js';

// ============================================================ I. DAMASCUS
const damascus = {
  title: 'The Road to Damascus', journey: 'The Calling', ref: 'Acts 9:1-25', place: 'Near Damascus, about noon', route: ['Jerusalem', 'Damascus'], letters: 2, seed: 11,
  env: ENV.noonDesert,
  intro: `${q('But Saul, still breathing threats and slaughter against the disciples of the Lord, went to the high priest and asked for letters from him to the synagogues of Damascus, that if he found any who were of the Way, whether men or women, he might bring them bound to Jerusalem.', 'Acts 9:1-2')}\n\nYou are Saul of Tarsus. The road north is nearly behind you, and the walls of Damascus are in sight.`,
  outro: `Saul stayed with the disciples at Damascus, and grew in strength.\n\n${q('When many days were fulfilled, the Jews conspired together to kill him, but their plot became known to Saul. They watched the gates both day and night that they might kill him, but his disciples took him by night and let him down through the wall, lowering him in a basket.', 'Acts 9:23-25')}\n\nThe persecutor had become the persecuted.`,
  build(G, W) {
    const road = [[4, 215], [9, 150], [-5, 95], [4, 40], [0, -20], [0, -80], [0, -196]];
    const cityD = (x, z) => Math.max(Math.abs(x) - 74, Math.abs(z + 140) - 64);
    W.bounds = 235; W.road(road, 7);
    const H = (x, z) => { const rd = pathDist(road, x, z)[0], cd = cityD(x, z); const m = smooth(5, 32, rd) * smooth(0, 28, cd); return (fbm(x * 0.008, z * 0.008) * 4 - 2) * smooth(0, 28, cd) + (fbm(x * 0.021 + 3, z * 0.021) * 20 - 7) * m; };
    W.terrain({ size: 560, seg: 200, height: H, color: (x, z, h, sl) => { const rd = pathDist(road, x, z)[0], cd = cityD(x, z); if (rd < 3.3 + fbm(x * 0.3, z * 0.3)) return cd < 0 ? 0xb8a888 : 0xa8926a; if (cd < 0) return 0xc2ae88; if (sl > 0.45) return 0xa8946e; const oasis = smooth(70, 5, cd) * smooth(0.35, 0.6, fbm(x * 0.04, z * 0.04)); return new THREE.Color(0xd9c59a).lerp(new THREE.Color(0x98a05c), oasis * 0.8).getHex(); } });
    W.cityWalls(-72, -202, 72, -78, 7.5, [{ side: 's', at: 0.5, width: 6 }]);
    const court = (x, z) => x < -4 && x > -26 && Math.abs(z + 135) < 11;
    W.street(0, -84, 0, -196, 9, 'mud', { skip: court }); W.street(-66, -160, -8, -160, 6, 'mud', { skip: court }); W.street(8, -118, 66, -118, 6, 'mud'); W.street(10, -172, 66, -172, 6, 'mud', { sides: [1] }); W.street(-66, -104, -10, -104, 6, 'mud', { sides: [-1] });
    for (let z = -92; z > -190; z -= 9) for (const sx of [-4.2, 4.2]) if (!(sx < 0 && Math.abs(z + 135) < 6)) W.column(sx, 0, z, 4.6, 0.3, 0xd8ccb0);
    // the house of Judah on Straight Street: an open courtyard
    W.wall(-24, -144, -24, -126, 3.4, 0.6, 0xd6c29a, false); W.wall(-24, -144, -5, -144, 3.4, 0.6, 0xd6c29a, false); W.wall(-24, -126, -5, -126, 3.4, 0.6, 0xd6c29a, false); W.wall(-5, -144, -5, -138, 3.4, 0.6, 0xd6c29a, false); W.wall(-5, -132, -5, -126, 3.4, 0.6, 0xd6c29a, false);
    W.house(-19.5, -139.5, 7, 7, 3.6, Math.PI / 2, 'mud', { awning: true, doorX: 0 }); W.box(-12, 0, -131, 3, 0.06, 2, 0x8a4a3a); W.pot(-8, -129, 1.2); W.pot(-9.2, -128.6, 0.9); W.tree('palm', -8.5, -141); W.tree('bush', -22, -129);
    // synagogue
    const syn = W.temple(38, -146, Math.PI / 2, { w: 11, d: 16, h: 5, nf: 4, ns: 6, color: 0xdccfb0, roof: 0xa8704a });
    W.stall(6.5, -100, -Math.PI / 2); W.stall(-6.5, -112, Math.PI / 2); W.stall(6.5, -150, -Math.PI / 2);
    W.scatter('palm', 46, -150, -70, 150, 10, (x, z) => cityD(x, z) > 6 && cityD(x, z) < 60 && pathDist(road, x, z)[0] > 7);
    W.scatter('palm', 14, -66, -196, 66, -84, (x, z) => !W.blocked(x, 1, z) && Math.abs(x) > 7 && !court(x, z) && W.colliders.every(c => Math.hypot(c.x - x, c.z - z) > Math.max(c.hw || 1, c.hd || 1) + 1.5));
    W.scatter('rock', 120, -230, -40, 230, 230, (x, z) => pathDist(road, x, z)[0] > 8, 1.2); W.scatter('bush', 90, -230, -60, 230, 230, (x, z) => pathDist(road, x, z)[0] > 6 && cityD(x, z) > 4);
    W.scatter('olive', 26, -160, -60, 160, 30, (x, z) => cityD(x, z) > 8 && cityD(x, z) < 70 && pathDist(road, x, z)[0] > 9);
    W.grass(9000, -180, -75, 180, 60, (x, z) => cityD(x, z) > 2 && pathDist(road, x, z)[0] > 4.5 && fbm(x * 0.04, z * 0.04) > 0.4, [0xa8a860, 0x98a05a, 0xb8b070]);
    W.grass(5000, -200, 40, 200, 220, (x, z) => pathDist(road, x, z)[0] > 4.5 && fbm(x * 0.06, z * 0.06) > 0.55, [0xc8b880, 0xb8a870, 0xd0c088]);
    const men = [0, 1, 2].map(i => G.spawn(look(40 + i, 'man', { head: 'cloth', long: false }), 2 + i * 1.5, 205, Math.PI));
    const folk = townsfolk(G, [[3, -95, [3, -125]], [-3, -150, [-3, -110]], [8, -100], [-8, -113], [20, -118, [50, -118]], [2, -170, [2, -185]], [-30, -160, [-12, -160]], [8, -151]], 5);
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
    P.helm(ship); P.throttle = 0.5; await G.fade(0, 0.8);
    G.bark('', 'So, being sent out by the Holy Spirit, they went down to Seleucia. From there they sailed to Cyprus.', 'Acts 13:4', 9);
    G.toast('W / S  set sail  ·  A / D  steer');
    await G.reach([128, -22], 20, 'Sail west to Salamis on Cyprus');
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

export const CHAPTERS_A = [damascus, cyprus];
