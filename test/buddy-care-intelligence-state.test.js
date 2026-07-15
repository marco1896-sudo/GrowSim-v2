#!/usr/bin/env node
'use strict';

const assert = require('assert');
require('../src/buddy-care/types.js');
const stateApi = require('../src/buddy-care/state.js');

const NOW = Date.UTC(2026, 6, 15, 10, 0, 0);

function createRoot() {
  const root = { buddyCare: stateApi.createDefaultBuddyCareState() };
  stateApi.addBuddyCarePlant(root, {
    nickname: 'Alpha',
    plantType: 'auto',
    environment: 'indoor',
    startDate: '2026-06-01'
  });
  return root;
}

(function testOldSaveMigrationKeepsPlantsAndUnknownFields() {
  const migrated = stateApi.normalizeBuddyCareState({
    version: 2,
    legacyMarker: { keep: true },
    entitlement: 'free',
    plants: [{ id: 'plant-1', nickname: 'Altbestand', startDate: '2026-06-01' }],
    dailyChecks: [{ id: 'check-1', plantId: 'plant-1', dayKey: '2026-07-14' }]
  });

  assert.strictEqual(migrated.version, 4, 'v2 Care+ saves should migrate to the current v4 schema');
  assert.strictEqual(migrated.plants[0].nickname, 'Altbestand', 'existing plants must survive migration');
  assert.strictEqual(migrated.dailyChecks.length, 1, 'existing checks must survive migration');
  assert.deepStrictEqual(migrated.legacyMarker, { keep: true }, 'unknown legacy Care+ fields should be preserved');
  assert.deepStrictEqual(migrated.intelligence.actions, [], 'new intelligence actions should default safely');
  assert.deepStrictEqual(migrated.intelligence.questionAnswers, [], 'new question answers should default safely');
})();

(function testPartialIntelligenceDataNormalizesDefensively() {
  const normalized = stateApi.normalizeBuddyCareState({
    plants: [{ id: 'plant-1', nickname: 'Alpha' }],
    intelligence: {
      version: 0,
      actions: [null, { plantId: 'missing', actionId: 'ignore-me' }],
      questionAnswers: [{ plantId: 'plant-1' }],
      insights: [{ plantId: 'plant-1', confidence: 99, trend: null }],
      plantPatterns: [{}]
    }
  });

  assert.strictEqual(normalized.intelligence.version, 1, 'intelligence data should migrate independently');
  assert.strictEqual(normalized.intelligence.actions.length, 0, 'orphaned or invalid actions should not break state');
  assert.strictEqual(normalized.intelligence.questionAnswers.length, 0, 'incomplete answers should be ignored safely');
  assert.strictEqual(normalized.intelligence.insights.length, 1, 'recoverable partial insights should survive');
  assert.strictEqual(normalized.intelligence.insights[0].confidence, 1, 'confidence should be clamped');
})();

(function testInsightActionAndQuestionRoundTrip() {
  const root = createRoot();
  const plantId = root.buddyCare.plants[0].id;

  const insightResult = stateApi.upsertCareInsight(root, {
    id: 'insight-1',
    plantId,
    generatedAt: NOW,
    status: 'watch',
    priority: 'observe',
    headlineKey: 'buddyCare.intelligence.headline.watch',
    summaryKey: 'buddyCare.intelligence.summary.observe',
    confidence: 0.55,
    trend: { direction: 'stable', confidence: 0.6 },
    primaryQuestion: {
      id: 'leaf_area',
      promptKey: 'buddyCare.intelligence.question.leaf_area.prompt',
      reasonKey: 'buddyCare.intelligence.question.leaf_area.reason',
      options: [{ value: 'lower', labelKey: 'buddyCare.intelligence.option.lower' }]
    },
    recommendedActions: [{
      id: 'observe_two_days',
      titleKey: 'buddyCare.intelligence.action.observe_two_days',
      reasonKey: 'buddyCare.intelligence.actionReason.low_confidence',
      priority: 'observe'
    }]
  }, {
    plantId,
    updatedAt: NOW,
    confidence: 0.5,
    metrics: { medianCheckIntervalDays: 2 }
  });
  assert.strictEqual(insightResult.ok, true, 'insights should be persistable');

  const answerResult = stateApi.recordCareQuestionAnswer(root, {
    plantId,
    questionId: 'leaf_area',
    value: 'lower',
    sourceCheckId: 'check-1',
    answeredAt: NOW + 1
  });
  assert.strictEqual(answerResult.ok, true, 'question answers should be persistable');

  const actionResult = stateApi.upsertCareAction(root, {
    plantId,
    actionId: 'observe_two_days',
    insightId: 'insight-1',
    status: 'confirmed',
    createdAt: NOW,
    updatedAt: NOW + 2
  });
  assert.strictEqual(actionResult.ok, true, 'confirmed actions should be persistable');
  assert.notStrictEqual(actionResult.action.status, 'performed', 'confirming must not automatically perform an action');

  const restored = stateApi.normalizeBuddyCareState(JSON.parse(JSON.stringify(root.buddyCare)));
  assert.strictEqual(stateApi.getLatestCareInsightForPlant(restored, plantId).id, 'insight-1', 'insight should survive reload normalization');
  assert.strictEqual(stateApi.getCareQuestionAnswersForPlant(restored, plantId)[0].value, 'lower', 'question answer should survive reload normalization');
  assert.strictEqual(stateApi.getCareActionsForPlant(restored, plantId)[0].status, 'confirmed', 'action status should survive reload normalization');
})();

console.log('buddy-care-intelligence-state.test.js passed');
