/**
 * @fileoverview Battle audio effects for Fleet Battle mode.
 * Missile fire, ship explosions, and well capture sounds.
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

  // Tonal boom
  const osc = ctx.createOscillator();
  const oBoom = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 0.7);
  oBoom.gain.setValueAtTime(0.45, now);
  oBoom.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  osc.connect(oBoom); oBoom.connect(master);
  osc.start(now); osc.stop(now + 1.6);

  // Noise burst
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

/** Rising arpeggio "lock" sound when a ship claims a well. */
export function playWellClaim(audio) {
  if (!audio?.ctx) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  [660, 880, 1100].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const t = now + i * 0.07;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + 0.4);
  });
}

/**
 * Pitched "morph" sound when a well changes genre ownership.
 * A gliding tone sweeps up to signal the capture.
 * @param {Object} audio
 * @param {string} rgb  e.g. '255,34,68' — used only for future filter tint ideas
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
