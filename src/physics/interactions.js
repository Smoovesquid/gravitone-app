// Object-to-object proximity interaction system.
// Each frame, scans all object pairs and applies musical modulation
// when cosmic objects are placed near each other.

/**
 * Interaction table — defines what happens when objects are near each other.
 * Each entry: { radius, apply(a, b, dist, s, dt) }
 */
const INTERACTION_TABLE = {
  // Magnetar → Tone Well: detuning (phase modulation on nearby pitch)
  "magnetar:tone": {
    radius: 200,
    apply(magnetar, toneWell, dist, s, dt) {
      if (!magnetar.magnetar || magnetar.magnetarIntensity <= 0) return;
      const proximity = 1 - dist / 200;
      const intensity = magnetar.magnetarIntensity;
      // Detune the tone well's frequency based on magnetar wobble
      const wobble = Math.sin(s.time * (magnetar.wobbleFreq || 6)) * proximity * intensity;
      toneWell._detuneAmount = wobble * 30; // up to 30 cents detune
      toneWell._interactionSource = "magnetar";
    },
  },

  // Tone Well ↔ Tone Well: sympathetic resonance (volume boost)
  "tone:tone": {
    radius: 250,
    apply(wellA, wellB, dist, s, dt) {
      const beatFreq = Math.abs((wellA.freq || 440) - (wellB.freq || 440));
      const proximity = 1 - dist / 250;
      if (beatFreq < 20) {
        // Amplitude modulation — sympathetic resonance
        const amEnvelope = 0.5 + 0.5 * Math.sin(s.time * beatFreq * Math.PI * 2);
        wellA._resonanceBoost = proximity * 0.4 * amEnvelope;
        wellB._resonanceBoost = proximity * 0.4 * amEnvelope;
        wellA._beatFreq = beatFreq;
        wellB._beatFreq = beatFreq;
      } else {
        // Still linked but weaker — gain boost only
        wellA._resonanceBoost = proximity * 0.15;
        wellB._resonanceBoost = proximity * 0.15;
      }
      wellA._interactionSource = "resonance";
      wellB._interactionSource = "resonance";
    },
  },

  // Pulsar → Drum Well: phase-lock pulsar gate to drum well BPM
  "pulsar:drum": {
    radius: 250,
    apply(pulsar, drumWell, dist, s, dt) {
      const proximity = 1 - dist / 250;
      // Intensify the gate effect on the drum well
      drumWell._pulsarLock = proximity;
      drumWell._interactionSource = "pulsar";
      // Visual: make the drum well pulse with the pulsar's beat
      if ((pulsar.pulsarSweepIntensity || 0) > 0.5) {
        drumWell.pulsePhase = s.time;
      }
    },
  },

  // Neutron Star → Warp Station: multiply warp intensity by proximity
  "neutronstar:station": {
    radius: 200,
    apply(neutron, station, dist, s, dt) {
      const proximity = 1 - dist / 200;
      // Boost the station's effective warp radius and intensity
      station._warpBoost = 1 + proximity * (neutron.neutronHeat || 0) * 2;
      station._interactionSource = "neutronstar";
    },
  },

  // Quasar beam → Tone Well: add harmonic overtone at beam frequency
  "quasar:tone": {
    radius: null, // uses jet length, not circular radius
    apply(quasar, toneWell, dist, s, dt) {
      const jetLen = quasar.quasarJetLength || 120;
      const intensity = quasar.quasarIntensity || 0;
      if (intensity < 0.1) return;

      // Check if tone well is in the beam path
      const dx = toneWell.x - quasar.x;
      const dy = toneWell.y - quasar.y;
      const cosA = Math.cos(quasar.quasarAngle || 0);
      const sinA = Math.sin(quasar.quasarAngle || 0);
      const along = dx * cosA + dy * sinA;
      const perp = Math.abs(-dx * sinA + dy * cosA);
      const beamWidth = 40; // wider cone for well interaction

      if (Math.abs(along) < jetLen && perp < beamWidth) {
        const falloff = 1 - perp / beamWidth;
        toneWell._quasarOvertone = falloff * intensity;
        toneWell._interactionSource = "quasar";
      }
    },
  },

  // Black Hole → Pulsar: slow the pulsar's spin rate
  "blackhole:pulsar": {
    radius: 300,
    apply(blackhole, pulsar, dist, s, dt) {
      if (blackhole.magnetar) return; // magnetars don't slow pulsars
      const proximity = 1 - dist / 300;
      // Time dilation effect — slow the pulsar's rotation
      pulsar._spinDrag = proximity * 0.6; // up to 60% slowdown
      pulsar._interactionSource = "blackhole";
    },
  },

  // Two Magnetars: beat frequency tremolo when LFOs are close
  "magnetar:magnetar": {
    radius: 300,
    apply(magA, magB, dist, s, dt) {
      if (!magA.magnetar || !magB.magnetar) return;
      if (magA.magnetarIntensity <= 0 || magB.magnetarIntensity <= 0) return;
      const freqA = magA.wobbleFreq || 6;
      const freqB = magB.wobbleFreq || 6;
      const beatFreq = Math.abs(freqA - freqB);
      if (beatFreq < 20) {
        const proximity = 1 - dist / 300;
        const tremolo = 0.5 + 0.5 * Math.sin(s.time * beatFreq * Math.PI * 2);
        magA._magnetarTremolo = proximity * tremolo * magB.magnetarIntensity;
        magB._magnetarTremolo = proximity * tremolo * magA.magnetarIntensity;
      }
    },
  },

  // Warp Station compounding: multiple stations amplify each other
  "station:station": {
    radius: 350,
    apply(stationA, stationB, dist, s, dt) {
      const proximity = 1 - dist / 350;
      // Each station boosts the other's radius
      stationA._warpBoost = (stationA._warpBoost || 1) + proximity * 0.5;
      stationB._warpBoost = (stationB._warpBoost || 1) + proximity * 0.5;
      stationA._interactionSource = "station";
      stationB._interactionSource = "station";
    },
  },
};

