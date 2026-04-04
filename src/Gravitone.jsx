import { useState, useEffect, useRef, useCallback } from "react";

// Audio
import { createAudioEngine, resumeAudio } from "./audio/engine";
import { SCALES, getScaleNotes, getScaleKeys, getScaleNoteFrequency, octaveFromY } from "./audio/scales";
import { playNote, playBass, playAbsorb, getInstrumentKeys } from "./audio/instruments";
import { playDrum, DRUM_TYPES } from "./audio/drums";
import { createLooper, updateLooperPhase, captureEvent, toggleEventAtAngle, isClickOnCenter, clearLooper, getEventsToFire, isWellInsideLooper } from "./audio/sequencer";
import { getMaxWarp, getWarpParams, playWarpedNote } from "./audio/warp";
import { generateSickBeat } from "./audio/beats";

// Data
import { THEME } from "./data/theme";
import { PALETTE } from "./data/palette";

// UI
import Toolbar from "./ui/Toolbar";
import ToastContainer from "./ui/Toast";
import Journal from "./ui/Journal";
import { saveComposition } from "./game/journal";

// Render modules
import { drawBackground } from "./render/background";
import { drawWells } from "./render/wells";
import { drawParticles } from "./render/particles";
import { drawAliens } from "./render/aliens";
import { drawBeatIndicator } from "./render/ui";
import { drawInteractions } from "./render/interactions";

// Physics modules
import { tickParticles, spawnParticlesAt } from "./physics/particles";
import { tickAliens } from "./physics/aliens";
import { applyProximityEffects } from "./physics/interactions";

// Game objects
import { tickMagnetars } from "./objects/magnetar";
import { createToneWell, createDrumWell, createBlackhole, createLooperWell, createStation } from "./objects/well";
import { createPulsar, tickPulsars } from "./objects/pulsar";
import { createNeutronStar, tickNeutronStars } from "./objects/neutronStar";
import { createQuasar, tickQuasars, disposeQuasar } from "./objects/quasar";
import { createCruiser, tickCruiser } from "./objects/cruiser";

// Cruiser audio + render
import { startCruiserHum, stopCruiserHum } from "./audio/cruiser";
import { drawCruiser } from "./render/cruiser";

// Fleet Battle
import { createFleet, tickFleet } from "./objects/fleet";
import { drawFleet } from "./render/fleet";

// Input
import { createKeyHandler } from "./input/keyboard";

// ===== CONSTANTS =====
const BPM_PRESETS = [80, 100, 120, 140, 160];

