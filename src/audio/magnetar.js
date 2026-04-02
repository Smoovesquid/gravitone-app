// Dubstep Magnetar — a decayed black hole that wobbles bass and shreds

// Play the magnetar wobble bass (continuous, called each pulse)
export function playMagnetarWobble(audio, freq, pan = 0, intensity = 1) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
  panner.connect(master);

  // FAT saw bass
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, now);

  // Sub oscillator
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(freq / 2, now);

  // Wobble LFO on filter cutoff — the classic dubstep sound
  const wobbleRate = 2 + intensity * 6; // 2-8 Hz wobble
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 8 + intensity * 12;
  filter.frequency.setValueAtTime(200, now);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(wobbleRate, now);
  lfoGain.gain.setValueAtTime(1500 + intensity * 3000, now); // filter sweep range
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start(now);
  lfo.stop(now + 0.6);

  // Distortion
  const dist = ctx.createWaveShaper();
  const samples = 256;
  const curve = new Float32Array(samples);
  const amt = 20 + intensity * 40;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + amt) * x) / (Math.PI + amt * Math.abs(x));
  }
  dist.curve = curve;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(intensity * 0.12, now + 0.02);
  gain.gain.setValueAtTime(intensity * 0.12, now + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0, now);
  subGain.gain.linearRampToValueAtTime(intensity * 0.08, now + 0.01);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.connect(filter);
  filter.connect(dist);
  dist.connect(gain);
  gain.connect(panner);
  sub.connect(subGain);
  subGain.connect(panner);

  osc.start(now);
  osc.stop(now + 0.55);
  sub.start(now);
  sub.stop(now + 0.55);
}

// Play the black hole decay sound (ominous descending tone)
export function playDecaySound(audio, pan = 0) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(pan, now);
  panner.connect(master);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 1.5);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  osc.connect(gain);
  gain.connect(panner);
  osc.start(now);
  osc.stop(now + 1.6);
}

// Play the explosion sound (noise burst + low freq impact)
export function playExplosion(audio, pan = 0) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(pan, now);
  panner.connect(master);

  // Impact
  const impact = ctx.createOscillator();
  const impactGain = ctx.createGain();
  impact.type = "sine";
  impact.frequency.setValueAtTime(80, now);
  impact.frequency.exponentialRampToValueAtTime(20, now + 0.5);
  impactGain.gain.setValueAtTime(0.2, now);
  impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  impact.connect(impactGain);
  impactGain.connect(panner);
  impact.start(now);
  impact.stop(now + 0.9);

  // Noise burst
  const bufLen = Math.floor(ctx.sampleRate * 0.3);
  const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseGain = ctx.createGain();
  const noiseFilt = ctx.createBiquadFilter();
  noiseFilt.type = "lowpass";
  noiseFilt.frequency.setValueAtTime(4000, now);
  noiseFilt.frequency.exponentialRampToValueAtTime(100, now + 0.5);
  noiseGain.gain.setValueAtTime(0.15, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  noise.connect(noiseFilt);
  noiseFilt.connect(noiseGain);
  noiseGain.connect(panner);
  noise.start(now);
}

// Check if a black hole should start decaying
// Threshold: mass > 200 and has absorbed enough particles (tracked via pulsePhase activity)
export function shouldDecay(well, time) {
  if (well.type !== "blackhole") return false;
  if (well.magnetar) return false; // already a magnetar
  if (well.decaying) return false;  // already decaying
  return well.mass >= 200 && (time - well.born) > 8; // 8 seconds after placement
}

// Magnetar wobble frequencies (dubstep bass notes)
const WOBBLE_NOTES = [55, 61.74, 65.41, 73.42, 82.41, 87.31]; // A1 to F2

export function getWobbleFreq() {
  return WOBBLE_NOTES[Math.floor(Math.random() * WOBBLE_NOTES.length)];
}
