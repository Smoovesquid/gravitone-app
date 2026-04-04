/**
 * @fileoverview Battle well management — spawning and musical transformation.
 * Wells spawn at battle start to give ships territory. Claimed wells shift
 * to the genre's scale so the canvas sounds different as territory changes.
 */

import { GENRES } from '../data/genres';
import { SCALES, getScaleNoteFrequency, octaveFromY } from '../audio/scales';
import { createToneWell, createDrumWell } from './well';

const GENRE_DRUMS = {
  trap: 'kick', lofi: 'hihat', house: 'kick', boombap: 'snare', techno: 'kick',
};

/**
 * Spawn territory wells for each ship zone at battle start.
 * 2 tone wells + 1 drum well per zone, spread across canvas.
 * @param {Object} s  game state
 * @param {Object} fl fleet state
 */
export function initFleetWells(s, fl) {
  const { width: cw, height: ch, time } = s;

  for (const ship of fl.ships) {
    const g = GENRES[ship.genre];
    const scaleName = g.scale;
    const scale = SCALES[scaleName]?.notes || SCALES.pentatonic.notes;
    const zx = ship.homeZoneX;
    const spread = cw * 0.16;

    // Two tone wells per zone, vertically distributed
    for (let n = 0; n < 2; n++) {
      const x = zx + (Math.random() - 0.5) * spread;
      const y = ch * (0.28 + n * 0.28 + (Math.random() - 0.5) * 0.1);
      const noteIdx = Math.floor((n / 2) * (scale.length - 1));
      const octave = octaveFromY(y, ch);
      const w = createToneWell(x, y, 55 + Math.random() * 25, noteIdx, scale, time, scaleName, octave);
      w._fleetSpawned = true;
      s.wells.push(w);
    }

    // One drum well per zone
    const dx = zx + (Math.random() - 0.5) * spread * 0.7;
    const dy = ch * (0.62 + (Math.random() - 0.5) * 0.12);
    const dw = createDrumWell(dx, dy, 48, GENRE_DRUMS[ship.genre] || 'kick', time);
    dw._fleetSpawned = true;
    s.wells.push(dw);
  }
}

/**
 * Shift a tone well's frequency to the claiming ship's genre scale.
 * Stores original so it can be restored when the battle ends.
 * @param {Object} well
 * @param {Object} ship
 */
export function transformWell(well, ship) {
  if (well.type !== 'tone') return;
  const g = GENRES[ship.genre];
  if (!g) return;

  // Save original values once
  if (well._origFreq == null) {
    well._origFreq = well.freq;
    well._origScale = well.scaleName;
    well._origNoteIdx = well.noteIdx;
  }

  const scale = SCALES[g.scale]?.notes || SCALES.pentatonic.notes;
  const noteIdx = Math.min(well.noteIdx ?? 0, scale.length - 1);
  const newFreq = getScaleNoteFrequency(g.scale, noteIdx, well.octave ?? 4);
  well.scaleName = g.scale;

  // Portamento: glide from current freq to new target over ~550ms
  well._freqFrom   = well.freq;
  well._freqTarget = newFreq;
  well._freqGlideT = 0;
  // freq will be updated each tick in tickFleet; set now as fallback
  well.freq = newFreq;

  // Visual pulse to signal the change
  well.pulsePhase = Date.now() / 1000;
}

/**
 * Restore all transformed wells and clear fleet flags. Call when battle ends.
 * @param {Object} s  game state
 */
export function restoreWells(s) {
  for (const w of s.wells) {
    if (w._origFreq != null) {
      w.freq = w._origFreq;
      w.scaleName = w._origScale;
      w.noteIdx = w._origNoteIdx;
      delete w._origFreq; delete w._origScale; delete w._origNoteIdx;
    }
    w.fleetOwnerColor = null;
    w.fleetOwnerRgb = null;
    w.fleetContested = false;
    w.fleetContestedRgb = null;
  }
}

/**
 * Remove wells that were spawned by the fleet battle.
 * @param {Object} s
 */
export function removeFleetWells(s) {
  for (let i = s.wells.length - 1; i >= 0; i--) {
    if (s.wells[i]._fleetSpawned) s.wells.splice(i, 1);
  }
}
