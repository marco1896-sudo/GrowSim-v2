#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const payload = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'actions.json'), 'utf8')
);

const actions = Array.isArray(payload.actions) ? payload.actions : [];
const byId = new Map(actions.map((action) => [action.id, action]));

(function testWateringActionsRemainDistinctAndBelievable() {
  const lightWater = byId.get('watering_low_mist');
  const deepWater = byId.get('watering_medium_deep');
  const nutrientWater = byId.get('watering_medium_vitamin');
  const flush = byId.get('watering_high_flush');

  assert.ok(lightWater && deepWater && nutrientWater && flush, 'expected all redesigned watering actions to exist');

  assert.ok(/Klarwasser/i.test(lightWater.label), 'light watering should read as plain water');
  assert.ok(/Klarwasser/i.test(deepWater.label), 'deep watering should read as plain water');
  assert.ok(/Nährlösung/i.test(nutrientWater.label), 'nutrient watering should read as nutrient solution');
  assert.ok(/Spülen|Rinse/i.test(flush.label), 'flush should read as a rinse/flush action');

  assert.strictEqual(Number(lightWater.effects.immediate.nutrition || 0), 0, 'light plain water should not directly feed');
  assert.ok(Number(nutrientWater.effects.immediate.nutrition || 0) > 0, 'nutrient watering should add nutrition');
  assert.ok(Number(flush.effects.immediate.nutrition || 0) < 0, 'flush should pull nutrition pressure down');

  assert.ok(Number(lightWater.rootZoneInfluence.ecDelta || 0) < 0, 'plain water should gently dilute EC direction');
  assert.ok(Number(deepWater.rootZoneInfluence.ecDelta || 0) < Number(lightWater.rootZoneInfluence.ecDelta || 0), 'deep watering should dilute more strongly than light watering');
  assert.ok(Number(nutrientWater.rootZoneInfluence.ecDelta || 0) > 0, 'nutrient watering should increase EC direction');
  assert.ok(Number(flush.rootZoneInfluence.ecDelta || 0) < Number(deepWater.rootZoneInfluence.ecDelta || 0), 'flush should reduce EC direction most strongly');

  assert.strictEqual(Number(lightWater.climateInfluence.humidityPulsePercent || 0), 0, 'light watering should not fake an RH bump');
  assert.ok(Number(deepWater.climateInfluence.humidityPulsePercent || 0) >= 3, 'deep watering should create a small believable RH bump');
  assert.ok(Number(nutrientWater.climateInfluence.humidityPulsePercent || 0) >= 1, 'nutrient watering can create a small watering-related RH bump');
  assert.ok(Number(flush.climateInfluence.humidityPulsePercent || 0) >= Number(deepWater.climateInfluence.humidityPulsePercent || 0), 'flush should have the strongest watering-related RH bump');
})();

console.log('care watering regression tests passed');
