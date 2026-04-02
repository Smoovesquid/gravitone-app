import {
  playMagnetarWobble,
  playDecaySound,
  playExplosion,
  shouldDecay,
  getWobbleFreq,
} from "../audio/magnetar";
import { spawnParticlesAt } from "../physics/particles";

/**
 * Run the magnetar state machine for all black hole wells.
 * Handles: decay trigger → decay progress → magnetar explosion → wobble bass → fade out.
 * Mutates well properties and s.particles in place.
 * @param {import('../types').GameState} s
 * @param {number} dt - delta time in seconds
 */
export function tickMagnetars(s, dt) {
  for (const w of s.wells) {
    if (w.type !== "blackhole") continue;

    // Check for decay trigger
    if (!w.decaying && !w.magnetar && shouldDecay(w, s.time)) {
      w.decaying = true;
      w.decayStart = s.time;
      w.decayDuration = 4; // 4 seconds of decay before explosion
      const pan = (w.x / s.width) * 2 - 1;
      playDecaySound(s.audioCtx, pan);
    }

    // Decaying: visual distortion builds, then explodes into magnetar
    if (w.decaying && !w.magnetar) {
      const decayProgress = (s.time - w.decayStart) / w.decayDuration;
      w.decayProgress = decayProgress;

      if (decayProgress >= 1) {
        // EXPLODE into magnetar
        w.magnetar = true;
        w.decaying = false;
        w.magnetarStart = s.time;
        w.wobbleFreq = getWobbleFreq();
        w.lastWobble = 0;
        w.magnetarIntensity = 1;
        const pan = (w.x / s.width) * 2 - 1;
        playExplosion(s.audioCtx, pan);
        spawnParticlesAt(s, w.x, w.y, 30);
      }
    }

    // Magnetar: play wobble bass on beat
    if (w.magnetar) {
      const magnetarAge = s.time - w.magnetarStart;
      // Wobble intensity fades over 30 seconds
      w.magnetarIntensity = Math.max(0, 1 - magnetarAge / 30);

      // Wobble on every other eighth note
      const eighthDur = 60 / s.bpm / 2;
      const currEighth = Math.floor(s.time / eighthDur);
      if (currEighth !== w.lastWobble && currEighth % 2 === 0) {
        w.lastWobble = currEighth;
        if (w.magnetarIntensity > 0.05) {
          const pan = (w.x / s.width) * 2 - 1;
          playMagnetarWobble(s.audioCtx, w.wobbleFreq, pan, w.magnetarIntensity);
          w.pulsePhase = s.time;
        }
      }

      // When intensity reaches 0, magnetar dies — becomes inert
      if (w.magnetarIntensity <= 0) {
        w.magnetar = false;
        w.magnetarDead = true;
      }
    }
  }
}
