#!/usr/bin/env node
'use strict';

const assert = require('assert');
require('../src/buddy-care/types.js');
const stateApi = require('../src/buddy-care/state.js');
const contextBuilder = require('../src/buddy-care/intelligence/contextBuilder.js');
const trendAnalyzer = require('../src/buddy-care/intelligence/trendAnalyzer.js');
const profileLearner = require('../src/buddy-care/intelligence/profileLearner.js');

const NOW = Date.UTC(2026, 6, 15, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function check(dayOffset, overrides = {}) {
  const at = NOW - (dayOffset * DAY);
  return {
    id: `check-${dayOffset}`,
    plantId: 'plant-1',
    dayKey: new Date(at).toISOString().slice(0, 10),
    createdAt: at,
    createdAtIso: new Date(at).toISOString(),
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no',
    ...overrides
  };
}

function contextWith(checks, extra = {}) {
  return {
    plantId: 'plant-1',
    generatedAt: NOW,
    checks,
    actions: [],
    diaryEntries: [],
    ...extra
  };
}

(function testContextBuilderUsesExistingDataWithoutPenalizingMissingFields() {
  const state = stateApi.normalizeBuddyCareState({
    version: 2,
    plants: [{ id: 'plant-1', nickname: 'Alpha', environment: 'indoor', startDate: '2026-06-01' }],
    dailyChecks: [check(0)],
    intelligence: {
      questionAnswers: [{ id: 'answer-1', plantId: 'plant-1', questionId: 'leaf_area', value: 'lower', answeredAt: NOW }]
    }
  });
  const context = contextBuilder.buildCareContext(state, 'plant-1', { now: NOW });

  assert.strictEqual(context.profile.name, 'Alpha', 'context should include the plant profile');
  assert.strictEqual(context.currentCheck.id, 'check-0', 'context should include the latest check');
  assert.strictEqual(context.answers.leaf_area, 'lower', 'recent structured answers should enter context');
  assert.strictEqual(context.profile.potSize, null, 'missing optional profile fields should stay neutral');
})();

(function testSingleOddCheckDoesNotCreateStrongTrend() {
  const result = trendAnalyzer.analyzeCareTrends(contextWith([check(0, { leafState: 'yellowing' })]));
  assert.strictEqual(result.direction, 'unknown', 'one unusual check should not become a direction');
  assert.ok(result.confidence <= 0.2, 'single-check confidence should stay low');
})();

(function testThreeIncreasingChecksCreateWorseningTrend() {
  const result = trendAnalyzer.analyzeCareTrends(contextWith([
    check(0, { mediumMoisture: 'wet', leafState: 'spots', growthState: 'slow' }),
    check(1, { mediumMoisture: 'wet', leafState: 'yellowing' }),
    check(2, { mediumMoisture: 'wet' })
  ]));
  assert.strictEqual(result.direction, 'worsening', 'three progressively worse checks should create a worsening trend');
  assert.ok(result.confidence >= 0.6, 'multi-check worsening should carry useful confidence');
})();

(function testStableChecksRemainStable() {
  const result = trendAnalyzer.analyzeCareTrends(contextWith([check(0), check(1), check(2)]));
  assert.strictEqual(result.direction, 'stable', 'unchanged calm checks should be stable');
})();

(function testImprovementAfterActionIsRecognized() {
  const result = trendAnalyzer.analyzeCareTrends(contextWith([
    check(0),
    check(1, { leafState: 'spots', environmentStress: 'hot' })
  ], {
    actions: [{ actionId: 'reduce_midday_light', status: 'improved', updatedAt: NOW - (12 * 60 * 60 * 1000) }]
  }));
  assert.strictEqual(result.direction, 'improving', 'a clear calmer follow-up check should be improving');
  assert.ok(result.signals.includes('action_helped'), 'successful action outcome should be linked to the trend');
})();

(function testRepeatedMoistureAndContradictionsAreReported() {
  const wetResult = trendAnalyzer.analyzeCareTrends(contextWith([
    check(0, { mediumMoisture: 'wet' }),
    check(1, { mediumMoisture: 'wet' }),
    check(2, { mediumMoisture: 'moist' })
  ]));
  assert.ok(wetResult.signals.includes('substrate_repeatedly_wet'), 'repeated wet checks should be detected');

  const contradiction = trendAnalyzer.analyzeCareTrends(contextWith([
    check(0, { mediumMoisture: 'dry' }),
    check(0.25, { mediumMoisture: 'wet' })
  ]));
  assert.ok(contradiction.contradictions.includes('moisture_changed_quickly'), 'rapid opposing moisture reports should be marked contradictory');
})();

(function testIndividualPatternUsesMedianWithMinimumSamples() {
  const pattern = profileLearner.derivePlantPatterns(contextWith([
    check(0), check(2), check(4), check(20)
  ], {
    actions: [
      { actionId: 'water', status: 'improved', performedAt: NOW - DAY },
      { actionId: 'water', status: 'effect_pending', performedAt: NOW - (4 * DAY) },
      { actionId: 'water', status: 'effect_pending', performedAt: NOW - (7 * DAY) }
    ]
  }), { recurringPatterns: ['repeated_dry'] });

  assert.strictEqual(pattern.metrics.medianCheckIntervalDays, 2, 'outlier-resistant median should describe check cadence');
  assert.strictEqual(pattern.metrics.medianWateringIntervalDays, 3, 'confirmed watering intervals should produce a median with enough samples');
  assert.ok(pattern.metrics.helpfulActions.includes('water'), 'helpful actions should be retained as an individual pattern');
})();

(function testWaterDemandAndFrequentInterventionsNeedRepeatedEvidence() {
  const wateringDaysAgo = [18, 14, 10, 8, 6];
  const actions = wateringDaysAgo.map((daysAgo, index) => ({
    id: `water-${index}`,
    actionId: 'water',
    status: 'performed',
    performedAt: NOW - daysAgo * DAY
  }));
  const demand = trendAnalyzer.analyzeCareTrends(contextWith([check(0), check(1), check(2)], { actions }));
  assert.ok(demand.signals.includes('water_demand_increasing'), 'several shortening watering intervals should indicate increasing demand');

  const frequent = trendAnalyzer.analyzeCareTrends(contextWith([check(0), check(1)], {
    actions: [0, 1, 2, 3].map((index) => ({
      id: `care-${index}`,
      actionId: `care-${index}`,
      status: 'performed',
      performedAt: NOW - index * 6 * 60 * 60 * 1000
    }))
  }));
  assert.ok(frequent.signals.includes('care_interventions_frequent'), 'unusually frequent care interventions should be surfaced calmly');
})();

console.log('buddy-care-intelligence-trends.test.js passed');
