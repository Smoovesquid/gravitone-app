import { DRUM_ORDER } from "../audio/drums";
import { resizeLooper } from "../audio/sequencer";

const NOTE_KEYS = ["q", "w", "e", "r", "t", "y", "u", "i"];

/**
 * Build the keydown handler for Gravitone.
 * Returns a function suitable for addEventListener("keydown", ...).
 *
 * @param {{
 *   stateRef: React.MutableRefObject<import('../types').GameState>,
 *   setWellMode: (m: string) => void,
 *   setSelectedNoteIdx: (i: number) => void,
 *   setSelectedDrumType: (t: string) => void,
 *   setQuantize: (q: boolean) => void,
 *   setLoopsPaused: (p: boolean) => void,
 *   setShowJournal: (v: boolean) => void,
 *   cycleScale: () => void,
 *   cycleInstrument: () => void,
 *   cycleBpm: () => void,
 *   undoLastWell: () => void,
 *   clearAll: () => void,
 *   addToast: (msg: string) => void,
 * }} deps
 */
export function createKeyHandler(deps) {
  const {
    stateRef,
    setWellMode, setSelectedNoteIdx, setSelectedDrumType,
    setQuantize, setLoopsPaused, setShowJournal,
    cycleScale, cycleInstrument, cycleBpm,
    undoLastWell, clearAll, addToast,
  } = deps;

  return (e) => {
    const key = e.key.toLowerCase();
    const s = stateRef.current;

    // Well mode switching: 1-5
    if (key === "1") { s.wellMode = "tone";      setWellMode("tone");      return; }
    if (key === "2") { s.wellMode = "drum";      setWellMode("drum");      return; }
    if (key === "3") { s.wellMode = "blackhole"; setWellMode("blackhole"); return; }
    if (key === "4") { s.wellMode = "looper";    setWellMode("looper");    return; }
    if (key === "5") { s.wellMode = "station";   setWellMode("station");   return; }
    if (key === "6") { s.wellMode = "pulsar";    setWellMode("pulsar");    return; }
    if (key === "7") { s.wellMode = "neutronstar"; setWellMode("neutronstar"); return; }

    // Q-I: note select (tone mode) or drum select (drum/looper mode)
    const qiIdx = NOTE_KEYS.indexOf(key);
    if (qiIdx !== -1) {
      if (s.wellMode === "tone") {
        s.selectedNoteIdx = qiIdx; setSelectedNoteIdx(qiIdx);
      } else if (s.wellMode === "drum" || s.wellMode === "looper") {
        if (qiIdx < DRUM_ORDER.length) {
          s.selectedDrumType = DRUM_ORDER[qiIdx]; setSelectedDrumType(DRUM_ORDER[qiIdx]);
        }
      }
      return;
    }

    if (key === "s" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); cycleScale(); return; }
    if (key === "a" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); cycleInstrument(); return; }
    if (key === "tab") { e.preventDefault(); cycleBpm(); return; }

    if (key === "g") {
      const newQ = !s.quantize; s.quantize = newQ; setQuantize(newQ); return;
    }

    if (key === " ") {
      e.preventDefault();
      const newPaused = !s.loopsPaused;
      s.loopsPaused = newPaused; setLoopsPaused(newPaused);
      for (const w of s.wells) {
        if (w.type === "looper" && w.looper) w.looper.paused = newPaused;
      }
      addToast(newPaused ? "Loops paused" : "Loops playing");
      return;
    }

    if (key === "[" || key === "]") {
      const loopers = s.wells.filter((w) => w.type === "looper" && w.looper);
      if (loopers.length > 0) {
        let nearest = loopers[0], nearestDist = Infinity;
        for (const l of loopers) {
          const d = Math.sqrt((l.x - s.mouseX) ** 2 + (l.y - s.mouseY) ** 2);
          if (d < nearestDist) { nearest = l; nearestDist = d; }
        }
        resizeLooper(nearest.looper, nearest.looper.bars + (key === "]" ? 1 : -1));
        addToast(`${nearest.looper.bars} bars`);
      }
      return;
    }

    if (key === "z" && !e.metaKey && !e.ctrlKey) { undoLastWell(); return; }
    if (key === "backspace") { e.preventDefault(); undoLastWell(); return; }
    if (key === "x" && !e.metaKey && !e.ctrlKey) { clearAll(); return; }
    if (key === "escape") { setShowJournal(false); }
  };
}
