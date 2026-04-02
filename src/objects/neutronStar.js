import { triggerOvertones } from "../audio/neutronStar";

/**
 * Create a neutron star data object.
 * @param {number} x
 * @param {number} y
 * @param {number} mass
 * @param {number} time
 * @returns {import('../types').Well}
 */
export function createNeutronStar(x, y, mass, time) {
  return {
    x, y, mass,
    color: { core: "#ff4422", glow: "rgba(255,68,34,0.4)" },
    type: "neutronstar",
    born: time,
    pulsePhase: 0,
    neutronSpinAngle: 0,
    neutronInfluenceRadius: 120,
    neutronHeat: 0,          // current heat level from particle proximity (0-1)
    neutronLastOvertone: 0,  // throttle overtone triggering
  };
}

/**
 * Run the neutron star state machine for all neutron star wells.
 * Handles: spin, proximity heat tracking, overtone triggering.
 * @param {import('../types').GameState} s
 * @param {number} dt
 */
export function tickNeutronStars(s, dt) {
  for (const w of s.wells) {
    if (w.type !== "neutronstar") continue;

    // Spin continuously (fast — dense object)
    w.neutronSpinAngle = (w.neutronSpinAngle + dt * 40) % 360;

    // Track proximity heat from nearest particle
    let maxHeat = 0;
    let closestParticle = null;
    const influenceR = w.neutronInfluenceRadius || 120;

    for (const p of s.particles) {
      const dx = p.x - w.x;
      const dy = p.y - w.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const heat = Math.max(0, 1 - dist / influenceR);
      if (heat > maxHeat) {
        maxHeat = heat;
        closestParticle = p;
      }
    }

    // Smooth heat transitions
    w.neutronHeat = w.neutronHeat + (maxHeat - w.neutronHeat) * Math.min(1, dt * 8);

    // Trigger overtones when particles are close enough
    if (closestParticle && maxHeat > 0.3 && s.time - w.neutronLastOvertone > 0.15) {
      w.neutronLastOvertone = s.time;
      w.pulsePhase = s.time;

      // Base frequency from the particle's position relative to neutron star
      // Lower tones when deep in the gravity well
      const baseFreq = 80 + (1 - maxHeat) * 200; // 80-280 Hz range

      if (s.audioCtx) {
        const pan = (w.x / s.width) * 2 - 1;
        const vel = Math.min(1, w.mass / 100) * 0.7;
        triggerOvertones(s.audioCtx, baseFreq, pan, vel, maxHeat);
      }
    }
  }
}