/**
 * Apply all proximity interactions between objects.
 * Call once per frame in the game loop.
 * @param {import('../types').GameState} s
 * @param {number} dt
 */
export function applyProximityEffects(s, dt) {
  const wells = s.wells;
  const len = wells.length;

  // Reset per-frame interaction state
  for (const w of wells) {
    w._detuneAmount = 0;
    w._resonanceBoost = 0;
    w._pulsarLock = 0;
    w._warpBoost = 1;
    w._quasarOvertone = 0;
    w._spinDrag = 0;
    w._magnetarTremolo = 0;
    w._beatFreq = 0;
    w._interactionSource = null;
  }

  // Store active interactions for rendering connection lines
  s._activeInteractions = [];

  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < len; j++) {
      const a = wells[i];
      const b = wells[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Try direct type match
      const effTypeA = (a.type === "blackhole" && a.magnetar) ? "magnetar" : a.type;
      const effTypeB = (b.type === "blackhole" && b.magnetar) ? "magnetar" : b.type;

      const key1 = `${effTypeA}:${effTypeB}`;
      const key2 = `${effTypeB}:${effTypeA}`;

      let interaction = INTERACTION_TABLE[key1];
      let source = a, target = b;

      if (!interaction) {
        interaction = INTERACTION_TABLE[key2];
        if (interaction) { source = b; target = a; }
      }

      if (!interaction) continue;

      // Radius check (null radius = special check inside apply)
      if (interaction.radius !== null && dist >= interaction.radius) continue;

      interaction.apply(source, target, dist, s, dt);

      // Track for visual rendering
      const radius = interaction.radius || (source.quasarJetLength || 120);
      s._activeInteractions.push({
        sourceIdx: wells.indexOf(source),
        targetIdx: wells.indexOf(target),
        sourceType: effTypeA === effTypeB ? effTypeA : (source === a ? effTypeA : effTypeB),
        targetType: effTypeA === effTypeB ? effTypeB : (target === a ? effTypeA : effTypeB),
        key: interaction === INTERACTION_TABLE[key1] ? key1 : key2,
        dist,
        radius,
        alpha: Math.max(0, 1 - dist / radius),
      });
    }
  }

  // Apply spin drag to pulsars (from black holes)
  for (const w of wells) {
    if (w.type === "pulsar" && w._spinDrag > 0) {
      // Reduce beam rotation speed for this frame
      // Applied in tickPulsars via this property
      w._effectiveSpinMult = 1 - w._spinDrag;
    } else if (w.type === "pulsar") {
      w._effectiveSpinMult = 1;
    }
  }
}
