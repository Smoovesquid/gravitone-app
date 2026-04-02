/**
 * Draw all alien craft (trails, glow, body, captured orbit indicator).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState} s
 */
export function drawAliens(ctx, s) {
  for (const a of s.aliens) {
    // Trail — ethereal glowing line
    if (a.trail.length > 2) {
      for (let t = 1; t < a.trail.length; t++) {
        const alpha = (t / a.trail.length) * 0.2 * a.life;
        ctx.strokeStyle = `hsla(${a.hue}, 70%, 70%, ${alpha})`;
        ctx.lineWidth = a.size * 0.3 * (t / a.trail.length);
        ctx.beginPath();
        ctx.moveTo(a.trail[t - 1].x, a.trail[t - 1].y);
        ctx.lineTo(a.trail[t].x, a.trail[t].y);
        ctx.stroke();
      }
    }

    // Body glow
    const glowR = a.size * 3;
    const glowGrad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, glowR);
    glowGrad.addColorStop(0, `hsla(${a.hue}, 80%, 80%, ${0.15 * a.life})`);
    glowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrad;
    ctx.beginPath(); ctx.arc(a.x, a.y, glowR, 0, Math.PI * 2); ctx.fill();

    // Shimmer ring — pulses when singing
    const singRecency = s.time - a.lastSing;
    const singPulse = singRecency < 0.5 ? 1 - singRecency / 0.5 : 0;
    if (singPulse > 0) {
      const pulseR = a.size * 2 + singPulse * 15;
      ctx.strokeStyle = `hsla(${a.hue}, 70%, 80%, ${singPulse * 0.3 * a.life})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(a.x, a.y, pulseR, 0, Math.PI * 2); ctx.stroke();
    }

    // Core — diamond shape, rotating
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(s.time * 1.5 + a.shimmerPhase);
    ctx.globalAlpha = a.life;

    const sz = a.size * (1 + singPulse * 0.3);
    ctx.beginPath();
    ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.6, 0);
    ctx.lineTo(0, sz); ctx.lineTo(-sz * 0.6, 0); ctx.closePath();
    const cGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
    cGrad.addColorStop(0, "#fff");
    cGrad.addColorStop(0.4, `hsl(${a.hue}, 80%, 75%)`);
    cGrad.addColorStop(1, `hsla(${a.hue}, 60%, 60%, 0.3)`);
    ctx.fillStyle = cGrad;
    ctx.fill();

    // Inner cross
    ctx.strokeStyle = `hsla(${a.hue}, 90%, 90%, 0.4)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -sz * 0.4); ctx.lineTo(0, sz * 0.4);
    ctx.moveTo(-sz * 0.3, 0); ctx.lineTo(sz * 0.3, 0);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();

    // Captured indicator — orbit line
    if (a.captured && a.capturedWell) {
      ctx.strokeStyle = `hsla(${a.hue}, 60%, 70%, ${0.06 * a.life})`;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.arc(a.capturedWell.x, a.capturedWell.y, a.orbitDist, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
