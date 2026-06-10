#!/usr/bin/env node
'use strict';

const assert = require('assert');
const de = require('../src/i18n/locales/de.json');
const dailyApi = require('../src/gameplay/dailyCareSelection.js');
const buddyApi = require('../src/gameplay/buddyDailyCheck.js');
const weeklyApi = require('../src/gameplay/weeklyMissions.js');
const coinApi = require('../src/gameplay/coinActions.js');
const decisionApi = require('../src/gameplay/decisionCards.js');

function t(path, vars = {}) {
  const parts = String(path || '').split('.');
  let current = de;
  for (const part of parts) {
    current = current && current[part];
  }
  let value = typeof current === 'string' ? current : String(path || '');
  for (const [key, replacement] of Object.entries(vars)) {
    value = value.replaceAll(`{${key}}`, String(replacement));
  }
  return value;
}

function taskTitle(taskId) {
  return t(`daily.task.${String(taskId || '').trim()}.title`);
}

function buildBaseState(overrides = {}) {
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
        dayKey: '2026-06-11',
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
        currentCount: 0
      },
      analytics: {
        dailyStats: []
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

function deriveHomeHintKind(decisionState, weeklyMissionId) {
  if (decisionState && decisionState.state === 'answered_with_task') return 'decision_answered_task';
  if (decisionState && decisionState.state === 'answered_with_action') return 'decision_answered_action';
  if (decisionState && decisionState.state === 'open') return 'decision_open';
  return weeklyMissionId ? 'weekly' : 'none';
}

function buildConnectedRunSequence() {
  return [
    { dayKey: '2026-06-11', simDay: 4, phase: 'seedling', water: 47, nutrition: 62, stress: 16, risk: 12, health: 86, machineState: 'idle', tasksCompleted: 2 },
    { dayKey: '2026-06-12', simDay: 8, phase: 'seedling', water: 72, nutrition: 63, stress: 18, risk: 14, health: 85, machineState: 'idle', tasksCompleted: 2 },
    { dayKey: '2026-06-13', simDay: 18, phase: 'vegetative', water: 63, nutrition: 61, stress: 18, risk: 16, health: 84, machineState: 'idle', tasksCompleted: 2, answerDecision: 'focus_dailycare' },
    { dayKey: '2026-06-14', simDay: 24, phase: 'stretch', water: 58, nutrition: 60, stress: 55, risk: 28, health: 80, machineState: 'idle', tasksCompleted: 1 },
    { dayKey: '2026-06-15', simDay: 43, phase: 'flowering', water: 66, nutrition: 63, stress: 22, risk: 20, health: 82, machineState: 'idle', tasksCompleted: 2, buySafeBoost: true },
    { dayKey: '2026-06-16', simDay: 47, phase: 'flowering', water: 57, nutrition: 59, stress: 40, risk: 58, health: 76, machineState: 'activeEvent', tasksCompleted: 1 },
    { dayKey: '2026-06-17', simDay: 72, phase: 'ripening', water: 68, nutrition: 64, stress: 18, risk: 18, health: 82, machineState: 'idle', tasksCompleted: 2 }
  ];
}

(function testConnectedRunAcrossSevenDays() {
  const sequence = buildConnectedRunSequence();
  const days = [];
  let recentTaskIds = [];
  let recentCardIds = [];
  let weeklyMissionId = '';
  let weeklyWeekKey = '';
  let dailyStats = [];
  let streakCount = 0;

  for (const step of sequence) {
    const weekKey = weeklyApi.getWeekKey(step.dayKey);
    if (weekKey !== weeklyWeekKey) {
      weeklyWeekKey = weekKey;
      weeklyMissionId = '';
    }

    const state = buildBaseState({
      simulation: { simDay: step.simDay },
      plant: { phase: step.phase },
      status: {
        water: step.water,
        nutrition: step.nutrition,
        stress: step.stress,
        risk: step.risk,
        health: step.health
      },
      events: {
        machineState: step.machineState
      },
      retention: {
        dailyCare: {
          dayKey: step.dayKey
        },
        weekly: {
          weekKey,
          missionId: weeklyMissionId
        },
        streak: {
          currentCount: streakCount
        },
        analytics: {
          dailyStats
        }
      }
    });

    const tasks = dailyApi.buildDailyCareSelection(state, {
      dayKey: step.dayKey,
      maxTasks: 3,
      recentTaskIds
    });
    state.retention.dailyCare.tasks = tasks.map((task) => ({
      id: task.id,
      taskId: task.id,
      progress: 0,
      target: task.target,
      claimed: false,
      completed: false
    }));

    const buddy = buddyApi.buildBuddyDailyCheck(state, {
      dayKey: step.dayKey,
      nowMs: new Date(`${step.dayKey}T12:00:00`).getTime()
    });
    state.retention.dailyCare.buddyCheck = buddy;

    if (!weeklyMissionId) {
      const generatedWeekly = weeklyApi.selectWeeklyMission(state, {
        nowMs: new Date(`${step.dayKey}T12:00:00`).getTime()
      });
      weeklyMissionId = generatedWeekly ? generatedWeekly.id : '';
    }
    state.retention.weekly.missionId = weeklyMissionId;

    const decision = decisionApi.selectDecisionCard(state, {
      dayKey: step.dayKey,
      weekKey,
      recentCardIds
    });

    let decisionState = decision ? { state: 'open', id: decision.id } : null;
    if (decision && step.answerDecision) {
      const resolution = decisionApi.buildDecisionCardResolution(state, decision.id, step.answerDecision, {
        dayKey: step.dayKey,
        weekKey,
        primaryTaskId: decision.primaryTaskId
      });
      decisionState = resolution.focusTaskId
        ? { state: 'answered_with_task', id: decision.id, focusTaskId: resolution.focusTaskId, optionId: step.answerDecision }
        : (resolution.suggestedCoinActionId
          ? { state: 'answered_with_action', id: decision.id, actionId: resolution.suggestedCoinActionId, optionId: step.answerDecision }
          : { state: 'open', id: decision.id });
    }

    let actions = coinApi.buildActionCatalog(state, {
      dayKey: step.dayKey,
      weekKey
    });
    if (step.buySafeBoost) {
      state.retention.coinActions.safeBoostCheck = {
        dayKey: step.dayKey,
        statusKey: 'caution',
        textKey: 'daily.coin_actions.safe_boost.caution.1',
        primaryTaskId: buddy.primaryTaskId,
        purchasedAtMs: new Date(`${step.dayKey}T13:00:00`).getTime()
      };
      actions = coinApi.buildActionCatalog(state, {
        dayKey: step.dayKey,
        weekKey
      });
    }

    days.push({
      dayKey: step.dayKey,
      weekKey,
      phase: step.phase,
      tasks: tasks.map((task) => task.id),
      buddyCategory: buddy.category,
      buddyText: t(buddy.textKey, {
        primaryTask: taskTitle(buddy.primaryTaskId),
        secondaryTask: taskTitle(buddy.secondaryTaskId)
      }),
      decisionState,
      weeklyMissionId,
      safeBoostAvailable: Boolean(actions.find((entry) => entry.id === 'safe_boost_check' && entry.available)),
      safeBoostState: String((actions.find((entry) => entry.id === 'safe_boost_check') || {}).stateKey || ''),
      homeHintKind: deriveHomeHintKind(decisionState, weeklyMissionId)
    });

    dailyStats = dailyStats.concat([{
      dayKey: step.dayKey,
      tasksCompleted: step.tasksCompleted,
      sessionCount: 1,
      streakContinued: step.tasksCompleted > 0 ? 1 : 0
    }]);
    streakCount = step.tasksCompleted > 0 ? (streakCount + 1) : 0;
    recentTaskIds = tasks.map((task) => task.id);
    if (decision) {
      recentCardIds = [decision.id].concat(recentCardIds).slice(0, 10);
    }
  }

  assert.strictEqual(days.length, 7, 'connected run should cover 7 days');
  for (let index = 1; index < days.length; index += 1) {
    const overlap = days[index].tasks.filter((taskId) => days[index - 1].tasks.includes(taskId));
    assert(overlap.length < 3, `day ${days[index].dayKey} should not fully repeat prior tasks`);
  }

  const weeklyIds = days.map((day) => day.weeklyMissionId);
  assert.strictEqual(weeklyIds[0], 'stable_start', `first week should start with stable_start, got ${weeklyIds[0]}`);
  assert.strictEqual(weeklyIds[4], 'bloom_focus', `new week should rotate to bloom_focus, got ${weeklyIds[4]}`);
  assert(weeklyIds.slice(4).every((id) => id === 'bloom_focus'), 'weekly mission should stay stable after week rollover');

  assert.strictEqual(days[0].decisionState && days[0].decisionState.id, 'water_low', 'day 1 should surface a water decision');
  assert.strictEqual(days[1].decisionState, null, 'day 2 should allow a no-decision day');
  assert.strictEqual(days[2].decisionState && days[2].decisionState.state, 'answered_with_task', 'day 3 should cover an answered decision state');
  assert.strictEqual(days[5].decisionState && days[5].decisionState.id, 'risk_focus', 'high-risk day should produce a risk-focused decision');
  assert.strictEqual(days[6].decisionState && days[6].decisionState.id, 'timeboost_choice', 'ripening day should be able to offer a timeboost decision');

  assert.strictEqual(days[1].homeHintKind, 'weekly', 'no-decision day should fall back to a weekly home hint');
  assert.strictEqual(days[2].homeHintKind, 'decision_answered_task', 'answered decision day should surface an answered-task home hint');
  assert(days[0].homeHintKind === 'decision_open' && days[5].homeHintKind === 'decision_open', 'open decision days should surface the decision home hint');

  assert.strictEqual(days[0].safeBoostAvailable, true, 'time-related opening day should allow safe boost check');
  assert.strictEqual(days[1].safeBoostAvailable, false, 'non-time day should hide safe boost check');
  assert.strictEqual(days[3].safeBoostAvailable, false, 'stress-only day should not push safe boost check');
  assert.strictEqual(days[4].safeBoostState, 'used', 'purchased safe boost check should remain used on the same day');
  assert.strictEqual(days[6].safeBoostAvailable, true, 'ripening time-related day should allow safe boost check');

  const identicalBuddyTexts = days.filter((day, index) => index > 0 && day.buddyText === days[index - 1].buddyText);
  assert.strictEqual(identicalBuddyTexts.length, 0, 'buddy text should not repeat verbatim on adjacent days in the connected run');
  const buddyCategories = days.map((day) => day.buddyCategory);
  const maxCategoryRun = buddyCategories.reduce((acc, category) => {
    if (acc.currentCategory === category) {
      return {
        currentCategory: category,
        currentRun: acc.currentRun + 1,
        maxRun: Math.max(acc.maxRun, acc.currentRun + 1)
      };
    }
    return {
      currentCategory: category,
      currentRun: 1,
      maxRun: Math.max(acc.maxRun, 1)
    };
  }, { currentCategory: '', currentRun: 0, maxRun: 0 }).maxRun;
  assert(maxCategoryRun <= 2, `buddy categories should not get stuck for too long, max run was ${maxCategoryRun}`);

  const firstWeekState = buildBaseState({
    simulation: { simDay: 24 },
    plant: { phase: 'stretch' },
    status: { water: 58, nutrition: 60, stress: 55, risk: 28, health: 80 },
    retention: {
      weekly: { weekKey: '2026-06-08', missionId: 'stable_start' },
      streak: { currentCount: 4 },
      analytics: {
        dailyStats: days.slice(0, 4).map((day, index) => ({
          dayKey: day.dayKey,
          tasksCompleted: sequence[index].tasksCompleted,
          sessionCount: 1,
          streakContinued: sequence[index].tasksCompleted > 0 ? 1 : 0
        }))
      }
    }
  });
  const firstWeekProgress = weeklyApi.buildWeeklyMissionProgress(firstWeekState, 'stable_start', {
    nowMs: new Date('2026-06-14T12:00:00').getTime()
  });
  assert(firstWeekProgress && firstWeekProgress.completed, 'first-week stable_start should be understandable and completable in the sequence');

  const secondWeekState = buildBaseState({
    simulation: { simDay: 72 },
    plant: { phase: 'ripening' },
    status: { water: 68, nutrition: 64, stress: 18, risk: 18, health: 82 },
    retention: {
      weekly: { weekKey: '2026-06-15', missionId: 'bloom_focus' },
      streak: { currentCount: 7 },
      analytics: {
        dailyStats: days.slice(4).map((day, index) => ({
          dayKey: day.dayKey,
          tasksCompleted: sequence[index + 4].tasksCompleted,
          sessionCount: 1,
          streakContinued: sequence[index + 4].tasksCompleted > 0 ? 1 : 0
        }))
      }
    }
  });
  const secondWeekProgress = weeklyApi.buildWeeklyMissionProgress(secondWeekState, 'bloom_focus', {
    nowMs: new Date('2026-06-17T12:00:00').getTime()
  });
  assert(secondWeekProgress && secondWeekProgress.objectives.length > 0, 'second-week bloom progress should resolve');
  assert(secondWeekProgress.progressPercent > 0, 'second-week bloom progress should be readable and non-zero');
})();

console.log('gameplay-activity-connected-run-qa.test.js passed');
