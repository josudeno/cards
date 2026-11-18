// Chapters V–VIII: Athens, Ephesus, Jerusalem to Antipatris, the storm and Malta.
import * as THREE from 'three';
import { ENV, makeEnv } from './engine.js';
import { fbm, smooth, pathDist, pathPoint, makeShip, lerp, Solid, MATTE } from './world.js';
import { makeCrowd, Person } from './characters.js';
import { dist, look, q, lead, townsfolk, follow } from './common.js';

// ============================================================ V. ATHENS
const athens = {
  title: 'The Unknown God', journey: 'Second Journey', ref: 'Acts 17:16-34', place: 'Athens — the marketplace', route: ['Philippi', 'Thessalonica', 'Berea', 'Athens'], letters: 2, seed: 53,
  env: ENV.golden,
  intro: `Driven from Thessalonica and then from Beroea, Paul was brought by the brothers down to the sea, and on to Athens. There he waited alone for Silas and Timothy.\n\n${q('Now while Paul waited for them at Athens, his spirit was provoked within him as he saw the city full of idols.', 'Acts 17:16')}`,
  outro: `${q('After these things Paul departed from Athens, and came to Corinth.', 'Acts 18:1')}\n\nThere he found Aquila and Priscilla, ${q('and because he practiced the same trade, he lived with them and worked, for by trade they were tent makers.', 'Acts 18:3')}\n\n${q('The Lord said to Paul in the night by a vision, “Don’t be afraid, but speak and don’t be silent; for I am with you, and no one will attack you to harm you, for I have many people in this city.” He lived there a year and six months, teaching the word of God among them.', 'Acts 18:9-11')}`,
  build(G, W) {
    const AR = [0, 96], AC = [78, 196];
    const H = (x, z) => { const dA = Math.hypot(x - AR[0], z - AR[1]), dC = Math.hypot((x - AC[0]) / 1.5, z - AC[1]), dT = Math.hypot(x + 64, z + 8), r = Math.hypot(x, z - 60);
      return 9 * smooth(31, 13, dA) * (1 + (fbm(x * 0.2, z * 0.2) - 0.5) * 0.25 * smooth(12, 16, dA)) + 34 * smooth(78, 40, dC) * (1 + (fbm(x * 0.1, z * 0.1) - 0.5) * 0.3 * smooth(36, 44, dC)) + 4 * smooth(42, 22, dT) + smooth(190, 290, r) * 44 * (0.4 + fbm(x * 0.012, z * 0.012)) + (fbm(x * 0.03, z * 0.03) - 0.5) * 1.6 * smooth(70, 100, Math.hypot(x, z)) * smooth(34, 44, dA) * smooth(80, 95, dC); };
    W.bounds = 250; W.road([[0, -78], [0, -30], [0, 60], [-22, 78], [-26, 96], [-10, 104]], 5);
    W.terrain({ size: 640, seg: 210, cz: 60, height: H, color: (x, z, h, sl) => { const dA = Math.hypot(x - AR[0], z - AR[1]), dC = Math.hypot((x - AC[0]) / 1.5, z - AC[1]); if (dA < 31 || (dC < 78 && sl > 0.25)) return sl > 0.3 ? 0x9a9488 : 0xb4ac9c; if (Math.abs(x) < 46 && Math.abs(z) < 52) return 0xc8bea4; if (W.roadDist(x, z) < 0) return 0xb8ac90; if (sl > 0.5) return 0x9a9280; return new THREE.Color(0x9a9a5c).lerp(new THREE.Color(0x7a8c4c), fbm(x * 0.03, z * 0.03)).getHex(); } });
    W.horizon({ color: 0x8f8a6a, height: 75, seed: 5 });
    W.stoa(54, 0, 80, -Math.PI / 2, { depth: 7, h: 5.6 }); W.temple(-64, -8, Math.PI / 2, { w: 12, d: 24, h: 6.5, nf: 6, ns: 11 });
    W.temple(AC[0], AC[1], Math.PI / 2, { w: 17, d: 36, h: 9.5, nf: 8, ns: 15 }); W.temple(AC[0] - 38, AC[1] - 12, 0.3, { w: 7, d: 11, h: 5, nf: 4, ns: 5 });
    W.street(-66, -66, 66, -66, 7, 'greek'); W.street(-70, 44, -44, 44, 6, 'greek', { sides: [-1] }); W.street(60, 60, 110, 60, 6, 'greek');
    const idols = [[-18, -30, 0, true], [16, -34, 0.5, false], [-32, 8, 1.2, false], [26, 14, -0.6, true], [10, 32, 3, false], [-8, 46, 2.6, true]];
    for (const [x, z, ry, gold] of idols) W.statue(x, z, ry, { gold, h: 1.8 });
    for (const z of [-30, -10, 10, 30]) W.statue(43, z, -Math.PI / 2, { kind: 'herm', h: 0.5 });
    const ay = W.altar(-4, -12, 0); W.flame(-4, ay + 0.05, -12, 1.5, true); W.altar(30, -20, 0.7); W.stall(-36, -40, 0.3); W.stall(-30, -46, 0.3); W.stall(20, 44, 2.8);
    // the altar with the inscription
    const ax = -24, az = 34, ary = 0.5; W.altar(ax, az, ary, 0xcfc6b2);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d'); g.fillStyle = '#c9c0ac'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#4a4034'; g.font = '700 68px Georgia'; g.textAlign = 'center'; g.fillText('ΑΓΝΩΣΤΩ', 256, 110); g.fillText('ΘΕΩ', 256, 200);
    const ins = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), roughness: 1 })); ins.material.map.colorSpace = THREE.SRGBColorSpace;
    ins.position.set(ax + Math.sin(ary) * 0.51, 0.72, az + Math.cos(ary) * 0.51); ins.rotation.y = ary; W.group.add(ins);
    const flat = (x, z, h) => !W.blocked(x, 2, z) && W.roadDist(x, z) > 2;
    W.scatter('cypress', 90, -240, -180, 240, 300, (x, z, h) => flat(x, z) && (Math.abs(x) > 50 || Math.abs(z) > 56) && Math.hypot(x - AR[0], z - AR[1]) > 30 && Math.hypot((x - AC[0]) / 1.5, z - AC[1]) > 44 && h < 30);
    W.scatter('olive', 110, -240, -180, 240, 300, (x, z, h) => flat(x, z) && (Math.abs(x) > 50 || Math.abs(z) > 56) && Math.hypot(x - AR[0], z - AR[1]) > 30 && Math.hypot((x - AC[0]) / 1.5, z - AC[1]) > 60 && h < 26);
    W.scatter('rock', 110, -60, 50, 160, 280, (x, z, h) => (Math.hypot(x - AR[0], z - AR[1]) < 34 && Math.hypot(x - AR[0], z - AR[1]) > 15) || (Math.hypot((x - AC[0]) / 1.5, z - AC[1]) < 80 && Math.hypot((x - AC[0]) / 1.5, z - AC[1]) > 42), 1.3);
    W.scatter('bush', 120, -200, -150, 200, 280, (x, z, h) => flat(x, z) && (Math.abs(x) > 48 || Math.abs(z) > 54));
    W.grass(26000, -150, -110, 150, 200, (x, z, h) => (Math.abs(x) > 47 || Math.abs(z) > 53) && Math.hypot(x - AR[0], z - AR[1]) > 31 && Math.hypot((x - AC[0]) / 1.5, z - AC[1]) > 76 && W.roadDist(x, z) > 0.5, [0x8f9455, 0x9a9a5c, 0x84904c]);
    const phil = [[40, -6], [41.5, -4], [39, -3], [42, -7.5], [38.5, -8]].map((p, i) => G.spawn(look(300 + i, 'greek', { beard: true, long: true }), p[0], p[1], Math.random() * 6, i === 0 ? 'Philosophers' : ''));
    townsfolk(G, [[-10, -40, [10, -20]], [20, 0, [-20, 6]], [-36, -38], [-30, -44.5], [0, 20, [-14, 40]], [30, 30], [-40, 20, [-40, -20]], [12, -50], [20, 42.6], [-17, -27.6]], 17, 'greek');
    const council = []; for (let i = 0; i < 9; i++) { const a = -0.5 + i * (Math.PI + 1) / 8, x = AR[0] + Math.cos(a) * 7.5, z = AR[1] + Math.sin(a) * 7.5; const n = G.spawn(look(320 + i, i === 6 ? 'woman' : 'greek', { beard: i !== 6, long: true }), x, z, 0); n.faceTo(AR[0], AR[1] - 2); n.group.rotation.y = n.yaw; n.setPose(i % 3 === 1 ? 'idle' : 'sit'); council.push(n); }
    council[2].name = 'Dionysius the Areopagite'; council[6].name = 'Damaris';
    return { idols, altar: [ax + Math.sin(ary) * 1.6, az + Math.cos(ary) * 1.6], phil, council, AR };
  },
  async run(G, S) {
    const P = G.player, paul = G.paul, { phil, council, AR } = S;
    P.teleport(0, -52, 0); G.amb({ crowd: 0.1 });
    G.letter(-44, 10, { ref: '1 Thessalonians 5:16-18', from: 'to the Thessalonians', text: 'Always rejoice. Pray without ceasing. In everything give thanks, for this is the will of God in Christ Jesus toward you.' });
    G.letter(46, 150, { ref: '2 Corinthians 12:9', from: 'to the Corinthians', text: 'He has said to me, “My grace is sufficient for you, for my power is made perfect in weakness.” Most gladly therefore I will rather glory in my weaknesses, that the power of Christ may rest on me.' });
    G.objective('Walk the marketplace and observe the objects of their worship (0/3)');
    for (let i = 0; i < 3; i++) { const [x, z] = S.idols[[0, 3, 4][i]]; await G.interact([x, z + 0.01], 'Observe the image', 4.2, `Walk the marketplace and observe the objects of their worship (${i}/3)`); G.sound.chime(); G.toast(['An image of gold', 'An image of silver and gold', 'An image of stone, engraved by art'][i]); }
    await G.interact(S.altar, 'Read the inscription', 3.4, 'One altar stands apart. Read its inscription');
    await G.say([['', 'An altar with no image and no name. Its inscription reads: ΑΓΝΩΣΤΩ ΘΕΩ — “To an unknown god.”']]);
    await G.reach(phil[0], 4.5, 'Reason with those who meet you in the marketplace');
    P.locked = true; phil.forEach(p => p.faceTo(P.pos.x, P.pos.z)); paul.setPose('preach'); P.poseLock = true;
    await G.say([
      ['', 'So he reasoned in the synagogue with the Jews and the devout persons, and in the marketplace every day with those who met him.', 'Acts 17:17'],
      ['', 'Some of the Epicurean and Stoic philosophers also were conversing with him.', 'Acts 17:18'],
      ['Some', 'What does this babbler want to say?', 'Acts 17:18'],
      ['Others', 'He seems to be advocating foreign deities', 'Acts 17:18'],
      ['', 'because he preached Jesus and the resurrection.', 'Acts 17:18'],
      ['The philosophers', 'May we know what this new teaching is, which you are speaking about? For you bring certain strange things to our ears. We want to know therefore what these things mean.', 'Acts 17:19-20'],
    ]);
    paul.setPose('idle'); P.poseLock = false; P.locked = false;
    G.objective('They bring you to the Areopagus — follow them up the hill of Ares');
    phil.slice(1).forEach((p, i) => follow(p, paul, 3 + i * 0.9, i - 1.5, 5));
    await lead(G, phil[0], [[10, 30], [-6, 62], [-22, 78], [-26, 94], [-12, 103], [-5, 99]], 2.6, 9);
    await G.reach([AR[0], AR[1]], 2.5, 'Stand in the middle of the Areopagus');
    phil.forEach((p, i) => { p.follow = null; p.walk([[AR[0] - 6 + i * 3, AR[1] - 7.5]], 2).then(() => p.faceTo(AR[0], AR[1])); });
    await G.interact(null, 'Speak to the men of Athens');
    P.locked = true; P.yaw = 0.3; paul.setPose('preach'); P.poseLock = true; P.camYaw = Math.PI + 0.5; P.camPitch = 0.22; P.camDist = 7;
    await G.say([
      ['Paul', 'You men of Athens, I perceive that you are very religious in all things.', 'Acts 17:22'],
      ['Paul', 'For as I passed along and observed the objects of your worship, I also found an altar with this inscription: ‘TO AN UNKNOWN GOD.’ What therefore you worship in ignorance, I announce to you.', 'Acts 17:23'],
      ['Paul', 'The God who made the world and all things in it, he, being Lord of heaven and earth, doesn’t dwell in temples made with hands.', 'Acts 17:24'],
      ['Paul', 'He isn’t served by men’s hands, as though he needed anything, seeing he himself gives to all life and breath, and all things.', 'Acts 17:25'],
      ['Paul', 'He made from one blood every nation of men to dwell on all the surface of the earth, having determined appointed seasons, and the boundaries of their dwellings, that they should seek the Lord, if perhaps they might reach out for him and find him, though he is not far from each one of us.', 'Acts 17:26-27'],
      ['Paul', '‘For in him we live, move, and have our being.’ As some of your own poets have said, ‘For we are also his offspring.’', 'Acts 17:28'],
      ['Paul', 'Being then the offspring of God, we ought not to think that the Divine Nature is like gold, or silver, or stone, engraved by art and design of man.', 'Acts 17:29'],
      ['Paul', 'The times of ignorance therefore God overlooked. But now he commands that all people everywhere should repent, because he has appointed a day in which he will judge the world in righteousness by the man whom he has ordained; of which he has given assurance to all men, in that he has raised him from the dead.', 'Acts 17:30-31'],
    ]);
    paul.setPose('idle'); P.poseLock = false; G.env(ENV.dusk(), 14);
    await G.say([['', 'Now when they heard of the resurrection of the dead, some mocked; but others said', 'Acts 17:32'], ['Others', 'We want to hear you again concerning this.', 'Acts 17:32']]);
    council.forEach((c, i) => { if (i !== 2 && i !== 6) { c.setPose('idle'); if (i % 2) c.walk([[AR[0] + 40 - i * 10, AR[1] - 40]], 1.5); } }); phil.forEach((p, i) => p.walk([[20 + i * 4, 40]], 1.6));
    for (const i of [2, 6]) { council[i].setPose('idle'); council[i].walk([[P.pos.x + (i === 2 ? 1.6 : -1.6), P.pos.z + 1.2]], 1.6).then(() => council[i].faceTo(P.pos.x, P.pos.z)); }
    await G.wait(3);
    await G.say([['', 'Thus Paul went out from among them. But certain men joined with him and believed, among whom also was Dionysius the Areopagite, and a woman named Damaris, and others with them.', 'Acts 17:33-34']]);
    P.locked = false;
  },
};

