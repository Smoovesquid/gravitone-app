import { PALETTE } from "../data/palette";
import { DRUM_TYPES } from "../audio/drums";
import { getNoteName } from "../audio/scales";

/**
 * Draw all wells in the scene.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../types').GameState} s
 */
export function drawWells(ctx, s) {
  for (const w of s.wells) {
    // Hover scale + removal animation wrapper
    const hs = w.hoverScale || 1;
    const removing = w.removing && w.removeProgress != null;
    let drawScale = hs;
    let drawAlpha = 1;

    if (removing) {
      const t = Math.min(w.removeProgress, 1);
      // Phase 1 (0→0.5): scale up to 1.2×; Phase 2 (0.5→1): scale to 0
      drawScale = t < 0.5 ? hs * (1 + t * 0.4) : hs * (1.2 - (t - 0.5) * 2.4);
      drawAlpha = 1 - t;
    }

    // Visitor eat/build animation
    if (w._eatScale != null)   drawScale *= w._eatScale;
    if (w._buildScale != null) drawScale *= w._buildScale;

    // Dance pulse — wells bob to their taught genre's BPM
    if (w._danceAmp > 0 && w._danceBpm) {
      const bpmRad  = (w._danceBpm / 60) * Math.PI * 2;
      const phase   = s.time * bpmRad + (w.x * 0.009 + w.y * 0.006);
      drawScale *= 1 + (w._danceAmp / 115) * Math.sin(phase);
    }

    const needsTransform = drawScale !== 1 || drawAlpha !== 1;
    if (needsTransform) {
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.scale(drawScale, drawScale);
      ctx.translate(-w.x, -w.y);
      ctx.globalAlpha = Math.max(0, drawAlpha);
    }

    // Removal flash at peak (t ≈ 0.5)
    if (removing) {
      const t = w.removeProgress;
      if (t > 0.4 && t < 0.6) {
        const flashIntensity = 1 - Math.abs(t - 0.5) * 10;
        const flashGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 20);
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashIntensity * 0.7})`);
        flashGrad.addColorStop(1, "transparent");
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(w.x, w.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ======= LOOPER (Record/Play Ring) =======
    if (w.type === "looper" && w.looper) {
      _drawLooper(ctx, s, w);
    } else if (w.type === "pulsar") {
      _drawPulsar(ctx, s, w);
    } else if (w.type === "neutronstar") {
      _drawNeutronStar(ctx, s, w);
    } else if (w.type === "quasar") {
      _drawQuasar(ctx, s, w);
    } else if (w.type === "station") {
      _drawStation(ctx, s, w);
    } else if (w.type === "blackhole") {
      _drawBlackhole(ctx, s, w);
    } else if (w.type === "drum") {
      _drawDrumWell(ctx, s, w);
    } else {
      _drawToneWell(ctx, s, w);
    }

    // Cruiser tractor-beam control ring (pulsing yellowish-green halo)
    if (w.cruiserControlled && s.cruiser && s.cruiser.state === 'active') {
      const pulse = (Math.sin(s.cruiser.beamPulsePhase + w.x * 0.008) + 1) / 2;
      const ringR = (w.mass || 50) / 2 + 14;
      ctx.beginPath();
      ctx.arc(w.x, w.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180,255,100,${(0.14 + pulse * 0.26).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Visitor session aura — glowing halo while a ship is actively working this well
    if (w._danceVisitor && w._danceRgb) {
      const pulse  = (Math.sin(s.time * 3.2 + w.x * 0.012) + 1) / 2;
      const ringR  = (w.mass || 50) / 2 + 18 + pulse * 7;
      const grad   = ctx.createRadialGradient(w.x, w.y, ringR * 0.6, w.x, w.y, ringR * 1.4);
      grad.addColorStop(0, `rgba(${w._danceRgb},${(0.22 + pulse * 0.2).toFixed(2)})`);
      grad.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(w.x, w.y, ringR * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
    }

    // Taught glow — faint permanent colored halos from each genre that visited
    if (w._learnedFrom?.length && !w._danceVisitor) {
      const recent = w._learnedFrom[w._learnedFrom.length - 1];
      if (recent) {
        // Mini orbiting dots — one per genre learned
        w._learnedFrom.forEach((lf, idx) => {
          const angle = s.time * 0.6 + idx * (Math.PI * 2 / w._learnedFrom.length);
          const dotR  = (w.mass || 50) / 2 + 14;
          ctx.beginPath();
          ctx.arc(w.x + Math.cos(angle) * dotR, w.y + Math.sin(angle) * dotR, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,0.18)`;
          ctx.fill();
        });
      }
    }

    if (needsTransform) {
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// Private draw helpers
// ---------------------------------------------------------------------------

function _drawLooper(ctx, s, w) {
  const lp = w.looper;
  const r = lp.radius;
  const rf = lp.recordFade; // 1=recording, 0=playing

  // Interpolate colors: gold (recording) ↔ cyan (playing)
  const ringR = Math.round(255 * rf + 100 * (1 - rf));
  const ringG = Math.round(200 * rf + 200 * (1 - rf));
  const ringB = Math.round(50 * rf + 255 * (1 - rf));

  // Outer glow
  const outerGrad = ctx.createRadialGradient(w.x, w.y, r * 0.8, w.x, w.y, r * 1.3);
  outerGrad.addColorStop(0, `rgba(${ringR},${ringG},${ringB},0.04)`);
  outerGrad.addColorStop(1, "transparent");
  ctx.fillStyle = outerGrad;
  ctx.beginPath(); ctx.arc(w.x, w.y, r * 1.3, 0, Math.PI * 2); ctx.fill();

  // Ring — pulses brighter when recording
  const ringAlpha = lp.recording ? (0.2 + Math.sin(s.time * 4) * 0.08) : 0.15;
  ctx.strokeStyle = `rgba(${ringR},${ringG},${ringB},${ringAlpha})`;
  ctx.lineWidth = lp.recording ? 2.5 : 1.5;
  ctx.beginPath(); ctx.arc(w.x, w.y, r, 0, Math.PI * 2); ctx.stroke();

  // Beat hashmarks — 16th note subdivisions
  const totalSixteenths = lp.bars * 16;
  for (let si = 0; si < totalSixteenths; si++) {
    const tickAngle = (si / totalSixteenths) * Math.PI * 2;
    const isDownbeat = si % 16 === 0;
    const isBeat = si % 4 === 0;
    const isEighth = si % 2 === 0;

    let tickLen, alpha, lw;
    if (isDownbeat) {
      tickLen = 12; alpha = 0.4; lw = 1.5;
    } else if (isBeat) {
      tickLen = 8; alpha = 0.25; lw = 1;
    } else if (isEighth) {
      tickLen = 5; alpha = 0.12; lw = 0.7;
    } else {
      tickLen = 3; alpha = 0.06; lw = 0.5;
    }

    const innerR = r - tickLen;
    const bx1 = w.x + Math.sin(tickAngle) * innerR;
    const by1 = w.y - Math.cos(tickAngle) * innerR;
    const bx2 = w.x + Math.sin(tickAngle) * r;
    const by2 = w.y - Math.cos(tickAngle) * r;
    ctx.strokeStyle = `rgba(${ringR},${ringG},${ringB},${alpha})`;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
  }

  // Events on the ring
  for (const evt of lp.events) {
    const ex = w.x + Math.sin(evt.angle) * r;
    const ey = w.y - Math.cos(evt.angle) * r;
    const flash = evt.lastFired && (s.time - evt.lastFired) < 0.12 ? 1 : 0;

    ctx.beginPath();
    ctx.arc(ex, ey, 3 + flash * 5, 0, Math.PI * 2);
    if (evt.type === "drum") {
      ctx.fillStyle = DRUM_TYPES[evt.drumType]?.color.core || "#fff";
    } else {
      ctx.fillStyle = PALETTE[(evt.noteIdx || 0) % PALETTE.length].core;
    }
    ctx.globalAlpha = 0.5 + flash * 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Playhead
  const phAngle = lp.playheadAngle;
  const phx = w.x + Math.sin(phAngle) * r;
  const phy = w.y - Math.cos(phAngle) * r;
  ctx.beginPath(); ctx.arc(phx, phy, 5, 0, Math.PI * 2);
  ctx.fillStyle = lp.recording ? `rgba(255,200,50,0.9)` : `rgba(100,200,255,0.9)`;
  ctx.fill();

  // Sweep line
  ctx.strokeStyle = `rgba(${ringR},${ringG},${ringB},0.08)`;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(phx, phy); ctx.stroke();

  // Core
  const coreColor = lp.recording ? "#FFCC33" : "#66CCFF";
  const coreGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 6);
  coreGrad.addColorStop(0, "#fff");
  coreGrad.addColorStop(0.5, coreColor);
  coreGrad.addColorStop(1, "transparent");
  ctx.fillStyle = coreGrad;
  ctx.beginPath(); ctx.arc(w.x, w.y, 6, 0, Math.PI * 2); ctx.fill();

  // Label
  ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.font = "8px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const stateLabel = lp.recording ? "rec" : "play";
  ctx.fillText(
    `${stateLabel} \u00b7 ${lp.bars}bar \u00b7 ${lp.events.length}`,
    w.x, w.y + r + 14
  );
}

function _drawStation(ctx, s, w) {
  const wr = w.warpRadius;

  // Warp radius indicator
  ctx.strokeStyle = "rgba(255,204,51,0.06)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 10]);
  ctx.beginPath(); ctx.arc(w.x, w.y, wr, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // Connection lines to affected wells
  for (const ow of s.wells) {
    if (ow === w || ow.type === "station" || ow.type === "looper") continue;
    const dx = ow.x - w.x, dy = ow.y - w.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < wr) {
      const alpha = (1 - dist / wr) * 0.15;
      ctx.strokeStyle = `rgba(255,204,51,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(ow.x, ow.y); ctx.stroke();
    }
  }

  // Rotating rings (space station look)
  ctx.save(); ctx.translate(w.x, w.y);
  for (let ring = 0; ring < 3; ring++) {
    const ringR = 12 + ring * 6;
    const rot = s.time * (0.5 + ring * 0.3) * (ring % 2 === 0 ? 1 : -1);
    ctx.save(); ctx.rotate(rot);
    ctx.strokeStyle = `rgba(255,204,51,${0.15 - ring * 0.03})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, ringR, ringR * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Core
  const coreGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 6);
  coreGrad.addColorStop(0, "#fff");
  coreGrad.addColorStop(0.4, "#FFCC33");
  coreGrad.addColorStop(1, "transparent");
  ctx.fillStyle = coreGrad;
  ctx.beginPath(); ctx.arc(w.x, w.y, 6, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.font = "8px monospace";
  ctx.textAlign = "center"; ctx.fillText("warp", w.x, w.y + 28);
}

function _drawBlackhole(ctx, s, w) {
  const eventHorizon = 12 + w.mass / 20;
  const accretionRadius = eventHorizon * 3;
  const pulseDelta = s.time - w.pulsePhase;
  const pulseIntensity = pulseDelta < 0.5 ? 1 - pulseDelta / 0.5 : 0;

  // Magnetar mode — completely different visual
  if (w.magnetar) {
    const mi = w.magnetarIntensity;
    const wobblePhase = s.time * 8;

    const fieldR = accretionRadius * (1.5 + Math.sin(wobblePhase) * 0.3 * mi);
    const fieldGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, fieldR);
    fieldGrad.addColorStop(0, `rgba(0,255,200,${0.1 * mi})`);
    fieldGrad.addColorStop(0.4, `rgba(0,180,255,${0.06 * mi})`);
    fieldGrad.addColorStop(1, "transparent");
    ctx.fillStyle = fieldGrad;
    ctx.beginPath(); ctx.arc(w.x, w.y, fieldR, 0, Math.PI * 2); ctx.fill();

    // Magnetic field lines — spinning fast
    ctx.save(); ctx.translate(w.x, w.y);
    for (let arm = 0; arm < 6; arm++) {
      ctx.beginPath();
      const baseAngle = (arm / 6) * Math.PI * 2 + s.time * 4;
      for (let t = 0; t <= 1; t += 0.02) {
        const r = eventHorizon * 0.5 + accretionRadius * 1.5 * t;
        const angle = baseAngle + t * Math.PI * 1.5 * (arm % 2 === 0 ? 1 : -1);
        const wobble = Math.sin(t * 10 + wobblePhase) * 5 * mi;
        const px = Math.cos(angle) * r + wobble;
        const py = Math.sin(angle) * r + wobble;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(0,255,200,${(0.08 + pulseIntensity * 0.12) * mi})`;
      ctx.lineWidth = 1 + pulseIntensity * 2;
      ctx.stroke();
    }
    ctx.restore();

    // Core — bright cyan/white, pulsing with wobble
    const corePulse = 1 + Math.sin(wobblePhase) * 0.3 * mi;
    const coreR = eventHorizon * corePulse;
    const coreGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, coreR);
    coreGrad.addColorStop(0, `rgba(255,255,255,${0.9 * mi})`);
    coreGrad.addColorStop(0.3, `rgba(0,255,220,${0.6 * mi})`);
    coreGrad.addColorStop(0.7, `rgba(0,100,255,${0.3 * mi})`);
    coreGrad.addColorStop(1, "transparent");
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(w.x, w.y, coreR, 0, Math.PI * 2); ctx.fill();

    // Border pulse
    ctx.strokeStyle = `rgba(0,255,200,${(0.4 + pulseIntensity * 0.4) * mi})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(w.x, w.y, coreR, 0, Math.PI * 2); ctx.stroke();

    // Label
    if (mi > 0.1) {
      ctx.fillStyle = `rgba(0,255,200,${0.3 * mi})`; ctx.font = "bold 8px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("MAGNETAR", w.x, w.y + coreR + 12);
    }
    return;
  }

  // Decaying black hole — visual distortion builds
  const decayShake = w.decaying ? (w.decayProgress || 0) * 4 : 0;
  const shakeX = decayShake > 0 ? Math.sin(s.time * 30) * decayShake : 0;
  const shakeY = decayShake > 0 ? Math.cos(s.time * 25) * decayShake : 0;
  const drawX = w.x + shakeX;
  const drawY = w.y + shakeY;

  if (w.decaying) {
    const dp = w.decayProgress || 0;
    const decayGrad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, accretionRadius * 2);
    decayGrad.addColorStop(0, `rgba(255,${Math.round(100 - dp * 80)},0,${dp * 0.15})`);
    decayGrad.addColorStop(1, "transparent");
    ctx.fillStyle = decayGrad;
    ctx.beginPath(); ctx.arc(drawX, drawY, accretionRadius * 2, 0, Math.PI * 2); ctx.fill();
  }

  const outerGrad = ctx.createRadialGradient(drawX, drawY, accretionRadius * 0.5, drawX, drawY, accretionRadius * 2);
  outerGrad.addColorStop(0, "rgba(60,0,100,0.06)");
  outerGrad.addColorStop(1, "transparent");
  ctx.fillStyle = outerGrad;
  ctx.beginPath(); ctx.arc(drawX, drawY, accretionRadius * 2, 0, Math.PI * 2); ctx.fill();

  ctx.save(); ctx.translate(drawX, drawY);
  const armSpeed = w.decaying ? 1.2 + (w.decayProgress || 0) * 4 : 1.2;
  for (let arm = 0; arm < 4; arm++) {
    ctx.beginPath();
    const baseAngle = (arm / 4) * Math.PI * 2 + s.time * armSpeed;
    for (let t = 0; t <= 1; t += 0.03) {
      const r = eventHorizon + (accretionRadius - eventHorizon) * (1 - t);
      const angle = baseAngle + t * Math.PI * 2;
      if (t === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    const armColor = w.decaying
      ? `rgba(${160 + Math.round((w.decayProgress || 0) * 95)},60,255,${0.06 + pulseIntensity * 0.06})`
      : `rgba(160,60,255,${0.06 + pulseIntensity * 0.06})`;
    ctx.strokeStyle = armColor;
    ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();

  const diskGrad = ctx.createRadialGradient(drawX, drawY, eventHorizon * 0.8, drawX, drawY, accretionRadius);
  diskGrad.addColorStop(0, `rgba(180,80,255,${0.12 + pulseIntensity * 0.15})`);
  diskGrad.addColorStop(0.5, "rgba(120,30,200,0.05)");
  diskGrad.addColorStop(1, "transparent");
  ctx.fillStyle = diskGrad;
  ctx.beginPath(); ctx.arc(drawX, drawY, accretionRadius, 0, Math.PI * 2); ctx.fill();

  const voidGrad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, eventHorizon);
  voidGrad.addColorStop(0, "#000");
  voidGrad.addColorStop(0.6, "#000");
  voidGrad.addColorStop(1, "rgba(40,0,60,0.8)");
  ctx.fillStyle = voidGrad;
  ctx.beginPath(); ctx.arc(drawX, drawY, eventHorizon, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = `rgba(200,100,255,${0.3 + pulseIntensity * 0.3})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(drawX, drawY, eventHorizon, 0, Math.PI * 2); ctx.stroke();
}

function _drawDrumWell(ctx, s, w) {
  const pulseDelta = s.time - w.pulsePhase;
  const pulseIntensity = pulseDelta < 0.12 ? 1 - pulseDelta / 0.12 : 0;
  const baseSize = 4 + w.mass / 25;
  const size = baseSize + pulseIntensity * 8;

  const fieldRadius = 30 + w.mass * 0.4;
  const fieldGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, fieldRadius);
  fieldGrad.addColorStop(0, w.color.glow);
  fieldGrad.addColorStop(1, "transparent");
  ctx.fillStyle = fieldGrad;
  ctx.beginPath(); ctx.arc(w.x, w.y, fieldRadius, 0, Math.PI * 2); ctx.fill();

  if (pulseIntensity > 0) {
    const pGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, size * 3);
    pGrad.addColorStop(0, w.color.glow.replace("0.4", `${pulseIntensity * 0.5}`));
    pGrad.addColorStop(1, "transparent");
    ctx.fillStyle = pGrad;
    ctx.beginPath(); ctx.arc(w.x, w.y, size * 3, 0, Math.PI * 2); ctx.fill();
  }

  ctx.save(); ctx.translate(w.x, w.y);
  ctx.beginPath();
  ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath();
  const dGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  dGrad.addColorStop(0, "#fff");
  dGrad.addColorStop(0.4, w.color.core);
  dGrad.addColorStop(1, w.color.glow);
  ctx.fillStyle = dGrad; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5); ctx.lineTo(0, size * 0.5);
  ctx.moveTo(-size * 0.5, 0); ctx.lineTo(size * 0.5, 0);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = `rgba(255,255,255,${0.35 + pulseIntensity * 0.4})`;
  ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(w.drumType[0].toUpperCase(), w.x, w.y + size + 10);
}

function _drawToneWell(ctx, s, w) {
  const pulseDelta = s.time - w.pulsePhase;
  const pulseIntensity = pulseDelta < 0.3 ? 1 - pulseDelta / 0.3 : 0;
  const baseRadius = 3 + (w.mass / 15);
  const pulseRadius = baseRadius + pulseIntensity * 15;

  // Amplitude-responsive glow: pulseIntensity acts as RMS proxy (0-1)
  // Max 40% boost per DESIGN.md
  const glowBoost = 1 + 0.4 * pulseIntensity;
  const fieldRadius = (60 + w.mass) * glowBoost;
  const fieldGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, fieldRadius);
  fieldGrad.addColorStop(0, w.color.glow.replace("0.4", "0.06"));
  fieldGrad.addColorStop(0.5, w.color.glow.replace("0.4", "0.02"));
  fieldGrad.addColorStop(1, "transparent");
  ctx.fillStyle = fieldGrad;
  ctx.beginPath(); ctx.arc(w.x, w.y, fieldRadius, 0, Math.PI * 2); ctx.fill();

  if (pulseIntensity > 0) {
    const rGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, pulseRadius * 3);
    rGrad.addColorStop(0, w.color.glow.replace("0.4", `${pulseIntensity * 0.3}`));
    rGrad.addColorStop(1, "transparent");
    ctx.fillStyle = rGrad;
    ctx.beginPath(); ctx.arc(w.x, w.y, pulseRadius * 3, 0, Math.PI * 2); ctx.fill();
  }

  for (let r = 0; r < 3; r++) {
    const ringRadius = 15 + r * 18 + w.mass * 0.3;
    const ringAlpha = 0.04 - r * 0.01;
    const rotation = s.time * (0.3 + r * 0.15) * (r % 2 === 0 ? 1 : -1);
    ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(rotation);
    ctx.strokeStyle = w.color.core;
    ctx.globalAlpha = ringAlpha + pulseIntensity * 0.08;
    ctx.lineWidth = 0.8; ctx.setLineDash([4, 8 + r * 4]);
    ctx.beginPath(); ctx.arc(0, 0, ringRadius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.restore(); ctx.globalAlpha = 1;
  }

  const coreGrad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, pulseRadius);
  coreGrad.addColorStop(0, "#fff");
  coreGrad.addColorStop(0.3, w.color.core);
  coreGrad.addColorStop(1, w.color.glow);
  ctx.fillStyle = coreGrad;
  ctx.beginPath(); ctx.arc(w.x, w.y, pulseRadius, 0, Math.PI * 2); ctx.fill();

  // Note label
  ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.font = "7px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(getNoteName(w.freq) || `${w.noteIdx + 1}`, w.x, w.y + baseRadius + 10);
}

function _drawPulsar(ctx, s, w) {
  const x = w.x;
  const y = w.y;
  const beamLength = 80;
  const coreR = 8;
  const beamAngle = w.pulsarBeamAngle || 0;
  const sweepIntensity = w.pulsarSweepIntensity || 0;

  // 1. Permanent faint beam stubs (always visible — hard lines, NOT glow)
  for (let dir = 0; dir < 2; dir++) {
    const angle = beamAngle + dir * Math.PI;
    const bx = x + Math.cos(angle) * beamLength;
    const by = y + Math.sin(angle) * beamLength;
    const beamGrad = ctx.createLinearGradient(x, y, bx, by);
    beamGrad.addColorStop(0, "rgba(200,224,255,0.10)");
    beamGrad.addColorStop(1, "rgba(200,224,255,0.00)");
    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  // 2. Active sweep — trapezoidal beam on beat flash (hard edges, NOT soft glow)
  if (sweepIntensity > 0) {
    const si = sweepIntensity;
    for (let dir = 0; dir < 2; dir++) {
      const angle = beamAngle + dir * Math.PI;
      const bx = x + Math.cos(angle) * beamLength;
      const by = y + Math.sin(angle) * beamLength;
      const perp = angle + Math.PI / 2;
      const hw0 = 2;  // half-width at core
      const hw1 = 10; // half-width at tip
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(perp) * hw0, y + Math.sin(perp) * hw0);
      ctx.lineTo(bx + Math.cos(perp) * hw1, by + Math.sin(perp) * hw1);
      ctx.lineTo(bx - Math.cos(perp) * hw1, by - Math.sin(perp) * hw1);
      ctx.lineTo(x - Math.cos(perp) * hw0, y - Math.sin(perp) * hw0);
      ctx.closePath();
      ctx.fillStyle = `rgba(204,232,255,${0.35 * si})`;
      ctx.fill();
    }
  }

  // 3. Magnetic pole dots at beam tips
  for (let dir = 0; dir < 2; dir++) {
    const angle = beamAngle + dir * Math.PI;
    const px = x + Math.cos(angle) * beamLength;
    const py = y + Math.sin(angle) * beamLength;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(220,240,255,0.40)";
    ctx.fill();
  }

  // 4. Tri-lobed rotating core (spins faster than beam)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(beamAngle * 1.5);
  for (let lobe = 0; lobe < 3; lobe++) {
    const la = (lobe / 3) * Math.PI * 2;
    const lx = Math.cos(la) * 4;
    const ly = Math.sin(la) * 4;
    const lobeGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 4);
    lobeGrad.addColorStop(0, "#ffffff");
    lobeGrad.addColorStop(0.4, "#cce8ff");
    lobeGrad.addColorStop(1, "transparent");
    ctx.fillStyle = lobeGrad;
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 5. Beat flash on core
  if (sweepIntensity > 0.5) {
    const flash = (sweepIntensity - 0.5) * 2;
    const flashGrad = ctx.createRadialGradient(x, y, 0, x, y, coreR * 2);
    flashGrad.addColorStop(0, `rgba(255,255,255,${flash * 0.9})`);
    flashGrad.addColorStop(1, "transparent");
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(x, y, coreR * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Effect radius indicator (faint dashed circle)
  const pr = w.pulsarRadius || 200;
  ctx.strokeStyle = "rgba(200,224,255,0.04)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(x, y, pr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 7. Connection lines to gated wells
  for (const target of s.wells) {
    if (target === w || target.type === "pulsar" || target.type === "station") continue;
    if (target.gateUntil && target.gateUntil > s.time) {
      const alpha = (target.gateAmount || 0.3) * 0.12;
      ctx.strokeStyle = `rgba(200,224,255,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  }

  // 8. Label
  const rateLabel = w.pulsarGateRate === 1 ? "1/4" : w.pulsarGateRate === 2 ? "1/8" : "1/16";
  ctx.fillStyle = "rgba(200,224,255,0.30)";
  ctx.font = "7px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`pulsar \u00b7 ${rateLabel}`, x, y + coreR + 10);
}

function _drawNeutronStar(ctx, s, w) {
  const x = w.x;
  const y = w.y;
  const r = 14;
  const influenceR = w.neutronInfluenceRadius || 120;
  const heat = w.neutronHeat || 0;
  const spinOffset = (w.neutronSpinAngle || 0);

  // 1. Heat shimmer corona (only when particles are close)
  if (heat > 0.2) {
    const heatR = r + heat * 40;
    const heatGrad = ctx.createRadialGradient(x, y, r, x, y, heatR);
    heatGrad.addColorStop(0, `rgba(255, 100, 40, ${heat * 0.25})`);
    heatGrad.addColorStop(0.5, `rgba(255, 140, 60, ${heat * 0.10})`);
    heatGrad.addColorStop(1, "transparent");
    ctx.fillStyle = heatGrad;
    ctx.beginPath();
    ctx.arc(x, y, heatR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Bright dense base surface (NOT dark — distinguishes from black hole)
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const baseGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
  baseGrad.addColorStop(0, "#ff6644");   // bright hot center
  baseGrad.addColorStop(0.6, "#cc3311"); // warm red-orange
  baseGrad.addColorStop(1, "#881100");   // darker edge
  ctx.fillStyle = baseGrad;
  ctx.fill();

  // 3. Rotating latitude bands (KEY IDENTITY — banded spinning sphere)
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  const bandPeriod = 6;
  const scrollOffset = spinOffset % bandPeriod;
  for (let i = -5; i <= 5; i++) {
    const bandY = y - r + scrollOffset + i * bandPeriod;
    ctx.fillStyle = i % 2 === 0
      ? "rgba(255, 200, 140, 0.30)"  // bright warm band
      : "rgba(140, 20, 0, 0.25)";    // dark red band
    ctx.fillRect(x - r, bandY, r * 2, bandPeriod / 2);
  }
  ctx.restore();

  // 4. Bright rim light (always visible — defines edge, bright not faint)
  const rimAlpha = 0.35 + heat * 0.35;
  ctx.strokeStyle = `rgba(255, 100, 40, ${rimAlpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Specular highlight (makes it look like a sphere, not a flat disk)
  const specGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  specGrad.addColorStop(0, "rgba(255, 255, 255, 0.25)");
  specGrad.addColorStop(0.4, "rgba(255, 200, 150, 0.08)");
  specGrad.addColorStop(1, "transparent");
  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // 6. Influence radius indicator (faint dashed circle)
  ctx.strokeStyle = "rgba(255, 80, 30, 0.04)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(x, y, influenceR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 7. Label
  ctx.fillStyle = "rgba(255, 100, 40, 0.30)";
  ctx.font = "7px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("neutron star", x, y + r + 10);
}

function _drawQuasar(ctx, s, w) {
  const x = w.x;
  const y = w.y;
  const angle = w.quasarAngle || 0;
  const mode = w.quasarMode || "drone";
  const intensity = w.quasarIntensity || 0;
  const jetLength = w.quasarJetLength || 120;

  // Mode colors
  const MODES = {
    drone:   { jet: "#FFB700", jetTip: "#ff9900" },
    power:   { jet: "#cc2244", jetTip: "#991133" },
    cluster: { jet: "#55ff22", jetTip: "#33cc11" },
  };
  const mc = MODES[mode] || MODES.drone;

  // 1. Both jets — tapered trapezoid with gradient
  for (let dir = 0; dir < 2; dir++) {
    const jAngle = angle + dir * Math.PI;
    const jx = x + Math.cos(jAngle) * jetLength;
    const jy = y + Math.sin(jAngle) * jetLength;
    const perpAngle = jAngle + Math.PI / 2;

    // Jet gradient: blue-white core -> mode color -> transparent
    const grad = ctx.createLinearGradient(x, y, jx, jy);
    grad.addColorStop(0, `rgba(220, 240, 255, ${0.60 * intensity})`);
    grad.addColorStop(0.25, _hexToRGBA(mc.jet, 0.45 * intensity));
    grad.addColorStop(0.65, _hexToRGBA(mc.jetTip, 0.25 * intensity));
    grad.addColorStop(1, _hexToRGBA(mc.jetTip, 0.0));

    // Tapered trapezoid shape (narrow at core, wide at tip)
    const hw0 = 2;  // half-width at core
    const hw1 = 10; // half-width at tip
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(perpAngle) * hw0, y + Math.sin(perpAngle) * hw0);
    ctx.lineTo(jx + Math.cos(perpAngle) * hw1, jy + Math.sin(perpAngle) * hw1);
    ctx.lineTo(jx - Math.cos(perpAngle) * hw1, jy - Math.sin(perpAngle) * hw1);
    ctx.lineTo(x - Math.cos(perpAngle) * hw0, y - Math.sin(perpAngle) * hw0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Striation bands along the jet (visible banding within the beam)
    const striationCount = 5;
    for (let si = 0; si < striationCount; si++) {
      const t = (si + 0.5) / striationCount;
      const sx = x + Math.cos(jAngle) * jetLength * t;
      const sy = y + Math.sin(jAngle) * jetLength * t;
      const bandHW = hw0 + (hw1 - hw0) * t;
      const bandAlpha = (1 - t) * 0.15 * intensity;
      ctx.strokeStyle = `rgba(255, 255, 255, ${bandAlpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(perpAngle) * bandHW, sy + Math.sin(perpAngle) * bandHW);
      ctx.lineTo(sx - Math.cos(perpAngle) * bandHW, sy - Math.sin(perpAngle) * bandHW);
      ctx.stroke();
    }

    // Draggable handle at jet tip
    ctx.beginPath();
    ctx.arc(jx, jy, 3, 0, Math.PI * 2);
    ctx.fillStyle = _hexToRGBA(mc.jetTip, 0.60);
    ctx.fill();
  }

  // 2. Streaming micro-particles along jets
  const jetParticles = w.quasarJetParticles || [];
  for (const mp of jetParticles) {
    const t = mp.progress;
    const jAngle = angle + mp.dir * Math.PI;
    const perpAngle = jAngle + Math.PI / 2;
    const px = x + Math.cos(jAngle) * t * jetLength + Math.cos(perpAngle) * mp.offset;
    const py = y + Math.sin(jAngle) * t * jetLength + Math.sin(perpAngle) * mp.offset;
    const alpha = (1 - t) * 0.45 * intensity;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = _hexToRGBA(mc.jet, alpha);
    ctx.fill();
  }

  // 3. Compact bright core (tight 6px gradient, blue-white center)
  const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, 6);
  coreGrad.addColorStop(0, "#ffffff");
  coreGrad.addColorStop(0.3, "#e8f4ff");
  coreGrad.addColorStop(0.6, "#cce0ff");
  coreGrad.addColorStop(1, "transparent");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();

  // 4. Mode label
  const modeLabels = { drone: "DRN", power: "PWR", cluster: "CLU" };
  ctx.fillStyle = _hexToRGBA(mc.jet, 0.40);
  ctx.font = "7px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`quasar \u00b7 ${modeLabels[mode] || "DRN"}`, x, y + 14);
}

/** Convert hex color to rgba string. */
function _hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
