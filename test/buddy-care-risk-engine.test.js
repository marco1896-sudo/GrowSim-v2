#!/usr/bin/env node
'use strict';

const assert = require('assert');
const riskEngine = require('../src/buddy-care/riskEngine.js');

const NOW = Date.UTC(2026, 6, 10, 10, 30, 0);
const NOW_ISO = new Date(NOW).toISOString();
const DAY_BEFORE_ISO = new Date(NOW - (24 * 60 * 60 * 1000)).toISOString();
const TWO_DAYS_BEFORE_ISO = new Date(NOW - (60 * 60 * 1000)).toISOString();

function createPlant(id, nickname = 'Alpha') {
  return { id, nickname };
}

function createCheck(overrides = {}) {
  return {
    plantId: 'plant-1',
    createdAtIso: NOW_ISO,
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no',
    ...overrides
  };
}

(function testNoCheckReturnsGray() {
  const evaluation = riskEngine.evaluatePlantCareRisk(createPlant('plant-1'), { now: NOW });
  assert.strictEqual(evaluation.status, 'gray', 'plants without a daily check should stay gray');
})();

(function testCalmCheckReturnsGreen() {
  const evaluation = riskEngine.evaluatePlantCareRisk(createPlant('plant-1'), {
    latestDailyCheck: createCheck(),
    dailyChecks: [createCheck()],
    now: NOW
  });
  assert.strictEqual(evaluation.status, 'green', 'calm checks should resolve to green');
})();

(function testHangingLeavesReturnsYellow() {
  const evaluation = riskEngine.evaluatePlantCareRisk(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ leafState: 'hanging' }),
    dailyChecks: [createCheck({ leafState: 'hanging' })],
    dailyCheckStatus: 'needs_attention',
    now: NOW
  });
  assert.strictEqual(evaluation.status, 'yellow', 'a single leaf signal should resolve to yellow');
})();

(function testUnsurePestsReturnsYellow() {
  const evaluation = riskEngine.evaluatePlantCareRisk(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ pestsVisible: 'unsure' }),
    dailyChecks: [createCheck({ pestsVisible: 'unsure' })],
    dailyCheckStatus: 'needs_attention',
    now: NOW
  });
  assert.strictEqual(evaluation.status, 'yellow', 'unclear pests should resolve to yellow');
})();

(function testVisiblePestsReturnsRed() {
  const evaluation = riskEngine.evaluatePlantCareRisk(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ pestsVisible: 'yes' }),
    dailyChecks: [createCheck({ pestsVisible: 'yes' })],
    now: NOW
  });
  assert.strictEqual(evaluation.status, 'red', 'visible pests should resolve to red');
})();

(function testWetAndHangingReturnsRed() {
  const evaluation = riskEngine.evaluatePlantCareRisk(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ mediumMoisture: 'wet', leafState: 'hanging' }),
    dailyChecks: [createCheck({ mediumMoisture: 'wet', leafState: 'hanging' })],
    now: NOW
  });
  assert.strictEqual(evaluation.status, 'red', 'wet medium plus hanging leaves should resolve to red');
})();

(function testTwoYellowSignalsReturnRed() {
  const evaluation = riskEngine.evaluatePlantCareRisk(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ leafState: 'spots', growthState: 'slow' }),
    dailyChecks: [createCheck({ leafState: 'spots', growthState: 'slow' })],
    dailyCheckStatus: 'needs_attention',
    now: NOW
  });
  assert.strictEqual(evaluation.status, 'red', 'two yellow signals at once should resolve to red');
})();

(function testRepeatedAttentionChecksReturnRed() {
  const evaluation = riskEngine.evaluatePlantCareRisk(createPlant('plant-1'), {
    latestDailyCheck: createCheck({ leafState: 'spots', createdAtIso: NOW_ISO }),
    dailyChecks: [
      createCheck({ leafState: 'spots', createdAtIso: NOW_ISO }),
      createCheck({ growthState: 'slow', createdAtIso: DAY_BEFORE_ISO })
    ],
    now: NOW
  });
  assert.strictEqual(evaluation.status, 'red', 'repeated attention checks inside 48 hours should resolve to red');
})();

