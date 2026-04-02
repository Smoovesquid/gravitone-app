import { triggerGateEnvelope } from "../audio/pulsar";

/**
 * Create a pulsar data object.
 * @param {number} x
 * @param {number} y
 * @param {number} mass
 * @param {number} bpm
 * @param {number} time
 * @returns {import('../types').Well}
 */
export function createPulsar(x, y, mass, bpm, time) {
  return {
    x, y, mass,
    color: { core: "#cce8ff", glow: "rgba(200,224,255,0.4)" },
    type: "pulsar",
    born: time,
    pulsePhase: 0,
    pulsarBeamAngle: 0,
    pulsarSweepIntensity: 0,
    pulsarGateRate: 4, // subdivisions per beat: 1=quarter, 2=eighth, 4=sixteenth
    pulsarRadius: 200,  // effect radius
    pulsarLastPulse: 0,
  };
}

/**
 * Run the pulsar state machine for all pulsar wells.
 * Handles: beam rotation, pulse timing, gate triggering on nearby wells.
 * @param {import('../types').GameState} s
 * @param {number} dt
 */
export function tickPulsars(s, dt) {
  for (const w of s.wells) {
    if (w.type !== "pulsar") continue;

    // Rotate beam at BPM-locked speed
    // Full rotation = 1 beat (adjustable by gateRate)
    const beatsPerSec = s.bpm / 60;
    const rotSpeed = beatsPerSec * Math.PI * 2; // one full rotation per beat
    w.pulsarBeamAngle = (w.pulsarBeamAngle + rotSpeed * dt) % (Math.PI * 2);

    // Decay sweep intensity
    w.pulsarSweepIntensity = Math.max(0, w.pulsarSweepIntensity - dt * 12);

    // Pulse on subdivision
    const subdivDur = 60 / s.bpm / w.pulsarGateRate;
    const currSubdiv = Math.floor(s.time / subdivDur);
    const prevSubdiv = Math.floor((s.time - dt) / subdivDur);

    if (currSubdiv > prevSubdiv) {
      // Fire pulse
      w.pulsarSweepIntensity = 1;
      w.pulsarLastPulse = s.time;
      w.pulsePhase = s.time;

      // Gate nearby audio-producing wells
      const releaseMs = Math.min(400, subdivDur * 800); // scale release to rate
      for (const target of s.wells) {
        if (target === w) continue;
        if (target.type === "pulsar" || target.type === "station") continue;
        const dx = target.x - w.x;
        const dy = target.y - w.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < w.pulsarRadius) {
          // Check if target is near the beam angle
          const angleToTarget = Math.atan2(dy, dx);
          const beamAngle = w.pulsarBeamAngle;
          // Check both beam directions (opposite beams)
          const diff0 = Math.abs(angleDiff(angleToTarget, beamAngle));
          const diff1 = Math.abs(angleDiff(angleToTarget, beamAngle + Math.PI));
          const beamWidth = Math.PI / 4; // 45 degree beam cone
          if (diff0 < beamWidth || diff1 < beamWidth) {
            // Apply gate envelope
            const proximity = 1 - dist / w.pulsarRadius;
            target.gateUntil = s.time + releaseMs / 1000;
            target.gateAmount = proximity;
            // Trigger audio gate if audioCtx exists
            if (s.audioCtx) {
              triggerGateEnvelope(s.audioCtx, releaseMs);
            }
          }
        }
      }
    }
  }
}

/** Shortest signed angle difference */
function angleDiff(a, b) {
  let d = ((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return d;
}
