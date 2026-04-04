/**
 * @fileoverview Audio for Alien Visitation mode.
 * Warp arrival, session start chord, genre pulses from taught wells,
 * teaching resonance tone.  No combat sounds.
 */

/** Dramatic warp-in whoosh — ship materialises from hyperspace. */
export function playWarpIn(audio) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(60, now);
  osc.frequency.exponentialRampToValueAtTime(680, now + 0.55);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.95);
}

/**
 * Soft rising chord when a session begins — "let's play together".
 * Three sine partials spread across the genre's color.
 * @param {Object} audio
 * @param {string} rgb   e.g. '255,34,68' — ignored for audio, kept for future tint
 */
export function playSessionStart(audio, rgb) {  // eslint-disable-line no-unused-vars
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  [220, 330, 440].forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = now + i * 0.09;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + 1.3);
  });
}

/**
 * Resonant bell-tone when a visitor permanently teaches a well.
 * A pure sine with a long decay — like a tuning fork finding its note.
 * @param {Object} audio
 * @param {number} freq  the well's frequency
 */
export function playTeachWell(audio, freq) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;

  // Fundamental
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 2.4);

  // Octave shimmer
  const osc2  = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2;
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.05, now + 0.03);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  osc2.connect(gain2); gain2.connect(master);
  osc2.start(now); osc2.stop(now + 1.5);
}

/**
 * Genre-specific rhythmic pulse from a self-pulsing well.
 * Each genre has a distinct waveform and envelope so zones sound different.
 * @param {Object} audio
 * @param {number} freq   well's current frequency
 * @param {string} genre  genre key
 * @param {number} pan    stereo position -1..1
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
  const cfg = cfgs[genre] || cfgs.house;
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
