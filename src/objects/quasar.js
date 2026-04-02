import { startQuasarDrone, stopQuasarDrone, switchQuasarMode } from "../audio/quasar";

/**
 * Quasar mode colors — jet color encodes the current drone mode.
 */
export const QUASAR_MODE_COLORS = {
  drone:   { jet: "#FFB700", jetTip: "#ff9900", label: "DRN" },
  power:   { jet: "#cc2244", jetTip: "#991133", label: "PWR" },
  cluster: { jet: "#55ff22", jetTip: "#33cc11", label: "CLU" },
};

const QUASAR_MODE_ORDER = ["drone", "power", "cluster"];

/**
 * Create a quasar data object.
 * @param {number} x
 * @param {number} y
 * @param {number} mass
 * @param {number} time
 * @param {number} angle - Initial jet direction in radians
 * @returns {import('../types').Well}
 */
export function createQuasar(x, y, mass, time, angle) {
  return {
    x, y, mass,
    color: { core: "#e8f4ff", glow: "rgba(232,244,255,0.4)" },
    type: "quasar",
    born: time,
    pulsePhase: 0,
    quasarAngle: angle ?? 0,           // jet direction in radians
    quasarMode: "drone",               // drone | power | cluster
    quasarIntensity: 0,                // energy output level 0-1 (ramps up)
    quasarJetLength: 120,              // visual jet length
    quasarInfluenceRadius: 160,        // physics force radius
    quasarDroneHandle: null,           // audio handle (runtime only, not serialized)
    quasarJetParticles: [],            // micro-particle streaming along jets
  };
}

/**
 * Run the quasar state machine for all quasar wells.
 * Handles: intensity ramp-up, jet micro-particles, beam physics on particles,
 * audio drone start/stop.
 * @param {import('../types').GameState} s
 * @param {number} dt
 */
export function tickQuasars(s, dt) {
  for (const w of s.wells) {
    if (w.type !== "quasar") continue;

    // Ramp up intensity over first 2 seconds
    w.quasarIntensity = Math.min(1, w.quasarIntensity + dt * 0.5);

    // Start audio drone if not running
    if (!w.quasarDroneHandle && s.audioCtx) {
      const pan = (w.x / s.width) * 2 - 1;
      const baseFreq = _rootFreqFromScale(s);
      w.quasarDroneHandle = startQuasarDrone(s.audioCtx, baseFreq, pan, w.quasarMode);
    }

    // Update jet micro-particles (visual streaming)
    _tickJetParticles(w, dt);

    // Beam physics: push particles along jet axis, pull laterally
    const beamWidth = 30; // pixels
    const jetLen = w.quasarJetLength;
    const pushForce = 300 * w.quasarIntensity;
    const pullForce = 80 * w.quasarIntensity;

    for (const p of s.particles) {
      const dx = p.x - w.x;
      const dy = p.y - w.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > w.quasarInfluenceRadius) continue;

      // Project particle onto jet axis
      const cosA = Math.cos(w.quasarAngle);
      const sinA = Math.sin(w.quasarAngle);
      const along = dx * cosA + dy * sinA;   // signed distance along jet
      const perp = -dx * sinA + dy * cosA;   // signed perpendicular distance
      const absPerp = Math.abs(perp);

      // Check if particle is within the beam cone (either direction)
      const absAlong = Math.abs(along);
      if (absAlong < jetLen && absPerp < beamWidth) {
        // Particle is in the beam — push along jet direction
        const dir = along >= 0 ? 1 : -1;
        const falloff = 1 - absPerp / beamWidth; // stronger at center
        p.vx += cosA * dir * pushForce * falloff * dt;
        p.vy += sinA * dir * pushForce * falloff * dt;
      } else if (dist < w.quasarInfluenceRadius) {
        // Outside beam but in influence radius — lateral pull toward jet axis
        const proximity = 1 - dist / w.quasarInfluenceRadius;
        // Pull perpendicular to jet (toward the jet line)
        if (absPerp > 5) {
          const pullDir = perp > 0 ? -1 : 1;
          p.vx += (-sinA) * pullDir * pullForce * proximity * dt;
          p.vy += (cosA) * pullDir * pullForce * proximity * dt;
        }
      }
    }
  }
}

/**
 * Cycle quasar mode: drone -> power -> cluster -> drone.
 * @param {import('../types').Well} w
 * @param {import('../types').GameState} s
 */
export function cycleQuasarMode(w, s) {
  const idx = QUASAR_MODE_ORDER.indexOf(w.quasarMode);
  w.quasarMode = QUASAR_MODE_ORDER[(idx + 1) % QUASAR_MODE_ORDER.length];

  // Restart audio with new mode
  if (w.quasarDroneHandle && s.audioCtx) {
    const pan = (w.x / s.width) * 2 - 1;
    const baseFreq = _rootFreqFromScale(s);
    w.quasarDroneHandle = switchQuasarMode(w.quasarDroneHandle, s.audioCtx, baseFreq, pan, w.quasarMode);
  }
}

/**
 * Stop quasar audio (for cleanup on removal).
 * @param {import('../types').Well} w
 */
export function disposeQuasar(w) {
  if (w.quasarDroneHandle) {
    stopQuasarDrone(w.quasarDroneHandle);
    w.quasarDroneHandle = null;
  }
}

// --- Internal helpers ---

function _rootFreqFromScale(s) {
  // Use the first note of the current scale as root, octave 4
  const rootSemitone = s.scale && s.scale.length > 0 ? s.scale[0] : 0;
  return 440 * Math.pow(2, (rootSemitone - 9) / 12);
}

function _tickJetParticles(w, dt) {
  // Advance existing micro-particles
  for (let i = w.quasarJetParticles.length - 1; i >= 0; i--) {
    const mp = w.quasarJetParticles[i];
    mp.progress += dt * mp.speed;
    if (mp.progress > 1) {
      w.quasarJetParticles.splice(i, 1);
    }
  }

  // Spawn new micro-particles (up to ~20 active)
  if (w.quasarJetParticles.length < 20 && w.quasarIntensity > 0.1) {
    if (Math.random() < w.quasarIntensity * dt * 30) {
      w.quasarJetParticles.push({
        progress: 0,
        speed: 0.6 + Math.random() * 0.8,
        dir: Math.random() < 0.5 ? 0 : 1,  // 0 = forward, 1 = backward
        offset: (Math.random() - 0.5) * 10, // lateral offset for width
      });
    }
  }
}
