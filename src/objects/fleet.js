/**
 * @fileoverview Alien Visitation — one ship at a time visits, eats ALL wells,
 * transforms them through its genre, and rebuilds the scene with a fresh looper
 * + tone/drum wells in a genre-signature pattern.
 *
 * State machine: gap → arriving → eating → digesting → building → departing → gap
 *
 * Key design: eating is PARALLEL — all wells start moving toward the ship
 * simultaneously with a small stagger. No sequential one-at-a-time nonsense.
 */

import { GENRE_KEYS, GENRES } from '../data/genres';
import { SCALES, getScaleNoteFrequency } from '../audio/scales';
import { createToneWell, createDrumWell, createLooperWell } from './well';
import { createShip, steerShip } from './ship';
import { restoreWells } from './battleWells';
import { playWarpIn, playAbsorb, playBuild } from '../audio/fleet';

const EAT_DUR     = 2.2;   // seconds to pull each well in (parallel)
const EAT_STAGGER = 0.32;  // seconds between each well starting to move
const BUILD_DUR   = 2.0;   // seconds each well takes to materialize
const BUILD_STAGGER = 0.45; // seconds between each well spawning

const PHASE_DUR = { arriving: 5, digesting: 8, departing: 8 };
const GAP_DUR   = [90, 150]; // seconds between visits

const ALL_EDIBLE = new Set(['tone','drum','looper','pulsar','neutronstar','quasar','station','blackhole']);
const GENRE_INSTRUMENTS = { trap: 'sawtooth', lofi: 'triangle', house: 'sine', boombap: 'triangle', techno: 'sawtooth' };
const GENRE_DRUMS = { trap: 'kick', lofi: 'hihat', house: 'kick', boombap: 'snare', techno: 'kick' };

export function createFleet(cw, ch) {
  return {
    active: true,
    phase: 'gap',
    phaseTimer: 4,
    visitor: null,
    genreQueue: [...GENRE_KEYS].sort(() => Math.random() - 0.5),
    wellsToEat: [],      // wells currently being pulled in
    absorbedWells: [],   // absorbed metadata
    buildQueue: [],      // specs for wells to rebuild
    canvasWidth: cw,
    canvasHeight: ch,
  };
}

export function cleanupFleet(s) {
  for (const w of s.wells) {
    delete w._beingEaten; delete w._scheduledForEating;
    delete w._eatStartX;  delete w._eatStartY;
    delete w._eatScale;   delete w._eatT; delete w._eatDelay;
    delete w._buildScale; delete w._builtByVisitor;
  }
  restoreWells(s);
}

/**
 * @param {Object}   s        game state
 * @param {number}   dt       delta time (s)
 * @param {Function} addToast
 * @param {Object}   setters  { setBpm, setScale, setInstrument }
 */
export function tickFleet(s, dt, addToast, setters = {}) {
  const fl = s.fleet;
  if (!fl?.active) return;

  // Advance frequency glides on all wells
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
    case 'gap':       _tickGap(fl, s, addToast);                   break;
    case 'arriving':  _tickArriving(fl, s, dt, addToast, setters); break;
    case 'eating':    _tickEating(fl, s, dt, addToast);            break;
    case 'digesting': _tickDigesting(fl, s, dt, addToast);         break;
    case 'building':  _tickBuilding(fl, s, dt, addToast);          break;
    case 'departing': _tickDeparting(fl, s, dt);                   break;
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
  fl.visitor.orbitRadius = Math.min(s.width, s.height) * 0.42;
  fl.visitor.orbitSpeed  = 0.24;
  fl._genreApplied = false;
  fl.phase = 'arriving'; fl.phaseTimer = PHASE_DUR.arriving;
  if (s.audioCtx) playWarpIn(s.audioCtx);
  addToast(`↓ ${fl.visitor.label} approaches`);
}

function _tickArriving(fl, s, dt, addToast, setters) {
  const v = fl.visitor;
  v.warpProgress = Math.min(1, v.warpProgress + dt * 0.28);
  _orbitStep(v, s, dt, 0.6);

  // Apply genre settings immediately — don't wait for a scan phase
  if (!fl._genreApplied) {
    const g = GENRES[v.genre];
    s.bpm = g.bpm; s.scaleName = g.scale;
    s.scale = SCALES[g.scale]?.notes || SCALES.pentatonic.notes;
    s.instrument = GENRE_INSTRUMENTS[v.genre] ?? 'sine';
    if (setters.setBpm)        setters.setBpm(g.bpm);
    if (setters.setScale)      setters.setScale(g.scale);
    if (setters.setInstrument) setters.setInstrument(s.instrument);
    fl._genreApplied = true;
  }

  if (fl.phaseTimer <= 0) {
    v.state = 'active';

    // Select ALL edible wells
    const edible = s.wells.filter(w => w && !w.removing && ALL_EDIBLE.has(w.type));

    // Immediately silence any loopers before they can record more
    for (const w of edible) {
      if (w.type === 'looper' && w.looper) {
        w.looper.paused = true;
        w.looper.events = [];
      }
    }

    // Assign staggered eat delays — they all start moving at different times
    edible.sort(() => Math.random() - 0.5);
    edible.forEach((w, i) => {
      w._scheduledForEating = true;
      w._beingEaten = true;
      w._eatStartX  = w.x;
      w._eatStartY  = w.y;
      w._eatDelay   = i * EAT_STAGGER;
      w._eatT       = 0;
      w._eatScale   = 1;
    });

    fl.wellsToEat    = [...edible];
    fl.absorbedWells = [];
    // Pre-compute positions for the rebuild (same count as eaten, min 4)
    const rebuildCount = Math.max(4, edible.length);
    fl.buildPositions = _patternPositions(v.genre, rebuildCount, s.width, s.height);
    fl.phase = 'eating';
    addToast(`⟳ ${v.label} deconstructing`);
  }
}

