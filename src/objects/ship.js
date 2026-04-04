/**
 * @fileoverview Individual ship state factory and AI helpers for Fleet Battle.
 */

import { GENRES } from '../data/genres';

let _nextId = 0;

/**
 * @param {string} genre  one of GENRE_KEYS
 * @param {number} x      spawn X
 * @param {number} y      spawn Y
 */
export function createShip(genre, x, y) {
  const g = GENRES[genre] || GENRES.trap;
  return {
    id: `ship_${_nextId++}`,
    genre,
    x, y,
    angle: Math.PI,        // pointing up initially
    hp: 5, maxHp: 5,
    state: 'warping',      // warping | active | exploding | dead | victory
    warpProgress: 0,
    beamPulse: 0,
    targetWellIdx: -1,
    controlledWells: new Set(),
    missileTimer: 8 + Math.random() * 8,
    trail: [],
    label: g.label,
    color: g.color,
    rgb: g.rgb,
    shape: g.shape,
    // AI navigation
    _targetX: null,
    _targetY: null,
    _driftTarget: null,
    // Explosion state
    explosionParticles: [],
    explodeTimer: 0,
    victoryTimer: 0,
  };
}

/**
 * Smoothly steer ship toward (tx, ty).
 * @param {Object} ship
 * @param {number} tx
 * @param {number} ty
 * @param {number} dt
 * @param {number} [speed=28]
 */
export function steerShip(ship, tx, ty, dt, speed = 28) {
  const dx = tx - ship.x, dy = ty - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 3) return;
  // atan2 gives angle from east; ship "up" is -PI/2 so subtract PI/2
  const targetAngle = Math.atan2(dy, dx) - Math.PI / 2;
  let da = targetAngle - ship.angle;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  ship.angle += da * Math.min(1, dt * 2);
  const spd = Math.min(speed, dist);
  ship.x += (dx / dist) * spd * dt;
  ship.y += (dy / dist) * spd * dt;
}

/**
 * Find the best well to target: unclaimed first, then enemy-owned.
 * @param {Object} ship
 * @param {Object[]} wells
 * @param {Map<number,string>} wellOwnership
 * @returns {number} well index or -1
 */
export function findTargetWell(ship, wells, wellOwnership) {
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < wells.length; i++) {
    const w = wells[i];
    if (!w || w.removing) continue;
    if (w.type === 'blackhole' || w.type === 'station') continue;
    const owner = wellOwnership.get(i);
    if (owner === ship.id) continue;
    const dx = w.x - ship.x, dy = w.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Prefer enemy wells in combat (closer = better steal opportunity)
    const score = owner ? dist * 0.55 : dist;
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best;
}

/**
 * Tick explosion particles for a ship in 'exploding' state.
 * Transitions to 'dead' when timer expires.
 * @param {Object} ship
 * @param {number} dt
 */
export function tickShipExplosion(ship, dt) {
  if (ship.state !== 'exploding') return;
  ship.explodeTimer -= dt;
  for (let i = ship.explosionParticles.length - 1; i >= 0; i--) {
    const p = ship.explosionParticles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.96; p.vy *= 0.96;
    p.life -= dt * 0.45;
    if (p.life <= 0) ship.explosionParticles.splice(i, 1);
  }
  if (ship.explodeTimer <= 0) ship.state = 'dead';
}
