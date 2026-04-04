/**
 * @fileoverview Visitor ship — alien touring musician state + steering.
 * No combat. Ships arrive, orbit, run a session, teach, depart.
 */

import { GENRES } from '../data/genres';

let _nextId = 0;

/**
 * @param {string} genre  one of GENRE_KEYS
 * @param {number} x      spawn X (canvas edge)
 * @param {number} y      spawn Y (canvas edge)
 */
export function createShip(genre, x, y) {
  const g = GENRES[genre] || GENRES.trap;
  return {
    id: `ship_${_nextId++}`,
    genre,
    x, y,
    angle: Math.PI,
    state: 'warping',     // warping | active
    warpProgress: 0,
    beamPulse: 0,
    trail: [],
    label: g.label,
    color: g.color,
    rgb: g.rgb,
    shape: g.shape,
    // Orbit (set by visitation system after spawn)
    orbitAngle: 0,
    orbitRadius: 300,
    orbitSpeed: 0.3,
    // Session beat accumulator
    _pulseAccum: 0,
  };
}

/**
 * Smoothly steer ship toward (tx, ty).
 */
export function steerShip(ship, tx, ty, dt, speed = 28) {
  const dx = tx - ship.x, dy = ty - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 3) return;
  const targetAngle = Math.atan2(dy, dx) - Math.PI / 2;
  let da = targetAngle - ship.angle;
  while (da > Math.PI)  da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  ship.angle += da * Math.min(1, dt * 2.2);
  const spd = Math.min(speed, dist);
  ship.x += (dx / dist) * spd * dt;
  ship.y += (dy / dist) * spd * dt;
}
