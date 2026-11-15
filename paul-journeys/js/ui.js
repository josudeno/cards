// HUD, dialogue, cards, minimap and the journey map.
const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---- journey map data (lon, lat) — a hand-drawn approximation of the first-century Mediterranean
const LAND = [[8,44.4],[10.2,43.9],[10.5,42.9],[11.8,42.1],[12.3,41.7],[13.7,41.2],[14.2,40.8],[15.6,40],[15.8,39],[15.65,38],[16.1,37.9],[16.6,38.4],[17.1,39],[16.5,39.7],[17,40.5],[18,40],[18.5,40.1],[18,40.7],[17,41.1],[16,41.5],[15.9,41.9],[15.1,41.9],[14.2,42.5],[13.6,43.5],[12.6,44],[12.3,45.3],[13.6,45.7],[13.6,45],[14.4,45.3],[15.2,44.2],[16.4,43.5],[17.6,42.9],[18.5,42.4],[19.4,41.8],[19.4,40.6],[20,39.7],[20.7,38.9],[21.1,38.3],[21.7,38.2],[21.3,37.6],[21.6,36.8],[22.4,36.5],[22.6,36.8],[23.1,36.5],[23.1,37.3],[22.8,37.6],[23.5,37.4],[23,37.9],[23.6,37.95],[24.05,37.65],[24,38.2],[23.2,38.7],[22.9,39.3],[22.6,40],[22.9,40.6],[23.4,40.25],[23.9,39.95],[24.4,40.15],[23.8,40.75],[24.4,40.95],[25.9,40.85],[26.2,40.6],[26.8,40.6],[26.2,40.05],[26.15,39.75],[26.1,39.5],[26.9,39.5],[26.7,39],[27,38.5],[26.3,38.3],[27.2,37.95],[27.2,37.5],[27.4,37],[28.2,36.7],[29.1,36.6],[29.6,36.2],[30.5,36.3],[30.7,36.85],[31.5,36.6],[32.4,36.1],[33.6,36.15],[34.6,36.75],[35.6,36.6],[36.15,36.6],[35.9,36.1],[35.8,35.5],[35.9,34.5],[35.5,33.9],[35.2,33.3],[35,32.8],[34.9,32.5],[34.7,32],[34.3,31.3],[33,31.1],[32.3,31.3],[31,31.6],[30,31.3],[28,31],[25.2,31.6],[23.2,32.5],[21.6,32.9],[20.1,32.3],[20,31],[19,30.3],[16.5,31.2],[15.2,32.4],[13.2,32.9],[11,33.5],[10.1,34.3],[10.9,35.5],[10.5,36.5],[11.1,37],[10.2,37.2],[8,36.9],[8,29],[41,29],[41,47],[8,47]];
const ISLES = [[[12.4,37.8],[13.3,38.2],[15.6,38.3],[15.2,37],[14.3,36.8],[12.6,37.55]], [[8.2,40.9],[9.7,41.2],[9.7,39.2],[8.9,38.9],[8.4,39.2]], [[8.6,42.6],[9.4,43],[9.5,41.6],[8.8,41.5]], [[23.5,35.5],[24.2,35.55],[26.3,35.3],[26.2,35],[24.7,34.9],[23.5,35.25]], [[32.3,35.05],[32.9,35.4],[34.6,35.7],[33.9,35.1],[34,34.95],[33,34.55],[32.4,34.7]], [[27.8,36.2],[28.25,36.45],[28.1,35.9]], [[14.3,35.85],[14.5,36],[14.55,35.85]], [[25.9,39.1],[26.6,39.35],[26.4,39]], [[23.4,38.9],[24.2,38.6],[24.5,38.1],[23.6,38.6]], [[25.9,38.55],[26.15,38.25],[25.9,38.2]]];
const SEAS = [[[28,41.2],[29.2,41.25],[31.5,41.2],[33.5,42],[35.2,42],[36.5,41.3],[38.5,41],[41,41.5],[41,47],[30,47],[29.7,45],[28.6,44],[27.9,42.8]], [[27,40.4],[27.5,40.95],[28.9,41],[29.4,40.75],[28.8,40.35],[27.5,40.3]]];
export const CITIES = { Jerusalem: [35.22, 31.78], Damascus: [36.3, 33.5], Tarsus: [34.9, 36.92], Antioch: [36.16, 36.2], Seleucia: [35.93, 36.05], Salamis: [33.9, 35.18], Paphos: [32.4, 34.76], Perga: [30.85, 36.96], 'Pisidian Antioch': [31.19, 38.3], Iconium: [32.49, 37.87], Lystra: [32.35, 37.58], Derbe: [33.3, 37.35], Troas: [26.15, 39.75], Neapolis: [24.41, 40.94], Philippi: [24.29, 41.1], Thessalonica: [22.95, 40.64], Berea: [22.2, 40.52], Athens: [23.73, 37.98], Corinth: [22.88, 37.91], Ephesus: [27.34, 37.94], Miletus: [27.28, 37.53], Tyre: [35.2, 33.27], Caesarea: [34.89, 32.5], Antipatris: [34.93, 32.1], Sidon: [35.37, 33.56], Myra: [29.98, 36.25], 'Fair Havens': [24.75, 34.93], Malta: [14.4, 35.9], Syracuse: [15.29, 37.07], Rhegium: [15.65, 38.11], Puteoli: [14.12, 40.82], Rome: [12.5, 41.9] };

