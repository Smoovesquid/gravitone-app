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
  if (fl.phase === 'scanning') _drawScanBeam(ctx, v, s);
  if (fl.phase === 'eating')   _drawTractorBeam(ctx, v, fl, s);
  if (fl.phase === 'digesting') _drawDigestAura(ctx, v, s);
  if (fl.phase === 'building')  _drawBuildBeam(ctx, v, fl, s);

  // Orbit ring (scanning + eating)
  if (fl.phase === 'scanning' || fl.phase === 'orbiting') {
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

function _drawScanBeam(ctx, v, s) {
  // Rotating sweep line from ship to canvas edge
  const angle   = v.scanAngle ?? v.orbitAngle;
  const len = Math.max(s.width, s.height) * 1.1;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(v.x + Math.cos(angle) * len, v.y + Math.sin(angle) * len);

  // Soft gradient along sweep
  const grad = ctx.createLinearGradient(v.x, v.y, v.x + Math.cos(angle) * len, v.y + Math.sin(angle) * len);
  grad.addColorStop(0,   `rgba(${v.rgb},0.28)`);
  grad.addColorStop(0.3, `rgba(${v.rgb},0.08)`);
  grad.addColorStop(1,   `rgba(${v.rgb},0)`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fan glow — triangle wedge
  ctx.beginPath();
  const fanAngle = 0.12;
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(v.x + Math.cos(angle - fanAngle) * len * 0.6, v.y + Math.sin(angle - fanAngle) * len * 0.6);
  ctx.lineTo(v.x + Math.cos(angle + fanAngle) * len * 0.6, v.y + Math.sin(angle + fanAngle) * len * 0.6);
  ctx.closePath();
  ctx.fillStyle = `rgba(${v.rgb},0.03)`;
  ctx.fill();
  ctx.restore();

  // Mark wells scheduled for eating with a faint target ring
  if (s.fleet.wellsToEat?.length) {
    for (const w of s.fleet.wellsToEat) {
      ctx.save();
      const pulse = (Math.sin(s.time * 4) + 1) / 2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, (w.mass || 50) / 2 + 16 + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${v.rgb},${(0.2 + pulse * 0.2).toFixed(2)})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function _drawTractorBeam(ctx, v, fl, s) {
  const w = fl.currentEatWell;
  if (!w || !s.wells.includes(w)) return;

  // Bright focused beam to the well being eaten
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(w.x, w.y);
  ctx.strokeStyle = `rgba(${v.rgb},0.08)`;
  ctx.lineWidth = 14;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(w.x, w.y);
  const alpha = 0.5 + Math.sin(v.beamPulse * 4) * 0.25;
  ctx.strokeStyle = `rgba(${v.rgb},${alpha.toFixed(2)})`;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Particles streaming from well toward ship
  for (let i = 0; i < 5; i++) {
    const t   = ((s.time * 1.4 + i * 0.2) % 1);
    const px  = w.x + (v.x - w.x) * t;
    const py  = w.y + (v.y - w.y) * t;
    const pa  = (0.7 * Math.sin(t * Math.PI)).toFixed(2);
    ctx.beginPath();
    ctx.arc(px, py, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${v.rgb},${pa})`;
    ctx.fill();
  }

  // Progress ring around ship
  const prog = fl.eatProgress;
  ctx.beginPath();
  ctx.arc(v.x, v.y, 26, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
  ctx.strokeStyle = `rgba(${v.rgb},0.55)`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Mark remaining targets faintly
  for (const tw of fl.wellsToEat) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(tw.x, tw.y, (tw.mass || 50) / 2 + 12, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${v.rgb},0.1)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
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

function _drawBuildBeam(ctx, v, fl, s) {
  const spec = fl.buildQueue[fl.currentBuildIdx];
  if (!spec) return;

  // Ship points at build target with a gentle beam
  const dx = spec.targetX - v.x, dy = spec.targetY - v.y;
  const alpha = (0.15 + Math.sin(v.beamPulse * 3) * 0.08).toFixed(2);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(spec.targetX, spec.targetY);
  ctx.strokeStyle = `rgba(${v.rgb},${alpha})`;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Particles flowing from ship toward build point
  for (let i = 0; i < 4; i++) {
    const t  = ((s.time * 0.9 + i * 0.25) % 1);
    const px = v.x + dx * t, py = v.y + dy * t;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${v.rgb},${(0.55 * Math.sin(t * Math.PI)).toFixed(2)})`;
    ctx.fill();
  }

  // Growing ring at build target
  if (fl.buildWell) {
    const r = (fl.buildProgress - 0.3) / 0.7 * 35;
    ctx.beginPath();
    ctx.arc(spec.targetX, spec.targetY, Math.max(1, r), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${v.rgb},0.35)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function _drawVisitorLabel(ctx, fl, s) {
  const v = fl.visitor;
  if (v.state === 'warping') return;
  const labels = {
    scanning:  'SCANNING',
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
    ? `${fl.absorbedWells.length + (fl.currentEatWell ? 1 : 0)} / ${fl.absorbedWells.length + fl.wellsToEat.length + (fl.currentEatWell ? 1 : 0)}`
    : fl.phase === 'building'
    ? `${fl.currentBuildIdx} / ${fl.buildQueue.length}`
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
