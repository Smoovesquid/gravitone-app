/**
 * @fileoverview Fleet battle management — ship ticking, missiles, well ownership.
 */

import { GENRE_KEYS } from '../data/genres';
import { createShip, steerShip, findTargetWell, tickShipExplosion } from './ship';
import { playExplosion, playWellClaim, playMissileFire } from '../audio/fleet';

const CLAIM_TIME = 3.5;   // seconds beam must hold to claim a well
const MISSILE_SPD = 135;

export function createFleet(cw, ch) {
  const genres = [...GENRE_KEYS].sort(() => Math.random() - 0.5).slice(0, 3);
  const edgePositions = [
    { x: cw * 0.2, y: -110 },
    { x: cw * 0.8, y: -110 },
    { x: cw * 0.5, y: ch + 110 },
  ];
  return {
    ships: genres.map((g, i) => {
      const ship = createShip(g, edgePositions[i].x, edgePositions[i].y);
      ship._targetX = cw * (0.22 + i * 0.28);
      ship._targetY = ch * (0.25 + Math.random() * 0.18);
      return ship;
    }),
    missiles: [],
    wellOwnership: new Map(),   // wellIdx → shipId
    beamAccum: new Map(),        // `${wellIdx}_${shipId}` → seconds
    phase: 'claiming',           // 'claiming' | 'combat'
    phaseTimer: 30,
    active: true,
    screenFlash: null,           // { color, alpha }
    victoryDeclared: false,
  };
}

export function tickFleet(s, dt, addToast) {
  const fl = s.fleet;
  if (!fl?.active) return;

  if (fl.screenFlash) {
    fl.screenFlash.alpha -= dt * 1.8;
    if (fl.screenFlash.alpha <= 0) fl.screenFlash = null;
  }

  fl.phaseTimer -= dt;
  if (fl.phase === 'claiming' && fl.phaseTimer <= 0) {
    fl.phase = 'combat';
    addToast('⚔ COMBAT PHASE — ships open fire');
  }

  for (const sh of fl.ships) _tickShip(sh, s, fl, dt, addToast);
  _tickMissiles(fl, s, dt, addToast);

  // Sync ownership colors onto well objects (renderer reads these)
  for (let i = 0; i < s.wells.length; i++) {
    const ownerId = fl.wellOwnership.get(i);
    const owner = ownerId ? fl.ships.find(sh => sh.id === ownerId) : null;
    s.wells[i].fleetOwnerColor = owner?.color ?? null;
    s.wells[i].fleetOwnerRgb = owner?.rgb ?? null;
  }

  // Victory: one ship standing
  const alive = fl.ships.filter(sh => sh.state === 'active');
  if (!fl.victoryDeclared && alive.length === 1 && fl.ships.some(sh => sh.state === 'dead')) {
    fl.victoryDeclared = true;
    alive[0].state = 'victory';
    alive[0].victoryTimer = 6;
    addToast(`♫ ${alive[0].label} DOMINATES THE CANVAS`);
  }
  for (const sh of fl.ships) {
    if (sh.state === 'victory') { sh.victoryTimer -= dt; if (sh.victoryTimer <= 0) fl.active = false; }
    tickShipExplosion(sh, dt);
  }
}