export class UI {
  constructor() {
    this.el = {}; for (const id of ['hud', 'chapterTag', 'objective', 'letters', 'minimap', 'compass', 'compassArrow', 'helm', 'helmFill', 'helmText', 'prompt', 'promptText', 'bark', 'dialog', 'dlgWho', 'dlgText', 'dlgRef', 'dlgHint', 'toast', 'title', 'chapters', 'chapterList', 'mapscreen', 'journeyMap', 'mapKicker', 'mapTitle', 'mapRef', 'mapGo', 'card', 'cardKicker', 'cardTitle', 'cardBody', 'cardRef', 'cardGo', 'pause', 'loading', 'fade', 'white', 'blind', 'game']) this.el[id] = $(id);
    this.dlg = null; this.barkT = 0; this.mini = this.el.minimap.getContext('2d'); this.miniBase = null; this.fadeV = 0; this.whiteV = 0;
    this.el.dialog.addEventListener('click', () => this.advance());
  }
  show(id, on = true) { this.el[id].classList.toggle('hidden', !on); }
  setChapter(tag) { this.el.chapterTag.textContent = tag; }
  setObjective(t) { if (this.el.objective.textContent !== (t || '')) this.el.objective.textContent = t || ''; }
  setLetters(n, total) { this.el.letters.textContent = total ? `✉ Letters ${n}/${total}` : ''; }
  setPrompt(label) { this.show('prompt', !!label); if (label) this.el.promptText.textContent = label; document.getElementById('btnE').style.opacity = label ? 1 : 0.35; }
  toast(t) { const e = this.el.toast; e.textContent = t; e.classList.remove('hidden'); e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; }
  bark(who, text, ref, sec = 5) { this.el.bark.innerHTML = (who ? `<b>${esc(who)}</b>` : '') + (ref ? `“${esc(text)}”<i>${esc(ref)}</i>` : `<span style="font-style:italic">${esc(text)}</span>`); this.show('bark'); this.barkT = sec; }
  // dialogue: lines are [who, text, ref]; ref present => verbatim Scripture
  say(lines) { return new Promise((res) => { this.dlg = { lines: lines.slice(), i: -1, shown: 0, res, text: '' }; this.show('dialog'); this.next(); }); }
  next() { const d = this.dlg; d.i++; if (d.i >= d.lines.length) { this.show('dialog', false); this.dlg = null; d.res(); return; }
    const [who, text, ref] = d.lines[d.i]; d.text = ref ? `“${text}”` : text; d.shown = 0; d.cool = 0.25;
    this.el.dlgWho.textContent = who || (ref ? '' : ''); this.el.dlgText.classList.toggle('narr', !who); this.el.dlgRef.textContent = ref ? ref + ' · WEB' : ''; this.el.dlgText.textContent = ''; }
  advance() { const d = this.dlg; if (!d || d.cool > 0) return false; if (d.shown < d.text.length) { d.shown = d.text.length; this.el.dlgText.textContent = d.text; d.cool = 0.15; } else this.next(); return true; }
  cancelDialog() { if (this.dlg) { this.dlg = null; this.show('dialog', false); } this.show('bark', false); this.setPrompt(null); }
  update(dt) {
    const d = this.dlg; if (d) { d.cool -= dt; if (d.shown < d.text.length) { d.shown = Math.min(d.text.length, d.shown + dt * 55); this.el.dlgText.textContent = d.text.slice(0, Math.floor(d.shown)); } }
    if (this.barkT > 0) { this.barkT -= dt; if (this.barkT <= 0) this.show('bark', false); }
  }
  setFade(v) { if (v !== this.fadeV) { this.fadeV = v; this.el.fade.style.opacity = v; } }
  setWhite(v) { if (v !== this.whiteV) { this.whiteV = v; this.el.white.style.opacity = v; } }
  setBlind(v) { this.el.blind.style.opacity = v; this.el.game.style.filter = v > 0 ? `blur(${(v * 7).toFixed(1)}px) brightness(${(1 - v * 0.35).toFixed(2)})` : ''; }
  setCompass(angle) { this.show('compass', angle !== null); if (angle !== null) this.el.compassArrow.style.transform = `rotate(${angle}rad)`; }
  setHelm(throttle, text) { this.show('helm', throttle !== null); if (throttle !== null) { this.el.helmFill.style.width = (throttle * 100) + '%'; this.el.helmText.textContent = text; } }
  card({ kicker = '', title = '', body = '', ref = '', button = 'Continue' }) { return new Promise((res) => { const e = this.el; e.cardKicker.textContent = kicker; e.cardTitle.textContent = title; e.cardBody.innerHTML = body; e.cardRef.textContent = ref; e.cardGo.textContent = button; this.show('card'); this.cardRes = () => { this.show('card', false); this.cardRes = null; res(); }; e.cardGo.onclick = this.cardRes; }); }

