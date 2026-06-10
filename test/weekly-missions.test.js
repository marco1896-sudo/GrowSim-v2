#!/usr/bin/env node
'use strict';

const assert = require('assert');
const weeklyApi = require('../src/gameplay/weeklyMissions.js');

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
      risk: 14,
      health: 88
    },
    retention: {
      streak: {
        currentCount: 2
      },
      dailyCare: {
        dayKey: '2026-06-08',
        tasks: []
      },
      analytics: {
        dailyStats: [
          { dayKey: '2026-06-08', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 },
          { dayKey: '2026-06-09', tasksCompleted: 1, sessionCount: 1, streakContinued: 0 },
          { dayKey: '2026-06-10', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 }
        ]
      }
    }
  };
  return {
    ...base,
    ...overrides,
    simulation: { ...base.simulation, ...(overrides.simulation || {}) },
    plant: { ...base.plant, ...(overrides.plant || {}) },
    status: { ...base.status, ...(overrides.status || {}) },
    retention: {
      ...base.retention,
      ...(overrides.retention || {}),
      streak: { ...base.retention.streak, ...(((overrides.retention || {}).streak) || {}) },
      dailyCare: { ...base.retention.dailyCare, ...(((overrides.retention || {}).dailyCare) || {}) },
      analytics: {
        ...base.retention.analytics,
        ...(((overrides.retention || {}).analytics) || {}),
        dailyStats: Array.isArray((((overrides.retention || {}).analytics) || {}).dailyStats)
          ? (((overrides.retention || {}).analytics) || {}).dailyStats
          : base.retention.analytics.dailyStats
      }
    }
  };
}

(function testCatalogHasExpectedWeeklyTemplates() {
  const catalog = weeklyApi.createCatalog();
  assert.strictEqual(catalog.length, 5, `expected 5 weekly mission templates, got ${catalog.length}`);
})();

(function testSelectionTracksPhaseAndRiskSignals() {
  const bloomMission = weeklyApi.selectWeeklyMission(buildSnapshot({
    simulation: { simDay: 44 },
    plant: { phase: 'flowering' }
  }), { nowMs: new Date('2026-06-08T12:00:00').getTime() });
  assert.strictEqual(bloomMission.id, 'bloom_focus', `expected bloom mission in flowering phase, got ${bloomMission && bloomMission.id}`);

  const riskMission = weeklyApi.selectWeeklyMission(buildSnapshot({
    simulation: { simDay: 30 },
    plant: { phase: 'vegetative' },
    status: { risk: 58, stress: 54 }
  }), { nowMs: new Date('2026-06-08T12:00:00').getTime() });
  assert.strictEqual(riskMission.id, 'risk_reset', `expected risk reset mission under pressure, got ${riskMission && riskMission.id}`);
})();

(function testProgressBuildsFromDailyStatsAndSafeSignals() {
  const progress = weeklyApi.buildWeeklyMissionProgress(buildSnapshot({
    plant: { phase: 'seedling' },
    retention: {
      streak: { currentCount: 2 },
      analytics: {
        dailyStats: [
          { dayKey: '2026-06-08', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 },
          { dayKey: '2026-06-09', tasksCompleted: 1, sessionCount: 1, streakContinued: 0 },
          { dayKey: '2026-06-10', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 }
        ]
      }
    }
  }), 'stable_start', {
    nowMs: new Date('2026-06-08T12:00:00').getTime()
  });

  assert(progress, 'progress should resolve for stable_start');
  const byMetric = Object.fromEntries(progress.objectives.map((entry) => [entry.metric, entry]));
  assert.strictEqual(byMetric.tasks_completed_week.current, 5, 'weekly task total should aggregate from daily stats');
  assert.strictEqual(byMetric.active_days_week.current, 3, 'active day count should aggregate from weekly stats');
  assert.strictEqual(byMetric.streak_current.current, 2, 'streak metric should read from retention streak');
  assert.strictEqual(progress.completed, true, 'stable start should complete when all objectives are met');
})();

(function testWeeklyPushAddsOneSafeTaskBonus() {
  const progress = weeklyApi.buildWeeklyMissionProgress(buildSnapshot({
    plant: { phase: 'vegetative' },
    retention: {
      analytics: {
        dailyStats: [
          { dayKey: '2026-06-08', tasksCompleted: 2, sessionCount: 1, streakContinued: 1 },
          { dayKey: '2026-06-09', tasksCompleted: 1, sessionCount: 1, streakContinued: 0 },
          { dayKey: '2026-06-10', tasksCompleted: 1, sessionCount: 1, streakContinued: 1 }
        ]
      },
      coinActions: {
        weeklyPush: {
          weekKey: '2026-06-08',
          bonusTasksCompleted: 1,
          purchasedAtMs: 1700000000000
        }
      }
    }
  }), 'growth_focus', {
    nowMs: new Date('2026-06-11T12:00:00').getTime()
  });

  const byMetric = Object.fromEntries(progress.objectives.map((entry) => [entry.metric, entry]));
  assert.strictEqual(byMetric.tasks_completed_week.current, 5, 'weekly push should add one safe weekly task bonus');
})();

(function testWaterRecoveryAloneDoesNotForceRiskResetWeek() {
  const mission = weeklyApi.selectWeeklyMission(buildSnapshot({
    simulation: { simDay: 20 },
    plant: { phase: 'vegetative' },
    status: { water: 44, nutrition: 62, stress: 20, risk: 18, health: 82 },
    retention: {
      dailyCare: {
        tasks: [
          { id: 'water_recovery_round' },
          { id: 'veg_training_review' },
          { id: 'open_app_twice' }
        ]
      }
    }
  }), {
    nowMs: new Date('2026-06-09T12:00:00').getTime()
  });

  assert(mission, 'a weekly mission should still be selected');
  assert.notStrictEqual(mission.id, 'risk_reset', 'pure low-water recovery should not immediately force the risk-reset week');
})();

console.log('weekly-missions.test.js passed');
