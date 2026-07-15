#!/usr/bin/env node
'use strict';

const assert = require('assert');
require('../src/buddy-care/types.js');
const stateApi = require('../src/buddy-care/state.js');
const insightEngine = require('../src/buddy-care/intelligence/insightEngine.js');
const actionTracker = require('../src/buddy-care/intelligence/actionTracker.js');
const de = require('../src/i18n/locales/de.json').buddyCare.intelligence;

const NOW = Date.UTC(2026, 6, 15, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function plant(id, nickname = id) {
  return { id, nickname, startDate: '2026-06-01', environment: 'indoor', phase: 'veg', plantType: 'auto' };
}

function check(plantId, daysAgo, overrides = {}) {
  const at = NOW - (daysAgo * DAY);
  return {
    id: `${plantId}-check-${String(daysAgo).replace('.', '-')}`,
    plantId,
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

function root({ plants, checks, actions = [], questionAnswers = [] }) {
  return {
    buddyCare: stateApi.normalizeBuddyCareState({
      version: 3,
      entitlement: 'care_plus_mock',
      activePlantId: plants[0]?.id || '',
      plants,
      dailyChecks: checks,
      intelligence: { version: 1, actions, questionAnswers, insights: [], plantPatterns: [] }
    })
  };
}

function insight(source, plantId, now = NOW) {
  return insightEngine.buildCareInsight(source, plantId, { now });
}

function actionIds(result) {
  return result.insight.recommendedActions.map((action) => action.id);
}

(function scenarioAStablePlantForFiveDays() {
  const source = root({
    plants: [plant('stable')],
    checks: [0, 1, 2, 3, 4].map((daysAgo) => check('stable', daysAgo))
  });
  const first = insight(source, 'stable');
  const nextDay = insight(source, 'stable', NOW + DAY);

  assert.strictEqual(first.insight.trend.direction, 'stable', 'A: five calm checks should remain stable');
  assert.strictEqual(first.insight.priority, 'no_action', 'A: stable plants should not receive a warning priority');
  assert.strictEqual(first.insight.primaryQuestion, null, 'A: stable plants should not receive a needless question');
  assert.strictEqual(nextDay.insight.priority, 'no_action', 'A: another day alone should not create a new task');
  assert.strictEqual(nextDay.insight.primaryQuestion, null, 'A: the question engine should stay quiet without a new signal');
})();

(function scenarioBRepeatedWetSubstrate() {
  const result = insight(root({
    plants: [plant('wet')],
    checks: [
      check('wet', 0, { mediumMoisture: 'wet', leafState: 'hanging', growthState: 'slow' }),
      check('wet', 1, { mediumMoisture: 'wet', leafState: 'yellowing' }),
      check('wet', 2, { mediumMoisture: 'wet' })
    ]
  }), 'wet');

  assert.strictEqual(result.insight.trend.direction, 'worsening', 'B: several increasingly weak checks should form a worsening trend');
  assert.ok(result.insight.trend.confidence >= 0.6, 'B: trend confidence should rise only after repeated evidence');
  assert.strictEqual(result.insight.possibleCauses[0].id, 'wet_root_zone', 'B: wet-root context should outrank dryness');
  assert.ok(actionIds(result).includes('avoid_watering_today'), 'B: the safe plan should pause further watering');
  assert.ok(!actionIds(result).includes('water_if_dry'), 'B: the safe plan must not recommend watering');
  assert.ok(!actionIds(result).some((id) => ['feed', 'light_feed', 'balanced_feed'].includes(id)), 'B: the safe plan must not rush into feeding');
})();

(function scenarioCDryPlantAndEffectWindow() {
  const initial = insight(root({
    plants: [plant('dry')],
    checks: [
      check('dry', 0, { mediumMoisture: 'dry', leafState: 'hanging' }),
      check('dry', 2, { mediumMoisture: 'dry' })
    ]
  }), 'dry');
  const recommendation = initial.insight.recommendedActions.find((action) => action.id === 'water_if_dry');

  assert.strictEqual(initial.insight.possibleCauses[0].id, 'dry_root_zone', 'C: dry substrate plus hanging leaves should favor dryness');
  assert.ok(recommendation, 'C: a cautious conditional watering action should remain available');
  const confirmed = actionTracker.confirmCareAction(recommendation, initial.context, { now: NOW, insightId: initial.insight.id });
  const performed = actionTracker.markCareActionPerformed(confirmed, { now: NOW });
  assert.strictEqual(confirmed.status, 'confirmed', 'C: recommendation should not count as performed automatically');
  assert.strictEqual(performed.status, 'performed', 'C: explicit completion should start the effect window');
  assert.strictEqual(actionTracker.getDueEffectFollowUps([performed], { now: NOW + DAY + 1 }).length, 1, 'C: watering should receive a later effect check');
})();

(function scenarioDSingleLightDiscoloration() {
  const result = insight(root({
    plants: [plant('light')],
    checks: [check('light', 0, { leafState: 'yellowing' })]
  }), 'light');

  assert.strictEqual(result.insight.trend.direction, 'unknown', 'D: one light discoloration should not become a trend');
  assert.ok(result.insight.confidence < 0.4, 'D: a single unspecific check should stay low-confidence');
  assert.strictEqual(result.insight.possibleCauses[0].id, 'insufficient_data', 'D: Care+ should not turn light leaves into a nutrient diagnosis');
  assert.strictEqual(result.insight.priority, 'observe', 'D: observation should outrank intervention');
  assert.ok(!actionIds(result).includes('observe_before_feeding'), 'D: no feeding-oriented action should be promoted from one weak signal');
})();

(function scenarioESuccessfulMeasure() {
  const before = insight(root({
    plants: [plant('helped')],
    checks: [check('helped', 2, { mediumMoisture: 'dry', leafState: 'hanging' })]
  }), 'helped', NOW - (2 * DAY));
  const recommendation = before.insight.recommendedActions.find((action) => action.id === 'water_if_dry');
  const confirmed = actionTracker.confirmCareAction(recommendation, before.context, { now: NOW - (2 * DAY), insightId: before.insight.id });
  const performed = actionTracker.markCareActionPerformed(confirmed, { now: NOW - (2 * DAY) });
  const improved = actionTracker.recordCareActionOutcome(performed, 'improved', { now: NOW - (2 * 60 * 60 * 1000) });
  const after = insight(root({
    plants: [plant('helped')],
    checks: [check('helped', 0), check('helped', 2, { mediumMoisture: 'dry', leafState: 'hanging' })],
    actions: [improved]
  }), 'helped');

  assert.strictEqual(after.insight.trend.direction, 'improving', 'E: a calmer later check should be recognized as improvement');
  assert.ok(after.insight.trend.signals.includes('action_helped'), 'E: the successful action should enter the new assessment');
  assert.ok(!actionIds(after).includes('water_if_dry'), 'E: the identical helpful action should not immediately become a new main task');
  assert.ok(after.plantPattern.metrics.helpfulActions.includes('water_if_dry'), 'E: the plant profile should retain the helpful action');
})();

(function scenarioFFailedMeasure() {
  const failed = {
    id: 'failed-wet-action', plantId: 'failed', actionId: 'avoid_watering_today', origin: 'local_intelligence',
    status: 'unchanged', outcome: 'unchanged', createdAt: NOW - (3 * DAY), updatedAt: NOW - (2 * 60 * 60 * 1000),
    performedAt: NOW - (2 * DAY), controlDueAt: NOW - DAY, controlWindowHours: 24
  };
  const result = insight(root({
    plants: [plant('failed')],
    checks: [
      check('failed', 0, { mediumMoisture: 'wet', leafState: 'hanging', growthState: 'slow' }),
      check('failed', 2, { mediumMoisture: 'wet', leafState: 'hanging' })
    ],
    actions: [failed]
  }), 'failed');

  assert.ok(result.insight.trend.signals.includes('action_no_improvement'), 'F: a failed action should trigger reassessment');
  assert.ok(!actionIds(result).includes('avoid_watering_today'), 'F: the identical failed action must stay suppressed');
  assert.ok(result.insight.primaryQuestion || actionIds(result).some((id) => id !== 'avoid_watering_today'), 'F: Care+ should offer a question or safe alternative instead of looping');
  assert.ok(result.plantPattern.metrics.ineffectiveActions.includes('avoid_watering_today'), 'F: the failed action should remain plant-specific evidence');
})();

(function scenarioGContradictoryInputs() {
  const result = insight(root({
    plants: [plant('contradiction')],
    checks: [
      check('contradiction', 0, { mediumMoisture: 'wet' }),
      check('contradiction', 0.25, { mediumMoisture: 'dry' }),
      check('contradiction', 0.5, { mediumMoisture: 'wet' })
    ]
  }), 'contradiction');

  assert.ok(result.insight.trend.contradictions.includes('moisture_changed_quickly'), 'G: rapid opposing moisture reports should be retained');
  assert.notStrictEqual(result.insight.priority, 'urgent_check', 'G: contradictory data alone must not trigger urgent intervention');
  assert.strictEqual(result.insight.primaryQuestion?.id, 'medium_moisture', 'G: Care+ should ask for one decisive moisture recheck');
  assert.ok(!actionIds(result).includes('water_if_dry'), 'G: contradictory moisture data must not trigger watering');
})();

(function scenarioHOverdueCheckAfterConcern() {
  const result = insight(root({
    plants: [plant('overdue')],
    checks: [
      check('overdue', 6, { mediumMoisture: 'wet', leafState: 'yellowing' }),
      check('overdue', 7, { mediumMoisture: 'wet' }),
      check('overdue', 8, { mediumMoisture: 'moist' })
    ]
  }), 'overdue');

  assert.ok(result.insight.trend.signals.includes('check_overdue_for_pattern'), 'H: the known check cadence should detect a quiet overdue review');
  assert.ok(result.insight.trend.signals.includes('attention_check_overdue'), 'H: the previous concern should be part of the reminder');
  assert.notStrictEqual(result.insight.priority, 'urgent_check', 'H: missing checks must not escalate into danger language');
  assert.ok(!result.insight.possibleCauses.some((cause) => cause.confidence >= 0.8), 'H: stale data must not create a high-confidence diagnosis');
})();

(function scenarioIPlantIsolation() {
  const dueAction = {
    id: 'plant-c-follow-up', plantId: 'plant-c', actionId: 'reduce_midday_light', origin: 'local_intelligence',
    status: 'performed', outcome: 'pending', createdAt: NOW - (3 * DAY), updatedAt: NOW - (2 * DAY),
    performedAt: NOW - (2 * DAY), controlDueAt: NOW - DAY, controlWindowHours: 24
  };
  const source = root({
    plants: [plant('plant-a'), plant('plant-b'), plant('plant-c')],
    checks: [
      check('plant-a', 0), check('plant-a', 1), check('plant-a', 2),
      check('plant-b', 0, { mediumMoisture: 'wet', leafState: 'hanging' }),
      check('plant-b', 1, { mediumMoisture: 'wet' }),
      check('plant-c', 0)
    ],
    actions: [dueAction]
  });
  const a = insight(source, 'plant-a');
  const b = insight(source, 'plant-b');
  const c = insight(source, 'plant-c');

  assert.strictEqual(a.insight.priority, 'no_action', 'I: stable plant A should stay calm');
  assert.strictEqual(b.insight.possibleCauses[0].id, 'wet_root_zone', 'I: only plant B should receive the wet-root weighting');
  assert.deepStrictEqual(b.insight.activeFollowUps, [], 'I: plant B must not receive plant C follow-ups');
  assert.deepStrictEqual(c.insight.activeFollowUps, ['plant-c-follow-up'], 'I: plant C should retain its own effect check');
  assert.strictEqual(c.context.actions.length, 1, 'I: the context must isolate plant C actions');
  assert.strictEqual(a.context.actions.length, 0, 'I: plant A must not inherit another plant action');
})();

(function dueEffectDoesNotHideNewUrgentEvidence() {
  const dueAction = {
    id: 'due-before-worsening', plantId: 'urgent', actionId: 'observe_two_days', origin: 'local_intelligence',
    status: 'performed', outcome: 'pending', createdAt: NOW - (3 * DAY), updatedAt: NOW - (2 * DAY),
    performedAt: NOW - (2 * DAY), controlDueAt: NOW - DAY, controlWindowHours: 24
  };
  const result = insight(root({
    plants: [plant('urgent')],
    checks: [
      check('urgent', 0, { mediumMoisture: 'wet', leafState: 'spots', pestsVisible: 'yes', growthState: 'slow' }),
      check('urgent', 1, { mediumMoisture: 'wet', leafState: 'yellowing' }),
      check('urgent', 2, { mediumMoisture: 'moist' })
    ],
    actions: [dueAction]
  }), 'urgent');

  assert.strictEqual(result.insight.priority, 'urgent_check', 'new clear risk evidence should still become urgent');
  assert.notStrictEqual(result.insight.recommendedActions[0]?.id, 'review_action_effect', 'an old effect check must not hide a new urgent safe check');
  assert.ok(result.insight.activeFollowUps.includes('due-before-worsening'), 'the pending effect check should remain available as secondary context');
})();

(function germanCoachCopyStaysCalmAndVaried() {
  const visibleCopy = [de.headline, de.summary, de.cause, de.action]
    .flatMap((group) => Object.values(group))
    .join(' ');
  assert.match(visibleCopy, /[äöüß]/, 'German intelligence copy should retain real umlauts and ß');
  assert.notStrictEqual(de.summary.stable, de.summary.worsening, 'stable and worsening plants should not receive generic identical copy');
  assert.match(de.summary.stable, /Beobachten ist aktuell sinnvoller/i, 'stable copy should explicitly avoid unnecessary intervention');
  assert.match(de.summary.worsening, /Seit mehreren Checks/i, 'worsening copy should explain the time context calmly');
  assert.match(de.summary.reassess, /möglichen Ursachen.*neu/i, 'failed action copy should explain reassessment without blame');
  assert.ok(Object.entries(de.cause).filter(([id]) => !['normal_leaf_turnover', 'insufficient_data'].includes(id)).every(([, title]) => /möglich/i.test(title)), 'cause labels should remain explicitly uncertain');
  assert.doesNotMatch(visibleCopy, /(wet_root_zone|dry_root_zone|confidence|score)/i, 'normal German UI copy must not expose technical ids or scores');
  assert.doesNotMatch(visibleCopy, /Deine Pflanze hat .*mangel/i, 'German UI copy must not state a hard diagnosis');
})();

console.log('buddy-care-intelligence-multiday.test.js passed');
