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

(function testTrainingActionsKeepRealTradeoffs() {
  const canopy = byId.get('training_low_leaf_tuck');
  const lst = byId.get('training_medium_lst');
  const topping = byId.get('training_medium_topping');

  assert.ok(canopy && lst && topping, 'expected key training actions to exist');

  assert.ok(/Canopy/i.test(canopy.label), 'leaf arrangement should read as canopy work');
  assert.ok(/LST/i.test(lst.label), 'LST should stay distinct');
  assert.ok(/Topping/i.test(topping.label), 'topping should stay distinct');

  assert.ok(Number(canopy.effects.immediate.stress || 0) < Number(lst.effects.immediate.stress || 0), 'canopy work should be gentler than LST');
  assert.ok(Number(lst.effects.immediate.stress || 0) < Number(topping.effects.immediate.stress || 0), 'topping should cause the strongest immediate stress');
  assert.ok(Number(topping.effects.immediate.growth || 0) < 0, 'topping should create an immediate recovery cost');
  assert.ok(Number(lst.effects.overTime.growthPerHour || 0) > Number(canopy.effects.overTime.growthPerHour || 0), 'LST should create a stronger later growth payoff than simple canopy arrangement');
})();

(function testEnvironmentActionsFeelLikeTasksNotAbstractButtons() {
  const airflow = byId.get('environment_low_airflow');
  const hygiene = byId.get('environment_medium_climate');
  const service = byId.get('environment_high_reset');

  assert.ok(airflow && hygiene && service, 'expected key environment actions to exist');

  assert.ok(/Luftweg/i.test(airflow.label), 'airflow action should read like a physical airflow task');
  assert.ok(/Hygiene/i.test(hygiene.label), 'cleanup action should read like hygiene work');
  assert.ok(/Zeltservice/i.test(service.label), 'reset-style action should read like a realistic service task');

  assert.ok(Number((airflow.environmentInfluence || {}).airflowDeltaPercent || 0) > 0, 'airflow task should be the only one that nudges baseline airflow');
  assert.strictEqual(Boolean((hygiene.environmentInfluence || {}).skipGenericCategoryInfluence), true, 'hygiene should avoid the generic airflow bump');
  assert.strictEqual(Boolean((service.environmentInfluence || {}).skipGenericCategoryInfluence), true, 'major service should avoid the generic airflow bump');

  assert.ok(Number(hygiene.effects.immediate.risk || 0) < 0, 'hygiene should reduce risk');
  assert.ok(Number(service.effects.immediate.risk || 0) < Number(hygiene.effects.immediate.risk || 0), 'major service should be the strongest anti-risk option');
  assert.strictEqual(Object.keys(airflow.climateInfluence || {}).length, 0, 'environment tasks should not invent fake climate pulses in this patch');
})();

console.log('care training/environment regression tests passed');
