/**
 * @fileoverview Alien Visitation — one ship at a time visits, eats half your wells,
 * transforms them through its genre, and rebuilds them in a signature pattern.
 * Also changes global canvas BPM, scale, and instrument to match its genre.
 *
 * State machine: gap → arriving → scanning → eating → digesting → building → departing → gap
 */

import { GENRE_KEYS, GENRES } from '../data/genres';
import { SCALES, getScaleNoteFrequency } from '../audio/scales';
import { createToneWell, createDrumWell } from './well';
import { createShip, steerShip } from './ship';
import { restoreWells } from './battleWells';
import { playWarpIn, playAbsorb, playBuild } from '../audio/fleet';

const EAT_DUR   = 3.5;  // seconds per well eaten (dramatic but quick)
const BUILD_DUR  = 3.5;  // seconds per well built
const PHASE_DUR  = { arriving: 8, scanning: 14, digesting: 12, departing: 10 };
const GAP_DUR    = [90, 150]; // [min, max] seconds — enjoy the new beat

const GENRE_INSTRUMENTS = { trap: 'sawtooth', lofi: 'triangle', house: 'sine', boombap: 'triangle', techno: 'sawtooth' };
const GENRE_DRUMS = { trap: 'kick', lofi: 'hihat', house: 'kick', boombap: 'snare', techno: 'kick' };

export function createFleet(cw, ch) {
  return {
    active: true,
    phase: 'gap',
    phaseTimer: 4,
    visitor: null,
    genreQueue: [...GENRE_KEYS].sort(() => Math.random() - 0.5),
    wellsToEat: [],
    absorbedWells: [],
    currentEatWell: null,
    eatProgress: 0,
    buildQueue: [],
    buildPositions: [],
    currentBuildIdx: 0,
    buildProgress: 0,
    buildWell: null,
    canvasWidth: cw,
    canvasHeight: ch,
  };
}

export function cleanupFleet(s) {
  for (const w of s.wells) {
    delete w._beingEaten; delete w._scheduledForEating;
    delete w._eatStartX;  delete w._eatStartY; delete w._eatScale;
    delete w._buildScale; delete w._builtByVisitor;
  }
  restoreWells(s);
}

/**
 * @param {Object} s           game state
 * @param {number} dt          delta time (s)
 * @param {Function} addToast
 * @param {Object} setters     { setBpm, setScale, setInstrument } — React state setters
 */
export function tickFleet(s, dt, addToast, setters = {}) {
  const fl = s.fleet;
  if (!fl?.active) return;

  // Portamento — advance any in-flight frequency glides
  for (const w of s.wells) {
    if (w._freqGlideT != null && w._freqGlideT < 1) {
      w._freqGlideT = Math.min(1, w._freqGlideT + dt * 1.5);
      const t = 1 - (1 - w._freqGlideT) ** 3;
      w.freq = w._freqFrom + (w._freqTarget - w._freqFrom) * t;
    }
  }

  if (fl.visitor) _tickTrail(fl.visitor, dt);
  fl.phaseTimer -= dt;

  switch (fl.phase) {
    case 'gap':       _tickGap(fl, s, addToast);              break;
    case 'arriving':  _tickArriving(fl, s, dt, addToast);     break;
    case 'scanning':  _tickScanning(fl, s, dt, addToast, setters); break;
    case 'eating':    _tickEating(fl, s, dt, addToast);       break;
    case 'digesting': _tickDigesting(fl, s, dt, addToast);    break;
    case 'building':  _tickBuilding(fl, s, dt, addToast);     break;
    case 'departing': _tickDeparting(fl, s, dt);              break;
    default: break;
  }
}

// ─── Phase handlers ──────────────────────────────────────────────────────────

