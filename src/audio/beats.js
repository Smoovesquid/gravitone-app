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