// ============================================================ VI. EPHESUS
const ephesus = {
  title: 'Great is Artemis', journey: 'Third Journey', ref: 'Acts 19:23-41', place: 'Ephesus, in the province of Asia', route: ['Antioch', 'Derbe', 'Pisidian Antioch', 'Ephesus'], letters: 3, seed: 61,
  env: ENV.dusk,
  intro: `On his third journey Paul came to Ephesus, and stayed.\n\n${q('But when some were hardened and disobedient, speaking evil of the Way before the multitude, he departed from them, and separated the disciples, reasoning daily in the school of Tyrannus. This continued for two years, so that all those who lived in Asia heard the word of the Lord Jesus, both Jews and Greeks.', 'Acts 19:9-10')}\n\n${q('About that time there arose no small disturbance concerning the Way.', 'Acts 19:23')}`,
  outro: `Paul travelled on through Macedonia and Greece, and turned at last toward Jerusalem. At Miletus he called for the elders of Ephesus:\n\n${q('Now, behold, I go bound by the Spirit to Jerusalem, not knowing what will happen to me there; except that the Holy Spirit testifies in every city, saying that bonds and afflictions wait for me. But these things don’t count; nor do I hold my life dear to myself, so that I may finish my race with joy, and the ministry which I received from the Lord Jesus, to fully testify to the Good News of the grace of God.', 'Acts 20:22-24')}\n\n${q('When he had spoken these things, he knelt down and prayed with them all. They all wept freely, and fell on Paul’s neck and kissed him, sorrowing most of all because of the word which he had spoken, that they should see his face no more. Then they accompanied him to the ship.', 'Acts 20:36-38')}`,
  build(G, W) {
    const TH = [0, -40], R = 40;
    const H = (x, z) => { const dT = Math.hypot(x - TH[0], z - TH[1]); return 0.6 + smooth(-2, -72, z) * 23 * smooth(R + 2, R + 13, dT) * (0.85 + 0.3 * fbm(x * 0.03, z * 0.03)) + (fbm(x * 0.02, z * 0.02) - 0.5) * 5 * smooth(40, 80, Math.abs(x)) * smooth(-20, 20, z) - smooth(176, 200, z) * 7 + smooth(170, 260, Math.hypot(x, z - 40)) * smooth(150, 60, z) * 30; };
    W.bounds = 235; W.road([[0, 176], [0, 8]], 14);
    W.terrain({ size: 620, seg: 200, cz: 40, height: H, color: (x, z, h, sl) => { if (h < -0.2) return 0x9a9478; if (Math.abs(x) < 7.4 && z > 6 && z < 178) return 0xcfc8b6; if (Math.abs(x) < 60 && z > -4 && z < 178) return 0xb4aa92; if (sl > 0.5) return 0x8f8a78; return new THREE.Color(0x8c9054).lerp(new THREE.Color(0x6f844a), fbm(x * 0.03, z * 0.03)).getHex(); } });
    W.horizon({ color: 0x7f8a5c, height: 80, seed: 9, arcs: [[Math.PI / 2 + 0.95, Math.PI * 2.5 - 0.95]] });
    W.water(-0.6);
    const th = W.theatre(TH[0], TH[1], 0, { r0: 12, R, rows: 17, rise: 0.62 }); W.addCircle(TH[0], TH[1], R + 3.2, 60); W.colliders[W.colliders.length - 1].nocam = true;
    W.street(0, 172, 0, 24, 26, 'greek', { tall: true, gap: 1 }); W.street(-70, 60, -30, 60, 6, 'greek'); W.street(30, 110, 70, 110, 6, 'greek');
    for (let z = 168; z > 14; z -= 7) for (const sx of [-8.2, 8.2]) W.column(sx, H(sx, z), z, 5.2, 0.34);
    for (const sx of [-8.2, 8.2]) W.box(sx, H(sx, 90) + 5.2, 91, 1, 0.5, 156, 0xe6dfcf);
    const torches = []; for (let z = 150; z > 10; z -= 23) for (const sx of [-6.6, 6.6]) torches.push(W.torch(sx, z, 2.6, (z / 23 | 0) % 2 === (sx > 0 ? 0 : 1)));
    W.torch(-13, -22.5, 2.6, true, 1.8); W.torch(13, -22.5, 2.6, true, 1.8);
    // the silversmiths' quarter
    W.stall(-11, 104, Math.PI / 2); W.stall(-11, 96, Math.PI / 2); W.box(-9.6, 0.6, 100, 1.2, 0.9, 3, 0x7a5c3c);
    for (let i = 0; i < 4; i++) { const z = 98.9 + i * 0.75; W.box(-9.6, 1.5, z, 0.4, 0.42, 0.5, 0xc8ccd4); W.S.add(new THREE.ConeGeometry(0.36, 0.25, 4), 0xd8dce4, -9.6, 2.04, z, 0, Math.PI / 4, 0); }
    W.temple(150, 60, Math.PI / 2, { w: 24, d: 50, h: 13, nf: 8, ns: 17, color: 0xe6e0d4, roof: 0xa8946c });
    W.box(0, -2, 186, 30, 2.4, 10, 0xb8ae98); W.addPlatform(0, 186, 15, 5, 0, 0.4);
    const open = (x, z, h) => !W.blocked(x, 2, z) && Math.hypot(x - TH[0], z - TH[1]) > R + 5 && h > 0.3 && (Math.abs(x) > 12 || z < 0);
    W.scatter('cypress', 80, -220, -180, 220, 170, open); W.scatter('olive', 70, -220, -180, 220, 170, open); W.scatter('oak', 30, -220, -180, 220, 0, open); W.scatter('bush', 90, -200, -160, 200, 170, open); W.scatter('rock', 60, -120, -150, 120, 0, open, 1.2);
    W.grass(24000, -120, -140, 120, 20, (x, z, h) => Math.hypot(x - TH[0], z - TH[1]) > R + 3 && (Math.abs(x) > 60 || z < -4) && h > 0.3, [0x7a8a4a, 0x86924f, 0x6e8044]);
    const list = []; for (let row = 0; row < 17; row++) { const rr = th.r0 + (row + 0.55) * th.stepW, n = Math.floor(rr * 2.9 / 1.0); for (let k = 0; k < n; k++) { if (Math.random() < 0.22) continue; const a = 0.12 + (k + Math.random() * 0.4) / n * (Math.PI - 0.24), [x, y, z] = th.seat(row, a); list.push({ x, y: y - 0.05, z, ry: Math.atan2(TH[0] - x, TH[1] + 12 - z), s: 0.92 + Math.random() * 0.14 }); } }
    const crowd = makeCrowd(list, 0.15); crowd.visible = false; W.group.add(crowd);
    const dem = G.spawn(look(400, 'greek', { robe: 0x8a6a3a, sash: 0xc8ccd4, beard: true, long: false }), -6.5, 100, Math.PI / 2, 'Demetrius');
    const craft = [[-4, 103], [-3.4, 98], [-5.5, 95.6], [-2.6, 100.6], [-5.6, 105], [-1.5, 96.5]].map((p, i) => G.spawn(look(401 + i, 'greek', { long: false, robe: [0x8a7a5a, 0x7a6a4a, 0x9a8a6a][i % 3] }), p[0], p[1], -Math.PI / 2));
    const disc = [[-2, 12], [0.5, 11], [2.6, 12.4], [-4, 13.5]].map((p, i) => G.spawn(look(420 + i, i === 2 ? 'woman' : 'man'), p[0], p[1], 0, i === 0 ? 'Disciples' : '')); disc.forEach(d => { d.group.visible = false; });
    townsfolk(G, [[3, 150, [3, 120]], [-3, 130, [-3, 160]], [4, 70, [4, 40]], [-5, 50], [5.5, 126], [-4, 160], [2, 182]], 29, 'greek');
    const sy = th.y + 1.2; const stage = [[-2, 'Gaius'], [2, 'Aristarchus'], [-3.4, ''], [3.4, ''], [0, 'The town clerk']].map(([x, name], i) => { const n = G.spawn(look(430 + i, i < 2 ? 'man' : 'greek', i === 4 ? { robe: 0xf0ece0, sash: 0x7a2a6a, long: true, beard: true } : {}), TH[0] + x, TH[1] + th.r0 + 4, Math.PI, name); n.pos.y = sy; n.fixedY = true; n.group.visible = false; return n; });
    return { th, TH, crowd, dem, craft, disc, stage, view: [0, -96] };
  },
  async run(G, S) {
    const P = G.player, paul = G.paul, { crowd, dem, craft, disc, stage, TH } = S;
    P.teleport(0, 166, Math.PI); G.amb({ sea: 0.08, crowd: 0.08 });
    G.letter(5, 140, { ref: 'Ephesians 6:10-11', from: 'to the Ephesians', text: 'Finally, be strong in the Lord, and in the strength of his might. Put on the whole armor of God, that you may be able to stand against the wiles of the devil.' });
    G.letter(4, 60, { ref: '1 Corinthians 13:4-7', from: 'to the Corinthians, written at Ephesus', text: 'Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud, doesn’t behave itself inappropriately, doesn’t seek its own way, is not provoked, takes no account of evil; doesn’t rejoice in unrighteousness, but rejoices with the truth; bears all things, believes all things, hopes all things, and endures all things.' });
    G.letter(52, -64, { ref: 'Ephesians 2:8-9', from: 'to the Ephesians', text: 'for by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, that no one would boast.' });
    await G.reach([-2, 100], 5, 'Walk up the colonnaded street, past the silversmiths');
    P.locked = true; dem.setPose('preach'); craft.forEach(c => c.faceTo(dem.pos.x, dem.pos.z));
    await G.say([
      ['', 'For a certain man named Demetrius, a silversmith who made silver shrines of Artemis, brought no little business to the craftsmen, whom he gathered together, with the workmen of like occupation', 'Acts 19:24-25'],
      ['Demetrius', 'Sirs, you know that by this business we have our wealth.', 'Acts 19:25'],
      ['Demetrius', 'You see and hear that not at Ephesus alone, but almost throughout all Asia, this Paul has persuaded and turned away many people, saying that they are no gods that are made with hands.', 'Acts 19:26'],
      ['Demetrius', 'Not only is there danger that this our trade come into disrepute, but also that the temple of the great goddess Artemis will be counted as nothing and her majesty destroyed, whom all Asia and the world worships.', 'Acts 19:27'],
    ]);
    craft.forEach(c => c.setPose('raise')); dem.setPose('raise'); G.sound.roar(); G.amb({ crowd: 0.45 });
    await G.say([['The craftsmen', 'Great is Artemis of the Ephesians!', 'Acts 19:28']]);
    [dem, ...craft].forEach((c, i) => { c.setPose('idle'); c.walk([[-3 + (i % 3) * 3, 60], [-14 - (i % 3), -14], [-10 + i, -20]], 5 + (i % 3) * 0.5).then(() => { c.group.visible = false; }); });
    crowd.visible = true; crowd.userData.u.uExcite.value = 0.9; stage.slice(0, 4).forEach(n => { n.group.visible = true; }); stage[2].setPose('hold'); stage[3].setPose('hold'); disc.forEach(d => { d.group.visible = true; });
    await G.say([['', 'The whole city was filled with confusion, and they rushed with one accord into the theater, having seized Gaius and Aristarchus, men of Macedonia, Paul’s companions in travel.', 'Acts 19:29']]);
    P.locked = false;
    await G.reach([0, 16], 4.5, 'Your companions are seized — go to the theatre');
    P.locked = true; disc.forEach(d => { d.faceTo(P.pos.x, P.pos.z); d.setPose('hold'); });
    await G.say([
      ['', 'When Paul wanted to enter in to the people, the disciples didn’t allow him.', 'Acts 19:30'],
      ['', 'Certain also of the Asiarchs, being his friends, sent to him and begged him not to venture into the theater.', 'Acts 19:31'],
    ]);
    P.locked = false; disc.forEach((d, i) => { d.setPose('idle'); follow(d, paul, 2.4 + i * 0.9, i - 1.5, 5); });
    await G.reach(S.view, 6, 'Climb the hillside behind the theatre and look down on the assembly');
    P.camYaw = Math.PI; P.camPitch = 0.42;
    await G.say([['', 'Some therefore cried one thing, and some another, for the assembly was in confusion. Most of them didn’t know why they had come together.', 'Acts 19:32']]);
    G.env(ENV.night(), 10); G.env({ ...ENV.night(), fogDensity: 0.0026 }, 10); G.sound.roar(); G.amb({ crowd: 0.7 });
    await G.say([['', 'all with one voice for a time of about two hours cried out, “Great is Artemis of the Ephesians!”', 'Acts 19:34']]);
    if (!G.auto) await G.wait(4);
    stage[4].group.visible = true; stage[4].setPose('preach'); crowd.userData.u.uExcite.value = 0.12; G.amb({ crowd: 0.12 });
    await G.say([
      ['The town clerk', 'You men of Ephesus, what man is there who doesn’t know that the city of the Ephesians is temple keeper of the great goddess Artemis, and of the image which fell down from Zeus?', 'Acts 19:35'],
      ['The town clerk', 'Seeing then that these things can’t be denied, you ought to be quiet and to do nothing rash. For you have brought these men here, who are neither robbers of temples nor blasphemers of your goddess.', 'Acts 19:36-37'],
      ['The town clerk', 'If therefore Demetrius and the craftsmen who are with him have a matter against anyone, the courts are open, and there are proconsuls. Let them press charges against one another.', 'Acts 19:38'],
      ['The town clerk', 'For indeed we are in danger of being accused concerning today’s riot, there being no cause.', 'Acts 19:40'],
      ['', 'When he had thus spoken, he dismissed the assembly.', 'Acts 19:41'],
    ]);
    crowd.userData.u.uExcite.value = 0.02; G.amb({ crowd: 0.03 }); stage[2].setPose('idle'); stage[3].setPose('idle');
    await G.say([['', 'After the uproar had ceased, Paul sent for the disciples, took leave of them, and departed to go into Macedonia.', 'Acts 20:1']]);
  },
};

