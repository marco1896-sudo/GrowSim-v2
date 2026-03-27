#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');

const hintApi = require(path.join(__dirname, '..', 'src', 'ui', 'care', 'careActionHints.js'));

function resolve(category, state, actionOverrides = {}) {
  const action = {
    id: `${category}_test_action`,
    category,
    intensity: 'medium',
    ...actionOverrides
  };
  const context = hintApi.buildCareActionContext(state, action);

  let hints = [];
  if (category === 'watering') hints = hintApi.evaluateWateringHints(context);
  if (category === 'fertilizing') hints = hintApi.evaluateFertilizingHints(context);
  if (category === 'training') hints = hintApi.evaluateTrainingHints(context);
  if (category === 'environment') hints = hintApi.evaluateEnvironmentHints(context);
  return hintApi.selectTopHints(hints, 2);
}

(function testPhaseMappingBucketsStaySmallAndPredictable() {
  assert.strictEqual(hintApi.mapPlantProgressPhase(0, 'seedling'), 'seedling');
  assert.strictEqual(hintApi.mapPlantProgressPhase(3, 'vegetative'), 'vegetative');
  assert.strictEqual(hintApi.mapPlantProgressPhase(7, 'flowering'), 'early_flower');
  assert.strictEqual(hintApi.mapPlantProgressPhase(9, 'flowering'), 'late_flower');
})();

(function testSeedlingTrainingPrefersProtectiveWarning() {
  const hints = resolve('training', {
    stageIndex: 1,
    plantPhase: 'seedling',
    health: 72,
    stress: 22,
    risk: 18,
    water: 55,
    nutrition: 54,
    climate: { temperatureC: 25, humidityPercent: 63, vpdKpa: 1.0, airflowScore: 55 }
  }, { intensity: 'medium' });

  assert.strictEqual(hints[0].severity, 'warning');
  assert.ok(/Junge Pflanzen reagieren/i.test(hints[0].message));
})();

(function testVegetativeTrainingCanProducePositiveFit() {
  const hints = resolve('training', {
    stageIndex: 3,
    plantPhase: 'vegetative',
    health: 78,
    stress: 20,
    risk: 20,
    water: 58,
    nutrition: 60,
    climate: { temperatureC: 25, humidityPercent: 58, vpdKpa: 1.1, airflowScore: 62 }
  }, { intensity: 'low' });

  assert.ok(hints.some((hint) => hint.severity === 'positive' && /Training passt/i.test(hint.message)));
})();

(function testLateFlowerWateringSurfacesHumidityDiseasePressure() {
  const hints = resolve('watering', {
    stageIndex: 9,
    plantPhase: 'flowering',
    health: 62,
    stress: 40,
    risk: 64,
    water: 80,
    nutrition: 58,
    climate: { temperatureC: 25, humidityPercent: 74, vpdKpa: 0.9, airflowScore: 34 }
  }, { id: 'watering_medium_deep', intensity: 'medium' });

  assert.strictEqual(hints[0].severity, 'warning');
  assert.ok(/späten Blüte/i.test(hints[0].message));
})();

(function testHungryStablePlantGetsFertilizingPositiveHint() {
  const hints = resolve('fertilizing', {
    stageIndex: 3,
    plantPhase: 'vegetative',
    health: 68,
    stress: 24,
    risk: 20,
    water: 56,
    nutrition: 34,
    climate: { temperatureC: 24, humidityPercent: 60, vpdKpa: 1.1, airflowScore: 58 }
  }, { intensity: 'medium' });

  assert.ok(hints.some((hint) => hint.severity === 'positive' && /Fütterung ist gerade sinnvoll/i.test(hint.message)));
})();

(function testEnvironmentHintsStayCappedAndPrioritized() {
  const hints = resolve('environment', {
    stageIndex: 9,
    plantPhase: 'flowering',
    health: 60,
    stress: 58,
    risk: 72,
    water: 68,
    nutrition: 62,
    climate: { temperatureC: 26, humidityPercent: 76, vpdKpa: 0.82, airflowScore: 28 }
  }, { intensity: 'medium' });

  assert.ok(hints.length <= 2, 'should render no more than two hints');
  assert.strictEqual(hints[0].severity, 'warning', 'warning should outrank other hint severities');
})();

console.log('care action hints regression tests passed');
