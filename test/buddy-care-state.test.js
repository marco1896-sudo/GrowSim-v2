#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const progression = require('../src/progression/progression.js');
const careModel = require('../src/simulation/careModel.js');
const buddyCareFlags = require('../src/buddy-care/featureFlags.js');
require('../src/buddy-care/types.js');
const buddyCareState = require('../src/buddy-care/state.js');

function buildStorageContext(savedSnapshot) {
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
      GrowSimProgression: progression,
      GrowSimCareModel: careModel,
      GrowSimBuddyCareFlags: buddyCareFlags,
      GrowSimBuddyCareState: buddyCareState
    },
    GrowSimBuddyCareFlags: buddyCareFlags,
    GrowSimBuddyCareState: buddyCareState,
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
    dayStamp: () => '2026-07-09',
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

(function testFeatureFlagsAndDefaultState() {
  const defaults = buddyCareState.createDefaultBuddyCareState();

  assert.strictEqual(buddyCareFlags.isBuddyCareEnabled(), true, 'buddy care flag should be enabled');
  assert.strictEqual(buddyCareFlags.getFreePlantLimit(), 1, 'free tier should allow one plant');
  assert.strictEqual(buddyCareFlags.getCarePlusMockPlantLimit(), 3, 'mock care+ should allow three plants');
  assert.strictEqual(defaults.entitlement, 'free', 'default entitlement should start free');
  assert.strictEqual(defaults.ageGateAccepted, false, 'default state should require age gate');
  assert.deepStrictEqual(defaults.plants, [], 'default state should start with no plants');
  assert.deepStrictEqual(defaults.diaryEntries, [], 'default state should start with no diary entries');
})();

(function testNormalizerAndEntitlementLogic() {
  const normalized = buddyCareState.normalizeBuddyCareState({
    version: 0,
    ageGateAccepted: true,
    ageGateAcceptedAt: '1234',
    entitlement: 'care_plus_mock',
    plants: [
      { id: 'p1', nickname: 'Alpha', phase: 'seedling' },
      { id: 'p2', nickname: 'Beta', phase: 'vegetative' },
      { id: 'p3', nickname: 'Gamma', phase: 'flowering' },
      { id: 'p4', nickname: 'Delta', phase: 'harvest' }
    ],
    settings: {
      notificationsEnabled: true,
      preferredReminderTime: '19:30'
    }
  });

  assert.strictEqual(normalized.version, 1, 'normalized state should use v1');
  assert.strictEqual(normalized.entitlement, 'care_plus_mock', 'entitlement should preserve mock mode');
  assert.strictEqual(normalized.plants.length, 3, 'normalized state should clamp to max three plants');
  assert.strictEqual(normalized.settings.preferredReminderTime, '19:30', 'valid reminder time should survive normalization');

  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  assert.strictEqual(buddyCareState.getBuddyCarePlantLimit(rootState), 1, 'free tier should expose one plant');
  buddyCareState.acceptBuddyCareAgeGate(rootState, 555);
  assert.strictEqual(rootState.buddyCare.ageGateAccepted, true, 'age gate acceptance should persist');
  assert.strictEqual(rootState.buddyCare.ageGateAcceptedAt, 555, 'age gate timestamp should persist');
  buddyCareState.activateBuddyCarePlusMock(rootState);
  assert.strictEqual(buddyCareState.getBuddyCareEntitlement(rootState), 'care_plus_mock', 'mock activation should switch entitlement');
  assert.strictEqual(buddyCareState.getBuddyCarePlantLimit(rootState), 3, 'mock care+ should expose three plants');
})();

