import { THEME } from "../data/theme";
import { getMaxWarp, getWarpParams, playWarpedNote } from "../audio/warp";
import { playNote, playAbsorb } from "../audio/instruments";
import { playDrum } from "../audio/drums";
import { getGateMultiplier } from "../audio/pulsar";
import { canTriggerPair, markPairTriggered, acquireSlot, releaseSlot, cleanupCooldowns } from "../audio/pool";

/**
 * Spawn particles at a position, mutating s.particles in place.
 * @param {import('../types').GameState} s
 * @param {number} x
 * @param {number} y
 * @param {number} [count=1]
 */
export function spawnParticlesAt(s, x, y, count = 1) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 1.5;
    s.particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.0005 + Math.random() * 0.001,
      radius: 1.2 + Math.random() * 1.8,
      trail: [],
      lastNote: 0,
      born: s.time,
    });
  }
}

/**
 * Run one physics tick for all particles: gravity, audio triggers, movement,
 * trail accumulation, and lifecycle culling. Mutates s.particles in place.
 * @param {import('../types').GameState} s
 * @param {number} dt - delta time in seconds
 */
export function tickParticles(s, dt) {
  const physics = THEME.physics;
  const gravMult = physics.gravityMultiplier;
  const maxSpeed = 6 * physics.particleSpeed;
  const stations = s.wells.filter((w) => w.type === "station");

  // Periodic cooldown cleanup (every ~2s)
  if (Math.floor(s.time) !== Math.floor(s.time - dt)) cleanupCooldowns(s.time);

  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    let ax = 0, ay = 0;

    for (const w of s.wells) {
      // Neutron Star: extreme gravity well — denser than tone wells, weaker than black hole
      // Particles spiral inward and orbit, never absorbed
      if (w.type === "neutronstar") {
        const dx = w.x - p.x;
        const dy = w.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist > 1) {
          // Strong gravitational pull (between tone well and black hole)
          const force = (w.mass * 100 * gravMult) / (distSq + 300);
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }
        // Orbital stabilization: prevent collapse into center
        // Add tangential velocity component when close
        const influenceR = w.neutronInfluenceRadius || 120;
        if (dist < influenceR && dist > 5) {
          // Tangential push creates orbital motion
          const tangentStrength = Math.max(0, 1 - dist / influenceR) * 0.8;
          const tx = -dy / dist; // perpendicular to radial direction
          const ty = dx / dist;
          ax += tx * tangentStrength;
          ay += ty * tangentStrength;
          // Slight damping near the star — particles slow down and spiral
          if (dist < influenceR * 0.3) {
            p.vx *= 0.995;
            p.vy *= 0.995;
          }
        }
        // Hard repulsion at core — prevents absorption
        if (dist < 16) {
          const bounce = 4 / Math.max(dist, 2);
          ax -= dx * bounce * 0.6;
          ay -= dy * bounce * 0.6;
        }
        continue;
      }

      // Pulsar: mild gravity + beam fling
      if (w.type === "pulsar") {
        const dx = w.x - p.x;
        const dy = w.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        // Mild attraction
        if (dist > 1) {
          const force = (40 * gravMult) / (distSq + 500);
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }
        // Beam fling: if particle is within beam cone AND within radius, push outward
        if (dist < (w.pulsarRadius || 200) && (w.pulsarSweepIntensity || 0) > 0.3) {
          const angleToParticle = Math.atan2(-dy, -dx); // from pulsar to particle
          const beamAngle = w.pulsarBeamAngle || 0;
          const diff0 = Math.abs(((angleToParticle - beamAngle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          const diff1 = Math.abs(((angleToParticle - beamAngle - Math.PI) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          const beamWidth = Math.PI / 6; // 30 degree cone for particles
          if (diff0 < beamWidth || diff1 < beamWidth) {
            const fling = w.pulsarSweepIntensity * 2 * (1 - dist / (w.pulsarRadius || 200));
            ax -= (dx / dist) * fling; // push away from pulsar
            ay -= (dy / dist) * fling;
          }
        }
        continue;
      }

      if (w.type === "looper" || w.type === "station" || w.type === "quasar") {
        // Mild gravity from loopers/stations/quasars (quasar beam physics in tickQuasars)
        const dx = w.x - p.x;
        const dy = w.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist > 1) {
          const force = (40 * gravMult) / (distSq + 500);
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }
        continue;
      }

      const dx = w.x - p.x;
      const dy = w.y - p.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (w.type === "blackhole") {
        const eventHorizon = 12 + w.mass / 20;
        if (dist < eventHorizon) {
          p.life -= 0.08 * dt * 60;
          if (p.life > 0.05 && p.life < 0.5 && s.time - w.lastAbsorb > 0.3) {
            w.lastAbsorb = s.time;
            playAbsorb(s.audioCtx, 60 + p.life * 200, (w.x / s.width) * 2 - 1);
            w.pulsePhase = s.time;
          }
        }
        if (dist > 1) {
          const force = (w.mass * 150 * gravMult) / (distSq + 200);
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }
        if (dist < eventHorizon * 3) {
          const factor = dist / (eventHorizon * 3);
          p.vx *= 0.97 + 0.03 * factor;
          p.vy *= 0.97 + 0.03 * factor;
        }
        continue;
      }

      // TONE & DRUM WELLS
      const minDist = 8;
      const triggerDist = s.quantize ? 25 : minDist;

      if (dist < triggerDist) {
        const noteNow = s.time;
        const canTrig = !s.quantize || s.onBeat;
        const minInterval = s.quantize ? (60 / s.bpm / 4) * 0.8 : 0.12;
        const wellIdx = s.wells.indexOf(w);

        if (canTrig && noteNow - p.lastNote > minInterval && canTriggerPair(i, wellIdx, noteNow)) {
          if (acquireSlot()) {
            const pan = (w.x / s.width) * 2 - 1;
            const gateMul = getGateMultiplier(w, s.time);
            const vel = Math.min(1, w.mass / 100) * 0.7 * gateMul;
            const prox = getMaxWarp(w, stations);
            const warpP = getWarpParams(prox);

            if (w.type === "drum") {
              playDrum(s.audioCtx, w.drumType, pan, vel);
            } else {
              if (warpP) {
                const instPlay = (a, f, p2, v) => playNote(a, f, p2, v, s.instrument);
                playWarpedNote(s.audioCtx, instPlay, w.freq, pan, vel, warpP);
              } else {
                playNote(s.audioCtx, w.freq, pan, vel, s.instrument);
              }
            }

            markPairTriggered(i, wellIdx, noteNow);
            p.lastNote = noteNow;
            w.pulsePhase = s.time;

            // Auto-release slot after typical note duration
            setTimeout(releaseSlot, 1500);
          }
        }
      }

      if (dist < minDist) {
        const bounce = 3 / dist;
        ax -= dx * bounce * 0.5;
        ay -= dy * bounce * 0.5;
        continue;
      }

      const force = (w.mass * 50 * gravMult) / (distSq + 500);
      ax += (dx / dist) * force;
      ay += (dy / dist) * force;
    }

    p.vx += ax * dt;
    p.vy += ay * dt;
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > maxSpeed) { p.vx = (p.vx / speed) * maxSpeed; p.vy = (p.vy / speed) * maxSpeed; }
    p.vx *= physics.damping;
    p.vy *= physics.damping;
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= p.decay * dt * 60;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 30) p.trail.shift();
    if (p.life <= 0 || p.x < -50 || p.x > s.width + 50 || p.y < -50 || p.y > s.height + 50) {
      s.particles.splice(i, 1);
    }
  }
}
