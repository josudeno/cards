// Helpers shared by the chapter scripts.
import { Rand } from './world.js';
import { personLook } from './characters.js';

export const dist = (a, b) => Math.hypot((a.x ?? a[0]) - (b.x ?? b[0]), (a.z ?? a[1]) - (b.z ?? b[1]));
export const look = (seed, kind = 'man', over = {}) => Object.assign(personLook(Rand(seed), kind), over);
export const q = (text, ref) => `<q>${text}</q> <em>${ref}</em>`;

// An NPC leads the player along waypoints, waiting whenever the player falls behind.
export async function lead(G, npc, pts, speed = 2, leash = 7) {
  if (G.auto) { const l = pts[pts.length - 1]; npc.place(l[0], l[1]); G.warp(l); await G.wait(0.1); return; }
  const P = G.player;
  for (const pt of pts) {
    for (;;) {
      if (dist(npc.pos, P.pos) > leash) { npc.stop(); npc.faceTo(P.pos.x, P.pos.z); await G.until(() => dist(npc.pos, P.pos) < leash * 0.55); }
      let arrived = false; npc.walk([pt], speed).then(() => { arrived = true; });
      await G.until(() => arrived || dist(npc.pos, P.pos) > leash);
      if (arrived && dist(npc.pos, pt) < 0.6) break;
    }
  }
}
// scatter a few townspeople who stand about or stroll between points
export function townsfolk(G, spots, seed = 1, kind = 'man') {
  const r = Rand(seed), out = [];
  spots.forEach((s, i) => {
    const p = G.spawn(look(seed * 31 + i, s[3] || (r() < 0.3 ? 'woman' : kind)), s[0], s[1], r() * 6.28);
    if (s[2]) { const a = [s[0], s[1]], b = s[2]; const loop = () => p.walk([b], r.range(1.0, 1.5)).then(() => p.walk([a], r.range(1.0, 1.5))).then(loop); setTimeout(loop, r() * 3000); }
    out.push(p);
  });
  return out;
}
export const follow = (npc, target, d, side = 0, max = 7) => { npc.follow = { target, dist: d, side, max, slack: 0.8 }; return npc; };
