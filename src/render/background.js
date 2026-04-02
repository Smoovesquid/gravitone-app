import { THEME } from "../data/theme";

/**
 * Draw the full background: clear, fill, nebula clouds, twinkling stars, grid.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState} s
 */
export function drawBackground(ctx, s) {
  ctx.clearRect(0, 0, s.width, s.height);
  ctx.fillStyle = THEME.background;
  ctx.fillRect(0, 0, s.width, s.height);

  // Nebula clouds
  for (const cloud of THEME.nebulaClouds) {
    const cx = cloud.x * s.width, cy = cloud.y * s.height;
    const cr = cloud.radius * Math.max(s.width, s.height);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    grad.addColorStop(0, cloud.color);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Octave zone gradient — warm amber at bass (bottom), cool blue at treble (top).
  // Opacity is subliminal (0.025): not visible as UI chrome but registers spatially after the eye adjusts.
  const octaveGrad = ctx.createLinearGradient(0, 0, 0, s.height);
  octaveGrad.addColorStop(0,    'rgba(20,  80, 200, 0.025)'); // top = leads, cool blue
  octaveGrad.addColorStop(0.45, 'rgba(0,   0,   0, 0)');     // center = neutral
  octaveGrad.addColorStop(0.55, 'rgba(0,   0,   0, 0)');     // center = neutral (smooth)
  octaveGrad.addColorStop(1,    'rgba(180, 60,  20, 0.025)'); // bottom = sub bass, warm amber
  ctx.fillStyle = octaveGrad;
  ctx.fillRect(0, 0, s.width, s.height);

  // Twinkling stars
  for (const star of s.stars) {
    const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.time * star.twinkleSpeed + star.twinklePhase));
    ctx.globalAlpha = tw;
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(star.x * s.width, star.y * s.height, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Grid
  ctx.strokeStyle = THEME.gridColor;
  ctx.lineWidth = 0.5;
  for (let x = 0; x < s.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s.height); ctx.stroke();
  }
  for (let y = 0; y < s.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s.width, y); ctx.stroke();
  }
}
