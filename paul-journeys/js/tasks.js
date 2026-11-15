// Side tasks and rewards: greetings, landmarks, deeds, crowns, ranks and mantles.
import * as THREE from 'three';
import { look } from './common.js';

// Paul's own greetings and blessings, spoken when the player greets someone
export const GREETINGS = [
  ['Grace to you and peace from God our Father and the Lord Jesus Christ.', '1 Corinthians 1:3'],
  ['Now may the Lord of peace himself give you peace at all times in all ways. The Lord be with you all.', '2 Thessalonians 3:16'],
  ['Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope, in the power of the Holy Spirit.', 'Romans 15:13'],
  ['Peace be to the brothers, and love with faith, from God the Father and the Lord Jesus Christ.', 'Ephesians 6:23'],
  ['The grace of our Lord Jesus Christ be with you. Amen.', '1 Thessalonians 5:28'],
  ['The grace of the Lord Jesus Christ, God’s love, and the fellowship of the Holy Spirit be with you all. Amen.', '2 Corinthians 13:14'],
  ['Watch! Stand firm in the faith! Be courageous! Be strong!', '1 Corinthians 16:13'],
  ['Let all that you do be done in love.', '1 Corinthians 16:14'],
  ['Let’s not be weary in doing good, for we will reap in due season, if we don’t give up.', 'Galatians 6:9'],
  ['Don’t be overcome by evil, but overcome evil with good.', 'Romans 12:21'],
];
export const RANKS = [[0, 'Traveller'], [200, 'Witness'], [500, 'Herald'], [900, 'Ambassador'], [1400, 'Finisher of the Course']];
export const MANTLES = [
  { id: 'brown', name: 'Traveller’s brown', color: 0x7c4630, xp: 0 }, { id: 'blue', name: 'Sea blue', color: 0x3f5f86, xp: 200 },
  { id: 'olive', name: 'Olive green', color: 0x66703c, xp: 500 }, { id: 'purple', name: 'Lydia’s purple', color: 0x6a2a7a, xp: 900 }, { id: 'wool', name: 'Undyed wool', color: 0xe2dac4, xp: 1400 },
];
export const XP = { story: 100, letter: 25, greet: 10, landmark: 20, deed: 40, crown: 50 };
export const rankOf = (xp) => { let r = 0; RANKS.forEach(([need], i) => { if (xp >= need) r = i; }); return r; };

// per chapter: how many people to greet, landmarks [name, x, z, radius, note], deeds [id, text]
export const SIDE = [
  { greet: 4, landmarks: [['The gate of Damascus', 0, -80, 7, 'They led him by the hand, and brought him into Damascus. — Acts 9:8'], ['The street called Straight', 0, -186, 7, 'Arise, and go to the street which is called Straight… — Acts 9:11'], ['The city wall', -66, -140, 7, '…his disciples took him by night and let him down through the wall, lowering him in a basket. — Acts 9:25']] },
  { greet: 4, landmarks: [['The synagogue of Salamis', 40, -22, 11, '…they proclaimed God’s word in the Jewish synagogues. — Acts 13:5'], ['The market of Salamis', 60, -20, 7, 'A harbour town on the eastern shore of Cyprus.'], ['The heart of the island', -50, -30, 9, '…they had gone through the island to Paphos… — Acts 13:6']], deeds: [['fairwind', 'Catch the fair wind: reach Salamis within 60 seconds of setting sail']] },
  { greet: 5, landmarks: [['The temple of Jupiter', 36, -4, 15, 'The priest of Jupiter, whose temple was in front of their city… — Acts 14:13'], ['The altar before the gates', 20, -4, 5, '…brought oxen and garlands to the gates… — Acts 14:13'], ['The north quarter of Lystra', 0, -130, 9, 'The home of a young disciple named Timothy (Acts 16:1).']] },
  { greet: 4, landmarks: [['The forum of Philippi', 0, -104, 8, '…dragged them into the marketplace before the rulers. — Acts 16:19'], ['The far bank of the river', 0, 104, 14, '…outside of the city by a riverside… — Acts 16:13'], ['The city gate', 0, -32, 6, '…a city of Macedonia, the foremost of the district, a Roman colony. — Acts 16:12']] },
  { greet: 5, landmarks: [['The temple above the market', -64, -8, 17, '…doesn’t dwell in temples made with hands. — Acts 17:24'], ['The colonnade of the philosophers', 48, 20, 8, '…in the marketplace every day with those who met him. — Acts 17:17'], ['The Acropolis', 78, 196, 26, '…his spirit was provoked within him as he saw the city full of idols. — Acts 17:16']] },
  { greet: 4, landmarks: [['The harbour of Ephesus', 0, 186, 7, 'The gateway of the province of Asia.'], ['The temple of Artemis', 150, 60, 34, '…the temple of the great goddess Artemis will be counted as nothing… — Acts 19:27']], deeds: [['tent', 'Work with your own hands at the tentmaker’s bench'], ['give', 'Give what you have earned to one in need']],
    setup(G, W) {
      const y = W.terrainFn(10.8, 128); W.box(10.8, y, 128, 1.3, 0.85, 2.6, 0x7a5c3c); W.addBox(10.8, 128, 0.65, 1.3, 0, y + 1); W.box(10.8, y + 0.85, 128, 1.2, 0.05, 2.4, 0xc8b48c); W.box(11.6, y, 130.2, 0.5, 1.1, 0.5, 0xb8a888);
      const t = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.7, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0x6a5a48, side: THREE.DoubleSide, roughness: 1 })); t.position.set(11.4, y + 0.85, 123.6); t.rotation.y = Math.PI / 4; t.castShadow = true; W.group.add(t); W.addCircle(11.4, 123.6, 1.1, y + 2);
      const poor = G.spawn(look(990, 'man', { robe: 0x6a6052, long: false, cloak: null, head: 'bare', beard: true, hair: 0x8a867e }), -10.6, 70, Math.PI / 2, 'One in need'); poor.setPose('sit'); poor.greetable = false;
      let work = 0, paid = false;
      G.spot({ x: 9.7, z: 128, r: 2.2, label: () => `Work at the tentmaker’s bench (${work}/3)`, active: () => work < 3, async use() { const P = G.player; P.locked = true; P.yaw = Math.PI / 2; P.poseLock = true; G.paul.setPose('work'); G.sound.step(); await G.wait(2.6); G.paul.setPose('idle'); P.poseLock = false; P.locked = false; work++;
        if (work === 3) { G.deed('tent'); G.bark('Paul', 'You yourselves know that these hands served my necessities, and those who were with me.', 'Acts 20:34', 7); } } });
      G.spot({ x: -9.4, z: 70, r: 2.6, label: () => 'Give what you have earned', active: () => work >= 3 && !paid, async use() { paid = true; poor.setPose('raise'); G.deed('give'); G.bark('Paul', 'It is more blessed to give than to receive.', 'Acts 20:35', 7); await G.wait(2.5); poor.setPose('sit'); } });
    } },
  { greet: 0, landmarks: [], deeds: [['swift', 'Keep pace with the escort: reach Antipatris within 110 seconds of mounting']] },
  { greet: 3, landmarks: [] },
];
