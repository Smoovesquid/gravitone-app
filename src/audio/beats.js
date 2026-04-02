// Sick beat generator — pre-built patterns + randomization
// All patterns are arrays of { step (0-15 sixteenths), type, drumType/noteIdx }

const DRUM_PATTERNS = [
  // Classic boom-bap
  {
    name: "Boom Bap",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 6, type: "drum", drumType: "kick" },
      { step: 8, type: "drum", drumType: "snare" },
      { step: 10, type: "drum", drumType: "kick" },
      { step: 12, type: "drum", drumType: "snare" },
      { step: 0, type: "drum", drumType: "hihat" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 4, type: "drum", drumType: "hihat" },
      { step: 6, type: "drum", drumType: "hihat" },
      { step: 8, type: "drum", drumType: "hihat" },
      { step: 10, type: "drum", drumType: "hihat" },
      { step: 12, type: "drum", drumType: "hihat" },
      { step: 14, type: "drum", drumType: "hihat" },
    ],
  },
  // Four on the floor
  {
    name: "Four Floor",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "kick" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 12, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "clap" },
      { step: 12, type: "drum", drumType: "clap" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 6, type: "drum", drumType: "hihat" },
      { step: 10, type: "drum", drumType: "hihat" },
      { step: 14, type: "drum", drumType: "hihat" },
    ],
  },
  // Trap
  {
    name: "Trap",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 3, type: "drum", drumType: "kick" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 14, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 12, type: "drum", drumType: "snare" },
      { step: 0, type: "drum", drumType: "hihat" },
      { step: 1, type: "drum", drumType: "hihat" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 3, type: "drum", drumType: "hihat" },
      { step: 4, type: "drum", drumType: "hihat" },
      { step: 5, type: "drum", drumType: "hihat" },
      { step: 6, type: "drum", drumType: "hihat" },
      { step: 7, type: "drum", drumType: "hihat" },
      { step: 8, type: "drum", drumType: "hihat" },
      { step: 9, type: "drum", drumType: "hihat" },
      { step: 10, type: "drum", drumType: "hihat" },
      { step: 11, type: "drum", drumType: "hihat" },
      { step: 12, type: "drum", drumType: "hihat" },
      { step: 13, type: "drum", drumType: "hihat" },
      { step: 14, type: "drum", drumType: "hihat" },
      { step: 15, type: "drum", drumType: "hihat" },
    ],
  },
  // Reggaeton
  {
    name: "Reggaeton",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 3, type: "drum", drumType: "snare" },
      { step: 4, type: "drum", drumType: "kick" },
      { step: 7, type: "drum", drumType: "snare" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 11, type: "drum", drumType: "snare" },
      { step: 12, type: "drum", drumType: "kick" },
      { step: 15, type: "drum", drumType: "snare" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 6, type: "drum", drumType: "hihat" },
      { step: 10, type: "drum", drumType: "hihat" },
      { step: 14, type: "drum", drumType: "hihat" },
    ],
  },
  // Broken / syncopated
  {
    name: "Broken",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 5, type: "drum", drumType: "kick" },
      { step: 10, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 12, type: "drum", drumType: "clap" },
      { step: 14, type: "drum", drumType: "rimshot" },
      { step: 0, type: "drum", drumType: "hihat" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 4, type: "drum", drumType: "hihat" },
      { step: 7, type: "drum", drumType: "hihat" },
      { step: 8, type: "drum", drumType: "hihat" },
      { step: 11, type: "drum", drumType: "hihat" },
      { step: 13, type: "drum", drumType: "hihat" },
    ],
  },
  // Halftime
  {
    name: "Halftime",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 8, type: "drum", drumType: "snare" },
      { step: 6, type: "drum", drumType: "kick" },
      { step: 0, type: "drum", drumType: "hihat" },
      { step: 4, type: "drum", drumType: "hihat" },
      { step: 8, type: "drum", drumType: "hihat" },
      { step: 12, type: "drum", drumType: "hihat" },
      { step: 2, type: "drum", drumType: "shaker" },
      { step: 10, type: "drum", drumType: "shaker" },
      { step: 14, type: "drum", drumType: "shaker" },
    ],
  },
  // Industrial
  {
    name: "Industrial",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 2, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 10, type: "drum", drumType: "kick" },
      { step: 12, type: "drum", drumType: "snare" },
      { step: 14, type: "drum", drumType: "cowbell" },
      { step: 6, type: "drum", drumType: "rimshot" },
    ],
  },
  // Jazzy
  {
    name: "Jazzy",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 7, type: "drum", drumType: "kick" },
      { step: 12, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 10, type: "drum", drumType: "rimshot" },
      { step: 0, type: "drum", drumType: "hihat" },
      { step: 3, type: "drum", drumType: "hihat" },
      { step: 6, type: "drum", drumType: "hihat" },
      { step: 9, type: "drum", drumType: "hihat" },
      { step: 12, type: "drum", drumType: "hihat" },
      { step: 15, type: "drum", drumType: "hihat" },
    ],
  },
  // Techno — relentless 4/4 with offbeat hats and sparse percussion
  {
    name: "Techno",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "kick" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 12, type: "drum", drumType: "kick" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 6, type: "drum", drumType: "hihat" },
      { step: 10, type: "drum", drumType: "hihat" },
      { step: 14, type: "drum", drumType: "hihat" },
      { step: 4, type: "drum", drumType: "clap" },
      { step: 12, type: "drum", drumType: "clap" },
      { step: 11, type: "drum", drumType: "rimshot" },
      { step: 15, type: "drum", drumType: "shaker" },
    ],
  },
  // Metalcore — double kick blast with snare on 2 and 4
  {
    name: "Metalcore",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 1, type: "drum", drumType: "kick" },
      { step: 2, type: "drum", drumType: "kick" },
      { step: 3, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 5, type: "drum", drumType: "kick" },
      { step: 6, type: "drum", drumType: "kick" },
      { step: 7, type: "drum", drumType: "kick" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 9, type: "drum", drumType: "kick" },
      { step: 10, type: "drum", drumType: "kick" },
      { step: 11, type: "drum", drumType: "kick" },
      { step: 12, type: "drum", drumType: "snare" },
      { step: 13, type: "drum", drumType: "kick" },
      { step: 14, type: "drum", drumType: "kick" },
      { step: 15, type: "drum", drumType: "kick" },
      { step: 0, type: "drum", drumType: "hihat" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 4, type: "drum", drumType: "hihat" },
      { step: 6, type: "drum", drumType: "hihat" },
      { step: 8, type: "drum", drumType: "hihat" },
      { step: 10, type: "drum", drumType: "hihat" },
      { step: 12, type: "drum", drumType: "hihat" },
      { step: 14, type: "drum", drumType: "hihat" },
    ],
  },
  // DnB — fast breakbeat feel at 170+ BPM, snare on 2nd beat
  {
    name: "DnB",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 6, type: "drum", drumType: "kick" },
      { step: 10, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 12, type: "drum", drumType: "snare" },
      { step: 0, type: "drum", drumType: "hihat" },
      { step: 1, type: "drum", drumType: "hihat" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 3, type: "drum", drumType: "hihat" },
      { step: 5, type: "drum", drumType: "hihat" },
      { step: 7, type: "drum", drumType: "hihat" },
      { step: 8, type: "drum", drumType: "hihat" },
      { step: 9, type: "drum", drumType: "hihat" },
      { step: 11, type: "drum", drumType: "hihat" },
      { step: 13, type: "drum", drumType: "hihat" },
      { step: 14, type: "drum", drumType: "hihat" },
      { step: 15, type: "drum", drumType: "hihat" },
    ],
  },
  // Gabber — distorted kick on every 16th, clap on 2 and 4
  {
    name: "Gabber",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 2, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "kick" },
      { step: 6, type: "drum", drumType: "kick" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 10, type: "drum", drumType: "kick" },
      { step: 12, type: "drum", drumType: "kick" },
      { step: 14, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "clap" },
      { step: 12, type: "drum", drumType: "clap" },
      { step: 7, type: "drum", drumType: "cowbell" },
      { step: 15, type: "drum", drumType: "cowbell" },
    ],
  },
  // Dub — sparse, deep kick with rimshots and shaker
  {
    name: "Dub",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 10, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 12, type: "drum", drumType: "rimshot" },
      { step: 2, type: "drum", drumType: "shaker" },
      { step: 6, type: "drum", drumType: "shaker" },
      { step: 10, type: "drum", drumType: "shaker" },
      { step: 14, type: "drum", drumType: "shaker" },
      { step: 7, type: "drum", drumType: "tom" },
      { step: 15, type: "drum", drumType: "tom" },
    ],
  },
  // UK Garage — shuffled 2-step with offbeat bass
  {
    name: "2-Step",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 7, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 12, type: "drum", drumType: "snare" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 5, type: "drum", drumType: "hihat" },
      { step: 8, type: "drum", drumType: "hihat" },
      { step: 11, type: "drum", drumType: "hihat" },
      { step: 14, type: "drum", drumType: "hihat" },
      { step: 9, type: "drum", drumType: "shaker" },
      { step: 1, type: "drum", drumType: "shaker" },
    ],
  },
  // Footwork — frantic juke, 160 BPM territory, kick triplets
  {
    name: "Footwork",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 3, type: "drum", drumType: "kick" },
      { step: 5, type: "drum", drumType: "kick" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 11, type: "drum", drumType: "kick" },
      { step: 13, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 12, type: "drum", drumType: "clap" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 6, type: "drum", drumType: "hihat" },
      { step: 9, type: "drum", drumType: "hihat" },
      { step: 14, type: "drum", drumType: "hihat" },
      { step: 7, type: "drum", drumType: "tom" },
      { step: 15, type: "drum", drumType: "tom" },
    ],
  },
  // Afrobeat — polyrhythmic, cowbell-heavy
  {
    name: "Afrobeat",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 6, type: "drum", drumType: "kick" },
      { step: 10, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "snare" },
      { step: 12, type: "drum", drumType: "snare" },
      { step: 0, type: "drum", drumType: "cowbell" },
      { step: 3, type: "drum", drumType: "cowbell" },
      { step: 6, type: "drum", drumType: "cowbell" },
      { step: 8, type: "drum", drumType: "cowbell" },
      { step: 11, type: "drum", drumType: "cowbell" },
      { step: 14, type: "drum", drumType: "cowbell" },
      { step: 2, type: "drum", drumType: "shaker" },
      { step: 5, type: "drum", drumType: "shaker" },
      { step: 9, type: "drum", drumType: "shaker" },
      { step: 13, type: "drum", drumType: "shaker" },
    ],
  },
  // Blast beat — extreme speed: kick+snare on every 16th, ride on 8ths
  {
    name: "Blast Beat",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 1, type: "drum", drumType: "snare" },
      { step: 2, type: "drum", drumType: "kick" },
      { step: 3, type: "drum", drumType: "snare" },
      { step: 4, type: "drum", drumType: "kick" },
      { step: 5, type: "drum", drumType: "snare" },
      { step: 6, type: "drum", drumType: "kick" },
      { step: 7, type: "drum", drumType: "snare" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 9, type: "drum", drumType: "snare" },
      { step: 10, type: "drum", drumType: "kick" },
      { step: 11, type: "drum", drumType: "snare" },
      { step: 12, type: "drum", drumType: "kick" },
      { step: 13, type: "drum", drumType: "snare" },
      { step: 14, type: "drum", drumType: "kick" },
      { step: 15, type: "drum", drumType: "snare" },
      { step: 0, type: "drum", drumType: "hihat" },
      { step: 4, type: "drum", drumType: "hihat" },
      { step: 8, type: "drum", drumType: "hihat" },
      { step: 12, type: "drum", drumType: "hihat" },
    ],
  },
  // Dembow — dancehall riddim, signature snare pattern
  {
    name: "Dembow",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 4, type: "drum", drumType: "kick" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 12, type: "drum", drumType: "kick" },
      { step: 3, type: "drum", drumType: "snare" },
      { step: 7, type: "drum", drumType: "snare" },
      { step: 11, type: "drum", drumType: "snare" },
      { step: 15, type: "drum", drumType: "snare" },
      { step: 2, type: "drum", drumType: "hihat" },
      { step: 6, type: "drum", drumType: "hihat" },
      { step: 10, type: "drum", drumType: "hihat" },
      { step: 14, type: "drum", drumType: "hihat" },
      { step: 5, type: "drum", drumType: "tom" },
      { step: 13, type: "drum", drumType: "tom" },
    ],
  },
  // Electro — robotic, heavy on the 1 and 3
  {
    name: "Electro",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 2, type: "drum", drumType: "clap" },
      { step: 4, type: "drum", drumType: "kick" },
      { step: 8, type: "drum", drumType: "kick" },
      { step: 10, type: "drum", drumType: "clap" },
      { step: 12, type: "drum", drumType: "kick" },
      { step: 1, type: "drum", drumType: "hihat" },
      { step: 3, type: "drum", drumType: "hihat" },
      { step: 5, type: "drum", drumType: "hihat" },
      { step: 7, type: "drum", drumType: "hihat" },
      { step: 9, type: "drum", drumType: "hihat" },
      { step: 11, type: "drum", drumType: "hihat" },
      { step: 13, type: "drum", drumType: "hihat" },
      { step: 15, type: "drum", drumType: "hihat" },
      { step: 6, type: "drum", drumType: "cowbell" },
      { step: 14, type: "drum", drumType: "cowbell" },
    ],
  },
  // Latin — clave pattern with congas/toms
  {
    name: "Latin",
    events: [
      { step: 0, type: "drum", drumType: "kick" },
      { step: 6, type: "drum", drumType: "kick" },
      { step: 12, type: "drum", drumType: "kick" },
      { step: 3, type: "drum", drumType: "clap" },
      { step: 10, type: "drum", drumType: "clap" },
      { step: 0, type: "drum", drumType: "tom" },
      { step: 3, type: "drum", drumType: "tom" },
      { step: 6, type: "drum", drumType: "tom" },
      { step: 10, type: "drum", drumType: "tom" },
      { step: 12, type: "drum", drumType: "tom" },
      { step: 2, type: "drum", drumType: "shaker" },
      { step: 4, type: "drum", drumType: "shaker" },
      { step: 8, type: "drum", drumType: "shaker" },
      { step: 14, type: "drum", drumType: "shaker" },
    ],
  },
];

