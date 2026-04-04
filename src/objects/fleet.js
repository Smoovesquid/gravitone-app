/**
 * @fileoverview Alien Visitation — galactic touring musicians visit one at a time.
 * State machine: gap → arriving → orbiting → session → departing → gap → …
 * Each visitor selects wells, runs a musical session, then permanently teaches
 * those wells a new rhythmic behavior before departing.
 */

import { GENRE_KEYS, GENRES } from '../data/genres';
import { createShip, steerShip } from './ship';
import { selectSessionWells, teachWell, restoreWells } from './battleWells';
import { playGenrePulse, playSessionStart, playTeachWell, playWarpIn } from '../audio/fleet';

// Phase durations [min, max] in seconds
const DUR = {
  gap:       [10, 18],
  arriving:  [ 4,  4],
  orbiting:  [ 5,  8],
  session:   [28, 45],
  departing: [ 3,  3],
};
const rand = ([lo, hi]) => lo + Math.random() * (hi - lo);

export function createFleet(cw, ch) {
  return {
    active: true,
    phase: 'gap',
    phaseTimer: 3,          // short pause before first visitor
    visitor: null,
    genreQueue: [...GENRE_KEYS].sort(() => Math.random() - 0.5),
    sessionWells: [],       // well indices currently in session
    canvasWidth: cw,
    canvasHeight: ch,
  };
}

export function cleanupFleet(s) {
  restoreWells(s);
}

export function tickFleet(s, dt, addToast) {
  const fl = s.fleet;
  if (!fl?.active) return;

  // Portamento — advance all in-flight frequency glides
  for (const w of s.wells) {
    if (w._freqGlideT != null && w._freqGlideT < 1) {
      w._freqGlideT = Math.min(1, w._freqGlideT + dt * 1.82);
      const t = 1 - (1 - w._freqGlideT) ** 3;        // ease-out cubic
      w.freq = w._freqFrom + (w._freqTarget - w._freqFrom) * t;
    }
  }

  // Self-pulse — taught behaviors fire independently forever
  for (const w of s.wells) {
    if (!w._selfPulses?.length) continue;
    for (const p of w._selfPulses) {
      p.accum = (p.accum || 0) + dt;
      if (p.accum >= p.period) {
        p.accum -= p.period;
        if (s.audioCtx) playGenrePulse(s.audioCtx, w.freq, p.genre, (w.x / s.width) * 2 - 1);
      }
    }
  }

  fl.phaseTimer -= dt;
  if (fl.visitor) _tickTrail(fl.visitor, dt);

  switch (fl.phase) {
    case 'gap':       _tickGap(fl, s, addToast);           break;
    case 'arriving':  _tickArriving(fl, s, dt, addToast);  break;
    case 'orbiting':  _tickOrbiting(fl, s, dt, addToast);  break;
    case 'session':   _tickSession(fl, s, dt, addToast);   break;
    case 'departing': _tickDeparting(fl, s, dt, addToast); break;
    default: break;
  }
}

// ─── Phase handlers ───────────────────────────────────────────────────────────

function _tickGap(fl, s, addToast) {
  if (fl.phaseTimer > 0) return;

  const genre = fl.genreQueue.shift();
  fl.genreQueue.push(genre); // cycle

  const cw = s.width, ch = s.height;
  const edges = [
    { x: cw * 0.5, y: -90 },
    { x: cw + 90,  y: ch * 0.5 },
    { x: cw * 0.5, y: ch + 90 },
    { x: -90,      y: ch * 0.5 },
  ];
  const sp = edges[Math.floor(Math.random() * 4)];

  fl.visitor = createShip(genre, sp.x, sp.y);
  fl.visitor.orbitAngle  = Math.atan2(sp.y - ch * 0.5, sp.x - cw * 0.5);
  fl.visitor.orbitRadius = Math.min(cw, ch) * 0.43;
  fl.visitor.orbitSpeed  = 0.24 + Math.random() * 0.13;

  fl.phase = 'arriving';
  fl.phaseTimer = rand(DUR.arriving);
  if (s.audioCtx) playWarpIn(s.audioCtx);
  addToast(`↓ ${fl.visitor.label} approaches`);
}