(function testNormalizationKeepsPlantsButFiltersOrphans() {
  const normalized = buddyCareState.normalizeBuddyCareState({
    entitlement: 'care_plus_mock',
    plants: [
      { id: 'shared', nickname: '', startDate: '', environment: 'tent' },
      { id: 'shared', nickname: 'Bravo', phase: 'invalid-phase' },
      { nickname: 'Charlie' }
    ],
    dailyChecks: [
      { id: 'check-a', plantId: 'shared', createdAtIso: '2026-07-10T08:00:00.000Z' },
      { id: 'check-orphan', plantId: 'missing', createdAtIso: '2026-07-10T09:00:00.000Z' }
    ],
    diaryEntries: [
      { id: 'entry-a', plantId: 'shared', createdAt: '2026-07-10T08:10:00.000Z', updatedAt: '2026-07-10T08:10:00.000Z' },
      { id: 'entry-orphan', plantId: 'missing', createdAt: '2026-07-10T09:10:00.000Z', updatedAt: '2026-07-10T09:10:00.000Z' }
    ]
  });

  assert.strictEqual(normalized.plants.length, 3, 'normalization should preserve up to three stored plants');
  assert.strictEqual(normalized.plants[0].id, 'shared', 'the first valid id should stay stable');
  assert.notStrictEqual(normalized.plants[1].id, 'shared', 'duplicate plant ids should be deduplicated');
  assert.ok(normalized.plants[0].nickname, 'missing nicknames should receive a fallback name');
  assert.ok(normalized.plants[0].startDate, 'missing start dates should receive a safe fallback');
  assert.strictEqual(normalized.plants[0].environment, 'unknown', 'unsupported environments should normalize safely');
  assert.strictEqual(normalized.plants[1].phase, 'seedling', 'unsupported phases should normalize safely');
  assert.strictEqual(normalized.dailyChecks.length, 1, 'orphaned daily checks should be removed during normalization');
  assert.strictEqual(normalized.diaryEntries.length, 1, 'orphaned diary entries should be removed during normalization');
})();

(function testPlantSetupMutations() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };

  const firstAdd = buddyCareState.addBuddyCarePlant(rootState, {
    nickname: 'Alpha',
    plantType: 'auto',
    environment: 'outdoor',
    startDate: '2026-07-01',
    phase: 'seedling'
  });
  assert.strictEqual(firstAdd.ok, true, 'first plant should be added');
  assert.strictEqual(rootState.buddyCare.plants.length, 1, 'free tier should store the first plant');
  assert.strictEqual(rootState.buddyCare.plants[0].nickname, 'Alpha', 'plant nickname should persist');
  assert.strictEqual(rootState.buddyCare.plants[0].plantType, 'auto', 'plant type should persist');
  assert.strictEqual(rootState.buddyCare.plants[0].environment, 'outdoor', 'environment should persist');
  assert.strictEqual(rootState.buddyCare.plants[0].startDate, '2026-07-01', 'start date should persist');
  assert.strictEqual(rootState.buddyCare.plants[0].phase, 'seedling', 'plant phase should persist');
  assert.strictEqual(buddyCareState.canAddBuddyCarePlant(rootState), false, 'free tier should block a second plant');

  const blockedAdd = buddyCareState.addBuddyCarePlant(rootState, {
    nickname: 'Beta',
    phase: 'vegetative'
  });
  assert.strictEqual(blockedAdd.ok, false, 'second free plant should be blocked');
  assert.strictEqual(blockedAdd.reason, 'plant_limit_reached', 'blocked add should explain the limit');

  buddyCareState.activateBuddyCarePlusMock(rootState);
  assert.strictEqual(buddyCareState.canAddBuddyCarePlant(rootState), true, 'care+ mock should reopen slots');
  buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Beta', phase: 'vegetative' });
  buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Gamma', phase: 'flowering' });
  assert.strictEqual(rootState.buddyCare.plants.length, 3, 'care+ mock should allow up to three plants');
  assert.strictEqual(buddyCareState.getBuddyCareRemainingPlantSlots(rootState), 0, 'no slots should remain at three plants');

  rootState.buddyCare.tasks.push({ id: 'task-b', plantId: rootState.buddyCare.plants[1].id, title: 'Observe', status: 'open' });
  rootState.buddyCare.riskSignals.push({ id: 'risk-b', plantId: rootState.buddyCare.plants[1].id, level: 'medium', label: 'Watch', source: 'test' });

  const removed = buddyCareState.removeBuddyCarePlant(rootState, rootState.buddyCare.plants[1].id);
  assert.strictEqual(removed.ok, true, 'existing plant should be removable');
  assert.strictEqual(rootState.buddyCare.plants.length, 2, 'removing a plant should shrink the list');
  assert.strictEqual(buddyCareState.getBuddyCareRemainingPlantSlots(rootState), 1, 'one slot should reopen after removal');
  assert.strictEqual(rootState.buddyCare.tasks.length, 0, 'removing a plant should clear linked buddy-care tasks');
  assert.strictEqual(rootState.buddyCare.riskSignals.length, 0, 'removing a plant should clear linked buddy-care risk signals');
})();

