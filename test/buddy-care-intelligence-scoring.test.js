#!/usr/bin/env node
'use strict';

const assert = require('assert');
const causeScorer = require('../src/buddy-care/intelligence/causeScorer.js');
const priorityEngine = require('../src/buddy-care/intelligence/priorityEngine.js');
const safetyRules = require('../src/buddy-care/intelligence/safetyRules.js');

function createCheck(overrides = {}) {
  return {
    mediumMoisture: 'moist',
    leafState: 'normal',
    growthState: 'normal',
    environmentStress: 'normal',
    pestsVisible: 'no',
    ...overrides
  };
}

function createContext(check, overrides = {}) {
  return {
    generatedAt: Date.UTC(2026, 6, 15),
    currentCheck: check,
    checks: check ? [check] : [],
    actions: [],
    answers: {},
    profile: { phase: 'veg' },
    derived: { checkCount: check ? 1 : 0 },
    ...overrides
  };
}

function causeById(causes, id) {
  return causes.find((cause) => cause.id === id) || { score: -99, confidence: 0 };
}

(function testWetAndHangingWeightsWetRootAboveDryness() {
  const causes = causeScorer.scorePossibleCauses(createContext(createCheck({ mediumMoisture: 'wet', leafState: 'hanging' })), {
    recurringPatterns: ['repeated_wet'], signals: [], contradictions: []
  });
  assert.strictEqual(causes[0].id, 'wet_root_zone', 'wet substrate plus hanging leaves should favor a wet root zone');
  assert.ok(causeById(causes, 'wet_root_zone').score > causeById(causes, 'dry_root_zone').score, 'wet-root score should exceed dryness');
})();

(function testDryAndHangingWeightsDryRootAboveWetness() {
  const causes = causeScorer.scorePossibleCauses(createContext(createCheck({ mediumMoisture: 'dry', leafState: 'hanging' })), {
    recurringPatterns: ['repeated_dry'], signals: [], contradictions: []
  });
  assert.strictEqual(causes[0].id, 'dry_root_zone', 'dry substrate plus hanging leaves should favor a dry root zone');
})();

(function testRecentFeedingInfluencesOverfeedingWithoutDiagnosis() {
  const causes = causeScorer.scorePossibleCauses(createContext(createCheck({ leafState: 'spots', growthState: 'slow' }), {
    answers: { recent_feeding: 'yes' }
  }), { recurringPatterns: [], signals: [], contradictions: [] });
  const overfeeding = causeById(causes, 'possible_overfeeding');
  assert.ok(overfeeding.score >= 3, 'recent feeding plus new symptoms should raise overfeeding weighting');
  assert.ok(overfeeding.confidence < 0.8, 'overfeeding must remain a possible cause, not a hard diagnosis');
})();

(function testUnspecificYellowingDoesNotCreateHardCause() {
  const causes = causeScorer.scorePossibleCauses(createContext(createCheck({ leafState: 'yellowing' })), {
    direction: 'unknown', recurringPatterns: [], signals: [], contradictions: []
  });
  assert.strictEqual(causes[0].id, 'insufficient_data', 'yellowing alone should request better data instead of diagnosing a deficiency');
})();

(function testContradictionsReduceConfidence() {
  const context = createContext(createCheck({ mediumMoisture: 'wet', leafState: 'hanging' }));
  const clean = causeScorer.scorePossibleCauses(context, { recurringPatterns: ['repeated_wet'], signals: [], contradictions: [] })[0];
  const contradictory = causeScorer.scorePossibleCauses(context, { recurringPatterns: ['repeated_wet'], signals: [], contradictions: ['moisture_changed_quickly'] })[0];
  assert.ok(contradictory.confidence < clean.confidence, 'contradictory inputs should reduce cause confidence');
})();

(function testPriorityKeepsOneCalmMainLevel() {
  const stable = priorityEngine.determineCarePriority(createContext(createCheck()), {
    direction: 'stable', confidence: 0.7, signals: [], contradictions: []
  }, [{ id: 'insufficient_data', confidence: 0.15, actionId: 'observe_two_days' }]);
  assert.strictEqual(stable.level, 'no_action', 'stable plants should not receive unnecessary work');

  const light = priorityEngine.determineCarePriority(createContext(createCheck({ leafState: 'yellowing' })), {
    direction: 'stable', confidence: 0.5, signals: [], contradictions: []
  }, [{ id: 'insufficient_data', confidence: 0.15, actionId: 'observe_two_days' }]);
  assert.strictEqual(light.level, 'observe', 'a light stable change should lead to observation');
})();

(function testRapidStrongWorseningGetsHighCheckPriority() {
  const priority = priorityEngine.determineCarePriority(createContext(createCheck({ mediumMoisture: 'wet', leafState: 'hanging', pestsVisible: 'yes' })), {
    direction: 'worsening', confidence: 0.8, signals: ['progressive_worsening'], contradictions: []
  }, [{ id: 'possible_pest_pressure', confidence: 0.8, actionId: 'check_leaf_undersides' }]);
  assert.strictEqual(priority.level, 'urgent_check', 'strong fast deterioration should create a high check priority');
})();

(function testSafetyBlocksContradictoryDuplicateAndAggressiveActions() {
  const context = createContext(createCheck({ mediumMoisture: 'wet', leafState: 'hanging' }), {
    actions: [{ actionId: 'avoid_watering_today', status: 'effect_pending', updatedAt: Date.UTC(2026, 6, 15) }]
  });
  const result = safetyRules.applyCareSafetyRules(
    ['water_if_dry', 'avoid_watering_today', 'avoid_watering_today'],
    context,
    { direction: 'stable', confidence: 0.4 },
    [{ id: 'wet_root_zone', confidence: 0.55 }],
    { level: 'today' }
  );
  assert.ok(!result.actions.some((action) => action.id === 'water_if_dry'), 'watering must be blocked when a wet root zone is more likely');
  assert.ok(!result.actions.some((action) => action.id === 'avoid_watering_today'), 'an open identical action must not be duplicated');
  assert.strictEqual(new Set(result.actions.map((action) => action.id)).size, result.actions.length, 'safe actions must be unique');
})();

console.log('buddy-care-intelligence-scoring.test.js passed');