function _tickArriving(fl, s, dt, addToast) {
  const v = fl.visitor;
  const cx = s.width * 0.5, cy = s.height * 0.5;
  const tx = cx + Math.cos(v.orbitAngle) * v.orbitRadius;
  const ty = cy + Math.sin(v.orbitAngle) * v.orbitRadius;
  v.warpProgress = Math.min(1, v.warpProgress + dt * 0.28);
  steerShip(v, tx, ty, dt, 120);
  if (fl.phaseTimer <= 0) {
    v.state = 'active';
    fl.phase = 'orbiting';
    fl.phaseTimer = rand(DUR.orbiting);
    addToast(`♫ ${v.label} is listening…`);
  }
}

function _tickOrbiting(fl, s, dt, addToast) {
  _orbitStep(fl.visitor, s, dt, 1.0);
  if (fl.phaseTimer <= 0) {
    fl.sessionWells = selectSessionWells(s.wells, fl.visitor.genre, 3);
    const g = GENRES[fl.visitor.genre];
    for (const wi of fl.sessionWells) {
      const w = s.wells[wi];
      if (!w) continue;
      w._danceVisitor = fl.visitor.genre;
      w._danceRgb     = fl.visitor.rgb;
      w._danceBpm     = g.bpm;
      w._danceAmp     = 9;
    }
    fl.phase = 'session';
    fl.phaseTimer = rand(DUR.session);
    if (s.audioCtx) playSessionStart(s.audioCtx, fl.visitor.rgb);
    addToast(`▶ ${fl.visitor.label} SESSION`);
  }
}

function _tickSession(fl, s, dt, addToast) {
  _orbitStep(fl.visitor, s, dt, 0.5);

  // Session counter-melody pulses on owned wells
  fl.visitor._pulseAccum += dt;
  const period = 60 / (GENRES[fl.visitor.genre]?.bpm ?? 120);
  if (fl.visitor._pulseAccum >= period) {
    fl.visitor._pulseAccum -= period;
    const wi = fl.sessionWells[Math.floor(Math.random() * fl.sessionWells.length)];
    const w  = wi != null ? s.wells[wi] : null;
    if (w && s.audioCtx) playGenrePulse(s.audioCtx, w.freq, fl.visitor.genre, (w.x / s.width) * 2 - 1);
  }

  if (fl.phaseTimer <= 0) {
    for (const wi of fl.sessionWells) {
      const w = s.wells[wi];
      if (!w) continue;
      w._danceVisitor = null;       // visitor color fades, but dance stays
      teachWell(w, fl.visitor, s);
      if (s.audioCtx) playTeachWell(s.audioCtx, w.freq ?? 440);
    }
    fl.sessionWells = [];
    fl.phase = 'departing';
    fl.phaseTimer = rand(DUR.departing);
    addToast(`✦ ${fl.visitor.label} taught the wells`);
  }
}

function _tickDeparting(fl, s, dt) {
  const v = fl.visitor;
  v.warpProgress = Math.max(0, v.warpProgress - dt * 0.55);
  const maxR = Math.max(s.width, s.height) * 1.2;
  steerShip(v, s.width * 0.5 + Math.cos(v.orbitAngle) * maxR,
               s.height * 0.5 + Math.sin(v.orbitAngle) * maxR, dt, 140);
  if (fl.phaseTimer <= 0) {
    fl.visitor    = null;
    fl.phase      = 'gap';
    fl.phaseTimer = rand(DUR.gap);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _orbitStep(v, s, dt, speedMult = 1) {
  v.beamPulse   = (v.beamPulse + dt * 2.5) % (Math.PI * 2);
  v.orbitAngle += v.orbitSpeed * speedMult * dt;
  const cx = s.width * 0.5, cy = s.height * 0.5;
  steerShip(v, cx + Math.cos(v.orbitAngle) * v.orbitRadius,
               cy + Math.sin(v.orbitAngle) * v.orbitRadius, dt, 62);
  v.x = Math.max(18, Math.min(s.width  - 18, v.x));
  v.y = Math.max(18, Math.min(s.height - 18, v.y));
}

function _tickTrail(v, dt) {
  v.trail.push({ x: v.x, y: v.y, life: 1 });
  for (let i = v.trail.length - 1; i >= 0; i--) {
    v.trail[i].life -= dt * 2.0;
    if (v.trail[i].life <= 0) v.trail.splice(i, 1);
  }
  if (v.trail.length > 26) v.trail.splice(0, v.trail.length - 26);
}
