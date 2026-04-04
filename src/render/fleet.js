/**
 * @fileoverview Alien Visitation renderer.
 * Scan beam, tractor beam, digest pulse, build shimmer, ship hull + trail, HUD.
 */

import { drawShip } from './ship';

export function drawFleet(ctx, s) {
  const fl = s.fleet;
  if (!fl) return;

  if (!fl.visitor) { _drawGapHUD(ctx, fl, s); return; }

  const v = fl.visitor;

  // Engine trail
  for (let i = 0; i < v.trail.length; i++) {
    const t = v.trail[i];
    ctx.beginPath();
    ctx.arc(t.x, t.y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${v.rgb},${(t.life * 0.2).toFixed(2)})`;
    ctx.fill();
  }

  // Phase-specific effects (drawn behind ship)
  if (fl.phase === 'eating')    _drawTractorBeams(ctx, v, fl, s);
  if (fl.phase === 'digesting') _drawDigestAura(ctx, v, s);
  if (fl.phase === 'building')  _drawBuildBeams(ctx, v, fl, s);

  // Orbit ring (arriving phase)
  if (fl.phase === 'arriving') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.width / 2, s.height / 2, v.orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${v.rgb},0.045)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 14]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Ship hull
  drawShip(ctx, v, s.time);

  // Phase label
  _drawVisitorLabel(ctx, fl, s);
  _drawVisitorHUD(ctx, fl, s);
}

// ─── Phase visuals ────────────────────────────────────────────────────────────

/** Parallel tractor beams to all wells being eaten simultaneously. */
function _drawTractorBeams(ctx, v, fl, s) {
  if (!fl.wellsToEat?.length) return;

  ctx.save();
  for (const w of fl.wellsToEat) {
    if (!s.wells.includes(w)) continue;
    if ((w._eatDelay ?? 0) > 0) continue; // not started yet

    // Wide soft beam
    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.lineTo(w.x, w.y);
    ctx.strokeStyle = `rgba(${v.rgb},0.06)`;
    ctx.lineWidth = 12;
    ctx.stroke();

    // Bright core beam pulsing with eatT
    const t = w._eatT ?? 0;
    const alpha = (0.35 + Math.sin(v.beamPulse * 4 + t * 6) * 0.2).toFixed(2);
    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.lineTo(w.x, w.y);
    ctx.strokeStyle = `rgba(${v.rgb},${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Particles streaming along each beam
    for (let i = 0; i < 4; i++) {
      const pt = ((s.time * 1.6 + i * 0.25 + t) % 1);
      const px = w.x + (v.x - w.x) * pt;
      const py = w.y + (v.y - w.y) * pt;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${v.rgb},${(0.65 * Math.sin(pt * Math.PI)).toFixed(2)})`;
      ctx.fill();
    }
  }

  // Pulsing ring on ship hull showing absorption
  const absorbed = fl.absorbedWells?.length ?? 0;
  const total    = absorbed + fl.wellsToEat.length;
  const prog     = total > 0 ? absorbed / total : 0;
  ctx.beginPath();
  ctx.arc(v.x, v.y, 26, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
  ctx.strokeStyle = `rgba(${v.rgb},0.55)`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function _drawDigestAura(ctx, v, s) {
  // Pulsing radial aura — ship glowing with absorbed energy
  const pulse = (Math.sin(s.time * 3.8) + 1) / 2;
  for (let ring = 0; ring < 3; ring++) {
    const r = 28 + ring * 18 + pulse * 12;
    const a = (0.18 - ring * 0.04 + pulse * 0.12).toFixed(2);
    ctx.beginPath();
    ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${v.rgb},${a})`;
    ctx.lineWidth = 1.5 - ring * 0.3;
    ctx.stroke();
  }
  // Soft fill glow
  const grad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, 55 + pulse * 20);
  grad.addColorStop(0, `rgba(${v.rgb},${(0.12 + pulse * 0.1).toFixed(2)})`);
  grad.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(v.x, v.y, 75, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();
}

/** Parallel build beams to all positions being materialized. */
function _drawBuildBeams(ctx, v, fl, s) {
  if (!fl.buildQueue?.length) return;

  ctx.save();
  for (const spec of fl.buildQueue) {
    if (spec.delay > 0 && !spec._spawnDone) continue;

    const dx = spec.targetX - v.x, dy = spec.targetY - v.y;
    const alpha = (0.12 + Math.sin(v.beamPulse * 3) * 0.06).toFixed(2);

    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.lineTo(spec.targetX, spec.targetY);
    ctx.strokeStyle = `rgba(${v.rgb},${alpha})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Particles flowing ship → build point
    for (let i = 0; i < 3; i++) {
      const t  = ((s.time * 0.85 + i * 0.33) % 1);
      const px = v.x + dx * t, py = v.y + dy * t;
      ctx.beginPath();
      ctx.arc(px, py, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${v.rgb},${(0.5 * Math.sin(t * Math.PI)).toFixed(2)})`;
      ctx.fill();
    }

    // Growing ring at target as it materializes
    if (spec._spawnDone && spec._buildT > 0) {
      const r = spec._buildT * 30;
      ctx.beginPath();
      ctx.arc(spec.targetX, spec.targetY, Math.max(1, r), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${v.rgb},${(0.4 * spec._buildT).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function _drawVisitorLabel(ctx, fl, s) {
  const v = fl.visitor;
  if (v.state === 'warping') return;
  const labels = {
    arriving:  'ARRIVING',
    eating:    'CONSUMING',
    digesting: 'PROCESSING',
    building:  'CREATING',
    departing: 'DEPARTING',
  };
  const txt = labels[fl.phase];
  if (!txt) return;
  ctx.save();
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(${v.rgb},0.5)`;
  ctx.fillText(`${v.label} · ${txt}`, v.x, v.y - 66);
  ctx.restore();
}

function _drawVisitorHUD(ctx, fl, s) {
  const v = fl.visitor;
  const prog = fl.phase === 'eating'
    ? `${fl.absorbedWells.length} / ${fl.absorbedWells.length + fl.wellsToEat.length}`
    : fl.phase === 'building'
    ? `${fl.buildQueue.filter(b => b._spawnDone).length} / ${fl.buildQueue.length}`
    : '';

  ctx.save();
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = `rgba(${v.rgb},0.65)`;
  ctx.fillText(`♪ ${v.label}`, 16, s.height - 32);
  if (prog) {
    ctx.font = '7px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(prog, 16, s.height - 18);
  }
  ctx.restore();
}

function _drawGapHUD(ctx, fl, s) {
  const remaining = Math.ceil(Math.max(0, fl.phaseTimer));
  if (remaining > 10) return;
  ctx.save();
  ctx.font = '7px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillText(`next visitor in ${remaining}s`, 16, s.height - 18);
  ctx.restore();
}