// ============================================================ VII. JERUSALEM TO ANTIPATRIS
const ROAD7 = [[0, -14], [20, -90], [-30, -170], [10, -260], [60, -340], [10, -430], [-40, -520], [0, -610], [0, -668]];
const jerusalem = {
  title: 'By Night to Antipatris', journey: 'Bound for Rome', ref: 'Acts 21:27 – 23:35', place: 'Jerusalem — the stairs of the barracks', route: ['Miletus', 'Tyre', 'Caesarea', 'Jerusalem', 'Antipatris', 'Caesarea'], letters: 2, seed: 71,
  env: ENV.dusk,
  intro: `At Caesarea the prophet Agabus bound his own hands and feet with Paul’s belt: so would Paul be bound at Jerusalem.\n\n${q('What are you doing, weeping and breaking my heart? For I am ready not only to be bound, but also to die at Jerusalem for the name of the Lord Jesus.', 'Acts 21:13')}\n\nSeven days later, in the temple:\n\n${q('Men of Israel, help! This is the man who teaches all men everywhere against the people, and the law, and this place.', 'Acts 21:28')}\n\n${q('They seized Paul and dragged him out of the temple. Immediately the doors were shut.', 'Acts 21:30')}`,
  outro: `At Caesarea Paul was kept in Herod’s palace. ${q('But when two years were fulfilled, Felix was succeeded by Porcius Festus, and desiring to gain favor with the Jews, Felix left Paul in bonds.', 'Acts 24:27')}\n\nBefore Festus, Paul made his answer:\n\n${q('I am standing before Caesar’s judgment seat, where I ought to be tried. I have done no wrong to the Jews, as you also know very well.', 'Acts 25:10')} ${q('I appeal to Caesar!', 'Acts 25:11')}\n\n${q('You have appealed to Caesar. To Caesar you shall go.', 'Acts 25:12')}`,
  build(G, W) {
    const road = ROAD7; W.bounds = 420; W.mapR = 400; W.road(road, 8);
    const H = (x, z) => { const rd = pathDist(road, x, z)[0], fa = smooth(75, 45, Math.hypot(x, z - 30)), fb = smooth(60, 34, Math.hypot(x, z + 698)); return z * 0.03 + (fbm(x * 0.012, z * 0.012) * 44 - 15) * smooth(6, 44, rd) * (1 - fa) * (1 - fb) + (fbm(x * 0.06, z * 0.06) - 0.5) * 1.5 * smooth(5, 14, rd) * (1 - fa) * (1 - fb); };
    W.terrain({ size: 900, seg: 240, cz: -330, height: H, color: (x, z, h, sl) => { const rd = pathDist(road, x, z)[0]; if (rd < 3.6 + fbm(x * 0.3, z * 0.3)) return 0x9a8c70; if (Math.hypot(x, z - 30) < 60 || Math.hypot(x, z + 698) < 40) return 0xb0a488; if (sl > 0.5) return 0x8a8470; return new THREE.Color(0x9a9462).lerp(new THREE.Color(0x768650), fbm(x * 0.03, z * 0.03)).getHex(); } });
    W.horizon({ color: 0x9a9068, height: 90, seed: 13 });
    // the Antonia fortress and the stairs
    W.cityWalls(-42, 16, 42, 76, 11, [{ side: 'n', at: 0.5, width: 6 }], 0xc8bc9c);
    W.box(0, -0.08, 8, 12, 2.5, 12, 0xcfc4a8); W.addPlatform(0, 8, 6, 6, 0, 2.42);
    for (let i = 1; i < 5; i++) { const zz = 2.8 - i * 1.6, hh = 2.0 - i * 0.4; W.box(0, 0.42 - 0.5, zz, 12, hh + 0.5, 1.6, 0xcfc4a8); W.addPlatform(0, zz, 6, 0.8, 0, 0.42 + hh); }
    W.wall(60, 76, 60, -40, 13, 2.5, 0xd6ccb0); W.wall(60, -40, 140, -40, 13, 2.5, 0xd6ccb0); W.street(-70, -22, -30, -22, 6, 'mud'); W.street(-80, 10, -52, 60, 6, 'mud', { sides: [-1] });
    const fortT = [W.torch(-5.4, 3, 2.6, true, 2.42), W.torch(5.4, 3, 2.6, true, 2.42), W.torch(-9, -8, 2.4, false), W.torch(9, -8, 2.4, false)];
    // Antipatris
    W.cityWalls(-32, -722, 32, -680, 7, [{ side: 's', at: 0.5, width: 6 }], 0xb8ac90); W.torch(-6, -674, 2.6, true); W.torch(6, -674, 2.6, true);
    for (const t of [0.3, 0.52, 0.76]) { const [x, z, a] = pathPoint(road, t); W.torch(x + Math.cos(a) * 5.5, z - Math.sin(a) * 5.5, 2.4, true); }
    const open = (x, z, h) => pathDist(road, x, z)[0] > 7 && !W.blocked(x, 2, z) && Math.hypot(x, z - 30) > 62;
    W.scatter('olive', 260, -260, -700, 260, 0, open); W.scatter('cypress', 110, -260, -700, 260, 0, open); W.scatter('oak', 60, -260, -700, 260, -100, open); W.scatter('rock', 320, -260, -700, 260, 0, (x, z) => pathDist(road, x, z)[0] > 6, 1.5); W.scatter('bush', 260, -200, -700, 200, 0, open);
    W.grass(40000, -110, -690, 110, -10, (x, z) => { const d = pathDist(road, x, z)[0]; return d > 4.4 && d < 34; }, [0x8a8a52, 0x7c8248, 0x969458]);
    const list = []; for (let i = 0; i < 340; i++) { const x = (Math.random() - 0.5) * 36, z = -9 - Math.random() * 30; list.push({ x, y: H(x, z), z, ry: Math.atan2(-x, 4 - z), s: 0.93 + Math.random() * 0.12 }); }
    const crowd = makeCrowd(list, 0.85); W.group.add(crowd);
    const commander = G.spawn(look(500, 'centurion'), -1.6, 4.2, Math.PI, 'The commanding officer'); const guards = [[2.4, 4.4], [-3.8, 3], [4.2, 3]].map((p, i) => G.spawn(look(501 + i, 'soldier', { spear: true }), p[0], p[1], Math.PI));
    const horse = G.beast('horse', 0x5a4030, 3, -20, Math.PI); horse.group.visible = false;
    // the escort: foot soldiers, spearmen and horsemen keep station around Paul along the road
    const esc = []; const slots = [[14, -2.2, 0], [14, 2.2, 0], [9, -2.6, 1], [9, 2.6, 0], [-7, -2.4, 0], [-7, 2.4, 1], [-12, -2.2, 0], [-12, 2.2, 0], [20, 0, 1], [-17, 0, 1]];
    slots.forEach(([ds, lat, torch], i) => { const n = G.spawn(look(510 + i, 'soldier', { spear: true }), lat, -30 - i, Math.PI); n.auto = false; n.group.visible = false; if (torch) W.flame(0.34, 2.05, 0.2, 0.8, i < 5, n.group); esc.push({ n, ds, lat }); });
    [[5, -3.4], [5, 3.4], [-4, -3.6], [-4, 3.6], [26, 0]].forEach(([ds, lat], i) => { const b = G.beast('horse', [0x3a2a20, 0x6a5038, 0x8a8478, 0x2a2020, 0x5a4030][i], lat, -40, Math.PI); const r = new Person(look(530 + i, 'soldier', { spear: true }), null); r.auto = false; r.setPose('ride'); r.pos.set(0, b.seatY - 0.9, -0.05); b.group.add(r.group); b.group.visible = false; esc.push({ b, r, ds, lat }); });
    return { crowd, commander, guards, horse, esc, road, fortT, H };
  },
  async run(G, S) {
    const P = G.player, paul = G.paul, { crowd, commander, guards, horse, esc, road } = S;
    P.teleport(0.4, 4.6, Math.PI); P.locked = true; P.camYaw = 0.3; P.camPitch = 0.24; P.camDist = 7; G.amb({ crowd: 0.6, music: 0.5 }); G.sound.roar();
    const pr = (t) => pathPoint(road, t), total = pr(0)[3];
    G.letter(pr(0.33)[0], pr(0.33)[1], { ref: 'Romans 8:38-39', from: 'to the Romans', text: 'For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers, nor height, nor depth, nor any other created thing will be able to separate us from God’s love which is in Christ Jesus our Lord.' });
    G.letter(pr(0.68)[0], pr(0.68)[1], { ref: '2 Corinthians 11:26', from: 'to the Corinthians', text: 'I have been in travels often, perils of rivers, perils of robbers, perils from my countrymen, perils from the Gentiles, perils in the city, perils in the wilderness, perils in the sea, perils among false brothers' });
    await G.say([
      ['', 'When he came to the stairs, he was carried by the soldiers because of the violence of the crowd; for the multitude of the people followed after, crying out, “Away with him!”', 'Acts 21:35-36'],
      ['Paul', 'I am a Jew, from Tarsus in Cilicia, a citizen of no insignificant city. I beg you, allow me to speak to the people.', 'Acts 21:39'],
    ]);
    await G.interact(null, 'Beckon with your hand to the people');
    P.locked = true; paul.setPose('preach'); P.poseLock = true; crowd.userData.u.uExcite.value = 0.03; G.amb({ crowd: 0.04 });
    await G.say([
      ['', 'When there was a great silence, he spoke to them in the Hebrew language', 'Acts 21:40'],
      ['Paul', 'Brothers and fathers, listen to the defense which I now make to you.', 'Acts 22:1'],
      ['Paul', 'I am indeed a Jew, born in Tarsus of Cilicia, but brought up in this city at the feet of Gamaliel, instructed according to the strict tradition of the law of our fathers, being zealous for God, even as you all are today.', 'Acts 22:3'],
      ['', 'He tells them of the road to Damascus — the light, the voice, his blindness and his baptism — and of the Lord’s word to him in this very temple:'],
      ['Paul', 'He said to me, ‘Depart, for I will send you out far from here to the Gentiles.’', 'Acts 22:21'],
    ]);
    crowd.userData.u.uExcite.value = 1; G.amb({ crowd: 0.8 }); G.sound.roar(); paul.setPose('idle'); P.poseLock = false;
    await G.say([['', 'They listened to him until he said that; then they lifted up their voice and said', 'Acts 22:22'], ['The crowd', 'Rid the earth of this fellow, for he isn’t fit to live!', 'Acts 22:22']]);
    await G.fade(1, 1.2); crowd.visible = false; G.amb({ crowd: 0 }); G.engine.setEnv(ENV.night());
    commander.group.visible = false; guards.forEach(g => { g.group.visible = false; }); paul.setPose('kneel'); P.poseLock = true; P.camYaw = 2.6; P.camPitch = 0.3; P.camDist = 5;
    const glow = new THREE.PointLight(0xfff0d0, 0, 30, 1.2); glow.position.set(0.4, 6, 2.5); G.world.group.add(glow);
    await G.fade(0, 1.6); G.sound.glory(); G.env({ glory: 0.18 }, 2); const tg = G.game.time; G.world.updaters.push(() => { const t = G.game.time - tg; glow.intensity = glow.userData.off ? Math.max(0, glow.intensity - 1.5) : Math.min(90, t * 45); });
    await G.say([['', 'The following night, the Lord stood by him and said', 'Acts 23:11'], ['The Lord', 'Cheer up, Paul, for as you have testified about me at Jerusalem, so you must testify also at Rome.', 'Acts 23:11']]);
    glow.userData.off = true; G.env({ glory: 0 }, 2);
    await G.say([
      ['', 'When it was day, some of the Jews banded together, and bound themselves under a curse, saying that they would neither eat nor drink until they had killed Paul. There were more than forty people who had made this conspiracy.', 'Acts 23:12-13'],
      ['', 'But Paul’s sister’s son heard they were lying in wait, and he came and entered into the barracks and told Paul.', 'Acts 23:16'],
    ]);
    await G.fade(1, 1);
    // ---- the third hour of the night
    G.engine.setEnv(makeEnv({ ...ENV.stormNight(), rain: 0.7, wind: 1.9, windAngle: 1.1, lightning: 0.09, fogDensity: 0.0052, hemiInt: 1.5, sunInt: 1.1, skyHorizon: new THREE.Color(0x232c3c), fog: new THREE.Color(0x1c232f), exposure: 1.1 }));
    paul.setPose('idle'); P.poseLock = false; P.teleport(0, -12, Math.PI); commander.group.visible = true; commander.place(-2.5, -15, 1.2); horse.group.visible = true; horse.pos.set(3, G.world.ground(3, -20), -20);
    esc.forEach((e) => { (e.n || e.b).group.visible = true; }); let riding = false;
    G.world.updaters.push((dt) => { const t = pathDist(road, P.pos.x, P.pos.z)[1], spd = riding ? horse.speed : 0;
      for (const e of esc) { const [x, z, a] = pathPoint(road, Math.min(1, Math.max(0, t + e.ds / total))); const px = x + Math.cos(a) * e.lat, pz = z - Math.sin(a) * e.lat, o = e.n || e.b; o.pos.x = lerp(o.pos.x, px, Math.min(1, dt * 3)); o.pos.z = lerp(o.pos.z, pz, Math.min(1, dt * 3)); o.pos.y = G.world.ground(o.pos.x, o.pos.z); o.group.rotation.y = a; o.speed = spd; if (e.r) e.r.update(dt, G.game.time); } });
    await G.fade(0, 1.4);
    await G.say([
      ['The commanding officer', 'Prepare two hundred soldiers to go as far as Caesarea, with seventy horsemen, and two hundred men armed with spears, at the third hour of the night.', 'Acts 23:23'],
      ['', 'He asked them to provide animals, that they might set Paul on one, and bring him safely to Felix the governor.', 'Acts 23:24'],
    ]);
    await G.interact(horse, 'Mount', 3.6, 'Mount the horse provided for you');
    P.mount(horse); riding = true; const tRide = G.game.time; G.toast('W ride · Shift gallop · A / D steer');
    G.objective('Ride through the night with the escort, down to Antipatris', [0, -664]);
    if (G.auto) { G.warp([10, -430]); await G.wait(0.2); } else await G.until(() => pathDist(road, P.pos.x, P.pos.z)[1] > 0.6);
    G.env({ ...ENV.dawn(), rain: 0.08, wind: 1.0, fogDensity: 0.005 }, 30);
    await G.reach([0, -664], 12);
    if (!G.auto && G.game.time - tRide < 110) G.deed('swift');
    P.locked = true; riding = false; horse.speed = 0;
    await G.say([
      ['', 'So the soldiers, carrying out their orders, took Paul and brought him by night to Antipatris.', 'Acts 23:31'],
      ['', 'But on the next day they left the horsemen to go with him, and returned to the barracks. When they came to Caesarea and delivered the letter to the governor, they also presented Paul to him.', 'Acts 23:32-33'],
    ]);
  },
};