// ===== COMPONENT =====
export default function Gravitone() {
  const canvasRef = useRef(null);

  // UI state (React re-render triggers toolbar updates only)
  const [wellCount, setWellCount] = useState(0);
  const [particleCount, setParticleCount] = useState(0);
  const [scaleName, setScaleName] = useState("pentatonic");
  const [instrumentName, setInstrumentName] = useState("sine");
  const [started, setStarted] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [wellMode, setWellMode] = useState("tone");
  const [bpm, setBpm] = useState(120);
  const [quantize, setQuantize] = useState(false);
  const [selectedNoteIdx, setSelectedNoteIdx] = useState(0);
  const [selectedDrumType, setSelectedDrumType] = useState("kick");
  const [toasts, setToasts] = useState([]);
  const [showJournal, setShowJournal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [loopsPaused, setLoopsPaused] = useState(false);

  // Canvas state — mutable game world, never triggers re-render.
  // Architecture: stateRef.current = game world; useState above = UI settings only.
  // Do NOT read stateRef.current in JSX; do NOT put physics data in useState.
  const stateRef = useRef({
    wells: [],
    particles: [],
    audioCtx: null,
    scale: getScaleNotes("pentatonic"),
    scaleName: "pentatonic",
    instrument: "sine",
    mouseDown: false,
    mouseX: 0,
    mouseY: 0,
    holdStart: 0,
    time: 0,
    width: 0,
    height: 0,
    dpr: 1,
    wellMode: "tone",
    selectedNoteIdx: 0,
    selectedDrumType: "kick",
    bpm: 120,
    quantize: false,
    onBeat: false,
    beatPulse: 0,
    loopsPaused: false,
    stars: [],
    lastSixteenth: -1,
    aliens: [],
    nextAlienSpawn: 15 + Math.random() * 15,
    _activeInteractions: [],
    hoveredWellId: null,
    wanderers: [],
    draggingWellIdx: null,
    lastInteraction: 0,   // s.time at last user click/key — for idle detection
    cruiser: null,        // active CruiserState | null
    cruiserHumHandle: null,
    fleet: null,          // active FleetBattle state | null
  });

  const undoStackRef = useRef([]);
  const rafRef = useRef(null);

  // Generate stars once
  useEffect(() => {
    const s = stateRef.current;
    const numStars = Math.floor(THEME.starDensity * 200);
    s.stars = [];
    for (let i = 0; i < numStars; i++) {
      s.stars.push({
        x: Math.random(), y: Math.random(),
        size: 0.5 + Math.random() * 1.5,
        color: THEME.starColors[Math.floor(Math.random() * THEME.starColors.length)],
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 2,
      });
    }
  }, []);

  // Toast helpers
  const addToast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, message }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const initAudio = useCallback(() => {
    if (!stateRef.current.audioCtx) stateRef.current.audioCtx = createAudioEngine();
    resumeAudio();
  }, []);

  // ===== ADD WELL =====
  const addWell = useCallback((x, y, mass) => {
    const s = stateRef.current;
    let well;

    if (s.wellMode === "tone") {
      const octave = octaveFromY(y, s.height);
      well = createToneWell(x, y, mass, s.selectedNoteIdx, s.scale, s.time, s.scaleName, octave);
      playBass(s.audioCtx, well.freq);
    } else if (s.wellMode === "drum") {
      well = createDrumWell(x, y, mass, s.selectedDrumType, s.time);
      playDrum(s.audioCtx, s.selectedDrumType, (x / s.width) * 2 - 1);
    } else if (s.wellMode === "blackhole") {
      well = createBlackhole(x, y, mass, s.time);
      playAbsorb(s.audioCtx, 200, (x / s.width) * 2 - 1);
    } else if (s.wellMode === "looper") {
      well = createLooperWell(x, y, mass, s.bpm, s.time);
      playNote(s.audioCtx, 880, (x / s.width) * 2 - 1, 0.2, s.instrument);
    } else if (s.wellMode === "station") {
      well = createStation(x, y, mass, s.time);
      playNote(s.audioCtx, 660, (x / s.width) * 2 - 1, 0.15, "fmBell");
    } else if (s.wellMode === "pulsar") {
      well = createPulsar(x, y, mass, s.bpm, s.time);
      playNote(s.audioCtx, 1200, (x / s.width) * 2 - 1, 0.12, "fmBell");
    } else if (s.wellMode === "neutronstar") {
      well = createNeutronStar(x, y, mass, s.time);
      playNote(s.audioCtx, 220, (x / s.width) * 2 - 1, 0.15, "sine");
    } else if (s.wellMode === "quasar") {
      well = createQuasar(x, y, mass, s.time, Math.random() * Math.PI * 2);
      playNote(s.audioCtx, 440, (x / s.width) * 2 - 1, 0.12, "sine");
    } else {
      return;
    }

    s.wells.push(well);

    // Capture into any recording looper that contains this new well
    if (well.type === "tone" || well.type === "drum") {
      for (const lw of s.wells) {
        if (lw.type !== "looper" || !lw.looper || !lw.looper.recording) continue;
        if (isWellInsideLooper(lw.looper, x, y)) {
          const sound = well.type === "drum"
            ? { type: "drum", drumType: well.drumType, id: `drum-${well.drumType}` }
            : { type: "tone", freq: well.freq, noteIdx: well.noteIdx, id: `tone-${well.noteIdx}` };
          captureEvent(lw.looper, s.time, sound);
        }
      }
    }

    undoStackRef.current.push(s.wells.length - 1);
    setWellCount(s.wells.length);
  }, []);

  const undoLastWell = useCallback(() => {
    const s = stateRef.current;
    if (s.wells.length === 0) return;
    // Find last non-removing well
    let idx = s.wells.length - 1;
    while (idx >= 0 && s.wells[idx].removing) idx--;
    if (idx < 0) return;
    // Trigger removal animation (500ms) instead of instant removal
    s.wells[idx].removing = true;
    s.wells[idx].removeProgress = 0;
    undoStackRef.current.pop();
    addToast("Undo");
  }, [addToast]);

  const clearAll = useCallback(() => {
    const s = stateRef.current;
    for (const w of s.wells) { if (w.type === "quasar") disposeQuasar(w); }
    s.wells = []; s.particles = []; undoStackRef.current = [];
    setWellCount(0); setParticleCount(0);
  }, []);

  const cycleScale = useCallback(() => {
    const keys = getScaleKeys();
    const s = stateRef.current;
    const idx = (keys.indexOf(s.scaleName) + 1) % keys.length;
    const newName = keys[idx];
    s.scale = SCALES[newName].notes; s.scaleName = newName; setScaleName(newName);
    s.wells.forEach((w) => {
      if (w.type === "tone") w.freq = getScaleNoteFrequency(newName, w.noteIdx, w.octave ?? 4);
    });
  }, []);

  const cycleInstrument = useCallback(() => {
    const keys = getInstrumentKeys();
    const s = stateRef.current;
    const idx = (keys.indexOf(s.instrument) + 1) % keys.length;
    s.instrument = keys[idx]; setInstrumentName(keys[idx]);
  }, []);

  const cycleBpm = useCallback(() => {
    const idx = (BPM_PRESETS.indexOf(stateRef.current.bpm) + 1) % BPM_PRESETS.length;
    stateRef.current.bpm = BPM_PRESETS[idx]; setBpm(BPM_PRESETS[idx]);
  }, []);

  // Stable ref to addToast for use inside the RAF loop (avoids stale closure)
  const addToastRef = useRef(addToast);
  useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  // Toggle cruiser on/off — called by keyboard shortcut "9" and toolbar button
  const toggleCruiser = useCallback(() => {
    const s = stateRef.current;
    if (s.cruiser && s.cruiser.state !== 'exiting') {
      s.cruiser.state = 'exiting';
      s.lastInteraction = s.time;
    } else if (!s.cruiser) {
      s.cruiser = createCruiser(s.width, s.height);
      if (s.audioCtx) s.cruiserHumHandle = startCruiserHum(s.audioCtx);
    }
  }, []);

  // Toggle fleet battle on/off — called by "B" key
  const toggleFleet = useCallback(() => {
    const s = stateRef.current;
    if (s.fleet && s.fleet.active) {
      s.fleet.active = false;
      addToast('Fleet battle ended');
    } else {
      // Exit cruiser if active
      if (s.cruiser && s.cruiser.state !== 'exiting') s.cruiser.state = 'exiting';
      s.fleet = createFleet(s.width, s.height);
      addToast('⚔ FLEET BATTLE BEGINS — Press B to end');
    }
  }, [addToast]);

  // ===== KEYBOARD =====
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleKey = createKeyHandler({
      stateRef,
      setWellMode, setSelectedNoteIdx, setSelectedDrumType,
      setQuantize, setLoopsPaused, setShowJournal,
      cycleScale, cycleInstrument, cycleBpm,
      undoLastWell, clearAll, addToast,
      onToggleCruiser: toggleCruiser,
      onToggleFleet: toggleFleet,
    });
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoLastWell, clearAll, addToast, toggleCruiser, toggleFleet]);

  // ===== MAIN LOOP =====
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = stateRef.current;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      s.dpr = window.devicePixelRatio || 1;
      s.width = rect.width; s.height = rect.height;
      canvas.width = rect.width * s.dpr; canvas.height = rect.height * s.dpr;
      canvas.style.width = rect.width + "px"; canvas.style.height = rect.height + "px";
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      s.time += dt;

      // ---- Beat detection (scheduler — kept here, extracted last per eng review) ----
      const sixteenthDur = 60 / s.bpm / 4;
      if (s.quantize) {
        const currSixteenth = Math.floor(s.time / sixteenthDur);
        const prevSixteenth = Math.floor((s.time - dt) / sixteenthDur);
        if (currSixteenth > prevSixteenth) {
          s.onBeat = true;
          s.beatPulse = (currSixteenth % 4 === 0) ? 1.0 : 0.3;
        } else {
          s.onBeat = false;
        }
        s.beatPulse = Math.max(0, s.beatPulse - dt * 8);
      } else {
        s.onBeat = false; s.beatPulse = 0;
      }

      // ---- Looper update + playback (scheduler — kept here) ----
      const stationsForWarp = s.wells.filter((sw) => sw.type === "station");
      for (const w of s.wells) {
        if (w.type !== "looper" || !w.looper) continue;
        const lp = w.looper;
        if (lp.paused) continue;
        updateLooperPhase(lp, s.time);
        const toFire = getEventsToFire(lp, s.time, dt);
        for (const evt of toFire) {
          const pan = (w.x / s.width) * 2 - 1;
          const prox = getMaxWarp(w, stationsForWarp);
          const warpP = getWarpParams(prox);
          if (evt.type === "drum") {
            playDrum(s.audioCtx, evt.drumType, pan, 0.7);
          } else if (evt.type === "tone") {
            if (warpP) {
              const instPlay = (a, f, p2, v) => playNote(a, f, p2, v, s.instrument);
              playWarpedNote(s.audioCtx, instPlay, evt.freq, pan, 0.6, warpP);
            } else {
              playNote(s.audioCtx, evt.freq, pan, 0.6, s.instrument);
            }
          }
          w.pulsePhase = s.time;
        }
      }

      // ---- Mouse particle spray (not while dragging) ----
      if (s.mouseDown && s.draggingWellIdx === null && s.wells.length > 0) {
        const elapsed = s.time - s.holdStart;
        const rate = Math.min(1 + elapsed * 3, 8);
        if (Math.random() < rate * dt * 60)
          spawnParticlesAt(s, s.mouseX + (Math.random() - 0.5) * 30, s.mouseY + (Math.random() - 0.5) * 30, 1);
      }

      // ---- Ambient particle spawning ----
      if (s.wells.length > 0 && s.particles.length < 15) {
        const spawnWells = s.wells.filter((w) => w.type !== "looper" && w.type !== "station" && w.type !== "pulsar" && w.type !== "neutronstar" && w.type !== "quasar");
        if (spawnWells.length > 0) {
          const w = spawnWells[Math.floor(Math.random() * spawnWells.length)];
          const angle = Math.random() * Math.PI * 2;
          spawnParticlesAt(s, w.x + Math.cos(angle) * (80 + Math.random() * 120), w.y + Math.sin(angle) * (80 + Math.random() * 120), 1);
        }
      }

      // ---- Hover scale + removal animation ----
      for (let wi = s.wells.length - 1; wi >= 0; wi--) {
        const w = s.wells[wi];
        // Hover scale lerp (0.08 per DESIGN.md)
        const isHovered = wi === s.hoveredWellId;
        const target = isHovered ? 1.2 : 1.0;
        w.hoverScale = (w.hoverScale || 1) + (target - (w.hoverScale || 1)) * 0.08;
        // Removal animation
        if (w.removing) {
          w.removeProgress = (w.removeProgress || 0) + dt / 0.5; // 500ms
          if (w.removeProgress >= 1) {
            if (w.type === "quasar") disposeQuasar(w);
            s.wells.splice(wi, 1);
            setWellCount(s.wells.length);
          }
        }
      }

      // ---- Idle detection → spawn cruiser after 60s ----
      if (!s.cruiser && s.lastInteraction > 0) {
        const idle = s.time - s.lastInteraction;
        if (idle >= 60) {
          s.cruiser = createCruiser(s.width, s.height);
          if (s.audioCtx) s.cruiserHumHandle = startCruiserHum(s.audioCtx);
          s.lastInteraction = s.time; // avoid re-triggering immediately
        }
      }

      // ---- Cruiser tick ----
      const hadCruiser = !!s.cruiser;
      tickCruiser(s, dt, addToastRef.current);
      if (hadCruiser && !s.cruiser) {
        // Cruiser just finished exiting — stop hum, reset idle timer
        stopCruiserHum(s.cruiserHumHandle, s.audioCtx);
        s.cruiserHumHandle = null;
        s.lastInteraction = s.time;
      }

      // ---- Fleet Battle tick ----
      if (s.fleet) {
        tickFleet(s, dt, addToastRef.current);
        // Clean up finished battles
        if (!s.fleet.active) s.fleet = null;
      }

      // ---- Physics ----
      tickParticles(s, dt);
      tickAliens(s, dt);
      tickMagnetars(s, dt);
      tickPulsars(s, dt);
      tickNeutronStars(s, dt);
      tickQuasars(s, dt);
      applyProximityEffects(s, dt);
      setParticleCount(s.particles.length);

      // ---- Render ----
      drawBackground(ctx, s);
      drawInteractions(ctx, s);
      drawWells(ctx, s);
      drawAliens(ctx, s);
      drawParticles(ctx, s);
      drawCruiser(ctx, s);
      drawFleet(ctx, s);
      drawBeatIndicator(ctx, s, sixteenthDur);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, []);

  // ===== INPUT HANDLERS =====
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleDown = (e) => {
    e.preventDefault();
    if (!started) { setStarted(true); initAudio(); }
    setShowHint(false);
    const pos = getPos(e);
    const s = stateRef.current;
    s.mouseDown = true; s.mouseX = pos.x; s.mouseY = pos.y; s.holdStart = s.time;
    s.lastInteraction = s.time;

    // Click dismisses active cruiser — don't create a well this frame
    if (s.cruiser && s.cruiser.state !== 'exiting') {
      s.cruiser.state = 'exiting';
      s.mouseDown = false;
      return;
    }

    // Check if clicking on an existing object — enter drag mode
    s.draggingWellIdx = null;
    for (let i = s.wells.length - 1; i >= 0; i--) {
      const w = s.wells[i];
      if (w.removing) continue;
      const d = Math.hypot(pos.x - w.x, pos.y - w.y);
      const hitR = w.type === "blackhole" ? 12 + w.mass / 20
        : w.type === "looper" ? 15
        : w.type === "pulsar" ? 12
        : w.type === "neutronstar" ? 18
        : w.type === "quasar" ? 10
        : w.type === "station" ? 15
        : 10 + w.mass / 20;
      if (d < hitR) {
        s.draggingWellIdx = i;
        s.dragOffsetX = pos.x - w.x;
        s.dragOffsetY = pos.y - w.y;
        break;
      }
    }
  };

  const handleMove = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    const s = stateRef.current;
    s.mouseX = pos.x; s.mouseY = pos.y;

    // Drag object if in drag mode
    if (s.mouseDown && s.draggingWellIdx !== null) {
      const w = s.wells[s.draggingWellIdx];
      if (w) {
        w.x = pos.x - (s.dragOffsetX || 0);
        w.y = pos.y - (s.dragOffsetY || 0);
        // Update looper center position
        if (w.type === "looper" && w.looper) {
          w.looper.cx = w.x;
          w.looper.cy = w.y;
        }
        // Update tone well octave based on new Y position
        if (w.type === "tone") {
          w.octave = octaveFromY(w.y, s.height);
        }
      }
    }

    // Hover detection (runs even when mouse is not down)
    s.hoveredWellId = null;
    for (let i = 0; i < s.wells.length; i++) {
      const w = s.wells[i];
      const d = Math.hypot(pos.x - w.x, pos.y - w.y);
      const hoverR = (w.type === "blackhole" ? 12 + w.mass / 20 : 20) * 1.5;
      if (d < hoverR) {
        s.hoveredWellId = i;
        break;
      }
    }
  };

  const handleUp = (e) => {
    e.preventDefault();
    const s = stateRef.current;
    if (!s.mouseDown) return;
    s.mouseDown = false;
    const holdDuration = s.time - s.holdStart;
    const mass = Math.min(20 + holdDuration * 80, 200);

    // If we were dragging, just release — don't create a new object
    if (s.draggingWellIdx !== null) {
      s.draggingWellIdx = null;
      return;
    }

    // Check if clicking on a looper
    for (const w of s.wells) {
      if (w.type === "looper" && w.looper) {
        if (isClickOnCenter(w.looper, s.mouseX, s.mouseY)) {
          clearLooper(w.looper);
          w.looper.loopStart = s.time;
          addToast("Loop cleared");
          return;
        }
        let sound;
        if (s.wellMode === "drum") {
          sound = { type: "drum", drumType: s.selectedDrumType, id: `drum-${s.selectedDrumType}` };
        } else {
          const noteIdx = s.selectedNoteIdx;
          const octave = octaveFromY(w.y, s.height);
          const freq = getScaleNoteFrequency(s.scaleName, noteIdx, octave);
          sound = { type: "tone", freq, noteIdx, id: `tone-${noteIdx}` };
        }
        if (toggleEventAtAngle(w.looper, s.mouseX, s.mouseY, sound)) return;
      }
    }

    addWell(s.mouseX, s.mouseY, mass);
    spawnParticlesAt(s, s.mouseX, s.mouseY, Math.floor(5 + holdDuration * 10));
  };

  const handleSickBeat = () => {
    const s = stateRef.current;
    if (!started) { setStarted(true); initAudio(); }
    // Place at last mouse position if on canvas, otherwise random center
    const hasMousePos = s.mouseX > 50 && s.mouseY > 50 && s.mouseX < s.width - 50 && s.mouseY < s.height - 80;
    const cx = hasMousePos ? s.mouseX : s.width / 2 + (Math.random() - 0.5) * 200;
    const cy = hasMousePos ? s.mouseY : s.height / 2 + (Math.random() - 0.5) * 150;
    const looper = createLooper(cx, cy, s.bpm, 2);
    looper.loopStart = s.time; looper.recording = false;
    const { events, patternName } = generateSickBeat(2, s.scale);
    looper.events = events;
    s.wells.push({ x: cx, y: cy, mass: 60, color: { core: "#66CCFF", glow: "rgba(100,200,255,0.4)" }, type: "looper", looper, born: s.time, pulsePhase: 0 });
    undoStackRef.current.push(s.wells.length - 1);
    setWellCount(s.wells.length);
    addToast(`${patternName}`);
    spawnParticlesAt(s, cx, cy, 15);
  };

  const handleSave = () => {
    const s = stateRef.current;
    if (s.wells.length === 0) { addToast("Place some wells first"); return; }
    const comp = saveComposition(null, s.wells, { scale: scaleName, instrument: instrumentName, bpm, quantize });
    addToast(`Saved: ${comp.name}`);
  };

  const handleLoadComposition = (comp) => {
    const s = stateRef.current;
    const isV1 = !comp.version || comp.version < 2;
    s.wells = comp.wells.map((w) => ({
      ...w,
      // v1 compositions have no octave info — place tone wells at canvas center (octave 4)
      y: isV1 && w.type === "tone" ? s.height / 2 : w.y,
      octave: isV1 && w.type === "tone" ? 4 : (w.octave ?? 4),
      born: s.time, pulsePhase: s.time, lastAbsorb: 0,
      color: w.type === "blackhole"
        ? { core: "#1a0030", glow: "rgba(80,0,120,0.4)" }
        : w.type === "drum"
          ? (DRUM_TYPES[w.drumType]?.color || { core: "#FF3344", glow: "rgba(255,51,68,0.4)" })
          : w.type === "station"
            ? { core: "#FFCC33", glow: "rgba(255,204,51,0.4)" }
            : w.type === "pulsar"
              ? { core: "#cce8ff", glow: "rgba(200,224,255,0.4)" }
              : w.type === "neutronstar"
                ? { core: "#ff4422", glow: "rgba(255,68,34,0.4)" }
                : w.type === "quasar"
                  ? { core: "#e8f4ff", glow: "rgba(232,244,255,0.4)" }
                  : PALETTE[(w.noteIdx || 0) % PALETTE.length],
      // Pulsar runtime state (reset on load — saved props come from spread)
      pulsarBeamAngle: w.type === "pulsar" ? 0 : undefined,
      pulsarSweepIntensity: w.type === "pulsar" ? 0 : undefined,
      pulsarLastPulse: w.type === "pulsar" ? 0 : undefined,
      pulsarGateRate: w.type === "pulsar" ? (w.pulsarGateRate || 4) : undefined,
      pulsarRadius: w.type === "pulsar" ? (w.pulsarRadius || 200) : undefined,
      // Neutron star runtime state
      neutronSpinAngle: w.type === "neutronstar" ? 0 : undefined,
      neutronInfluenceRadius: w.type === "neutronstar" ? (w.neutronInfluenceRadius || 120) : undefined,
      neutronHeat: w.type === "neutronstar" ? 0 : undefined,
      neutronLastOvertone: w.type === "neutronstar" ? 0 : undefined,
      // Quasar runtime state
      quasarAngle: w.type === "quasar" ? (w.quasarAngle || 0) : undefined,
      quasarMode: w.type === "quasar" ? (w.quasarMode || "drone") : undefined,
      quasarIntensity: w.type === "quasar" ? 0 : undefined,
      quasarJetLength: w.type === "quasar" ? (w.quasarJetLength || 120) : undefined,
      quasarInfluenceRadius: w.type === "quasar" ? (w.quasarInfluenceRadius || 160) : undefined,
      quasarDroneHandle: null,
      quasarJetParticles: w.type === "quasar" ? [] : undefined,
      looper: w.type === "looper" ? (() => {
        const lp = createLooper(w.x, w.y, comp.settings?.bpm || 120, w.looper?.bars || 4);
        lp.loopStart = s.time; lp.events = w.looper?.events || [];
        return lp;
      })() : undefined,
    }));
    if (comp.settings?.scale && SCALES[comp.settings.scale]) {
      s.scale = SCALES[comp.settings.scale].notes; s.scaleName = comp.settings.scale; setScaleName(comp.settings.scale);
    }
    if (comp.settings?.instrument) { s.instrument = comp.settings.instrument; setInstrumentName(comp.settings.instrument); }
    if (comp.settings?.bpm) { s.bpm = comp.settings.bpm; setBpm(comp.settings.bpm); }
    setWellCount(s.wells.length);
    setShowJournal(false);
    addToast(isV1 ? `Loaded: ${comp.name} (v1 — wells at center)` : `Loaded: ${comp.name}`);
  };

  return (
    <div style={{
      width: "100%", height: "100vh", background: THEME.background,
      position: "relative", overflow: "hidden", cursor: "crosshair",
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      userSelect: "none", touchAction: "none",
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp}
        onMouseLeave={(e) => { if (stateRef.current.mouseDown) handleUp(e); }}
        onTouchStart={handleDown} onTouchMove={handleMove} onTouchEnd={handleUp}
      />

      <div style={{ position: "absolute", top: 16, left: 16, pointerEvents: "none" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "0.15em", textTransform: "uppercase", textShadow: "0 0 20px rgba(255,107,107,0.5)" }}>
          Gravitone
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 4 }}>
          Cosmic beat machine
        </div>
      </div>

      <div style={{ position: "absolute", top: 16, right: 16, fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "right", lineHeight: 1.6, pointerEvents: "none" }}>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>{wellCount}</span> wells
        <br />
        <span style={{ color: "rgba(255,255,255,0.5)" }}>{particleCount}</span> particles
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <Toolbar
        wellMode={wellMode} scaleName={scaleName} instrumentName={instrumentName}
        bpm={bpm} quantize={quantize} selectedNoteIdx={selectedNoteIdx}
        selectedDrumType={selectedDrumType} scaleNotes={stateRef.current.scale}
        showHint={showHint} started={started}
        onSetMode={(m) => { stateRef.current.wellMode = m; setWellMode(m); }}
        onSelectNote={(idx) => { stateRef.current.selectedNoteIdx = idx; setSelectedNoteIdx(idx); }}
        onSelectDrum={(dt) => { stateRef.current.selectedDrumType = dt; setSelectedDrumType(dt); }}
        onCycleScale={cycleScale} onCycleInstrument={cycleInstrument} onCycleBpm={cycleBpm}
        onToggleQuantize={() => { const nq = !quantize; stateRef.current.quantize = nq; setQuantize(nq); }}
        onClear={clearAll} onSave={handleSave}
        onToggleJournal={() => setShowJournal(!showJournal)}
        onSickBeat={handleSickBeat}
      />

      {showJournal && <Journal onLoad={handleLoadComposition} onClose={() => setShowJournal(false)} />}
    </div>
  );
}