function _tickEating(fl, s, dt, addToast) {
  _orbitStep(fl.visitor, s, dt, 0.35);
  fl.visitor.beamPulse = (fl.visitor.beamPulse + dt * 3) % (Math.PI * 2);

  for (let i = fl.wellsToEat.length - 1; i >= 0; i--) {
    const w = fl.wellsToEat[i];

    // Well was externally removed (user deleted it, etc.)
    if (!s.wells.includes(w)) { fl.wellsToEat.splice(i, 1); continue; }

    // Staggered start
    if (w._eatDelay > 0) { w._eatDelay -= dt; continue; }

    w._eatT = Math.min(1, w._eatT + dt / EAT_DUR);
    const ease = w._eatT ** 1.6;
    w.x = w._eatStartX + (fl.visitor.x - w._eatStartX) * ease;
    w.y = w._eatStartY + (fl.visitor.y - w._eatStartY) * ease;
    w._eatScale = Math.max(0, 1 - w._eatT * 0.9);

    if (w._eatT >= 1) {
      fl.absorbedWells.push({
        type: w.type, freq: w.freq ?? 440,
        noteIdx: w.noteIdx ?? 0, octave: w.octave ?? 4,
        scaleName: w.scaleName, drumType: w.drumType,
      });
      if (s.audioCtx) playAbsorb(s.audioCtx, w.freq ?? 440);
      s.wells.splice(s.wells.indexOf(w), 1);
      fl.wellsToEat.splice(i, 1);
    }
  }

  if (fl.wellsToEat.length === 0) {
    fl.phase = 'digesting';
    fl.phaseTimer = PHASE_DUR.digesting;
    addToast(`✦ ${fl.visitor.label} digesting…`);
  }
}

function _tickDigesting(fl, s, dt, addToast) {
  _orbitStep(fl.visitor, s, dt, 0.12);
  if (fl.phaseTimer <= 0) {
    _setupBuildQueue(fl, s);
    fl.phase = 'building';
    addToast(`◈ ${fl.visitor.label} rebuilding`);
  }
}

function _setupBuildQueue(fl, s) {
  const g = GENRES[fl.visitor.genre];
  const absorbed = fl.absorbedWells;
  const totalRebuild = Math.max(4, absorbed.length);
  const positions = fl.buildPositions;

  const tones = absorbed.filter(a => a.type === 'tone');
  const drums  = absorbed.filter(a => a.type === 'drum');
  const drumTarget = Math.max(1, Math.round((totalRebuild - 1) *
    (drums.length / Math.max(1, absorbed.length))));
  const toneTarget = totalRebuild - 1 - drumTarget;

  fl.buildQueue = [];
  let posIdx = 0;

  // Always rebuild a fresh looper first — it's the new beat engine
  fl.buildQueue.push({
    type: 'looper', bpm: g.bpm, genre: fl.visitor.genre,
    targetX: positions[posIdx]?.x ?? s.width / 2,
    targetY: positions[posIdx]?.y ?? s.height / 2,
    delay: posIdx * BUILD_STAGGER, _spawnDone: false, _buildT: 0, _well: null,
  });
  posIdx++;

  // Tone wells
  for (let i = 0; i < toneTarget && posIdx < positions.length; i++, posIdx++) {
    const src = tones[i] || absorbed[i] || {};
    const scale = SCALES[g.scale]?.notes || SCALES.pentatonic.notes;
    const noteIdx = ((src.noteIdx ?? i) + i) % scale.length; // shift for variety
    fl.buildQueue.push({
      type: 'tone', genre: fl.visitor.genre, scale: g.scale,
      noteIdx, octave: src.octave ?? 4,
      newFreq: getScaleNoteFrequency(g.scale, noteIdx, src.octave ?? 4),
      targetX: positions[posIdx]?.x ?? s.width / 2,
      targetY: positions[posIdx]?.y ?? s.height / 2,
      delay: posIdx * BUILD_STAGGER, _spawnDone: false, _buildT: 0, _well: null,
    });
  }

  // Drum wells
  for (let i = 0; i < drumTarget && posIdx < positions.length; i++, posIdx++) {
    fl.buildQueue.push({
      type: 'drum', genre: fl.visitor.genre,
      drumType: GENRE_DRUMS[fl.visitor.genre] || 'kick',
      targetX: positions[posIdx]?.x ?? s.width / 2,
      targetY: positions[posIdx]?.y ?? s.height / 2,
      delay: posIdx * BUILD_STAGGER, _spawnDone: false, _buildT: 0, _well: null,
    });
  }
}

