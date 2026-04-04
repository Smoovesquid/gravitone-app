/**
 * @fileoverview Alien Visitation renderer.
 * Draws the visiting ship, its engine trail, organic session beams to wells,
 * a faint orbit ring, and a minimal visitor HUD.
 */

import { drawShip } from './ship';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} s  game state
 */
export function drawFleet(ctx, s) {
  const fl = s.fleet;
  if (!fl) return;

  // Faint orbit ring — shows the path the visitor is following
  if (fl.visitor && fl.visitor.state === 'active') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.width * 0.5, s.height * 0.5, fl.visitor.orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${fl.visitor.rgb},0.05)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 14]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Session beams — organic flowing curves from ship to each session well
  if (fl.visitor && fl.sessionWells?.length) {
    for (const wi of fl.sessionWells) {
      const w = s.wells[wi];
      if (w) _drawSessionBeam(ctx, fl.visitor, w, s.time);
    }
  }

  if (!fl.visitor) {
    _drawIdleHUD(ctx, fl, s);
    return;
  }

  // Engine trail
  for (let i = 0; i < fl.visitor.trail.length; i++) {
    const t = fl.visitor.trail[i];
    ctx.beginPath();
    ctx.arc(t.x, t.y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${fl.visitor.rgb},${(t.life * 0.22).toFixed(2)})`;
    ctx.fill();
  }

  // Ship hull
  drawShip(ctx, fl.visitor, s.time);

  // Phase label above ship
  _drawVisitorLabel(ctx, fl, s);

  // HUD
  _drawVisitorHUD(ctx, fl, s);
}

// ─── Session beam ─────────────────────────────────────────────────────────────

function _drawSessionBeam(ctx, ship, well, time) {
  const mx = (ship.x + well.x) * 0.5;
  const my = (ship.y + well.y) * 0.5;
  const dx = well.x - ship.x, dy = well.y - ship.y;
  const len = Math.hypot(dx, dy) || 1;
  // Control point wiggles perpendicularly — gives it an organic "breathing" look
  const wobble = Math.sin(time * 1.4) * 28;
  const cx2 = mx + (-dy / len) * wobble;
  const cy2 = my + ( dx / len) * wobble;

  ctx.save();

  // Soft outer glow
  ctx.beginPath();
  ctx.moveTo(ship.x, ship.y);
  ctx.quadraticCurveTo(cx2, cy2, well.x, well.y);
  ctx.strokeStyle = `rgba(${ship.rgb},0.07)`;
  ctx.lineWidth = 11;
  ctx.stroke();

  // Core beam
  ctx.beginPath();
  ctx.moveTo(ship.x, ship.y);
  ctx.quadraticCurveTo(cx2, cy2, well.x, well.y);
  const alpha = 0.22 + Math.sin(ship.beamPulse) * 0.14;
  ctx.strokeStyle = `rgba(${ship.rgb},${alpha.toFixed(2)})`;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Particles flowing along the bezier toward the well
  for (let i = 0; i < 4; i++) {
    const t = ((time * 0.65 + i * 0.25) % 1);
    const bx = (1-t)*(1-t)*ship.x + 2*(1-t)*t*cx2 + t*t*well.x;
    const by = (1-t)*(1-t)*ship.y + 2*(1-t)*t*cy2 + t*t*well.y;
    const pa = (0.7 * Math.sin(t * Math.PI)).toFixed(2);
    ctx.beginPath();
    ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${ship.rgb},${pa})`;
    ctx.fill();
  }

  ctx.restore();
}

// ─── HUD elements ─────────────────────────────────────────────────────────────

function _drawVisitorLabel(ctx, fl, s) {
  const v = fl.visitor;
  if (v.state === 'warping') return;
  const phaseText = {
    orbiting:  'LISTENING',
    session:   'SESSION',
    departing: 'DEPARTING',
  }[fl.phase] ?? '';
  if (!phaseText) return;

  ctx.save();
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(${v.rgb},0.55)`;
  ctx.fillText(`${v.label} · ${phaseText}`, v.x, v.y - 66);
  ctx.restore();
}

function _drawVisitorHUD(ctx, fl, s) {
  const v = fl.visitor;
  ctx.save();
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = `rgba(${v.rgb},0.65)`;
  ctx.fillText(`♪ ${v.label}`, 16, s.height - 32);

  const taughtCount = s.wells.filter(w => w._learnedFrom?.length).length;
  if (taughtCount > 0) {
    ctx.font = '7px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(`${taughtCount} wells taught`, 16, s.height - 18);
  }
  ctx.restore();
}

function _drawIdleHUD(ctx, fl, s) {
  if (fl.phase !== 'gap') return;
  const remaining = Math.ceil(Math.max(0, fl.phaseTimer));
  if (remaining > 8) return; // only show countdown in final 8s

  ctx.save();
  ctx.font = '7px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillText(`next visitor in ${remaining}s`, 16, s.height - 18);

  const taughtCount = s.wells.filter(w => w._learnedFrom?.length).length;
  if (taughtCount > 0) {
    ctx.fillText(`${taughtCount} wells taught`, 16, s.height - 32);
  }
  ctx.restore();
}
