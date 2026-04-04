/**
 * @fileoverview Well selection and teaching for Alien Visitation mode.
 * Visitors select existing wells, run sessions, then permanently teach them
 * new rhythmic and harmonic behaviors that persist after the ship departs.
 */

import { GENRES } from '../data/genres';
import { SCALES, getScaleNoteFrequency } from '../audio/scales';

/**
 * Select up to `count` wells for a visitor session.
 * Prefers wells not yet taught by this genre; breaks ties randomly.
 * Targets tone wells first, then drum wells.
 * @param {Object[]} wells
 * @param {string}   genre
 * @param {number}   count
 * @returns {number[]} well indices
 */
export function selectSessionWells(wells, genre, count = 3) {
  const eligible = [];
  for (let i = 0; i < wells.length; i++) {
    const w = wells[i];
    if (!w || w.removing || w.type === 'blackhole' || w.type === 'station') continue;
    if (w.type === 'neutronstar' || w.type === 'quasar' || w.type === 'pulsar') continue;
    const alreadyTaught = w._learnedFrom?.some(l => l.genre === genre) ? 1 : 0;
    eligible.push({ i, alreadyTaught, r: Math.random() });
  }
  eligible.sort((a, b) => a.alreadyTaught - b.alreadyTaught || a.r - b.r);
  return eligible.slice(0, count).map(e => e.i);
}

/**
 * Permanently teach a well a new musical behavior.
 * Layers a self-pulse at the genre's BPM, shifts frequency, adds permanent dance.
 * @param {Object} well
 * @param {Object} ship  visitor ship (has .genre, .rgb)
 * @param {Object} s     game state (for s.time)
 */
export function teachWell(well, ship, s) {
  const g = GENRES[ship.genre];
  if (!g) return;

  // Record teaching history
  well._learnedFrom = well._learnedFrom || [];
  well._learnedFrom.push({ genre: ship.genre, time: s?.time ?? 0 });

  // Layer self-pulse (each genre adds its own; no duplicates)
  well._selfPulses = well._selfPulses || [];
  if (!well._selfPulses.find(p => p.genre === ship.genre)) {
    const period = 60 / g.bpm;
    well._selfPulses.push({ genre: ship.genre, period, accum: Math.random() * period });
  }

  // Permanent subtle dance — amplitude grows with each visit, caps at 12px
  well._danceAmp = Math.min((well._danceAmp || 0) + 3, 12);
  well._danceBpm = g.bpm;

  // Frequency shift with portamento (tone wells only)
  if (well.type === 'tone') {
    const scale   = SCALES[g.scale]?.notes || SCALES.pentatonic.notes;
    const noteIdx = Math.min(well.noteIdx ?? 0, scale.length - 1);
    const newFreq = getScaleNoteFrequency(g.scale, noteIdx, well.octave ?? 4);

    if (well._origFreq == null) {
      well._origFreq  = well.freq;
      well._origScale = well.scaleName;
    }
    well._freqFrom   = well.freq;
    well._freqTarget = newFreq;
    well._freqGlideT = 0;
    well.freq        = newFreq;
    well.scaleName   = g.scale;
  }
}

/**
 * Restore all wells to pre-visitation state. Call on session end.
 * @param {Object} s  game state
 */
export function restoreWells(s) {
  for (const w of s.wells) {
    if (w._origFreq != null) {
      w.freq      = w._origFreq;
      w.scaleName = w._origScale;
      delete w._origFreq;
      delete w._origScale;
    }
    // Clear all visitation state
    ['_danceVisitor','_danceRgb','_danceAmp','_danceBpm',
     '_selfPulses','_learnedFrom','_freqGlideT','_freqFrom','_freqTarget',
     'fleetOwnerColor','fleetOwnerRgb','fleetContested','fleetContestedRgb',
    ].forEach(k => delete w[k]);
  }
}
