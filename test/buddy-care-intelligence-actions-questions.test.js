#!/usr/bin/env node
'use strict';

const assert = require('assert');
require('../src/buddy-care/types.js');
const stateApi = require('../src/buddy-care/state.js');
const questionEngine = require('../src/buddy-care/intelligence/questionEngine.js');
const actionTracker = require('../src/buddy-care/intelligence/actionTracker.js');
const insightEngine = require('../src/buddy-care/intelligence/insightEngine.js');

const NOW = Date.UTC(2026, 6, 15, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function check(dayOffset, overrides = {}) {
  const at = NOW - dayOffset * DAY;
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

function rootWithChecks(checks) {
  return {
    buddyCare: stateApi.normalizeBuddyCareState({
      version: 3,
      entitlement: 'free',
      plants: [{ id: 'plant-1', nickname: 'Alpha', startDate: '2026-06-01', environment: 'indoor', phase: 'veg' }],
      dailyChecks: checks
    })
  };
}

(function testQuestionEnginePicksMostDecisiveMissingAnswer() {
  const selection = questionEngine.selectPrimaryCareQuestion({
    currentCheck: check(0, { mediumMoisture: 'unknown', leafState: 'yellowing' }),
    answers: {}
  }, [{ id: 'insufficient_data', confidence: 0.15, missingData: ['medium_moisture', 'leaf_area'] }], { signals: [] });
  assert.strictEqual(selection.primaryQuestion.id, 'medium_moisture', 'substrate moisture should be prioritized when it separates major causes');
  assert.strictEqual(selection.secondaryQuestion, null, 'only one primary question should be emitted');
})();

(function testAnsweredQuestionIsNotRepeated() {
  const selection = questionEngine.selectPrimaryCareQuestion({
    currentCheck: check(0, { leafState: 'yellowing' }),
    answers: { leaf_area: 'lower' }
  }, [{ id: 'possible_nutrient_shortage', confidence: 0.35, missingData: ['leaf_area', 'recent_feeding'] }], { signals: [] });
  assert.notStrictEqual(selection.primaryQuestion && selection.primaryQuestion.id, 'leaf_area', 'answered questions must not be repeated');
})();

(function testSufficientDataDoesNotForceAQuestion() {
  const selection = questionEngine.selectPrimaryCareQuestion({
    currentCheck: check(0, { mediumMoisture: 'wet', leafState: 'hanging' }),
    answers: {}
  }, [{ id: 'wet_root_zone', confidence: 0.72, missingData: [] }], { signals: [] });
  assert.strictEqual(selection.primaryQuestion, null, 'high-quality sufficient data should not create a needless question');
})();

(function testRecommendationIsNotAutomaticallyPerformed() {
  const recommendation = { id: 'observe_two_days', controlWindowHours: 48 };
  const confirmed = actionTracker.confirmCareAction(recommendation, {
    plantId: 'plant-1', currentCheck: check(0)
  }, { now: NOW, insightId: 'insight-1' });
  assert.strictEqual(confirmed.status, 'confirmed', 'accepting a recommendation should only confirm it');
  assert.strictEqual(confirmed.performedAt, null, 'confirmation must not fake execution');

  const performed = actionTracker.markCareActionPerformed(confirmed, { now: NOW + 1000 });
  assert.strictEqual(performed.status, 'performed', 'explicit completion should mark the action performed');
  assert.ok(performed.controlDueAt > performed.performedAt, 'performed actions should schedule a later effect check');
})();

(function testPerformedActionCreatesLaterEffectFollowUp() {
  const performed = actionTracker.markCareActionPerformed(actionTracker.confirmCareAction(
    { id: 'reduce_midday_light', controlWindowHours: 24 },
    { plantId: 'plant-1', currentCheck: check(1) },
    { now: NOW - (2 * DAY), insightId: 'insight-1' }
  ), { now: NOW - (2 * DAY) });
  const due = actionTracker.getDueEffectFollowUps([performed], { now: NOW });
  assert.strictEqual(due.length, 1, 'performed actions should become effect follow-ups after their control window');
})();

(function testOutcomeClosesLoopAndFailedActionIsSuppressed() {
  const performed = actionTracker.markCareActionPerformed(actionTracker.confirmCareAction(
    { id: 'observe_two_days', controlWindowHours: 24 },
    { plantId: 'plant-1', currentCheck: check(2) },
    { now: NOW - (2 * DAY), insightId: 'insight-1' }
  ), { now: NOW - (2 * DAY) });
  const failed = actionTracker.recordCareActionOutcome(performed, 'unchanged', { now: NOW });
  assert.strictEqual(failed.status, 'unchanged', 'effect result should close the action loop');
  assert.strictEqual(actionTracker.isCareActionSuppressed('observe_two_days', [failed], { now: NOW }), true, 'recent ineffective actions should be suppressed');
})();

(function testInsightIntegratesQuestionActionAndEffectHistory() {
  const root = rootWithChecks([
    check(0, { mediumMoisture: 'wet', leafState: 'hanging' }),
    check(1, { mediumMoisture: 'wet', leafState: 'yellowing' }),
    check(2, { mediumMoisture: 'moist' })
  ]);
  const failed = {
    id: 'action-old',
    plantId: 'plant-1',
    actionId: 'avoid_watering_today',
    status: 'unchanged',
    outcome: 'unchanged',
    createdAt: NOW - DAY,
    updatedAt: NOW,
    controlWindowHours: 24
  };
  root.buddyCare.intelligence.actions = [failed];
  root.buddyCare = stateApi.normalizeBuddyCareState(root.buddyCare);
  const result = insightEngine.buildCareInsight(root, 'plant-1', { now: NOW });

  assert.strictEqual(result.insight.trend.direction, 'worsening', 'insight should consume the robust trend');
  assert.ok(result.insight.supportingSignals.includes('action_no_improvement'), 'failed action history should enter the new assessment');
  assert.ok(!result.insight.recommendedActions.some((action) => action.id === 'avoid_watering_today'), 'the identical failed action should not loop immediately');
  assert.ok(result.insight.recommendedActions.length >= 1, 'safety should still leave one calm next step');
})();

console.log('buddy-care-intelligence-actions-questions.test.js passed');