// ============================================================ VIII. THE STORM AND MALTA
const stormEnv = (o = {}) => makeEnv({ ...ENV.stormNight(), windAngle: -1.45, ...o });
const malta = {
  title: 'Shipwreck', journey: 'The Voyage to Rome', ref: 'Acts 27:1 – 28:10', place: 'The open sea, south of Crete', route: ['Caesarea', 'Sidon', 'Myra', 'Fair Havens', 'Malta'], letters: 2, seed: 83,
  env: () => makeEnv({ ...ENV.stormDay(), windAngle: -1.45 }),
  intro: `${q('When it was determined that we should sail for Italy, they delivered Paul and certain other prisoners to a centurion named Julius, of the Augustan band.', 'Acts 27:1')}\n\nAt Fair Havens in Crete, late in the season, Paul warned them:\n\n${q('Sirs, I perceive that the voyage will be with injury and much loss, not only of the cargo and the ship, but also of our lives.', 'Acts 27:10')}\n\n${q('But the centurion gave more heed to the master and to the owner of the ship than to those things which were spoken by Paul.', 'Acts 27:11')}`,
  outro: `On Malta Paul prayed for the father of Publius, the chief man of the island, and he was healed — and many others with him.\n\n${q('After three months, we set sail in a ship of Alexandria which had wintered in the island, whose sign was “The Twin Brothers.”', 'Acts 28:11')}\n\nBy Syracuse, Rhegium and Puteoli — ${q('So we came to Rome.', 'Acts 28:14')}\n\n${q('Paul stayed two whole years in his own rented house and received all who were coming to him, preaching God’s Kingdom, and teaching the things concerning the Lord Jesus Christ with all boldness, without hindrance.', 'Acts 28:30-31')}`,
  build(G, W) {
    const isle = (x, z) => 1 - Math.hypot(x / 310, (z + 570) / 175) - (fbm(x * 0.01 + 4, z * 0.01) - 0.5) * 0.4 - smooth(80, 40, Math.hypot(x, z + 418)) * 0.55;
    const H = (x, z) => { const v = isle(x, z); let h = -9 + smooth(-0.1, 0.1, v) * 10.3 + Math.max(0, v - 0.08) * (fbm(x * 0.014, z * 0.014) * 46 + 4) + (fbm(x * 0.07, z * 0.07) - 0.5) * 0.8 * smooth(0.02, 0.1, v); return Math.max(h, -9 + 8.2 * smooth(20, 6, Math.hypot(x - 2, z + 322))); };
    W.bounds = 660; W.mapR = 640;
    W.terrain({ size: 1420, seg: 250, cz: -100, height: H, color: (x, z, h, sl) => { if (h < 1.3) return 0xcdbf98; if (sl > 0.5) return 0x8a8672; return new THREE.Color(0x8f9458).lerp(new THREE.Color(0x6e8048), fbm(x * 0.03, z * 0.03)).getHex(); } });
    W.water(0);
    let bz = -340; while (H(0, bz) < 0.9 && bz > -560) bz -= 1; const beach = [0, bz], fire = [4, bz - 13];
    W.campfire(fire[0], fire[1], 1.3);
    const land = (x, z, h) => h > 1.6 && h < 30 && Math.hypot(x - fire[0], z - fire[1]) > 9;
    W.scatter('olive', 120, -260, -720, 260, -380, land); W.scatter('oak', 60, -260, -720, 260, -380, land); W.scatter('bush', 160, -260, -720, 260, -380, land); W.scatter('rock', 130, -280, -740, 280, -360, (x, z, h) => h > 0.2 && Math.hypot(x - fire[0], z - fire[1]) > 7 && Math.hypot(x, z - bz) > 8, 1.4); W.scatter('cypress', 40, -260, -720, 260, -400, land);
    W.grass(20000, -120, bz - 110, 120, bz - 4, (x, z, h) => h > 1.5, [0x7c8a4a, 0x86924f, 0x70804a]);
    const ship = makeShip({ sail: false, cargo: false }); ship.x = 0; ship.z = 250; ship.heading = Math.PI; W.group.add(ship.group);
    const st = { sink: 0, drift: true, tilt: 0 }; W.updaters.push((dt, t) => { if (st.drift) { ship.z -= 2.6 * dt; ship.heading = Math.PI + Math.sin(t * 0.21) * 0.35; } ship.float(G.engine, dt, st.sink); ship.group.rotation.x += st.tilt; });
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 });
    const cargo = [[-1.3, 4.6], [1.3, 5.3], [1.2, -2.4], [-1.5, 0.2], [1.6, 2.6]].map(([x, z], i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.95), wood); m.position.set(x, ship.deckY + 0.43, z); m.rotation.y = i; m.castShadow = true; ship.group.add(m); return m; });
    const skiff = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 3.4), new THREE.MeshStandardMaterial({ color: 0x5e4530, roughness: 0.9 })); skiff.position.set(3.6, 2.2, 6.2); skiff.castShadow = true; ship.group.add(skiff);
    const bread = new Solid(); bread.cyl(0, 0, 0, 0.32, 0.24, 0.3, 0x9a7a4a, 10); bread.sphere(0, 0.33, 0, 0.17, 0xc89a5a, 1.3, 0.6, 1); bread.sphere(0.12, 0.36, 0.1, 0.13, 0xb88a4a, 1.2, 0.6, 1); const basket = bread.mesh(MATTE()); basket.position.set(-1.2, ship.deckY, -1.6); ship.group.add(basket);
    const lamp = W.flame(0, ship.deckY + 2.6, -5.2, 0.42, true, ship.group); const lamp2 = W.flame(0, ship.deckY + 2.2, 7.8, 0.36, true, ship.group); lamp.power = lamp2.power = 22;
    const deck = (lk, lx, lz, ry, name = '') => { const n = G.spawn(lk, 0, 0, 0, name); n.auto = false; ship.group.add(n.group); n.pos.set(lx, ship.deckY, lz); n.group.rotation.y = ry; return n; };
    const julius = deck(look(600, 'centurion'), 1.8, -5.6, 0.3, 'Julius the centurion');
    const luke = deck(look(601, 'man', { robe: 0x6a7a8a, cloak: 0x4a4a5a, beard: true, head: 'bare', long: false }), -1.6, -4.6, 0.6, 'Luke');
    const arist = deck(look(602, 'man', { robe: 0x9a8a6a, beard: true, long: false }), -2, 2.4, 2.2, 'Aristarchus');
    const sailors = [[2.2, 6.8, -1], [-2.0, 7.2, 1.2], [2.4, 0.8, -1.6], [-2.5, -1.6, 1.5]].map((p, i) => deck(look(610 + i, 'man', { long: false, cloak: null, head: i % 2 ? 'cloth' : 'bare', robe: [0x7a6a4a, 0x8a7a5a, 0x5a5a4a, 0x6a5a3a][i] }), p[0], p[1], p[2]));
    const soldiers = [[2.6, -3.6, -1.2], [-2.6, -6, 1]].map((p, i) => deck(look(620 + i, 'soldier', { spear: true }), p[0], p[1], p[2]));
    const natives = [[-3, 2.2], [3.4, 1.4], [0.5, -3.4], [-2.6, -2.4], [2.8, -2.6]].map((p, i) => { const n = G.spawn(look(640 + i, i === 3 ? 'woman' : 'man', { long: false, cloak: null, head: 'bare', robe: [0x8a6a4a, 0x7a7a5a, 0x9a8460, 0x6a5a4a, 0x8a7a6a][i] }), fire[0] + p[0], fire[1] + p[1], 0, i === 0 ? 'The islanders' : ''); n.faceTo(fire[0], fire[1]); n.group.rotation.y = n.yaw; return n; });
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 });
    const sticks = [[-16, -10], [15, -18], [-6, -27]].map(([dx, dz]) => { const g = new THREE.Group(); for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.1, 5), stickMat); m.rotation.set(Math.PI / 2, 0, (Math.random() - 0.5) * 0.5); m.rotation.y = Math.random() * 3; m.position.set((Math.random() - 0.5) * 0.4, 0.06 + i * 0.03, (Math.random() - 0.5) * 0.4); m.castShadow = true; g.add(m); } const x = fire[0] + dx, z = fire[1] + dz; g.position.set(x, H(x, z), z); W.group.add(g); return { g, x, z }; });
    return { ship, st, cargo, skiff, basket, julius, luke, arist, sailors, soldiers, natives, sticks, beach, fire, H, deckAll: [julius, luke, arist, ...sailors, ...soldiers] };
  },
  async run(G, S) {
    const P = G.player, paul = G.paul, { ship, st, cargo, skiff, julius, sailors, natives, sticks, beach, fire } = S;
    const dp = (lx, lz) => ({ get x() { return ship.x + lx * Math.cos(ship.heading) + lz * Math.sin(ship.heading); }, get z() { return ship.z - lx * Math.sin(ship.heading) + lz * Math.cos(ship.heading); }, get y() { return ship.group.position.y + ship.deckY; } });
    P.board(ship, 0.6, -3.2); P.camYaw = 0.5; P.camPitch = 0.3; P.camDist = 7; P.snapCam = true; G.amb({ sea: 0.5, music: 0.5 });
    await G.say([['', 'But before long, a stormy wind beat down from shore, which is called Euroclydon. When the ship was caught and couldn’t face the wind, we gave way to it and were driven along.', 'Acts 27:14-15']]);
    if (!G.auto) await G.wait(5);
    const tc = G.game.time; G.world.updaters.push(() => { cargo.forEach((m, i) => { const t = G.game.time - tc - i * 1.3; if (t > 0 && t < 1.4) { m.position.x += Math.sign(m.position.x || 1) * 0.09; m.position.y += 0.07 - t * 0.12; if (!m.userData.s && t > 0.9) { m.userData.s = 1; G.sound.splash(); } } else if (t >= 1.4) m.visible = false; }); });
    sailors.forEach(s => s.setPose('carry'));
    await G.say([['', 'As we labored exceedingly with the storm, the next day they began to throw things overboard. On the third day, they threw out the ship’s tackle with their own hands.', 'Acts 27:18-19']]);
    sailors.forEach(s => s.setPose('idle')); G.env(stormEnv(), 8);
    await G.say([['', 'When neither sun nor stars shone on us for many days, and no small storm pressed on us, all hope that we would be saved was now taken away.', 'Acts 27:20']]);
    await G.reach(dp(0, 3.6), 1.7, 'Stand up in the middle of them');
    P.locked = true; paul.setPose('preach'); P.poseLock = true; S.deckAll.forEach(n => { n.group.rotation.y = Math.atan2(P.local.x - n.pos.x, P.local.z - n.pos.z); });
    await G.say([
      ['Paul', 'Sirs, you should have listened to me, and not have set sail from Crete and have gotten this injury and loss. Now I exhort you to cheer up, for there will be no loss of life among you, but only of the ship.', 'Acts 27:21-22'],
      ['Paul', 'For there stood by me this night an angel, belonging to the God whose I am and whom I serve, saying, ‘Don’t be afraid, Paul. You must stand before Caesar. Behold, God has granted you all those who sail with you.’', 'Acts 27:23-24'],
      ['Paul', 'Therefore, sirs, cheer up! For I believe God, that it will be just as it has been spoken to me. But we must run aground on a certain island.', 'Acts 27:25-26'],
    ]);
    paul.setPose('idle'); P.poseLock = false; P.locked = false;
    await G.say([
      ['', 'But when the fourteenth night had come, as we were driven back and forth in the Adriatic Sea, about midnight the sailors surmised that they were drawing near to some land.', 'Acts 27:27'],
      ['', 'As the sailors were trying to flee out of the ship, and had lowered the boat into the sea, pretending that they would lay out anchors from the bow', 'Acts 27:30'],
    ]);
    sailors.forEach((s, i) => { s.pos.set(2.0 + (i % 2) * 0.8, ship.deckY, 5.6 + i * 0.7); s.group.rotation.y = 1.4; s.setPose('carry'); });
    await G.interact(dp(1.8, -5.6), 'Warn the centurion', 2.6, 'The sailors are abandoning the ship — warn Julius the centurion');
    await G.say([['Paul', 'Unless these stay in the ship, you can’t be saved.', 'Acts 27:31']]);
    const tk = G.game.time; G.world.updaters.push(() => { const t = G.game.time - tk; if (t < 2.2) { skiff.position.y -= 0.05 * t; skiff.position.x += 0.02; } else skiff.visible = false; }); G.sound.splash(); sailors.forEach(s => s.setPose('idle'));
    await G.say([['', 'Then the soldiers cut away the ropes of the boat, and let it fall off.', 'Acts 27:32']]);
    G.env(makeEnv({ ...ENV.stormDay(), windAngle: -1.45, rain: 0.45, sunElev: 8, sunColor: new THREE.Color(0xd8c0b0), lightning: 0.03 }), 10);
    await G.interact(dp(-1.2, -1.2), 'Take bread and give thanks to God', 2.4, 'Day is coming on. Urge them all to take some food');
    P.locked = true; paul.setPose('standPray'); P.poseLock = true;
    await G.say([
      ['Paul', 'Today is the fourteenth day that you wait and continue fasting, having taken nothing. Therefore I beg you to take some food; for this is for your safety; for not a hair will perish from any of your heads.', 'Acts 27:33-34'],
      ['', 'When he had said this, and had taken bread, he gave thanks to God in the presence of all, then he broke it and began to eat. Then they all cheered up, and they also took food.', 'Acts 27:35-36'],
      ['', 'In all, we were two hundred seventy-six souls on the ship.', 'Acts 27:37'],
    ]);
    paul.setPose('idle'); P.poseLock = false;
    // ---- daybreak: make for the beach
    await G.fade(1, 1); st.drift = false; ship.x = 26; ship.z = -150; ship.heading = Math.PI; ship.speed = 2;
    G.engine.setEnv(makeEnv({ ...ENV.stormDay(), windAngle: -1.5, rain: 0.5, waveAmp: 1.25, lightning: 0.02, fogDensity: 0.0034 }));
    P.helm(ship); P.shipMax = 9; P.throttle = 0.7; let aground = false; P.onAground = () => { aground = true; };
    await G.fade(0, 1.2);
    await G.say([['', 'When it was day, they didn’t recognize the land, but they noticed a certain bay with a beach, and they decided to try to drive the ship onto it.', 'Acts 27:39']]);
    G.bark('', 'Hoisting up the foresail to the wind, they made for the beach.', 'Acts 27:40', 7); G.toast('W / S  sail  ·  A / D  steer');
    G.objective('Make for the beach', beach);
    if (G.auto) { ship.x = 2; ship.z = -296; await G.wait(0.3); aground = true; } else await G.until(() => aground);
    P.locked = true; P.onAground = null; P.throttle = 0; ship.speed = 0; G.sound.crash(); G.engine.shake(0.6, 2.2);
    const tw = G.game.time; G.world.updaters.push(() => { const t = Math.min(1, (G.game.time - tw) / 9); st.sink = t * 1.1; st.tilt = -t * 0.16; });
    await G.say([
      ['', 'But coming to a place where two seas met, they ran the vessel aground. The bow struck and remained immovable, but the stern began to break up by the violence of the waves.', 'Acts 27:41'],
      ['', 'The soldiers’ counsel was to kill the prisoners, so that none of them would swim out and escape. But the centurion, desiring to save Paul, stopped them from their purpose, and commanded that those who could swim should throw themselves overboard first to go toward the land', 'Acts 27:42-43'],
    ]);
    await G.interact(null, 'Throw yourself overboard');
    await G.fade(1, 0.5); P.disembark(ship.x + 7, ship.z - 6, Math.PI); P.pos.y = -1.2; P.locked = false; G.sound.splash();
    S.deckAll.forEach((n, i) => { G.world.group.add(n.group); n.auto = true; n.fixedY = true; n.setPose('swim'); n.pos.set(ship.x - 12 + i * 3, -1.25, ship.z - 10 - (i % 3) * 4); const tx = beach[0] - 14 + i * 3.4; n.walk([[tx, beach[1] + 9]], 2.1 + (i % 3) * 0.2).then(() => { n.fixedY = false; n.setPose('idle'); return n.walk([[tx * 0.8 + fire[0] * 0.2, beach[1] - 5 - (i % 3) * 2]], 1.6); }).then(() => n.faceTo(fire[0], fire[1])); });
    await G.fade(0, 0.8);
    await G.reach(beach, 6, 'Swim for the shore');
    G.env(makeEnv({ ...ENV.overcast(), rain: 0.6, wind: 1.3, windAngle: -1.45, waveAmp: 1.0, fogDensity: 0.0052 }), 6); G.amb({ sea: 0.3, fire: 0.12 });
    await G.say([
      ['', 'So they all escaped safely to the land.', 'Acts 27:44'],
      ['', 'When we had escaped, then they learned that the island was called Malta. The natives showed us uncommon kindness; for they kindled a fire and received us all, because of the present rain and because of the cold.', 'Acts 28:1-2'],
    ]);
    G.letter(beach[0] + 22, beach[1] - 6, { ref: '2 Corinthians 11:25-27', from: 'to the Corinthians', text: 'Three times I was beaten with rods. Once I was stoned. Three times I suffered shipwreck. I have been a night and a day in the deep. I have been in travels often, perils of rivers, perils of robbers, perils from my countrymen, perils from the Gentiles, perils in the city, perils in the wilderness, perils in the sea, perils among false brothers; in labor and travail, in watchings often, in hunger and thirst, in fastings often, and in cold and nakedness.' });
    G.letter(fire[0] - 20, fire[1] - 22, { ref: 'Romans 8:28', from: 'to the Romans', text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.' });
    for (let i = 0; i < 3; i++) { const s = sticks[i]; await G.interact([s.x, s.z], 'Gather sticks', 2.6, `Gather a bundle of sticks for the fire (${i}/3)`); s.g.visible = false; G.sound.step(); paul.setPose('carry'); P.poseLock = true; }
    await G.interact(fire, 'Lay the sticks on the fire', 3.6, 'Lay the bundle on the fire');
    P.locked = true; paul.setPose('hold'); G.sound.burst(0.8, 'bandpass', 2400, 900, 0.3);
    const viper = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 14, 4.6), new THREE.MeshStandardMaterial({ color: 0x3a3a22, roughness: 0.6 })); viper.position.set(0, -0.3, 0.03); viper.rotation.set(0.6, 0.4, 0); paul.hands[1].add(viper);
    natives.forEach(n => n.faceTo(P.pos.x, P.pos.z));
    await G.say([
      ['', 'But when Paul had gathered a bundle of sticks and laid them on the fire, a viper came out because of the heat, and fastened on his hand.', 'Acts 28:3'],
      ['The islanders', 'No doubt this man is a murderer, whom, though he has escaped from the sea, yet Justice has not allowed to live.', 'Acts 28:4'],
    ]);
    await G.interact(null, 'Shake the creature off into the fire');
    paul.setPose('shake'); await G.wait(G.auto ? 0.1 : 1.1); paul.hands[1].remove(viper); paul.setPose('idle'); P.poseLock = false; G.sound.burst(0.5, 'bandpass', 3000, 1200, 0.25);
    await G.say([
      ['', 'However he shook off the creature into the fire, and wasn’t harmed.', 'Acts 28:5'],
      ['', 'But they expected that he would have swollen or fallen down dead suddenly, but when they watched for a long time and saw nothing bad happen to him, they changed their minds, and said that he was a god.', 'Acts 28:6'],
    ]);
    P.locked = false;
  },
};

export const CHAPTERS_B = [athens, ephesus, jerusalem, malta];