// Melodic riff patterns (note indices into current scale)
const MELODY_PATTERNS = [
  // Ascending arp
  [0, 2, 4, 6],
  // Descending arp
  [7, 5, 3, 1],
  // Call and response
  [0, 2, 4, null, 3, 1, 0, null],
  // Pentatonic bounce
  [0, 4, 2, 5, 1, 3],
  // Octave jump
  [0, 4, 0, 5, 2, 6],
  // Staccato
  [0, null, null, 2, null, null, 4, null, null, 6, null, null],
  // Syncopated
  [null, 0, null, 3, 1, null, 4, null, 2, null, null, 5],
  // Dark descent
  [6, 5, 4, 3, 2, 1, 0, null],
  // Triads
  [0, 2, 4, null, 1, 3, 5, null],
  // Hammer
  [0, 0, null, 0, null, null, 4, null, 0, null, null, 3],
  // Chromatic run
  [0, 1, 2, 3, 4, 5, 6, 7],
  // Wide intervals
  [0, 5, 1, 6, 2, 7, 3, null],
];

// Generate a sick beat: drums + optional melody, mapped to looper events
export function generateSickBeat(bars, scaleNotes) {
  const totalSixteenths = bars * 16;
  const events = [];

  // Pick a random drum pattern
  const drumPattern = DRUM_PATTERNS[Math.floor(Math.random() * DRUM_PATTERNS.length)];

  // Lay drum pattern across all bars
  for (let bar = 0; bar < bars; bar++) {
    const barOffset = bar * 16;
    for (const hit of drumPattern.events) {
      const step = barOffset + hit.step;
      if (step >= totalSixteenths) continue;
      const angle = (step / totalSixteenths) * Math.PI * 2;
      events.push({
        angle,
        type: "drum",
        drumType: hit.drumType,
        id: `drum-${hit.drumType}`,
        addedOnCycle: 0,
        lastFired: 0,
      });
    }
  }

  // 70% chance to also add a melody
  if (Math.random() < 0.7 && scaleNotes && scaleNotes.length > 0) {
    const melodyPattern = MELODY_PATTERNS[Math.floor(Math.random() * MELODY_PATTERNS.length)];
    // Spread melody across bars, 1 note per beat (every 4 sixteenths)
    let melIdx = 0;
    for (let bar = 0; bar < bars; bar++) {
      for (let beat = 0; beat < 4; beat++) {
        const noteEntry = melodyPattern[melIdx % melodyPattern.length];
        melIdx++;
        if (noteEntry === null || noteEntry === undefined) continue;
        const noteIdx = noteEntry % scaleNotes.length;
        const step = bar * 16 + beat * 4;
        if (step >= totalSixteenths) continue;
        const angle = (step / totalSixteenths) * Math.PI * 2;
        events.push({
          angle,
          type: "tone",
          freq: scaleNotes[noteIdx],
          noteIdx,
          id: `tone-${noteIdx}`,
          addedOnCycle: 0,
          lastFired: 0,
        });
      }
    }
  }

  return { events, patternName: drumPattern.name };
}
