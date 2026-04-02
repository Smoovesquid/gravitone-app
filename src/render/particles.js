import { THEME } from "../data/theme";

/**
 * Get velocity-based trail color per DESIGN.md HSL formula.
 * Slow = steel blue (hue 200), Fast = orange-red (hue 20, wraps at 360).
 * @param {object} p - particle
 * @param {object[]} wells - all wells (for neutron star heat override)
 * @returns {string} hsla color
 */
function getParticleTrailColor(p, wells) {
  const speed = Math.hypot(p.vx, p.vy);
  const maxSpeed = THEME.physics.particleSpeed * 3;
  const normalizedSpeed = Math.min(speed / maxSpeed, 1);

  // Check for neutron star proximity heat override
  for (const w of wells) {
    if (w.type !== "neutronstar") continue;
    const dist = Math.hypot(w.x - p.x, w.y - p.y);
    const influenceR = w.neutronInfluenceRadius || 120;
    if (dist < influenceR) {
      const heatFactor = 1 - dist / influenceR;
      if (heatFactor > 0.3) {
        return `hsla(20, 80%, 65%, ${(0.14 + heatFactor * 0.10).toFixed(3)})`;
      }
    }
  }

  // Velocity-based hue: slow=200 (steel blue) → fast=360/0 (red-orange)
  const hue = (200 + (1 - normalizedSpeed) * 160) % 360;
  return `hsla(${hue.toFixed(0)}, 65%, 72%, ${(p.life * 0.12).toFixed(3)})`;
}

/**
 * Draw all particles (trails + glowing dots).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState} s
 */
export function drawParticles(ctx, s) {
  for (const p of s.particles) {
    // Trail with velocity-based color
    if (p.trail.length > 2) {
      ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let t = 1; t < p.trail.length; t++) ctx.lineTo(p.trail[t].x, p.trail[t].y);
      ctx.strokeStyle = getParticleTrailColor(p, s.wells);
      ctx.lineWidth = p.radius * 0.5; ctx.stroke();
    }

    // Color based on nearest non-looper/station well
    const closestWell = s.wells.reduce((closest, w) => {
      if (w.type === "looper" || w.type === "station") return closest;
      const d = Math.sqrt((w.x - p.x) ** 2 + (w.y - p.y) ** 2);
      return d < closest.dist ? { well: w, dist: d } : closest;
    }, { well: null, dist: Infinity });

    let pColor = closestWell.well ? closestWell.well.color.core : "#fff";
    if (closestWell.well?.type === "blackhole") {
      const eh = 12 + closestWell.well.mass / 20;
      if (closestWell.dist < eh * 4) {
        const blend = 1 - closestWell.dist / (eh * 4);
        pColor = `rgb(${Math.round(200 - blend * 100)},${Math.round(100 - blend * 80)},255)`;
      }
    }

    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
    const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * p.life * 2);
    pGrad.addColorStop(0, "#fff");
    pGrad.addColorStop(0.5, pColor);
    pGrad.addColorStop(1, "transparent");
    ctx.fillStyle = pGrad;
    ctx.globalAlpha = p.life;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
