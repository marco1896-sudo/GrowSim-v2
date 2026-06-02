'use strict';

/**
 * Blocklist stub for tone quality checks.
 * Phase 1: static phrases only.
 */
const ToneBlocklist = Object.freeze([
  'Du hast versagt',
  'Das war falsch',
  'Nicht gut genug',
  'Kein Problem!'
]);

module.exports = ToneBlocklist;
