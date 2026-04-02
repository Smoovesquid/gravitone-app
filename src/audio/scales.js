// All musical scales — frequencies for octave 4-5 (middle C and up)

export const SCALES = {
  pentatonic: {
    name: "Pentatonic",
    notes: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25],
    description: "The universal feel-good scale",
    color: "#4ECDC4",
  },
  japanese: {
    name: "Japanese",
    notes: [261.63, 277.18, 329.63, 392.0, 415.3, 523.25, 554.37, 659.25],
    description: "Mysterious and meditative",
    color: "#F7AEF8",
  },
  blues: {
    name: "Blues",
    notes: [261.63, 311.13, 349.23, 369.99, 392.0, 466.16, 523.25, 622.25],
    description: "Soulful and expressive",
    color: "#72DDF7",
  },
  dorian: {
    name: "Dorian",
    notes: [261.63, 293.66, 311.13, 349.23, 392.0, 440.0, 466.16, 523.25],
    description: "Jazzy and sophisticated",
    color: "#FFE66D",
  },
  lydian: {
    name: "Lydian",
    notes: [261.63, 293.66, 329.63, 369.99, 392.0, 440.0, 493.88, 523.25],
    description: "Dreamy and floating",
    color: "#A8E6CF",
  },
  harmonicMinor: {
    name: "Harmonic Minor",
    notes: [261.63, 293.66, 311.13, 349.23, 392.0, 415.3, 493.88, 523.25],
    description: "Dark and dramatic",
    color: "#FF6B6B",
  },
  wholeTone: {
    name: "Whole Tone",
    notes: [261.63, 293.66, 329.63, 369.99, 415.3, 466.16, 523.25, 587.33],
    description: "Surreal and weightless",
    color: "#B8B8FF",
  },
  raga: {
    name: "Raga Bhairav",
    notes: [261.63, 277.18, 329.63, 349.23, 392.0, 415.3, 493.88, 523.25],
    description: "Ancient and transcendent",
    color: "#FF8A5C",
  },
  chromatic: {
    name: "Chromatic",
    notes: [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.0, 415.3, 440.0, 466.16, 493.88],
    description: "Every note — total freedom",
    color: "#fff",
  },
  microtonal: {
    name: "Microtonal",
    notes: [261.63, 272.0, 285.0, 298.0, 311.13, 325.0, 340.0, 355.0, 370.0, 385.0, 400.0, 420.0, 440.0, 460.0, 480.0, 500.0],
    description: "Between the cracks — alien intervals",
    color: "#66FFCC",
  },
};

export function getScaleNotes(scaleName) {
  return SCALES[scaleName]?.notes || SCALES.pentatonic.notes;
}

export function getScaleKeys() {
  return Object.keys(SCALES);
}

// Get the frequency for a scale note at a specific octave.
// The notes arrays are defined at octave 4 (C4 = 261.63 Hz as root).
// Multiply by 2^(octave-4) to shift to any octave.
export function getScaleNoteFrequency(scaleName, noteIdx, octave) {
  const notes = getScaleNotes(scaleName);
  const baseFreq = notes[noteIdx % notes.length];
  return baseFreq * Math.pow(2, octave - 4);
}

// Returns the supported octave range [2, 3, 4, 5, 6].
export function getOctaveRange() {
  return [2, 3, 4, 5, 6];
}

// Map a canvas y-position to an octave (2–6).
// y=0 is the top of the canvas (high pitch / treble).
// y=canvasHeight is the bottom (low pitch / bass).
// Zones (top→bottom): 0–20% → 6, 20–40% → 5, 40–60% → 4, 60–80% → 3, 80–100% → 2.
export function octaveFromY(y, canvasHeight) {
  const t = Math.max(0, Math.min(1, y / canvasHeight));
  if (t < 0.2) return 6;
  if (t < 0.4) return 5;
  if (t < 0.6) return 4;
  if (t < 0.8) return 3;
  return 2;
}

// Convert a frequency to a note name + octave string, e.g. "C4", "A3".
export function getNoteName(freq) {
  if (!freq || freq <= 0) return '';
  const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const midiNote = Math.round(12 * Math.log2(freq / 440) + 69);
  const name = NOTE_NAMES[((midiNote % 12) + 12) % 12];
  const oct = Math.floor(midiNote / 12) - 1;
  return `${name}${oct}`;
}
