#!/usr/bin/env node
'use strict';

const assert = require('assert');
const dailyApi = require('../src/gameplay/dailyCareSelection.js');
const buddyApi = require('../src/gameplay/buddyDailyCheck.js');
const weeklyApi = require('../src/gameplay/weeklyMissions.js');
const coinApi = require('../src/gameplay/coinActions.js');
const decisionApi = require('../src/gameplay/decisionCards.js');

function buildSnapshot(overrides = {}) {
  const base = {
    simulation: {
      simDay: 12
    },
    plant: {
      phase: 'seedling'
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
        dayKey: '2026-06-09',
        tasks: [],
        buddyCheck: {
          category: '',
          primaryTaskId: ''
        }
      },
      weekly: {
        weekKey: '2026-06-08',
        missionId: ''
      },
      streak: {
        currentCount: 2
      },
      analytics: {
        dailyStats: [
          { dayKey: '2026-06-08', tasksCompleted: 1, sessionCount: 1, streakContinued: 1 },
          { dayKey: '2026-06-09', tasksCompleted: 1, sessionCount: 1, streakContinued: 0 },
          { dayKey: '2026-06-10', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 }
        ]
      },
      coinActions: {
        buddyTip: {},
        focusBoost: {},
        safeBoostCheck: {},
        weeklyPush: {}
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
        ...(((overrides.retention || {}).dailyCare) || {}),
        buddyCheck: {
          ...base.retention.dailyCare.buddyCheck,
          ...(((((overrides.retention || {}).dailyCare) || {}).buddyCheck) || {})
        }
      },
      weekly: {
        ...base.retention.weekly,
        ...(((overrides.retention || {}).weekly) || {})
      },
      streak: {
        ...base.retention.streak,
        ...(((overrides.retention || {}).streak) || {})
      },
      analytics: {
        ...base.retention.analytics,
        ...(((overrides.retention || {}).analytics) || {}),
        dailyStats: Array.isArray((((overrides.retention || {}).analytics) || {}).dailyStats)
          ? (((overrides.retention || {}).analytics) || {}).dailyStats
          : base.retention.analytics.dailyStats
      },
      coinActions: {
        ...base.retention.coinActions,
        ...(((overrides.retention || {}).coinActions) || {})
      }
    }
  };
}

function evaluateScenario(snapshot, dayKey) {
  const tasks = dailyApi.buildDailyCareSelection(snapshot, {
    dayKey,
    maxTasks: 3,
    recentTaskIds: []
  });
  const enriched = buildSnapshot(snapshot);
  enriched.retention.dailyCare.dayKey = dayKey;
  enriched.retention.dailyCare.tasks = tasks.map((task) => ({
    id: task.id,
    taskId: task.id,
    progress: 0,
    target: task.target,
    claimed: false
  }));
  const buddy = buddyApi.buildBuddyDailyCheck(enriched, {
    dayKey,
    nowMs: new Date(`${dayKey}T12:00:00`).getTime()
  });
  enriched.retention.dailyCare.buddyCheck = buddy;
  const weekly = weeklyApi.selectWeeklyMission(enriched, {
    nowMs: new Date(`${dayKey}T12:00:00`).getTime()
  });
  enriched.retention.weekly.weekKey = '2026-06-08';
  enriched.retention.weekly.missionId = weekly ? weekly.id : '';
  const decision = decisionApi.selectDecisionCard(enriched, {
    dayKey,
    weekKey: '2026-06-08',
    recentCardIds: []
  });
  const actions = coinApi.buildActionCatalog(enriched, {
    dayKey,
    weekKey: '2026-06-08'
  });
  return { tasks, buddy, weekly, decision, actions };
}

