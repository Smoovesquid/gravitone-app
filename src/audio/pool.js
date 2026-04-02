// Audio node pooling — reuses short-lived oscillator+gain pairs to reduce GC pressure.
// Per-pair cooldown prevents rapid-fire re-triggers from the same particle-well combo.

const POOL_SIZE = 32;
const PAIR_COOLDOWN_MS = 250;

let pairCooldowns = new Map(); // key: "particleId:wellId" -> lastTriggerTime

/**
 * Initialize the oscillator pool. Call once after AudioContext is created.
 * We don't pre-create Web Audio nodes (they can't be restarted), but we
 * track active count to cap concurrent nodes.
 */
let activeCount = 0;

/**
 * Check if a particle-well pair can trigger audio (respects cooldown).
 * @param {number|string} particleIdx
 * @param {number|string} wellId
 * @param {number} now - current time in seconds
 * @returns {boolean}
 */
export function canTriggerPair(particleIdx, wellId, now) {
  const key = `${particleIdx}:${wellId}`;
  const last = pairCooldowns.get(key);
  if (last !== undefined && (now - last) < PAIR_COOLDOWN_MS / 1000) return false;
  return true;
}

/**
 * Mark a particle-well pair as having just triggered.
 * @param {number|string} particleIdx
 * @param {number|string} wellId
 * @param {number} now
 */
export function markPairTriggered(particleIdx, wellId, now) {
  const key = `${particleIdx}:${wellId}`;
  pairCooldowns.set(key);
  pairCooldowns.set(key, now);
}

/**
 * Try to acquire a slot from the pool. Returns true if a node can be created.
 * @returns {boolean}
 */
export function acquireSlot() {
  if (activeCount >= POOL_SIZE) return false;
  activeCount++;
  return true;
}

/**
 * Release a slot back to the pool. Call when an oscillator stops.
 */
export function releaseSlot() {
  activeCount = Math.max(0, activeCount - 1);
}

/**
 * Get current active node count.
 * @returns {number}
 */
export function getActiveCount() {
  return activeCount;
}

/**
 * Periodic cleanup of stale cooldown entries (call every few seconds).
 * @param {number} now
 */
export function cleanupCooldowns(now) {
  const staleThreshold = now - 2; // remove entries older than 2 seconds
  for (const [key, time] of pairCooldowns) {
    if (time < staleThreshold) pairCooldowns.delete(key);
  }
}
