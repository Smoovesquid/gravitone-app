// Neutron Star audio — harmonic overtone generator
// When particles hit a neutron star, it produces rich harmonic overtones
// on top of the base frequency. Think overtone singing / spectral richness.

import { connectToMaster } from "./engine";

/**
 * Trigger a harmonic overtone burst — plays base frequency plus overtones.
 * Intensity (0-1) controls how many overtones sound and their volume.
 * @param {Object} audioEngine - The audio engine instance
 * @param {number} baseFreq - Base frequency in Hz
 * @param {number} pan - Stereo pan (-1 to 1)
 * @param {number} velocity - Volume (0-1)
 * @param {number} intensity - Proximity intensity (0-1), controls overtone richness
 */
export function triggerOvertones(audioEngine, baseFreq, pan, velocity, intensity) {
  if (!audioEngine || !audioEngine.ctx) return;
  const ctx = audioEngine.ctx;
  const now = ctx.currentTime;

  // Harmonic series: fundamental + up to 6 overtones
  // More overtones audible at higher intensity (closer proximity)
  const maxOvertones = Math.floor(2 + intensity * 4); // 2-6 overtones
  const duration = 0.3 + intensity * 0.4; // 0.3-0.7s

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(velocity * 0.06, now);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // Stereo panning
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(pan, now);

  masterGain.connect(panner);
  connectToMaster(panner);

  for (let h = 1; h <= maxOvertones; h++) {
    const freq = baseFreq * h;
    if (freq > 12000) break; // don't go ultrasonic

    const osc = ctx.createOscillator();
    // Alternate waveforms for richer texture
    osc.type = h <= 2 ? "sine" : h <= 4 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, now);

    // Each overtone is quieter: amplitude falls off as 1/h
    const harmGain = ctx.createGain();
    const harmAmp = (1 / h) * (0.5 + intensity * 0.5);
    harmGain.gain.setValueAtTime(harmAmp, now);
    harmGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Slight detune for shimmer (increases with overtone number)
    osc.detune.setValueAtTime((Math.random() - 0.5) * h * 3, now);

    osc.connect(harmGain);
    harmGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }
}
