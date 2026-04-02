// Pulsar audio — sidechain gate envelope
// Creates a momentary gain duck that simulates sidechain compression

import { connectToMaster } from "./engine";

/**
 * Trigger a gate envelope — a fast gain duck that recovers over releaseMs.
 * Creates an audible "pump" sound via a short noise burst filtered low.
 * @param {Object} audioEngine - The audio engine instance
 * @param {number} releaseMs - Release time in milliseconds (100-400)
 */
export function triggerGateEnvelope(audioEngine, releaseMs) {
  if (!audioEngine || !audioEngine.ctx) return;
  const ctx = audioEngine.ctx;
  const now = ctx.currentTime;

  // Short percussive "pump" click — filtered noise burst
  const bufferSize = Math.floor(ctx.sampleRate * 0.015); // 15ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = 1 - i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * env * env;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Low pass filter — makes it a thump not a click
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 150;
  filter.Q.value = 8;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + releaseMs / 1000);

  source.connect(filter);
  filter.connect(gain);
  connectToMaster(gain);
  source.start(now);
  source.stop(now + releaseMs / 1000);
}

/**
 * Calculate gate attenuation for a well at current time.
 * Returns a volume multiplier 0-1 (1 = no gate, 0 = fully gated).
 * @param {import('../types').Well} well
 * @param {number} currentTime
 * @returns {number}
 */
export function getGateMultiplier(well, currentTime) {
  if (!well.gateUntil || currentTime > well.gateUntil) return 1;
  const remaining = well.gateUntil - currentTime;
  const totalDuration = remaining + 0.002; // approximate
  const gateAmount = well.gateAmount || 0.5;
  // Fast attack (already at minimum), exponential recovery
  const progress = 1 - remaining / totalDuration;
  const multiplier = progress * progress; // quadratic recovery curve
  return 1 - gateAmount * (1 - multiplier);
}
