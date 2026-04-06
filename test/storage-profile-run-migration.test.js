#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const progression = require('../src/progression/progression.js');

function buildContext(savedSnapshot) {
  const storageSource = fs.readFileSync(path.join(__dirname, '..', 'storage.js'), 'utf8');
  const context = {
    console,
    Date,
    Math,
    JSON,
    Promise,
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    storageAdapter: {
      async get() {
        return savedSnapshot;
      },
      async set() {}
    },
    window: {
      GrowSimTextEncoding: {
        deepRepairMojibake: (value) => value
      },
      GrowSimProgression: progression
    },
    LS_STATE_KEY: 'grow-sim-state-v2',
    MODE: 'prod',
    UI_TICK_INTERVAL_MS: 1000,
    SIM_TIME_COMPRESSION: 12,
    SIM_START_HOUR: 8,
    SIM_DAY_START_HOUR: 6,
    SIM_NIGHT_START_HOUR: 22,
    SIM_GLOBAL_SEED: 'grow-sim-v1-seed',
    SIM_PLANT_ID: 'plant-001',
    TOTAL_LIFECYCLE_SIM_DAYS: 88,
    EVENT_ROLL_MIN_REAL_MS: 30 * 60 * 1000,
    dayStamp: () => '2026-03-27',
    alignToSimStartHour: () => 1_000,
    isDaytimeAtSimTime: () => true,
    normalizeAction: (action) => action,
    simDayFloat: () => 0,
    simHour: () => 8,
    round2: (value) => Math.round((Number(value) || 0) * 100) / 100,
    clamp: (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)),
    clampInt: (value, min, max) => Math.min(max, Math.max(min, Math.trunc(Number(value) || 0))),
    plantAssetPath: (stageKey) => `assets/${stageKey || 'stage_01'}.png`,
    stageAssetKeyForIndex: (stageIndex) => `stage_${String(Number(stageIndex || 0) + 1).padStart(2, '0')}`,
    normalizeStageKey: (stageKey) => String(stageKey || 'stage_01'),
    getStageTimeline: () => [{ simDayStart: 0 }],
    clampStatus: () => {},
    computeGrowthPercent: () => 0,
    state: {
      schemaVersion: '1.0.0',
      simulation: {},
      plant: {},
      events: {},
      history: {},
      meta: {},
      settings: {},
      status: {},
      boost: {},
      actions: {},
      ui: {},
      climate: {},
      environmentControls: {}
    }
  };

  vm.createContext(context);
  vm.runInContext(storageSource, context, { filename: 'storage.js' });
  return context;
}

(async function testDefaultProfileAndRunDefaults() {
  const ctx = buildContext(null);
  ctx.resetStateToDefaults();

  assert.strictEqual(ctx.state.profile.level, 1, 'default profile should start at level 1');
  assert.strictEqual(ctx.state.profile.totalXp, 0, 'default profile should start at 0 xp');
  assert.deepStrictEqual(ctx.state.profile.unlocks.genetics, ['hybrid'], 'default genetics unlock should exist');
  assert.strictEqual(ctx.state.run.status, 'idle', 'default run should be idle');
})();

(async function testOldSaveMigratesIntoActiveRunAndDefaultProfile() {
  const oldSave = {
    setup: {
      mode: 'indoor',
      light: 'medium',
      medium: 'soil',
      potSize: 'small',
      genetics: 'hybrid',
      createdAtReal: 555
    },
    simulation: {
      startRealTimeMs: 555,
      lastTickRealTimeMs: 777,
      nowMs: 777,
      simTimeMs: 888,
      simEpochMs: 555
    },
    plant: {
      phase: 'seedling',
      isDead: false,
      stageIndex: 1,
      stageKey: 'stage_02',
      stageProgress: 0.35,
      averageHealth: 88,
      averageStress: 12,
      lifecycle: {
        qualityTier: 'normal',
        qualityScore: 82
      }
    },
    status: {
      health: 94,
      stress: 10,
      water: 80,
      nutrition: 72,
      risk: 8
    }
  };

  const ctx = buildContext(oldSave);
  ctx.resetStateToDefaults();
  await ctx.restoreState();
  ctx.ensureStateIntegrity(Date.now());
  ctx.syncCanonicalStateShape();

  assert.strictEqual(ctx.state.profile.level, 1, 'old saves should receive a default level 1 profile');
  assert.strictEqual(ctx.state.profile.totalXp, 0, 'old saves should receive default xp');
  assert.strictEqual(ctx.state.run.status, 'active', 'old save with setup should migrate into an active run');
  assert.strictEqual(ctx.state.run.setupSnapshot.mode, 'indoor', 'migrated run should preserve setup snapshot');
  assert.ok(ctx.state.run.goal && ctx.state.run.goal.id, 'migrated active run should receive a mission-light goal');
})();

