/**
 * @fileoverview Missile projectile rendering for Fleet Battle mode.
 * Each missile is a glowing dot with a color-matched trail.
 */

/**
 * Draw all active missiles.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fleet  s.fleet
 */
export function drawMissiles(ctx, fleet) {
  if (!fleet?.missiles?.length) return;

  for (const m of fleet.missiles) {
    // Trail
    for (let i = 0; i < m.trail.length; i++) {
      const t = m.trail[i];
      const alpha = (i / m.trail.length) * 0.5;
      const r = 1 + (i / m.trail.length) * 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${m.rgb},${alpha.toFixed(2)})`;
      ctx.fill();
    }

    // Core glow
    const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 8);
    glow.addColorStop(0, `rgba(${m.rgb},0.9)`);
    glow.addColorStop(0.4, `rgba(${m.rgb},0.4)`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Bright core dot
    ctx.beginPath();
    ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}