function _tickGap(fl, s, addToast) {
  if (fl.phaseTimer > 0) return;
  const genre = fl.genreQueue.shift();
  fl.genreQueue.push(genre);
  const sp = _randomEdge(s.width, s.height);
  fl.visitor = createShip(genre, sp.x, sp.y);
  fl.visitor.orbitAngle  = Math.atan2(sp.y - s.height / 2, sp.x - s.width / 2);
  fl.visitor.orbitRadius = Math.min(s.width, s.height) * 0.44;
  fl.visitor.orbitSpeed  = 0.22;
  fl.visitor.scanAngle   = fl.visitor.orbitAngle;
  fl.phase = 'arriving'; fl.phaseTimer = PHASE_DUR.arriving;
  if (s.audioCtx) playWarpIn(s.audioCtx);
  addToast(`↓ ${fl.visitor.label} approaches`);
}

function _tickArriving(fl, s, dt, addToast) {
  const v = fl.visitor;
  v.warpProgress = Math.min(1, v.warpProgress + dt * 0.22);
  const cx = s.width / 2, cy = s.height / 2;
  steerShip(v, cx + Math.cos(v.orbitAngle) * v.orbitRadius,
               cy + Math.sin(v.orbitAngle) * v.orbitRadius, dt, 115);
  if (fl.phaseTimer <= 0) {
    v.state = 'active';
    fl.phase = 'scanning'; fl.phaseTimer = PHASE_DUR.scanning;
    addToast(`◎ ${v.label} scanning…`);
  }
}

function _tickScanning(fl, s, dt, addToast, setters) {
  _orbitStep(fl.visitor, s, dt, 1.0);
  // Scan beam sweeps a full circle during this phase
  fl.visitor.scanAngle += dt * (Math.PI * 2 / PHASE_DUR.scanning);

  if (fl.phaseTimer <= 0) {
    const g = GENRES[fl.visitor.genre];

    // Change canvas global settings to match genre
    s.bpm = g.bpm;
    s.scaleName = g.scale;
    s.scale = SCALES[g.scale]?.notes || SCALES.pentatonic.notes;
    s.instrument = GENRE_INSTRUMENTS[fl.visitor.genre] ?? 'sine';
    if (setters.setBpm)        setters.setBpm(g.bpm);
    if (setters.setScale)      setters.setScale(g.scale);
    if (setters.setInstrument) setters.setInstrument(s.instrument);
    addToast(`♩ canvas tuned to ${fl.visitor.label}`);

    // Eat everything — ship deconstructs the whole scene
    const edible = s.wells.filter(w => w && !w.removing &&
      (w.type === 'tone' || w.type === 'drum'));
    const count = edible.length;
    fl.wellsToEat = edible.sort(() => Math.random() - 0.5).slice(0, count);
    fl.wellsToEat.forEach(w => {
      w._scheduledForEating = true;
      w._eatStartX = w.x; w._eatStartY = w.y;
    });
    fl.absorbedWells = [];
    fl.currentEatWell = null;
    fl.eatProgress = 0;
    // Precompute build positions in genre's signature pattern
    fl.buildPositions = _patternPositions(fl.visitor.genre, count, s.width, s.height);
    fl.phase = 'eating';
    addToast(`⟳ ${fl.visitor.label} deconstructing`);
  }
}

function _tickEating(fl, s, dt, addToast) {
  _orbitStep(fl.visitor, s, dt, 0.28);

  if (!fl.currentEatWell) {
    if (fl.wellsToEat.length === 0) {
      fl.phase = 'digesting'; fl.phaseTimer = PHASE_DUR.digesting;
      addToast(`✦ ${fl.visitor.label} digesting…`);
      return;
    }
    fl.currentEatWell = fl.wellsToEat.shift();
    fl.currentEatWell._beingEaten = true;
    fl.eatProgress = 0;
  }

  const w = fl.currentEatWell;
  const v = fl.visitor;
  if (!s.wells.includes(w)) { fl.currentEatWell = null; return; }

  fl.eatProgress = Math.min(1, fl.eatProgress + dt / EAT_DUR);
  const ease = fl.eatProgress ** 1.6;  // slow start, fast finish
  w.x = w._eatStartX + (v.x - w._eatStartX) * ease;
  w.y = w._eatStartY + (v.y - w._eatStartY) * ease;
  w._eatScale = Math.max(0, 1 - fl.eatProgress * 0.9);

  if (fl.eatProgress >= 1) {
    fl.absorbedWells.push({
      type: w.type, freq: w.freq ?? 440,
      noteIdx: w.noteIdx ?? 0, octave: w.octave ?? 4,
      scaleName: w.scaleName, drumType: w.drumType,
    });
    s.wells.splice(s.wells.indexOf(w), 1);
    if (s.audioCtx) playAbsorb(s.audioCtx, w.freq ?? 440);
    fl.currentEatWell = null;
  }
}