(async function testRestoreRecoversCompletedButUnresolvedGoalState() {
  const brokenSave = {
    profile: progression.getDefaultProfile(),
    setup: {
      mode: 'indoor',
      light: 'medium',
      medium: 'soil',
      potSize: 'small',
      genetics: 'hybrid',
      createdAtReal: 555
    },
    simulation: {
      startRealTimeMs: 555,
      lastTickRealTimeMs: 777,
      nowMs: 777,
      simTimeMs: 888,
      simEpochMs: 555,
      simDay: 25
    },
    plant: {
      phase: 'vegetative',
      isDead: false,
      stageIndex: 5,
      stageKey: 'stage_06',
      averageHealth: 88,
      averageStress: 12,
      lifecycle: {
        qualityTier: 'normal',
        qualityScore: 82
      }
    },
    status: {
      health: 94,
      stress: 10,
      water: 80,
      nutrition: 72,
      risk: 8
    },
    run: {
      id: 2,
      status: 'active',
      startedAtRealMs: 555,
      endedAtRealMs: null,
      finalizedAtRealMs: null,
      setupSnapshot: {
        mode: 'indoor',
        light: 'medium',
        medium: 'soil',
        potSize: 'small',
        genetics: 'hybrid'
      },
      goal: {
        id: 'survive_day_20',
        status: 'completed',
        progress: 20,
        target: 20,
        rewardXp: 45,
        xpGranted: false,
        awardedXp: 0,
        sequenceIndex: 0,
        sequenceLength: 3
      },
      goalHistory: []
    }
  };

  const ctx = buildContext(brokenSave);
  ctx.resetStateToDefaults();
  await ctx.restoreState();
  ctx.ensureStateIntegrity(Date.now());

  assert.strictEqual(ctx.state.profile.totalXp, 45, 'restore should immediately recover and commit pending goal xp');
  assert.deepStrictEqual(ctx.state.run.goalHistory, ['survive_day_20'], 'restore should mark the completed goal as resolved');
  assert.ok(ctx.state.run.goal && ctx.state.run.goal.id !== 'survive_day_20', 'restore should reactivate the next goal instead of keeping the completed one active');
})();

(async function testRestoreKeepsFinalizedRunClosableForNextRunFlow() {
  const finalizedSave = {
    profile: {
      ...progression.getDefaultProfile(),
      totalXp: 220,
      level: progression.getLevelForXp(220),
      lastRunSummary: {
        endReason: 'harvest',
        simDay: 84,
        qualityScore: 88,
        qualityTier: 'strong',
        goal: {
          id: 'reach_harvest',
          status: 'completed',
          rewardXp: 90,
          awardedXp: 90
        }
      }
    },
    setup: null,
    simulation: {
      startRealTimeMs: 555,
      lastTickRealTimeMs: 999,
      nowMs: 999,
      simTimeMs: 1200,
      simEpochMs: 555
    },
    plant: {
      phase: 'harvest',
      isDead: false,
      stageIndex: 11,
      stageKey: 'stage_12'
    },
    status: {
      health: 90,
      stress: 8,
      water: 70,
      nutrition: 68,
      risk: 6
    },
    run: {
      id: 5,
      status: 'ended',
      endReason: 'harvest',
      startedAtRealMs: 555,
      endedAtRealMs: 900,
      finalizedAtRealMs: 950,
      setupSnapshot: {
        mode: 'indoor',
        light: 'medium',
        medium: 'soil',
        potSize: 'small',
        genetics: 'hybrid'
      },
      goal: {
        id: 'reach_harvest',
        status: 'completed',
        rewardXp: 90,
        awardedXp: 90,
        xpGranted: true
      },
      goalHistory: ['survive_day_20', 'reach_flowering', 'stable_grow', 'clean_finish', 'reach_harvest']
    },
    ui: {
      runSummaryOpen: true
    }
  };

  const ctx = buildContext(finalizedSave);
  ctx.resetStateToDefaults();
  await ctx.restoreState();
  ctx.ensureStateIntegrity(Date.now());
  ctx.syncCanonicalStateShape();

  assert.strictEqual(ctx.state.run.status, 'ended', 'finalized old saves should stay ended on restore');
  assert.ok(ctx.state.run.finalizedAtRealMs, 'finalized old saves should preserve finalized timestamp');
  assert.strictEqual(ctx.state.ui.runSummaryOpen, true, 'finalized old saves should reopen the summary for user actions');
  assert.strictEqual(Boolean(ctx.state.profile.lastRunSummary), true, 'finalized old saves should keep the persisted summary');
})();

console.log('storage-profile-run-migration tests passed');
