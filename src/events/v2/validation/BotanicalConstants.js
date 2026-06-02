'use strict';

/**
 * Botanical constants stub used by future validators.
 * Phase 1: static reference values only.
 */
const BotanicalConstants = Object.freeze({
  ph: Object.freeze({
    soilMin: 6.0,
    soilMax: 7.0,
    hydroMin: 5.5,
    hydroMax: 6.5
  }),
  vpd: Object.freeze({
    vegMin: 0.8,
    vegMax: 1.2,
    bloomMin: 1.0,
    bloomMax: 1.5
  })
});

module.exports = BotanicalConstants;
