#!/usr/bin/env node
'use strict';

const assert = require('assert');
const phaseEngine = require('../src/buddy-care/phaseEngine.js');

(function testAutoPhaseMapping() {
  assert.strictEqual(phaseEngine.getAutoPhase(1), 'seedling', 'auto day 1 should be seedling');
  assert.strictEqual(phaseEngine.getAutoPhase(20), 'early_veg', 'auto day 20 should be early veg');
  assert.strictEqual(phaseEngine.getAutoPhase(35), 'veg', 'auto day 35 should be veg');
  assert.strictEqual(phaseEngine.getAutoPhase(60), 'flower', 'auto day 60 should be flower');
  assert.strictEqual(phaseEngine.getAutoPhase(78), 'ripening', 'auto day 78 should be ripening');
  assert.strictEqual(phaseEngine.getAutoPhase(90), 'harvest_window', 'auto day 90 should be harvest window');
})();

(function testPhotoPhaseMapping() {
  assert.strictEqual(phaseEngine.getPhotoPhase(80, 'outdoor'), 'stretch', 'photo outdoor day 80 should be stretch');
  assert.strictEqual(phaseEngine.getPhotoPhase(120, 'outdoor'), 'flower', 'photo outdoor day 120 should be flower');
  assert.strictEqual(phaseEngine.getPhotoPhase(100, 'indoor'), 'veg', 'photo indoor day 100 should stay veg');
})();

(function testPlantPhaseWithDates() {
  const now = Date.UTC(2026, 6, 9);
  assert.strictEqual(phaseEngine.getPlantPhase({
    plantType: 'auto',
    startDate: '2026-07-09'
  }, { now }), 'seedling', 'today-started auto should be seedling');

  assert.strictEqual(phaseEngine.getPlantPhase({
    plantType: 'photoperiod',
    environment: 'greenhouse',
    startDate: '2026-04-04'
  }, { now }), 'flower', 'greenhouse photo should derive the expected phase');

  assert.strictEqual(phaseEngine.getPlantPhase({
    plantType: 'auto',
    startDate: 'not-a-date'
  }, { now }), 'unknown', 'invalid start dates should become unknown');
})();

console.log('buddy-care-phase-engine.test.js passed');
