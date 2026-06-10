#!/usr/bin/env node
'use strict';

const assert = require('assert');
const buddyApi = require('../src/gameplay/buddyDailyCheck.js');

function buildSnapshot(overrides = {}) {
  const base = {
    simulation: {
      simDay: 18
    },
    plant: {
      phase: 'vegetative'
    },
    status: {
      water: 64,
      nutrition: 62,
      stress: 18,
      risk: 16,
      health: 84
    },
    events: {
      machineState: 'idle'
    },
    retention: {
      dailyCare: {
        dayKey: '2026-06-07',
        tasks: []
      }
    }
  };
  return {
    ...base,
    ...overrides,
    simulation: { ...base.simulation, ...(overrides.simulation || {}) },
    plant: { ...base.plant, ...(overrides.plant || {}) },
    status: { ...base.status, ...(overrides.status || {}) },
    events: { ...base.events, ...(overrides.events || {}) },
    retention: {
      ...base.retention,
      ...(overrides.retention || {}),
      dailyCare: {
        ...base.retention.dailyCare,
        ...(((overrides.retention || {}).dailyCare) || {})
      }
    }
  };
}

(function testWaterFocusTracksDailyTaskSignals() {
  const result = buddyApi.buildBuddyDailyCheck(buildSnapshot({
    plant: { phase: 'seedling' },
    status: { water: 42, nutrition: 60, stress: 20, risk: 18 },
    retention: {
      dailyCare: {
        tasks: [
          { id: 'seedling_moisture_round' },
          { id: 'care_sheet_check' },
          { id: 'open_app_twice' }
        ]
      }
    }
  }), {
    dayKey: '2026-06-07',
    nowMs: 1700000000000
  });

  assert.strictEqual(result.category, 'water_focus', 'low-water daily should pick water focus');
  assert.strictEqual(result.primaryTaskId, 'seedling_moisture_round', 'water-focused comment should reference the moisture task');
  assert(/^daily\.buddy\.comment\.water_focus\./.test(result.textKey), `unexpected text key: ${result.textKey}`);
})();

(function testFallbackCommentExistsForNeutralState() {
  const result = buddyApi.buildBuddyDailyCheck(buildSnapshot({
    simulation: { simDay: 33 },
    plant: { phase: 'unknown_phase' },
    status: { water: 57, nutrition: 57, stress: 31, risk: 29, health: 72 },
    retention: {
      dailyCare: {
        tasks: [
          { id: 'missions_board_check' },
          { id: 'open_app_twice' }
        ]
      }
    }
  }), {
    dayKey: '2026-06-08',
    nowMs: 1700000000100
  });

  assert(result.textKey.length > 0, 'fallback path should still produce a text key');
  assert(['fallback', 'daily_task_hint', 'timeboost_safe', 'timeboost_unsafe'].includes(result.category), `neutral state should resolve to a safe non-empty category, got ${result.category}`);
})();

(function testSameInputStaysStableAcrossReload() {
  const snapshot = buildSnapshot({
    plant: { phase: 'flowering' },
    status: { water: 66, nutrition: 64, stress: 24, risk: 22 },
    retention: {
      dailyCare: {
        tasks: [
          { id: 'flower_climate_tune' },
          { id: 'analysis_sheet_check' },
          { id: 'stable_climate_window' }
        ]
      }
    }
  });
  const first = buddyApi.buildBuddyDailyCheck(snapshot, {
    dayKey: '2026-06-09',
    nowMs: 1700000000200
  });
  const second = buddyApi.buildBuddyDailyCheck(snapshot, {
    dayKey: '2026-06-09',
    nowMs: 1700009999999
  });

  assert.strictEqual(first.category, second.category, 'same-day category should stay stable');
  assert.strictEqual(first.textKey, second.textKey, 'same-day text key should stay stable');
  assert.strictEqual(first.primaryTaskId, second.primaryTaskId, 'same-day primary task should stay stable');
})();

(function testVegStableDayPrefersPhaseGuidanceOverNutrientNoise() {
  const result = buddyApi.buildBuddyDailyCheck(buildSnapshot({
    simulation: { simDay: 18 },
    plant: { phase: 'vegetative' },
    status: { water: 64, nutrition: 62, stress: 18, risk: 16, health: 84 },
    retention: {
      dailyCare: {
        tasks: [
          { id: 'veg_training_review' },
          { id: 'open_app_twice' },
          { id: 'veg_feed_support' }
        ]
      }
    }
  }), {
    dayKey: '2026-06-10',
    nowMs: 1700000000300
  });

  assert.strictEqual(result.category, 'seedling_veg_focus', `stable veg day should stay phase-focused, got ${result.category}`);
  assert(['veg_training_review', 'veg_feed_support'].includes(result.primaryTaskId), `phase guidance should point at a veg task, got ${result.primaryTaskId}`);
})();

(function testBloomTasksCanBeatGenericTaskHintWhenPhaseIsSafe() {
  const result = buddyApi.buildBuddyDailyCheck(buildSnapshot({
    plant: { phase: 'flowering' },
    status: { water: 66, nutrition: 64, stress: 24, risk: 22, health: 82 },
    retention: {
      dailyCare: {
        tasks: [
          { id: 'flower_climate_tune' },
          { id: 'analysis_sheet_check' },
          { id: 'stable_climate_window' }
        ]
      }
    }
  }), {
    dayKey: '2026-06-11',
    nowMs: 1700000000400
  });

  assert.strictEqual(result.category, 'bloom_focus', `flowering phase should prefer bloom guidance here, got ${result.category}`);
  assert.strictEqual(result.primaryTaskId, 'flower_climate_tune', `bloom guidance should point at a bloom task, got ${result.primaryTaskId}`);
})();

console.log('buddy-daily-check.test.js passed');
