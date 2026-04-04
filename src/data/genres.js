/** Genre definitions for Fleet Battle mode. */

export const GENRES = {
  trap: {
    label: 'TRAP', color: '#ff2244', rgb: '255,34,68',
    scale: 'harmonicMinor', bpm: 140, density: 3,
    shape: 'stealth', tempoFeel: 'fast',
  },
  lofi: {
    label: 'LO-FI', color: '#aa88ff', rgb: '170,136,255',
    scale: 'dorian', bpm: 80, density: 2,
    shape: 'vintage', tempoFeel: 'slow',
  },
  house: {
    label: 'HOUSE', color: '#ffbb00', rgb: '255,187,0',
    scale: 'lydian', bpm: 124, density: 4,
    shape: 'saucer', tempoFeel: 'medium',
  },
  boombap: {
    label: 'BOOM BAP', color: '#44dd88', rgb: '68,221,136',
    scale: 'pentatonic', bpm: 90, density: 3,
    shape: 'tank', tempoFeel: 'medium',
  },
  techno: {
    label: 'TECHNO', color: '#00ddff', rgb: '0,221,255',
    scale: 'wholeTone', bpm: 130, density: 3,
    shape: 'needle', tempoFeel: 'fast',
  },
};

export const GENRE_KEYS = Object.keys(GENRES);
