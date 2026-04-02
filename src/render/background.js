import { THEME } from "../data/theme";

// Parallax offsets for nebula layers (lerped each frame)
const nebulaOffsets = [
  { x: 0, y: 0 }, // layer 0: 0.3× depth
  { x: 0, y: 0 }, // layer 1: 0.5× depth
  { x: 0, y: 0 }, // layer 2: 1.0× depth
];
const PARALLAX_DEPTHS = [0.3, 0.5, 1.0];
const PARALLAX_STRENGTH = 8; // max ±8px displacement

/**
 * Draw the full background: clear, fill, parallax nebula, octave gradient,
 * twinkling stars, grid, and empty canvas state.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState} s
 */
export function drawBackground(ctx, s) {
  ctx.clearRect(0, 0, s.width, s.height);
  ctx.fillStyle = THEME.background;
  ctx.fillRect(0, 0, s.width, s.height);

  // Compute parallax target from mouse position
  const targetX = s.width > 0 ? (s.mouseX / s.width - 0.5) * PARALLAX_STRENGTH : 0;
  const targetY = s.height > 0 ? (s.mouseY / s.height - 0.5) * PARALLAX_STRENGTH : 0;

  // Nebula clouds with parallax
  for (let i = 0; i < THEME.nebulaClouds.length; i++) {
    const cloud = THEME.nebulaClouds[i];
    const depth = PARALLAX_DEPTHS[i] || 0.5;
    const offset = nebulaOffsets[i];

    // Lerp toward target (0.10 per DESIGN.md)
    offset.x += (targetX * depth - offset.x) * 0.10;
    offset.y += (targetY * depth - offset.y) * 0.10;

    const cx = cloud.x * s.width + offset.x;
    const cy = cloud.y * s.height + offset.y;
    const cr = cloud.radius * Math.max(s.width, s.height);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    grad.addColorStop(0, cloud.color);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Octave zone gradient
  const octaveGrad = ctx.createLinearGradient(0, 0, 0, s.height);
  octaveGrad.addColorStop(0,    'rgba(20,  80, 200, 0.025)');
  octaveGrad.addColorStop(0.45, 'rgba(0,   0,   0, 0)');
  octaveGrad.addColorStop(0.55, 'rgba(0,   0,   0, 0)');
  octaveGrad.addColorStop(1,    'rgba(180, 60,  20, 0.025)');
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

  // Empty canvas state: wandering particles + hint text
  if (s.wells.length === 0) {
    _drawEmptyState(ctx, s);
  }
}

// --- Empty canvas state ---

function _drawEmptyState(ctx, s) {
  // Initialize wanderers if needed
  if (!s.wanderers || s.wanderers.length === 0) {
    s.wanderers = [];
    for (let i = 0; i < 3; i++) {
      s.wanderers.push({
        x: Math.random() * s.width,
        y: Math.random() * s.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  // Tick and draw wanderers (Brownian motion)
  for (const w of s.wanderers) {
    w.vx += (Math.random() - 0.5) * 0.05;
    w.vy += (Math.random() - 0.5) * 0.05;
    const speed = Math.hypot(w.vx, w.vy);
    if (speed > 0.4) { w.vx *= 0.4 / speed; w.vy *= 0.4 / speed; }
    w.x = (w.x + w.vx + s.width) % s.width;
    w.y = (w.y + w.vy + s.height) % s.height;

    // Particle dot
    ctx.beginPath();
    ctx.arc(w.x, w.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fill();

    // Faint trail
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w.x, w.y);
    ctx.lineTo(w.x - w.vx * 20, w.y - w.vy * 20);
    ctx.stroke();
  }

  // Hint text
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.font = "12px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("click anywhere to begin", s.width / 2, s.height / 2);
}
