// Render connection lines between interacting objects.
// Each interaction pair has a distinct visual grammar per DESIGN.md.

/**
 * Draw all active interaction connection lines.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState} s
 */
export function drawInteractions(ctx, s) {
  const interactions = s._activeInteractions;
  if (!interactions || interactions.length === 0) return;

  for (const ix of interactions) {
    const a = s.wells[ix.sourceIdx];
    const b = s.wells[ix.targetIdx];
    if (!a || !b) continue;

    const alpha = ix.alpha;
    if (alpha < 0.01) continue;

    switch (ix.key) {
      case "pulsar:drum":
      case "pulsar:tone":
        _drawPulsarGateLine(ctx, s, a, b, alpha);
        break;
      case "neutronstar:station":
        _drawNeutronWarpLine(ctx, a, b, alpha);
        break;
      case "quasar:tone":
        _drawQuasarBeamSpike(ctx, s, a, b, alpha);
        break;
      case "tone:tone":
        _drawResonanceArc(ctx, a, b, alpha);
        break;
      case "magnetar:tone":
        _drawMagnetarDetuneLine(ctx, s, a, b, alpha);
        break;
      case "blackhole:pulsar":
        _drawTimeDilationLine(ctx, a, b, alpha);
        break;
      case "magnetar:magnetar":
        _drawMagnetarBeatLine(ctx, s, a, b, alpha);
        break;
      case "station:station":
        _drawStationCompoundLine(ctx, a, b, alpha);
        break;
      default:
        break;
    }
  }
}

// Pulsar → gated well: dashed line, cool blue, alpha pulses on gate beat
function _drawPulsarGateLine(ctx, s, pulsar, target, alpha) {
  const gateActive = target.gateUntil && target.gateUntil > s.time;
  const baseAlpha = gateActive ? 0.25 : 0.06;
  ctx.strokeStyle = `rgba(204, 232, 255, ${alpha * baseAlpha})`;
  ctx.lineWidth = gateActive ? 1.5 : 0.5;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(pulsar.x, pulsar.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Neutron Star → Warp Station: solid curve, orange-red
function _drawNeutronWarpLine(ctx, neutron, station, alpha) {
  const baseAlpha = 0.15;
  ctx.strokeStyle = `rgba(255, 80, 30, ${alpha * baseAlpha})`;
  ctx.lineWidth = 1;
  // Curved line via quadratic bezier (midpoint offset)
  const mx = (neutron.x + station.x) / 2;
  const my = (neutron.y + station.y) / 2 - 30;
  ctx.beginPath();
  ctx.moveTo(neutron.x, neutron.y);
  ctx.quadraticCurveTo(mx, my, station.x, station.y);
  ctx.stroke();
}

// Quasar beam → tone well: short radial spike on well edge
function _drawQuasarBeamSpike(ctx, s, quasar, toneWell, alpha) {
  const overtone = toneWell._quasarOvertone || 0;
  if (overtone < 0.05) return;

  // Draw spike radiating from tone well toward quasar
  const dx = quasar.x - toneWell.x;
  const dy = quasar.y - toneWell.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;
  const nx = dx / dist;
  const ny = dy / dist;

  const spikeLen = 15 * overtone;
  const baseR = 3 + (toneWell.mass || 50) / 15;

  ctx.strokeStyle = `rgba(220, 240, 255, ${overtone * 0.4})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(toneWell.x + nx * baseR, toneWell.y + ny * baseR);
  ctx.lineTo(toneWell.x + nx * (baseR + spikeLen), toneWell.y + ny * (baseR + spikeLen));
  ctx.stroke();
}

// Tone well ↔ Tone well: dotted arc, very faint white
function _drawResonanceArc(ctx, wellA, wellB, alpha) {
  const baseAlpha = 0.06;
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * baseAlpha})`;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 4]);
  // Arc via quadratic bezier
  const mx = (wellA.x + wellB.x) / 2;
  const my = (wellA.y + wellB.y) / 2 - 20;
  ctx.beginPath();
  ctx.moveTo(wellA.x, wellA.y);
  ctx.quadraticCurveTo(mx, my, wellB.x, wellB.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Magnetar → tone well: wavy line (sin-perturbed), cyan-green
function _drawMagnetarDetuneLine(ctx, s, magnetar, toneWell, alpha) {
  const detune = Math.abs(toneWell._detuneAmount || 0);
  if (detune < 0.5) return;

  const baseAlpha = 0.08;
  ctx.strokeStyle = `rgba(0, 255, 200, ${alpha * baseAlpha})`;
  ctx.lineWidth = 0.8;

  const dx = toneWell.x - magnetar.x;
  const dy = toneWell.y - magnetar.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;

  const steps = 30;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = magnetar.x + dx * t;
    const py = magnetar.y + dy * t;
    // Perpendicular wave
    const waveAmp = detune * 0.3;
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const wave = Math.sin(t * 12 + s.time * 8) * waveAmp;
    const wx = px + perpX * wave;
    const wy = py + perpY * wave;
    if (i === 0) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  }
  ctx.stroke();
}

// Black hole → Pulsar: solid dim line representing time dilation
function _drawTimeDilationLine(ctx, blackhole, pulsar, alpha) {
  const drag = pulsar._spinDrag || 0;
  if (drag < 0.05) return;

  ctx.strokeStyle = `rgba(160, 60, 255, ${alpha * 0.10})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(blackhole.x, blackhole.y);
  ctx.lineTo(pulsar.x, pulsar.y);
  ctx.stroke();
}

// Magnetar ↔ Magnetar: pulsing line showing beat frequency interference
function _drawMagnetarBeatLine(ctx, s, magA, magB, alpha) {
  const tremA = magA._magnetarTremolo || 0;
  const tremB = magB._magnetarTremolo || 0;
  const trem = Math.max(tremA, tremB);
  if (trem < 0.05) return;

  ctx.strokeStyle = `rgba(0, 255, 200, ${alpha * trem * 0.20})`;
  ctx.lineWidth = 1 + trem * 2;
  ctx.beginPath();
  ctx.moveTo(magA.x, magA.y);
  ctx.lineTo(magB.x, magB.y);
  ctx.stroke();
}

// Station ↔ Station: gold dotted compound line
function _drawStationCompoundLine(ctx, stationA, stationB, alpha) {
  ctx.strokeStyle = `rgba(255, 204, 51, ${alpha * 0.10})`;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.moveTo(stationA.x, stationA.y);
  ctx.lineTo(stationB.x, stationB.y);
  ctx.stroke();
  ctx.setLineDash([]);
}
