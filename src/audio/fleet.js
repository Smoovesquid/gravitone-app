/**
 * @fileoverview Audio for Alien Visitation — warp in, absorb, rebuild, depart.
 */

/** Dramatic warp-in whoosh. */
export function playWarpIn(audio) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(55, now);
  osc.frequency.exponentialRampToValueAtTime(720, now + 0.6);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.14);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.92);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 1.0);
}

/**
 * Descending consumption tone — a well is being absorbed.
 * Pitch falls from well's frequency down to a low rumble.
 * @param {Object} audio
 * @param {number} freq  the well's frequency
 */
export function playAbsorb(audio, freq) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;

  // Falling sweep
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 0.9);
  gain.gain.setValueAtTime(0.0, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 1.1);

  // Brief noise crunch at absorption moment
  const bufLen = Math.floor(ctx.sampleRate * 0.12);
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  const noise  = ctx.createBufferSource();
  const nGain  = ctx.createGain();
  nGain.gain.setValueAtTime(0.06, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.buffer = buf;
  noise.connect(nGain); nGain.connect(master);
  noise.start(now); noise.stop(now + 0.14);
}

/**
 * Ascending materialisation tone — a new well is being placed.
 * Pitch rises to the new frequency, like something coming into existence.
 * @param {Object} audio
 * @param {number} freq  the new well's target frequency
 */
export function playBuild(audio, freq) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;

  // Rising sweep to target pitch
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(28, now);
  osc.frequency.exponentialRampToValueAtTime(freq, now + 0.5);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.13, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 1.2);

  // Shimmer — high harmonic
  const osc2  = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.value = freq * 3;
  gain2.gain.setValueAtTime(0, now + 0.4);
  gain2.gain.linearRampToValueAtTime(0.045, now + 0.55);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  osc2.connect(gain2); gain2.connect(master);
  osc2.start(now + 0.4); osc2.stop(now + 1.3);
}

/**
 * Genre-specific rhythmic pulse (used if self-pulse system is active).
 */
export function playGenrePulse(audio, freq, genre, pan = 0) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const cfgs = {
    trap:    { type: 'sawtooth', gain: 0.065, attack: 0.004, decay: 0.16 },
    lofi:    { type: 'triangle', gain: 0.055, attack: 0.055, decay: 0.60 },
    house:   { type: 'sine',     gain: 0.075, attack: 0.007, decay: 0.22 },
    boombap: { type: 'triangle', gain: 0.060, attack: 0.014, decay: 0.34 },
    techno:  { type: 'sawtooth', gain: 0.060, attack: 0.003, decay: 0.10 },
  };
  const cfg    = cfgs[genre] || cfgs.house;
  const osc    = ctx.createOscillator();
  const gain   = ctx.createGain();
  const panner = ctx.createStereoPanner();
  osc.type = cfg.type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(cfg.gain, now + cfg.attack);
  gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.decay);
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  osc.connect(gain); gain.connect(panner); panner.connect(master);
  osc.start(now); osc.stop(now + cfg.decay + 0.05);
}
