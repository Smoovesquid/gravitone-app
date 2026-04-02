// Composition Journal — save/load/share/browse creations

const JOURNAL_KEY = "gravitone_journal";

// Save a composition snapshot
export function saveComposition(name, wells, settings) {
  const journal = loadJournal();
  const composition = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name || `Composition ${journal.length + 1}`,
    version: 2,
    createdAt: Date.now(),
    wells: wells.map((w) => ({
      x: w.x,
      y: w.y,
      mass: w.mass,
      type: w.type,
      freq: w.freq || 0,
      noteIdx: w.noteIdx || 0,
      octave: w.octave || 4,
      drumType: w.drumType || null,
      // Pulsar data
      pulsarGateRate: w.pulsarGateRate || null,
      pulsarRadius: w.pulsarRadius || null,
      // Quasar data
      loopType: w.loopType || null,
      radius: w.radius || 0,
      loopDuration: w.loopDuration || 0,
      bars: w.bars || 0,
      events: w.events ? w.events.map((e) => ({
        angle: e.angle,
        wellType: e.wellType,
        freq: e.freq,
        drumType: e.drumType,
        pan: e.pan,
        velocity: e.velocity,
        color: e.color,
      })) : [],
    })),
    settings: {
      scale: settings.scale || "pentatonic",
      instrument: settings.instrument || "sine",
      bpm: settings.bpm || 120,
      quantize: settings.quantize || false,
      world: settings.world || "nebula",
    },
    stars: 0, // self-rating
    wellCount: wells.length,
  };

  journal.push(composition);
  persistJournal(journal);
  return composition;
}

// Load all saved compositions
export function loadJournal() {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function persistJournal(journal) {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  } catch (e) {
    console.warn("Failed to save journal:", e);
  }
}

// Delete a composition
export function deleteComposition(id) {
  const journal = loadJournal().filter((c) => c.id !== id);
  persistJournal(journal);
  return journal;
}

// Rate a composition (1-5 stars)
export function rateComposition(id, stars) {
  const journal = loadJournal();
  const comp = journal.find((c) => c.id === id);
  if (comp) {
    comp.stars = Math.max(1, Math.min(5, stars));
    persistJournal(journal);
  }
  return journal;
}

// Rename a composition
export function renameComposition(id, newName) {
  const journal = loadJournal();
  const comp = journal.find((c) => c.id === id);
  if (comp) {
    comp.name = newName;
    persistJournal(journal);
  }
  return journal;
}

// Export as shareable JSON string
export function exportComposition(id) {
  const journal = loadJournal();
  const comp = journal.find((c) => c.id === id);
  if (!comp) return null;
  return btoa(JSON.stringify(comp));
}

// Import from shared JSON string
export function importComposition(encoded) {
  try {
    const comp = JSON.parse(atob(encoded));
    if (!comp.wells || !comp.settings) throw new Error("Invalid composition");
    if (!comp.version || comp.version < 2) {
      return { rejected: true, reason: "This composition was saved with an older format and can't be imported. Ask the creator to re-save it in Gravitone v2." };
    }
    comp.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    comp.name = (comp.name || "Imported") + " (remix)";
    comp.createdAt = Date.now();
    const journal = loadJournal();
    journal.push(comp);
    persistJournal(journal);
    return comp;
  } catch (e) {
    return null;
  }
}

// Get compositions sorted by most recent
export function getRecentCompositions(limit = 20) {
  return loadJournal()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

// Get favorites (starred)
export function getFavorites() {
  return loadJournal().filter((c) => c.stars > 0).sort((a, b) => b.stars - a.stars);
}
