/**
 * @fileoverview Ship destruction rendering for Fleet Battle mode.
 * Draws explosion particles for ships in 'exploding' state.
 */

/**
 * Draw explosion particles for all exploding ships + screen flash.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fleet   s.fleet
 * @param {number} w       canvas width
 * @param {number} h       canvas height
 */
export function drawExplosions(ctx, fleet, w, h) {
  if (!fleet) return;

  // Screen flash on destruction
  if (fleet.screenFlash && fleet.screenFlash.alpha > 0) {
    ctx.save();
    ctx.fillStyle = fleet.screenFlash.color;
    ctx.globalAlpha = Math.max(0, fleet.screenFlash.alpha * 0.35);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Explosion particles per ship
  for (const ship of fleet.ships) {
    if (ship.state !== 'exploding' || !ship.explosionParticles?.length) continue;

    for (const p of ship.explosionParticles) {
      if (p.life <= 0) continue;
      const alpha = p.life * 0.85;
      const radius = 1.5 + (1 - p.life) * 3.5;

      // Outer glow
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
      glow.addColorStop(0, `rgba(255,255,255,${(alpha * 0.6).toFixed(2)})`);
      glow.addColorStop(0.3, `${ship.color}${Math.floor(alpha * 200).toString(16).padStart(2, '0')}`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.9).toFixed(2)})`;
      ctx.fill();
    }
  }
}