(function testDiaryIssueTodayReturnsYellow() {
  const evaluation = riskEngine.evaluatePlantCareRisk(createPlant('plant-1'), {
    latestDailyCheck: createCheck(),
    dailyChecks: [createCheck()],
    todayDiaryEntries: [{ plantId: 'plant-1', tags: ['issue'], entryDate: '2026-07-10' }],
    now: NOW
  });
  assert.strictEqual(evaluation.status, 'yellow', 'issue tags from today should resolve to yellow');
})();

(function testEvaluateAllReturnsStatusesPerPlant() {
  const plants = [createPlant('plant-1'), createPlant('plant-2')];
  const evaluations = riskEngine.evaluateAllPlantCareRisks(plants, {
    latestDailyCheckByPlantId: {
      'plant-1': createCheck(),
      'plant-2': createCheck({ pestsVisible: 'yes', plantId: 'plant-2' })
    },
    dailyChecksByPlantId: {
      'plant-1': [createCheck()],
      'plant-2': [createCheck({ pestsVisible: 'yes', plantId: 'plant-2' })]
    },
    now: NOW
  });
  assert.deepStrictEqual(
    evaluations.map((entry) => ({ plantId: entry.plantId, status: entry.status })),
    [
      { plantId: 'plant-2', status: 'red' },
      { plantId: 'plant-1', status: 'green' }
    ],
    'evaluateAllPlantCareRisks should return a status per plant'
  );
})();

(function testEvaluateAllSortsByPriority() {
  const plants = [createPlant('plant-1'), createPlant('plant-2'), createPlant('plant-3'), createPlant('plant-4')];
  const evaluations = riskEngine.evaluateAllPlantCareRisks(plants, {
    latestDailyCheckByPlantId: {
      'plant-1': createCheck({ pestsVisible: 'yes', plantId: 'plant-1' }),
      'plant-2': createCheck({ leafState: 'spots', plantId: 'plant-2' }),
      'plant-3': null,
      'plant-4': createCheck({ plantId: 'plant-4' })
    },
    dailyChecksByPlantId: {
      'plant-1': [createCheck({ pestsVisible: 'yes', plantId: 'plant-1' })],
      'plant-2': [createCheck({ leafState: 'spots', plantId: 'plant-2' })],
      'plant-3': [],
      'plant-4': [createCheck({ plantId: 'plant-4', createdAtIso: TWO_DAYS_BEFORE_ISO })]
    },
    now: NOW
  });
  assert.deepStrictEqual(
    evaluations.map((entry) => entry.status),
    ['red', 'yellow', 'gray', 'green'],
    'evaluations should sort red, yellow, gray, then green'
  );
})();

(function testFunctionsDoNotMutateInputState() {
  const plant = createPlant('plant-1', 'Stable');
  const context = {
    latestDailyCheck: createCheck({ leafState: 'spots' }),
    dailyChecks: [createCheck({ leafState: 'spots' })],
    todayDiaryEntries: [{ plantId: 'plant-1', tags: ['issue'] }]
  };
  const plantSnapshot = JSON.stringify(plant);
  const contextSnapshot = JSON.stringify(context);

  riskEngine.evaluatePlantCareRisk(plant, context);
  riskEngine.evaluateAllPlantCareRisks([plant], {
    latestDailyCheckByPlantId: { 'plant-1': context.latestDailyCheck },
    dailyChecksByPlantId: { 'plant-1': context.dailyChecks },
    todayDiaryEntriesByPlantId: { 'plant-1': context.todayDiaryEntries },
    now: NOW
  });

  assert.strictEqual(JSON.stringify(plant), plantSnapshot, 'plant input should remain unchanged');
  assert.strictEqual(JSON.stringify(context), contextSnapshot, 'context input should remain unchanged');
})();

console.log('buddy-care-risk-engine.test.js passed');
