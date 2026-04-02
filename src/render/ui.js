/**
 * Draw the beat indicator (16-step grid of dots) when quantize is on.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState} s
 * @param {number} sixteenthDur - duration of one sixteenth note in seconds
 */
export function drawBeatIndicator(ctx, s, sixteenthDur) {
  if (!s.quantize) return;
  const currentStep = Math.floor(s.time / sixteenthDur) % 16;
  const dotBaseX = s.width - 110;
  for (let i = 0; i < 16; i++) {
    const x = dotBaseX + i * 6;
    const isActive = currentStep === i;
    const isDownbeat = i % 4 === 0;
    ctx.beginPath();
    ctx.arc(x, 55, isActive ? 3 : (isDownbeat ? 1.5 : 1), 0, Math.PI * 2);
    ctx.fillStyle = isActive
      ? "rgba(255,107,107,0.9)"
      : isDownbeat
        ? "rgba(255,255,255,0.3)"
        : "rgba(255,255,255,0.1)";
    ctx.fill();
  }
}
