/**
 * @fileoverview Well cleanup for Alien Visitation mode.
 */

/**
 * Remove all visitation state from wells. Call when session ends.
 * @param {Object} s  game state
 */
export function restoreWells(s) {
  for (const w of s.wells) {
    ['_beingEaten','_scheduledForEating','_eatStartX','_eatStartY','_eatScale',
     '_buildScale','_builtByVisitor','_danceVisitor','_danceRgb','_danceAmp',
     '_danceBpm','_selfPulses','_learnedFrom','_freqGlideT','_freqFrom',
     '_freqTarget','_origFreq','_origScale','fleetOwnerColor','fleetOwnerRgb',
     'fleetContested','fleetContestedRgb',
    ].forEach(k => delete w[k]);
  }
}
