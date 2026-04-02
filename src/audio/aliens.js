// Alien craft — melodic visitors that drift through and sing

// Play an alien choir note — ethereal, sustained, with vibrato and pitch slides
export function playAlienSing(audio, freq, pan = 0, duration = 2.5) {
  if (!audio) return;
  const { ctx, master } = audio;
  const now = ctx.currentTime;
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
  panner.connect(master);

  // Main voice — sawtooth through formant filters for vowel sound
  const formants = [
    { freq: 600, Q: 12 },   // "ooh"
    { freq: 1000, Q: 8 },   // overtone
    { freq: 2200, Q: 6 },   // presence
  ];

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, now);

  // Vibrato LFO
  const vibrato = ctx.createOscillator();
  const vibratoDepth = ctx.createGain();
  vibrato.frequency.value = 4.5 + Math.random() * 2;
  vibratoDepth.gain.value = freq * 0.008; // subtle pitch wobble
  vibrato.connect(vibratoDepth);
  vibratoDepth.connect(osc.frequency);
  vibrato.start(now);
  vibrato.stop(now + duration + 0.5);

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, now);
  mainGain.gain.linearRampToValueAtTime(0.04, now + 0.4);
  mainGain.gain.setValueAtTime(0.04, now + duration * 0.6);
  mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  for (const f of formants) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f.freq;
    bp.Q.value = f.Q;
    osc.connect(bp);
    bp.connect(mainGain);
  }

  mainGain.connect(panner);
  osc.start(now);
  osc.stop(now + duration + 0.1);

  // Second voice — detuned sine for shimmer
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 1.003, now); // slight detune
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.025, now + 0.5);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);
  osc2.connect(gain2);
  gain2.connect(panner);
  osc2.start(now);
  osc2.stop(now + duration);

  // Third voice — octave up, very quiet
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = "sine";
  osc3.frequency.setValueAtTime(freq * 2.01, now);
  gain3.gain.setValueAtTime(0, now);
  gain3.gain.linearRampToValueAtTime(0.01, now + 0.6);
  gain3.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);
  osc3.connect(gain3);
  gain3.connect(panner);
  osc3.start(now);
  osc3.stop(now + duration * 0.7);
}

// Create an alien craft
export function createAlien(canvasWidth, canvasHeight, scale) {
  // Enter from a random edge
  const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
  let x, y, vx, vy;
  const speed = 0.3 + Math.random() * 0.5;

  if (edge === 0) { // top
    x = Math.random() * canvasWidth;
    y = -30;
    vx = (Math.random() - 0.5) * speed;
    vy = speed;
  } else if (edge === 1) { // right
    x = canvasWidth + 30;
    y = Math.random() * canvasHeight;
    vx = -speed;
    vy = (Math.random() - 0.5) * speed;
  } else if (edge === 2) { // bottom
    x = Math.random() * canvasWidth;
    y = canvasHeight + 30;
    vx = (Math.random() - 0.5) * speed;
    vy = -speed;
  } else { // left
    x = -30;
    y = Math.random() * canvasHeight;
    vx = speed;
    vy = (Math.random() - 0.5) * speed;
  }

  // Pick a base note from the scale
  const noteIdx = Math.floor(Math.random() * scale.length);

  // Visual properties
  const hue = Math.random() * 360;

  return {
    x, y, vx, vy,
    noteIdx,
    freq: scale[noteIdx],
    hue,
    size: 6 + Math.random() * 6,
    trail: [],
    lastSing: 0,
    singInterval: 1.5 + Math.random() * 2.5, // seconds between notes
    captured: false,        // true when orbiting a well
    capturedWell: null,
    orbitAngle: 0,
    orbitDist: 0,
    life: 1,
    born: 0,                // set at spawn time
    shimmerPhase: Math.random() * Math.PI * 2,
  };
}

// Update an alien's position and check for gravity capture
export function updateAlien(alien, wells, dt, canvasWidth, canvasHeight) {
  // Apply gravity from all wells
  let ax = 0, ay = 0;
  let nearestWell = null;
  let nearestDist = Infinity;

  for (const w of wells) {
    if (w.type === "looper" || w.type === "station") continue;
    const dx = w.x - alien.x;
    const dy = w.y - alien.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearestWell = w;
    }

    if (dist > 1) {
      const mass = w.mass || 60;
      const force = (mass * 20) / (distSq + 800);
      ax += (dx / dist) * force;
      ay += (dy / dist) * force;
    }
  }

  // Check for capture — strong well within 80px pulls alien into orbit
  if (!alien.captured && nearestWell && nearestDist < 80 && (nearestWell.mass || 60) > 50) {
    alien.captured = true;
    alien.capturedWell = nearestWell;
    alien.orbitDist = nearestDist;
    alien.orbitAngle = Math.atan2(alien.y - nearestWell.y, alien.x - nearestWell.x);
  }

  if (alien.captured && alien.capturedWell) {
    // Orbit the well
    const w = alien.capturedWell;
    alien.orbitAngle += dt * 0.8;
    alien.orbitDist = Math.max(30, alien.orbitDist * 0.998); // slowly spiral in
    alien.x = w.x + Math.cos(alien.orbitAngle) * alien.orbitDist;
    alien.y = w.y + Math.sin(alien.orbitAngle) * alien.orbitDist;

    // Harmonize: shift frequency toward the well's frequency
    if (w.freq) {
      alien.freq += (w.freq - alien.freq) * dt * 0.3;
    }

    // Fade slowly when orbiting
    alien.life -= dt * 0.02;
  } else {
    // Free flight — apply gravity
    alien.vx += ax * dt;
    alien.vy += ay * dt;

    // Speed cap
    const speed = Math.sqrt(alien.vx * alien.vx + alien.vy * alien.vy);
    const maxSpeed = 3;
    if (speed > maxSpeed) {
      alien.vx = (alien.vx / speed) * maxSpeed;
      alien.vy = (alien.vy / speed) * maxSpeed;
    }

    alien.x += alien.vx * dt * 60;
    alien.y += alien.vy * dt * 60;
  }

  // Trail
  alien.trail.push({ x: alien.x, y: alien.y });
  if (alien.trail.length > 40) alien.trail.shift();

  // Check if off screen (and not captured)
  if (!alien.captured) {
    const margin = 100;
    if (alien.x < -margin || alien.x > canvasWidth + margin ||
        alien.y < -margin || alien.y > canvasHeight + margin) {
      alien.life = 0;
    }
  }
}

// Check if alien should sing this frame
export function shouldSing(alien, time) {
  if (alien.life <= 0) return false;
  if (time - alien.lastSing >= alien.singInterval) {
    alien.lastSing = time;
    return true;
  }
  return false;
}
