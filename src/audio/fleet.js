/**
 * @fileoverview Battle audio effects for Fleet Battle mode.
 * Missile fire, ship explosions, well capture sounds, genre pulses, victory fanfare.
 */

/** Quick rising chirp when a ship fires a missile. */
export function playMissileFire(audio) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(250, now + 0.18);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.25);
}

/** Low boom + noise burst when a ship is destroyed. */
export function playExplosion(audio) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const oBoom = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 0.7);
  oBoom.gain.setValueAtTime(0.45, now);
  oBoom.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  osc.connect(oBoom); oBoom.connect(master);
  osc.start(now); osc.stop(now + 1.6);
  const bufLen = Math.floor(ctx.sampleRate * 0.6);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
  const noise = ctx.createBufferSource();
  const nGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass'; filter.frequency.value = 280; filter.Q.value = 0.8;
  noise.buffer = buf;
  nGain.gain.setValueAtTime(0.35, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  noise.connect(filter); filter.connect(nGain); nGain.connect(master);
  noise.start(now); noise.stop(now + 0.65);
}

/**
 * Pitched "morph" sound when a well changes genre ownership.
 * A gliding tone sweeps up to signal the capture.
 */
export function playWellTransform(audio, rgb) {  // eslint-disable-line no-unused-vars
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.4);
}

/** Dramatic warp-in whoosh when a ship enters. */
export function playWarpIn(audio) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.6);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.9);
}

/**
 * Genre-specific rhythmic pulse from an owned well. Each genre has a distinct
 * waveform and envelope so the musical character of each zone is audible.
 * @param {Object} audio
 * @param {number} freq    well's current frequency
 * @param {string} genre   ship genre key
 * @param {number} pan     stereo position -1..1
 */
export function playGenrePulse(audio, freq, genre, pan = 0) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const cfgs = {
    trap:    { type: 'sawtooth', gain: 0.07, attack: 0.004, decay: 0.16 },
    lofi:    { type: 'triangle', gain: 0.055, attack: 0.05,  decay: 0.55 },
    house:   { type: 'sine',     gain: 0.08, attack: 0.007, decay: 0.20 },
    boombap: { type: 'triangle', gain: 0.065, attack: 0.014, decay: 0.32 },
    techno:  { type: 'sawtooth', gain: 0.065, attack: 0.003, decay: 0.10 },
  };
  const cfg = cfgs[genre] || cfgs.trap;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
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

/**
 * Rising tension stab on missile hit — pitch climbs as the target nears death.
 * @param {Object} audio
 * @param {number} intensity  0 (full HP) → 1 (one hit from death)
 */
export function playBattleTension(audio, intensity = 0) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const baseFreq = 55 + intensity * 220;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq * 2.2, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.28);
  gain.gain.setValueAtTime(0.035 + intensity * 0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.42);
}

/**
 * 5-note ascending arpeggio in the winning genre's tonal color.
 * Fires on victory declaration — gives the battle a clear musical resolution.
 * @param {Object} audio
 * @param {string} genre   winning ship's genre
 * @param {number} rootFreq frequency to base the arpeggio on
 */
export function playVictoryFanfare(audio, genre, rootFreq = 220) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  // Interval ratios tuned to each genre's feel
  const arps = {
    trap:    [1, 1.19, 1.5,  1.78, 2.38],  // minor — dark triumph
    lofi:    [1, 1.19, 1.5,  1.68, 2.0],   // dorian — wistful win
    house:   [1, 1.25, 1.5,  1.68, 2.25],  // lydian — euphoric
    boombap: [1, 1.25, 1.5,  1.88, 2.5],   // pentatonic — triumphant
    techno:  [1, 1.12, 1.26, 1.5,  2.0],   // whole-tone — alien victory
  };
  const ratios = arps[genre] || arps.house;
  const step = genre === 'techno' ? 0.07 : genre === 'lofi' ? 0.17 : 0.11;
  ratios.forEach((r, i) => {
    const t = now + i * step;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = rootFreq * r;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.16, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + 0.7);
  });
}