function _tickBuilding(fl, s, dt, addToast) {
  _orbitStep(fl.visitor, s, dt, 0.22);
  fl.visitor.beamPulse = (fl.visitor.beamPulse + dt * 2.2) % (Math.PI * 2);

  let allDone = true;
  for (const spec of fl.buildQueue) {
    if (spec.delay > 0) { spec.delay -= dt; allDone = false; continue; }

    if (!spec._spawnDone) {
      spec._well = _spawnRebuiltWell(spec, fl.visitor, s);
      spec._spawnDone = true;
      if (s.audioCtx && spec.type !== 'looper') playBuild(s.audioCtx, spec.newFreq ?? 440);
    }

    spec._buildT = Math.min(1, spec._buildT + dt / BUILD_DUR);
    if (spec._well) spec._well._buildScale = spec._buildT;

    if (spec._buildT < 1) { allDone = false; }
    else if (spec._well) {
      delete spec._well._buildScale;
      spec._well._builtByVisitor = fl.visitor.genre;
    }
  }

  if (allDone) {
    fl.phase = 'departing';
    fl.phaseTimer = PHASE_DUR.departing;
    addToast(`↑ ${fl.visitor.label} departs`);
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
  const e = [{ x: cw/2, y: -90 }, { x: cw+90, y: ch/2 }, { x: cw/2, y: ch+90 }, { x: -90, y: ch/2 }];
  return e[Math.floor(Math.random() * 4)];
}

/** Genre-signature decorative placement patterns. */
function _patternPositions(genre, count, cw, ch) {
  const cx = cw / 2, cy = ch / 2;
  const R  = Math.min(cw, ch) * 0.32;
  const positions = [];

  if (genre === 'house') {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      positions.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
    }
  } else if (genre === 'techno') {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const gw = cw * 0.55, gh = ch * 0.5;
    for (let i = 0; i < count; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      positions.push({ x: cx - gw/2 + (c+0.5) * gw/cols, y: cy - gh/2 + (r+0.5) * gh/rows });
    }
  } else if (genre === 'trap') {
    const pts = [{ x: cx, y: cy-R }, { x: cx+R*0.7, y: cy }, { x: cx, y: cy+R }, { x: cx-R*0.7, y: cy }];
    for (let i = 0; i < count; i++) positions.push(pts[i % pts.length]);
    for (let i = pts.length; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      positions.push({ x: cx + Math.cos(a) * R*0.4, y: cy + Math.sin(a) * R*0.4 });
    }
  } else if (genre === 'lofi') {
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const r2 = R * Math.sqrt((i + 0.5) / count);
      positions.push({ x: cx + Math.cos(phi * i) * r2, y: cy + Math.sin(phi * i) * r2 });
    }
  } else {
    // boombap — asymmetric cross
    const step = R * 0.55;
    const pts = [
      { x: cx-step, y: cy-step*0.7 }, { x: cx+step, y: cy-step*0.7 },
      { x: cx, y: cy+step*0.5 }, { x: cx-step*1.2, y: cy+step*1.1 },
      { x: cx+step*1.2, y: cy+step*1.1 },
    ];
    for (let i = 0; i < count; i++) positions.push(pts[i % pts.length]);
  }

  return positions.map(p => ({
    x: Math.max(80, Math.min(cw - 80, p.x + (Math.random() - 0.5) * 18)),
    y: Math.max(80, Math.min(ch - 80, p.y + (Math.random() - 0.5) * 18)),
  }));
}

function _spawnRebuiltWell(spec, visitor, s) {
  const g = GENRES[visitor.genre];
  let w;
  if (spec.type === 'looper') {
    // Fresh empty looper — clean canvas for next beat to develop
    w = createLooperWell(spec.targetX, spec.targetY, 55, g.bpm, s.time);
  } else if (spec.type === 'drum') {
    w = createDrumWell(spec.targetX, spec.targetY, 55,
      GENRE_DRUMS[visitor.genre] || spec.drumType || 'kick', s.time);
  } else {
    const scale   = SCALES[g.scale]?.notes || SCALES.pentatonic.notes;
    const noteIdx = Math.min(spec.noteIdx ?? 0, scale.length - 1);
    w = createToneWell(spec.targetX, spec.targetY, 60, noteIdx, scale, s.time, g.scale, spec.octave ?? 4);
    // Portamento: glide from low to new pitch as it materializes
    w._freqFrom   = 55;
    w._freqTarget = spec.newFreq ?? w.freq;
    w._freqGlideT = 0;
    w.freq        = w._freqFrom;
  }
  w._builtByVisitor = visitor.genre;
  w._buildScale = 0;
  s.wells.push(w);
  return w;
}
