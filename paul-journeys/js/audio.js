// Procedural sound: wind, rain, sea, thunder, crowds, footsteps and a few musical cues. No audio files.
export class Sound {
  constructor() { this.ctx = null; this.muted = false; this.amb = {}; this.t = 0; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC(); this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(c.destination);
    const len = c.sampleRate * 3, buf = this.noiseBuf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const layer = (type, f, q, type2, f2) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4; const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(b); let last = b; if (type2) { const b2 = c.createBiquadFilter(); b2.type = type2; b2.frequency.value = f2; b.connect(b2); last = b2; } last.connect(g); g.connect(this.master); s.start(); return { f: b, g, v: 0 }; };
    this.amb = { wind: layer('bandpass', 420, 0.7), rain: layer('highpass', 1700, 0.5, 'lowpass', 9000), sea: layer('lowpass', 520, 0.4), crowd: layer('bandpass', 620, 0.9, 'lowpass', 1800), fire: layer('bandpass', 1400, 0.4) };
    // gentle modal pad
    this.pad = c.createGain(); this.pad.gain.value = 0.05; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; this.pad.connect(lp); lp.connect(this.master); this.padT = 0; this.padOn = true;
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.8; }
  set(levels) { this.levels = levels; }
  update(dt) {
    const c = this.ctx; if (!c) return; this.t += dt; const L = this.levels || {};
    for (const k in this.amb) { const a = this.amb[k]; let target = L[k] || 0;
      if (k === 'wind') { target *= 0.75 + 0.25 * Math.sin(this.t * 0.6) + 0.12 * Math.sin(this.t * 1.7); a.f.frequency.value = 330 + 260 * (0.5 + 0.5 * Math.sin(this.t * 0.43)) + (L.wind || 0) * 300; }
      if (k === 'sea') target *= 0.6 + 0.4 * Math.sin(this.t * 0.9);
      if (k === 'crowd') target *= 0.7 + 0.3 * Math.sin(this.t * 2.3) * Math.sin(this.t * 0.7);
      if (k === 'fire') target *= 0.6 + 0.4 * Math.random();
      a.v += (target - a.v) * Math.min(1, dt * 2); a.g.gain.value = Math.max(0, a.v); }
    if (this.padOn && (L.music ?? 1) > 0) { this.padT -= dt; if (this.padT <= 0) { this.padT = 7 + Math.random() * 3; const roots = [146.83, 130.81, 174.61, 196, 110]; const r = roots[Math.floor(Math.random() * roots.length)]; for (const m of [1, 1.5, 2, 2.4, 3]) if (Math.random() < 0.8) this.tone(r * m, 9, 0.5 * (L.music ?? 1), 'sine', this.pad, 3); } }
  }
  tone(freq, dur, vol = 0.2, type = 'sine', dest = null, attack = 0.02) { const c = this.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.05); return o; }
  burst(dur, type, f0, f1, vol, q = 0.7) { const c = this.ctx; if (!c) return; const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const b = c.createBiquadFilter(); b.type = type; b.Q.value = q; const g = c.createGain(), t = c.currentTime; b.frequency.setValueAtTime(f0, t); b.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(b); b.connect(g); g.connect(this.master); s.start(t, Math.random() * 2); s.stop(t + dur + 0.05); }
  thunder(p = 1) { setTimeout(() => { this.burst(0.25, 'highpass', 900, 300, 0.5 * p); this.burst(3.5 + p * 2, 'lowpass', 700, 50, 1.1 * p, 0.3); this.tone(48, 3, 0.35 * p, 'sine'); }, 250 + Math.random() * 900); }
  step(hoof) { hoof ? this.burst(0.09, 'bandpass', 260, 120, 0.3, 2) : this.burst(0.07, 'bandpass', 1100, 500, 0.1, 1.2); }
  chime() { this.tone(880, 1.2, 0.12); setTimeout(() => this.tone(1318.5, 1.6, 0.1), 130); }
  collect() { [659.3, 784, 987.8, 1318.5].forEach((f, i) => setTimeout(() => this.tone(f, 1.4, 0.09), i * 90)); }
  rumble(sec, vol = 1) { this.burst(sec, 'lowpass', 120, 40, 1.4 * vol, 0.5); this.tone(36, sec, 0.5 * vol, 'sawtooth'); }
  crash() { this.burst(1.6, 'lowpass', 2400, 90, 1.2, 0.4); this.burst(0.5, 'bandpass', 900, 200, 0.8, 1.5); }
  splash() { this.burst(0.9, 'bandpass', 1800, 400, 0.5, 0.6); }
  hymn() { const ch = [[220, 277.2, 329.6], [196, 246.9, 329.6], [220, 293.7, 370], [220, 277.2, 329.6, 440]]; ch.forEach((n, i) => setTimeout(() => n.forEach(f => { const o = this.tone(f, 2.6, 0.07, 'triangle', null, 0.5); if (o) o.detune.value = Math.sin(i + f) * 8; }), i * 1400)); }
  glory() { [261.6, 392, 523.3, 659.3, 784, 1046.5].forEach((f, i) => this.tone(f, 9, 0.07, 'sine', null, 0.6 + i * 0.25)); this.burst(6, 'highpass', 5000, 9000, 0.12); }
  roar() { this.burst(2.5, 'bandpass', 500, 800, 0.7, 0.8); }
}
