// Quasar audio — sustained directional drone cannon
// Emits continuous pitched audio: drone (root), power chord (root+5th+octave),
// or cluster (root+minor2nd+tritone). Wall of sound, layered, intense.

import { connectToMaster } from "./engine";

/**
 * Quasar drone mode definitions.
 * Each mode produces a different set of intervals (in semitones from root).
 */
const QUASAR_MODES = {
  drone:   { intervals: [0],          label: "DRN" },
  power:   { intervals: [0, 7, 12],   label: "PWR" },
  cluster: { intervals: [0, 1, 6],    label: "CLU" },
};

/**
 * Start the quasar's continuous drone audio.
 * Returns a handle object with oscillators + gain for later control/stop.
 * @param {Object} audioEngine - The audio engine instance
 * @param {number} baseFreq - Root frequency in Hz
 * @param {number} pan - Stereo pan (-1 to 1)
 * @param {string} mode - "drone" | "power" | "cluster"
 * @returns {Object|null} handle { oscillators, masterGain, panner, mode, baseFreq }
 */
export function startQuasarDrone(audioEngine, baseFreq, pan, mode) {
  if (!audioEngine || !audioEngine.ctx) return null;
  const ctx = audioEngine.ctx;

  const modeDef = QUASAR_MODES[mode] || QUASAR_MODES.drone;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.0; // fade in

  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;

  masterGain.connect(panner);
  connectToMaster(panner);

  const oscillators = [];
  for (const semitones of modeDef.intervals) {
    const freq = baseFreq * Math.pow(2, semitones / 12);

    // Main oscillator — sawtooth for richness
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;

    // Slight detune for width
    const detuneOsc = ctx.createOscillator();
    detuneOsc.type = "sawtooth";
    detuneOsc.frequency.value = freq;
    detuneOsc.detune.value = 8 + Math.random() * 4; // 8-12 cents sharp

    // Individual gain per voice
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.12 / modeDef.intervals.length;

    // Low-pass filter to tame high harmonics
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2000 + Math.random() * 500;
    filter.Q.value = 0.7;

    osc.connect(filter);
    detuneOsc.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(masterGain);

    osc.start();
    detuneOsc.start();
    oscillators.push({ osc, detuneOsc, voiceGain, filter });
  }

  // Fade in over 200ms
  const now = ctx.currentTime;
  masterGain.gain.setTargetAtTime(1, now, 0.06);

  return { oscillators, masterGain, panner, mode, baseFreq, ctx };
}

/**
 * Stop and clean up a quasar drone.
 * @param {Object} handle - The handle returned by startQuasarDrone
 */
export function stopQuasarDrone(handle) {
  if (!handle) return;
  const { oscillators, masterGain, ctx } = handle;
  const now = ctx.currentTime;

  // Fade out over 100ms then stop
  masterGain.gain.setTargetAtTime(0, now, 0.03);
  setTimeout(() => {
    for (const v of oscillators) {
      try { v.osc.stop(); } catch (_) {}
      try { v.detuneOsc.stop(); } catch (_) {}
      v.osc.disconnect();
      v.detuneOsc.disconnect();
      v.voiceGain.disconnect();
      v.filter.disconnect();
    }
    masterGain.disconnect();
    handle.panner.disconnect();
  }, 200);
}

/**
 * Update the quasar drone frequency (e.g. when scale changes).
 * @param {Object} handle
 * @param {number} baseFreq
 */
export function updateQuasarFreq(handle, baseFreq) {
  if (!handle) return;
  const modeDef = QUASAR_MODES[handle.mode] || QUASAR_MODES.drone;
  const now = handle.ctx.currentTime;
  for (let i = 0; i < handle.oscillators.length; i++) {
    const semitones = modeDef.intervals[i] || 0;
    const freq = baseFreq * Math.pow(2, semitones / 12);
    handle.oscillators[i].osc.frequency.setTargetAtTime(freq, now, 0.05);
    handle.oscillators[i].detuneOsc.frequency.setTargetAtTime(freq, now, 0.05);
  }
  handle.baseFreq = baseFreq;
}

/**
 * Switch quasar mode — stops old drone, starts new one.
 * @param {Object} oldHandle
 * @param {Object} audioEngine
 * @param {number} baseFreq
 * @param {number} pan
 * @param {string} newMode
 * @returns {Object|null} new handle
 */
export function switchQuasarMode(oldHandle, audioEngine, baseFreq, pan, newMode) {
  stopQuasarDrone(oldHandle);
  return startQuasarDrone(audioEngine, baseFreq, pan, newMode);
}