  // ---- minimap
  buildMinimap(world) {
    const N = 256, R = world.mapR || world.bounds, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), img = g.createImageData(N, N);
    const wl = world.waterLevel; this.miniR = R; this.miniC = [world.cx || 0, world.cz || 0];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = this.miniC[0] + (i / N * 2 - 1) * R, z = this.miniC[1] + (j / N * 2 - 1) * R, h = world.terrainFn(x, z), k = (j * N + i) * 4;
      let col = [150, 138, 104]; if (wl !== null && h < wl) col = [44, 84, 110]; else if (world.roadDist(x, z) < 0) col = [196, 182, 146]; else { const s = Math.max(-18, Math.min(26, h * 2.2)); col = [132 + s, 124 + s, 92 + s * 0.7]; }
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0); g.fillStyle = '#5c4e3a';
    for (const b of world.colliders) { if (b.r !== undefined || b.h < 2) continue; g.save(); g.translate((b.x - this.miniC[0]) / R * N / 2 + N / 2, (b.z - this.miniC[1]) / R * N / 2 + N / 2); g.rotate(-b.rot); g.fillRect(-b.hw / R * N / 2, -b.hd / R * N / 2, b.hw / R * N, b.hd / R * N); g.restore(); }
    this.miniBase = c;
  }
  drawMinimap(px, pz, camYaw, playerYaw, target, dots) {
    const g = this.mini, S = 360, N = 256, R = this.miniR, view = 70; if (!this.miniBase) return;
    g.save(); g.clearRect(0, 0, S, S); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.clip(); g.fillStyle = '#2c546e'; g.fillRect(0, 0, S, S);
    g.translate(S / 2, S / 2); g.rotate(camYaw); const sc = (S / 2) / view; g.scale(sc, sc); g.translate(-px, -pz);
    const w = 2 * R; g.imageSmoothingEnabled = true; g.drawImage(this.miniBase, this.miniC[0] - R, this.miniC[1] - R, w, w);
    for (const d of dots) { g.fillStyle = d.c; g.beginPath(); g.arc(d.x, d.z, 1.6, 0, 7); g.fill(); }
    g.restore(); g.save(); g.translate(S / 2, S / 2);
    if (target) { let dx = target.x - px, dz = target.z - pz; const c = Math.cos(camYaw), s = Math.sin(camYaw); let rx = (dx * c - dz * s) * sc, rz = (dx * s + dz * c) * sc; const d = Math.hypot(rx, rz), m = S / 2 - 16; if (d > m) { rx *= m / d; rz *= m / d; }
      g.fillStyle = '#ffd76a'; g.strokeStyle = '#3a2a10'; g.lineWidth = 3; g.beginPath(); g.moveTo(rx, rz - 11); g.lineTo(rx + 9, rz); g.lineTo(rx, rz + 11); g.lineTo(rx - 9, rz); g.closePath(); g.stroke(); g.fill(); }
    g.rotate(camYaw - playerYaw + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#201810'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath(); g.stroke(); g.fill(); g.restore();
    g.fillStyle = '#e3c27a'; g.font = '700 22px Georgia'; g.textAlign = 'center';
    g.fillText('N', S / 2 + Math.sin(camYaw) * (S / 2 - 18), S / 2 - Math.cos(camYaw) * (S / 2 - 18) + 8);
  }

  // ---- journey map: draws coast, cities, earlier routes faintly and the current route animated
  journey({ kicker, title, ref, route, past = [] }) {
    return new Promise((res) => {
      const cv = this.el.journeyMap, g = cv.getContext('2d'), W = cv.width, H = cv.height;
      const P = ([lon, lat]) => [(lon - 9.5) / (38.5 - 9.5) * W, (44.3 - lat) / (44.3 - 29.8) * H * 0.93];
      const poly = (pts) => { g.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
      const pathPts = (names) => names.map(n => P(CITIES[n]));
      const base = document.createElement('canvas'); base.width = W; base.height = H; const bg = base.getContext('2d');
      const draw0 = () => { const G = g; const sea = G.createLinearGradient(0, 0, 0, H); sea.addColorStop(0, '#2b4a5c'); sea.addColorStop(1, '#1c3444'); G.fillStyle = sea; G.fillRect(0, 0, W, H);
        G.fillStyle = '#c9b68a'; G.strokeStyle = '#7a6844'; G.lineWidth = 2; G.lineJoin = 'round'; poly(LAND); G.fill(); G.stroke(); for (const i of ISLES) { poly(i); G.fill(); G.stroke(); }
        G.fillStyle = '#284656'; for (const s of SEAS) { poly(s); G.fill(); G.stroke(); }
        G.fillStyle = 'rgba(60,44,20,.5)'; G.font = 'italic 26px Georgia'; G.textAlign = 'center';
        for (const [t, lon, lat] of [['ASIA', 30.2, 38.9], ['MACEDONIA', 22.6, 41.6], ['ACHAIA', 21.4, 39.2], ['ITALY', 13.4, 42.9], ['SYRIA', 37.6, 35.2], ['JUDEA', 36.6, 31.3], ['GALATIA', 33.6, 39.4], ['CILICIA', 34.2, 37.6], ['EGYPT', 30.5, 30.4], ['CYPRUS', 33.2, 34.25], ['CRETE', 24.9, 34.55]]) { const [x, y] = P([lon, lat]); G.fillText(t, x, y); }
        G.fillStyle = 'rgba(200,220,230,.35)'; G.font = 'italic 30px Georgia'; { const [x, y] = P([19.5, 34.6]); G.fillText('The Great Sea', x, y); } };
      draw0(); bg.drawImage(cv, 0, 0);
      const line = (pts, upto, color, width, dash) => { g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash || []); g.lineCap = 'round'; g.beginPath(); let total = 0; const L = []; for (let i = 1; i < pts.length; i++) { L.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); total += L[i - 1]; } let d = upto * total; g.moveTo(pts[0][0], pts[0][1]); let head = pts[0];
        for (let i = 1; i < pts.length && d > 0; i++) { const k = Math.min(1, d / L[i - 1]); head = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; g.lineTo(head[0], head[1]); d -= L[i - 1]; } g.stroke(); g.setLineDash([]); return head; };
      const label = (n, bright) => { const [x, y] = P(CITIES[n]); g.fillStyle = bright ? '#fff4d0' : 'rgba(60,40,16,.8)'; g.beginPath(); g.arc(x, y, bright ? 6 : 3.5, 0, 7); g.fill(); if (bright) { g.strokeStyle = '#5a2a14'; g.lineWidth = 2; g.stroke(); g.font = '20px Georgia'; g.textAlign = 'left'; g.lineWidth = 4; g.strokeStyle = 'rgba(30,20,8,.85)'; g.strokeText(n, x + 10, y - 8); g.fillStyle = '#fff4d0'; g.fillText(n, x + 10, y - 8); } };
      this.el.mapKicker.textContent = kicker; this.el.mapTitle.textContent = title; this.el.mapRef.textContent = ref; this.show('mapscreen');
      const t0 = performance.now(); let done = false;
      const frame = () => { if (done) return; const t = Math.min(1, (performance.now() - t0) / 3800); g.drawImage(base, 0, 0);
        for (const r of past) line(pathPts(r), 1, 'rgba(110,60,30,.45)', 3, [3, 9]);
        for (const n in CITIES) if (!route.includes(n)) label(n, false);
        const head = line(pathPts(route), t * t * (3 - 2 * t), '#a8281c', 5, [14, 10]); route.forEach((n, i) => { if (i / Math.max(1, route.length - 1) <= t + 0.01) label(n, true); });
        g.fillStyle = '#ffd76a'; g.beginPath(); g.arc(head[0], head[1], 8 + Math.sin(performance.now() / 200) * 2, 0, 7); g.fill();
        requestAnimationFrame(frame); };
      frame();
      this.mapRes = () => { done = true; this.show('mapscreen', false); this.mapRes = null; res(); }; this.el.mapGo.onclick = this.mapRes;
    });
  }
}
