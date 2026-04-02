/**
 * @fileoverview JSDoc type definitions for Gravitone game world objects.
 *
 * Architecture constraint: `stateRef.current` (GameState) is the "game world" —
 * all physics, particles, wells, and aliens live here as mutable data mutated
 * directly each RAF frame. React `useState` is used only for UI settings
 * (wellMode, scaleName, bpm, etc.) that drive toolbar rendering. The two must
 * never mix: do not read stateRef.current in JSX render, and do not put physics
 * data in useState.
 */

/**
 * @typedef {{ core: string, glow: string }} WellColor
 */

/**
 * @typedef {{
 *   angle: number,
 *   type: 'tone'|'drum',
 *   freq?: number,
 *   noteIdx?: number,
 *   drumType?: string,
 *   id: string,
 *   lastFired?: number,
 * }} LooperEvent
 */

/**
 * @typedef {{
 *   radius: number,
 *   bars: number,
 *   bpm: number,
 *   recording: boolean,
 *   recordFade: number,
 *   playheadAngle: number,
 *   loopStart: number,
 *   events: LooperEvent[],
 *   paused: boolean,
 * }} LooperState
 */

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   mass: number,
 *   color: WellColor,
 *   type: 'tone'|'drum'|'blackhole'|'looper'|'station',
 *   born: number,
 *   pulsePhase: number,
 *   freq?: number,
 *   noteIdx?: number,
 *   drumType?: string,
 *   looper?: LooperState,
 *   warpRadius?: number,
 *   lastAbsorb?: number,
 *   magnetar?: boolean,
 *   magnetarIntensity?: number,
 *   magnetarStart?: number,
 *   wobbleFreq?: number,
 *   lastWobble?: number,
 *   decaying?: boolean,
 *   decayStart?: number,
 *   decayDuration?: number,
 *   decayProgress?: number,
 *   magnetarDead?: boolean,
 * }} Well
 */

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   vx: number,
 *   vy: number,
 *   life: number,
 *   decay: number,
 *   radius: number,
 *   trail: Array<{x: number, y: number}>,
 *   lastNote: number,
 *   born: number,
 * }} Particle
 */

/**
 * @typedef {{
 *   wells: Well[],
 *   particles: Particle[],
 *   audioCtx: AudioContext|null,
 *   scale: number[],
 *   scaleName: string,
 *   instrument: string,
 *   mouseDown: boolean,
 *   mouseX: number,
 *   mouseY: number,
 *   holdStart: number,
 *   time: number,
 *   width: number,
 *   height: number,
 *   dpr: number,
 *   wellMode: string,
 *   selectedNoteIdx: number,
 *   selectedDrumType: string,
 *   bpm: number,
 *   quantize: boolean,
 *   onBeat: boolean,
 *   beatPulse: number,
 *   loopsPaused: boolean,
 *   stars: Array<{x: number, y: number, size: number, color: string, twinklePhase: number, twinkleSpeed: number}>,
 *   lastSixteenth: number,
 *   aliens: any[],
 *   nextAlienSpawn: number,
 * }} GameState
 */
