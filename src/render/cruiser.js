/**
 * @fileoverview Imperial Battle Cruiser renderer.
 * Draws: particle trail, tractor beams to wells, wedge-shaped hull, IMPERIAL MODE label.
 */

/**
 * Draw the cruiser and all its visual effects.
 * Call after drawWells so beams appear over everything.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState & { cruiser?: any }} s
 */
export function drawCruiser(ctx, s) {
  const cr = s.cruiser;
  if (!cr) return;

  const { x, y } = cr;

  // ── Particle trail (engine exhaust, only while moving) ──────────────────
  for (const p of cr.trail) {
    const alpha = p.life * 0.35;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,140,50,${alpha.toFixed(2)})`;
    ctx.fill();
  }

  // ── Tractor beams (when active) ─────────────────────────────────────────
  if (cr.state === 'active') {
    const pulse = (Math.sin(cr.beamPulsePhase) + 1) / 2; // 0→1
    const beamOriginY = y + 52; // bottom of hull

    for (let ti = 0; ti < cr.wellTargets.length; ti++) {
      const t = cr.wellTargets[ti];
      const w = s.wells[t.idx];
      if (!w || w.removing) continue;

      const isFeatured = ti === cr.featureIdx;
      const beamAlpha = (isFeatured ? 0.55 : 0.28) + pulse * 0.22;

      // Wide soft glow
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, beamOriginY);
      ctx.lineTo(w.x, w.y);
      ctx.strokeStyle = `rgba(160,255,80,${(beamAlpha * 0.35).toFixed(2)})`;
      ctx.lineWidth = isFeatured ? 10 : 6;
      ctx.stroke();

      // Core beam line
      ctx.beginPath();
      ctx.moveTo(x, beamOriginY);
      ctx.lineTo(w.x, w.y);
      ctx.strokeStyle = `rgba(190,255,110,${beamAlpha.toFixed(2)})`;
      ctx.lineWidth = isFeatured ? 2.5 : 1.5;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -s.time * 40;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // ── Ship hull ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(x, y);

  const W = 105; // half-width at stern
  const H = 90;  // nose-to-stern height

  // Main hull — elongated wedge, nose pointing DOWN (+y), stern at top (-y)
  ctx.beginPath();
  ctx.moveTo(0, H * 0.52);           // bow tip
  ctx.lineTo(-W, -H * 0.38);         // left stern corner
  ctx.lineTo(-W * 0.28, -H * 0.48);  // left engine nacelle
  ctx.lineTo(0, -H * 0.32);          // center bridge indent
  ctx.lineTo(W * 0.28, -H * 0.48);   // right engine nacelle
  ctx.lineTo(W, -H * 0.38);          // right stern corner
  ctx.closePath();
  ctx.fillStyle = '#181d23';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,110,55,0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Superstructure (raised dorsal ridge)
  ctx.beginPath();
  ctx.moveTo(0, H * 0.28);
  ctx.lineTo(-W * 0.18, -H * 0.12);
  ctx.lineTo(-W * 0.08, -H * 0.28);
  ctx.lineTo(0, -H * 0.2);
  ctx.lineTo(W * 0.08, -H * 0.28);
  ctx.lineTo(W * 0.18, -H * 0.12);
  ctx.closePath();
  ctx.fillStyle = '#1e252d';
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,130,60,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Engine glow (two nacelles)
  const engPulse = 0.3 + Math.sin(cr.beamPulsePhase * 0.7) * 0.12;
  for (const ex of [-W * 0.2, W * 0.2]) {
    const eg = ctx.createRadialGradient(ex, -H * 0.45, 0, ex, -H * 0.45, 11);
    eg.addColorStop(0, `rgba(255,150,50,${engPulse.toFixed(2)})`);
    eg.addColorStop(1, 'transparent');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(ex, -H * 0.45, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  // Navigation light (bow tip — red pulse)
  const navAlpha = 0.4 + Math.sin(cr.beamPulsePhase * 1.4) * 0.3;
  const ng = ctx.createRadialGradient(0, H * 0.52, 0, 0, H * 0.52, 6);
  ng.addColorStop(0, `rgba(255,60,60,${navAlpha.toFixed(2)})`);
  ng.addColorStop(1, 'transparent');
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.arc(0, H * 0.52, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // ── Label ────────────────────────────────────────────────────────────────
  const labelAlpha = cr.state === 'active' ? 0.65 : 0.35;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(180,255,100,${labelAlpha})`;
  ctx.fillText('▲ IMPERIAL MODE', x, y - 68);
  if (cr.mood) {
    ctx.fillStyle = `rgba(180,255,100,${labelAlpha * 0.6})`;
    ctx.fillText(`${cr.mood.scale} · ${cr.mood.tempoFeel}`, x, y - 56);
  }
}
