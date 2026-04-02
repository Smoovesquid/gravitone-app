import { THEME } from "../data/theme";

/**
 * Draw all particles (trails + glowing dots).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState} s
 */
export function drawParticles(ctx, s) {
  for (const p of s.particles) {
    // Trail
    if (p.trail.length > 2) {
      ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let t = 1; t < p.trail.length; t++) ctx.lineTo(p.trail[t].x, p.trail[t].y);
      ctx.strokeStyle = THEME.particleTrailColor.replace(/[\d.]+\)/, `${p.life * 0.12})`);
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
