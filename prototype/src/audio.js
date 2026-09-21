// Everything is synthesised at runtime - no sound files, so the whole game
// stays in one HTML file. Audio is half of perceived realism.
const SURFACES = {
  grass:    { freq: 620,  gain: 0.12, dur: 0.055 },
  concrete: { freq: 1900, gain: 0.20, dur: 0.05 },
  wood:     { freq: 1100, gain: 0.18, dur: 0.06 },
  tile:     { freq: 2400, gain: 0.19, dur: 0.045 },
  gravel:   { freq: 1500, gain: 0.17, dur: 0.07 },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this._vol = 0.7;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const c = this.ctx;

    this.master = c.createGain();
    this.master.gain.value = this._vol;
    this.muffle = c.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 20000;
    this.master.connect(this.muffle).connect(c.destination);

    this.ringing = c.createOscillator();
    this.ringing.type = 'sine';
    this.ringing.frequency.value = 3400;
    this.ringGain = c.createGain();
    this.ringGain.gain.value = 0;
    this.ringing.connect(this.ringGain).connect(c.destination);
    this.ringing.start();

    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    this.startAmbient();
  }

  resume() { this.init(); if (this.ctx.state === 'suspended') this.ctx.resume(); this.setVolume(this._vol); }
  setVolume(v) {
    this._vol = v == null ? 0.7 : v;
    if (this.master) this.master.gain.value = this._vol;
  }

  // Wind, always there, so silence never sounds like the game has crashed.
  startAmbient() {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 340; f.Q.value = 0.4;
    const g = c.createGain(); g.gain.value = 0.035;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    // a slow swell so it does not sit perfectly still
    const lfo = c.createOscillator(); lfo.frequency.value = 0.08;
    const lfoGain = c.createGain(); lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain).connect(g.gain); lfo.start();
    this.ambientGain = g;
  }

  // ------------------------------------------------------------- helpers ---
  chain(pan) {
    if (pan == null || !this.ctx.createStereoPanner) return this.master;
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(this.master);
    return p;
  }

  burst({ dur = 0.25, freq = 1200, q = 0.7, type = 'lowpass', gain = 1, delay = 0, pan = null }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const out = this.chain(pan);
    src.connect(f).connect(g).connect(out);
    src.start(t); src.stop(t + dur + 0.05);
    // Tear the nodes down when the sound ends. Without this every panned shot
    // leaves a live node in the graph and the audio degrades over a session.
    src.onended = () => { try { g.disconnect(); f.disconnect(); if (out !== this.master) out.disconnect(); } catch {} };
  }

  tone({ f0 = 120, f1 = 40, dur = 0.12, gain = 0.5, delay = 0, type = 'sine', pan = null }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const out = this.chain(pan);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.02);
    o.onended = () => { try { g.disconnect(); if (out !== this.master) out.disconnect(); } catch {} };
  }

  // --------------------------------------------------------------- shots ---
  gunshot(s) {
    if (!this.ctx) return;
    const v = s || { crack: 4200, body: 900, thump: 160, gain: 0.85 };
    const g = v.gain;
    this.burst({ dur: 0.09, freq: v.crack, type: 'bandpass', q: 0.4, gain: 0.85 * g });
    this.burst({ dur: 0.30, freq: v.body, type: 'lowpass', gain: 0.55 * g });
    this.tone({ f0: v.thump, f1: 45, dur: 0.14, gain: 0.5 * g });
    this.burst({ dur: 0.9, freq: 700, type: 'lowpass', gain: 0.12 * g, delay: 0.04 });
    this.deafen(0.5 * g);
  }

  // Someone else firing. Panned to their side and delayed by the distance, so
  // you can tell roughly where it came from.
  gunshotAt(from, to, voice, pan = null) {
    if (!this.ctx) return;
    const v = voice || { crack: 2600, body: 800, gain: 1 };
    const dist = Math.hypot(from.x - to.x, from.z - to.z);
    const atten = Math.max(0.04, 1 - dist / 60) * (v.gain ?? 1);
    const delay = Math.min(0.35, dist / 343);
    this.burst({ dur: 0.10, freq: v.crack * 0.6 * atten + 500, type: 'bandpass', q: 0.5, gain: 0.5 * atten, delay, pan });
    this.burst({ dur: 0.45, freq: 400 + v.body * 0.45 * atten, type: 'lowpass', gain: 0.4 * atten, delay, pan });
    this.tone({ f0: 120, f1: 40, dur: 0.2, gain: 0.3 * atten, delay, pan });
  }

  // A round going past your head. The single best cue that you are being shot at.
  whizz(closeness, pan = null) {
    if (!this.ctx) return;
    const g = 0.10 + closeness * 0.28;
    this.burst({ dur: 0.045, freq: 1800 + closeness * 2600, type: 'bandpass', q: 6, gain: g, pan });
    this.tone({ f0: 900 + closeness * 700, f1: 260, dur: 0.07, gain: g * 0.5, type: 'sawtooth', pan });
  }

  // Loud noise close by: the world goes muffled and your ears sing.
  deafen(amount) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    this.muffle.frequency.cancelScheduledValues(t);
    this.muffle.frequency.setValueAtTime(700, t);
    this.muffle.frequency.exponentialRampToValueAtTime(20000, t + 1.6 * amount + 0.4);
    this.ringGain.gain.cancelScheduledValues(t);
    this.ringGain.gain.setValueAtTime(0.011 * amount, t);
    this.ringGain.gain.exponentialRampToValueAtTime(0.00001, t + 2.4 * amount + 0.5);
  }

  // --------------------------------------------------------------- other ---
  step(surface = 'grass', hard = false) {
    const s = SURFACES[surface] || SURFACES.grass;
    this.burst({
      dur: s.dur * (hard ? 1.3 : 1),
      freq: s.freq * (0.85 + Math.random() * 0.3),
      type: 'lowpass',
      gain: s.gain * (hard ? 1.6 : 1),
    });
  }

  dryFire() { this.burst({ dur: 0.03, freq: 3000, type: 'bandpass', q: 2, gain: 0.35 }); }
  flesh() { this.burst({ dur: 0.12, freq: 380, type: 'lowpass', gain: 0.5 }); }

  bodyfall(pan = null) {
    this.burst({ dur: 0.22, freq: 260, type: 'lowpass', gain: 0.4, delay: 0.25, pan });
    this.tone({ f0: 90, f1: 40, dur: 0.24, gain: 0.3, delay: 0.26, pan });
  }

  // Someone has seen you. Not words, but unmistakably a person shouting.
  alert(pan = null) {
    const f = 240 + Math.random() * 120;
    this.tone({ f0: f, f1: f * 1.5, dur: 0.16, gain: 0.30, type: 'sawtooth', pan });
    this.tone({ f0: f * 1.5, f1: f * 0.8, dur: 0.22, gain: 0.24, type: 'sawtooth', delay: 0.17, pan });
    this.burst({ dur: 0.3, freq: 900, type: 'bandpass', q: 1.2, gain: 0.08, pan });
  }

  heartbeat(strength = 1) {
    this.tone({ f0: 62, f1: 30, dur: 0.14, gain: 0.26 * strength });
    this.tone({ f0: 52, f1: 26, dur: 0.17, gain: 0.19 * strength, delay: 0.19 });
  }

  breath() {
    this.burst({ dur: 0.34, freq: 520, type: 'bandpass', q: 0.8, gain: 0.10 });
  }

  hurt() {
    this.burst({ dur: 0.2, freq: 300, type: 'lowpass', gain: 0.7 });
    this.deafen(0.8);
  }

  swap() {
    this.burst({ dur: 0.05, freq: 1800, type: 'bandpass', q: 2, gain: 0.25 });
    this.burst({ dur: 0.05, freq: 2600, type: 'bandpass', q: 3, gain: 0.22, delay: 0.16 });
  }

  pickup() {
    this.tone({ f0: 520, f1: 760, dur: 0.1, gain: 0.22, type: 'triangle' });
    this.burst({ dur: 0.06, freq: 2200, type: 'bandpass', q: 2, gain: 0.2, delay: 0.05 });
  }

  reload(duration = 2.8) {
    const at = f => duration * f;
    this.burst({ dur: 0.05, freq: 2600, type: 'bandpass', q: 3, gain: 0.3, delay: at(0.03) });
    this.burst({ dur: 0.06, freq: 1800, type: 'bandpass', q: 2, gain: 0.3, delay: at(0.32) });
    this.burst({ dur: 0.05, freq: 3200, type: 'bandpass', q: 3, gain: 0.35, delay: at(0.68) });
    this.burst({ dur: 0.07, freq: 2200, type: 'bandpass', q: 2, gain: 0.4, delay: at(0.88) });
  }

  // Distant artillery, occasionally, to place the fight in a bigger war.
  distantThump() {
    const pan = (Math.random() - 0.5) * 1.6;
    this.tone({ f0: 55, f1: 24, dur: 0.9, gain: 0.30, pan });
    this.burst({ dur: 1.4, freq: 170, type: 'lowpass', gain: 0.13, delay: 0.02, pan });
  }
}
