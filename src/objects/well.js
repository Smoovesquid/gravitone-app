import { PALETTE } from "../data/palette";
import { DRUM_TYPES } from "../audio/drums";
import { createLooper } from "../audio/sequencer";
import { getScaleNoteFrequency } from "../audio/scales";

/**
 * Create a tone well data object.
 * @param {number} x
 * @param {number} y
 * @param {number} mass
 * @param {number} noteIdx
 * @param {number[]} scale  (unused — kept for API compatibility; octave-aware freq used instead)
 * @param {number} time
 * @param {string} scaleName
 * @param {number} octave
 * @returns {import('../types').Well}
 */
export function createToneWell(x, y, mass, noteIdx, scale, time, scaleName, octave) {
  const freq = scaleName && octave != null
    ? getScaleNoteFrequency(scaleName, noteIdx, octave)
    : scale[noteIdx % scale.length];
  return {
    x, y, mass,
    color: PALETTE[noteIdx % PALETTE.length],
    freq,
    noteIdx,
    octave: octave ?? 4,
    type: "tone",
    born: time,
    pulsePhase: Math.random() * Math.PI * 2,
  };
}

/**
 * Create a drum well data object.
 * @param {number} x
 * @param {number} y
 * @param {number} mass
 * @param {string} drumType
 * @param {number} time
 * @returns {import('../types').Well}
 */
export function createDrumWell(x, y, mass, drumType, time) {
  const drumDef = DRUM_TYPES[drumType];
  return {
    x, y, mass,
    color: drumDef.color,
    type: "drum",
    drumType,
    born: time,
    pulsePhase: 0,
  };
}

/**
 * Create a black hole data object.
 * @param {number} x
 * @param {number} y
 * @param {number} mass
 * @param {number} time
 * @returns {import('../types').Well}
 */
export function createBlackhole(x, y, mass, time) {
  return {
    x, y,
    mass: Math.max(mass, 80) * 1.5,
    color: { core: "#1a0030", glow: "rgba(80,0,120,0.4)" },
    type: "blackhole",
    born: time,
    pulsePhase: 0,
    lastAbsorb: 0,
  };
}

/**
 * Create a looper well data object.
 * @param {number} x
 * @param {number} y
 * @param {number} mass
 * @param {number} bpm
 * @param {number} time
 * @returns {import('../types').Well}
 */
export function createLooperWell(x, y, mass, bpm, time) {
  const looper = createLooper(x, y, bpm, 4);
  looper.loopStart = time;
  return {
    x, y, mass,
    color: { core: "#66CCFF", glow: "rgba(100,200,255,0.4)" },
    type: "looper",
    looper,
    born: time,
    pulsePhase: 0,
  };
}

/**
 * Create a warp station data object.
 * @param {number} x
 * @param {number} y
 * @param {number} mass
 * @param {number} time
 * @returns {import('../types').Well}
 */
export function createStation(x, y, mass, time) {
  return {
    x, y, mass,
    color: { core: "#FFCC33", glow: "rgba(255,204,51,0.4)" },
    type: "station",
    warpRadius: 180,
    born: time,
    pulsePhase: 0,
  };
}