function _tickDigesting(fl, s, dt, addToast) {
  _orbitStep(fl.visitor, s, dt, 0.12);
  if (fl.phaseTimer <= 0) {
    const g = GENRES[fl.visitor.genre];
    fl.buildQueue = fl.absorbedWells.map((a, i) => ({
      ...a,
      newFreq: _transformFreq(a, fl.visitor.genre),
      targetX: fl.buildPositions[i]?.x ?? s.width / 2,
      targetY: fl.buildPositions[i]?.y ?? s.height / 2,
      genre: fl.visitor.genre, scale: g.scale,
    }));
    fl.currentBuildIdx = 0; fl.buildProgress = 0; fl.buildWell = null;
    fl.phase = 'building';
    addToast(`◈ ${fl.visitor.label} rebuilding`);
  }
}

function _tickBuilding(fl, s, dt, addToast) {
  if (fl.currentBuildIdx >= fl.buildQueue.length) {
    fl.phase = 'departing'; fl.phaseTimer = PHASE_DUR.departing;
    addToast(`↑ ${fl.visitor.label} departs`);
    return;
  }
  const spec = fl.buildQueue[fl.currentBuildIdx];
  steerShip(fl.visitor, spec.targetX, spec.targetY, dt, 52);
  fl.visitor.beamPulse = (fl.visitor.beamPulse + dt * 3) % (Math.PI * 2);
  fl.buildProgress = Math.min(1, fl.buildProgress + dt / BUILD_DUR);

  if (!fl.buildWell && fl.buildProgress >= 0.3) {
    fl.buildWell = _spawnRebuiltWell(spec, fl.visitor, s);
    if (s.audioCtx) playBuild(s.audioCtx, spec.newFreq ?? 440);
  }
  if (fl.buildWell) {
    fl.buildWell._buildScale = Math.min(1, (fl.buildProgress - 0.3) / 0.7);
    if (fl.buildProgress >= 1) {
      fl.buildWell._buildScale = 1; delete fl.buildWell._buildScale;
      fl.buildWell._builtByVisitor = fl.visitor.genre;
      fl.buildWell = null; fl.currentBuildIdx++;
      fl.buildProgress = 0;
    }
  }
}

