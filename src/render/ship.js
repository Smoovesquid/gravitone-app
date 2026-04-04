/**
 * @fileoverview Genre ship shape renderers for Fleet Battle mode.
 * Each genre has a distinct silhouette. Drawn at origin, caller transforms.
 */

/** Draw all shapes at origin (0,0) — call ctx.save/translate/rotate/restore around. */

function drawStealth(ctx, pulse) {
  // Trap: angular delta-wing fighter
  ctx.beginPath();
  ctx.moveTo(0, -38);              // nose
  ctx.lineTo(-52, 22);             // left wing tip
  ctx.lineTo(-18, 8);              // left wing inner
  ctx.lineTo(-8, 28);              // left exhaust notch
  ctx.lineTo(8, 28);               // right exhaust notch
  ctx.lineTo(18, 8);               // right wing inner
  ctx.lineTo(52, 22);              // right wing tip
  ctx.closePath();
  ctx.fillStyle = '#1a0810';
  ctx.fill();
  ctx.strokeStyle = `rgba(255,34,68,${0.5 + pulse * 0.35})`;
  ctx.lineWidth = 1.5; ctx.stroke();
  // Spine line
  ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(0, 22);
  ctx.strokeStyle = `rgba(255,80,100,${0.3 + pulse * 0.2})`; ctx.lineWidth = 1; ctx.stroke();
}

function drawVintage(ctx, pulse) {
  // Lo-Fi: rounded retro saucer with pods
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 22, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#120820'; ctx.fill();
  ctx.strokeStyle = `rgba(170,136,255,${0.45 + pulse * 0.3})`; ctx.lineWidth = 1.5; ctx.stroke();
  // Dome
  ctx.beginPath();
  ctx.ellipse(0, -8, 18, 12, 0, Math.PI, 0);
  ctx.fillStyle = '#1d1040'; ctx.fill();
  ctx.strokeStyle = `rgba(200,170,255,${0.35 + pulse * 0.2})`; ctx.lineWidth = 1; ctx.stroke();
  // Side pods
  for (const ex of [-44, 44]) {
    ctx.beginPath(); ctx.arc(ex * 0.7, 4, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1d1040'; ctx.fill();
    ctx.strokeStyle = `rgba(170,136,255,${0.4 + pulse * 0.25})`; ctx.lineWidth = 1; ctx.stroke();
  }
}

function drawSaucer(ctx, pulse) {
  // House: clean flying saucer
  ctx.beginPath();
  ctx.ellipse(0, 0, 52, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#14100a'; ctx.fill();
  ctx.strokeStyle = `rgba(255,187,0,${0.5 + pulse * 0.3})`; ctx.lineWidth = 2; ctx.stroke();
  // Upper dome
  ctx.beginPath();
  ctx.ellipse(0, -5, 24, 16, 0, Math.PI, 0);
  ctx.fillStyle = '#1e160a'; ctx.fill();
  ctx.strokeStyle = `rgba(255,210,60,${0.4 + pulse * 0.25})`; ctx.lineWidth = 1.5; ctx.stroke();
  // Ring detail
  ctx.beginPath();
  ctx.ellipse(0, 0, 40, 10, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,187,0,${0.2 + pulse * 0.15})`; ctx.lineWidth = 1; ctx.stroke();
}

function drawTank(ctx, pulse) {
  // Boom Bap: blocky fortress
  ctx.beginPath();
  ctx.rect(-38, -22, 76, 48);
  ctx.fillStyle = '#081408'; ctx.fill();
  ctx.strokeStyle = `rgba(68,221,136,${0.5 + pulse * 0.3})`; ctx.lineWidth = 2; ctx.stroke();
  // Turrets top corners
  for (const ex of [-28, 28]) {
    ctx.beginPath(); ctx.rect(ex - 8, -30, 16, 12);
    ctx.fillStyle = '#0d1a0d'; ctx.fill();
    ctx.strokeStyle = `rgba(68,221,136,${0.4 + pulse * 0.2})`; ctx.lineWidth = 1; ctx.stroke();
  }
  // Center bridge
  ctx.beginPath(); ctx.rect(-12, -14, 24, 18);
  ctx.fillStyle = '#0f200f'; ctx.fill();
  ctx.strokeStyle = `rgba(100,255,160,${0.35 + pulse * 0.2})`; ctx.lineWidth = 1; ctx.stroke();
}

function drawNeedle(ctx, pulse) {
  // Techno: elongated minimal dart
  ctx.beginPath();
  ctx.moveTo(0, -50);              // nose
  ctx.lineTo(-14, -10);
  ctx.lineTo(-22, 30);
  ctx.lineTo(0, 20);
  ctx.lineTo(22, 30);
  ctx.lineTo(14, -10);
  ctx.closePath();
  ctx.fillStyle = '#070e14'; ctx.fill();
  ctx.strokeStyle = `rgba(0,221,255,${0.5 + pulse * 0.3})`; ctx.lineWidth = 1.5; ctx.stroke();
  // Center line
  ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, 20);
  ctx.strokeStyle = `rgba(0,255,255,${0.25 + pulse * 0.18})`; ctx.lineWidth = 0.8; ctx.stroke();
}

const SHAPE_RENDERERS = { stealth: drawStealth, vintage: drawVintage, saucer: drawSaucer, tank: drawTank, needle: drawNeedle };

/**
 * Draw a single ship at its current position and angle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} ship
 * @param {number} time  s.time for animations
 */
export function drawShip(ctx, ship, time) {
  const pulse = (Math.sin(ship.beamPulse) + 1) / 2;
  const renderer = SHAPE_RENDERERS[ship.shape] || drawNeedle;

  ctx.save();
  ctx.translate(ship.x, ship.y);

  // Warp-in scale animation
  if (ship.state === 'warping') {
    const sc = 0.2 + ship.warpProgress * 0.8;
    ctx.scale(sc, sc);
    ctx.globalAlpha = ship.warpProgress;
    // Warp ring
    ctx.beginPath();
    ctx.arc(0, 0, 70 * (1 - ship.warpProgress) + 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${(1 - ship.warpProgress) * 0.6})`;
    ctx.lineWidth = 3; ctx.stroke();
  }

  ctx.rotate(ship.angle);
  renderer(ctx, pulse);

  // Engine glow (two exhaust points)
  const engAlpha = 0.25 + pulse * 0.3;
  const eg = ctx.createRadialGradient(0, 32, 0, 0, 32, 14);
  eg.addColorStop(0, `rgba(${ship.rgb},${engAlpha.toFixed(2)})`);
  eg.addColorStop(1, 'transparent');
  ctx.fillStyle = eg;
  ctx.beginPath(); ctx.arc(0, 32, 14, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}