(function testQaMatrixAcrossPhasesAndSituations() {
  const runStart = evaluateScenario(buildSnapshot({
    simulation: { simDay: 2 },
    plant: { phase: 'seedling' }
  }), '2026-06-09');
  assert(runStart.tasks.some((task) => task.id === 'seedling_moisture_round'), 'run start should surface a seedling moisture task');
  assert.strictEqual(runStart.weekly && runStart.weekly.id, 'stable_start', 'run start should align with stable_start weekly');

  const vegStable = evaluateScenario(buildSnapshot({
    simulation: { simDay: 18 },
    plant: { phase: 'vegetative' },
    status: { water: 64, nutrition: 62, stress: 18, risk: 16, health: 84 }
  }), '2026-06-10');
  assert.strictEqual(vegStable.buddy.category, 'seedling_veg_focus', `stable veg day should stay phase-focused, got ${vegStable.buddy.category}`);
  assert.strictEqual(vegStable.weekly && vegStable.weekly.id, 'growth_focus', `stable veg day should align with growth_focus, got ${vegStable.weekly && vegStable.weekly.id}`);
  assert.strictEqual(vegStable.decision && vegStable.decision.id, 'growth_routine', `stable veg day should offer growth_routine, got ${vegStable.decision && vegStable.decision.id}`);

  const flowerStable = evaluateScenario(buildSnapshot({
    simulation: { simDay: 44 },
    plant: { phase: 'flowering' },
    status: { water: 68, nutrition: 64, stress: 22, risk: 20, health: 84 }
  }), '2026-06-11');
  assert.strictEqual(flowerStable.buddy.category, 'bloom_focus', `stable flowering day should prefer bloom_focus, got ${flowerStable.buddy.category}`);
  assert.strictEqual(flowerStable.weekly && flowerStable.weekly.id, 'bloom_focus', `stable flowering day should align with bloom_focus weekly, got ${flowerStable.weekly && flowerStable.weekly.id}`);

  const waterLow = evaluateScenario(buildSnapshot({
    simulation: { simDay: 20 },
    plant: { phase: 'vegetative' },
    status: { water: 44, nutrition: 62, stress: 20, risk: 18, health: 82 }
  }), '2026-06-12');
  assert.strictEqual(waterLow.buddy.category, 'water_focus', `low-water day should prefer water_focus, got ${waterLow.buddy.category}`);
  assert.strictEqual(waterLow.decision && waterLow.decision.id, 'water_low', `low-water day should offer water_low, got ${waterLow.decision && waterLow.decision.id}`);
  assert.notStrictEqual(waterLow.weekly && waterLow.weekly.id, 'risk_reset', 'low-water day alone should not become a risk-reset week');

  const stressHigh = evaluateScenario(buildSnapshot({
    simulation: { simDay: 24 },
    plant: { phase: 'stretch' },
    status: { water: 60, nutrition: 62, stress: 58, risk: 28, health: 80 }
  }), '2026-06-13');
  assert.strictEqual(stressHigh.buddy.category, 'stress_focus', `high-stress day should prefer stress_focus, got ${stressHigh.buddy.category}`);
  assert.strictEqual(stressHigh.decision && stressHigh.decision.id, 'stress_elevated', `high-stress day should offer stress_elevated, got ${stressHigh.decision && stressHigh.decision.id}`);
  assert.strictEqual(stressHigh.weekly && stressHigh.weekly.id, 'risk_reset', `high-stress week should align with risk_reset, got ${stressHigh.weekly && stressHigh.weekly.id}`);

  const riskHigh = evaluateScenario(buildSnapshot({
    simulation: { simDay: 46 },
    plant: { phase: 'flowering' },
    status: { water: 58, nutrition: 60, stress: 42, risk: 61, health: 76 },
    events: { machineState: 'activeEvent' }
  }), '2026-06-14');
  assert.strictEqual(riskHigh.buddy.category, 'risk_focus', `risk-heavy day should prefer risk_focus, got ${riskHigh.buddy.category}`);
  assert.strictEqual(riskHigh.decision && riskHigh.decision.id, 'risk_focus', `risk-heavy day should offer risk_focus, got ${riskHigh.decision && riskHigh.decision.id}`);

  const ripening = evaluateScenario(buildSnapshot({
    simulation: { simDay: 72 },
    plant: { phase: 'ripening' },
    status: { water: 68, nutrition: 64, stress: 18, risk: 18, health: 82 }
  }), '2026-06-15');
  assert(['timeboost_safe', 'bloom_focus'].includes(ripening.buddy.category), `ripening day should stay phase-safe, got ${ripening.buddy.category}`);
})();

(function testSmallBalanceGuardrailsStayIntact() {
  const catalog = coinApi.createCatalog();
  const byId = Object.fromEntries(catalog.map((entry) => [entry.id, entry]));
  assert.strictEqual(byId.daily_focus_boost.bonusCoins, 8, 'daily focus boost should stay at the small +8 bonus');
  assert.strictEqual(byId.weekly_push.bonusTasksCompleted, 1, 'weekly push should stay capped at +1 weekly task');
  assert(byId.daily_focus_boost.cost > byId.daily_focus_boost.bonusCoins, 'daily focus boost cost should stay meaningfully above its direct bonus');
})();

console.log('gameplay-activity-multiday-balance.test.js passed');
