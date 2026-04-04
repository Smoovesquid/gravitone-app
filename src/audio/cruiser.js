/**
 * @fileoverview Imperial Battle Cruiser audio — deep engine drone.
 * Low sub-bass oscillator + filtered noise for the "capital ship" ambiance.
 */

/**
 * Start a low engine hum. Returns a handle to stop it later.
 * @param {AudioContext} audioCtx
 * @returns {{ osc: OscillatorNode, noise: AudioBufferSourceNode, masterGain: GainNode } | null}
 */
export function startCruiserHum(audioCtx) {
  if (!audioCtx) return null;
  try {
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.07, audioCtx.currentTime + 2.0);
    masterGain.connect(audioCtx.destination);

    // Sub-bass oscillator (40 Hz fundamental)
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 40;
    oscGain.gain.value = 0.6;
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start();

    // Second harmonic for body
    const osc2 = audioCtx.createOscillator();
    const oscGain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 80;
    oscGain2.gain.value = 0.3;
    osc2.connect(oscGain2);
    oscGain2.connect(masterGain);
    osc2.start();

    // Filtered noise layer (engine texture)
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 120;
    noiseFilter.Q.value = 0.8;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.2;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();

    return { osc, osc2, noise, masterGain };
  } catch {
    return null;
  }
}

/**
 * Fade out and stop the engine hum.
 * @param {{ osc: OscillatorNode, osc2: OscillatorNode, noise: AudioBufferSourceNode, masterGain: GainNode } | null} handle
 * @param {AudioContext} audioCtx
 */
export function stopCruiserHum(handle, audioCtx) {
  if (!handle || !audioCtx) return;
  try {
    handle.masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    setTimeout(() => {
      try {
        handle.osc.stop(); handle.osc2.stop(); handle.noise.stop();
        handle.osc.disconnect(); handle.osc2.disconnect();
        handle.noise.disconnect(); handle.masterGain.disconnect();
      } catch {}
    }, 2000);
  } catch {}
}
