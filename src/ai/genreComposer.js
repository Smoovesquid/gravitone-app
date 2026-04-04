/**
 * @fileoverview Genre-specific mood generator for fleet battle ships.
 * Extends the composer.js concept with genre constraints.
 */

import { GENRES } from '../data/genres';
import { SCALES } from '../audio/scales';

/**
 * Generate a genre-locked mood (mirrors generateMood() API).
 * @param {string} genre
 * @returns {{ scale:string, tempoFeel:string, density:number, bpm:number }}
 */
export function generateGenreMood(genre) {
  const g = GENRES[genre];
  if (!g) return { scale: 'pentatonic', tempoFeel: 'medium', density: 3, bpm: 120 };
  return { scale: g.scale, tempoFeel: g.tempoFeel, density: g.density, bpm: g.bpm };
}

/**
 * Generate well target positions for a genre ship.
 * Ships prefer different vertical zones based on genre feel.
 * @param {string} genre
 * @param {number} cw  canvas width
 * @param {number} ch  canvas height
 * @param {number} count
 * @returns {Array<{x:number, y:number}>}
 */
export function genreWellTargets(genre, cw, ch, count = 3) {
  // Each genre gravitates to a different Y band (low=bottom, high=top)
  const yBias = { trap: 0.68, lofi: 0.42, house: 0.52, boombap: 0.62, techno: 0.36 };
  const cy = ch * (yBias[genre] ?? 0.5);
  const targets = [];
  for (let i = 0; i < count; i++) {
    const xn = count > 1 ? i / (count - 1) : 0.5;
    targets.push({
      x: cw * (0.15 + xn * 0.70 + (Math.random() - 0.5) * 0.08),
      y: Math.max(80, Math.min(ch - 100, cy + (Math.random() - 0.5) * ch * 0.2)),
    });
  }
  return targets;
}

/**
 * Get scale notes array for a genre (for AI well placement).
 * @param {string} genre
 * @returns {number[]}
 */
export function getGenreScale(genre) {
  const scaleName = GENRES[genre]?.scale || 'pentatonic';
  return SCALES[scaleName]?.notes || SCALES.pentatonic.notes;
}