function _tickDeparting(fl, s, dt) {
  const v = fl.visitor;
  v.warpProgress = Math.max(0, v.warpProgress - dt * 0.42);
  const maxR = Math.max(s.width, s.height) * 1.3;
  steerShip(v, s.width / 2 + Math.cos(v.orbitAngle) * maxR,
               s.height / 2 + Math.sin(v.orbitAngle) * maxR, dt, 130);
  if (fl.phaseTimer <= 0) {
    fl.visitor = null;
    fl.phase = 'gap';
    fl.phaseTimer = GAP_DUR[0] + Math.random() * (GAP_DUR[1] - GAP_DUR[0]);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _orbitStep(v, s, dt, speedMult = 1) {
  v.beamPulse   = (v.beamPulse + dt * 2.2) % (Math.PI * 2);
  v.orbitAngle += v.orbitSpeed * speedMult * dt;
  const cx = s.width / 2, cy = s.height / 2;
  steerShip(v, cx + Math.cos(v.orbitAngle) * v.orbitRadius,
               cy + Math.sin(v.orbitAngle) * v.orbitRadius, dt, 58);
  v.x = Math.max(18, Math.min(s.width - 18, v.x));
  v.y = Math.max(18, Math.min(s.height - 18, v.y));
}

function _tickTrail(v, dt) {
  v.trail.push({ x: v.x, y: v.y, life: 1 });
  for (let i = v.trail.length - 1; i >= 0; i--) {
    v.trail[i].life -= dt * 1.6;
    if (v.trail[i].life <= 0) v.trail.splice(i, 1);
  }
  if (v.trail.length > 28) v.trail.splice(0, v.trail.length - 28);
}

function _randomEdge(cw, ch) {
  const e = [{ x: cw / 2, y: -90 }, { x: cw + 90, y: ch / 2 }, { x: cw / 2, y: ch + 90 }, { x: -90, y: ch / 2 }];
  return e[Math.floor(Math.random() * 4)];
}

function _transformFreq(absorbed, genre) {
  if (absorbed.type !== 'tone') return null;
  const g = GENRES[genre];
  if (!g) return absorbed.freq;
  const scale   = SCALES[g.scale]?.notes || SCALES.pentatonic.notes;
  const noteIdx = Math.min(absorbed.noteIdx ?? 0, scale.length - 1);
  return getScaleNoteFrequency(g.scale, noteIdx, absorbed.octave ?? 4);
}

/** Genre-specific decorative placement patterns. */
function _patternPositions(genre, count, cw, ch) {
  const cx = cw / 2, cy = ch / 2;
  const R = Math.min(cw, ch) * 0.32;
  const positions = [];

  if (genre === 'house') {
    // Even circle — dancefloor ring
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      positions.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
    }
  } else if (genre === 'techno') {
    // Precise grid
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const gw = cw * 0.55, gh = ch * 0.5;
    for (let i = 0; i < count; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      positions.push({ x: cx - gw / 2 + (c + 0.5) * gw / cols, y: cy - gh / 2 + (r + 0.5) * gh / rows });
    }
  } else if (genre === 'trap') {
    // Diamond / rhombus vertices
    const pts = [{ x: cx, y: cy - R }, { x: cx + R * 0.7, y: cy }, { x: cx, y: cy + R }, { x: cx - R * 0.7, y: cy }];
    for (let i = 0; i < count; i++) positions.push(pts[i % pts.length]);
    // Fill extras spiraling inward
    for (let i = pts.length; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      positions.push({ x: cx + Math.cos(a) * R * 0.4, y: cy + Math.sin(a) * R * 0.4 });
    }
  } else if (genre === 'lofi') {
    // Organic scatter — golden angle spiral
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const r2 = R * Math.sqrt((i + 0.5) / count);
      const a  = phi * i;
      positions.push({ x: cx + Math.cos(a) * r2, y: cy + Math.sin(a) * r2 });
    }
  } else {
    // boombap — asymmetric cross / offset pairs
    const step = R * 0.55;
    const pts = [
      { x: cx - step, y: cy - step * 0.7 }, { x: cx + step, y: cy - step * 0.7 },
      { x: cx,        y: cy + step * 0.5  }, { x: cx - step * 1.2, y: cy + step * 1.1 },
      { x: cx + step * 1.2, y: cy + step * 1.1 },
    ];
    for (let i = 0; i < count; i++) positions.push(pts[i % pts.length]);
  }

  // Clamp to canvas bounds
  return positions.map(p => ({
    x: Math.max(70, Math.min(cw - 70, p.x + (Math.random() - 0.5) * 22)),
    y: Math.max(70, Math.min(ch - 70, p.y + (Math.random() - 0.5) * 22)),
  }));
}

function _spawnRebuiltWell(spec, visitor, s) {
  const g = GENRES[visitor.genre];
  let w;
  if (spec.type === 'drum') {
    w = createDrumWell(spec.targetX, spec.targetY, 55, GENRE_DRUMS[visitor.genre] || spec.drumType || 'kick', s.time);
  } else {
    const scale   = SCALES[g.scale]?.notes || SCALES.pentatonic.notes;
    const noteIdx = Math.min(spec.noteIdx ?? 0, scale.length - 1);
    w = createToneWell(spec.targetX, spec.targetY, 60, noteIdx, scale, s.time, g.scale, spec.octave ?? 4);
    // Portamento: glide from original freq to new genre freq
    w._freqFrom   = spec.freq;
    w._freqTarget = spec.newFreq ?? w.freq;
    w._freqGlideT = 0;
    w.freq        = spec.freq;
  }
  w._builtByVisitor = visitor.genre;
  w._buildScale = 0;
  s.wells.push(w);
  return w;
}
