/**
 * @fileoverview Imperial Battle Cruiser — state machine + AI composer tick.
 * The cruiser enters from the top, shoots tractor beams, manipulates wells,
 * then exits when the user interacts.
 */

import { generateMood, generateWellTargets } from '../ai/composer';
import { SCALES, octaveFromY } from '../audio/scales';
import { createToneWell } from './well';

/**
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function createCruiser(canvasWidth, canvasHeight) {
  return {
    state: 'entering',   // 'entering' | 'active' | 'exiting'
    x: canvasWidth / 2,
    y: -150,
    targetY: 72,
    mood: null,
    moodTimer: 0,
    nudgeTimer: 10,
    wellTargets: [],     // [{ idx, x, y, mass }]
    beamPulsePhase: 0,
    featureIdx: -1,
    featureTimer: 0,
    trail: [],           // [{ x, y, life }]
  };
}

/**
 * Main tick — call every frame.
 * @param {import('../types').GameState & { cruiser?: any }} s
 * @param {number} dt
 * @param {(msg:string)=>void} addToast
 */
export function tickCruiser(s, dt, addToast) {
  const cr = s.cruiser;
  if (!cr) return;

  cr.beamPulsePhase = (cr.beamPulsePhase + dt * 2.5) % (Math.PI * 2);

  // Particle trail (only while moving)
  if (cr.state !== 'active') {
    cr.trail.push({ x: cr.x + (Math.random() - 0.5) * 18, y: cr.y + 55, life: 1 });
  }
  for (let i = cr.trail.length - 1; i >= 0; i--) {
    cr.trail[i].life -= dt * 1.8;
    if (cr.trail[i].life <= 0) cr.trail.splice(i, 1);
  }
  if (cr.trail.length > 35) cr.trail.splice(0, cr.trail.length - 35);

  // Mark controlled wells (used by renderer for glow ring)
  for (const w of s.wells) w.cruiserControlled = false;
  if (cr.state === 'active') {
    for (const t of cr.wellTargets) {
      const w = s.wells[t.idx];
      if (w && !w.removing) w.cruiserControlled = true;
    }
  }

  if (cr.state === 'entering') {
    cr.y = Math.min(cr.targetY, cr.y + 45 * dt);
    if (cr.y >= cr.targetY) {
      cr.state = 'active';
      _newMood(s, addToast);
      cr.moodTimer = 90 + Math.random() * 30;
      cr.nudgeTimer = 12 + Math.random() * 10;
    }
    return;
  }

  if (cr.state === 'exiting') {
    cr.y -= 80 * dt;
    if (cr.y < -200) s.cruiser = null;
    return;
  }

  // === active ===
  cr.moodTimer -= dt;
  cr.nudgeTimer -= dt;
  cr.featureTimer -= dt;

  if (cr.moodTimer <= 0) {
    _newMood(s, addToast);
    cr.moodTimer = 90 + Math.random() * 30;
  }
  if (cr.nudgeTimer <= 0) {
    _nudge(cr, s);
    cr.nudgeTimer = 12 + Math.random() * 12;
  }
  if (cr.featureTimer <= 0) {
    cr.featureIdx = cr.wellTargets.length > 0
      ? Math.floor(Math.random() * cr.wellTargets.length) : -1;
    cr.featureTimer = 6 + Math.random() * 8;
  }

  // Prune stale targets
  cr.wellTargets = cr.wellTargets.filter(t => s.wells[t.idx] && !s.wells[t.idx].removing);

  // Lerp controlled wells toward their targets
  for (let ti = 0; ti < cr.wellTargets.length; ti++) {
    const t = cr.wellTargets[ti];
    const w = s.wells[t.idx];
    if (!w) continue;
    const isFeatured = ti === cr.featureIdx;
    const targetMass = isFeatured ? t.mass * 1.5 : t.mass;
    w.x += (t.x - w.x) * Math.min(1, dt * 0.55);
    w.y += (t.y - w.y) * Math.min(1, dt * 0.55);
    w.mass += (targetMass - w.mass) * Math.min(1, dt * 0.4);
    if (w.type === 'looper' && w.looper) { w.looper.cx = w.x; w.looper.cy = w.y; }
    if (w.type === 'tone') w.octave = octaveFromY(w.y, s.height);
  }
}

function _newMood(s, addToast) {
  const cr = s.cruiser;
  const mood = generateMood();
  cr.mood = mood;

  // Ensure minimum wells exist
  const active = s.wells.filter(w => !w.removing);
  while (active.length < Math.min(mood.density, 3)) {
    const x = s.width * (0.2 + Math.random() * 0.6);
    const y = s.height * (0.25 + Math.random() * 0.45);
    const octave = octaveFromY(y, s.height);
    const notes = SCALES[mood.scale]?.notes || SCALES.pentatonic.notes;
    const noteIdx = Math.floor(Math.random() * notes.length);
    const w = createToneWell(x, y, 60, noteIdx, notes, s.time, mood.scale, octave);
    s.wells.push(w);
    active.push(w);
  }

  const targets = generateWellTargets(mood, s.width, s.height);
  cr.wellTargets = s.wells
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => !w.removing)
    .slice(0, targets.length)
    .map(({ i }, ti) => ({ idx: i, x: targets[ti].x, y: targets[ti].y, mass: targets[ti].mass }));

  if (addToast) addToast(`\u25b2 IMPERIAL: ${mood.scale} \u00b7 ${mood.tempoFeel}`);
}

function _nudge(cr, s) {
  if (cr.wellTargets.length === 0) return;
  const t = cr.wellTargets[Math.floor(Math.random() * cr.wellTargets.length)];
  t.x = Math.max(60, Math.min(s.width - 60, t.x + (Math.random() - 0.5) * 100));
  t.y = Math.max(80, Math.min(s.height - 130, t.y + (Math.random() - 0.5) * 60));
  t.mass = Math.max(30, Math.min(150, t.mass + (Math.random() - 0.5) * 30));
}
