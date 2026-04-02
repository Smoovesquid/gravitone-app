// Looper ring — hybrid: wells captured during recording + click-to-place slots
// Auto-cycles: record → play → record → play, layering new events each pass

export function createLooper(x, y, bpm, bars = 4) {
  const barDuration = (60 / bpm) * 4;
  const loopDuration = barDuration * bars;
  return {
    x, y,
    bars,
    bpm,
    loopDuration,
    radius: 80,
    // Events stored as angle positions (0 to 2π) with sound data
    events: [],
    // State
    recording: true,       // starts recording
    loopStart: 0,          // set when placed (s.time)
    cycleCount: 0,         // how many record/play cycles completed
    // For rendering
    playheadAngle: 0,
    recordFade: 1,         // 1 = full record color, 0 = full play color
    paused: false,
  };
}

// Get the current position in the loop as an angle (0 to 2π)
export function getLoopAngle(looper, time) {
  const elapsed = time - looper.loopStart;
  const loopPos = elapsed % looper.loopDuration;
  return (loopPos / looper.loopDuration) * Math.PI * 2;
}

// Get which phase we're in: recording or playing
// Auto-cycles every loopDuration
export function updateLooperPhase(looper, time) {
  const elapsed = time - looper.loopStart;
  const cycleIdx = Math.floor(elapsed / looper.loopDuration);

  if (cycleIdx !== looper.cycleCount) {
    looper.cycleCount = cycleIdx;
    // Alternate: even cycles = record, odd cycles = play
    looper.recording = (cycleIdx % 2 === 0);
  }

  // Smooth fade between record/play colors
  const target = looper.recording ? 1 : 0;
  looper.recordFade += (target - looper.recordFade) * 0.08;

  // Update playhead
  looper.playheadAngle = getLoopAngle(looper, time);
}

// Snap an angle to the nearest 16th note gridline
function snapToGrid(angle, bars) {
  const totalSixteenths = bars * 16;
  const stepSize = (Math.PI * 2) / totalSixteenths;
  const snapped = Math.round(angle / stepSize) * stepSize;
  // Normalize to [0, 2π)
  return ((snapped % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

// Capture an event during recording (from well placement inside the ring)
export function captureEvent(looper, time, sound) {
  if (!looper.recording || looper.paused) return;
  const rawAngle = getLoopAngle(looper, time);
  const angle = snapToGrid(rawAngle, looper.bars);

  // Avoid duplicate events at the same snapped position with same sound
  const isDuplicate = looper.events.some(
    (e) => Math.abs(e.angle - angle) < 0.01 && e.id === sound.id
  );
  if (isDuplicate) return;

  looper.events.push({
    angle,
    ...sound,
    addedOnCycle: looper.cycleCount,
    lastFired: 0,
  });
}

// Manually place/remove an event at a clicked position (snaps to grid)
export function toggleEventAtAngle(looper, clickX, clickY, sound) {
  const dx = clickX - looper.x;
  const dy = clickY - looper.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Must be near the ring
  if (dist < looper.radius - 25 || dist > looper.radius + 25) return false;

  // Calculate angle (0 at top, clockwise), then snap
  let rawAngle = Math.atan2(dy, dx) + Math.PI / 2;
  if (rawAngle < 0) rawAngle += Math.PI * 2;
  const angle = snapToGrid(rawAngle, looper.bars);

  // Check if there's an existing event at this snapped position
  const existingIdx = looper.events.findIndex(
    (e) => Math.abs(e.angle - angle) < 0.01 && e.id === sound.id
  );

  if (existingIdx >= 0) {
    // Remove it
    looper.events.splice(existingIdx, 1);
  } else {
    // Add it
    looper.events.push({
      angle,
      ...sound,
      addedOnCycle: looper.cycleCount,
      lastFired: 0,
    });
  }

  return true;
}

// Check if a click hit the center of the looper (to clear it)
export function isClickOnCenter(looper, clickX, clickY) {
  const dx = clickX - looper.x;
  const dy = clickY - looper.y;
  return Math.sqrt(dx * dx + dy * dy) < 20;
}

// Clear all events (reset the looper)
export function clearLooper(looper) {
  looper.events = [];
  looper.cycleCount = 0;
  looper.recording = true;
}

// Check which events should fire this frame (playback)
// Returns array of events to play
export function getEventsToFire(looper, time, dt) {
  if (looper.paused) return [];
  if (looper.events.length === 0) return [];

  const currAngle = getLoopAngle(looper, time);
  const prevAngle = getLoopAngle(looper, time - dt);
  const wrapped = prevAngle > currAngle + 0.01;

  const toFire = [];
  for (const evt of looper.events) {
    let crossed;
    if (wrapped) {
      crossed = evt.angle >= prevAngle || evt.angle < currAngle;
    } else {
      crossed = evt.angle >= prevAngle && evt.angle < currAngle;
    }
    if (crossed) {
      toFire.push(evt);
      evt.lastFired = time;
    }
  }
  return toFire;
}

// Check if a well is inside the looper's radius
export function isWellInsideLooper(looper, wellX, wellY) {
  const dx = wellX - looper.x;
  const dy = wellY - looper.y;
  return Math.sqrt(dx * dx + dy * dy) <= looper.radius;
}

// Resize bars (affects loop duration)
export function resizeLooper(looper, newBars) {
  newBars = Math.max(1, Math.min(8, newBars));
  if (newBars === looper.bars) return;
  const barDuration = (60 / looper.bpm) * 4;
  looper.bars = newBars;
  looper.loopDuration = barDuration * newBars;
  // Scale existing event angles proportionally — they stay in the same relative position
  looper.radius = 60 + newBars * 15;
}
