// Everything is synthesised at runtime - no sound files, so the whole game
// stays in one HTML file. Audio is half of perceived realism (REALISM.md).
export class Audio {
  constructor() {
    this.ctx = null;
    this.ringing = null;
    this.ringGain = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const c = this.ctx;

    this.master = c.createGain();
    this.master.gain.value = this._vol == null ? 0.7 : this._vol;
    // Muffling after a loud noise close by.
    this.muffle = c.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 20000;
    this.master.connect(this.muffle).connect(c.destination);

    // The tinnitus tone, always running, usually silent.
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
  }

  resume() { this.init(); if (this.ctx.state === 'suspended') this.ctx.resume(); this.setVolume(this._vol); }

  setVolume(v) {
    this._vol = v == null ? 0.7 : v;
    if (this.master) this.master.gain.value = this._vol;
  }

  burst({ dur = 0.25, freq = 1200, q = 0.7, type = 'lowpass', gain = 1, delay = 0 }) {
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
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  tone({ f0 = 120, f1 = 40, dur = 0.12, gain = 0.5, delay = 0, type = 'sine' }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  gunshot() {
    if (!this.ctx) return;
    this.burst({ dur: 0.09, freq: 4200, type: 'bandpass', q: 0.4, gain: 0.85 }); // crack
    this.burst({ dur: 0.30, freq: 900, type: 'lowpass', gain: 0.55 });           // body
    this.tone({ f0: 160, f1: 45, dur: 0.14, gain: 0.5 });                        // thump
    this.burst({ dur: 0.9, freq: 700, type: 'lowpass', gain: 0.12, delay: 0.04 }); // tail
    this.deafen(0.55);
  }

  // A shot from somewhere else on the map: quieter, duller, arrives late.
  gunshotAt(from, to) {
    if (!this.ctx) return;
    const dx = from.x - to.x, dz = from.z - to.z;
    const dist = Math.hypot(dx, dz);
    const atten = Math.max(0.04, 1 - dist / 60);
    const delay = Math.min(0.35, dist / 343);
    this.burst({ dur: 0.10, freq: 2600 * atten + 500, type: 'bandpass', q: 0.5, gain: 0.5 * atten, delay });
    this.burst({ dur: 0.45, freq: 400 + 400 * atten, type: 'lowpass', gain: 0.4 * atten, delay });
    this.tone({ f0: 120, f1: 40, dur: 0.2, gain: 0.3 * atten, delay });
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

  step(hard) {
    this.burst({ dur: hard ? 0.07 : 0.05, freq: hard ? 1800 : 700, type: 'lowpass', gain: hard ? 0.20 : 0.13 });
  }
  dryFire() { this.burst({ dur: 0.03, freq: 3000, type: 'bandpass', q: 2, gain: 0.35 }); }
  flesh() { this.burst({ dur: 0.12, freq: 380, type: 'lowpass', gain: 0.5 }); }
  hurt() {
    this.burst({ dur: 0.2, freq: 300, type: 'lowpass', gain: 0.7 });
    this.deafen(0.8);
  }
  reload() {
    this.burst({ dur: 0.05, freq: 2600, type: 'bandpass', q: 3, gain: 0.3, delay: 0.05 });
    this.burst({ dur: 0.06, freq: 1800, type: 'bandpass', q: 2, gain: 0.3, delay: 0.9 });
    this.burst({ dur: 0.05, freq: 3200, type: 'bandpass', q: 3, gain: 0.35, delay: 1.9 });
    this.burst({ dur: 0.07, freq: 2200, type: 'bandpass', q: 2, gain: 0.4, delay: 2.45 });
  }
}
