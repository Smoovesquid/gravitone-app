/**
 * Draw the beat indicator — 16-step centered dot row, amplitude-responsive.
 * Per DESIGN.md: 4px base radius, centered, prominent, current beat pulses.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState} s
 * @param {number} sixteenthDur - duration of one sixteenth note in seconds
 */
export function drawBeatIndicator(ctx, s, sixteenthDur) {
  if (!s.quantize) return;

  const beatDots = 16;
  const dotSpacing = 10;
  const totalWidth = (beatDots - 1) * dotSpacing;
  const startX = (s.width - totalWidth) / 2;
  const dotY = 40;

  const currentStep = Math.floor(s.time / sixteenthDur) % 16;
  const timeSinceBeat = s.time - Math.floor(s.time / sixteenthDur) * sixteenthDur;

  for (let i = 0; i < beatDots; i++) {
    const isCurrentBeat = i === currentStep;
    const isDownbeat = i % 4 === 0;
    const dotX = startX + i * dotSpacing;
    const baseR = 4;

    // Pulse on current beat: decays over ~125ms
    const beatPulse = isCurrentBeat ? Math.max(0, 1 - timeSinceBeat * 8) * 2 : 0;
    const r = baseR + beatPulse;

    ctx.beginPath();
    ctx.arc(dotX, dotY, r, 0, Math.PI * 2);

    if (isCurrentBeat) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.90)";
    } else if (isDownbeat) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.20)";
    }
    ctx.fill();
  }
}
