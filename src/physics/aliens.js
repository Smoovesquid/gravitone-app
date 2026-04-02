import { createAlien, updateAlien, shouldSing, playAlienSing } from "../audio/aliens";

/**
 * Tick alien lifecycle: spawn, update orbits, sing, cull dead aliens.
 * Mutates s.aliens in place.
 * @param {import('../types').GameState} s
 * @param {number} dt - delta time in seconds
 */
export function tickAliens(s, dt) {
  // Spawn new aliens periodically (only when there are wells to interact with)
  if (s.wells.length > 0 && s.time > s.nextAlienSpawn) {
    const alien = createAlien(s.width, s.height, s.scale);
    alien.born = s.time;
    alien.lastSing = s.time; // don't sing immediately
    s.aliens.push(alien);
    s.nextAlienSpawn = s.time + 20 + Math.random() * 25;
  }

  // Update and sing
  for (const alien of s.aliens) {
    updateAlien(alien, s.wells, dt, s.width, s.height);
    if (shouldSing(alien, s.time)) {
      const pan = (alien.x / s.width) * 2 - 1;
      const duration = alien.captured ? 3.5 : 2.0;
      playAlienSing(s.audioCtx, alien.freq, pan, duration);
    }
  }

  // Remove dead aliens
  for (let i = s.aliens.length - 1; i >= 0; i--) {
    if (s.aliens[i].life <= 0) s.aliens.splice(i, 1);
  }
}
