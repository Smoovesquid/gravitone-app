// Space Station proximity warp — audio distortion based on distance

// Calculate proximity factor (0 = far/no effect, 1 = maximum warp)
export function getProximityFactor(wellX, wellY, stationX, stationY, warpRadius) {
  const dx = wellX - stationX;
  const dy = wellY - stationY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= warpRadius) return 0;
  return 1 - (dist / warpRadius);
}

// Calculate warp parameters from proximity factor
export function getWarpParams(proximity) {
  if (proximity <= 0) return null;
  const p = proximity;
  return {
    // Pitch bend: up to 30 cents detune at max proximity
    detuneCents: p * 30 * Math.sin(Date.now() / 200),
    // Frequency multiplier: slight pitch wobble
    freqMultiplier: 1 + (p * 0.03 * Math.sin(Date.now() / 300)),
    // Tremolo: amplitude modulation depth
    tremoloDepth: p * 0.4,
    tremoloRate: 4 + p * 12, // 4-16 Hz
    // Filter: lowpass sweep (darker when closer)
    filterFreq: 20000 - (p * 16000), // 20kHz → 4kHz
    // Distortion amount (0-1)
    distortion: p * 0.6,
    // Ring mod depth for tone-near-drum interactions
    ringModDepth: p * 0.3,
  };
}

// Apply warp to a note at trigger time
export function playWarpedNote(audio, playFn, freq, pan, velocity, warpParams) {
  if (!audio || !warpParams) {
    playFn(audio, freq, pan, velocity);
    return;
  }

  const { ctx, master } = audio;
  const now = ctx.currentTime;

  // Apply frequency warp
  const warpedFreq = freq * warpParams.freqMultiplier;

  // Create a tremolo LFO that modulates the output
  const tremoloGain = ctx.createGain();
  const tremoloLFO = ctx.createOscillator();
  const tremoloDepthNode = ctx.createGain();

  tremoloLFO.frequency.value = warpParams.tremoloRate;
  tremoloDepthNode.gain.value = warpParams.tremoloDepth;
  tremoloGain.gain.value = 1 - warpParams.tremoloDepth / 2;

  tremoloLFO.connect(tremoloDepthNode);
  tremoloDepthNode.connect(tremoloGain.gain);
  tremoloLFO.start(now);
  tremoloLFO.stop(now + 3);

  // Filter for proximity-based darkness
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = warpParams.filterFreq;
  filter.Q.value = 1 + warpParams.distortion * 4;

  // Waveshaper for distortion
  let distNode = null;
  if (warpParams.distortion > 0.1) {
    distNode = ctx.createWaveShaper();
    const samples = 256;
    const curve = new Float32Array(samples);
    const amt = warpParams.distortion * 50;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((Math.PI + amt) * x) / (Math.PI + amt * Math.abs(x));
    }
    distNode.curve = curve;
  }

  // Play the note with warped frequency — it connects to master internally,
  // but we can't intercept that. Instead, play directly and apply post-effects
  // via a parallel path.
  playFn(audio, warpedFreq, pan, velocity);

  // The warp effects are "in addition to" the normal sound — the proximity
  // creates a ghost/shadow of the note with distortion and tremolo
  if (warpParams.distortion > 0.15) {
    const ghostOsc = ctx.createOscillator();
    const ghostGain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    ghostOsc.type = "sawtooth";
    ghostOsc.frequency.setValueAtTime(warpedFreq, now);
    ghostOsc.detune.setValueAtTime(warpParams.detuneCents, now);
    ghostGain.gain.setValueAtTime(0, now);
    ghostGain.gain.linearRampToValueAtTime(velocity * warpParams.distortion * 0.08, now + 0.01);
    ghostGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    panner.pan.setValueAtTime(pan, now);

    ghostOsc.connect(filter);
    if (distNode) {
      filter.connect(distNode);
      distNode.connect(tremoloGain);
    } else {
      filter.connect(tremoloGain);
    }
    tremoloGain.connect(ghostGain);
    ghostGain.connect(panner);
    panner.connect(master);

    ghostOsc.start(now);
    ghostOsc.stop(now + 1);
  }
}

// Get the maximum warp proximity for a well from all stations
export function getMaxWarp(well, stations) {
  let maxProx = 0;
  for (const station of stations) {
    const p = getProximityFactor(well.x, well.y, station.x, station.y, station.warpRadius);
    if (p > maxProx) maxProx = p;
  }
  return maxProx;
}
