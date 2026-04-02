// Melodic instruments — each is a synthesis function
// All take (audio, freq, pan, velocity) and play a note

function makePanner(audio, pan) {
  const panner = audio.ctx.createStereoPanner();
  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), audio.ctx.currentTime);
  return panner;
}

// === SINE (default — warm, round) ===
export function playSine(audio, freq, pan = 0, velocity = 0.6) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.002, now + 0.1);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(velocity * 0.3, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  osc.connect(gain);
  gain.connect(panner);
  osc.start(now);
  osc.stop(now + 1.3);

  // Shimmer harmonic
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(freq * 2.01, now);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(velocity * 0.06, now + 0.005);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc2.connect(gain2);
  gain2.connect(panner);
  osc2.start(now);
  osc2.stop(now + 0.5);
}

// === TRIANGLE (mellow, retro) ===
export function playTriangle(audio, freq, pan = 0, velocity = 0.6) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(velocity * 0.25, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  osc.connect(gain);
  gain.connect(panner);
  osc.start(now);
  osc.stop(now + 1.0);
}

// === FM BELL (metallic, shimmery) ===
export function playFMBell(audio, freq, pan = 0, velocity = 0.6) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  // Carrier
  const carrier = ctx.createOscillator();
  const carrierGain = ctx.createGain();
  carrier.type = "sine";
  carrier.frequency.setValueAtTime(freq, now);
  carrierGain.gain.setValueAtTime(0, now);
  carrierGain.gain.linearRampToValueAtTime(velocity * 0.2, now + 0.002);
  carrierGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

  // Modulator (ratio 3.5:1 for bell-like timbre)
  const modulator = ctx.createOscillator();
  const modGain = ctx.createGain();
  modulator.type = "sine";
  modulator.frequency.setValueAtTime(freq * 3.5, now);
  modGain.gain.setValueAtTime(freq * 2, now);
  modGain.gain.exponentialRampToValueAtTime(1, now + 2.0);
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  carrier.connect(carrierGain);
  carrierGain.connect(panner);
  carrier.start(now);
  carrier.stop(now + 2.6);
  modulator.start(now);
  modulator.stop(now + 2.1);
}

// === PLUCK (short, guitar-like) ===
export function playPluck(audio, freq, pan = 0, velocity = 0.6) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  // Karplus-Strong-ish: noise burst through tuned filter
  const bufLen = Math.floor(ctx.sampleRate * 0.05);
  const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 30;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(velocity * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  // Add a sine for pitch clarity
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  oscGain.gain.setValueAtTime(velocity * 0.15, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  osc.connect(oscGain);
  oscGain.connect(panner);

  noise.start(now);
  osc.start(now);
  osc.stop(now + 0.5);
}

// === PAD (sustained, lush) ===
export function playPad(audio, freq, pan = 0, velocity = 0.6) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  // Three detuned oscillators for richness
  const detunes = [-7, 0, 7];
  for (const detune of detunes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(detune, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity * 0.08, now + 0.3);
    gain.gain.setValueAtTime(velocity * 0.08, now + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
    osc.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 3.1);
  }
}

// === CHOIR (ethereal, vowel-like) ===
export function playChoir(audio, freq, pan = 0, velocity = 0.6) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  // Formant synthesis — two bandpass filters at vowel frequencies
  const formants = [
    { freq: 800, Q: 10 },  // "ah"
    { freq: 1200, Q: 8 },  // overtone
  ];

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, now);

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, now);
  mainGain.gain.linearRampToValueAtTime(velocity * 0.06, now + 0.2);
  mainGain.gain.setValueAtTime(velocity * 0.06, now + 2.0);
  mainGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);

  for (const f of formants) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f.freq;
    bp.Q.value = f.Q;
    osc.connect(bp);
    bp.connect(mainGain);
  }

  mainGain.connect(panner);
  osc.start(now);
  osc.stop(now + 3.6);
}

// === GLITCH (chaotic, digital) ===
export function playGlitch(audio, freq, pan = 0, velocity = 0.6) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  // Rapid frequency jumps
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.setValueAtTime(freq * 1.5, now + 0.03);
  osc.frequency.setValueAtTime(freq * 0.5, now + 0.06);
  osc.frequency.setValueAtTime(freq * 2, now + 0.09);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.25, now + 0.3);

  // Bitcrusher-style: reduce sample rate with a waveshaper
  const ws = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  const steps = 8;
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  ws.curve = curve;

  gain.gain.setValueAtTime(velocity * 0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(ws);
  ws.connect(gain);
  gain.connect(panner);
  osc.start(now);
  osc.stop(now + 0.4);
}

// === BASS (for well placement feedback) ===
export function playBass(audio, freq) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq / 4, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 2.1);
}

// === ABSORB (black hole sound) ===
export function playAbsorb(audio, freq, pan = 0) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lpf = ctx.createBiquadFilter();
  const panner = makePanner(audio, pan);
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
  lpf.type = "lowpass";
  lpf.frequency.setValueAtTime(freq * 2, now);
  lpf.frequency.exponentialRampToValueAtTime(40, now + 0.6);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc.connect(lpf);
  lpf.connect(gain);
  gain.connect(panner);
  panner.connect(master);
  osc.start(now);
  osc.stop(now + 0.9);
}

// Instrument registry — maps name to play function
export const INSTRUMENTS = {
  sine: { name: "Sine", play: playSine, description: "Warm and round" },
  triangle: { name: "Triangle", play: playTriangle, description: "Mellow and retro" },
  fmBell: { name: "FM Bell", play: playFMBell, description: "Metallic shimmer" },
  pluck: { name: "Pluck", play: playPluck, description: "Crisp and percussive" },
  pad: { name: "Pad", play: playPad, description: "Sustained and lush" },
  choir: { name: "Choir", play: playChoir, description: "Ethereal voices" },
  glitch: { name: "Glitch", play: playGlitch, description: "Chaotic digital" },
};

export function playNote(audio, freq, pan = 0, velocity = 0.6, instrumentName = "sine") {
  const inst = INSTRUMENTS[instrumentName];
  if (inst) {
    inst.play(audio, freq, pan, velocity);
  } else {
    playSine(audio, freq, pan, velocity);
  }
}

export function getInstrumentKeys() {
  return Object.keys(INSTRUMENTS);
}
