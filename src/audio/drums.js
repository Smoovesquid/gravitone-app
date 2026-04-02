// Drum synthesis — all percussion sounds
// Each takes (audio, pan, velocity)

function makePanner(audio, pan) {
  const panner = audio.ctx.createStereoPanner();
  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), audio.ctx.currentTime);
  return panner;
}

// === KICK ===
export function playKick(audio, pan = 0, velocity = 0.8) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(velocity * 0.5, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain);
  gain.connect(panner);
  osc.start(now);
  osc.stop(now + 0.5);

  // Click transient
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(800, now);
  osc2.frequency.exponentialRampToValueAtTime(100, now + 0.025);
  gain2.gain.setValueAtTime(velocity * 0.35, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
  osc2.connect(gain2);
  gain2.connect(panner);
  osc2.start(now);
  osc2.stop(now + 0.05);
}

// === SNARE ===
export function playSnare(audio, pan = 0, velocity = 0.7) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  // Noise body
  const bufLen = Math.floor(ctx.sampleRate * 0.15);
  const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) noiseData[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 1000;
  noiseGain.gain.setValueAtTime(velocity * 0.22, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(panner);
  noise.start(now);

  // Tone body
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);
  gain.gain.setValueAtTime(velocity * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(panner);
  osc.start(now);
  osc.stop(now + 0.12);
}

// === HI-HAT ===
export function playHihat(audio, pan = 0, velocity = 0.5) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  const bufLen = Math.floor(ctx.sampleRate * 0.06);
  const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) noiseData[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 6000;
  const filter2 = ctx.createBiquadFilter();
  filter2.type = "bandpass";
  filter2.frequency.value = 10000;
  filter2.Q.value = 1;
  noiseGain.gain.setValueAtTime(velocity * 0.12, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  noise.connect(filter);
  filter.connect(filter2);
  filter2.connect(noiseGain);
  noiseGain.connect(panner);
  noise.start(now);
}

// === CLAP (unlockable) ===
export function playClap(audio, pan = 0, velocity = 0.7) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  // Multiple layered noise bursts with slight delays
  for (let layer = 0; layer < 3; layer++) {
    const offset = layer * 0.012;
    const bufLen = Math.floor(ctx.sampleRate * 0.08);
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2000;
    bp.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.18, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(panner);
    noise.start(now + offset);
  }
}

// === RIMSHOT (unlockable) ===
export function playRimshot(audio, pan = 0, velocity = 0.6) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.01);
  gain.gain.setValueAtTime(velocity * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain);
  gain.connect(panner);
  osc.start(now);
  osc.stop(now + 0.07);
}

// === TOM (unlockable) ===
export function playTom(audio, pan = 0, velocity = 0.7) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(velocity * 0.4, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain);
  gain.connect(panner);
  osc.start(now);
  osc.stop(now + 0.4);
}

// === SHAKER (unlockable) ===
export function playShaker(audio, pan = 0, velocity = 0.4) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  const bufLen = Math.floor(ctx.sampleRate * 0.04);
  const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 8000;
  bp.Q.value = 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(velocity * 0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  noise.connect(bp);
  bp.connect(gain);
  gain.connect(panner);
  noise.start(now);
}

// === COWBELL (unlockable) ===
export function playCowbell(audio, pan = 0, velocity = 0.5) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = makePanner(audio, pan);
  panner.connect(master);

  // Two detuned square waves for metallic tone
  const freqs = [545, 820];
  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 5;
    gain.gain.setValueAtTime(velocity * 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(bp);
    bp.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

// Drum type definitions
export const DRUM_TYPES = {
  kick: { name: "Kick", play: playKick, color: { core: "#FF3344", glow: "rgba(255,51,68,0.4)" } },
  snare: { name: "Snare", play: playSnare, color: { core: "#FFAA22", glow: "rgba(255,170,34,0.4)" } },
  hihat: { name: "Hi-Hat", play: playHihat, color: { core: "#22FFAA", glow: "rgba(34,255,170,0.4)" } },
  clap: { name: "Clap", play: playClap, color: { core: "#FF66AA", glow: "rgba(255,102,170,0.4)" } },
  rimshot: { name: "Rimshot", play: playRimshot, color: { core: "#FFDD44", glow: "rgba(255,221,68,0.4)" } },
  tom: { name: "Tom", play: playTom, color: { core: "#FF8844", glow: "rgba(255,136,68,0.4)" } },
  shaker: { name: "Shaker", play: playShaker, color: { core: "#88FFCC", glow: "rgba(136,255,204,0.4)" } },
  cowbell: { name: "Cowbell", play: playCowbell, color: { core: "#DDAA44", glow: "rgba(221,170,68,0.4)" } },
};

export const DRUM_ORDER = ["kick", "snare", "hihat", "clap", "tom", "rimshot", "shaker", "cowbell"];

// Play a drum by type name
export function playDrum(audio, drumType, pan = 0, velocity = 0.7) {
  const drum = DRUM_TYPES[drumType];
  if (drum) {
    drum.play(audio, pan, velocity);
  }
}

// Replay a captured event (for quasar playback)
// Note: For tone events, use playNote from instruments.js directly.
// This function only handles drum replay to avoid circular imports.
export function replayDrumEvent(audio, evt) {
  if (!audio) return;
  playDrum(audio, evt.drumType, evt.pan, evt.velocity);
}
