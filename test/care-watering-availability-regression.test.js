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

function validateActionTrigger(state, action) {
  const trigger = action.trigger || {};
  if (trigger.timeWindow === 'daytime_only' && !state.simulation.isDaytime) {
    return { ok: false, reason: 'outside_time_window:daytime_only' };
  }

  if (Number.isFinite(Number(trigger.minStageIndex)) && state.plant.stageIndex < Number(trigger.minStageIndex)) {
    return { ok: false, reason: `stage_too_low:${state.plant.stageIndex}<${trigger.minStageIndex}` };
  }

  return { ok: true };
}

function validateActionPrerequisites(state, action) {
  const pre = action.prerequisites || {};
  const min = pre.min && typeof pre.min === 'object' ? pre.min : {};
  const max = pre.max && typeof pre.max === 'object' ? pre.max : {};

  for (const [key, value] of Object.entries(min)) {
    if (!Number.isFinite(Number(value))) {
      continue;
    }
    const current = key in state.status ? state.status[key] : null;
    if (current !== null && current < Number(value)) {
      return { ok: false, reason: `prereq_min_failed:${key}` };
    }
  }

  for (const [key, value] of Object.entries(max)) {
    if (!Number.isFinite(Number(value))) {
      continue;
    }
    const current = key in state.status ? state.status[key] : null;
    if (current !== null && current > Number(value)) {
      return { ok: false, reason: `prereq_max_failed:${key}` };
    }
  }

  return { ok: true };
}

(function testCoreWateringActionsIgnoreBadStatusForManualUse() {
  const cases = [
    { id: 'watering_low_mist', stageIndex: 0 },
    { id: 'watering_medium_deep', stageIndex: 1 },
    { id: 'watering_medium_vitamin', stageIndex: 2 },
    { id: 'watering_high_flush', stageIndex: 4 }
  ];

  const hostileState = {
    simulation: { isDaytime: true },
    plant: { stageIndex: 0 },
    status: {
      health: 1,
      stress: 96,
      water: 96,
      nutrition: 96,
      risk: 97
    }
  };

  for (const testCase of cases) {
    const action = byId.get(testCase.id);
    assert.ok(action, `expected watering action ${testCase.id} to exist`);

    const state = {
      simulation: { isDaytime: hostileState.simulation.isDaytime },
      plant: { stageIndex: testCase.stageIndex },
      status: { ...hostileState.status }
    };

    assert.deepStrictEqual(
      validateActionTrigger(state, action),
      { ok: true },
      `${testCase.id} should still pass daytime/stage trigger checks`
    );
    assert.deepStrictEqual(
      validateActionPrerequisites(state, action),
      { ok: true },
      `${testCase.id} should not be hard-blocked by high stress/risk/water/nutrition or low health`
    );
  }
})();

(function testNightAndStageRestrictionsRemainIntact() {
  const deepWater = byId.get('watering_medium_deep');
  const nutrientWater = byId.get('watering_medium_vitamin');

  assert.ok(deepWater && nutrientWater, 'expected representative watering actions to exist');

  assert.strictEqual(
    validateActionTrigger({ simulation: { isDaytime: false }, plant: { stageIndex: 1 }, status: {} }, deepWater).reason,
    'outside_time_window:daytime_only',
    'night restriction should remain unchanged for watering actions'
  );

  assert.strictEqual(
    validateActionTrigger({ simulation: { isDaytime: true }, plant: { stageIndex: 1 }, status: {} }, nutrientWater).reason,
    'stage_too_low:1<2',
    'stage gating should remain unchanged for watering actions that unlock later'
  );
})();

console.log('care watering availability regression tests passed');