(function testDowngradeKeepsStoredPlantsReadOnly() {
  const rootState = { buddyCare: buddyCareState.createDefaultBuddyCareState() };
  buddyCareState.activateBuddyCarePlusMock(rootState);
  buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Alpha' });
  buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Beta' });
  buddyCareState.addBuddyCarePlant(rootState, { nickname: 'Gamma' });

  buddyCareState.setBuddyCareEntitlement(rootState, 'free');

  assert.strictEqual(rootState.buddyCare.plants.length, 3, 'downgrading to free should keep stored buddy-care plants');
  assert.strictEqual(buddyCareState.getBuddyCarePlantLimit(rootState), 1, 'free should still expose a single active slot');
  assert.strictEqual(buddyCareState.isBuddyCarePlantReadOnly(rootState, rootState.buddyCare.plants[0].id), false, 'the first plant should stay active after downgrade');
  assert.strictEqual(buddyCareState.isBuddyCarePlantReadOnly(rootState, rootState.buddyCare.plants[1].id), true, 'extra plants should become read-only after downgrade');
  assert.strictEqual(buddyCareState.isBuddyCarePlantReadOnly(rootState, rootState.buddyCare.plants[2].id), true, 'the third plant should also become read-only after downgrade');
})();

(function testPlantProfileNormalizationFallbacks() {
  const profile = buddyCareState.createBuddyCarePlantProfile({
    nickname: 'Legacy',
    type: 'photo',
    environment: 'tent',
    createdAt: Date.UTC(2026, 6, 4)
  });

  assert.strictEqual(profile.plantType, 'photoperiod', 'legacy type aliases should normalize to photoperiod');
  assert.strictEqual(profile.environment, 'unknown', 'unsupported environments should normalize to unknown');
  assert.strictEqual(profile.startDate, '2026-07-04', 'missing start date should derive from createdAt');
})();

async function main() {
  const freshContext = buildStorageContext(null);
  freshContext.resetStateToDefaults();

  assert.ok(freshContext.state.buddyCare, 'default storage state should include buddy care');
  assert.strictEqual(freshContext.state.buddyCare.entitlement, 'free', 'default storage buddy care should be free');
  assert.strictEqual(freshContext.state.buddyCare.ageGateAccepted, false, 'default storage buddy care should keep age gate closed');

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
      stageProgress: 0.35
    },
    status: {
      health: 94,
      stress: 10,
      water: 80,
      nutrition: 72,
      risk: 8
    },
    ui: {
      activeScreen: 'buddyCare'
    }
  };

  const restoredContext = buildStorageContext(oldSave);
  restoredContext.resetStateToDefaults();
  await restoredContext.restoreState();
  restoredContext.ensureStateIntegrity(Date.now());
  restoredContext.syncCanonicalStateShape();

  assert.ok(restoredContext.state.buddyCare, 'legacy saves should receive buddy care state');
  assert.strictEqual(restoredContext.state.buddyCare.entitlement, 'free', 'legacy saves should default to free entitlement');
  assert.strictEqual(restoredContext.state.buddyCare.ageGateAccepted, false, 'legacy saves should default age gate to false');
  assert.strictEqual(restoredContext.state.ui.activeScreen, 'buddyCare', 'valid buddy care screen should survive integrity sync');

  restoredContext.state.buddyCare = {
    version: 0,
    ageGateAccepted: 'yes',
    entitlement: 'vip_forever',
    plants: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
    settings: {
      notificationsEnabled: 'sometimes',
      preferredReminderTime: '99:99'
    }
  };
  restoredContext.ensureStateIntegrity(Date.now());

  assert.strictEqual(restoredContext.state.buddyCare.version, 1, 'integrity pass should normalize buddy care version');
  assert.strictEqual(restoredContext.state.buddyCare.ageGateAccepted, false, 'invalid age gate values should normalize to false');
  assert.strictEqual(restoredContext.state.buddyCare.entitlement, 'free', 'invalid entitlement should normalize to free');
  assert.strictEqual(restoredContext.state.buddyCare.plants.length, 3, 'invalid entitlement snapshots should keep stored plants for safe downgrade handling');
  assert.strictEqual(restoredContext.state.buddyCare.plants[0].nickname, 'Plant 1', 'normalized plants should receive a fallback name');
  assert.strictEqual(buddyCareState.isBuddyCarePlantReadOnly(restoredContext.state, restoredContext.state.buddyCare.plants[1].id), true, 'stored extra plants should become read-only in free access');
  assert.strictEqual(restoredContext.state.buddyCare.settings.preferredReminderTime, '18:00', 'invalid reminder time should fall back to default');

  console.log('buddy-care-state.test.js passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