function _tickShip(ship, s, fl, dt, addToast) {
  ship.beamPulse = (ship.beamPulse + dt * 3) % (Math.PI * 2);

  // Engine trail
  ship.trail.push({ x: ship.x, y: ship.y, life: 1 });
  for (let i = ship.trail.length - 1; i >= 0; i--) {
    ship.trail[i].life -= dt * 3;
    if (ship.trail[i].life <= 0) ship.trail.splice(i, 1);
  }
  if (ship.trail.length > 18) ship.trail.splice(0, ship.trail.length - 18);

  if (ship.state === 'warping') {
    ship.warpProgress = Math.min(1, ship.warpProgress + dt * 0.55);
    steerShip(ship, ship._targetX, ship._targetY, dt, 95);
    if (Math.hypot(ship._targetX - ship.x, ship._targetY - ship.y) < 22) {
      ship.state = 'active';
      addToast(`▶ ${ship.label} WARPS IN`);
    }
    return;
  }
  if (ship.state !== 'active') return;

  // Beam targeting + well claiming
  const ti = findTargetWell(ship, s.wells, fl.wellOwnership);
  ship.targetWellIdx = ti;
  if (ti >= 0 && s.wells[ti]) {
    steerShip(ship, s.wells[ti].x, s.wells[ti].y - 115, dt, 26);
    const key = `${ti}_${ship.id}`;
    fl.beamAccum.set(key, (fl.beamAccum.get(key) || 0) + dt);
    if (fl.beamAccum.get(key) >= CLAIM_TIME) {
      const prev = fl.wellOwnership.get(ti);
      if (prev && prev !== ship.id) fl.ships.find(sh => sh.id === prev)?.controlledWells.delete(ti);
      fl.wellOwnership.set(ti, ship.id);
      ship.controlledWells.add(ti);
      fl.beamAccum.delete(key);
      if (s.audioCtx) playWellClaim(s.audioCtx);
    }
  } else {
    if (!ship._driftTarget || Math.random() < dt * 0.22) {
      ship._driftTarget = { x: s.width * (0.18 + Math.random() * 0.64), y: s.height * (0.18 + Math.random() * 0.52) };
    }
    steerShip(ship, ship._driftTarget.x, ship._driftTarget.y, dt, 18);
  }

  ship.x = Math.max(55, Math.min(s.width - 55, ship.x));
  ship.y = Math.max(55, Math.min(s.height - 95, ship.y));

  // Prune wells that no longer exist
  for (const wi of [...ship.controlledWells]) {
    if (!s.wells[wi] || s.wells[wi].removing) {
      ship.controlledWells.delete(wi);
      fl.wellOwnership.delete(wi);
    }
  }

  // Fire missiles in combat phase
  if (fl.phase === 'combat') {
    ship.missileTimer -= dt;
    if (ship.missileTimer <= 0) {
      ship.missileTimer = 10 + Math.random() * 8;
      _fire(ship, fl, s);
    }
  }
}

function _fire(ship, fl, s) {
  const enemies = fl.ships.filter(sh => sh.id !== ship.id && sh.state === 'active');
  if (!enemies.length) return;
  const t = enemies[Math.floor(Math.random() * enemies.length)];
  fl.missiles.push({ x: ship.x, y: ship.y, tx: t.x, ty: t.y, targetId: t.id, color: ship.color, rgb: ship.rgb, trail: [], life: 4 });
  if (s.audioCtx) playMissileFire(s.audioCtx);
}

function _tickMissiles(fl, s, dt, addToast) {
  for (let i = fl.missiles.length - 1; i >= 0; i--) {
    const m = fl.missiles[i];
    const tgt = fl.ships.find(sh => sh.id === m.targetId && sh.state === 'active');
    if (tgt) { m.tx = tgt.x; m.ty = tgt.y; }
    const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);

    if (d < 14 && tgt) {
      tgt.hp = Math.max(0, tgt.hp - 1);
      if (tgt.controlledWells.size > 0) {
        const wi = [...tgt.controlledWells][0];
        tgt.controlledWells.delete(wi);
        fl.wellOwnership.delete(wi);
      }
      if (tgt.hp <= 0) _destroyShip(tgt, fl, s, addToast);
      fl.missiles.splice(i, 1);
      continue;
    }

    m.trail.push({ x: m.x, y: m.y });
    if (m.trail.length > 7) m.trail.shift();
    if (d > 1) { m.x += (dx / d) * MISSILE_SPD * dt; m.y += (dy / d) * MISSILE_SPD * dt; }
    m.life -= dt;
    if (m.life <= 0) fl.missiles.splice(i, 1);
  }
}

function _destroyShip(ship, fl, s, addToast) {
  ship.state = 'exploding';
  ship.explodeTimer = 3;
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2, spd = 25 + Math.random() * 130;
    ship.explosionParticles.push({ x: ship.x, y: ship.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1 });
  }
  for (const wi of ship.controlledWells) fl.wellOwnership.delete(wi);
  ship.controlledWells.clear();
  fl.screenFlash = { color: ship.color, alpha: 0.5 };
  if (s.audioCtx) playExplosion(s.audioCtx);
  addToast(`💥 ${ship.label} DESTROYED`);
}
