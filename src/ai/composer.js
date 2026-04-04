/**
 * @fileoverview Algorithmic composition engine for the Imperial Battle Cruiser.
 * Generates musical moods, well target positions, and nudge deltas.
 * No LLM — pure music-theory math.
 */

import { SCALES } from '../audio/scales';

// Mood presets — scale + tempo feel + target well count
const MOODS = [
  { scale: 'pentatonic',    tempoFeel: 'medium', density: 3 },
  { scale: 'dorian',        tempoFeel: 'slow',   density: 2 },
  { scale: 'blues',         tempoFeel: 'medium', density: 4 },
  { scale: 'lydian',        tempoFeel: 'slow',   density: 2 },
  { scale: 'harmonicMinor', tempoFeel: 'fast',   density: 4 },
  { scale: 'wholeTone',     tempoFeel: 'slow',   density: 3 },
  { scale: 'raga',          tempoFeel: 'medium', density: 3 },
  { scale: 'japanese',      tempoFeel: 'slow',   density: 2 },
];

export const TEMPO_BPM = { slow: 80, medium: 120, fast: 150 };

/** Pick a random mood. */
export function generateMood() {
  return { ...MOODS[Math.floor(Math.random() * MOODS.length)] };
}

/**
 * Generate target positions/sizes for `mood.density` wells.
 *
 * Musical mapping:
 *   Y-axis: lower Y (top of canvas) = higher octave = higher pitch.
 *   X-axis: spread across canvas for stereo width.
 *   Mass:   heavier = wider gravity well = more prominent.
 *
 * @param {ReturnType<generateMood>} mood
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {Array<{x:number, y:number, mass:number, noteIdx:number, scaleName:string}>}
 */
export function generateWellTargets(mood, canvasWidth, canvasHeight) {
  const notes = SCALES[mood.scale]?.notes || SCALES.pentatonic.notes;
  const count = mood.density;
  const targets = [];

  for (let i = 0; i < count; i++) {
    // Spread note indices across the scale with slight jitter
    const baseIdx = Math.round((i / (count - 1 || 1)) * (notes.length - 1));
    const noteIdx = Math.max(0, Math.min(notes.length - 1,
      baseIdx + Math.round((Math.random() - 0.5) * 2)));

    // Higher note → smaller Y (closer to top of canvas)
    const pitchNorm = noteIdx / (notes.length - 1); // 0=low, 1=high
    const y = canvasHeight * (0.72 - pitchNorm * 0.52); // 20%–72%

    // Even X spread with slight jitter
    const xNorm = count > 1 ? i / (count - 1) : 0.5;
    const x = canvasWidth * (0.15 + xNorm * 0.70 + (Math.random() - 0.5) * 0.06);

    const mass = 45 + Math.random() * 75;
    targets.push({ x, y, mass, noteIdx, scaleName: mood.scale });
  }
  return targets;
}
