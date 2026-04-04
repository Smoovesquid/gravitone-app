/**
 * @fileoverview Fleet Battle renderer — ships, beams, tractor trails, HUD.
 * Entry point: drawFleet(ctx, s).
 */

import { drawShip } from './ship';
import { drawMissiles } from './missiles';
import { drawExplosions } from './explosion';

/**
 * Draw the entire fleet battle scene on top of the existing canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState & { fleet?: any }} s
 */
export function drawFleet(ctx, s) {
  const fl = s.fleet;
  if (!fl) return;

  // Tractor beams (ships → targeted wells)
  _drawBeams(ctx, fl, s);

  // Ship engine trails
  for (const ship of fl.ships) {
    if (ship.state === 'dead') continue;
    for (let i = 0; i < ship.trail.length; i++) {
      const t = ship.trail[i];
      const alpha = t.life * 0.28;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ship.rgb},${alpha.toFixed(2)})`;
      ctx.fill();
    }
  }

  // Ship hulls
  for (const ship of fl.ships) {
    if (ship.state === 'dead') continue;
    drawShip(ctx, ship, s.time);
    _drawShipHUD(ctx, ship);
  }

  // Missiles + explosions
  drawMissiles(ctx, fl);
  drawExplosions(ctx, fl, s.width, s.height);

  // Battle mode HUD
  _drawBattleHUD(ctx, fl, s);
}

function _drawBeams(ctx, fl, s) {
  for (const ship of fl.ships) {
    if (ship.state !== 'active' && ship.state !== 'victory') continue;
    const ti = ship.targetWellIdx;
    if (ti < 0 || !s.wells[ti] || s.wells[ti].removing) continue;

    const w = s.wells[ti];
    const pulse = (Math.sin(ship.beamPulse) + 1) / 2;
    const beamAlpha = 0.22 + pulse * 0.28;

    // Wide soft glow
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y);
    ctx.lineTo(w.x, w.y);
    ctx.strokeStyle = `rgba(${ship.rgb},${(beamAlpha * 0.3).toFixed(2)})`;
    ctx.lineWidth = 10;
    ctx.stroke();

    // Dashed beam core
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y);
    ctx.lineTo(w.x, w.y);
    ctx.strokeStyle = `rgba(${ship.rgb},${beamAlpha.toFixed(2)})`;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -s.time * 45;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function _drawShipHUD(ctx, ship) {
  const x = ship.x, y = ship.y;

  // HP bar (above ship)
  const barW = 44, barH = 5, barY = y - 62;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - barW / 2, barY, barW, barH);
  const hpFrac = ship.hp / ship.maxHp;
  ctx.fillStyle = hpFrac > 0.5 ? ship.color : hpFrac > 0.25 ? '#ffaa00' : '#ff3322';
  ctx.fillRect(x - barW / 2, barY, barW * hpFrac, barH);
  ctx.strokeStyle = `rgba(255,255,255,0.2)`;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x - barW / 2, barY, barW, barH);

  // Genre label
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(${ship.rgb},0.8)`;
  ctx.fillText(ship.label, x, y + 55);

  // Warp progress text
  if (ship.state === 'warping') {
    ctx.fillStyle = `rgba(${ship.rgb},0.6)`;
    ctx.fillText('WARPING IN…', x, y - 72);
  }
}

function _drawBattleHUD(ctx, fl, s) {
  // Top-left battle mode label
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,80,80,0.75)';
  ctx.fillText('⚔ BATTLE MODE', 16, s.height - 32);

  // Well count per ship
  const active = fl.ships.filter(sh => sh.state !== 'dead');
  if (!active.length) return;
  const parts = active.map(sh => `${sh.label} ${sh.controlledWells.size}`);
  ctx.font = '8px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('WELLS: ' + parts.join(' / '), 16, s.height - 18);

  // Phase label (top-right area)
  const phaseLabel = fl.phase === 'claiming' ? `CLAIMING (${Math.max(0, Math.ceil(fl.phaseTimer))}s)` : 'COMBAT';
  ctx.textAlign = 'right';
  ctx.fillStyle = fl.phase === 'combat' ? 'rgba(255,80,80,0.65)' : 'rgba(180,255,100,0.55)';
  ctx.fillText(phaseLabel, s.width - 16, s.height - 32);
}
